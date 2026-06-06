import { z } from 'zod'

export const novaOSSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente.'),
  veiculoId: z.string().min(1, 'Selecione um veículo.'),
  descricao: z.string().min(5, 'Descreva o relato inicial do cliente.'),
  diagnostico: z.string().optional(),
  relatoMecanico: z.string().optional(),
  status: z.string().optional(),
})

export const detalheOSSchema = z.object({
  status: z.string().min(1, 'Selecione o status.'),
  relatoMecanico: z.string().optional(),
  diagnostico: z.string().optional(),
})
