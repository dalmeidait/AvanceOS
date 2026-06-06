import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './infrastructure/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1 as ok`;

    return {
      status: 'ok',
      app: 'AvanceOS',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
