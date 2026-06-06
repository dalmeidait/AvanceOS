import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const PEDIDO_STATUS = [
  'RASCUNHO',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
  'REALIZADO',
  'AGUARDANDO_ENTREGA',
  'RECEBIDO',
  'RECEBIDO_COM_DIVERGENCIA',
  'CANCELADO',
] as const;

const RECEBIMENTO_STATUS = ['RECEBIDO_TOTAL', 'RECEBIDO_PARCIAL', 'RECEBIDO_COM_DIVERGENCIA', 'CANCELADO'] as const;
const DIVERGENCIA_STATUS = [
  'ABERTA',
  'EM_ANALISE',
  'AGUARDANDO_FORNECEDOR',
  'AGUARDANDO_TROCA',
  'AGUARDANDO_DEVOLUCAO',
  'RESOLVIDA',
  'CANCELADA',
  'PERDA_ASSUMIDA',
] as const;
const TIPOS_DIVERGENCIA = [
  'PRODUTO_COM_DEFEITO',
  'PRODUTO_ERRADO',
  'QUANTIDADE_MENOR',
  'QUANTIDADE_MAIOR',
  'VALOR_DIVERGENTE',
  'NOTA_FISCAL_DIVERGENTE',
  'PRODUTO_NAO_SOLICITADO',
  'PRODUTO_AVARIADO',
  'ENTREGA_ATRASADA',
  'SEM_DOCUMENTO_FISCAL',
  'OUTRO',
] as const;

type PedidoItemPayload = {
  id?: string;
  produtoId?: string | null;
  descricaoManual?: string | null;
  quantidade: number | string;
  valorUnitario: number | string;
  observacao?: string | null;
};

type RecebimentoItemPayload = {
  pedidoCompraItemId?: string;
  produtoId?: string | null;
  quantidadeRecebida?: number | string;
  divergente?: boolean;
  tipoDivergencia?: string;
  descricaoDivergencia?: string;
  acaoCorretiva?: string;
  observacao?: string | null;
};

