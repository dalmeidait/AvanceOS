import { z } from 'zod'

export const produtoSchema = z.object({
  sku: z.string().min(1, 'Informe o SKU.'),
  nome: z.string().min(2, 'Informe o produto.'),
  marca: z.string().min(2, 'Informe a marca.'),
  categoria: z.string().optional(),
  veiculosCompativeis: z.string().optional(),
  localizacaoFisica: z.string().optional(),
  precoCusto: z.coerce.number().min(0, 'Custo inválido.'),
  precoVenda: z.coerce.number().min(0, 'Preço inválido.'),
  estoqueMinimo: z.coerce.number().int().min(0, 'Estoque mínimo inválido.'),
})
