import { Controller, Delete, Get, Patch, Post, Put, Body, Param, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { TipoMovimentacao } from '../../domain/enums';;
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../domain/enums';
import { EstoqueAlertaInterceptor } from '../estoque/estoque.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  create(@Body() data: any, @Request() req: any) {
    return this.produtosService.create(data, req.user);
  }

  @Get()
  findAll(@Query('busca') busca?: string, @Query('categoria') categoria?: string, @Query('status') status?: string) {
    return this.produtosService.findAll({ busca, categoria, status });
  }

  @Get('compativeis')
  findCompativeis(@Query('veiculo') veiculoModelo: string) {
    if (!veiculoModelo) return this.produtosService.findAll();
    return this.produtosService.findCompativeis(veiculoModelo);
  }

  // BI Endpoints — devem vir ANTES de :id para não serem capturados como parâmetro
  @Get('bi/curva-abc')
  getCurvaABC() {
    return this.produtosService.getCurvaABC();
  }

  @Get('bi/valorizacao')
  getValorizacaoInventario() {
    return this.produtosService.getValorizacaoInventario();
  }

  @Get('movimentacoes')
  findHistoricoMovimentacoes() {
    return this.produtosService.findHistoricoMovimentacoes();
  }

  @Get('estoque-baixo')
  findLowStock() {
    return this.produtosService.findLowStock();
  }

  @Get('estoque-critico')
  findCriticalStock() {
    return this.produtosService.findCriticalStock();
  }

  @Get(':id/movimentacoes')
  findMovimentacoesProduto(@Param('id') id: string) {
    return this.produtosService.findMovimentacoesProduto(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produtosService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.produtosService.update(id, data, req.user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  updateStatus(@Param('id') id: string, @Body() data: { isActive?: boolean; status?: string }, @Request() req: any) {
    return this.produtosService.updateStatus(id, data, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.produtosService.deactivate(id, req.user);
  }

  @Post(':id/movimentacoes')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  @UseInterceptors(EstoqueAlertaInterceptor)
  addMovimentacao(
    @Param('id') id: string, 
    @Body() data: { tipo: TipoMovimentacao, quantidade: number, justificativa?: string, ordemServicoId?: string, notaFiscal?: string, fornecedorId?: string, custoUnitario?: number },
    @Request() req: any
  ) {
    return this.produtosService.addMovimentacao(id, {
        ...data,
        usuarioId: req.user.id
    }, req.user);
  }
}
