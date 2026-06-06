import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, 
  Info, 
  ShieldAlert, 
  Activity, 
  CheckSquare, 
  Copy, 
  Check,
  CheckCircle2,
  FileText,
  Cpu,
  Loader2,
  Link,
  Target,
  AlertTriangle,
  Wrench,
  Package,
  MessageSquare
} from 'lucide-react'
import { api } from '@/lib/api'
import type { OrdemServico } from '@/types/ordem-servico'

type EditableItem = {
  key: string
  produtoId: string
  servicoId: string
  tipoItem: 'SERVICO' | 'PRODUTO' | 'INSUMO'
  servicoNome: string
  descricao: string
  quantidade: number
  valorUnitario: number
}

interface OsOfyciaSectionProps {
  ordem?: OrdemServico | null
  items?: EditableItem[]
  onApplyDiagnosticoSugerido?: (texto: string) => void
  onApplyExplicacaoCliente?: (texto: string) => void
}

function formatPreventiveInspectionItem(value: unknown): string {
  if (!value) return '--';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    const item = value as {
      status?: string;
      observation?: string;
      thicknessMm?: number;
    };

    const parts = [];

    if (item.status) {
      parts.push(`Status: ${item.status}`);
    }

    if (typeof item.thicknessMm === 'number') {
      parts.push(`Espessura: ${item.thicknessMm} mm`);
    }

    if (item.observation) {
      parts.push(item.observation);
    }

    return parts.length ? parts.join(' — ') : '--';
  }

  return '--';
}

const preventiveInspectionLabels: Record<string, string> = {
  engineOil: 'Óleo do motor',
  oilFilter: 'Filtro de óleo',
  airFilter: 'Filtro de ar',
  cabinFilter: 'Filtro de cabine',
  brakePadsFront: 'Pastilhas dianteiras',
  brakePadsRear: 'Pastilhas traseiras',
  brakeFluid: 'Fluido de freio',
  tires: 'Pneus',
  battery: 'Bateria',
  coolingSystem: 'Sistema de arrefecimento',
};

function isObdEvent(event: any) {
  return (event.dtcs && event.dtcs.length > 0) ||
         event.tensaoBateria != null ||
         event.rpmMarchaLenta != null ||
         event.temperaturaMotor != null ||
         event.diagnosticDescription;
}

function isPreventiveEvent(event: any) {
  return !!event.preventiveInspection;
}

