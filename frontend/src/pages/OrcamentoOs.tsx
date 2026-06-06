import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Copy, Send, Check, X, Loader2 } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardContent } from '../components/ui/card'
import { Alert } from '../components/ui/alert'
import { Dialog } from '../components/ui/dialog'
import { Select } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { api } from '../lib/api'

// Funções de API emuladas (você pode transferir isso para um serviço depois)
const apiElaborarOrcamento = async (osId: string) => {
  const { data } = await api.post(`/os/${osId}/orcamentos`)
  return data
}
const apiListarOrcamentos = async (osId: string) => {
  const { data } = await api.get(`/os/${osId}/orcamentos`)
  return data
}
const apiMarcarEnviado = async (orcamentoId: string, canal: string) => {
  const { data } = await api.post(`/os/orcamentos/${orcamentoId}/marcar-enviado`, { canalEnvio: canal })
  return data
}
const apiAprovar = async (orcamentoId: string, payload: any) => {
  const { data } = await api.post(`/os/orcamentos/${orcamentoId}/aprovar`, payload)
  return data
}
const apiRecusar = async (orcamentoId: string, payload: any) => {
  const { data } = await api.post(`/os/orcamentos/${orcamentoId}/recusar`, payload)
  return data
}
const apiGetMensagem = async (orcamentoId: string) => {
  const { data } = await api.get(`/os/orcamentos/${orcamentoId}/mensagem`)
  return typeof data === 'string' ? data : data.mensagem || data
}

