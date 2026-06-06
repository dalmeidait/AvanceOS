import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LabTechDiagnostic {
  origem: string;
  tipo: string;
  arquivo: string;
  resumo: string;
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
  rawPayloadStr?: string;
}

@Injectable()
export class OfyciaService {
  constructor(private prisma: PrismaService) {}

  private isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getNestedValue(data: unknown, pathKey: string): unknown {
    return pathKey.split('.').reduce<unknown>((current, key) => {
      if (!this.isRecord(current)) return undefined;
      return current[key];
    }, data);
  }

  private firstPresent(data: unknown, aliases: string[]) {
    for (const alias of aliases) {
      const value = this.getNestedValue(data, alias);
      if (value !== undefined && value !== null && value !== '') return value;
    }

    return undefined;
  }

  private normalizeDtcValues(...values: unknown[]): string[] {
    const result: string[] = [];

    for (const value of values) {
      if (!value) continue;

      if (Array.isArray(value)) {
        result.push(...this.normalizeDtcValues(...value));
        continue;
      }

      if (this.isRecord(value)) {
        result.push(...this.normalizeDtcValues(value.code, value.dtc, value.dtcCode, value.codigo));
        continue;
      }

      if (typeof value === 'string') {
        result.push(...value.split(/[,\s;]+/).map((item) => item.trim()).filter(Boolean));
        continue;
      }

      result.push(String(value));
    }

    return [...new Set(result.filter(Boolean))];
  }

  private normalizeLabTechPayload(json: any) {
    const leiturasOriginais = [
      json.leituras,
      json.readings,
      json.pids,
      json.sensores,
      json.metricas,
      json.obdData,
      json.obd,
    ].find((value) => this.isRecord(value)) || {};

    const merged = {
      ...leiturasOriginais,
      ...json,
      diagnostic: json.diagnostic,
      obd: json.obd,
      batteryTest: json.batteryTest,
    };

    const tensaoBateria = this.firstPresent(merged, [
      'tensaoBateria', 'tensao_bateria', 'batteryVoltage', 'battery_voltage', 'voltage', 'bateria',
      'obd.batteryVoltage', 'obd.voltage', 'batteryTest.voltage', 'batteryTest.batteryVoltage', 'batteryTest.voltageV',
    ]);
    const temperaturaMotor = this.firstPresent(merged, [
      'temperaturaMotor', 'temperatura_motor', 'tempMotor', 'coolantTemp', 'coolantTemperature', 'coolantTemperatureC',
      'engineTemp', 'engineTemperature', 'engineTemperatureC', 'engine_temperature',
      'obd.coolantTemp', 'obd.coolantTemperature', 'obd.coolantTemperatureC', 'obd.engineTemp', 'obd.engineTemperature', 'obd.engineTemperatureC',
    ]);
    const rpm = this.firstPresent(merged, ['rpm', 'engineRpm', 'engine_rpm', 'rpmMarchaLenta', 'obd.rpm', 'obd.engineRpm']);

    const leituras = {
      ...(this.isRecord(leiturasOriginais) ? leiturasOriginais : {}),
      ...(tensaoBateria !== undefined ? { tensaoBateria, tensao_bateria: tensaoBateria } : {}),
      ...(temperaturaMotor !== undefined ? { temperaturaMotor } : {}),
      ...(rpm !== undefined ? { rpm } : {}),
    };

    return {
      dtcs: this.normalizeDtcValues(
        json.dtcs,
        json.codigosFalha,
        json.codigos_falha,
        json.faultCodes,
        json.troubleCodes,
        json.codes,
        json.diagnostic?.dtcs,
        json.diagnostic?.troubleCodes,
        json.obd?.dtcs,
        json.obd?.dtcCode,
        json.obd?.dtcCodes,
        json.obd?.faultCodes,
        json.obd?.troubleCodes,
      ),
      leituras,
      sintomas: Array.isArray(json.sintomas) ? json.sintomas : (Array.isArray(json.symptoms) ? json.symptoms : []),
      observacoes: json.observacoes || json.observations || json.diagnostic?.description || '',
    };
  }

