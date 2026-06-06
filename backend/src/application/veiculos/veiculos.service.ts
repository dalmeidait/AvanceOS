import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class VeiculosService {
  constructor(private prisma: PrismaService) { }

  private clienteInclude = { include: { _count: { select: { veiculos: true } } } };

  async create(data: any) {
    // 🕵️ O ESPIÃO: Vai nos dizer se os dados chegaram aqui ou se o Flutter travou antes
    console.log("🚗 DADOS DO VEÍCULO RECEBIDOS DO FLUTTER (CREATE):", data);

    try {
      const clienteId = data.clienteId || data.cliente_id;
      if (!clienteId) {
        throw new HttpException('ID do cliente obrigatório', HttpStatus.BAD_REQUEST);
      }

      const existente = await this.prisma.veiculo.findUnique({ where: { placa: data.placa } });
      if (existente) {
        throw new HttpException('Placa duplicada', HttpStatus.CONFLICT);
      }

      const veiculo = await this.prisma.veiculo.create({
        data: {
          placa: data.placa,
          marca: data.marca,
          modelo: data.modelo,
          ano: data.ano ? String(data.ano) : null, // Aceita "2010/2010" tranquilamente
          cor: data.cor || null,
          quilometragem: data.quilometragem ? parseInt(String(data.quilometragem).replace(/\D/g, ''), 10) : null,
          avarias_previas: data.avarias_previas ?? false,
          avarias_previas_desc: data.avarias_previas_desc || null,
          pertences_valor: data.pertences_valor ?? false,
          pertences_valor_desc: data.pertences_valor_desc || null,
          luzes_painel: data.luzes_painel ?? false,
          luzes_painel_desc: data.luzes_painel_desc || null,
          cliente_id: clienteId,
        }
      });

      console.log("✅ VEÍCULO GRAVADO COM SUCESSO! ID:", veiculo.id);
      const veiculoCriado = await this.prisma.veiculo.findUnique({
        where: { id: veiculo.id },
        include: { cliente: this.clienteInclude },
      });
      return this.mapToFlutter(veiculoCriado || veiculo);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("❌ ERRO INTERNO AO CRIAR VEÍCULO:", error);
      throw new HttpException('Erro interno', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(filters: { clienteId?: string } = {}) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: filters.clienteId ? { cliente_id: filters.clienteId } : undefined,
      include: { cliente: this.clienteInclude },
      orderBy: { criado_em: 'desc' },
    });
    return veiculos.map(v => this.mapToFlutter(v));
  }

  async findOne(id: string) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      include: { cliente: this.clienteInclude },
    });
    return veiculo ? this.mapToFlutter(veiculo) : null;
  }

  async update(id: string, data: any) {
    console.log("🚗 DADOS DO VEÍCULO RECEBIDOS DO FLUTTER (UPDATE):", data);

    try {
      const clienteId = data.clienteId || data.cliente_id;
      const atualizado = await this.prisma.veiculo.update({
        where: { id },
        data: {
          placa: data.placa,
          marca: data.marca,
          modelo: data.modelo,
          ano: data.ano ? String(data.ano) : null,
          cor: data.cor !== undefined ? data.cor : undefined,
          quilometragem: data.quilometragem ? parseInt(String(data.quilometragem).replace(/\D/g, ''), 10) : null,
          avarias_previas: data.avarias_previas !== undefined ? data.avarias_previas : undefined,
          avarias_previas_desc: data.avarias_previas_desc !== undefined ? data.avarias_previas_desc : undefined,
          pertences_valor: data.pertences_valor !== undefined ? data.pertences_valor : undefined,
          pertences_valor_desc: data.pertences_valor_desc !== undefined ? data.pertences_valor_desc : undefined,
          luzes_painel: data.luzes_painel !== undefined ? data.luzes_painel : undefined,
          luzes_painel_desc: data.luzes_painel_desc !== undefined ? data.luzes_painel_desc : undefined,
          ...(clienteId && { cliente_id: clienteId }),
        }
      });
      const veiculoAtualizado = await this.prisma.veiculo.findUnique({
        where: { id: atualizado.id },
        include: { cliente: this.clienteInclude },
      });
      return this.mapToFlutter(veiculoAtualizado || atualizado);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("❌ ERRO INTERNO AO ATUALIZAR VEÍCULO:", error);
      throw new HttpException('Erro interno', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string) {
    return this.prisma.veiculo.delete({ where: { id } });
  }

  private tipoCliente(cliente: any) {
    const digits = String(cliente?.cpf_cnpj || '').replace(/\D/g, '');
    if (digits.length === 14) return 'Pessoa Juridica';
    if (digits.length === 11) return 'Pessoa Fisica';
    return null;
  }

  private mapCliente(cliente: any) {
    if (!cliente) return null;
    const totalVeiculos = Number(cliente._count?.veiculos ?? cliente.veiculos?.length ?? cliente.totalVeiculos ?? 0);
    const possuiGrupoVeiculos = totalVeiculos > 1;
    const { _count, ...clienteLimpo } = cliente;

    return {
      ...clienteLimpo,
      cpf: cliente.cpf_cnpj,
      documento: cliente.cpf_cnpj,
      tipo: this.tipoCliente(cliente),
      tipoCliente: this.tipoCliente(cliente),
      totalVeiculos,
      possuiGrupoVeiculos,
      possuiFrota: possuiGrupoVeiculos,
    };
  }

  private mapToFlutter(veiculo: any) {
    const cliente = this.mapCliente(veiculo.cliente);
    return {
      ...veiculo,
      cliente,
      clienteId: veiculo.cliente_id,
      cliente_nome: cliente?.nome || 'Desconhecido',
      pertenceGrupoVeiculos: Boolean(cliente?.possuiGrupoVeiculos),
      pertenceFrota: Boolean(cliente?.possuiFrota),
    };
  }
}
