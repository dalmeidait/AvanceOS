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
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Repeat,
  Scale,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { BrandMark } from '@/components/common/BrandMark'
import { hasRole, type UserRole } from '@/lib/roles'
import { authService } from '@/services/auth.service'

const groups: Array<{
  label: string
  items: Array<{ label: string; href: string; icon: LucideIcon; roles?: UserRole[] }>
}> = [
  {
    label: 'Visão Geral',
    items: [{ label: 'Dashboard Executivo', href: '/dashboard', icon: Gauge }],
  },
  {
    label: 'Cadastros',
    items: [
      { label: 'Clientes', href: '/clientes', icon: Users, roles: ['ADMIN', 'GERENTE', 'ATENDENTE'] },
      { label: 'Veículos', href: '/veiculos', icon: Car, roles: ['ADMIN', 'GERENTE', 'ATENDENTE'] },
      { label: 'Fornecedores', href: '/fornecedores', icon: Building2, roles: ['ADMIN', 'GERENTE', 'ESTOQUE'] },
    ],
  },
  {
    label: 'Relacionamento',
    items: [
      { label: 'CRM / Contatos', href: '/crm', icon: Users, roles: ['ADMIN', 'GERENTE', 'ATENDENTE'] },
    ],
  },
  {
    label: 'Operação',
    items: [
      { label: 'Agenda', href: '/agenda', icon: CalendarDays, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO'] },
      { label: 'Ordens de Serviço', href: '/os', icon: ReceiptText, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO'] },
      { label: 'TechHub', href: '/techhub', icon: Stethoscope, roles: ['ADMIN', 'GERENTE', 'MECANICO'] },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Contabilidade', href: '/contabilidade', icon: Landmark, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
      { label: 'Fiscal', href: '/fiscal', icon: Scale, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
      { label: 'Caixa/PDV', href: '/caixa', icon: Banknote, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO', 'ATENDENTE'] },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { label: 'Compras', href: '/compras', icon: PackageCheck, roles: ['ADMIN', 'GERENTE', 'ESTOQUE', 'FINANCEIRO'] },
      { label: 'Movimentações', href: '/estoque/movimentacoes', icon: Repeat, roles: ['ADMIN', 'GERENTE', 'ESTOQUE'] },
      { label: 'Produtos e Serviços', href: '/produtos', icon: Boxes, roles: ['ADMIN', 'GERENTE', 'ESTOQUE'] },
    ],
  },
  {
    label: 'Documentos',
    items: [
      { label: 'Manuais e Procedimentos', href: '/documentos/manuais', icon: BookOpen, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO', 'FINANCEIRO', 'ESTOQUE'] },
      { label: 'Análises e Relatórios', href: '/analises-relatorios', icon: FileBarChart, roles: ['ADMIN', 'GERENTE', 'FINANCEIRO', 'ESTOQUE', 'MECANICO', 'ATENDENTE'] },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários', href: '/usuarios', icon: ShieldCheck, roles: ['ADMIN'] },
      { label: 'Auditoria', href: '/auditoria', icon: FileClock, roles: ['ADMIN', 'GERENTE'] },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { label: 'OFYCIA', href: '/ofycia', icon: Brain, roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO', 'FINANCEIRO', 'ESTOQUE'] },
    ],
  },
]

type SidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const usuario = authService.getUsuario()
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || hasRole(usuario?.cargo, item.roles)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <aside
      className={[
        'flex h-screen shrink-0 flex-col border-r border-border bg-[hsl(var(--surface-raised))] py-5 shadow-[10px_0_45px_rgba(15,23,42,0.08)] transition-all duration-300 ease-in-out',
        collapsed ? 'w-20 px-3' : 'w-72 px-4',
      ].join(' ')}
    >
      <div
        className={[
          'mb-7 flex rounded-xl border border-border bg-[hsl(var(--surface-subtle))] py-3',
          collapsed ? 'flex-col items-center justify-center gap-3 px-2' : 'items-center justify-between px-3',
        ].join(' ')}
      >
        <div className={collapsed ? 'flex items-center justify-center' : 'flex min-w-0 flex-1 items-center gap-3'}>
          <BrandMark variant="symbol" />
          <div className={collapsed ? 'hidden' : 'min-w-0'}>
            <div className="text-lg font-extrabold tracking-wide text-slate-950 dark:text-slate-100">AvanceOS</div>
          </div>
        </div>
        <button
          type="button"
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          onClick={onToggleCollapsed}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-[hsl(var(--surface-raised))] text-muted-foreground shadow-sm transition hover:border-primary/35 hover:bg-[hsl(var(--surface-hover))] hover:text-cyan-800 dark:hover:text-cyan-200"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className={['flex flex-1 flex-col overflow-y-auto', collapsed ? 'gap-3 pr-0' : 'gap-6 pr-1'].join(' ')}>
        {visibleGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {collapsed ? (
              <div className="mx-auto my-2 h-px w-8 bg-border" aria-hidden="true" />
            ) : (
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{group.label}</div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/dashboard'}
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) =>
                  [
                    'group relative flex h-[var(--nav-item-height)] items-center rounded-lg text-sm font-semibold transition duration-150',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    isActive
                      ? 'bg-[hsl(var(--surface-active))] text-[#ffffff] shadow-[0_14px_30px_rgba(14,116,144,0.26)] hover:bg-cyan-700'
                      : 'text-slate-600 hover:bg-[hsl(var(--surface-hover))] hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'absolute left-0 h-6 w-1 rounded-r-full bg-cyan-200 transition',
                        isActive ? 'opacity-100' : 'opacity-0',
                      ].join(' ')}
                    />
                    <item.icon
                      className={[
                        'h-4 w-4 shrink-0 transition',
                        isActive ? 'text-[#ffffff]' : 'text-cyan-600 group-hover:text-cyan-700',
                      ].join(' ')}
                    />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
