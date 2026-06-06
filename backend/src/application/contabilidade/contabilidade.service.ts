import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma.service';

const TIPOS = ['RECEITA', 'DESPESA'] as const;
const STATUS = ['REGISTRADO', 'PENDENTE', 'PAGO', 'RECEBIDO', 'VENCIDO', 'CANCELADO'] as const;
const ORIGENS = ['MANUAL', 'OS', 'PDV', 'FORNECEDOR', 'AJUSTE'] as const;
const NATUREZAS = ['LANCAMENTO', 'CONTA_A_PAGAR', 'CONTA_A_RECEBER'] as const;

type TipoLancamento = (typeof TIPOS)[number];
type StatusLancamento = (typeof STATUS)[number];
type OrigemLancamento = (typeof ORIGENS)[number];
type NaturezaFinanceira = (typeof NATUREZAS)[number];

type FiltrosLancamentos = {
  inicio?: string;
  fim?: string;
  ano?: string;
  tipo?: string;
  naturezaFinanceira?: string;
  categoria?: string;
  centroCusto?: string;
  status?: string;
  fornecedorId?: string;
  ordemServicoId?: string;
  origem?: string;
  busca?: string;
};

type LancamentoPayload = {
  tipo?: string;
  naturezaFinanceira?: string;
  categoria?: string;
  centroCusto?: string | null;
  descricao?: string;
  valor?: number | string;
  dataLancamento?: string;
  competencia?: string | null;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  dataRecebimento?: string | null;
  numeroDocumento?: string | null;
  recorrente?: boolean;
  parcelaAtual?: number | string | null;
  parcelaTotal?: number | string | null;
  fornecedorId?: string | null;
  ordemServicoId?: string | null;
  formaPagamento?: string | null;
  status?: string;
  origem?: string;
  observacoes?: string | null;
};

type PagarLancamentoPayload = {
  valorPago: number;
  dataPagamento: string;
  formaPagamento: string;
  numeroDocumento?: string;
  justificativaDivergencia?: string;
  observacoes?: string;
};

@Injectable()
export class ContabilidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumo(filtros: FiltrosLancamentos) {
    const lancamentos = await this.findLancamentosResumo(filtros);
    const receitas = lancamentos.filter((item) => item.tipo === 'RECEITA');
    const despesas = lancamentos.filter((item) => item.tipo === 'DESPESA');
    const totalReceitas = this.sumValores(receitas);
    const totalDespesas = this.sumValores(despesas);
    const dre = this.calcularDre(lancamentos, filtros);
    const vencidas = lancamentos.filter((item) => this.isVencido(item));
    const contasAPagarPendentes = lancamentos.filter((item) => item.naturezaFinanceira === 'CONTA_A_PAGAR' && this.isPendente(item)).length;
    const contasAReceberPendentes = lancamentos.filter((item) => item.naturezaFinanceira === 'CONTA_A_RECEBER' && this.isPendente(item)).length;
    const despesasPorCategoria = this.groupByCategoria(despesas, totalDespesas, 'DESPESA');

