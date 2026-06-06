import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { MetodoPagamento, TipoMovimentacao } from '../../domain/enums';
import { PdfService } from '../pdf/pdf.service';
import { AuditService } from '../audit/audit.service';
import { calcularFinanceiroOs } from '../os/os-financeiro.util';

@Injectable()
export class PdvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly auditService: AuditService,
  ) {}

  private mapOsFinanceiro(os: any) {
    return { ...os, ...calcularFinanceiroOs(os) };
  }

  private readonly statusPagaveis = ['APROVADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CONCLUIDO', 'ENTREGUE', 'PAGO'];
  private readonly statusPagaveisGestao = [...this.statusPagaveis, 'ABERTA'];

  private canPagarOs(os: any, user?: any) {
    const role = String(user?.cargo || '').trim().toUpperCase();
    const isGestao = ['ADMIN', 'ADMINISTRADOR', 'DIRETOR', 'GERENTE'].includes(role);
    const status = String(os?.status || '').trim().toUpperCase();
    return (isGestao ? this.statusPagaveisGestao : this.statusPagaveis).includes(status);
  }

  private filtrarOsComSaldo(ordens: any[], user?: any) {
    return ordens
      .map((os) => this.mapOsFinanceiro(os))
      .filter((os) =>
        os.status !== 'CANCELADA'
        && os.statusFinanceiro !== 'PAGO'
        && os.saldoPendente > 0
        && this.canPagarOs(os, user),
      );
  }

  async iniciarSessao(usuarioId: string, saldoInicial: number) {
    // Verifica se já tem caixa aberto
    const caixaAberto = await this.prisma.sessaoCaixa.findFirst({
        where: { usuarioId, dataFechamento: null }
    });
    if (caixaAberto) throw new BadRequestException('Usuário já possui um caixa aberto.');

    return this.prisma.sessaoCaixa.create({
        data: { usuarioId, saldoInicial }
    });
  }

  async fecharSessao(usuarioId: string, saldoFinalInformado: number) {
    const caixa = await this.prisma.sessaoCaixa.findFirst({
        where: { usuarioId, dataFechamento: null }
    });
    if (!caixa) throw new NotFoundException('Nenhum caixa aberto encontrado.');

    return this.prisma.sessaoCaixa.update({
        where: { id: caixa.id },
        data: { dataFechamento: new Date(), saldoFinalInformado }
    });
  }

  async realizarVenda(data: { clienteId?: string, itens: { produtoId: string, quantidade: number, valorUn: number }[], metodoPagamento: MetodoPagamento }, usuarioId: string) {
    if (!data.itens || data.itens.length === 0) throw new BadRequestException('A venda precisa de pelo menos um item.');

    const itens = data.itens.map((item) => {
      const quantidade = Number(item.quantidade);
      const valorUn = Number(item.valorUn);
      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        throw new BadRequestException('Quantidade da venda deve ser um numero inteiro positivo.');
      }
      if (!Number.isFinite(valorUn) || valorUn < 0) {
        throw new BadRequestException('Valor unitário da venda deve ser válido.');
      }
      return { ...item, quantidade, valorUn };
    });

    const valorTotal = itens.reduce((acc, it) => acc + (it.quantidade * it.valorUn), 0);

    // Requisito 16.4: Transação Atômica - Se der erro em qualquer etapa (como falta de estoque), NADA é salvo
    const result = await this.prisma.$transaction(async (tx) => {
        // 1. Cria a Venda
        const venda = await tx.vendaPDV.create({
            data: {
                clienteId: data.clienteId,
                valorTotal,
                itens: {
                    create: itens.map(it => ({
                        produtoId: it.produtoId,
                        quantidade: it.quantidade,
                        valorUn: it.valorUn
                    }))
                }
            }
        });

        // 2. Registra o financeiro
        await tx.transacaoFinanceira.create({
            data: {
                tipo: 'RECEITA',
                valor: valorTotal,
                status: 'PAGO', // PDV de balcão o pagamento é na hora
                metodoPagamento: data.metodoPagamento,
                dataVencimento: new Date(),
                dataPagamento: new Date(),
                vendaPdvId: venda.id
            }
        });

        // 3. Dá baixa no Estoque
        for (const item of itens) {
            // Verifica o saldo em tempo real antes de subtrair
            const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
            if (!produto) throw new NotFoundException('Produto não encontrado.');
            const previousQuantity = Number(produto.quantityInStock ?? 0);
            const saldoGeral = previousQuantity;

            if (saldoGeral < item.quantidade) {
                const p = await tx.produto.findUnique({ where: { id: item.produtoId }});
                throw new BadRequestException(`Transação Abortada: Estoque Insuficiente para o produto ${p?.nome} (${p?.sku}). Saldo atual: ${saldoGeral}`);
            }

            const newQuantity = previousQuantity - item.quantidade;

            await tx.movimentacaoEstoque.create({
                data: {
                    tipo: TipoMovimentacao.SAIDA_PDV,
                    quantidade: item.quantidade,
                    previousQuantity,
                    newQuantity,
                    reason: 'Venda de Balcao (PDV)',
                    produtoId: item.produtoId,
                    usuarioId,
                    justificativa: 'Venda de Balcão (PDV)',
                }
            });
            await tx.produto.update({
                where: { id: item.produtoId },
                data: { quantityInStock: newQuantity },
            });
        }

        const produtos = await tx.produto.findMany({
            where: { id: { in: itens.map((item) => item.produtoId) } }
        });
        const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));

        return {
            mensagem: 'Venda avulsa registrada com sucesso.',
            venda: {
                ...venda,
                metodoPagamento: data.metodoPagamento,
                dataPagamento: new Date(),
                itens: itens.map((item) => ({
                    ...item,
                    produto: produtosPorId.get(item.produtoId) ?? null,
                    total: item.quantidade * item.valorUn,
                })),
            },
        };
    });
    await this.auditService.logAction({
      userId: usuarioId,
      action: 'PDV_SALE_CREATED',
      entity: 'VENDA_PDV',
      entityId: result.venda.id,
      description: 'Venda avulsa registrada no caixa.',
      metadata: { valorTotal: result.venda.valorTotal, metodoPagamento: data.metodoPagamento },
    });
    return result;
  }

  // ==========================================
  // PAGAMENTO DE ORDEM DE SERVIÇO NO CAIXA
  // ==========================================
  
  async buscarOsPendentes(busca?: string, user?: any) {
    const termo = String(busca || '').trim();
    if (!termo) throw new BadRequestException('Informe cliente, CPF/CNPJ ou número da OS.');
    const numero = Number(termo.replace(/\D/g, ''));

    const ordens = await this.prisma.ordemServico.findMany({
      where: {
        status: { in: ['CONCLUIDO', 'CONCLUIDA', 'EM_EXECUCAO', 'ABERTA', 'APROVADA', 'ENTREGUE'] },
        OR: [
          { cliente: { nome: { contains: termo } } },
          { cliente: { cpf_cnpj: { contains: termo } } },
          ...(Number.isFinite(numero) && numero > 0 ? [{ numeroOS: numero }] : []),
        ],
      },
      include: {
        cliente: true,
        veiculo: true,
        transacoes: true,
        pagamentos: true,
        itens: {
          include: {
            produto: true,
            servico: true,
          },
        },
      },
      orderBy: { atualizadoEm: 'desc' },
    });
    return this.filtrarOsComSaldo(ordens, user);
  }

  async buscarOsPendentePorCpf(cpf: string, user?: any) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { cpf_cnpj: { contains: cpf } }
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado com este CPF.');

    const ordens = await this.prisma.ordemServico.findMany({
      where: { 
        cliente_id: cliente.id,
        status: { in: ['CONCLUIDO', 'CONCLUIDA', 'EM_EXECUCAO', 'ABERTA', 'APROVADA', 'ENTREGUE'] }
      },
      include: { cliente: true, veiculo: true, itens: true, transacoes: true, pagamentos: true }
    });
    return this.filtrarOsComSaldo(ordens, user);
  }

  async pagarOS(osId: string, metodoPagamento: MetodoPagamento, user?: any, valor?: number) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      include: {
        cliente: true,
        veiculo: true,
        itens: {
          include: {
            produto: true,
            servico: true,
          },
        },
        transacoes: true,
        pagamentos: true,
      }
    });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (os.status === 'CANCELADA') throw new BadRequestException('OS cancelada não aceita pagamento.');
    if (!this.canPagarOs(os, user)) {
      await this.auditService.logAction({
        userId: user?.id,
        action: 'OS_PAYMENT_BLOCKED',
        entity: 'ORDEM_SERVICO',
        entityId: osId,
        description: `Pagamento bloqueado por status operacional da OS ${os.numeroOS}`,
        metadata: { status: os.status, cargo: user?.cargo },
      });
      throw new BadRequestException('Esta OS ainda não pode ser paga. Aprove ou conclua a OS antes do recebimento.');
    }

    const financeiro = calcularFinanceiroOs(os);
    if (financeiro.totalGeral <= 0) throw new BadRequestException('OS sem valor total para pagamento.');
    if (financeiro.saldoPendente <= 0) throw new BadRequestException('Esta Ordem de Serviço já está paga.');

    const valorPagamento = Number(valor ?? financeiro.saldoPendente);
    if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
      throw new BadRequestException('Informe um valor de pagamento valido.');
    }
    if (valorPagamento > financeiro.saldoPendente) {
      throw new BadRequestException('Pagamento maior que o saldo pendente da OS.');
    }

    const saldoAposPagamento = Math.max(financeiro.saldoPendente - valorPagamento, 0);
    const statusFinanceiro = saldoAposPagamento > 0 ? 'PARCIAL' : 'PAGO';

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Cria a Transação Financeira
      await tx.transacaoFinanceira.create({
        data: {
          tipo: 'RECEITA',
          valor: valorPagamento,
          status: 'PAGO',
          metodoPagamento,
          dataVencimento: new Date(),
          dataPagamento: new Date(),
          ordemServicoId: os.id
        }
      });

      // 2. Atualiza Status da OS
      const osAtualizada = await tx.ordemServico.update({
        where: { id: osId },
        data: saldoAposPagamento <= 0 ? { status: 'PAGO' } : {},
        include: {
          cliente: true,
          veiculo: true,
          transacoes: true,
          pagamentos: true,
          itens: {
            include: {
              produto: true,
              servico: true,
            },
          },
        },
      });

      await tx.ordemServicoEvento.create({
        data: {
          ordemServicoId: os.id,
          usuarioId: user?.id || null,
          tipo: 'PAGAMENTO_REGISTRADO',
          titulo: 'Pagamento Registrado',
          descricao: `Pagamento de R$ ${valorPagamento.toFixed(2)} via ${metodoPagamento}.`,
          severidade: 'SUCESSO',
          origem: 'PDV',
        }
      });

      return {
        mensagem: statusFinanceiro === 'PAGO' ? 'Pagamento registrado com sucesso.' : 'Pagamento parcial registrado com sucesso.',
        comprovanteSimulado: true,
        metodoPagamento,
        valorPago: valorPagamento,
        saldoPendente: saldoAposPagamento,
        statusFinanceiro,
        dataPagamento: new Date(),
        os: this.mapOsFinanceiro(osAtualizada)
      };
    });
    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_PAYMENT_REGISTERED',
      entity: 'ORDEM_SERVICO',
      entityId: osId,
      description: `Pagamento registrado para OS ${result.os.numeroOS}`,
      metadata: { metodoPagamento, valor: valorPagamento, saldoPendente: result.saldoPendente, statusFinanceiro: result.statusFinanceiro },
    });
    return result;
  }

  // ==========================================
  // LEITURA Z E AUDITORIA DE CAIXA
  // ==========================================
  async gerarLeituraZ(usuarioId: string) {
    // 1. Pega o último caixa que este usuário fechou
    const ultimaSessao = await this.prisma.sessaoCaixa.findFirst({
      where: { usuarioId, dataFechamento: { not: null } },
      orderBy: { dataFechamento: 'desc' },
    });

    if (!ultimaSessao) {
      throw new NotFoundException('Nenhuma sessão de caixa fechada encontrada para este usuário.');
    }

    // 2. Busca todas as receitas (vendas e OS) geradas no intervalo daquela sessão
    const transacoes = await this.prisma.transacaoFinanceira.findMany({
      where: {
        tipo: 'RECEITA',
        dataPagamento: { // <--- CORRIGIDO AQUI
          gte: ultimaSessao.dataAbertura, // Desde a hora que abriu...
          lte: ultimaSessao.dataFechamento, // ...até a hora que fechou
        },
      },
    });

    // 3. Separa o faturamento por método de pagamento
    let totalPix = 0;
    let totalCartao = 0;
    let totalDinheiroVendas = 0;

    for (const t of transacoes) {
      const valor = Number(t.valor);
      if (t.metodoPagamento === 'PIX') totalPix += valor;
      else if (t.metodoPagamento === 'CREDITO' || t.metodoPagamento === 'DEBITO') totalCartao += valor;
      else if (t.metodoPagamento === 'DINHEIRO') totalDinheiroVendas += valor;
    }

    const faturamentoBruto = totalPix + totalCartao + totalDinheiroVendas;

    // 4. A Matemática da Gaveta (O pulo do gato)
    // O sistema espera que na gaveta tenha: O troco inicial + O que foi vendido em papel
    const dinheiroEsperadoNoSistema = Number(ultimaSessao.saldoInicial) + totalDinheiroVendas;
    const dinheiroInformadoPeloCaixa = Number(ultimaSessao.saldoFinalInformado);
    
    // Quebra de caixa: Positivo = Sobrou dinheiro, Negativo = Faltou dinheiro, Zero = Perfeito
    const quebraDeCaixa = dinheiroInformadoPeloCaixa - dinheiroEsperadoNoSistema;

    return {
      sessaoId: ultimaSessao.id,
      abertura: ultimaSessao.dataAbertura, // <--- CORRIGIDO AQUI
      fechamento: ultimaSessao.dataFechamento,
      faturamentoBruto,
      detalhes: {
        pix: totalPix,
        cartao: totalCartao,
        dinheiroVendas: totalDinheiroVendas,
      },
      auditoria: {
        saldoInicialTroco: Number(ultimaSessao.saldoInicial),
        dinheiroEsperadoNaGaveta: dinheiroEsperadoNoSistema,
        dinheiroInformadoPeloCaixa: dinheiroInformadoPeloCaixa,
        quebraDeCaixa: quebraDeCaixa,
        status: quebraDeCaixa === 0 ? 'CAIXA BATIDO' : (quebraDeCaixa < 0 ? 'FALTA' : 'SOBRA'),
      }
    };
  }
}
