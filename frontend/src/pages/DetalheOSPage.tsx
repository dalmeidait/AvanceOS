import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUp, CalendarDays, ExternalLink, FileText, Plus, Save, Trash2, Upload, Activity, Wrench, Clock, Package, Sparkles, ClipboardList, CheckCircle, Circle, Loader2, AlertTriangle, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLayoutSubHeader } from '@/contexts/LayoutSubHeaderContext'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { OrcamentoOs } from './OrcamentoOs'
import { OsOfyciaSection } from '@/components/os/OsOfyciaSection'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/formatters'
import { possuiGrupoVeiculos, rotuloGrupoVeiculos, totalVeiculosCliente } from '@/lib/clientes'
import { maskMoneyBR, parseMoneyBR } from '@/lib/masks'
import { downloadOsDocumentPdf } from '@/lib/osDocumentPdf'
import { isProductOsItem, normalizeOsItem } from '@/lib/osDisplay'
import { safeRandomId } from '@/lib/safeRandomId'
import { readLocalPreference, writeLocalPreference } from '@/lib/storage'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { agendamentoService } from '@/services/agendamento.service'
import { estoqueSolicitacoesService } from '@/services/estoque-solicitacoes.service'
import { movimentacoesService } from '@/services/movimentacoes.service'
import { osService } from '@/services/os.service'
import { produtosService } from '@/services/produtos.service'
import { servicosService } from '@/services/servicos.service'
import type { ItemOS, OrdemServicoDocumento, StatusOS, TipoDocumentoOS } from '@/types/ordem-servico'
import type { Produto } from '@/types/produto'
import type { Servico } from '@/types/servico'
import type { CriarSolicitacaoEstoquePayload } from '@/types/solicitacao-estoque'
import type { Movimentacao } from '@/types/movimentacao'

type EditableItem = {
  key: string
  produtoId: string
  servicoId: string
  tipoItem: 'SERVICO' | 'PRODUTO' | 'INSUMO'
  servicoNome: string
  descricao: string
  quantidade: number
  valorUnitario: number
}

const documentTypeOptions: Array<{ value: TipoDocumentoOS; label: string }> = [
  { value: 'RESUMO_OS', label: 'Resumo completo da OS' },
  { value: 'COMPROVANTE_PAGAMENTO', label: 'Comprovante de pagamento' },
  { value: 'LAUDO_TECHHUB', label: 'Laudo TechHub' },
  { value: 'ORCAMENTO', label: 'Orcamento' },
  { value: 'FOTO', label: 'Foto' },
  { value: 'AUTORIZACAO', label: 'Autorizacao' },
  { value: 'DOCUMENTO_EXTERNO', label: 'Documento externo' },
  { value: 'OUTROS', label: 'Outros' },
]

const documentTypeLabels = Object.fromEntries(documentTypeOptions.map((item) => [item.value, item.label]))

const statusEditaveis: StatusOS[] = [
  'ABERTA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'APROVADA',
  'EM_EXECUCAO',
  'AGUARDANDO_PECA',
  'CONCLUIDA',
  'ENTREGUE',
  'CANCELADA',
]

const statusLabels: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_DIAGNOSTICO: 'Em diagnostico',
  AGUARDANDO_APROVACAO: 'Aguardando aprovacao',
  APROVADA: 'Aprovada',
  EM_EXECUCAO: 'Em execucao',
  AGUARDANDO_PECA: 'Aguardando peca',
  CONCLUIDA: 'Concluida',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
}

function toEditableItem(item: ItemOS, index: number): EditableItem {
  const normalized = normalizeOsItem(item, index)
  const isProduct = isProductOsItem(item)

  return {
    key: item.id || `item-${index}`,
    produtoId: item.produtoId || item.produto?.id || '',
    servicoId: item.servicoId || '',
    tipoItem: isProduct ? (item.tipoItem === 'INSUMO' ? 'INSUMO' : 'PRODUTO') : 'SERVICO',
    servicoNome: normalized.nome,
    descricao: normalized.descricao,
    quantidade: Number(item.quantidade || 1),
    valorUnitario: Number(item.valorUnitario || item.produto?.precoVenda || 0),
  }
}

function itemTotal(item: EditableItem) {
  return Number(item.quantidade || 0) * Number(item.valorUnitario || 0)
}

function descricaoProduto(produto?: Produto) {
  if (!produto) return ''
  return produto.descricao || [produto.marca, produto.categoria].filter(Boolean).join(' / ')
}

function paymentStatusLabel(status?: StatusOS) {
  if (status === 'PAGO') return 'Pago'
  if (status === 'CANCELADA') return 'Cancelado'
  return 'Pendente'
}

function paymentBadgeClass(status?: StatusOS) {
  if (status === 'PAGO') return 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
  if (status === 'CANCELADA') return 'inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700'
  return 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'
}

function movementDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function movementProductName(movement: Movimentacao) {
  return movement.product?.nome || movement.produto?.nome || '-'
}

function movementUserName(movement: Movimentacao) {
  return movement.usuario?.nome || movement.user?.nome || '-'
}

