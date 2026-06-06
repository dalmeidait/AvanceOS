import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

const statusValidos = ['PENDENTE', 'EM_ANALISE', 'APROVADA', 'REJEITADA', 'COMPRADA', 'RECEBIDA', 'VINCULADA_A_OS', 'CANCELADA'];
const urgenciasValidas = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];

@Injectable()
export class EstoqueSolicitacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, user?: any) {
    if (!data.nomeProdutoSolicitado?.trim()) {
      throw new BadRequestException('Informe o nome do produto solicitado.');
    }
    if (!data.justificativaTecnica?.trim()) {
      throw new BadRequestException('Informe a justificativa técnica da solicitação.');
    }
    if (!urgenciasValidas.includes(data.urgencia)) {
      throw new BadRequestException('Informe uma urgência válida para a solicitação.');
    }
    const quantidade = Number(data.quantidadeSolicitada ?? 0);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new BadRequestException('Informe uma quantidade solicitada válida.');
    }

    return this.prisma.solicitacaoEstoque.create({
      data: {
        ordemServicoId: data.ordemServicoId || null,
        veiculoId: data.veiculoId || null,
        clienteId: data.clienteId || null,
        mecanicoId: data.mecanicoId || user?.id || null,
        nomeProdutoSolicitado: data.nomeProdutoSolicitado.trim(),
        categoria: data.categoria || null,
        tipoItem: data.tipoItem || 'PECA',
        quantidadeSolicitada: quantidade,
        unidade: data.unidade || 'UN',
        aplicacao: data.aplicacao || null,
        justificativaTecnica: data.justificativaTecnica.trim(),
        urgencia: data.urgencia,
        status: 'PENDENTE',
        observacoes: data.observacoes || null,
      },
    });
  }

  async findAll(filters: { status?: string; urgencia?: string; ordemServicoId?: string; mecanicoId?: string }) {
    return this.prisma.solicitacaoEstoque.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.urgencia ? { urgencia: filters.urgencia } : {}),
        ...(filters.ordemServicoId ? { ordemServicoId: filters.ordemServicoId } : {}),
        ...(filters.mecanicoId ? { mecanicoId: filters.mecanicoId } : {}),
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async updateStatus(id: string, data: any) {
    if (!statusValidos.includes(data.status)) {
      throw new BadRequestException('Status de solicitação inválido.');
    }
    const solicitacao = await this.prisma.solicitacaoEstoque.findUnique({ where: { id } });
    if (!solicitacao) throw new NotFoundException('Solicitação de estoque não encontrada.');

    return this.prisma.solicitacaoEstoque.update({
      where: { id },
      data: {
        status: data.status,
        observacoes: data.observacoes ?? solicitacao.observacoes,
        produtoVinculadoId: data.produtoVinculadoId || solicitacao.produtoVinculadoId,
      },
    });
  }
}
