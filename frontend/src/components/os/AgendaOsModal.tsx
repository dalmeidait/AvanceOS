import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CalendarDays, Trash2, CheckCircle, Play } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { agendamentoService } from '@/services/agendamento.service'
import { getApiErrorMessage } from '@/lib/utils'
import type { AgendaPayload, AgendaStatus } from '@/types/agendamento'
import { AgendaGradeSimplificada } from './AgendaGradeSimplificada'

function movementDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function dateTimeFromParts(date: string, time: string) {
  if (!date || !time) return ''
  return `${date}T${time.length === 5 ? `${time}:00` : time}`
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

const statusLabels: Record<string, string> = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_PECA: 'Aguardando peça',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

const emptyForm: AgendaPayload = {
  maquina: '',
  ordemServicoId: '',
  clienteId: '',
  veiculoId: '',
  veiculoDesc: '',
  responsavelId: '',
  horaEntrada: '',
  horaPrevistaSaida: '',
  horaSaida: '',
  status: 'AGENDADO',
  observacoes: '',
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-foreground">{value}</p>
    </div>
  )
}

interface AgendaOsModalProps {
  open: boolean
  onClose: () => void
  ordemId: string
  agendaOs: { isLoading: boolean }
  agendaVinculada: any
  ordemServico: any
}

