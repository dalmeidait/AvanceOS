export type TipoDocumentoFiscal =
  | 'RECIBO_GERENCIAL'
  | 'NOTA_SERVICO_SIMULADA'
  | 'NOTA_PRODUTO_SIMULADA'
  | 'NOTA_MISTA_SIMULADA'
  | 'ENTRADA_FORNECEDOR_SIMULADA'
  | 'OUTRO'

export type StatusDocumentoFiscal = 'RASCUNHO' | 'EMITIDO_SIMULADO' | 'CANCELADO' | 'ARQUIVADO'
export type OrigemDocumentoFiscal = 'MANUAL' | 'OS' | 'PDV' | 'FORNECEDOR' | 'AJUSTE'

export type FiscalPessoa = {
  id: string
  nome: string
  documento?: string | null
}

export type FiscalVeiculo = {
  id: string
  placa: string
  marca?: string | null
  modelo?: string | null
}

export type FiscalOrdemServico = {
  id: string
  numeroOS?: number | string | null
  placaVeiculo?: string | null
  modeloVeiculo?: string | null
}

export type DocumentoFiscalSimulado = {
  id: string
  numero?: string | null
  serie?: string | null
  tipoDocumento: TipoDocumentoFiscal
  naturezaOperacao?: string | null
  status: StatusDocumentoFiscal
  clienteId?: string | null
  veiculoId?: string | null
  ordemServicoId?: string | null
  fornecedorId?: string | null
  pagamentoId?: string | null
  vendaPdvId?: string | null
  dataEmissao: string
  dataCompetencia?: string | null
  valorServicos: number
  valorProdutos: number
  valorDesconto: number
  valorTotal: number
  observacoes?: string | null
  semValidadeFiscal: boolean
  origem: OrigemDocumentoFiscal
  criadoEm: string
  atualizadoEm: string
  cliente?: FiscalPessoa | null
  veiculo?: FiscalVeiculo | null
  ordemServico?: FiscalOrdemServico | null
  fornecedor?: FiscalPessoa | null
}

export type FiltrosFiscal = {
  inicio?: string
  fim?: string
  tipoDocumento?: TipoDocumentoFiscal | ''
  status?: StatusDocumentoFiscal | ''
  clienteId?: string
  fornecedorId?: string
  ordemServicoId?: string
  origem?: OrigemDocumentoFiscal | ''
  busca?: string
}

export type DocumentoFiscalPayload = {
  numero?: string | null
  serie?: string | null
  tipoDocumento: TipoDocumentoFiscal
  naturezaOperacao?: string | null
  status: StatusDocumentoFiscal
  clienteId?: string | null
  veiculoId?: string | null
  ordemServicoId?: string | null
  fornecedorId?: string | null
  pagamentoId?: string | null
  vendaPdvId?: string | null
  dataEmissao: string
  dataCompetencia?: string | null
  valorServicos: number
  valorProdutos: number
  valorDesconto: number
  valorTotal: number
  observacoes?: string | null
  origem?: OrigemDocumentoFiscal
}

export type ResumoGrupoFiscal = {
  chave: string
  quantidade: number
  total: number
}

export type ResumoFiscal = {
  periodo: {
    inicio?: string | null
    fim?: string | null
  }
  totalDocumentos: number
  totalEmitidosSimulados: number
  totalRascunhos: number
  totalCancelados: number
  valorTotalSimulado: number
  valorServicos: number
  valorProdutos: number
  porTipoDocumento: ResumoGrupoFiscal[]
  porStatus: ResumoGrupoFiscal[]
}
