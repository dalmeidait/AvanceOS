export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/35 bg-[hsl(var(--surface-raised)/0.82)] p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--surface-hover))] text-cyan-800">FC</div>
      <h3 className="font-semibold text-slate-950 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
