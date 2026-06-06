import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Role } from '../../domain/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ComprasService } from './compras.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Get('pedidos')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO, Role.ATENDENTE)
  listarPedidos(@Query() query: any) {
    return this.comprasService.listarPedidos(query);
  }

  @Get('pedidos/:id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO, Role.ATENDENTE)
  obterPedido(@Param('id') id: string) {
    return this.comprasService.obterPedido(id);
  }

  @Post('pedidos')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  criarPedido(@Body() body: any, @Request() req: any) {
    return this.comprasService.criarPedido(body, req.user);
  }

  @Put('pedidos/:id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  atualizarPedido(@Param('id') id: string, @Body() body: any) {
    return this.comprasService.atualizarPedido(id, body);
  }

  @Post('pedidos/:id/aprovar')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  aprovarPedido(@Param('id') id: string, @Request() req: any) {
    return this.comprasService.aprovarPedido(id, req.user);
  }

  @Post('pedidos/:id/cancelar')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  cancelarPedido(@Param('id') id: string, @Body() body: any) {
    return this.comprasService.cancelarPedido(id, body);
  }

  @Post('pedidos/:id/receber')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  receberPedido(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.comprasService.receberPedido(id, body, req.user);
  }

  @Get('divergencias')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO)
  listarDivergencias(@Query() query: any) {
    return this.comprasService.listarDivergencias(query);
  }

  @Post('divergencias')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  criarDivergencia(@Body() body: any, @Request() req: any) {
    return this.comprasService.criarDivergencia(body, req.user);
  }

  @Put('divergencias/:id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE)
  atualizarDivergencia(@Param('id') id: string, @Body() body: any) {
    return this.comprasService.atualizarDivergencia(id, body);
  }

  @Post('pedidos/:id/documentos')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO)
  @UseInterceptors(FileInterceptor('arquivo'))
  anexarDocumento(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any
  ) {
    return this.comprasService.anexarDocumento(id, body, file, req.user);
  }

  @Get('pedidos/:id/documentos')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO, Role.ATENDENTE)
  listarDocumentos(@Param('id') id: string) {
    return this.comprasService.listarDocumentos(id);
  }

  @Get('pedidos/:id/documentos/:documentoId/download')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO, Role.ATENDENTE)
  async baixarDocumento(@Param('id') id: string, @Param('documentoId') documentoId: string, @Res() res: Response) {
    const { stream, filename, mimeType } = await this.comprasService.baixarDocumento(id, documentoId);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    stream.pipe(res);
  }

  @Delete('pedidos/:id/documentos/:documentoId')
  @Roles(Role.ADMIN, Role.GERENTE, Role.ESTOQUE, Role.FINANCEIRO)
  removerDocumento(@Param('id') id: string, @Param('documentoId') documentoId: string, @Request() req: any) {
    return this.comprasService.removerDocumento(id, documentoId, req.user);
  }
}
