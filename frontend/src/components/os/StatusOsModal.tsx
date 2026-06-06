import { Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency } from '@/lib/formatters'
import type { OrdemServico } from '@/types/ordem-servico'

interface StatusOsModalProps {
  open: boolean
  onClose: () => void
  ordemServico: OrdemServico
}

export function StatusOsModal({ open, onClose, ordemServico }: StatusOsModalProps) {
  if (!ordemServico) return null

  const veiculoNome = ordemServico.veiculo?.modelo || (ordemServico as any).modeloVeiculo || ordemServico.veiculo?.placa || (ordemServico as any).placaVeiculo || '-'
  const placaVeiculo = ordemServico.veiculo?.placa || (ordemServico as any).placaVeiculo || '-'
  const statusFinanceiro = (ordemServico as any).statusFinanceiro || (ordemServico.status === 'PAGO' ? 'PAGO' : ordemServico.status === 'CANCELADA' ? 'CANCELADO' : 'PENDENTE')
  const statusPagamento = statusFinanceiro === 'CANCELADO' ? 'Cancelado' : statusFinanceiro === 'PAGO' ? 'Pago' : statusFinanceiro === 'PARCIAL' ? 'Parcial' : 'Pendente'
  
  const servicos = (ordemServico.itens || []).filter((i: any) => !i.produtoId)
  const pecas = (ordemServico.itens || []).filter((i: any) => i.produtoId)
  const totalServicos = servicos.reduce((acc: number, item: any) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0)
  const totalPecas = pecas.reduce((acc: number, item: any) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0)
  const total = Number((ordemServico as any).totalGeral ?? (totalServicos + totalPecas - Number((ordemServico as any).descontoAplicado || 0)))

  return (
    <Dialog open={open} onClose={onClose} title="Status da Ordem de Serviço" description="Visão geral e executiva da OS atual." contentClassName="max-w-3xl">
      <div className="space-y-6 pb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Número da OS</p>
            <p className="mt-1 font-semibold text-foreground">{ordemServico.numeroOS || (ordemServico as any).numero || ordemServico.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status Atual</p>
            <div className="mt-1"><StatusBadge status={ordemServico.status} /></div>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cliente</p>
            <p className="mt-1 font-semibold text-foreground">{ordemServico.cliente?.nome || '-'}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Veículo & Placa</p>
            <p className="mt-1 font-semibold text-foreground">{veiculoNome} - {placaVeiculo}</p>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-200/50 bg-cyan-50/30 p-5 dark:border-cyan-400/20 dark:bg-cyan-900/10">
          <h4 className="mb-4 font-semibold text-foreground">Resumo Financeiro</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status de Pagamento</p>
              <p className="mt-1 font-semibold text-foreground">{statusPagamento}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-400">Total Geral</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data de Abertura</p>
            <p className="mt-1 font-semibold text-foreground">{ordemServico.criadoEm ? new Date(ordemServico.criadoEm).toLocaleDateString('pt-BR') : '-'}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data de Fechamento</p>
            <p className="mt-1 font-semibold text-foreground">
              {(ordemServico as any).dataFechamento ? new Date((ordemServico as any).dataFechamento).toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
