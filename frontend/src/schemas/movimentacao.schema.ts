import { z } from 'zod'

export const movimentacaoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA_PERDA', 'AJUSTE']),
  quantidade: z.coerce.number().int().positive('Informe uma quantidade positiva.'),
  justificativa: z.string().optional(),
  custoUnitario: z.coerce.number().min(0, 'Custo inválido.').optional().or(z.literal('')),
})
