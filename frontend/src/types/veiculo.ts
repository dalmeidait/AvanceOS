import type { Cliente } from './cliente'

export type Veiculo = {
  id: string
  placa: string
  marca?: string | null
  modelo?: string | null
  ano?: string | null
  cor?: string | null
  clienteId?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  cliente?: Cliente | null
  quilometragem?: number | null
  pertenceGrupoVeiculos?: boolean | null
  pertenceFrota?: boolean | null
}

export type CriarVeiculoPayload = {
  clienteId: string
  marca: string
  modelo: string
  placa: string
  ano?: string
  cor?: string
  quilometragem?: number
}
