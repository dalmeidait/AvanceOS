import { Dialog } from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { osService } from '@/services/os.service'
import { Loader2 } from 'lucide-react'

interface TimelineOsModalProps {
  open: boolean
  onClose: () => void
  ordemServicoId: string
}

function movementDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function TimelineOsModal({ open, onClose, ordemServicoId }: TimelineOsModalProps) {
  const eventos = useQuery({
    queryKey: ['ordem-servico', ordemServicoId, 'eventos'],
    queryFn: () => osService.listarEventos(ordemServicoId),
    enabled: Boolean(ordemServicoId) && open,
  })

  return (
    <Dialog open={open} onClose={onClose} title="Timeline e Histórico" description="Rastreabilidade de eventos e operações desta OS." contentClassName="max-h-[85vh] max-w-3xl overflow-y-auto">
      <div className="space-y-4 pb-6">
        {eventos.isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Carregando histórico...
          </div>
        ) : (eventos.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
            Nenhum evento registrado nesta OS.
          </p>
        ) : (
          <div className="ml-2 mt-4 space-y-4 border-l-2 border-cyan-200/70 pl-6 dark:border-cyan-400/20">
            {(eventos.data ?? []).map((evento: any) => {
              const bg = evento.severidade === 'CRITICO' ? 'border-red-500/20 bg-red-400/10' : 
                         evento.severidade === 'SUCESSO' ? 'border-emerald-500/20 bg-emerald-400/10' : 
                         evento.severidade === 'ATENCAO' ? 'border-amber-500/20 bg-amber-400/10' : 
                         'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
              
              return (
                <div key={evento.id} className={`relative rounded-xl border p-4 shadow-sm ${bg}`}>
                  <div className="absolute -left-[31px] top-5 h-3.5 w-3.5 rounded-full bg-cyan-500 ring-4 ring-white dark:ring-slate-950" />
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{evento.titulo}</p>
                        {evento.isDerivado ? (
                          <span className="inline-flex rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                            Automático
                          </span>
                        ) : (!evento.isDerivado && evento.origem === 'USUARIO') ? (
                          <span className="inline-flex rounded-md border border-cyan-700 bg-cyan-900/50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                            Manual
                          </span>
                        ) : null}
                      </div>
                      {evento.descricao && <p className="mt-1 text-sm text-muted-foreground">{evento.descricao}</p>}
                      {(evento.antes || evento.depois) && (
                        <div className="mt-3 rounded-lg border border-slate-200/60 bg-white/50 p-3 text-xs text-muted-foreground dark:border-slate-700/60 dark:bg-slate-950/50">
                          {evento.antes && <div className="mb-1"><span className="font-semibold">Antes:</span> {evento.antes}</div>}
                          {evento.depois && <div><span className="font-semibold">Depois:</span> {evento.depois}</div>}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 md:text-right">
                      <p className="text-xs font-medium text-foreground">{movementDate(evento.criadoEm)}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{evento.origem}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Dialog>
  )
}
