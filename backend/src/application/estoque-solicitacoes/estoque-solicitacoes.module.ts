import { Module } from '@nestjs/common';
import { EstoqueSolicitacoesController } from './estoque-solicitacoes.controller';
import { EstoqueSolicitacoesService } from './estoque-solicitacoes.service';

@Module({
  controllers: [EstoqueSolicitacoesController],
  providers: [EstoqueSolicitacoesService],
  exports: [EstoqueSolicitacoesService],
})
export class EstoqueSolicitacoesModule {}
