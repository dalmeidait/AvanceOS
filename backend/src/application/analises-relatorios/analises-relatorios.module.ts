import { Module } from '@nestjs/common';
import { AnalisesRelatoriosController } from './analises-relatorios.controller';
import { AnalisesRelatoriosService } from './analises-relatorios.service';
import { PrismaModule } from '../../infrastructure/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalisesRelatoriosController],
  providers: [AnalisesRelatoriosService],
  exports: [AnalisesRelatoriosService]
})
export class AnalisesRelatoriosModule {}
