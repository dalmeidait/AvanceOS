import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  BookOpen,
  Boxes,
  Brain,
  Building2,
  CalendarDays,
  Car,
  FileBarChart,
  FileClock,
  Gauge,
  Landmark,
  PackageCheck,
  Plus,
  ReceiptText,
  Repeat,
  Scale,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { hasRole, type UserRole } from '@/lib/roles'
import { readLocalPreference, writeLocalPreference } from '@/lib/storage'
import { authService } from '@/services/auth.service'
import { osService } from '@/services/os.service'

type TabType = {
  label: string
  shortLabel: string
  path: string
  icon: LucideIcon
  roles?: UserRole[]
}

type OperationalTab = {
  label: string
  shortLabel: string
  path: string
  icon: LucideIcon
  roles?: UserRole[]
}

const tabTypes: TabType[] = [
  { label: 'Dashboard Executivo', shortLabel: 'Dashboard', path: '/dashboard', icon: Gauge },
  { label: 'Clientes', shortLabel: 'Clientes', path: '/clientes', icon: Users, roles: ['ADMIN', 'GERENTE', 'ATENDENTE'] },
  { label: 'Veículos', shortLabel: 'Veículos', path: '/veiculos', icon: Car, roles: ['ADMIN', 'GERENTE', 'ATENDENTE'] },
  { label: 'Fornecedores', shortLabel: 'Fornec.', path: '/fornecedores', icon: Building2, roles: ['ADMIN', 'GERENTE', 'ESTOQUE'] },
  { label: 'Agenda', shortLabel: 'Agenda', path: '/agenda', icon: CalendarDays, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO'] },
  { label: 'Ordens de Serviço', shortLabel: 'OS', path: '/os', icon: ReceiptText, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO'] },
  { label: 'TechHub', shortLabel: 'TechHub', path: '/techhub', icon: Stethoscope, roles: ['ADMIN', 'GERENTE', 'MECANICO'] },
  { label: 'Contabilidade', shortLabel: 'Contab.', path: '/contabilidade', icon: Landmark, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
  { label: 'Fiscal', shortLabel: 'Fiscal', path: '/fiscal', icon: Scale, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
  { label: 'Caixa/PDV', shortLabel: 'Caixa', path: '/caixa', icon: Banknote, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO', 'ATENDENTE'] },
  { label: 'Movimentações', shortLabel: 'Mov.', path: '/estoque/movimentacoes', icon: Repeat, roles: ['ADMIN', 'GERENTE', 'ESTOQUE'] },
  { label: 'Compras', shortLabel: 'Compras', path: '/compras', icon: PackageCheck, roles: ['ADMIN', 'GERENTE', 'ESTOQUE', 'FINANCEIRO'] },
  { label: 'Produtos e Serviços', shortLabel: 'Produtos', path: '/produtos', icon: Boxes, roles: ['ADMIN', 'GERENTE', 'ESTOQUE'] },
  { label: 'Manuais e Procedimentos', shortLabel: 'Manuais', path: '/documentos/manuais', icon: BookOpen, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO', 'FINANCEIRO', 'ESTOQUE'] },
  { label: 'Análises e Relatórios', shortLabel: 'Análises', path: '/analises-relatorios', icon: FileBarChart, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO', 'ESTOQUE', 'MECANICO', 'ATENDENTE'] },
  { label: 'Usuários', shortLabel: 'Usuários', path: '/usuarios', icon: ShieldCheck, roles: ['ADMIN'] },
  { label: 'Auditoria', shortLabel: 'Auditoria', path: '/auditoria', icon: FileClock, roles: ['ADMIN', 'GERENTE'] },
  { label: 'OFYCIA', shortLabel: 'OFYCIA', path: '/ofycia', icon: Brain, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO', 'FINANCEIRO', 'ESTOQUE'] },
]

function readTabsVisible() {
  return readLocalPreference('operationalTabs.visible') !== 'false'
}

function osIdFromPath(path: string) {
  if (path === '/os/nova' || path === '/ordens-servico/nova') return ''
  if (path.startsWith('/os/')) return decodeURIComponent(path.replace('/os/', '').split('/')[0] || '')
  if (path.startsWith('/ordens-servico/')) return decodeURIComponent(path.replace('/ordens-servico/', '').split('/')[0] || '')
  return ''
}

function shortOsId(id: string) {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id
}

function tabForPath(path: string, numeroOS?: string | number | null): OperationalTab {
  if ((path.startsWith('/os/') && path !== '/os/nova') || (path.startsWith('/ordens-servico/') && path !== '/ordens-servico/nova')) {
    const osId = osIdFromPath(path)
    const numero = numeroOS || shortOsId(osId)
    return { label: `OS nº ${numero}`, shortLabel: `OS nº ${numero}`, path, icon: ReceiptText }
  }

  if (path === '/os/nova' || path === '/ordens-servico/nova') {
    return { label: 'Nova OS', shortLabel: 'Nova OS', path, icon: ReceiptText }
  }

  if (path === '/' || path === '/movimentacoes') {
    const alias = path === '/' ? '/dashboard' : '/estoque/movimentacoes'
    const foundAlias = tabTypes.find((item) => item.path === alias)
    if (foundAlias) return foundAlias
  }

  const found = tabTypes.find((item) => item.path === path)
  return found || { label: 'Operação', shortLabel: 'Atual', path, icon: Gauge }
}

export function OperationalTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const usuario = authService.getUsuario()
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(readTabsVisible)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tabs, setTabs] = useState<OperationalTab[]>([tabTypes[0]])
  const osId = osIdFromPath(location.pathname)
  const ordem = useQuery({
    queryKey: ['ordem-servico', osId],
    queryFn: () => osService.buscarPorId(osId),
    enabled: Boolean(osId),
  })

  const currentTab = useMemo(
    () => tabForPath(location.pathname, ordem.data?.numeroOS || ordem.data?.numero),
    [location.pathname, ordem.data?.numero, ordem.data?.numeroOS],
  )
  const availableTabTypes = useMemo(
    () => tabTypes.filter((tab) => !tab.roles || hasRole(usuario?.cargo, tab.roles)),
    [usuario?.cargo],
  )
  const visibleTabs = useMemo(() => {
    const hasCurrent = tabs.some((tab) => tab.path === currentTab.path)
    return hasCurrent ? tabs.map((tab) => (tab.path === currentTab.path ? currentTab : tab)) : [...tabs, currentTab]
  }, [currentTab, tabs])

  useEffect(() => {
    if (!pickerOpen) return

    function handleMouseDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPickerOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pickerOpen])

  function setBarVisible(next: boolean) {
    setVisible(next)
    writeLocalPreference('operationalTabs.visible', String(next))
  }

  function openTab(tab: TabType) {
    if (tab.roles && !hasRole(usuario?.cargo, tab.roles)) return
    setTabs((current) => (current.some((item) => item.path === tab.path) ? current : [...current, tab]))
    setPickerOpen(false)
    navigate(tab.path)
  }

  function closeTab(path: string) {
    const currentIndex = visibleTabs.findIndex((tab) => tab.path === path)
    const nextTabs = visibleTabs.filter((tab) => tab.path !== path)
    const fallback = nextTabs[currentIndex - 1] || nextTabs[0] || tabTypes[0]
    setTabs(nextTabs.length ? nextTabs : [tabTypes[0]])
    if (location.pathname === path) navigate(fallback.path)
  }

  if (!visible) {
    return (
      <div className="shrink-0 border-t border-border bg-[hsl(var(--surface-raised))] px-4 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <Button type="button" variant="secondary" onClick={() => setBarVisible(true)} className="h-8 px-3 text-xs">
          Abas
        </Button>
      </div>
    )
  }

  return (
    <div className="z-30 h-12 shrink-0 border-t border-border bg-[hsl(var(--surface-raised)/0.96)] px-4 py-2 shadow-[0_-12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1500px] items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
          {visibleTabs.map((tab) => {
            const active = tab.path === location.pathname
            const Icon = tab.icon
            return (
              <div
                key={tab.path}
                className={[
                  'relative flex h-8 max-w-40 animate-page-in items-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition duration-150',
                  active
                    ? 'border-primary/35 bg-[hsl(var(--surface-hover))] text-cyan-800'
                    : 'border-border bg-[hsl(var(--surface-raised))] text-muted-foreground hover:border-primary/35 hover:bg-[hsl(var(--surface-hover))] hover:text-slate-950 dark:hover:text-slate-100',
                ].join(' ')}
              >
                {active ? <span className="absolute left-2 right-2 top-0 h-0.5 rounded-full bg-cyan-500" /> : null}
                <button type="button" onClick={() => navigate(tab.path)} className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{tab.shortLabel}</span>
                </button>
                {visibleTabs.length > 1 ? (
                  <button type="button" onClick={() => closeTab(tab.path)} title="Fechar aba" className="rounded-sm hover:bg-[hsl(var(--surface-subtle))]">
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>

        <div ref={pickerRef} className="relative flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => setBarVisible(false)} className="h-8 px-2 text-xs">
            Ocultar abas
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPickerOpen((value) => !value)} className="h-8 px-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Aba
          </Button>
          {pickerOpen ? (
            <div className="absolute bottom-10 right-0 z-50 w-56 max-w-[calc(100vw-2rem)] animate-page-in rounded-xl border border-primary/20 bg-[hsl(var(--surface-raised))] p-2 shadow-panel">
              {availableTabTypes.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => openTab(item)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-[hsl(var(--surface-hover))] hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
