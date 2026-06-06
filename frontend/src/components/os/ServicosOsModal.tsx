import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
type EditableItem = {
  key: string
  id?: string
  nome?: string
  descricao?: string
  quantidade: number | string
  valorUnitario: number | string
  tipo?: string
  [key: string]: any
}



function parseMoneyStr(value: string) {
  const digits = value.replace(/\D/g, '')
  return Number(digits) / 100
}

function formatMoneyStr(value: number | string) {
  const numericValue = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numericValue) ? numericValue : 0)
}

function PureServicoRow({
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
        <div className="space-y-2">
          <Label>Nome do serviço</Label>
          <Input
            placeholder="Ex.: Troca de óleo"
            value={item.servicoNome}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { servicoNome: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Descrição do serviço</Label>
          <Input
            placeholder="Descreva o serviço executado."
            value={item.descricao ?? ''}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { descricao: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input
            type="number"
            min={1}
            value={item.quantidade ?? ''}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { quantidade: Number(event.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Valor unitário</Label>
          <Input
            inputMode="numeric"
            value={formatMoneyStr(item.valorUnitario)}
            readOnly={readOnly}
            onChange={(event) => onChange(item.key, { valorUnitario: parseMoneyStr(event.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Valor total</Label>
          <Input
            value={formatMoneyStr(Number(item.quantidade) * Number(item.valorUnitario))}
            readOnly
            className="bg-muted font-medium text-foreground"
            tabIndex={-1}
          />
        </div>
        <div className="flex items-end pb-1">
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-9 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            disabled={readOnly}
            onClick={() => onRemove(item.key)}
            title="Remover serviço"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ServicosOsModalProps {
  open: boolean
  onClose: () => void
  servicos: EditableItem[]
  readOnly: boolean
  updateItem: (key: string, patch: Partial<EditableItem>) => void
  handleRemoveItem: (key: string) => void
  setAddItemsOpen: (open: boolean) => void
}

export function ServicosOsModal({
  open,
  onClose,
  servicos,
  readOnly,
  updateItem,
  handleRemoveItem,
  setAddItemsOpen,
}: ServicosOsModalProps) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const totalServicos = servicos.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0)

  return (
    <Dialog open={open} onClose={onClose} title="Serviços da OS" description="Mão de obra e atividades técnicas executadas na OS." contentClassName="max-h-[85vh] max-w-5xl overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
      <div className="pb-6">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-cyan-200/50 bg-cyan-50/30 p-4 dark:border-cyan-400/20 dark:bg-cyan-900/10">
          <div>
            <h4 className="font-semibold text-foreground">Total em Serviços</h4>
            <p className="text-sm text-muted-foreground">{servicos.length} serviço(s) registrado(s)</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tight text-foreground">{formatCurrency(totalServicos)}</span>
            <Button type="button" variant="secondary" onClick={() => setAddItemsOpen(true)} disabled={readOnly}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar serviços e peças
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {servicos.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Nenhum serviço adicionado até o momento.
            </p>
          ) : (
            servicos.map((item) => (
              <PureServicoRow
                key={item.key}
                item={item}
                readOnly={readOnly}
                onChange={updateItem}
                onRemove={handleRemoveItem}
              />
            ))
          )}
        </div>
      </div>
    </Dialog>
  )
}
