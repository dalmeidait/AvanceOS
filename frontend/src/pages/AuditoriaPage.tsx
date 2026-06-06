import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { DataTable } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  buildAuditDescription,
  formatAuditDateTime,
  formatAuditMetadata,
  getAuditSearchText,
  parseAuditMetadata,
  translateAuditAction,
  translateAuditEntity,
} from '@/lib/auditDisplay'
import { normalizeRole, roleLabels } from '@/lib/roles'
import { auditService } from '@/services/audit.service'
import type { AuditLog } from '@/types/audit'

export function AuditoriaPage() {
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const logs = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditService.listar(),
  })

  const entities = useMemo(
    () =>
      Array.from(new Set((logs.data ?? []).map((log) => log.entity)))
        .filter(Boolean)
        .sort((a, b) => translateAuditEntity(a).localeCompare(translateAuditEntity(b), 'pt-BR')),
    [logs.data],
  )
  const actions = useMemo(
    () =>
      Array.from(new Set((logs.data ?? []).map((log) => log.action)))
        .filter(Boolean)
        .sort((a, b) => translateAuditAction(a).localeCompare(translateAuditAction(b), 'pt-BR')),
    [logs.data],
  )
  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase()

    return (logs.data ?? []).filter((log) => {
      const matchesEntity = entity ? log.entity === entity : true
      const matchesAction = action ? log.action === action : true
      const matchesSearch = term ? getAuditSearchText(log).includes(term) : true
      return matchesEntity && matchesAction && matchesSearch
    })
  }, [action, entity, logs.data, search])

  if (logs.isLoading) return <LoadingState label="Carregando auditoria..." />
  if (logs.isError) return <ErrorState message={logs.error.message} />

  return (
    <section>
      <PageHeader
        title="Auditoria"
        description="Rastreabilidade operacional dos principais eventos administrativos e transacionais."
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por usuário, ação, entidade ou descrição" />
        <Select value={entity} onChange={(event) => setEntity(event.target.value)}>
          <option value="">Todas as entidades</option>
          {entities.map((item) => (
            <option key={item} value={item}>{translateAuditEntity(item)}</option>
          ))}
        </Select>
        <Select value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="">Todas as ações</option>
          {actions.map((item) => (
            <option key={item} value={item}>{translateAuditAction(item)}</option>
          ))}
        </Select>
      </div>

      {(logs.data ?? []).length === 0 ? (
        <EmptyState title="Nenhum log encontrado" message="Eventos auditados aparecerão aqui conforme o sistema for utilizado." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState title="Nenhum log encontrado" message="Ajuste a busca ou os filtros para ver outros eventos." />
      ) : (
        <DataTable
          data={filteredLogs}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'createdAt', header: 'DATA/HORA', render: (row) => formatAuditDateTime(row.createdAt) },
            {
              key: 'usuario',
              header: 'Usuário',
              render: (row) => (
                <div>
                  <p className="font-semibold text-foreground">{row.userName || 'Sistema'}</p>
                  <p className="text-xs text-muted-foreground">{row.userEmail || '-'}</p>
                </div>
              ),
            },
            { key: 'role', header: 'Função', render: (row) => roleLabels[normalizeRole(row.userRole)] },
            {
              key: 'action',
              header: 'Ação',
              render: (row) => {
                const isLogin = row.action.includes('LOGIN')
                const isDelete = row.action.includes('DELETE') || row.action.includes('REMOVE')
                const isCreate = row.action.includes('CREATE') || row.action.includes('ADD')
                const isUpdate = row.action.includes('UPDATE')
                
                let tone = 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                if (isLogin) tone = 'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-400'
                else if (isDelete) tone = 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800/40 dark:bg-rose-900/30 dark:text-rose-400'
                else if (isCreate) tone = 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400'
                else if (isUpdate) tone = 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400'
                
                return <Badge className={tone}>{translateAuditAction(row.action)}</Badge>
              },
            },
            { key: 'entity', header: 'Entidade', render: (row) => translateAuditEntity(row.entity) },
            { key: 'description', header: 'Descrição', render: (row) => buildAuditDescription(row) },
            {
              key: 'actions',
              header: 'AÇÕES',
              render: (row) => (
                <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={() => setSelectedLog(row)}>
                  <Eye className="h-4 w-4" />
                  Ver detalhes
                </Button>
              ),
            },
          ]}
        />
      )}

      <AuditDetailsDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
    </section>
  )
}

function AuditDetailsDialog({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  const metadata = formatAuditMetadata(log?.metadata)
  const metadataType = parseAuditMetadata(log?.metadata).label

  return (
    <Dialog
      open={Boolean(log)}
      title="Detalhes do evento"
      description={log ? `${translateAuditAction(log.action)} em ${translateAuditEntity(log.entity)}` : undefined}
      onClose={onClose}
      contentClassName="max-w-3xl"
    >
      {log ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailItem label="Data e hora" value={formatAuditDateTime(log.createdAt)} />
            <DetailItem label="Usuário" value={log.userName || 'Sistema'} />
            <DetailItem label="E-mail" value={log.userEmail || '-'} />
            <DetailItem label="Função" value={roleLabels[normalizeRole(log.userRole)]} />
            <DetailItem label="Ação" value={translateAuditAction(log.action)} />
            <DetailItem label="Entidade" value={translateAuditEntity(log.entity)} />
            <DetailItem label="ID da entidade" value={log.entityId || '-'} />
            <DetailItem label="IP" value={log.ipAddress || '-'} />
          </div>

          <DetailItem label="Descrição" value={buildAuditDescription(log)} />
          <DetailItem label="Agente do usuário" value={log.userAgent || '-'} />

          {metadata ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metadados ({metadataType})</p>
              <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-3 text-xs leading-relaxed text-foreground">
                {metadata}
              </pre>
            </div>
          ) : (
            <DetailItem label="Metadados" value="-" />
          )}
        </div>
      ) : null}
    </Dialog>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-[hsl(var(--surface-subtle))] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
