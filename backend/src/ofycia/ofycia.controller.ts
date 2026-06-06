import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { OfyciaService } from './ofycia.service';
import { JwtAuthGuard } from '../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../application/auth/guards/roles.guard';
import { Roles } from '../application/auth/decorators/roles.decorator';
import { Role } from '../domain/enums';

@Controller('ofycia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfyciaController {
  constructor(private readonly ofyciaService: OfyciaService) {}

  @Post('analisar-os/:id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ATENDENTE)
  async analisarOs(@Param('id') id: string) {
    return this.ofyciaService.analisarOs(id);
  }
}
