import { api } from '@/lib/api'
import type { CriarSolicitacaoEstoquePayload } from '@/types/solicitacao-estoque'

export const estoqueSolicitacoesService = {
  async criar(payload: CriarSolicitacaoEstoquePayload) {
    const { data } = await api.post('/estoque-solicitacoes', payload)
    return data
  },
}
