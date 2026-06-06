import type { Movimentacao } from './movimentacao'

export type StatusEstoque = 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERADO'

export type Produto = {
  id: string
  sku: string
  nome: string
  descricao?: string | null
  marca: string
  categoria: string
  tipo?: string
  unidade?: string
  veiculosCompativeis?: string
  localizacaoFisica?: string
  fornecedor?: string | null
  aplicacao?: string | null
  status?: string
  controlaEstoque?: boolean
  podeVenderPdv?: boolean
  podeVincularOs?: boolean
  precoVenda: number
  precoCusto: number
  quantidadeAtual?: number
  estoqueBloqueado?: number
  estoqueMinimo?: number
  statusEstoque?: StatusEstoque
  name?: string
  internalCode?: string
  category?: string
  description?: string | null
  brand?: string
  unit?: string
  quantityInStock?: number
  minimumStock?: number
  costPrice?: number
  salePrice?: number
  supplier?: string | null
  isActive?: boolean
  notes?: string | null
  createdAt?: string
  updatedAt?: string
  movimentacoes?: Movimentacao[]
}

export type CriarProdutoPayload = {
  name: string
  internalCode: string
  category: string
  description?: string
  brand: string
  unit: string
  quantityInStock?: number
  minimumStock: number
  costPrice: number
  salePrice: number
  supplier?: string
  isActive: boolean
  notes?: string
}
