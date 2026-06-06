import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../infrastructure/prisma.service';
import { TipoMovimentacao } from '../../domain/enums';;

@Injectable()
export class EstoqueAlertaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(EstoqueAlertaInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async (result) => {
        // Apenas reage a requisições de movimentação de estoque
        if (result && result.produtoId && (
          result.tipo === TipoMovimentacao.SAIDA_OS ||
          result.tipo === TipoMovimentacao.SAIDA_PERDA ||
          result.tipo === TipoMovimentacao.SAIDA_PDV
        )) {
          try {
            const tempService = await this.prisma.produto.findUnique({
              where: { id: result.produtoId },
              include: { movimentacoes: true }
            });

            if (tempService) {
                const quantidadeAtual = tempService.movimentacoes.reduce((acc, mov) => {
                    return mov.tipo === TipoMovimentacao.ENTRADA ? acc + mov.quantidade : acc - mov.quantidade;
                }, 0);

                if (quantidadeAtual < tempService.estoqueMinimo) {
                    this.logger.warn(`ALERTA DE REPOSIÇÃO (ADMIN): Estoque do produto ${tempService.nome} (${tempService.sku}) caiu para ${quantidadeAtual}. Mínimo exigido: ${tempService.estoqueMinimo}.`);
                    // Futuramente seria disparado um NotificationService / AWS SNS aqui
                }
            }
          } catch (error) {
            this.logger.error('Erro no interceptor de Alerta de Estoque', error);
          }
        }
      }),
    );
  }
}
