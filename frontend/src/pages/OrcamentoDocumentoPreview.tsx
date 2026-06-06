import { useState, useEffect } from 'react'
import { formatCurrency } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { parseItemDescricao } from '../lib/osDisplay'

export function OrcamentoDocumentoPreview({ 
  orcamentoId, 
  onClose,
  ordemData,
  eventosData
}: { 
  orcamentoId: string, 
  onClose: () => void,
  ordemData?: any,
  eventosData?: any[]
}) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/os/orcamentos/${orcamentoId}/documento`)
    .then(res => {
      setDoc(res.data)
      setLoading(false)
    })
    .catch(err => {
      setError(err.response?.data?.message || err.message || 'Falha ao buscar documento.')
      setLoading(false)
    })
  }, [orcamentoId])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando documento...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>
  if (!doc) return null

  const handlePrintOrcamento = () => {
    const printRoot = document.getElementById('orcamento-print-root')
    if (!printRoot) return

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Proposta de Orçamento</title>
        ${styles}
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: Arial, sans-serif !important;
            font-size: 12px !important;
            height: auto !important;
            min-height: auto !important;
            width: auto !important;
            overflow: visible !important;
          }

          #orcamento-print-root {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            scale: none !important;
            height: auto !important;
            min-height: auto !important;
          }

          * {
            box-sizing: border-box;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          /* Esconder elementos indesejados da cópia de estilos */
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div id="orcamento-print-root">
          ${printRoot.innerHTML}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.focus();
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b shadow-sm">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="flex gap-2">
          <Button onClick={handlePrintOrcamento} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div 
          id="orcamento-print-root" 
          className="mx-auto w-full max-w-[794px] rounded-lg border border-slate-200 p-10 shadow-lg font-sans text-sm"
          style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          
          {doc.status === 'APROVADO' && (
            <div className="mb-4 text-center">
              <span className="inline-block border-2 border-emerald-600 text-emerald-700 font-bold px-4 py-1 rounded uppercase tracking-widest bg-emerald-50">
                ORÇAMENTO APROVADO
              </span>
            </div>
          )}

          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6" style={{ borderColor: '#cbd5e1' }}>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{doc.oficina}</h1>
              <p className="mt-1" style={{ color: '#475569' }}>AvanceOS - Gestão Automotiva</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#0f172a' }}>PROPOSTA DE ORÇAMENTO</h2>
              <p className="text-xs uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>Documento comercial sem validade fiscal</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span style={{ color: '#64748b' }}>Orçamento N°:</span>
                <span className="font-semibold">#{String(doc.numero).padStart(4, '0')}</span>
                <span style={{ color: '#64748b' }}>O.S. N°:</span>
                <span className="font-semibold">#{doc.numeroOS}</span>
                <span style={{ color: '#64748b' }}>Emissão:</span>
                <span className="font-semibold">{new Date(doc.dataEmissao).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Dados do Cliente */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-xs mb-3 border-b pb-1" style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>Dados do Cliente</h3>
              <div className="space-y-1" style={{ color: '#334155' }}>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Nome:</span> {doc.cliente.nome}</p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>CPF/CNPJ:</span> {doc.cliente.documento}</p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Telefone:</span> {doc.cliente.telefone}</p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>E-mail:</span> {doc.cliente.email}</p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Endereço:</span> {doc.cliente.endereco || 'Não informado'}</p>
              </div>
            </div>

            {/* Dados do Veículo */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-xs mb-3 border-b pb-1" style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>Dados do Veículo</h3>
              <div className="space-y-1" style={{ color: '#334155' }}>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Marca/Modelo:</span> {doc.veiculo.marcaModelo}</p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Placa:</span> <span className="uppercase">{doc.veiculo.placa}</span></p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Ano:</span> {doc.veiculo.ano}</p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Cor:</span> {doc.veiculo.cor}</p>
                <p><span className="font-semibold" style={{ color: '#0f172a' }}>Quilometragem:</span> {doc.veiculo.km ? `${doc.veiculo.km} km` : 'Não informada'}</p>
              </div>
            </div>
          </div>

          {/* Relatos e diagnóstico inicial */}
          {(ordemData?.descricao || ordemData?.diagnostico || ordemData?.relatoMecanico) && (
            <div className="mb-8">
              <h3 className="font-bold uppercase tracking-wider text-xs mb-3 border-b pb-1" style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>Relatos e Diagnóstico Inicial</h3>
              <div className="space-y-2 text-sm" style={{ color: '#334155' }}>
                {ordemData?.descricao && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Relato do cliente:</span> <span className="whitespace-pre-wrap">{ordemData.descricao}</span></p>}
                {ordemData?.diagnostico && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Diagnóstico técnico inicial:</span> <span className="whitespace-pre-wrap">{ordemData.diagnostico}</span></p>}
                {ordemData?.relatoMecanico && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Observações internas:</span> <span className="whitespace-pre-wrap">{ordemData.relatoMecanico}</span></p>}
              </div>
            </div>
          )}

          {/* Execução Técnica / Resultado do Mecânico */}
          {(ordemData?.diagnosticoConfirmado || ordemData?.testesRealizados || ordemData?.resultadoDosTestes || ordemData?.solucaoAplicada || ordemData?.observacoesTecnicasFinais || ordemData?.responsavelTecnico || ordemData?.dataHoraConclusaoTecnica) && (
            <div className="mb-8">
              <h3 className="font-bold uppercase tracking-wider text-xs mb-3 border-b pb-1" style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>Execução Técnica / Resultado do Mecânico</h3>
              <div className="space-y-2 text-sm" style={{ color: '#334155' }}>
                {ordemData?.diagnosticoConfirmado && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Diagnóstico confirmado:</span> <span className="whitespace-pre-wrap">{ordemData.diagnosticoConfirmado}</span></p>}
                {ordemData?.testesRealizados && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Testes realizados:</span> <span className="whitespace-pre-wrap">{ordemData.testesRealizados}</span></p>}
                {ordemData?.resultadoDosTestes && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Resultado dos testes:</span> <span className="whitespace-pre-wrap">{ordemData.resultadoDosTestes}</span></p>}
                {ordemData?.solucaoAplicada && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Solução aplicada:</span> <span className="whitespace-pre-wrap">{ordemData.solucaoAplicada}</span></p>}
                {ordemData?.observacoesTecnicasFinais && <p><span className="font-semibold block" style={{ color: '#0f172a' }}>Observações técnicas finais:</span> <span className="whitespace-pre-wrap">{ordemData.observacoesTecnicasFinais}</span></p>}
                {(ordemData?.responsavelTecnico || ordemData?.dataHoraConclusaoTecnica) && (
                  <div className="flex gap-6 mt-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                    {ordemData?.responsavelTecnico && <p><span className="font-semibold" style={{ color: '#0f172a' }}>Responsável técnico:</span> {ordemData.responsavelTecnico}</p>}
                    {ordemData?.dataHoraConclusaoTecnica && <p><span className="font-semibold" style={{ color: '#0f172a' }}>Conclusão técnica:</span> {new Date(ordemData.dataHoraConclusaoTecnica).toLocaleString('pt-BR')}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnósticos LAB-TECH / TechHub */}
          <div className="mb-8">
            <h3 className="font-bold uppercase tracking-wider text-xs mb-3 border-b pb-1" style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>Diagnósticos LAB-TECH / TECHHUB</h3>
            {ordemData?.diagnosticosLabTech && ordemData.diagnosticosLabTech.length > 0 ? (
              <div className="space-y-3">
                {ordemData.diagnosticosLabTech.map((diag: any, i: number) => (
                  <div key={i} className="text-sm border rounded p-3" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold" style={{ color: '#0f172a' }}>Módulo: {diag.modulo}</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>{diag.dataHoraProcessamento ? new Date(diag.dataHoraProcessamento).toLocaleString('pt-BR') : ''}</span>
                    </div>
                    <p><span className="font-semibold" style={{ color: '#0f172a' }}>Cenário:</span> {diag.cenario}</p>
                    <p><span className="font-semibold" style={{ color: '#0f172a' }}>Severidade:</span> {diag.severidade}</p>
                    <p className="mt-1"><span className="font-semibold block" style={{ color: '#0f172a' }}>Descrição:</span> <span className="whitespace-pre-wrap">{diag.descricao}</span></p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: '#64748b' }}>Nenhum diagnóstico LAB-TECH vinculado.</p>
            )}
          </div>

          {/* Serviços */}
          {doc.servicos && doc.servicos.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold uppercase tracking-wider text-xs mb-3" style={{ color: '#0f172a' }}>Serviços Executados / Sugeridos</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y" style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }}>
                    <th className="p-2 font-semibold text-xs uppercase" style={{ color: '#0f172a' }}>Descrição</th>
                    <th className="p-2 font-semibold text-xs uppercase text-right w-24" style={{ color: '#0f172a' }}>Qtd</th>
                    <th className="p-2 font-semibold text-xs uppercase text-right w-32" style={{ color: '#0f172a' }}>V. Unitário</th>
                    <th className="p-2 font-semibold text-xs uppercase text-right w-32" style={{ color: '#0f172a' }}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                  {doc.servicos.map((s: any, i: number) => {
                    const desc = parseItemDescricao(s.descricao)
                    return (
                    <tr key={i}>
                      <td className="p-2">
                        <div className="font-medium" style={{ color: '#0f172a' }}>{desc.nome}</div>
                        {desc.descricao && <div className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: '#64748b' }}>{desc.descricao}</div>}
                      </td>
                      <td className="p-2 text-right" style={{ color: '#0f172a' }}>{s.qtd}</td>
                      <td className="p-2 text-right" style={{ color: '#0f172a' }}>{formatCurrency(s.valor)}</td>
                      <td className="p-2 text-right font-medium" style={{ color: '#0f172a' }}>{formatCurrency(s.total)}</td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Peças / Produtos */}
          {doc.pecas && doc.pecas.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold uppercase tracking-wider text-xs mb-3" style={{ color: '#0f172a' }}>Peças e Produtos</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y" style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }}>
                    <th className="p-2 font-semibold text-xs uppercase" style={{ color: '#0f172a' }}>Descrição</th>
                    <th className="p-2 font-semibold text-xs uppercase text-right w-24" style={{ color: '#0f172a' }}>Qtd</th>
                    <th className="p-2 font-semibold text-xs uppercase text-right w-32" style={{ color: '#0f172a' }}>V. Unitário</th>
                    <th className="p-2 font-semibold text-xs uppercase text-right w-32" style={{ color: '#0f172a' }}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                  {doc.pecas.map((p: any, i: number) => {
                    const desc = parseItemDescricao(p.descricao)
                    return (
                    <tr key={i}>
                      <td className="p-2">
                        <div className="font-medium" style={{ color: '#0f172a' }}>{desc.nome}</div>
                        {desc.descricao && <div className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: '#64748b' }}>{desc.descricao}</div>}
                      </td>
                      <td className="p-2 text-right" style={{ color: '#0f172a' }}>{p.qtd}</td>
                      <td className="p-2 text-right" style={{ color: '#0f172a' }}>{formatCurrency(p.valor)}</td>
                      <td className="p-2 text-right font-medium" style={{ color: '#0f172a' }}>{formatCurrency(p.total)}</td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="flex flex-col items-end mb-12 print-avoid-break">
            <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
              <div className="flex justify-between p-2 border-b" style={{ borderColor: '#cbd5e1' }}>
                <span style={{ color: '#475569' }}>Subtotal Serviços:</span>
                <span className="font-medium" style={{ color: '#0f172a' }}>{formatCurrency(doc.resumo.subtotalServicos)}</span>
              </div>
              <div className="flex justify-between p-2 border-b" style={{ borderColor: '#cbd5e1' }}>
                <span style={{ color: '#475569' }}>Subtotal Peças:</span>
                <span className="font-medium" style={{ color: '#0f172a' }}>{formatCurrency(doc.resumo.subtotalPecas)}</span>
              </div>
              {doc.resumo.desconto > 0 && (
                <div className="flex justify-between p-2 border-b text-red-600" style={{ borderColor: '#cbd5e1' }}>
                  <span>Desconto:</span>
                  <span className="font-medium">- {formatCurrency(doc.resumo.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between p-3 font-bold text-lg rounded-md mt-2" style={{ backgroundColor: '#f1f5f9' }}>
                <span style={{ color: '#0f172a' }}>Total Geral:</span>
                <span style={{ color: '#0f172a' }}>{formatCurrency(doc.resumo.totalGeral)}</span>
              </div>
            </div>
          </div>

          {/* Rastreabilidade resumida */}
          {eventosData && eventosData.length > 0 && (
            <div className="mb-8 print-avoid-break">
              <h3 className="font-bold uppercase tracking-wider text-xs mb-3 border-b pb-1" style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>Rastreabilidade da OS</h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-y" style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }}>
                    <th className="p-2 font-semibold text-xs uppercase w-32" style={{ color: '#0f172a' }}>Data/Hora</th>
                    <th className="p-2 font-semibold text-xs uppercase" style={{ color: '#0f172a' }}>Título</th>
                    <th className="p-2 font-semibold text-xs uppercase w-32" style={{ color: '#0f172a' }}>Origem</th>
                    <th className="p-2 font-semibold text-xs uppercase" style={{ color: '#0f172a' }}>Descrição Curta</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                  {eventosData
                    .filter((ev: any) => ev.tipo?.includes('AGENDA') || ev.titulo?.toLowerCase().includes('documento') || ev.tipo?.includes('RELATORIO') || ev.tipo?.includes('LAB_TECH') || ev.tipo?.includes('TECHHUB'))
                    .slice(0, 10)
                    .map((ev: any, i: number) => (
                    <tr key={i}>
                      <td className="p-2" style={{ color: '#64748b' }}>{new Date(ev.criadoEm).toLocaleString('pt-BR')}</td>
                      <td className="p-2 font-medium" style={{ color: '#0f172a' }}>{ev.titulo}</td>
                      <td className="p-2 uppercase text-xs" style={{ color: '#64748b' }}>{ev.origem}</td>
                      <td className="p-2 truncate max-w-[200px]" style={{ color: '#475569' }} title={ev.descricao}>{ev.descricao}</td>
                    </tr>
                  ))}
                  {/* Se não houver eventos filtrados, exibe os 5 mais recentes de qualquer tipo */}
                  {eventosData.filter((ev: any) => ev.tipo?.includes('AGENDA') || ev.titulo?.toLowerCase().includes('documento') || ev.tipo?.includes('RELATORIO') || ev.tipo?.includes('LAB_TECH') || ev.tipo?.includes('TECHHUB')).length === 0 && (
                    eventosData.slice(0, 5).map((ev: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2" style={{ color: '#64748b' }}>{new Date(ev.criadoEm).toLocaleString('pt-BR')}</td>
                        <td className="p-2 font-medium" style={{ color: '#0f172a' }}>{ev.titulo}</td>
                        <td className="p-2 uppercase text-xs" style={{ color: '#64748b' }}>{ev.origem}</td>
                        <td className="p-2 truncate max-w-[200px]" style={{ color: '#475569' }} title={ev.descricao}>{ev.descricao}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Condições e Observações */}
          <div className="mb-12 print-avoid-break">
            <h3 className="font-bold uppercase tracking-wider text-xs mb-2" style={{ color: '#0f172a' }}>Condições Gerais</h3>
            <div className="p-4 rounded text-sm space-y-2 border" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#334155' }}>
              <p>• <span className="font-semibold" style={{ color: '#0f172a' }}>Validade do Orçamento:</span> {doc.validade} dias a partir da data de emissão.</p>
              {doc.prazo && <p>• <span className="font-semibold" style={{ color: '#0f172a' }}>Prazo Estimado de Execução:</span> {doc.prazo}</p>}
              <p>• A execução dos serviços descritos neste documento será iniciada <span className="underline font-semibold">somente após a aprovação formal do cliente</span>.</p>
            </div>
          </div>

          {/* Área de Assinatura / Aprovação */}
          <div className="mt-16 mb-8 pt-8 border-t border-dashed print-avoid-break" style={{ borderColor: '#cbd5e1' }}>
            <h3 className="text-center font-bold uppercase tracking-wider text-sm mb-12" style={{ color: '#0f172a' }}>Termo de Aprovação</h3>
            
            <div className="flex justify-center gap-12 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 rounded-sm" style={{ borderColor: '#94a3b8' }}></div>
                <span className="font-semibold" style={{ color: '#0f172a' }}>APROVADO</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 rounded-sm" style={{ borderColor: '#94a3b8' }}></div>
                <span className="font-semibold" style={{ color: '#0f172a' }}>RECUSADO</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end gap-12 px-8">
              <div className="w-full text-center">
                <div className="border-b mb-2 h-8 w-full" style={{ borderColor: '#0f172a' }}></div>
                <p className="text-xs uppercase" style={{ color: '#64748b' }}>Data da Decisão</p>
              </div>
              <div className="w-full text-center">
                <div className="border-b mb-2 h-8 w-full" style={{ borderColor: '#0f172a' }}></div>
                <p className="text-xs uppercase" style={{ color: '#64748b' }}>Assinatura do Cliente ({doc.cliente.nome})</p>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center text-xs mt-16 pt-4 border-t" style={{ color: '#94a3b8', borderColor: '#f1f5f9' }}>
            <p className="font-semibold mb-1">Esta proposta de orçamento não possui validade fiscal.</p>
            <p className="font-semibold mb-1">A execução dos serviços depende de aprovação do cliente. Valores sujeitos à alteração mediante diagnóstico complementar ou autorização.</p>
            <p>Documento gerado automaticamente pelo sistema AvanceOS em {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
