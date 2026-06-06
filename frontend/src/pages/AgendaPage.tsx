import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Edit, LogOut, Play, RefreshCw, XCircle, Calendar, List } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/components/common/DataTable'
import type { DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/utils'
import { agendamentoService } from '@/services/agendamento.service'
import type { AgendaMaquina, AgendaPayload, AgendaStatus } from '@/types/agendamento'

const statusLabels: Record<string, string> = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_PECA: 'Aguardando peça',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  CONCLUIDO: 'Concluido',
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

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function dateTimeFromParts(date: string, time: string) {
  if (!date || !time) return ''
  return `${date}T${time.length === 5 ? `${time}:00` : time}`
}

function timePart(value?: string | null) {
  const local = toDatetimeLocal(value)
  return local ? local.slice(11, 16) : ''
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

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

function buildPayload(form: AgendaPayload, selectedDate: string): AgendaPayload {
  return {
    ...form,
    horaEntrada: form.horaEntrada.includes('T') ? form.horaEntrada : dateTimeFromParts(selectedDate, form.horaEntrada),
    horaPrevistaSaida: form.horaPrevistaSaida
      ? form.horaPrevistaSaida.includes('T')
        ? form.horaPrevistaSaida
        : dateTimeFromParts(selectedDate, form.horaPrevistaSaida)
      : undefined,
    horaSaida: form.horaSaida
      ? form.horaSaida.includes('T')
        ? form.horaSaida
        : dateTimeFromParts(selectedDate, form.horaSaida)
      : undefined,
  }
}

export function AgendaPage() {
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('calendario')
  const [selectedDate, setSelectedDate] = useState(todayInput())
  const [maquinaFiltro, setMaquinaFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [responsavelFiltro, setResponsavelFiltro] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AgendaMaquina | null>(null)
  const [form, setForm] = useState<AgendaPayload>(emptyForm)
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState('')

  const opcoes = useQuery({ queryKey: ['agenda-opcoes'], queryFn: agendamentoService.opcoes })
  const agenda = useQuery({
    queryKey: ['agenda', selectedDate, maquinaFiltro, statusFiltro, responsavelFiltro],
    queryFn: () =>
      agendamentoService.listar({
        data: selectedDate,
        maquina: maquinaFiltro || undefined,
        status: statusFiltro || undefined,
        responsavelId: responsavelFiltro || undefined,
      }),
  })

  const lastOpenedOsId = useRef<string | null>(null)

  useEffect(() => {
    const ordemServicoId = params.get('ordemServicoId')
    if (!ordemServicoId || !opcoes.data || lastOpenedOsId.current === ordemServicoId) return
    const os = opcoes.data.ordensServico.find((item) => item.id === ordemServicoId)
    if (!os) return
    
    lastOpenedOsId.current = ordemServicoId
    setForm({
      ...emptyForm,
      ordemServicoId: os.id,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      veiculoDesc: os.veiculoDescricao || '',
      horaEntrada: new Date().toTimeString().slice(0, 5),
    })
    setOpen(true)
  }, [opcoes.data, params])

  const criar = useMutation({
    mutationFn: (payload: AgendaPayload) => agendamentoService.criar(payload),
    onSuccess: async () => {
      setFeedback('Agendamento criado com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
      closeDialog()
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AgendaPayload> }) => agendamentoService.atualizar(id, payload),
    onSuccess: async () => {
      setFeedback('Agendamento atualizado com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
      closeDialog()
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  })

  const alterarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AgendaStatus }) => agendamentoService.alterarStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
    onError: (error) => setFeedback(getApiErrorMessage(error)),
  })

  const registrarSaida = useMutation({
    mutationFn: (id: string) => agendamentoService.registrarSaida(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
    onError: (error) => setFeedback(getApiErrorMessage(error)),
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => agendamentoService.cancelar(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
    },
    onError: (error) => setFeedback(getApiErrorMessage(error)),
  })

  const options = opcoes.data
  const agendas = agenda.data ?? []
  const filteredAgendas = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return agendas
    return agendas.filter((item) =>
      [
        item.maquina,
        item.cliente?.nome,
        item.veiculo?.placa,
        item.veiculo?.marca,
        item.veiculo?.modelo,
        item.veiculoDesc,
        item.responsavel?.nome,
        item.ordemServico?.numero,
        item.ordemServico?.numeroOS,
        item.observacoes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [agendas, search])

  const resumo = useMemo(() => {
    const occupied = new Set(agendas.filter((item) => !['CONCLUIDO', 'CANCELADO'].includes(item.status)).map((item) => item.maquina))
    return {
      agendados: agendas.filter((item) => item.status === 'AGENDADO').length,
      andamento: agendas.filter((item) => item.status === 'EM_ANDAMENTO').length,
      concluidos: agendas.filter((item) => item.status === 'CONCLUIDO').length,
      ocupadas: occupied.size,
      livres: Math.max(0, (options?.maquinas.length || 0) - occupied.size),
    }
  }, [agendas, options?.maquinas.length])

  const selectedOs = options?.ordensServico.find((item) => item.id === form.ordemServicoId)
  const selectedClienteId = form.clienteId || selectedOs?.clienteId || ''
  const veiculosDoCliente = (options?.veiculos ?? []).filter((veiculo) => !selectedClienteId || veiculo.clienteId === selectedClienteId)



  function openCreateFromCalendar(maquina: string, hora: string) {
    setEditing(null)
    setFormError('')
    const [h, m] = hora.split(':')
    let nextH = parseInt(h, 10) + 1
    if (nextH > 18) nextH = 18
    const nextHora = nextH.toString().padStart(2, '0') + ':' + m

    setForm({
      ...emptyForm,
      maquina,
      horaEntrada: hora,
      horaPrevistaSaida: nextHora,
    })
    setOpen(true)
  }

  function openEdit(item: AgendaMaquina) {
    setEditing(item)
    setFormError('')
    setForm({
      maquina: item.maquina,
      ordemServicoId: item.ordemServicoId || '',
      clienteId: item.clienteId || '',
      veiculoId: item.veiculoId || '',
      veiculoDesc: item.veiculoDesc || vehicleLabel(item),
      responsavelId: item.responsavelId || '',
      horaEntrada: timePart(item.horaEntrada),
      horaPrevistaSaida: timePart(item.horaPrevistaSaida),
      horaSaida: timePart(item.horaSaida),
      status: item.status as AgendaStatus,
      observacoes: item.observacoes || '',
    })
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setEditing(null)
    setFormError('')
    setForm(emptyForm)
  }

  function updateForm(patch: Partial<AgendaPayload>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleOsChange(osId: string) {
    const os = options?.ordensServico.find((item) => item.id === osId)
    updateForm({
      ordemServicoId: osId,
      clienteId: os?.clienteId || '',
      veiculoId: os?.veiculoId || '',
      veiculoDesc: os?.veiculoDescricao || '',
    })
  }

  function handleClienteChange(clienteId: string) {
    updateForm({ clienteId, veiculoId: '', veiculoDesc: '' })
  }

  function handleVeiculoChange(veiculoId: string) {
    const veiculo = options?.veiculos.find((item) => item.id === veiculoId)
    updateForm({
      veiculoId,
      veiculoDesc: veiculo ? [veiculo.marca, veiculo.modelo, veiculo.placa].filter(Boolean).join(' ') : '',
    })
  }

  function submit() {
    setFormError('')
    const payload = buildPayload(form, selectedDate)
    if (!payload.maquina || !payload.clienteId || !payload.horaEntrada) {
      setFormError('Informe maquina, cliente e horario de entrada.')
      return
    }

    const start = new Date(payload.horaEntrada)
    const day = start.getDay()
    if (day === 0 || day === 6) {
      setFormError('A oficina funciona de segunda a sexta, das 08:00 às 18:00.')
      return
    }
    const startHour = start.getHours() + start.getMinutes() / 60
    if (startHour < 8 || startHour >= 18) {
      setFormError('A oficina funciona de segunda a sexta, das 08:00 às 18:00.')
      return
    }

    let fimCalc = new Date(start.getTime() + 60 * 60 * 1000)
    if (payload.horaPrevistaSaida) {
      const end = new Date(payload.horaPrevistaSaida)
      if (end <= start) {
        setFormError('A previsão de saída deve ser maior que a hora de entrada.')
        return
      }
      const endDay = end.getDay()
      if (endDay === 0 || endDay === 6) {
        setFormError('A oficina funciona de segunda a sexta, das 08:00 às 18:00.')
        return
      }
      const endHour = end.getHours() + end.getMinutes() / 60
      if (endHour < 8 || endHour > 18) {
        setFormError('A oficina funciona de segunda a sexta, das 08:00 às 18:00.')
        return
      }
      fimCalc = end
    }

    const conflito = agendas.find((a) => {
      if (a.status === 'CANCELADO' || (editing && a.id === editing.id) || a.maquina !== payload.maquina) return false
      const aStart = new Date(a.horaEntrada)
      let aEnd: Date
      if (a.horaPrevistaSaida) aEnd = new Date(a.horaPrevistaSaida)
      else if (a.horaSaida) aEnd = new Date(a.horaSaida)
      else if (a.status === 'EM_ANDAMENTO') aEnd = new Date('9999-12-31T23:59:59.000Z')
      else aEnd = new Date(aStart.getTime() + 60 * 60 * 1000)
      return start < aEnd && fimCalc > aStart
    })

    if (conflito) {
      setFormError('Esta máquina já possui agendamento nesse intervalo.')
      return
    }

    if (editing) {
      atualizar.mutate({ id: editing.id, payload })
      return
    }
    criar.mutate(payload)
  }

  if (opcoes.isLoading || agenda.isLoading) return <LoadingState label="Carregando agenda..." />
  if (opcoes.isError) return <ErrorState message={opcoes.error.message} />
  if (agenda.isError) return <ErrorState message={agenda.error.message} />

  const tableColumns: Array<DataTableColumn<AgendaMaquina>> = [
    { key: 'maquina', header: 'Máquina', render: (row) => row.maquina },
    { key: 'status', header: 'Status', render: (row) => <Badge className={statusClass(row.status)}>{statusLabels[row.status] || row.status}</Badge> },
    { key: 'entrada', header: 'Entrada', render: (row) => formatDateTime(row.horaEntrada) },
    { key: 'previsao', header: 'Previsão', render: (row) => formatDateTime(row.horaPrevistaSaida) },
    { key: 'saida', header: 'Saída real', render: (row) => formatDateTime(row.horaSaida) },
    { key: 'cliente', header: 'Cliente', render: (row) => row.cliente?.nome || '-' },
    { key: 'veiculo', header: 'Veículo / Placa', render: vehicleLabel },
    { key: 'os', header: 'OS', render: (row) => osLabel(row.ordemServico) },
    { key: 'responsavel', header: 'Responsável', render: (row) => row.responsavel?.nome || '-' },
    { key: 'observacoes', header: 'Observações', render: (row) => row.observacoes || '-' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => openEdit(row)} title="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={() => alterarStatus.mutate({ id: row.id, status: 'EM_ANDAMENTO' })} title="Iniciar atendimento">
            <Play className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={() => registrarSaida.mutate(row.id)} title="Registrar saída">
            <LogOut className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={() => alterarStatus.mutate({ id: row.id, status: 'CONCLUIDO' })} title="Concluir">
            <CheckCircle2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="destructive" onClick={() => cancelar.mutate(row.id)} title="Cancelar">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        title="Agenda de Máquinas"
        description="Controle operacional de veículos em máquinas, boxes e elevadores da oficina."
        actions={
          <>
            <div className="mr-2 flex items-center rounded-md bg-muted p-1">
              <Button type="button" variant={viewMode === 'lista' ? 'secondary' : 'ghost'} onClick={() => setViewMode('lista')}>
                <List className="mr-2 h-4 w-4" /> Lista
              </Button>
              <Button type="button" variant={viewMode === 'calendario' ? 'secondary' : 'ghost'} onClick={() => setViewMode('calendario')}>
                <Calendar className="mr-2 h-4 w-4" /> Calendário
              </Button>
            </div>
            <Button type="button" variant="secondary" onClick={() => agenda.refetch()} disabled={agenda.isFetching}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </>
        }
      />

      {feedback ? <Alert className="mb-4">{feedback}</Alert> : null}

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <StatCard title="Agendados hoje" value={resumo.agendados} tone="cyan" />
        <StatCard title="Em andamento" value={resumo.andamento} tone="blue" />
        <StatCard title="Concluídos hoje" value={resumo.concluidos} tone="green" />
        <StatCard title="Máquinas ocupadas" value={resumo.ocupadas} tone="amber" />
        <StatCard title="Máquinas livres" value={resumo.livres} tone="violet" />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[160px_1fr_1fr_1fr_1.4fr]">
        <Field label="Data">
          <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </Field>
        <Field label="Máquina">
          <Select value={maquinaFiltro} onChange={(event) => setMaquinaFiltro(event.target.value)}>
            <option value="">Todas</option>
            {options?.maquinas.map((maquina) => <option key={maquina} value={maquina}>{maquina}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}>
            <option value="">Todos</option>
            {options?.status.map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
          </Select>
        </Field>
        <Field label="Responsável">
          <Select value={responsavelFiltro} onChange={(event) => setResponsavelFiltro(event.target.value)}>
            <option value="">Todos</option>
            {options?.usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
          </Select>
        </Field>
        <Field label="Busca">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Placa, cliente ou OS" />
        </Field>
      </div>

      {filteredAgendas.length === 0 && viewMode === 'lista' ? (
        <EmptyState title="Nenhum agendamento encontrado" message="Crie um agendamento operacional para ocupar uma maquina." />
      ) : viewMode === 'lista' ? (
        <DataTable data={filteredAgendas} getRowKey={(row) => row.id} columns={tableColumns} />
      ) : (
        <AgendaCalendar agendas={filteredAgendas} maquinas={options?.maquinas || []} onEdit={openEdit} onCreate={openCreateFromCalendar} />
      )}

      <Dialog
        open={open}
        title={editing ? 'Editar agendamento' : 'Novo agendamento'}
        description="Controle a ocupação operacional de máquinas, boxes e elevadores."
        onClose={closeDialog}
        contentClassName="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Máquina">
            <Select value={form.maquina} onChange={(event) => updateForm({ maquina: event.target.value })}>
              <option value="">Selecione</option>
              {options?.maquinas.map((maquina) => <option key={maquina} value={maquina}>{maquina}</option>)}
            </Select>
          </Field>
          <Field label="OS vinculada (opcional)">
            <Select value={form.ordemServicoId || ''} onChange={(event) => handleOsChange(event.target.value)}>
              <option value="">Sem OS vinculada</option>
              {options?.ordensServico.map((os) => (
                <option key={os.id} value={os.id}>
                  OS {os.numeroOS || os.numero} - {os.clienteNome || 'Cliente'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={form.clienteId} onChange={(event) => handleClienteChange(event.target.value)}>
              <option value="">Selecione</option>
              {options?.clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
            </Select>
          </Field>
          <Field label="Veículo">
            <Select value={form.veiculoId || ''} onChange={(event) => handleVeiculoChange(event.target.value)}>
              <option value="">Selecione</option>
              {veiculosDoCliente.map((veiculo) => (
                <option key={veiculo.id} value={veiculo.id}>
                  {veiculo.placa} - {[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsável técnico">
            <Select value={form.responsavelId || ''} onChange={(event) => updateForm({ responsavelId: event.target.value })}>
              <option value="">Sem responsavel</option>
              {options?.usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>{usuario.nome} - {usuario.cargo}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => updateForm({ status: event.target.value as AgendaStatus })}>
              {options?.status.map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
            </Select>
          </Field>
          <Field label="Hora de entrada">
            <Input type="time" value={form.horaEntrada} onChange={(event) => updateForm({ horaEntrada: event.target.value })} />
          </Field>
          <Field label="Previsão de saída">
            <Input type="time" value={form.horaPrevistaSaida || ''} onChange={(event) => updateForm({ horaPrevistaSaida: event.target.value })} />
          </Field>
          <Field label="Saída real">
            <Input type="time" value={form.horaSaida || ''} onChange={(event) => updateForm({ horaSaida: event.target.value })} />
          </Field>
          <Field label="Descrição do veículo">
            <Input value={form.veiculoDesc || ''} onChange={(event) => updateForm({ veiculoDesc: event.target.value })} />
          </Field>
          <Field label="Observações operacionais" className="md:col-span-2">
            <Textarea value={form.observacoes || ''} onChange={(event) => updateForm({ observacoes: event.target.value })} />
          </Field>
        </div>

        {formError ? <Alert variant="error" className="mt-4">{formError}</Alert> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeDialog}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={criar.isPending || atualizar.isPending}>
            <Clock className="h-4 w-4" />
            {criar.isPending || atualizar.isPending ? 'Salvando...' : 'Salvar agenda'}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}



function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function normalizeText(text: string) {
  if (!text) return ''
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
}

function AgendaCalendar({ agendas, maquinas, onEdit, onCreate }: { agendas: AgendaMaquina[]; maquinas: string[]; onEdit: (item: AgendaMaquina) => void; onCreate: (maquina: string, hora: string) => void }) {
  let minHour = 8
  let maxHour = 17
  
  agendas.forEach(a => {
    const start = new Date(a.horaEntrada)
    if (!Number.isNaN(start.getTime())) {
      const h = start.getHours()
      if (h < minHour) minHour = h
      if (h > maxHour) maxHour = h
    }
  })

  const hours: string[] = []
  for (let i = minHour; i <= maxHour; i++) {
    hours.push(i.toString().padStart(2, '0') + ':00')
  }

  const normalizedMaquinas = maquinas.map(normalizeText)
  const hasOutros = agendas.some(a => !normalizedMaquinas.includes(normalizeText(a.maquina)))
  const displayMaquinas = hasOutros ? [...maquinas, 'Outros'] : maquinas

  return (
    <div className="overflow-x-auto rounded-lg border border-white/70 bg-card shadow-[0_14px_38px_rgba(15,23,42,0.08)] dark:border-slate-700/70 dark:shadow-[0_18px_48px_rgba(0,0,0,0.36)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-gradient-to-r from-slate-50 to-blue-50/70 text-muted-foreground dark:from-slate-900 dark:to-cyan-950/35">
          <tr>
            <th className="sticky left-0 z-10 w-20 border-b border-r bg-slate-50/95 p-3 text-center font-semibold dark:bg-slate-900/95">Hora</th>
            {displayMaquinas.map((maq) => (
              <th key={maq} className="min-w-[220px] border-b p-3 font-semibold text-slate-700 dark:text-slate-200">{maq}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour} className="border-b transition-colors hover:bg-muted/20 last:border-0">
              <td className="sticky left-0 z-10 border-r bg-card p-3 text-center font-semibold text-slate-600 dark:text-slate-300">{hour}</td>
              {displayMaquinas.map((maq) => {
                const isOutros = maq === 'Outros'
                const maqNormalized = normalizeText(maq)

                const maqAgendas = agendas.filter((a) => {
                  const aMaqNormalized = normalizeText(a.maquina)
                  if (isOutros) {
                    if (normalizedMaquinas.includes(aMaqNormalized)) return false
                  } else {
                    if (aMaqNormalized !== maqNormalized) return false
                  }

                  const start = new Date(a.horaEntrada)
                  if (Number.isNaN(start.getTime())) return false
                  const startHourStr = start.getHours().toString().padStart(2, '0') + ':00'
                  return startHourStr === hour
                })

                return (
                  <td key={maq} className="min-h-[96px] cursor-pointer align-top border-r p-2 transition-colors last:border-0 hover:bg-blue-50/50 dark:hover:bg-cyan-950/20" onClick={() => !isOutros && onCreate(maq, hour)}>
                    {maqAgendas.map((a) => {
                      const osText = a.ordemServico ? osLabel(a.ordemServico) : 'Sem OS'
                      const clienteText = a.cliente?.nome || 'Sem cliente'
                      const carText = vehicleLabel(a) || 'Veículo não informado'
                      const timeText = `${timePart(a.horaEntrada)} - ${timePart(a.horaPrevistaSaida) || '?'}`

                      return (
                        <div
                          key={a.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(a)
                          }}
                          className={`mb-2 cursor-pointer rounded-lg border border-l-4 p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg ${statusClass(a.status)}`}
                          title={a.observacoes || ''}
                        >
                          <div className="break-words text-xs font-black leading-snug">{clienteText}</div>
                          <div className="mt-1 break-words text-[11px] font-semibold leading-snug opacity-95">{carText}</div>
                          <div className="mt-1 break-words text-[11px] leading-snug opacity-90">{osText} | {statusLabels[a.status] || a.status}</div>
                          <div className="mt-1 inline-flex max-w-full flex-wrap rounded-md bg-white/55 px-1.5 py-0.5 text-[11px] font-bold leading-snug shadow-sm dark:bg-slate-950/35">{timeText} | {a.maquina}</div>
                        </div>
                      )
                    })}
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
