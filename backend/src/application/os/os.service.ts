import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { OsGateway } from './os.gateway';
import { OsEventosService } from './os-eventos.service';
import { AuditService } from '../audit/audit.service';
import { isAdminRole, normalizeRole } from '../auth/roles';
import { TipoMovimentacao } from '../../domain/enums';
import { calcularFinanceiroOs } from './os-financeiro.util';
import * as crypto from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const OS_STATUS_VALIDOS = [
  'ABERTA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'APROVADA',
  'EM_EXECUCAO',
  'AGUARDANDO_PECA',
  'CONCLUIDA',
  'ENTREGUE',
  'CANCELADA',
  'AGUARDANDO_ASSINATURA',
  'ASSINADO',
  'CONCLUIDO',
  'PAGO',
  'ORCAMENTO_RECUSADO',
];

@Injectable()
export class OsService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private osGateway: OsGateway,
    private auditService: AuditService,
    private osEventos: OsEventosService,
  ) {}

  private readonly allowedDocumentTypes = new Set([
    'RESUMO_OS',
    'COMPROVANTE_PAGAMENTO',
    'LAUDO_TECHHUB',
    'ORCAMENTO',
    'FOTO',
    'AUTORIZACAO',
    'DOCUMENTO_EXTERNO',
    'OUTROS',
  ]);

  private readonly osInclude = {
    cliente: { include: { _count: { select: { veiculos: true } } } },
    veiculo: {
      include: {
        cliente: { include: { _count: { select: { veiculos: true } } } },
      },
    },
    responsavel: true,
    itens: { include: { produto: true, servico: true } },
    pagamentos: { orderBy: { data_pagamento: 'desc' as const } },
    transacoes: { orderBy: { dataPagamento: 'desc' as const } },
  };

  private normalizarQuantidade(valor: any) {
    const quantidade = Number(valor ?? 1);
    if (!Number.isFinite(quantidade) || quantidade <= 0 || !Number.isInteger(quantidade)) {
      throw new BadRequestException('Quantidade do item da OS deve ser um numero inteiro positivo.');
    }
    return quantidade;
  }

  private normalizarValorUnitario(valor: any) {
    const valorUnitario = Number(valor ?? 0);
    if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
      throw new BadRequestException('Valor unitário do item da OS deve ser válido.');
    }
    return valorUnitario;
  }

  private normalizarNomeServico(valor: any) {
    const nome = String(valor ?? '').trim();
    if (!nome) throw new BadRequestException('Informe o nome do serviço da OS.');
    return nome;
  }

  private compactarServicoManual(nome: string, descricao?: string | null) {
    const descricaoLimpa = String(descricao ?? '').trim();
    if (!descricaoLimpa) return nome;
    return JSON.stringify({ nome, descricao: descricaoLimpa });
  }

  private expandirServicoNome(servicoNome?: string | null) {
    if (!servicoNome) return { nome: '', descricao: '' };
    try {
      const parsed = JSON.parse(servicoNome);
      if (parsed && typeof parsed === 'object' && typeof parsed.nome === 'string') {
        return {
          nome: parsed.nome,
          descricao: typeof parsed.descricao === 'string' ? parsed.descricao : '',
        };
      }
    } catch {
      // Mantem compatibilidade com itens antigos salvos como texto simples.
    }
    return { nome: servicoNome, descricao: '' };
  }

  private mapItemToApi(item: any) {
    const itemManual = !item.produtoId;
    const servico = itemManual
      ? this.expandirServicoNome(item.servicoNome)
      : { nome: item.servicoNome || item.produto?.nome || '', descricao: item.descricao || item.produto?.descricao || '' };

    return {
      ...item,
      servicoNome: servico.nome,
      descricao: item.descricao || servico.descricao,
      valorTotal: Number(item.subtotal ?? Number(item.quantidade || 0) * Number(item.valorUnitario || 0)),
    };
  }

  private tipoCliente(cliente: any) {
    const digits = String(cliente?.cpf_cnpj || '').replace(/\D/g, '');
    if (digits.length === 14) return 'Pessoa Juridica';
    if (digits.length === 11) return 'Pessoa Fisica';
    return null;
  }

  private mapClienteToApi(cliente: any) {
    if (!cliente) return cliente;
    const totalVeiculos = Number(cliente._count?.veiculos ?? cliente.veiculos?.length ?? cliente.totalVeiculos ?? 0);
    const possuiGrupoVeiculos = totalVeiculos > 1;
    const { _count, ...clienteLimpo } = cliente;

    return {
      ...clienteLimpo,
      cpf: cliente.cpf_cnpj,
      documento: cliente.cpf_cnpj,
      tipo: this.tipoCliente(cliente),
      tipoCliente: this.tipoCliente(cliente),
      totalVeiculos,
      possuiGrupoVeiculos,
      possuiFrota: possuiGrupoVeiculos,
    };
  }

  private mapVeiculoToApi(veiculo: any) {
    if (!veiculo) return veiculo;
    const cliente = this.mapClienteToApi(veiculo.cliente);
    return {
      ...veiculo,
      cliente,
      clienteId: veiculo.cliente_id,
      cliente_nome: cliente?.nome || veiculo.cliente?.nome || 'Desconhecido',
      pertenceGrupoVeiculos: Boolean(cliente?.possuiGrupoVeiculos),
      pertenceFrota: Boolean(cliente?.possuiFrota),
    };
  }

  private mapOsToApi(os: any) {
    if (!os?.itens) return os;
    const itens = os.itens.map((item: any) => this.mapItemToApi(item));
    const financeiro = calcularFinanceiroOs({ ...os, itens });
    const cliente = this.mapClienteToApi(os.cliente);
    const veiculo = this.mapVeiculoToApi(os.veiculo);
    return {
      ...os,
      cliente,
      veiculo,
      itens,
      ...financeiro,
    };
  }

  async getFinanceiro(id: string) {
    const os = await this.findOne(id);
    return {
      ordemServicoId: os.id,
      numeroOS: os.numeroOS,
      totalServicos: os.totalServicos,
      totalPecas: os.totalPecas,
      desconto: os.desconto,
      totalGeral: os.totalGeral,
      totalOS: os.totalOS,
      valorPago: os.valorPago,
      totalPago: os.totalPago,
      saldoPendente: os.saldoPendente,
      statusFinanceiro: os.statusFinanceiro,
      pagamentos: os.pagamentos,
    };
  }

  private normalizarStatus(status?: string | null) {
    const value = String(status || '').trim().toUpperCase();
    if (!value) return null;
    if (!OS_STATUS_VALIDOS.includes(value)) {
      throw new BadRequestException('Status da OS inválido.');
    }
    return value === 'CONCLUIDO' ? 'CONCLUIDA' : value;
  }

  private sanitizePathPart(value: string) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'arquivo';
  }

  private osFolderName(os: { id: string; numeroOS?: number | string | null }) {
    const numero = os.numeroOS ? String(os.numeroOS).padStart(6, '0') : 'sem-numero';
    return this.sanitizePathPart(`os-${numero}-${os.id.slice(0, 8)}`);
  }

  private ensureOsDocumentFolder(os: { id: string; numeroOS?: number | string | null }) {
    const folderName = this.osFolderName(os);
    const absolutePath = join(process.cwd(), 'uploads', 'os', folderName);
    if (!existsSync(absolutePath)) mkdirSync(absolutePath, { recursive: true });
    return { folderName, absolutePath };
  }

  private mapDocumento(documento: any) {
    return {
      ...documento,
      tamanhoBytes: documento.tamanho,
      url: `/uploads/${documento.caminho.replace(/\\/g, '/')}`,
    };
  }

  private async movimentarEstoqueOs(
    tx: any,
    params: {
      produtoId: string;
      quantidade: number;
      ordemServicoId: string;
      numeroOS?: number | string | null;
      usuarioId?: string | null;
      operacao: 'BAIXA' | 'DEVOLUCAO';
      motivo: string;
    },
  ) {
    const produto = await tx.produto.findUnique({ where: { id: params.produtoId } });
    if (!produto) throw new BadRequestException(`Produto informado na OS não encontrado: ${params.produtoId}`);

    const quantidade = this.normalizarQuantidade(params.quantidade);
    if (produto.controlaEstoque === false) return produto;

    const previousQuantity = Number(produto.quantityInStock ?? 0);
    const newQuantity = params.operacao === 'BAIXA'
      ? previousQuantity - quantidade
      : previousQuantity + quantidade;

    if (newQuantity < 0) {
      throw new BadRequestException(`Estoque insuficiente para ${produto.nome}. Saldo atual: ${previousQuantity}.`);
    }

    await tx.movimentacaoEstoque.create({
      data: {
        produtoId: params.produtoId,
        tipo: params.operacao === 'BAIXA' ? TipoMovimentacao.SAIDA_OS : TipoMovimentacao.ENTRADA_DEVOLUCAO_OS,
        quantidade,
        previousQuantity,
        newQuantity,
        reason: `${params.motivo}${params.numeroOS ? ` - OS #${params.numeroOS}` : ''}`,
        justificativa: `${params.motivo}${params.numeroOS ? ` - OS #${params.numeroOS}` : ''}`,
        serviceOrderNumber: params.numeroOS ? String(params.numeroOS) : null,
        notes: `Movimentação gerada automaticamente pela Ordem de Serviço${params.numeroOS ? ` #${params.numeroOS}` : ''}.`,
        ordemServicoId: params.ordemServicoId,
        usuarioId: params.usuarioId || null,
      },
    });

    const updatedProduto = await tx.produto.update({
      where: { id: params.produtoId },
      data: { quantityInStock: newQuantity },
    });

    if (params.ordemServicoId) {
      await this.osEventos.registrarEvento({
        ordemServicoId: params.ordemServicoId,
        usuarioId: params.usuarioId,
        tipo: params.operacao === 'BAIXA' ? 'ESTOQUE_BAIXADO' : 'ESTOQUE_DEVOLVIDO',
        titulo: params.operacao === 'BAIXA' ? 'Estoque Baixado' : 'Estoque Devolvido',
        descricao: `${params.quantidade}x do produto ID: ${params.produtoId}`,
        severidade: 'INFO',
        origem: 'ESTOQUE'
      }, tx);
    }

    return updatedProduto;
  }

  private async ajustarEstoqueCancelamento(tx: any, os: any, nextStatus: string, usuarioId?: string | null) {
    if (!os?.itens?.length) return;

    if (nextStatus === 'CANCELADA' && os.status !== 'CANCELADA') {
      const quantidadePorProduto = new Map<string, number>();
      for (const item of os.itens) {
        if (!item.produtoId) continue;
        quantidadePorProduto.set(
          item.produtoId,
          (quantidadePorProduto.get(item.produtoId) || 0) + this.normalizarQuantidade(item.quantidade),
        );
      }

      for (const [produtoId, quantidadeTotal] of quantidadePorProduto.entries()) {
        const devolucoesCancelamento = await tx.movimentacaoEstoque.findMany({
          where: {
            produtoId,
            ordemServicoId: os.id,
            tipo: TipoMovimentacao.ENTRADA_DEVOLUCAO_OS,
            OR: [
              { reason: { contains: 'cancelamento' } },
              { justificativa: { contains: 'cancelamento' } },
            ],
          },
        });
        const quantidadeJaDevolvida = devolucoesCancelamento.reduce((acc: number, mov: any) => acc + Number(mov.quantidade || 0), 0);
        const quantidadeADevolver = Math.max(quantidadeTotal - quantidadeJaDevolvida, 0);
        if (quantidadeADevolver <= 0) continue;

        await this.movimentarEstoqueOs(tx, {
          produtoId,
          quantidade: quantidadeADevolver,
          ordemServicoId: os.id,
          numeroOS: os.numeroOS,
          usuarioId,
          operacao: 'DEVOLUCAO',
          motivo: 'Devolucao automatica por cancelamento de OS',
        });
      }
    }

    if (os.status === 'CANCELADA' && nextStatus !== 'CANCELADA') {
      for (const item of os.itens) {
        if (!item.produtoId) continue;
        await this.movimentarEstoqueOs(tx, {
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          ordemServicoId: os.id,
          numeroOS: os.numeroOS,
          usuarioId,
          operacao: 'BAIXA',
          motivo: 'Baixa automatica por reabertura de OS cancelada',
        });
      }
    }
  }

  private async bloquearCancelamentoEncerradoSeNecessario(os: any, user?: any) {
    if (!os || os.status === 'CANCELADA') return;
    if (!['PAGO', 'ENTREGUE'].includes(os.status)) return;

    const role = normalizeRole(user?.cargo);
    if (['ADMIN', 'GERENTE'].includes(role)) return;

    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_CANCEL_BLOCKED',
      entity: 'ORDEM_SERVICO',
      entityId: os.id,
      description: `Cancelamento bloqueado para OS encerrada: ${os.numeroOS}`,
      metadata: { status: os.status, role },
    });
    throw new BadRequestException('OS paga ou entregue so pode ser cancelada por ADMIN ou GERENTE, com conferencia operacional.');
  }

  async create(data: any, user?: any) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id: data.clienteId } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    const veiculo = await this.prisma.veiculo.findUnique({ where: { id: data.veiculoId } });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado');
    if (veiculo.cliente_id !== cliente.id) {
      throw new BadRequestException('Veículo informado não pertence ao cliente selecionado.');
    }

    const codigoUnicoAceite = crypto.randomBytes(6).toString('hex').toUpperCase();
    const os = await this.prisma.ordemServico.create({
      data: {
        cliente_id: data.clienteId,
        veiculo_id: data.veiculoId,
        responsavel_id: data.responsavelId,
        descricao: data.descricao,
        relatoMecanico: data.relatoMecanico || data.observacoes || null,
        diagnostico: data.diagnostico || null,
        placaVeiculo: data.placaVeiculo || veiculo.placa || 'XXX-0000',
        modeloVeiculo: data.modeloVeiculo || [veiculo.marca, veiculo.modelo].filter(Boolean).join(' ') || 'Desconhecido',
        status: this.normalizarStatus(data.status) || 'ABERTA',
        codigoUnicoAceite,
      },
    });

    let pdfName = null;
    try {
      pdfName = await this.pdfService.generateAcceptanceTerm(os.id, codigoUnicoAceite, os.placaVeiculo, os.modeloVeiculo);
    } catch (error) {
      console.error('Aviso: falha ao gerar PDF de aceite, mas a OS foi criada.', error);
    }

    const osCompleta = { ...os, termoPdfRecomendado: pdfName };
    try {
      this.osGateway.broadcastNovaOS(osCompleta);
    } catch (error) {
      console.error('Aviso: falha ao emitir WebSocket de nova OS.', error);
    }

    this.ensureOsDocumentFolder(os);

    await this.osEventos.registrarEvento({
      ordemServicoId: os.id,
      usuarioId: user?.id,
      tipo: 'OS_CRIADA',
      titulo: 'OS Criada',
      descricao: `Ordem de Serviço #${os.numeroOS} criada.`,
      severidade: 'INFO',
    });

    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_CREATED',
      entity: 'ORDEM_SERVICO',
      entityId: os.id,
      description: `Ordem de Serviço criada: ${os.numeroOS}`,
      metadata: { numeroOS: os.numeroOS, clienteId: os.cliente_id, veiculoId: os.veiculo_id },
    });

    return osCompleta;
  }

  async assinarTermo(id: string, codigo: string) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (os.codigoUnicoAceite !== codigo) throw new BadRequestException('Código de aceite inválido.');

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        status: 'ASSINADO',
        termoAssinadoUrl: `/uploads/termos/termo_${id}_assinado.pdf`,
      },
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      tipo: 'TERMO_ASSINADO',
      titulo: 'Termo de Aceite Assinado',
      descricao: 'Termo assinado pelo cliente.',
      severidade: 'SUCESSO',
    });

    return updated;
  }

  async iniciarExecucao(id: string) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (!os.termoAssinadoUrl) throw new BadRequestException('Não pode iniciar execução sem a assinatura do termo.');

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'EM_EXECUCAO' },
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      tipo: 'EXECUCAO_INICIADA',
      titulo: 'Execução Iniciada',
      severidade: 'INFO',
    });

    return updated;
  }

  async addItens(id: string, itens: { produtoId?: string; servicoNome?: string; quantidade: number; valorUnitario: number }[], usuarioId: string) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (!usuarioId) throw new BadRequestException('Usuário autenticado não identificado.');

    return this.prisma.$transaction(async (tx) => {
      for (const item of itens) {
        const quantidade = this.normalizarQuantidade(item.quantidade);
        const valorUnitario = this.normalizarValorUnitario(item.valorUnitario);

        if (item.produtoId) {
          const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
          if (!produto) throw new BadRequestException(`Produto informado na OS não encontrado: ${item.produtoId}`);
        }

        await tx.itemOS.create({
          data: {
            ordemServicoId: id,
            produtoId: item.produtoId,
            servicoNome: item.servicoNome,
            quantidade,
            valorUnitario,
            subtotal: quantidade * valorUnitario,
          },
        });
      }

      return this.recalcularTotais(tx, id, os.descontoAplicado);
    });
  }

  async finalizar(id: string, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'CONCLUIDA' },
      include: this.osInclude,
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      usuarioId: user?.id,
      tipo: 'OS_FINALIZADA',
      titulo: 'OS Finalizada',
      severidade: 'SUCESSO',
      antes: os.status,
      depois: 'CONCLUIDA'
    });

    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_COMPLETED',
      entity: 'ORDEM_SERVICO',
      entityId: id,
      description: `Ordem de Serviço concluída: ${updated.numeroOS}`,
    });
    return this.mapOsToApi(updated);
  }

  async aplicarDesconto(id: string, descontoAplicado: number, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id }, include: { itens: true } });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (['PAGO', 'CANCELADA'].includes(os.status)) {
      throw new BadRequestException('Não é permitido aplicar desconto em OS paga ou cancelada.');
    }

    const valorMaoDeObra = os.itens.filter((i) => !i.produtoId).reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0);
    const valorPecas = os.itens.filter((i) => i.produtoId).reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0);
    const valorTotal = valorMaoDeObra + valorPecas;
    const desconto = Number(descontoAplicado);
    if (!Number.isFinite(desconto) || desconto < 0) {
      throw new BadRequestException('Desconto deve ser um valor valido.');
    }
    if (desconto > valorTotal) {
      throw new BadRequestException('Desconto não pode ser maior que o total da OS.');
    }
    const role = normalizeRole(user?.cargo);
    if (role === 'MECANICO') {
      throw new BadRequestException('Mecânicos não possuem permissão para aplicar desconto na OS.');
    }
    if (role === 'ATENDENTE') {
      const limite = valorTotal * 0.05;
      if (desconto > limite) {
        throw new BadRequestException(`Atendente pode aplicar desconto de ate 5% do total da OS. Limite atual: R$ ${limite.toFixed(2)}.`);
      }
    }

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        descontoAplicado: desconto,
        valorMaoDeObra,
        valorFinal: valorTotal - desconto,
      },
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      usuarioId: user?.id,
      tipo: 'DESCONTO_APLICADO',
      titulo: 'Desconto Aplicado',
      descricao: `Desconto de R$ ${desconto.toFixed(2)} aplicado.`,
      severidade: 'INFO',
      antes: String(os.descontoAplicado || 0),
      depois: String(desconto)
    });

    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_DISCOUNT_APPLIED',
      entity: 'ORDEM_SERVICO',
      entityId: id,
      description: `Desconto aplicado na Ordem de Serviço: ${updated.numeroOS}`,
      metadata: { descontoAplicado: desconto, valorTotal, role },
    });
    return updated;
  }

  async update(id: string, data: any, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: { itens: true },
    });
    if (!os) throw new NotFoundException('OS não encontrada');

    const normalizedStatus = this.normalizarStatus(data.status);
    if (['CONCLUIDO', 'CONCLUIDA'].includes(os.status) && normalizedStatus && !['CONCLUIDO', 'CONCLUIDA'].includes(normalizedStatus)) {
      if (!user || !isAdminRole(user.cargo)) {
        throw new BadRequestException('Acao negada: apenas administradores e diretores podem reabrir uma OS finalizada.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        descricao: data.descricao !== undefined ? data.descricao : os.descricao,
        relatoMecanico: data.relatoMecanico !== undefined ? data.relatoMecanico : os.relatoMecanico,
        diagnostico: data.diagnostico !== undefined ? data.diagnostico : os.diagnostico,
        diagnosticoConfirmado: data.diagnosticoConfirmado !== undefined ? data.diagnosticoConfirmado : os.diagnosticoConfirmado,
        testesRealizados: data.testesRealizados !== undefined ? data.testesRealizados : os.testesRealizados,
        resultadoDosTestes: data.resultadoDosTestes !== undefined ? data.resultadoDosTestes : os.resultadoDosTestes,
        solucaoAplicada: data.solucaoAplicada !== undefined ? data.solucaoAplicada : os.solucaoAplicada,
        observacoesTecnicasFinais: data.observacoesTecnicasFinais !== undefined ? data.observacoesTecnicasFinais : os.observacoesTecnicasFinais,
        responsavelTecnico: data.responsavelTecnico !== undefined ? data.responsavelTecnico : os.responsavelTecnico,
        dataHoraConclusaoTecnica: data.dataHoraConclusaoTecnica !== undefined ? data.dataHoraConclusaoTecnica : os.dataHoraConclusaoTecnica,
      };

      const techFieldsChanged =
        (data.diagnosticoConfirmado !== undefined && data.diagnosticoConfirmado !== os.diagnosticoConfirmado) ||
        (data.testesRealizados !== undefined && data.testesRealizados !== os.testesRealizados) ||
        (data.resultadoDosTestes !== undefined && data.resultadoDosTestes !== os.resultadoDosTestes) ||
        (data.solucaoAplicada !== undefined && data.solucaoAplicada !== os.solucaoAplicada) ||
        (data.observacoesTecnicasFinais !== undefined && data.observacoesTecnicasFinais !== os.observacoesTecnicasFinais) ||
        (data.responsavelTecnico !== undefined && data.responsavelTecnico !== os.responsavelTecnico) ||
        (data.dataHoraConclusaoTecnica !== undefined && new Date(data.dataHoraConclusaoTecnica).getTime() !== new Date(os.dataHoraConclusaoTecnica || 0).getTime());


      if (normalizedStatus === 'PAGO') {
        throw new BadRequestException('Pagamento de OS deve ser registrado somente pelo Caixa/PDV.');
      }

      if (normalizedStatus) {
        if (normalizedStatus === 'CANCELADA') {
          await this.bloquearCancelamentoEncerradoSeNecessario(os, user);
        }
        await this.ajustarEstoqueCancelamento(tx, os, normalizedStatus, user?.id);
        updateData.status = normalizedStatus;
      }

      if (data.itens && Array.isArray(data.itens) && normalizedStatus !== 'CANCELADA') {
        if (['PAGO', 'CANCELADA'].includes(os.status)) {
          throw new BadRequestException('Não é permitido alterar itens de uma OS paga ou cancelada.');
        }

        const itensNormalizados = await Promise.all(
          data.itens.map(async (item: any) => {
            const idItem = item.id || null;
            const produtoId = item.produtoId || null;
            const servicoId = item.servicoId || null;
            const quantidade = this.normalizarQuantidade(item.quantidade);
            const valorUnitario = this.normalizarValorUnitario(item.valorUnitario);

            if (produtoId) {
              const produto = await tx.produto.findUnique({ where: { id: produtoId } });
              if (!produto) throw new BadRequestException(`Produto informado na OS não encontrado: ${produtoId}`);
              return {
                id: idItem,
                produtoId,
                servicoId,
                tipoItem: item.tipoItem || 'PRODUTO',
                servicoNome: String(item.servicoNome ?? produto.nome).trim() || produto.nome,
                descricao: String(item.descricao ?? '').trim(),
                observacao: String(item.observacao ?? '').trim(),
                quantidade,
                valorUnitario,
                subtotal: quantidade * valorUnitario,
              };
            }

            return {
              id: idItem,
              produtoId,
              servicoId,
              tipoItem: 'SERVICO',
              servicoNome: this.normalizarNomeServico(item.servicoNome),
              descricao: String(item.descricao ?? '').trim(),
              observacao: String(item.observacao ?? '').trim(),
              quantidade,
              valorUnitario,
              subtotal: quantidade * valorUnitario,
            };
          }),
        );

        const itensExistentes = await tx.itemOS.findMany({ where: { ordemServicoId: id } });
        const existentesPorId = new Map(itensExistentes.map((item: any) => [item.id, item]));
        const idsRecebidos = new Set(itensNormalizados.map((item: any) => item.id).filter(Boolean));

        for (const itemExistente of itensExistentes) {
          if (idsRecebidos.has(itemExistente.id)) continue;
          if (itemExistente.produtoId) {
            await this.movimentarEstoqueOs(tx, {
              produtoId: itemExistente.produtoId,
              quantidade: itemExistente.quantidade,
              ordemServicoId: id,
              numeroOS: os.numeroOS,
              usuarioId: user?.id,
              operacao: 'DEVOLUCAO',
              motivo: 'Devolucao automatica por item removido da OS',
            });
          }
          await tx.itemOS.delete({ where: { id: itemExistente.id } });
        }

        for (const item of itensNormalizados) {
          const nomePersistido = item.produtoId
            ? item.servicoNome
            : this.compactarServicoManual(item.servicoNome, item.descricao);

          const itemExistente = item.id ? existentesPorId.get(item.id) : null;
          if (itemExistente) {
            if (itemExistente.produtoId && (itemExistente.produtoId !== item.produtoId || itemExistente.quantidade !== item.quantidade)) {
              await this.movimentarEstoqueOs(tx, {
                produtoId: itemExistente.produtoId,
                quantidade: itemExistente.quantidade,
                ordemServicoId: id,
                numeroOS: os.numeroOS,
                usuarioId: user?.id,
                operacao: 'DEVOLUCAO',
                motivo: 'Devolucao automatica por ajuste de item da OS',
              });
            }
            if (item.produtoId && (itemExistente.produtoId !== item.produtoId || itemExistente.quantidade !== item.quantidade)) {
              await this.movimentarEstoqueOs(tx, {
                produtoId: item.produtoId,
                quantidade: item.quantidade,
                ordemServicoId: id,
                numeroOS: os.numeroOS,
                usuarioId: user?.id,
                operacao: 'BAIXA',
                motivo: 'Baixa automatica por ajuste de item da OS',
              });
            }

            await tx.itemOS.update({
              where: { id: itemExistente.id },
              data: {
                tipoItem: item.tipoItem,
                servicoId: item.servicoId,
                produtoId: item.produtoId,
                servicoNome: nomePersistido,
                descricao: item.descricao || null,
                observacao: item.observacao || null,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                subtotal: item.subtotal,
              },
            });
          } else {
            if (item.produtoId) {
              await this.movimentarEstoqueOs(tx, {
                produtoId: item.produtoId,
                quantidade: item.quantidade,
                ordemServicoId: id,
                numeroOS: os.numeroOS,
                usuarioId: user?.id,
                operacao: 'BAIXA',
                motivo: 'Baixa automatica por item adicionado a OS',
              });
            }
            await tx.itemOS.create({
              data: {
                ordemServicoId: id,
                tipoItem: item.tipoItem,
                servicoId: item.servicoId,
                produtoId: item.produtoId,
                servicoNome: nomePersistido,
                descricao: item.descricao || null,
                observacao: item.observacao || null,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                subtotal: item.subtotal,
              },
            });
          }
        }
      }

      const todosItens = await tx.itemOS.findMany({ where: { ordemServicoId: id } });
      const valorMaoDeObra = todosItens.filter((i) => !i.produtoId).reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0);
      const valorPecas = todosItens.filter((i) => i.produtoId).reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0);
      const valorTotal = valorMaoDeObra + valorPecas;

      updateData.valorMaoDeObra = valorMaoDeObra;
      updateData.valorFinal = valorTotal - (os.descontoAplicado || 0);

      const osAtualizada = await tx.ordemServico.update({
        where: { id },
        data: updateData,
        include: this.osInclude,
      });

      if (techFieldsChanged) {
        await this.osEventos.registrarEvento({
          ordemServicoId: id,
          usuarioId: user?.id,
          tipo: 'EXECUCAO_TECNICA_ATUALIZADA',
          titulo: 'Execução técnica atualizada',
          descricao: 'Informações técnicas da execução foram registradas ou atualizadas.',
          origem: 'OS',
          severidade: 'INFO',
        }, tx);
      }

      return this.mapOsToApi(osAtualizada);
    });
    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_UPDATED',
      entity: 'ORDEM_SERVICO',
      entityId: id,
      description: `Ordem de Serviço atualizada: ${updated.numeroOS || id}`,
      metadata: { status: updated.status },
    });
    return updated;
  }

  async alterarStatus(id: string, status: string, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id }, include: { itens: true } });
    if (!os) throw new NotFoundException('OS não encontrada');
    const normalizedStatus = this.normalizarStatus(status);
    if (!normalizedStatus) throw new BadRequestException('Informe o status da OS.');
    if (normalizedStatus === 'PAGO') {
      throw new BadRequestException('Pagamento de OS deve ser registrado somente pelo Caixa/PDV.');
    }
    if (normalizedStatus === 'CANCELADA') {
      await this.bloquearCancelamentoEncerradoSeNecessario(os, user);
    }
    if (['CONCLUIDO', 'CONCLUIDA'].includes(os.status) && !['CONCLUIDO', 'CONCLUIDA'].includes(normalizedStatus)) {
      if (!user || !isAdminRole(user.cargo)) {
        throw new BadRequestException('Acao negada: apenas administradores e diretores podem reabrir uma OS finalizada.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.ajustarEstoqueCancelamento(tx, os, normalizedStatus, user?.id);

      await this.osEventos.registrarEvento({
        ordemServicoId: id,
        usuarioId: user?.id,
        tipo: 'STATUS_ALTERADO',
        titulo: 'Status Alterado',
        descricao: `Status alterado de ${os.status} para ${normalizedStatus}.`,
        severidade: 'INFO',
        antes: os.status,
        depois: normalizedStatus
      }, tx);

      return tx.ordemServico.update({
        where: { id },
        data: { status: normalizedStatus },
        include: this.osInclude,
      });
    });
    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_UPDATED',
      entity: 'ORDEM_SERVICO',
      entityId: id,
      description: `Status da Ordem de Serviço alterado: ${updated.numeroOS}`,
      metadata: { status: normalizedStatus },
    });
    return this.mapOsToApi(updated);
  }

  async adicionarServico(id: string, data: any, user?: any) {
    return this.adicionarItem(id, { ...data, tipoItem: 'SERVICO', produtoId: null }, user);
  }

  async adicionarProduto(id: string, data: any, user?: any) {
    return this.adicionarItem(id, { ...data, tipoItem: data.tipoItem || 'PRODUTO' }, user);
  }

  private async adicionarItem(id: string, data: any, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (['PAGO', 'CANCELADA'].includes(os.status)) {
      throw new BadRequestException('Não é permitido alterar itens de uma OS paga ou cancelada.');
    }

    const quantidade = this.normalizarQuantidade(data.quantidade);
    const valorUnitario = this.normalizarValorUnitario(data.valorUnitario);
    const produtoId = data.produtoId || null;
    const servicoId = data.servicoId || null;

    const updated = await this.prisma.$transaction(async (tx) => {
      let servicoNome = String(data.servicoNome || '').trim();
      let descricao = String(data.descricao || '').trim();

      if (produtoId) {
        const produto = await tx.produto.findUnique({ where: { id: produtoId } });
        if (!produto) throw new BadRequestException(`Produto informado na OS não encontrado: ${produtoId}`);
        servicoNome = servicoNome || produto.nome;
        descricao = descricao || produto.descricao || '';
        await this.movimentarEstoqueOs(tx, {
          produtoId,
          quantidade,
          ordemServicoId: id,
          numeroOS: os.numeroOS,
          usuarioId: user?.id,
          operacao: 'BAIXA',
          motivo: 'Baixa automatica por item adicionado a OS',
        });
      } else if (servicoId) {
        const servico = await tx.servico.findUnique({ where: { id: servicoId } });
        if (!servico) throw new BadRequestException(`Serviço informado na OS não encontrado: ${servicoId}`);
        servicoNome = servicoNome || servico.nome;
        descricao = descricao || servico.descricao || '';
      } else {
        servicoNome = this.normalizarNomeServico(servicoNome);
      }

      await tx.itemOS.create({
        data: {
          ordemServicoId: id,
          tipoItem: produtoId ? data.tipoItem || 'PRODUTO' : 'SERVICO',
          servicoId,
          produtoId,
          servicoNome: produtoId ? servicoNome : this.compactarServicoManual(servicoNome, descricao),
          descricao: descricao || null,
          observacao: data.observacao || null,
          quantidade,
          valorUnitario,
          subtotal: quantidade * valorUnitario,
        },
      });

      await this.osEventos.registrarEvento({
        ordemServicoId: id,
        usuarioId: user?.id,
        tipo: produtoId ? 'PRODUTO_ADICIONADO' : 'SERVICO_ADICIONADO',
        titulo: produtoId ? 'Produto Adicionado' : 'Serviço Adicionado',
        descricao: `${quantidade}x ${servicoNome} (R$ ${valorUnitario.toFixed(2)})`,
        severidade: 'INFO',
      }, tx);

      await this.recalcularTotais(tx, id, os.descontoAplicado);
      return tx.ordemServico.findUnique({
        where: { id },
        include: this.osInclude,
      });
    });

    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_UPDATED',
      entity: 'ORDEM_SERVICO',
      entityId: id,
      description: `Item adicionado à Ordem de Serviço: ${updated?.numeroOS || id}`,
    });
    return this.mapOsToApi(updated);
  }

  async removerItem(id: string, itemId: string, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (['PAGO', 'CANCELADA'].includes(os.status)) {
      throw new BadRequestException('Não é permitido alterar itens de uma OS paga ou cancelada.');
    }

    const item = await this.prisma.itemOS.findFirst({ where: { id: itemId, ordemServicoId: id } });
    if (!item) throw new NotFoundException('Item da OS não encontrado');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (item.produtoId) {
        await this.movimentarEstoqueOs(tx, {
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          ordemServicoId: id,
          numeroOS: os.numeroOS,
          usuarioId: user?.id,
          operacao: 'DEVOLUCAO',
          motivo: 'Devolucao automatica por item removido da OS',
        });
      }
      await tx.itemOS.delete({ where: { id: itemId } });

      await this.osEventos.registrarEvento({
        ordemServicoId: id,
        usuarioId: user?.id,
        tipo: item.produtoId ? 'PRODUTO_REMOVIDO' : 'SERVICO_REMOVIDO',
        titulo: item.produtoId ? 'Produto Removido' : 'Serviço Removido',
        descricao: `Item removido da OS.`,
        severidade: 'INFO',
      }, tx);

      await this.recalcularTotais(tx, id, os.descontoAplicado);
      return tx.ordemServico.findUnique({
        where: { id },
        include: this.osInclude,
      });
    });

    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_UPDATED',
      entity: 'ORDEM_SERVICO',
      entityId: id,
      description: `Item removido da Ordem de Serviço: ${updated?.numeroOS || id}`,
    });
    return this.mapOsToApi(updated);
  }

  async findAll() {
    const ordens = await this.prisma.ordemServico.findMany({
      include: this.osInclude,
      orderBy: { criadoEm: 'desc' },
    });
    return ordens.map((os) => this.mapOsToApi(os));
  }

  async findOne(id: string) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: this.osInclude,
    });
    if (!os) throw new NotFoundException('OS não encontrada');
    return this.mapOsToApi(os);
  }

  async listAnexos(id: string) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');
    this.ensureOsDocumentFolder(os);

    const documentos = await this.prisma.ordemServicoDocumento.findMany({
      where: { ordemServicoId: id },
      orderBy: { criadoEm: 'desc' },
    });

    return documentos.map((documento) => this.mapDocumento(documento));
  }

  async uploadAnexo(id: string, file: Express.Multer.File | undefined, data: { tipoDocumento?: string }, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('OS não encontrada');
    if (!file) throw new BadRequestException('Arquivo e obrigatorio.');

    if (os.status === 'CANCELADA') {
      throw new BadRequestException('Não é permitido anexar documentos em OS cancelada.');
    }
    if (os.status === 'PAGO' && !['ADMIN', 'GERENTE'].includes(normalizeRole(user?.cargo))) {
      throw new BadRequestException('OS paga permite apenas visualizacao de documentos para este perfil.');
    }

    const tipoDocumento = String(data.tipoDocumento || 'OUTROS').trim().toUpperCase();
    if (!this.allowedDocumentTypes.has(tipoDocumento)) {
      throw new BadRequestException('Tipo de documento inválido.');
    }

    const { folderName, absolutePath } = this.ensureOsDocumentFolder(os);
    const originalName = file.originalname || 'documento';
    const extension = this.sanitizePathPart(extname(originalName).toLowerCase().replace('.', ''));
    const baseName = this.sanitizePathPart(originalName.replace(extname(originalName), ''));
    const safeName = `${Date.now()}-${baseName}${extension ? `.${extension}` : ''}`;
    const filePath = join(absolutePath, safeName);

    writeFileSync(filePath, file.buffer);

    const documento = await this.prisma.ordemServicoDocumento.create({
      data: {
        ordemServicoId: id,
        tipoDocumento,
        nomeOriginal: originalName,
        nomeArquivo: safeName,
        caminho: join('os', folderName, safeName).replace(/\\/g, '/'),
        mimeType: file.mimetype || 'application/octet-stream',
        tamanho: file.size,
        criadoPor: user?.id || null,
      },
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      usuarioId: user?.id,
      tipo: 'ANEXO_ADICIONADO',
      titulo: 'Anexo Adicionado',
      descricao: `Documento anexado: ${originalName}`,
      severidade: 'INFO',
    });

    return this.mapDocumento(documento);
  }

  async cancelarOrdemServico(id: string, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: { itens: true, transacoes: true },
    });
    if (!os) throw new NotFoundException('OS não encontrada');
    const financeiro = calcularFinanceiroOs(os);
    const role = normalizeRole(user?.cargo);
    const canCancelEncerrada = ['ADMIN', 'GERENTE'].includes(role);

    if (os.status === 'CANCELADA') {
      await this.auditService.logAction({
        userId: user?.id,
        action: 'OS_CANCEL_ALREADY_CANCELLED',
        entity: 'ORDEM_SERVICO',
        entityId: id,
        description: `Cancelamento ignorado: OS ja estava cancelada ${os.numeroOS}`,
      });
      const atual = await this.prisma.ordemServico.findUnique({
        where: { id },
        include: this.osInclude,
      });
      return {
        mensagem: 'OS ja estava cancelada. Nenhuma devolucao adicional de estoque foi realizada.',
        os: this.mapOsToApi(atual),
      };
    }

    if (['PAGO', 'ENTREGUE'].includes(os.status) || financeiro.statusFinanceiro === 'PAGO') {
      if (!canCancelEncerrada) {
        await this.auditService.logAction({
          userId: user?.id,
          action: 'OS_CANCEL_BLOCKED',
          entity: 'ORDEM_SERVICO',
          entityId: id,
          description: `Cancelamento bloqueado para OS encerrada: ${os.numeroOS}`,
          metadata: { status: os.status, statusFinanceiro: financeiro.statusFinanceiro, role },
        });
        throw new BadRequestException('OS paga ou entregue so pode ser cancelada por ADMIN ou GERENTE, com conferencia operacional.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.ajustarEstoqueCancelamento(tx, os, 'CANCELADA', user?.id);

      await this.osEventos.registrarEvento({
        ordemServicoId: id,
        usuarioId: user?.id,
        tipo: 'OS_CANCELADA',
        titulo: 'OS Cancelada',
        descricao: 'A Ordem de Serviço foi cancelada com segurança.',
        severidade: 'CRITICO',
      }, tx);

      return tx.ordemServico.update({
        where: { id },
        data: { status: 'CANCELADA' },
        include: this.osInclude,
      });
    });
    await this.auditService.logAction({
      userId: user?.id,
      action: 'OS_CANCELLED',
      entity: 'ORDEM_SERVICO',
      entityId: id,
      description: `Ordem de Serviço cancelada com preservação de histórico: ${updated.numeroOS}`,
      metadata: { statusAnterior: os.status, statusFinanceiro: financeiro.statusFinanceiro },
    });
    return {
      mensagem: 'OS cancelada com segurança. Histórico, itens, movimentações, transações e anexos foram preservados.',
      os: this.mapOsToApi(updated),
    };
  }

  async remove(id: string, user?: any) {
    return this.cancelarOrdemServico(id, user);
  }

  private async recalcularTotais(tx: any, ordemServicoId: string, descontoAplicado = 0) {
    const todosItens = await tx.itemOS.findMany({ where: { ordemServicoId } });
    const valorMaoDeObra = todosItens.filter((i: any) => !i.produtoId).reduce((acc: number, i: any) => acc + i.valorUnitario * i.quantidade, 0);
    const valorPecas = todosItens.filter((i: any) => i.produtoId).reduce((acc: number, i: any) => acc + i.valorUnitario * i.quantidade, 0);
    const valorTotal = valorMaoDeObra + valorPecas;

    return tx.ordemServico.update({
      where: { id: ordemServicoId },
      data: {
        valorMaoDeObra,
        valorFinal: valorTotal - descontoAplicado,
      },
    });
  }

  // --- Fluxo de Orçamentos ---

  async elaborarOrcamento(ordemServicoId: string, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: { itens: true, cliente: true, veiculo: true }
    });

    if (!os) throw new NotFoundException('OS não encontrada');
    if (!os.itens || os.itens.length === 0) {
      throw new BadRequestException('Adicione pelo menos uma peça ou serviço antes de elaborar o orçamento.');
    }

    const subtotalServicos = os.itens.filter((i: any) => !i.produtoId && i.tipoItem !== 'PECA').reduce((acc: number, i: any) => acc + i.subtotal, 0);
    const subtotalPecas = os.itens.filter((i: any) => !!i.produtoId || i.tipoItem === 'PECA').reduce((acc: number, i: any) => acc + i.subtotal, 0);
    const desconto = os.descontoAplicado || 0;
    const total = subtotalServicos + subtotalPecas - desconto;

    const orcamento = await this.prisma.$transaction(async (tx) => {
      const orc = await tx.orcamento.create({
        data: {
          ordemServicoId: os.id,
          subtotalServicos,
          subtotalPecas,
          desconto,
          total,
          status: 'EMITIDO',
          itens: {
            create: os.itens.map(item => ({
              tipo: item.produtoId || item.tipoItem === 'PECA' ? 'PECA' : 'SERVICO',
              descricao: item.servicoNome || item.descricao || 'Item',
              quantidade: item.quantidade,
              valorUnitario: item.valorUnitario,
              valorTotal: item.subtotal,
              observacao: item.observacao
            }))
          }
        },
        include: { itens: true }
      });

      await tx.ordemServico.update({
        where: { id: os.id },
        data: { status: 'AGUARDANDO_APROVACAO' }
      });

      return orc;
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: os.id,
      usuarioId: user?.id,
      tipo: 'ORCAMENTO_ELABORADO',
      titulo: 'Orçamento Elaborado',
      descricao: `Orçamento #${orcamento.numero} elaborado no valor de R$ ${total.toFixed(2)}.`,
      severidade: 'INFO',
    });

    return orcamento;
  }

  async listarOrcamentos(ordemServicoId: string) {
    return this.prisma.orcamento.findMany({
      where: { ordemServicoId },
      include: { itens: true },
      orderBy: { criadoEm: 'desc' }
    });
  }

  async detalharOrcamento(id: string) {
    const orcamento = await this.prisma.orcamento.findUnique({
      where: { id },
      include: { itens: true, ordemServico: { include: { cliente: true, veiculo: true } } }
    });
    if (!orcamento) throw new NotFoundException('Orçamento não encontrado');
    return orcamento;
  }

  async marcarOrcamentoEnviado(id: string, body: { canalEnvio: string, observacao?: string }, user?: any) {
    const orcamento = await this.detalharOrcamento(id);
    const updated = await this.prisma.orcamento.update({
      where: { id },
      data: {
        status: 'ENVIADO',
        enviadoEm: new Date(),
        canalEnvio: body.canalEnvio,
      }
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: orcamento.ordemServicoId,
      usuarioId: user?.id,
      tipo: 'ORCAMENTO_ENVIADO',
      titulo: 'Orçamento Enviado',
      descricao: `Orçamento #${orcamento.numero} marcado como enviado via ${body.canalEnvio}.${body.observacao ? ` Obs: ${body.observacao}` : ''}`,
      severidade: 'INFO',
    });

    return updated;
  }

  async aprovarOrcamento(id: string, body: { canalAprovacao: string, aprovadoPor: string, observacao?: string }, user?: any) {
    const orcamento = await this.detalharOrcamento(id);
    if (orcamento.status === 'APROVADO') throw new BadRequestException('Orçamento já está aprovado.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const orc = await tx.orcamento.update({
        where: { id },
        data: {
          status: 'APROVADO',
          aprovadoEm: new Date(),
          canalAprovacao: body.canalAprovacao,
          aprovadoPor: body.aprovadoPor,
        }
      });

      await tx.ordemServico.update({
        where: { id: orcamento.ordemServicoId },
        data: { status: 'APROVADA_PARA_EXECUCAO' }
      });

      return orc;
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: orcamento.ordemServicoId,
      usuarioId: user?.id,
      tipo: 'ORCAMENTO_APROVADO',
      titulo: 'Orçamento Aprovado',
      descricao: `Cliente aprovou o orçamento #${orcamento.numero}. OS liberada para execução.${body.observacao ? ` Obs: ${body.observacao}` : ''}`,
      severidade: 'SUCESSO',
    });

    return updated;
  }

  async recusarOrcamento(id: string, body: { canalRecusa: string, motivoRecusa: string, observacao?: string }, user?: any) {
    const orcamento = await this.detalharOrcamento(id);
    if (orcamento.status === 'RECUSADO') throw new BadRequestException('Orçamento já está recusado.');
    if (orcamento.status === 'APROVADO') throw new BadRequestException('Orçamento já foi aprovado e não pode ser recusado diretamente.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const orc = await tx.orcamento.update({
        where: { id },
        data: {
          status: 'RECUSADO',
          recusadoEm: new Date(),
          canalRecusa: body.canalRecusa,
          motivoRecusa: body.motivoRecusa,
        }
      });

      await tx.ordemServico.update({
        where: { id: orcamento.ordemServicoId },
        data: { status: 'ORCAMENTO_RECUSADO' }
      });
      
      return orc;
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: orcamento.ordemServicoId,
      usuarioId: user?.id,
      tipo: 'ORCAMENTO_RECUSADO',
      titulo: 'Orçamento Recusado',
      descricao: `Cliente recusou o orçamento #${orcamento.numero}. Motivo: ${body.motivoRecusa}.${body.observacao ? ` Obs: ${body.observacao}` : ''}`,
      severidade: 'ALERTA',
    });

    return updated;
  }

  async obterDocumentoOrcamento(id: string) {
    const orcamento = await this.detalharOrcamento(id);
    const os = orcamento.ordemServico as any;
    const cliente = os.cliente;
    const veiculo = os.veiculo;

    const servicos = orcamento.itens.filter((i: any) => i.tipo === 'SERVICO');
    const pecas = orcamento.itens.filter((i: any) => i.tipo === 'PECA');

    return {
      oficina: 'Oficina Avance',
      titulo: 'ORCAMENTO',
      numero: orcamento.numero,
      numeroOS: os.numeroOS,
      dataEmissao: orcamento.criadoEm,
      validade: orcamento.validadeDias,
      prazo: orcamento.prazoEstimado,
      cliente: {
        nome: cliente?.nome || 'Não informado',
        documento: cliente?.cpf_cnpj || 'Não informado',
        telefone: cliente?.telefone || 'Não informado',
        email: cliente?.email || 'Não informado',
        endereco: cliente ? `${cliente.rua || ''}, ${cliente.numero || ''} ${cliente.complemento ? ` - ${cliente.complemento}` : ''} - ${cliente.bairro || ''} - ${cliente.cidade || ''}/${cliente.estado || ''}`.replace(/^[\s,-]+|[\s,-]+$/g, '') || 'Não informado' : 'Não informado',
      },
      veiculo: {
        marcaModelo: `${veiculo?.marca || ''} ${veiculo?.modelo || ''}`.trim() || 'Não informado',
        placa: veiculo?.placa || os.placaVeiculo || 'Não informado',
        ano: veiculo?.ano || '',
        km: veiculo?.quilometragem || '',
        cor: veiculo?.cor || '',
      },
      servicos: servicos.map((s: any) => ({ descricao: s.descricao, qtd: s.quantidade, valor: s.valorUnitario, total: s.valorTotal })),
      pecas: pecas.map((p: any) => ({ descricao: p.descricao, qtd: p.quantidade, valor: p.valorUnitario, total: p.valorTotal })),
      resumo: {
        subtotalServicos: orcamento.subtotalServicos,
        subtotalPecas: orcamento.subtotalPecas,
        desconto: orcamento.desconto,
        totalGeral: orcamento.total,
      },
      status: orcamento.status
    };
  }

  async obterMensagemOrcamento(id: string) {
    const doc = await this.obterDocumentoOrcamento(id);
    const firstName = doc.cliente.nome.split(' ')[0] || 'Cliente';
    const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.resumo.totalGeral);
    
    return `Olá, ${firstName}. Aqui é da Oficina Avance.

Segue o orçamento referente ao veículo ${doc.veiculo.marcaModelo} ${doc.veiculo.ano}, placa ${doc.veiculo.placa}, vinculado à OS #${doc.numeroOS}.

Valor total do orçamento: ${valor}.
Validade: ${doc.validade} dias.

A execução dos serviços será iniciada somente após a sua aprovação.

Caso esteja de acordo, por favor confirme a aprovação por este canal.

Obrigado,
Oficina Avance`;
  }

  // --- CRM / Relacionamento ---

  async gerarPosVenda(id: string, user?: any) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: { cliente: true, veiculo: true }
    });

    if (!os) throw new NotFoundException('OS não encontrada');
    if (!['CONCLUIDO', 'CONCLUIDA', 'PAGO', 'ENTREGUE'].includes(os.status)) {
      throw new BadRequestException('Apenas OS finalizadas podem gerar pós-venda.');
    }

    const dataPrevista = new Date();
    dataPrevista.setDate(dataPrevista.getDate() + 2); // 2 dias apos finalizacao

    const nomeCliente = os.cliente.nome.split(' ')[0] || 'Cliente';
    const nomeVeiculo = os.veiculo ? `${os.veiculo.marca} ${os.veiculo.modelo}`.trim() : 'o seu veículo';
    
    const interacao = await this.prisma.clienteInteracao.create({
      data: {
        clienteId: os.cliente_id,
        veiculoId: os.veiculo_id,
        ordemServicoId: os.id,
        tipo: 'POS_VENDA',
        canal: 'WHATSAPP',
        prioridade: 'NORMAL',
        status: 'PENDENTE',
        assunto: `Pós-venda OS #${os.numeroOS}`,
        mensagemSugerida: `Olá, ${nomeCliente}. Aqui é da Oficina Avance.\n\nEstamos entrando em contato para saber se ${nomeVeiculo} ficou funcionando corretamente após o serviço realizado conosco.\n\nQualquer dúvida, estamos à disposição.`,
        dataPrevista,
        responsavelId: user?.id,
      }
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      usuarioId: user?.id,
      tipo: 'POS_VENDA_GERADO',
      titulo: 'Pós-venda Gerado',
      descricao: `Ação de CRM de pós-venda gerada automaticamente para a data ${dataPrevista.toLocaleDateString('pt-BR')}.`,
      severidade: 'INFO',
    });

    return interacao;
  }

  async anexarDocumentoDossie(id: string, payload: any, file: Express.Multer.File, user: any) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    
    const originalName = file.originalname || 'documento';
    const ext = extname(originalName).toLowerCase().replace('.', '');
    const allowedExts = ['pdf', 'xml', 'json', 'jpg', 'jpeg', 'png', 'xlsx', 'docx'];
    const blockedExts = ['exe', 'bat', 'cmd', 'ps1', 'msi', 'js', 'vbs', 'scr'];

    if (blockedExts.includes(ext) || !allowedExts.includes(ext)) {
      throw new BadRequestException('Tipo de arquivo não permitido.');
    }

    await this.findOne(id); // Valida se a OS existe

    const dir = join(process.cwd(), 'uploads', 'os', id, 'documentos');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const safeFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(originalName) || '.bin'}`;
    const filePath = join(dir, safeFilename);
    const relativo = `uploads/os/${id}/documentos/${safeFilename}`;

    let buffer = file.buffer;
    if (!buffer && (file as any).path) {
      buffer = await import('fs').then(fs => fs.promises.readFile((file as any).path));
    }
    if (!buffer) throw new BadRequestException('Erro ao processar conteúdo do arquivo.');

    await import('fs').then(fs => fs.promises.writeFile(filePath, buffer));

    const doc = await (this.prisma as any).documentoOrdemServico.create({
      data: {
        ordemServicoId: id,
        tipoDocumento: payload.tipoDocumento || 'OUTROS',
        descricao: payload.descricao || originalName,
        nomeOriginal: originalName,
        nomeArquivoSalvo: safeFilename,
        caminhoRelativo: relativo,
        mimeType: file.mimetype || 'application/octet-stream',
        tamanhoBytes: file.size || (buffer.length ?? 0),
        observacao: payload.observacao || null,
        usuarioId: user?.id || null,
      },
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      usuarioId: user?.id,
      tipo: doc.tipoDocumento === 'RELATORIO_TECNICO_FINAL' ? 'RELATORIO_TECNICO_FINAL_GERADO' : 'DOCUMENTO_ANEXADO',
      titulo: doc.tipoDocumento === 'RELATORIO_TECNICO_FINAL' ? 'Relatório Técnico Final gerado' : 'Documento anexado à OS',
      descricao: doc.tipoDocumento === 'RELATORIO_TECNICO_FINAL' ? 'Relatório técnico final foi gerado/anexado à OS.' : `Documento [${doc.tipoDocumento}] ${doc.nomeOriginal} foi anexado à Ordem de Serviço.`,
      origem: 'DOCUMENTO',
      severidade: 'INFO',
    });

    return doc;
  }

  async listarDocumentosDossie(id: string) {
    await this.findOne(id);
    try {
      const docs = await (this.prisma as any).documentoOrdemServico.findMany({
        where: { ordemServicoId: id, status: 'ATIVO' },
        orderBy: { criadoEm: 'desc' },
        include: { usuario: { select: { id: true, nome: true } } },
      });
      return docs || [];
    } catch (err: any) {
      return [];
    }
  }

  async baixarDocumentoDossie(id: string, documentoId: string) {
    const doc = await (this.prisma as any).documentoOrdemServico.findFirst({
      where: { id: documentoId, ordemServicoId: id, status: 'ATIVO' },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    const filePath = join(process.cwd(), doc.caminhoRelativo);
    if (!existsSync(filePath)) throw new NotFoundException('Arquivo não encontrado no servidor.');
    
    return { doc, filePath };
  }

  async removerDocumentoDossie(id: string, documentoId: string) {
    const doc = await (this.prisma as any).documentoOrdemServico.findFirst({
      where: { id: documentoId, ordemServicoId: id, status: 'ATIVO' },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    const result = await (this.prisma as any).documentoOrdemServico.update({
      where: { id: documentoId },
      data: { status: 'CANCELADO', canceladoEm: new Date() },
    });

    await this.osEventos.registrarEvento({
      ordemServicoId: id,
      tipo: 'DOCUMENTO_REMOVIDO',
      titulo: 'Documento removido da OS',
      descricao: 'Documento foi removido do dossiê da Ordem de Serviço.',
      origem: 'DOCUMENTO',
      severidade: 'INFO',
    });

    return result;
  }
}
