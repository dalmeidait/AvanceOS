import { z } from 'zod'

const optionalText = z.string().optional()

export const tiposLancamentoContabil = ['RECEITA', 'DESPESA'] as const
export const naturezasFinanceirasContabil = ['LANCAMENTO', 'CONTA_A_PAGAR', 'CONTA_A_RECEBER'] as const
export const statusLancamentoContabil = ['REGISTRADO', 'PENDENTE', 'PAGO', 'RECEBIDO', 'VENCIDO', 'CANCELADO'] as const
export const statusLancamentoFormulario = ['REGISTRADO', 'PENDENTE', 'PAGO', 'RECEBIDO', 'CANCELADO'] as const
export const origensLancamentoContabil = ['MANUAL', 'OS', 'PDV', 'FORNECEDOR', 'AJUSTE'] as const

export const centrosCustoContabil = [
  'Oficina',
  'Estoque',
  'Administrativo',
  'Financeiro',
  'Comercial',
  'Tecnologia',
  'Ferramentas',
  'Terceirizados',
  'Outros',
]

export const categoriasReceitaContabil = [
  'Serviços',
  'Peças e produtos',
  'Diagnóstico',
  'Mão de obra',
  'Revisão preventiva',
  'Elétrica/eletrônica',
  'Outros',
]

export const categoriasDespesaContabil = [
  'Compra de peças',
  'Ferramentas',
  'Fornecedores',
  'Serviços terceirizados',
  'Tecnologia/sistemas',
  'Manutenção interna',
  'Custos operacionais',
  'Outros',
]

export const contabilidadeSchema = z.object({
  tipo: z.enum(tiposLancamentoContabil),
  naturezaFinanceira: z.enum(naturezasFinanceirasContabil),
  categoria: z.string().trim().min(1, 'Informe a categoria.'),
  centroCusto: optionalText,
  descricao: z.string().trim().min(1, 'Informe a descrição.'),
  valor: z.string().refine((value) => {
    const normalized = Number(value.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(normalized) && normalized > 0
  }, 'Informe um valor positivo.'),
  dataLancamento: z.string().min(1, 'Informe a data do lançamento.'),
  competencia: optionalText,
  dataVencimento: optionalText,
  dataPagamento: optionalText,
  dataRecebimento: optionalText,
  numeroDocumento: optionalText,
  recorrente: z.boolean(),
  parcelaAtual: optionalText,
  parcelaTotal: optionalText,
  fornecedorId: optionalText,
  ordemServicoId: optionalText,
  formaPagamento: optionalText,
  status: z.enum(statusLancamentoFormulario),
  origem: z.enum(origensLancamentoContabil).default('MANUAL'),
  observacoes: optionalText,
})
