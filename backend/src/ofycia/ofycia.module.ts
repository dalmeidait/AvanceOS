import { Module } from '@nestjs/common';
import { OfyciaController } from './ofycia.controller';
import { OfyciaService } from './ofycia.service';
import { OfyciaAiController } from './ofycia-ai.controller';
import { OfyciaAiService } from './ofycia-ai.service';
import { PrismaModule } from '../infrastructure/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OfyciaController, OfyciaAiController],
  providers: [OfyciaService, OfyciaAiService],
})
export class OfyciaModule {}
