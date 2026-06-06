import { Controller, Get, Post, Body, Param, Put, Query, UseGuards, Request } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInteracaoDto } from './dto/create-interacao.dto';
import { RegistrarContatoDto } from './dto/registrar-contato.dto';

@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('nps')
  receberNps(@Body() data: { ordemServicoId: string, nota: number, comentario?: string }) {
    return this.crmService.receberNps(data.ordemServicoId, data.nota, data.comentario);
  }

  // --- Relacionamento / Interações ---

  @Get('dashboard')
  getDashboardMetrics() {
    return this.crmService.getDashboardMetrics();
  }

  @Get('interacoes')
  getInteracoes(@Query() filtros: any) {
    return this.crmService.getInteracoes(filtros);
  }

  @Post('interacoes')
  criarInteracao(@Body() createDto: CreateInteracaoDto, @Request() req) {
    const usuarioId = req.user?.sub || req.user?.id;
    return this.crmService.criarInteracao(createDto, usuarioId);
  }

  @Get('interacoes/:id')
  getInteracaoById(@Param('id') id: string) {
    return this.crmService.getInteracaoById(id);
  }

  @Put('interacoes/:id')
  atualizarInteracao(@Param('id') id: string, @Body() data: any) {
    return this.crmService.atualizarInteracao(id, data);
  }

  @Post('interacoes/:id/registrar-contato')
  registrarContato(@Param('id') id: string, @Body() registrarDto: RegistrarContatoDto) {
    return this.crmService.registrarContato(id, registrarDto);
  }

  @Get('orcamentos-pendentes')
  getOrcamentosPendentes() {
    return this.crmService.getOrcamentosPendentes();
  }
}
