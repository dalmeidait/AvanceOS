import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { CheckCircle2, Loader2, WifiOff } from 'lucide-react'

export function SyncStatus() {
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const busy = fetching + mutating > 0
  const online = navigator.onLine

  if (busy) {
    return (
      <div className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/35 bg-[hsl(var(--surface-hover))] px-2.5 text-xs font-medium text-cyan-800">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Atualizando...
      </div>
    )
  }

  if (!online) {
    return (
      <div className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700">
        <WifiOff className="h-3.5 w-3.5" />
        Erro de conexão
      </div>
    )
  }

  return (
    <div className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-[hsl(var(--surface-raised))] px-2.5 text-xs font-medium text-muted-foreground shadow-sm">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      Sincronizado
    </div>
  )
}
