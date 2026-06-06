import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ServicosService } from './servicos.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  findAll(@Query('busca') busca?: string, @Query('categoria') categoria?: string, @Query('status') status?: string) {
    return this.servicosService.findAll({ busca, categoria, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicosService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  create(@Body() data: any) {
    return this.servicosService.create(data);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  update(@Param('id') id: string, @Body() data: any) {
    return this.servicosService.update(id, data);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  updateStatus(@Param('id') id: string, @Body() data: { isActive?: boolean; status?: string }) {
    return this.servicosService.updateStatus(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  deactivate(@Param('id') id: string) {
    return this.servicosService.deactivate(id);
  }
}
