import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { BrandMark } from '@/components/common/BrandMark'
import { SessionTransition } from '@/components/common/SessionTransition'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/contexts/ThemeContext'
import { getApiErrorMessage } from '@/lib/utils'
import { authService } from '@/services/auth.service'

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail valido.'),
  senha: z.string().min(1, 'Informe a senha.'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [error, setError] = useState('')
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  })

  const [showTransition, setShowTransition] = useState(false)
  const [loginData, setLoginData] = useState<any>(null)

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      authService.persistSession(data)
      setLoginData(data)
      setShowTransition(true)

      setTimeout(() => {
        const mustChangePassword = data.requirePasswordChange ?? data.requirePasswordReset ?? data.usuario.requirePasswordChange
        navigate(mustChangePassword ? '/alterar-senha-obrigatoria' : '/', { replace: true })
      }, 1800)
    },
    onError: (err) => {
      setError(getApiErrorMessage(err))
    },
  })

  function onSubmit(values: LoginForm) {
    setError('')
    loginMutation.mutate({
      ...values,
    })
  }

  return (
    <main className="relative flex min-h-screen w-full overflow-hidden bg-[#f8fafc] dark:bg-[#020617]">
      <div className="absolute right-6 top-6 z-50">
        <Button
          type="button"
          variant="secondary"
          onClick={toggleTheme}
          className="h-10 border-slate-300/80 bg-white/90 px-4 text-xs text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-md transition-colors hover:border-cyan-600/35 hover:bg-white dark:border-slate-700/80 dark:bg-[#0F172A]/[0.85] dark:text-slate-200 dark:hover:border-cyan-400/35 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {isDark ? 'Tema claro' : 'Tema escuro'}
        </Button>
      </div>

      <div className="flex w-full flex-col lg:flex-row">
        <section className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#0F172A_48%,#083344_100%)] p-16 text-center lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(203,213,225,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(203,213,225,0.045)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-55 [mask-image:linear-gradient(to_bottom,#000,transparent_92%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,182,212,0.12),transparent_34%,rgba(37,99,235,0.09))]" />

          <div className="relative z-10 flex animate-in flex-col items-center fade-in zoom-in-95 duration-700">
            <div className="inline-flex items-center gap-5 rounded-2xl border border-cyan-400/20 bg-[#020617]/50 p-4 pr-6 text-left shadow-[0_24px_70px_rgba(2,6,23,0.34)] backdrop-blur-xl">
              <BrandMark size="lg" variant="symbol" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
                  Oficina Avance
                </p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-50">
                  AvanceOS
                </h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                  Operação v1.0
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex w-full items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] p-6 dark:bg-[linear-gradient(180deg,#020617_0%,#0F172A_100%)] lg:w-1/2 lg:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(6,182,212,0.10),transparent_36%,rgba(37,99,235,0.08))] dark:bg-[linear-gradient(135deg,rgba(8,145,178,0.16),transparent_42%,rgba(37,99,235,0.10))]" />

          <div className="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-700">
            <div className="mb-10 text-center lg:hidden">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <BrandMark size="lg" variant="symbol" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">AvanceOS</h1>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                Oficina Avance · Operação v1.0
              </p>
            </div>

            <Card className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white/[0.94] shadow-[0_28px_70px_-28px_rgba(15,23,42,0.38)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-[#0F172A]/[0.94] dark:shadow-[0_32px_80px_-26px_rgba(0,0,0,0.72)]">
              <CardContent className="p-8 sm:p-10">
                <div className="mb-10 text-center">
                  <h2 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Autenticação</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Acesse com suas credenciais corporativas.</p>
                </div>

                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">E-mail Corporativo</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu.nome@oficinaavance.com.br"
                      className="h-14 rounded-xl border-slate-300 bg-slate-50 text-slate-950 transition-all placeholder:text-slate-400 focus-visible:border-cyan-600 focus-visible:ring-cyan-600 dark:border-slate-700 dark:bg-[#020617] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-400"
                      {...form.register('email')}
                    />
                    {form.formState.errors.email ? (
                      <p className="text-xs font-medium text-red-500">{form.formState.errors.email.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="senha" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Senha de Acesso</Label>
                    <Input
                      id="senha"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-14 rounded-xl border-slate-300 bg-slate-50 text-slate-950 transition-all placeholder:text-slate-400 focus-visible:border-cyan-600 focus-visible:ring-cyan-600 dark:border-slate-700 dark:bg-[#020617] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-400"
                      {...form.register('senha')}
                    />
                    {form.formState.errors.senha ? (
                      <p className="text-xs font-medium text-red-500">{form.formState.errors.senha.message}</p>
                    ) : null}
                  </div>

                  {error ? <Alert variant="error">{error}</Alert> : null}

                  <Button
                    type="submit"
                    className="mt-4 h-14 w-full rounded-xl bg-[linear-gradient(135deg,#2563EB,#0891B2)] text-sm font-bold tracking-wide text-[#F8FAFC] shadow-[0_16px_32px_rgba(8,145,178,0.24)] transition-all hover:shadow-[0_18px_40px_rgba(37,99,235,0.28)] active:scale-[0.98] dark:bg-[linear-gradient(135deg,#1D4ED8,#06B6D4)]"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        VALIDANDO ACESSO...
                      </span>
                    ) : 'ENTRAR NO SISTEMA'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-10 flex flex-col items-center justify-center gap-2 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
              <p>&copy; {new Date().getFullYear()} AvanceOS. Todos os direitos reservados.</p>
            </div>
          </div>
        </section>
      </div>

      <SessionTransition
        show={showTransition}
        type="login"
        userName={loginData?.usuario?.nome}
      />
    </main>
  )
}
