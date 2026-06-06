import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VeiculosService } from './veiculos.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.ATENDENTE)
@Controller('veiculos')
export class VeiculosController {
  constructor(private readonly veiculosService: VeiculosService) { }

  @Post()
  create(@Body() data: any) {
    return this.veiculosService.create(data);
  }

  @Get()
  findAll(@Query('clienteId') clienteId?: string) {
    return this.veiculosService.findAll({ clienteId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.veiculosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.veiculosService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.veiculosService.remove(id);
  }
}
