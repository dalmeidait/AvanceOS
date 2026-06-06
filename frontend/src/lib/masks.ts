function onlyDigits(value: string | number | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

export function unmaskCep(value: string | number | null | undefined) {
  return onlyDigits(value).slice(0, 8)
}

export function maskCep(value: string | number | null | undefined) {
  const digits = unmaskCep(value)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function unmaskCpfCnpj(value: string | number | null | undefined) {
  return onlyDigits(value).slice(0, 14)
}

export function maskCpfCnpj(value: string | number | null | undefined) {
  if (typeof value === 'string' && value.includes('*')) return value
  const digits = unmaskCpfCnpj(value)

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}

export function unmaskTelefone(value: string | number | null | undefined) {
  return onlyDigits(value).slice(0, 11)
}

export function maskTelefone(value: string | number | null | undefined) {
  if (typeof value === 'string' && value.includes('*')) return value
  const digits = unmaskTelefone(value)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{0,4})(\d{0,4})/, (_, ddd: string, first: string, last: string) =>
      `(${ddd}) ${first}${last ? `-${last}` : ''}`.trim(),
    )
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, (_, ddd: string, first: string, last: string) =>
    `(${ddd}) ${first}${last ? `-${last}` : ''}`.trim(),
  )
}

export function normalizePlaca(value: string | null | undefined) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7)
}

export function maskPlaca(value: string | null | undefined) {
  const clean = normalizePlaca(value)
  if (/^[A-Z]{3}\d{4}$/.test(clean)) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  return clean
}

export function parseNumberBR(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value ?? '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function maskMoneyBR(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number.isFinite(value) ? value : 0)
  }

  const digits = onlyDigits(value)
  const numericValue = digits ? Number(digits) / 100 : parseNumberBR(value)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numericValue) ? numericValue : 0)
}

export function parseMoneyBR(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return parseNumberBR(value)
}

export function maskKm(value: string | number | null | undefined) {
  const digits = onlyDigits(value)
  return digits ? new Intl.NumberFormat('pt-BR').format(Number(digits)) : ''
}
