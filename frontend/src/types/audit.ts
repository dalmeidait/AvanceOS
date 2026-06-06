export type AuditLog = {
  id: string
  userId?: string | null
  userName?: string | null
  userEmail?: string | null
  userRole?: string | null
  action: string
  entity: string
  entityId?: string | null
  description?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: string | null
  createdAt: string
}