export function DetalheOSPage() {
  const { id = '' } = useParams()

  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StatusOS>('ABERTA')
  const [descricao, setDescricao] = useState('')
  const [relatoMecanico, setRelatoMecanico] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [items, setItems] = useState<EditableItem[]>([])
  const [addItemsOpen, setAddItemsOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [ofyciaOpen, setOfyciaOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [lastSaveStatus, setLastSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const { setSubHeader } = useLayoutSubHeader()

  useEffect(() => {
    const mainContainer = document.getElementById('main-scroll-container')
    const handleScroll = () => {
      if (mainContainer) setShowBackToTop(mainContainer.scrollTop > 300)
    }

    if (mainContainer) {
      mainContainer.addEventListener('scroll', handleScroll, { passive: true })
    }

    setSubHeader(
      <div className="flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2 sm:px-6 lg:px-8">
        <span className="mr-2 hidden text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 xl:inline">
          Navegação da OS
        </span>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-status')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Activity className="mr-2 h-4 w-4" /> Status
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-diagnostico')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Wrench className="mr-2 h-4 w-4" /> Diagnóstico
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-servicos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <ClipboardList className="mr-2 h-4 w-4" /> Serviços
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-pecas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Package className="mr-2 h-4 w-4" /> Peças
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Clock className="mr-2 h-4 w-4" /> Timeline
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <CalendarDays className="mr-2 h-4 w-4" /> Agenda
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-estoque')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Package className="mr-2 h-4 w-4" /> Estoque
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => document.getElementById('os-ofycia')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Sparkles className="mr-2 h-4 w-4" /> OFYCIA
        </Button>
        <Button type="button" variant="ghost" className="h-9 shrink-0 px-3 text-sm font-medium" onClick={() => setDocumentsOpen(true)}>
          <FileText className="mr-2 h-4 w-4" /> Documentos
        </Button>
      </div>
    )

    return () => {
      setSubHeader(null)
      if (mainContainer) {
        mainContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [setSubHeader, setDocumentsOpen])

  const ordem = useQuery({
    queryKey: ['ordem-servico', id],
    queryFn: () => osService.buscarPorId(id),
    enabled: Boolean(id),
  })
  const produtos = useQuery({ queryKey: ['produtos'], queryFn: produtosService.listar })
  const servicosCatalogo = useQuery({ queryKey: ['servicos'], queryFn: () => servicosService.listar({ status: 'ATIVO' }) })
  const documentos = useQuery({
    queryKey: ['ordem-servico', id, 'documentos'],
    queryFn: () => osService.listarDocumentos(id),
    enabled: Boolean(id),
  })
  const orcamentos = useQuery({
    queryKey: ['orcamentos', id],
    queryFn: async () => {
      const { data } = await api.get(`/os/${id}/orcamentos`)
      return data
    },
    enabled: Boolean(id),
  })
  const movimentacoesEstoque = useQuery({
    queryKey: ['ordem-servico', id, 'movimentacoes-estoque'],
    queryFn: () => movimentacoesService.listarPorOS(id),
    enabled: Boolean(id),
  })
  const agendaOs = useQuery({
    queryKey: ['agenda', 'ordem-servico', id],
    queryFn: () => agendamentoService.listar({ ordemServicoId: id }),
    enabled: Boolean(id),
  })

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!ordem.data) return
    setStatus(ordem.data.status === 'CONCLUIDO' ? 'CONCLUIDA' : ordem.data.status)
    setDescricao(ordem.data.descricao || '')
    setRelatoMecanico(ordem.data.relatoMecanico || '')
    setDiagnostico(ordem.data.diagnostico || '')
    setItems((ordem.data.itens ?? []).map(toEditableItem))
  }, [ordem.data])
  /* eslint-enable react-hooks/set-state-in-effect */



  const readOnly = ordem.data?.status === 'PAGO' || ordem.data?.status === 'CANCELADA'
  const servicos = items.filter((item) => !item.produtoId)
  const pecas = items.filter((item) => item.produtoId)
  const totalServicos = servicos.reduce((acc, item) => acc + itemTotal(item), 0)
  const totalPecas = pecas.reduce((acc, item) => acc + itemTotal(item), 0)
  const desconto = Number(ordem.data?.descontoAplicado || 0)
  const total = Number(ordem.data?.totalGeral ?? totalServicos + totalPecas - desconto)
  const valorPago = Number(ordem.data?.valorPago ?? 0)
  const saldoPendente = Number(ordem.data?.saldoPendente ?? total)
  const statusFinanceiro = ordem.data?.statusFinanceiro || paymentStatusLabel(ordem.data?.status).toUpperCase()
  const statusPagamento = statusFinanceiro === 'CANCELADO' ? 'Cancelado' : statusFinanceiro === 'PAGO' ? 'Pago' : statusFinanceiro === 'PARCIAL' ? 'Parcial' : 'Pendente'
  const canAttachDocuments = ordem.data?.status !== 'PAGO' && ordem.data?.status !== 'CANCELADA'

  const produtosPorId = useMemo(
    () => new Map((produtos.data ?? []).map((produto) => [produto.id, produto])),
    [produtos.data],
  )

  const salvar = useMutation({
    mutationFn: () =>
      osService.atualizar(id, {
        status,
        descricao,
        relatoMecanico,
        diagnostico,
        itens: items.map((item) => ({
          id: item.key.startsWith('item-') ? undefined : item.key,
          produtoId: item.produtoId || null,
          servicoId: item.servicoId || null,
          tipoItem: item.tipoItem,
          servicoNome: item.servicoNome.trim(),
          descricao: item.descricao.trim(),
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.valorUnitario),
          valorTotal: itemTotal(item),
        })),
      }),
    onSuccess: async () => {
      setSuccessMessage('Alterações salvas com sucesso.')
      setFormError('')
      setHasPendingChanges(false)
      setLastSaveStatus('saved')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id] })
      await queryClient.invalidateQueries({ queryKey: ['ordens-servico'] })
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['estoque', 'movimentacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id, 'movimentacoes-estoque'] })
    },
    onError: (error) => {
      setSuccessMessage('')
      setFormError(getApiErrorMessage(error))
      setLastSaveStatus('error')
    },
  })

  const adicionarItens = useMutation({
    mutationFn: async (newItems: EditableItem[]) => {
      let updated = ordem.data
      for (const item of newItems) {
        const payload = {
          id: item.key.startsWith('item-') ? undefined : item.key,
          servicoId: item.servicoId || null,
          produtoId: item.produtoId || null,
          tipoItem: item.tipoItem,
          servicoNome: item.servicoNome.trim(),
          descricao: item.descricao.trim(),
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.valorUnitario),
        }
        updated = item.produtoId
          ? await osService.adicionarProduto(id, payload)
          : await osService.adicionarServico(id, payload)
      }
      return updated
    },
    onSuccess: async () => {
      setSuccessMessage('Itens adicionados a Ordem de Servico com sucesso.')
      setFormError('')
      setHasPendingChanges(true)
      setLastSaveStatus('idle')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id] })
      await queryClient.invalidateQueries({ queryKey: ['ordens-servico'] })
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      await queryClient.invalidateQueries({ queryKey: ['estoque', 'movimentacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id, 'movimentacoes-estoque'] })
    },
    onError: (error) => {
      setSuccessMessage('')
      setFormError(getApiErrorMessage(error))
    },
  })

  const removerItem = useMutation({
    mutationFn: (itemId: string) => osService.removerItem(id, itemId),
    onSuccess: async () => {
      setSuccessMessage('Item removido da Ordem de Servico.')
      setFormError('')
      setHasPendingChanges(true)
      setLastSaveStatus('idle')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id] })
      await queryClient.invalidateQueries({ queryKey: ['ordens-servico'] })
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      await queryClient.invalidateQueries({ queryKey: ['estoque', 'movimentacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id, 'movimentacoes-estoque'] })
    },
    onError: (error) => {
      setSuccessMessage('')
      setFormError(getApiErrorMessage(error))
    },
  })

  const finalizar = useMutation({
    mutationFn: () => osService.finalizar(id),
    onSuccess: async () => {
      setStatus('CONCLUIDA')
      setSuccessMessage('Ordem de Servico finalizada com sucesso.')
      setFormError('')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id] })
      await queryClient.invalidateQueries({ queryKey: ['ordens-servico'] })
    },
    onError: (error) => {
      setSuccessMessage('')
      setFormError(getApiErrorMessage(error))
    },
  })

  const iniciarExecucao = useMutation({
    mutationFn: () => osService.atualizar(id, { status: 'EM_EXECUCAO' } as any),
    onSuccess: async () => {
      setStatus('EM_EXECUCAO')
      setSuccessMessage('Execução da OS iniciada com sucesso.')
      setFormError('')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id] })
    },
    onError: (error) => {
      setSuccessMessage('')
      setFormError(getApiErrorMessage(error))
    },
  })

  const anexarDocumento = useMutation({
    mutationFn: ({ tipoDocumento, file }: { tipoDocumento: TipoDocumentoOS | string; file: File }) =>
      osService.anexarDocumento(id, { tipoDocumento, file }),
    onSuccess: async () => {
      setSuccessMessage('Documento anexado com sucesso.')
      setFormError('')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id, 'documentos'] })
    },
    onError: (error) => {
      setSuccessMessage('')
      setFormError(getApiErrorMessage(error))
    },
  })

  function updateItem(key: string, patch: Partial<EditableItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
    setHasPendingChanges(true)
    setLastSaveStatus('idle')
  }

  function appendItems(newItems: EditableItem[]) {
    adicionarItens.mutate(newItems)
    setHasPendingChanges(true)
    setLastSaveStatus('idle')
  }

  function handleRemoveItem(itemKey: string) {
    const item = items.find((current) => current.key === itemKey)
    if (!item?.key || item.key.startsWith('item-')) {
      setItems((current) => current.filter((currentItem) => currentItem.key !== itemKey))
      return
    }
    removerItem.mutate(item.key)
  }

  function validateAndSave() {
    setSuccessMessage('')
    for (const item of items) {
      if (!item.servicoNome.trim()) {
        setFormError(item.produtoId ? 'Selecione um produto/peça válido.' : 'Informe o nome do serviço.')
        return
      }
      if (!Number.isFinite(Number(item.quantidade)) || Number(item.quantidade) <= 0) {
        setFormError('Informe uma quantidade válida para todos os itens da Ordem de Serviço.')
        return
      }
      if (!Number.isFinite(Number(item.valorUnitario)) || Number(item.valorUnitario) < 0) {
        setFormError('Informe um valor unitário válido para todos os itens da Ordem de Serviço.')
        return
      }
    }
    setFormError('')
    salvar.mutate()
  }

  function handleGenerateOsDocument() {
    if (!ordem.data) return

    downloadOsDocumentPdf({
      ordem: {
        ...ordem.data,
        status,
        diagnostico,
        relatoMecanico,
        itens: items,
      },
    })
  }

  if (ordem.isLoading) return <LoadingState label="Carregando Ordem de Serviço..." />
  if (ordem.isError) return <ErrorState message={ordem.error.message} />
  if (!ordem.data) return <ErrorState message="Ordem de Serviço não encontrada." />

  const numero = ordem.data.numeroOS || ordem.data.numero || ordem.data.id.slice(0, 8).toUpperCase()
  const veiculoNome =
    ordem.data.veiculo?.modelo ||
    ordem.data.modeloVeiculo ||
    ordem.data.veiculo?.placa ||
    ordem.data.placaVeiculo ||
    '-'
  const placaVeiculo = ordem.data.veiculo?.placa || ordem.data.placaVeiculo || '-'
  const corVeiculo = ordem.data.veiculo?.cor || '-'
  const quilometragemVeiculo =
    ordem.data.veiculo?.quilometragem === null || ordem.data.veiculo?.quilometragem === undefined
      ? '-'
      : String(ordem.data.veiculo.quilometragem)
  const clienteGrupo = ordem.data.cliente ?? ordem.data.veiculo?.cliente ?? null
  const veiculoEmGrupo = possuiGrupoVeiculos(clienteGrupo)
  const totalVeiculosClienteOs = totalVeiculosCliente(clienteGrupo)
  const rotuloGrupoOs = rotuloGrupoVeiculos(clienteGrupo)
  const agendaVinculada = agendaOs.data?.[0] ?? null

  const isPaga = ordem.data?.status === 'PAGO' || statusFinanceiro === 'PAGO' || statusFinanceiro === 'QUITADO'
  const isCancelada = ordem.data?.status === 'CANCELADA' || statusFinanceiro === 'CANCELADO'

  let indicatorContent = null
  if (isPaga) {
    indicatorContent = <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20"><CheckCircle className="h-3.5 w-3.5" /> OS paga</span>
  } else if (isCancelada) {
    indicatorContent = <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20 dark:text-slate-400"><Lock className="h-3.5 w-3.5" /> OS cancelada</span>
  } else if (readOnly) {
    indicatorContent = <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20 dark:text-slate-400"><Lock className="h-3.5 w-3.5" /> Somente leitura</span>
  } else if (salvar.isPending) {
    indicatorContent = <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500 ring-1 ring-inset ring-blue-500/20"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</span>
  } else if (lastSaveStatus === 'error') {
    indicatorContent = <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20"><AlertTriangle className="h-3.5 w-3.5" /> Erro ao salvar</span>
  } else if (hasPendingChanges) {
    indicatorContent = <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500 ring-1 ring-inset ring-amber-500/20"><Circle className="h-3.5 w-3.5" /> Alterações pendentes</span>
  } else if (lastSaveStatus === 'saved') {
    indicatorContent = <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20"><CheckCircle className="h-3.5 w-3.5" /> Salvo agora</span>
  }

  return (
    <section id="os-page-top" className="relative">
      <PageHeader
        title={`Ordem de Serviço nº ${numero}`}
        description="Detalhes operacionais, diagnóstico técnico, serviços, peças/produtos e resumo financeiro."
        actions={
          <div className="flex items-center gap-2">
            {indicatorContent}
            <Button type="button" variant="secondary" onClick={() => setDocumentsOpen(true)}>
              <FileText className="h-4 w-4" />
              Documentos
            </Button>
            <Link to="/os">
              <Button type="button" variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-6 overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-slate-800/90 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.95))]">
        <CardContent className="space-y-5 p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-cyan-200/70 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 shadow-sm dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                  OS {numero}
                </span>
                <StatusBadge status={ordem.data.status} />
                <span className={paymentBadgeClass(ordem.data.status)}>{statusPagamento}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white lg:text-3xl">
                  {ordem.data.cliente?.nome || 'Cliente nao informado'}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {veiculoNome} | Placa {placaVeiculo} | {rotuloGrupoOs}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-200/70 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_30px_rgba(6,182,212,0.12)] dark:border-cyan-400/20 dark:bg-slate-950/50">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Valor total</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{formatCurrency(total)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Status financeiro: {statusPagamento}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <SummaryInfo label="Cliente" value={ordem.data.cliente?.nome || '-'} />
            <SummaryInfo label="Veículo" value={veiculoNome} />
            <SummaryInfo label="Placa" value={placaVeiculo} />
            <div className="rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_18px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/45">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Status</p>
              <div className="mt-3">
                <StatusBadge status={ordem.data.status} />
              </div>
            </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_18px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/45">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Financeiro</p>
            <div className="mt-3">
              <span className={paymentBadgeClass(ordem.data.status)}>{statusPagamento}</span>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/80 to-white p-4 shadow-[0_10px_24px_rgba(6,182,212,0.08)] dark:border-cyan-400/20 dark:from-cyan-950/30 dark:to-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Valor total</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{formatCurrency(total)}</p>
          </div>
          </div>
        </CardContent>
      </Card>




      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {veiculoEmGrupo ? (
            <Alert variant="info">
              Este veiculo pertence a {rotuloGrupoOs.toLowerCase()} de {clienteGrupo?.nome || 'cliente selecionado'}.
              Total de veiculos do cliente: {totalVeiculosClienteOs}.
            </Alert>
          ) : null}

          <Card id="os-status" className="scroll-mt-6 overflow-hidden border-cyan-200/60 bg-gradient-to-br from-white to-cyan-50/35 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-cyan-400/20 dark:from-slate-900 dark:to-cyan-950/20">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Status atual</h3>
                <p className="text-sm text-muted-foreground">O pagamento é realizado somente pelo Caixa/PDV.</p>
              </div>
              <StatusBadge status={ordem.data.status} />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} disabled={readOnly} onChange={(event) => {
                  setStatus(event.target.value as StatusOS)
                  setHasPendingChanges(true)
                  setLastSaveStatus('idle')
                }}>
                  {statusEditaveis.map((option) => (
                    <option key={option} value={option}>
                      {statusLabels[option] || option}
                    </option>
                  ))}
                </Select>
              </div>
              <Info label="Cliente" value={ordem.data.cliente?.nome || '-'} />
              <Info label="Veículo" value={veiculoNome} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <h3 className="font-semibold text-foreground">Dados do veículo</h3>
              <p className="text-sm text-muted-foreground">Identificação usada no atendimento e no histórico da oficina.</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Info label="Marca" value={ordem.data.veiculo?.marca || '-'} />
              <Info label="Modelo" value={veiculoNome} />
              <Info label="Placa" value={placaVeiculo} />
              <Info label="Ano" value={ordem.data.veiculo?.ano || '-'} />
              <Info label="Cor" value={corVeiculo} />
              <Info label="Quilometragem" value={quilometragemVeiculo} />
            </CardContent>
          </Card>

          <Card id="os-diagnostico" className="scroll-mt-6 overflow-hidden border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="bg-slate-950/[0.02] dark:bg-white/[0.02]">
              <h3 className="font-semibold text-foreground">Relatos e diagnóstico</h3>
              <p className="text-sm text-muted-foreground">Laudo operacional, apontamentos do cliente e observações técnicas da equipe.</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Relato do cliente">
                <Textarea
                  value={descricao}
                  readOnly={readOnly}
                  onChange={(event) => {
                    setDescricao(event.target.value)
                    setHasPendingChanges(true)
                    setLastSaveStatus('idle')
                  }}
                  placeholder="Relato do problema pelo cliente."
                />
              </Field>
              <Field label="Diagnóstico técnico">
                <Textarea
                  value={diagnostico}
                  readOnly={readOnly}
                  onChange={(event) => {
                    setDiagnostico(event.target.value)
                    setHasPendingChanges(true)
                    setLastSaveStatus('idle')
                  }}
                  placeholder="Descreva o diagnóstico técnico identificado."
                />
              </Field>
              <Field label="Observações internas" className="md:col-span-2">
                <Textarea
                  value={relatoMecanico}
                  readOnly={readOnly}
                  onChange={(event) => {
                    setRelatoMecanico(event.target.value)
                    setHasPendingChanges(true)
                    setLastSaveStatus('idle')
                  }}
                  placeholder="Registre observações internas da equipe técnica."
                />
              </Field>
            </CardContent>
          </Card>

          <Card id="os-servicos" className="scroll-mt-6 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Serviços</h3>
                <p className="text-sm text-muted-foreground">Mão de obra e atividades técnicas executadas na OS.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setAddItemsOpen(true)} disabled={readOnly}>
                <Plus className="h-4 w-4" />
                Adicionar serviços e peças
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {servicos.length === 0 ? (
                <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Nenhum serviço adicionado.
                </p>
              ) : (
                servicos.map((item) => (
                  <ServicoRow key={item.key} item={item} readOnly={readOnly} onChange={updateItem} onRemove={handleRemoveItem} />
                ))
              )}
            </CardContent>
          </Card>

          <Card id="os-pecas" className="scroll-mt-6 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Peças/produtos</h3>
                <p className="text-sm text-muted-foreground">Itens fisicos usados na OS, preparados para baixa de estoque no proximo bloco.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setAddItemsOpen(true)} disabled={readOnly || produtos.isLoading}>
                <Plus className="h-4 w-4" />
                Adicionar serviços e peças
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {pecas.length === 0 ? (
                <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Nenhuma peça ou produto adicionado.
                </p>
              ) : (
                pecas.map((item) => (
                  <ProdutoRow
                    key={item.key}
                    item={item}
                    produtos={produtos.data ?? []}
                    produtosPorId={produtosPorId}
                    readOnly={readOnly}
                    onChange={updateItem}
                    onRemove={handleRemoveItem}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <OrcamentoOs ordemServicoId={id} itensCount={items.length} />

          <div id="os-timeline" className="scroll-mt-6">
            <OsTimeline ordemServicoId={id} />
          </div>

          {formError ? <ErrorState message={formError} /> : null}
          {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

          <div className="flex justify-end">
            <Button type="button" onClick={validateAndSave} disabled={readOnly || salvar.isPending}>
              <Save className="h-4 w-4" />
              {salvar.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>

        <aside className="space-y-5">
          <Card className="overflow-hidden border-cyan-200/60 bg-gradient-to-br from-white via-white to-cyan-50/45 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-cyan-400/20 dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950/20">
            <CardHeader>
              <h3 className="font-semibold text-foreground">Resumo financeiro</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-cyan-200/70 bg-white/75 p-4 shadow-sm dark:border-cyan-400/20 dark:bg-slate-950/45">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Total geral</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{formatCurrency(total)}</p>
                <div className="mt-3">
                  <span className={paymentBadgeClass(ordem.data.status)}>{statusPagamento}</span>
                </div>
              </div>
              <MoneyLine label="Total de serviços" value={totalServicos} />
              <MoneyLine label="Total de peças/produtos" value={totalPecas} />
              <MoneyLine label="Desconto" value={desconto} />
              <Separator />
              <MoneyLine label="Total geral" value={total} strong />
              <MoneyLine label="Valor pago" value={valorPago} />
              <MoneyLine label="Saldo pendente" value={saldoPendente} strong={saldoPendente > 0} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Status de pagamento</span>
                <span className={paymentBadgeClass(ordem.data.status)}>{statusPagamento}</span>
              </div>
              {(ordem.data.pagamentos ?? ordem.data.transacoes ?? []).length ? (
                <div className="space-y-2 rounded-lg border border-border bg-muted/25 p-3">
                  <p className="font-semibold text-foreground">Histórico de pagamentos</p>
                  {(ordem.data.pagamentos ?? ordem.data.transacoes ?? []).map((pagamento) => (
                    <div key={pagamento.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{pagamento.metodoPagamento} · {movementDate(pagamento.dataPagamento)}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(pagamento.valor)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 pt-2">
                {ordem.data?.status === 'APROVADA_PARA_EXECUCAO' && (
                  <Button
                    type="button"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={readOnly || iniciarExecucao.isPending}
                    onClick={() => iniciarExecucao.mutate()}
                  >
                    {iniciarExecucao.isPending ? 'Iniciando...' : 'Iniciar Execução'}
                  </Button>
                )}
                <Button
                  type="button"
                  className="w-full"
                  variant="secondary"
                  disabled={readOnly || finalizar.isPending || ['CONCLUIDA', 'CONCLUIDO', 'ENTREGUE'].includes(ordem.data.status) || ordem.data?.status !== 'EM_EXECUCAO'}
                  onClick={() => finalizar.mutate()}
                  title={ordem.data?.status !== 'EM_EXECUCAO' ? 'A OS precisa estar em execução para ser finalizada.' : ''}
                >
                  {finalizar.isPending ? 'Finalizando...' : 'Finalizar OS'}
                </Button>
                {['CONCLUIDA', 'CONCLUIDO', 'ENTREGUE', 'PAGO'].includes(ordem.data?.status || '') && (
                  <Button
                    type="button"
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white mt-2"
                    onClick={async () => {
                      try {
                        await osService.gerarPosVenda(id);
                        setSuccessMessage('Ação de pós-venda gerada com sucesso.');
                      } catch (err: any) {
                        setFormError(err.message || 'Erro ao gerar pós-venda');
                      }
                    }}
                  >
                    Gerar Pós-venda
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card id="os-agenda" className="scroll-mt-6 overflow-hidden border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Agenda de Máquina</h3>
                <p className="text-sm text-muted-foreground">Ocupação operacional vinculada a esta OS.</p>
              </div>
              <Link to={`/agenda?ordemServicoId=${ordem.data.id}`}>
                <Button type="button" variant="secondary">
                  <CalendarDays className="h-4 w-4" />
                  Agendar
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {agendaOs.isLoading ? (
                <p className="text-muted-foreground">Carregando agenda...</p>
              ) : agendaVinculada ? (
                <>
                  <Info label="Máquina" value={agendaVinculada.maquina || '-'} />
                  <Info label="Status" value={agendaVinculada.status || '-'} />
                  <Info label="Entrada" value={movementDate(agendaVinculada.horaEntrada)} />
                  <Info label="Previsão de saída" value={movementDate(agendaVinculada.horaPrevistaSaida)} />
                  <Info label="Saída real" value={movementDate(agendaVinculada.horaSaida)} />
                  <Info label="Responsável" value={agendaVinculada.responsavel?.nome || '-'} />
                </>
              ) : (
                <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Nenhuma máquina vinculada a esta OS.
                </p>
              )}
            </CardContent>
          </Card>

          <Card id="os-estoque" className="scroll-mt-6 overflow-hidden">
            <CardHeader>
              <h3 className="font-semibold text-foreground">Movimentações de estoque desta OS</h3>
              <p className="text-sm text-muted-foreground">Baixas e devoluções vinculadas a esta Ordem de Serviço.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {movimentacoesEstoque.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando movimentações...</p>
              ) : (movimentacoesEstoque.data ?? []).length === 0 ? (
                <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Nenhuma movimentação de estoque vinculada a esta OS.
                </p>
              ) : (
                (movimentacoesEstoque.data ?? []).map((movement) => (
                  <div key={movement.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{movementProductName(movement)}</p>
                        <p className="text-xs text-muted-foreground">{movementDate(movement.createdAt || movement.timestamp || movement.criadoEm)}</p>
                      </div>
                      <StatusBadge status={movement.type || movement.tipo} />
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <MovementLine label="Quantidade" value={String(movement.quantity ?? movement.quantidade ?? 0)} />
                      <MovementLine label="Saldo anterior" value={String(movement.previousQuantity ?? '-')} />
                      <MovementLine label="Saldo posterior" value={String(movement.newQuantity ?? '-')} />
                      <MovementLine label="Usuário" value={movementUserName(movement)} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Documentos da OS</h3>
                <p className="text-sm text-muted-foreground">Anexos, comprovantes, fotos e laudos vinculados ao atendimento.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setDocumentsOpen(true)}>
                <FileText className="h-4 w-4" />
                Documentos
              </Button>
            </CardHeader>
            <CardContent>
              <DocumentsCompactList documentos={documentos.data ?? []} loading={documentos.isLoading} />
            </CardContent>
          </Card>

          <Card id="os-ofycia" className="overflow-hidden border-cyan-400/30 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_34%),linear-gradient(135deg,rgba(8,145,178,0.05),rgba(15,23,42,0.02))] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.3),rgba(2,6,23,0.6))] shadow-sm scroll-mt-6">
            <CardHeader className="pb-3 border-b border-cyan-500/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <div>
                  <h3 className="font-semibold text-foreground">OFYCIA</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Análise assistiva da Ordem de Serviço</p>
                </div>
              </div>
              <span className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                IA Integrada
              </span>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4">
              <p className="text-sm text-muted-foreground">
                Acesse diagnósticos, TechHub/OBD-II, criticidade, rastreabilidade e relatório técnico assistido.
              </p>
              <div className="flex flex-wrap gap-2 mb-1">
                <span className="text-[10px] border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Activity className="h-3 w-3" /> TechHub / OBD-II
                </span>
                <span className="text-[10px] border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Relatório Assistido
                </span>
                <span className="text-[10px] border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Rastreabilidade Ativa
                </span>
              </div>
              <Button onClick={() => setOfyciaOpen(true)} className="w-full sm:w-auto mt-2 bg-cyan-700 hover:bg-cyan-800 text-white dark:bg-cyan-800 dark:hover:bg-cyan-700 font-semibold shadow-md border-0" variant="default">
                <Sparkles className="h-4 w-4 mr-2" />
                Abrir OFYCIA
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <AddOsItemsDialog
        open={addItemsOpen}
        onClose={() => setAddItemsOpen(false)}
        onConfirm={appendItems}
        produtos={produtos.data ?? []}
        servicos={servicosCatalogo.data ?? []}
        ordemContext={{
          id,
          clienteId: ordem.data.clienteId || ordem.data.cliente_id,
          veiculoId: ordem.data.veiculoId || ordem.data.veiculo_id,
          clienteNome: ordem.data.cliente?.nome || '-',
          veiculoNome:
            ordem.data.veiculo?.modelo ||
            ordem.data.modeloVeiculo ||
            ordem.data.veiculo?.placa ||
            ordem.data.placaVeiculo ||
            '-',
        }}
      />

      <Dialog
        open={documentsOpen}
        title="Documentos"
        description="Documentos operacionais vinculados a esta Ordem de Serviço."
        onClose={() => setDocumentsOpen(false)}
      >
        <DocumentsPanel
          documentos={documentos.data ?? []}
          orcamentos={orcamentos.data ?? []}
          loading={documentos.isLoading || orcamentos.isLoading}
          canAttach={canAttachDocuments}
          uploadPending={anexarDocumento.isPending}
          onGenerateSummary={handleGenerateOsDocument}
          onUpload={(tipoDocumento, file) => anexarDocumento.mutate({ tipoDocumento, file })}
        />
        <div className="hidden">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Comprovante da Ordem de Serviço</h3>
                <p className="text-sm text-muted-foreground">
                  Documento operacional de registro de atendimento, diagnóstico, serviços, peças/produtos e valores.
                </p>
                <p className="text-xs text-muted-foreground">
                  Este documento registra as informações operacionais da Ordem de Serviço. Não substitui documento fiscal.
                </p>
              </div>
              <Button type="button" onClick={handleGenerateOsDocument}>
                <FileText className="h-4 w-4" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {showBackToTop && (
        <Button
          type="button"
          onClick={() => {
            const topElement = document.getElementById('os-page-top')
            if (topElement) topElement.scrollIntoView({ behavior: 'smooth' })
            else document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="fixed bottom-6 right-6 z-50 h-10 rounded-full px-4 shadow-lg"
        >
          <ArrowUp className="mr-2 h-4 w-4" />
          Topo
        </Button>
      )}

      <Dialog
        open={ofyciaOpen}
        title="OFYCIA - Análise Assistiva"
        description={`Ordem de Serviço nº ${ordem.data?.numeroOS || ordem.data?.numero || ordem.data?.id?.slice(0,8).toUpperCase() || '-'} • Cliente: ${ordem.data?.cliente?.nome || '-'} • Veículo: ${ordem.data?.veiculo?.placa || '-'}`}
        onClose={() => setOfyciaOpen(false)}
        contentClassName="!max-w-7xl max-h-[90vh]"
      >
        <div className="bg-slate-50 dark:bg-slate-950 -mx-[var(--modal-padding)] -mb-[var(--modal-padding)] p-[var(--modal-padding)] rounded-b-xl overflow-hidden">
          <OsOfyciaSection 
            ordem={ordem.data} 
            items={items} 
            onApplyDiagnosticoSugerido={(texto) => {
              setDiagnostico(texto);
              setHasPendingChanges(true);
              setLastSaveStatus('idle');
            }}
          />
        </div>
      </Dialog>
    </section>
  )
}

function formatFileSize(bytes?: number | null) {
  const size = Number(bytes || 0)
  if (!Number.isFinite(size) || size <= 0) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDocumentDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getUploadsBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL?.trim() || ''
  if (!apiUrl || apiUrl.startsWith('/')) return ''
  return apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '')
}

function getDocumentUrl(documento: OrdemServicoDocumento) {
  const url = documento.url || (documento.caminho ? `/uploads/${documento.caminho}` : '')
  if (!url || /^https?:\/\//i.test(url)) return url
  return `${getUploadsBaseUrl()}${url.startsWith('/') ? url : `/${url}`}`
}

function DocumentsCompactList({ documentos, loading }: { documentos: OrdemServicoDocumento[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-muted-foreground">Carregando documentos...</p>
  if (documentos.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        Nenhum documento anexado a esta OS.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {documentos.slice(0, 3).map((documento) => (
        <div key={documento.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 shadow-sm">
          <p className="truncate text-sm font-semibold text-foreground" title={documento.nomeOriginal}>
            {documento.nomeOriginal}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {documentTypeLabels[documento.tipoDocumento] || documento.tipoDocumento} | {formatDocumentDate(documento.criadoEm)}
          </p>
        </div>
      ))}
      {documentos.length > 3 ? (
        <p className="text-xs text-muted-foreground">Mais {documentos.length - 3} documento(s) no modal.</p>
      ) : null}
    </div>
  )
}

import { OrcamentoDocumentoPreview } from './OrcamentoDocumentoPreview'

function DocumentsPanel({
  documentos,
  orcamentos,
  loading,
  canAttach,
  uploadPending,
  onUpload,
  onGenerateSummary,
}: {
  documentos: OrdemServicoDocumento[]
  orcamentos: any[]
  loading: boolean
  canAttach: boolean
  uploadPending: boolean
  onUpload: (tipoDocumento: TipoDocumentoOS, file: File) => void
  onGenerateSummary: () => void
}) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoOS>('DOCUMENTO_EXTERNO')
  const [file, setFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState('')
  const [previewOrcamentoId, setPreviewOrcamentoId] = useState<string | null>(null)

  function submitUpload() {
    if (!file) {
      setLocalError('Selecione um arquivo para anexar.')
      return
    }
    setLocalError('')
    onUpload(tipoDocumento, file)
    setFile(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm dark:from-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Resumo completo da OS</h3>
            <p className="text-sm text-muted-foreground">
              Gere o PDF operacional com cliente, veiculo, diagnostico, servicos, pecas/produtos e valores.
            </p>
            <p className="text-xs text-muted-foreground">
              O arquivo gerado no navegador pode ser salvo e anexado manualmente nesta area documental.
            </p>
          </div>
          <Button type="button" onClick={onGenerateSummary}>
            <FileText className="h-4 w-4" />
            Gerar resumo PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Documentos anexados</h3>
            <p className="text-sm text-muted-foreground">Arquivos armazenados na pasta da OS no servidor e orçamentos formais.</p>
          </div>
          <span className="text-sm text-muted-foreground">{documentos.length + orcamentos.length} documento(s)</span>
        </div>

        {loading ? (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Carregando documentos...
          </p>
        ) : (documentos.length === 0 && orcamentos.length === 0) ? (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Nenhum documento anexado a esta OS.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-right">Tamanho</th>
                  <th className="p-3 text-left">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((orc) => (
                  <tr key={orc.id} className="border-t border-border bg-slate-50 dark:bg-slate-900/50">
                    <td className="p-3">Orçamento</td>
                    <td className="max-w-[280px] p-3">
                      <span className="block truncate font-semibold text-cyan-700 dark:text-cyan-400">
                        Orçamento #{String(orc.numero).padStart(4, '0')}
                      </span>
                      <span className="text-xs text-muted-foreground">Status: {orc.status} - {formatCurrency(orc.total)}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDocumentDate(orc.criadoEm)}</td>
                    <td className="p-3 text-right text-muted-foreground">-</td>
                    <td className="p-3">
                      <Button type="button" variant="secondary" onClick={() => setPreviewOrcamentoId(orc.id)}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Visualizar
                      </Button>
                    </td>
                  </tr>
                ))}
                {documentos.map((documento) => {
                  const url = getDocumentUrl(documento)
                  return (
                    <tr key={documento.id} className="border-t border-border">
                      <td className="p-3">{documentTypeLabels[documento.tipoDocumento] || documento.tipoDocumento}</td>
                      <td className="max-w-[280px] p-3">
                        <span className="block truncate font-semibold text-foreground" title={documento.nomeOriginal}>
                          {documento.nomeOriginal}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDocumentDate(documento.criadoEm)}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {formatFileSize(documento.tamanhoBytes ?? documento.tamanho)}
                      </td>
                      <td className="p-3">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Baixar
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Indisponivel</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Anexar documento</h3>
          <p className="text-sm text-muted-foreground">
            PDF, JPG, PNG, WebP, TXT, DOC/DOCX e XLS/XLSX sao aceitos, com limite de 15 MB.
          </p>
        </div>

        {canAttach ? (
          <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
            <Field label="Tipo">
              <Select value={tipoDocumento} onChange={(event) => setTipoDocumento(event.target.value as TipoDocumentoOS)}>
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Arquivo">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.xls,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            <Button type="button" onClick={submitUpload} disabled={uploadPending}>
              <Upload className="h-4 w-4" />
              {uploadPending ? 'Anexando...' : 'Anexar documento'}
            </Button>
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Esta OS permite apenas visualizacao de documentos nesta etapa.
          </p>
        )}

        {localError ? <p className="mt-3 text-sm text-red-200">{localError}</p> : null}
      </div>

      <Dialog title="Visualizar Orçamento" open={!!previewOrcamentoId} onClose={() => setPreviewOrcamentoId(null)} contentClassName="max-w-4xl p-0 overflow-hidden h-[90vh]">
        {previewOrcamentoId && (
          <OrcamentoDocumentoPreview 
            orcamentoId={previewOrcamentoId} 
            onClose={() => setPreviewOrcamentoId(null)} 
          />
        )}
      </Dialog>
    </div>
  )
}

type AddItemsTab = 'SERVICOS' | 'PRODUTOS' | 'SOLICITACOES'
type ServiceColumn = 'codigo' | 'categoria' | 'nome' | 'descricao' | 'quantidade' | 'valorUnitario' | 'subtotal'
type ProductColumn = 'codigo' | 'categoria' | 'nome' | 'descricao' | 'quantidade' | 'estoque' | 'precoVenda' | 'subtotal' | 'acao'

const serviceColumns: Array<{ key: ServiceColumn; label: string }> = [
  { key: 'codigo', label: 'Código' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'nome', label: 'Nome do serviço' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'quantidade', label: 'Quantidade' },
  { key: 'valorUnitario', label: 'Valor unitário' },
  { key: 'subtotal', label: 'Subtotal' },
]

const productColumns: Array<{ key: ProductColumn; label: string }> = [
  { key: 'codigo', label: 'Código' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'nome', label: 'Nome do produto' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'quantidade', label: 'Quantidade desejada' },
  { key: 'estoque', label: 'Estoque atual' },
  { key: 'precoVenda', label: 'Preço de venda' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'acao', label: 'Ação' },
]

function loadVisibleColumns<T extends string>(storageKey: string, defaults: Array<{ key: T }>) {
  try {
    const stored = readLocalPreference(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as T[]
      return parsed.length ? parsed : defaults.map((column) => column.key)
    }
  } catch {
    return defaults.map((column) => column.key)
  }
  return defaults.map((column) => column.key)
}

function AddOsItemsDialog({
  open,
  onClose,
  onConfirm,
  produtos,
  servicos,
  ordemContext,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (items: EditableItem[]) => void
  produtos: Produto[]
  servicos: Servico[]
  ordemContext: { id: string; clienteId?: string; veiculoId?: string; clienteNome: string; veiculoNome: string }
}) {
  const [tab, setTab] = useState<AddItemsTab>('SERVICOS')
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('')
  const [somenteDisponiveis, setSomenteDisponiveis] = useState(false)
  const [columnPanelOpen, setColumnPanelOpen] = useState(false)
  const [visibleServiceColumns, setVisibleServiceColumns] = useState<ServiceColumn[]>(() =>
    loadVisibleColumns('columns.os.add-services', serviceColumns),
  )
  const [visibleProductColumns, setVisibleProductColumns] = useState<ProductColumn[]>(() =>
    loadVisibleColumns('columns.os.add-products', productColumns),
  )
  const [selectedServices, setSelectedServices] = useState<Record<string, { quantidade: number; valorUnitario: number }>>({})
  const [selectedProducts, setSelectedProducts] = useState<Record<string, { quantidade: number; valorUnitario: number }>>({})
  const [request, setRequest] = useState<CriarSolicitacaoEstoquePayload>({
    ordemServicoId: ordemContext.id,
    clienteId: ordemContext.clienteId,
    veiculoId: ordemContext.veiculoId,
    nomeProdutoSolicitado: '',
    categoria: '',
    tipoItem: 'PECA',
    quantidadeSolicitada: 1,
    unidade: 'UN',
    aplicacao: '',
    justificativaTecnica: '',
    urgencia: 'MEDIA',
    observacoes: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const criarSolicitacao = useMutation({
    mutationFn: estoqueSolicitacoesService.criar,
    onSuccess: () => {
      setMessage('Solicitação enviada ao departamento de estoque.')
      setError('')
      setRequest((current) => ({
        ...current,
        nomeProdutoSolicitado: '',
        justificativaTecnica: '',
        observacoes: '',
      }))
    },
    onError: (err) => {
      setMessage('')
      setError(getApiErrorMessage(err))
    },
  })

  useEffect(() => {
    writeLocalPreference('columns.os.add-services', JSON.stringify(visibleServiceColumns))
  }, [visibleServiceColumns])

  useEffect(() => {
    writeLocalPreference('columns.os.add-products', JSON.stringify(visibleProductColumns))
  }, [visibleProductColumns])

  const termo = search.trim().toLowerCase()
  const servicosFiltrados = servicos.filter((servico) =>
    [servico.codigo, servico.nome, servico.descricao, servico.categoria, servico.observacaoTecnica]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(termo),
  ).filter((servico) => !categoria || servico.categoria === categoria)

  const produtosFiltrados = produtos.filter((produto) =>
    [produto.sku, produto.nome, produto.descricao, produto.categoria, produto.tipo, produto.aplicacao, produto.veiculosCompativeis]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(termo),
  ).filter((produto) => (!categoria || produto.categoria === categoria) && (!somenteDisponiveis || Number(produto.quantidadeAtual ?? 0) > 0))

  const totalServicos = Object.entries(selectedServices).reduce((total, [id, selected]) => {
    const servico = servicos.find((item) => item.id === id)
    return total + selected.quantidade * (selected.valorUnitario ?? Number(servico?.valor || 0))
  }, 0)
  const totalProdutos = Object.entries(selectedProducts).reduce((total, [id, selected]) => {
    const produto = produtos.find((item) => item.id === id)
    return total + selected.quantidade * (selected.valorUnitario ?? Number(produto?.precoVenda || 0))
  }, 0)

  function toggleServico(servico: Servico) {
    setSelectedServices((current) => {
      if (current[servico.id]) {
        const next = { ...current }
        delete next[servico.id]
        return next
      }
      return { ...current, [servico.id]: { quantidade: 1, valorUnitario: Number(servico.valor || 0) } }
    })
  }

  function toggleProduto(produto: Produto) {
    const estoque = Number(produto.quantidadeAtual ?? 0)
    if (produto.controlaEstoque !== false && estoque <= 0) {
      setTab('SOLICITACOES')
      setRequest((current) => ({
        ...current,
        nomeProdutoSolicitado: produto.nome,
        categoria: produto.categoria,
        tipoItem: produto.tipo === 'INSUMO' ? 'INSUMO' : 'PECA',
        unidade: produto.unidade || 'UN',
        aplicacao: produto.aplicacao || produto.veiculosCompativeis || '',
      }))
      return
    }
    setSelectedProducts((current) => {
      if (current[produto.id]) {
        const next = { ...current }
        delete next[produto.id]
        return next
      }
      return { ...current, [produto.id]: { quantidade: 1, valorUnitario: Number(produto.precoVenda || 0) } }
    })
  }

  function confirmar() {
    const items: EditableItem[] = []
    for (const [id, selected] of Object.entries(selectedServices)) {
      const servico = servicos.find((item) => item.id === id)
      if (!servico) continue
      items.push({
        key: safeRandomId('item-os'),
        tipoItem: 'SERVICO',
        servicoId: servico.id,
        produtoId: '',
        servicoNome: servico.nome,
        descricao: servico.descricao || servico.observacaoTecnica || '',
        quantidade: selected.quantidade,
        valorUnitario: selected.valorUnitario,
      })
    }
    for (const [id, selected] of Object.entries(selectedProducts)) {
      const produto = produtos.find((item) => item.id === id)
      if (!produto) continue
      const estoque = Number(produto.quantidadeAtual ?? 0)
      if (produto.controlaEstoque !== false && estoque < selected.quantidade) {
        setError(`Estoque insuficiente para ${produto.nome}. Solicite o item ao estoque.`)
        return
      }
      items.push({
        key: safeRandomId('item-os'),
        tipoItem: produto.tipo === 'INSUMO' ? 'INSUMO' : 'PRODUTO',
        servicoId: '',
        produtoId: produto.id,
        servicoNome: produto.nome,
        descricao: descricaoProduto(produto),
        quantidade: selected.quantidade,
        valorUnitario: selected.valorUnitario,
      })
    }
    if (items.length === 0) {
      setError('Selecione pelo menos um serviço ou produto para adicionar à OS.')
      return
    }
    onConfirm(items)
    setSelectedServices({})
    setSelectedProducts({})
    setSearch('')
    setCategoria('')
    setError('')
    setMessage('')
    onClose()
  }

  function enviarSolicitacao() {
    criarSolicitacao.mutate({ ...request, ordemServicoId: ordemContext.id, clienteId: ordemContext.clienteId, veiculoId: ordemContext.veiculoId })
  }

  function toggleServiceColumn(key: ServiceColumn) {
    setVisibleServiceColumns((current) =>
      current.includes(key) ? current.filter((column) => column !== key) : [...current, key],
    )
  }

  function toggleProductColumn(key: ProductColumn) {
    setVisibleProductColumns((current) =>
      current.includes(key) ? current.filter((column) => column !== key) : [...current, key],
    )
  }

  const showService = (column: ServiceColumn) => visibleServiceColumns.includes(column)
  const showProduct = (column: ProductColumn) => visibleProductColumns.includes(column)

  return (
    <Dialog
      open={open}
      title="Adicionar serviços e peças à OS"
      description={`Cliente: ${ordemContext.clienteNome} | Veículo: ${ordemContext.veiculoNome}`}
      onClose={onClose}
      contentClassName="max-w-6xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={tab === 'SERVICOS' ? 'default' : 'secondary'} onClick={() => setTab('SERVICOS')}>Serviços</Button>
          <Button type="button" variant={tab === 'PRODUTOS' ? 'default' : 'secondary'} onClick={() => setTab('PRODUTOS')}>Peças/produtos</Button>
          <Button type="button" variant={tab === 'SOLICITACOES' ? 'default' : 'secondary'} onClick={() => setTab('SOLICITACOES')}>Solicitações ao estoque</Button>
        </div>

        {tab !== 'SOLICITACOES' ? (
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_120px]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nome, descrição, categoria ou aplicação" />
            <Input value={categoria} onChange={(event) => setCategoria(event.target.value)} placeholder="Filtrar por categoria" />
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm">
              <input type="checkbox" checked={somenteDisponiveis} onChange={(event) => setSomenteDisponiveis(event.target.checked)} />
              Apenas disponíveis
            </label>
            <Button type="button" variant="secondary" onClick={() => setColumnPanelOpen((current) => !current)}>
              Colunas
            </Button>
          </div>
        ) : null}

        {columnPanelOpen && tab !== 'SOLICITACOES' ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">Colunas visíveis</p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {(tab === 'SERVICOS' ? serviceColumns : productColumns).map((column) => (
                <label key={column.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      tab === 'SERVICOS'
                        ? visibleServiceColumns.includes(column.key as ServiceColumn)
                        : visibleProductColumns.includes(column.key as ProductColumn)
                    }
                    onChange={() => {
                      if (tab === 'SERVICOS') toggleServiceColumn(column.key as ServiceColumn)
                      else toggleProductColumn(column.key as ProductColumn)
                    }}
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {message ? <Alert variant="success">{message}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}

        {tab === 'SERVICOS' ? (
          <div className="max-h-[48vh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Selecionar</th>
                  {showService('codigo') ? <th className="p-3 text-left">Código</th> : null}
                  {showService('categoria') ? <th className="p-3 text-left">Categoria</th> : null}
                  {showService('nome') ? <th className="p-3 text-left">Nome do serviço</th> : null}
                  {showService('descricao') ? <th className="p-3 text-left">Descrição</th> : null}
                  {showService('quantidade') ? <th className="p-3 text-right">Quantidade</th> : null}
                  {showService('valorUnitario') ? <th className="p-3 text-right">Valor unitário</th> : null}
                  {showService('subtotal') ? <th className="p-3 text-right">Subtotal</th> : null}
                </tr>
              </thead>
              <tbody>
                {servicosFiltrados.map((servico) => {
                  const selected = selectedServices[servico.id]
                  return (
                    <tr key={servico.id} className="border-t border-border">
                      <td className="p-3"><input type="checkbox" checked={Boolean(selected)} onChange={() => toggleServico(servico)} /></td>
                      {showService('codigo') ? <td className="p-3">{servico.codigo}</td> : null}
                      {showService('categoria') ? <td className="p-3">{servico.categoria}</td> : null}
                      {showService('nome') ? <td className="p-3 font-semibold text-foreground">{servico.nome}</td> : null}
                      {showService('descricao') ? <td className="p-3 text-muted-foreground">{servico.descricao || servico.observacaoTecnica || '-'}</td> : null}
                      {showService('quantidade') ? <td className="p-3 text-right">
                        <Input className="ml-auto w-24" type="number" min={1} value={selected?.quantidade ?? 1} disabled={!selected} onChange={(event) => setSelectedServices((current) => ({ ...current, [servico.id]: { quantidade: Number(event.target.value), valorUnitario: selected?.valorUnitario ?? Number(servico.valor || 0) } }))} />
                      </td> : null}
                      {showService('valorUnitario') ? <td className="p-3 text-right">{formatCurrency(selected?.valorUnitario ?? servico.valor)}</td> : null}
                      {showService('subtotal') ? <td className="p-3 text-right font-semibold text-foreground">{formatCurrency((selected?.quantidade ?? 1) * (selected?.valorUnitario ?? Number(servico.valor || 0)))}</td> : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === 'PRODUTOS' ? (
          <div className="max-h-[48vh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Selecionar</th>
                  {showProduct('codigo') ? <th className="p-3 text-left">Código</th> : null}
                  {showProduct('categoria') ? <th className="p-3 text-left">Categoria</th> : null}
                  {showProduct('nome') ? <th className="p-3 text-left">Nome do produto</th> : null}
                  {showProduct('descricao') ? <th className="p-3 text-left">Descrição</th> : null}
                  {showProduct('quantidade') ? <th className="p-3 text-right">Quantidade desejada</th> : null}
                  {showProduct('estoque') ? <th className="p-3 text-right">Estoque atual</th> : null}
                  {showProduct('precoVenda') ? <th className="p-3 text-right">Preço de venda</th> : null}
                  {showProduct('subtotal') ? <th className="p-3 text-right">Subtotal</th> : null}
                  {showProduct('acao') ? <th className="p-3 text-left">Ação</th> : null}
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((produto) => {
                  const selected = selectedProducts[produto.id]
                  const estoque = Number(produto.quantidadeAtual ?? 0)
                  const semEstoque = produto.controlaEstoque !== false && estoque <= 0
                  const baixo = estoque > 0 && estoque <= Number(produto.estoqueMinimo ?? 0)
                  return (
                    <tr key={produto.id} className={['border-t border-border', semEstoque ? 'bg-red-400/10' : baixo ? 'bg-amber-400/10' : ''].join(' ')}>
                      <td className="p-3"><input type="checkbox" checked={Boolean(selected)} disabled={semEstoque} onChange={() => toggleProduto(produto)} /></td>
                      {showProduct('codigo') ? <td className="p-3">{produto.sku}</td> : null}
                      {showProduct('categoria') ? <td className="p-3">{produto.categoria}</td> : null}
                      {showProduct('nome') ? <td className="p-3 font-semibold text-foreground">{produto.nome}</td> : null}
                      {showProduct('descricao') ? <td className="p-3 text-muted-foreground">{descricaoProduto(produto) || '-'}</td> : null}
                      {showProduct('quantidade') ? <td className="p-3 text-right"><Input className="ml-auto w-24" type="number" min={1} max={produto.controlaEstoque === false ? undefined : estoque} value={selected?.quantidade ?? 1} disabled={!selected} onChange={(event) => setSelectedProducts((current) => ({ ...current, [produto.id]: { quantidade: Math.min(Math.max(Number(event.target.value), 1), produto.controlaEstoque === false ? Number(event.target.value) : estoque), valorUnitario: selected?.valorUnitario ?? Number(produto.precoVenda || 0) } }))} /></td> : null}
                      {showProduct('estoque') ? <td className="p-3 text-right">{estoque.toLocaleString('pt-BR')}</td> : null}
                      {showProduct('precoVenda') ? <td className="p-3 text-right">{formatCurrency(produto.precoVenda)}</td> : null}
                      {showProduct('subtotal') ? <td className="p-3 text-right font-semibold text-foreground">{formatCurrency((selected?.quantidade ?? 1) * (selected?.valorUnitario ?? Number(produto.precoVenda || 0)))}</td> : null}
                      {showProduct('acao') ? <td className="p-3"><Button type="button" variant="secondary" onClick={() => { setTab('SOLICITACOES'); setRequest((current) => ({ ...current, nomeProdutoSolicitado: produto.nome, categoria: produto.categoria, unidade: produto.unidade || 'UN', aplicacao: produto.aplicacao || produto.veiculosCompativeis || '' })) }}>Solicitar</Button></td> : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === 'SOLICITACOES' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Produto solicitado"><Input value={request.nomeProdutoSolicitado} onChange={(event) => setRequest({ ...request, nomeProdutoSolicitado: event.target.value })} /></Field>
            <Field label="Categoria"><Input value={request.categoria || ''} onChange={(event) => setRequest({ ...request, categoria: event.target.value })} /></Field>
            <Field label="Tipo do item"><Select value={request.tipoItem} onChange={(event) => setRequest({ ...request, tipoItem: event.target.value as CriarSolicitacaoEstoquePayload['tipoItem'] })}><option value="PECA">Peça</option><option value="PRODUTO">Produto</option><option value="INSUMO">Insumo</option><option value="FERRAMENTA">Ferramenta</option><option value="OUTRO">Outro</option></Select></Field>
            <Field label="Urgência"><Select value={request.urgencia} onChange={(event) => setRequest({ ...request, urgencia: event.target.value as CriarSolicitacaoEstoquePayload['urgencia'] })}><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="CRITICA">Crítica</option></Select></Field>
            <Field label="Quantidade solicitada"><Input type="number" min={1} value={request.quantidadeSolicitada} onChange={(event) => setRequest({ ...request, quantidadeSolicitada: Number(event.target.value) })} /></Field>
            <Field label="Unidade"><Input value={request.unidade} onChange={(event) => setRequest({ ...request, unidade: event.target.value })} /></Field>
            <Field label="Aplicação/veículo"><Input value={request.aplicacao || ''} onChange={(event) => setRequest({ ...request, aplicacao: event.target.value })} /></Field>
            <Field label="Justificativa técnica" className="md:col-span-2"><Textarea value={request.justificativaTecnica} onChange={(event) => setRequest({ ...request, justificativaTecnica: event.target.value })} /></Field>
            <Field label="Observações adicionais" className="md:col-span-2"><Textarea value={request.observacoes || ''} onChange={(event) => setRequest({ ...request, observacoes: event.target.value })} /></Field>
            <div className="md:col-span-2 flex justify-end"><Button type="button" onClick={enviarSolicitacao} disabled={criarSolicitacao.isPending}>{criarSolicitacao.isPending ? 'Enviando...' : 'Solicitar ao estoque'}</Button></div>
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-4">
          <div className="text-sm text-muted-foreground">
            Serviços: <strong className="text-foreground">{formatCurrency(totalServicos)}</strong> | Produtos: <strong className="text-foreground">{formatCurrency(totalProdutos)}</strong> | Total geral: <strong className="text-foreground">{formatCurrency(totalServicos + totalProdutos)}</strong>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={confirmar}>Adicionar à OS</Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function SummaryInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_18px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/45 dark:hover:border-cyan-400/30">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 truncate font-semibold text-slate-950 dark:text-white" title={value}>{value}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-foreground">{value}</p>
    </div>
  )
}

function MoneyLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
      <span className={strong ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{label}</span>
      <span className={strong ? 'text-lg font-bold text-foreground' : 'font-semibold text-foreground'}>{formatCurrency(value)}</span>
    </div>
  )
}

function MovementLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  )
}

function ServicoRow({
  item,
  readOnly,
  onChange,
  onRemove,
}: {
  item: EditableItem
  readOnly: boolean
  onChange: (key: string, patch: Partial<EditableItem>) => void
  onRemove: (itemKey: string) => void
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-gradient-to-br from-white to-slate-50/70 p-3 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md dark:from-slate-900 dark:to-slate-950 dark:hover:border-cyan-400/30">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1.4fr_100px_140px_140px_42px]">
        <Field label="Nome do serviço">
          <Input
            placeholder="Ex.: Troca de óleo"
            value={item.servicoNome}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { servicoNome: event.target.value })}
          />
        </Field>
        <Field label="Descrição do serviço">
          <Input
            placeholder="Descreva o serviço executado."
            value={item.descricao}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { descricao: event.target.value })}
          />
        </Field>
        <Field label="Quantidade">
          <Input
            type="number"
            min={1}
            value={item.quantidade}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { quantidade: Number(event.target.value) })}
          />
        </Field>
        <Field label="Valor unitário">
          <Input
            inputMode="numeric"
            value={maskMoneyBR(item.valorUnitario)}
            readOnly={readOnly}
            onChange={(event) => {
              const masked = maskMoneyBR(event.target.value)
              onChange(item.key, { valorUnitario: parseMoneyBR(masked) })
            }}
          />
        </Field>
        <Field label="Valor total">
          <div className="flex h-10 items-center justify-end rounded-lg border border-cyan-200/70 bg-cyan-50/70 px-3 font-semibold text-cyan-950 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-50">
            {formatCurrency(itemTotal(item))}
          </div>
        </Field>
        <div className="flex items-end">
          <IconRemoveButton itemKey={item.key} readOnly={readOnly} onRemove={onRemove} />
        </div>
      </div>
    </div>
  )
}

function ProdutoRow({
  item,
  produtos,
  produtosPorId,
  readOnly,
  onChange,
  onRemove,
}: {
  item: EditableItem
  produtos: Produto[]
  produtosPorId: Map<string, Produto>
  readOnly: boolean
  onChange: (key: string, patch: Partial<EditableItem>) => void
  onRemove: (itemKey: string) => void
}) {
  const produto = produtosPorId.get(item.produtoId)

  return (
    <div className="rounded-xl border border-border/70 bg-gradient-to-br from-white to-slate-50/70 p-3 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md dark:from-slate-900 dark:to-slate-950 dark:hover:border-cyan-400/30">
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1.4fr_100px_140px_140px_42px]">
        <Field label="Produto/peça">
          <Select
            value={item.produtoId}
            disabled={readOnly}
            onChange={(event) => {
              const selected = produtosPorId.get(event.target.value)
              onChange(item.key, {
                produtoId: event.target.value,
                servicoNome: selected?.nome || '',
                descricao: descricaoProduto(selected),
                valorUnitario: Number(selected?.precoVenda || 0),
              })
            }}
          >
            {produtos.map((produtoItem) => (
              <option key={produtoItem.id} value={produtoItem.id}>
                {produtoItem.sku} - {produtoItem.nome}
              </option>
            ))}
          </Select>
          {produto ? (
            <p className="text-xs text-muted-foreground">
              Estoque atual: {produto.quantidadeAtual ?? 0} | Preço de venda: {formatCurrency(produto.precoVenda)}
            </p>
          ) : null}
        </Field>
        <Field label="Descrição do produto">
          <Input value={item.descricao || 'Sem descrição cadastrada.'} readOnly />
        </Field>
        <Field label="Quantidade">
          <Input
            type="number"
            min={1}
            value={item.quantidade}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { quantidade: Number(event.target.value) })}
          />
        </Field>
        <Field label="Valor unitário">
          <Input
            inputMode="numeric"
            value={maskMoneyBR(item.valorUnitario)}
            readOnly={readOnly}
            onChange={(event) => {
              const masked = maskMoneyBR(event.target.value)
              onChange(item.key, { valorUnitario: parseMoneyBR(masked) })
            }}
          />
        </Field>
        <Field label="Valor total">
          <div className="flex h-10 items-center justify-end rounded-lg border border-cyan-200/70 bg-cyan-50/70 px-3 font-semibold text-cyan-950 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-50">
            {formatCurrency(itemTotal(item))}
          </div>
        </Field>
        <div className="flex items-end">
          <IconRemoveButton itemKey={item.key} readOnly={readOnly} onRemove={onRemove} />
        </div>
      </div>
    </div>
  )
}

function IconRemoveButton({
  itemKey,
  readOnly,
  onRemove,
}: {
  itemKey: string
  readOnly: boolean
  onRemove: (itemKey: string) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={readOnly}
      onClick={() => onRemove(itemKey)}
      title="Remover item"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

function OsTimeline({ ordemServicoId }: { ordemServicoId: string }) {
  const [observacao, setObservacao] = useState('')
  const queryClient = useQueryClient()
  const eventos = useQuery({
    queryKey: ['ordem-servico', ordemServicoId, 'eventos'],
    queryFn: () => osService.listarEventos(ordemServicoId),
    enabled: Boolean(ordemServicoId),
  })

  const registrar = useMutation({
    mutationFn: () => osService.registrarObservacao(ordemServicoId, {
      tipo: 'OBSERVACAO_MANUAL',
      titulo: 'Observação Manual',
      descricao: observacao,
      severidade: 'INFO',
      origem: 'USUARIO'
    }),
    onSuccess: async () => {
      setObservacao('')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', ordemServicoId, 'eventos'] })
    }
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <h3 className="font-semibold text-foreground">Timeline e Histórico</h3>
        <p className="text-sm text-muted-foreground">Rastreabilidade de eventos e operações desta OS.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            value={observacao} 
            onChange={e => setObservacao(e.target.value)} 
            placeholder="Adicionar observação manual..."
          />
          <Button type="button" onClick={() => registrar.mutate()} disabled={!observacao.trim() || registrar.isPending}>
            {registrar.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </div>

        {eventos.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando histórico...</p>
        ) : (eventos.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <div className="ml-2 mt-4 space-y-3 border-l-2 border-cyan-200/70 pl-4 dark:border-cyan-400/20">
            {(eventos.data ?? []).map(evento => {
              const bg = evento.severidade === 'CRITICO' ? 'bg-red-400/10 border-red-500/20' : 
                         evento.severidade === 'SUCESSO' ? 'bg-emerald-400/10 border-emerald-500/20' : 
                         evento.severidade === 'ATENCAO' ? 'bg-amber-400/10 border-amber-500/20' : 
                         'bg-muted/20 border-border';
              
              return (
                <div key={evento.id} className={`relative rounded-xl border p-3 text-sm shadow-sm ${bg}`}>
                  <div className="absolute -left-[23px] top-4 h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-card" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{evento.titulo}</p>
                        {evento.isDerivado ? (
                          <span className="inline-flex rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                            Automático
                          </span>
                        ) : (!evento.isDerivado && evento.origem === 'USUARIO') ? (
                          <span className="inline-flex rounded-md border border-cyan-700 bg-cyan-900/50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                            Manual
                          </span>
                        ) : null}
                      </div>
                      {evento.descricao && <p className="mt-1 text-muted-foreground">{evento.descricao}</p>}
                      {(evento.antes || evento.depois) && (
                        <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
                          {evento.antes && <div>Antes: {evento.antes}</div>}
                          {evento.depois && <div>Depois: {evento.depois}</div>}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{movementDate(evento.criadoEm)}</p>
                      <p className="text-[10px] uppercase text-muted-foreground mt-1">{evento.origem}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
