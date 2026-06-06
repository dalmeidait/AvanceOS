import { api } from '@/lib/api'
import type {
  DivergenciaRecebimento,
  PedidoCompra,
  PedidoCompraPayload,
  ProdutoFornecedor,
  RecebimentoCompraPayload,
} from '@/types/compras'

export const comprasService = {
  async listarPedidos(params?: { status?: string; fornecedorId?: string; busca?: string }) {
    const { data } = await api.get<PedidoCompra[]>('/compras/pedidos', { params })
    return data
  },

  async obterPedido(id: string) {
    const { data } = await api.get<PedidoCompra>(`/compras/pedidos/${id}`)
    return data
  },

  async criarPedido(payload: PedidoCompraPayload) {
    const { data } = await api.post<PedidoCompra>('/compras/pedidos', payload)
    return data
  },

  async atualizarPedido(id: string, payload: PedidoCompraPayload) {
    const { data } = await api.put<PedidoCompra>(`/compras/pedidos/${id}`, payload)
    return data
  },

  async aprovarPedido(id: string) {
    const { data } = await api.post<PedidoCompra>(`/compras/pedidos/${id}/aprovar`)
    return data
  },

  async cancelarPedido(id: string, motivo?: string) {
    const { data } = await api.post<PedidoCompra>(`/compras/pedidos/${id}/cancelar`, { motivo })
    return data
  },

  async receberPedido(id: string, payload: RecebimentoCompraPayload) {
    const { data } = await api.post<{ mensagem: string; pedido: PedidoCompra }>(`/compras/pedidos/${id}/receber`, payload)
    return data
  },

  async listarDivergencias(params?: { status?: string; tipoDivergencia?: string; fornecedorId?: string; produtoId?: string }) {
    const { data } = await api.get<DivergenciaRecebimento[]>('/compras/divergencias', { params })
    return data
  },

  async atualizarDivergencia(id: string, payload: Partial<DivergenciaRecebimento>) {
    const { data } = await api.put<DivergenciaRecebimento>(`/compras/divergencias/${id}`, payload)
    return data
  },

  async listarProdutoFornecedores(produtoId: string) {
    const { data } = await api.get<ProdutoFornecedor[]>(`/produtos/${produtoId}/fornecedores`)
    return data
  },

  async vincularProdutoFornecedor(produtoId: string, payload: Partial<ProdutoFornecedor>) {
    const { data } = await api.post<ProdutoFornecedor>(`/produtos/${produtoId}/fornecedores`, payload)
    return data
  },

  async atualizarProdutoFornecedor(produtoId: string, produtoFornecedorId: string, payload: Partial<ProdutoFornecedor>) {
    const { data } = await api.put<ProdutoFornecedor>(`/produtos/${produtoId}/fornecedores/${produtoFornecedorId}`, payload)
    return data
  },

  async listarDocumentos(pedidoId: string) {
    const { data } = await api.get<any[]>(`/compras/pedidos/${pedidoId}/documentos`)
    return data
  },

  async anexarDocumento(pedidoId: string, payload: FormData) {
    const { data } = await api.post(`/compras/pedidos/${pedidoId}/documentos`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async removerDocumento(pedidoId: string, documentoId: string) {
    const { data } = await api.delete(`/compras/pedidos/${pedidoId}/documentos/${documentoId}`)
    return data
  },
}
