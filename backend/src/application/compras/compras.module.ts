import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma.module';
import { ComprasController } from './compras.controller';
import { ProdutoFornecedoresController } from './produto-fornecedores.controller';
import { ComprasService } from './compras.service';

@Module({
  imports: [PrismaModule],
  controllers: [ComprasController, ProdutoFornecedoresController],
  providers: [ComprasService],
  exports: [ComprasService],
})
export class ComprasModule {}
