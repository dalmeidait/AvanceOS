import { api } from '@/lib/api';
import type { 
  ResumoEstatistico, 
  FiltrosRelatorio,
  RelatorioOS,
  RelatorioFinanceiro,
  RelatorioEstoque,
  RelatorioAgenda,
  RelatorioManuais
} from '../types/analisesRelatorios';

export const analisesRelatoriosService = {
  getResumo: async (filtros?: FiltrosRelatorio): Promise<ResumoEstatistico> => {
    const { data } = await api.get('/analises-relatorios/resumo', { params: filtros });
    return data;
  },

  getOs: async (filtros?: FiltrosRelatorio): Promise<RelatorioOS[]> => {
    const { data } = await api.get('/analises-relatorios/os', { params: filtros });
    return data;
  },

  getFinanceiro: async (filtros?: FiltrosRelatorio): Promise<RelatorioFinanceiro> => {
    const { data } = await api.get('/analises-relatorios/financeiro', { params: filtros });
    return data;
  },

  getEstoque: async (filtros?: FiltrosRelatorio): Promise<RelatorioEstoque[]> => {
    const { data } = await api.get('/analises-relatorios/estoque', { params: filtros });
    return data;
  },

  getAgenda: async (filtros?: FiltrosRelatorio): Promise<RelatorioAgenda[]> => {
    const { data } = await api.get('/analises-relatorios/agenda', { params: filtros });
    return data;
  },

  getManuais: async (filtros?: FiltrosRelatorio): Promise<RelatorioManuais[]> => {
    const { data } = await api.get('/analises-relatorios/manuais', { params: filtros });
    return data;
  },
};
