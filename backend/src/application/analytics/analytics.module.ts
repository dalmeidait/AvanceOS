import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ReportsService } from './reports.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [CacheModule.register()],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportsService]
})
export class AnalyticsModule {}
