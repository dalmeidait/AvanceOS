import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/utils'
import { agendamentoService } from '@/services/agendamento.service'
import type { AgendaPayload, AgendaStatus } from '@/types/agendamento'

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

function dateTimeFromParts(date: string, time: string) {
  if (!date || !time) return ''
  return `${date}T${time.length === 5 ? `${time}:00` : time}`
}

export function AgendaOsModal({ open, onClose, ordem }: { open: boolean; onClose: () => void; ordem: any }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AgendaPayload>(emptyForm)
  const [formError, setFormError] = useState('')

  const opcoes = useQuery({ queryKey: ['agenda-opcoes'], queryFn: agendamentoService.opcoes, enabled: open })

  useEffect(() => {
    if (open && ordem) {
      const placa = ordem.veiculo?.placa || ordem.placaVeiculo || ''
      const marca = ordem.veiculo?.marca || ''
      const modelo = ordem.veiculo?.modelo || ordem.modeloVeiculo || ''
      setForm({
        ...emptyForm,
        ordemServicoId: ordem.id,
        clienteId: ordem.clienteId || ordem.cliente?.id || '',
        veiculoId: ordem.veiculoId || ordem.veiculo?.id || '',
        veiculoDesc: [marca, modelo, placa].filter(Boolean).join(' '),
        horaEntrada: new Date().toTimeString().slice(0, 5),
      })
      setFormError('')
    } else if (!open) {
      setForm(emptyForm)
      setFormError('')
    }
  }, [open, ordem])

  const criar = useMutation({
    mutationFn: (payload: AgendaPayload) => agendamentoService.criar(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
      onClose()
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  })

  function updateForm(patch: Partial<AgendaPayload>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function submit() {
    setFormError('')
    const selectedDate = new Date().toISOString().slice(0, 10)
    
    const payload = {
      ...form,
      horaEntrada: form.horaEntrada.includes('T') ? form.horaEntrada : dateTimeFromParts(selectedDate, form.horaEntrada),
      horaPrevistaSaida: form.horaPrevistaSaida ? (form.horaPrevistaSaida.includes('T') ? form.horaPrevistaSaida : dateTimeFromParts(selectedDate, form.horaPrevistaSaida)) : undefined,
      horaSaida: form.horaSaida ? (form.horaSaida.includes('T') ? form.horaSaida : dateTimeFromParts(selectedDate, form.horaSaida)) : undefined,
    }

    if (!payload.maquina || !payload.horaEntrada) {
      setFormError('Informe maquina e horario de entrada.')
      return
    }

    criar.mutate(payload)
  }

  const options = opcoes.data

  return (
    <Dialog
      open={open}
      title="Novo agendamento"
      description="Agende uma máquina, box ou elevador para esta OS."
      onClose={onClose}
      contentClassName="max-w-2xl"
    >
      {opcoes.isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando opções...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Máquina</Label>
              <Select value={form.maquina} onChange={(e) => updateForm({ maquina: e.target.value })}>
                <option value="">Selecione</option>
                {options?.maquinas.map((maq) => <option key={maq} value={maq}>{maq}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável técnico</Label>
              <Select value={form.responsavelId || ''} onChange={(e) => updateForm({ responsavelId: e.target.value })}>
                <option value="">Sem responsavel</option>
                {options?.usuarios.map((usu) => <option key={usu.id} value={usu.id}>{usu.nome} - {usu.cargo}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => updateForm({ status: e.target.value as AgendaStatus })}>
                {options?.status.map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
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
            <div className="space-y-2 md:col-span-2">
              <Label>Observações operacionais</Label>
              <Textarea value={form.observacoes || ''} onChange={(e) => updateForm({ observacoes: e.target.value })} />
            </div>
          </div>

          {formError ? <Alert variant="error" className="mt-4">{formError}</Alert> : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={submit} disabled={criar.isPending}>
              <Clock className="mr-2 h-4 w-4" />
              {criar.isPending ? 'Salvando...' : 'Salvar agenda'}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  )
}
