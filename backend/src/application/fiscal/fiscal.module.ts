import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma.module';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';

@Module({
  imports: [PrismaModule],
  controllers: [FiscalController],
  providers: [FiscalService],
})
export class FiscalModule {}
