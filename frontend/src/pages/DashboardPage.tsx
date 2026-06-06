import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  Boxes,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Gauge,
  Loader2,
  RefreshCw,
  Users,
  Wrench,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { dashboardService } from '@/services/dashboard.service'
import type { DashboardOsResumo, DashboardPeriodoResumo, DashboardProdutoAlerta } from '@/types/dashboard'
import type { Movimentacao } from '@/types/movimentacao'

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function vehicleLabel(item?: DashboardOsResumo | Movimentacao | null) {
  const veiculo = item?.veiculo
  if (!veiculo) return 'Veículo não informado'
  return [veiculo.marca, veiculo.modelo, veiculo.placa].filter(Boolean).join(' - ')
}

function osLabel(os?: DashboardOsResumo | Movimentacao['ordemServico'] | null) {
  if (!os) return 'OS não vinculada'
  return `OS #${os.numeroOS || os.id.slice(0, 8).toUpperCase()}`
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        <span className="h-5 w-1.5 rounded-full bg-primary" />
        {title}
      </h3>
      {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
    </div>
  )
}

function PeriodCard({ title, data }: { title: string; data: DashboardPeriodoResumo }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl border border-[#3B82F6] bg-[#EAF4FF] p-3 dark:border-[#3B82F6] dark:bg-[#0F172A] shadow-sm">
          <p className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">OS criadas</p>
          <p className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{data.osCriadas}</p>
        </div>
        <div className="rounded-xl border border-[#22C55E] bg-[#ECFDF3] p-3 dark:border-[#22C55E] dark:bg-[#052E1B] shadow-sm">
          <p className="text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80]">Recebido</p>
          <p className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{formatCurrency(data.recebido)}</p>
        </div>
        <div className="rounded-xl border border-[#F59E0B] bg-[#FFF7E6] p-3 dark:border-[#F59E0B] dark:bg-[#3A2605] shadow-sm">
          <p className="text-xs font-semibold text-[#D97706] dark:text-[#FBBF24]">Pagamentos</p>
          <p className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{data.pagamentos}</p>
        </div>
        <div className="rounded-xl border border-[#06B6D4] bg-[#E6FAFF] p-3 dark:border-[#06B6D4] dark:bg-[#083344] shadow-sm">
          <p className="text-xs font-semibold text-[#0891B2] dark:text-[#67E8F9]">Concluídas</p>
          <p className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{data.osConcluidas}</p>
        </div>
      </div>
    </div>
  )
}

