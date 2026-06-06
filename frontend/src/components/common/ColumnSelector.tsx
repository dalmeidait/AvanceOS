import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import type { ColumnOption } from './useColumnVisibility'

export function ColumnSelector({
  options,
  visibleKeys,
  onToggle,
}: {
  options: ColumnOption[]
  visibleKeys: string[]
  onToggle: (key: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" />
        Colunas
      </Button>
      <Dialog
        open={open}
        title="Colunas da tabela"
        description="Escolha quais colunas devem aparecer nesta tela."
        onClose={() => setOpen(false)}
      >
        <div className="space-y-3">
          {options.map((option) => (
            <label
              key={option.key}
              className="flex items-center justify-between rounded-lg border border-border bg-[hsl(var(--surface-subtle))] px-3 py-2 text-sm transition hover:border-primary/35 hover:bg-[hsl(var(--surface-hover))]"
            >
              <span className="text-white">{option.label}</span>
              <input
                type="checkbox"
                checked={visibleKeys.includes(option.key)}
                disabled={option.required}
                onChange={() => onToggle(option.key)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>
          ))}
        </div>
      </Dialog>
    </>
  )
}
