import { api } from '@/lib/api'
import type { OrdemServico } from '@/types/ordem-servico'

export type MetodoPagamento = 'PIX' | 'CREDITO' | 'DEBITO' | 'BOLETO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'OUTRO'

export type VendaAvulsaPayload = {
  clienteId?: string
  metodoPagamento: MetodoPagamento
  itens: Array<{
    produtoId: string
    quantidade: number
    valorUn: number
  }>
}

type PagamentoOSResponse = {
  mensagem: string
  comprovanteSimulado?: boolean
  metodoPagamento?: MetodoPagamento
  valorPago?: number
  saldoPendente?: number
  statusFinanceiro?: string
  dataPagamento?: string
  os: OrdemServico
}

export const caixaService = {
  async buscarOsPendentes(busca: string) {
    const { data } = await api.get<OrdemServico[]>('/pdv/os-pendentes', {
      params: { busca },
    })
    return data
  },

  async buscarOsPendentesPorCpf(cpf: string) {
    const { data } = await api.get<OrdemServico[]>(`/pdv/os-pendentes/${encodeURIComponent(cpf)}`)
    return data
  },

  async pagarOS(osId: string, metodoPagamento: MetodoPagamento, valor?: number) {
    const { data } = await api.post<PagamentoOSResponse>('/pdv/pagar-os', {
      osId,
      metodoPagamento,
      valor,
    })
    return data
  },

  async vender(payload: VendaAvulsaPayload) {
    const { data } = await api.post('/pdv/vender', payload)
    return data
  },
}
