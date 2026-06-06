import axios, { AxiosError } from 'axios'

type ApiErrorBody = {
  message?: unknown
  error?: unknown
}

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function normalizeMessage(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalizeMessage).filter(Boolean).join(' ')

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>
    return normalizeMessage(objectValue.message) || normalizeMessage(objectValue.error)
  }

  return String(value)
}

function getApiBaseUrl() {
  const value = import.meta.env.VITE_API_URL?.trim() || '/api'
  return value.replace(/\/+$/, '')
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status
    const message = normalizeMessage(error.response?.data?.message)

    if (!error.response && error.message === 'Network Error') {
      return Promise.reject(
        new ApiError('Não foi possível conectar ao backend. Verifique se o servidor está em execução.'),
      )
    }

    if (status === 401) {
      const requestUrl = error.config?.url || ''
      const isLoginRequest = requestUrl.includes('/auth/login')
      const isChangePasswordRequest = requestUrl.includes('/auth/change-password')

      if (isLoginRequest) {
        localStorage.removeItem('jwt_token')
        localStorage.removeItem('usuario')
        return Promise.reject(new ApiError('E-mail ou senha inválidos.', status))
      }

      if (isChangePasswordRequest && /senha atual/i.test(message)) {
        return Promise.reject(new ApiError('Senha atual inválida.', status))
      }

      localStorage.removeItem('jwt_token')
      localStorage.removeItem('usuario')
      return Promise.reject(new ApiError(message || 'Sua sessão expirou. Faça login novamente.', status))
    }

    if (status === 429) {
      return Promise.reject(new ApiError('Muitas tentativas. Aguarde um momento e tente novamente.', status))
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('A API demorou para responder. Tente novamente.'))
    }

    return Promise.reject(new ApiError(message || error.message || 'Erro inesperado ao chamar a API.', status))
  },
)
