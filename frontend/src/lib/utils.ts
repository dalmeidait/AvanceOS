import { formatCurrency as formatCurrencyBase, formatDateBR } from './formatters'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value?: number | null) {
  return formatCurrencyBase(value)
}

export function formatDate(value?: string | Date | null) {
  return formatDateBR(value)
}

export function getApiErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message)
  }
  return 'Não foi possível concluir a operação.'
}
