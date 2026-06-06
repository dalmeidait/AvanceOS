import { useMutation, useQuery } from '@tanstack/react-query'
import { Bell, ChevronDown, KeyRound, LogOut, Moon, Settings, Sun, User, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { SessionTransition } from '@/components/common/SessionTransition'
import { SyncStatus } from '@/components/common/SyncStatus'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
import { readLocalPreference, writeLocalPreference } from '@/lib/storage'
import { getApiErrorMessage } from '@/lib/utils'
import { authService } from '@/services/auth.service'
import { osService } from '@/services/os.service'
import { produtosService } from '@/services/produtos.service'

type NotificationItem = {
  id: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
}

function readDismissedNotifications() {
  try {
    const raw = readLocalPreference('dismissedNotifications')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function Topbar() {
  const navigate = useNavigate()
  const { theme, density, isDark, setTheme, setDensity, toggleTheme } = useTheme()
  const usuario = authService.getUsuario()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(readDismissedNotifications)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showLogoutTransition, setShowLogoutTransition] = useState(false)

  const produtos = useQuery({
    queryKey: ['produtos', 'notificacoes'],
    queryFn: produtosService.listar,
    refetchInterval: 30000,
  })
  const ordens = useQuery({
    queryKey: ['ordens-servico', 'notificacoes'],
    queryFn: osService.listar,
    refetchInterval: 30000,
  })

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = []
    for (const produto of produtos.data ?? []) {
      const estoque = Number(produto.quantidadeAtual ?? 0)
      const minimo = Number(produto.estoqueMinimo ?? 0)
      if (estoque <= 0) {
        items.push({
          id: `produto-sem-estoque-${produto.id}`,
          title: 'Produto sem estoque',
          description: `${produto.nome} está sem estoque.`,
          severity: 'critical',
        })
      } else if (minimo > 0 && estoque < minimo * 0.5) {
        items.push({
          id: `produto-estoque-critico-${produto.id}`,
          title: 'Estoque critico',
          description: `${produto.nome} esta abaixo de 50% do estoque minimo.`,
          severity: 'critical',
        })
      } else if (minimo > 0 && estoque <= minimo) {
        items.push({
          id: `produto-estoque-baixo-${produto.id}`,
          title: 'Estoque abaixo do mínimo',
          description: `${produto.nome} está abaixo do estoque mínimo.`,
          severity: 'warning',
        })
      }
    }

    const abertas = (ordens.data ?? []).filter((os) => os.status === 'ABERTA' || os.status === 'EM_EXECUCAO').length
    const concluidas = (ordens.data ?? []).filter((os) => ['CONCLUIDO', 'CONCLUIDA'].includes(os.status)).length
    if (abertas > 0) {
      items.push({
        id: 'os-abertas',
        title: 'OS em andamento',
        description: `Existem ${abertas} OS abertas ou em execução.`,
        severity: 'info',
      })
    }
    if (concluidas > 0) {
      items.push({
        id: 'os-concluidas-pendentes',
        title: 'OS aguardando pagamento',
        description: 'Existem OS concluídas aguardando pagamento.',
        severity: 'warning',
      })
    }
    if (produtos.isError) {
      items.push({
        id: 'erro-notificacoes-produtos',
        title: 'Falha ao atualizar produtos',
          description: 'Não foi possível atualizar as notificações de estoque.',
        severity: 'warning',
      })
    }
    if (ordens.isError) {
      items.push({
        id: 'erro-notificacoes-os',
        title: 'Falha ao atualizar OS',
        description: 'Não foi possível atualizar as notificações de Ordens de Serviço.',
        severity: 'warning',
      })
    }
    return items.filter((item) => !dismissed.includes(item.id))
  }, [dismissed, ordens.data, ordens.isError, produtos.data, produtos.isError])

  const alterarSenha = useMutation({
    mutationFn: () =>
      authService.changePassword({
        senhaAtual,
        novaSenha,
        confirmarNovaSenha,
      }),
    onSuccess: (data) => {
      authService.persistSession(data)
      setPasswordFeedback('Senha alterada com sucesso.')
      setPasswordError('')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarNovaSenha('')
    },
    onError: (error) => {
      setPasswordFeedback('')
      setPasswordError(getApiErrorMessage(error))
    },
  })

  function persistDismissed(next: string[]) {
    const normalized = Array.from(new Set(next))
    setDismissed(normalized)
    writeLocalPreference('dismissedNotifications', JSON.stringify(normalized))
  }

  function closeMenus() {
    setUserMenuOpen(false)
    setNotificationsOpen(false)
  }

  function closeUserDialogs() {
    setAccountOpen(false)
    setPreferencesOpen(false)
    setPasswordOpen(false)
  }

  function openAccountDialog() {
    closeMenus()
    setPreferencesOpen(false)
    setPasswordOpen(false)
    setAccountOpen(true)
  }

  function openPreferencesDialog() {
    closeMenus()
    setAccountOpen(false)
    setPasswordOpen(false)
    setPreferencesOpen(true)
  }

  function openPasswordDialog() {
    closeMenus()
    setAccountOpen(false)
    setPreferencesOpen(false)
    setPasswordOpen(true)
  }

  function handleLogout() {
    closeMenus()
    closeUserDialogs()
    setShowLogoutTransition(true)
    setTimeout(() => {
      authService.logout()
      navigate('/login', { replace: true })
    }, 1200)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenus()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="relative z-40 flex h-[78px] shrink-0 items-center justify-between gap-6 border-b border-border bg-[hsl(var(--surface-raised)/0.94)] px-[var(--shell-padding-x)] shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur">
      {(userMenuOpen || notificationsOpen) &&
        createPortal(
          <button type="button" className="fixed inset-0 z-[80] cursor-default" onClick={closeMenus} />,
          document.body,
        )}

      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-xl font-bold text-slate-950 dark:text-slate-100">AvanceOS</h1>
            <span className="hidden rounded-full border border-primary/25 bg-[hsl(var(--surface-hover))] px-2.5 py-0.5 text-xs font-semibold text-cyan-800 lg:inline-flex">
              Oficina Avance
            </span>
          </div>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
            Atendimento, estoque e Ordens de Serviço da Oficina Avance.
          </p>
        </div>
      </div>

      <div className="relative z-50 flex shrink-0 items-center gap-3">
        <SyncStatus />
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-[var(--button-height)] items-center gap-2 rounded-lg border border-border bg-[hsl(var(--surface-subtle))] px-3 text-sm font-semibold text-foreground shadow-sm transition duration-150 hover:border-primary/45 hover:bg-[hsl(var(--surface-hover))] hover:text-cyan-800"
          title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden xl:inline">{isDark ? 'Tema claro' : 'Tema escuro'}</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((value) => !value)
              setUserMenuOpen(false)
            }}
            className="relative inline-flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-lg border border-border bg-[hsl(var(--surface-raised))] text-muted-foreground shadow-sm transition duration-150 hover:border-primary/45 hover:bg-[hsl(var(--surface-hover))] hover:text-cyan-800 active:scale-[0.98]"
            title="Notificações"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-cyan-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-50">
                {notifications.length}
              </span>
            ) : null}
          </button>

          {notificationsOpen
            ? createPortal(
              <div className="fixed right-4 top-20 z-[90] max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] animate-page-in overflow-y-auto rounded-xl border border-primary/20 bg-[hsl(var(--surface-raised))] p-3 shadow-panel">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">Notificações</h3>
                  <p className="text-xs text-muted-foreground">Atualização automática a cada 30s.</p>
                </div>
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => persistDismissed([...dismissed, ...notifications.map((item) => item.id)])}
                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-900"
                  >
                    Limpar todas
                  </button>
                ) : null}
              </div>

              {notifications.length === 0 ? (
                <div className="rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-4 text-sm text-muted-foreground">
                  Nenhuma notificação no momento.
                </div>
              ) : (
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {notifications.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={severityClass(item.severity)}>{severityLabel(item.severity)}</span>
                            <span className="text-xs text-muted-foreground">agora</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => persistDismissed([...dismissed, item.id])}
                          className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--surface-hover))] hover:text-slate-950 dark:hover:text-slate-100"
                          title="Dispensar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>,
              document.body,
            )
            : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen((value) => !value)
              setNotificationsOpen(false)
            }}
            className="flex h-[var(--control-height)] w-64 items-center justify-between gap-3 rounded-lg border border-border bg-[hsl(var(--surface-raised))] px-3 text-left shadow-sm transition duration-150 hover:border-primary/45 hover:bg-[hsl(var(--surface-hover))] active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{usuario?.nome || 'Administrador do Sistema'}</p>
              <p className="truncate text-xs text-muted-foreground">Oficina Avance · {usuario?.cargo || 'ADMINISTRADOR'}</p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          {userMenuOpen
            ? createPortal(
            <div className="fixed right-4 top-20 z-[90] w-80 max-w-[calc(100vw-2rem)] animate-page-in rounded-xl border border-primary/20 bg-[hsl(var(--surface-raised))] p-3 shadow-panel">
              <div className="pb-3">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{usuario?.nome || 'Administrador do Sistema'}</p>
                <p className="truncate text-xs text-muted-foreground">{usuario?.email || 'admin@oficinaavance.com.br'}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-cyan-700">Oficina Avance</span>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700">
                    {usuario?.cargo || 'ADMINISTRADOR'}
                  </span>
                </div>
              </div>
              <div className="border-t border-border py-2">
                <MenuButton icon={<User className="h-4 w-4" />} label="Minha conta" onClick={openAccountDialog} />
                <MenuButton icon={<Settings className="h-4 w-4" />} label="Preferências" onClick={openPreferencesDialog} />
                <MenuButton icon={<KeyRound className="h-4 w-4" />} label="Alterar senha" onClick={openPasswordDialog} />
              </div>
              <div className="border-t border-border pt-2">
                <MenuButton icon={<LogOut className="h-4 w-4" />} label="Sair" onClick={handleLogout} danger />
              </div>
            </div>,
              document.body,
            )
            : null}
        </div>
      </div>

      <Dialog open={accountOpen} title="Minha conta" onClose={() => setAccountOpen(false)}>
        <div className="space-y-3 text-sm">
          <Info label="Nome" value={usuario?.nome || 'Administrador do Sistema'} />
          <Info label="Email" value={usuario?.email || '-'} />
          <Info label="Cargo" value={usuario?.cargo || 'ADMINISTRADOR'} />
          <Info label="Oficina" value="Oficina Avance" />
        </div>
      </Dialog>

      <Dialog open={passwordOpen} title="Alterar senha" description="Use sua senha atual para definir uma nova senha." onClose={() => setPasswordOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setPasswordFeedback('')
            setPasswordError('')
            if (!senhaAtual) {
              setPasswordError('Informe a senha atual.')
              return
            }
            if (novaSenha.length < 8) {
              setPasswordError('Informe uma nova senha com pelo menos 8 caracteres.')
              return
            }
            if (!/[A-Z]/.test(novaSenha) || !/[a-z]/.test(novaSenha) || !/\d/.test(novaSenha) || !/[^A-Za-z0-9]/.test(novaSenha)) {
              setPasswordError('A nova senha deve conter maiúscula, minúscula, número e caractere especial.')
              return
            }
            if (novaSenha !== confirmarNovaSenha) {
              setPasswordError('A confirmação da nova senha não confere.')
              return
            }
            if (senhaAtual === novaSenha) {
              setPasswordError('A nova senha deve ser diferente da senha atual.')
              return
            }
            alterarSenha.mutate()
          }}
        >
          <div className="space-y-2">
            <Label>Senha atual</Label>
            <Input type="password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input type="password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial.</p>
          </div>
          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input type="password" value={confirmarNovaSenha} onChange={(event) => setConfirmarNovaSenha(event.target.value)} />
          </div>
          {passwordFeedback ? <Alert variant="success">{passwordFeedback}</Alert> : null}
          {passwordError ? <Alert variant="error">{passwordError}</Alert> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={alterarSenha.isPending}>
              {alterarSenha.isPending ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={preferencesOpen} title="Preferências" description="Preferências locais desta estação." onClose={() => setPreferencesOpen(false)}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select value={theme} onChange={(event) => setTheme(event.target.value === 'dark' ? 'dark' : 'light')}>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Densidade</Label>
            <Select
              value={density}
              onChange={(event) => {
                const next = event.target.value
                setDensity(next === 'compact' || next === 'spacious' ? next : 'comfortable')
              }}
            >
              <option value="compact">Compacta</option>
              <option value="spacious">Espaçosa</option>
              <option value="comfortable">Confortável</option>
            </Select>
          </div>
        </div>
      </Dialog>
      <SessionTransition show={showLogoutTransition} type="logout" />
    </header>
  )
}

function severityLabel(severity: NotificationItem['severity']) {
  if (severity === 'critical') return 'Crítica'
  if (severity === 'warning') return 'Atenção'
  return 'Info'
}

function severityClass(severity: NotificationItem['severity']) {
  if (severity === 'critical') return 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700'
  if (severity === 'warning') return 'rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700'
  return 'rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700'
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex h-[var(--button-height)] w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition hover:bg-[hsl(var(--surface-hover))]',
        danger ? 'text-red-600 hover:text-red-700' : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-slate-950 dark:text-slate-100">{value}</p>
    </div>
  )
}
