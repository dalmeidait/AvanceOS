import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse bg-white text-left text-sm dark:bg-transparent', className)} {...props} />
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('border-b border-slate-200 bg-slate-100/90 px-4 py-[var(--table-cell-y)] text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-border/80 dark:bg-transparent dark:text-slate-400', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-slate-100 px-4 py-[var(--table-cell-y)] align-middle text-slate-700 dark:border-border/55 dark:text-slate-300', className)} {...props} />
}
