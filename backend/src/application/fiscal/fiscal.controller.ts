import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FiscalService } from './fiscal.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO)
@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get('resumo')
  getResumo(@Query() query: any) {
    return this.fiscalService.getResumo(query);
  }

  @Get('documentos')
  listarDocumentos(@Query() query: any) {
    return this.fiscalService.listarDocumentos(query);
  }

  @Get('documentos/:id')
  obterDocumento(@Param('id') id: string) {
    return this.fiscalService.obterDocumento(id);
  }

  @Post('documentos')
  criarDocumento(@Body() body: any) {
    return this.fiscalService.criarDocumento(body);
  }

  @Post('documentos/gerar-por-os')
  gerarPorOs(@Body() body: any) {
    return this.fiscalService.gerarPorOs(body);
  }

  @Put('documentos/:id')
  atualizarDocumento(@Param('id') id: string, @Body() body: any) {
    return this.fiscalService.atualizarDocumento(id, body);
  }

  @Patch('documentos/:id/status')
  atualizarStatus(@Param('id') id: string, @Body() body: any) {
    return this.fiscalService.atualizarStatus(id, body.status);
  }

  @Delete('documentos/:id')
  cancelarDocumento(@Param('id') id: string) {
    return this.fiscalService.cancelarDocumento(id);
  }

  @Get('exportar-csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="fiscal_gerencial.csv"')
  exportarCsv(@Query() query: any) {
    return this.fiscalService.gerarCsv(query);
  }
}