  private async buscarDiagnosticosLabTech(osId: string, numeroOS: number | null, placa: string | null): Promise<LabTechDiagnostic[]> {
    const diagnosticos: LabTechDiagnostic[] = [];

    try {
      let techHubDiagnostics = [];
      if (numeroOS !== null) {
        techHubDiagnostics = await (this.prisma as any).techHubDiagnostic.findMany({
          where: { serviceOrderNumber: numeroOS.toString() },
          orderBy: { processedAt: 'desc' }
        });
      }

      if (techHubDiagnostics.length === 0 && placa) {
        techHubDiagnostics = await (this.prisma as any).techHubDiagnostic.findMany({
          where: { 
            vehiclePlate: placa,
            processedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { processedAt: 'desc' }
        });
      }

      for (const diag of techHubDiagnostics) {
        let dtcs: string[] = [];
        let leituras: any = {};
        let sintomas: string[] = [];
        let observacoes = '';
        let rawStr = '';

        if (diag.rawPayload) {
          try {
            rawStr = typeof diag.rawPayload === 'string' ? diag.rawPayload : JSON.stringify(diag.rawPayload);
            const json = JSON.parse(rawStr);
            const normalized = this.normalizeLabTechPayload(json);

            dtcs = normalized.dtcs;
            leituras = normalized.leituras;
            sintomas = normalized.sintomas;
            observacoes = normalized.observacoes;
          } catch (e) {}
        }

        diagnosticos.push({
          origem: 'TechHub',
          tipo: diag.eventType || 'Diagnóstico Eletrônico',
          arquivo: diag.fileName || '',
          modulo: diag.module || '',
          sistema: diag.system || '',
          alvo: diag.target || '',
          categoria: diag.diagnosticCategory || '',
          cenario: diag.scenario || '',
          gravidade: diag.severity || '',
          placa: diag.vehiclePlate || '',
          numeroOS: diag.serviceOrderNumber || '',
          descricao: diag.diagnosticDescription || '',
          resumo: diag.diagnosticDescription || 'Leitura de parâmetros executada',
          dtcs,
          leituras,
          sintomas,
          observacoes,
          processadoEm: diag.processedAt ? diag.processedAt.toISOString() : undefined,
          rawPayloadStr: rawStr
        });
      }
    } catch (e) {
      // Ignorar erros de banco para não quebrar fluxo
    }

    const dirPath = '/mnt/avanceos/techhub-imports/Entrada';
    try {
      await fs.access(dirPath);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (!file.toLowerCase().endsWith('.json')) continue;

        const filePath = path.join(dirPath, file);
        
        try {
          const stat = await fs.stat(filePath);
          if (stat.size > 1024 * 1024) continue; // Ignorar > 1MB

          const content = await fs.readFile(filePath, 'utf8');
          const json = JSON.parse(content);

          const matchId = json.ordemServicoId === osId;
          const matchNumero = numeroOS !== null && json.numeroOS === numeroOS;
          const matchNome = file.includes(osId) || (numeroOS !== null && file.includes(numeroOS.toString()));

          if (matchId || matchNumero || matchNome) {
            diagnosticos.push({
              origem: json.origem || 'LAB-TECH',
              tipo: json.tipo || 'Diagnóstico Eletrônico',
              arquivo: file, // Mostra apenas o basename para segurança no frontend
              resumo: json.resumo || 'Leitura de parâmetros executada',
              dtcs: Array.isArray(json.dtcs) ? json.dtcs : [],
              leituras: json.leituras || {},
              sintomas: Array.isArray(json.sintomas) ? json.sintomas : [],
              observacoes: json.observacoes || ''
            });
          }
        } catch (fileErr) {
          // Ignora arquivo inválido e segue em frente
        }
      }
    } catch (err) {
      // Ignora erro caso a pasta não exista (ex: ambiente de dev Windows)
    }

    return diagnosticos;
  }

