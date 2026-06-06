import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ open, title, description, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} description={description} onClose={onCancel}>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={onConfirm}>
          Confirmar
        </Button>
      </div>
    </Dialog>
  )
}
