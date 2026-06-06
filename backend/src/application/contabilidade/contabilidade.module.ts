import { Module } from '@nestjs/common';
import { ContabilidadeController } from './contabilidade.controller';
import { ContabilidadeService } from './contabilidade.service';

@Module({
  controllers: [ContabilidadeController],
  providers: [ContabilidadeService],
})
export class ContabilidadeModule {}
