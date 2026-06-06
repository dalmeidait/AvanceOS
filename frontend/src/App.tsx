import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LayoutSubHeaderProvider } from '@/contexts/LayoutSubHeaderContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { hasRole, type UserRole } from '@/lib/roles'
import { AlterarSenhaObrigatoriaPage } from '@/pages/AlterarSenhaObrigatoriaPage'
import { AgendaPage } from '@/pages/AgendaPage'
import { AnalisesRelatoriosPage } from '@/pages/AnalisesRelatoriosPage'
import { AuditoriaPage } from '@/pages/AuditoriaPage'
import { CaixaPage } from '@/pages/CaixaPage'
import { ClientesPage } from '@/pages/ClientesPage'
import { ContabilidadePage } from '@/pages/ContabilidadePage'
import { ComprasPage } from '@/pages/ComprasPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DetalheOSPage } from '@/pages/DetalheOSPage'
import { FiscalPage } from '@/pages/FiscalPage'
import { FornecedoresPage } from '@/pages/FornecedoresPage'
import { LoginPage } from '@/pages/LoginPage'
import { ManuaisProcedimentosPage } from '@/pages/ManuaisProcedimentosPage'
import { MovimentacoesPage } from '@/pages/MovimentacoesPage'
import { NovaOSPage } from '@/pages/NovaOSPage'
import { OfyciaPage } from '@/pages/OfyciaPage'
import { OrdensServicoPage } from '@/pages/OrdensServicoPage'
import { ProdutosPage } from '@/pages/ProdutosPage'
import { TechHubPage } from '@/pages/TechHubPage'
import { UsuariosPage } from '@/pages/UsuariosPage'
import { VeiculosPage } from '@/pages/VeiculosPage'
import { CrmPage } from '@/pages/CrmPage'
import { authService } from '@/services/auth.service'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoutes() {
  const token = localStorage.getItem('jwt_token')
  const location = useLocation()
  const usuario = authService.getUsuario()
  const mustChangePassword = Boolean(usuario?.requirePasswordChange)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (mustChangePassword) {
    if (location.pathname === '/alterar-senha-obrigatoria') return <Outlet />
    return <Navigate to="/alterar-senha-obrigatoria" replace />
  }

  if (location.pathname === '/alterar-senha-obrigatoria') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <LayoutSubHeaderProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </LayoutSubHeaderProvider>
  )
}

function RoleRoute({ allowed, children }: { allowed: UserRole[]; children: ReactNode }) {
  const usuario = authService.getUsuario()
  if (!hasRole(usuario?.cargo, allowed)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/alterar-senha-obrigatoria" element={<AlterarSenhaObrigatoriaPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/clientes" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE']}><ClientesPage /></RoleRoute>} />
              <Route path="/veiculos" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE']}><VeiculosPage /></RoleRoute>} />
              <Route path="/fornecedores" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ESTOQUE']}><FornecedoresPage /></RoleRoute>} />
              <Route path="/agenda" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO']}><AgendaPage /></RoleRoute>} />
              <Route path="/produtos" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ESTOQUE']}><ProdutosPage /></RoleRoute>} />
              <Route path="/compras" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ESTOQUE', 'FINANCEIRO']}><ComprasPage /></RoleRoute>} />
              <Route path="/estoque/movimentacoes" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ESTOQUE']}><MovimentacoesPage /></RoleRoute>} />
              <Route path="/movimentacoes" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ESTOQUE']}><MovimentacoesPage /></RoleRoute>} />
              <Route path="/os" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO']}><OrdensServicoPage /></RoleRoute>} />
              <Route path="/os/nova" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO']}><NovaOSPage /></RoleRoute>} />
              <Route path="/os/:id" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO']}><DetalheOSPage /></RoleRoute>} />
              <Route path="/ordens-servico" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO']}><OrdensServicoPage /></RoleRoute>} />
              <Route path="/ordens-servico/nova" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO']}><NovaOSPage /></RoleRoute>} />
              <Route path="/ordens-servico/:id" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO']}><DetalheOSPage /></RoleRoute>} />
              <Route path="/contabilidade" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'FINANCEIRO']}><ContabilidadePage /></RoleRoute>} />
              <Route path="/fiscal" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'FINANCEIRO']}><FiscalPage /></RoleRoute>} />
              <Route path="/caixa" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'FINANCEIRO', 'ATENDENTE']}><CaixaPage /></RoleRoute>} />
              <Route path="/techhub" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'MECANICO']}><TechHubPage /></RoleRoute>} />
              <Route path="/documentos/manuais" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO', 'FINANCEIRO', 'ESTOQUE']}><ManuaisProcedimentosPage /></RoleRoute>} />
              <Route path="/analises-relatorios" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'FINANCEIRO', 'ESTOQUE', 'MECANICO', 'ATENDENTE']}><AnalisesRelatoriosPage /></RoleRoute>} />
              <Route path="/relatorios" element={<Navigate to="/analises-relatorios" replace />} />
              <Route path="/crm" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE']}><CrmPage /></RoleRoute>} />
              <Route path="/ofycia" element={<RoleRoute allowed={['ADMIN', 'GERENTE', 'ATENDENTE', 'MECANICO', 'FINANCEIRO', 'ESTOQUE']}><OfyciaPage /></RoleRoute>} />
              <Route
                path="/usuarios"
                element={
                  <RoleRoute allowed={['ADMIN']}>
                    <UsuariosPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/auditoria"
                element={
                  <RoleRoute allowed={['ADMIN', 'GERENTE']}>
                    <AuditoriaPage />
                  </RoleRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
