import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  private mapServico(servico: any) {
    return {
      ...servico,
      valor: Number(servico.valor ?? 0),
      name: servico.nome,
      internalCode: servico.codigo,
      category: servico.categoria,
      description: servico.descricao,
      basePrice: Number(servico.valor ?? 0),
      estimatedMinutes: servico.tempoEstimadoMinutos,
      isActive: servico.status !== 'INATIVO',
      createdAt: servico.criadoEm,
      updatedAt: servico.atualizadoEm,
      notes: servico.notes ?? servico.observacaoTecnica,
    };
  }

  private normalizeStatus(status?: string, isActive?: boolean) {
    if (typeof isActive === 'boolean') return isActive ? 'ATIVO' : 'INATIVO';
    return status || 'ATIVO';
  }

  private buildServicoData(data: any) {
    const codigo = data.codigo || data.internalCode;
    const nome = data.nome || data.name;
    const valor = data.valor ?? data.basePrice ?? 0;

    if (!codigo) throw new BadRequestException('Código interno do serviço é obrigatório.');
    if (!nome) throw new BadRequestException('Nome do serviço é obrigatório.');
    if (Number(valor) < 0) throw new BadRequestException('Valor do serviço deve ser positivo.');

    return {
      codigo,
      nome,
      descricao: data.descricao ?? data.description ?? null,
      categoria: data.categoria || data.category || 'GERAL',
      valor,
      tempoEstimadoMinutos: data.tempoEstimadoMinutos ?? data.estimatedMinutes ? Number(data.tempoEstimadoMinutos ?? data.estimatedMinutes) : null,
      geraComissao: Boolean(data.geraComissao),
      status: this.normalizeStatus(data.status, data.isActive),
      observacaoTecnica: data.observacaoTecnica ?? data.notes ?? null,
      notes: data.notes ?? null,
    };
  }

  async findAll(filters: { busca?: string; categoria?: string; status?: string }) {
    const busca = filters.busca?.trim();
    const servicos = await this.prisma.servico.findMany({
      where: {
        ...(filters.categoria ? { categoria: filters.categoria } : {}),
        ...(filters.status && filters.status !== 'TODOS' ? { status: filters.status } : {}),
        ...(busca
          ? {
              OR: [
                { codigo: { contains: busca } },
                { nome: { contains: busca } },
                { descricao: { contains: busca } },
                { categoria: { contains: busca } },
              ],
            }
          : {}),
      },
      orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }],
    });
    return servicos.map((servico) => this.mapServico(servico));
  }

  async findOne(id: string) {
    const servico = await this.prisma.servico.findUnique({ where: { id } });
    if (!servico) throw new NotFoundException('Serviço não encontrado.');
    return this.mapServico(servico);
  }

  async create(data: any) {
    const servico = await this.prisma.servico.create({
      data: this.buildServicoData(data),
    });
    return this.mapServico(servico);
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const servico = await this.prisma.servico.update({
      where: { id },
      data: this.buildServicoData(data),
    });
    return this.mapServico(servico);
  }

  async updateStatus(id: string, data: { isActive?: boolean; status?: string }) {
    await this.findOne(id);
    const servico = await this.prisma.servico.update({
      where: { id },
      data: { status: this.normalizeStatus(data.status, data.isActive) },
    });
    return this.mapServico(servico);
  }

  async deactivate(id: string) {
    return this.updateStatus(id, { isActive: false });
  }
}
