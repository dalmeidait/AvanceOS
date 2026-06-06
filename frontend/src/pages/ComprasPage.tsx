import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Download, FileText, Link2, PackageCheck, Plus, RefreshCw, Search, Trash2, Truck, XCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { api } from '@/lib/api'
import { formatCurrency, formatDateBR } from '@/lib/formatters'
import { comprasService } from '@/services/compras.service'
import { fornecedoresService } from '@/services/fornecedores.service'
import { produtosService } from '@/services/produtos.service'
import type {
  DivergenciaRecebimento,
  PedidoCompra,
  PedidoCompraPayload,
  PedidoCompraStatus,
  RecebimentoCompraPayload,
  TipoDivergenciaRecebimento,
  DocumentoPedidoCompra,
  TipoDocumentoCompra,
} from '@/types/compras'
import type { Produto } from '@/types/produto'

type ItemForm = {
  produtoId: string
  descricaoManual: string
  quantidade: number
  valorUnitario: string
  observacao: string
}

type PedidoForm = {
  fornecedorId: string
  fornecedorAvulsoNome: string
  fornecedorAvulsoDocumento: string
  previsaoEntrega: string
  formaPagamento: string
  vencimento: string
  observacao: string
  itens: ItemForm[]
}

type RecebimentoFormItem = {
  pedidoCompraItemId: string
  quantidadeRecebida: number
  divergente: boolean
  tipoDivergencia: TipoDivergenciaRecebimento
  descricaoDivergencia: string
  acaoCorretiva: string
  observacao: string
}

const emptyPedidoForm: PedidoForm = {
  fornecedorId: '',
  fornecedorAvulsoNome: '',
  fornecedorAvulsoDocumento: '',
  previsaoEntrega: '',
  formaPagamento: '',
  vencimento: '',
  observacao: '',
  itens: [{ produtoId: '', descricaoManual: '', quantidade: 1, valorUnitario: '0', observacao: '' }],
}

const tiposDivergencia: TipoDivergenciaRecebimento[] = [
  'PRODUTO_COM_DEFEITO',
  'PRODUTO_ERRADO',
  'QUANTIDADE_MENOR',
  'QUANTIDADE_MAIOR',
  'VALOR_DIVERGENTE',
  'NOTA_FISCAL_DIVERGENTE',
  'PRODUTO_NAO_SOLICITADO',
  'PRODUTO_AVARIADO',
  'ENTREGA_ATRASADA',
  'SEM_DOCUMENTO_FISCAL',
  'OUTRO',
]

const tipoDivergenciaLabels: Record<TipoDivergenciaRecebimento, string> = {
  PRODUTO_COM_DEFEITO: 'Produto com defeito',
  PRODUTO_ERRADO: 'Produto errado',
  QUANTIDADE_MENOR: 'Quantidade menor',
  QUANTIDADE_MAIOR: 'Quantidade maior',
  VALOR_DIVERGENTE: 'Valor divergente',
  NOTA_FISCAL_DIVERGENTE: 'Nota Fiscal divergente',
  PRODUTO_NAO_SOLICITADO: 'Produto não solicitado',
  PRODUTO_AVARIADO: 'Produto avariado',
  ENTREGA_ATRASADA: 'Entrega atrasada',
  SEM_DOCUMENTO_FISCAL: 'Sem documento fiscal',
  OUTRO: 'Outro',
}

const statusDivergenciaLabels: Record<DivergenciaRecebimento['status'], string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_FORNECEDOR: 'Aguardando fornecedor',
  AGUARDANDO_TROCA: 'Aguardando troca',
  AGUARDANDO_DEVOLUCAO: 'Aguardando devolução',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
  PERDA_ASSUMIDA: 'Perda assumida',
}

const statusLabels: Record<PedidoCompraStatus, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  REALIZADO: 'Realizado',
  AGUARDANDO_ENTREGA: 'Aguardando entrega',
  RECEBIDO: 'Recebido',
  RECEBIDO_COM_DIVERGENCIA: 'Recebido com divergência',
  CANCELADO: 'Cancelado',
}

