import { api } from '@/lib/api'
import type {
  AtualizarOSPayload,
  CriarOSPayload,
  ItemOS,
  OrdemServico,
  OrdemServicoDocumento,
  StatusOS,
  TipoDocumentoOS,
  OrdemServicoEvento,
  CriarOrdemServicoEventoPayload,
} from '@/types/ordem-servico'

export const osService = {
  async listar() {
    const { data } = await api.get<OrdemServico[]>('/os')
    return data
  },

  async buscarPorId(id: string) {
    const { data } = await api.get<OrdemServico>(`/os/${id}`)
    return data
  },

  async buscarFinanceiro(id: string) {
    const { data } = await api.get(`/os/${id}/financeiro`)
    return data
  },

  async criar(payload: CriarOSPayload) {
    const { data } = await api.post<OrdemServico>('/os', payload)
    return data
  },

  async atualizar(id: string, payload: AtualizarOSPayload) {
    const { data } = await api.put<OrdemServico>(`/os/${id}`, payload)
    return data
  },

  async alterarStatus(id: string, status: StatusOS) {
    const { data } = await api.patch<OrdemServico>(`/os/${id}/status`, { status })
    return data
  },

  async adicionarServico(id: string, payload: Partial<ItemOS>) {
    const { data } = await api.post<OrdemServico>(`/os/${id}/servicos`, payload)
    return data
  },

  async adicionarProduto(id: string, payload: Partial<ItemOS>) {
    const { data } = await api.post<OrdemServico>(`/os/${id}/produtos`, payload)
    return data
  },

  async removerItem(id: string, itemId: string) {
    const { data } = await api.delete<OrdemServico>(`/os/${id}/itens/${itemId}`)
    return data
  },

  async finalizar(id: string) {
    const { data } = await api.post<OrdemServico>(`/os/${id}/finalizar`)
    return data
  },

  async listarDocumentos(id: string) {
    const { data } = await api.get<OrdemServicoDocumento[]>(`/os/${id}/anexos`)
    return data
  },

  async anexarDocumento(id: string, payload: { tipoDocumento: TipoDocumentoOS | string; file: File }) {
    const formData = new FormData()
    formData.append('tipoDocumento', payload.tipoDocumento)
    formData.append('file', payload.file)
    const { data } = await api.post<OrdemServicoDocumento>(`/os/${id}/anexos`, formData)
    return data
  },

  async listarEventos(id: string) {
    const { data } = await api.get<OrdemServicoEvento[]>(`/os/${id}/eventos?ordem=desc`)
    return data
  },

  async registrarObservacao(id: string, payload: CriarOrdemServicoEventoPayload) {
    const { data } = await api.post<OrdemServicoEvento>(`/os/${id}/eventos`, payload)
    return data
  },

  async gerarPosVenda(id: string) {
    const { data } = await api.post<any>(`/os/${id}/gerar-pos-venda`)
    return data
  },

  async listarDocumentosDossie(id: string) {
    const { data } = await api.get<any[]>(`/os/${id}/documentos`)
    return data
  },

  async anexarDocumentoDossie(id: string, payload: FormData) {
    const { data } = await api.post<any>(`/os/${id}/documentos`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async removerDocumentoDossie(id: string, documentoId: string) {
    const { data } = await api.delete<any>(`/os/${id}/documentos/${documentoId}`)
    return data
  },
}