@Injectable()
export class ComprasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPedidos(filtros: any = {}) {
    return (this.prisma as any).pedidoCompra.findMany({
      where: this.buildPedidoWhere(filtros),
      include: this.includePedido(),
      orderBy: [{ criadoEm: 'desc' }],
    }).then((pedidos: any[]) => pedidos.map((pedido) => this.toPedidoResponse(pedido)));
  }

  async obterPedido(id: string) {
    const pedido = await this.findPedido(id);
    return this.toPedidoResponse(pedido);
  }

  async criarPedido(payload: any, user: any) {
    const itens = this.normalizeItens(payload.itens || []);
    const valorTotal = this.sumItens(itens);
    await this.validarPedido(payload, itens);

    const pedido = await (this.prisma as any).pedidoCompra.create({
      data: {
        fornecedorId: payload.fornecedorId || null,
        fornecedorAvulsoNome: payload.fornecedorAvulsoNome?.trim() || null,
        fornecedorAvulsoDocumento: payload.fornecedorAvulsoDocumento?.trim() || null,
        solicitacaoEstoqueId: payload.solicitacaoEstoqueId || null,
        osId: payload.osId || payload.ordemServicoId || null,
        status: this.normalizePedidoStatus(payload.status || 'RASCUNHO'),
        valorTotal,
        previsaoEntrega: this.toDate(payload.previsaoEntrega),
        formaPagamento: payload.formaPagamento?.trim() || null,
        vencimento: this.toDate(payload.vencimento),
        observacao: payload.observacao?.trim() || null,
        criadoPorId: user?.id,
        itens: {
          create: itens.map((item) => ({
            produtoId: item.produtoId || null,
            descricaoManual: item.descricaoManual || null,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal,
            observacao: item.observacao || null,
          })),
        },
      },
      include: this.includePedido(),
    });

    return this.toPedidoResponse(pedido);
  }

  async atualizarPedido(id: string, payload: any) {
    const pedidoAtual = await this.findPedido(id);
    if (['RECEBIDO', 'RECEBIDO_COM_DIVERGENCIA', 'CANCELADO'].includes(pedidoAtual.status)) {
      throw new BadRequestException('Pedido já encerrado não pode ser alterado.');
    }

    const temItens = Array.isArray(payload.itens);
    const itens = temItens ? this.normalizeItens(payload.itens) : [];
    if (temItens) await this.validarPedido(payload, itens, true);

    const pedido = await (this.prisma as any).$transaction(async (tx: any) => {
      if (temItens) {
        await tx.pedidoCompraItem.deleteMany({ where: { pedidoCompraId: id } });
      }

      return tx.pedidoCompra.update({
        where: { id },
        data: {
          fornecedorId: payload.fornecedorId === undefined ? undefined : payload.fornecedorId || null,
          fornecedorAvulsoNome: payload.fornecedorAvulsoNome === undefined ? undefined : payload.fornecedorAvulsoNome?.trim() || null,
          fornecedorAvulsoDocumento: payload.fornecedorAvulsoDocumento === undefined ? undefined : payload.fornecedorAvulsoDocumento?.trim() || null,
          solicitacaoEstoqueId: payload.solicitacaoEstoqueId === undefined ? undefined : payload.solicitacaoEstoqueId || null,
          osId: payload.osId === undefined && payload.ordemServicoId === undefined ? undefined : payload.osId || payload.ordemServicoId || null,
          status: payload.status ? this.normalizePedidoStatus(payload.status) : undefined,
          valorTotal: temItens ? this.sumItens(itens) : undefined,
          previsaoEntrega: payload.previsaoEntrega === undefined ? undefined : this.toDate(payload.previsaoEntrega),
          formaPagamento: payload.formaPagamento === undefined ? undefined : payload.formaPagamento?.trim() || null,
          vencimento: payload.vencimento === undefined ? undefined : this.toDate(payload.vencimento),
          observacao: payload.observacao === undefined ? undefined : payload.observacao?.trim() || null,
          itens: temItens
            ? {
                create: itens.map((item) => ({
                  produtoId: item.produtoId || null,
                  descricaoManual: item.descricaoManual || null,
                  quantidade: item.quantidade,
                  valorUnitario: item.valorUnitario,
                  valorTotal: item.valorTotal,
                  observacao: item.observacao || null,
                })),
              }
            : undefined,
        },
        include: this.includePedido(),
      });
    });

    return this.toPedidoResponse(pedido);
  }

  async aprovarPedido(id: string, user: any) {
    const pedidoAtual = await this.findPedido(id);
    if (pedidoAtual.status === 'CANCELADO') throw new BadRequestException('Pedido cancelado não pode ser aprovado.');
    if (!pedidoAtual.itens?.length) throw new BadRequestException('Pedido sem itens não pode ser aprovado.');

    const pedido = await (this.prisma as any).$transaction(async (tx: any) => {
      const atualizado = await tx.pedidoCompra.update({
        where: { id },
        data: {
          status: 'AGUARDANDO_ENTREGA',
          aprovadoPorId: user?.id,
          dataAprovacao: new Date(),
        },
        include: this.includePedido(),
      });

      await this.criarContaPagarSeNecessario(tx, atualizado, user?.id);
      await this.criarDocumentoFiscalGerencialSeNecessario(tx, atualizado);
      return atualizado;
    });

    return this.toPedidoResponse(pedido);
  }

  async cancelarPedido(id: string, payload: any = {}) {
    await this.findPedido(id);
    const pedido = await (this.prisma as any).pedidoCompra.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        observacao: payload.motivo ? `Cancelado: ${payload.motivo}` : undefined,
      },
      include: this.includePedido(),
    });
    return this.toPedidoResponse(pedido);
  }

  async receberPedido(id: string, payload: any, user: any) {
    const pedidoAtual = await this.findPedido(id);
    if (pedidoAtual.status === 'CANCELADO') throw new BadRequestException('Pedido cancelado não pode ser recebido.');
    if (!pedidoAtual.itens?.length) throw new BadRequestException('Pedido sem itens não pode ser recebido.');

    const itensPayload = this.resolveItensRecebimento(pedidoAtual, payload.itens || []);
    
    for (const item of itensPayload) {
      const itemPedido = pedidoAtual.itens.find((p: any) => p.id === item.pedidoCompraItemId);
      if (itemPedido) {
        const qR = item.quantidadeRecebida !== undefined && item.quantidadeRecebida !== null ? Number(item.quantidadeRecebida) : Number(itemPedido.quantidade);
        const qP = Number(itemPedido.quantidade);
        if (qR !== qP) {
          item.divergente = true;
          if (!item.tipoDivergencia || item.tipoDivergencia === 'OUTRO') {
            item.tipoDivergencia = qR < qP ? 'QUANTIDADE_MENOR' : 'QUANTIDADE_MAIOR';
          }
          if (!item.descricaoDivergencia) {
            item.descricaoDivergencia = `Divergência automática: pedido ${qP}, recebido ${qR}.`;
          }
        }
      }
    }

    const temDivergencia = itensPayload.some((item) => Boolean(item.divergente));
    const recebimentoStatus = temDivergencia ? 'RECEBIDO_COM_DIVERGENCIA' : this.normalizeRecebimentoStatus(payload.status || 'RECEBIDO_TOTAL');

    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const recebimento = await tx.recebimentoCompra.create({
        data: {
          pedidoCompraId: id,
          recebidoPorId: user?.id,
          dataRecebimento: this.toDate(payload.dataRecebimento) || new Date(),
          status: recebimentoStatus,
          observacao: payload.observacao?.trim() || null,
        },
      });

      let valorTotalRecebido = 0;

      for (const item of itensPayload) {
        const itemPedido = pedidoAtual.itens.find((pedidoItem: any) => pedidoItem.id === item.pedidoCompraItemId);
        if (!itemPedido) throw new BadRequestException('Item informado não pertence ao pedido.');
        
        const quantidadeRecebida = this.toNonNegativeInt(item.quantidadeRecebida ?? itemPedido.quantidade, 'Quantidade recebida inválida.');
        
        valorTotalRecebido += Number(itemPedido.valorUnitario) * quantidadeRecebida;

        if (item.divergente) {
          const qP = Number(itemPedido.quantidade);
          const quantidadeAfetada = quantidadeRecebida !== qP ? Math.abs(qP - quantidadeRecebida) : quantidadeRecebida;

          await this.registrarDivergenciaTransacao(tx, {
            pedidoCompraId: id,
            recebimentoCompraId: recebimento.id,
            fornecedorId: pedidoAtual.fornecedorId,
            produtoId: itemPedido.produtoId,
            descricaoProduto: itemPedido.produto?.nome || itemPedido.descricaoManual,
            tipoDivergencia: item.tipoDivergencia || 'OUTRO',
            quantidadeAfetada: quantidadeAfetada > 0 ? quantidadeAfetada : 1,
            valorAfetado: Number(itemPedido.valorUnitario) * (quantidadeAfetada > 0 ? quantidadeAfetada : 1),
            descricao: item.descricaoDivergencia || 'Recebimento registrado com divergência.',
            acaoCorretiva: item.acaoCorretiva || null,
            responsavelId: user?.id,
            observacao: item.observacao || null,
          });

          if (itemPedido.produtoId && quantidadeRecebida > 0) {
            await this.entradaEstoque(tx, pedidoAtual, itemPedido, quantidadeRecebida, user?.id, true);
          }
          continue;
        }

        if (itemPedido.produtoId && quantidadeRecebida > 0) {
          await this.entradaEstoque(tx, pedidoAtual, itemPedido, quantidadeRecebida, user?.id, false);
        }
      }

      if (valorTotalRecebido > 0) {
        const docFiscal = await tx.documentoFiscalSimulado.findFirst({
          where: { pedidoCompraId: id, status: { not: 'CANCELADO' } }
        });

        const numFinal = payload.documentoAvulso || `NF-SIM-COMPRA-${pedidoAtual.numero}`;

        if (docFiscal) {
          await tx.documentoFiscalSimulado.update({
            where: { id: docFiscal.id },
            data: {
              status: 'EMITIDO',
              numero: numFinal,
              valorProdutos: valorTotalRecebido,
              valorTotal: valorTotalRecebido,
              observacoes: temDivergencia 
                ? 'Recebimento com divergência. Valor ajustado à mercadoria efetivamente recebida.' 
                : 'Documento fiscal emitido no recebimento.'
            }
          });
        } else {
          await tx.documentoFiscalSimulado.create({
            data: {
              numero: numFinal,
              tipoDocumento: 'ENTRADA_FORNECEDOR_SIMULADA',
              naturezaOperacao: 'Entrada de fornecedor simulada',
              status: 'EMITIDO',
              fornecedorId: pedidoAtual.fornecedorId || null,
              ordemServicoId: pedidoAtual.osId || null,
              pedidoCompraId: id,
              dataEmissao: new Date(),
              dataCompetencia: new Date(),
              valorProdutos: valorTotalRecebido,
              valorTotal: valorTotalRecebido,
              origem: 'COMPRA',
              observacoes: temDivergencia 
                ? 'Recebimento com divergência. Valor refletindo a quantidade efetivamente recebida.' 
                : 'Documento fiscal gerado no recebimento.',
              semValidadeFiscal: true,
            }
          });
        }
      }

      const conta = await tx.lancamentoContabilOperacional.findFirst({
        where: { pedidoCompraId: id, status: { not: 'CANCELADO' } }
      });
      if (conta) {
        if (valorTotalRecebido === 0) {
          await tx.lancamentoContabilOperacional.update({
            where: { id: conta.id },
            data: {
              observacoes: 'Recebimento zerado. Nenhuma mercadoria entrou. Sinalizado para revisão.'
            }
          });
        } else if (temDivergencia) {
          await tx.lancamentoContabilOperacional.update({
            where: { id: conta.id },
            data: {
              observacoes: `Recebimento com divergência. Pendência de ajuste financeiro. Valor efetivamente recebido: R$ ${valorTotalRecebido.toFixed(2)}.`
            }
          });
        } else {
          await tx.lancamentoContabilOperacional.update({
            where: { id: conta.id },
            data: {
              observacoes: 'Mercadoria recebida integralmente.'
            }
          });
        }
      }

      const statusPedido = temDivergencia ? 'RECEBIDO_COM_DIVERGENCIA' : 'RECEBIDO';
      const pedido = await tx.pedidoCompra.update({
        where: { id },
        data: { status: statusPedido },
        include: this.includePedido(),
      });
      return { pedido, recebimento };
    });

    return {
      mensagem: temDivergencia ? 'Recebimento registrado com divergência.' : 'Mercadoria recebida e estoque atualizado.',
      pedido: this.toPedidoResponse(result.pedido),
      recebimento: result.recebimento,
    };
  }

  async listarDivergencias(filtros: any = {}) {
    return (this.prisma as any).divergenciaRecebimento.findMany({
      where: {
        ...(filtros.status ? { status: filtros.status } : {}),
        ...(filtros.tipoDivergencia ? { tipoDivergencia: filtros.tipoDivergencia } : {}),
        ...(filtros.fornecedorId ? { fornecedorId: filtros.fornecedorId } : {}),
        ...(filtros.produtoId ? { produtoId: filtros.produtoId } : {}),
      },
      include: this.includeDivergencia(),
      orderBy: [{ dataRegistro: 'desc' }],
    }).then((items: any[]) => items.map((item) => this.toDivergenciaResponse(item)));
  }

  async criarDivergencia(payload: any, user: any) {
    await this.findPedido(payload.pedidoCompraId);
    const divergencia = await (this.prisma as any).$transaction(async (tx: any) => {
      const item = await this.registrarDivergenciaTransacao(tx, {
        ...payload,
        responsavelId: payload.responsavelId || user?.id,
      });
      await tx.pedidoCompra.update({
        where: { id: payload.pedidoCompraId },
        data: { status: 'RECEBIDO_COM_DIVERGENCIA' },
      });
      return item;
    });
    return this.toDivergenciaResponse(divergencia);
  }

  async atualizarDivergencia(id: string, payload: any) {
    const atual = await (this.prisma as any).divergenciaRecebimento.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Divergência de recebimento não encontrada.');

    const status = payload.status ? this.normalizeDivergenciaStatus(payload.status) : undefined;
    const divergencia = await (this.prisma as any).divergenciaRecebimento.update({
      where: { id },
      data: {
        status,
        acaoCorretiva: payload.acaoCorretiva === undefined ? undefined : payload.acaoCorretiva || null,
        dataResolucao: status && ['RESOLVIDA', 'CANCELADA', 'PERDA_ASSUMIDA'].includes(status) ? new Date() : undefined,
        observacao: payload.observacao === undefined ? undefined : payload.observacao || null,
      },
      include: this.includeDivergencia(),
    });
    return this.toDivergenciaResponse(divergencia);
  }

  async listarProdutoFornecedores(produtoId: string) {
    await this.ensureProduto(produtoId);
    return (this.prisma as any).produtoFornecedor.findMany({
      where: { produtoId },
      include: { fornecedor: true },
      orderBy: [{ fornecedorPreferencial: 'desc' }, { atualizadoEm: 'desc' }],
    }).then((items: any[]) => items.map((item) => this.toProdutoFornecedorResponse(item)));
  }

  async vincularProdutoFornecedor(produtoId: string, payload: any) {
    await this.ensureProduto(produtoId);
    await this.ensureFornecedor(payload.fornecedorId);

    const existente = await (this.prisma as any).produtoFornecedor.findUnique({
      where: { produtoId_fornecedorId: { produtoId, fornecedorId: payload.fornecedorId } },
    });

    if (existente) {
      throw new ConflictException('Este fornecedor já está vinculado a este produto.');
    }

    try {
      const item = await (this.prisma as any).$transaction(async (tx: any) => {
        if (payload.fornecedorPreferencial) {
          await tx.produtoFornecedor.updateMany({ where: { produtoId }, data: { fornecedorPreferencial: false } });
        }
        return tx.produtoFornecedor.create({
          data: this.produtoFornecedorData(produtoId, payload),
          include: { fornecedor: true },
        });
      });

      return this.toProdutoFornecedorResponse(item);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Este fornecedor já está vinculado a este produto.');
      }
      throw error;
    }
  }

  async atualizarProdutoFornecedor(produtoId: string, produtoFornecedorId: string, payload: any) {
    await this.ensureProduto(produtoId);
    const atual = await (this.prisma as any).produtoFornecedor.findFirst({ where: { id: produtoFornecedorId, produtoId } });
    if (!atual) throw new NotFoundException('Fornecedor do produto não encontrado.');

    const item = await (this.prisma as any).$transaction(async (tx: any) => {
      if (payload.fornecedorPreferencial) {
        await tx.produtoFornecedor.updateMany({ where: { produtoId }, data: { fornecedorPreferencial: false } });
      }
      return tx.produtoFornecedor.update({
        where: { id: produtoFornecedorId },
        data: this.produtoFornecedorData(produtoId, payload, true),
        include: { fornecedor: true },
      });
    });

    return this.toProdutoFornecedorResponse(item);
  }

  private async entradaEstoque(tx: any, pedido: any, itemPedido: any, quantidade: number, usuarioId: string, bloqueado: boolean) {
    const produto = await tx.produto.findUnique({ where: { id: itemPedido.produtoId } });
    if (!produto) throw new BadRequestException('Produto do item de compra não encontrado.');

    const previousQuantity = Number(produto.quantityInStock || 0);
    const newQuantity = previousQuantity + quantidade;
    const estoqueBloqueadoAtual = Number(produto.estoqueBloqueado || 0);

    await tx.movimentacaoEstoque.create({
      data: {
        tipo: 'IN',
        quantidade,
        previousQuantity,
        newQuantity,
        reason: bloqueado ? 'Recebimento de compra com divergência - estoque bloqueado' : 'Recebimento de compra',
        justificativa: bloqueado ? 'Produto bloqueado para uso até resolução da divergência.' : 'Entrada por recebimento de pedido de compra.',
        notes: pedido.observacao || null,
        produtoId: itemPedido.produtoId,
        usuarioId,
        fornecedorId: pedido.fornecedorId || null,
        ordemServicoId: pedido.osId || null,
        notaFiscal: pedido.documentosFiscais?.[0]?.numero || null,
        custoUnitario: Number(itemPedido.valorUnitario),
      },
    });

    await tx.produto.update({
      where: { id: itemPedido.produtoId },
      data: {
        quantityInStock: newQuantity,
        estoqueBloqueado: bloqueado ? estoqueBloqueadoAtual + quantidade : estoqueBloqueadoAtual,
        precoCusto: Number(itemPedido.valorUnitario),
      },
    });

    if (pedido.fornecedorId) {
      await tx.produtoFornecedor.upsert({
        where: { produtoId_fornecedorId: { produtoId: itemPedido.produtoId, fornecedorId: pedido.fornecedorId } },
        create: {
          produtoId: itemPedido.produtoId,
          fornecedorId: pedido.fornecedorId,
          custoUltimaCompra: Number(itemPedido.valorUnitario),
          fornecedorPreferencial: false,
          ativo: true,
        },
        update: { custoUltimaCompra: Number(itemPedido.valorUnitario), ativo: true },
      });
    }
  }

  private async criarContaPagarSeNecessario(tx: any, pedido: any, usuarioId?: string) {
    const existente = await tx.lancamentoContabilOperacional.findFirst({
      where: { pedidoCompraId: pedido.id, naturezaFinanceira: 'CONTA_A_PAGAR', status: { not: 'CANCELADO' } },
    });
    if (existente) return;

    await tx.lancamentoContabilOperacional.create({
      data: {
        tipo: 'DESPESA',
        naturezaFinanceira: 'CONTA_A_PAGAR',
        categoria: 'Compra de peças',
        centroCusto: 'Estoque',
        descricao: `Pedido de compra #${pedido.numero}`,
        valor: Number(pedido.valorTotal || 0),
        dataLancamento: new Date(),
        dataVencimento: pedido.vencimento || pedido.previsaoEntrega || null,
        numeroDocumento: `PC-${pedido.numero}`,
        fornecedorId: pedido.fornecedorId || null,
        ordemServicoId: pedido.osId || null,
        pedidoCompraId: pedido.id,
        usuarioId,
        formaPagamento: pedido.formaPagamento || null,
        status: 'PENDENTE',
        origem: 'FORNECEDOR',
        observacoes: 'Conta a pagar gerencial criada a partir de pedido de compra.',
      },
    });
  }

  private async criarDocumentoFiscalGerencialSeNecessario(tx: any, pedido: any) {
    const existente = await tx.documentoFiscalSimulado.findFirst({
      where: { pedidoCompraId: pedido.id, origem: 'FORNECEDOR', status: { not: 'CANCELADO' } },
    });
    if (existente) return;

    await tx.documentoFiscalSimulado.create({
      data: {
        numero: `PC-${pedido.numero}`,
        tipoDocumento: 'ENTRADA_FORNECEDOR_SIMULADA',
        naturezaOperacao: 'Entrada de fornecedor',
        status: 'RASCUNHO',
        fornecedorId: pedido.fornecedorId || null,
        ordemServicoId: pedido.osId || null,
        pedidoCompraId: pedido.id,
        dataEmissao: new Date(),
        dataCompetencia: new Date(),
        valorProdutos: Number(pedido.valorTotal || 0),
        valorTotal: Number(pedido.valorTotal || 0),
        origem: 'FORNECEDOR',
        observacoes: 'Documento fiscal gerencial sem validade fiscal, criado a partir de pedido de compra.',
        semValidadeFiscal: true,
      },
    });
  }

  private async registrarDivergenciaTransacao(tx: any, payload: any) {
    const pedido = await tx.pedidoCompra.findUnique({ where: { id: payload.pedidoCompraId } });
    if (!pedido) throw new BadRequestException('Pedido de compra informado não existe.');

    return tx.divergenciaRecebimento.create({
      data: {
        pedidoCompraId: payload.pedidoCompraId,
        recebimentoCompraId: payload.recebimentoCompraId || null,
        fornecedorId: payload.fornecedorId || pedido.fornecedorId || null,
        produtoId: payload.produtoId || null,
        descricaoProduto: payload.descricaoProduto?.trim() || null,
        tipoDivergencia: this.normalizeTipoDivergencia(payload.tipoDivergencia || 'OUTRO'),
        quantidadeAfetada: this.toPositiveInt(payload.quantidadeAfetada || 1, 'Quantidade afetada inválida.'),
        valorAfetado: payload.valorAfetado === undefined || payload.valorAfetado === null ? null : Number(payload.valorAfetado),
        descricao: payload.descricao?.trim() || 'Divergência registrada no recebimento.',
        status: this.normalizeDivergenciaStatus(payload.status || 'ABERTA'),
        acaoCorretiva: payload.acaoCorretiva || null,
        responsavelId: payload.responsavelId,
        arquivoUrl: payload.arquivoUrl || null,
        observacao: payload.observacao || null,
      },
      include: this.includeDivergencia(),
    });
  }

  private resolveItensRecebimento(pedido: any, itensPayload: RecebimentoItemPayload[]) {
    if (!itensPayload.length) {
      return pedido.itens.map((item: any) => ({
        pedidoCompraItemId: item.id,
        quantidadeRecebida: item.quantidade,
        divergente: false,
      }));
    }

    return itensPayload.map((item) => {
      if (!item.pedidoCompraItemId && item.produtoId) {
        const found = pedido.itens.find((pedidoItem: any) => pedidoItem.produtoId === item.produtoId);
        if (found) return { ...item, pedidoCompraItemId: found.id };
      }
      return item;
    });
  }

  private normalizeItens(itens: PedidoItemPayload[]) {
    if (!itens.length) throw new BadRequestException('Pedido precisa de pelo menos um item.');
    return itens.map((item) => {
      const quantidade = this.toPositiveInt(item.quantidade, 'Quantidade do item inválida.');
      const valorUnitario = this.toNonNegativeNumber(item.valorUnitario, 'Valor unitário inválido.');
      const descricaoManual = item.descricaoManual?.trim() || null;
      if (!item.produtoId && !descricaoManual) throw new BadRequestException('Informe produto cadastrado ou descrição manual.');
      return {
        produtoId: item.produtoId || null,
        descricaoManual,
        quantidade,
        valorUnitario,
        valorTotal: Number((quantidade * valorUnitario).toFixed(2)),
        observacao: item.observacao?.trim() || null,
      };
    });
  }

  private async validarPedido(payload: any, itens: any[], isUpdate = false) {
    if (!isUpdate || payload.fornecedorId) {
      if (!payload.fornecedorId && !payload.fornecedorAvulsoNome?.trim()) {
        throw new BadRequestException('Informe fornecedor cadastrado ou fornecedor avulso.');
      }
    }
    if (payload.fornecedorId) await this.ensureFornecedor(payload.fornecedorId);
    if (payload.solicitacaoEstoqueId) await this.ensureSolicitacao(payload.solicitacaoEstoqueId);
    if (payload.osId || payload.ordemServicoId) await this.ensureOS(payload.osId || payload.ordemServicoId);
    for (const item of itens) {
      if (item.produtoId) await this.ensureProduto(item.produtoId);
    }
  }

  private async findPedido(id: string) {
    const pedido = await (this.prisma as any).pedidoCompra.findUnique({
      where: { id },
      include: this.includePedido(),
    });
    if (!pedido) throw new NotFoundException('Pedido de compra não encontrado.');
    return pedido;
  }

  private includePedido() {
    return {
      fornecedor: { select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } },
      solicitacaoEstoque: true,
      ordemServico: { select: { id: true, numeroOS: true, placaVeiculo: true, modeloVeiculo: true, status: true } },
      criadoPor: { select: { id: true, nome: true, email: true } },
      aprovadoPor: { select: { id: true, nome: true, email: true } },
      itens: { include: { produto: true } },
      recebimentos: true,
      divergencias: { include: this.includeDivergencia() },
      lancamentosContabeis: true,
      documentosFiscais: true,
    };
  }

  private includeDivergencia() {
    return {
      fornecedor: { select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } },
      produto: { select: { id: true, sku: true, nome: true, categoria: true } },
      responsavel: { select: { id: true, nome: true, email: true } },
      pedidoCompra: { select: { id: true, numero: true, status: true } },
    };
  }

  private buildPedidoWhere(filtros: any) {
    const where: any = {};
    if (filtros.status) where.status = filtros.status;
    if (filtros.fornecedorId) where.fornecedorId = filtros.fornecedorId;
    if (filtros.osId || filtros.ordemServicoId) where.osId = filtros.osId || filtros.ordemServicoId;
    if (filtros.solicitacaoEstoqueId) where.solicitacaoEstoqueId = filtros.solicitacaoEstoqueId;
    const busca = filtros.busca?.trim();
    if (busca) {
      const numero = Number(busca.replace(/\D/g, ''));
      where.OR = [
        { fornecedorAvulsoNome: { contains: busca } },
        { observacao: { contains: busca } },
        { fornecedor: { is: { nomeFantasia: { contains: busca } } } },
        { fornecedor: { is: { razaoSocial: { contains: busca } } } },
      ];
      if (Number.isInteger(numero) && numero > 0) where.OR.push({ numero });
    }
    return where;
  }

  private produtoFornecedorData(produtoId: string, payload: any, partial = false) {
    return {
      produtoId: partial ? undefined : produtoId,
      fornecedorId: partial ? undefined : payload.fornecedorId,
      codigoFornecedor: payload.codigoFornecedor === undefined ? undefined : payload.codigoFornecedor || null,
      custoUltimaCompra: payload.custoUltimaCompra === undefined || payload.custoUltimaCompra === '' ? undefined : Number(payload.custoUltimaCompra),
      prazoEntregaDias: payload.prazoEntregaDias === undefined || payload.prazoEntregaDias === '' ? undefined : Number(payload.prazoEntregaDias),
      fornecedorPreferencial: payload.fornecedorPreferencial === undefined ? undefined : Boolean(payload.fornecedorPreferencial),
      ativo: payload.ativo === undefined ? undefined : Boolean(payload.ativo),
      observacao: payload.observacao === undefined ? undefined : payload.observacao || null,
    };
  }

  private toPedidoResponse(pedido: any) {
    return {
      ...pedido,
      valorTotal: Number(pedido.valorTotal || 0),
      fornecedorNome: pedido.fornecedor?.nomeFantasia || pedido.fornecedor?.razaoSocial || pedido.fornecedorAvulsoNome || 'Fornecedor avulso',
      itens: (pedido.itens || []).map((item: any) => ({
        ...item,
        valorUnitario: Number(item.valorUnitario || 0),
        valorTotal: Number(item.valorTotal || 0),
      })),
    };
  }

  private toDivergenciaResponse(item: any) {
    return {
      ...item,
      valorAfetado: item.valorAfetado === null || item.valorAfetado === undefined ? null : Number(item.valorAfetado),
      fornecedorNome: item.fornecedor?.nomeFantasia || item.fornecedor?.razaoSocial || null,
      produtoNome: item.produto?.nome || item.descricaoProduto || null,
    };
  }

  private toProdutoFornecedorResponse(item: any) {
    return {
      ...item,
      custoUltimaCompra: item.custoUltimaCompra === null || item.custoUltimaCompra === undefined ? null : Number(item.custoUltimaCompra),
      fornecedorNome: item.fornecedor?.nomeFantasia || item.fornecedor?.razaoSocial || null,
    };
  }

  private sumItens(itens: Array<{ valorTotal: number }>) {
    return Number(itens.reduce((total, item) => total + item.valorTotal, 0).toFixed(2));
  }

  private normalizePedidoStatus(value: string) {
    const normalized = String(value || '').trim().toUpperCase();
    if (!PEDIDO_STATUS.includes(normalized as any)) throw new BadRequestException('Status do pedido de compra inválido.');
    return normalized;
  }

  private normalizeRecebimentoStatus(value: string) {
    const normalized = String(value || '').trim().toUpperCase();
    if (!RECEBIMENTO_STATUS.includes(normalized as any)) throw new BadRequestException('Status do recebimento inválido.');
    return normalized;
  }

  private normalizeDivergenciaStatus(value: string) {
    const normalized = String(value || '').trim().toUpperCase();
    if (!DIVERGENCIA_STATUS.includes(normalized as any)) throw new BadRequestException('Status da divergência inválido.');
    return normalized;
  }

  private normalizeTipoDivergencia(value: string) {
    const normalized = String(value || '').trim().toUpperCase();
    if (!TIPOS_DIVERGENCIA.includes(normalized as any)) throw new BadRequestException('Tipo de divergência inválido.');
    return normalized;
  }

  private toDate(value?: string | Date | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Data informada inválida.');
    return date;
  }

  private toPositiveInt(value: number | string, message: string) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue <= 0) throw new BadRequestException(message);
    return numberValue;
  }

  private toNonNegativeInt(value: number | string, message: string) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue < 0) throw new BadRequestException(message);
    return numberValue;
  }

  private toNonNegativeNumber(value: number | string, message: string) {
    const numberValue = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(numberValue) || numberValue < 0) throw new BadRequestException(message);
    return numberValue;
  }

  private async ensureProduto(id: string) {
    const produto = await (this.prisma as any).produto.findUnique({ where: { id } });
    if (!produto) throw new BadRequestException('Produto informado não existe.');
  }

  private async ensureFornecedor(id: string) {
    const fornecedor = await (this.prisma as any).fornecedor.findUnique({ where: { id } });
    if (!fornecedor) throw new BadRequestException('Fornecedor informado não existe.');
  }

  private async ensureSolicitacao(id: string) {
    const solicitacao = await (this.prisma as any).solicitacaoEstoque.findUnique({ where: { id } });
    if (!solicitacao) throw new BadRequestException('Solicitação de estoque informada não existe.');
  }

  private async ensureOS(id: string) {
    const os = await (this.prisma as any).ordemServico.findUnique({ where: { id } });
    if (!os) throw new BadRequestException('Ordem de Serviço informada não existe.');
  }

  async anexarDocumento(id: string, payload: any, file: Express.Multer.File, user: any) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    
    const originalName = file.originalname || 'documento';
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const allowedExts = ['pdf', 'xml', 'json', 'jpg', 'jpeg', 'png', 'xlsx', 'docx'];
    const blockedExts = ['exe', 'bat', 'cmd', 'ps1', 'msi', 'js', 'vbs', 'scr'];

    if (blockedExts.includes(ext) || !allowedExts.includes(ext)) {
      throw new BadRequestException('Tipo de arquivo não permitido.');
    }

    await this.findPedido(id);

    const dir = path.join(process.cwd(), 'uploads', 'compras', 'pedidos', id, 'documentos');
    await fs.promises.mkdir(dir, { recursive: true });

    const safeFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName) || '.bin'}`;
    const filePath = path.join(dir, safeFilename);
    const relativo = path.posix.join('uploads', 'compras', 'pedidos', id, 'documentos', safeFilename);

    let buffer = file.buffer;
    if (!buffer && (file as any).path) {
      buffer = await fs.promises.readFile((file as any).path);
    }
    if (!buffer) throw new BadRequestException('Erro ao processar conteúdo do arquivo.');

    await fs.promises.writeFile(filePath, buffer);

    const doc = await (this.prisma as any).documentoPedidoCompra.create({
      data: {
        pedidoCompraId: id,
        tipoDocumento: payload.tipoDocumento || 'OUTROS',
        descricao: payload.descricao || originalName,
        nomeOriginal: originalName,
        nomeArquivoSalvo: safeFilename,
        caminhoRelativo: relativo,
        mimeType: file.mimetype || 'application/octet-stream',
        tamanhoBytes: file.size || (buffer.length ?? 0),
        observacao: payload.observacao || null,
        usuarioId: user?.id || null,
      },
    });

    return doc;
  }

  async listarDocumentos(id: string) {
    await this.findPedido(id);
    try {
      const docs = await (this.prisma as any).documentoPedidoCompra.findMany({
        where: { pedidoCompraId: id, status: 'ATIVO' },
        orderBy: { criadoEm: 'desc' },
        include: { usuario: { select: { id: true, nome: true } } },
      });
      return docs || [];
    } catch (err: any) {
      // Retorna array vazio em vez de erro 500 caso a tabela não exista ou falhe
      return [];
    }
  }

  async baixarDocumento(id: string, documentoId: string) {
    const doc = await (this.prisma as any).documentoPedidoCompra.findFirst({
      where: { id: documentoId, pedidoCompraId: id, status: 'ATIVO' },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    const filePath = path.join(process.cwd(), doc.caminhoRelativo);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Arquivo físico não encontrado no servidor.');

    return {
      stream: fs.createReadStream(filePath),
      filename: doc.nomeOriginal,
      mimeType: doc.mimeType,
    };
  }

  async removerDocumento(id: string, documentoId: string, user: any) {
    const doc = await (this.prisma as any).documentoPedidoCompra.findFirst({
      where: { id: documentoId, pedidoCompraId: id, status: 'ATIVO' },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    return (this.prisma as any).documentoPedidoCompra.update({
      where: { id: documentoId },
      data: { status: 'CANCELADO' },
    });
  }
}
