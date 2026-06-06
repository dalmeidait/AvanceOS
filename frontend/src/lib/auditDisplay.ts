import type { AuditLog } from '@/types/audit'

export type ParsedAuditMetadata =
  | { type: 'empty'; label: string }
  | { type: 'json'; label: string; value: unknown }
  | { type: 'text'; label: string; value: string }

const actionLabels: Record<string, string> = {
  CREATE: 'Criação',
  CREATED: 'Criação',
  UPDATE: 'Atualização',
  UPDATED: 'Atualização',
  DELETE: 'Exclusão',
  DELETED: 'Exclusão',
  LOGIN_SUCCESS: 'Login realizado',
  LOGIN_FAILED: 'Falha de login',
  PASSWORD_CHANGED: 'Senha alterada',
  PASSWORD_CHANGE_REQUIRED: 'Troca de senha obrigatória',
  PASSWORD_RESET: 'Redefinição de senha',
  STATUS_CHANGE: 'Alteração de status',
  PAYMENT: 'Pagamento',
  UPLOAD: 'Anexo',
  PROCESS: 'Processamento',
  STOCK_MOVEMENT: 'Movimentação de estoque',
  STOCK_MOVEMENT_CREATED: 'Movimentação de estoque',
  PRODUCT_CREATED: 'Produto criado',
  PRODUCT_UPDATED: 'Produto atualizado',
  PRODUCT_STATUS_UPDATED: 'Status do produto atualizado',
  OS_CREATED: 'OS criada',
  OS_UPDATED: 'OS atualizada',
  OS_COMPLETED: 'OS concluída',
  OS_PAYMENT_REGISTERED: 'Pagamento registrado',
  PDV_SALE_CREATED: 'Venda no caixa',
  USER_CREATED: 'Usuário criado',
  USER_UPDATED: 'Usuário atualizado',
  USER_ACTIVATED: 'Usuário ativado',
  USER_DEACTIVATED: 'Usuário desativado',
  USER_PASSWORD_RESET: 'Redefinição de senha',
  TECHHUB_IMPORT_PROCESSED: 'Importação TechHub processada',
}

const entityLabels: Record<string, string> = {
  Produto: 'Produto',
  PRODUTO: 'Produto',
  OrdemServico: 'Ordem de Serviço',
  ORDEM_SERVICO: 'Ordem de Serviço',
  ItemOS: 'Item da OS',
  ITEM_OS: 'Item da OS',
  MovimentacaoEstoque: 'Movimentação de Estoque',
  MOVIMENTACAO_ESTOQUE: 'Movimentação de Estoque',
  TransacaoFinanceira: 'Transação Financeira',
  TRANSACAO_FINANCEIRA: 'Transação Financeira',
  Usuario: 'Usuário',
  USUARIO: 'Usuário',
  Cliente: 'Cliente',
  CLIENTE: 'Cliente',
  Veiculo: 'Veículo',
  VEICULO: 'Veículo',
  TechHubDiagnostic: 'Diagnóstico TechHub',
  TECHHUB_DIAGNOSTIC: 'Diagnóstico TechHub',
  TECHHUB: 'TechHub',
  Auth: 'Autenticação',
  AUTH: 'Autenticação',
  Login: 'Login',
  LOGIN: 'Login',
  VENDA_PDV: 'Venda no Caixa',
}

const descriptionLabels: Record<string, string> = {
  LOGIN_SUCCESS: 'Usuário entrou no sistema.',
  LOGIN_FAILED: 'Tentativa de acesso inválida.',
  PASSWORD_CHANGED: 'Usuário alterou a própria senha.',
  PASSWORD_CHANGE_REQUIRED: 'Usuário deve alterar a senha provisória antes de continuar.',
  PRODUCT_CREATED: 'Produto criado.',
  PRODUCT_UPDATED: 'Produto atualizado.',
  PRODUCT_STATUS_UPDATED: 'Status do produto atualizado.',
  OS_CREATED: 'Ordem de Serviço criada.',
  OS_UPDATED: 'Ordem de Serviço atualizada.',
  OS_COMPLETED: 'Ordem de Serviço concluída.',
  OS_PAYMENT_REGISTERED: 'Pagamento de OS registrado.',
  STOCK_MOVEMENT: 'Movimentação de estoque registrada.',
  STOCK_MOVEMENT_CREATED: 'Movimentação de estoque registrada.',
  PDV_SALE_CREATED: 'Venda avulsa registrada no caixa.',
  USER_CREATED: 'Usuário criado.',
  USER_UPDATED: 'Usuário atualizado.',
  USER_ACTIVATED: 'Usuário ativado.',
  USER_DEACTIVATED: 'Usuário desativado.',
  USER_PASSWORD_RESET: 'Administrador redefiniu senha provisória do usuário.',
  TECHHUB_IMPORT_PROCESSED: 'Processamento de importações TechHub executado.',
}

