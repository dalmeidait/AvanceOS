import { api } from '@/lib/api'
import type { AgendaMaquina, AgendaOpcoes, AgendaPayload, AgendaStatus } from '@/types/agendamento'

export type AgendaFiltros = {
  data?: string
  maquina?: string
  status?: string
  responsavelId?: string
  ordemServicoId?: string
}

export const agendamentoService = {
  async listar(filtros: AgendaFiltros = {}) {
    const { data } = await api.get<AgendaMaquina[]>('/agendamento', { params: filtros })
    return data
  },

  async opcoes() {
    const { data } = await api.get<AgendaOpcoes>('/agendamento/opcoes')
    return data
  },

  async criar(payload: AgendaPayload) {
    const { data } = await api.post<AgendaMaquina>('/agendamento', payload)
    return data
  },

  async atualizar(id: string, payload: Partial<AgendaPayload>) {
    const { data } = await api.patch<AgendaMaquina>(`/agendamento/${id}`, payload)
    return data
  },

  async alterarStatus(id: string, status: AgendaStatus) {
    const { data } = await api.patch<AgendaMaquina>(`/agendamento/${id}/status`, { status })
    return data
  },

  async registrarSaida(id: string, horaSaida?: string) {
    const { data } = await api.patch<AgendaMaquina>(`/agendamento/${id}/saida`, { horaSaida })
    return data
  },

  async cancelar(id: string) {
    const { data } = await api.delete<AgendaMaquina>(`/agendamento/${id}`)
    return data
  },
}
