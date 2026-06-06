import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-slate-100/75 text-card-foreground shadow-[0_14px_34px_rgba(51,65,85,0.13),0_2px_8px_rgba(148,163,184,0.18),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/70 hover:shadow-[0_20px_48px_rgba(51,65,85,0.16),0_3px_12px_rgba(148,163,184,0.22),inset_0_1px_0_rgba(255,255,255,0.92)] dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 dark:shadow-[0_18px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:border-cyan-400/30 dark:hover:shadow-[0_24px_60px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(103,232,249,0.08)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-border/70 p-[var(--card-padding)]', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[var(--card-padding)]', className)} {...props} />
}
