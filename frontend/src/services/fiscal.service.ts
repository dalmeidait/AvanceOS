import { api } from '@/lib/api'
import type {
  DocumentoFiscalPayload,
  DocumentoFiscalSimulado,
  FiltrosFiscal,
  ResumoFiscal,
  StatusDocumentoFiscal,
} from '@/types/fiscal'

function cleanParams(filtros: FiltrosFiscal) {
  return Object.fromEntries(Object.entries(filtros).filter(([, value]) => value !== undefined && value !== ''))
}

export const fiscalService = {
  async resumo(filtros: FiltrosFiscal) {
    const { data } = await api.get<ResumoFiscal>('/fiscal/resumo', {
      params: cleanParams(filtros),
    })
    return data
  },

  async listarDocumentos(filtros: FiltrosFiscal) {
    const { data } = await api.get<DocumentoFiscalSimulado[]>('/fiscal/documentos', {
      params: cleanParams(filtros),
    })
    return data
  },

  async obterDocumento(id: string) {
    const { data } = await api.get<DocumentoFiscalSimulado>(`/fiscal/documentos/${id}`)
    return data
  },

  async criarDocumento(payload: DocumentoFiscalPayload) {
    const { data } = await api.post<DocumentoFiscalSimulado>('/fiscal/documentos', payload)
    return data
  },

  async atualizarDocumento(id: string, payload: DocumentoFiscalPayload) {
    const { data } = await api.put<DocumentoFiscalSimulado>(`/fiscal/documentos/${id}`, payload)
    return data
  },

  async atualizarStatus(id: string, status: StatusDocumentoFiscal) {
    const { data } = await api.patch<DocumentoFiscalSimulado>(`/fiscal/documentos/${id}/status`, { status })
    return data
  },

  async cancelarDocumento(id: string) {
    const { data } = await api.delete<DocumentoFiscalSimulado>(`/fiscal/documentos/${id}`)
    return data
  },

  async exportarCsv(filtros: FiltrosFiscal) {
    const { data } = await api.get<Blob>('/fiscal/exportar-csv', {
      params: cleanParams(filtros),
      responseType: 'blob',
    })
    return data
  },

  async gerarPorOs(payload: { ordemServicoId: string; tipoDocumento: string; valorServicos?: number; valorProdutos?: number; valorDesconto?: number; valorTotal?: number }) {
    const { data } = await api.post<DocumentoFiscalSimulado>('/fiscal/documentos/gerar-por-os', payload)
    return data
  },
}
