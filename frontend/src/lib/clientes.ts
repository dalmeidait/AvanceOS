import type { Cliente } from '@/types/cliente'

export function documentoCliente(cliente?: Cliente | null) {
  return cliente?.cpf_cnpj || cliente?.cpf || cliente?.documento || cliente?.cpfCnpj || ''
}

export function tipoCliente(cliente?: Cliente | null) {
  if (!cliente) return '-'
  if (cliente.tipo || cliente.tipoCliente) return cliente.tipo || cliente.tipoCliente || '-'

  const digits = documentoCliente(cliente).replace(/\D/g, '')
  if (digits.length === 14) return 'Pessoa jurídica'
  if (digits.length === 11) return 'Pessoa física'
  return '-'
}

export function totalVeiculosCliente(cliente?: Cliente | null) {
  if (!cliente) return 0
  return Number(cliente.totalVeiculos ?? cliente.veiculos?.length ?? 0)
}

export function possuiGrupoVeiculos(cliente?: Cliente | null) {
  if (!cliente) return false
  return Boolean(cliente.possuiGrupoVeiculos ?? cliente.possuiFrota ?? totalVeiculosCliente(cliente) > 1)
}

export function rotuloGrupoVeiculos(cliente?: Cliente | null) {
  if (!possuiGrupoVeiculos(cliente)) return 'Não'
  return tipoCliente(cliente) === 'Pessoa jurídica' ? 'Frota' : 'Grupo de veículos'
}
