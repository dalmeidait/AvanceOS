import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, extname } from 'path';

@Injectable()
export class ManuaisProcedimentosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.manualProcedimento.findMany({
      orderBy: {
        atualizadoEm: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const manual = await this.prisma.manualProcedimento.findUnique({
      where: { id },
    });
    if (!manual) throw new NotFoundException('Documento não encontrado');
    return manual;
  }

  async create(data: any) {
    return this.prisma.manualProcedimento.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.manualProcedimento.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.manualProcedimento.update({
      where: { id },
      data: { status: 'ARQUIVADO' },
    });
  }

  async uploadAnexo(id: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('O arquivo excede o limite de 10MB.');
    
    const manual = await this.findOne(id);

    // Corrigir charset do multer se necessário
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8') || 'documento';
    const ext = extname(originalName).toLowerCase().replace('.', '');
    const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'doc', 'docx', 'xls', 'xlsx'];
    const blockedExts = ['exe', 'bat', 'cmd', 'ps1', 'msi', 'js', 'vbs', 'scr', 'sh'];

    if (blockedExts.includes(ext) || !allowedExts.includes(ext)) {
      throw new BadRequestException('Tipo de arquivo não permitido.');
    }

    const dir = join(process.cwd(), 'uploads', 'manuais-procedimentos', id);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const safeFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(originalName) || '.bin'}`;
    const filePath = join(dir, safeFilename);

    writeFileSync(filePath, file.buffer);

    const arquivoUrlData = {
      tipo: 'UPLOAD_SISTEMA',
      nomeOriginal: originalName,
      nomeArquivo: safeFilename,
      mimeType: file.mimetype,
      tamanho: file.size,
      caminhoRelativo: `uploads/manuais-procedimentos/${id}/${safeFilename}`,
      urlVisualizacao: `/api/manuais-procedimentos/${id}/anexo/visualizar`,
      urlDownload: `/api/manuais-procedimentos/${id}/anexo/download`
    };

    return this.prisma.manualProcedimento.update({
      where: { id },
      data: { arquivoUrl: JSON.stringify(arquivoUrlData) },
    });
  }

  async baixarAnexo(id: string) {
    const doc = await this.findOne(id);
    if (!doc.arquivoUrl || !doc.arquivoUrl.startsWith('{')) {
      throw new BadRequestException('Este documento não possui anexo local para download/visualização.');
    }
    
    try {
      const info = JSON.parse(doc.arquivoUrl);
      if (info.tipo !== 'UPLOAD_SISTEMA' || !info.caminhoRelativo) throw new Error('Formato inválido');
      
      const filePath = join(process.cwd(), info.caminhoRelativo);
      if (!existsSync(filePath)) {
        throw new NotFoundException('Arquivo não encontrado no servidor.');
      }
      
      return { doc, info, filePath };
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new BadRequestException('Falha ao processar o anexo do documento.');
    }
  }

  async removerAnexo(id: string) {
    const doc = await this.findOne(id);
    if (doc.arquivoUrl && doc.arquivoUrl.startsWith('{')) {
      try {
        const info = JSON.parse(doc.arquivoUrl);
        if (info.tipo === 'UPLOAD_SISTEMA' && info.caminhoRelativo) {
          const filePath = join(process.cwd(), info.caminhoRelativo);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        }
      } catch (e) {
        // Ignorar
      }
    }
    
    return this.prisma.manualProcedimento.update({
      where: { id },
      data: { arquivoUrl: null },
    });
  }
}
