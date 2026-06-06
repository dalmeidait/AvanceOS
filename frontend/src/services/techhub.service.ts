import { ApiError, api } from '@/lib/api'
import type { TechHubDiagnostic, TechHubProcessSummary } from '@/types/techhub'

type DiagnosticsResponse = TechHubDiagnostic[] | { data?: TechHubDiagnostic[]; diagnostics?: TechHubDiagnostic[] }

function normalizeDiagnosticsResponse(payload: DiagnosticsResponse) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.diagnostics)) return payload.diagnostics
  throw new ApiError('Formato inválido na resposta de diagnósticos TechHub.')
}

export const techHubService = {
  async listarDiagnosticos() {
    const { data } = await api.get<DiagnosticsResponse>('/techhub/diagnostics')
    return normalizeDiagnosticsResponse(data)
  },

  async buscarDiagnostico(id: string) {
    const { data } = await api.get<TechHubDiagnostic>(`/techhub/diagnostics/${id}`)
    return data
  },

  async processarImportacoes() {
    const { data } = await api.post<TechHubProcessSummary>('/techhub/imports/process')
    return data
  },
}