function OsList({ items, paid = false }: { items: DashboardOsResumo[]; paid?: boolean }) {
  if (!items.length) {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground dark:bg-slate-900/50">Nenhum registro encontrado.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((ordem) => (
        <Link
          key={ordem.id}
          to={`/os/${ordem.id}`}
          className="group block rounded-xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary/50"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 group-hover:text-primary dark:text-slate-100">{osLabel(ordem)}</p>
              <p className="truncate text-sm text-muted-foreground">{ordem.cliente?.nome || 'Cliente não informado'}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{vehicleLabel(ordem)}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <StatusBadge status={ordem.status} />
              <StatusBadge status={ordem.statusFinanceiro} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-900">Total: <strong className="font-bold text-slate-900 dark:text-slate-200">{formatCurrency(ordem.totalGeral)}</strong></span>
            <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 dark:bg-emerald-950/30">Pago: <strong className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(paid ? ordem.ultimoPagamento?.valor : ordem.valorPago)}</strong></span>
            <span className="text-slate-400">{paid ? formatDateTime(ordem.ultimoPagamento?.dataPagamento) : formatDateTime(ordem.criadoEm)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function MovementList({ items }: { items: Movimentacao[] }) {
  if (!items.length) {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground dark:bg-slate-900/50">Nenhuma movimentação recente.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((movement) => {
        const os = movement.ordemServico || movement.os
        return (
          <div key={movement.id} className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{movement.produto?.nome || movement.product?.nome || 'Produto não informado'}</p>
                <p className="text-sm text-muted-foreground">{movement.cliente?.nome || 'Cliente não informado'} <span className="mx-1 opacity-50">|</span> {vehicleLabel(movement)}</p>
              </div>
              <StatusBadge status={movement.tipo || movement.type} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-900">Qtd: <strong className="text-slate-900 dark:text-slate-200">{movement.quantidade ?? movement.quantity ?? 0}</strong></span>
              <span className="flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900">{movement.previousQuantity ?? '-'} {'->'} {movement.newQuantity ?? '-'}</span>
              <span>{formatDateTime(movement.timestamp || movement.createdAt)}</span>
              {os ? (
                <Link className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline dark:text-cyan-400" to={`/os/${os.id}`}>
                  {osLabel(os)}
                </Link>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StockAlerts({ items }: { items: DashboardProdutoAlerta[] }) {
  if (!items.length) {
    return <Alert variant="success" className="shadow-sm">Nenhum produto em alerta de estoque.</Alert>
  }

  return (
    <div className="space-y-3">
      {items.map((produto) => (
        <div key={produto.id} className="rounded-xl border border-rose-200/50 bg-gradient-to-r from-rose-50/50 to-white p-4 shadow-[0_2px_8px_rgba(225,29,72,0.04)] dark:border-rose-900/30 dark:from-rose-950/20 dark:to-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{produto.nome}</p>
              <p className="text-sm text-muted-foreground">{produto.categoria || 'Sem categoria'} <span className="mx-1 opacity-50">|</span> SKU {produto.sku}</p>
            </div>
            <StatusBadge status={produto.statusEstoque} />
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 rounded-md bg-rose-100/50 px-2 py-1 font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
              Atual: <strong>{produto.quantityInStock ?? produto.quantidadeAtual ?? 0}</strong>
            </span>
            <span className="flex items-center gap-1.5 rounded-md bg-amber-100/50 px-2 py-1 font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Mínimo: <strong>{produto.estoqueMinimo ?? produto.minimumStock ?? 0}</strong>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const dashboard = useQuery({
    queryKey: ['dashboard-executivo'],
    queryFn: dashboardService.resumoExecutivo,
  })

  if (dashboard.isLoading) return <LoadingState label="Carregando dashboard executivo..." />
  if (dashboard.isError) return <ErrorState message={dashboard.error.message} />

  const data = dashboard.data
  if (!data) return <ErrorState message="Não foi possível carregar os indicadores do dashboard." />

  return (
    <section>
      <PageHeader
        title="Dashboard Executivo"
        description="Indicadores operacionais, financeiros e de estoque calculados com dados reais do AvanceOS."
        actions={
          <Button type="button" variant="secondary" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching}>
            {dashboard.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-cyan-50/50 px-3 py-1.5 text-xs font-semibold text-cyan-800 shadow-sm backdrop-blur-sm dark:border-cyan-800/40 dark:bg-cyan-950/30 dark:text-cyan-300">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
          </div>
          Operação Online
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Clock3 className="h-3.5 w-3.5" />
          Atualizado em {formatDateTime(data.atualizadoEm)}
        </div>
      </div>

      <SectionTitle title="Visão Geral" description="Tamanho da base operacional e principais alertas." />
      <div className="grid gap-[var(--section-gap)] md:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="blue" title="Clientes" value={data.cadastros.clientes} icon={<Users className="h-5 w-5" />} />
        <StatCard tone="cyan" title="Veículos" value={data.cadastros.veiculos} icon={<Car className="h-5 w-5" />} />
        <StatCard tone="violet" title="Produtos" value={data.cadastros.produtos} icon={<Boxes className="h-5 w-5" />} />
        <StatCard tone="amber" title="Estoque baixo" value={data.estoque.itensComEstoqueBaixo} note={`${data.estoque.itensCriticosOuZerados} crítico(s)/zerado(s)`} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="mt-7">
        <SectionTitle title="Operação" description="Distribuição real das Ordens de Serviço por status." />
        <div className="grid gap-[var(--section-gap)] md:grid-cols-2 xl:grid-cols-4">
          <StatCard tone="blue" title="OS abertas" value={data.operacao.abertas} note={`${data.operacao.totalOs} OS no total`} icon={<ClipboardList className="h-5 w-5" />} />
          <StatCard tone="violet" title="Em diagnóstico" value={data.operacao.emDiagnostico} icon={<Gauge className="h-5 w-5" />} />
          <StatCard tone="cyan" title="Em execução" value={data.operacao.emExecucao} icon={<Wrench className="h-5 w-5" />} />
          <StatCard tone="amber" title="Aguardando aprovação" value={data.operacao.aguardandoAprovacao} icon={<Clock3 className="h-5 w-5" />} />
          <StatCard tone="amber" title="Aguardando peça" value={data.operacao.aguardandoPeca} icon={<Boxes className="h-5 w-5" />} />
          <StatCard tone="green" title="Concluídas" value={data.operacao.concluidas} icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard tone="green" title="Entregues" value={data.operacao.entregues} icon={<Car className="h-5 w-5" />} />
          <StatCard tone="rose" title="Canceladas" value={data.operacao.canceladas} icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
      </div>

      <div className="mt-7">
        <SectionTitle title="Financeiro" description="Recebidos, pendências e OS com pagamentos registrados." />
        <div className="grid gap-[var(--section-gap)] md:grid-cols-2 xl:grid-cols-4">
          <StatCard tone="green" title="Valor recebido" value={formatCurrency(data.financeiro.valorRecebido)} icon={<Banknote className="h-5 w-5" />} />
          <StatCard tone="amber" title="Valores pendentes" value={formatCurrency(data.financeiro.valoresPendentes)} icon={<CreditCard className="h-5 w-5" />} />
          <StatCard tone="green" title="OS pagas" value={data.financeiro.osPagas} icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard tone="cyan" title="Pendente/parcial" value={data.financeiro.osPendentesOuParciais} icon={<CreditCard className="h-5 w-5" />} />
        </div>
      </div>

      <div className="mt-7">
        <SectionTitle title="Indicadores de período" description="Acompanhamento rápido de hoje, últimos 7 dias e mês atual." />
        <div className="grid gap-[var(--section-gap)] lg:grid-cols-3">
          <PeriodCard title="Hoje" data={data.periodos.hoje} />
          <PeriodCard title="Últimos 7 dias" data={data.periodos.ultimos7Dias} />
          <PeriodCard title="Mês atual" data={data.periodos.mesAtual} />
        </div>
      </div>

      <div className="mt-7 grid gap-[var(--section-gap)] xl:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle title="Últimas OS" description="Ordens criadas mais recentemente." />
          </CardHeader>
          <CardContent>
            <OsList items={data.recentes.ultimasOs} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle title="Últimas OS pagas" description="Pagamentos operacionais mais recentes." />
          </CardHeader>
          <CardContent>
            <OsList items={data.recentes.ultimasOsPagas} paid />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle title="Movimentações de estoque" description="Saídas, entradas e devoluções recentes com vínculo de OS quando houver." />
          </CardHeader>
          <CardContent>
            <MovementList items={data.recentes.movimentacoesEstoque} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle title="Alertas" description="Produtos abaixo do mínimo, críticos ou zerados." />
          </CardHeader>
          <CardContent>
            <StockAlerts items={data.estoque.alertas} />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