function normalizeKey(value?: string | null) {
  return (value ?? '').trim()
}

function makeReadable(value?: string | null) {
  const normalized = normalizeKey(value)
  if (!normalized) return '-'

  const withSpaces = normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  return withSpaces.replace(/^./, (letter) => letter.toUpperCase())
}

function getEntityGender(entity?: string | null): 'masculine' | 'feminine' {
  const key = normalizeKey(entity)
  const feminineEntities = new Set([
    'ORDEM_SERVICO',
    'OrdemServico',
    'MOVIMENTACAO_ESTOQUE',
    'MovimentacaoEstoque',
    'TRANSACAO_FINANCEIRA',
    'TransacaoFinanceira',
    'Autenticacao',
    'AUTH',
  ])
  return feminineEntities.has(key) ? 'feminine' : 'masculine'
}

function inflect(entity: string | null | undefined, masculine: string, feminine: string) {
  return getEntityGender(entity) === 'feminine' ? feminine : masculine
}

export function formatAuditDateTime(value?: string | Date | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
}

export function translateAuditAction(action?: string | null) {
  const key = normalizeKey(action)
  return actionLabels[key] ?? makeReadable(key)
}

export function translateAuditEntity(entity?: string | null) {
  const key = normalizeKey(entity)
  return entityLabels[key] ?? makeReadable(key)
}

export function parseAuditMetadata(metadata?: string | null): ParsedAuditMetadata {
  if (!metadata) return { type: 'empty', label: 'Sem metadados' }

  const value = metadata.trim()
  if (!value) return { type: 'empty', label: 'Sem metadados' }

  try {
    return { type: 'json', label: 'JSON', value: JSON.parse(value) }
  } catch {
    return { type: 'text', label: 'Texto', value }
  }
}

export function formatAuditMetadata(metadata?: string | null) {
  const parsed = parseAuditMetadata(metadata)
  if (parsed.type === 'empty') return null
  if (parsed.type === 'json') return JSON.stringify(parsed.value, null, 2)
  return parsed.value
}

export function buildAuditDescription(log: AuditLog) {
  const action = normalizeKey(log.action)
  const description = log.description?.trim()
  if (description && description !== '-') return description

  const standardDescription = descriptionLabels[action]
  if (standardDescription) return standardDescription

  const entity = translateAuditEntity(log.entity)
  const readableAction = translateAuditAction(log.action).toLowerCase()

  if (action.includes('PAYMENT')) return 'Pagamento registrado.'
  if (action.includes('STOCK')) return 'Movimentação de estoque registrada.'
  if (action.includes('CREATE') || action.includes('CREATED')) return `${entity} ${inflect(log.entity, 'criado', 'criada')}.`
  if (action.includes('UPDATE') || action.includes('UPDATED')) return `${entity} ${inflect(log.entity, 'atualizado', 'atualizada')}.`
  if (action.includes('DELETE') || action.includes('DELETED')) return `${entity} ${inflect(log.entity, 'excluído', 'excluída')}.`
  if (action.includes('STATUS')) return `Status de ${entity.toLowerCase()} alterado.`

  return `${entity}: ${readableAction}.`
}

export function getAuditSearchText(log: AuditLog) {
  return [
    formatAuditDateTime(log.createdAt),
    log.userName,
    log.userEmail,
    log.userRole,
    log.action,
    translateAuditAction(log.action),
    log.entity,
    translateAuditEntity(log.entity),
    log.entityId,
    buildAuditDescription(log),
    log.ipAddress,
    log.userAgent,
    formatAuditMetadata(log.metadata),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
