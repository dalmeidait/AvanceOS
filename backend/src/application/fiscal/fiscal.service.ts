import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma.service';

const TIPOS_DOCUMENTO = [
  'RECIBO_GERENCIAL',
  'NOTA_SERVICO_SIMULADA',
  'NOTA_PRODUTO_SIMULADA',
  'NOTA_MISTA_SIMULADA',
  'ENTRADA_FORNECEDOR_SIMULADA',
  'OUTRO',
] as const;
const STATUS_DOCUMENTO = ['RASCUNHO', 'EMITIDO_SIMULADO', 'CANCELADO', 'ARQUIVADO'] as const;
const ORIGENS_DOCUMENTO = ['MANUAL', 'OS', 'PDV', 'FORNECEDOR', 'AJUSTE'] as const;

type TipoDocumentoFiscal = (typeof TIPOS_DOCUMENTO)[number];
type StatusDocumentoFiscal = (typeof STATUS_DOCUMENTO)[number];
type OrigemDocumentoFiscal = (typeof ORIGENS_DOCUMENTO)[number];

type FiltrosFiscal = {
  inicio?: string;
  fim?: string;
  tipoDocumento?: string;
  status?: string;
  clienteId?: string;
  fornecedorId?: string;
  ordemServicoId?: string;
  origem?: string;
  busca?: string;
};

type DocumentoFiscalPayload = {
  numero?: string | null;
  serie?: string | null;
  tipoDocumento?: string;
  naturezaOperacao?: string | null;
  status?: string;
  clienteId?: string | null;
  veiculoId?: string | null;
  ordemServicoId?: string | null;
  fornecedorId?: string | null;
  pagamentoId?: string | null;
  vendaPdvId?: string | null;
  dataEmissao?: string | null;
  dataCompetencia?: string | null;
  valorServicos?: number | string | null;
  valorProdutos?: number | string | null;
  valorDesconto?: number | string | null;
  valorTotal?: number | string | null;
  observacoes?: string | null;
  origem?: string;
};

@Injectable()
export class FiscalService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumo(filtros: FiltrosFiscal) {
    const documentos = await this.prisma.documentoFiscalSimulado.findMany({
      where: this.buildWhere(filtros),
      orderBy: { dataEmissao: 'desc' },
    });
    const ativos = documentos.filter((item) => item.status !== 'CANCELADO');

