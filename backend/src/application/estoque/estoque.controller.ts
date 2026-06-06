import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../domain/enums';
import { EstoqueService } from './estoque.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('estoque')
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Get('movimentacoes')
  findAll(
    @Query('productId') productId?: string,
    @Query('produtoId') produtoId?: string,
    @Query('ordemServicoId') ordemServicoId?: string,
    @Query('type') type?: string,
    @Query('tipo') tipo?: string,
    @Query('date') date?: string,
    @Query('data') data?: string,
    @Query('serviceOrderNumber') serviceOrderNumber?: string,
    @Query('os') os?: string,
  ) {
    return this.estoqueService.list({ productId, produtoId, ordemServicoId, type, tipo, date, data, serviceOrderNumber, os });
  }

  @Get('movimentacoes/os/:ordemServicoId')
  findByOrdemServico(@Param('ordemServicoId') ordemServicoId: string) {
    return this.estoqueService.listByOrdemServico(ordemServicoId);
  }

  @Post('movimentacoes')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  create(@Body() body: any, @Request() req: any) {
    return this.estoqueService.create({ ...body, usuarioId: req.user?.id }, req.user);
  }
}
