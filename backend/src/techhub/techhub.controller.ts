import { Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '../domain/enums';
import { Roles } from '../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../application/auth/guards/roles.guard';
import { TechHubService } from './techhub.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.MECANICO)
@Controller('techhub')
export class TechHubController {
  constructor(private readonly techHubService: TechHubService) {}

  @Get('imports')
  async listImports() {
    return this.techHubService.listImports();
  }

  @Post('imports/process')
  async processImports(@Request() req: any) {
    return this.techHubService.processImports(req.user);
  }

  @Get('diagnostics')
  async listDiagnostics() {
    return this.techHubService.listDiagnostics();
  }

  @Get('diagnostics/:id')
  async getDiagnostic(@Param('id') id: string) {
    return this.techHubService.getDiagnostic(id);
  }
}
