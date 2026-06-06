import { api } from '@/lib/api'
import type { AuditLog } from '@/types/audit'

export type AuditFilters = {
  search?: string
  entity?: string
  action?: string
  userId?: string
}

type RawAuditLog = Partial<AuditLog> & {
  usuarioId?: string | null
  acao?: string | null
  entidadeAfetada?: string | null
  entidadeId?: string | null
  criadoEm?: string | null
}

function normalizeAuditLog(log: RawAuditLog): AuditLog {
  return {
    id: String(log.id ?? ''),
    userId: log.userId ?? log.usuarioId ?? null,
    userName: log.userName ?? null,
    userEmail: log.userEmail ?? null,
    userRole: log.userRole ?? null,
    action: String(log.action ?? log.acao ?? ''),
    entity: String(log.entity ?? log.entidadeAfetada ?? ''),
    entityId: log.entityId ?? log.entidadeId ?? null,
    description: log.description ?? null,
    ipAddress: log.ipAddress ?? null,
    userAgent: log.userAgent ?? null,
    metadata: log.metadata ?? null,
    createdAt: String(log.createdAt ?? log.criadoEm ?? ''),
  }
}

export const auditService = {
  async listar(filters: AuditFilters = {}) {
    const { data } = await api.get<RawAuditLog[]>('/audit/logs', { params: filters })
    return data.map(normalizeAuditLog)
  },
}
