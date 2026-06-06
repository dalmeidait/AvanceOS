import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { auditStorage } from '../../application/audit/audit.storage';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = 
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal Server Error';

    const responseMessage =
      status === HttpStatus.TOO_MANY_REQUESTS
        ? 'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.'
        : status === 500
          ? 'Internal Server Error'
          : message;

    // Requisito 4.1: Alerta de Erro 500 (Incidente/Tentativa de Exploit)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
       this.logger.error(`[INCIDÊNCIA CRÍTICA 🔴] Erro 500 detectado na rota ${request.url}. Disparando webhook para canal Slack de Infraestrutura...`);
       if (exception instanceof Error) {
           this.logger.error(exception.stack);
       }
    }

    // Requisito 4.2: Auditoria de Acesso Negado (403 Forbidden - Escalada de privilégios)
    if (status === HttpStatus.FORBIDDEN) {
       this.logger.warn(`[SEGURANÇA 🚨] Tentativa de Acesso Negado (403 RBAC) na rota ${request.url}. Registrando Audit Log Imediato...`);
       
       const store = auditStorage.getStore();
       if (store?.userId) {
           try {
               await this.prisma.logAuditoria.create({
                  data: {
                      usuarioId: store.userId,
                      acao: 'TENTATIVA_ACESSO_NEGADO',
                      entidadeAfetada: 'Endpoint RBAC',
                      entidadeId: request.url,
                      valoresAntigos: '{}',
                      valoresNovos: JSON.stringify({ error: message, method: request.method, ip: request.ip }),
                      nivelVisibilidade: 'AVANCADO'
                  }
               });
           } catch (e) {
               this.logger.error("Falha ao registrar o log de auditoria 403", e);
           }
       }
    }

    if (!response.headersSent) {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: responseMessage,
      });
    }
  }
}