    return {
      periodo: { inicio: filtros.inicio || null, fim: filtros.fim || null },
      receitas: {
        total: totalReceitas,
        porCategoria: this.groupByCategoria(receitas, totalReceitas, 'RECEITA'),
      },
      despesas: {
        total: totalDespesas,
        porCategoria: despesasPorCategoria,
      },
      resultadoOperacional: totalReceitas - totalDespesas,
      margemOperacionalPercentual: totalReceitas > 0 ? Number((((totalReceitas - totalDespesas) / totalReceitas) * 100).toFixed(2)) : 0,
      contasPendentes: lancamentos.filter((item) => this.isPendente(item)).length,
      contasPagas: lancamentos.filter((item) => item.status === 'PAGO').length,
      contasRecebidas: lancamentos.filter((item) => item.status === 'RECEBIDO').length,
      contasAPagarPendentes,
      contasAReceberPendentes,
      contasVencidas: vencidas.length,
      fornecedoresComMaiorDespesa: this.groupByFornecedor(despesas),
      maiorCategoriaDespesa: despesasPorCategoria[0] || null,
      origemLancamentos: this.groupByOrigem(lancamentos),
      centrosCusto: this.groupByCentroCusto(lancamentos),
      dre,
    };
  }

  async listarLancamentos(filtros: FiltrosLancamentos) {
    const where = this.buildWhere(filtros);
    const lancamentos = await this.prisma.lancamentoContabilOperacional.findMany({
      where,
      include: this.includeBasico(),
      orderBy: [{ dataLancamento: 'desc' }, { criadoEm: 'desc' }],
    });

    return lancamentos.map((item) => this.toResponse(item));
  }

  async obterLancamento(id: string) {
    const lancamento = await this.prisma.lancamentoContabilOperacional.findUnique({
      where: { id },
      include: this.includeBasico(),
    });

    if (!lancamento) throw new NotFoundException('Lançamento contábil operacional não encontrado.');
    return this.toResponse(lancamento);
  }

  async criarLancamento(payload: LancamentoPayload, usuarioId?: string) {
    const data = await this.normalizePayload(payload, usuarioId);
    const lancamento = await this.prisma.lancamentoContabilOperacional.create({
      data,
      include: this.includeBasico(),
    });

    return this.toResponse(lancamento);
  }

  async atualizarLancamento(id: string, payload: LancamentoPayload) {
    await this.ensureExists(id);
    const data = await this.normalizePayload(payload);
    const lancamento = await this.prisma.lancamentoContabilOperacional.update({
      where: { id },
      data,
      include: this.includeBasico(),
    });

    return this.toResponse(lancamento);
  }

  async atualizarStatus(id: string, status: string, datas?: { dataPagamento?: string; dataRecebimento?: string }) {
    await this.ensureExists(id);
    const normalizedStatus = this.normalizeStatus(status);
    const lancamento = await this.prisma.lancamentoContabilOperacional.update({
      where: { id },
      data: {
        status: normalizedStatus,
        dataPagamento: datas?.dataPagamento ? this.toDate(datas.dataPagamento) : undefined,
        dataRecebimento: datas?.dataRecebimento ? this.toDate(datas.dataRecebimento) : undefined,
      },
      include: this.includeBasico(),
    });

    return this.toResponse(lancamento);
  }

  async cancelarLancamento(id: string) {
    return this.atualizarStatus(id, 'CANCELADO');
  }

  async pagarLancamento(id: string, payload: PagarLancamentoPayload) {
    const lancamento = await this.prisma.lancamentoContabilOperacional.findUnique({
      where: { id },
      include: { pedidoCompra: true },
    });

    if (!lancamento) throw new NotFoundException('Lançamento contábil operacional não encontrado.');
    if (lancamento.status === 'PAGO') throw new BadRequestException('Lançamento já está pago.');
    if (lancamento.status === 'CANCELADO') throw new BadRequestException('Lançamento está cancelado.');

    const valorOriginal = Number(lancamento.valor);
    const valorPago = Number(payload.valorPago);

    if (lancamento.observacoes?.includes('Recebimento zerado')) {
      throw new BadRequestException('Lançamento bloqueado: a mercadoria do pedido não foi recebida (recebimento zerado).');
    }

    const hasDivergencia = lancamento.pedidoCompra?.status === 'RECEBIDO_COM_DIVERGENCIA';
    const isPartialPayment = valorPago < valorOriginal;

    if ((hasDivergencia || isPartialPayment) && !payload.justificativaDivergencia?.trim()) {
      throw new BadRequestException('Justificativa obrigatória para pagamento com divergência ou valor menor.');
    }

    const novasObservacoes = [
      lancamento.observacoes,
      payload.observacoes,
      payload.justificativaDivergencia ? `Justificativa Pagamento Parcial/Divergência: ${payload.justificativaDivergencia}` : null,
    ].filter(Boolean).join(' | ');

    const updated = await this.prisma.lancamentoContabilOperacional.update({
      where: { id },
      data: {
        status: 'PAGO',
        valor: isPartialPayment ? valorPago : undefined,
        dataPagamento: this.toDate(payload.dataPagamento) || new Date(),
        formaPagamento: payload.formaPagamento?.trim() || null,
        numeroDocumento: payload.numeroDocumento?.trim() || lancamento.numeroDocumento,
        observacoes: novasObservacoes || undefined,
      },
      include: this.includeBasico(),
    });

    return this.toResponse(updated);
  }

  async getDre(filtros: FiltrosLancamentos) {
    return this.calcularDre(await this.findLancamentosResumo(filtros), filtros);
  }

  async getResumoMensal(ano?: string) {
    const anoNumero = Number(ano || new Date().getFullYear());
    if (!Number.isInteger(anoNumero) || anoNumero < 1900) throw new BadRequestException('Ano inválido.');

    const inicio = new Date(anoNumero, 0, 1);
    const fim = new Date(anoNumero, 11, 31, 23, 59, 59, 999);
    const lancamentos = await this.prisma.lancamentoContabilOperacional.findMany({
      where: { dataLancamento: { gte: inicio, lte: fim }, status: { not: 'CANCELADO' } },
    });

    return Array.from({ length: 12 }, (_, index) => {
      const mes = index + 1;
      const itensMes = lancamentos.filter((item) => new Date(item.dataLancamento).getMonth() === index);
      const receitas = this.sumValores(itensMes.filter((item) => item.tipo === 'RECEITA'));
      const despesas = this.sumValores(itensMes.filter((item) => item.tipo === 'DESPESA'));

      return {
        mes,
        receitas,
        despesas,
        resultado: receitas - despesas,
        contasAPagar: itensMes.filter((item) => item.naturezaFinanceira === 'CONTA_A_PAGAR').length,
        contasAReceber: itensMes.filter((item) => item.naturezaFinanceira === 'CONTA_A_RECEBER').length,
      };
    });
  }

  async gerarCsv(filtros: FiltrosLancamentos) {
    const lancamentos = await this.listarLancamentos(filtros);
    const header = [
      'Data',
      'Competencia',
      'Vencimento',
      'Pagamento/Recebimento',
      'Tipo',
      'Natureza',
      'Categoria',
      'Centro de custo',
      'Descrição',
      'Fornecedor',
      'OS',
      'Documento',
      'Valor',
      'Status',
      'Origem',
      'Observações',
    ];
    const rows = lancamentos.map((item) => [
      this.formatCsvDate(item.dataLancamento),
      this.formatCsvDate(item.competencia),
      this.formatCsvDate(item.dataVencimento),
      this.formatCsvDate(item.dataPagamento || item.dataRecebimento),
      item.tipo,
      item.naturezaFinanceira,
      item.categoria,
      item.centroCusto || '',
      item.descricao,
      item.fornecedor?.nome || '',
      item.ordemServico?.numeroOS ? String(item.ordemServico.numeroOS) : '',
      item.numeroDocumento || '',
      item.valor.toFixed(2).replace('.', ','),
      item.statusCalculado || item.status,
      item.origem,
      item.observacoes || '',
    ]);

    return this.toCsv([header, ...rows]);
  }

  async gerarDreCsv(filtros: FiltrosLancamentos) {
    const dre = await this.getDre(filtros);
    const rows = [
      ['Linha', 'Valor'],
      ['Receita bruta operacional', dre.receitaBruta.toFixed(2).replace('.', ',')],
      ...dre.despesas.map((item: any) => [`(-) ${item.categoria}`, item.total.toFixed(2).replace('.', ',')]),
      ['Total despesas', dre.totalDespesas.toFixed(2).replace('.', ',')],
      ['Resultado operacional estimado', dre.resultadoOperacional.toFixed(2).replace('.', ',')],
      ['Margem operacional percentual', String(dre.margemOperacionalPercentual).replace('.', ',')],
    ];

    return this.toCsv(rows);
  }

  async gerarResumoMensalCsv(ano?: string) {
    const resumo = await this.getResumoMensal(ano);
    const rows = [
      ['Mes', 'Receitas', 'Despesas', 'Resultado', 'Contas a pagar', 'Contas a receber'],
      ...resumo.map((item) => [
        String(item.mes),
        item.receitas.toFixed(2).replace('.', ','),
        item.despesas.toFixed(2).replace('.', ','),
        item.resultado.toFixed(2).replace('.', ','),
        String(item.contasAPagar),
        String(item.contasAReceber),
      ]),
    ];

    return this.toCsv(rows);
  }

  private async findLancamentosResumo(filtros: FiltrosLancamentos) {
    return this.prisma.lancamentoContabilOperacional.findMany({
      where: this.buildWhere(filtros, true),
      include: { fornecedor: { select: { id: true, nomeFantasia: true, razaoSocial: true } } },
      orderBy: { dataLancamento: 'desc' },
    });
  }

  private buildWhere(filtros: FiltrosLancamentos, ignoreCanceled = false): Prisma.LancamentoContabilOperacionalWhereInput {
    const where: Prisma.LancamentoContabilOperacionalWhereInput = {};
    const periodo = this.buildPeriodo(filtros.inicio, filtros.fim);

    if (periodo) where.dataLancamento = periodo;
    if (filtros.tipo) where.tipo = this.normalizeTipo(filtros.tipo);
    if (filtros.naturezaFinanceira) where.naturezaFinanceira = this.normalizeNatureza(filtros.naturezaFinanceira);
    if (filtros.categoria) where.categoria = { contains: filtros.categoria };
    if (filtros.centroCusto) where.centroCusto = { contains: filtros.centroCusto };
    if (filtros.status) where.status = this.normalizeStatus(filtros.status);
    if (filtros.fornecedorId) where.fornecedorId = filtros.fornecedorId;
    if (filtros.ordemServicoId) where.ordemServicoId = filtros.ordemServicoId;
    if (filtros.origem) where.origem = this.normalizeOrigem(filtros.origem);
    if (ignoreCanceled) where.status = { not: 'CANCELADO' };

    const busca = filtros.busca?.trim();
    if (busca) {
      const numeroOS = Number(busca);
      where.OR = [
        { descricao: { contains: busca } },
        { categoria: { contains: busca } },
        { centroCusto: { contains: busca } },
        { numeroDocumento: { contains: busca } },
        { fornecedor: { is: { nomeFantasia: { contains: busca } } } },
        { fornecedor: { is: { razaoSocial: { contains: busca } } } },
      ];

      if (Number.isInteger(numeroOS)) where.OR.push({ ordemServico: { is: { numeroOS } } });
    }

    return where;
  }

  private buildPeriodo(inicio?: string, fim?: string): Prisma.DateTimeFilter | undefined {
    const filter: Prisma.DateTimeFilter = {};
    if (inicio) {
      const date = new Date(inicio);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inicial inválida.');
      filter.gte = date;
    }
    if (fim) {
      const date = new Date(fim);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Data final inválida.');
      date.setHours(23, 59, 59, 999);
      filter.lte = date;
    }
    return Object.keys(filter).length ? filter : undefined;
  }

  private async normalizePayload(payload: LancamentoPayload, usuarioId?: string): Promise<Prisma.LancamentoContabilOperacionalUncheckedCreateInput> {
    const tipo = this.normalizeTipo(payload.tipo);
    const naturezaFinanceira = this.normalizeNatureza(payload.naturezaFinanceira || 'LANCAMENTO');
    const status = this.normalizeStatus(payload.status || 'REGISTRADO');
    const origem = this.normalizeOrigem(payload.origem || 'MANUAL');
    const categoria = payload.categoria?.trim();
    const descricao = payload.descricao?.trim();
    const valor = Number(payload.valor);

    if (!categoria) throw new BadRequestException('Categoria é obrigatória.');
    if (!descricao) throw new BadRequestException('Descrição é obrigatória.');
    if (!Number.isFinite(valor) || valor <= 0) throw new BadRequestException('Valor deve ser positivo.');
    if (naturezaFinanceira === 'CONTA_A_PAGAR' && tipo !== 'DESPESA') throw new BadRequestException('Conta a pagar deve ser despesa.');
    if (naturezaFinanceira === 'CONTA_A_RECEBER' && tipo !== 'RECEITA') throw new BadRequestException('Conta a receber deve ser receita.');

    await this.validateOptionalRelations(payload);

    return {
      tipo,
      naturezaFinanceira,
      categoria,
      centroCusto: payload.centroCusto?.trim() || null,
      descricao,
      valor: new Prisma.Decimal(valor),
      dataLancamento: this.toDate(payload.dataLancamento) || new Date(),
      competencia: this.toDate(payload.competencia || undefined),
      dataVencimento: this.toDate(payload.dataVencimento || undefined),
      dataPagamento: this.toDate(payload.dataPagamento || undefined),
      dataRecebimento: this.toDate(payload.dataRecebimento || undefined),
      numeroDocumento: payload.numeroDocumento?.trim() || null,
      recorrente: Boolean(payload.recorrente),
      parcelaAtual: this.toOptionalInt(payload.parcelaAtual),
      parcelaTotal: this.toOptionalInt(payload.parcelaTotal),
      fornecedorId: payload.fornecedorId || null,
      ordemServicoId: payload.ordemServicoId || null,
      usuarioId: usuarioId || undefined,
      formaPagamento: payload.formaPagamento?.trim() || null,
      status,
      origem,
      observacoes: payload.observacoes?.trim() || null,
    };
  }

  private async validateOptionalRelations(payload: LancamentoPayload) {
    if (payload.fornecedorId) {
      const fornecedor = await this.prisma.fornecedor.findUnique({ where: { id: payload.fornecedorId } });
      if (!fornecedor) throw new BadRequestException('Fornecedor informado não existe.');
    }

    if (payload.ordemServicoId) {
      const ordemServico = await this.prisma.ordemServico.findUnique({ where: { id: payload.ordemServicoId } });
      if (!ordemServico) throw new BadRequestException('Ordem de Serviço informada não existe.');
    }
  }

  private toDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Data informada inválida.');
    return date;
  }

  private toOptionalInt(value?: number | string | null) {
    if (value === undefined || value === null || value === '') return null;
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue <= 0) throw new BadRequestException('Parcelas devem ser numeros inteiros positivos.');
    return numberValue;
  }

  private normalizeTipo(value?: string): TipoLancamento {
    const normalized = String(value || '').trim().toUpperCase();
    if (TIPOS.includes(normalized as TipoLancamento)) return normalized as TipoLancamento;
    throw new BadRequestException('Tipo deve ser RECEITA ou DESPESA.');
  }

  private normalizeStatus(value: string): StatusLancamento {
    const normalized = String(value || '').trim().toUpperCase();
    if (STATUS.includes(normalized as StatusLancamento)) return normalized as StatusLancamento;
    throw new BadRequestException('Status inválido.');
  }

  private normalizeOrigem(value: string): OrigemLancamento {
    const normalized = String(value || '').trim().toUpperCase();
    if (ORIGENS.includes(normalized as OrigemLancamento)) return normalized as OrigemLancamento;
    throw new BadRequestException('Origem inválida.');
  }

  private normalizeNatureza(value: string): NaturezaFinanceira {
    const normalized = String(value || '').trim().toUpperCase();
    if (NATUREZAS.includes(normalized as NaturezaFinanceira)) return normalized as NaturezaFinanceira;
    throw new BadRequestException('Natureza financeira inválida.');
  }

  private async ensureExists(id: string) {
    const lancamento = await this.prisma.lancamentoContabilOperacional.findUnique({ where: { id } });
    if (!lancamento) throw new NotFoundException('Lançamento contábil operacional não encontrado.');
  }

  private includeBasico() {
    return {
      fornecedor: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
      ordemServico: { select: { id: true, numeroOS: true, placaVeiculo: true, modeloVeiculo: true } },
      pedidoCompra: { select: { id: true, numero: true, status: true } },
      usuario: { select: { id: true, nome: true, email: true } },
    };
  }

  private toResponse(item: any) {
    return {
      ...item,
      valor: Number(item.valor),
      statusCalculado: this.isVencido(item) ? 'VENCIDO' : item.status,
      fornecedor: item.fornecedor ? { id: item.fornecedor.id, nome: item.fornecedor.nomeFantasia || item.fornecedor.razaoSocial } : null,
    };
  }

  private isPendente(item: any) {
    return item.status === 'PENDENTE' || item.status === 'REGISTRADO';
  }

  private isVencido(item: any) {
    if (!this.isPendente(item) || !item.dataVencimento) return false;
    const vencimento = new Date(item.dataVencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    vencimento.setHours(0, 0, 0, 0);
    return vencimento < hoje;
  }

  private calcularDre(lancamentos: any[], filtros: FiltrosLancamentos) {
    const receitas = lancamentos.filter((item) => item.tipo === 'RECEITA');
    const despesas = lancamentos.filter((item) => item.tipo === 'DESPESA');
    const receitaBruta = this.sumValores(receitas);
    const despesasAgrupadas = this.groupByCategoria(despesas, this.sumValores(despesas), 'DESPESA').map((item) => ({
      categoria: item.categoria,
      total: item.total,
    }));
    const totalDespesas = this.sumValores(despesas);
    const resultadoOperacional = receitaBruta - totalDespesas;

    return {
      periodo: { inicio: filtros.inicio || null, fim: filtros.fim || null },
      receitaBruta,
      despesas: despesasAgrupadas,
      totalDespesas,
      resultadoOperacional,
      margemOperacionalPercentual: receitaBruta > 0 ? Number(((resultadoOperacional / receitaBruta) * 100).toFixed(2)) : 0,
    };
  }

  private sumValores(items: Array<{ valor: Prisma.Decimal | number }>) {
    return items.reduce((total, item) => total + Number(item.valor), 0);
  }

  private groupByCategoria(items: any[], total: number, tipo: TipoLancamento) {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(item.categoria, (map.get(item.categoria) || 0) + Number(item.valor)));
    return Array.from(map.entries())
      .map(([categoria, valor]) => ({ categoria, tipo, total: valor, percentual: total > 0 ? Number(((valor / total) * 100).toFixed(2)) : 0 }))
      .sort((a, b) => b.total - a.total);
  }

  private groupByFornecedor(items: any[]) {
    const map = new Map<string, { fornecedorId: string; fornecedor: string; total: number; quantidade: number }>();
    items.forEach((item) => {
      if (!item.fornecedorId) return;
      const fornecedor = item.fornecedor?.nomeFantasia || item.fornecedor?.razaoSocial || 'Fornecedor sem nome';
      const atual = map.get(item.fornecedorId) || { fornecedorId: item.fornecedorId, fornecedor, total: 0, quantidade: 0 };
      atual.total += Number(item.valor);
      atual.quantidade += 1;
      map.set(item.fornecedorId, atual);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }

  private groupByOrigem(items: any[]) {
    const map = new Map<string, { origem: string; quantidade: number; total: number }>();
    items.forEach((item) => {
      const atual = map.get(item.origem) || { origem: item.origem, quantidade: 0, total: 0 };
      atual.quantidade += 1;
      atual.total += Number(item.valor);
      map.set(item.origem, atual);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  private groupByCentroCusto(items: any[]) {
    const map = new Map<string, { centroCusto: string; quantidade: number; total: number }>();
    items.forEach((item) => {
      const centroCusto = item.centroCusto || 'Sem centro de custo';
      const atual = map.get(centroCusto) || { centroCusto, quantidade: 0, total: 0 };
      atual.quantidade += 1;
      atual.total += Number(item.valor);
      map.set(centroCusto, atual);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  private formatCsvDate(value?: string | Date | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private toCsv(rows: string[][]) {
    return rows.map((row) => row.map((value) => this.escapeCsv(value)).join(';')).join('\n');
  }

  private escapeCsv(value: string) {
    const safeValue = String(value ?? '');
    if (safeValue.includes(';') || safeValue.includes('"') || safeValue.includes('\n')) {
      return `"${safeValue.replace(/"/g, '""')}"`;
    }
    return safeValue;
  }
}
