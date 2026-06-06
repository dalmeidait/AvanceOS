import { useState } from 'react'

type BrandMarkProps = {
  size?: 'sm' | 'lg'
  variant?: 'mark' | 'horizontal' | 'symbol'
}

export function BrandMark({ size = 'sm', variant = 'mark' }: BrandMarkProps) {
  const large = size === 'lg'
  const [failed, setFailed] = useState(false)

  if (variant === 'symbol' && !failed) {
    return (
      <div
        className={[
          'relative isolate flex shrink-0 items-center justify-center overflow-hidden transition-all duration-300',
          'border border-slate-800 bg-slate-950 shadow-md',
          'dark:border-cyan-400/25 dark:bg-[#020617]/90 dark:shadow-[0_14px_32px_rgba(2,6,23,0.32)]',
          large ? 'h-20 w-20 rounded-2xl' : 'h-10 w-10 rounded-xl',
        ].join(' ')}
        aria-label="AvanceOS"
      >
        <span className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),transparent)] dark:bg-[linear-gradient(145deg,rgba(8,145,178,0.18),rgba(37,99,235,0.08)_48%,rgba(15,23,42,0.22))]" />
        <img
          src="/assets/logos/avanceos-logo-transparent.png"
          alt="AvanceOS"
          className={[
            'absolute top-1/2 max-w-none -translate-y-1/2 object-contain',
            large ? '-left-5 h-[260%]' : '-left-2.5 h-[260%]',
          ].join(' ')}
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  if (!failed) {
    const src = variant === 'horizontal' ? '/assets/logos/avanceos-logo-horizontal.png' : '/assets/logos/avanceos-logo-transparent.png'
    return (
      <div
        className={[
          'flex shrink-0 items-center justify-center',
          variant === 'horizontal'
            ? large
              ? 'w-full max-w-[460px]'
              : 'w-44'
            : large
              ? 'h-80 w-80 max-w-[76vw]'
              : 'h-10 w-10',
        ].join(' ')}
        aria-label="AvanceOS"
      >
        <img
          src={src}
          alt="AvanceOS"
          className={variant === 'horizontal' ? 'h-auto max-h-40 w-full object-contain' : 'h-full w-full object-contain'}
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={[
        'relative isolate flex shrink-0 items-center justify-center overflow-hidden border border-cyan-100 bg-card shadow-sm',
        large ? 'h-80 w-80 max-w-[76vw] rounded-[2rem]' : 'h-10 w-10 rounded-xl',
      ].join(' ')}
      aria-label="AvanceOS"
    >
      <span
        className={[
          'absolute rounded-full bg-cyan-500/12',
          large ? '-right-14 -top-12 h-44 w-44' : '-right-3 -top-3 h-12 w-12',
        ].join(' ')}
      />
      <span
        className={[
          'absolute rounded-full bg-emerald-400/10',
          large ? '-bottom-16 -left-12 h-52 w-52' : '-bottom-4 -left-3 h-12 w-12',
        ].join(' ')}
      />
      <span
        className={[
          'relative font-black tracking-normal text-slate-950 dark:text-slate-100',
          large ? 'text-8xl' : 'text-sm',
        ].join(' ')}
      >
        A
      </span>
      <span
        className={[
          'relative font-black tracking-normal text-cyan-600',
          large ? 'ml-1 text-8xl' : 'text-sm',
        ].join(' ')}
      >
        O
      </span>
    </div>
  )
}
