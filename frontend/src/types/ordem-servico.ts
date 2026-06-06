import type { Cliente } from './cliente'
import type { Produto } from './produto'
import type { Veiculo } from './veiculo'

export type StatusOS =
  | 'ABERTA'
  | 'EM_DIAGNOSTICO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'EM_EXECUCAO'
  | 'AGUARDANDO_PECA'
  | 'CONCLUIDA'
  | 'ENTREGUE'
  | 'AGUARDANDO_ASSINATURA'
  | 'ASSINADO'
  | 'CONCLUIDO'
  | 'PAGO'
  | 'CANCELADA'
  | 'ORCAMENTO_RECUSADO'
  | 'APROVADA_PARA_EXECUCAO'

export type StatusFinanceiroOS = 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'CANCELADO'

export type PagamentoOS = {
  id: string
  tipo?: string
  valor: number
  status: string
  metodoPagamento: string
  dataVencimento?: string
  dataPagamento?: string | null
  ordemServicoId?: string | null
}

export type ItemOS = {
  id?: string
  tipoItem?: 'SERVICO' | 'PRODUTO' | 'INSUMO' | string
  servicoId?: string | null
  produtoId?: string | null
  produto?: Produto | null
  servicoNome?: string | null
  descricao?: string | null
  observacao?: string | null
  quantidade: number
  valorUnitario: number
  subtotal?: number | null
  valorTotal?: number | null
}

export type OrdemServico = {
  id: string
  numeroOS?: number | string | null
  numero?: number | string | null
  cliente_id?: string
  veiculo_id?: string
  clienteId?: string
  veiculoId?: string
  cliente?: Cliente | null
  veiculo?: Veiculo | null
  status: StatusOS
  descricao?: string | null
  relatoMecanico?: string | null
  diagnostico?: string | null
  placaVeiculo?: string | null
  modeloVeiculo?: string | null
  valorMaoDeObra?: number | null
  descontoAplicado?: number | null
  valorFinal?: number | null
  totalServicos?: number | null
  totalPecas?: number | null
  desconto?: number | null
  totalGeral?: number | null
  valorPago?: number | null
  saldoPendente?: number | null
  statusFinanceiro?: StatusFinanceiroOS | string | null
  pagamentos?: PagamentoOS[]
  transacoes?: PagamentoOS[]
  criadoEm?: string
  updatedAt?: string
  itens?: ItemOS[]
}

export type TipoDocumentoOS =
  | 'RESUMO_OS'
  | 'COMPROVANTE_PAGAMENTO'
  | 'LAUDO_TECHHUB'
  | 'ORCAMENTO'
  | 'FOTO'
  | 'AUTORIZACAO'
  | 'DOCUMENTO_EXTERNO'
  | 'OUTROS'

export type OrdemServicoDocumento = {
  id: string
  ordemServicoId: string
  tipoDocumento: TipoDocumentoOS | string
  nomeOriginal: string
  nomeArquivo: string
  caminho: string
  mimeType: string
  tamanho: number
  tamanhoBytes?: number
  criadoEm: string
  criadoPor?: string | null
  url?: string
}

export type TipoDocumentoDossieOS =
  | 'CHECKLIST_ENTRADA'
  | 'APROVACAO_CLIENTE'
  | 'CHECKLIST_SAIDA'
  | 'COMPROVANTE_ENTREGA'
  | 'OUTROS'

export type DocumentoDossieOS = {
  id: string
  ordemServicoId: string
  tipoDocumento: TipoDocumentoDossieOS | string
  descricao: string
  observacao?: string | null
  nomeOriginal: string
  nomeArquivoSalvo: string
  caminhoRelativo: string
  mimeType: string
  tamanhoBytes: number
  usuarioId?: string | null
  status: 'ATIVO' | 'CANCELADO'
  criadoEm: string
  atualizadoEm: string
  canceladoEm?: string | null
  usuario?: {
    id: string
    nome: string
  } | null
}

export type CriarOSPayload = {
  clienteId: string
  veiculoId: string
  responsavelId?: string
  descricao: string
  diagnostico?: string
  relatoMecanico?: string
  status?: StatusOS
  placaVeiculo?: string
  modeloVeiculo?: string
}

export type AtualizarOSPayload = {
  descricao?: string
  status?: StatusOS
  relatoMecanico?: string
  diagnostico?: string
  itens?: Array<{
    id?: string
    produtoId?: string | null
    servicoId?: string | null
    tipoItem?: 'SERVICO' | 'PRODUTO' | 'INSUMO' | string
    servicoNome?: string | null
    descricao?: string | null
    observacao?: string | null
    quantidade: number
    valorUnitario: number
    valorTotal?: number
  }>
}

export interface OrdemServicoEvento {
  id: string
  ordemServicoId: string
  usuarioId?: string | null
  tipo: string
  titulo: string
  descricao?: string | null
  entidade?: string | null
  entidadeId?: string | null
  antes?: string | null
  depois?: string | null
  severidade: string
  origem: string
  criadoEm: string
  isDerivado?: boolean
  usuario?: {
    id: string
    nome: string
  } | null
}

export interface CriarOrdemServicoEventoPayload {
  tipo?: string
  titulo?: string
  descricao?: string
  severidade?: string
  origem?: string
}

export type OrcamentoItem = {
  id: string
  orcamentoId: string
  tipo: 'PECA' | 'SERVICO' | string
  descricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  observacao?: string | null
  criadoEm?: string
  atualizadoEm?: string
}

export type Orcamento = {
  id: string
  numero: number
  ordemServicoId: string
  status: 'EMITIDO' | 'ENVIADO' | 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'RECUSADO' | string
  subtotalServicos: number
  subtotalPecas: number
  desconto: number
  total: number
  validadeDias: number
  prazoEstimado?: string | null
  observacoes?: string | null
  enviadoEm?: string | null
  canalEnvio?: string | null
  aprovadoEm?: string | null
  canalAprovacao?: string | null
  aprovadoPor?: string | null
  recusadoEm?: string | null
  canalRecusa?: string | null
  motivoRecusa?: string | null
  criadoEm: string
  atualizadoEm: string
  itens?: OrcamentoItem[]
}

