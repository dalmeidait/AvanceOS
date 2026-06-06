import { Controller, Get, Post, Put, Delete, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FornecedoresService } from './fornecedores.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  @Post()
  create(@Body() data: any) {
    return this.fornecedoresService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.RECEPCIONISTA, Role.MECANICO)
  findAll() {
    return this.fornecedoresService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.RECEPCIONISTA, Role.MECANICO)
  findOne(@Param('id') id: string) {
    return this.fornecedoresService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.fornecedoresService.update(id, data);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() data: { status: string; ativo: boolean }) {
    return this.fornecedoresService.updateStatus(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fornecedoresService.remove(id);
  }
}
