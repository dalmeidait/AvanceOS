import { FileText, Info, Stethoscope, FlaskConical, Wrench, ClipboardCheck } from 'lucide-react'

interface HistoricoAnalisesOsProps {
  ordemServico: any
  descricaoOverride?: string
  diagnosticoOverride?: string
  relatoMecanicoOverride?: string
  documentos?: any[]
}

interface TimelineItem {
  id: string
  titulo: string
  data?: string | null
  tipo: string
  origem: string
  conteudo: string
  icone?: React.ReactNode
  severidade?: string
}

export function HistoricoAnalisesOs({
  ordemServico,
  descricaoOverride,
  diagnosticoOverride,
  relatoMecanicoOverride,
  documentos,
}: HistoricoAnalisesOsProps) {
  const itens: TimelineItem[] = []

  if (!ordemServico) return null

  const descricao = descricaoOverride !== undefined ? descricaoOverride : ordemServico.descricao
  const diagnostico = diagnosticoOverride !== undefined ? diagnosticoOverride : ordemServico.diagnostico
  const relatoMecanico = relatoMecanicoOverride !== undefined ? relatoMecanicoOverride : ordemServico.relatoMecanico

  // 1. Relato do Cliente / Diagnóstico Inicial
  if (descricao || diagnostico) {
    itens.push({
      id: 'relato-inicial',
      titulo: 'Abertura e Relato Inicial',
      data: ordemServico.createdAt || ordemServico.dataAbertura || new Date().toISOString(),
      tipo: 'DIAGNOSTICO_INICIAL',
      origem: 'OS',
      conteudo: [
        descricao ? `Relato: ${descricao}` : '',
        diagnostico ? `Diagnóstico Inicial: ${diagnostico}` : ''
      ].filter(Boolean).join('\n\n'),
      icone: <FileText className="h-4 w-4 text-blue-500" />
    })
  }

  // 2. Observações Internas
  if (relatoMecanico) {
    itens.push({
      id: 'obs-internas',
      titulo: 'Observações Internas',
      data: ordemServico.updatedAt || ordemServico.createdAt || new Date().toISOString(),
      tipo: 'OBSERVACAO',
      origem: 'Mecânico',
      conteudo: relatoMecanico,
      icone: <Info className="h-4 w-4 text-amber-500" />
    })
  }

  // 3. Execução Técnica - Diagnóstico Confirmado
  if (ordemServico.diagnosticoConfirmado) {
    itens.push({
      id: 'diag-confirmado',
      titulo: 'Diagnóstico Confirmado',
      data: ordemServico.updatedAt || new Date().toISOString(),
      tipo: 'DIAGNOSTICO_CONFIRMADO',
      origem: 'Mecânico',
      conteudo: ordemServico.diagnosticoConfirmado,
      icone: <Stethoscope className="h-4 w-4 text-emerald-500" />
    })
  }

  // 4. Execução Técnica - Testes e Resultados
  if (ordemServico.testesRealizados || ordemServico.resultadoDosTestes) {
    itens.push({
      id: 'testes',
      titulo: 'Testes Realizados',
      data: ordemServico.updatedAt || new Date().toISOString(),
      tipo: 'TESTES',
      origem: 'Mecânico',
      conteudo: [
        ordemServico.testesRealizados ? `Testes: ${ordemServico.testesRealizados}` : '',
        ordemServico.resultadoDosTestes ? `Resultados: ${ordemServico.resultadoDosTestes}` : ''
      ].filter(Boolean).join('\n\n'),
      icone: <FlaskConical className="h-4 w-4 text-purple-500" />
    })
  }

  // 5. Execução Técnica - Solução
  if (ordemServico.solucaoAplicada) {
    itens.push({
      id: 'solucao',
      titulo: 'Solução Aplicada',
      data: ordemServico.updatedAt || new Date().toISOString(),
      tipo: 'SOLUCAO',
      origem: 'Mecânico',
      conteudo: ordemServico.solucaoAplicada,
      icone: <Wrench className="h-4 w-4 text-cyan-500" />
    })
  }

  // 6. Execução Técnica - Obs Finais
  if (ordemServico.observacoesTecnicasFinais) {
    itens.push({
      id: 'obs-finais',
      titulo: 'Observações Técnicas Finais',
      data: ordemServico.updatedAt || new Date().toISOString(),
      tipo: 'OBSERVACAO_FINAL',
      origem: 'Mecânico',
      conteudo: ordemServico.observacoesTecnicasFinais,
      icone: <ClipboardCheck className="h-4 w-4 text-slate-500" />
    })
  }

  // 7. TechHub Diagnósticos
  if (ordemServico.diagnosticosTechHub && Array.isArray(ordemServico.diagnosticosTechHub)) {
    ordemServico.diagnosticosTechHub.forEach((diag: any) => {
      itens.push({
        id: `techhub-${diag.id}`,
        titulo: `${diag.modulo} - ${diag.cenario}`,
        data: diag.dataProcessamento || diag.createdAt,
        tipo: 'DIAGNOSTICO_AVANCADO',
        origem: 'LAB-TECH',
        conteudo: diag.descricaoDiagnostica,
        severidade: diag.severidade,
        icone: <Stethoscope className="h-4 w-4 text-indigo-500" />
      })
    })
  }

  // 8. Documentos / Relatórios
  if (documentos && Array.isArray(documentos)) {
    documentos.forEach((doc: any) => {
      itens.push({
        id: `doc-${doc.id}`,
        titulo: 'Documento / Relatório Gerado',
        data: doc.criadoEm || doc.createdAt,
        tipo: 'DOCUMENTO',
        origem: 'Documento da OS',
        conteudo: [
          `Tipo: ${doc.tipoDocumento}`,
          `Nome: ${doc.nomeOriginal || doc.descricao}`
        ].join('\n'),
        icone: <FileText className="h-4 w-4 text-orange-500" />
      })
    })
  }

  // Sort by date ascending (oldest first) so it feels like a timeline
  itens.sort((a, b) => {
    if (!a.data && !b.data) return 0
    if (!a.data) return -1
    if (!b.data) return 1
    return new Date(a.data).getTime() - new Date(b.data).getTime()
  })

  return (
    <div className="space-y-4">
      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/50 p-8 text-center dark:border-slate-700 dark:bg-slate-950/50">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Nenhuma análise avançada ou dado técnico preenchido nesta visualização.
          </p>
        </div>
      ) : (
        <div className="relative space-y-4 border-l-2 border-slate-200 pl-4 pt-2 dark:border-slate-800">
          {itens.map((item) => (
            <div key={item.id} className="relative rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-950 transition-all hover:border-cyan-200 dark:hover:border-cyan-800">
              <div className="absolute -left-[23px] top-4 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 ring-4 ring-slate-50 dark:bg-slate-700 dark:ring-slate-900">
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-foreground">
                    {item.icone}
                    {item.titulo}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                      {item.origem}
                    </span>
                    <span className="uppercase text-cyan-600 dark:text-cyan-400">
                      {item.tipo.replace(/_/g, ' ')}
                    </span>
                    {item.severidade && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                        Sev: {item.severidade}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground sm:mt-0 sm:text-right">
                  {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '-'}
                  <br className="hidden sm:block" />
                  {item.data ? new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                {item.conteudo}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
