export function formatCurrency(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numericValue) ? numericValue : 0)
}

export function formatNumberBR(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0)
  return new Intl.NumberFormat('pt-BR').format(Number.isFinite(numericValue) ? numericValue : 0)
}

export function formatDateBR(value?: string | Date | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatDateTimeBR(value?: string | Date | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}
