import { Dialog } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ExecucaoTecnicaOsCard } from '@/components/os/ExecucaoTecnicaOsCard'
import { HistoricoAnalisesOs } from '@/components/os/HistoricoAnalisesOs'

interface DiagnosticoOsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ordemServico: any
  readOnly: boolean
  descricao: string
  diagnostico: string
  relatoMecanico: string
  setDescricao: (v: string) => void
  setDiagnostico: (v: string) => void
  setRelatoMecanico: (v: string) => void
  setHasPendingChanges: (v: boolean) => void
  setLastSaveStatus: (v: 'idle' | 'saving' | 'saved' | 'error') => void
  documentos?: any[]
}

interface FieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

function Field({ label, children, className = '' }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>
      {children}
    </div>
  )
}

export function DiagnosticoOsModal({
  open,
  onOpenChange,
  ordemServico,
  readOnly,
  descricao,
  diagnostico,
  relatoMecanico,
  setDescricao,
  setDiagnostico,
  setRelatoMecanico,
  setHasPendingChanges,
  setLastSaveStatus,
  documentos,
}: DiagnosticoOsModalProps) {
  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Central de Diagnóstico da OS"
      description="Gerencie os relatos iniciais, diagnóstico técnico, execução e histórico de análises."
      contentClassName="max-w-5xl h-[85vh] overflow-y-auto"
    >
      <div className="space-y-6 pb-6">
        {/* 1. Relatos e diagnóstico inicial */}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <h3 className="mb-4 text-lg font-semibold text-foreground">1. Relatos e diagnóstico inicial</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Relato do cliente">
              <Textarea
                value={descricao}
                readOnly={readOnly}
                onChange={(event) => {
                  setDescricao(event.target.value)
                  setHasPendingChanges(true)
                  setLastSaveStatus('idle')
                }}
                placeholder="Relato do problema pelo cliente."
                className="min-h-[100px] bg-white dark:bg-slate-950"
              />
            </Field>
            <Field label="Diagnóstico técnico">
              <Textarea
                value={diagnostico}
                readOnly={readOnly}
                onChange={(event) => {
                  setDiagnostico(event.target.value)
                  setHasPendingChanges(true)
                  setLastSaveStatus('idle')
                }}
                placeholder="Descreva o diagnóstico técnico identificado."
                className="min-h-[100px] bg-white dark:bg-slate-950"
              />
            </Field>
            <Field label="Observações internas" className="md:col-span-2">
              <Textarea
                value={relatoMecanico}
                readOnly={readOnly}
                onChange={(event) => {
                  setRelatoMecanico(event.target.value)
                  setHasPendingChanges(true)
                  setLastSaveStatus('idle')
                }}
                placeholder="Registre observações internas da equipe técnica."
                className="min-h-[80px] bg-white dark:bg-slate-950"
              />
            </Field>
          </div>
        </div>

        {/* 2. Execução Técnica / Resultado do Mecânico */}
        <div>
          <ExecucaoTecnicaOsCard ordemServico={ordemServico} readOnly={readOnly} />
        </div>

        {/* 3. Histórico de análises */}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <h3 className="mb-4 text-lg font-semibold text-foreground">3. Histórico de análises</h3>
          <HistoricoAnalisesOs 
            ordemServico={ordemServico}
            descricaoOverride={descricao}
            diagnosticoOverride={diagnostico}
            relatoMecanicoOverride={relatoMecanico}
            documentos={documentos}
          />
        </div>
      </div>
    </Dialog>
  )
}
