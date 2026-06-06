import type { UserRole } from '@/lib/roles'

export type UsuarioAdmin = {
  id: string
  nome: string
  email: string
  cargo: UserRole | string
  role?: UserRole | string
  isActive: boolean
  requirePasswordChange?: boolean
  status?: string
  criadoEm?: string
  atualizadoEm?: string
  createdAt?: string
  updatedAt?: string
}

export type UsuarioPayload = {
  nome: string
  email: string
  perfil: UserRole
  status: 'ATIVO' | 'INATIVO'
  senha?: string
}
