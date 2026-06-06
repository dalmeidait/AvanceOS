import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'default' | 'lg' | 'icon' | string
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  const variants = {
    default:
      'border border-blue-500/70 bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_8px_20px_rgba(37,99,235,0.24),inset_0_1px_0_rgba(255,255,255,0.20)] hover:from-blue-500 hover:to-blue-700 hover:shadow-[0_12px_28px_rgba(37,99,235,0.32),inset_0_1px_0_rgba(255,255,255,0.24)] dark:border-cyan-400/30 dark:from-blue-500 dark:to-cyan-600 dark:text-white',
    secondary:
      'border border-slate-300/80 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] hover:border-blue-300 hover:bg-slate-50 hover:text-blue-700 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-slate-700/80 dark:from-slate-800 dark:to-slate-900 dark:text-slate-100 dark:hover:border-cyan-500/40 dark:hover:text-cyan-200',
    outline:
      'border border-slate-300/90 bg-white/80 text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-950/25 dark:hover:text-cyan-200',
    ghost: 'bg-transparent text-muted-foreground hover:bg-blue-50/70 hover:text-blue-700 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-200',
    destructive: 'border border-rose-500/70 bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-[0_8px_20px_rgba(225,29,72,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-rose-500 hover:to-red-700 hover:shadow-[0_12px_28px_rgba(225,29,72,0.34)] dark:text-white',
  }
  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-[var(--button-height)] px-4 text-sm',
    lg: 'h-11 px-5 text-base',
    icon: 'h-9 w-9 px-0',
  }

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100 disabled:animate-pulse',
        variants[variant],
        sizes[size] || sizes.default,
        className,
      )}
      {...props}
    />
  )
}
