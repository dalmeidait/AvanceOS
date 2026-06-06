import type { AgendaMaquina } from '@/types/agendamento'

function osLabel(os?: { numero?: number | string | null; numeroOS?: number | string | null; id?: string } | null) {
  if (!os) return '-'
  return `OS ${os.numeroOS || os.numero || os.id?.slice(0, 8).toUpperCase()}`
}

function vehicleLabel(agenda: AgendaMaquina) {
  const vehicle = agenda.veiculo
  if (vehicle) return [vehicle.marca, vehicle.modelo, vehicle.placa].filter(Boolean).join(' | ')
  return agenda.veiculoDesc || '-'
}

function statusClass(status: string) {
  if (status === 'CONCLUIDO') return 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-100/80 text-emerald-950 shadow-[0_10px_24px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/10 dark:border-emerald-500/40 dark:from-emerald-950/55 dark:to-slate-900 dark:text-emerald-100 dark:ring-emerald-300/10'
  if (status === 'EM_ANDAMENTO') return 'border-cyan-300 bg-gradient-to-br from-cyan-50 to-blue-100/80 text-cyan-950 shadow-[0_10px_24px_rgba(6,182,212,0.14)] ring-1 ring-cyan-500/10 dark:border-cyan-400/40 dark:from-cyan-950/55 dark:to-slate-900 dark:text-cyan-100 dark:ring-cyan-300/10'
  if (status === 'CANCELADO') return 'border-rose-300 bg-gradient-to-br from-rose-50 to-red-100/80 text-rose-950 shadow-[0_10px_24px_rgba(225,29,72,0.13)] ring-1 ring-rose-500/10 dark:border-rose-500/45 dark:from-rose-950/60 dark:to-slate-900 dark:text-rose-100 dark:ring-rose-300/10'
  if (status.startsWith('AGUARDANDO')) return 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100/85 text-amber-950 shadow-[0_10px_24px_rgba(245,158,11,0.13)] ring-1 ring-amber-500/10 dark:border-amber-500/45 dark:from-amber-950/50 dark:to-slate-900 dark:text-amber-100 dark:ring-amber-300/10'
  return 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-100/80 text-blue-950 shadow-[0_10px_24px_rgba(37,99,235,0.13)] ring-1 ring-blue-500/10 dark:border-blue-500/40 dark:from-blue-950/55 dark:to-slate-900 dark:text-blue-100 dark:ring-blue-300/10'
}

interface AgendaGradeSimplificadaProps {
  agendas: AgendaMaquina[]
  osIdAtual: string
  onSlotClick: (maquina: string, hora: string) => void
}

const MAQUINAS_GRADE = [
  'Elevador 01',
  'Elevador 02',
  'Elevador 03',
  'Elevador 04',
  'Box Rápido 01',
  'Box Rápido 02',
  'Box Diagnóstico 01',
]

const HORAS_GRADE = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
]

export function AgendaGradeSimplificada({ agendas, osIdAtual, onSlotClick }: AgendaGradeSimplificadaProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/70 bg-card shadow-[0_14px_38px_rgba(15,23,42,0.08)] dark:border-slate-700/70 dark:shadow-[0_18px_48px_rgba(0,0,0,0.36)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-gradient-to-r from-slate-50 to-blue-50/70 text-muted-foreground dark:from-slate-900 dark:to-cyan-950/35">
          <tr>
            <th className="sticky left-0 z-10 w-20 border-b border-r bg-slate-50/95 p-3 text-center font-semibold dark:bg-slate-900/95">Hora</th>
            {MAQUINAS_GRADE.map((maq) => (
              <th key={maq} className="min-w-[180px] border-b p-3 text-center font-semibold text-slate-700 dark:text-slate-200">{maq}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HORAS_GRADE.map((hour) => (
            <tr key={hour} className="border-b transition-colors hover:bg-muted/10 last:border-0">
              <td className="sticky left-0 z-10 border-r bg-card p-3 text-center font-semibold text-slate-600 dark:text-slate-300">{hour}</td>
              {MAQUINAS_GRADE.map((maq) => {
                const maqAgendas = agendas.filter((a) => {
                  if (a.maquina !== maq) return false
                  const start = new Date(a.horaEntrada)
                  if (Number.isNaN(start.getTime())) return false
                  const startHourStr = start.getHours().toString().padStart(2, '0') + ':00'
                  return startHourStr === hour
                })

                return (
                  <td 
                    key={maq} 
                    className="cursor-pointer align-top border-r p-2 transition-colors last:border-0 hover:bg-blue-50/50 dark:hover:bg-cyan-950/20"
                    onClick={() => onSlotClick(maq, hour)}
                  >
                    {maqAgendas.length === 0 ? (
                      <div className="h-full min-h-[3rem] w-full" />
                    ) : (
                      maqAgendas.map((a) => {
                        const osText = a.ordemServico ? osLabel(a.ordemServico) : 'Sem OS'
                        const carText = vehicleLabel(a) || 'Veículo não informado'
                        const isCurrent = a.ordemServicoId === osIdAtual

                        return (
                          <div
                            key={a.id}
                            className={`mb-2 rounded-lg border border-l-4 p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                              isCurrent 
                                ? 'ring-2 ring-cyan-500 shadow-md ' + statusClass(a.status) 
                                : statusClass(a.status)
                            }`}
                            title={a.observacoes || ''}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="break-words text-xs font-black leading-snug">{osText}</div>
                            <div className="mt-1 break-words text-[11px] font-semibold leading-snug">{a.responsavel?.nome || 'Sem mecânico'}</div>
                            <div className="mt-1 break-words text-[10px] leading-snug opacity-95">{carText}</div>
                          </div>
                        )
                      })
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
