import { api } from '@/lib/api'
import type { CriarServicoPayload, Servico } from '@/types/servico'

export const servicosService = {
  async listar(params?: { busca?: string; categoria?: string; status?: string }) {
    const { data } = await api.get<Servico[]>('/servicos', { params })
    return data
  },

  async buscarPorId(id: string) {
    const { data } = await api.get<Servico>(`/servicos/${id}`)
    return data
  },

  async criar(payload: CriarServicoPayload) {
    const { data } = await api.post<Servico>('/servicos', payload)
    return data
  },

  async atualizar(id: string, payload: CriarServicoPayload) {
    const { data } = await api.put<Servico>(`/servicos/${id}`, payload)
    return data
  },

  async atualizarStatus(id: string, isActive: boolean) {
    const { data } = await api.patch<Servico>(`/servicos/${id}/status`, { isActive })
    return data
  },
}
