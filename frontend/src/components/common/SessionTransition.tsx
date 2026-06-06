import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrandMark } from './BrandMark'

interface SessionTransitionProps {
  show: boolean
  type: 'login' | 'logout'
  userName?: string
}

const LOGIN_STAGES = [
  'Autenticando usuário...',
  'Validando permissões...',
  'Carregando módulos operacionais...',
  'Ambiente pronto.',
]

const LOGOUT_STAGES = [
  'Finalizando sessão...',
  'Protegendo acesso...',
  'Redirecionando para o login...',
]

export function SessionTransition({ show, type, userName }: SessionTransitionProps) {
  const [progress, setProgress] = useState(0)
  const [stageIndex, setStageIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!show) {
      setProgress(0)
      setStageIndex(0)
      return
    }

    const stages = type === 'login' ? LOGIN_STAGES : LOGOUT_STAGES
    const stageTimer = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, stages.length - 1))
    }, 400)

    const progressTimer = setTimeout(() => setProgress(100), 50)

    return () => {
      clearInterval(stageTimer)
      clearTimeout(progressTimer)
    }
  }, [show, type])

  if (!show || !mounted) return null

  const isLogin = type === 'login'
  const stages = isLogin ? LOGIN_STAGES : LOGOUT_STAGES
  const currentStage = stages[stageIndex]

  const content = (
    <div className="fixed inset-0 z-[99999] m-0 flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#020617] p-0 motion-safe:animate-in motion-safe:fade-in motion-reduce:transition-none duration-300">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#0F172A_50%,#083344_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(203,213,225,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(203,213,225,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-45 [mask-image:linear-gradient(to_bottom,#000,transparent_95%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,182,212,0.10),transparent_38%,rgba(37,99,235,0.10))]" />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center justify-center px-4 motion-safe:animate-in motion-safe:zoom-in-95 motion-reduce:transition-none duration-500">
        <div className="flex w-full flex-col items-center rounded-2xl border border-cyan-800/45 bg-[#0F172A]/[0.92] p-10 text-center shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-12">
          <div className="mb-8">
            {isLogin ? (
              <BrandMark size="lg" variant="symbol" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-400/25 bg-[#020617]/90 text-cyan-300 shadow-[0_14px_32px_rgba(2,6,23,0.32)]">
                <ShieldCheck className="h-10 w-10" />
              </div>
            )}
          </div>

          {isLogin ? (
            <>
              <h2 className="mb-3 text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">
                Bem-vindo ao AvanceOS
              </h2>
              <p className="mb-10 text-lg text-slate-300">
                {userName ? `Preparando seu ambiente operacional, ${userName.split(' ')[0]}.` : 'Preparando seu ambiente operacional.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="mb-3 text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">
                Até logo
              </h2>
              <p className="mb-10 text-lg text-slate-300">
                Sessão encerrada com segurança.
              </p>
            </>
          )}

          <div className="w-full">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3 text-left text-sm font-medium text-[#CFFAFE] transition-all duration-300">
                {isLogin && stageIndex < stages.length - 1 ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-300" /> : null}
                {isLogin && stageIndex === stages.length - 1 ? <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-300" /> : null}
                {!isLogin ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-300" /> : null}
                <span className="animate-in truncate fade-in slide-in-from-bottom-2 duration-300" key={currentStage}>
                  {currentStage}
                </span>
              </div>
              <span className="shrink-0 font-mono text-sm text-cyan-300/90">{Math.round(((stageIndex + 1) / stages.length) * 100)}%</span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full border border-slate-700/80 bg-[#020617] shadow-inner">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#0891B2,#22D3EE)] shadow-[0_0_12px_rgba(8,145,178,0.35)] transition-all ease-out"
                style={{ width: `${progress}%`, transitionDuration: isLogin ? '1800ms' : '1400ms' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