export function OrcamentoOs({ ordemServicoId, itensCount }: { ordemServicoId: string, itensCount: number }) {
  const queryClient = useQueryClient()
  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ['orcamentos', ordemServicoId],
    queryFn: () => apiListarOrcamentos(ordemServicoId)
  })

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const usuarioStr = localStorage.getItem('usuario')
  const usuario = usuarioStr ? JSON.parse(usuarioStr) : null
  const role = usuario?.role || usuario?.perfil || ''
  const isMecanico = role === 'MECANICO'

  const temPendenteOuAprovado = orcamentos?.some((o: any) => ['EMITIDO', 'ENVIADO', 'APROVADO'].includes(o.status))

  const elaborarMutation = useMutation({
    mutationFn: () => apiElaborarOrcamento(ordemServicoId),
    onSuccess: () => {
      setMessage('Orçamento elaborado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['orcamentos', ordemServicoId] })
      queryClient.invalidateQueries({ queryKey: ['ordem-servico', ordemServicoId] })
    },
    onError: (err: any) => setError(err.message)
  })

  const [selectedOrcamento, setSelectedOrcamento] = useState<any>(null)
  const [modalType, setModalType] = useState<''|'ENVIAR'|'APROVAR'|'RECUSAR'>('')
  const [canal, setCanal] = useState('WHATSAPP')
  const [motivo, setMotivo] = useState('Valor alto')
  const [obs, setObs] = useState('')
  const [aprovadoPor, setAprovadoPor] = useState('CLIENTE')

  const actionMutation = useMutation({
    mutationFn: () => {
      if (modalType === 'ENVIAR') return apiMarcarEnviado(selectedOrcamento.id, canal)
      if (modalType === 'APROVAR') return apiAprovar(selectedOrcamento.id, { canalAprovacao: canal, aprovadoPor, observacao: obs })
      if (modalType === 'RECUSAR') return apiRecusar(selectedOrcamento.id, { canalRecusa: canal, motivoRecusa: motivo, observacao: obs })
      return Promise.resolve()
    },
    onSuccess: () => {
      setModalType('')
      queryClient.invalidateQueries({ queryKey: ['orcamentos', ordemServicoId] })
      queryClient.invalidateQueries({ queryKey: ['ordem-servico', ordemServicoId] })
    },
    onError: (err: any) => setError(err.message)
  })


  const handleCopy = async (id: string) => {
    try {
      const text = await apiGetMensagem(id)
      
      let copiadoComSucesso = false;
      
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          copiadoComSucesso = true;
        } catch (err) {
          // Fallback
        }
      }

      if (!copiadoComSucesso) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand('copy');
          copiadoComSucesso = true;
        } catch (err) {
          throw new Error('Falha no fallback de cópia');
        } finally {
          document.body.removeChild(textarea);
        }
      }

      setMessage('Mensagem copiada para a área de transferência.')
      setTimeout(() => setMessage(''), 3000)
    } catch (e: any) {
      setError('Falha ao copiar mensagem.')
    }
  }

  return (
    <Card id="os-orcamentos" className="scroll-mt-6 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Propostas de orçamento</h3>
          <p className="text-sm text-muted-foreground">Gere e gerencie propostas formais para esta OS.</p>
        </div>
        <Button 
          type="button" 
          onClick={() => {
            setError('')
            setMessage('')
            if (itensCount === 0) {
              setError('Adicione pelo menos uma peça ou serviço antes de elaborar o orçamento.')
              return
            }
            if (temPendenteOuAprovado) {
              setError('Já existe um orçamento aguardando aprovação ou aprovado.')
              return
            }
            elaborarMutation.mutate()
          }} 
          disabled={elaborarMutation.isPending || temPendenteOuAprovado}
        >
          {elaborarMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Elaborar Proposta
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : orcamentos?.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Nenhuma proposta elaborada.
          </p>
        ) : (
          <div className="space-y-4">
            {orcamentos?.map((orc: any) => (
              <div key={orc.id} className="rounded-xl border border-border/70 p-4 bg-card shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h4 className="font-semibold">Proposta de orçamento #{orc.numero}</h4>
                  <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-cyan-600 dark:text-cyan-400">{orc.status}</span>
                    <span>•</span>
                    <span>{formatCurrency(orc.total)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => handleCopy(orc.id)}>
                    <Copy className="mr-2 h-4 w-4" /> Copiar Mensagem
                  </Button>
                  
                  {['EMITIDO', 'ENVIADO'].includes(orc.status) && !isMecanico && (
                    <Button type="button" variant="secondary" onClick={() => { setSelectedOrcamento(orc); setModalType('ENVIAR') }}>
                      <Send className="mr-2 h-4 w-4" /> Marcar Enviado
                    </Button>
                  )}
                  
                  {!['APROVADO'].includes(orc.status) && !isMecanico && (
                    <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setSelectedOrcamento(orc); setModalType('APROVAR') }}>
                      <Check className="mr-2 h-4 w-4" /> Aprovar
                    </Button>
                  )}
                  
                  {!['RECUSADO', 'APROVADO'].includes(orc.status) && !isMecanico && (
                    <Button type="button" variant="destructive" onClick={() => { setSelectedOrcamento(orc); setModalType('RECUSAR') }}>
                      <X className="mr-2 h-4 w-4" /> Recusar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={modalType !== ''} onClose={() => setModalType('')} title={modalType === 'ENVIAR' ? 'Marcar como Enviado' : modalType === 'APROVAR' ? 'Aprovar Proposta' : 'Recusar Proposta'}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Canal de {modalType === 'ENVIAR' ? 'Envio' : modalType === 'APROVAR' ? 'Aprovação' : 'Recusa'}</Label>
            <Select value={canal} onChange={e => setCanal(e.target.value)}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="OUTRO">Outro</option>
            </Select>
          </div>
          
          {modalType === 'RECUSAR' && (
            <div className="space-y-2">
              <Label>Motivo da Recusa</Label>
              <Select value={motivo} onChange={e => setMotivo(e.target.value)}>
                <option value="Valor alto">Valor alto</option>
                <option value="Cliente desistiu">Cliente desistiu</option>
                <option value="Vai fazer depois">Vai fazer depois</option>
                <option value="Procurou outra oficina">Procurou outra oficina</option>
                <option value="Outro">Outro</option>
              </Select>
            </div>
          )}

          {modalType === 'APROVAR' && (
            <div className="space-y-2">
              <Label>Aprovado por</Label>
              <Select value={aprovadoPor} onChange={e => setAprovadoPor(e.target.value)}>
                <option value="CLIENTE">O próprio cliente</option>
                <option value="RESPONSAVEL">Responsável autorizado</option>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} />
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setModalType('')}>Cancelar</Button>
            <Button onClick={() => actionMutation.mutate()} disabled={actionMutation.isPending}>Confirmar</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  )
}
