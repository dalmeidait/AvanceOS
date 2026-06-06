import { z } from 'zod'

export const manualProcedimentoSchema = z.object({
  titulo: z.string().min(3, 'O título é obrigatório'),
  descricao: z.string().optional(),
  area: z.string().min(1, 'A área é obrigatória'),
  categoria: z.string().min(1, 'A categoria é obrigatória'),
  tipo: z.string().min(1, 'O tipo é obrigatório'),
  nivelAcesso: z.string().min(1, 'O nível de acesso é obrigatório'),
  arquivoUrl: z.string().optional(),
  conteudoTexto: z.string().optional(),
  versao: z.string().optional(),
  status: z.string().optional(),
})
