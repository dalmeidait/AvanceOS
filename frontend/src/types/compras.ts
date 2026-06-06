import type { Fornecedor } from './fornecedor'
import type { Produto } from './produto'

export type PedidoCompraStatus =
  | 'RASCUNHO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'REALIZADO'
  | 'AGUARDANDO_ENTREGA'
  | 'RECEBIDO'
  | 'RECEBIDO_COM_DIVERGENCIA'
  | 'CANCELADO'

export type DivergenciaRecebimentoStatus =
  | 'ABERTA'
  | 'EM_ANALISE'
  | 'AGUARDANDO_FORNECEDOR'
  | 'AGUARDANDO_TROCA'
  | 'AGUARDANDO_DEVOLUCAO'
  | 'RESOLVIDA'
  | 'CANCELADA'
  | 'PERDA_ASSUMIDA'

export type TipoDivergenciaRecebimento =
  | 'PRODUTO_COM_DEFEITO'
  | 'PRODUTO_ERRADO'
  | 'QUANTIDADE_MENOR'
  | 'QUANTIDADE_MAIOR'
  | 'VALOR_DIVERGENTE'
  | 'NOTA_FISCAL_DIVERGENTE'
  | 'PRODUTO_NAO_SOLICITADO'
  | 'PRODUTO_AVARIADO'
  | 'ENTREGA_ATRASADA'
  | 'SEM_DOCUMENTO_FISCAL'
  | 'OUTRO'

export type TipoDocumentoCompra =
  | 'ORDEM_COMPRA'
  | 'XML_FISCAL_SIMULADO'
  | 'PDF_FISCAL_SIMULADO'
  | 'BOLETO'
  | 'COMPROVANTE_PAGAMENTO'
  | 'LANCAMENTO_CONTABIL'
  | 'TERMO_DIVERGENCIA'
  | 'ROMANEIO_RECEBIMENTO'
  | 'AUTORIZACAO_PAGAMENTO'
  | 'OUTROS'

export type DocumentoPedidoCompra = {
  id: string
  pedidoCompraId: string
  tipoDocumento: TipoDocumentoCompra | string
  descricao: string
  nomeOriginal: string
  nomeArquivoSalvo: string
  caminhoRelativo: string
  mimeType: string
  tamanhoBytes: number
  observacao?: string | null
  usuarioId?: string | null
  criadoEm: string
  status: string
}

export type PedidoCompraItem = {
  id: string
  pedidoCompraId: string
  produtoId?: string | null
  descricaoManual?: string | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
  observacao?: string | null
  produto?: Produto | null
}

export type PedidoCompra = {
  id: string
  numero: number
  fornecedorId?: string | null
  fornecedorAvulsoNome?: string | null
  fornecedorAvulsoDocumento?: string | null
  solicitacaoEstoqueId?: string | null
  osId?: string | null
  status: PedidoCompraStatus
  valorTotal: number
  previsaoEntrega?: string | null
  formaPagamento?: string | null
  vencimento?: string | null
  observacao?: string | null
  criadoEm: string
  atualizadoEm: string
  fornecedorNome?: string
  fornecedor?: Pick<Fornecedor, 'id' | 'nomeFantasia' | 'razaoSocial' | 'cnpj'> | null
  ordemServico?: { id: string; numeroOS?: number | null; placaVeiculo?: string | null; status?: string | null } | null
  itens: PedidoCompraItem[]
  documentos?: DocumentoPedidoCompra[]
}

export type PedidoCompraPayload = {
  fornecedorId?: string | null
  fornecedorAvulsoNome?: string | null
  fornecedorAvulsoDocumento?: string | null
  solicitacaoEstoqueId?: string | null
  osId?: string | null
  status?: PedidoCompraStatus
  previsaoEntrega?: string | null
  formaPagamento?: string | null
  vencimento?: string | null
  observacao?: string | null
  itens: Array<{
    produtoId?: string | null
    descricaoManual?: string | null
    quantidade: number
    valorUnitario: number
    observacao?: string | null
  }>
}

export type RecebimentoCompraPayload = {
  dataRecebimento?: string | null
  observacao?: string | null
  itens: Array<{
    pedidoCompraItemId: string
    quantidadeRecebida: number
    divergente: boolean
    tipoDivergencia?: TipoDivergenciaRecebimento
    descricaoDivergencia?: string
    acaoCorretiva?: string
    observacao?: string | null
  }>
}

export type DivergenciaRecebimento = {
  id: string
  pedidoCompraId: string
  recebimentoCompraId?: string | null
  fornecedorId?: string | null
  produtoId?: string | null
  descricaoProduto?: string | null
  tipoDivergencia: TipoDivergenciaRecebimento
  quantidadeAfetada: number
  valorAfetado?: number | null
  descricao: string
  status: DivergenciaRecebimentoStatus
  acaoCorretiva?: string | null
  dataRegistro: string
  dataResolucao?: string | null
  observacao?: string | null
  fornecedorNome?: string | null
  produtoNome?: string | null
  pedidoCompra?: { id: string; numero: number; status: PedidoCompraStatus }
}

export type ProdutoFornecedor = {
  id: string
  produtoId: string
  fornecedorId: string
  codigoFornecedor?: string | null
  custoUltimaCompra?: number | null
  prazoEntregaDias?: number | null
  fornecedorPreferencial: boolean
  ativo: boolean
  observacao?: string | null
  fornecedorNome?: string | null
  fornecedor?: Fornecedor
}
