import { Module } from '@nestjs/common';
import { VeiculosService } from './veiculos.service';
import { VeiculosController } from './veiculos.controller';

@Module({
  controllers: [VeiculosController],
  providers: [VeiculosService],
})
export class VeiculosModule {}
