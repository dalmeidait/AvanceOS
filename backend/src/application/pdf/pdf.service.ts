import { Injectable } from '@nestjs/common';
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  async generateAcceptanceTerm(osId: string, codigoUnicoAceite: string, placa: string, modelo: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const dir = path.join(process.cwd(), 'uploads', 'termos');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const filename = `termo_${osId}.pdf`;
        const filePath = path.join(dir, filename);
        
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(20).text('TERMO DE ACEITE DE ORDEM DE SERVIÇO', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Ordem de Serviço ID: ${osId}`);
        doc.text(`Veículo: ${modelo} (${placa})`);
        doc.moveDown();
        doc.text('Eu, por meio deste documento, declaro que autorizo a execução dos serviços e a aplicação de peças conforme detalhado na respectiva Ordem de Serviço na Oficina Avance.', { align: 'justify' });
        doc.moveDown();
        doc.fontSize(14).text(`Código Único de Aceite (Assinatura Eletrônica): ${codigoUnicoAceite}`, { align: 'center', underline: true });
        doc.moveDown();
        doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString()}`, { align: 'right' });

        doc.end();

        stream.on('finish', () => resolve(filename));
        stream.on('error', (err) => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }
  async generateNotaFiscal(osId: string, numeroOS: number, valorTotal: number): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const dir = path.join(process.cwd(), 'uploads', 'nf');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const filename = `nf_${osId}.pdf`;
        const filePath = path.join(dir, filename);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(20).text('NOTA FISCAL DE SERVIÇO / PRODUTO', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Ordem de Serviço Nº: ${numeroOS}`);
        doc.text(`Valor Total: R$ ${valorTotal.toFixed(2)}`);
        doc.text(`Status: PAGO`);
        doc.moveDown();
        doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString()}`, { align: 'right' });
        
        doc.end();
        stream.on('finish', () => resolve(filename));
        stream.on('error', (err) => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }
}
