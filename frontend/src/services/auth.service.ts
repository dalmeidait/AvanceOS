import { api, ApiError } from '@/lib/api'
import type { ChangePasswordPayload, LoginPayload, LoginResponse, Usuario } from '@/types/auth'

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post<LoginResponse>('/auth/login', payload)
    return data
  },

  async alterarSenha(payload: { email: string; senhaAtual: string; novaSenha: string }) {
    const { data } = await api.post('/auth/alterar-senha', payload)
    return data
  },

  async changePassword(payload: ChangePasswordPayload) {
    const token = localStorage.getItem('jwt_token')
    if (!token) throw new ApiError('Sua sessão expirou. Faça login novamente.', 401)

    const { data } = await api.post<LoginResponse & { message?: string }>('/auth/change-password', payload, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },

  getUsuario(): Usuario | null {
    const raw = localStorage.getItem('usuario')
    if (!raw) return null
    try {
      return JSON.parse(raw) as Usuario
    } catch {
      return null
    }
  },

  logout() {
    localStorage.removeItem('jwt_token')
    localStorage.removeItem('usuario')
  },

  persistSession(data: LoginResponse) {
    localStorage.setItem('jwt_token', data.access_token)
    localStorage.setItem('usuario', JSON.stringify({
      ...data.usuario,
      requirePasswordChange: data.requirePasswordChange ?? data.requirePasswordReset ?? data.usuario.requirePasswordChange ?? false,
    }))
  },
}
