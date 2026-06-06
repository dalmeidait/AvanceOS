import { BadRequestException, Controller, Get, Post, Body, Param, Put, Patch, Request, UseGuards, Delete, UploadedFile, UseInterceptors, Query, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OsService } from './os.service';
import { OsEventosService } from './os-eventos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../domain/enums';
import { CATALOGO_DADOS } from './os.catalogo.data';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.GERENTE, Role.ATENDENTE, Role.MECANICO)
@Controller('os')
export class OsController {
  constructor(
    private readonly osService: OsService,
    private readonly osEventos: OsEventosService
  ) { }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.osService.create(data, req.user);
  }

  @Post(':id/assinar')
  assinar(@Param('id') id: string, @Body('codigo') codigo: string) {
    return this.osService.assinarTermo(id, codigo);
  }

  @Post(':id/iniciar-execucao')
  iniciarExecucao(@Param('id') id: string) {
    return this.osService.iniciarExecucao(id);
  }

  @Post(':id/itens')
  addItens(@Param('id') id: string, @Body('itens') itens: any[], @Request() req: any) {
    throw new BadRequestException('Rota depreciada na v1.0. Use PUT /api/os/:id para sincronizar itens da OS.');
  }

  @Patch(':id/status')
  alterarStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    return this.osService.alterarStatus(id, status, req.user);
  }

  @Post(':id/servicos')
  adicionarServico(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.osService.adicionarServico(id, data, req.user);
  }

  @Delete(':id/servicos/:itemId')
  removerServico(@Param('id') id: string, @Param('itemId') itemId: string, @Request() req: any) {
    return this.osService.removerItem(id, itemId, req.user);
  }

  @Post(':id/produtos')
  adicionarProduto(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.osService.adicionarProduto(id, data, req.user);
  }

  @Delete(':id/produtos/:itemId')
  removerProduto(@Param('id') id: string, @Param('itemId') itemId: string, @Request() req: any) {
    return this.osService.removerItem(id, itemId, req.user);
  }

  @Delete(':id/itens/:itemId')
  removerItem(@Param('id') id: string, @Param('itemId') itemId: string, @Request() req: any) {
    return this.osService.removerItem(id, itemId, req.user);
  }

  @Post(':id/finalizar')
  finalizar(@Param('id') id: string, @Request() req: any) {
    return this.osService.finalizar(id, req.user);
  }

  @Patch(':id/desconto')
  aplicarDesconto(@Param('id') id: string, @Body('descontoAplicado') descontoAplicado: number, @Request() req: any) {
    return this.osService.aplicarDesconto(id, descontoAplicado, req.user);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.osService.update(id, data, req.user);
  }

  @Get()
  findAll() {
    return this.osService.findAll();
  }

  @Get('catalogo')
  getCatalogo() {
    return CATALOGO_DADOS;
  }

  @Get(':id/financeiro')
  getFinanceiro(@Param('id') id: string) {
    return this.osService.getFinanceiro(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.osService.findOne(id);
  }

  @Get(':id/eventos')
  listarEventos(@Param('id') id: string, @Query('ordem') ordem?: 'asc' | 'desc') {
    return this.osEventos.listarEventos(id, ordem);
  }

  @Post(':id/eventos')
  registrarObservacao(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    if (!body.descricao && !body.titulo) throw new BadRequestException('Observação inválida.');
    return this.osEventos.registrarEvento({
      ordemServicoId: id,
      usuarioId: req.user?.id,
      tipo: body.tipo || 'OBSERVACAO_MANUAL',
      titulo: body.titulo || 'Observacao Manual',
      descricao: body.descricao,
      severidade: body.severidade || 'INFO',
      origem: 'USUARIO'
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.osService.cancelarOrdemServico(id, req.user);
  }

  @Get(':id/anexos')
  getAnexos(@Param('id') id: string) {
    return this.osService.listAnexos(id);
  }

  @Post(':id/anexos')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const allowedMimeTypes = new Set([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ]);
      const allowedExtensions = /\.(pdf|jpe?g|png|webp|txt|doc|docx|xls|xlsx)$/i;
      if (allowedMimeTypes.has(file.mimetype) || allowedExtensions.test(file.originalname)) {
        callback(null, true);
        return;
      }
      callback(new BadRequestException('Tipo de arquivo não permitido.'), false);
    },
  }))
  uploadAnexos(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: { tipoDocumento?: string }, @Request() req: any) {
    return this.osService.uploadAnexo(id, file, body, req.user);
  }

  // --- Fluxo de Orçamentos ---

  @Post(':id/orcamentos')
  elaborarOrcamento(@Param('id') id: string, @Request() req: any) {
    return this.osService.elaborarOrcamento(id, req.user);
  }

  @Get(':id/orcamentos')
  listarOrcamentos(@Param('id') id: string) {
    return this.osService.listarOrcamentos(id);
  }

  @Get('orcamentos/:orcamentoId')
  detalharOrcamento(@Param('orcamentoId') orcamentoId: string) {
    return this.osService.detalharOrcamento(orcamentoId);
  }

  @Post('orcamentos/:orcamentoId/marcar-enviado')
  marcarOrcamentoEnviado(@Param('orcamentoId') orcamentoId: string, @Body() body: any, @Request() req: any) {
    return this.osService.marcarOrcamentoEnviado(orcamentoId, body, req.user);
  }

  @Post('orcamentos/:orcamentoId/aprovar')
  aprovarOrcamento(@Param('orcamentoId') orcamentoId: string, @Body() body: any, @Request() req: any) {
    return this.osService.aprovarOrcamento(orcamentoId, body, req.user);
  }

  @Post('orcamentos/:orcamentoId/recusar')
  recusarOrcamento(@Param('orcamentoId') orcamentoId: string, @Body() body: any, @Request() req: any) {
    return this.osService.recusarOrcamento(orcamentoId, body, req.user);
  }

  @Get('orcamentos/:orcamentoId/documento')
  obterDocumentoOrcamento(@Param('orcamentoId') orcamentoId: string) {
    return this.osService.obterDocumentoOrcamento(orcamentoId);
  }

  @Get('orcamentos/:orcamentoId/mensagem')
  obterMensagemOrcamento(@Param('orcamentoId') orcamentoId: string) {
    return this.osService.obterMensagemOrcamento(orcamentoId);
  }

  // --- CRM / Relacionamento ---

  @Post(':id/gerar-pos-venda')
  gerarPosVenda(@Param('id') id: string, @Request() req: any) {
    return this.osService.gerarPosVenda(id, req.user);
  }

  // --- Dossiê Documental da OS ---

  @Post(':id/documentos')
  @UseInterceptors(FileInterceptor('arquivo'))
  anexarDocumento(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any
  ) {
    return this.osService.anexarDocumentoDossie(id, body, file, req.user);
  }

  @Get(':id/documentos')
  listarDocumentos(@Param('id') id: string) {
    return this.osService.listarDocumentosDossie(id);
  }

  @Get(':id/documentos/:documentoId/download')
  async baixarDocumento(
    @Param('id') id: string,
    @Param('documentoId') documentoId: string,
    @Res() res: any
  ) {
    const { doc, filePath } = await this.osService.baixarDocumentoDossie(id, documentoId);
    return res.download(filePath, doc.nomeOriginal);
  }

  @Delete(':id/documentos/:documentoId')
  removerDocumento(
    @Param('id') id: string,
    @Param('documentoId') documentoId: string
  ) {
    return this.osService.removerDocumentoDossie(id, documentoId);
  }
}
