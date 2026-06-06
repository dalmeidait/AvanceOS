import type { HTMLAttributes } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant
  showIcon?: boolean
}

const variants: Record<AlertVariant, { className: string; iconClassName: string; icon: typeof Info }> = {
  info: {
    className:
      'border-[rgba(8,145,178,0.32)] bg-[rgba(236,254,255,0.88)] text-cyan-950 dark:border-[rgba(103,232,249,0.24)] dark:bg-[rgba(8,47,73,0.34)] dark:text-cyan-50',
    iconClassName: 'text-cyan-700 dark:text-cyan-200',
    icon: Info,
  },
  success: {
    className:
      'border-[rgba(5,150,105,0.32)] bg-[rgba(236,253,245,0.88)] text-emerald-950 dark:border-[rgba(110,231,183,0.22)] dark:bg-[rgba(6,78,59,0.30)] dark:text-emerald-50',
    iconClassName: 'text-emerald-700 dark:text-emerald-200',
    icon: CheckCircle2,
  },
  warning: {
    className:
      'border-[rgba(217,119,6,0.34)] bg-[rgba(255,251,235,0.88)] text-amber-950 dark:border-[rgba(252,211,77,0.24)] dark:bg-[rgba(120,83,12,0.20)] dark:text-amber-50',
    iconClassName: 'text-amber-700 dark:text-amber-200',
    icon: TriangleAlert,
  },
  error: {
    className:
      'border-[rgba(220,38,38,0.34)] bg-[rgba(254,242,242,0.90)] text-red-900 dark:border-[rgba(252,165,165,0.24)] dark:bg-[rgba(127,29,29,0.28)] dark:text-red-50',
    iconClassName: 'text-red-700 dark:text-red-200',
    icon: AlertCircle,
  },
}

export function Alert({ className, children, variant = 'info', showIcon = true, role, ...props }: AlertProps) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm',
        config.className,
        className,
      )}
      role={role || (variant === 'error' ? 'alert' : 'status')}
      {...props}
    >
      {showIcon ? <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.iconClassName)} /> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
