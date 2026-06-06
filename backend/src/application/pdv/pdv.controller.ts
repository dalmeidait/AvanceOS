import { Controller, Get, Post, Put, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { PdvService } from './pdv.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../domain/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pdv')
export class PdvController {
  constructor(private readonly pdvService: PdvService) {}

  @Post('abrir-caixa')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO)
  abrirCaixa(@Body('saldoInicial') saldoInicial: number, @Request() req: any) {
    return this.pdvService.iniciarSessao(req.user.id, saldoInicial);
  }

  @Put('fechar-caixa')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO)
  fecharCaixa(@Body('saldoFinalInformado') saldoFinalInformado: number, @Request() req: any) {
    return this.pdvService.fecharSessao(req.user.id, saldoFinalInformado);
  }

  @Post('vender')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.ATENDENTE)
  realizarVenda(@Body() data: any, @Request() req: any) {
    return this.pdvService.realizarVenda(data, req.user.id);
  }

  // ==========================================
  // PAGAMENTO DE ORDEM DE SERVIÇO NO CAIXA
  // ==========================================
  @Get('os-pendentes')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.ATENDENTE)
  buscarOsPendentes(@Query('busca') busca: string, @Request() req: any) {
    return this.pdvService.buscarOsPendentes(busca, req.user);
  }

  @Get('os-pendentes/:cpf')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.ATENDENTE)
  buscarOsPendentePorCpf(@Param('cpf') cpf: string, @Request() req: any) {
    return this.pdvService.buscarOsPendentePorCpf(cpf, req.user);
  }

  @Post('pagar-os')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.ATENDENTE)
  pagarOS(@Body() data: { osId: string, metodoPagamento: any, valor?: number }, @Request() req: any) {
    return this.pdvService.pagarOS(data.osId, data.metodoPagamento, req.user, data.valor);
  }

  // ==========================================
  // NOVA ROTA: Relatório de Fechamento
  // ==========================================
  @Get('leitura-z')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO)
  getLeituraZ(@Request() req: any) {
    return this.pdvService.gerarLeituraZ(req.user.id);
  }
}
