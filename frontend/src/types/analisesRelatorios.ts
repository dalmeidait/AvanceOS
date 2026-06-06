export interface ResumoEstatistico {
  totalOs: number;
  osAbertas: number;
  osExecucao: number;
  osConcluidas: number;
  osPendentes: number;
  faturamentoTotal: number;
  ticketMedio: number;
  produtosCriticos: number;
  agendamentos: number;
  documentosAtivos: number;
}

export interface FiltrosRelatorio {
  dataInicial?: string;
  dataFinal?: string;
  tipoRelatorio?: string;
}

export type TipoRelatorio = 
  | 'GERAL' 
  | 'OS' 
  | 'FINANCEIRO' 
  | 'ESTOQUE' 
  | 'AGENDA' 
  | 'MANUAIS';

// For existing entities, we can use any or partial types if full types are not exported here
// Since we don't have access to all DTOs easily, we'll use generic structures mapped from backend
export interface RelatorioOS {
  id: string;
  numeroOS: number;
  placaVeiculo: string;
  status: string;
  valorFinal: number;
  criadoEm: string;
  cliente: { nome: string };
  responsavel?: { nome: string };
  pagamentos: { valor: number }[];
}

export interface RelatorioFinanceiro {
  totalFaturado: number;
  totalRecebido: number;
  totalPendente: number;
  ticketMedio: number;
  descontosConcedidos: number;
  osPagas: number;
  osPendentes: number;
  periodo: {
    dataInicial: string | null;
    dataFinal: string | null;
  };
}

export interface RelatorioEstoque {
  id: string;
  nome: string;
  categoria: string;
  quantityInStock: number;
  estoqueMinimo: number;
  status: string;
  precoVenda: number;
}

export interface RelatorioAgenda {
  id: string;
  dataInicio: string;
  dataFim: string | null;
  veiculoDesc: string;
  status: string;
  recurso: { nome: string };
}

export interface RelatorioManuais {
  id: string;
  titulo: string;
  area: string;
  tipo: string;
  categoria: string;
  status: string;
  versao: string;
  nivelAcesso: string;
  atualizadoEm: string;
}
