import { Module } from '@nestjs/common';
import { OsController } from './os.controller';
import { OsService } from './os.service';
import { PdfModule } from '../pdf/pdf.module';
import { ProdutosModule } from '../produtos/produtos.module';
import { OsGateway } from './os.gateway';
import { OsEventosService } from './os-eventos.service';

@Module({
  imports: [PdfModule, ProdutosModule],
  controllers: [OsController],
  providers: [OsService, OsGateway, OsEventosService],
  exports: [OsService, OsEventosService]
})
export class OsModule {}