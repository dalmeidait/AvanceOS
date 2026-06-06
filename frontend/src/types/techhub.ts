export type TechHubDiagnostic = {
  id: string
  fileName: string
  serviceOrderNumber?: string | null
  module?: string | null
  system?: string | null
  target?: string | null
  eventType?: string | null
  diagnosticCategory?: string | null
  customerName?: string | null
  customerDocument?: string | null
  vehiclePlate?: string | null
  vehicleBrand?: string | null
  vehicleModel?: string | null
  vehicleYear?: number | null
  vehicleMileageKm?: number | null
  scenario?: string | null
  severity?: string | null
  diagnosticDescription?: string | null
  sourceCreatedAt?: string | null
  processedAt?: string | null
  rawPayload?: string | Record<string, unknown> | unknown[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type TechHubProcessSummary = {
  status: string
  module: string
  processedAt: string
  totalFound: number
  processed: Array<{
    fileName: string
    movedTo: 'Processados'
    alreadyExists?: boolean
    summary?: Record<string, unknown>
  }>
  failed: Array<{
    fileName: string
    movedTo: 'Erros'
    error: string
  }>
}
