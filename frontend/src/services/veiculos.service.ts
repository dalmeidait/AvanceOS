import { api } from '@/lib/api'
import type { CriarVeiculoPayload, Veiculo } from '@/types/veiculo'

export const veiculosService = {
  async listar() {
    const { data } = await api.get<Veiculo[]>('/veiculos')
    return data
  },

  async criar(payload: CriarVeiculoPayload) {
    const { data } = await api.post<Veiculo>('/veiculos', payload)
    return data
  },

  async atualizar(id: string, payload: CriarVeiculoPayload) {
    const { data } = await api.put<Veiculo>(`/veiculos/${id}`, payload)
    return data
  },
}
