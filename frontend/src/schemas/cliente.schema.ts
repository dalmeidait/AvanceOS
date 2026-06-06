import { z } from 'zod'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export const clienteSchema = z.object({
  nome: z.string().min(2, 'Informe o nome do cliente.'),
  cpf_cnpj: z.string().refine((value) => [11, 14].includes(onlyDigits(value).length), 'Informe o CPF/CNPJ completo.'),
  telefone: z
    .string()
    .optional()
    .refine((value) => !value || [10, 11].includes(onlyDigits(value).length), 'Informe o telefone completo.'),
  email: z.string().email('Informe um email valido.').optional().or(z.literal('')),
  cep: z.string().optional(),
  bairro: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
})
