import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Request, UseGuards } from '@nestjs/common';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() data: CreateUsuarioDto, @Request() req: any) {
    return this.usuariosService.create(data, req.user);
  }

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateUsuarioDto, @Request() req: any) {
    return this.usuariosService.update(id, data, req.user);
  }

  @Patch(':id/status')
  setActive(@Param('id') id: string, @Body() data: { isActive?: boolean; status?: string }, @Request() req: any) {
    const isActive = data.isActive ?? data.status === 'ATIVO';
    return this.usuariosService.setActive(id, Boolean(isActive), req.user);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() data: { senha?: string; temporaryPassword?: string }, @Request() req: any) {
    return this.usuariosService.resetPassword(id, data.temporaryPassword || data.senha || '', req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.remove(id, req.user);
  }
}
