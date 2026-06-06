import { z } from 'zod'

export const veiculoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione o cliente.'),
  placa: z.string().min(7, 'Informe a placa.'),
  marca: z.string().min(2, 'Informe a marca.'),
  modelo: z.string().min(2, 'Informe o modelo.'),
  ano: z.string().optional(),
  cor: z.string().optional(),
  quilometragem: z.coerce.number().min(0, 'Quilometragem inválida.').optional().or(z.literal('')),
})
