import { Controller, Get, Post, Put, Delete, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientesService } from './clientes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.ATENDENTE)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  create(@Body() data: any) {
    return this.clientesService.create(data);
  }

  @Get()
  findAll() {
    return this.clientesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Get(':id/veiculos')
  findVeiculos(@Param('id') id: string) {
    return this.clientesService.findVeiculos(id);
  }

  @Get(':id/interacoes')
  findInteracoes(@Param('id') id: string) {
    return this.clientesService.findInteracoes(id);
  }

  @Get(':id/limpo')
  findOneLimpo(@Param('id') id: string) {
    return this.clientesService.findOneLimpo(id);
  }

  @Put(':id') // <-- A MÁGICA AQUI! Usando Put para bater com o Flutter
  update(@Param('id') id: string, @Body() data: any) {
    return this.clientesService.update(id, data);
  }

  @Patch(':id/anonimizar')
  anonimizar(@Param('id') id: string) {
    return this.clientesService.anonimizar(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientesService.remove(id);
  }
}
