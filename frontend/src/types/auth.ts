export type Usuario = {
  id: string
  nome: string
  email: string
  cargo: string
  requirePasswordChange?: boolean
}

export type LoginPayload = {
  email: string
  senha: string
  mfaCode?: string
}

export type LoginResponse = {
  access_token: string
  usuario: Usuario
  requirePasswordChange?: boolean
  requirePasswordReset?: boolean
}

export type ChangePasswordPayload = {
  senhaAtual: string
  novaSenha: string
  confirmarNovaSenha: string
}
