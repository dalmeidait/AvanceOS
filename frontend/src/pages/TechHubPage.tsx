import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BatteryCharging, CarFront, Cpu, Eye, FileJson, FileText, RefreshCw, ShieldCheck, Stethoscope } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable } from '@/components/common/DataTable'
import type { DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { generateTechHubDiagnosticPdf } from '@/lib/techHubPdf'
import { formatDate, getApiErrorMessage } from '@/lib/utils'
import { techHubService } from '@/services/techhub.service'
import type { TechHubDiagnostic, TechHubProcessSummary } from '@/types/techhub'

const DIAGNOSTICS_QUERY_KEY = ['techhub', 'diagnostics'] as const

const moduleLabels: Record<string, string> = {
  'OBD-II Simulator': 'Simulador OBD-II',
  'Battery & Electrical Tester Simulator': 'Simulador de Bateria e Sistema Elétrico',
  'Preventive Maintenance Simulator': 'Simulador de Revisão Preventiva',
}

const severityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

const severityStyles: Record<string, string> = {
  low: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  medium: 'border-amber-300 bg-amber-100 text-amber-900',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
}

type JsonRecord = Record<string, unknown>
type TechnicalItem = { label: string; value: string }

function normalizeText(value?: string | number | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function vehicleLabel(diagnostic: TechHubDiagnostic) {
  const parts = [diagnostic.vehicleBrand, diagnostic.vehicleModel].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '-'
}

function moduleValue(diagnostic: TechHubDiagnostic) {
  return diagnostic.module || diagnostic.system || '-'
}

function translateModule(value?: string | null) {
  if (!value) return '-'
  return moduleLabels[value] || value
}

function translateSeverity(value?: string | null) {
  if (!value) return '-'
  return severityLabels[value.toLowerCase()] || value
}

function matchesAny(diagnostic: TechHubDiagnostic, terms: string[]) {
  const haystack = normalizeText(
    [
      diagnostic.module,
      diagnostic.system,
      diagnostic.target,
      diagnostic.eventType,
      diagnostic.diagnosticCategory,
      diagnostic.scenario,
      diagnostic.severity,
      diagnostic.diagnosticDescription,
    ]
      .filter(Boolean)
      .join(' '),
  )

  return terms.some((term) => haystack.includes(term))
}

function parseRawPayload(rawPayload: TechHubDiagnostic['rawPayload']): unknown {
  if (!rawPayload) return null
  if (typeof rawPayload !== 'string') return rawPayload

  try {
    return JSON.parse(rawPayload)
  } catch {
    return rawPayload
  }
}

function formatRawPayload(rawPayload: TechHubDiagnostic['rawPayload']) {
  const parsed = parseRawPayload(rawPayload)
  if (!parsed) return '-'

  if (typeof parsed === 'string') return parsed

  try {
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(parsed)
  }
}

function detailValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNestedValue(source: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined
    return current[key]
  }, source)
}

function getDisplayValue(source: unknown, paths: string[]) {
  for (const path of paths) {
    const value = getNestedValue(source, path)
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return undefined
}

function formatProcessFeedback(result: TechHubProcessSummary) {
  const importedCount = result.processed.filter((item) => !item.alreadyExists).length
  const errorCount = result.failed.length
  const messages: string[] = []

  if (importedCount === 0 && errorCount === 0) {
    return 'Nenhuma nova importação encontrada. Todos os diagnósticos disponíveis já foram processados.'
  }

  if (importedCount > 0) {
    messages.push(`${importedCount} diagnóstico(s) importado(s) com sucesso.`)
  }

  if (errorCount > 0) {
    messages.push(`${errorCount} arquivo(s) apresentaram erro durante o processamento.`)
  }

  return messages.join(' ')
}

function SeverityBadge({ severity }: { severity?: string | null }) {
  if (!severity) return <>-</>

  const key = severity.toLowerCase()

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold',
        severityStyles[key] || 'border-slate-200 bg-slate-50 text-slate-700',
      ].join(' ')}
    >
      {translateSeverity(severity)}
    </span>
  )
}

