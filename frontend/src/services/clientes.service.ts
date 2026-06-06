import { api } from '@/lib/api'
import type { Cliente, CriarClientePayload } from '@/types/cliente'

export const clientesService = {
  async listar() {
    const { data } = await api.get<Cliente[]>('/clientes')
    return data
  },

  async criar(payload: CriarClientePayload) {
    const { data } = await api.post<Cliente>('/clientes', payload)
    return data
  },

  async atualizar(id: string, payload: CriarClientePayload) {
    const { data } = await api.put<Cliente>(`/clientes/${id}`, payload)
    return data
  },

  async buscarInteracoes(id: string) {
    const { data } = await api.get<any[]>(`/clientes/${id}/interacoes`)
    return data
  },
}
