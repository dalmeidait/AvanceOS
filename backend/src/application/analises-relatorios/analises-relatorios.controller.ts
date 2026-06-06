import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../domain/enums';
import { AnalisesRelatoriosService } from './analises-relatorios.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analises-relatorios')
export class AnalisesRelatoriosController {
  constructor(private readonly analisesRelatoriosService: AnalisesRelatoriosService) {}

  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO)
  @Get('resumo')
  getResumo(@Query() query: any) {
    return this.analisesRelatoriosService.getResumo(query);
  }

  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.ESTOQUE, Role.MECANICO, Role.ATENDENTE)
  @Get('os')
  getOs(@Query() query: any) {
    return this.analisesRelatoriosService.getOs(query);
  }

  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO)
  @Get('financeiro')
  getFinanceiro(@Query() query: any) {
    return this.analisesRelatoriosService.getFinanceiro(query);
  }

  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.ESTOQUE)
  @Get('estoque')
  getEstoque(@Query() query: any) {
    return this.analisesRelatoriosService.getEstoque(query);
  }

  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.MECANICO, Role.ATENDENTE)
  @Get('agenda')
  getAgenda(@Query() query: any) {
    return this.analisesRelatoriosService.getAgenda(query);
  }

  @Roles(Role.ADMIN, Role.GERENTE, Role.FINANCEIRO, Role.ESTOQUE, Role.MECANICO, Role.ATENDENTE)
  @Get('manuais')
  getManuais(@Query() query: any) {
    return this.analisesRelatoriosService.getManuais(query);
  }
}
