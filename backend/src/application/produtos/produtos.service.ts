import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { TipoMovimentacao } from '../../domain/enums';
import { AuditService } from '../audit/audit.service';

type CatalogFilters = { busca?: string; categoria?: string; status?: string };
type StockStatus = 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERADO';

@Injectable()
export class ProdutosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private normalizeStatus(status?: string, isActive?: boolean) {
    if (typeof isActive === 'boolean') return isActive ? 'ATIVO' : 'INATIVO';
    return status || 'ATIVO';
  }

  private buildProdutoData(data: any) {
    const sku = data.sku || data.internalCode;
    const nome = data.nome || data.name;
    const marca = data.marca || data.brand;
    const precoCusto = data.precoCusto ?? data.costPrice ?? 0;
    const precoVenda = data.precoVenda ?? data.salePrice ?? 0;

    if (!sku) throw new BadRequestException('Código interno do produto é obrigatório.');
    if (!nome) throw new BadRequestException('Nome do produto e obrigatorio.');
    if (!marca) throw new BadRequestException('Marca do produto é obrigatória.');
    if (Number(precoCusto) < 0 || Number(precoVenda) < 0) throw new BadRequestException('Precos devem ser positivos.');

    return {
      sku,
      nome,
      descricao: data.descricao ?? data.description ?? null,
      marca,
      categoria: data.categoria || data.category || 'GERAL',
      tipo: data.tipo || 'PECA',
      unidade: data.unidade || data.unit || 'UN',
      veiculosCompativeis: data.veiculosCompativeis || 'GERAL',
      localizacaoFisica: data.localizacaoFisica || 'Estoque',
      fornecedor: data.fornecedor ?? data.supplier ?? null,
      aplicacao: data.aplicacao ?? null,
      notes: data.notes ?? null,
      status: this.normalizeStatus(data.status, data.isActive),
      controlaEstoque: data.controlaEstoque ?? true,
      podeVenderPdv: data.podeVenderPdv ?? true,
      podeVincularOs: data.podeVincularOs ?? true,
      quantityInStock: Number(data.quantityInStock ?? data.quantidadeAtual ?? 0),
      estoqueMinimo: Number(data.estoqueMinimo ?? data.minimumStock ?? 0),
      precoCusto: Number(precoCusto),
      precoVenda: Number(precoVenda),
    };
  }

  private calcularStatusEstoque(produto: { quantityInStock?: number | null; estoqueMinimo?: number | null }): StockStatus {
    const quantidadeAtual = Number(produto.quantityInStock ?? 0);
    const estoqueMinimo = Number(produto.estoqueMinimo ?? 0);
    if (quantidadeAtual <= 0) return 'ZERADO';
    if (estoqueMinimo > 0 && quantidadeAtual < estoqueMinimo * 0.5) return 'CRITICO';
    if (estoqueMinimo > 0 && quantidadeAtual <= estoqueMinimo) return 'BAIXO';
    return 'NORMAL';
  }

  private mapProduto(p: any) {
    const stock = Number(p.quantityInStock ?? 0);
    const statusEstoque = this.calcularStatusEstoque(p);

    return {
      ...p,
      quantidadeAtual: stock,
      statusEstoque,
      name: p.nome,
      internalCode: p.sku,
      category: p.categoria,
      description: p.descricao,
      brand: p.marca,
      unit: p.unidade,
      quantityInStock: stock,
      minimumStock: p.estoqueMinimo,
      costPrice: p.precoCusto,
      salePrice: p.precoVenda,
      supplier: p.fornecedor,
      isActive: p.status !== 'INATIVO',
      createdAt: p.criadoEm,
      updatedAt: p.atualizadoEm,
    };
  }

  async create(data: any, actor?: any) {
    const produto = await this.prisma.produto.create({ data: this.buildProdutoData(data) });
    await this.auditService.logAction({
      userId: actor?.id,
      action: 'PRODUCT_CREATED',
      entity: 'PRODUTO',
      entityId: produto.id,
      description: `Produto criado: ${produto.nome}`,
      metadata: { sku: produto.sku },
    });
    return this.mapProduto(produto);
  }

  async findAll(filters: CatalogFilters = {}) {
    const busca = filters.busca?.trim();
    const produtos = await this.prisma.produto.findMany({
      where: {
        ...(filters.categoria ? { categoria: filters.categoria } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(busca
          ? {
              OR: [
                { sku: { contains: busca } },
                { nome: { contains: busca } },
                { categoria: { contains: busca } },
                { marca: { contains: busca } },
              ],
            }
          : {}),
      },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });

    return produtos.map((produto) => this.mapProduto(produto));
  }

  async findCompativeis(veiculoModelo: string) {
    const produtos = await this.prisma.produto.findMany({
      where: {
        veiculosCompativeis: {
          contains: veiculoModelo,
        },
      },
    });

    return produtos.map((p) => ({
      id: p.id,
      sku: p.sku,
      nome: p.nome,
      marca: p.marca,
      precoVenda: p.precoVenda,
      quantidadeAtual: p.quantityInStock ?? 0,
    }));
  }

  async findHistoricoMovimentacoes() {
    return this.prisma.movimentacaoEstoque.findMany({
      include: {
        produto: {
          select: {
            id: true,
            sku: true,
            nome: true,
            descricao: true,
            marca: true,
            categoria: true,
            precoCusto: true,
            precoVenda: true,
            quantityInStock: true,
            estoqueMinimo: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });
  }

  async findMovimentacoesProduto(id: string) {
    await this.findOne(id);
    return this.prisma.movimentacaoEstoque.findMany({
      where: { produtoId: id },
      include: {
        produto: {
          select: {
            id: true,
            sku: true,
            nome: true,
            categoria: true,
            quantityInStock: true,
            estoqueMinimo: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findOne(id: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    return this.mapProduto(produto);
  }

  async findLowStock() {
    const produtos = await this.prisma.produto.findMany({
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
    return produtos
      .map((produto) => this.mapProduto(produto))
      .filter((produto) => ['BAIXO', 'CRITICO', 'ZERADO'].includes(produto.statusEstoque));
  }

  async findCriticalStock() {
    const produtos = await this.prisma.produto.findMany({
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
    return produtos
      .map((produto) => this.mapProduto(produto))
      .filter((produto) => ['CRITICO', 'ZERADO'].includes(produto.statusEstoque));
  }

  async update(id: string, data: any, actor?: any) {
    await this.findOne(id);
    const produto = await this.prisma.produto.update({ where: { id }, data: this.buildProdutoData(data) });
    await this.auditService.logAction({
      userId: actor?.id,
      action: 'PRODUCT_UPDATED',
      entity: 'PRODUTO',
      entityId: produto.id,
      description: `Produto atualizado: ${produto.nome}`,
      metadata: { sku: produto.sku },
    });
    return this.mapProduto(produto);
  }

  async updateStatus(id: string, data: { isActive?: boolean; status?: string }, actor?: any) {
    await this.findOne(id);
    const produto = await this.prisma.produto.update({
      where: { id },
      data: { status: this.normalizeStatus(data.status, data.isActive) },
    });
    await this.auditService.logAction({
      userId: actor?.id,
      action: 'PRODUCT_STATUS_UPDATED',
      entity: 'PRODUTO',
      entityId: produto.id,
      description: `Status do produto atualizado: ${produto.nome}`,
      metadata: { status: produto.status },
    });
    return this.mapProduto(produto);
  }

  async deactivate(id: string, actor?: any) {
    return this.updateStatus(id, { isActive: false }, actor);
  }

  async addMovimentacao(
    produtoId: string,
    data: {
      tipo: TipoMovimentacao;
      quantidade: number;
      justificativa?: string;
      usuarioId: string;
      ordemServicoId?: string;
      notaFiscal?: string;
      fornecedorId?: string;
      custoUnitario?: number;
    },
    actor?: any,
  ) {
    const quantidade = Number(data.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new BadRequestException('Quantidade da movimentacao deve ser positiva.');
    }
    if (data.tipo === TipoMovimentacao.SAIDA_PERDA && !data.justificativa) {
      throw new BadRequestException('Justificativa é obrigatória para perdas/avarias.');
    }

    const tipo = data.tipo === TipoMovimentacao.ENTRADA ? 'IN' : 'OUT';

    const movement = await this.prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({ where: { id: produtoId } });
      if (!produto) throw new NotFoundException('Produto não encontrado');

      const previousQuantity = produto.quantityInStock ?? 0;
      const newQuantity = tipo === 'IN' ? previousQuantity + quantidade : previousQuantity - quantidade;

      if (newQuantity < 0) {
        throw new BadRequestException('Saldo insuficiente para realizar esta saida.');
      }

      const movement = await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          tipo,
          quantidade,
          previousQuantity,
          newQuantity,
          reason: data.justificativa || null,
          justificativa: data.justificativa,
          usuarioId: data.usuarioId,
          ordemServicoId: data.ordemServicoId,
          notaFiscal: data.notaFiscal,
          fornecedorId: data.fornecedorId,
          custoUnitario: data.custoUnitario,
        },
      });

      await tx.produto.update({ where: { id: produtoId }, data: { quantityInStock: newQuantity } });
      return movement;
    });
    await this.auditService.logAction({
      userId: actor?.id || data.usuarioId,
      action: 'STOCK_MOVEMENT_CREATED',
      entity: 'MOVIMENTACAO_ESTOQUE',
      entityId: movement.id,
      description: `Movimentacao de estoque registrada para produto ${produtoId}`,
      metadata: { produtoId, tipo: data.tipo, quantidade },
    });
    return movement;
  }

  async getCurvaABC() {
    const produtos = await this.prisma.produto.findMany({
      include: { movimentacoes: true },
    });

    const items = produtos.map((p) => {
      const totalSaidas = p.movimentacoes
        .filter((m) => m.tipo !== 'IN' && m.tipo !== TipoMovimentacao.ENTRADA)
        .reduce((acc, m) => acc + m.quantidade, 0);
      const receitaGerada = totalSaidas * p.precoVenda;
      const quantidadeAtual = p.quantityInStock ?? 0;

      return {
        id: p.id,
        sku: p.sku,
        nome: p.nome,
        marca: p.marca,
        categoria: p.categoria,
        quantidadeAtual,
        receitaGerada,
        totalSaidas,
        precoVenda: p.precoVenda,
      };
    });

    items.sort((a, b) => b.receitaGerada - a.receitaGerada);
    const receitaTotal = items.reduce((acc, i) => acc + i.receitaGerada, 0);
    let acumulado = 0;

    return items.map((item) => {
      acumulado += item.receitaGerada;
      const percentualAcumulado = receitaTotal > 0 ? (acumulado / receitaTotal) * 100 : 0;
      let classe: 'A' | 'B' | 'C';
      if (percentualAcumulado <= 80) classe = 'A';
      else if (percentualAcumulado <= 95) classe = 'B';
      else classe = 'C';

      return { ...item, classe, percentualAcumulado: +percentualAcumulado.toFixed(2) };
    });
  }

  async getValorizacaoInventario() {
    const produtos = await this.prisma.produto.findMany({
      include: { movimentacoes: true },
    });

    let valorTotalEstoque = 0;
    const detalhes = produtos.map((p) => {
      const entradas = p.movimentacoes.filter((m) => m.tipo === 'IN' || m.tipo === TipoMovimentacao.ENTRADA);
      const totalEntradas = entradas.reduce((acc, m) => acc + m.quantidade, 0);
      const quantidadeAtual = p.quantityInStock ?? 0;
      const custoTotalEntradas = entradas.reduce((acc, m) => acc + (m.custoUnitario ?? p.precoCusto) * m.quantidade, 0);
      const custoMedio = totalEntradas > 0 ? custoTotalEntradas / totalEntradas : p.precoCusto;
      const valorEmEstoque = Math.max(quantidadeAtual, 0) * custoMedio;

      valorTotalEstoque += valorEmEstoque;

      return {
        id: p.id,
        sku: p.sku,
        nome: p.nome,
        quantidadeAtual: Math.max(quantidadeAtual, 0),
        custoMedio: +custoMedio.toFixed(2),
        valorEmEstoque: +valorEmEstoque.toFixed(2),
        abaixoDoMinimo: quantidadeAtual < p.estoqueMinimo,
        estoqueMinimo: p.estoqueMinimo,
      };
    });

    return {
      valorTotalEstoque: +valorTotalEstoque.toFixed(2),
      totalItens: detalhes.length,
      alertasReposicao: detalhes.filter((d) => d.abaixoDoMinimo).length,
      detalhes,
    };
  }
}
