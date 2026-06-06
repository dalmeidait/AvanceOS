import { api } from '@/lib/api'
import type { Fornecedor, CriarFornecedorPayload, AtualizarFornecedorPayload } from '@/types/fornecedor'

export const fornecedoresService = {
  async listar() {
    const { data } = await api.get<Fornecedor[]>('/fornecedores')
    return data
  },

  async obter(id: string) {
    const { data } = await api.get<Fornecedor>(`/fornecedores/${id}`)
    return data
  },

  async criar(payload: CriarFornecedorPayload) {
    const { data } = await api.post<Fornecedor>('/fornecedores', payload)
    return data
  },

  async atualizar(id: string, payload: AtualizarFornecedorPayload) {
    const { data } = await api.put<Fornecedor>(`/fornecedores/${id}`, payload)
    return data
  },

  async atualizarStatus(id: string, status: string, ativo: boolean) {
    const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}/status`, { status, ativo })
    return data
  },
}
