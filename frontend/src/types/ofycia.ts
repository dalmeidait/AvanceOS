import type { LucideIcon } from 'lucide-react'

export type OfyciaTab = 'cockpit' | 'os' | 'diagnostico' | 'operacao' | 'assistente'
export type OfyciaSeverity = 'informativo' | 'atencao' | 'critico' | 'recomendacao'
export type OfyciaContext =
  | 'Geral'
  | 'OS'
  | 'Veículo'
  | 'Cliente'
  | 'Estoque'
  | 'Agenda'
  | 'Financeiro'
  | 'Contabilidade'
  | 'Fiscal'
  | 'Diagnóstico'

export type OfyciaInsight = {
  id: string
  title: string
  description: string
  severity: OfyciaSeverity
  area: string
}

export type OfyciaMetric = {
  id: string
  title: string
  value: string | number
  note: string
  severity: OfyciaSeverity
}

export type OfyciaOperationBlock = {
  id: string
  title: string
  description: string
  recommendation: string
  path: string
  actionLabel: string
  severity: OfyciaSeverity
  icon: LucideIcon
}

export type OfyciaAssistantMessage = {
  id: string
  role: 'user' | 'ofycia'
  context: OfyciaContext
  content: string
}

export type OfyciaDiagnosticDraft = {
  codigo: string
  sintomas: string
  quilometragem: string
  sistema: string
  severidade: string
  observacoes: string
}

export type OfyciaDiagnosticResult = {
  causas: string[]
  testes: string[]
  pecas: string[]
  risco: string
  proximaAcao: string
}
