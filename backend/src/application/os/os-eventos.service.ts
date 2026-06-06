import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

export interface RegistrarEventoPayload {
  ordemServicoId: string;
  usuarioId?: string | null;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  entidade?: string | null;
  entidadeId?: string | null;
  antes?: string | null;
  depois?: string | null;
  severidade?: 'INFO' | 'SUCESSO' | 'ATENCAO' | 'CRITICO' | string;
  origem?: 'SISTEMA' | 'USUARIO' | 'PDV' | 'ESTOQUE' | 'AGENDA' | 'FISCAL' | 'CONTABILIDADE' | 'OFYCIA' | string;
}

@Injectable()
export class OsEventosService {
  constructor(private readonly prisma: PrismaService) {}

  async registrarEvento(payload: RegistrarEventoPayload, txOrPrisma?: any) {
    const client = txOrPrisma || this.prisma;
    return client.ordemServicoEvento.create({
      data: {
        ordemServicoId: payload.ordemServicoId,
        usuarioId: payload.usuarioId || null,
        tipo: payload.tipo,
        titulo: payload.titulo,
        descricao: payload.descricao || null,
        entidade: payload.entidade || null,
        entidadeId: payload.entidadeId || null,
        antes: payload.antes || null,
        depois: payload.depois || null,
        severidade: payload.severidade || 'INFO',
        origem: payload.origem || 'SISTEMA',
      },
    });
  }

  async listarEventos(ordemServicoId: string, ordem: 'asc' | 'desc' = 'desc') {
    return this.listarTimelineConsolidada(ordemServicoId, ordem);
  }

