import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Tabs({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-[var(--section-gap)]', className)} {...props} />
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-1', className)} {...props} />
}

export function TabsTrigger({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn('rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:bg-[hsl(var(--surface-hover))] hover:text-foreground active:bg-[hsl(var(--surface-active))] active:text-primary-foreground', className)}
      {...props}
    />
  )
}
