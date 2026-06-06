import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { AuditService } from '../audit/audit.service';

type CreateStockMovementPayload = {
  productId?: string;
  produtoId?: string;
  type?: string;
  tipo?: string;
  quantity?: number;
  quantidade?: number;
  reason?: string;
  justificativa?: string;
  serviceOrderNumber?: string;
  notes?: string;
  usuarioId?: string;
};

type StockMovementFilters = {
  productId?: string;
  produtoId?: string;
  ordemServicoId?: string;
  type?: string;
  tipo?: string;
  date?: string;
  data?: string;
  serviceOrderNumber?: string;
  os?: string;
};

@Injectable()
export class EstoqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private normalizeType(type?: string) {
    const normalized = (type || '').trim().toUpperCase();

    if (['IN', 'ENTRADA'].includes(normalized)) return 'IN';
    if (['ENTRADA_DEVOLUCAO_OS', 'DEVOLUCAO_OS'].includes(normalized)) return 'ENTRADA_DEVOLUCAO_OS';
    if (['OUT', 'SAIDA'].includes(normalized)) return 'OUT';
    if (['SAIDA_PERDA', 'SAIDA_OS', 'SAIDA_PDV'].includes(normalized)) return normalized;
    if (['ADJUSTMENT', 'AJUSTE'].includes(normalized)) return 'ADJUSTMENT';

      throw new BadRequestException('Tipo de movimentação inválido.');
  }

  private mapMovement(movement: any, ordemServico?: any) {
    return {
      ...movement,
      productId: movement.produtoId,
      type: movement.tipo,
      quantity: movement.quantidade,
      reason: movement.reason ?? movement.justificativa,
      createdAt: movement.timestamp,
      product: movement.produto,
      produto: movement.produto,
      user: movement.usuario,
      usuario: movement.usuario,
      ordemServico: ordemServico || null,
      os: ordemServico || null,
      cliente: ordemServico?.cliente || null,
      veiculo: ordemServico?.veiculo || null,
      osReferencia: ordemServico?.numeroOS ? `OS #${ordemServico.numeroOS}` : movement.serviceOrderNumber ? `OS #${movement.serviceOrderNumber}` : null,
    };
  }

  private async enrichMovements(movements: any[]) {
    const osIds = Array.from(new Set(movements.map((movement) => movement.ordemServicoId).filter(Boolean)));
    const ordens = osIds.length
      ? await this.prisma.ordemServico.findMany({
          where: { id: { in: osIds } },
          include: {
            cliente: true,
            veiculo: true,
            responsavel: true,
          },
        })
      : [];
    const ordensPorId = new Map(ordens.map((ordem) => [ordem.id, ordem]));
    return movements.map((movement) => this.mapMovement(movement, movement.ordemServicoId ? ordensPorId.get(movement.ordemServicoId) : null));
  }

  async list(filters: StockMovementFilters = {}) {
    const productId = filters.productId || filters.produtoId;
    const serviceOrderNumber = filters.serviceOrderNumber || filters.os;
    const type = filters.type || filters.tipo;
    const date = filters.date || filters.data;
    const where: any = {};

    if (productId) where.produtoId = productId;
    if (filters.ordemServicoId) where.ordemServicoId = filters.ordemServicoId;
    if (serviceOrderNumber) where.serviceOrderNumber = { contains: serviceOrderNumber };
    if (type) where.tipo = this.normalizeType(type);
    if (date) {
      const start = new Date(date);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        where.timestamp = { gte: start, lt: end };
      }
    }

    const movements = await this.prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        produto: {
          select: { id: true, sku: true, nome: true, categoria: true, quantityInStock: true, estoqueMinimo: true },
        },
        usuario: {
          select: { id: true, nome: true, email: true, cargo: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    return this.enrichMovements(movements);
  }

  async listByProduct(productId: string) {
    return this.list({ productId });
  }

  async listByOrdemServico(ordemServicoId: string) {
    return this.list({ ordemServicoId });
  }

  async create(payload: CreateStockMovementPayload, actor?: any) {
    const productId = payload.productId || payload.produtoId;
    if (!productId) throw new BadRequestException('Produto e obrigatorio.');

    const type = this.normalizeType(payload.type || payload.tipo);
    const quantity = Number(payload.quantity ?? payload.quantidade);
    if (!Number.isInteger(quantity) || quantity < 0 || (type !== 'ADJUSTMENT' && quantity === 0)) {
      throw new BadRequestException('Quantidade deve ser positiva.');
    }

    const movement = await this.prisma.$transaction(async (tx) => {
      const product = await tx.produto.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Produto não encontrado.');

      const previousQuantity = product.quantityInStock ?? 0;
      const newQuantity = this.calculateNewQuantity(type, previousQuantity, quantity);

      if (newQuantity < 0) {
        throw new BadRequestException('Saldo insuficiente para realizar esta saida.');
      }

      const movement = await tx.movimentacaoEstoque.create({
        data: {
          produtoId: productId,
          tipo: type,
          quantidade: quantity,
          previousQuantity,
          newQuantity,
          reason: payload.reason || payload.justificativa || null,
          justificativa: payload.justificativa || payload.reason || null,
          serviceOrderNumber: payload.serviceOrderNumber || null,
          notes: payload.notes || null,
          usuarioId: payload.usuarioId || null,
        },
        include: {
          produto: {
            select: { id: true, sku: true, nome: true, categoria: true, quantityInStock: true, estoqueMinimo: true },
          },
          usuario: {
            select: { id: true, nome: true, email: true, cargo: true },
          },
        },
      });

      await tx.produto.update({
        where: { id: productId },
        data: { quantityInStock: newQuantity },
      });

      return this.mapMovement(movement);
    });
    await this.auditService.logAction({
      userId: actor?.id || payload.usuarioId,
      action: 'STOCK_MOVEMENT_CREATED',
      entity: 'MOVIMENTACAO_ESTOQUE',
      entityId: movement.id,
      description: `Movimentacao de estoque registrada para produto ${productId}`,
      metadata: { productId, type, quantity },
    });
    return movement;
  }

  private calculateNewQuantity(type: string, previousQuantity: number, quantity: number) {
    if (type === 'IN' || type === 'ENTRADA_DEVOLUCAO_OS') return previousQuantity + quantity;
    if (type === 'OUT' || type.startsWith('SAIDA_')) return previousQuantity - quantity;
    return quantity;
  }
}
