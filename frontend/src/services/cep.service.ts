export type EnderecoCep = {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  complemento?: string
}

type ViaCepResponse = {
  cep?: string
  logradouro?: string
  complemento?: string
  unidade?: string
  bairro?: string
  localidade?: string
  uf?: string
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
  erro?: boolean
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function complementoSeguro(data: ViaCepResponse) {
  const complemento = normalizeText(data.complemento)
  if (!complemento) return ''
  if (/^\d+$/.test(complemento)) return ''

  const codigosViaCep = [data.ibge, data.gia, data.ddd, data.siafi, data.unidade]
    .map(normalizeText)
    .filter(Boolean)

  if (codigosViaCep.includes(complemento)) return ''

  return complemento
}

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoCep> {
  const digits = cep.replace(/\D/g, '')

  if (digits.length !== 8) {
    throw new Error('Informe um CEP com 8 dígitos.')
  }

  let response: Response
  try {
    response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  } catch {
    throw new Error('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.')
  }

  if (!response.ok) {
    throw new Error('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.')
  }

  const data = (await response.json()) as ViaCepResponse

  if (data.erro) {
    throw new Error('CEP não encontrado. Preencha o endereço manualmente.')
  }

  return {
    cep: normalizeText(data.cep) || digits,
    logradouro: normalizeText(data.logradouro),
    bairro: normalizeText(data.bairro),
    cidade: normalizeText(data.localidade),
    uf: normalizeText(data.uf),
    complemento: complementoSeguro(data),
  }
}
