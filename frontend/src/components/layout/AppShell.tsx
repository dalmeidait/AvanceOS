import type { ReactNode } from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLayoutSubHeader } from '@/contexts/LayoutSubHeaderContext'
import { OperationalTabs } from './OperationalTabs'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { subHeader } = useLayoutSubHeader()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        {subHeader && (
          <div className="z-40 w-full border-b border-slate-200 bg-slate-50/95 shadow-sm backdrop-blur-md">
            {subHeader}
          </div>
        )}
        <main id="main-scroll-container" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div
            key={location.pathname}
            className="animate-page-in mx-auto w-full max-w-[1500px] px-[var(--shell-padding-x)] py-[var(--shell-padding-y)] pb-12"
          >
            {children}
          </div>
        </main>
        <OperationalTabs />
      </div>
    </div>
  )
}