  async listarTimelineConsolidada(ordemServicoId: string, ordem: 'asc' | 'desc' = 'desc') {
    const eventosPersistidos = await this.prisma.ordemServicoEvento.findMany({
      where: { ordemServicoId },
      include: {
        usuario: {
          select: { id: true, nome: true },
        },
      },
    });

    const os = await this.prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: {
        itens: { include: { produto: true, servico: true } },
        transacoes: true,
        pagamentos: true,
        documentos: true,
        documentosFiscais: true,
        lancamentosContabeis: true,
      }
    });

    if (!os) {
      return eventosPersistidos.sort((a, b) => {
        const dateA = new Date(a.criadoEm).getTime();
        const dateB = new Date(b.criadoEm).getTime();
        return ordem === 'desc' ? dateB - dateA : dateA - dateB;
      });
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: { ordemServicoId },
      include: { produto: true, usuario: { select: { id: true, nome: true } } }
    });

    const agendamentos = await this.prisma.agendamento.findMany({
      where: { ordemServicoId },
      include: { recurso: true }
    });

    const derivados: any[] = [];
    
    const addDerivado = (evento: any) => {
      const isDuplicated = eventosPersistidos.some(e => 
        e.tipo === evento.tipo && 
        ((e.entidadeId && e.entidadeId === evento.entidadeId) || (!e.entidadeId && e.titulo === evento.titulo && Math.abs(new Date(e.criadoEm).getTime() - new Date(evento.criadoEm).getTime()) < 60000))
      );
      if (!isDuplicated) {
        derivados.push({
          id: `derivado-${Math.random().toString(36).substr(2, 9)}`,
          isDerivado: true,
          ...evento
        });
      }
    };

    addDerivado({
      ordemServicoId,
      tipo: 'OS_CRIADA',
      titulo: 'OS criada',
      descricao: 'Ordem de Serviço criada para o cliente e veículo.',
      severidade: 'INFO',
      origem: 'SISTEMA',
      criadoEm: os.criadoEm,
      entidade: 'OrdemServico',
      entidadeId: os.id
    });

    const temEventoStatus = eventosPersistidos.some(e => e.tipo === 'STATUS_ALTERADO');
    if (!temEventoStatus) {
      addDerivado({
        ordemServicoId,
        tipo: 'STATUS_ATUAL',
        titulo: 'Status atual da OS',
        descricao: `Status atual: ${os.status}`,
        severidade: 'INFO',
        origem: 'SISTEMA',
        criadoEm: os.atualizadoEm || os.criadoEm,
        entidade: 'OrdemServico',
        entidadeId: os.id
      });
    }

    if (os.status === 'CANCELADA') {
      addDerivado({
        ordemServicoId,
        tipo: 'OS_CANCELADA',
        titulo: 'OS cancelada',
        descricao: 'Ordem de Serviço cancelada com preservação de histórico.',
        severidade: 'CRITICO',
        origem: 'SISTEMA',
        criadoEm: os.atualizadoEm || os.criadoEm,
        entidade: 'OrdemServico',
        entidadeId: os.id
      });
    }

    const totalPago = os.transacoes.filter(t => t.status === 'PAGO' || t.status === 'CONCLUIDO').reduce((acc, t) => acc + Number(t.valor), 0) +
                      os.pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
    if (totalPago > 0 && totalPago >= Number(os.valorFinal || 0) && Number(os.valorFinal || 0) > 0) {
      addDerivado({
        ordemServicoId,
        tipo: 'FINANCEIRO_QUITADO',
        titulo: 'OS quitada',
        descricao: 'Saldo financeiro da OS está quitado.',
        severidade: 'SUCESSO',
        origem: 'FINANCEIRO',
        criadoEm: os.atualizadoEm || os.criadoEm,
        entidade: 'OrdemServico',
        entidadeId: os.id
      });
    }

    for (const item of os.itens) {
      if (item.produtoId) {
        addDerivado({
          ordemServicoId,
          tipo: 'PRODUTO_ADICIONADO',
          titulo: 'Produto/peça na OS',
          descricao: `${item.produto?.nome || 'Produto'} foi incluído na OS.`,
          severidade: 'INFO',
          origem: 'SISTEMA',
          criadoEm: os.criadoEm,
          entidade: 'ItemOS',
          entidadeId: item.id
        });
      } else {
        addDerivado({
          ordemServicoId,
          tipo: 'SERVICO_ADICIONADO',
          titulo: 'Serviço na OS',
          descricao: `${item.servico?.nome || item.servicoNome || 'Serviço'} foi incluído na OS.`,
          severidade: 'INFO',
          origem: 'SISTEMA',
          criadoEm: os.criadoEm,
          entidade: 'ItemOS',
          entidadeId: item.id
        });
      }
    }

    for (const mov of movimentacoes) {
      if (mov.tipo === 'SAIDA_OS') {
        addDerivado({
          ordemServicoId,
          tipo: 'ESTOQUE_BAIXADO',
          titulo: 'Baixa de estoque',
          descricao: `Produto ${mov.produto?.nome || ''} teve baixa de ${mov.quantidade} unidade(s) por esta OS.`,
          severidade: 'INFO',
          origem: 'ESTOQUE',
          criadoEm: mov.timestamp || os.criadoEm,
          entidade: 'MovimentacaoEstoque',
          entidadeId: mov.id,
          usuario: mov.usuario
        });
      } else if (mov.tipo === 'ENTRADA_DEVOLUCAO_OS') {
        addDerivado({
          ordemServicoId,
          tipo: 'ESTOQUE_DEVOLVIDO',
          titulo: 'Devolução de estoque',
          descricao: `Produto ${mov.produto?.nome || ''} teve devolução de ${mov.quantidade} unidade(s) vinculada a esta OS.`,
          severidade: 'INFO',
          origem: 'ESTOQUE',
          criadoEm: mov.timestamp || os.criadoEm,
          entidade: 'MovimentacaoEstoque',
          entidadeId: mov.id,
          usuario: mov.usuario
        });
      }
    }

    for (const trans of os.transacoes) {
      addDerivado({
        ordemServicoId,
        tipo: 'PAGAMENTO_REGISTRADO',
        titulo: 'Pagamento registrado',
        descricao: `Pagamento de R$ ${Number(trans.valor).toFixed(2)} registrado via ${trans.metodoPagamento || 'Não informada'}.`,
        severidade: 'SUCESSO',
        origem: 'FINANCEIRO',
        criadoEm: trans.dataPagamento || trans.dataVencimento || os.criadoEm,
        entidade: 'TransacaoFinanceira',
        entidadeId: trans.id
      });
    }

    for (const pag of os.pagamentos) {
      addDerivado({
        ordemServicoId,
        tipo: 'PAGAMENTO_LEGADO',
        titulo: 'Pagamento legado registrado',
        descricao: `Pagamento de R$ ${Number(pag.valor).toFixed(2)} encontrado no histórico legado via ${pag.forma_pagamento}.`,
        severidade: 'SUCESSO',
        origem: 'FINANCEIRO',
        criadoEm: pag.data_pagamento || os.criadoEm,
        entidade: 'Pagamento',
        entidadeId: pag.id
      });
    }

    for (const doc of os.documentos) {
      addDerivado({
        ordemServicoId,
        tipo: 'ANEXO_ADICIONADO',
        titulo: 'Documento anexado',
        descricao: `Arquivo ${doc.nomeOriginal} foi vinculado à OS.`,
        severidade: 'INFO',
        origem: 'SISTEMA',
        criadoEm: doc.criadoEm || os.criadoEm,
        entidade: 'OrdemServicoDocumento',
        entidadeId: doc.id
      });
    }

    for (const age of agendamentos) {
      addDerivado({
        ordemServicoId,
        tipo: 'AGENDA_VINCULADA',
        titulo: 'Agenda de máquina vinculada',
        descricao: `OS vinculada à máquina ${age.recurso?.nome || ''}, com entrada prevista às ${age.dataInicio.toISOString()}.`,
        severidade: 'INFO',
        origem: 'AGENDA',
        criadoEm: age.criadoEm || os.criadoEm,
        entidade: 'Agendamento',
        entidadeId: age.id
      });
    }

    for (const doc of os.documentosFiscais) {
      addDerivado({
        ordemServicoId,
        tipo: 'FISCAL_REFERENCIADO',
        titulo: 'Documento fiscal gerencial vinculado',
        descricao: `Documento fiscal simulado (${doc.numero || 'S/N'}) vinculado à OS, sem validade fiscal.`,
        severidade: 'INFO',
        origem: 'FISCAL',
        criadoEm: doc.criadoEm || os.criadoEm,
        entidade: 'DocumentoFiscalSimulado',
        entidadeId: doc.id
      });
    }

    for (const lan of os.lancamentosContabeis) {
      addDerivado({
        ordemServicoId,
        tipo: 'CONTABILIDADE_REFERENCIADA',
        titulo: 'Lançamento contábil vinculado',
        descricao: `Lançamento operacional vinculado à OS.`,
        severidade: 'INFO',
        origem: 'CONTABILIDADE',
        criadoEm: lan.criadoEm || os.criadoEm,
        entidade: 'LancamentoContabilOperacional',
        entidadeId: lan.id
      });
    }

    const todos = [...eventosPersistidos, ...derivados];
    
    todos.sort((a, b) => {
      const dateA = new Date(a.criadoEm).getTime();
      const dateB = new Date(b.criadoEm).getTime();
      return ordem === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return todos;
  }
}
