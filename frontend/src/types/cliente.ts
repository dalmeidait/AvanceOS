export type Cliente = {
  id: string
  nome: string
  email?: string | null
  telefone?: string | null
  cpf?: string | null
  cpfCnpj?: string | null
  cpf_cnpj?: string | null
  documento?: string | null
  tipo?: string | null
  tipoCliente?: string | null
  cep?: string | null
  bairro?: string | null
  rua?: string | null
  numero?: string | null
  complemento?: string | null
  cidade?: string | null
  estado?: string | null
  totalVeiculos?: number | null
  possuiGrupoVeiculos?: boolean | null
  possuiFrota?: boolean | null
  veiculos?: Array<{
    id: string
    placa: string
    marca?: string | null
    modelo?: string | null
    ano?: string | null
  }>
}

export type CriarClientePayload = {
  nome: string
  cpf_cnpj: string
  telefone?: string
  email?: string
  cep?: string
  bairro?: string
  rua?: string
  numero?: string
  complemento?: string
  cidade?: string
  estado?: string
}
