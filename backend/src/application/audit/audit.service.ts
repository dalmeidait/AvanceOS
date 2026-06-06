import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { normalizeRole } from '../auth/roles';

export type AuditPayload = {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(payload: AuditPayload) {
    try {
      let user = null;
      if (payload.userId) {
        user = await this.prisma.usuario.findUnique({
          where: { id: payload.userId },
          select: { id: true, nome: true, email: true, cargo: true },
        });
      }

      await this.prisma.logAuditoria.create({
        data: {
          usuarioId: user?.id || payload.userId || null,
          userName: payload.userName || user?.nome || null,
          userEmail: payload.userEmail || user?.email || null,
          userRole: normalizeRole(payload.userRole || user?.cargo || null),
          acao: payload.action,
          entidadeAfetada: payload.entity,
          entidadeId: payload.entityId === undefined || payload.entityId === null ? null : String(payload.entityId),
          description: payload.description || null,
          ipAddress: payload.ipAddress || null,
          userAgent: payload.userAgent || null,
          metadata: payload.metadata === undefined ? null : JSON.stringify(payload.metadata),
        },
      });
    } catch (error) {
      this.logger.warn(`Falha ao registrar auditoria: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async list(filters: { search?: string; entity?: string; action?: string; userId?: string } = {}) {
    const search = filters.search?.trim();
    const where: any = {
      ...(filters.entity ? { entidadeAfetada: filters.entity } : {}),
      ...(filters.action ? { acao: filters.action } : {}),
      ...(filters.userId ? { usuarioId: filters.userId } : {}),
      ...(search
        ? {
            OR: [
              { acao: { contains: search } },
              { entidadeAfetada: { contains: search } },
              { description: { contains: search } },
              { userName: { contains: search } },
              { userEmail: { contains: search } },
            ],
          }
        : {}),
    };

    const logs = await this.prisma.logAuditoria.findMany({
      where,
      include: { usuario: { select: { id: true, nome: true, email: true, cargo: true } } },
      orderBy: { criadoEm: 'desc' },
      take: 500,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.usuarioId,
      userName: log.userName || log.usuario?.nome || null,
      userEmail: log.userEmail || log.usuario?.email || null,
      userRole: normalizeRole(log.userRole || log.usuario?.cargo || null),
      action: log.acao,
      entity: log.entidadeAfetada,
      entityId: log.entidadeId,
      description: log.description,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.criadoEm,
    }));
  }
}
