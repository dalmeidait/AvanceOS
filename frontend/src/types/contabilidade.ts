export type TipoLancamentoContabil = 'RECEITA' | 'DESPESA'
export type StatusLancamentoContabil = 'REGISTRADO' | 'PENDENTE' | 'PAGO' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO'
export type OrigemLancamentoContabil = 'MANUAL' | 'OS' | 'PDV' | 'FORNECEDOR' | 'AJUSTE'
export type NaturezaFinanceiraContabil = 'LANCAMENTO' | 'CONTA_A_PAGAR' | 'CONTA_A_RECEBER'

export type LancamentoContabilFornecedor = {
  id: string
  nome: string
}

export type LancamentoContabilOS = {
  id: string
  numeroOS?: number | null
  placaVeiculo?: string | null
  modeloVeiculo?: string | null
}

export type LancamentoContabilOperacional = {
  id: string
  tipo: TipoLancamentoContabil
  naturezaFinanceira: NaturezaFinanceiraContabil
  categoria: string
  centroCusto?: string | null
  descricao: string
  valor: number
  dataLancamento: string
  competencia?: string | null
  dataVencimento?: string | null
  dataPagamento?: string | null
  dataRecebimento?: string | null
  numeroDocumento?: string | null
  recorrente: boolean
  parcelaAtual?: number | null
  parcelaTotal?: number | null
  fornecedorId?: string | null
  ordemServicoId?: string | null
  usuarioId?: string | null
  formaPagamento?: string | null
  status: StatusLancamentoContabil
  statusCalculado?: StatusLancamentoContabil
  origem: OrigemLancamentoContabil
  observacoes?: string | null
  criadoEm: string
  atualizadoEm: string
  fornecedor?: LancamentoContabilFornecedor | null
  ordemServico?: LancamentoContabilOS | null
  pedidoCompra?: { id: string; numero: number; status: string } | null
}

export type PagarLancamentoPayload = {
  valorPago: number;
  dataPagamento: string;
  formaPagamento: string;
  numeroDocumento?: string;
  justificativaDivergencia?: string;
  observacoes?: string;
}

export type FiltrosContabilidade = {
  inicio?: string
  fim?: string
  tipo?: TipoLancamentoContabil | ''
  naturezaFinanceira?: NaturezaFinanceiraContabil | ''
  categoria?: string
  centroCusto?: string
  status?: StatusLancamentoContabil | ''
  fornecedorId?: string
  ordemServicoId?: string
  origem?: OrigemLancamentoContabil | ''
  busca?: string
}

export type LancamentoContabilPayload = {
  tipo: TipoLancamentoContabil
  naturezaFinanceira: NaturezaFinanceiraContabil
  categoria: string
  centroCusto?: string | null
  descricao: string
  valor: number
  dataLancamento: string
  competencia?: string | null
  dataVencimento?: string | null
  dataPagamento?: string | null
  dataRecebimento?: string | null
  numeroDocumento?: string | null
  recorrente: boolean
  parcelaAtual?: number | null
  parcelaTotal?: number | null
  fornecedorId?: string | null
  ordemServicoId?: string | null
  formaPagamento?: string | null
  status: Exclude<StatusLancamentoContabil, 'VENCIDO'> | 'VENCIDO'
  origem?: OrigemLancamentoContabil
  observacoes?: string | null
}

export type ResumoCategoriaContabil = {
  categoria: string
  tipo: TipoLancamentoContabil
  total: number
  percentual: number
}

export type ResumoFornecedorContabil = {
  fornecedorId: string
  fornecedor: string
  total: number
  quantidade: number
}

export type ResumoOrigemContabil = {
  origem: OrigemLancamentoContabil
  quantidade: number
  total: number
}

export type ResumoCentroCustoContabil = {
  centroCusto: string
  quantidade: number
  total: number
}

export type DreGerencial = {
  periodo: {
    inicio?: string | null
    fim?: string | null
  }
  receitaBruta: number
  despesas: Array<{ categoria: string; total: number }>
  totalDespesas: number
  resultadoOperacional: number
  margemOperacionalPercentual: number
}

export type ResumoMensalContabilidade = {
  mes: number
  receitas: number
  despesas: number
  resultado: number
  contasAPagar: number
  contasAReceber: number
}

export type ResumoContabilidade = {
  periodo: {
    inicio?: string | null
    fim?: string | null
  }
  receitas: {
    total: number
    porCategoria: ResumoCategoriaContabil[]
  }
  despesas: {
    total: number
    porCategoria: ResumoCategoriaContabil[]
  }
  resultadoOperacional: number
  margemOperacionalPercentual: number
  contasPendentes: number
  contasPagas: number
  contasRecebidas: number
  contasAPagarPendentes: number
  contasAReceberPendentes: number
  contasVencidas: number
  fornecedoresComMaiorDespesa: ResumoFornecedorContabil[]
  maiorCategoriaDespesa?: ResumoCategoriaContabil | null
  origemLancamentos: ResumoOrigemContabil[]
  centrosCusto: ResumoCentroCustoContabil[]
  dre: DreGerencial
}
