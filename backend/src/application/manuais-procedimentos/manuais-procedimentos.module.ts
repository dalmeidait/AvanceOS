import { Module } from '@nestjs/common';
import { ManuaisProcedimentosService } from './manuais-procedimentos.service';
import { ManuaisProcedimentosController } from './manuais-procedimentos.controller';
import { PrismaModule } from '../../infrastructure/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ManuaisProcedimentosController],
  providers: [ManuaisProcedimentosService],
})
export class ManuaisProcedimentosModule {}
