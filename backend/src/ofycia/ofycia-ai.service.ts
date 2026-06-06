import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OfyciaAiService {
  private readonly logger = new Logger(OfyciaAiService.name);

  async analisarOs(id: string, payload: any) {
    const isAiEnabled = process.env.OFYCIA_AI_ENABLED === 'true';
    const provider = process.env.OFYCIA_AI_PROVIDER;

    // 3. Sanitizar dados antes de IA
    const payloadSanitizado = this.sanitizarPayload(payload);

    // 4. Montar prompt system
    const systemPrompt = `Você é a OFYCIA, assistente técnica automotiva do AvanceOS.

Responda em português do Brasil.
Seja objetiva, técnica e útil para oficina mecânica.
Não invente medições.
Diferencie evidência técnica de hipótese.
Considere manutenção preventiva, segurança e impacto ambiental.

Responda somente com JSON válido, sem markdown, sem texto antes e sem texto depois.

Formato obrigatório:
{
  "resumoTecnico": "string curta",
  "hipotesesProvaveis": ["item 1", "item 2"],
  "planoDeAcao": ["item 1", "item 2"],
  "explicacaoCliente": "string curta e clara",
  "impactoAmbiental": {
    "nivel": "baixo|medio|alto",
    "explicacao": "string curta",
    "acoesParaReduzirEmissoes": ["item 1", "item 2"]
  },
  "itensCriticos": ["item 1", "item 2"],
  "recomendacaoFinal": "string curta"
}

Limite cada lista a no máximo 4 itens.`;

    if (!isAiEnabled) {
      // 5. Fallback local
      return this.gerarFallbackLocal(payloadSanitizado);
    }

    if (provider === 'foundry') {
      return this.callFoundryModel(systemPrompt, payloadSanitizado);
    }

    if (provider === 'azure-openai') {
      // 6. Chamar Azure OpenAI
      return this.chamarAzureOpenAI(systemPrompt, payloadSanitizado);
    }

    return this.gerarFallbackLocal(payloadSanitizado);
  }

  private sanitizarPayload(payload: any) {
    if (!payload) return {};
    
    // Clonar para não alterar o original
    const clone = JSON.parse(JSON.stringify(payload));

    const removerDadosSensiveis = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      const chavesSensiveis = ['cpf', 'cnpj', 'telefone', 'email', 'endereco', 'valor', 'preco', 'custo', 'documento', 'rg'];
      
      for (const key in obj) {
        if (chavesSensiveis.some(k => key.toLowerCase().includes(k))) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          removerDadosSensiveis(obj[key]);
        }
      }
    };

    removerDadosSensiveis(clone);
    return clone;
  }

  private gerarFallbackLocal(payload: any) {
    const obd = payload?.techhubObd || {};
    const preventiva = payload?.techhubPreventiva || {};
    const dtcs = Array.isArray(obd?.dtcs) ? obd.dtcs : [];
    
    const hipoteses: string[] = [];
    const explicacaoAcoes: string[] = [];
    let explicacaoCliente = 'Análise técnica preliminar baseada nos dados recebidos.';
    let nivelImpacto: 'baixo' | 'medio' | 'alto' = 'baixo';
    let explicacaoImpacto = 'O veículo não apresenta falhas graves de emissão no momento.';
    const planoAcao: string[] = ['Revisar dados técnicos presencialmente.'];
    const itensCriticos: string[] = [];

    if (dtcs.includes('P0301')) {
      hipoteses.push('Falha de ignição no cilindro 1');
      explicacaoImpacto = 'Falhas de ignição aumentam o consumo de combustível e a emissão de gases poluentes.';
      nivelImpacto = 'alto';
      explicacaoAcoes.push('Verificar sistema de ignição para reduzir emissões nocivas.');
      explicacaoCliente = 'Identificamos uma falha de ignição que afeta o desempenho e o consumo.';
      itensCriticos.push('Sistema de ignição (Cilindro 1)');
      planoAcao.push('Testar bobina e vela do cilindro 1.');
    }

    const hasPreventiva = preventiva?.preventiveInspection || Object.keys(preventiva).length > 0;
    if (hasPreventiva) {
      hipoteses.push('Necessidade de manutenção preventiva regular');
      explicacaoImpacto = 'A manutenção preventiva adequada (óleo, filtros, pneus, freios) garante o funcionamento eficiente do motor, reduzindo emissões e desperdício de fluidos.';
      nivelImpacto = nivelImpacto === 'alto' ? 'alto' : 'medio';
      explicacaoAcoes.push('Descarte correto de fluidos e filtros antigos.', 'Calibragem de pneus para melhorar eficiência.');
      explicacaoCliente += ' Também recebemos dados de inspeção preventiva que ajudam na conservação do veículo e na sustentabilidade.';
      planoAcao.push('Realizar serviços preventivos aprovados.');
    }

    return {
      resumoTecnico: 'Análise gerada via fallback local estruturado da OFYCIA.',
      hipotesesProvaveis: hipoteses.length ? hipoteses : ['Necessidade de diagnóstico presencial'],
      planoDeAcao: planoAcao,
      explicacaoCliente,
      impactoAmbiental: {
        nivel: nivelImpacto,
        explicacao: explicacaoImpacto,
        acoesParaReduzirEmissoes: explicacaoAcoes.length ? explicacaoAcoes : ['Manter manutenção em dia para garantir a sustentabilidade ambiental.']
      },
      itensCriticos,
      recomendacaoFinal: 'Proceder com a inspeção física detalhada e priorizar manutenções que previnam o impacto ambiental.',
      origem: 'fallback-local'
    };
  }

  private buildFallbackResponse(textoLivre: string) {
    return {
      resumoTecnico: textoLivre,
      hipotesesProvaveis: [],
      planoDeAcao: [],
      explicacaoCliente: 'Análise gerada (formato livre).',
      impactoAmbiental: {
        nivel: 'baixo',
        explicacao: 'Não foi possível extrair dados estruturados.',
        acoesParaReduzirEmissoes: []
      },
      itensCriticos: [],
      recomendacaoFinal: ''
    };
  }

  private async callFoundryModel(systemPrompt: string, payload: any) {
    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
    const apiKey = process.env.AZURE_FOUNDRY_API_KEY;
    const deployment = process.env.AZURE_FOUNDRY_DEPLOYMENT || 'ofycia-tecnica';

    if (!endpoint || !apiKey) {
      this.logger.warn('Microsoft Foundry não configurado corretamente. Retornando fallback local.');
      return this.gerarFallbackLocal(payload);
    }

    const baseUrl = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
    const url = `${baseUrl}chat/completions`;

    const ordem = payload?.ordemServico || {};
    const veiculo = payload?.veiculo || {};
    const obd = payload?.techhubObd || {};
    const preventiva = payload?.techhubPreventiva || {};

    const promptUsuario = `
Analise tecnicamente esta OS para oficina mecânica.

Veículo:
${JSON.stringify(veiculo)}

Relato/OS:
${JSON.stringify(ordem)}

Dados OBD/TechHub:
${JSON.stringify(obd)}

Inspeção preventiva:
${JSON.stringify(preventiva)}

Responda em português do Brasil, de forma objetiva, com:
1. resumo técnico curto;
2. hipóteses prováveis;
3. plano de ação;
4. explicação simples ao cliente;
5. impacto ambiental e ações para reduzir emissões.

Seja direto. Não use markdown longo.
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      this.logger.log(`Chamando Microsoft Foundry/Phi em ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'api-key': apiKey
        },
        body: JSON.stringify({
          model: deployment,
          messages: [
            {
              role: 'system',
              content: 'Você é a OFYCIA, assistente técnica automotiva do AvanceOS. Responda em português, com objetividade e foco em diagnóstico, manutenção preventiva e impacto ambiental.'
            },
            {
              role: 'user',
              content: promptUsuario
            }
          ],
          temperature: 0.2,
          max_tokens: 450
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const responseText = await response.text();

      if (!response.ok) {
        this.logger.error(`Erro Microsoft Foundry ${response.status}: ${responseText.slice(0, 1000)}`);
        return this.gerarFallbackLocal(payload);
      }

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        this.logger.error(`Resposta HTTP do Foundry não veio em JSON: ${responseText.slice(0, 1000)}`);
        return this.gerarFallbackLocal(payload);
      }

      const content = data?.choices?.[0]?.message?.content?.trim();

      if (!content) {
        this.logger.error(`Resposta vazia do Microsoft Foundry: ${responseText.slice(0, 1000)}`);
        return this.gerarFallbackLocal(payload);
      }

      this.logger.log('Resposta recebida do Microsoft Foundry/Phi com sucesso.');

      return {
        resumoTecnico: content,
        hipotesesProvaveis: [
          'Análise técnica gerada pelo Microsoft Foundry / Phi com base nos dados da OS.',
          'Confirmar hipóteses por inspeção presencial e testes técnicos.'
        ],
        planoDeAcao: [
          'Validar o relato do cliente.',
          'Conferir dados preventivos e sinais de falha.',
          'Executar testes técnicos antes da aprovação final.',
          'Registrar evidências no AvanceOS.'
        ],
        explicacaoCliente: 'A OFYCIA analisou os dados da OS e gerou uma orientação técnica preliminar para apoiar o diagnóstico e a manutenção.',
        impactoAmbiental: {
          nivel: 'medio',
          explicacao: 'Manutenções preventivas, correção de falhas e descarte adequado de fluidos reduzem consumo, emissões e desperdícios.',
          acoesParaReduzirEmissoes: [
            'Manter óleo e filtros dentro do prazo.',
            'Corrigir falhas de ignição ou combustão.',
            'Calibrar pneus e verificar alinhamento.',
            'Descartar fluidos e filtros corretamente.'
          ]
        },
        itensCriticos: [],
        recomendacaoFinal: 'Usar a análise da OFYCIA como apoio técnico, sem substituir a inspeção do mecânico responsável.',
        origem: 'foundry-phi'
      };

    } catch (error: any) {
      clearTimeout(timeout);

      if (error?.name === 'AbortError') {
        this.logger.error('Timeout ao chamar Microsoft Foundry/Phi. Retornando fallback local.');
      } else {
        this.logger.error(`Erro ao chamar Microsoft Foundry/Phi: ${error?.message || error}`);
      }

      return this.gerarFallbackLocal(payload);
    }
  }


  private async chamarAzureOpenAI(systemPrompt: string, payload: any) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    const maxTokens = Number(process.env.AZURE_OPENAI_MAX_TOKENS || 1200);

    if (!endpoint || !apiKey || !deployment || !apiVersion) {
      this.logger.warn('Azure OpenAI não configurado corretamente. Retornando fallback local.');
      return this.gerarFallbackLocal(payload);
    }

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(payload) }
          ],
          temperature: 0.2,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API Azure OpenAI: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Resposta vazia da Azure OpenAI');
      }

      const resultado = JSON.parse(content);
      resultado.origem = 'azure-openai';
      return resultado;

    } catch (error) {
      this.logger.error('Erro ao chamar Azure OpenAI, usando fallback', error);
      return this.gerarFallbackLocal(payload);
    }
  }
}