function moneyToNumber(value: string) {
  const parsed = Number(String(value || '0').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function toPedidoPayload(form: PedidoForm): PedidoCompraPayload {
  return {
    fornecedorId: form.fornecedorId || null,
    fornecedorAvulsoNome: form.fornecedorId ? null : form.fornecedorAvulsoNome || null,
    fornecedorAvulsoDocumento: form.fornecedorAvulsoDocumento || null,
    previsaoEntrega: form.previsaoEntrega || null,
    formaPagamento: form.formaPagamento || null,
    vencimento: form.vencimento || null,
    observacao: form.observacao || null,
    itens: form.itens.map((item) => ({
      produtoId: item.produtoId || null,
      descricaoManual: item.produtoId ? null : item.descricaoManual || null,
      quantidade: Number(item.quantidade || 1),
      valorUnitario: moneyToNumber(item.valorUnitario),
      observacao: item.observacao || null,
    })),
  }
}

function pedidoStatusTone(status: PedidoCompraStatus) {
  if (status === 'RECEBIDO') return 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (status === 'RECEBIDO_COM_DIVERGENCIA') return 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400'
  if (status === 'CANCELADO') return 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800/40 dark:bg-rose-900/30 dark:text-rose-400'
  return 'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-400'
}

export function ComprasPage() {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [pedidoOpen, setPedidoOpen] = useState(false)
  const [recebimentoOpen, setRecebimentoOpen] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<PedidoCompra | null>(null)
  const [pedidoForm, setPedidoForm] = useState<PedidoForm>(emptyPedidoForm)
  const [recebimentoItens, setRecebimentoItens] = useState<RecebimentoFormItem[]>([])
  const [produtoFornecedorProdutoId, setProdutoFornecedorProdutoId] = useState('')
  const [produtoFornecedorFornecedorId, setProdutoFornecedorFornecedorId] = useState('')
  const [produtoFornecedorCusto, setProdutoFornecedorCusto] = useState('')
  const [produtoFornecedorPrazo, setProdutoFornecedorPrazo] = useState('')
  const [produtoFornecedorPreferencial, setProdutoFornecedorPreferencial] = useState(false)

  const [dossieOpen, setDossieOpen] = useState(false)
  const [dossieFile, setDossieFile] = useState<File | null>(null)
  const [dossieTipo, setDossieTipo] = useState<TipoDocumentoCompra | ''>('')
  const [dossieDescricao, setDossieDescricao] = useState('')
  const [dossieObservacao, setDossieObservacao] = useState('')

  const pedidos = useQuery({ queryKey: ['compras', 'pedidos'], queryFn: () => comprasService.listarPedidos() })
  const divergencias = useQuery({ queryKey: ['compras', 'divergencias'], queryFn: () => comprasService.listarDivergencias() })
  const fornecedores = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedoresService.listar })
  const produtos = useQuery({ queryKey: ['produtos'], queryFn: produtosService.listar })
  const produtoFornecedores = useQuery({
    queryKey: ['produtos', produtoFornecedorProdutoId, 'fornecedores'],
    queryFn: () => comprasService.listarProdutoFornecedores(produtoFornecedorProdutoId),
    enabled: Boolean(produtoFornecedorProdutoId),
  })

  const documentos = useQuery({
    queryKey: ['compras', 'pedidos', selectedPedido?.id, 'documentos'],
    queryFn: () => comprasService.listarDocumentos(selectedPedido!.id),
    enabled: Boolean(selectedPedido && dossieOpen),
  })

  const criarPedido = useMutation({
    mutationFn: comprasService.criarPedido,
    onSuccess: async () => {
      setFeedback('Pedido de compra criado.')
      setError('')
      setPedidoOpen(false)
      setPedidoForm(emptyPedidoForm)
      await queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const aprovarPedido = useMutation({
    mutationFn: comprasService.aprovarPedido,
    onSuccess: async () => {
      setFeedback('Conta a pagar/documento gerencial criado ou sinalizado.')
      await queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const cancelarPedido = useMutation({
    mutationFn: (id: string) => comprasService.cancelarPedido(id, 'Cancelamento operacional'),
    onSuccess: async () => {
      setFeedback('Pedido de compra cancelado.')
      await queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const receberPedido = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecebimentoCompraPayload }) => comprasService.receberPedido(id, payload),
    onSuccess: async (data) => {
      setFeedback(data.mensagem || 'Mercadoria recebida e estoque atualizado.')
      setRecebimentoOpen(false)
      setSelectedPedido(null)
      await queryClient.invalidateQueries({ queryKey: ['compras'] })
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      await queryClient.invalidateQueries({ queryKey: ['estoque'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const atualizarDivergencia = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DivergenciaRecebimento['status'] }) => comprasService.atualizarDivergencia(id, { status }),
    onSuccess: async () => {
      setFeedback('Divergência atualizada.')
      await queryClient.invalidateQueries({ queryKey: ['compras', 'divergencias'] })
      await queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const vincularFornecedor = useMutation({
    mutationFn: () => comprasService.vincularProdutoFornecedor(produtoFornecedorProdutoId, {
      fornecedorId: produtoFornecedorFornecedorId,
      custoUltimaCompra: moneyToNumber(produtoFornecedorCusto),
      prazoEntregaDias: produtoFornecedorPrazo ? Number(produtoFornecedorPrazo) : null,
      fornecedorPreferencial: produtoFornecedorPreferencial,
      ativo: true,
    }),
    onSuccess: async () => {
      setFeedback('Fornecedor vinculado ao produto.')
      setProdutoFornecedorFornecedorId('')
      setProdutoFornecedorCusto('')
      setProdutoFornecedorPrazo('')
      setProdutoFornecedorPreferencial(false)
      await queryClient.invalidateQueries({ queryKey: ['produtos', produtoFornecedorProdutoId, 'fornecedores'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const anexarDocumento = useMutation({
    mutationFn: (payload: FormData) => comprasService.anexarDocumento(selectedPedido!.id, payload),
    onSuccess: async () => {
      setFeedback('Documento anexado com sucesso.')
      setDossieFile(null)
      setDossieTipo('')
      setDossieDescricao('')
      setDossieObservacao('')
      await queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos', selectedPedido?.id, 'documentos'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const removerDocumento = useMutation({
    mutationFn: (docId: string) => comprasService.removerDocumento(selectedPedido!.id, docId),
    onSuccess: async () => {
      setFeedback('Documento removido.')
      await queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos', selectedPedido?.id, 'documentos'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const pedidosFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase()
    const data = pedidos.data || []
    if (!term) return data
    return data.filter((pedido) => [
      String(pedido.numero),
      pedido.fornecedorNome,
      pedido.status,
      pedido.ordemServico?.numeroOS ? String(pedido.ordemServico.numeroOS) : '',
    ].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [busca, pedidos.data])

  const stats = useMemo(() => {
    const data = pedidos.data || []
    return {
      aguardando: data.filter((item) => item.status === 'AGUARDANDO_ENTREGA').length,
      divergentes: data.filter((item) => item.status === 'RECEBIDO_COM_DIVERGENCIA').length,
      abertas: (divergencias.data || []).filter((item) => item.status === 'ABERTA').length,
      bloqueados: (produtos.data || []).filter((item) => Number((item as Produto & { estoqueBloqueado?: number }).estoqueBloqueado || 0) > 0).length,
    }
  }, [divergencias.data, pedidos.data, produtos.data])

  const pedidoColumns: Array<DataTableColumn<PedidoCompra>> = [
    { key: 'numero', header: 'Pedido', render: (row) => `#${row.numero}` },
    { key: 'status', header: 'Status', render: (row) => <Badge className={pedidoStatusTone(row.status)}>{statusLabels[row.status]}</Badge> },
    { key: 'fornecedor', header: 'Fornecedor', render: (row) => row.fornecedorNome || '-' },
    { key: 'valor', header: 'Valor', render: (row) => formatCurrency(row.valorTotal) },
    { key: 'previsao', header: 'Previsão', render: (row) => formatDateBR(row.previsaoEntrega) },
    { key: 'os', header: 'OS', render: (row) => row.ordemServico?.numeroOS ? `#${row.ordemServico.numeroOS}` : '-' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => aprovarPedido.mutate(row.id)} disabled={['AGUARDANDO_ENTREGA', 'RECEBIDO', 'RECEBIDO_COM_DIVERGENCIA', 'CANCELADO'].includes(row.status)}>
            Aprovar
          </Button>
          <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => openRecebimento(row)} disabled={['RECEBIDO', 'RECEBIDO_COM_DIVERGENCIA', 'CANCELADO'].includes(row.status)}>
            Receber
          </Button>
          <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => openDossie(row)}>
            <FileText className="mr-2 h-4 w-4" /> Dossiê
          </Button>
          <Button type="button" variant="destructive" className="h-9 px-3" onClick={() => cancelarPedido.mutate(row.id)} disabled={row.status === 'CANCELADO'}>
            Cancelar
          </Button>
        </div>
      ),
    },
  ]

  const divergenciaColumns: Array<DataTableColumn<DivergenciaRecebimento>> = [
    { key: 'pedido', header: 'Pedido', render: (row) => row.pedidoCompra?.numero ? `#${row.pedidoCompra.numero}` : '-' },
    { key: 'tipo', header: 'Tipo', render: (row) => tipoDivergenciaLabels[row.tipoDivergencia] || row.tipoDivergencia },
    { key: 'produto', header: 'Produto', render: (row) => row.produtoNome || row.descricaoProduto || '-' },
    { key: 'fornecedor', header: 'Fornecedor', render: (row) => row.fornecedorNome || '-' },
    { key: 'status', header: 'Status', render: (row) => <Badge className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400">{statusDivergenciaLabels[row.status] || row.status}</Badge> },
    { key: 'qtd', header: 'Qtd.', render: (row) => row.quantidadeAfetada },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => atualizarDivergencia.mutate({ id: row.id, status: 'RESOLVIDA' })} disabled={row.status === 'RESOLVIDA'}>
          Resolver
        </Button>
      ),
    },
  ]

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setPedidoForm((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }

  function addItem() {
    setPedidoForm((current) => ({
      ...current,
      itens: [...current.itens, { produtoId: '', descricaoManual: '', quantidade: 1, valorUnitario: '0', observacao: '' }],
    }))
  }

  function removeItem(index: number) {
    setPedidoForm((current) => ({
      ...current,
      itens: current.itens.length === 1 ? current.itens : current.itens.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function submitPedido() {
    setError('')
    criarPedido.mutate(toPedidoPayload(pedidoForm))
  }

  function openRecebimento(pedido: PedidoCompra) {
    setSelectedPedido(pedido)
    setRecebimentoItens(pedido.itens.map((item) => ({
      pedidoCompraItemId: item.id,
      quantidadeRecebida: item.quantidade,
      divergente: false,
      tipoDivergencia: 'OUTRO',
      descricaoDivergencia: '',
      acaoCorretiva: '',
      observacao: '',
    })))
    setRecebimentoOpen(true)
  }

  function submitRecebimento() {
    if (!selectedPedido) return
    receberPedido.mutate({
      id: selectedPedido.id,
      payload: {
        itens: recebimentoItens,
        observacao: recebimentoItens.some((item) => item.divergente) ? 'Recebimento registrado com divergência.' : 'Recebimento sem divergência.',
      },
    })
  }

  function openDossie(pedido: PedidoCompra) {
    setSelectedPedido(pedido)
    setDossieOpen(true)
  }

  function submitAnexo() {
    if (!selectedPedido || !dossieFile) return
    const formData = new FormData()
    formData.append('arquivo', dossieFile)
    if (dossieTipo) formData.append('tipoDocumento', dossieTipo)
    if (dossieDescricao) formData.append('descricao', dossieDescricao)
    if (dossieObservacao) formData.append('observacao', dossieObservacao)
    anexarDocumento.mutate(formData)
  }

  async function handleBaixarDocumento(doc: DocumentoPedidoCompra) {
    try {
      const response = await api.get(`/compras/pedidos/${selectedPedido!.id}/documentos/${doc.id}/download`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.nomeOriginal)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (err: any) {
      setError('Erro ao baixar documento.')
    }
  }

  if (pedidos.isLoading) return <LoadingState label="Carregando pedidos de compra..." />
  if (pedidos.isError) return <ErrorState message={pedidos.error.message} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        description="Pedidos de compra, recebimento de mercadorias, divergências e vínculo de fornecedores por produto."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => pedidos.refetch()} disabled={pedidos.isFetching}>
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
            <Button type="button" onClick={() => setPedidoOpen(true)}>
              <Plus className="h-4 w-4" /> Novo pedido
            </Button>
          </>
        }
      />

      {feedback ? <Alert variant="success">{feedback}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Aguardando entrega" value={stats.aguardando} icon={<Truck className="h-5 w-5" />} tone="blue" />
        <StatCard title="Recebidos com divergência" value={stats.divergentes} icon={<PackageCheck className="h-5 w-5" />} tone="amber" />
        <StatCard title="Divergências abertas" value={stats.abertas} icon={<XCircle className="h-5 w-5" />} tone="rose" />
        <StatCard title="Produtos bloqueados" value={stats.bloqueados} icon={<CheckCircle2 className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="flex max-w-xl items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por pedido, fornecedor, status ou OS" />
      </div>

      {pedidosFiltrados.length === 0 ? (
        <EmptyState title="Nenhum pedido encontrado" message="Crie um pedido de compra ou ajuste a busca." />
      ) : (
        <DataTable data={pedidosFiltrados} getRowKey={(row) => row.id} columns={pedidoColumns} />
      )}

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Produto &gt; Fornecedores</h3>
          <p className="text-sm text-muted-foreground">Vincule fornecedores, custo e prazo ao produto sem remover o fornecedor textual legado.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Produto">
              <Select value={produtoFornecedorProdutoId} onChange={(event) => setProdutoFornecedorProdutoId(event.target.value)}>
                <option value="">Selecione</option>
                {(produtos.data || []).map((produto) => <option key={produto.id} value={produto.id}>{produto.sku} - {produto.nome}</option>)}
              </Select>
            </Field>
            <Field label="Fornecedor">
              <Select value={produtoFornecedorFornecedorId} onChange={(event) => setProdutoFornecedorFornecedorId(event.target.value)}>
                <option value="">Selecione</option>
                {(fornecedores.data || []).map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nomeFantasia || fornecedor.razaoSocial}</option>)}
              </Select>
            </Field>
            <Field label="Ultimo custo">
              <Input value={produtoFornecedorCusto} onChange={(event) => setProdutoFornecedorCusto(event.target.value)} placeholder="0,00" />
            </Field>
            <Field label="Prazo dias">
              <Input type="number" min={0} value={produtoFornecedorPrazo} onChange={(event) => setProdutoFornecedorPrazo(event.target.value)} />
            </Field>
            <div className="flex items-end gap-3">
              <label className="flex h-10 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={produtoFornecedorPreferencial} onChange={(event) => setProdutoFornecedorPreferencial(event.target.checked)} />
                Preferencial
              </label>
              <Button type="button" onClick={() => vincularFornecedor.mutate()} disabled={!produtoFornecedorProdutoId || !produtoFornecedorFornecedorId || vincularFornecedor.isPending}>
                <Link2 className="h-4 w-4" /> Vincular
              </Button>
            </div>
          </div>
          {produtoFornecedorProdutoId ? (
            <div className="rounded-lg border border-border">
              {(produtoFornecedores.data || []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhum fornecedor vinculado a este produto.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(produtoFornecedores.data || []).map((item) => (
                    <div key={item.id} className="grid gap-2 p-3 text-sm md:grid-cols-5">
                      <span className="font-semibold text-foreground">{item.fornecedorNome}</span>
                      <span>Custo: {formatCurrency(item.custoUltimaCompra || 0)}</span>
                      <span>Prazo: {item.prazoEntregaDias ?? '-'} dia(s)</span>
                      <span>{item.fornecedorPreferencial ? 'Preferencial' : 'Alternativo'}</span>
                      <span>{item.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Divergências de recebimento</h3>
          <p className="text-sm text-muted-foreground">Itens com defeito, produto errado ou qualquer bloqueio de liberação ao estoque.</p>
        </div>
        {divergencias.isLoading ? <LoadingState label="Carregando divergências..." /> : null}
        {!divergencias.isLoading && (divergencias.data || []).length === 0 ? (
          <EmptyState title="Nenhuma divergência aberta" message="Recebimentos com divergência aparecerão aqui." />
        ) : (
          <DataTable data={divergencias.data || []} getRowKey={(row) => row.id} columns={divergenciaColumns} />
        )}
      </section>

      <Dialog open={pedidoOpen} title="Novo pedido de compra" description="Fornecedor cadastrado ou avulso, produtos cadastrados ou itens manuais." onClose={() => setPedidoOpen(false)} contentClassName="max-w-5xl">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Fornecedor cadastrado">
              <Select value={pedidoForm.fornecedorId} onChange={(event) => setPedidoForm({ ...pedidoForm, fornecedorId: event.target.value })}>
                <option value="">Fornecedor avulso</option>
                {(fornecedores.data || []).map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nomeFantasia || fornecedor.razaoSocial}</option>)}
              </Select>
            </Field>
            <Field label="Fornecedor avulso">
              <Input value={pedidoForm.fornecedorAvulsoNome} onChange={(event) => setPedidoForm({ ...pedidoForm, fornecedorAvulsoNome: event.target.value })} disabled={Boolean(pedidoForm.fornecedorId)} />
            </Field>
            <Field label="Documento avulso">
              <Input value={pedidoForm.fornecedorAvulsoDocumento} onChange={(event) => setPedidoForm({ ...pedidoForm, fornecedorAvulsoDocumento: event.target.value })} />
            </Field>
            <Field label="Previsão de entrega">
              <Input type="date" value={pedidoForm.previsaoEntrega} onChange={(event) => setPedidoForm({ ...pedidoForm, previsaoEntrega: event.target.value })} />
            </Field>
            <Field label="Forma pagamento">
              <Input value={pedidoForm.formaPagamento} onChange={(event) => setPedidoForm({ ...pedidoForm, formaPagamento: event.target.value })} placeholder="Pix, boleto, prazo..." />
            </Field>
            <Field label="Vencimento">
              <Input type="date" value={pedidoForm.vencimento} onChange={(event) => setPedidoForm({ ...pedidoForm, vencimento: event.target.value })} />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Itens</h3>
              <Button type="button" variant="secondary" onClick={addItem}><Plus className="h-4 w-4" /> Item</Button>
            </div>
            {pedidoForm.itens.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-6">
                <Field label="Produto">
                  <Select value={item.produtoId} onChange={(event) => updateItem(index, { produtoId: event.target.value })}>
                    <option value="">Item manual</option>
                    {(produtos.data || []).map((produto) => <option key={produto.id} value={produto.id}>{produto.sku} - {produto.nome}</option>)}
                  </Select>
                </Field>
                <Field label="Descrição manual">
                  <Input value={item.descricaoManual} onChange={(event) => updateItem(index, { descricaoManual: event.target.value })} disabled={Boolean(item.produtoId)} />
                </Field>
                <Field label="Quantidade">
                  <Input type="number" min={1} value={item.quantidade} onChange={(event) => updateItem(index, { quantidade: Number(event.target.value) })} />
                </Field>
                <Field label="Valor unitário">
                  <Input value={item.valorUnitario} onChange={(event) => updateItem(index, { valorUnitario: event.target.value })} />
                </Field>
                <Field label="Observacao">
                  <Input value={item.observacao} onChange={(event) => updateItem(index, { observacao: event.target.value })} />
                </Field>
                <div className="flex items-end">
                  <Button type="button" variant="destructive" onClick={() => removeItem(index)}>Remover</Button>
                </div>
              </div>
            ))}
          </div>

          <Field label="Observacao">
            <Textarea value={pedidoForm.observacao} onChange={(event) => setPedidoForm({ ...pedidoForm, observacao: event.target.value })} />
          </Field>
          <div className="flex justify-end">
            <Button type="button" onClick={submitPedido} disabled={criarPedido.isPending}>
              {criarPedido.isPending ? 'Salvando...' : 'Salvar pedido'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={recebimentoOpen} title="Receber pedido" description="Confirme as quantidades e marque divergências antes de liberar estoque." onClose={() => setRecebimentoOpen(false)} contentClassName="max-w-5xl">
        <div className="space-y-4">
          <Alert variant="info">Quando houver divergência, o produto cadastrado fica bloqueado para uso até resolução.</Alert>
          {selectedPedido?.itens.map((item, index) => {
            const recebimento = recebimentoItens[index]
            return (
              <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-foreground">{item.produto?.nome || item.descricaoManual}</p>
                  <p className="text-xs text-muted-foreground">Pedido: {item.quantidade} x {formatCurrency(item.valorUnitario)}</p>
                </div>
                <Field label="Recebido">
                  <Input type="number" min={0} value={recebimento?.quantidadeRecebida || 0} onChange={(event) => setRecebimentoItens((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, quantidadeRecebida: Number(event.target.value) } : value))} />
                </Field>
                <Field label="Divergência">
                  <Select value={recebimento?.divergente ? 'sim' : 'nao'} onChange={(event) => setRecebimentoItens((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, divergente: event.target.value === 'sim' } : value))}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </Select>
                </Field>
                <Field label="Tipo">
                  <Select value={recebimento?.tipoDivergencia || 'OUTRO'} onChange={(event) => setRecebimentoItens((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, tipoDivergencia: event.target.value as TipoDivergenciaRecebimento } : value))} disabled={!recebimento?.divergente}>
                    {tiposDivergencia.map((tipo) => <option key={tipo} value={tipo}>{tipoDivergenciaLabels[tipo]}</option>)}
                  </Select>
                </Field>
                <Field label="Descrição">
                  <Input value={recebimento?.descricaoDivergencia || ''} onChange={(event) => setRecebimentoItens((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, descricaoDivergencia: event.target.value } : value))} disabled={!recebimento?.divergente} />
                </Field>
              </div>
            )
          })}
          <div className="flex justify-end">
            <Button type="button" onClick={submitRecebimento} disabled={receberPedido.isPending}>
              {receberPedido.isPending ? 'Registrando...' : 'Confirmar recebimento'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dossieOpen} title="Dossiê Documental do Pedido" description={`Anexos e comprovantes do pedido #${selectedPedido?.numero}`} onClose={() => setDossieOpen(false)} contentClassName="max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold">Anexar Novo Documento</h3>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
              <Field label="Tipo">
                <Select value={dossieTipo} onChange={(e) => setDossieTipo(e.target.value as any)}>
                  <option value="">Selecione</option>
                  <option value="ORDEM_COMPRA">Pedido de Compra</option>
                  <option value="XML_FISCAL_SIMULADO">XML Fiscal Simulado</option>
                  <option value="PDF_FISCAL_SIMULADO">PDF Fiscal Simulado</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="COMPROVANTE_PAGAMENTO">Comprovante</option>
                  <option value="LANCAMENTO_CONTABIL">Lançamento Contábil</option>
                  <option value="TERMO_DIVERGENCIA">Termo de Divergência</option>
                  <option value="ROMANEIO_RECEBIMENTO">Romaneio</option>
                  <option value="AUTORIZACAO_PAGAMENTO">Autorizacao Pagamento</option>
                  <option value="OUTROS">Outros</option>
                </Select>
              </Field>
              <Field label="Descrição">
                <Input value={dossieDescricao} onChange={(e) => setDossieDescricao(e.target.value)} placeholder="Descrição do arquivo" />
              </Field>
              <Field label="Arquivo">
                <Input type="file" onChange={(e) => setDossieFile(e.target.files?.[0] || null)} accept=".pdf,.xml,.json,.jpg,.jpeg,.png,.xlsx,.docx" />
              </Field>
              <Button type="button" onClick={submitAnexo} disabled={!dossieFile || anexarDocumento.isPending}>
                {anexarDocumento.isPending ? 'Enviando...' : 'Anexar Documento'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Documentos Anexados</h3>
            {documentos.isLoading ? <LoadingState label="Carregando documentos..." /> : null}
            {!documentos.isLoading && (documentos.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border">
                {(documentos.data || []).map((doc: any) => (
                  <div key={doc.id} className="animate-fade-in flex flex-wrap items-center justify-between p-3 gap-4 transition-colors duration-200 hover:bg-[hsl(var(--surface-hover))]">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Badge className="border-border bg-transparent">{doc.tipoDocumento}</Badge>
                        <span className="text-sm font-semibold">{doc.descricao}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-x-2">
                        <span>{formatDateBR(doc.criadoEm)}</span>
                        <span>&bull;</span>
                        <span>{doc.nomeOriginal}</span>
                        <span>&bull;</span>
                        <span>{(doc.tamanhoBytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => handleBaixarDocumento(doc)}>
                        <Download className="mr-2 h-4 w-4" /> Baixar
                      </Button>
                      <Button variant="destructive" className="h-9 px-3 text-xs" onClick={() => removerDocumento.mutate(doc.id)} disabled={removerDocumento.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <Label>{label}</Label>
      {children}
    </label>
  )
}
