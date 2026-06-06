import { api } from '@/lib/api'
import type { UsuarioAdmin, UsuarioPayload } from '@/types/usuario'

function removeEmptyPassword<T extends Partial<UsuarioPayload>>(payload: T) {
  const normalized = { ...payload }
  if (!normalized.senha) delete normalized.senha
  return normalized
}

export const usuariosService = {
  async listar() {
    const { data } = await api.get<UsuarioAdmin[]>('/usuarios')
    return data
  },

  async criar(payload: UsuarioPayload) {
    const { data } = await api.post<UsuarioAdmin>('/usuarios', removeEmptyPassword(payload))
    return data
  },

  async atualizar(id: string, payload: Partial<UsuarioPayload>) {
    const { data } = await api.put<UsuarioAdmin>(`/usuarios/${id}`, removeEmptyPassword(payload))
    return data
  },

  async alterarStatus(id: string, isActive: boolean) {
    const { data } = await api.patch<UsuarioAdmin>(`/usuarios/${id}/status`, { status: isActive ? 'ATIVO' : 'INATIVO' })
    return data
  },

  async redefinirSenha(id: string, senha: string) {
    const { data } = await api.post<UsuarioAdmin>(`/usuarios/${id}/reset-password`, { senha })
    return data
  },
}