export function AgendaOsModal({ open, onClose, ordemId, agendaOs, agendaVinculada, ordemServico }: AgendaOsModalProps) {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<AgendaPayload>(emptyForm)
  const [formError, setFormError] = useState('')

  const [selectedDate, setSelectedDate] = useState(todayInput())

  useEffect(() => {
    if (open && agendaVinculada?.horaEntrada) {
      setSelectedDate(agendaVinculada.horaEntrada.slice(0, 10))
    } else if (open) {
      setSelectedDate(todayInput())
    }
  }, [open, agendaVinculada])

  const agendaDoDia = useQuery({
    queryKey: ['agenda', selectedDate],
    queryFn: () => agendamentoService.listar({ data: selectedDate }),
    enabled: open,
  })

  const opcoes = useQuery({ queryKey: ['agenda-opcoes'], queryFn: agendamentoService.opcoes, enabled: open })

  useEffect(() => {
    if (!open) {
      setIsCreating(false)
      setFormError('')
    } else if (open && isCreating && ordemServico) {
      const placa = ordemServico.veiculo?.placa || ordemServico.placaVeiculo || ''
      const marca = ordemServico.veiculo?.marca || ''
      const modelo = ordemServico.veiculo?.modelo || ordemServico.modeloVeiculo || ''
      setForm((prev) => ({
        ...emptyForm,
        maquina: prev.maquina, // keep what was selected from grid
        horaEntrada: prev.horaEntrada || new Date().toTimeString().slice(0, 5),
        horaPrevistaSaida: prev.horaPrevistaSaida, // keep what was selected from grid
        ordemServicoId: ordemServico.id,
        clienteId: ordemServico.clienteId || ordemServico.cliente?.id || '',
        veiculoId: ordemServico.veiculoId || ordemServico.veiculo?.id || '',
        veiculoDesc: [marca, modelo, placa].filter(Boolean).join(' '),
      }))
    }
  }, [open, isCreating, ordemServico])

  const criar = useMutation({
    mutationFn: (payload: AgendaPayload) => agendamentoService.criar(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
      setIsCreating(false)
      setFormError('')
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => agendamentoService.cancelar(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })

  const alterarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AgendaStatus }) => agendamentoService.alterarStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
  })

  function updateForm(patch: Partial<AgendaPayload>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function submit() {
    setFormError('')
    const payload = {
      ...form,
      horaEntrada: form.horaEntrada.includes('T') ? form.horaEntrada : dateTimeFromParts(selectedDate, form.horaEntrada),
      horaPrevistaSaida: form.horaPrevistaSaida ? (form.horaPrevistaSaida.includes('T') ? form.horaPrevistaSaida : dateTimeFromParts(selectedDate, form.horaPrevistaSaida)) : undefined,
      horaSaida: form.horaSaida ? (form.horaSaida.includes('T') ? form.horaSaida : dateTimeFromParts(selectedDate, form.horaSaida)) : undefined,
    }

    if (!payload.maquina || !payload.horaEntrada) {
      setFormError('Informe máquina e horário de entrada.')
      return
    }

    criar.mutate(payload)
  }

  function handleSlotClick(maquina: string, hora: string) {
    if (agendaVinculada) return // Já existe agenda para esta OS
    
    setIsCreating(true)
    const [h, m] = hora.split(':')
    let nextH = parseInt(h, 10) + 1
    if (nextH > 18) nextH = 18
    const nextHora = nextH.toString().padStart(2, '0') + ':' + m

    setForm((prev) => ({
      ...prev,
      maquina,
      horaEntrada: hora,
      horaPrevistaSaida: nextHora,
    }))
  }

  return (
    <Dialog open={open} onClose={onClose} title="Agenda de Máquina" description="Ocupação operacional vinculada a esta OS." contentClassName="max-h-[90vh] max-w-6xl overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex flex-col gap-6 pb-6">
        {/* Bloco Superior: Formulário ou Info Ativa */}
        <div>
          {agendaOs.isLoading ? (
            <p className="text-muted-foreground">Carregando agenda...</p>
          ) : agendaVinculada ? (
            <div className="space-y-4 rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Agendamento Ativo</h3>
                  <p className="text-sm text-muted-foreground">Esta OS está ocupando a máquina <strong>{agendaVinculada.maquina}</strong>.</p>
                </div>
                <div className="flex gap-2">
                  {agendaVinculada.status !== 'EM_ANDAMENTO' && agendaVinculada.status !== 'CONCLUIDO' && (
                    <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => alterarStatus.mutate({ id: agendaVinculada.id, status: 'EM_ANDAMENTO' })}>
                      <Play className="mr-2 h-4 w-4 text-emerald-500" /> Iniciar
                    </Button>
                  )}
                  {agendaVinculada.status !== 'CONCLUIDO' && (
                    <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => alterarStatus.mutate({ id: agendaVinculada.id, status: 'CONCLUIDO' })}>
                      <CheckCircle className="mr-2 h-4 w-4 text-cyan-500" /> Concluir
                    </Button>
                  )}
                  <Button type="button" variant="secondary" className="h-9 px-3 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => cancelar.mutate(agendaVinculada.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Info label="Máquina" value={agendaVinculada.maquina || '-'} />
                <Info label="Status" value={statusLabels[agendaVinculada.status] || agendaVinculada.status || '-'} />
                <Info label="Responsável" value={agendaVinculada.responsavel?.nome || '-'} />
                <Info label="Entrada" value={movementDate(agendaVinculada.horaEntrada)} />
                <Info label="Previsão de saída" value={movementDate(agendaVinculada.horaPrevistaSaida)} />
                <Info label="Saída real" value={movementDate(agendaVinculada.horaSaida)} />
              </div>
              {agendaVinculada.observacoes && (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Observações</p>
                  <p className="mt-2 text-sm text-foreground">{agendaVinculada.observacoes}</p>
                </div>
              )}
            </div>
          ) : !isCreating ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center">
              <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 font-semibold text-foreground">Nenhuma agenda vinculada</h3>
              <p className="mb-4 text-sm text-muted-foreground">Esta OS ainda não possui ocupação operacional agendada.</p>
              <Button type="button" onClick={() => setIsCreating(true)}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Criar Agendamento Manualmente
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">Ou clique diretamente em um horário livre na grade abaixo.</p>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="font-semibold text-foreground">Novo agendamento</h3>
              {opcoes.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando opções...</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Máquina</Label>
                    <Select value={form.maquina} onChange={(e) => updateForm({ maquina: e.target.value })}>
                      <option value="">Selecione</option>
                      {opcoes.data?.maquinas.map((maq: string) => <option key={maq} value={maq}>{maq}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável técnico</Label>
                    <Select value={form.responsavelId || ''} onChange={(e) => updateForm({ responsavelId: e.target.value })}>
                      <option value="">Sem responsável</option>
                      {opcoes.data?.usuarios.map((usu: any) => <option key={usu.id} value={usu.id}>{usu.nome} - {usu.cargo}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onChange={(e) => updateForm({ status: e.target.value as AgendaStatus })}>
                      {opcoes.data?.status.map((status: string) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de entrada</Label>
                    <Input type="time" value={form.horaEntrada} onChange={(e) => updateForm({ horaEntrada: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Previsão de saída</Label>
                    <Input type="time" value={form.horaPrevistaSaida || ''} onChange={(e) => updateForm({ horaPrevistaSaida: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição do veículo</Label>
                    <Input value={form.veiculoDesc || ''} onChange={(e) => updateForm({ veiculoDesc: e.target.value })} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <Label>Observações operacionais</Label>
                    <Textarea value={form.observacoes || ''} onChange={(e) => updateForm({ observacoes: e.target.value })} />
                  </div>
                </div>
              )}
              
              {formError && <Alert variant="error" className="mt-4">{formError}</Alert>}
              
              <div className="mt-4 flex justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
                <Button type="button" onClick={submit} disabled={criar.isPending}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {criar.isPending ? 'Salvando...' : 'Confirmar Agenda'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bloco Inferior: Grade Simplificada */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Grade Operacional</h3>
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="w-auto h-8 text-sm"
            />
          </div>
          
          {agendaDoDia.isLoading ? (
            <div className="rounded-xl border border-border bg-muted/10 p-12 text-center text-sm text-muted-foreground">
              Carregando ocupações do dia...
            </div>
          ) : agendaDoDia.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20">
              Erro ao carregar a agenda do dia.
            </div>
          ) : (
            <AgendaGradeSimplificada 
              agendas={agendaDoDia.data || []} 
              osIdAtual={ordemId} 
              onSlotClick={handleSlotClick} 
            />
          )}
        </div>

      </div>
    </Dialog>
  )
}
