import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full border border-border/60 bg-gradient-to-br from-white to-slate-50 px-2.5 py-1 text-xs font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-sm dark:from-slate-900 dark:to-slate-950', className)}
      {...props}
    />
  )
}
