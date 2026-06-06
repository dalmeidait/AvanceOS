import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { crmService } from '@/services/crm.service'

interface Props {
  open: boolean
  interacao: any
  onClose: () => void
  onSuccess: () => void
}

export function CrmRegistrarContatoModal({ open, interacao, onClose, onSuccess }: Props) {
  const [canalUtilizado, setCanalUtilizado] = useState(interacao.canal || 'WHATSAPP')
  const [resultado, setResultado] = useState('SUCESSO')
  const [detalhes, setDetalhes] = useState('')
  const [agendarRetorno, setAgendarRetorno] = useState(false)
  const [dataRetorno, setDataRetorno] = useState('')
  
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: any) => crmService.registrarContato(interacao.id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crm-interacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      alert('O histórico foi salvo com sucesso.')
      onSuccess()
    },
    onError: (error: any) => {
      alert(`Erro ao registrar: ${error.message}`)
    }
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({
      canalUtilizado,
      resultado,
      detalhes,
      agendarRetorno,
      dataRetorno: agendarRetorno ? new Date(dataRetorno).toISOString() : undefined
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Registrar Contato - ${interacao.assunto}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Canal Utilizado</Label>
            <select 
              value={canalUtilizado} 
              onChange={e => setCanalUtilizado(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="TELEFONE">Telefone</option>
              <option value="EMAIL">E-mail</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Resultado</Label>
            <select 
              value={resultado} 
              onChange={e => setResultado(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="SUCESSO">Sucesso / Contato Realizado</option>
              <option value="SEM_RESPOSTA">Sem Resposta</option>
              <option value="AGUARDANDO_RETORNO">Aguardando Retorno do Cliente</option>
              <option value="RECUSADO">Recusado / Não tem interesse</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Detalhes da Conversa</Label>
          <Textarea 
            value={detalhes} 
            onChange={e => setDetalhes(e.target.value)} 
            placeholder="Ex: O cliente informou que o carro está ótimo..." 
            rows={3} 
          />
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t border-border">
          <input 
            type="checkbox" 
            id="agendarRetorno" 
            checked={agendarRetorno} 
            onChange={e => setAgendarRetorno(e.target.checked)} 
            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
          />
          <Label htmlFor="agendarRetorno">Agendar novo contato (Retorno)</Label>
        </div>

        {agendarRetorno && (
          <div className="space-y-2">
            <Label>Data do Retorno</Label>
            <input 
              type="date" 
              value={dataRetorno} 
              onChange={e => setDataRetorno(e.target.value)} 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required 
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar Histórico'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