export function TechHubPage() {
  const queryClient = useQueryClient()
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('todos')
  const [severityFilter, setSeverityFilter] = useState('todos')

  const diagnostics = useQuery({
    queryKey: DIAGNOSTICS_QUERY_KEY,
    queryFn: techHubService.listarDiagnosticos,
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  })

  const selectedDiagnostic = useQuery({
    queryKey: ['techhub', 'diagnostics', selectedDiagnosticId],
    queryFn: () => techHubService.buscarDiagnostico(selectedDiagnosticId as string),
    enabled: Boolean(selectedDiagnosticId),
  })

  const processImports = useMutation({
    mutationFn: techHubService.processarImportacoes,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: DIAGNOSTICS_QUERY_KEY })
      setFeedback(formatProcessFeedback(result))
    },
    onError: (error) => {
      setFeedback(getApiErrorMessage(error))
    },
  })

  const data = diagnostics.data ?? []
  const moduleOptions = useMemo(
    () =>
      Array.from(new Set(data.map(moduleValue).filter((value) => value !== '-'))).sort((a, b) =>
        translateModule(a).localeCompare(translateModule(b), 'pt-BR'),
      ),
    [data],
  )

  const filteredData = useMemo(() => {
    const term = normalizeText(search)

    return data.filter((diagnostic) => {
      const displayModule = moduleValue(diagnostic)
      const matchesSearch =
        !term ||
        normalizeText(
          [
            diagnostic.customerName,
            diagnostic.serviceOrderNumber,
            diagnostic.vehiclePlate,
            vehicleLabel(diagnostic),
            displayModule,
            translateModule(displayModule),
            diagnostic.scenario,
          ].join(' '),
        ).includes(term)
      const matchesModule = moduleFilter === 'todos' || displayModule === moduleFilter
      const matchesSeverity = severityFilter === 'todos' || normalizeText(diagnostic.severity) === severityFilter

      return matchesSearch && matchesModule && matchesSeverity
    })
  }, [data, moduleFilter, search, severityFilter])

  const summary = useMemo(
    () => ({
      total: data.length,
      obd: data.filter((item) => matchesAny(item, ['obd', 'obd-ii', 'obd ii'])).length,
      electrical: data.filter((item) => matchesAny(item, ['bateria', 'eletrica', 'eletrico', 'electric'])).length,
      preventive: data.filter((item) => matchesAny(item, ['revisao preventiva', 'preventiva', 'preventivo'])).length,
    }),
    [data],
  )

  const columns: Array<DataTableColumn<TechHubDiagnostic>> = [
    { key: 'cliente', header: 'Cliente', render: (row) => row.customerName || '-' },
    { key: 'veiculo', header: 'Veículo', render: vehicleLabel },
    { key: 'ano', header: 'Ano', render: (row) => row.vehicleYear || '-' },
    { key: 'placa', header: 'Placa', render: (row) => row.vehiclePlate || '-' },
    { key: 'os', header: 'OS', render: (row) => row.serviceOrderNumber || '-' },
    { key: 'modulo', header: 'Módulo', render: (row) => translateModule(moduleValue(row)) },
    { key: 'cenario', header: 'Cenário', render: (row) => row.scenario || '-' },
    {
      key: 'gravidade',
      header: 'Gravidade',
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    { key: 'processadoEm', header: 'Data de processamento', render: (row) => formatDate(row.processedAt) },
    {
      key: 'acoes',
      header: 'Ação',
      render: (row) => (
        <Button type="button" variant="secondary" onClick={() => setSelectedDiagnosticId(row.id)}>
          <Eye className="h-4 w-4" />
          Ver detalhes
        </Button>
      ),
    },
  ]

  if (diagnostics.isLoading) return <LoadingState label="Carregando diagnósticos TechHub..." />
  if (diagnostics.isError && data.length === 0) return <ErrorState message={getApiErrorMessage(diagnostics.error)} />

  return (
    <section>
      <PageHeader
        title="TechHub"
        description="Diagnósticos técnicos importados para acompanhamento operacional."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => diagnostics.refetch()}
              disabled={diagnostics.isFetching}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar diagnósticos
            </Button>
            <Button type="button" onClick={() => processImports.mutate()} disabled={processImports.isPending}>
              <FileJson className="h-4 w-4" />
              {processImports.isPending ? 'Processando...' : 'Processar Importações'}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de diagnósticos" value={summary.total} icon={<Stethoscope className="h-5 w-5" />} tone="cyan" />
        <StatCard title="Total de OBD-II" value={summary.obd} icon={<Cpu className="h-5 w-5" />} tone="blue" />
        <StatCard title="Total de bateria/elétrica" value={summary.electrical} icon={<BatteryCharging className="h-5 w-5" />} tone="amber" />
        <StatCard title="Total de revisão preventiva" value={summary.preventive} icon={<ShieldCheck className="h-5 w-5" />} tone="green" />
      </div>

      {feedback ? (
        <Alert
          variant={feedback.toLowerCase().includes('erro') || feedback.toLowerCase().includes('falha') ? 'error' : 'success'}
          className="mb-4"
        >
          {feedback}
        </Alert>
      ) : null}
      {diagnostics.isFetching && !diagnostics.isLoading ? (
        <Alert variant="info" className="mb-4">Atualizando diagnósticos...</Alert>
      ) : null}

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_240px_220px]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por cliente, placa, veículo, módulo ou cenário"
        />
        <Select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} aria-label="Filtrar por módulo">
          <option value="todos">Todos os módulos</option>
          {moduleOptions.map((moduleName) => (
            <option key={moduleName} value={moduleName}>
              {translateModule(moduleName)}
            </option>
          ))}
        </Select>
        <Select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} aria-label="Filtrar por gravidade">
          <option value="todos">Todas as gravidades</option>
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </Select>
      </div>

      {data.length === 0 ? (
        <EmptyState title="Nenhum diagnóstico técnico importado ainda." message="Use Processar Importações para buscar novos arquivos do TechHub." />
      ) : filteredData.length === 0 ? (
        <EmptyState title="Nenhum diagnóstico encontrado" message="Ajuste os filtros para ver outros diagnósticos técnicos." />
      ) : (
        <DataTable data={filteredData} getRowKey={(row) => row.id} columns={columns} />
      )}

      <Dialog
        open={Boolean(selectedDiagnosticId)}
        title="Detalhe do diagnóstico"
        description={selectedDiagnostic.data?.fileName}
        onClose={() => setSelectedDiagnosticId(null)}
        contentClassName="max-w-5xl"
      >
        {selectedDiagnostic.isLoading ? (
          <LoadingState label="Carregando detalhe..." />
        ) : selectedDiagnostic.isError ? (
          <ErrorState message={getApiErrorMessage(selectedDiagnostic.error)} />
        ) : selectedDiagnostic.data ? (
          <DiagnosticDetail diagnostic={selectedDiagnostic.data} />
        ) : null}
      </Dialog>
    </section>
  )
}

