import { api } from '@/lib/api'
import type { CriarMovimentacaoPayload, Movimentacao } from '@/types/movimentacao'

export const movimentacoesService = {
  async listarHistorico(filters?: { productId?: string; ordemServicoId?: string; type?: string; date?: string; serviceOrderNumber?: string }) {
    const { data } = await api.get<Movimentacao[]>('/estoque/movimentacoes', { params: filters })
    return data
  },

  async listarPorProduto(productId: string) {
    const { data } = await api.get<Movimentacao[]>('/estoque/movimentacoes', { params: { productId } })
    return data
  },

  async listarPorOS(ordemServicoId: string) {
    const { data } = await api.get<Movimentacao[]>(`/estoque/movimentacoes/os/${ordemServicoId}`)
    return data
  },

  async criar(payload: CriarMovimentacaoPayload) {
    const { data } = await api.post<Movimentacao>('/estoque/movimentacoes', payload)
    return data
  },
}
