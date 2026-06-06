export type UrgenciaSolicitacaoEstoque = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type CriarSolicitacaoEstoquePayload = {
  ordemServicoId?: string
  veiculoId?: string
  clienteId?: string
  mecanicoId?: string
  nomeProdutoSolicitado: string
  categoria?: string
  tipoItem: 'PECA' | 'PRODUTO' | 'INSUMO' | 'FERRAMENTA' | 'OUTRO'
  quantidadeSolicitada: number
  unidade: string
  aplicacao?: string
  justificativaTecnica: string
  urgencia: UrgenciaSolicitacaoEstoque
  observacoes?: string
}