  async analisarOs(id: string) {
    const provider = process.env.OFYCIA_PROVIDER || 'local';

    if (provider === 'azure') {
      // TODO: Futura integração com Azure OpenAI
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const isUuid = uuidRegex.test(id);
    let os;

    const includeRelations = {
      cliente: true,
      veiculo: true,
      itens: {
        include: {
          servico: true,
          produto: true,
        },
      },
      pagamentos: true,
    };

    if (isUuid) {
      os = await this.prisma.ordemServico.findUnique({
        where: { id },
        include: includeRelations,
      });
    } else {
      const numeroOsTratado = parseInt(id.replace(/\D/g, ''), 10);
      if (!isNaN(numeroOsTratado)) {
        os = await this.prisma.ordemServico.findUnique({
          where: { numeroOS: numeroOsTratado },
          include: includeRelations,
        });
      }
    }

    if (!os) {
      throw new NotFoundException('Ordem de Serviço não encontrada.');
    }

    const inconsistencias: string[] = [];
    const riscosIdentificados: string[] = [];
    const recomendacoesAssistivas: string[] = [];
    const proximosPassos: string[] = [];
    const dadosAusentes: string[] = [];
    const analiseDaExecucaoTecnica: string[] = [];
    const analiseDeAgenda: string[] = [];
    const criteriosDeLiberacao: string[] = [];
    let riscoScore = 0; // 0: BAIXO, 1: MEDIO, >=2: ALTO

    const agendamentos = await (this.prisma as any).agendamento.findMany({
      where: { ordemServicoId: os.id }
    });

    // Regra: OS sem cliente
    if (!os.cliente) {
      riscoScore += 2;
      dadosAusentes.push('Cliente não vinculado');
      riscosIdentificados.push('OS sem cliente responsável associado, risco de perda de contato e inadimplência.');
      recomendacoesAssistivas.push('Vincular um cliente à Ordem de Serviço.');
    }

    // Regra: OS sem veículo
    if (!os.veiculo) {
      riscoScore += 2;
      dadosAusentes.push('Veículo não vinculado');
      riscosIdentificados.push('OS sem veículo, impossível rastrear o histórico de manutenção.');
      recomendacoesAssistivas.push('Vincular um veículo à Ordem de Serviço.');
    }

    // Regra: OS sem serviços
    const servicos = os.itens.filter(i => i.servicoId);
    if (servicos.length === 0) {
      riscoScore += 1;
      inconsistencias.push('OS sem nenhum serviço lançado.');
      recomendacoesAssistivas.push('Lançar a mão de obra ou serviços realizados para faturamento correto.');
    }

    // Regra: Aberta há mais de 7 dias
    const hoje = new Date();
    const dataAbertura = new Date(os.criadoEm);
    const diffDias = Math.floor((hoje.getTime() - dataAbertura.getTime()) / (1000 * 3600 * 24));
    if (os.status === 'ABERTA' && diffDias > 7) {
      riscoScore += 1;
      riscosIdentificados.push(`A OS está aberta há ${diffDias} dias.`);
      recomendacoesAssistivas.push('Acompanhar status da OS e fazer follow-up com o cliente ou mecânico.');
      proximosPassos.push('Entrar em contato com o cliente para atualização de status.');
    }

    // Regra: Fechada, Finalizada ou Paga com valor total zero
    if (['FECHADA', 'FINALIZADA', 'PAGA'].includes(os.status) && os.valorFinal === 0) {
      riscoScore += 2;
      inconsistencias.push('A OS está encerrada ou paga com valor total R$ 0,00.');
      recomendacoesAssistivas.push('Verificar se houve erro no lançamento de valores, descontos ou ausência de cobrança.');
    }

    // Regra: Pagamento pendente (Rule 7)
    const totalPago = os.pagamentos.reduce((acc, p) => acc + p.valor, 0);
    if (os.valorFinal > 0 && totalPago < os.valorFinal && !['PAGA', 'CANCELADA'].includes(os.status)) {
      proximosPassos.push('Existem valores pendentes de pagamento. Realizar cobrança ou fechamento financeiro.');
      if (['FECHADA', 'FINALIZADA'].includes(os.status)) {
        inconsistencias.push('A OS está como finalizada/fechada, porém há saldo devedor pendente.');
      }
    }

    // Regra: Serviços com termos de troca sem peças (Rule 5)
    const termosTroca = ['troca', 'substituicao', 'substituição', 'oleo', 'óleo', 'filtro', 'freio', 'vela', 'bobina'];
    const temServicoTroca = servicos.some(s => {
      const nomeNormalizado = s.servicoNome?.toLowerCase() || s.servico?.nome.toLowerCase() || '';
      return termosTroca.some(termo => nomeNormalizado.includes(termo));
    });
    const temProdutos = os.itens.some(i => i.produtoId);

    if (temServicoTroca && !temProdutos) {
      inconsistencias.push('Identificados serviços que sugerem substituição de peças, mas não há produtos vinculados à OS.');
      recomendacoesAssistivas.push('Validar fisicamente a necessidade de componentes antes da compra/troca, e adicionar as peças consumidas na OS.');
    }

    // Regra: Observações técnicas e Execução Técnica (Rule 2 & 4)
    const temExecucaoTecnica = os.diagnosticoConfirmado || os.testesRealizados || os.resultadoDosTestes || os.solucaoAplicada || os.dataHoraConclusaoTecnica;
    
    if (temExecucaoTecnica) {
      analiseDaExecucaoTecnica.push('Execução técnica devidamente registrada.');
      analiseDaExecucaoTecnica.push('Evidências técnicas validadas: diagnóstico e/ou solução documentados pelo mecânico.');
    } else {
      analiseDaExecucaoTecnica.push('Nenhuma execução técnica detalhada registrada até o momento.');
      if (['CONCLUIDA', 'FINALIZADA', 'FECHADA', 'PAGA'].includes(os.status)) {
        inconsistencias.push('OS foi concluída ou finalizada sem o preenchimento da execução técnica.');
      }
    }

    if (os.relatoMecanico || os.diagnostico) {
      recomendacoesAssistivas.push('Existem observações técnicas (relato/diagnóstico inicial) que devem ser revisadas e comunicadas ao cliente.');
    } else if (!temExecucaoTecnica) {
      dadosAusentes.push('Falta de relato do mecânico ou diagnóstico inicial.');
      inconsistencias.push('A OS não possui nenhum diagnóstico técnico (inicial ou final) preenchido.');
    }

    // Regra: Checklist de saída (Rule 8)
    if (!os.dataHoraLiberacao && !os.resultadoTesteSaida) {
      criteriosDeLiberacao.push('O checklist de saída ainda não foi realizado. Recomenda-se realizá-lo antes da entrega do veículo.');
      proximosPassos.push('Realizar o Checklist de Saída.');
    } else {
      criteriosDeLiberacao.push('Checklist de saída registrado. Veículo apto para liberação sistêmica (verificar aprovação do cliente).');
    }

    // Regra: Agenda (Rule 3)
    if (os.status === 'EM_EXECUCAO') {
      const agendaIniciada = agendamentos.some((a: any) => ['INICIADO', 'EM_ANDAMENTO'].includes(a.status));
      if (!agendaIniciada) {
        analiseDeAgenda.push('A OS está com status EM_EXECUCAO, porém não há nenhum agendamento com status INICIADO associado a ela.');
        inconsistencias.push('Status da OS incompatível com o andamento da agenda (OS rodando sem agenda ativa).');
      } else {
        analiseDeAgenda.push('Agenda condizente com o status de execução da OS.');
      }
    } else if (agendamentos.length > 0) {
      analiseDeAgenda.push(`Foram encontrados ${agendamentos.length} agendamento(s) vinculado(s) a esta OS.`);
    } else {
      analiseDeAgenda.push('Nenhum agendamento vinculado a esta OS.');
    }

    // --- Integração LAB-TECH ---
    const diagnosticosLabTech = await this.buscarDiagnosticosLabTech(os.id, os.numeroOS, os.veiculo?.placa || null);

    if (diagnosticosLabTech.length > 0) {
      const temServicoDiagnostico = servicos.some(s => {
        const nome = (s.servicoNome || s.servico?.nome || '').toLowerCase();
        return nome.includes('diagnostico') || nome.includes('diagnóstico') || nome.includes('scanner');
      });

      if (!temServicoDiagnostico) {
        inconsistencias.push('Há diagnóstico avançado vinculado (LAB-TECH), mas nenhum serviço de diagnóstico foi cobrado na OS.');
        recomendacoesAssistivas.push('Lançar a mão de obra de uso do scanner / diagnóstico eletrônico.');
      } else {
        recomendacoesAssistivas.push('Há correlação entre o serviço registrado na OS e o diagnóstico LAB-TECH importado.');
      }

      for (const diag of diagnosticosLabTech) {
        const hasP0301 = diag.dtcs.includes('P0301') || 
                         (diag.cenario && diag.cenario.includes('P0301')) ||
                         (diag.descricao && diag.descricao.includes('P0301')) ||
                         (diag.rawPayloadStr && diag.rawPayloadStr.includes('P0301'));

        if (hasP0301) {
          // Rule 1: Se houver DTC P0301 e não houver teste... recomendar validação
          const execTecnicaStr = `${os.testesRealizados || ''} ${os.diagnosticoConfirmado || ''} ${os.solucaoAplicada || ''}`.toLowerCase();
          const realizouTeste = ['vela', 'bobina', 'cabo', 'injetor', 'bico', 'compressao', 'compressão'].some(termo => execTecnicaStr.includes(termo));
          
          if (!realizouTeste) {
            recomendacoesAssistivas.push('DTC P0301 identificado (Falha de ignição Cilindro 1). Não foram encontrados registros de testes específicos. Recomenda-se validação de vela, bobina, cabo, injetor ou compressão antes de substituições.');
          } else {
            recomendacoesAssistivas.push('DTC P0301 identificado. Consta evidência de validação dos componentes de ignição/injeção.');
          }
        }

        // Rule 6
        const isAltaCriticidade = (diag.gravidade && diag.gravidade.toLowerCase() === 'alta') || 
                                  (diag.cenario && diag.cenario.toLowerCase().includes('crítica'));
        if (isAltaCriticidade) {
          riscosIdentificados.push('Risco em destaque: Diagnóstico LAB-TECH possui gravidade alta/crítica. Exige validação técnica rigorosa antes da liberação.');
        }

        if (diag.leituras?.tensao_bateria < 12.0) {
          riscosIdentificados.push('Bateria com tensão fraca detectada no scanner.');
          recomendacoesAssistivas.push('Testar bateria com equipamento específico antes de liberar o veículo.');
        }

        const temPerdaPotencia = diag.sintomas.some(s => 
          s.toLowerCase().includes('perda de potência') || 
          s.toLowerCase().includes('perda de potencia')
        );
        if (temPerdaPotencia) {
          recomendacoesAssistivas.push('Sintoma de perda de potência relatado. Realizar validação de sistema de ignição, alimentação de combustível e sensores principais.');
        }
      }
    }

    let nivelRisco = 'BAIXO';
    if (riscoScore === 1) nivelRisco = 'MEDIO';
    if (riscoScore >= 2) nivelRisco = 'ALTO';

    const clienteNome = os.cliente?.nome ? ` Cliente: ${os.cliente.nome}.` : '';
    const veiculoInfo = os.veiculo?.placa ? ` Veículo: ${os.veiculo.placa}.` : '';
    let statusNota = '';
    
    if (['PAGA', 'FECHADA'].includes(os.status)) {
      statusNota = ' (A análise é de conferência documental e operacional)';
      recomendacoesAssistivas.push('A OS está encerrada. Verifique se todos os documentos fiscais foram gerados e se o pagamento foi devidamente conciliado no caixa.');
    } else if (os.status === 'ABERTA') {
      statusNota = ' (A análise é de acompanhamento operacional)';
      recomendacoesAssistivas.push('A OS está em andamento. Certifique-se de manter o cliente informado sobre o status e documentar todas as observações técnicas.');
    }

    const resumoOperacional = `Análise realizada para a OS #${os.numeroOS || os.id.substring(0,6)}. Status atual: ${os.status}${statusNota}.${clienteNome}${veiculoInfo} O sistema identificou ${inconsistencias.length} inconsistência(s) e ${riscosIdentificados.length} risco(s).`;

    return {
      titulo: 'Análise da Ordem de Serviço',
      tipo: 'OS',
      risco: nivelRisco,
      resumoOperacional,
      inconsistencias,
      riscosIdentificados,
      recomendacoesAssistivas,
      proximosPassos,
      dadosAusentes,
      analiseDaExecucaoTecnica,
      analiseDeAgenda,
      criteriosDeLiberacao,
      aviso: 'Esta análise é local e assistiva. Não substitui um diagnóstico técnico definitivo.',
      diagnosticosAvancados: diagnosticosLabTech,
      diagnosticosLabTech
    };
  }
}
