import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { calcularFinanceiroOs } from '../os/os-financeiro.util';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly statusOperacionais = {
    abertas: ['ABERTA'],
    emDiagnostico: ['EM_DIAGNOSTICO'],
    emExecucao: ['EM_EXECUCAO'],
    aguardandoAprovacao: ['AGUARDANDO_APROVACAO'],
    aguardandoPeca: ['AGUARDANDO_PECA'],
    concluidas: ['CONCLUIDA', 'CONCLUIDO'],
    entregues: ['ENTREGUE'],
    canceladas: ['CANCELADA'],
  };

  private startOfDay(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private stockStatus(produto: any) {
    const estoque = Number(produto?.quantityInStock ?? produto?.quantidadeAtual ?? 0);
    const minimo = Number(produto?.estoqueMinimo ?? produto?.minimumStock ?? 0);

    if (estoque <= 0) return 'ZERADO';
    if (minimo > 0 && estoque < minimo * 0.5) return 'CRITICO';
    if (minimo > 0 && estoque <= minimo) return 'BAIXO';
    return 'NORMAL';
  }

  private movementToApi(movement: any, ordemServico?: any) {
    return {
      ...movement,
      productId: movement.produtoId,
      type: movement.tipo,
      quantity: movement.quantidade,
      reason: movement.reason ?? movement.justificativa,
      createdAt: movement.timestamp,
      product: movement.produto,
      produto: movement.produto,
      user: movement.usuario,
      usuario: movement.usuario,
      ordemServico: ordemServico || null,
      os: ordemServico || null,
      cliente: ordemServico?.cliente || null,
      veiculo: ordemServico?.veiculo || null,
      osReferencia: ordemServico?.numeroOS ? `OS #${ordemServico.numeroOS}` : movement.serviceOrderNumber ? `OS #${movement.serviceOrderNumber}` : null,
    };
  }

  private periodMetrics(ordens: any[], desde: Date) {
    const ordensPeriodo = ordens.filter((ordem) => new Date(ordem.criadoEm) >= desde);
    const pagamentosPeriodo = ordens
      .flatMap((ordem) => ordem.financeiro.pagamentos.map((pagamento: any) => ({ ...pagamento, ordem })))
      .filter((pagamento) => pagamento.dataPagamento && new Date(pagamento.dataPagamento) >= desde);

    return {
      osCriadas: ordensPeriodo.length,
      osConcluidas: ordensPeriodo.filter((ordem) => this.statusOperacionais.concluidas.includes(ordem.status)).length,
      recebido: pagamentosPeriodo.reduce((acc, pagamento) => acc + Number(pagamento.valor || 0), 0),
      pagamentos: pagamentosPeriodo.length,
      osPagas: new Set(pagamentosPeriodo.map((pagamento) => pagamento.ordem.id)).size,
    };
  }

  async getDashboardExecutivo() {
    const now = new Date();
    const seteDias = new Date(now);
    seteDias.setDate(now.getDate() - 7);

    const [ordensBrutas, clientesCadastrados, veiculosCadastrados, produtos, movimentacoesRecentes] = await Promise.all([
      this.prisma.ordemServico.findMany({
        include: {
          cliente: true,
          veiculo: true,
          responsavel: { select: { id: true, nome: true, email: true, cargo: true } },
          itens: { include: { produto: true, servico: true } },
          transacoes: { orderBy: { dataPagamento: 'desc' } },
        },
        orderBy: { criadoEm: 'desc' },
      }),
      this.prisma.cliente.count(),
      this.prisma.veiculo.count(),
      this.prisma.produto.findMany({
        orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
      }),
      this.prisma.movimentacaoEstoque.findMany({
        include: {
          produto: {
            select: { id: true, sku: true, nome: true, categoria: true, quantityInStock: true, estoqueMinimo: true },
          },
          usuario: {
            select: { id: true, nome: true, email: true, cargo: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 8,
      }),
    ]);

    const osIdsMovimentacoes = Array.from(new Set(movimentacoesRecentes.map((movimento) => movimento.ordemServicoId).filter(Boolean)));
    const ordensMovimentacoes = osIdsMovimentacoes.length
      ? await this.prisma.ordemServico.findMany({
          where: { id: { in: osIdsMovimentacoes as string[] } },
          include: {
            cliente: true,
            veiculo: true,
            responsavel: { select: { id: true, nome: true, email: true, cargo: true } },
          },
        })
      : [];
    const ordensMovimentacoesPorId = new Map(ordensMovimentacoes.map((ordem) => [ordem.id, ordem]));

    const ordens = ordensBrutas.map((ordem) => ({
      ...ordem,
      financeiro: calcularFinanceiroOs(ordem),
    }));

    const statusCounts = Object.fromEntries(
      Object.entries(this.statusOperacionais).map(([key, status]) => [
        key,
        ordens.filter((ordem) => status.includes(ordem.status)).length,
      ]),
    );

    const totalRecebido = ordens.reduce((acc, ordem) => acc + ordem.financeiro.valorPago, 0);
    const totalPendente = ordens.reduce((acc, ordem) => acc + ordem.financeiro.saldoPendente, 0);
    const osPagas = ordens.filter((ordem) => ordem.financeiro.statusFinanceiro === 'PAGO').length;
    const osPendentesOuParciais = ordens.filter((ordem) =>
      ['PENDENTE', 'PARCIAL'].includes(ordem.financeiro.statusFinanceiro) && ordem.financeiro.totalGeral > 0,
    ).length;

    const produtosComStatus = produtos.map((produto) => ({
      ...produto,
      statusEstoque: this.stockStatus(produto),
      quantidadeAtual: produto.quantityInStock,
      minimumStock: produto.estoqueMinimo,
    }));
    const alertasEstoque = produtosComStatus
      .filter((produto) => ['BAIXO', 'CRITICO', 'ZERADO'].includes(produto.statusEstoque))
      .sort((a, b) => {
        const priority: Record<string, number> = { ZERADO: 0, CRITICO: 1, BAIXO: 2, NORMAL: 3 };
        return priority[a.statusEstoque] - priority[b.statusEstoque] || a.nome.localeCompare(b.nome);
      })
      .slice(0, 8);

    const ultimasOs = ordens.slice(0, 8).map((ordem) => ({
      id: ordem.id,
      numeroOS: ordem.numeroOS,
      status: ordem.status,
      statusFinanceiro: ordem.financeiro.statusFinanceiro,
      cliente: ordem.cliente,
      veiculo: ordem.veiculo,
      totalGeral: ordem.financeiro.totalGeral,
      valorPago: ordem.financeiro.valorPago,
      saldoPendente: ordem.financeiro.saldoPendente,
      criadoEm: ordem.criadoEm,
    }));

    const ultimasOsPagas = ordens
      .map((ordem) => {
        const ultimoPagamento = ordem.financeiro.pagamentos
          .filter((pagamento: any) => pagamento.dataPagamento)
          .sort((a: any, b: any) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime())[0];

        return { ordem, ultimoPagamento };
      })
      .filter((item) => item.ultimoPagamento)
      .sort((a, b) => new Date(b.ultimoPagamento.dataPagamento).getTime() - new Date(a.ultimoPagamento.dataPagamento).getTime())
      .slice(0, 8)
      .map(({ ordem, ultimoPagamento }) => ({
        id: ordem.id,
        numeroOS: ordem.numeroOS,
        status: ordem.status,
        statusFinanceiro: ordem.financeiro.statusFinanceiro,
        cliente: ordem.cliente,
        veiculo: ordem.veiculo,
        totalGeral: ordem.financeiro.totalGeral,
        valorPago: ordem.financeiro.valorPago,
        saldoPendente: ordem.financeiro.saldoPendente,
        ultimoPagamento: {
          id: ultimoPagamento.id,
          valor: Number(ultimoPagamento.valor || 0),
          metodoPagamento: ultimoPagamento.metodoPagamento,
          dataPagamento: ultimoPagamento.dataPagamento,
        },
      }));

    return {
      atualizadoEm: now,
      operacao: {
        totalOs: ordens.length,
        ...statusCounts,
      },
      financeiro: {
        valorRecebido: totalRecebido,
        valoresPendentes: totalPendente,
        osPagas,
        osPendentesOuParciais,
      },
      cadastros: {
        clientes: clientesCadastrados,
        veiculos: veiculosCadastrados,
        produtos: produtos.length,
      },
      estoque: {
        produtosCadastrados: produtos.length,
        itensComEstoqueBaixo: produtosComStatus.filter((produto) => ['BAIXO', 'CRITICO', 'ZERADO'].includes(produto.statusEstoque)).length,
        itensCriticosOuZerados: produtosComStatus.filter((produto) => ['CRITICO', 'ZERADO'].includes(produto.statusEstoque)).length,
        alertas: alertasEstoque,
      },
      periodos: {
        hoje: this.periodMetrics(ordens, this.startOfDay(now)),
        ultimos7Dias: this.periodMetrics(ordens, seteDias),
        mesAtual: this.periodMetrics(ordens, this.startOfMonth(now)),
      },
      recentes: {
        ultimasOs,
        ultimasOsPagas,
        movimentacoesEstoque: movimentacoesRecentes.map((movimento) =>
          this.movementToApi(
            movimento,
            movimento.ordemServicoId ? ordensMovimentacoesPorId.get(movimento.ordemServicoId) : null,
          ),
        ),
      },
    };
  }

  async getKpisMestres(periodo: string = 'mensal') {
    let dateFilter = new Date();
    if (periodo === 'mensal') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else if (periodo === 'semanal') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else {
      dateFilter.setDate(dateFilter.getDate() - 1); // diario
    }

    // 1. KPI Ticket Médio OBRIGATÓRIO (Sprint 6.2.1)
    const resultTicket = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM("valorFinal"), 0) as receita_os,
        COUNT(id) as count_os
      FROM ordens_servico 
      WHERE status = 'PAGO'
      AND "criadoEm" >= ${dateFilter}
    `;

    const resultPdv = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM("valorTotal"), 0) as receita_pdv,
        COUNT(id) as count_pdv
      FROM vendas_pdv
      WHERE "criadoEm" >= ${dateFilter}
    `;

    const rOS = resultTicket[0];
    const rPDV = resultPdv[0];
    const totalReceita = Number(rOS.receita_os) + Number(rPDV.receita_pdv);
    const totalCount = Number(rOS.count_os) + Number(rPDV.count_pdv);
    
    const ticketMedio = totalCount > 0 ? totalReceita / totalCount : 0;

    // 2. KPI Lucro Líquido vs Faturamento (Sprint 6.2.2)
    const custoOS = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(i.quantidade * p."precoCusto"), 0) as custo
      FROM itens_os i
      JOIN ordens_servico o ON i."ordemServicoId" = o.id
      JOIN produtos p ON i."produtoId" = p.id
      WHERE o.status = 'PAGO' AND o."criadoEm" >= ${dateFilter}
    `;
    
    const custoPDV = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(i.quantidade * p."precoCusto"), 0) as custo
      FROM itens_venda_pdv i
      JOIN vendas_pdv v ON i."vendaId" = v.id
      JOIN produtos p ON i."produtoId" = p.id
      WHERE v."criadoEm" >= ${dateFilter}
    `;

    const totalCusto = Number(custoOS[0].custo) + Number(custoPDV[0].custo);
    const lucroLiquido = totalReceita - totalCusto;

    // 3. KPI Lead Time Médio de Pátio (Sprint 6.2.3)
    const leadTime = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(AVG(CAST(DATEDIFF(SECOND, "criadoEm", "atualizadoEm") AS FLOAT) / 3600.0), 0) as lead_time_horas
      FROM ordens_servico
      WHERE status IN ('CONCLUIDO', 'CONCLUIDA', 'PAGO')
      AND "criadoEm" >= ${dateFilter}
    `;

    // 4. KPI Produtividade Mecânica (Sprint 6.2.4)
    const produtividade = await this.prisma.$queryRaw<any[]>`
      SELECT u.nome, COALESCE(SUM(o."valorMaoDeObra"), 0) as gerado
      FROM ordens_servico o
      JOIN usuarios u ON o.responsavel_id = u.id
      WHERE o.status = 'PAGO' AND o."criadoEm" >= ${dateFilter}
      GROUP BY u.nome
      ORDER BY gerado DESC
    `;

    // 5. KPI Taxa de Retenção (LTV) (Sprint 6.2.5)
    // Quantos clientes voltaram? (Mais de 1 OS paga nos ultimos 12 meses)
    const retencao = await this.prisma.$queryRaw<any[]>`
      WITH ClienteCount AS (
        SELECT cliente_id, COUNT(id) as total_os
        FROM ordens_servico
        WHERE status = 'PAGO' AND "criadoEm" >= DATEADD(YEAR, -1, GETDATE())
        GROUP BY cliente_id
      )
      SELECT 
        COUNT(*) as total_clientes,
        SUM(CASE WHEN total_os > 1 THEN 1 ELSE 0 END) as clientes_retidos
      FROM ClienteCount
    `;

    const rRet = retencao[0];
    const totalClientes = Number(rRet?.total_clientes || 0);
    const taxaRetencao = totalClientes > 0 ? (Number(rRet?.clientes_retidos || 0) / totalClientes) * 100 : 0;

    // Mantemos Curva ABC para compatibilidade do DashboardLegado
    const curvaAbcBruta = await this.prisma.$queryRaw<any[]>`
       SELECT TOP 10 p.nome as produto, p.sku, SUM(i.quantidade) as qntd, SUM(i.quantidade * p."precoVenda") as receita
       FROM itens_os i
       JOIN produtos p ON i."produtoId" = p.id
       JOIN ordens_servico o ON i."ordemServicoId" = o.id
       WHERE o.status = 'PAGO'
       GROUP BY p.id, p.nome, p.sku
       ORDER BY receita DESC
    `;

    return {
       ticketMedio,
       faturamentoBruto: totalReceita,
       lucroLiquido,
       custoAbsoluto: totalCusto,
       leadTimeHoras: Number(leadTime[0].lead_time_horas),
       produtividadeMecanicos: produtividade.map(p => ({ nome: p.nome, gerado: Number(p.gerado) })),
       taxaRetencaoLtv: taxaRetencao,
       periodoAvaliado: periodo,
       curvaAbc: curvaAbcBruta.map(c => ({ produto: c.produto, sku: c.sku, qntdTotal: Number(c.qntd), receitaTotalEstimada: Number(c.receita) }))
    };
  }
}
