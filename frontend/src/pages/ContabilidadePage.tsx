import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Banknote,
  CalendarDays,
  Calculator,
  Download,
  Edit,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { DataTable } from '@/components/common/DataTable'
import type { DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, Td, Th } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  categoriasDespesaContabil,
  categoriasReceitaContabil,
  centrosCustoContabil,
  contabilidadeSchema,
  naturezasFinanceirasContabil,
  origensLancamentoContabil,
  statusLancamentoContabil,
  statusLancamentoFormulario,
  tiposLancamentoContabil,
} from '@/schemas/contabilidade.schema'
import { contabilidadeService } from '@/services/contabilidade.service'
import { fornecedoresService } from '@/services/fornecedores.service'
import { osService } from '@/services/os.service'
import type {
  FiltrosContabilidade,
  LancamentoContabilOperacional,
  LancamentoContabilPayload,
  NaturezaFinanceiraContabil,
  OrigemLancamentoContabil,
  StatusLancamentoContabil,
  TipoLancamentoContabil,
} from '@/types/contabilidade'

type ContabilidadeForm = z.input<typeof contabilidadeSchema>
type TabContabilidade = 'visao' | 'lancamentos' | 'pagar' | 'receber' | 'dre' | 'relatorios'

const hoje = new Date()
const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

const initialFilters: FiltrosContabilidade = {
  inicio: toInputDate(inicioMes),
  fim: toInputDate(hoje),
  tipo: '',
  naturezaFinanceira: '',
  categoria: '',
  centroCusto: '',
  status: '',
  fornecedorId: '',
  origem: '',
  busca: '',
}

const emptyForm: ContabilidadeForm = {
  tipo: 'DESPESA',
  naturezaFinanceira: 'CONTA_A_PAGAR',
  categoria: '',
  centroCusto: '',
  descricao: '',
  valor: '',
  dataLancamento: toInputDate(hoje),
  competencia: '',
  dataVencimento: '',
  dataPagamento: '',
  dataRecebimento: '',
  numeroDocumento: '',
  recorrente: false,
  parcelaAtual: '',
  parcelaTotal: '',
  fornecedorId: '',
  ordemServicoId: '',
  formaPagamento: '',
  status: 'PENDENTE',
  origem: 'MANUAL',
  observacoes: '',
}

const tabLabels: Array<{ key: TabContabilidade; label: string }> = [
  { key: 'visao', label: 'Visão Geral' },
  { key: 'lancamentos', label: 'Lançamentos' },
  { key: 'pagar', label: 'Contas a Pagar' },
  { key: 'receber', label: 'Contas a Receber' },
  { key: 'dre', label: 'DRE Gerencial' },
  { key: 'relatorios', label: 'Relatórios / Exportações' },
]

