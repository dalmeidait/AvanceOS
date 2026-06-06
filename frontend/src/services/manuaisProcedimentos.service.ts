import { api } from '@/lib/api'
import type { ManualProcedimento, CreateManualProcedimentoDto } from '@/types/manualProcedimento'

export const manuaisProcedimentosService = {
  async listar() {
    const { data } = await api.get<ManualProcedimento[]>('/manuais-procedimentos')
    return data
  },

  async obter(id: string) {
    const { data } = await api.get<ManualProcedimento>(`/manuais-procedimentos/${id}`)
    return data
  },

  async criar(payload: CreateManualProcedimentoDto) {
    const { data } = await api.post<ManualProcedimento>('/manuais-procedimentos', payload)
    return data
  },

  async atualizar(id: string, payload: CreateManualProcedimentoDto) {
    const { data } = await api.put<ManualProcedimento>(`/manuais-procedimentos/${id}`, payload)
    return data
  },

  async arquivar(id: string) {
    const { data } = await api.delete<ManualProcedimento>(`/manuais-procedimentos/${id}`)
    return data
  },

  async uploadAnexo(id: string, file: File) {
    const formData = new FormData()
    formData.append('arquivo', file)
    const { data } = await api.post(`/manuais-procedimentos/${id}/anexo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  async removerAnexo(id: string) {
    const { data } = await api.delete(`/manuais-procedimentos/${id}/anexo`)
    return data
  },
}
