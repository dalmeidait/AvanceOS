import { Injectable, NotFoundException } from '@nestjs/common';
import { constants } from 'node:fs';
import type { Dirent } from 'node:fs';
import { access, mkdir, readFile, readdir, rename, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { PrismaService } from '../infrastructure/prisma.service';
import { AuditService } from '../application/audit/audit.service';

const TECHHUB_BASE_PATH = '/app/techhub-imports';
const TECHHUB_INPUT_PATH = join(TECHHUB_BASE_PATH, 'Entrada');
const TECHHUB_PROCESSED_PATH = join(TECHHUB_BASE_PATH, 'Processados');
const TECHHUB_ERROR_PATH = join(TECHHUB_BASE_PATH, 'Erros');

type JsonObject = Record<string, unknown>;

type TechHubImportFile = {
  fileName: string;
  sizeBytes: number;
  modifiedAt: string;
  summary?: any;
  rawPreview?: any;
  parseError?: string;
};

type TechHubProcessedSummary = {
  module?: string;
  system?: string;
  target?: string;
  eventType?: string;
  diagnosticCategory?: string;
  customerName?: string;
  customerDocument?: string;
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number | string;
  vehicleMileageKm?: number | string;
  vehicle?: string;
  scenario?: string;
  severity?: string;
  diagnosticDescription?: string;
  diagnosticSeverity?: string;
  createdAt?: string;
  serviceOrderNumber?: string;
};

@Injectable()
export class TechHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listImports() {
    let entries: Dirent[];

    try {
      entries = await readdir(TECHHUB_INPUT_PATH, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error;
      }

      return {
        status: 'error',
        message: 'Pasta de importações do TechHub não encontrada.',
      };
    }

    const files = await Promise.all(
      this.getJsonFileEntries(entries).map(async (entry): Promise<TechHubImportFile> => {
        const filePath = join(TECHHUB_INPUT_PATH, entry.name);
        const fileStat = await stat(filePath);

        const baseResult = {
          fileName: entry.name,
          sizeBytes: fileStat.size,
          modifiedAt: fileStat.mtime.toISOString(),
        };

        try {
          const parsed = await this.readJsonObject(filePath);
          const summary = this.buildImportSummary(parsed);
          const rawPreview = {
            hasObd: Boolean(parsed.obd),
            hasPreventiveInspection: Boolean(parsed.preventiveInspection),
            hasDiagnostic: Boolean(parsed.diagnostic),
            originalKeys: Object.keys(parsed),
          };

          return {
            ...baseResult,
            summary,
            rawPreview,
          };
        } catch (error) {
          return {
            ...baseResult,
            parseError: this.getErrorMessage(error),
          };
        }
      }),
    );

    return files.sort(
      (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    );
  }

  async processImports(user?: any) {
    const processedAt = new Date().toISOString();
    let entries: Dirent[];

    try {
      entries = await readdir(TECHHUB_INPUT_PATH, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error;
      }

      return {
        status: 'error',
        module: 'AvanceOS TechHub',
        processedAt,
        totalFound: 0,
        processed: [],
        failed: [],
        error: 'Pasta de importações do TechHub não encontrada.',
      };
    }

    await Promise.all([
      mkdir(TECHHUB_PROCESSED_PATH, { recursive: true }),
      mkdir(TECHHUB_ERROR_PATH, { recursive: true }),
    ]);

    const jsonEntries = this.getJsonFileEntries(entries);
    const processed = [];
    const failed = [];

    for (const entry of jsonEntries) {
      const sourcePath = join(TECHHUB_INPUT_PATH, entry.name);

      try {
        const parsed = await this.readJsonObject(sourcePath);
        const summary = this.buildSummary(parsed);
        const existingDiagnostic = await this.prisma.techHubDiagnostic.findFirst({
          where: { fileName: entry.name },
        });

        if (!existingDiagnostic) {
          const createdDiagnostic = await this.prisma.techHubDiagnostic.create({
            data: this.buildDiagnosticCreateData(entry.name, parsed, summary),
          });

          const serviceOrderNumber = summary.serviceOrderNumber;
          let osId = null;
          if (serviceOrderNumber) {
            const parsedNum = Number(serviceOrderNumber);
            if (!Number.isNaN(parsedNum)) {
              const os = await this.prisma.ordemServico.findFirst({ where: { numeroOS: parsedNum } });
              if (os) osId = os.id;
            }
          } else if (summary.vehiclePlate) {
            const os = await this.prisma.ordemServico.findFirst({
              where: { placaVeiculo: summary.vehiclePlate, status: { notIn: ['CANCELADA'] } },
              orderBy: { criadoEm: 'desc' }
            });
            if (os) osId = os.id;
          }

          if (osId) {
            await this.prisma.ordemServicoEvento.create({
              data: {
                ordemServicoId: osId,
                tipo: 'LABTECH_DIAGNOSTICO_IMPORTADO',
                titulo: 'Diagnóstico LAB-TECH importado',
                descricao: `Diagnóstico [${summary.scenario || 'Geral'}/${summary.module || 'N/A'}/${summary.severity || 'N/A'}] foi importado para a OS.`,
                origem: 'LAB-TECH',
                severidade: summary.severity === 'Alto' ? 'CRITICO' : (summary.severity === 'Médio' ? 'ATENCAO' : 'INFO'),
                entidade: 'TechHubDiagnostic',
                entidadeId: createdDiagnostic.id,
              }
            });
          }
        }

        await this.moveFile(sourcePath, TECHHUB_PROCESSED_PATH, entry.name);

        processed.push({
          fileName: entry.name,
          movedTo: 'Processados',
          alreadyExists: Boolean(existingDiagnostic),
          summary,
        });
      } catch (error) {
        let errorMessage = this.getErrorMessage(error);

        try {
          await this.moveFile(sourcePath, TECHHUB_ERROR_PATH, entry.name);
        } catch (moveError) {
          errorMessage = `${errorMessage}; erro ao mover para Erros: ${this.getErrorMessage(moveError)}`;
        }

        failed.push({
          fileName: entry.name,
          movedTo: 'Erros',
          error: errorMessage,
        });
      }
    }

    const result = {
      status: 'ok',
      module: 'AvanceOS TechHub',
      processedAt,
      totalFound: jsonEntries.length,
      processed,
      failed,
    };
    await this.auditService.logAction({
      userId: user?.id,
      action: 'TECHHUB_IMPORT_PROCESSED',
      entity: 'TECHHUB',
      description: 'Processamento de importações TechHub executado.',
      metadata: { totalFound: jsonEntries.length, processed: processed.length, failed: failed.length },
    });
    return result;
  }

  async listDiagnostics() {
    return this.prisma.techHubDiagnostic.findMany({
      orderBy: { processedAt: 'desc' },
    });
  }

  async getDiagnostic(id: string) {
    const diagnostic = await this.prisma.techHubDiagnostic.findUnique({
      where: { id },
    });

    if (!diagnostic) {
      throw new NotFoundException('Diagnóstico TechHub não encontrado.');
    }

    return diagnostic;
  }

  private getJsonFileEntries(entries: Dirent[]) {
    return entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'));
  }

  private async readJsonObject(filePath: string): Promise<JsonObject> {
    const rawContent = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(rawContent);

    if (!this.isJsonObject(parsed)) {
      throw new Error('JSON inválido: o conteúdo deve ser um objeto.');
    }

    return parsed;
  }

  private isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private firstPresent(data: JsonObject, paths: string[]) {
    for (const pathKey of paths) {
      const value = this.getNestedValue(data, pathKey);
      if (value !== undefined && value !== null && value !== '') return value;
    }

    return undefined;
  }

  private normalizeDtcValues(...values: unknown[]): string[] {
    const result: string[] = [];

    for (const value of values) {
      if (!value) continue;

      if (Array.isArray(value)) {
        result.push(...this.normalizeDtcValues(...value));
        continue;
      }

      if (this.isJsonObject(value)) {
        result.push(...this.normalizeDtcValues(value.code, value.dtc, value.dtcCode, value.codigo));
        continue;
      }

      if (typeof value === 'string') {
        result.push(...value.split(/[,\s;]+/).map((item) => item.trim()).filter(Boolean));
        continue;
      }

      result.push(String(value));
    }

    return [...new Set(result.filter(Boolean))];
  }

  private buildImportSummary(data: JsonObject) {
    const obd = data.obd as JsonObject | undefined;
    const vehicle = data.vehicle as JsonObject | undefined;
    const diagnostic = data.diagnostic as JsonObject | undefined;
    const customer = data.customer as JsonObject | undefined;
    const simulation = data.simulation as JsonObject | undefined;
    const serviceOrder = data.serviceOrder as JsonObject | undefined;

    const dtcs = this.normalizeDtcValues(
      data.dtcs,
      data.codigosFalha,
      data.codigos_falha,
      data.faultCodes,
      data.troubleCodes,
      data.codes,
      this.getNestedValue(data, 'diagnostic.dtcs'),
      this.getNestedValue(data, 'diagnostic.troubleCodes'),
      this.getNestedValue(data, 'obd.dtcs'),
      this.getNestedValue(data, 'obd.dtcCode'),
      this.getNestedValue(data, 'obd.dtcCodes'),
      this.getNestedValue(data, 'obd.faultCodes'),
      this.getNestedValue(data, 'obd.troubleCodes'),
    );

    return {
      source: data.source,
      system: data.system,
      target: data.target,
      module: data.module,
      eventType: data.eventType,
      diagnosticCategory: data.diagnosticCategory,
      createdAt: data.createdAt,
      serviceOrderNumber: serviceOrder?.number,

      vehiclePlate: vehicle?.plate,
      vehicleBrand: vehicle?.brand,
      vehicleModel: vehicle?.model,
      vehicleYear: vehicle?.year,
      vehicleMileageKm: vehicle?.mileageKm,

      customerName: customer?.name,
      customerDocument: customer?.document,

      scenario: simulation?.scenario,
      severity: simulation?.severity || diagnostic?.severity,

      dtcs,
      rpm: this.firstPresent(data, ['obd.rpm', 'obd.engineRpm', 'rpm', 'engineRpm', 'engine_rpm', 'leituras.rpm', 'readings.rpm', 'pids.rpm', 'sensores.rpm', 'metricas.rpm', 'obdData.rpm']),
      coolantTemperatureC: this.firstPresent(data, [
        'obd.coolantTemperatureC', 'obd.coolantTemperature', 'obd.coolantTemp', 'obd.engineTemperatureC', 'obd.engineTemperature', 'obd.engineTemp',
        'coolantTemperatureC', 'coolantTemperature', 'coolantTemp', 'temperaturaMotor', 'temperatura_motor', 'tempMotor', 'engineTemperatureC', 'engineTemperature', 'engineTemp', 'engine_temperature',
        'leituras.temperaturaMotor', 'readings.temperaturaMotor', 'pids.temperaturaMotor', 'sensores.temperaturaMotor', 'metricas.temperaturaMotor', 'obdData.temperaturaMotor',
      ]),
      batteryVoltage: this.firstPresent(data, [
        'obd.batteryVoltage', 'obd.voltage', 'batteryTest.voltage', 'batteryTest.batteryVoltage', 'batteryTest.voltageV',
        'batteryVoltage', 'battery_voltage', 'voltage', 'tensaoBateria', 'tensao_bateria', 'bateria',
        'leituras.tensaoBateria', 'readings.tensaoBateria', 'pids.tensaoBateria', 'sensores.tensaoBateria', 'metricas.tensaoBateria', 'obdData.tensaoBateria',
      ]),
      engineLoadPercent: obd?.engineLoadPercent,
      vehicleSpeedKmh: obd?.vehicleSpeedKmh,
      milStatus: obd?.milStatus,
      obdStatus: obd?.status,
      obdDescription: obd?.description,
      obdProtocol: obd?.protocol,

      diagnosticDescription: diagnostic?.description,
      diagnosticSeverity: diagnostic?.severity,
      possibleCauses: diagnostic?.possibleCauses,
      recommendedAction: diagnostic?.recommendedAction,
      suggestedServices: diagnostic?.suggestedServices,
      suggestedParts: diagnostic?.suggestedParts,

      preventiveInspection: data.preventiveInspection
    };
  }

  private buildSummary(data: JsonObject): TechHubProcessedSummary {
    const vehicleBrand = this.getString(data, 'vehicle.brand');
    const vehicleModel = this.getString(data, 'vehicle.model');
    const vehicleYear = this.getStringOrNumber(data, 'vehicle.year');
    const simulationSeverity = this.getString(data, 'simulation.severity');
    const diagnosticSeverity = this.getString(data, 'diagnostic.severity');

    return this.removeEmptyValues({
      module: this.getString(data, 'module'),
      serviceOrderNumber: this.getNullableString(data, 'serviceOrder.number') ?? undefined,
      system: this.getString(data, 'system'),
      target: this.getString(data, 'target'),
      eventType: this.getString(data, 'eventType'),
      diagnosticCategory: this.getString(data, 'diagnosticCategory'),
      customerName: this.getString(data, 'customer.name'),
      customerDocument: this.getString(data, 'customer.document'),
      vehiclePlate: this.getString(data, 'vehicle.plate'),
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehicleMileageKm: this.getStringOrNumber(data, 'vehicle.mileageKm'),
      vehicle: this.formatVehicle(vehicleBrand, vehicleModel, vehicleYear),
      scenario: this.getString(data, 'simulation.scenario'),
      severity: simulationSeverity ?? diagnosticSeverity,
      diagnosticDescription: this.getString(data, 'diagnostic.description'),
      diagnosticSeverity,
      createdAt: this.getString(data, 'createdAt'),
    });
  }

  private buildDiagnosticCreateData(
    fileName: string,
    data: JsonObject,
    summary: TechHubProcessedSummary,
  ) {
    return {
      fileName,
      serviceOrderNumber: this.getNullableString(data, 'serviceOrder.number'),
      module: summary.module,
      system: summary.system,
      target: summary.target,
      eventType: summary.eventType,
      diagnosticCategory: summary.diagnosticCategory,
      customerName: summary.customerName,
      customerDocument: summary.customerDocument,
      vehiclePlate: summary.vehiclePlate,
      vehicleBrand: summary.vehicleBrand,
      vehicleModel: summary.vehicleModel,
      vehicleYear: this.getInteger(data, 'vehicle.year'),
      vehicleMileageKm: this.getInteger(data, 'vehicle.mileageKm'),
      scenario: summary.scenario,
      severity: summary.severity,
      diagnosticDescription: summary.diagnosticDescription,
      sourceCreatedAt: this.getValidDate(data, 'createdAt'),
      rawPayload: JSON.stringify(data),
    };
  }

  private getString(data: JsonObject, path: string): string | undefined {
    const value = this.getNestedValue(data, path);

    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  }

  private getNullableString(data: JsonObject, path: string): string | null {
    const value = this.getNestedValue(data, path);

    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return null;
  }

  private getStringOrNumber(data: JsonObject, path: string): string | number | undefined {
    const value = this.getNestedValue(data, path);

    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }

    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private getInteger(data: JsonObject, path: string): number | undefined {
    const value = this.getNestedValue(data, path);
    const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

    return typeof parsed === 'number' && Number.isInteger(parsed) ? parsed : undefined;
  }

  private getValidDate(data: JsonObject, path: string): Date | undefined {
    const value = this.getNestedValue(data, path);

    if (typeof value !== 'string' && typeof value !== 'number') {
      return undefined;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private getNestedValue(data: JsonObject, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (!this.isJsonObject(current)) {
        return undefined;
      }

      return current[key];
    }, data);
  }

  private formatVehicle(
    brand?: string,
    model?: string,
    year?: string | number,
  ): string | undefined {
    const vehicle = [brand, model, year].filter((value) => value !== undefined).join(' ');

    return vehicle || undefined;
  }

  private removeEmptyValues(summary: TechHubProcessedSummary): TechHubProcessedSummary {
    return Object.fromEntries(
      Object.entries(summary).filter(([, value]) => value !== undefined),
    ) as TechHubProcessedSummary;
  }

  private async moveFile(sourcePath: string, directory: string, fileName: string) {
    const destinationPath = await this.getAvailableDestinationPath(directory, fileName);

    await rename(sourcePath, destinationPath);
  }

  private async getAvailableDestinationPath(directory: string, fileName: string) {
    const extension = extname(fileName);
    const name = basename(fileName, extension);
    const timestamp = this.createFileTimestamp();
    let destinationPath = join(directory, fileName);
    let attempt = 0;

    while (await this.pathExists(destinationPath)) {
      const suffix = attempt === 0 ? timestamp : `${timestamp}-${attempt}`;

      destinationPath = join(directory, `${name}-${suffix}${extension}`);
      attempt += 1;
    }

    return destinationPath;
  }

  private async pathExists(filePath: string) {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private createFileTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Erro desconhecido.';
  }
}