    return {
      periodo: { inicio: filtros.inicio || null, fim: filtros.fim || null },
      totalDocumentos: documentos.length,
      totalEmitidosSimulados: documentos.filter((item) => item.status === 'EMITIDO_SIMULADO').length,
      totalRascunhos: documentos.filter((item) => item.status === 'RASCUNHO').length,
      totalCancelados: documentos.filter((item) => item.status === 'CANCELADO').length,
      valorTotalSimulado: this.sumDecimal(ativos, 'valorTotal'),
      valorServicos: this.sumDecimal(ativos, 'valorServicos'),
      valorProdutos: this.sumDecimal(ativos, 'valorProdutos'),
      porTipoDocumento: this.groupBy(documentos, 'tipoDocumento'),
      porStatus: this.groupBy(documentos, 'status'),
    };
  }

  async listarDocumentos(filtros: FiltrosFiscal) {
    const documentos = await this.prisma.documentoFiscalSimulado.findMany({
      where: this.buildWhere(filtros),
      include: this.includeBasico(),
      orderBy: [{ dataEmissao: 'desc' }, { criadoEm: 'desc' }],
    });

    return documentos.map((item) => this.toResponse(item));
  }

  async obterDocumento(id: string) {
    const documento = await this.prisma.documentoFiscalSimulado.findUnique({
      where: { id },
      include: this.includeBasico(),
    });
    if (!documento) throw new NotFoundException('Documento fiscal simulado não encontrado.');
    return this.toResponse(documento);
  }

  async criarDocumento(payload: DocumentoFiscalPayload) {
    const data = await this.normalizePayload(payload);
    const documento = await this.prisma.documentoFiscalSimulado.create({
      data,
      include: this.includeBasico(),
    });

    return this.toResponse(documento);
  }

  async gerarPorOs(payload: { ordemServicoId: string; tipoDocumento: string; valorServicos?: number; valorProdutos?: number; valorDesconto?: number; valorTotal?: number }) {
    if (!payload.ordemServicoId) throw new BadRequestException('ID da Ordem de Serviço é obrigatório.');
    if (!['SERVICO', 'PRODUTO', 'MISTO'].includes(payload.tipoDocumento)) throw new BadRequestException('Tipo de documento inválido.');

    const existente = await this.prisma.documentoFiscalSimulado.findFirst({
      where: {
        ordemServicoId: payload.ordemServicoId,
        origem: 'OS',
        status: { not: 'CANCELADO' }
      },
      include: this.includeBasico()
    });

    if (existente) {
      throw new BadRequestException('Já existe documento fiscal simulado para esta OS.');
    }

    const os = await this.prisma.ordemServico.findUnique({
      where: { id: payload.ordemServicoId }
    });

    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada.');

    let tipoDocumentoFinal: TipoDocumentoFiscal;
    if (payload.tipoDocumento === 'SERVICO') tipoDocumentoFinal = 'NOTA_SERVICO_SIMULADA';
    else if (payload.tipoDocumento === 'PRODUTO') tipoDocumentoFinal = 'NOTA_PRODUTO_SIMULADA';
    else tipoDocumentoFinal = 'NOTA_MISTA_SIMULADA';

    return this.criarDocumento({
      tipoDocumento: tipoDocumentoFinal,
      ordemServicoId: payload.ordemServicoId,
      observacoes: `Documento fiscal simulado gerado a partir da Ordem de Serviço nº ${os.numeroOS}.`,
      origem: 'OS',
      valorServicos: payload.valorServicos,
      valorProdutos: payload.valorProdutos,
      valorDesconto: payload.valorDesconto,
      valorTotal: payload.valorTotal,
    });
  }

  async atualizarDocumento(id: string, payload: DocumentoFiscalPayload) {
    const atual = await this.prisma.documentoFiscalSimulado.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Documento fiscal simulado não encontrado.');

    const data = await this.normalizePayload(
      {
        numero: atual.numero,
        serie: atual.serie,
        tipoDocumento: atual.tipoDocumento,
        naturezaOperacao: atual.naturezaOperacao,
        status: atual.status,
        clienteId: atual.clienteId,
        veiculoId: atual.veiculoId,
        ordemServicoId: atual.ordemServicoId,
        fornecedorId: atual.fornecedorId,
        pagamentoId: atual.pagamentoId,
        vendaPdvId: atual.vendaPdvId,
        dataEmissao: atual.dataEmissao.toISOString(),
        dataCompetencia: atual.dataCompetencia?.toISOString() || null,
        valorServicos: Number(atual.valorServicos),
        valorProdutos: Number(atual.valorProdutos),
        valorDesconto: Number(atual.valorDesconto),
        valorTotal: Number(atual.valorTotal),
        observacoes: atual.observacoes,
        origem: atual.origem,
        ...payload,
      },
      false,
    );
    const documento = await this.prisma.documentoFiscalSimulado.update({
      where: { id },
      data,
      include: this.includeBasico(),
    });

    return this.toResponse(documento);
  }

  async atualizarStatus(id: string, status: string) {
    await this.ensureExists(id);
    const documento = await this.prisma.documentoFiscalSimulado.update({
      where: { id },
      data: { status: this.normalizeStatus(status) },
      include: this.includeBasico(),
    });

    return this.toResponse(documento);
  }

  async cancelarDocumento(id: string) {
    return this.atualizarStatus(id, 'CANCELADO');
  }

  async gerarCsv(filtros: FiltrosFiscal) {
    const documentos = await this.listarDocumentos(filtros);
    const header = [
      'Data',
      'Número',
      'Serie',
      'Tipo',
      'Natureza',
      'Status',
      'Cliente',
      'Fornecedor',
      'OS',
      'Valor Serviços',
      'Valor Produtos',
      'Desconto',
      'Total',
      'Origem',
      'Sem Validade Fiscal',
      'Observações',
    ];
    const rows = documentos.map((item) => [
      this.formatCsvDate(item.dataEmissao),
      item.numero || '',
      item.serie || '',
      item.tipoDocumento,
      item.naturezaOperacao || '',
      item.status,
      item.cliente?.nome || '',
      item.fornecedor?.nome || '',
      item.ordemServico?.numeroOS ? String(item.ordemServico.numeroOS) : '',
      this.formatCsvMoney(item.valorServicos),
      this.formatCsvMoney(item.valorProdutos),
      this.formatCsvMoney(item.valorDesconto),
      this.formatCsvMoney(item.valorTotal),
      item.origem,
      item.semValidadeFiscal ? 'Sim' : 'Não',
      item.observacoes || '',
    ]);

    return this.toCsv([header, ...rows]);
  }

  private buildWhere(filtros: FiltrosFiscal, ignoreCanceled = false): Prisma.DocumentoFiscalSimuladoWhereInput {
    const where: Prisma.DocumentoFiscalSimuladoWhereInput = {};
    const periodo = this.buildPeriodo(filtros.inicio, filtros.fim);
    if (periodo) where.dataEmissao = periodo;
    if (filtros.tipoDocumento) where.tipoDocumento = this.normalizeTipoDocumento(filtros.tipoDocumento);
    if (filtros.status) where.status = this.normalizeStatus(filtros.status);
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.fornecedorId) where.fornecedorId = filtros.fornecedorId;
    if (filtros.ordemServicoId) where.ordemServicoId = filtros.ordemServicoId;
    if (filtros.origem) where.origem = this.normalizeOrigem(filtros.origem);
    if (ignoreCanceled) where.status = { not: 'CANCELADO' };

    const busca = filtros.busca?.trim();
    if (busca) {
      const numeroOS = Number(busca);
      where.OR = [
        { numero: { contains: busca } },
        { serie: { contains: busca } },
        { naturezaOperacao: { contains: busca } },
        { observacoes: { contains: busca } },
        { cliente: { is: { nome: { contains: busca } } } },
        { cliente: { is: { cpf_cnpj: { contains: busca } } } },
        { veiculo: { is: { placa: { contains: busca } } } },
        { fornecedor: { is: { nomeFantasia: { contains: busca } } } },
        { fornecedor: { is: { razaoSocial: { contains: busca } } } },
      ];
      if (Number.isInteger(numeroOS)) where.OR.push({ ordemServico: { is: { numeroOS } } });
    }

    return where;
  }

  private buildPeriodo(inicio?: string, fim?: string): Prisma.DateTimeFilter | undefined {
    const filter: Prisma.DateTimeFilter = {};
    if (inicio) {
      const date = new Date(inicio);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inicial inválida.');
      filter.gte = date;
    }
    if (fim) {
      const date = new Date(fim);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Data final inválida.');
      date.setHours(23, 59, 59, 999);
      filter.lte = date;
    }
    return Object.keys(filter).length ? filter : undefined;
  }

  private async normalizePayload(payload: DocumentoFiscalPayload, requireTipo = true): Promise<Prisma.DocumentoFiscalSimuladoUncheckedCreateInput> {
    const tipoDocumento = payload.tipoDocumento ? this.normalizeTipoDocumento(payload.tipoDocumento) : null;
    if (requireTipo && !tipoDocumento) throw new BadRequestException('Tipo de documento é obrigatório.');

    const status = this.normalizeStatus(payload.status || 'RASCUNHO');
    const origem = this.normalizeOrigem(payload.origem || (payload.ordemServicoId ? 'OS' : payload.vendaPdvId ? 'PDV' : 'MANUAL'));
    const osInfo = payload.ordemServicoId ? await this.getOrdemServicoInfo(payload.ordemServicoId) : null;

    await this.validateOptionalRelations(payload, osInfo);

    const valorServicos = this.toDecimal(payload.valorServicos ?? osInfo?.valorServicos ?? 0, 'Valor de serviços inválido.');
    const valorProdutos = this.toDecimal(payload.valorProdutos ?? osInfo?.valorProdutos ?? 0, 'Valor de produtos inválido.');
    const valorDesconto = this.toDecimal(payload.valorDesconto ?? osInfo?.valorDesconto ?? 0, 'Valor de desconto inválido.');
    const valorTotal = payload.valorTotal === undefined || payload.valorTotal === null || payload.valorTotal === ''
      ? valorServicos.plus(valorProdutos).minus(valorDesconto)
      : this.toDecimal(payload.valorTotal, 'Valor total inválido.');

    if (valorTotal.lessThan(0)) throw new BadRequestException('Valor total não pode ser negativo.');

    return {
      numero: payload.numero?.trim() || null,
      serie: payload.serie?.trim() || null,
      tipoDocumento: tipoDocumento || 'OUTRO',
      naturezaOperacao: payload.naturezaOperacao?.trim() || null,
      status,
      clienteId: payload.clienteId || osInfo?.clienteId || null,
      veiculoId: payload.veiculoId || osInfo?.veiculoId || null,
      ordemServicoId: payload.ordemServicoId || null,
      fornecedorId: payload.fornecedorId || null,
      pagamentoId: payload.pagamentoId || null,
      vendaPdvId: payload.vendaPdvId || null,
      dataEmissao: this.toDate(payload.dataEmissao) || new Date(),
      dataCompetencia: this.toDate(payload.dataCompetencia || undefined),
      valorServicos,
      valorProdutos,
      valorDesconto,
      valorTotal,
      observacoes: payload.observacoes?.trim() || null,
      semValidadeFiscal: true,
      origem,
    };
  }

  private async validateOptionalRelations(payload: DocumentoFiscalPayload, osInfo: { clienteId: string; veiculoId: string } | null) {
    const clienteId = payload.clienteId || osInfo?.clienteId;
    const veiculoId = payload.veiculoId || osInfo?.veiculoId;

    if (clienteId) {
      const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente) throw new BadRequestException('Cliente informado não existe.');
    }
    if (veiculoId) {
      const veiculo = await this.prisma.veiculo.findUnique({ where: { id: veiculoId } });
      if (!veiculo) throw new BadRequestException('Veículo informado não existe.');
      if (clienteId && veiculo.cliente_id !== clienteId) throw new BadRequestException('Veículo informado não pertence ao cliente selecionado.');
    }
    if (payload.fornecedorId) {
      const fornecedor = await this.prisma.fornecedor.findUnique({ where: { id: payload.fornecedorId } });
      if (!fornecedor) throw new BadRequestException('Fornecedor informado não existe.');
    }
    if (payload.pagamentoId) {
      const pagamento = await this.prisma.pagamento.findUnique({ where: { id: payload.pagamentoId } });
      if (!pagamento) throw new BadRequestException('Pagamento informado não existe.');
    }
    if (payload.vendaPdvId) {
      const venda = await this.prisma.vendaPDV.findUnique({ where: { id: payload.vendaPdvId } });
      if (!venda) throw new BadRequestException('Venda PDV informada não existe.');
    }
  }

  private async getOrdemServicoInfo(ordemServicoId: string) {
    const ordemServico = await this.prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: { itens: true },
    });
    if (!ordemServico) throw new BadRequestException('Ordem de Serviço informada não existe.');

    const valorServicos = ordemServico.itens.filter((item) => !item.produtoId).reduce((total, item) => total + Number(item.subtotal || item.quantidade * item.valorUnitario), 0);
    const valorProdutos = ordemServico.itens.filter((item) => item.produtoId).reduce((total, item) => total + Number(item.subtotal || item.quantidade * item.valorUnitario), 0);

    return {
      clienteId: ordemServico.cliente_id,
      veiculoId: ordemServico.veiculo_id,
      valorServicos: valorServicos || Number(ordemServico.valorMaoDeObra || 0),
      valorProdutos,
      valorDesconto: Number(ordemServico.descontoAplicado || 0),
    };
  }

  private normalizeTipoDocumento(value: string): TipoDocumentoFiscal {
    const normalized = String(value || '').trim().toUpperCase();
    if (TIPOS_DOCUMENTO.includes(normalized as TipoDocumentoFiscal)) return normalized as TipoDocumentoFiscal;
    throw new BadRequestException('Tipo de documento fiscal simulado inválido.');
  }

  private normalizeStatus(value: string): StatusDocumentoFiscal {
    const normalized = String(value || '').trim().toUpperCase();
    if (STATUS_DOCUMENTO.includes(normalized as StatusDocumentoFiscal)) return normalized as StatusDocumentoFiscal;
    throw new BadRequestException('Status fiscal gerencial inválido.');
  }

  private normalizeOrigem(value: string): OrigemDocumentoFiscal {
    const normalized = String(value || '').trim().toUpperCase();
    if (ORIGENS_DOCUMENTO.includes(normalized as OrigemDocumentoFiscal)) return normalized as OrigemDocumentoFiscal;
    throw new BadRequestException('Origem fiscal gerencial inválida.');
  }

  private toDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Data informada inválida.');
    return date;
  }

  private toDecimal(value: number | string | Prisma.Decimal, message: string) {
    try {
      const decimal = new Prisma.Decimal(value);
      if (!decimal.isFinite() || decimal.lessThan(0)) throw new BadRequestException(message);
      return decimal;
    } catch {
      throw new BadRequestException(message);
    }
  }

  private async ensureExists(id: string) {
    const documento = await this.prisma.documentoFiscalSimulado.findUnique({ where: { id } });
    if (!documento) throw new NotFoundException('Documento fiscal simulado não encontrado.');
  }

  private includeBasico() {
    return {
      cliente: { select: { id: true, nome: true, cpf_cnpj: true } },
      veiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
      ordemServico: { select: { id: true, numeroOS: true, placaVeiculo: true, modeloVeiculo: true } },
      fornecedor: { select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } },
      pagamento: { select: { id: true, forma_pagamento: true, valor: true, data_pagamento: true } },
      vendaPdv: { select: { id: true, valorTotal: true, criadoEm: true } },
    };
  }

  private toResponse(item: any) {
    return {
      ...item,
      valorServicos: Number(item.valorServicos),
      valorProdutos: Number(item.valorProdutos),
      valorDesconto: Number(item.valorDesconto),
      valorTotal: Number(item.valorTotal),
      semValidadeFiscal: true,
      cliente: item.cliente ? { id: item.cliente.id, nome: item.cliente.nome, documento: item.cliente.cpf_cnpj } : null,
      fornecedor: item.fornecedor ? { id: item.fornecedor.id, nome: item.fornecedor.nomeFantasia || item.fornecedor.razaoSocial, documento: item.fornecedor.cnpj } : null,
    };
  }

  private sumDecimal(items: any[], key: 'valorTotal' | 'valorServicos' | 'valorProdutos') {
    return items.reduce((total, item) => total + Number(item[key] || 0), 0);
  }

  private groupBy(items: any[], key: 'tipoDocumento' | 'status') {
    const map = new Map<string, { chave: string; quantidade: number; total: number }>();
    items.forEach((item) => {
      const chave = item[key] || 'SEM_VALOR';
      const atual = map.get(chave) || { chave, quantidade: 0, total: 0 };
      atual.quantidade += 1;
      atual.total += Number(item.valorTotal || 0);
      map.set(chave, atual);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  private formatCsvDate(value?: string | Date | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private formatCsvMoney(value: number) {
    return Number(value || 0).toFixed(2).replace('.', ',');
  }

  private toCsv(rows: string[][]) {
    return rows.map((row) => row.map((value) => this.escapeCsv(value)).join(';')).join('\n');
  }

  private escapeCsv(value: string) {
    const safeValue = String(value ?? '');
    if (safeValue.includes(';') || safeValue.includes('"') || safeValue.includes('\n')) {
      return `"${safeValue.replace(/"/g, '""')}"`;
    }
    return safeValue;
  }
}
