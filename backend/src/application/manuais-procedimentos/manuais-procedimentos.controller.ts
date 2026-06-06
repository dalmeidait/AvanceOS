import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ManuaisProcedimentosService } from './manuais-procedimentos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../domain/enums';
import { normalizeRole, isAdminRole } from '../auth/roles';

@Controller('manuais-procedimentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManuaisProcedimentosController {
  constructor(private readonly manuaisProcedimentosService: ManuaisProcedimentosService) {}

  @Get()
  async findAll(@Request() req: any) {
    const userRole = normalizeRole(req.user?.cargo);
    const isAdmin = isAdminRole(userRole);
    const allDocs = await this.manuaisProcedimentosService.findAll();
    
    // Filtro de permissões
    return allDocs.filter(doc => {
      // Admin vê tudo
      if (isAdmin) return true;
      // Arquivados não aparecem para não-admins
      if (doc.status === 'ARQUIVADO') return false;
      // Visibilidade para todos
      if (doc.nivelAcesso === 'TODOS') return true;
      // Visibilidade para o próprio cargo
      if (normalizeRole(doc.nivelAcesso) === userRole) return true;
      
      return false;
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const doc = await this.manuaisProcedimentosService.findOne(id);
    const userRole = normalizeRole(req.user?.cargo);
    
    if (!isAdminRole(userRole)) {
      if (doc.status === 'ARQUIVADO' || (doc.nivelAcesso !== 'TODOS' && normalizeRole(doc.nivelAcesso) !== userRole)) {
        throw new Error('Acesso negado');
      }
    }
    
    return doc;
  }

  @Post()
  @Roles(Role.ADMIN, Role.ADMINISTRADOR, Role.GERENTE)
  async create(@Body() createDto: any) {
    return this.manuaisProcedimentosService.create(createDto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ADMINISTRADOR, Role.GERENTE)
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.manuaisProcedimentosService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ADMINISTRADOR, Role.GERENTE)
  async remove(@Param('id') id: string) {
    return this.manuaisProcedimentosService.remove(id);
  }

  @Post(':id/anexo')
  @Roles(Role.ADMIN, Role.ADMINISTRADOR, Role.GERENTE)
  @UseInterceptors(FileInterceptor('arquivo'))
  async uploadAnexo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.manuaisProcedimentosService.uploadAnexo(id, file);
  }

  @Get(':id/anexo/download')
  async baixarAnexo(@Param('id') id: string, @Res() res: any, @Request() req: any) {
    const userRole = normalizeRole(req.user?.cargo);
    const doc = await this.manuaisProcedimentosService.findOne(id);
    
    if (!isAdminRole(userRole)) {
      if (doc.status === 'ARQUIVADO' || (doc.nivelAcesso !== 'TODOS' && normalizeRole(doc.nivelAcesso) !== userRole)) {
        throw new Error('Acesso negado');
      }
    }

    const { info, filePath } = await this.manuaisProcedimentosService.baixarAnexo(id);
    return res.download(filePath, info.nomeOriginal);
  }

  @Get(':id/anexo/visualizar')
  async visualizarAnexo(@Param('id') id: string, @Res() res: any, @Request() req: any) {
    const userRole = normalizeRole(req.user?.cargo);
    const doc = await this.manuaisProcedimentosService.findOne(id);
    
    if (!isAdminRole(userRole)) {
      if (doc.status === 'ARQUIVADO' || (doc.nivelAcesso !== 'TODOS' && normalizeRole(doc.nivelAcesso) !== userRole)) {
        throw new Error('Acesso negado');
      }
    }

    const { info, filePath } = await this.manuaisProcedimentosService.baixarAnexo(id);
    
    res.setHeader('Content-Type', info.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${info.nomeOriginal}"`);
    return res.sendFile(filePath);
  }

  @Delete(':id/anexo')
  @Roles(Role.ADMIN, Role.ADMINISTRADOR, Role.GERENTE)
  async removerAnexo(@Param('id') id: string) {
    return this.manuaisProcedimentosService.removerAnexo(id);
  }
}
