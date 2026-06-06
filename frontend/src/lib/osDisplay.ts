import type { ItemOS, OrdemServico } from '@/types/ordem-servico'

type MaybeOsItem = Partial<ItemOS> & {
  key?: string
}

export type DisplayOsItem = {
  id?: string
  key: string
  tipo: 'SERVICO' | 'PRODUTO'
  nome: string
  descricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  codigo: string
}

function asText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseObjectText(value: unknown): Record<string, unknown> | null {
  const text = asText(value)
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) return null

  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

function cleanRawText(value: unknown) {
  const text = asText(value)
  if (!text) return ''

  const parsed = parseObjectText(text)
  if (parsed) {
    return [parsed.nome, parsed.descricao, parsed.observacao].map(asText).filter(Boolean).join(' - ')
  }

  if (text.startsWith('{') || text.startsWith('[')) {
    return text
      .replace(/[{}[\]"]/g, ' ')
      .replace(/[:,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return text
}

export function osItemName(item: MaybeOsItem) {
  const serviceObject = parseObjectText(item.servicoNome)
  const descriptionObject = parseObjectText(item.descricao)

  return (
    asText(item.produto?.nome) ||
    asText(serviceObject?.nome) ||
    asText(descriptionObject?.nome) ||
    cleanRawText(item.servicoNome) ||
    cleanRawText(item.descricao) ||
    'Item da Ordem de Serviço'
  )
}

export function osItemDescription(item: MaybeOsItem) {
  const serviceObject = parseObjectText(item.servicoNome)
  const descriptionObject = parseObjectText(item.descricao)

  return (
    asText(item.produto?.descricao) ||
    asText(descriptionObject?.descricao) ||
    asText(serviceObject?.descricao) ||
    cleanRawText(item.descricao) ||
    ''
  )
}

export function osItemTotal(item: MaybeOsItem) {
  return Number(item.subtotal ?? item.valorTotal ?? 0) || Number(item.quantidade || 0) * Number(item.valorUnitario || 0)
}

export function isProductOsItem(item: MaybeOsItem) {
  return Boolean(item.produtoId || item.produto?.id || item.tipoItem === 'PRODUTO' || item.tipoItem === 'INSUMO')
}

export function normalizeOsItem(item: MaybeOsItem, index = 0): DisplayOsItem {
  const isProduct = isProductOsItem(item)
  const quantidade = Number(item.quantidade || 0)
  const valorUnitario = Number(item.valorUnitario || item.produto?.precoVenda || 0)

  return {
    id: item.id,
    key: item.key || item.id || `item-${index}`,
    tipo: isProduct ? 'PRODUTO' : 'SERVICO',
    nome: osItemName(item),
    descricao: osItemDescription(item),
    quantidade,
    valorUnitario,
    valorTotal: osItemTotal({ ...item, quantidade, valorUnitario }),
    codigo: item.produto?.sku || item.servicoId || item.produtoId || (isProduct ? 'PROD' : 'SERV'),
  }
}

export function splitOsItems(items: MaybeOsItem[] = []) {
  const normalized = items.map((item, index) => normalizeOsItem(item, index))
  return {
    servicos: normalized.filter((item) => item.tipo === 'SERVICO'),
    produtos: normalized.filter((item) => item.tipo === 'PRODUTO'),
  }
}

export function totalDisplayOsItems(items: DisplayOsItem[]) {
  return items.reduce((total, item) => total + item.valorTotal, 0)
}

export function numeroOrdemServico(os: OrdemServico) {
  return os.numeroOS || os.numero || os.id.slice(0, 8).toUpperCase()
}

export function parseItemDescricao(valor?: string | null) {
  if (!valor) return { nome: '-', descricao: '' }

  try {
    const parsed = JSON.parse(valor)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        nome: parsed.nome || parsed.name || valor,
        descricao: parsed.descricao || parsed.description || ''
      }
    }
  } catch {}

  return { nome: valor, descricao: '' }
}
