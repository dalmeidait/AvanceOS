import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-lg border border-slate-300/90 bg-white/95 px-3 py-2 text-sm text-foreground shadow-[0_2px_8px_rgba(148,163,184,0.16)] outline-none transition placeholder:text-muted-foreground hover:border-blue-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-[hsl(var(--surface-raised))] dark:shadow-sm dark:hover:border-primary/35',
        className,
      )}
      {...props}
    />
  )
}
