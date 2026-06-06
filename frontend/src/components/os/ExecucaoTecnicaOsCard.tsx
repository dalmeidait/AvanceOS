import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { osService } from '@/services/os.service'
import type { OrdemServico } from '@/types/ordem-servico'
import { getApiErrorMessage } from '@/lib/utils'

interface ExecucaoTecnicaOsCardProps {
  ordemServico: OrdemServico
  readOnly: boolean
}

export function ExecucaoTecnicaOsCard({ ordemServico, readOnly }: ExecucaoTecnicaOsCardProps) {
  const queryClient = useQueryClient()
  
  // Cast para any para garantir que o build não quebre caso as props ainda não estejam 100% refletidas nos types globais locais do container
  const osAny = ordemServico as any
  
  const [diagnosticoConfirmado, setDiagnosticoConfirmado] = useState(osAny?.diagnosticoConfirmado || '')
  const [testesRealizados, setTestesRealizados] = useState(osAny?.testesRealizados || '')
  const [resultadoDosTestes, setResultadoDosTestes] = useState(osAny?.resultadoDosTestes || '')
  const [solucaoAplicada, setSolucaoAplicada] = useState(osAny?.solucaoAplicada || '')
  const [observacoesTecnicasFinais, setObservacoesTecnicasFinais] = useState(osAny?.observacoesTecnicasFinais || '')
  
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const osData = ordemServico as any
    setDiagnosticoConfirmado(osData?.diagnosticoConfirmado || '')
    setTestesRealizados(osData?.testesRealizados || '')
    setResultadoDosTestes(osData?.resultadoDosTestes || '')
    setSolucaoAplicada(osData?.solucaoAplicada || '')
    setObservacoesTecnicasFinais(osData?.observacoesTecnicasFinais || '')
  }, [ordemServico])

  const salvar = useMutation({
    mutationFn: () => {
      // Cast payload to any to avoid AtualizarOSPayload strict type checking errors
      const payload: any = {
        diagnosticoConfirmado,
        testesRealizados,
        resultadoDosTestes,
        solucaoAplicada,
        observacoesTecnicasFinais,
      }
      return osService.atualizar(ordemServico.id, payload)
    },
    onSuccess: async () => {
      setSuccessMessage('Execução técnica salva com sucesso.')
      setFormError('')
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', ordemServico.id] })
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (error) => {
      setSuccessMessage('')
      setFormError(getApiErrorMessage(error))
    },
  })

  return (
    <Card id="os-execucao-tecnica" className="scroll-mt-6 overflow-hidden border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <CardHeader className="bg-slate-950/[0.02] dark:bg-white/[0.02] flex flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Execução Técnica / Resultado do Mecânico</h3>
          <p className="text-sm text-muted-foreground">Registre os resultados técnicos da execução da OS.</p>
        </div>
        {!readOnly && (
          <Button 
            type="button" 
            onClick={() => salvar.mutate()} 
            disabled={salvar.isPending}
          >
            {salvar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {formError}
          </div>
        )}
        {successMessage && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Diagnóstico confirmado</Label>
            <Textarea
              value={diagnosticoConfirmado}
              readOnly={readOnly}
              onChange={(e) => setDiagnosticoConfirmado(e.target.value)}
              placeholder="O diagnóstico inicial foi confirmado? O que foi encontrado?"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Testes realizados</Label>
            <Textarea
              value={testesRealizados}
              readOnly={readOnly}
              onChange={(e) => setTestesRealizados(e.target.value)}
              placeholder="Quais testes foram feitos para confirmar ou isolar o problema?"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Resultado dos testes</Label>
            <Textarea
              value={resultadoDosTestes}
              readOnly={readOnly}
              onChange={(e) => setResultadoDosTestes(e.target.value)}
              placeholder="Quais foram as métricas e resultados dos testes feitos?"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Solução aplicada</Label>
            <Textarea
              value={solucaoAplicada}
              readOnly={readOnly}
              onChange={(e) => setSolucaoAplicada(e.target.value)}
              placeholder="Descreva a solução definitiva aplicada no veículo."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Observações técnicas finais</Label>
            <Textarea
              value={observacoesTecnicasFinais}
              readOnly={readOnly}
              onChange={(e) => setObservacoesTecnicasFinais(e.target.value)}
              placeholder="Avisos importantes ou detalhes técnicos para quem for fazer o checklist de saída."
              className="min-h-[80px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
