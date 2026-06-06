import type { ReactNode } from 'react'

type StatCardProps = {
  title: string
  value: ReactNode
  note?: string
  icon?: ReactNode
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'cyan' | 'slate' | 'teal'
}

const tones = {
  blue: 'border-blue-200/80 bg-gradient-to-br from-white via-blue-50 to-blue-100/70 text-blue-700 dark:border-blue-500/30 dark:from-slate-900 dark:via-blue-950/50 dark:to-slate-900 dark:text-blue-300',
  cyan: 'border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50 to-sky-100/70 text-cyan-700 dark:border-cyan-400/30 dark:from-slate-900 dark:via-cyan-950/50 dark:to-slate-900 dark:text-cyan-300',
  green: 'border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50 to-green-100/70 text-emerald-700 dark:border-emerald-400/30 dark:from-slate-900 dark:via-emerald-950/45 dark:to-slate-900 dark:text-emerald-300',
  amber: 'border-amber-200/80 bg-gradient-to-br from-white via-amber-50 to-yellow-100/70 text-amber-700 dark:border-amber-400/30 dark:from-slate-900 dark:via-amber-950/35 dark:to-slate-900 dark:text-amber-300',
  rose: 'border-rose-200/80 bg-gradient-to-br from-white via-rose-50 to-red-100/70 text-rose-700 dark:border-rose-400/30 dark:from-slate-900 dark:via-rose-950/45 dark:to-slate-900 dark:text-rose-300',
  violet: 'border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50 to-violet-100/70 text-indigo-700 dark:border-indigo-400/30 dark:from-slate-900 dark:via-indigo-950/45 dark:to-slate-900 dark:text-indigo-300',
  slate: 'border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-700 dark:border-slate-600/60 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-slate-300',
  teal: 'border-teal-200/80 bg-gradient-to-br from-white via-teal-50 to-emerald-100/70 text-teal-700 dark:border-teal-400/30 dark:from-slate-900 dark:via-teal-950/45 dark:to-slate-900 dark:text-teal-300',
}

function renderValue(value: ReactNode) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const match = trimmed.match(/^(-)?\s*R\$\s*(.*)$/)
    if (match) {
      const isNegative = !!match[1]
      const numericPart = match[2]
      return (
        <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-1 font-black leading-none text-slate-950 dark:text-white">
          {isNegative && <span className="text-xl font-black leading-none text-rose-600 dark:text-rose-400 select-none">-</span>}
          <span className="text-sm font-extrabold leading-none text-slate-500 dark:text-slate-400 select-none">R$</span>
          <span className="max-w-full break-words text-2xl font-black leading-none tabular-nums sm:text-3xl">{numericPart}</span>
        </span>
      )
    }
    return (
      <span className="block max-w-full break-words text-2xl font-black leading-tight text-slate-950 tabular-nums dark:text-white sm:text-3xl">
        {trimmed}
      </span>
    )
  }

  if (typeof value === 'number') {
    return (
      <span className="block max-w-full break-words text-2xl font-black leading-tight text-slate-950 tabular-nums dark:text-white sm:text-3xl">
        {value}
      </span>
    )
  }

  return value
}

export function StatCard({ title, value, note, icon, tone = 'cyan' }: StatCardProps) {
  return (
    <div className={`animate-page-in relative flex min-h-[132px] flex-col justify-center overflow-hidden rounded-lg border shadow-[0_14px_38px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.78)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.84)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.05)] ${tones[tone]}`}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-current opacity-[0.08] blur-2xl dark:opacity-[0.16]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/12" />
      <div className="relative z-10 overflow-hidden p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200" title={title}>{title}</p>
          {icon ? (
            <div className="shrink-0 rounded-lg border border-white/70 bg-white/75 p-2.5 text-current shadow-[0_8px_18px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
              {icon}
            </div>
          ) : null}
        </div>
        <div className="mt-3 min-w-0">
          {renderValue(value)}
        </div>
        {note ? (
          <p className="mt-2 max-w-full break-words text-xs font-semibold text-slate-600 dark:text-slate-400" title={note}>
            {note}
          </p>
        ) : null}
      </div>
    </div>
  )
}
