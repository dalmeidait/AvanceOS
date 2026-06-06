import { Activity, Banknote, Boxes, CalendarDays, FileText, Landmark, ReceiptText, Scale, Truck } from 'lucide-react'
import { safeRandomId } from '@/lib/safeRandomId'
import type {
  OfyciaAssistantMessage,
  OfyciaContext,
  OfyciaDiagnosticDraft,
  OfyciaDiagnosticResult,
  OfyciaInsight,
  OfyciaMetric,
  OfyciaOperationBlock,
} from '@/types/ofycia'

export const ofyciaContexts: OfyciaContext[] = [
  'Geral',
  'OS',
  'Veículo',
  'Cliente',
  'Estoque',
  'Agenda',
  'Financeiro',
  'Contabilidade',
  'Fiscal',
  'Diagnóstico',
]

export const ofyciaPromptSuggestions = [
  'Resuma os riscos operacionais da oficina hoje.',
  'Explique uma OS para o cliente em linguagem simples.',
  'Quais pontos devo revisar antes de liberar um veículo?',
  'Quais peças podem impactar a execução de uma OS?',
  'Como interpretar um código OBD-II?',
  'Quais dados exportar para Power BI?',
]

const cockpitMetrics: OfyciaMetric[] = [
  { id: 'alertas', title: 'Alertas críticos', value: 2, note: 'Simulação de pontos que exigem revisão humana', severity: 'critico' },
  { id: 'os-risco', title: 'OS em risco', value: 4, note: 'Aguardando peça, aprovação ou validação técnica', severity: 'atencao' },
  { id: 'maquinas', title: 'Máquinas em atenção', value: 1, note: 'Planejamento de agenda recomendado', severity: 'atencao' },
  { id: 'estoque', title: 'Estoque em alerta', value: 6, note: 'Itens próximos do mínimo devem ser conferidos', severity: 'critico' },
  { id: 'contas', title: 'Contas vencidas', value: 3, note: 'Revisar Contabilidade Operacional', severity: 'atencao' },
  { id: 'frotas', title: 'Frotas em observação', value: 5, note: 'Clientes com múltiplos veículos podem exigir janela dedicada', severity: 'informativo' },
  { id: 'diagnosticos', title: 'Diagnósticos pendentes', value: 7, note: 'Análise assistiva preparada para fase futura', severity: 'recomendacao' },
  { id: 'recomendacoes', title: 'Recomendações do dia', value: 8, note: 'Sugestões operacionais sem ação automática', severity: 'recomendacao' },
]

const cockpitInsights: OfyciaInsight[] = [
  {
    id: 'pecas-os',
    title: 'OS aguardando peça',
    description: 'Há OS aguardando peça. Verifique solicitações ao estoque antes de prometer prazo ao cliente.',
    severity: 'atencao',
    area: 'OS + Estoque',
  },
  {
    id: 'agenda-maquinas',
    title: 'Agenda de máquinas',
    description: 'Máquinas livres podem estar disponíveis para novos atendimentos, mediante conferência da agenda.',
    severity: 'informativo',
    area: 'Agenda',
  },
  {
    id: 'frotas',
    title: 'Clientes com frota',
    description: 'Clientes com múltiplos veículos podem exigir planejamento de agenda e comunicação mais estruturada.',
    severity: 'recomendacao',
    area: 'Clientes',
  },
  {
    id: 'contas',
    title: 'Contabilidade operacional',
    description: 'Contas a pagar próximas do vencimento devem ser revisadas antes de autorizar compras maiores.',
    severity: 'atencao',
    area: 'Contabilidade',
  },
  {
    id: 'fiscal',
    title: 'Fiscal Gerencial',
    description: 'Fiscal Gerencial disponível para documentos simulados sem validade fiscal, sem emissão real.',
    severity: 'informativo',
    area: 'Fiscal',
  },
]

export function getOfyciaCockpitMetrics() {
  return cockpitMetrics
}

export function getOfyciaCockpitInsights() {
  return cockpitInsights
}

export function getOfyciaOperationBlocks(): OfyciaOperationBlock[] {
  return [
    {
      id: 'agenda',
      title: 'Agenda de máquinas',
      description: 'Visão de ocupação e disponibilidade operacional.',
      recommendation: 'Revisar agenda das máquinas antes de abrir nova OS complexa.',
      path: '/agenda',
      actionLabel: 'Ir para Agenda',
      severity: 'informativo',
      icon: CalendarDays,
    },
    {
      id: 'os',
      title: 'Ordens de Serviço',
      description: 'Fila operacional, status e pendências por atendimento.',
      recommendation: 'Priorizar OS com peça pendente, cliente aguardando retorno ou veículo parado.',
      path: '/os',
      actionLabel: 'Ir para OS',
      severity: 'atencao',
      icon: ReceiptText,
    },
    {
      id: 'estoque',
      title: 'Estoque',
      description: 'Produtos, movimentações e itens próximos do mínimo.',
      recommendation: 'Verificar estoque mínimo antes de aprovar serviços com peças.',
      path: '/estoque/movimentacoes',
      actionLabel: 'Ir para Estoque',
      severity: 'critico',
      icon: Boxes,
    },
    {
      id: 'contabilidade',
      title: 'Financeiro/Contabilidade',
      description: 'Receitas, despesas, contas a pagar e receber.',
      recommendation: 'Conferir contas pendentes na Contabilidade Operacional.',
      path: '/contabilidade',
      actionLabel: 'Ir para Contabilidade',
      severity: 'atencao',
      icon: Landmark,
    },
    {
      id: 'fiscal',
      title: 'Fiscal Gerencial',
      description: 'Documentos simulados, sem validade fiscal.',
      recommendation: 'Gerar documento Fiscal Gerencial somente como simulação sem validade fiscal.',
      path: '/fiscal',
      actionLabel: 'Ir para Fiscal',
      severity: 'recomendacao',
      icon: Scale,
    },
    {
      id: 'fornecedores',
      title: 'Fornecedores',
      description: 'Apoio a compras, contatos e reposição.',
      recommendation: 'Revisar fornecedores críticos antes de comprometer prazos de peças.',
      path: '/fornecedores',
      actionLabel: 'Ir para Fornecedores',
      severity: 'informativo',
      icon: Truck,
    },
    {
      id: 'caixa',
      title: 'PDV/Caixa',
      description: 'Operação financeira de caixa e recebimentos.',
      recommendation: 'Conferir caixa antes de decisões operacionais dependentes de pagamento.',
      path: '/caixa',
      actionLabel: 'Ir para Caixa',
      severity: 'informativo',
      icon: Banknote,
    },
    {
      id: 'techhub',
      title: 'TechHub',
      description: 'Diagnósticos simulados e apoio técnico futuro.',
      recommendation: 'Relacionar evidências técnicas antes de concluir uma análise assistiva.',
      path: '/techhub',
      actionLabel: 'Ir para TechHub',
      severity: 'recomendacao',
      icon: Activity,
    },
  ]
}

