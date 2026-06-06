import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class AnalisesRelatoriosService {
  constructor(private prisma: PrismaService) {}

  private getDateFilter(query: any, dateField: string = 'criadoEm') {
    const { dataInicial, dataFinal } = query;
    const dateFilter = {};
    if (dataInicial || dataFinal) {
      dateFilter[dateField] = {};
      if (dataInicial) dateFilter[dateField].gte = new Date(dataInicial);
      if (dataFinal) {
        const endDate = new Date(dataFinal);
        endDate.setHours(23, 59, 59, 999);
        dateFilter[dateField].lte = endDate;
      }
    }
    return dateFilter;
  }

  async getResumo(query: any) {
    const dateFilter = this.getDateFilter(query, 'criadoEm');
    
    const [totalOs, osAbertas, osExecucao, osConcluidas] = await Promise.all([
      this.prisma.ordemServico.count({ where: dateFilter }),
      this.prisma.ordemServico.count({ where: { status: 'ABERTA', ...dateFilter } }),
      this.prisma.ordemServico.count({ where: { status: 'EM_EXECUCAO', ...dateFilter } }),
      this.prisma.ordemServico.count({ where: { status: 'CONCLUIDA', ...dateFilter } }),
    ]);

    const osList = await this.prisma.ordemServico.findMany({
      where: dateFilter,
      include: { pagamentos: true, transacoes: true }
    });

    let osPendentes = 0;
    let faturamentoTotal = 0;
    
    for (const os of osList) {
      const pagoLegado = os.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      const pagoTransacoes = os.transacoes
        .filter(t => t.tipo === 'RECEITA' && t.status === 'PAGO')
        .reduce((acc, t) => acc + t.valor, 0);
      const totalPago = pagoLegado + pagoTransacoes;
      
      faturamentoTotal += totalPago; // Alterando faturamento para usar Total Recebido conforme pedido

      // Se não foi totalmente paga, mas tem valorFinal maior que zero
      if ((os.valorFinal || 0) > 0 && totalPago < (os.valorFinal || 0)) {
        osPendentes++;
      }
    }

    const ticketMedio = totalOs > 0 ? faturamentoTotal / totalOs : 0;

    const produtos = await this.prisma.produto.findMany({
      select: { quantityInStock: true, estoqueMinimo: true }
    });
    const produtosCriticos = produtos.filter(p => p.quantityInStock <= p.estoqueMinimo).length;

    const agendamentosFilter = this.getDateFilter(query, 'dataInicio');
    const agendamentos = await this.prisma.agendamento.count({ where: agendamentosFilter });
    
    const documentosAtivos = await this.prisma.manualProcedimento.count({ where: { status: 'ATIVO' } });

    return {
      totalOs,
      osAbertas,
      osExecucao,
      osConcluidas,
      osPendentes,
      faturamentoTotal,
      ticketMedio,
      produtosCriticos,
      agendamentos,
      documentosAtivos
    };
  }

  async getOs(query: any) {
    const dateFilter = this.getDateFilter(query, 'criadoEm');
    return this.prisma.ordemServico.findMany({
      where: dateFilter,
      include: {
        cliente: true,
        veiculo: true,
        responsavel: true,
        pagamentos: true
      },
      orderBy: { criadoEm: 'desc' }
    });
  }

  async getFinanceiro(query: any) {
    const dateFilter = this.getDateFilter(query, 'criadoEm');

    const ordens = await this.prisma.ordemServico.findMany({
      where: dateFilter,
      include: { pagamentos: true, transacoes: true }
    });

    let totalFaturado = 0; // Valor final projetado das OS
    let totalRecebido = 0; // Valor realmente recebido
    let descontosConcedidos = 0;
    let osPagas = 0;
    let osPendentes = 0;

    ordens.forEach(os => {
      totalFaturado += os.valorFinal || 0;
      descontosConcedidos += os.descontoAplicado || 0;
      
      const pagoLegado = os.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      const pagoTransacoes = os.transacoes
        .filter(t => t.tipo === 'RECEITA' && t.status === 'PAGO')
        .reduce((acc, t) => acc + t.valor, 0);
      const totalPago = pagoLegado + pagoTransacoes;
      
      totalRecebido += totalPago;
      
      if ((os.valorFinal || 0) > 0) {
        if (totalPago >= (os.valorFinal || 0)) {
          osPagas++;
        } else {
          osPendentes++;
        }
      }
    });

    const ticketMedio = ordens.length > 0 ? totalFaturado / ordens.length : 0;
    const totalPendente = totalFaturado - totalRecebido;

    return {
      totalFaturado,
      totalRecebido,
      totalPendente,
      ticketMedio,
      descontosConcedidos,
      osPagas,
      osPendentes,
      periodo: {
        dataInicial: query.dataInicial || null,
        dataFinal: query.dataFinal || null
      }
    };
  }

  async getEstoque(query: any) {
    return this.prisma.produto.findMany({
      orderBy: { quantityInStock: 'asc' }
    });
  }

  async getAgenda(query: any) {
    const dateFilter = this.getDateFilter(query, 'dataInicio');

    return this.prisma.agendamento.findMany({
      where: dateFilter,
      include: {
        recurso: true,
      },
      orderBy: { dataInicio: 'desc' }
    });
  }

  async getManuais(query: any) {
    return this.prisma.manualProcedimento.findMany({
      orderBy: { atualizadoEm: 'desc' }
    });
  }
}
