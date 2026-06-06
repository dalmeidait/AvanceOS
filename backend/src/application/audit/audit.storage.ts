import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContext {
  userId?: string;
}

export const auditStorage = new AsyncLocalStorage<AuditContext>();
