import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ComprasService } from './compras.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('produtos/:produtoId/fornecedores')
export class ProdutoFornecedoresController {
  constructor(private readonly comprasService: ComprasService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO)
  listar(@Param('produtoId') produtoId: string) {
    return this.comprasService.listarProdutoFornecedores(produtoId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  vincular(@Param('produtoId') produtoId: string, @Body() body: any) {
    return this.comprasService.vincularProdutoFornecedor(produtoId, body);
  }

  @Put(':produtoFornecedorId')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  atualizar(
    @Param('produtoId') produtoId: string,
    @Param('produtoFornecedorId') produtoFornecedorId: string,
    @Body() body: any,
  ) {
    return this.comprasService.atualizarProdutoFornecedor(produtoId, produtoFornecedorId, body);
  }
}
