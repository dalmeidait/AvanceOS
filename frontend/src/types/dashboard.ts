import type { Cliente } from './cliente'
import type { Movimentacao } from './movimentacao'
import type { StatusFinanceiroOS, StatusOS } from './ordem-servico'
import type { Produto, StatusEstoque } from './produto'
import type { Veiculo } from './veiculo'

export type DashboardPeriodoResumo = {
  osCriadas: number
  osConcluidas: number
  recebido: number
  pagamentos: number
  osPagas: number
}

export type DashboardOsResumo = {
  id: string
  numeroOS?: number | string | null
  status: StatusOS | string
  statusFinanceiro?: StatusFinanceiroOS | string
  cliente?: Cliente | null
  veiculo?: Veiculo | null
  totalGeral: number
  valorPago: number
  saldoPendente: number
  criadoEm?: string
  ultimoPagamento?: {
    id: string
    valor: number
    metodoPagamento?: string
    dataPagamento?: string | null
  }
}

export type DashboardProdutoAlerta = Produto & {
  statusEstoque: StatusEstoque
  quantidadeAtual?: number
  minimumStock?: number
}

export type DashboardExecutivo = {
  atualizadoEm: string
  operacao: {
    totalOs: number
    abertas: number
    emDiagnostico: number
    emExecucao: number
    aguardandoAprovacao: number
    aguardandoPeca: number
    concluidas: number
    entregues: number
    canceladas: number
  }
  financeiro: {
    valorRecebido: number
    valoresPendentes: number
    osPagas: number
    osPendentesOuParciais: number
  }
  cadastros: {
    clientes: number
    veiculos: number
    produtos: number
  }
  estoque: {
    produtosCadastrados: number
    itensComEstoqueBaixo: number
    itensCriticosOuZerados: number
    alertas: DashboardProdutoAlerta[]
  }
  periodos: {
    hoje: DashboardPeriodoResumo
    ultimos7Dias: DashboardPeriodoResumo
    mesAtual: DashboardPeriodoResumo
  }
  recentes: {
    ultimasOs: DashboardOsResumo[]
    ultimasOsPagas: DashboardOsResumo[]
    movimentacoesEstoque: Movimentacao[]
  }
}
