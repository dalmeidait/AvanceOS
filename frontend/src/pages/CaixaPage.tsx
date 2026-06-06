import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, FileText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { DataTable } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { formatCurrency, formatDateBR, formatDateTimeBR, formatNumberBR } from '@/lib/formatters'
import { isProductOsItem, osItemDescription, osItemName, osItemTotal } from '@/lib/osDisplay'
import { downloadReceiptPdf } from '@/lib/receiptPdf'
import { normalizeRole } from '@/lib/roles'
import { getApiErrorMessage } from '@/lib/utils'
import { authService } from '@/services/auth.service'
import { caixaService } from '@/services/caixa.service'
import type { MetodoPagamento } from '@/services/caixa.service'
import { produtosService } from '@/services/produtos.service'
import type { ItemOS, OrdemServico } from '@/types/ordem-servico'
import type { Produto } from '@/types/produto'

type CaixaTab = 'os' | 'venda'
type CartItem = {
  produtoId: string
  sku: string
  nome: string
  descricao: string
  quantidade: number
  valorUn: number
}

type VendaFinalizada = {
  id?: string
  metodoPagamento: MetodoPagamento
  itens: CartItem[]
  total: number
  dataPagamento: string
}

type VendaResponse = {
  mensagem?: string
  venda?: {
    id?: string
    dataPagamento?: string
  }
}

function numeroOS(os: OrdemServico) {
  return os.numeroOS || os.numero || os.id.slice(0, 8).toUpperCase()
}

function itemTotal(item: ItemOS) {
  return osItemTotal(item)
}

function itemNome(item: ItemOS) {
  return osItemName(item)
}

function itemDescricao(item: ItemOS) {
  return osItemDescription(item) || '-'
}

function splitItens(os?: OrdemServico | null) {
  const itens = os?.itens ?? []
  return {
    servicos: itens.filter((item) => !isProductOsItem(item)),
    produtos: itens.filter((item) => isProductOsItem(item)),
  }
}

function totalItens(itens: ItemOS[]) {
  return itens.reduce((total, item) => total + itemTotal(item), 0)
}

function documentoVenda(id?: string) {
  const suffix = id ? id.slice(0, 6).toUpperCase() : String(Date.now()).slice(-6)
  return `VENDA-${suffix}`
}

