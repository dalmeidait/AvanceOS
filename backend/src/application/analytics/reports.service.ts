import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateOsReport(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório Fechamento Analítico');

    // Cabeçalhos Formatados
    worksheet.columns = [
      { header: 'Número OS', key: 'numero', width: 15 },
      { header: 'Situação', key: 'status', width: 20 },
      { header: 'Placa', key: 'placa', width: 15 },
      { header: 'Abertura', key: 'data_abertura', width: 25 },
      { header: 'Fechamento', key: 'data_fechamento', width: 25 },
      { header: 'Receita Serviços', key: 'valor_servicos', width: 18 },
      { header: 'Receita Total', key: 'valor_final', width: 18 },
    ];

    const ordens = await this.prisma.ordemServico.findMany({
       where: { status: { in: ['PAGO', 'CONCLUIDO', 'CONCLUIDA'] } },
       orderBy: { criadoEm: 'desc' }
    });

    ordens.forEach(os => {
       worksheet.addRow({
          numero: `OS-${os.numeroOS}`,
          status: os.status,
          placa: os.placaVeiculo,
          data_abertura: os.criadoEm.toISOString(),
          data_fechamento: os.atualizadoEm.toISOString(),
          valor_servicos: os.valorMaoDeObra,
          valor_final: os.valorFinal
       });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'Relatorio_Gerencial.xlsx');

    // Escreve buffer para response Express
    await workbook.xlsx.write(res);
    res.end();
  }
}
