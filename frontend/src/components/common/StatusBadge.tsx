import { Badge } from '@/components/ui/badge'
import type { StatusOS } from '@/types/ordem-servico'

const labels: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_DIAGNOSTICO: 'Em diagnostico',
  AGUARDANDO_APROVACAO: 'Aguardando aprovacao',
  APROVADA: 'Aprovada',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  ASSINADO: 'Assinada',
  EM_EXECUCAO: 'Em execucao',
  AGUARDANDO_PECA: 'Aguardando peca',
  CONCLUIDO: 'Concluida',
  CONCLUIDA: 'Concluida',
  ENTREGUE: 'Entregue',
  PAGO: 'Pago',
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  CANCELADO: 'Cancelado',
  CANCELADA: 'Cancelada',
  ENTRADA: 'Entrada',
  ENTRADA_DEVOLUCAO_OS: 'Devolucao OS',
  SAIDA_PERDA: 'Saida por perda',
  SAIDA_OS: 'Saida por OS',
  SAIDA_PDV: 'Saida por PDV',
  AJUSTE: 'Ajuste',
  IN: 'Entrada',
  OUT: 'Saida',
  ADJUSTMENT: 'Ajuste',
  OK: 'OK',
  NORMAL: 'Normal',
  BAIXO: 'Baixo',
  CRITICO: 'Critico',
  ZERADO: 'Zerado',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
  OFYCIA: 'OFYCIA',
  IA: 'IA',
}

const positive = 'border-emerald-300/80 bg-emerald-50 text-emerald-700 shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-950/45 dark:text-emerald-300 dark:ring-emerald-300/10'
const warning = 'border-amber-300/80 bg-amber-50 text-amber-700 shadow-amber-900/5 ring-1 ring-amber-500/10 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-300/10'
const danger = 'border-rose-300/80 bg-rose-50 text-rose-700 shadow-rose-900/5 ring-1 ring-rose-500/10 dark:border-rose-500/45 dark:bg-rose-950/45 dark:text-rose-300 dark:ring-rose-300/10'
const neutral = 'border-slate-300/80 bg-slate-50 text-slate-700 shadow-slate-900/5 ring-1 ring-slate-500/10 dark:border-slate-600/70 dark:bg-slate-800/75 dark:text-slate-300 dark:ring-white/5'
const intelligence = 'border-cyan-300/80 bg-cyan-50 text-cyan-700 shadow-cyan-900/5 ring-1 ring-cyan-500/10 dark:border-cyan-400/40 dark:bg-cyan-950/45 dark:text-cyan-300 dark:ring-cyan-300/10'

const styles: Record<string, string> = {
  ABERTA: 'border-sky-300/80 bg-sky-50 text-sky-700 shadow-sky-900/5 ring-1 ring-sky-500/10 dark:border-sky-500/40 dark:bg-sky-950/45 dark:text-sky-300 dark:ring-sky-300/10',
  EM_DIAGNOSTICO: intelligence,
  AGUARDANDO_APROVACAO: warning,
  APROVADA: positive,
  AGUARDANDO_ASSINATURA: 'border-indigo-300/80 bg-indigo-50 text-indigo-700 shadow-indigo-900/5 ring-1 ring-indigo-500/10 dark:border-indigo-500/40 dark:bg-indigo-950/45 dark:text-indigo-300 dark:ring-indigo-300/10',
  ASSINADO: positive,
  EM_EXECUCAO: intelligence,
  AGUARDANDO_PECA: warning,
  CONCLUIDA: positive,
  CONCLUIDO: positive,
  ENTREGUE: positive,
  PAGO: positive,
  PENDENTE: warning,
  PARCIAL: intelligence,
  CANCELADO: danger,
  CANCELADA: danger,
  ENTRADA: positive,
  ENTRADA_DEVOLUCAO_OS: positive,
  SAIDA_PERDA: danger,
  SAIDA_OS: danger,
  SAIDA_PDV: danger,
  AJUSTE: neutral,
  IN: positive,
  OUT: danger,
  ADJUSTMENT: neutral,
  OK: positive,
  NORMAL: positive,
  BAIXO: warning,
  CRITICO: danger,
  ZERADO: danger,
  ATIVO: positive,
  INATIVO: neutral,
  RECEITA: positive,
  DESPESA: danger,
  OFYCIA: intelligence,
  IA: intelligence,
}

export function StatusBadge({ status }: { status?: StatusOS | string }) {
  const value = status || 'ABERTA'
  return <Badge className={styles[value] || neutral}>{labels[value] || value}</Badge>
}
