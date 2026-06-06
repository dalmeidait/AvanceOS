import { api } from '@/lib/api'

export const crmService = {
  async getDashboardMetrics() {
    const { data } = await api.get<any>('/crm/dashboard')
    return data
  },

  async listarInteracoes(filtros?: any) {
    const { data } = await api.get<any[]>('/crm/interacoes', { params: filtros })
    return data
  },

  async criarInteracao(payload: any) {
    const { data } = await api.post<any>('/crm/interacoes', payload)
    return data
  },

  async buscarPorId(id: string) {
    const { data } = await api.get<any>(`/crm/interacoes/${id}`)
    return data
  },

  async atualizar(id: string, payload: any) {
    const { data } = await api.put<any>(`/crm/interacoes/${id}`, payload)
    return data
  },

  async registrarContato(id: string, payload: any) {
    const { data } = await api.post<any>(`/crm/interacoes/${id}/registrar-contato`, payload)
    return data
  },

  async getOrcamentosPendentes() {
    const { data } = await api.get<any[]>('/crm/orcamentos-pendentes')
    return data
  }
}
