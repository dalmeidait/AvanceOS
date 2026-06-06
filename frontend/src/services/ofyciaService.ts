import { api } from '@/lib/api';

export interface LabTechDiagnostic {
  origem: string;
  tipo: string;
  arquivo: string;
  resumo?: string;
  dtcs: string[];
  leituras: any;
  sintomas: string[];
  observacoes: string;
  modulo?: string;
  sistema?: string;
  alvo?: string;
  categoria?: string;
  cenario?: string;
  gravidade?: string;
  placa?: string;
  numeroOS?: string;
  descricao?: string;
  processadoEm?: string;
}

export interface OfyciaAnalysisResponse {
  titulo: string;
  tipo: string;
  risco: 'BAIXO' | 'MEDIO' | 'ALTO';
  resumo: string;
  inconsistencias: string[];
  riscosIdentificados: string[];
  recomendacoes: string[];
  proximosPassos: string[];
  dadosAusentes: string[];
  diagnosticosLabTech?: LabTechDiagnostic[];
  diagnosticosAvancados?: LabTechDiagnostic[];
}

class OfyciaService {
  async analisarOs(id: string): Promise<OfyciaAnalysisResponse> {
    const { data } = await api.post<OfyciaAnalysisResponse>(`/ofycia/analisar-os/${id}`);
    return data;
  }
}

export const ofyciaService = new OfyciaService();
