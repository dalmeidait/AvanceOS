import { Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/common/StatusBadge'

interface EstoqueOsModalProps {
  open: boolean
  onClose: () => void
  movimentacoes: any[]
}

function movementDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function movementProductName(movement: any) {
  return movement.product?.nome || movement.produto?.nome || '-'
}

function movementUserName(movement: any) {
  return movement.usuario?.nome || movement.user?.nome || '-'
}

export function EstoqueOsModal({ open, onClose, movimentacoes }: EstoqueOsModalProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Movimentações de Estoque" description="Baixas e devoluções de estoque vinculadas a esta OS." contentClassName="max-h-[85vh] max-w-4xl overflow-y-auto">
      <div className="space-y-4 pb-6">
        {movimentacoes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
            Nenhuma movimentação de estoque vinculada a esta OS nesta visualização.
          </p>
        ) : (
          <div className="space-y-3">
            {movimentacoes.map((movement) => (
              <div key={movement.id} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{movementProductName(movement)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Data: {movementDate(movement.createdAt || movement.timestamp || movement.criadoEm)}</p>
                  </div>
                  <div className="shrink-0"><StatusBadge status={movement.type || movement.tipo} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Quantidade</p>
                    <p className="font-medium text-foreground">{String(movement.quantity ?? movement.quantidade ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Saldo Anterior</p>
                    <p className="font-medium text-foreground">{String(movement.previousQuantity ?? '-')}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Saldo Posterior</p>
                    <p className="font-medium text-foreground">{String(movement.newQuantity ?? '-')}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Usuário</p>
                    <p className="truncate font-medium text-foreground" title={movementUserName(movement)}>{movementUserName(movement)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
