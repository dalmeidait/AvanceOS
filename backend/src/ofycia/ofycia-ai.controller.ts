import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { OfyciaAiService } from './ofycia-ai.service';
import { JwtAuthGuard } from '../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../application/auth/guards/roles.guard';
import { Roles } from '../application/auth/decorators/roles.decorator';
import { Role } from '../domain/enums';

@Controller('ofycia/ia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfyciaAiController {
  constructor(private readonly ofyciaAiService: OfyciaAiService) {}

  @Post('analisar-os/:id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ATENDENTE, Role.MECANICO)
  async analisarOsIA(@Param('id') id: string, @Body() payload: any) {
    return this.ofyciaAiService.analisarOs(id, payload);
  }
}
