import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EstoqueSolicitacoesService } from './estoque-solicitacoes.service';

@UseGuards(JwtAuthGuard)
@Controller('estoque-solicitacoes')
export class EstoqueSolicitacoesController {
  constructor(private readonly service: EstoqueSolicitacoesService) {}

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.service.create(data, req.user);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('urgencia') urgencia?: string,
    @Query('ordemServicoId') ordemServicoId?: string,
    @Query('mecanicoId') mecanicoId?: string,
  ) {
    return this.service.findAll({ status, urgencia, ordemServicoId, mecanicoId });
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() data: any) {
    return this.service.updateStatus(id, data);
  }
}