export function CaixaPage() {
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const isAtendente = normalizeRole(usuario?.cargo) === 'ATENDENTE'
  const [tab, setTab] = useState<CaixaTab>('os')
  const [busca, setBusca] = useState('')
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('PIX')
  const [metodoVenda, setMetodoVenda] = useState<MetodoPagamento>('PIX')
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null)
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false)
  const [lastPaidOS, setLastPaidOS] = useState<OrdemServico | null>(null)
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false)
  const [lastSale, setLastSale] = useState<VendaFinalizada | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const produtos = useQuery({ queryKey: ['produtos'], queryFn: produtosService.listar })

  const buscar = useMutation({
    mutationFn: caixaService.buscarOsPendentes,
    onSuccess: (data) => {
      setOrdens(data)
      setSelectedOS(data[0] ?? null)
      setFeedback('')
      setError('')
    },
    onError: (err) => {
      setOrdens([])
      setSelectedOS(null)
      setFeedback('')
      setError(getApiErrorMessage(err))
    },
  })

  const pagar = useMutation({
    mutationFn: (osId: string) => caixaService.pagarOS(osId, metodoPagamento),
    onSuccess: async (data) => {
      setFeedback(data.mensagem || 'Pagamento registrado com sucesso.')
      setError('')
      setLastPaidOS(data.os)
      setSelectedOS(data.os)
      setOrdens((current) => current.filter((os) => os.id !== data.os.id))
      setConfirmPaymentOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['ordens-servico'] })
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico'] })
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes'] })
    },
    onError: (err) => {
      setFeedback('')
      setError(getApiErrorMessage(err))
      setConfirmPaymentOpen(false)
    },
  })

  const vender = useMutation({
    mutationFn: () =>
      caixaService.vender({
        metodoPagamento: metodoVenda,
        itens: cart.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          valorUn: item.valorUn,
        })),
      }),
    onSuccess: async (data: VendaResponse) => {
      const vendaFinalizada: VendaFinalizada = {
        id: data?.venda?.id,
        metodoPagamento: metodoVenda,
        itens: cart,
        total: subtotal,
        dataPagamento: data?.venda?.dataPagamento || new Date().toISOString(),
      }
      setFeedback(data?.mensagem || 'Venda avulsa registrada com sucesso.')
      setError('')
      setLastSale(vendaFinalizada)
      setCart([])
      setConfirmSaleOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['produtos'] })
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes'] })
    },
    onError: (err) => {
      setFeedback('')
      setError(getApiErrorMessage(err))
      setConfirmSaleOpen(false)
    },
  })

  const subtotal = cart.reduce((total, item) => total + item.quantidade * item.valorUn, 0)
  const osItens = splitItens(selectedOS)
  const totalServicos = totalItens(osItens.servicos)
  const totalProdutos = totalItens(osItens.produtos)
  const desconto = Number(selectedOS?.descontoAplicado || 0)
  const totalOS = Number(selectedOS?.valorFinal || 0) || totalServicos + totalProdutos - desconto

  function handleSearch() {
    const termo = busca.trim()
    if (!termo) {
      setError('Digite nome, CPF/CNPJ ou número da Ordem de Serviço para buscar cobranças pendentes.')
      setFeedback('')
      return
    }
    buscar.mutate(termo)
  }

  function addProduto() {
    const produto = (produtos.data ?? []).find((item) => item.id === produtoId)
    if (!produto) {
      setError('Selecione um produto para adicionar ao carrinho.')
      setFeedback('')
      return
    }
    if (quantidade <= 0) {
      setError('Informe uma quantidade maior que zero.')
      setFeedback('')
      return
    }
    setError('')
    setCart((current) => {
      const existing = current.find((item) => item.produtoId === produto.id)
      if (existing) {
        return current.map((item) =>
          item.produtoId === produto.id ? { ...item, quantidade: item.quantidade + quantidade } : item,
        )
      }
      return [
        ...current,
        {
          produtoId: produto.id,
          sku: produto.sku,
          nome: produto.nome,
          descricao: produto.descricao || produto.categoria || '-',
          quantidade,
          valorUn: Number(produto.precoVenda || 0),
        },
      ]
    })
    setProdutoId('')
    setQuantidade(1)
  }

  function solicitarConfirmacaoVenda() {
    if (cart.length === 0) {
      setError('Adicione pelo menos um produto ao carrinho.')
      setFeedback('')
      return
    }
    setConfirmSaleOpen(true)
  }

  function gerarPdfOS(os: OrdemServico) {
    const itens = splitItens(os)
    const servicosTotal = totalItens(itens.servicos)
    const produtosTotal = totalItens(itens.produtos)
    const total = Number(os.valorFinal || 0) || servicosTotal + produtosTotal - Number(os.descontoAplicado || 0)

    downloadReceiptPdf({
      filename: `avanceos-os-${String(numeroOS(os)).padStart(6, '0')}-recibo.pdf`,
      title: 'Comprovante Operacional Simulado',
      subtitle: 'Recebimento de Ordem de Serviço',
      documentId: `OS-${numeroOS(os)}`,
      emission: formatDateTimeBR(new Date()),
      operator: 'Administrador do Sistema',
      consumer: os.cliente?.nome || 'Cliente não identificado',
      paymentMethod: metodoPagamento,
      contextLines: [
        `CPF/CNPJ: ${os.cliente?.cpf_cnpj || '-'}`,
        `Veículo: ${os.veiculo?.modelo || os.modeloVeiculo || '-'} | Placa: ${os.veiculo?.placa || os.placaVeiculo || '-'}`,
      ],
      items: [...itens.servicos, ...itens.produtos].map((item) => ({
        code: item.produto?.sku || item.servicoId || 'SERV',
        description: itemNome(item),
        quantity: formatNumberBR(item.quantidade),
        unitValue: formatCurrency(item.valorUnitario),
        totalValue: formatCurrency(itemTotal(item)),
      })),
      subtotal: formatCurrency(servicosTotal + produtosTotal),
      discount: formatCurrency(os.descontoAplicado),
      total: formatCurrency(total),
    })
  }

  function gerarPdfVenda(venda: VendaFinalizada) {
    downloadReceiptPdf({
      filename: 'avanceos-venda-avulsa-recibo.pdf',
      title: 'Comprovante Operacional Simulado',
      subtitle: 'Venda avulsa de produtos',
      documentId: documentoVenda(venda.id),
      emission: formatDateTimeBR(venda.dataPagamento),
      operator: 'Administrador do Sistema',
      consumer: 'Consumidor não identificado',
      paymentMethod: venda.metodoPagamento,
      items: venda.itens.map((item) => ({
        code: item.sku,
        description: item.nome,
        quantity: formatNumberBR(item.quantidade),
        unitValue: formatCurrency(item.valorUn),
        totalValue: formatCurrency(item.quantidade * item.valorUn),
      })),
      subtotal: formatCurrency(venda.total),
      discount: formatCurrency(0),
      total: formatCurrency(venda.total),
    })
  }

  return (
    <section>
      <PageHeader
        title={isAtendente ? 'Atendimento / PDV' : 'Caixa/PDV'}
        description="Recebimento de Ordens de Serviço e vendas avulsas de produtos."
      />

      <div className="mb-5 flex gap-2">
        <Button type="button" variant={tab === 'os' ? 'default' : 'secondary'} onClick={() => setTab('os')}>
          Receber OS
        </Button>
        <Button type="button" variant={tab === 'venda' ? 'default' : 'secondary'} onClick={() => setTab('venda')}>
          Venda avulsa
        </Button>
      </div>

      {feedback ? <Alert variant="success" className="mb-4">{feedback}</Alert> : null}
      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}

      {tab === 'os' ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <Card>
              <CardContent className="grid items-end gap-4 xl:grid-cols-[1fr_220px_auto_auto]">
                <Field label="Cliente, CPF/CNPJ ou número da OS">
                  <Input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleSearch()
                    }}
                    placeholder="Digite nome, CPF/CNPJ ou número da OS"
                  />
                </Field>
                <Field label="Método de pagamento">
                  <PaymentSelect value={metodoPagamento} onChange={setMetodoPagamento} />
                </Field>
                <Button type="button" onClick={handleSearch} disabled={buscar.isPending}>
                  <Search className="h-4 w-4" />
                  {buscar.isPending ? 'Buscando...' : 'Buscar Ordem de Serviço'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleSearch} disabled={buscar.isPending || !busca.trim()}>
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </Button>
              </CardContent>
            </Card>

            {ordens.length === 0 ? (
              <EmptyState
                title="Nenhuma Ordem de Serviço carregada."
                message="Busque pelo nome, CPF/CNPJ ou número da Ordem de Serviço para listar cobranças pendentes."
              />
            ) : (
              <DataTable
                data={ordens}
                getRowKey={(row) => row.id}
                columns={[
                  { key: 'numero', header: 'OS', render: numeroOS },
                  { key: 'cliente', header: 'Cliente', render: (row) => row.cliente?.nome || '-' },
                  {
                    key: 'veiculo',
                    header: 'Veículo',
                    render: (row) =>
                      row.veiculo?.modelo || row.modeloVeiculo || row.veiculo?.placa || row.placaVeiculo || '-',
                  },
                  { key: 'placa', header: 'Placa', render: (row) => row.veiculo?.placa || row.placaVeiculo || '-' },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                  { key: 'valor', header: 'Valor', render: (row) => formatCurrency(row.valorFinal) },
                  {
                    key: 'acoes',
                    header: 'Cobrança',
                    render: (row) => (
                      <Button type="button" variant="secondary" onClick={() => setSelectedOS(row)}>
                        Selecionar OS
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </div>

          <OsResumoCard
            os={selectedOS}
            metodoPagamento={metodoPagamento}
            onConfirm={() => setConfirmPaymentOpen(true)}
            onPdf={() => selectedOS && gerarPdfOS(selectedOS)}
            paid={Boolean(lastPaidOS && selectedOS?.id === lastPaidOS.id)}
          />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-white">Venda avulsa</h3>
              <p className="text-sm text-muted-foreground">
                Venda direta de produtos sem vínculo com Ordem de Serviço. Selecione os produtos, confirme o pagamento e gere o comprovante operacional.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid items-end gap-4 md:grid-cols-[1fr_120px_auto]">
                <Field label="Produto">
                  <Select value={produtoId} onChange={(event) => setProdutoId(event.target.value)} disabled={produtos.isLoading}>
                    <option value="">Selecione</option>
                    {(produtos.data ?? []).map((produto: Produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.sku} - {produto.nome} ({formatCurrency(produto.precoVenda)})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantidade">
                  <Input type="number" min={1} value={quantidade} onChange={(event) => setQuantidade(Number(event.target.value))} />
                </Field>
                <Button type="button" onClick={addProduto}>
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {cart.length === 0 ? (
                <EmptyState title="Carrinho vazio." message="Adicione produtos para finalizar a venda avulsa." />
              ) : (
                <DataTable
                  data={cart}
                  getRowKey={(row) => row.produtoId}
                  columns={[
                    { key: 'produto', header: 'Produto', render: (row) => `${row.sku} - ${row.nome}` },
                    { key: 'descricao', header: 'Descrição', render: (row) => row.descricao || '-' },
                    { key: 'quantidade', header: 'Qtd.', render: (row) => formatNumberBR(row.quantidade) },
                    { key: 'valor', header: 'Valor unit.', render: (row) => formatCurrency(row.valorUn) },
                    { key: 'subtotal', header: 'Subtotal', render: (row) => formatCurrency(row.quantidade * row.valorUn) },
                    {
                      key: 'acoes',
                      header: 'Ações',
                      render: (row) => (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setCart((current) => current.filter((item) => item.produtoId !== row.produtoId))}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      ),
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-white">Resumo da venda</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Método de pagamento">
                <PaymentSelect value={metodoVenda} onChange={setMetodoVenda} />
              </Field>
              <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                {cart.map((item) => (
                  <div key={item.produtoId} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{formatNumberBR(item.quantidade)} x {item.nome}</span>
                    <span className="text-white">{formatCurrency(item.quantidade * item.valorUn)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">Total geral</span>
                <span className="text-xl font-bold text-white">{formatCurrency(subtotal)}</span>
              </div>
              <Button type="button" className="w-full" onClick={solicitarConfirmacaoVenda} disabled={vender.isPending}>
                <Banknote className="h-4 w-4" />
                {vender.isPending ? 'Finalizando...' : 'Confirmar venda'}
              </Button>
              {lastSale ? (
                <Button type="button" variant="secondary" className="w-full" onClick={() => gerarPdfVenda(lastSale)}>
                  <FileText className="h-4 w-4" />
                  Gerar comprovante em PDF
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={confirmPaymentOpen}
        title="Confirmar recebimento"
        description="Confirme os dados antes de registrar o pagamento desta Ordem de Serviço."
        onClose={() => setConfirmPaymentOpen(false)}
      >
        <div className="space-y-4">
          <ResumoLinha label="Nº da OS" value={selectedOS ? String(numeroOS(selectedOS)) : '-'} />
          <ResumoLinha label="Cliente" value={selectedOS?.cliente?.nome || '-'} />
          <ResumoLinha label="Total geral" value={formatCurrency(totalOS)} />
          <ResumoLinha label="Método de pagamento" value={metodoPagamento} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmPaymentOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={() => selectedOS && pagar.mutate(selectedOS.id)} disabled={pagar.isPending || selectedOS?.status === 'PAGO'}>
              {pagar.isPending ? 'Registrando...' : 'Confirmar pagamento'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={confirmSaleOpen}
        title="Confirmar venda avulsa"
        description="Confira o carrinho e o método de pagamento antes de finalizar a venda."
        onClose={() => setConfirmSaleOpen(false)}
      >
        <div className="space-y-4">
          <ResumoLinha label="Consumidor" value="Consumidor não identificado" />
          <ResumoLinha label="Total geral" value={formatCurrency(subtotal)} />
          <ResumoLinha label="Método de pagamento" value={metodoVenda} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmSaleOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={() => vender.mutate()} disabled={vender.isPending}>
              {vender.isPending ? 'Finalizando...' : 'Confirmar venda'}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}

function OsResumoCard({
  os,
  metodoPagamento,
  onConfirm,
  onPdf,
  paid,
}: {
  os: OrdemServico | null
  metodoPagamento: MetodoPagamento
  onConfirm: () => void
  onPdf: () => void
  paid: boolean
}) {
  if (!os) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-white">Resumo da Ordem de Serviço</h3>
        </CardHeader>
        <CardContent>
          <EmptyState title="Nenhuma Ordem de Serviço selecionada." message="Selecione uma cobrança para visualizar o resumo antes do pagamento." />
        </CardContent>
      </Card>
    )
  }

  const itens = splitItens(os)
  const totalServicos = totalItens(itens.servicos)
  const totalProdutos = totalItens(itens.produtos)
  const total = Number(os.valorFinal || 0) || totalServicos + totalProdutos - Number(os.descontoAplicado || 0)

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-white">Resumo da Ordem de Serviço</h3>
        <p className="text-sm text-muted-foreground">Conferência estilo caixa antes do recebimento.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <ResumoLinha label="Nº da OS" value={String(numeroOS(os))} />
          <ResumoLinha label="Cliente" value={os.cliente?.nome || '-'} />
          <ResumoLinha label="CPF/CNPJ" value={os.cliente?.cpf_cnpj || '-'} />
          <ResumoLinha label="Veículo" value={os.veiculo?.modelo || os.modeloVeiculo || '-'} />
          <ResumoLinha label="Placa" value={os.veiculo?.placa || os.placaVeiculo || '-'} />
          <ResumoLinha label="Data de abertura" value={formatDateBR(os.criadoEm)} />
          <ResumoLinha label="Status da OS" value={os.status} />
          <ResumoLinha label="Status de pagamento" value={os.status === 'PAGO' ? 'Pago' : 'Pendente'} />
        </div>

        <CupomItens title="Serviços" empty="Nenhum serviço registrado." itens={itens.servicos} />
        <CupomItens title="Peças/produtos" empty="Nenhuma peça ou produto registrado." itens={itens.produtos} />

        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <ResumoLinha label="Total de serviços" value={formatCurrency(totalServicos)} />
          <ResumoLinha label="Total de peças/produtos" value={formatCurrency(totalProdutos)} />
          <ResumoLinha label="Desconto" value={formatCurrency(os.descontoAplicado)} />
          <ResumoLinha label="Método de pagamento" value={metodoPagamento} />
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-white">
            <span>Total geral</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <Button type="button" className="w-full" onClick={onConfirm} disabled={os.status === 'PAGO' || paid}>
          <Banknote className="h-4 w-4" />
          {os.status === 'PAGO' || paid ? 'Pagamento já registrado' : 'Registrar pagamento'}
        </Button>
        {paid || os.status === 'PAGO' ? (
          <Button type="button" variant="secondary" className="w-full" onClick={onPdf}>
            <FileText className="h-4 w-4" />
            Gerar comprovante em PDF
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function CupomItens({ title, empty, itens }: { title: string; empty: string; itens: ItemOS[] }) {
  return (
    <div className="rounded-lg border border-border bg-slate-950/40 p-3">
      <h4 className="mb-2 text-sm font-semibold text-white">{title}</h4>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-3">
          {itens.map((item, index) => (
            <div key={item.id || index} className="border-b border-border pb-2 last:border-0 last:pb-0">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium text-white">{itemNome(item)}</span>
                <span className="text-white">{formatCurrency(itemTotal(item))}</span>
              </div>
              <p className="text-xs text-muted-foreground">{itemDescricao(item)}</p>
              <p className="text-xs text-muted-foreground">
                {formatNumberBR(item.quantidade)} x {formatCurrency(item.valorUnitario)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ResumoLinha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  )
}

function PaymentSelect({ value, onChange }: { value: MetodoPagamento; onChange: (value: MetodoPagamento) => void }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as MetodoPagamento)}>
      <option value="PIX">PIX</option>
      <option value="CREDITO">Crédito</option>
      <option value="DEBITO">Débito</option>
      <option value="DINHEIRO">Dinheiro</option>
      <option value="BOLETO">Boleto</option>
      <option value="TRANSFERENCIA">Transferencia</option>
      <option value="OUTRO">Outro</option>
    </Select>
  )
}
