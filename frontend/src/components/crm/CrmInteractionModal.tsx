import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { crmService } from '@/services/crm.service'
import { clientesService } from '@/services/clientes.service'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CrmInteractionModal({ open, onClose, onSuccess }: Props) {
  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState('LEMBRETE')
  const [canal, setCanal] = useState('WHATSAPP')
  const [prioridade, setPrioridade] = useState('NORMAL')
  const [assunto, setAssunto] = useState('')
  const [mensagemSugerida, setMensagemSugerida] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')

  const queryClient = useQueryClient()

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: clientesService.listar
  })

  const mutation = useMutation({
    mutationFn: (data: any) => crmService.criarInteracao(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crm-interacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      alert('Contato agendado com sucesso.')
      onSuccess()
    },
    onError: (error: any) => {
      alert(`Erro ao criar: ${error.message}`)
    }
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({
      clienteId,
      tipo,
      canal,
      prioridade,
      assunto,
      mensagemSugerida,
      dataPrevista: dataPrevista ? new Date(dataPrevista).toISOString() : undefined
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Agendar Novo Contato">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <select 
            value={clienteId} 
            onChange={e => setClienteId(e.target.value)} 
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>Selecione um cliente</option>
            {clientes?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select 
              value={tipo} 
              onChange={e => setTipo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="LEMBRETE">Lembrete</option>
              <option value="OFERTA">Oferta / Promoção</option>
              <option value="POS_VENDA">Pós-venda</option>
              <option value="RECLAMACAO">Reclamação</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Canal Sugerido</Label>
            <select 
              value={canal} 
              onChange={e => setCanal(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="TELEFONE">Telefone</option>
              <option value="EMAIL">E-mail</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <select 
              value={prioridade} 
              onChange={e => setPrioridade(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="BAIXA">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Data Prevista</Label>
            <input 
              type="date" 
              value={dataPrevista} 
              onChange={e => setDataPrevista(e.target.value)} 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Assunto *</Label>
          <Input value={assunto} onChange={e => setAssunto(e.target.value)} required placeholder="Ex: Lembrete de revisão" />
        </div>

        <div className="space-y-2">
          <Label>Mensagem Sugerida</Label>
          <Textarea 
            value={mensagemSugerida} 
            onChange={e => setMensagemSugerida(e.target.value)} 
            placeholder="Digite o texto que o atendente deverá enviar..." 
            rows={4} 
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Agendar Contato'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