function DiagnosticDetail({ diagnostic }: { diagnostic: TechHubDiagnostic }) {
  const rawPayload = parseRawPayload(diagnostic.rawPayload)
  const details = [
    ['Cliente', diagnostic.customerName],
    ['Documento', diagnostic.customerDocument],
    ['Veículo', vehicleLabel(diagnostic)],
    ['Placa', diagnostic.vehiclePlate],
    ['Ordem de Serviço vinculada', diagnostic.serviceOrderNumber],
    ['Módulo', translateModule(moduleValue(diagnostic))],
    ['Categoria', diagnostic.diagnosticCategory],
    ['Cenário', diagnostic.scenario],
    ['Gravidade', translateSeverity(diagnostic.severity)],
    ['Descrição', diagnostic.diagnosticDescription],
    ['Data de origem', formatDate(diagnostic.sourceCreatedAt)],
    ['Data de processamento', formatDate(diagnostic.processedAt)],
  ] as const

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button type="button" onClick={() => generateTechHubDiagnosticPdf(diagnostic)}>
          <FileText className="h-4 w-4" />
          Gerar PDF
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-slate-50 p-3 dark:bg-slate-900/70">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{detailValue(value)}</div>
          </div>
        ))}
      </div>

      <TechnicalSummary payload={rawPayload} />

      <details className="rounded-lg border border-border bg-white dark:bg-slate-950">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-950 dark:text-slate-100">
          Payload técnico original
        </summary>
        <pre className="max-h-[340px] overflow-auto border-t border-border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
          {formatRawPayload(diagnostic.rawPayload)}
        </pre>
      </details>
    </div>
  )
}

