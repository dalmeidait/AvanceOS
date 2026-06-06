export interface Fornecedor {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  tipoPessoa: string
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  categoriaFornecedor?: string | null
  tipoFornecimento?: string | null
  nomeContatoPrincipal?: string | null
  telefone?: string | null
  whatsapp?: string | null
  email?: string | null
  emailFinanceiro?: string | null
  site?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  pais?: string | null
  prazoEntregaMedioDias?: number | null
  condicaoPagamento?: string | null
  limiteCredito?: number | null
  fornecePecas: boolean
  forneceServicos: boolean
  forneceFerramentas: boolean
  forneceInsumos: boolean
  forneceTecnologia: boolean
  aceitaPedidoUrgente: boolean
  avaliacao?: number | null
  observacoesComerciais?: string | null
  observacoesInternas?: string | null
  status: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export type CriarFornecedorPayload = Omit<Fornecedor, 'id' | 'criadoEm' | 'atualizadoEm'>
export type AtualizarFornecedorPayload = Partial<CriarFornecedorPayload>