function scoreTechHubEvent(event: any, ordemServico: any) {
  let score = 0;
  const placaOS = (ordemServico?.veiculo?.placa || ordemServico?.placaVeiculo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const placaEvent = (event.veiculo?.placa || event.veiculo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (placaOS && placaEvent && placaOS === placaEvent) {
    score += 100;
  }
  
  const osNum = String(ordemServico?.numeroOS || ordemServico?.numero || '');
  const eventNum = String(event.serviceOrderNumber || '');
  if (osNum && eventNum && osNum === eventNum) {
    score += 50;
  }
  
  if (event.timestamp) {
    score += new Date(event.timestamp).getTime() / 1000000000000;
  }
  
  return score;
}

export function OsOfyciaSection({ ordem, items, onApplyDiagnosticoSugerido }: OsOfyciaSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedDiagnostico, setAppliedDiagnostico] = useState(false);
  
  // TechHub State
  const [techHubStatus, setTechHubStatus] = useState<'LOADING' | 'SUCCESS' | 'ERROR' | 'MOCK'>('LOADING');
  const [techHubData, setTechHubData] = useState<any>(null);

  // IA State
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const handleAnaliseIA = async () => {
    if (!ordem) return;

    setAiAnalysisStatus('LOADING');
    try {
      const payload = {
        ordemServico: {
          id: ordem.id,
          descricao: ordem.descricao,
          diagnostico: ordem.diagnostico,
          relatoMecanico: ordem.relatoMecanico,
        },
        veiculo: {
          modelo: ordem.veiculo?.modelo || ordem.modeloVeiculo,
          ano: ordem.veiculo?.ano,
        },
        relatoCliente: ordem.descricao,
        techhubObd: techHubData?.obdEvent || {},
        techhubPreventiva: techHubData?.preventiveEvent || {}
      };

      const res = await api.post(`/ofycia/ia/analisar-os/${ordem.id}`, payload);
      setAiAnalysisResult(res.data);
      setAiAnalysisStatus('SUCCESS');
    } catch (err) {
      console.error(err);
      setAiAnalysisStatus('ERROR');
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchTechHub = async () => {
      try {
        const res = await api.get('/techhub/imports');
        const list = res.data?.data || res.data || [];
        
        if (Array.isArray(list) && list.length > 0) {
          const normalized = list.map((item: any) => {
            const sum = item.summary || item;
            return {
              origem: sum.source || sum.origem || item.origem || item.source || 'TechHub',
              statusLeitura: sum.status || sum.statusLeitura || item.statusLeitura || item.status || 'IMPORTADO',
              dtcs: sum.dtcs || sum.codes || sum.troubleCodes || sum.codigosFalha || sum.codigos_falha || sum.faultCodes || item.dtcs || item.codes || item.troubleCodes || item.codigosFalha || item.codigos_falha || item.faultCodes || item.obd?.dtcs || (item.obd?.dtcCode ? [item.obd.dtcCode] : []),
              tensaoBateria: sum.batteryVoltage ?? sum.tensaoBateria ?? sum.tensao_bateria ?? sum.voltage ?? item.tensaoBateria ?? item.tensao_bateria ?? item.batteryVoltage ?? item.battery_voltage ?? item.voltage ?? item.obd?.batteryVoltage ?? item.obd?.voltage ?? item.batteryTest?.voltage ?? item.batteryTest?.batteryVoltage ?? item.batteryTest?.voltageV ?? null,
              rpmMarchaLenta: sum.rpm ?? sum.rpmMarchaLenta ?? sum.engineRpm ?? sum.engine_rpm ?? item.rpmMarchaLenta ?? item.rpm ?? item.engineRpm ?? item.engine_rpm ?? item.obd?.rpm ?? item.obd?.engineRpm ?? null,
              temperaturaMotor: sum.coolantTemperatureC ?? sum.temperaturaMotor ?? sum.temperatura_motor ?? sum.tempMotor ?? sum.engineTemp ?? sum.engineTemperature ?? item.temperaturaMotor ?? item.temperatura_motor ?? item.tempMotor ?? item.coolantTemp ?? item.coolantTemperature ?? item.coolantTemperatureC ?? item.engineTemp ?? item.engineTemperature ?? item.engine_temperature ?? item.obd?.coolantTemperatureC ?? item.obd?.coolantTemperature ?? item.obd?.coolantTemp ?? item.obd?.engineTemperatureC ?? item.obd?.engineTemperature ?? item.obd?.engineTemp ?? null,
              timestamp: sum.createdAt || sum.timestamp || item.timestamp || item.createdAt || item.modifiedAt || null,
              veiculo: sum.vehiclePlate || sum.vehicle || sum.veiculo || item.veiculo || item.vehicle || null,
              diagnosticDescription: sum.diagnosticDescription || item.diagnostic?.description || item.diagnosticDescription || null,
              possibleCauses: sum.possibleCauses || item.diagnostic?.possibleCauses || item.possibleCauses || null,
              recommendedAction: sum.recommendedAction || item.diagnostic?.recommendedAction || item.recommendedAction || null,
              suggestedServices: sum.suggestedServices || item.diagnostic?.suggestedServices || item.suggestedServices || null,
              suggestedParts: sum.suggestedParts || item.diagnostic?.suggestedParts || item.suggestedParts || null,
              preventiveInspection: sum.preventiveInspection || item.preventiveInspection || null
            };
          });

          let bestObd = null;
          let bestPreventive = null;
          let maxObdScore = -1;
          let maxPreventiveScore = -1;

          for (const item of normalized) {
            const score = scoreTechHubEvent(item, ordem);
            if (score > 0) {
              if (isObdEvent(item) && score > maxObdScore) {
                bestObd = item;
                maxObdScore = score;
              }
              if (isPreventiveEvent(item) && score > maxPreventiveScore) {
                bestPreventive = item;
                maxPreventiveScore = score;
              }
            }
          }

          if (!bestObd && !bestPreventive) {
            const sorted = [...normalized].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            bestObd = sorted.find((i: any) => i.dtcs?.length > 0) || sorted[0];
          }

          if (mounted && (bestObd || bestPreventive)) {
            setTechHubData({ obdEvent: bestObd, preventiveEvent: bestPreventive });
            setTechHubStatus('SUCCESS');
          } else if (mounted) {
            setTechHubStatus('MOCK');
          }
        } else {
          if (mounted) setTechHubStatus('MOCK');
        }
      } catch (err) {
        if (mounted) setTechHubStatus('ERROR');
      }
    };
    
    if (ordem) {
      fetchTechHub();
    }
    
    return () => { mounted = false; };
  }, [ordem]);

  if (!ordem) return null;

  const handleCopy = async (text: string, id: string) => {
    if (!text || !text.trim()) {
      console.warn('Nenhum texto disponível para copiar.');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error('Fallback de cópia falhou.');
        }
      }

      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar texto da OFYCIA:', error);
      setCopiedId('erro');
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const cliente = ordem.cliente?.nome || 'Cliente não informado';
  const veiculo = ordem.veiculo?.modelo || ordem.modeloVeiculo || ordem.veiculo?.placa || ordem.placaVeiculo || '-';
  const hasServicoAprovado = ['APROVADA', 'APROVADA_PARA_EXECUCAO', 'EM_EXECUCAO', 'CONCLUIDA', 'ENTREGUE', 'PAGO'].includes(ordem.status || '');
  
  let resumo = `Esta OS envolve um veículo ${veiculo} do cliente ${cliente}. `;
  if (ordem.descricao) {
    resumo += `Relato inicial indica: "${ordem.descricao}". `;
  }
  if (!hasServicoAprovado) {
    resumo += `A OS está no status ${ordem.status || 'desconhecido'} e ainda não possui serviço aprovado.`;
  } else {
    resumo += `A OS está no status ${ordem.status || 'desconhecido'}.`;
  }

  const textoAnalise = [ordem.descricao, ordem.diagnostico, ordem.relatoMecanico]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // TECHHUB / OBD-II DATA
  const isMock = !techHubData;
  const hasObdEvent = !!(techHubData?.obdEvent || isMock);
  const hasPreventiveEvent = !!(techHubData?.preventiveEvent);
  
  const obdDemoData = techHubData?.obdEvent || techHubData || {
    origem: 'TechHub Simulado',
    dtcs: ['P0301', 'P0562'],
    tensaoBateria: 11.8,
    rpmMarchaLenta: 760,
    temperaturaMotor: 96,
    statusLeitura: 'SIMULADO',
    timestamp: new Date().toISOString(),
    veiculo: null
  };

  const preventiveDemoData = techHubData?.preventiveEvent || obdDemoData;

  const dtcMap: Record<string, { desc: string, rec: string }> = {
    'P0300': { desc: 'Falha de ignição aleatória/múltipla', rec: 'Verificar velas, bobinas, cabos, bicos injetores, compressão e combustível' },
    'P0301': { desc: 'Falha de ignição no cilindro 1', rec: 'Verificar vela, bobina, cabo, bico injetor e compressão do cilindro 1' },
    'P0302': { desc: 'Falha de ignição no cilindro 2', rec: 'Verificar vela, bobina, cabo, bico injetor e compressão do cilindro 2' },
    'P0171': { desc: 'Mistura pobre no banco 1', rec: 'Verificar entrada falsa de ar, sensor MAF/MAP, sonda lambda, pressão de combustível e bicos' },
    'P0172': { desc: 'Mistura rica no banco 1', rec: 'Verificar bicos, pressão de combustível, sensor MAF/MAP, sonda lambda e filtro de ar' },
    'P0420': { desc: 'Eficiência do catalisador abaixo do limite', rec: 'Verificar catalisador, sonda lambda pré/pós, escapamento e mistura ar/combustível' },
    'P0562': { desc: 'Tensão baixa no sistema', rec: 'Verificar bateria, alternador, cabos, aterramento e regulador de tensão' },
    'P0117': { desc: 'Sensor de temp. do líquido de arrefecimento com sinal baixo', rec: 'Verificar sensor ECT, chicote, conector e sistema de arrefecimento' },
    'P0128': { desc: 'Temperatura de arrefecimento abaixo do esperado', rec: 'Verificar válvula termostática, sensor ECT e sistema de arrefecimento' },
    'P0130': { desc: 'Falha no circuito da sonda lambda', rec: 'Verificar sensor O2, chicote, conector e mistura' },
    'P0500': { desc: 'Falha no sensor de velocidade do veículo', rec: 'Verificar sensor VSS, chicote, conector e painel/módulo' },
  };

  const techHubAlerts: string[] = [];
  if (obdDemoData.tensaoBateria != null && obdDemoData.tensaoBateria < 12.0) {
    techHubAlerts.push('Tensão de bateria abaixo do ideal. Recomenda-se teste de bateria e alternador.');
  }
  if (obdDemoData.temperaturaMotor != null && obdDemoData.temperaturaMotor > 105) {
    techHubAlerts.push('Temperatura elevada. Verificar sistema de arrefecimento.');
  }
  
  const safeDtcs = Array.isArray(obdDemoData.dtcs) ? obdDemoData.dtcs : [];
  safeDtcs.forEach((dtc: string) => {
    if (dtc.startsWith('P03')) {
      techHubAlerts.push(`Falha de ignição detectada (${dtc}). Evitar conclusão sem teste de velas, bobinas e compressão.`);
    }
    if (dtc === 'P0562') {
      techHubAlerts.push(`Possível falha no sistema de carga elétrica (${dtc}).`);
    }
    if (dtc === 'P0420') {
      techHubAlerts.push(`Antes de condenar catalisador, validar sondas e mistura (${dtc}).`);
    }
  });

  const cruzamentoTechHub: string[] = [];
  let hasInjecaoCross = false;
  safeDtcs.forEach((dtc: string) => {
    if (dtc.startsWith('P03') && /(falhando|perda de potência|luz da injeção)/.test(textoAnalise)) {
      cruzamentoTechHub.push(`Há coerência entre o relato do cliente e o DTC ${dtc}.`);
      hasInjecaoCross = true;
    }
    if (dtc === 'P0562' && /(bateria|partida fraca|não liga)/.test(textoAnalise)) {
      cruzamentoTechHub.push(`Há coerência entre o relato e a baixa tensão do sistema.`);
    }
  });

  const isDtcInjecao = safeDtcs.some((d: string) => d.startsWith('P01') || d.startsWith('P03') || d.startsWith('P04'));
  if (isDtcInjecao && !hasInjecaoCross && !/(falhando|perda de potência|luz da injeção)/.test(textoAnalise)) {
    cruzamentoTechHub.push('Há código técnico relevante que deve ser investigado mesmo sem relato específico do cliente.');
  }

  // --- RASTREABILIDADE E CONFIANÇA ---
  let placaMatch = false;
  const placaOSClean = (ordem?.veiculo?.placa || ordem?.placaVeiculo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const placaTechHubClean = (obdDemoData?.veiculo?.placa || obdDemoData?.veiculo || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (placaOSClean && placaTechHubClean && placaOSClean === placaTechHubClean) {
    placaMatch = true;
  }

  let nivelConfianca = 'Demonstrativa';
  const evidenciasPositivas: string[] = [];
  const alertasDivergencia: string[] = [];

  if (isMock) {
    nivelConfianca = 'Demonstrativa';
    alertasDivergencia.push('Dados demonstrativos locais em uso (nenhum evento TechHub importado localizado)');
  } else {
    let score = 0;
    
    if (placaMatch) {
      score += 3;
      evidenciasPositivas.push('Placa do evento compatível com a OS');
    } else if (!placaTechHubClean) {
      alertasDivergencia.push('Evento TechHub sem placa informada. A associação foi feita por relevância técnica.');
    } else {
      score -= 2;
      alertasDivergencia.push('A placa do evento TechHub não corresponde à placa da OS. A associação foi mantida apenas por relevância técnica e deve ser validada.');
    }

    if (safeDtcs.length > 0) {
      score += 2;
      evidenciasPositivas.push('Evento possui DTCs ativos');
    } else {
      alertasDivergencia.push('Evento sem DTCs ativos');
    }

    if (obdDemoData.timestamp) {
      score += 1;
      evidenciasPositivas.push('Evento possui timestamp informado');
    } else {
      alertasDivergencia.push('Evento sem timestamp');
    }

    if (obdDemoData.tensaoBateria != null && obdDemoData.tensaoBateria < 12.0) {
      evidenciasPositivas.push('Tensão de bateria abaixo do ideal detectada');
    }
    if (obdDemoData.temperaturaMotor != null && obdDemoData.temperaturaMotor > 105) {
      evidenciasPositivas.push('Temperatura do motor acima do limite detectada');
    }

    if (cruzamentoTechHub.length > 0) {
      score += 2;
      evidenciasPositivas.push('Relato do cliente coerente com DTC ou parâmetros técnicos da leitura');
    }

    if (isDtcInjecao && !hasInjecaoCross && !/(falhando|perda de potência|luz da injeção)/.test(textoAnalise)) {
      alertasDivergencia.push('Há DTCs relevantes mesmo sem relato direto do cliente. Recomenda-se investigação técnica.');
    }
    
    if (score >= 5) {
      nivelConfianca = 'Alta';
    } else if (score >= 2) {
      nivelConfianca = 'Média';
    } else {
      nivelConfianca = 'Baixa';
    }
  }

  // Hipóteses Base (OFYCIA v1)
  const hipoteses: string[] = [];
  const verificacoes: string[] = [];
  const pecasSugeridas: string[] = [];
  const servicosSugeridos: string[] = [];
  const checklists: { title: string; items: string[] }[] = [];

  if (/(bateria|partida fraca|não liga|luz da bateria|alternador)/.test(textoAnalise)) {
    hipoteses.push('Falha no sistema elétrico de partida/carga');
    verificacoes.push('Verificar tensão da bateria', 'Testar alternador', 'Verificar cabos e aterramento', 'Avaliar motor de partida');
    pecasSugeridas.push('Bateria', 'Alternador');
    servicosSugeridos.push('Diagnóstico elétrico', 'Teste de bateria e alternador');
    checklists.push({
      title: 'Bateria / Partida',
      items: ['Medir tensão da bateria em repouso', 'Medir tensão durante a partida', 'Testar alternador em marcha lenta', 'Verificar cabos, bornes e aterramento', 'Avaliar motor de partida']
    });
  }

  if (/(freio|pedal baixo|barulho ao frear|pastilha|disco)/.test(textoAnalise)) {
    hipoteses.push('Desgaste ou vazamento no sistema de freios');
    verificacoes.push('Verificar pastilhas', 'Verificar discos', 'Verificar fluido de freio', 'Verificar cilindro mestre', 'Inspecionar vazamentos');
    pecasSugeridas.push('Pastilhas de freio', 'Disco de freio', 'Fluido de freio');
    servicosSugeridos.push('Diagnóstico de freio');
    checklists.push({
      title: 'Sistema de Freio',
      items: ['Verificar nível do fluido de freio', 'Inspecionar pastilhas e discos', 'Verificar vazamentos', 'Testar pedal de freio', 'Avaliar cilindro mestre']
    });
  }

  if (/(ar condicionado|não gela|compressor|gás|ventilação)/.test(textoAnalise)) {
    hipoteses.push('Vazamento de gás ou falha no compressor');
    verificacoes.push('Verificar carga de gás', 'Testar compressor', 'Avaliar condensador', 'Inspecionar filtro de cabine', 'Verificar vazamentos no sistema');
    pecasSugeridas.push('Filtro de cabine', 'Gás refrigerante');
    servicosSugeridos.push('Diagnóstico de ar-condicionado');
    checklists.push({
      title: 'Ar-condicionado',
      items: ['Verificar carga de gás', 'Conferir compressor', 'Verificar filtro de cabine', 'Avaliar condensador', 'Procurar vazamentos']
    });
  }

  if (/(óleo|vazamento|fumaça|motor|aquecimento)/.test(textoAnalise)) {
    hipoteses.push('Vazamento de óleo ou falha de arrefecimento');
    verificacoes.push('Verificar nível de óleo', 'Inspecionar vazamentos', 'Avaliar junta do cabeçote', 'Verificar sistema de arrefecimento', 'Testar bomba d\'água', 'Verificar radiador');
    pecasSugeridas.push('Filtro de óleo', 'Óleo do motor', 'Aditivo de radiador');
    servicosSugeridos.push('Revisão do sistema de arrefecimento', 'Inspeção visual de vazamentos');
    checklists.push({
      title: 'Arrefecimento',
      items: ['Verificar nível do líquido de arrefecimento', 'Verificar vazamentos', 'Testar válvula termostática', 'Avaliar radiador', 'Verificar ventoinha', 'Avaliar bomba d\'água']
    });
  }

  if (/(injeção|luz da injeção|falhando|perda de potência|consumo alto)/.test(textoAnalise)) {
    hipoteses.push('Anomalia no sistema de injeção eletrônica');
    verificacoes.push('Leitura de códigos de falha', 'Testar velas', 'Verificar bobinas', 'Avaliar bicos injetores', 'Testar sensores', 'Inspecionar corpo de borboleta');
    pecasSugeridas.push('Velas de ignição', 'Bobinas de ignição');
    servicosSugeridos.push('Scanner automotivo', 'Diagnóstico de injeção');
    checklists.push({
      title: 'Sistema de Injeção',
      items: ['Realizar leitura com scanner', 'Verificar velas', 'Verificar bobinas', 'Verificar bicos injetores', 'Avaliar sensores principais']
    });
  }

  const alertas: string[] = [];
  const servicos = (items || []).filter((item) => !item.produtoId);
  const pecas = (items || []).filter((item) => item.produtoId);
  const isPaga = ordem.status === 'PAGO' || ordem.statusFinanceiro === 'PAGO' || ordem.statusFinanceiro === 'QUITADO';
  const totalGeral = Number(ordem.totalGeral || 0);

  if (!ordem.diagnostico) alertas.push('A OS ainda não possui diagnóstico técnico registrado.');
  if (pecas.length > 0 && servicos.length === 0) alertas.push('A OS possui peças, mas ainda não possui serviço vinculado.');
  if (totalGeral > 0 && !['APROVADA', 'APROVADA_PARA_EXECUCAO', 'EM_EXECUCAO', 'CONCLUIDA', 'PAGO', 'ENTREGUE'].includes(ordem.status || '')) alertas.push('A OS possui valor, mas ainda não consta aprovação.');
  if (isPaga && !['CONCLUIDA', 'ENTREGUE'].includes(ordem.status || '')) alertas.push('A OS está paga, mas não parece concluída.');
  if (ordem.status === 'CONCLUIDA' && !ordem.relatoMecanico) alertas.push('A OS está concluída, mas sem relato técnico final.');
  if (/(fumaça|não liga|falhando|perda de potência|partida fraca)/.test(textoAnalise) && !ordem.diagnostico) alertas.push('Existe relato de falha crítica; recomenda-se registrar diagnóstico antes do orçamento.');

  // Calculando Criticidade
  let criticidade = 'Baixa';
  if (/(freio falhando|superaquecimento severo|fumaça intensa|risco de pane|perda total de potência|direção dura|risco de segurança|veículo não liga)/.test(textoAnalise)) {
    criticidade = 'Crítica';
  } else if (isPaga && !['CONCLUIDA', 'ENTREGUE'].includes(ordem.status || '')) {
    criticidade = 'Crítica';
  } else if (ordem.status === 'CONCLUIDA' && !ordem.diagnostico) {
    criticidade = 'Crítica';
  } else if (/(perda de potência|falha intermitente|aquecimento|vazamento|luz de injeção|falha elétrica|freio|fumaça)/.test(textoAnalise)) {
    criticidade = 'Alta';
  } else if (!ordem.diagnostico || (totalGeral > 0 && !['APROVADA', 'APROVADA_PARA_EXECUCAO', 'EM_EXECUCAO', 'CONCLUIDA', 'PAGO', 'ENTREGUE'].includes(ordem.status || '')) || (pecas.length > 0 && servicos.length === 0) || (ordem.status === 'CONCLUIDA' && !ordem.relatoMecanico)) {
    criticidade = 'Média';
  }

  // Impacto OBD na Criticidade
  if (safeDtcs.some((d: string) => d.startsWith('P03')) && /(perda de potência|falhando|fumaça)/.test(textoAnalise)) {
    if (criticidade === 'Baixa' || criticidade === 'Média') criticidade = 'Alta';
  }
  if (safeDtcs.includes('P0562') && obdDemoData.tensaoBateria != null && obdDemoData.tensaoBateria < 12.0) {
    if (criticidade === 'Baixa') criticidade = 'Média';
  }
  if (obdDemoData.temperaturaMotor != null && obdDemoData.temperaturaMotor > 105 && criticidade !== 'Crítica') criticidade = 'Alta';
  if (obdDemoData.temperaturaMotor != null && obdDemoData.temperaturaMotor > 115) criticidade = 'Crítica';
  if (safeDtcs.includes('P0420') && criticidade === 'Baixa') criticidade = 'Média';
  if (safeDtcs.length > 1) {
    if (criticidade === 'Baixa') criticidade = 'Média';
    else if (criticidade === 'Média') criticidade = 'Alta';
    else if (criticidade === 'Alta') criticidade = 'Crítica';
  }

  const badgeColors: Record<string, string> = {
    'Baixa': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    'Média': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    'Alta': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
    'Crítica': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
  };

  const confiancaBadgeColors: Record<string, string> = {
    'Alta': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300',
    'Média': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300',
    'Baixa': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300',
    'Demonstrativa': 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  }

  const badgeColor = badgeColors[criticidade] || badgeColors['Baixa'];

  // Plano de Ação
  const planoAcao: string[] = [];
  planoAcao.push('1. Confirmar relato do cliente');
  if (!ordem.diagnostico) {
    planoAcao.push('2. Registrar diagnóstico técnico inicial');
    planoAcao.push('3. Executar testes recomendados');
    planoAcao.push('4. Adicionar serviços e peças necessários');
    planoAcao.push('5. Gerar orçamento e solicitar aprovação');
  } else if (servicos.length === 0 && pecas.length === 0) {
    planoAcao.push('2. Adicionar serviços e peças necessários');
    planoAcao.push('3. Solicitar aprovação do orçamento');
  } else if (totalGeral > 0 && !['APROVADA', 'APROVADA_PARA_EXECUCAO', 'EM_EXECUCAO', 'CONCLUIDA', 'PAGO', 'ENTREGUE'].includes(ordem.status || '')) {
    planoAcao.push('2. Solicitar aprovação do cliente para execução');
  } else if (['APROVADA', 'APROVADA_PARA_EXECUCAO'].includes(ordem.status || '')) {
    planoAcao.push('2. Executar serviços aprovados');
  } else if (ordem.status === 'EM_EXECUCAO') {
    planoAcao.push('2. Finalizar execução do serviço e preencher laudo');
  } else if (ordem.status === 'CONCLUIDA' && !isPaga) {
    planoAcao.push('2. Encaminhar para pagamento');
  } else if (isPaga && ordem.status !== 'ENTREGUE') {
    planoAcao.push('2. Finalizar OS e entregar veículo');
  }
  
  const checklistCopiar = `Checklist técnico sugerido pela OFYCIA:\n` + checklists.map(c => `[ ] ${c.items.join('\n[ ] ')}`).join('\n');

  // Relatório Técnico Assistido Blocos
  let relatorioInterno = `Com base no relato informado, recomenda-se iniciar a análise técnica geral. As hipóteses listadas pela OFYCIA devem ser confirmadas por testes técnicos antes da aprovação final do orçamento.`;
  if (/(bateria|partida fraca|não liga|luz da bateria|alternador)/.test(textoAnalise)) {
    relatorioInterno = `Com base no relato informado, a OS apresenta indícios relacionados ao sistema elétrico de partida. Recomenda-se iniciar a análise pela bateria, alternador, cabos de alimentação, aterramento e motor de partida. As hipóteses listadas pela OFYCIA devem ser confirmadas por testes técnicos antes da aprovação final do orçamento.`;
  } else if (/(freio|pedal baixo|barulho ao frear|pastilha|disco)/.test(textoAnalise)) {
    relatorioInterno = `Com base no relato informado, a OS apresenta indícios relacionados ao sistema de freios. Recomenda-se inspecionar os componentes de segurança (pastilhas, discos, fluido e cilindro mestre). As hipóteses listadas pela OFYCIA devem ser confirmadas por testes técnicos antes da aprovação final do orçamento.`;
  } else if (/(ar condicionado|não gela|compressor|gás|ventilação)/.test(textoAnalise)) {
    relatorioInterno = `Com base no relato informado, a OS apresenta indícios relacionados ao sistema de climatização. Recomenda-se investigar a eficiência do ar-condicionado, compressor e integridade do circuito. As hipóteses listadas pela OFYCIA devem ser confirmadas por testes técnicos antes da aprovação final do orçamento.`;
  } else if (/(óleo|vazamento|fumaça|motor|aquecimento)/.test(textoAnalise)) {
    relatorioInterno = `Com base no relato informado, a OS apresenta indícios relacionados ao sistema de arrefecimento e lubrificação do motor. Recomenda-se verificar estanqueidade e integridade dos componentes internos. As hipóteses listadas pela OFYCIA devem ser confirmadas por testes técnicos antes da aprovação final do orçamento.`;
  } else if (/(injeção|luz da injeção|falhando|perda de potência|consumo alto)/.test(textoAnalise)) {
    relatorioInterno = `Com base no relato informado, a OS apresenta indícios relacionados à injeção eletrônica. Recomenda-se avaliação detalhada via scanner automotivo e testes elétricos dos atuadores e sensores. As hipóteses listadas pela OFYCIA devem ser confirmadas por testes técnicos antes da aprovação final do orçamento.`;
  } else if (!ordem.diagnostico) {
    relatorioInterno = `A OS encontra-se incompleta no momento, aguardando diagnóstico técnico. Recomenda-se que o responsável registre formalmente o diagnóstico antes de prosseguir com o orçamento.`;
  }

  let justificativa = "";
  if (pecas.length > 0 || servicos.length > 0) {
    justificativa = `A OS já possui itens adicionados, portanto recomenda-se validar se todos estão tecnicamente relacionados ao diagnóstico registrado. A inclusão final deve ocorrer somente após confirmação técnica.`;
  } else {
    justificativa = `A OS ainda não possui serviços ou peças adicionados. Recomenda-se concluir o diagnóstico antes da composição do orçamento.`;
  }

  let explicacaoCliente = `Identificamos que o relato pode estar relacionado a um comportamento atípico do veículo. A oficina realizará verificações técnicas para confirmar a causa, caso a caso, antes de apresentar o orçamento final.`;
  if (/(bateria|partida fraca|não liga|luz da bateria|alternador)/.test(textoAnalise)) {
    explicacaoCliente = `Identificamos que o relato pode estar relacionado ao sistema de partida do veículo. A oficina realizará verificações técnicas na bateria e conexões para confirmar a causa antes de apresentar o orçamento.`;
  } else if (/(freio|pedal baixo|barulho ao frear|pastilha|disco)/.test(textoAnalise)) {
    explicacaoCliente = `Identificamos que o relato pode estar relacionado aos freios. A oficina fará uma inspeção nos itens de segurança para confirmar o diagnóstico.`;
  } else if (/(ar condicionado|não gela|compressor|gás|ventilação)/.test(textoAnalise)) {
    explicacaoCliente = `Identificamos que o relato pode estar relacionado ao sistema de ar-condicionado. A oficina fará testes no sistema de refrigeração para confirmar a necessidade de reparo.`;
  } else if (/(injeção|luz da injeção|falhando|perda de potência|consumo alto)/.test(textoAnalise)) {
    explicacaoCliente = `Identificamos que o relato pode estar relacionado à injeção eletrônica. Faremos a leitura de parâmetros via scanner para rastrear a anomalia com exatidão.`;
  } else if (/(óleo|vazamento|fumaça|motor|aquecimento)/.test(textoAnalise)) {
    explicacaoCliente = `Identificamos que o relato aponta para possíveis desgastes ou vazamentos. Realizaremos uma inspeção minuciosa no motor e arrefecimento para formular nossa recomendação.`;
  }

  const checklistEntrega: string[] = [
    'Confirmar que o serviço foi executado',
    'Conferir se não há alertas operacionais pendentes',
    'Registrar observação final da OS',
  ];
  if (isPaga) checklistEntrega.push('Confirmar baixa financeira e recibo/comprovante');
  else checklistEntrega.push('Confirmar pagamento, se aplicável');
  if (pecas.length > 0) checklistEntrega.push('Conferir baixa de estoque das peças utilizadas');
  if (ordem.diagnostico) checklistEntrega.push('Conferir se o diagnóstico registrado está coerente com os serviços executados');
  checklistEntrega.push('Validar entrega com o cliente', 'Anexar documentos ou comprovantes, se necessário');
  
  const checklistEntregaCopiar = checklistEntrega.map(i => `[ ] ${i}`).join('\n');

  let obsFinal = "Serviço analisado conforme relato do cliente. Recomendações técnicas apresentadas pela OFYCIA devem ser validadas pelo profissional responsável antes do fechamento definitivo da OS.";
  if (ordem.diagnostico) obsFinal = "Diagnóstico técnico registrado e recomendações avaliadas conforme informações disponíveis na OS.";

  let pontosPendentes = "Não foram identificadas pendências operacionais críticas pela OFYCIA.";
  if (alertas.length > 0) pontosPendentes = alertas.map(a => `- ${a}`).join('\n');

  const techHubReportText = isMock 
    ? `Foram usados dados demonstrativos locais, pois nenhum evento TechHub importado foi localizado. Os códigos identificados (${safeDtcs.join(', ') || 'Nenhum'}) indicam possível necessidade de verificação sistêmica. Recomenda-se validar os achados por testes presenciais.`
    : `Dados importados do TechHub foram considerados nesta análise. A leitura do evento indicou os códigos ${safeDtcs.join(', ') || 'Nenhum'}. Recomenda-se validar os achados por testes presenciais antes de aprovar orçamento.`;

  const rastreabilidadeCopiar = `=== RASTREABILIDADE TECHHUB ===
Evento associado automaticamente com confiança [${nivelConfianca}].
Origem: ${obdDemoData.origem || 'N/A'} | Status: ${obdDemoData.statusLeitura || 'N/A'} | Timestamp: ${obdDemoData.timestamp || 'N/A'}

EVIDÊNCIAS POSITIVAS:
${evidenciasPositivas.length > 0 ? evidenciasPositivas.map(e => `- ${e}`).join('\n') : '- Nenhuma evidência forte localizada.'}

ALERTAS / DIVERGÊNCIAS:
${alertasDivergencia.length > 0 ? alertasDivergencia.map(a => `- ${a}`).join('\n') : '- Nenhum alerta de divergência na associação.'}

Ressalva: A seleção do evento foi automática por IA. O laudo final pertence ao técnico responsável.`;

  const relatorioCompletoCopiar = `=== RELATÓRIO TÉCNICO ASSISTIDO ===
\n1. RASTREABILIDADE TECHHUB
O evento TechHub foi associado automaticamente à OS com confiança [${nivelConfianca}]. Critérios considerados: ${evidenciasPositivas.length > 0 ? evidenciasPositivas.join(', ') : 'Associação demonstrativa/fallback local'}.
\n2. DADOS TECHHUB / OBD-II
${techHubReportText}
\n3. RELATÓRIO TÉCNICO INTERNO
${relatorioInterno}
\n4. JUSTIFICATIVA TÉCNICA DO ORÇAMENTO
${justificativa}
\n5. EXPLICAÇÃO RESUMIDA AO CLIENTE
${explicacaoCliente}
\n6. CHECKLIST DE ENTREGA\n${checklistEntregaCopiar}
\n7. OBSERVAÇÃO FINAL SUGERIDA
${obsFinal}
\n8. PONTOS PENDENTES DA OS
${pontosPendentes}`;

  const dtcsListDisplay = safeDtcs.length > 0 ? safeDtcs.join(', ') : 'Nenhum DTC ativo';
  const obdAnalysisCopiar = `=== ANÁLISE TECHHUB / OBD-II ${isMock ? '(SIMULADO)' : '(IMPORTADO)'} ===\nDTCs: ${dtcsListDisplay}\nTensão Bateria: ${obdDemoData.tensaoBateria ?? 'N/A'}V | Temp: ${obdDemoData.temperaturaMotor ?? 'N/A'}°C | RPM: ${obdDemoData.rpmMarchaLenta ?? 'N/A'}`;
  
  const obdDtcsCopiar = `INTERPRETAÇÃO DE DTCs:\n` + (safeDtcs.length > 0 ? safeDtcs.map((d: string) => `- ${d}: ${dtcMap[d]?.desc || 'Desconhecido'}\n  Recomendação: ${dtcMap[d]?.rec || 'N/A'}`).join('\n') : 'Nenhum DTC para interpretar.');
  const obdAlertasCopiar = techHubAlerts.length > 0 ? `ALERTAS TÉCNICOS:\n` + techHubAlerts.map(a => `- ${a}`).join('\n') : 'Sem alertas técnicos relevantes.';

  // UX Status
  let techHubStatusText = "Carregando eventos TechHub...";
  let techHubStatusColor = "text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700";
  let techHubBadgeClass = "bg-violet-200 text-violet-800 dark:bg-violet-800 dark:text-violet-200";
  let techHubBadgeLabel = "Simulado";

  if (techHubStatus === 'SUCCESS') {
    techHubStatusText = "Eventos TechHub carregados";
    techHubStatusColor = "text-emerald-700 bg-emerald-100 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50";
    techHubBadgeClass = "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200";
    techHubBadgeLabel = "Importado";
  } else if (techHubStatus === 'ERROR') {
    techHubStatusText = "TechHub indisponível no momento — Usando demonstração local";
    techHubStatusColor = "text-amber-700 bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50";
  } else if (techHubStatus === 'MOCK') {
    techHubStatusText = "Nenhum evento localizado — Usando dados demonstrativos locais";
    techHubStatusColor = "text-amber-700 bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50";
  }

  const buttonClass = "h-8 px-3 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900";

  return (
    <Card className="scroll-mt-6 overflow-hidden border-cyan-400/30 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(8,145,178,0.10),rgba(15,23,42,0.04))] shadow-[0_16px_40px_rgba(8,145,178,0.12)] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.45),rgba(2,6,23,0.75))]" id="os-ofycia">
      
      {/* Avisos de Segurança Operacional */}
      <div className="bg-amber-100/80 border-b border-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 py-3 px-4 text-xs font-medium space-y-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <p className="font-semibold">A OFYCIA não executa alterações automáticas na OS.</p>
        </div>
        <p className="text-amber-700/80 dark:text-amber-400/80 pl-6">
          Toda sugestão deve ser revisada e confirmada pelo usuário. Os textos gerados são sugestões auxiliares e não substituem o laudo técnico formal do profissional.
        </p>
        <p className="text-amber-700/80 dark:text-amber-400/80 pl-6 italic">
          Os dados OBD-II apresentados nesta versão são simulados/demonstrativos, salvo quando houver integração real configurada. Mesmo quando importados pelo TechHub, os dados devem ser validados por scanner profissional e inspeção presencial.
        </p>
      </div>

      <CardHeader className="pb-3 border-b border-cyan-500/10 dark:border-cyan-500/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="font-semibold text-foreground text-lg">OFYCIA - Análise Assistiva</h3>
        </div>
        <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
          Criticidade: {criticidade}
        </div>
      </CardHeader>
      
      <CardContent className="grid gap-6 pt-5 text-sm text-cyan-950 dark:text-cyan-50">
        
        {copiedId === 'erro' && (
          <div className="bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 p-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>Não foi possível copiar automaticamente. Selecione o texto manualmente.</p>
          </div>
        )}

        {/* PAINEL OPERACIONAL DA OFYCIA */}
        <div className="space-y-4 mb-8">
          <h4 className="font-semibold flex items-center gap-1.5 text-foreground text-base">
            <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /> Painel operacional da OFYCIA
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Status da OS</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{ordem.status || 'Desconhecido'}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Criticidade Estimada</p>
              <p className={`text-sm font-bold ${criticidade === 'Crítica' ? 'text-rose-600 dark:text-rose-400' : criticidade === 'Alta' ? 'text-orange-600 dark:text-orange-400' : criticidade === 'Média' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {criticidade}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Total de Serviços</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{servicos.length}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Total de Peças</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{pecas.length}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Valor Total da OS</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">TechHub / OBD-II</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{hasObdEvent ? 'Sim' : 'Não'}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Inspeção Preventiva</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{hasPreventiveEvent ? 'Sim' : 'Não'}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Risco Ambiental</p>
              <p className={`text-sm font-bold ${/(vazamento|óleo|fumaça|fluido|gás|bateria|catalisador)/.test(textoAnalise) ? (/(vazamento intenso|muita fumaça)/.test(textoAnalise) ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400') : 'text-emerald-600 dark:text-emerald-400'}`}>
                {/(vazamento|óleo|fumaça|fluido|gás|bateria|catalisador)/.test(textoAnalise) ? (/(vazamento intenso|muita fumaça)/.test(textoAnalise) ? 'Alto' : 'Médio') : 'Baixo'}
              </p>
            </div>
          </div>
        </div>

        {/* === BLOCO TECHHUB === */}
        <div className="rounded-xl border border-violet-300/40 bg-violet-50/50 p-4 shadow-sm dark:border-violet-700/50 dark:bg-violet-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="font-semibold text-violet-900 dark:text-violet-200 text-base flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Análise TechHub / OBD-II 
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ml-1 ${techHubBadgeClass}`}>
                  {techHubBadgeLabel}
                </span>
              </h3>
              <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase border font-semibold flex items-center gap-1 ${techHubStatusColor}`}>
                {techHubStatus === 'LOADING' && <Loader2 className="h-3 w-3 animate-spin" />}
                {techHubStatusText}
              </div>
            </div>
            
            <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(obdAnalysisCopiar, 'obd_analysis')} disabled={techHubStatus === 'LOADING'}>
              {copiedId === 'obd_analysis' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar Resumo
            </Button>
          </div>

          {/* Rastreabilidade da Associação */}
          <div className="mb-5 bg-white/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5" />
                Rastreabilidade da Associação TechHub
              </h4>
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="h-6 px-2 text-[10px] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" onClick={() => handleCopy(rastreabilidadeCopiar, 'rastreabilidade')}>
                  {copiedId === 'rastreabilidade' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar Rastreabilidade
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-4 text-xs">
              
              {hasObdEvent && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-violet-700 dark:text-violet-400 mb-1 border-b pb-1">Evento OBD-II</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Origem:</span> {obdDemoData.origem || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Status:</span> {obdDemoData.statusLeitura || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Veículo:</span> {obdDemoData.veiculo?.placa || obdDemoData.veiculo || 'Não informado'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Timestamp:</span> {obdDemoData.timestamp ? new Date(obdDemoData.timestamp).toLocaleString() : 'N/A'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Qtd. DTCs:</span> {safeDtcs.length}</p>
                    <p>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Confiança:</span>{' '}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${confiancaBadgeColors[nivelConfianca] || confiancaBadgeColors.Demonstrativa}`}>
                        {nivelConfianca}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-3 border-l border-slate-200/60 dark:border-slate-800/60 pl-4">
                    {evidenciasPositivas.length > 0 && (
                      <div>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="h-3 w-3" /> Critérios Atendidos
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-emerald-600/90 dark:text-emerald-400/80">
                          {evidenciasPositivas.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                    {alertasDivergencia.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-600 dark:text-amber-500 flex items-center gap-1 mb-1">
                          <AlertTriangle className="h-3 w-3" /> Divergências / Alertas
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-amber-700/80 dark:text-amber-400/80">
                          {alertasDivergencia.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasObdEvent && hasPreventiveEvent && <div className="border-t border-slate-200/60 dark:border-slate-800/60" />}

              {hasPreventiveEvent && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-teal-700 dark:text-teal-400 mb-1 border-b pb-1">Evento Preventivo</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Origem:</span> {preventiveDemoData.origem || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Status:</span> {preventiveDemoData.statusLeitura || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Veículo:</span> {preventiveDemoData.veiculo?.placa || preventiveDemoData.veiculo || 'Não informado'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Timestamp:</span> {preventiveDemoData.timestamp ? new Date(preventiveDemoData.timestamp).toLocaleString() : 'N/A'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">Itens Preventivos:</span> {preventiveDemoData.preventiveInspection ? Object.keys(preventiveDemoData.preventiveInspection).length : 0}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {hasObdEvent ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="bg-white/70 dark:bg-slate-950/50 p-2 rounded-lg border border-violet-200/50 dark:border-violet-800/50">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Tensão (Bateria)</p>
                  <p className={`text-lg font-bold ${obdDemoData.tensaoBateria != null && obdDemoData.tensaoBateria < 12.0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {obdDemoData.tensaoBateria != null ? `${obdDemoData.tensaoBateria}V` : '--'}
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-slate-950/50 p-2 rounded-lg border border-violet-200/50 dark:border-violet-800/50">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Temp. Motor</p>
                  <p className={`text-lg font-bold ${obdDemoData.temperaturaMotor != null && obdDemoData.temperaturaMotor > 105 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {obdDemoData.temperaturaMotor != null ? `${obdDemoData.temperaturaMotor}°C` : '--'}
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-slate-950/50 p-2 rounded-lg border border-violet-200/50 dark:border-violet-800/50">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">RPM</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {obdDemoData.rpmMarchaLenta != null ? obdDemoData.rpmMarchaLenta : '--'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interpretação de DTCs</span>
                    {safeDtcs.length > 0 && (
                      <Button variant="ghost" className="h-6 px-2 text-[10px] hover:bg-violet-100 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300" onClick={() => handleCopy(obdDtcsCopiar, 'obd_dtcs')}>
                        {copiedId === 'obd_dtcs' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {safeDtcs.length > 0 ? safeDtcs.map((dtc: string) => (
                      <div key={dtc} className="bg-white/60 dark:bg-slate-950/50 p-2.5 rounded-lg border border-violet-200/50 dark:border-violet-800/50">
                        <p className="font-bold text-violet-800 dark:text-violet-300 mb-0.5">{dtc}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{dtcMap[dtc]?.desc || 'Desconhecido'}</p>
                        <p className="text-xs text-muted-foreground mt-1"><span className="font-semibold text-slate-500">Causas/Verificações:</span> {dtcMap[dtc]?.rec || '-'}</p>
                      </div>
                    )) : (
                      <div className="bg-white/60 dark:bg-slate-950/50 p-2.5 rounded-lg border border-violet-200/50 dark:border-violet-800/50 text-center text-muted-foreground">
                        Nenhum código de falha (DTC) ativo no momento.
                      </div>
                    )}
                  </div>
                </div>

                {techHubAlerts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-500">Alertas Técnicos OBD</span>
                      <Button variant="ghost" className="h-6 px-2 text-[10px] hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-400" onClick={() => handleCopy(obdAlertasCopiar, 'obd_alerts')}>
                        {copiedId === 'obd_alerts' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                      </Button>
                    </div>
                    <ul className="list-disc pl-5 text-amber-800 dark:text-amber-400 space-y-0.5 text-sm">
                      {techHubAlerts.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}

                {cruzamentoTechHub.length > 0 && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 p-3 rounded-lg">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-1.5 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" /> Cruzamento com Relato da OS
                    </span>
                    <ul className="list-disc pl-5 text-indigo-800 dark:text-indigo-300 space-y-0.5 text-sm">
                      {cruzamentoTechHub.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {(obdDemoData.diagnosticDescription || obdDemoData.possibleCauses || obdDemoData.recommendedAction || obdDemoData.suggestedServices || obdDemoData.suggestedParts) && (
                  <div className="bg-white/70 dark:bg-slate-950/40 p-3 rounded-lg border border-violet-200/50 dark:border-violet-800/50 space-y-3 mt-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-300 block mb-1.5 border-b border-violet-200 dark:border-violet-800/50 pb-1">
                      Diagnóstico Importado (TechHub)
                    </span>
                    
                    {obdDemoData.diagnosticDescription && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Descrição</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{obdDemoData.diagnosticDescription}</p>
                      </div>
                    )}
                    
                    {obdDemoData.possibleCauses && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Causas Possíveis</p>
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          {Array.isArray(obdDemoData.possibleCauses) ? (
                            <ul className="list-disc pl-5 space-y-0.5">{obdDemoData.possibleCauses.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                          ) : (
                            <p>{obdDemoData.possibleCauses}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {obdDemoData.recommendedAction && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Ação Recomendada</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{obdDemoData.recommendedAction}</p>
                      </div>
                    )}

                    {(obdDemoData.suggestedServices || obdDemoData.suggestedParts) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {obdDemoData.suggestedServices && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-800/50">
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Wrench className="h-3 w-3"/> Serviços Sugeridos</p>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                              {Array.isArray(obdDemoData.suggestedServices) ? (
                                <ul className="list-disc pl-4 space-y-0.5">{obdDemoData.suggestedServices.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                              ) : (
                                <p>{obdDemoData.suggestedServices}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {obdDemoData.suggestedParts && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-800/50">
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Package className="h-3 w-3"/> Peças Sugeridas</p>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                              {Array.isArray(obdDemoData.suggestedParts) ? (
                                <ul className="list-disc pl-4 space-y-0.5">{obdDemoData.suggestedParts.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                              ) : (
                                <p>{obdDemoData.suggestedParts}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800/50 text-center text-muted-foreground mt-4 text-sm">
              Nenhum evento OBD-II compatível foi localizado para esta OS.
            </div>
          )}

            {hasPreventiveEvent ? (
              preventiveDemoData.preventiveInspection && (
                <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 p-3 rounded-lg mt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-1.5 flex items-center gap-1.5 border-b border-teal-200 dark:border-teal-800/50 pb-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> Inspeção Preventiva Importada
                  </span>
                  <div className="text-sm text-teal-900 dark:text-teal-300 mt-2">
                    {typeof preventiveDemoData.preventiveInspection === 'object' ? (
                      <ul className="space-y-1">
                        {Object.entries(preventiveDemoData.preventiveInspection).map(([key, val]: [string, any], i) => {
                          const defaultLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
                          const label = preventiveInspectionLabels[key] || defaultLabel;
                          
                          let statusColor = 'text-amber-600 dark:text-amber-400';
                          const valString = JSON.stringify(val).toLowerCase();
                          if (valString.includes('"ok"') || valString.includes('"good"')) statusColor = 'text-emerald-600 dark:text-emerald-400';
                          if (valString.includes('"replace"') || valString.includes('"low"') || valString.includes('"bad"')) statusColor = 'text-rose-600 dark:text-rose-400 font-semibold';

                          return (
                            <li key={i} className="flex flex-col sm:flex-row sm:justify-between border-b border-teal-200/40 dark:border-teal-800/30 py-1.5 last:border-0">
                              <span className="font-semibold text-teal-800 dark:text-teal-400">{label}:</span>
                              <span className={`${statusColor} sm:text-right mt-0.5 sm:mt-0`}>{formatPreventiveInspectionItem(val)}</span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p>{String(preventiveDemoData.preventiveInspection)}</p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800/50 text-center text-muted-foreground mt-4 text-sm">
                Nenhuma inspeção preventiva compatível foi localizada para esta OS.
              </div>
            )}
          </div>
        {/* BLOCO: ANÁLISE IA */}
        <div className="space-y-4 mb-6 mt-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/60 shadow-inner">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <h4 className="font-bold text-xl flex items-center gap-2 text-blue-900 dark:text-blue-300">
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" /> Análise detalhada com IA
            </h4>
            <p className="text-sm text-blue-800/80 dark:text-blue-300/80 max-w-2xl">
              A OFYCIA pode consultar o Microsoft Foundry / Phi para gerar uma análise técnica mais detalhada com base nos dados sanitizados da OS.
            </p>
            <Button 
              className="mt-2 w-full sm:w-auto h-12 px-6 text-base font-bold shadow-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 transition-all hover:scale-105"
              onClick={handleAnaliseIA} 
              disabled={aiAnalysisStatus === 'LOADING'}
            >
              {aiAnalysisStatus === 'LOADING' ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
              {aiAnalysisStatus === 'LOADING' ? 'Consultando OFYCIA...' : 'Obter análise detalhada da OFYCIA'}
            </Button>
          </div>
          
          {aiAnalysisStatus === 'SUCCESS' && aiAnalysisResult && (
            <div className="mt-6 rounded-xl border border-blue-300/40 bg-white/90 p-5 shadow-md dark:border-blue-700/50 dark:bg-slate-900/80 space-y-5 text-left">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">Resultado da Análise</h5>
                  {aiAnalysisResult.origem === 'foundry-phi' && (
                    <span className="text-[10px] font-semibold text-cyan-800 bg-cyan-100 dark:bg-cyan-900/50 dark:text-cyan-300 px-2.5 py-1 rounded-full mt-1.5 inline-block">
                      Resultado gerado pelo Microsoft Foundry / Phi-4-mini-instruct.
                    </span>
                  )}
                  {aiAnalysisResult.origem === 'azure-openai' && (
                    <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 px-2.5 py-1 rounded-full mt-1.5 inline-block">
                      Resultado gerado pelo Azure OpenAI.
                    </span>
                  )}
                  {aiAnalysisResult.origem === 'fallback-local' && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 px-2.5 py-1 rounded-full mt-1.5 inline-block">
                      Azure/Foundry indisponível. Resultado gerado por fallback local.
                    </span>
                  )}
                </div>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(JSON.stringify(aiAnalysisResult, null, 2), 'ai_result')}>
                  {copiedId === 'ai_result' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar Resposta
                </Button>
              </div>

              <div className="grid gap-5">
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">Resumo Técnico</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiAnalysisResult.resumoTecnico}</p>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/50 shadow-sm space-y-5">
                  <h6 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 text-base">
                    <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Orientação ao cliente
                  </h6>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-indigo-800/80 dark:text-indigo-400/80 uppercase tracking-wider mb-1.5">Resumo em linguagem simples</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {aiAnalysisResult.explicacaoCliente || "A OFYCIA analisou os dados disponíveis da ordem de serviço e gerou uma orientação preliminar para apoiar o diagnóstico técnico e a comunicação com o cliente."}
                      </p>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                      <p className="text-xs font-bold text-indigo-800/80 dark:text-indigo-400/80 uppercase tracking-wider mb-2.5">O que será feito pela oficina</p>
                      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Conferir o relato inicial do cliente</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Validar sintomas e evidências técnicas</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Confirmar peças, serviços e sistemas envolvidos</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Registrar as conclusões na ordem de serviço</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-bold text-indigo-800/80 dark:text-indigo-400/80 uppercase tracking-wider">Mensagem sugerida ao cliente</p>
                        <Button variant="secondary" className="h-7 px-3 text-[11px] font-medium text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 dark:text-indigo-300 dark:border-indigo-700 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/60 transition-colors" onClick={() => handleCopy("Seu veículo será analisado com apoio da OFYCIA, a inteligência operacional do AvanceOS. A equipe técnica irá validar os sintomas informados, verificar os sistemas relacionados e registrar as evidências antes da conclusão do serviço.", 'msg_cliente')}>
                          {copiedId === 'msg_cliente' ? <Check className="h-3 w-3 mr-1.5" /> : <Copy className="h-3 w-3 mr-1.5" />} Copiar mensagem ao cliente
                        </Button>
                      </div>
                      <p className="text-sm italic text-slate-600 dark:text-slate-400 border-l-2 border-indigo-300 dark:border-indigo-700 pl-3.5 py-1.5 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-r-lg">
                        "Seu veículo será analisado com apoio da OFYCIA, a inteligência operacional do AvanceOS. A equipe técnica irá validar os sintomas informados, verificar os sistemas relacionados e registrar as evidências antes da conclusão do serviço."
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {aiAnalysisResult.impactoAmbiental && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    Sustentabilidade e Impacto Ambiental
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                    Nível de impacto: <span className="font-bold uppercase">{aiAnalysisResult.impactoAmbiental.nivel}</span> - {aiAnalysisResult.impactoAmbiental.explicacao}
                  </p>
                  {aiAnalysisResult.impactoAmbiental.acoesParaReduzirEmissoes?.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                      {aiAnalysisResult.impactoAmbiental.acoesParaReduzirEmissoes.map((acao: string, i: number) => (
                        <li key={i}>{acao}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {aiAnalysisResult.planoDeAcao?.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">Plano de Ação Sugerido</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    {aiAnalysisResult.planoDeAcao.map((passo: string, i: number) => (
                      <li key={i}>{passo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {aiAnalysisStatus === 'ERROR' && (
             <div className="mt-4 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 text-sm font-medium text-center">
                Ocorreu um erro ao chamar a análise IA. Tente novamente.
             </div>
          )}
        </div>

        {/* BLOCO: VISÃO GERAL */}
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-300/30 bg-white/65 p-4 shadow-sm dark:bg-slate-950/40">
            <h4 className="font-semibold flex items-center gap-1.5 mb-1 text-cyan-800 dark:text-cyan-300">
              <Info className="h-4 w-4" /> Resumo Inteligente
            </h4>
            <p className="text-muted-foreground">{resumo}</p>
          </div>

          {hipoteses.length > 0 && (
            <div className="rounded-xl border border-indigo-300/30 bg-white/65 p-4 shadow-sm dark:bg-slate-950/40">
              <h4 className="font-semibold flex items-center gap-1.5 mb-2 text-indigo-800 dark:text-indigo-300">
                <Activity className="h-4 w-4" /> Hipóteses Técnicas
              </h4>
              <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                {hipoteses.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}

          {checklists.length > 0 && (
            <div className="rounded-xl border border-teal-300/30 bg-white/65 p-4 shadow-sm dark:bg-slate-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h4 className="font-semibold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                  <CheckSquare className="h-4 w-4" /> Checklist Técnico Sugerido
                </h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(checklistCopiar, 'checklist')}>
                  {copiedId === 'checklist' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                </Button>
              </div>
              <div className="space-y-3">
                {checklists.map((c, i) => (
                  <div key={i}>
                    <p className="font-medium text-teal-900 dark:text-teal-200 mb-1">{c.title}</p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                      {c.items.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RELATÓRIO TÉCNICO ASSISTIDO */}
        <div className="mt-4 border-t border-cyan-500/20 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Relatório Técnico Assistido
            </h3>
            <Button variant="default" className="h-9 px-4 font-semibold shadow-md" onClick={() => handleCopy(relatorioCompletoCopiar, 'relatorio_completo')}>
              {copiedId === 'relatorio_completo' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />} Copiar relatório completo
            </Button>
          </div>

          <div className="grid gap-4">
            
            <div className="rounded-xl border border-slate-300/40 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300">Rastreabilidade TechHub</h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(`O evento TechHub foi associado automaticamente à OS com confiança [${nivelConfianca}]. Critérios considerados: ${evidenciasPositivas.length > 0 ? evidenciasPositivas.join(', ') : 'Associação demonstrativa/fallback local'}.`, 'b_rastreabilidade')}>
                  {copiedId === 'b_rastreabilidade' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar trecho
                </Button>
              </div>
              <p className="text-muted-foreground text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                O evento TechHub foi associado automaticamente à OS com confiança <strong>[{nivelConfianca}]</strong>. Critérios considerados: {evidenciasPositivas.length > 0 ? evidenciasPositivas.join(', ') : 'Associação demonstrativa/fallback local'}.
              </p>
            </div>

            <div className="rounded-xl border border-slate-300/40 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300">Dados TechHub / OBD-II considerados</h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(techHubReportText, 'b0')}>
                  {copiedId === 'b0' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar trecho
                </Button>
              </div>
              <p className="text-muted-foreground text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                {techHubReportText}
              </p>
            </div>

            <div className="rounded-xl border border-slate-300/40 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300">1. Relatório técnico interno</h4>
                <div className="flex gap-2">
                  <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(relatorioInterno, 'b1')}>
                    {copiedId === 'b1' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                  </Button>
                  {onApplyDiagnosticoSugerido && (
                    <Button variant="default" className="h-8 px-3 text-xs" onClick={() => {
                        onApplyDiagnosticoSugerido(relatorioInterno);
                        setAppliedDiagnostico(true);
                        setTimeout(() => setAppliedDiagnostico(false), 2000);
                      }}>
                      {appliedDiagnostico ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />} Usar diagnóstico
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                {relatorioInterno}
              </p>
            </div>

            <div className="rounded-xl border border-slate-300/40 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300">2. Justificativa técnica do orçamento</h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(justificativa, 'b2')}>
                  {copiedId === 'b2' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                </Button>
              </div>
              <p className="text-muted-foreground text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                {justificativa}
              </p>
            </div>

            <div className="rounded-xl border border-slate-300/40 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300">3. Explicação resumida ao cliente</h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(explicacaoCliente, 'b3')}>
                  {copiedId === 'b3' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                </Button>
              </div>
              <p className="text-muted-foreground text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                {explicacaoCliente}
              </p>
            </div>

            <div className="rounded-xl border border-slate-300/40 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300">4. Checklist de entrega</h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(checklistEntregaCopiar, 'b4')}>
                  {copiedId === 'b4' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                </Button>
              </div>
              <div className="text-muted-foreground text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50 space-y-1">
                {checklistEntrega.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <span>[ ]</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-300/40 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300">5. Observação final sugerida</h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(obsFinal, 'b5')}>
                  {copiedId === 'b5' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                </Button>
              </div>
              <p className="text-muted-foreground text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                {obsFinal}
              </p>
            </div>

            <div className="rounded-xl border border-rose-300/40 bg-rose-50/30 p-4 shadow-sm dark:border-rose-700/50 dark:bg-rose-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-rose-800 dark:text-rose-300">6. Pontos pendentes da OS</h4>
                <Button variant="secondary" className={buttonClass} onClick={() => handleCopy(pontosPendentes, 'b6')}>
                  {copiedId === 'b6' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copiar
                </Button>
              </div>
              <p className="text-rose-700 dark:text-rose-300/80 text-sm bg-white/60 dark:bg-slate-950/50 p-3 rounded-lg border border-rose-200/50 dark:border-rose-800/50 whitespace-pre-line">
                {pontosPendentes}
              </p>
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  )
}