export function getInitialAssistantMessages(): OfyciaAssistantMessage[] {
  return [
    {
      id: 'welcome',
      role: 'ofycia',
      context: 'Geral',
      content:
        'OFYCIA está em modo de preparação visual. Nenhuma IA real está conectada e nenhuma ação crítica será executada automaticamente.',
    },
    {
      id: 'scope',
      role: 'ofycia',
      context: 'Geral',
      content:
        'Use esta área para ensaiar perguntas operacionais. Em fase futura, a análise poderá considerar OS, estoque, agenda, financeiro, contabilidade, fiscal e diagnósticos.',
    },
  ]
}

export function simulateAssistantResponse(context: OfyciaContext, prompt: string): OfyciaAssistantMessage {
  const cleanPrompt = prompt.trim()
  return {
    id: safeRandomId('ofycia'),
    role: 'ofycia',
    context,
    content: cleanPrompt
      ? 'OFYCIA ainda não está conectada a um motor de IA. Em fase futura, esta pergunta será analisada com contexto operacional do AvanceOS, sem executar ações críticas automaticamente.'
      : 'Digite uma pergunta operacional para simular o fluxo de atendimento da OFYCIA.',
  }
}

export function createUserAssistantMessage(context: OfyciaContext, content: string): OfyciaAssistantMessage {
  return {
    id: safeRandomId('ofycia-user'),
    role: 'user',
    context,
    content,
  }
}

export function analyzeDiagnosticDraft(draft: OfyciaDiagnosticDraft): OfyciaDiagnosticResult {
  const code = draft.codigo.trim().toUpperCase()
  const hasP0301 = code === 'P0301'

  return {
    causas: hasP0301
      ? ['Possível falha de combustão no cilindro 1.', 'Recomendado verificar vela, bobina, bico injetor e compressão.']
      : ['Indicação preliminar depende de sintomas, sistema afetado e inspeção técnica.', 'Possível relação com componente, chicote, sensor ou condição operacional.'],
    testes: [
      'Conferir histórico da OS e sintomas relatados pelo cliente.',
      'Realizar inspeção técnica profissional antes de qualquer conclusão.',
      'Validar evidências com scanner, teste visual e medições aplicáveis.',
    ],
    pecas: hasP0301 ? ['Vela', 'Bobina', 'Bico injetor', 'Componentes de ignição'] : ['Peças relacionadas ao sistema informado', 'Sensores e conectores sob suspeita'],
    risco: draft.severidade === 'Alta' || draft.severidade === 'Crítica'
      ? 'Risco de rodagem em atenção. Recomenda-se não liberar sem avaliação técnica.'
      : 'Risco de rodagem simulado como moderado, dependente de inspeção real.',
    proximaAcao: 'Registrar evidências, revisar estoque de peças relacionadas e encaminhar para avaliação técnica profissional.',
  }
}

export function getOsSimulationSummary(status?: string) {
  const normalized = String(status || '').toUpperCase()
  if (normalized.includes('AGUARDANDO_PECA')) {
    return {
      risk: 'Atenção',
      pending: 'Possível dependência de estoque ou solicitação de peça.',
      nextAction: 'Verificar solicitações ao estoque e confirmar prazo antes de prometer entrega.',
    }
  }

  if (normalized.includes('CANCELADA')) {
    return {
      risk: 'Crítico gerencial',
      pending: 'OS cancelada exige conferência de comunicação, estoque e financeiro.',
      nextAction: 'Revisar histórico antes de qualquer reabertura ou novo atendimento.',
    }
  }

  if (normalized.includes('CONCLUIDA') || normalized.includes('ENTREGUE')) {
    return {
      risk: 'Baixo',
      pending: 'Sem pendência simulada relevante para esta visão.',
      nextAction: 'Conferir documentação, pagamento e comunicação final com cliente.',
    }
  }

  return {
    risk: 'Simulado',
    pending: 'Resumo inteligente ainda não executado.',
    nextAction:
      'Futuramente, a OFYCIA poderá analisar sintomas, histórico, peças, estoque, agenda e financeiro da OS.',
  }
}

export function getAssistantQuickFiles() {
  return [
    { label: 'Resumo operacional', icon: FileText },
    { label: 'Riscos de OS', icon: ReceiptText },
    { label: 'Estoque em alerta', icon: Boxes },
    { label: 'Agenda crítica', icon: CalendarDays },
  ]
}
