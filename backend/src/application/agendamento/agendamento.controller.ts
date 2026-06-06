import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AgendamentoService } from './agendamento.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.ATENDENTE, Role.MECANICO)
@Controller(['agendamento', 'agendamentos'])
export class AgendamentoController {
  constructor(private readonly agendamentoService: AgendamentoService) {}

  @Get()
  findAll(
    @Query('data') data?: string,
    @Query('maquina') maquina?: string,
    @Query('status') status?: string,
    @Query('responsavelId') responsavelId?: string,
    @Query('ordemServicoId') ordemServicoId?: string,
  ) {
    return this.agendamentoService.findAll({ data, maquina, status, responsavelId, ordemServicoId });
  }

  @Get('opcoes')
  opcoes() {
    return this.agendamentoService.opcoes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agendamentoService.findOne(id);
  }

  @Post()
  criar(@Body() data: any) {
    return this.agendamentoService.criar(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.agendamentoService.update(id, data);
  }

  @Patch(':id/status')
  alterarStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.agendamentoService.alterarStatus(id, status);
  }

  @Patch(':id/saida')
  registrarSaida(@Param('id') id: string, @Body('horaSaida') horaSaida?: string) {
    return this.agendamentoService.registrarSaida(id, horaSaida);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agendamentoService.remove(id);
  }

  @Post('recursos')
  criarRecurso(@Body() data: { nome: string; tipo: string }) {
    return this.agendamentoService.criarRecurso(data.nome, data.tipo);
  }
}