function TechnicalSummary({ payload }: { payload: unknown }) {
  const dtcCode = getDisplayValue(payload, ['obd.dtcCode'])
  const batteryItems: TechnicalItem[] = [
    { label: 'Tensão da bateria', value: getDisplayValue(payload, ['batteryTest.voltage', 'batteryTest.batteryVoltage', 'batteryTest.voltageV']) || '' },
    { label: 'CCA nominal', value: getDisplayValue(payload, ['batteryTest.nominalCca', 'batteryTest.ccaNominal', 'batteryTest.ratedCca']) || '' },
    { label: 'CCA medido', value: getDisplayValue(payload, ['batteryTest.measuredCca', 'batteryTest.ccaMeasured']) || '' },
    { label: 'Estado de carga', value: getDisplayValue(payload, ['batteryTest.stateOfCharge', 'batteryTest.soc']) || '' },
    { label: 'Estado de saúde', value: getDisplayValue(payload, ['batteryTest.stateOfHealth', 'batteryTest.soh']) || '' },
  ].filter((item) => item.value)
  const preventiveItems = getPreventiveInspectionItems(payload)
  const hasSummary = Boolean(dtcCode || batteryItems.length > 0 || preventiveItems.length > 0)

  return (
    <section className="rounded-lg border border-cyan-300 bg-cyan-100/80 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
        <CarFront className="h-4 w-4 text-cyan-900" />
        Resumo técnico
      </div>

      {!hasSummary ? (
        <p className="text-sm text-muted-foreground">Sem dados técnicos adicionais estruturados neste payload.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {dtcCode ? <TechnicalCard title="Código DTC" items={[{ label: 'Código DTC', value: dtcCode }]} /> : null}
          {batteryItems.length > 0 ? <TechnicalCard title="Teste de bateria" items={batteryItems} /> : null}
          {preventiveItems.length > 0 ? (
            <TechnicalCard title="Inspeção preventiva" items={preventiveItems} className="lg:col-span-2" />
          ) : null}
        </div>
      )}
    </section>
  )
}

function TechnicalCard({ title, items, className }: { title: string; items: TechnicalItem[]; className?: string }) {
  return (
    <div className={['rounded-lg border border-border bg-white p-3 shadow-sm dark:bg-slate-950', className].filter(Boolean).join(' ')}>
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900/70">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getPreventiveInspectionItems(payload: unknown): TechnicalItem[] {
  const inspection = getNestedValue(payload, 'preventiveInspection')

  if (Array.isArray(inspection)) {
    return inspection.slice(0, 8).map((item, index) => ({
      label: `Item ${index + 1}`,
      value: formatInspectionValue(item),
    }))
  }

  if (!isRecord(inspection)) return []

  return Object.entries(inspection)
    .slice(0, 8)
    .map(([key, value]) => ({
      label: humanizeKey(key),
      value: formatInspectionValue(value),
    }))
}

function formatInspectionValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!isRecord(value)) return JSON.stringify(value)

  const preferred = getDisplayValue(value, ['status', 'condition', 'result', 'description', 'severity', 'value'])
  if (preferred) return preferred

  return Object.entries(value)
    .slice(0, 3)
    .map(([key, nestedValue]) => `${humanizeKey(key)}: ${String(nestedValue)}`)
    .join(' | ')
}

function humanizeKey(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase())
}
