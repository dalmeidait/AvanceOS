import { jsPDF } from 'jspdf'
import { formatDate } from '@/lib/utils'
import type { TechHubDiagnostic } from '@/types/techhub'

const moduleLabels: Record<string, string> = {
  'OBD-II Simulator': 'Simulador OBD-II',
  'Battery & Electrical Tester Simulator': 'Simulador de Bateria e Sistema Elétrico',
  'Preventive Maintenance Simulator': 'Simulador de Revisão Preventiva',
}

const severityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

type JsonRecord = Record<string, unknown>
type PdfItem = { label: string; value?: string | number | null }

const page = {
  width: 210,
  height: 297,
  margin: 14,
  footerY: 287,
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRawPayload(rawPayload: TechHubDiagnostic['rawPayload']): unknown {
  if (!rawPayload) return null
  if (typeof rawPayload !== 'string') return rawPayload

  try {
    return JSON.parse(rawPayload)
  } catch {
    return rawPayload
  }
}

function getNestedValue(source: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined
    return current[key]
  }, source)
}

function getDisplayValue(source: unknown, paths: string[]) {
  for (const path of paths) {
    const value = getNestedValue(source, path)

    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  }

  return undefined
}

function translateModule(value?: string | null) {
  if (!value) return '-'
  return moduleLabels[value] || value
}

function translateSeverity(value?: string | null) {
  if (!value) return '-'
  return severityLabels[value.toLowerCase()] || value
}

function vehicleLabel(diagnostic: TechHubDiagnostic) {
  const parts = [diagnostic.vehicleBrand, diagnostic.vehicleModel].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '-'
}

function moduleValue(diagnostic: TechHubDiagnostic) {
  return diagnostic.module || diagnostic.system || '-'
}

