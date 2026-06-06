import type { MouseEvent, ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './button'

type DialogProps = {
  open: boolean
  title: string
  description?: string
  children?: ReactNode
  onClose: () => void
  contentClassName?: string
}

export function Dialog({ open, title, description, children, onClose, contentClassName }: DialogProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open || typeof document === 'undefined') return null

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] animate-fade-in bg-[hsl(var(--overlay)/0.56)] backdrop-blur-[3px] dark:bg-[hsl(var(--overlay)/0.72)]"
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <div
        className={[
          'animate-scale-in fixed left-1/2 top-1/2 z-[101] max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-primary/25 bg-[hsl(var(--surface-raised))] p-[var(--modal-padding)] shadow-[0_30px_90px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.45)] dark:border-cyan-300/20 dark:shadow-[0_34px_100px_rgba(0,0,0,0.62),0_0_0_1px_rgba(103,232,249,0.08)]',
          contentClassName,
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-border/70 pb-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
