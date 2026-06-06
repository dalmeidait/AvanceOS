import type { Produto } from './produto'
import type { OrdemServico } from './ordem-servico'
import type { Cliente } from './cliente'
import type { Veiculo } from './veiculo'

export type MovimentacaoUsuario = {
  id?: string
  nome?: string | null
  email?: string | null
  cargo?: string | null
}

export type Movimentacao = {
  id: string
  type?: string
  tipo?: string
  quantity?: number
  quantidade?: number
  previousQuantity?: number | null
  newQuantity?: number | null
  reason?: string | null
  justificativa?: string | null
  serviceOrderNumber?: string | null
  notes?: string | null
  createdAt?: string
  timestamp?: string
  criadoEm?: string
  productId?: string
  produtoId?: string
  ordemServicoId?: string | null
  osReferencia?: string | null
  product?: Produto
  produto?: Produto
  ordemServico?: OrdemServico | null
  os?: OrdemServico | null
  cliente?: Cliente | null
  veiculo?: Veiculo | null
  user?: MovimentacaoUsuario | null
  usuario?: MovimentacaoUsuario | null
}

export type CriarMovimentacaoPayload = {
  productId: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SAIDA_OS' | 'ENTRADA_DEVOLUCAO_OS'
  quantity: number
  reason: string
  serviceOrderNumber?: string
  notes?: string
}
