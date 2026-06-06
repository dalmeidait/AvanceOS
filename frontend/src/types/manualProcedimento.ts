export interface ManualProcedimento {
  id: string;
  titulo: string;
  descricao?: string;
  area: string;
  categoria: string;
  tipo: string;
  nivelAcesso: string;
  arquivoUrl?: string;
  conteudoTexto?: string;
  versao?: string;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateManualProcedimentoDto {
  titulo: string;
  descricao?: string;
  area: string;
  categoria: string;
  tipo: string;
  nivelAcesso: string;
  arquivoUrl?: string;
  conteudoTexto?: string;
  versao?: string;
  status?: string;
}
