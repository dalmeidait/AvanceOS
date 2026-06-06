import { api } from '@/lib/api'
import type {
  FiltrosContabilidade,
  LancamentoContabilOperacional,
  LancamentoContabilPayload,
  DreGerencial,
  ResumoMensalContabilidade,
  ResumoContabilidade,
  StatusLancamentoContabil,
} from '@/types/contabilidade'

function cleanParams(filtros: FiltrosContabilidade) {
  return Object.fromEntries(Object.entries(filtros).filter(([, value]) => value !== undefined && value !== ''))
}

export const contabilidadeService = {
  async resumo(filtros: FiltrosContabilidade) {
    const { data } = await api.get<ResumoContabilidade>('/contabilidade/resumo', {
      params: cleanParams(filtros),
    })
    return data
  },

  async listarLancamentos(filtros: FiltrosContabilidade) {
    const { data } = await api.get<LancamentoContabilOperacional[]>('/contabilidade/lancamentos', {
      params: cleanParams(filtros),
    })
    return data
  },

  async criarLancamento(payload: LancamentoContabilPayload) {
    const { data } = await api.post<LancamentoContabilOperacional>('/contabilidade/lancamentos', payload)
    return data
  },

  async atualizarLancamento(id: string, payload: LancamentoContabilPayload) {
    const { data } = await api.put<LancamentoContabilOperacional>(`/contabilidade/lancamentos/${id}`, payload)
    return data
  },

  async atualizarStatus(id: string, status: StatusLancamentoContabil) {
    const { data } = await api.patch<LancamentoContabilOperacional>(`/contabilidade/lancamentos/${id}/status`, { status })
    return data
  },

  async cancelarLancamento(id: string) {
    const { data } = await api.delete<LancamentoContabilOperacional>(`/contabilidade/lancamentos/${id}`)
    return data
  },

  async pagarLancamento(id: string, payload: import('@/types/contabilidade').PagarLancamentoPayload) {
    const { data } = await api.post<LancamentoContabilOperacional>(`/contabilidade/lancamentos/${id}/pagar`, payload)
    return data
  },

  async exportarCsv(filtros: FiltrosContabilidade) {
    const { data } = await api.get<Blob>('/contabilidade/exportar-csv', {
      params: cleanParams(filtros),
      responseType: 'blob',
    })
    return data
  },

  async dre(filtros: FiltrosContabilidade) {
    const { data } = await api.get<DreGerencial>('/contabilidade/dre', {
      params: cleanParams(filtros),
    })
    return data
  },

  async resumoMensal(ano: number) {
    const { data } = await api.get<ResumoMensalContabilidade[]>('/contabilidade/resumo-mensal', {
      params: { ano },
    })
    return data
  },

  async exportarDreCsv(filtros: FiltrosContabilidade) {
    const { data } = await api.get<Blob>('/contabilidade/exportar-dre-csv', {
      params: cleanParams(filtros),
      responseType: 'blob',
    })
    return data
  },

  async exportarResumoMensalCsv(ano: number) {
    const { data } = await api.get<Blob>('/contabilidade/exportar-resumo-mensal-csv', {
      params: { ano },
      responseType: 'blob',
    })
    return data
  },
}
