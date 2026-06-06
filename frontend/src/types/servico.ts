export type Servico = {
  id: string
  codigo: string
  nome: string
  descricao?: string | null
  categoria: string
  valor: number
  tempoEstimadoMinutos?: number | null
  geraComissao: boolean
  status: string
  observacaoTecnica?: string | null
  name?: string
  internalCode?: string
  category?: string
  description?: string | null
  basePrice?: number
  estimatedMinutes?: number | null
  isActive?: boolean
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CriarServicoPayload = {
  name: string
  internalCode: string
  category: string
  description?: string
  basePrice: number
  estimatedMinutes?: number | null
  isActive: boolean
  notes?: string
}
