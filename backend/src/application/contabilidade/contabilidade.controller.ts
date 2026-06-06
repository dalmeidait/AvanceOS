import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContabilidadeService } from './contabilidade.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO)
@Controller('contabilidade')
export class ContabilidadeController {
  constructor(private readonly contabilidadeService: ContabilidadeService) {}

  @Get('resumo')
  getResumo(@Query() query: any) {
    return this.contabilidadeService.getResumo(query);
  }

  @Get('lancamentos')
  listarLancamentos(@Query() query: any) {
    return this.contabilidadeService.listarLancamentos(query);
  }

  @Get('lancamentos/:id')
  obterLancamento(@Param('id') id: string) {
    return this.contabilidadeService.obterLancamento(id);
  }

  @Post('lancamentos')
  criarLancamento(@Body() body: any, @Request() req: any) {
    return this.contabilidadeService.criarLancamento(body, req.user?.id);
  }

  @Put('lancamentos/:id')
  atualizarLancamento(@Param('id') id: string, @Body() body: any) {
    return this.contabilidadeService.atualizarLancamento(id, body);
  }

  @Patch('lancamentos/:id/status')
  atualizarStatus(@Param('id') id: string, @Body() body: any) {
    return this.contabilidadeService.atualizarStatus(id, body.status, {
      dataPagamento: body.dataPagamento,
      dataRecebimento: body.dataRecebimento,
    });
  }

  @Delete('lancamentos/:id')
  cancelarLancamento(@Param('id') id: string) {
    return this.contabilidadeService.cancelarLancamento(id);
  }

  @Post('lancamentos/:id/pagar')
  pagarLancamento(@Param('id') id: string, @Body() body: any) {
    return this.contabilidadeService.pagarLancamento(id, body);
  }

  @Get('exportar-csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="contabilidade_operacional.csv"')
  exportarCsv(@Query() query: any) {
    return this.contabilidadeService.gerarCsv(query);
  }

  @Get('dre')
  getDre(@Query() query: any) {
    return this.contabilidadeService.getDre(query);
  }

  @Get('resumo-mensal')
  getResumoMensal(@Query('ano') ano?: string) {
    return this.contabilidadeService.getResumoMensal(ano);
  }

  @Get('exportar-dre-csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="dre_gerencial.csv"')
  exportarDreCsv(@Query() query: any) {
    return this.contabilidadeService.gerarDreCsv(query);
  }

  @Get('exportar-resumo-mensal-csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="resumo_mensal_contabilidade.csv"')
  exportarResumoMensalCsv(@Query('ano') ano?: string) {
    return this.contabilidadeService.gerarResumoMensalCsv(ano);
  }
}
