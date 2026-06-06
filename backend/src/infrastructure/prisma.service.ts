import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { auditStorage } from '../application/audit/audit.storage';
import { validateDatabaseUrl } from '../config/env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    validateDatabaseUrl();
    super({
      log: ['error', 'warn', 'info'],
    });
  }

  async onModuleInit() {
    try {
      (this as any).$use(async (params: any, next: any) => {
      // Compliance 2.3: Imutabilidade de Logs de Auditoria
      if (params.model === 'LogAuditoria') {
        if (['delete', 'deleteMany', 'update', 'updateMany'].includes(params.action)) {
          throw new Error('[ALERTA DE SEGURANÇA 🔴] Tentativa de adulteração detectada: Logs de Auditoria são protegidos por design (Insert-Only).');
        }
        return next(params);
      }
      const isMutation = ['create', 'update', 'delete', 'upsert'].includes(params.action);
      let oldRecord: any = null;
      
      if (isMutation && params.action !== 'create') {
        try {
          // Temporarily bypass middleware for this internal read to prevent loops
          const model: any = this[params.model as keyof typeof this];
          if (model && model.findUnique) {
            oldRecord = await model.findUnique({ where: params.args.where });
          }
        } catch (e) {
          // Ignore lookup errors
        }
      }

      const result = await next(params);

      if (isMutation && result) {
        const store = auditStorage.getStore();
        let authId = store?.userId;
        
        // Se for um novo usuário se registrando (sem log in prévio), usar o próprio id criado
        if (!authId && params.model === 'Usuario' && params.action === 'create') {
          authId = result.id;
        }

        if (authId) {
          await this.logAuditoria.create({
              data: {
                  usuarioId: authId,
                  acao: params.action.toUpperCase(),
                  entidadeAfetada: params.model || 'Unknown',
                  entidadeId: result.id || 'N/A',
                  valoresAntigos: oldRecord ? JSON.stringify(oldRecord).substring(0, 900) : '{}',
                  valoresNovos: JSON.stringify(result).substring(0, 900),
                  nivelVisibilidade: params.model === 'Pagamento' ? 'AVANCADO' : 
                                    (params.model === 'OrdemServico' ? 'INTERMEDIARIO' : 'BASICO'),
              }
          }).catch(e => console.error('Audit Log failed (ignoring):', e.message));
        }
      }

      return result;
      });
    } catch (e) {}

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