const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function normalizeMoney(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function optionalInt(value?: string) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function statusTone(status: StatusLancamentoContabil) {
  const tones: Record<StatusLancamentoContabil, string> = {
    REGISTRADO: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700/50 dark:bg-cyan-950/40 dark:text-cyan-300',
    PENDENTE: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300',
    PAGO: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    RECEBIDO: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    VENCIDO: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300',
    CANCELADO: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300',
  }
  return tones[status]
}

function statusLabel(status: StatusLancamentoContabil) {
  const labels: Record<StatusLancamentoContabil, string> = {
    REGISTRADO: 'Registrado',
    PENDENTE: 'Pendente',
    PAGO: 'Pago',
    RECEBIDO: 'Recebido',
    VENCIDO: 'Vencido',
    CANCELADO: 'Cancelado',
  }
  return labels[status]
}

function tipoTone(tipo: TipoLancamentoContabil) {
  return tipo === 'RECEITA'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300'
}

function tipoLabel(tipo: TipoLancamentoContabil) {
  const labels: Record<TipoLancamentoContabil, string> = {
    RECEITA: 'Receita',
    DESPESA: 'Despesa',
  }
  return labels[tipo]
}

function naturezaLabel(natureza: NaturezaFinanceiraContabil) {
  const labels: Record<NaturezaFinanceiraContabil, string> = {
    LANCAMENTO: 'Lançamento simples',
    CONTA_A_PAGAR: 'Conta a pagar',
    CONTA_A_RECEBER: 'Conta a receber',
  }
  return labels[natureza]
}

function origemLabel(origem: OrigemLancamentoContabil) {
  const labels: Record<OrigemLancamentoContabil, string> = {
    MANUAL: 'Manual',
    OS: 'OS',
    PDV: 'PDV',
    FORNECEDOR: 'Fornecedor',
    AJUSTE: 'Ajuste',
  }
  return labels[origem]
}

function toPayload(values: ContabilidadeForm): LancamentoContabilPayload {
  return {
    tipo: values.tipo as TipoLancamentoContabil,
    naturezaFinanceira: values.naturezaFinanceira as NaturezaFinanceiraContabil,
    categoria: values.categoria,
    centroCusto: values.centroCusto || null,
    descricao: values.descricao,
    valor: normalizeMoney(values.valor),
    dataLancamento: values.dataLancamento,
    competencia: values.competencia || null,
    dataVencimento: values.dataVencimento || null,
    dataPagamento: values.dataPagamento || null,
    dataRecebimento: values.dataRecebimento || null,
    numeroDocumento: values.numeroDocumento || null,
    recorrente: Boolean(values.recorrente),
    parcelaAtual: optionalInt(values.parcelaAtual),
    parcelaTotal: optionalInt(values.parcelaTotal),
    fornecedorId: values.fornecedorId || null,
    ordemServicoId: values.ordemServicoId || null,
    formaPagamento: values.formaPagamento || null,
    status: values.status as StatusLancamentoContabil,
    origem: (values.origem || 'MANUAL') as OrigemLancamentoContabil,
    observacoes: values.observacoes || null,
  }
}

function toForm(lancamento: LancamentoContabilOperacional): ContabilidadeForm {
  return {
    tipo: lancamento.tipo,
    naturezaFinanceira: lancamento.naturezaFinanceira || 'LANCAMENTO',
    categoria: lancamento.categoria,
    centroCusto: lancamento.centroCusto || '',
    descricao: lancamento.descricao,
    valor: String(lancamento.valor).replace('.', ','),
    dataLancamento: lancamento.dataLancamento.slice(0, 10),
    competencia: lancamento.competencia ? lancamento.competencia.slice(0, 10) : '',
    dataVencimento: lancamento.dataVencimento ? lancamento.dataVencimento.slice(0, 10) : '',
    dataPagamento: lancamento.dataPagamento ? lancamento.dataPagamento.slice(0, 10) : '',
    dataRecebimento: lancamento.dataRecebimento ? lancamento.dataRecebimento.slice(0, 10) : '',
    numeroDocumento: lancamento.numeroDocumento || '',
    recorrente: Boolean(lancamento.recorrente),
    parcelaAtual: lancamento.parcelaAtual ? String(lancamento.parcelaAtual) : '',
    parcelaTotal: lancamento.parcelaTotal ? String(lancamento.parcelaTotal) : '',
    fornecedorId: lancamento.fornecedorId || '',
    ordemServicoId: lancamento.ordemServicoId || '',
    formaPagamento: lancamento.formaPagamento || '',
    status: lancamento.status === 'VENCIDO' ? 'PENDENTE' : lancamento.status,
    origem: lancamento.origem,
    observacoes: lancamento.observacoes || '',
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ContabilidadePage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FiltrosContabilidade>(initialFilters)
  const [activeTab, setActiveTab] = useState<TabContabilidade>('visao')
  const [anoResumo, setAnoResumo] = useState(hoje.getFullYear())
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LancamentoContabilOperacional | null>(null)
  const [feedback, setFeedback] = useState('')
  const [formError, setFormError] = useState('')

  const [openPagar, setOpenPagar] = useState(false)
  const [paying, setPaying] = useState<LancamentoContabilOperacional | null>(null)
  const [pagarFormError, setPagarFormError] = useState('')

  const pagarForm = useForm<import('@/types/contabilidade').PagarLancamentoPayload>({
    defaultValues: {
      valorPago: 0,
      dataPagamento: toInputDate(hoje),
      formaPagamento: '',
      numeroDocumento: '',
      justificativaDivergencia: '',
      observacoes: '',
    },
  })

  const resumo = useQuery({
    queryKey: ['contabilidade', 'resumo', filters],
    queryFn: () => contabilidadeService.resumo(filters),
  })
  const lancamentos = useQuery({
    queryKey: ['contabilidade', 'lancamentos', filters],
    queryFn: () => contabilidadeService.listarLancamentos(filters),
  })
  const dre = useQuery({
    queryKey: ['contabilidade', 'dre', filters],
    queryFn: () => contabilidadeService.dre(filters),
  })
  const resumoMensal = useQuery({
    queryKey: ['contabilidade', 'resumo-mensal', anoResumo],
    queryFn: () => contabilidadeService.resumoMensal(anoResumo),
  })
  const fornecedores = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedoresService.listar })
  const ordensServico = useQuery({ queryKey: ['ordens-servico'], queryFn: osService.listar })

  const form = useForm<ContabilidadeForm>({
    resolver: zodResolver(contabilidadeSchema),
    defaultValues: emptyForm,
  })

  const tipoSelecionado = form.watch('tipo') as TipoLancamentoContabil
  const categoriasFormulario = tipoSelecionado === 'RECEITA' ? categoriasReceitaContabil : categoriasDespesaContabil
  const todosLancamentos = lancamentos.data || []
  const contasAPagar = todosLancamentos.filter((item) => item.naturezaFinanceira === 'CONTA_A_PAGAR')
  const contasAReceber = todosLancamentos.filter((item) => item.naturezaFinanceira === 'CONTA_A_RECEBER')
  const resumoCategorias = useMemo(() => {
    const data = resumo.data
    if (!data) return []
    return [...data.receitas.porCategoria, ...data.despesas.porCategoria]
  }, [resumo.data])

  const salvarLancamento = useMutation({
    mutationFn: (values: ContabilidadeForm) => {
      const payload = toPayload(values)
      if (editing) return contabilidadeService.atualizarLancamento(editing.id, payload)
      return contabilidadeService.criarLancamento(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contabilidade'] })
      setFeedback(editing ? 'Lançamento atualizado com sucesso.' : 'Lançamento criado com sucesso.')
      closeDialog()
    },
    onError: (error: any) => setFormError(error.message || 'Erro ao salvar lançamento.'),
  })

  const cancelarLancamento = useMutation({
    mutationFn: (id: string) => contabilidadeService.cancelarLancamento(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contabilidade'] })
      setFeedback('Lançamento cancelado com sucesso.')
    },
  })

  const pagarLancamentoMut = useMutation({
    mutationFn: (payload: import('@/types/contabilidade').PagarLancamentoPayload) => {
      if (!paying) throw new Error('Nenhum lançamento selecionado para pagamento.')
      return contabilidadeService.pagarLancamento(paying.id, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contabilidade'] })
      setFeedback('Lançamento pago com sucesso.')
      closePagarDialog()
    },
    onError: (error: any) => setPagarFormError(error.message || 'Erro ao efetuar pagamento.'),
  })

  const exportarLancamentos = useMutation({
    mutationFn: () => contabilidadeService.exportarCsv(filters),
    onSuccess: (blob) => {
      downloadBlob(blob, 'contabilidade_lancamentos.csv')
      setFeedback('CSV de lançamentos exportado.')
    },
  })

  const exportarDre = useMutation({
    mutationFn: () => contabilidadeService.exportarDreCsv(filters),
    onSuccess: (blob) => {
      downloadBlob(blob, 'dre_gerencial.csv')
      setFeedback('CSV da DRE exportado.')
    },
  })

  const exportarResumoMensal = useMutation({
    mutationFn: () => contabilidadeService.exportarResumoMensalCsv(anoResumo),
    onSuccess: (blob) => {
      downloadBlob(blob, 'resumo_mensal_contabilidade.csv')
      setFeedback('CSV do resumo mensal exportado.')
    },
  })

  function updateFilter<K extends keyof FiltrosContabilidade>(key: K, value: FiltrosContabilidade[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function openCreate(tipo?: TipoLancamentoContabil) {
    const nextForm = {
      ...emptyForm,
      tipo: tipo || emptyForm.tipo,
      naturezaFinanceira: tipo === 'RECEITA' ? 'CONTA_A_RECEBER' : tipo === 'DESPESA' ? 'CONTA_A_PAGAR' : emptyForm.naturezaFinanceira,
      status: tipo ? 'PENDENTE' : emptyForm.status,
    }
    setEditing(null)
    setFormError('')
    form.reset(nextForm)
    setOpen(true)
  }

  function openEdit(lancamento: LancamentoContabilOperacional) {
    setEditing(lancamento)
    setFormError('')
    form.reset(toForm(lancamento))
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setEditing(null)
    setFormError('')
    form.reset(emptyForm)
  }

  function openPagarModal(lancamento: LancamentoContabilOperacional) {
    setPaying(lancamento)
    setPagarFormError('')
    pagarForm.reset({
      valorPago: lancamento.valor,
      dataPagamento: toInputDate(hoje),
      formaPagamento: '',
      numeroDocumento: lancamento.numeroDocumento || '',
      justificativaDivergencia: '',
      observacoes: '',
    })
    setOpenPagar(true)
  }

  function closePagarDialog() {
    setOpenPagar(false)
    setPaying(null)
    setPagarFormError('')
    pagarForm.reset()
  }

  function handleTipoChange(value: TipoLancamentoContabil) {
    form.setValue('tipo', value, { shouldDirty: true })
    form.setValue('naturezaFinanceira', value === 'RECEITA' ? 'CONTA_A_RECEBER' : 'CONTA_A_PAGAR', { shouldDirty: true })
    form.setValue('status', 'PENDENTE', { shouldDirty: true })
  }

  const columns: Array<DataTableColumn<LancamentoContabilOperacional>> = [
    { key: 'data', header: 'Data', render: (row) => formatDate(row.dataLancamento) },
    { key: 'vencimento', header: 'Vencimento', render: (row) => formatDate(row.dataVencimento) },
    { key: 'tipo', header: 'Tipo', render: (row) => <Badge className={tipoTone(row.tipo)}>{tipoLabel(row.tipo)}</Badge> },
    { key: 'natureza', header: 'Natureza', render: (row) => naturezaLabel(row.naturezaFinanceira) },
    { key: 'categoria', header: 'Categoria', render: (row) => row.categoria },
    { key: 'centro', header: 'Centro', render: (row) => row.centroCusto || '-' },
    { key: 'descricao', header: 'Descrição', render: (row) => <span className="font-medium text-slate-800 dark:text-slate-200">{row.descricao}</span> },
    { key: 'fornecedor', header: 'Fornecedor', render: (row) => row.fornecedor?.nome || '-' },
    { key: 'os', header: 'OS', render: (row) => (row.ordemServico?.numeroOS ? `#${row.ordemServico.numeroOS}` : '-') },
    {
      key: 'valor',
      header: 'Valor',
      render: (row) => <span className={row.tipo === 'RECEITA' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{formatCurrency(row.valor)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge className={statusTone(row.statusCalculado || row.status)}>{statusLabel(row.statusCalculado || row.status)}</Badge>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDENTE' || row.status === 'VENCIDO' || row.status === 'REGISTRADO' ? (
            <Button
              type="button"
              variant="default"
              className="h-8 gap-1 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
              onClick={() => openPagarModal(row)}
            >
              <Banknote className="h-3 w-3" />
              Pagar
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="h-8 gap-1 px-2 text-xs" title="Editar" onClick={() => openEdit(row)}>
            <Edit className="h-3 w-3" />
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 gap-1 px-2 text-xs text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            title="Cancelar"
            disabled={row.status === 'CANCELADO' || cancelarLancamento.isPending}
            onClick={() => cancelarLancamento.mutate(row.id)}
          >
            <Ban className="h-3 w-3" />
            Cancelar
          </Button>
        </div>
      ),
    },
  ]

  function renderTable(data: LancamentoContabilOperacional[], emptyMessage: string) {
    if (lancamentos.isLoading) return <LoadingState label="Carregando lançamentos contábeis operacionais..." />
    if (lancamentos.isError) return <ErrorState message="Erro ao carregar contabilidade. Verifique o backend e tente novamente." />
    if (data.length === 0) return <EmptyState title="Nenhum lançamento encontrado" message={emptyMessage} />
    return <DataTable columns={columns} data={data} getRowKey={(row) => row.id} />
  }

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        title="Contabilidade Operacional"
        description="Gestao gerencial de receitas, despesas, contas, fornecedores e resultado operacional da oficina."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['contabilidade'] })}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" variant="secondary" disabled={exportarLancamentos.isPending} onClick={() => exportarLancamentos.mutate()}>
              {exportarLancamentos.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar lançamentos CSV
            </Button>
            <Button type="button" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Novo lançamento
            </Button>
          </>
        }
      />

      <Alert variant="warning">
        Este módulo possui finalidade gerencial e operacional. Não substitui escrituração contábil, emissão fiscal, apuração tributária ou obrigações legais oficiais.
      </Alert>
      {feedback ? <Alert variant="success">{feedback}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Receita do periodo" value={formatCurrency(resumo.data?.receitas.total || 0)} icon={<Landmark className="h-5 w-5" />} tone="green" />
        <StatCard title="Despesa do periodo" value={formatCurrency(resumo.data?.despesas.total || 0)} icon={<Calculator className="h-5 w-5" />} tone="rose" />
        <StatCard title="Resultado operacional" value={formatCurrency(resumo.data?.resultadoOperacional || 0)} note={`${resumo.data?.margemOperacionalPercentual || 0}% de margem`} tone={(resumo.data?.resultadoOperacional || 0) < 0 ? 'amber' : 'cyan'} />
        <StatCard title="Contas a pagar pendentes" value={resumo.data?.contasAPagarPendentes || 0} tone="amber" />
        <StatCard title="Contas a receber pendentes" value={resumo.data?.contasAReceberPendentes || 0} tone="blue" />
        <StatCard title="Contas vencidas" value={resumo.data?.contasVencidas || 0} tone="rose" />
        <StatCard title="Lançamentos pagos" value={resumo.data?.contasPagas || 0} tone="green" />
        <StatCard title="Recebidos" value={resumo.data?.contasRecebidas || 0} tone="green" />
        <StatCard title="Maior fornecedor" value={resumo.data?.fornecedoresComMaiorDespesa[0]?.fornecedor || '-'} note={resumo.data?.fornecedoresComMaiorDespesa[0] ? formatCurrency(resumo.data.fornecedoresComMaiorDespesa[0].total) : 'Sem despesas vinculadas'} tone="violet" />
        <StatCard title="Maior categoria de despesa" value={resumo.data?.maiorCategoriaDespesa?.categoria || '-'} note={resumo.data?.maiorCategoriaDespesa ? formatCurrency(resumo.data.maiorCategoriaDespesa.total) : 'Sem despesas'} tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Search className="h-4 w-4 text-cyan-700" />
            Filtros
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-10">
            <div>
              <Label>Data inicial</Label>
              <Input type="date" value={filters.inicio || ''} onChange={(event) => updateFilter('inicio', event.target.value)} />
            </div>
            <div>
              <Label>Data final</Label>
              <Input type="date" value={filters.fim || ''} onChange={(event) => updateFilter('fim', event.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filters.tipo || ''} onChange={(event) => updateFilter('tipo', event.target.value as TipoLancamentoContabil | '')}>
                <option value="">Todos</option>
                {tiposLancamentoContabil.map((tipo) => <option key={tipo} value={tipo}>{tipoLabel(tipo)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Natureza</Label>
              <Select value={filters.naturezaFinanceira || ''} onChange={(event) => updateFilter('naturezaFinanceira', event.target.value as NaturezaFinanceiraContabil | '')}>
                <option value="">Todas</option>
                {naturezasFinanceirasContabil.map((natureza) => <option key={natureza} value={natureza}>{naturezaLabel(natureza)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={filters.categoria || ''} onChange={(event) => updateFilter('categoria', event.target.value)} placeholder="Categoria" />
            </div>
            <div>
              <Label>Centro de custo</Label>
              <Select value={filters.centroCusto || ''} onChange={(event) => updateFilter('centroCusto', event.target.value)}>
                <option value="">Todos</option>
                {centrosCustoContabil.map((centro) => <option key={centro} value={centro}>{centro}</option>)}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status || ''} onChange={(event) => updateFilter('status', event.target.value as StatusLancamentoContabil | '')}>
                <option value="">Todos</option>
                {statusLancamentoContabil.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={filters.fornecedorId || ''} onChange={(event) => updateFilter('fornecedorId', event.target.value)}>
                <option value="">Todos</option>
                {(fornecedores.data || []).map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nomeFantasia || fornecedor.razaoSocial}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={filters.origem || ''} onChange={(event) => updateFilter('origem', event.target.value as OrigemLancamentoContabil | '')}>
                <option value="">Todas</option>
                {origensLancamentoContabil.map((origem) => <option key={origem} value={origem}>{origemLabel(origem)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Busca</Label>
              <Input value={filters.busca || ''} onChange={(event) => updateFilter('busca', event.target.value)} placeholder="Descrição ou OS" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs>
        <TabsList className="flex w-full flex-wrap">
          {tabLabels.map((tab) => (
            <TabsTrigger
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'bg-[hsl(var(--surface-active))] text-primary-foreground' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab === 'visao' ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Resumo por categoria</h3></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[520px]">
                  <thead><tr><Th>Categoria</Th><Th>Tipo</Th><Th>Total</Th><Th>Percentual</Th></tr></thead>
                  <tbody>
                    {resumoCategorias.map((item) => (
                      <tr key={`${item.tipo}-${item.categoria}`}>
                        <Td>{item.categoria}</Td>
                        <Td><Badge className={tipoTone(item.tipo)}>{tipoLabel(item.tipo)}</Badge></Td>
                        <Td>{formatCurrency(item.total)}</Td>
                        <Td>{item.percentual.toFixed(2)}%</Td>
                      </tr>
                    ))}
                    {resumoCategorias.length === 0 ? <tr><Td colSpan={4}>Sem categorias no periodo.</Td></tr> : null}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Centros de custo</h3></CardHeader>
              <CardContent className="space-y-3">
                {(resumo.data?.centrosCusto || []).slice(0, 8).map((item) => (
                  <div key={item.centroCusto} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.centroCusto}</span>
                    <span className="text-slate-500 dark:text-slate-400">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                {(resumo.data?.centrosCusto.length || 0) === 0 ? <p className="text-sm text-muted-foreground">Sem centros de custo no periodo.</p> : null}
              </CardContent>
            </Card>
            <Card className="xl:col-span-3">
              <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Fornecedores com maior despesa</h3></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[520px]">
                  <thead><tr><Th>Fornecedor</Th><Th>Total no periodo</Th><Th>Quantidade</Th></tr></thead>
                  <tbody>
                    {(resumo.data?.fornecedoresComMaiorDespesa || []).map((item) => (
                      <tr key={item.fornecedorId}><Td>{item.fornecedor}</Td><Td>{formatCurrency(item.total)}</Td><Td>{item.quantidade}</Td></tr>
                    ))}
                    {(resumo.data?.fornecedoresComMaiorDespesa.length || 0) === 0 ? <tr><Td colSpan={3}>Sem despesas vinculadas a fornecedores.</Td></tr> : null}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === 'lancamentos' ? renderTable(todosLancamentos, 'Crie lançamentos manuais ou ajuste os filtros do período.') : null}
        {activeTab === 'pagar' ? renderTable(contasAPagar, 'Não há contas a pagar nos filtros atuais.') : null}
        {activeTab === 'receber' ? renderTable(contasAReceber, 'Não há contas a receber nos filtros atuais.') : null}

        {activeTab === 'dre' ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">DRE Gerencial Simplificada</h3></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <tbody>
                    <tr><Td className="font-semibold">Receita bruta operacional</Td><Td>{formatCurrency(dre.data?.receitaBruta || 0)}</Td></tr>
                    {(dre.data?.despesas || []).map((item) => (
                      <tr key={item.categoria}><Td>(-) {item.categoria}</Td><Td>{formatCurrency(item.total)}</Td></tr>
                    ))}
                    <tr><Td className="font-semibold">Total despesas</Td><Td>{formatCurrency(dre.data?.totalDespesas || 0)}</Td></tr>
                    <tr><Td className="font-semibold">Resultado operacional estimado</Td><Td>{formatCurrency(dre.data?.resultadoOperacional || 0)}</Td></tr>
                    <tr><Td className="font-semibold">Margem operacional</Td><Td>{dre.data?.margemOperacionalPercentual || 0}%</Td></tr>
                  </tbody>
                </Table>
              </CardContent>
            </Card>
            <Alert variant="info">
              A DRE exibida é gerencial, simplificada e baseada nos lançamentos operacionais não cancelados. Ela não possui validade fiscal ou contábil oficial.
            </Alert>
          </div>
        ) : null}

        {activeTab === 'relatorios' ? (
          <div className="space-y-4">
            <Card>
              <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Resumo mensal</h3></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex max-w-xs items-end gap-2">
                  <div className="flex-1">
                    <Label>Ano</Label>
                    <Input type="number" value={anoResumo} onChange={(event) => setAnoResumo(Number(event.target.value || hoje.getFullYear()))} />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['contabilidade', 'resumo-mensal'] })}>
                    <CalendarDays className="h-4 w-4" />
                    Atualizar
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[720px]">
                    <thead><tr><Th>Mes</Th><Th>Receitas</Th><Th>Despesas</Th><Th>Resultado</Th><Th>Contas a pagar</Th><Th>Contas a receber</Th></tr></thead>
                    <tbody>
                      {(resumoMensal.data || []).map((item) => (
                        <tr key={item.mes}>
                          <Td>{nomesMeses[item.mes - 1]}</Td>
                          <Td>{formatCurrency(item.receitas)}</Td>
                          <Td>{formatCurrency(item.despesas)}</Td>
                          <Td>{formatCurrency(item.resultado)}</Td>
                          <Td>{item.contasAPagar}</Td>
                          <Td>{item.contasAReceber}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Preparacao Power BI</h3></CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="info">Arquivos exportados em formato tabular para analise gerencial e dashboards no Power BI.</Alert>
                <Alert variant="warning">Integracao automatica com PDV/Caixa sera tratada em fase futura para evitar duplicidade de receitas.</Alert>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" disabled={exportarLancamentos.isPending} onClick={() => exportarLancamentos.mutate()}>
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV de lançamentos
                  </Button>
                  <Button type="button" variant="secondary" disabled={exportarDre.isPending} onClick={() => exportarDre.mutate()}>
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV de DRE
                  </Button>
                  <Button type="button" variant="secondary" disabled={exportarResumoMensal.isPending} onClick={() => exportarResumoMensal.mutate()}>
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV de resumo mensal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </Tabs>

      <Dialog
        open={open}
        title={editing ? 'Editar lançamento' : 'Novo lançamento'}
        description="Registre receita, despesa ou conta operacional sem alterar OS, estoque, PDV ou caixa."
        contentClassName="max-w-5xl"
        onClose={closeDialog}
      >
        {formError ? <Alert variant="error" className="mb-4">{formError}</Alert> : null}
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => salvarLancamento.mutate(values))}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.watch('tipo')} onChange={(event) => handleTipoChange(event.target.value as TipoLancamentoContabil)}>
                {tiposLancamentoContabil.map((tipo) => <option key={tipo} value={tipo}>{tipoLabel(tipo)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Natureza financeira</Label>
              <Select {...form.register('naturezaFinanceira')}>
                {naturezasFinanceirasContabil.map((natureza) => <option key={natureza} value={natureza}>{naturezaLabel(natureza)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select {...form.register('categoria')}>
                <option value="">Selecione</option>
                {categoriasFormulario.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
              </Select>
              {form.formState.errors.categoria ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.categoria.message}</p> : null}
            </div>
            <div>
              <Label>Centro de custo</Label>
              <Select {...form.register('centroCusto')}>
                <option value="">Sem centro</option>
                {centrosCustoContabil.map((centro) => <option key={centro} value={centro}>{centro}</option>)}
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input {...form.register('descricao')} placeholder="Ex.: Compra de peças" />
              {form.formState.errors.descricao ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.descricao.message}</p> : null}
            </div>
            <div>
              <Label>Valor</Label>
              <Input {...form.register('valor')} inputMode="decimal" placeholder="0,00" />
              {form.formState.errors.valor ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.valor.message}</p> : null}
            </div>
            <div>
              <Label>Data do lançamento</Label>
              <Input type="date" {...form.register('dataLancamento')} />
            </div>
            <div>
              <Label>Competencia</Label>
              <Input type="date" {...form.register('competencia')} />
            </div>
            <div>
              <Label>Data de vencimento</Label>
              <Input type="date" {...form.register('dataVencimento')} />
            </div>
            <div>
              <Label>Data de pagamento</Label>
              <Input type="date" {...form.register('dataPagamento')} />
            </div>
            <div>
              <Label>Data de recebimento</Label>
              <Input type="date" {...form.register('dataRecebimento')} />
            </div>
            <div>
              <Label>Número do documento</Label>
              <Input {...form.register('numeroDocumento')} placeholder="NF, recibo, contrato..." />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select {...form.register('fornecedorId')}>
                <option value="">Sem fornecedor</option>
                {(fornecedores.data || []).map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nomeFantasia || fornecedor.razaoSocial}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>OS</Label>
              <Select {...form.register('ordemServicoId')}>
                <option value="">Sem OS</option>
                {(ordensServico.data || []).map((os) => (
                  <option key={os.id} value={os.id}>#{os.numeroOS || os.numero} - {os.placaVeiculo || os.veiculo?.placa || 'sem placa'}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Input {...form.register('formaPagamento')} placeholder="PIX, dinheiro, boleto..." />
            </div>
            <div>
              <Label>Status</Label>
              <Select {...form.register('status')}>
                {statusLancamentoFormulario.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select {...form.register('origem')}>
                {origensLancamentoContabil.map((origem) => <option key={origem} value={origem}>{origemLabel(origem)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Parcela atual</Label>
              <Input type="number" min={1} {...form.register('parcelaAtual')} />
            </div>
            <div>
              <Label>Total de parcelas</Label>
              <Input type="number" min={1} {...form.register('parcelaTotal')} />
            </div>
            <label className="mt-6 flex h-[var(--control-height)] items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" {...form.register('recorrente')} />
              Recorrente
            </label>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea {...form.register('observacoes')} rows={3} placeholder="Notas internas para conferencia gerencial." />
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" disabled={salvarLancamento.isPending}>
              {salvarLancamento.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={openPagar}
        title="Pagar Lançamento"
        description="Confirme os dados de pagamento e a baixa no sistema."
        contentClassName="max-w-xl"
        onClose={closePagarDialog}
      >
        {paying ? (
          <form className="space-y-4" onSubmit={pagarForm.handleSubmit((values) => pagarLancamentoMut.mutate(values))}>
            {pagarFormError ? <Alert variant="error" className="mb-4">{pagarFormError}</Alert> : null}
            
            <div className="rounded-md border border-border/60 bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="font-semibold">Descrição:</span> {paying.descricao}</div>
                <div><span className="font-semibold">Fornecedor:</span> {paying.fornecedor?.nome || '-'}</div>
                <div><span className="font-semibold">Vencimento:</span> {formatDate(paying.dataVencimento)}</div>
                <div><span className="font-semibold">Status Atual:</span> {paying.statusCalculado || paying.status}</div>
                <div><span className="font-semibold">Valor Original:</span> {formatCurrency(paying.valor)}</div>
                {paying.pedidoCompra ? (
                  <div><span className="font-semibold">Pedido Associado:</span> #{paying.pedidoCompra.numero}</div>
                ) : null}
              </div>
            </div>

            {paying.observacoes?.includes('Recebimento zerado') ? (
              <Alert variant="error">
                <strong>Pagamento bloqueado!</strong> Este lançamento está atrelado a um pedido de compra que foi recebido sem mercadorias (recebimento zerado). Revise ou cancele o lançamento.
              </Alert>
            ) : null}

            {paying.pedidoCompra?.status === 'RECEBIDO_COM_DIVERGENCIA' ? (
              <Alert variant="warning">
                <strong>Atenção:</strong> O pedido de compra vinculado possui divergências abertas (quantidades menores ou não aprovadas). Se for realizar um pagamento parcial, você deve preencher obrigatoriamente a justificativa.
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Valor a Pagar</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  disabled={paying.observacoes?.includes('Recebimento zerado')}
                  {...pagarForm.register('valorPago', { valueAsNumber: true })} 
                />
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <Input 
                  type="date" 
                  disabled={paying.observacoes?.includes('Recebimento zerado')}
                  {...pagarForm.register('dataPagamento')} 
                />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Input 
                  placeholder="Ex: PIX, Boleto, Cartão" 
                  disabled={paying.observacoes?.includes('Recebimento zerado')}
                  {...pagarForm.register('formaPagamento')} 
                />
              </div>
              <div>
                <Label>Número do Comprovante</Label>
                <Input 
                  placeholder="Ex: N. de transação" 
                  disabled={paying.observacoes?.includes('Recebimento zerado')}
                  {...pagarForm.register('numeroDocumento')} 
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {(paying.pedidoCompra?.status === 'RECEBIDO_COM_DIVERGENCIA' || pagarForm.watch('valorPago') < paying.valor) ? (
                <div>
                  <Label>Justificativa Obrigatória (Divergência ou Pgto Parcial)</Label>
                  <Textarea 
                    rows={2} 
                    placeholder="Explique o abatimento do valor..." 
                    disabled={paying.observacoes?.includes('Recebimento zerado')}
                    {...pagarForm.register('justificativaDivergencia')} 
                  />
                </div>
              ) : null}

              <div>
                <Label>Observações Gerais</Label>
                <Textarea 
                  rows={2} 
                  placeholder="Notas internas..." 
                  disabled={paying.observacoes?.includes('Recebimento zerado')}
                  {...pagarForm.register('observacoes')} 
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
              <Button type="button" variant="secondary" onClick={closePagarDialog}>Cancelar</Button>
              <Button 
                type="submit" 
                disabled={pagarLancamentoMut.isPending || paying.observacoes?.includes('Recebimento zerado')}
              >
                {pagarLancamentoMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                Confirmar Pagamento
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  )
}
