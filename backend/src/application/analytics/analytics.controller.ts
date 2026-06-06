import { Controller, Get, UseGuards, Query, UseInterceptors, Res } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../domain/enums';;
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Response } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
     private readonly analyticsService: AnalyticsService,
     private readonly reportsService: ReportsService
  ) {}

  @Roles(Role.GESTOR_FINANCEIRO, Role.ADMINISTRADOR)
  @UseInterceptors(CacheInterceptor)
  @Get('kpis-mestres')
  getKpisMestres(@Query('periodo') periodo: string) {
    return this.analyticsService.getKpisMestres(periodo);
  }

  @Get('dashboard-executivo')
  getDashboardExecutivo() {
    return this.analyticsService.getDashboardExecutivo();
  }

  // Fallback do DashboardLegado
  @Roles(Role.GESTOR_FINANCEIRO, Role.ADMINISTRADOR)
  @Get('dashboard')
  getDashboardMetrics() {
    return this.analyticsService.getKpisMestres('mensal');
  }

  @Roles(Role.GESTOR_FINANCEIRO, Role.ADMINISTRADOR)
  @Get('exportar')
  exportarExcel(@Res() res: Response) {
    return this.reportsService.generateOsReport(res);
  }
}
