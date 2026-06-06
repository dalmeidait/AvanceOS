export type UserRole = 'ADMIN' | 'GERENTE' | 'ATENDENTE' | 'MECANICO' | 'FINANCEIRO' | 'ESTOQUE'

const aliases: Record<string, UserRole> = {
  ADMINISTRADOR: 'ADMIN',
  DIRETOR: 'ADMIN',
  GESTOR_FINANCEIRO: 'FINANCEIRO',
  RECEPCIONISTA: 'ATENDENTE',
  CONTADOR: 'FINANCEIRO',
}

export const roles: UserRole[] = ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO', 'FINANCEIRO', 'ESTOQUE']

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  ATENDENTE: 'Atendente',
  MECANICO: 'Mecânico',
  FINANCEIRO: 'Financeiro',
  ESTOQUE: 'Estoque',
}

export function normalizeRole(role?: string | null): UserRole {
  const value = String(role || '').trim().toUpperCase()
  if (aliases[value]) return aliases[value]
  return roles.includes(value as UserRole) ? (value as UserRole) : 'ATENDENTE'
}

export function hasRole(currentRole: string | null | undefined, allowed: UserRole[]) {
  const normalized = normalizeRole(currentRole)
  return normalized === 'ADMIN' || allowed.includes(normalized)
}
