import { useMutation } from '@tanstack/react-query'
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/common/BrandMark'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { authService } from '@/services/auth.service'

function validatePassword(password: string) {
  if (!password) return 'Informe a nova senha.'
  if (password.length < 8) return 'A nova senha deve ter pelo menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'A nova senha deve conter pelo menos uma letra maiúscula.'
  if (!/[a-z]/.test(password)) return 'A nova senha deve conter pelo menos uma letra minúscula.'
  if (!/\d/.test(password)) return 'A nova senha deve conter pelo menos um número.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'A nova senha deve conter pelo menos um caractere especial.'
  return ''
}

export function AlterarSenhaObrigatoriaPage() {
  const navigate = useNavigate()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [error, setError] = useState('')

  const changePassword = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: (data) => {
      authService.persistSession(data)
      navigate('/', { replace: true })
    },
    onError: (err) => setError(getChangePasswordError(err)),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!senhaAtual) {
      setError('Informe sua senha atual provisória.')
      return
    }

    const passwordError = validatePassword(novaSenha)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (novaSenha !== confirmarNovaSenha) {
      setError('A confirmação da nova senha não confere.')
      return
    }

    if (senhaAtual === novaSenha) {
      setError('A nova senha deve ser diferente da senha provisória.')
      return
    }

    changePassword.mutate({ senhaAtual, novaSenha, confirmarNovaSenha })
  }

  function logout() {
    authService.logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-100 via-cyan-50/70 to-slate-200 px-6 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="mx-auto flex max-w-5xl justify-between gap-4">
        <BrandMark variant="horizontal" />
        <Button type="button" variant="secondary" onClick={logout} className="h-9 px-3 text-xs">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center">
        <Card className="mx-auto w-full max-w-xl animate-page-in border-0 bg-card/95">
          <CardContent className="p-8">
            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-950 dark:text-slate-100">Alterar senha</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Você precisa alterar sua senha provisória antes de continuar.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha atual provisória</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  autoComplete="current-password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarNovaSenha">Confirmar nova senha</Label>
                <Input
                  id="confirmarNovaSenha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmarNovaSenha}
                  onChange={(event) => setConfirmarNovaSenha(event.target.value)}
                />
              </div>

              {error ? <Alert variant="error">{error}</Alert> : null}

              <Button type="submit" className="h-12 w-full text-base" disabled={changePassword.isPending}>
                <KeyRound className="h-4 w-4" />
                {changePassword.isPending ? 'Salvando...' : 'Alterar senha e continuar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function getChangePasswordError(error: unknown) {
  const message = error instanceof Error ? error.message : ''

  if (error instanceof ApiError && error.status === 401) {
    return 'Sua sessão expirou. Faça login novamente.'
  }
  if (/senha atual/i.test(message)) return 'Senha atual inválida.'
  if (/confirm/i.test(message)) return 'As senhas não conferem.'
  if (/requisito|maiuscula|minuscula|numero|especial|8 caracteres/i.test(message)) {
    return 'A nova senha não atende aos requisitos mínimos.'
  }
  return 'Não foi possível alterar a senha. Tente novamente.'
}
