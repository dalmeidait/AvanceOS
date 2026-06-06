import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LgpdMaskingInterceptor } from './infrastructure/interceptors/masking.interceptor';
import { GlobalExceptionsFilter } from './infrastructure/filters/global-exceptions.filter';
import { AuthModule } from './application/auth/auth.module';
import { ClientesModule } from './application/clientes/clientes.module';
import { VeiculosModule } from './application/veiculos/veiculos.module';
// Caminho correto com base na sua foto!
import { OsModule } from './application/os/os.module';
import { UsuariosModule } from './application/usuarios/usuarios.module';
import { ProdutosModule } from './application/produtos/produtos.module';
import { PdvModule } from './application/pdv/pdv.module';
import { ContabilidadeModule } from './application/contabilidade/contabilidade.module';
import { AgendamentoModule } from './application/agendamento/agendamento.module';
import { CrmModule } from './application/crm/crm.module';
import { AnalyticsModule } from './application/analytics/analytics.module';
import { ServicosModule } from './application/servicos/servicos.module';
import { EstoqueSolicitacoesModule } from './application/estoque-solicitacoes/estoque-solicitacoes.module';
import { EstoqueModule } from './application/estoque/estoque.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { TechHubController } from './techhub/techhub.controller';
import { TechHubService } from './techhub/techhub.service';
import { AuditModule } from './application/audit/audit.module';
import { ManuaisProcedimentosModule } from './application/manuais-procedimentos/manuais-procedimentos.module';
import { AnalisesRelatoriosModule } from './application/analises-relatorios/analises-relatorios.module';
import { FornecedoresModule } from './application/fornecedores/fornecedores.module';
import { FiscalModule } from './application/fiscal/fiscal.module';
import { ComprasModule } from './application/compras/compras.module';
import { OfyciaModule } from './ofycia/ofycia.module';

const isProduction = process.env.NODE_ENV === 'production';
const throttleTtl = Number(process.env.THROTTLE_TTL ?? 60000);
const throttleLimit = Number(process.env.THROTTLE_LIMIT ?? (isProduction ? 100 : 1000));
const sensitiveThrottleLimit = Number(process.env.THROTTLE_SENSITIVE_LIMIT ?? (isProduction ? 5 : 60));

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    ClientesModule,
    VeiculosModule,
    OsModule,
    UsuariosModule,
    ProdutosModule,
    PdvModule,
    ContabilidadeModule,
    AgendamentoModule,
    CrmModule,
    AnalyticsModule,
    ServicosModule,
    EstoqueSolicitacoesModule,
    EstoqueModule,
    ManuaisProcedimentosModule,
    AnalisesRelatoriosModule,
    FornecedoresModule,
    FiscalModule,
    ComprasModule,
    OfyciaModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: throttleTtl, limit: throttleLimit },
      { name: 'sensitive', ttl: throttleTtl, limit: sensitiveThrottleLimit }
    ])
  ],
  controllers: [HealthController, TechHubController],
  providers: [
    TechHubService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LgpdMaskingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionsFilter,
    }
  ]
})
export class AppModule { }
