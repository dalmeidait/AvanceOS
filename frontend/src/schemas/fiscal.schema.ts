import { z } from 'zod'

const optionalText = z.string().optional()

export const tiposDocumentoFiscal = [
  'RECIBO_GERENCIAL',
  'NOTA_SERVICO_SIMULADA',
  'NOTA_PRODUTO_SIMULADA',
  'NOTA_MISTA_SIMULADA',
  'ENTRADA_FORNECEDOR_SIMULADA',
  'OUTRO',
] as const

export const statusDocumentoFiscal = ['RASCUNHO', 'EMITIDO_SIMULADO', 'CANCELADO', 'ARQUIVADO'] as const
export const origensDocumentoFiscal = ['MANUAL', 'OS', 'PDV', 'FORNECEDOR', 'AJUSTE'] as const

export const naturezasOperacaoFiscal = [
  'Prestação de serviço',
  'Venda de peça/produto',
  'Serviço com fornecimento de peças',
  'Entrada de fornecedor',
  'Devolução gerencial',
  'Ajuste operacional',
  'Outro',
]

function moneyString(message: string) {
  return z.string().refine((value) => {
    const normalized = Number(value.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(normalized) && normalized >= 0
  }, message)
}

export const fiscalSchema = z.object({
  tipoDocumento: z.enum(tiposDocumentoFiscal),
  numero: optionalText,
  serie: optionalText,
  naturezaOperacao: optionalText,
  clienteId: optionalText,
  veiculoId: optionalText,
  fornecedorId: optionalText,
  ordemServicoId: optionalText,
  pagamentoId: optionalText,
  vendaPdvId: optionalText,
  dataEmissao: z.string().min(1, 'Informe a data de emissão.'),
  dataCompetencia: optionalText,
  valorServicos: moneyString('Informe um valor de serviços válido.'),
  valorProdutos: moneyString('Informe um valor de produtos válido.'),
  valorDesconto: moneyString('Informe um desconto válido.'),
  valorTotal: moneyString('Informe um total válido.'),
  status: z.enum(statusDocumentoFiscal),
  origem: z.enum(origensDocumentoFiscal).default('MANUAL'),
  observacoes: optionalText,
})
