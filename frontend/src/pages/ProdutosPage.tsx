import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Edit, PackagePlus, Plus, Power, RefreshCw, Wrench } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '@/components/common/DataTable'
import type { DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { movimentacoesService } from '@/services/movimentacoes.service'
import { produtosService } from '@/services/produtos.service'
import { servicosService } from '@/services/servicos.service'
import type { CriarMovimentacaoPayload, Movimentacao } from '@/types/movimentacao'
import type { CriarProdutoPayload, Produto, StatusEstoque } from '@/types/produto'
import type { CriarServicoPayload, Servico } from '@/types/servico'

type CatalogTab = 'produtos' | 'servicos'

const emptyProduct: CriarProdutoPayload = {
  name: '',
  internalCode: '',
  category: 'GERAL',
  description: '',
  brand: '',
  unit: 'UN',
  quantityInStock: 0,
  minimumStock: 0,
  costPrice: 0,
  salePrice: 0,
  supplier: '',
  isActive: true,
  notes: '',
}

const emptyService: CriarServicoPayload = {
  name: '',
  internalCode: '',
  category: 'GERAL',
  description: '',
  basePrice: 0,
  estimatedMinutes: null,
  isActive: true,
  notes: '',
}

const emptyMovement: CriarMovimentacaoPayload = {
  productId: '',
  type: 'IN',
  quantity: 1,
  reason: '',
  serviceOrderNumber: '',
  notes: '',
}

function productName(product: Produto) {
  return product.name || product.nome
}

function productCode(product: Produto) {
  return product.internalCode || product.sku
}

function productCategory(product: Produto) {
  return product.category || product.categoria
}

function productStock(product: Produto) {
  return Number(product.quantityInStock ?? product.quantidadeAtual ?? 0)
}

function productMinimum(product: Produto) {
  return Number(product.minimumStock ?? product.estoqueMinimo ?? 0)
}

function productStockStatus(product: Produto): StatusEstoque {
  if (product.statusEstoque) return product.statusEstoque
  const stock = productStock(product)
  const minimum = productMinimum(product)
  if (stock <= 0) return 'ZERADO'
  if (minimum > 0 && stock < minimum * 0.5) return 'CRITICO'
  if (minimum > 0 && stock <= minimum) return 'BAIXO'
  return 'NORMAL'
}

function productIsActive(product: Produto) {
  return product.isActive ?? product.status !== 'INATIVO'
}

function serviceName(service: Servico) {
  return service.name || service.nome
}

function serviceCode(service: Servico) {
  return service.internalCode || service.codigo
}

function serviceCategory(service: Servico) {
  return service.category || service.categoria
}

function serviceIsActive(service: Servico) {
  return service.isActive ?? service.status !== 'INATIVO'
}

function movementProductName(movement: Movimentacao) {
  return movement.product ? productName(movement.product) : movement.produto ? productName(movement.produto) : '-'
}

function movementOs(movement: Movimentacao) {
  return movement.ordemServico || movement.os || null
}

function movementCliente(movement: Movimentacao) {
  return movement.cliente?.nome || movementOs(movement)?.cliente?.nome || '-'
}

function movementVeiculo(movement: Movimentacao) {
  const os = movementOs(movement)
  const veiculo = movement.veiculo || os?.veiculo
  return veiculo?.modelo || os?.modeloVeiculo || veiculo?.placa || os?.placaVeiculo || '-'
}

function movementUsuario(movement: Movimentacao) {
  return movement.usuario?.nome || movement.user?.nome || '-'
}

function movementDate(movement: Movimentacao) {
  const value = movement.createdAt || movement.timestamp || movement.criadoEm
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function toProductForm(product: Produto): CriarProdutoPayload {
  return {
    name: productName(product),
    internalCode: productCode(product),
    category: productCategory(product) || 'GERAL',
    description: product.description ?? product.descricao ?? '',
    brand: product.brand || product.marca || '',
    unit: product.unit || product.unidade || 'UN',
    quantityInStock: productStock(product),
    minimumStock: productMinimum(product),
    costPrice: Number(product.costPrice ?? product.precoCusto ?? 0),
    salePrice: Number(product.salePrice ?? product.precoVenda ?? 0),
    supplier: product.supplier ?? product.fornecedor ?? '',
    isActive: productIsActive(product),
    notes: product.notes ?? '',
  }
}

function toServiceForm(service: Servico): CriarServicoPayload {
  return {
    name: serviceName(service),
    internalCode: serviceCode(service),
    category: serviceCategory(service) || 'GERAL',
    description: service.description ?? service.descricao ?? '',
    basePrice: Number(service.basePrice ?? service.valor ?? 0),
    estimatedMinutes: service.estimatedMinutes ?? service.tempoEstimadoMinutos ?? null,
    isActive: serviceIsActive(service),
    notes: service.notes ?? service.observacaoTecnica ?? '',
  }
}

function matchesTerm(values: Array<string | number | null | undefined>, term: string) {
  if (!term) return true
  return values.filter(Boolean).join(' ').toLowerCase().includes(term)
}

export function ProdutosPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<CatalogTab>('produtos')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [feedback, setFeedback] = useState('')
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null)
  const [editingService, setEditingService] = useState<Servico | null>(null)
  const [movementProduct, setMovementProduct] = useState<Produto | null>(null)
  const [productForm, setProductForm] = useState<CriarProdutoPayload>(emptyProduct)
  const [serviceForm, setServiceForm] = useState<CriarServicoPayload>(emptyService)
  const [movementForm, setMovementForm] = useState<CriarMovimentacaoPayload>(emptyMovement)
  const [formError, setFormError] = useState('')

  const products = useQuery({ queryKey: ['produtos'], queryFn: () => produtosService.listar() })
  const services = useQuery({ queryKey: ['servicos', 'catalogo'], queryFn: () => servicosService.listar({ status: 'TODOS' }) })
  const movements = useQuery({ queryKey: ['estoque', 'movimentacoes'], queryFn: () => movimentacoesService.listarHistorico() })

  const createProduct = useMutation({
    mutationFn: produtosService.criar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      setFeedback('Produto salvo com sucesso.')
      closeProductDialog()
    },
    onError: (error) => setFormError(error.message),
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CriarProdutoPayload }) => produtosService.atualizar(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      setFeedback('Produto atualizado com sucesso.')
      closeProductDialog()
    },
    onError: (error) => setFormError(error.message),
  })

  const toggleProduct = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => produtosService.atualizarStatus(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      setFeedback('Status do produto atualizado.')
    },
  })

  const createService = useMutation({
    mutationFn: servicosService.criar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servicos', 'catalogo'] })
      setFeedback('Serviço salvo com sucesso.')
      closeServiceDialog()
    },
    onError: (error) => setFormError(error.message),
  })

  const updateService = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CriarServicoPayload }) => servicosService.atualizar(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servicos', 'catalogo'] })
      setFeedback('Serviço atualizado com sucesso.')
      closeServiceDialog()
    },
    onError: (error) => setFormError(error.message),
  })

  const toggleService = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => servicosService.atualizarStatus(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servicos', 'catalogo'] })
      setFeedback('Status do serviço atualizado.')
    },
  })

  const createMovement = useMutation({
    mutationFn: movimentacoesService.criar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      await queryClient.invalidateQueries({ queryKey: ['estoque', 'movimentacoes'] })
      setFeedback('Movimentação de estoque registrada com sucesso.')
      closeMovementDialog()
    },
    onError: (error) => setFormError(error.message),
  })

  const productsData = products.data ?? []
  const servicesData = services.data ?? []
  const movementsData = movements.data ?? []
  const term = search.trim().toLowerCase()

  const filteredProducts = useMemo(
    () =>
      productsData.filter((product) => {
        const active = productIsActive(product)
        const statusMatches = statusFilter === 'todos' || (statusFilter === 'ativo' ? active : !active)
        return (
          statusMatches &&
          matchesTerm([productName(product), productCode(product), productCategory(product), product.brand || product.marca], term)
        )
      }),
    [productsData, statusFilter, term],
  )

  const filteredServices = useMemo(
    () =>
      servicesData.filter((service) => {
        const active = serviceIsActive(service)
        const statusMatches = statusFilter === 'todos' || (statusFilter === 'ativo' ? active : !active)
        return statusMatches && matchesTerm([serviceName(service), serviceCode(service), serviceCategory(service)], term)
      }),
    [servicesData, statusFilter, term],
  )

  function openProduct(product?: Produto) {
    setEditingProduct(product ?? null)
    setProductForm(product ? toProductForm(product) : emptyProduct)
    setFormError('')
    setProductDialogOpen(true)
  }

  function closeProductDialog() {
    setProductDialogOpen(false)
    setEditingProduct(null)
    setProductForm(emptyProduct)
    setFormError('')
  }

  function openService(service?: Servico) {
    setEditingService(service ?? null)
    setServiceForm(service ? toServiceForm(service) : emptyService)
    setFormError('')
    setServiceDialogOpen(true)
  }

  function closeServiceDialog() {
    setServiceDialogOpen(false)
    setEditingService(null)
    setServiceForm(emptyService)
    setFormError('')
  }

  function openMovement(product: Produto) {
    setMovementProduct(product)
    setMovementForm({ ...emptyMovement, productId: product.id })
    setFormError('')
    setMovementDialogOpen(true)
  }

  function closeMovementDialog() {
    setMovementDialogOpen(false)
    setMovementProduct(null)
    setMovementForm(emptyMovement)
    setFormError('')
  }

  function submitProduct(event: FormEvent) {
    event.preventDefault()
    if (!productForm.name.trim() || !productForm.internalCode.trim() || !productForm.brand.trim()) {
      setFormError('Informe nome, código interno e marca.')
      return
    }
    if (editingProduct) updateProduct.mutate({ id: editingProduct.id, values: productForm })
    else createProduct.mutate(productForm)
  }

  function submitService(event: FormEvent) {
    event.preventDefault()
    if (!serviceForm.name.trim() || !serviceForm.internalCode.trim()) {
      setFormError('Informe nome e código interno.')
      return
    }
    if (editingService) updateService.mutate({ id: editingService.id, values: serviceForm })
    else createService.mutate(serviceForm)
  }

  function submitMovement(event: FormEvent) {
    event.preventDefault()
    if (!movementProduct) return
    const quantity = Number(movementForm.quantity)
    if (Number.isNaN(quantity) || quantity < 0 || (movementForm.type !== 'ADJUSTMENT' && quantity === 0)) {
      setFormError('Informe uma quantidade válida.')
      return
    }
    if (!movementForm.reason.trim()) {
      setFormError('Informe o motivo da movimentação.')
      return
    }
    if (movementForm.type === 'OUT' && quantity > productStock(movementProduct)) {
      setFormError('Saída maior que o saldo atual do produto.')
      return
    }
    createMovement.mutate({
      ...movementForm,
      productId: movementProduct.id,
      quantity,
    })
  }

  const productColumns: Array<DataTableColumn<Produto>> = [
    { key: 'code', header: 'Código', render: productCode },
    { key: 'name', header: 'Produto', render: productName },
    { key: 'category', header: 'Categoria', render: productCategory },
    { key: 'brand', header: 'Marca', render: (row) => row.brand || row.marca || '-' },
    {
      key: 'stock',
      header: 'Estoque',
      render: (row) => (
        <span className={productStock(row) <= productMinimum(row) ? 'font-bold text-amber-700' : undefined}>
          {productStock(row)}
        </span>
      ),
    },
    { key: 'minimum', header: 'Mínimo', render: (row) => productMinimum(row) },
    { key: 'stockStatus', header: 'Alerta', render: (row) => <StatusBadge status={productStockStatus(row)} /> },
    { key: 'cost', header: 'Custo', render: (row) => formatCurrency(Number(row.costPrice ?? row.precoCusto ?? 0)) },
    { key: 'sale', header: 'Venda', render: (row) => formatCurrency(Number(row.salePrice ?? row.precoVenda ?? 0)) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={productIsActive(row) ? 'ATIVO' : 'INATIVO'} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => openMovement(row)}>
            <ArrowRightLeft className="h-4 w-4" />
            Movimentar estoque
          </Button>
          <Button type="button" variant="secondary" onClick={() => openProduct(row)}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button type="button" variant="secondary" onClick={() => toggleProduct.mutate({ id: row.id, isActive: !productIsActive(row) })}>
            <Power className="h-4 w-4" />
            {productIsActive(row) ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      ),
    },
  ]

  const serviceColumns: Array<DataTableColumn<Servico>> = [
    { key: 'code', header: 'Código', render: serviceCode },
    { key: 'name', header: 'Serviço', render: serviceName },
    { key: 'category', header: 'Categoria', render: serviceCategory },
    { key: 'price', header: 'Preço base', render: (row) => formatCurrency(Number(row.basePrice ?? row.valor ?? 0)) },
    { key: 'time', header: 'Tempo', render: (row) => `${row.estimatedMinutes ?? row.tempoEstimadoMinutos ?? 0} min` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={serviceIsActive(row) ? 'ATIVO' : 'INATIVO'} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => openService(row)}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button type="button" variant="secondary" onClick={() => toggleService.mutate({ id: row.id, isActive: !serviceIsActive(row) })}>
            <Power className="h-4 w-4" />
            {serviceIsActive(row) ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      ),
    },
  ]

  const movementColumns: Array<DataTableColumn<Movimentacao>> = [
    { key: 'date', header: 'Data', render: movementDate },
    { key: 'product', header: 'Produto', render: movementProductName },
    { key: 'type', header: 'Tipo', render: (row) => <StatusBadge status={row.type || row.tipo} /> },
    { key: 'quantity', header: 'Quantidade', render: (row) => row.quantity ?? row.quantidade ?? 0 },
    { key: 'previous', header: 'Anterior', render: (row) => row.previousQuantity ?? '-' },
    { key: 'new', header: 'Novo saldo', render: (row) => row.newQuantity ?? '-' },
    {
      key: 'os',
      header: 'OS',
      render: (row) => {
        const os = movementOs(row)
        if (!os?.id) return row.osReferencia || row.serviceOrderNumber || '-'
        return (
          <Link to={`/os/${os.id}`}>
            <Button type="button" variant="secondary">
              {row.osReferencia || `OS #${os.numeroOS || os.numero || os.id.slice(0, 8).toUpperCase()}`}
            </Button>
          </Link>
        )
      },
    },
    { key: 'cliente', header: 'Cliente', render: movementCliente },
    { key: 'veiculo', header: 'Veículo', render: movementVeiculo },
    { key: 'usuario', header: 'Usuário', render: movementUsuario },
    { key: 'reason', header: 'Observação', render: (row) => row.reason || row.justificativa || row.notes || '-' },
  ]

  if (products.isLoading || services.isLoading) return <LoadingState label="Carregando catálogo..." />
  if (products.isError) return <ErrorState message={products.error.message} />
  if (services.isError) return <ErrorState message={services.error.message} />

  const lowStockProducts = productsData.filter((product) => productStockStatus(product) !== 'NORMAL')

  return (
    <section>
      <PageHeader
        title="Produtos e Serviços"
        description="Catálogo operacional da oficina para cadastro de peças, produtos, serviços e movimentação manual de estoque."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                products.refetch()
                movements.refetch()
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" onClick={() => openProduct()}>
              <PackagePlus className="h-4 w-4" />
              Novo Produto
            </Button>
            <Button type="button" onClick={() => openService()}>
              <Plus className="h-4 w-4" />
              Novo Serviço
            </Button>
          </>
        }
      />

      {feedback ? <Alert variant="success" className="mb-4">{feedback}</Alert> : null}
      {lowStockProducts.length > 0 ? (
        <Alert variant="warning" className="mb-4">
          {lowStockProducts.length} produto(s) com estoque abaixo ou igual ao mínimo.
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant={activeTab === 'produtos' ? 'default' : 'secondary'} onClick={() => setActiveTab('produtos')}>
          <PackagePlus className="h-4 w-4" />
          Produtos
        </Button>
        <Button type="button" variant={activeTab === 'servicos' ? 'default' : 'secondary'} onClick={() => setActiveTab('servicos')}>
          <Wrench className="h-4 w-4" />
          Serviços
        </Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, código ou categoria"
        />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </Select>
      </div>

      {activeTab === 'produtos' ? (
        <>
          {filteredProducts.length === 0 ? (
            <EmptyState title="Nenhum produto encontrado" message="Cadastre produtos ou ajuste os filtros." />
          ) : (
            <DataTable data={filteredProducts} getRowKey={(row) => row.id} columns={productColumns} />
          )}

          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Histórico de movimentações</h3>
                <p className="text-sm text-muted-foreground">Entradas, saídas e ajustes manuais registrados no estoque.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => movements.refetch()}>
                <RefreshCw className="h-4 w-4" />
                Atualizar histórico
              </Button>
            </div>
            {movements.isLoading ? (
              <LoadingState label="Carregando movimentações..." />
            ) : movements.isError ? (
              <Alert variant="error">{movements.error.message}</Alert>
            ) : movementsData.length === 0 ? (
              <EmptyState title="Nenhuma movimentação registrada" message="Use a ação Movimentar estoque em um produto." />
            ) : (
              <DataTable data={movementsData} getRowKey={(row) => row.id} columns={movementColumns} />
            )}
          </div>
        </>
      ) : filteredServices.length === 0 ? (
        <EmptyState title="Nenhum serviço encontrado" message="Cadastre serviços ou ajuste os filtros." />
      ) : (
        <DataTable data={filteredServices} getRowKey={(row) => row.id} columns={serviceColumns} />
      )}

      <Dialog
        open={productDialogOpen}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        description="Cadastro operacional de catálogo. Use Movimentar estoque para entradas, saídas e ajustes."
        onClose={closeProductDialog}
        contentClassName="max-w-4xl"
      >
        <form className="space-y-4" onSubmit={submitProduct}>
          <FormGrid>
            <Field label="Nome">
              <Input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} />
            </Field>
            <Field label="Código interno">
              <Input value={productForm.internalCode} onChange={(event) => setProductForm({ ...productForm, internalCode: event.target.value })} />
            </Field>
            <Field label="Categoria">
              <Input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} />
            </Field>
            <Field label="Marca">
              <Input value={productForm.brand} onChange={(event) => setProductForm({ ...productForm, brand: event.target.value })} />
            </Field>
            <Field label="Unidade">
              <Input value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} />
            </Field>
            <Field label="Fornecedor">
              <Input value={productForm.supplier || ''} onChange={(event) => setProductForm({ ...productForm, supplier: event.target.value })} />
            </Field>
            <Field label="Estoque atual">
              <Input type="number" value={productForm.quantityInStock ?? 0} onChange={(event) => setProductForm({ ...productForm, quantityInStock: Number(event.target.value) })} />
            </Field>
            <Field label="Estoque mínimo">
              <Input type="number" value={productForm.minimumStock} onChange={(event) => setProductForm({ ...productForm, minimumStock: Number(event.target.value) })} />
            </Field>
            <Field label="Preço de custo">
              <Input type="number" step="0.01" value={productForm.costPrice} onChange={(event) => setProductForm({ ...productForm, costPrice: Number(event.target.value) })} />
            </Field>
            <Field label="Preço de venda">
              <Input type="number" step="0.01" value={productForm.salePrice} onChange={(event) => setProductForm({ ...productForm, salePrice: Number(event.target.value) })} />
            </Field>
            <Field label="Status">
              <Select value={productForm.isActive ? 'ativo' : 'inativo'} onChange={(event) => setProductForm({ ...productForm, isActive: event.target.value === 'ativo' })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Descrição">
            <Textarea value={productForm.description || ''} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} />
          </Field>
          <Field label="Observações">
            <Textarea value={productForm.notes || ''} onChange={(event) => setProductForm({ ...productForm, notes: event.target.value })} />
          </Field>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeProductDialog}>Cancelar</Button>
            <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>Salvar Produto</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={serviceDialogOpen}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        description="Cadastro operacional de serviços do catálogo da oficina."
        onClose={closeServiceDialog}
        contentClassName="max-w-4xl"
      >
        <form className="space-y-4" onSubmit={submitService}>
          <FormGrid>
            <Field label="Nome">
              <Input value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} />
            </Field>
            <Field label="Código interno">
              <Input value={serviceForm.internalCode} onChange={(event) => setServiceForm({ ...serviceForm, internalCode: event.target.value })} />
            </Field>
            <Field label="Categoria">
              <Input value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })} />
            </Field>
            <Field label="Preço base">
              <Input type="number" step="0.01" value={serviceForm.basePrice} onChange={(event) => setServiceForm({ ...serviceForm, basePrice: Number(event.target.value) })} />
            </Field>
            <Field label="Tempo estimado (min)">
              <Input type="number" value={serviceForm.estimatedMinutes ?? ''} onChange={(event) => setServiceForm({ ...serviceForm, estimatedMinutes: event.target.value ? Number(event.target.value) : null })} />
            </Field>
            <Field label="Status">
              <Select value={serviceForm.isActive ? 'ativo' : 'inativo'} onChange={(event) => setServiceForm({ ...serviceForm, isActive: event.target.value === 'ativo' })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Descrição">
            <Textarea value={serviceForm.description || ''} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} />
          </Field>
          <Field label="Observações">
            <Textarea value={serviceForm.notes || ''} onChange={(event) => setServiceForm({ ...serviceForm, notes: event.target.value })} />
          </Field>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeServiceDialog}>Cancelar</Button>
            <Button type="submit" disabled={createService.isPending || updateService.isPending}>Salvar Serviço</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={movementDialogOpen}
        title="Movimentar estoque"
        description={movementProduct ? `${productCode(movementProduct)} - ${productName(movementProduct)}` : undefined}
        onClose={closeMovementDialog}
        contentClassName="max-w-3xl"
      >
        <form className="space-y-4" onSubmit={submitMovement}>
          <Alert variant="info">
            Estoque atual: <strong>{movementProduct ? productStock(movementProduct) : 0}</strong>
          </Alert>
          <FormGrid>
            <Field label="Tipo">
              <Select
                value={movementForm.type}
                onChange={(event) =>
                  setMovementForm({
                    ...movementForm,
                    type: event.target.value as CriarMovimentacaoPayload['type'],
                    quantity: event.target.value === 'ADJUSTMENT' && movementProduct ? productStock(movementProduct) : Math.max(1, movementForm.quantity),
                  })
                }
              >
                <option value="IN">Entrada</option>
                <option value="OUT">Saída</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </Select>
            </Field>
            <Field label={movementForm.type === 'ADJUSTMENT' ? 'Novo saldo' : 'Quantidade'}>
              <Input
                type="number"
                min={movementForm.type === 'ADJUSTMENT' ? 0 : 1}
                value={movementForm.quantity}
                onChange={(event) => setMovementForm({ ...movementForm, quantity: Number(event.target.value) })}
              />
            </Field>
            <Field label="Motivo">
              <Input value={movementForm.reason} onChange={(event) => setMovementForm({ ...movementForm, reason: event.target.value })} />
            </Field>
            <Field label="Número da OS">
              <Input value={movementForm.serviceOrderNumber || ''} onChange={(event) => setMovementForm({ ...movementForm, serviceOrderNumber: event.target.value })} />
            </Field>
          </FormGrid>
          <Field label="Observações">
            <Textarea value={movementForm.notes || ''} onChange={(event) => setMovementForm({ ...movementForm, notes: event.target.value })} />
          </Field>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeMovementDialog}>Cancelar</Button>
            <Button type="submit" disabled={createMovement.isPending}>Confirmar movimentação</Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