function valueOrDash(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

function sanitizeFilePart(value?: string | number | null) {
  const normalized = valueOrDash(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return normalized || 'sem-info'
}

function fileNameFor(diagnostic: TechHubDiagnostic) {
  const date = new Date().toISOString().slice(0, 10)
  const plate = sanitizeFilePart(diagnostic.vehiclePlate)
  const scenario = sanitizeFilePart(diagnostic.scenario)

  return `avanceos-techhub-${plate}-${scenario}-${date}.pdf`
}

function addHeader(doc: jsPDF) {
  doc.setFillColor(14, 165, 193)
  doc.rect(0, 0, page.width, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('AvanceOS', page.margin, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Oficina Avance - TechHub', page.margin, 17)
}

function addFooters(doc: jsPDF, emittedAt: string) {
  const totalPages = doc.getNumberOfPages()

  for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
    doc.setPage(currentPage)
    doc.setDrawColor(226, 232, 240)
    doc.line(page.margin, page.footerY - 6, page.width - page.margin, page.footerY - 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Emitido em ${emittedAt}`, page.margin, page.footerY)
    doc.text(`Página ${currentPage} de ${totalPages}`, page.width - page.margin, page.footerY, { align: 'right' })
  }
}

function createWriter(doc: jsPDF) {
  let y = 34
  const contentWidth = page.width - page.margin * 2

  function ensureSpace(height: number) {
    if (y + height <= page.footerY - 10) return
    doc.addPage()
    addHeader(doc)
    y = 34
  }

  function section(title: string) {
    ensureSpace(14)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text(title, page.margin, y)
    y += 3
    doc.setDrawColor(14, 165, 193)
    doc.line(page.margin, y, page.width - page.margin, y)
    y += 7
  }

  function title(titleText: string, subtitle?: string) {
    ensureSpace(28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.setTextColor(15, 23, 42)
    doc.text(titleText, page.margin, y)
    y += 8

    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(71, 85, 105)
      doc.text(subtitle, page.margin, y)
      y += 9
    }
  }

  function keyValues(items: PdfItem[]) {
    const usableItems = items.filter((item) => valueOrDash(item.value) !== '-')

    if (usableItems.length === 0) {
      paragraph('Sem informações disponíveis.')
      return
    }

    usableItems.forEach((item) => {
      const labelWidth = 44
      const valueX = page.margin + labelWidth
      const wrappedValue = doc.splitTextToSize(valueOrDash(item.value), contentWidth - labelWidth)
      const rowHeight = Math.max(8, wrappedValue.length * 5 + 3)

      ensureSpace(rowHeight)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.text(item.label, page.margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(wrappedValue, valueX, y)
      y += rowHeight
    })
  }

  function paragraph(text: string) {
    const lines = doc.splitTextToSize(text, contentWidth)
    const height = Math.max(8, lines.length * 5 + 2)

    ensureSpace(height)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text(lines, page.margin, y)
    y += height
  }

  function list(titleText: string, items: string[]) {
    if (items.length === 0) return

    section(titleText)
    items.forEach((item) => {
      const lines = doc.splitTextToSize(`- ${item}`, contentWidth)
      const height = Math.max(7, lines.length * 5 + 2)

      ensureSpace(height)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(lines, page.margin, y)
      y += height
    })
  }

  return { keyValues, list, paragraph, section, title }
}

function compactItems(items: PdfItem[]) {
  return items.filter((item) => valueOrDash(item.value) !== '-')
}

function getObdItems(payload: unknown): PdfItem[] {
  if (!getDisplayValue(payload, ['obd.dtcCode'])) return []

  return compactItems([
    { label: 'Código DTC', value: getDisplayValue(payload, ['obd.dtcCode']) },
    { label: 'Protocolo', value: getDisplayValue(payload, ['obd.protocol', 'obd.obdProtocol']) },
    { label: 'RPM', value: getDisplayValue(payload, ['obd.rpm', 'obd.engineRpm']) },
    {
      label: 'Temperatura do motor',
      value: getDisplayValue(payload, ['obd.engineTemperature', 'obd.engineTemperatureC', 'obd.coolantTemperature']),
    },
    { label: 'Tensão da bateria', value: getDisplayValue(payload, ['obd.batteryVoltage', 'obd.voltage']) },
    { label: 'Carga do motor', value: getDisplayValue(payload, ['obd.engineLoad', 'obd.load']) },
    { label: 'Status MIL', value: getDisplayValue(payload, ['obd.milStatus', 'obd.mil', 'obd.malfunctionIndicatorLamp']) },
  ])
}

function getBatteryItems(payload: unknown): PdfItem[] {
  if (!isRecord(getNestedValue(payload, 'batteryTest'))) return []

  return compactItems([
    {
      label: 'Tensão da bateria',
      value: getDisplayValue(payload, ['batteryTest.voltage', 'batteryTest.batteryVoltage', 'batteryTest.voltageV']),
    },
    { label: 'CCA nominal', value: getDisplayValue(payload, ['batteryTest.nominalCca', 'batteryTest.ccaNominal', 'batteryTest.ratedCca']) },
    { label: 'CCA medido', value: getDisplayValue(payload, ['batteryTest.measuredCca', 'batteryTest.ccaMeasured']) },
    { label: 'Estado de carga', value: getDisplayValue(payload, ['batteryTest.stateOfCharge', 'batteryTest.soc']) },
    { label: 'Estado de saúde', value: getDisplayValue(payload, ['batteryTest.stateOfHealth', 'batteryTest.soh']) },
    {
      label: 'Queda na partida',
      value: getDisplayValue(payload, ['batteryTest.crankingVoltageDrop', 'batteryTest.startingVoltageDrop']),
    },
    { label: 'Tensão do alternador', value: getDisplayValue(payload, ['batteryTest.alternatorVoltage', 'batteryTest.chargingVoltage']) },
  ])
}

function getPreventiveInspectionItems(payload: unknown): string[] {
  const inspection = getNestedValue(payload, 'preventiveInspection')

  if (Array.isArray(inspection)) {
    return inspection.map(formatInspectionItem).filter(Boolean)
  }

  if (!isRecord(inspection)) return []

  return Object.entries(inspection)
    .map(([key, value]) => `${humanizeKey(key)}: ${formatInspectionItem(value)}`)
    .filter(Boolean)
}

function formatInspectionItem(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!isRecord(value)) return JSON.stringify(value)

  const name = getDisplayValue(value, ['item', 'name', 'component', 'label'])
  const status = getDisplayValue(value, ['status', 'condition', 'result'])
  const observation = getDisplayValue(value, ['observation', 'observacao', 'note', 'description'])
  const parts = [
    name,
    status ? `Status: ${status}` : '',
    observation ? `Observação: ${observation}` : '',
  ].filter(Boolean)

  if (parts.length > 0) return parts.join(' | ')

  return Object.entries(value)
    .slice(0, 4)
    .map(([key, nestedValue]) => `${humanizeKey(key)}: ${String(nestedValue)}`)
    .join(' | ')
}

function valuesFromPayload(payload: unknown, path: string): string[] {
  const value = getNestedValue(payload, path)

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item)
      if (isRecord(item)) return formatInspectionItem(item)
      return JSON.stringify(item)
    })
  }

  if (typeof value === 'string' && value.trim()) return [value]
  if (isRecord(value)) return Object.values(value).map((item) => String(item))

  return []
}

function humanizeKey(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase())
}

export function generateTechHubDiagnosticPdf(diagnostic: TechHubDiagnostic) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const payload = parseRawPayload(diagnostic.rawPayload)
  const emittedAt = formatDate(new Date())
  const writer = createWriter(doc)

  addHeader(doc)
  writer.title('Relatório Técnico AvanceOS TechHub', `Arquivo: ${diagnostic.fileName}`)

  writer.section('Identificação')
  writer.keyValues([
    { label: 'Arquivo', value: diagnostic.fileName },
    { label: 'Cliente', value: diagnostic.customerName },
    { label: 'Documento', value: diagnostic.customerDocument },
    { label: 'Ordem de Serviço vinculada', value: diagnostic.serviceOrderNumber },
    { label: 'Veículo', value: vehicleLabel(diagnostic) },
    { label: 'Ano', value: diagnostic.vehicleYear },
    { label: 'Placa', value: diagnostic.vehiclePlate },
    { label: 'Quilometragem', value: diagnostic.vehicleMileageKm ? `${diagnostic.vehicleMileageKm} km` : null },
    { label: 'Módulo', value: translateModule(moduleValue(diagnostic)) },
    { label: 'Categoria', value: diagnostic.diagnosticCategory },
    { label: 'Cenário', value: diagnostic.scenario },
    { label: 'Gravidade', value: translateSeverity(diagnostic.severity) },
    { label: 'Data de origem', value: formatDate(diagnostic.sourceCreatedAt) },
    { label: 'Processado em', value: formatDate(diagnostic.processedAt) },
  ])

  writer.section('Descrição do diagnóstico')
  writer.paragraph(valueOrDash(diagnostic.diagnosticDescription))

  writer.section('Resumo técnico')
  const obdItems = getObdItems(payload)
  const batteryItems = getBatteryItems(payload)
  const preventiveInspectionItems = getPreventiveInspectionItems(payload)

  if (obdItems.length === 0 && batteryItems.length === 0 && preventiveInspectionItems.length === 0) {
    writer.paragraph('Sem dados técnicos adicionais estruturados no payload.')
  }

  if (obdItems.length > 0) {
    writer.section('OBD-II')
    writer.keyValues(obdItems)
  }

  if (batteryItems.length > 0) {
    writer.section('Teste de bateria')
    writer.keyValues(batteryItems)
  }

  if (preventiveInspectionItems.length > 0) {
    writer.list('Inspeção preventiva', preventiveInspectionItems)
  }

  writer.list('Possíveis causas', valuesFromPayload(payload, 'diagnostic.possibleCauses'))
  writer.list('Ação recomendada', valuesFromPayload(payload, 'diagnostic.recommendedAction'))
  writer.list('Serviços sugeridos', valuesFromPayload(payload, 'diagnostic.suggestedServices'))
  writer.list('Peças sugeridas', valuesFromPayload(payload, 'diagnostic.suggestedParts'))

  addFooters(doc, emittedAt)
  doc.save(fileNameFor(diagnostic))
}
