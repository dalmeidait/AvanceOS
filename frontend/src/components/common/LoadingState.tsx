export function LoadingState({ label = 'Carregando dados...' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
      <div className="mb-4 h-2 w-32 animate-pulse rounded-full bg-cyan-300/20" />
      {label}
    </div>
  )
}
