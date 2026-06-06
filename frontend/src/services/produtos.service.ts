import { ApiError, api } from '@/lib/api'
import type { CriarMovimentacaoPayload } from '@/types/movimentacao'
import type { CriarProdutoPayload, Produto } from '@/types/produto'

type ProdutosResponse = Produto[] | { data?: Produto[]; produtos?: Produto[] }

function normalizeProdutosResponse(payload: ProdutosResponse) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.produtos)) return payload.produtos
  throw new ApiError('Formato inválido na resposta de produtos.')
}

export const produtosService = {
  async listar(params?: any) {
    const queryParams = params && !('queryKey' in params) ? params : undefined
    const { data } = await api.get<ProdutosResponse>('/produtos', { params: queryParams })
    return normalizeProdutosResponse(data)
  },

  async buscarPorId(id: string) {
    const { data } = await api.get<Produto>(`/produtos/${id}`)
    return data
  },

  async listarEstoqueBaixo() {
    const { data } = await api.get<ProdutosResponse>('/produtos/estoque-baixo')
    return normalizeProdutosResponse(data)
  },

  async listarEstoqueCritico() {
    const { data } = await api.get<ProdutosResponse>('/produtos/estoque-critico')
    return normalizeProdutosResponse(data)
  },

  async criar(payload: CriarProdutoPayload) {
    const { data } = await api.post<Produto>('/produtos', payload)
    return data
  },

  async atualizar(id: string, payload: CriarProdutoPayload) {
    const { data } = await api.put<Produto>(`/produtos/${id}`, payload)
    return data
  },

  async atualizarStatus(id: string, isActive: boolean) {
    const { data } = await api.patch<Produto>(`/produtos/${id}/status`, { isActive })
    return data
  },

  async movimentar(produtoId: string, payload: CriarMovimentacaoPayload) {
    const { data } = await api.post(`/produtos/${produtoId}/movimentacoes`, payload)
    return data
  },
}
