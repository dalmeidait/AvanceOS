import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Download, Edit, FileSpreadsheet, Loader2, Plus, ReceiptText, RefreshCw, Save, Search, ShieldAlert, FileText, Code } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, Td, Th } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  fiscalSchema,
  naturezasOperacaoFiscal,
  origensDocumentoFiscal,
  statusDocumentoFiscal,
  tiposDocumentoFiscal,
} from '@/schemas/fiscal.schema'
import { clientesService } from '@/services/clientes.service'
import { fiscalService } from '@/services/fiscal.service'
import { fornecedoresService } from '@/services/fornecedores.service'
import { osService } from '@/services/os.service'
import { veiculosService } from '@/services/veiculos.service'
import type {
  DocumentoFiscalPayload,
  DocumentoFiscalSimulado,
  FiltrosFiscal,
  OrigemDocumentoFiscal,
  StatusDocumentoFiscal,
  TipoDocumentoFiscal,
} from '@/types/fiscal'

type FiscalForm = z.input<typeof fiscalSchema>

const avisoSemValidadeFiscal =
  'Este módulo possui finalidade gerencial e simulada. Não emite documentos fiscais reais, não possui validade fiscal e não substitui contador, escrituração fiscal ou obrigações legais oficiais.'

const hoje = new Date()
const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

const initialFilters: FiltrosFiscal = {
  inicio: toInputDate(inicioMes),
  fim: toInputDate(hoje),
  tipoDocumento: '',
  status: '',
  clienteId: '',
  fornecedorId: '',
  ordemServicoId: '',
  origem: '',
  busca: '',
}

const emptyForm: FiscalForm = {
  tipoDocumento: 'RECIBO_GERENCIAL',
  numero: '',
  serie: '',
  naturezaOperacao: 'Prestação de serviço',
  clienteId: '',
  veiculoId: '',
  fornecedorId: '',
  ordemServicoId: '',
  pagamentoId: '',
  vendaPdvId: '',
  dataEmissao: toInputDate(hoje),
  dataCompetencia: '',
  valorServicos: '0,00',
  valorProdutos: '0,00',
  valorDesconto: '0,00',
  valorTotal: '0,00',
  status: 'RASCUNHO',
  origem: 'MANUAL',
  observacoes: '',
}

const tipoLabels: Record<TipoDocumentoFiscal, string> = {
  RECIBO_GERENCIAL: 'Recibo gerencial',
  NOTA_SERVICO_SIMULADA: 'Nota de serviço simulada',
  NOTA_PRODUTO_SIMULADA: 'Nota de produto simulada',
  NOTA_MISTA_SIMULADA: 'Nota mista simulada',
  ENTRADA_FORNECEDOR_SIMULADA: 'Entrada de fornecedor simulada',
  OUTRO: 'Outro',
}

const statusLabels: Record<StatusDocumentoFiscal, string> = {
  RASCUNHO: 'Rascunho',
  EMITIDO_SIMULADO: 'Emitido simulado',
  CANCELADO: 'Cancelado',
  ARQUIVADO: 'Arquivado',
}

const origemLabels: Record<OrigemDocumentoFiscal, string> = {
  MANUAL: 'Manual',
  OS: 'OS',
  PDV: 'PDV',
  FORNECEDOR: 'Fornecedor',
  AJUSTE: 'Ajuste',
}

function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function normalizeMoney(value: string) {
  const parsed = Number(String(value || '0').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function toMoneyInput(value: number) {
  return Number(value || 0).toFixed(2).replace('.', ',')
}

function statusTone(status: StatusDocumentoFiscal) {
  const tones: Record<StatusDocumentoFiscal, string> = {
    RASCUNHO: 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400',
    EMITIDO_SIMULADO: 'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-400',
    CANCELADO: 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800/40 dark:bg-rose-900/30 dark:text-rose-400',
    ARQUIVADO: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800/40 dark:bg-slate-800/50 dark:text-slate-400',
  }
  return tones[status]
}

function tipoTone(tipo: TipoDocumentoFiscal) {
  const tones: Record<TipoDocumentoFiscal, string> = {
    RECIBO_GERENCIAL: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800/40 dark:bg-slate-800/50 dark:text-slate-400',
    NOTA_SERVICO_SIMULADA: 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400',
    NOTA_PRODUTO_SIMULADA: 'border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-800/40 dark:bg-blue-900/30 dark:text-blue-400',
    NOTA_MISTA_SIMULADA: 'border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-800/40 dark:bg-violet-900/30 dark:text-violet-400',
    ENTRADA_FORNECEDOR_SIMULADA: 'border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-800/40 dark:bg-orange-900/30 dark:text-orange-400',
    OUTRO: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800/40 dark:bg-slate-800/50 dark:text-slate-400',
  }
  return tones[tipo]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function gerarXmlSimulado(doc: DocumentoFiscalSimulado) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<documentoFiscalSimulado>
  <aviso>Documento fiscal simulado, sem validade fiscal.</aviso>
  <id>${doc.id}</id>
  <tipoDocumento>${doc.tipoDocumento}</tipoDocumento>
  <numero>${doc.numero || ''}</numero>
  <serie>${doc.serie || ''}</serie>
  <naturezaOperacao>${doc.naturezaOperacao || ''}</naturezaOperacao>
  <dataEmissao>${doc.dataEmissao}</dataEmissao>
  <valorServicos>${doc.valorServicos}</valorServicos>
  <valorProdutos>${doc.valorProdutos}</valorProdutos>
  <valorDesconto>${doc.valorDesconto}</valorDesconto>
  <valorTotal>${doc.valorTotal}</valorTotal>
  <status>${doc.status}</status>
  <cliente>
    <nome>${doc.cliente?.nome || ''}</nome>
    <documento>${doc.cliente?.documento || doc.fornecedor?.documento || ''}</documento>
  </cliente>
</documentoFiscalSimulado>`;
  const blob = new Blob(['\uFEFF', xml], { type: 'application/xml;charset=utf-8' });
  downloadBlob(blob, `simulado_${doc.numero || doc.id.substring(0, 8)}.xml`);
}

function gerarPdfSimulado(doc: DocumentoFiscalSimulado) {
  const clienteNome = doc.cliente?.nome || doc.fornecedor?.nome || 'Consumidor';
  const clienteDoc = doc.cliente?.documento || doc.fornecedor?.documento || '-';
  const veiculoNome = doc.veiculo ? [doc.veiculo.marca, doc.veiculo.modelo].filter(Boolean).join(' ') : '-';
  const placa = doc.veiculo?.placa || '-';
  const dataHoraGeracao = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>ESPELHO GERENCIAL - ${doc.numero || doc.id}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; background: #fff; }
          .container { width: 100%; max-width: 800px; margin: 0 auto; }
          .header { border: 2px solid #000; padding: 15px; margin-bottom: 10px; text-align: center; }
          .aviso { color: #dc2626; font-weight: bold; font-size: 18px; margin-bottom: 8px; text-transform: uppercase; }
          .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
          .section { margin-bottom: 10px; }
          .row { display: flex; width: 100%; border: 1px solid #000; border-bottom: none; }
          .row:last-child { border-bottom: 1px solid #000; }
          .col { border-right: 1px solid #000; padding: 4px 6px; flex: 1; }
          .col:last-child { border-right: none; }
          .col-2 { flex: 2; }
          .col-3 { flex: 3; }
          .title { font-weight: bold; font-size: 9px; text-transform: uppercase; margin-bottom: 2px; }
          .value { font-size: 12px; font-weight: normal; }
          .value-large { font-size: 14px; font-weight: bold; }
          .obs-box { border: 1px solid #000; padding: 10px; margin-bottom: 10px; font-size: 11px; text-align: justify; }
          .footer { margin-top: 20px; font-size: 10px; text-align: center; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="container">
          <div class="header">
            <div class="aviso">DOCUMENTO FISCAL SIMULADO - SEM VALIDADE FISCAL</div>
            <h2>ESPELHO GERENCIAL DE DOCUMENTO FISCAL SIMULADO</h2>
          </div>

          <!-- DADOS GERAIS -->
          <div class="section">
            <div class="row">
              <div class="col col-3">
                <div class="title">NATUREZA DA OPERAÇÃO</div>
                <div class="value">${doc.naturezaOperacao || '-'}</div>
              </div>
              <div class="col">
                <div class="title">NÚMERO</div>
                <div class="value-large">${doc.numero || '-'}</div>
              </div>
              <div class="col">
                <div class="title">SÉRIE</div>
                <div class="value-large">${doc.serie || '-'}</div>
              </div>
              <div class="col">
                <div class="title">EMISSÃO</div>
                <div class="value">${formatDate(doc.dataEmissao)}</div>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <div class="title">CHAVE INTERNA SIMULADA</div>
                <div class="value">${doc.id}</div>
              </div>
              <div class="col">
                <div class="title">ORIGEM</div>
                <div class="value">${origemLabels[doc.origem] || '-'}</div>
              </div>
              <div class="col">
                <div class="title">STATUS</div>
                <div class="value">${statusLabels[doc.status] || '-'}</div>
              </div>
            </div>
          </div>

          <!-- EMITENTE -->
          <div class="section">
            <div class="row" style="border-bottom: 1px solid #000;">
              <div class="col">
                <div class="title">DADOS DO EMITENTE (SIMULADO)</div>
                <div class="value" style="font-weight: bold; font-size: 14px; margin-top: 4px;">OFICINA AVANCE</div>
                <div class="value" style="margin-top: 4px;">Sistema: AvanceOS</div>
                <div class="value">Documento gerencial interno</div>
                <div class="value">Sem autorização SEFAZ / Prefeitura</div>
                <div class="value">Sem valor fiscal</div>
              </div>
            </div>
          </div>

          <!-- DESTINATÁRIO -->
          <div class="section">
            <div class="row">
              <div class="col col-3">
                <div class="title">NOME / RAZÃO SOCIAL (DESTINATÁRIO / TOMADOR)</div>
                <div class="value">${clienteNome}</div>
              </div>
              <div class="col col-2">
                <div class="title">DOCUMENTO</div>
                <div class="value">${clienteDoc}</div>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <div class="title">VEÍCULO</div>
                <div class="value">${veiculoNome}</div>
              </div>
              <div class="col">
                <div class="title">PLACA</div>
                <div class="value">${placa}</div>
              </div>
              <div class="col">
                <div class="title">OS VINCULADA</div>
                <div class="value">${doc.ordemServico?.numeroOS ? '#' + doc.ordemServico.numeroOS : '-'}</div>
              </div>
            </div>
          </div>

          <!-- VALORES -->
          <div class="section">
            <div class="row">
              <div class="col">
                <div class="title">SERVIÇOS</div>
                <div class="value">${formatCurrency(doc.valorServicos)}</div>
              </div>
              <div class="col">
                <div class="title">PRODUTOS</div>
                <div class="value">${formatCurrency(doc.valorProdutos)}</div>
              </div>
              <div class="col">
                <div class="title">DESCONTO</div>
                <div class="value">${formatCurrency(doc.valorDesconto)}</div>
              </div>
              <div class="col">
                <div class="title">TOTAL A FATURAR</div>
                <div class="value-large">${formatCurrency(doc.valorTotal)}</div>
              </div>
            </div>
          </div>

          <!-- OBSERVAÇÕES -->
          <div class="obs-box">
            <div class="title">INFORMAÇÕES COMPLEMENTARES</div>
            <p style="margin: 5px 0;">${doc.observacoes ? doc.observacoes + '<br><br>' : ''}Documento fiscal simulado, emitido exclusivamente para fins acadêmicos, gerenciais, operacionais e de demonstração do sistema AvanceOS. Não substitui NF-e, NFS-e, NFC-e, DANFE, recibo fiscal ou qualquer documento fiscal oficial.</p>
          </div>

          <div class="footer">
            Gerado pelo AvanceOS em ${dataHoraGeracao} | ID Interno: ${doc.id} | <strong>SEM VALIDADE FISCAL</strong>
          </div>
        </div>
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function toPayload(values: FiscalForm): DocumentoFiscalPayload {
  return {
    tipoDocumento: values.tipoDocumento as TipoDocumentoFiscal,
    numero: values.numero || null,
    serie: values.serie || null,
    naturezaOperacao: values.naturezaOperacao || null,
    clienteId: values.clienteId || null,
    veiculoId: values.veiculoId || null,
    fornecedorId: values.fornecedorId || null,
    ordemServicoId: values.ordemServicoId || null,
    pagamentoId: values.pagamentoId || null,
    vendaPdvId: values.vendaPdvId || null,
    dataEmissao: values.dataEmissao,
    dataCompetencia: values.dataCompetencia || null,
    valorServicos: normalizeMoney(values.valorServicos),
    valorProdutos: normalizeMoney(values.valorProdutos),
    valorDesconto: normalizeMoney(values.valorDesconto),
    valorTotal: normalizeMoney(values.valorTotal),
    status: values.status as StatusDocumentoFiscal,
    origem: values.origem as OrigemDocumentoFiscal,
    observacoes: values.observacoes || null,
  }
}

function toForm(documento: DocumentoFiscalSimulado): FiscalForm {
  return {
    tipoDocumento: documento.tipoDocumento,
    numero: documento.numero || '',
    serie: documento.serie || '',
    naturezaOperacao: documento.naturezaOperacao || '',
    clienteId: documento.clienteId || '',
    veiculoId: documento.veiculoId || '',
    fornecedorId: documento.fornecedorId || '',
    ordemServicoId: documento.ordemServicoId || '',
    pagamentoId: documento.pagamentoId || '',
    vendaPdvId: documento.vendaPdvId || '',
    dataEmissao: documento.dataEmissao.slice(0, 10),
    dataCompetencia: documento.dataCompetencia ? documento.dataCompetencia.slice(0, 10) : '',
    valorServicos: toMoneyInput(documento.valorServicos),
    valorProdutos: toMoneyInput(documento.valorProdutos),
    valorDesconto: toMoneyInput(documento.valorDesconto),
    valorTotal: toMoneyInput(documento.valorTotal),
    status: documento.status,
    origem: documento.origem,
    observacoes: documento.observacoes || '',
  }
}

export function FiscalPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FiltrosFiscal>(initialFilters)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentoFiscalSimulado | null>(null)
  const [feedback, setFeedback] = useState('')
  const [formError, setFormError] = useState('')
  const [openGerarPorOs, setOpenGerarPorOs] = useState(false)
  const [osSelecionada, setOsSelecionada] = useState('')
  const [tipoGeracao, setTipoGeracao] = useState<'SERVICO' | 'PRODUTO' | 'MISTO'>('SERVICO')
  const [gerarError, setGerarError] = useState('')

  const resumo = useQuery({
    queryKey: ['fiscal', 'resumo', filters],
    queryFn: () => fiscalService.resumo(filters),
  })
  const documentos = useQuery({
    queryKey: ['fiscal', 'documentos', filters],
    queryFn: () => fiscalService.listarDocumentos(filters),
  })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: clientesService.listar })
  const fornecedores = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedoresService.listar })
  const ordensServico = useQuery({ queryKey: ['ordens-servico'], queryFn: osService.listar })
  const veiculos = useQuery({ queryKey: ['veiculos'], queryFn: veiculosService.listar })

  const form = useForm<FiscalForm>({
    resolver: zodResolver(fiscalSchema),
    defaultValues: emptyForm,
  })

  const valorServicos = form.watch('valorServicos')
  const valorProdutos = form.watch('valorProdutos')
  const valorDesconto = form.watch('valorDesconto')
  const ordemServicoId = form.watch('ordemServicoId')

  useEffect(() => {
    const total = Math.max(0, normalizeMoney(valorServicos) + normalizeMoney(valorProdutos) - normalizeMoney(valorDesconto))
    form.setValue('valorTotal', toMoneyInput(total), { shouldDirty: true })
  }, [form, valorDesconto, valorProdutos, valorServicos])

  useEffect(() => {
    if (!ordemServicoId || editing) return
    const os = (ordensServico.data || []).find((item) => item.id === ordemServicoId)
    if (!os) return

    const servicos = Number(os.totalServicos ?? os.valorMaoDeObra ?? 0)
    const produtos = Number(os.totalPecas ?? 0)
    const desconto = Number(os.desconto ?? os.descontoAplicado ?? 0)
    form.setValue('clienteId', os.cliente_id || os.clienteId || os.cliente?.id || '', { shouldDirty: true })
    form.setValue('veiculoId', os.veiculo_id || os.veiculoId || os.veiculo?.id || '', { shouldDirty: true })
    form.setValue('valorServicos', toMoneyInput(servicos), { shouldDirty: true })
    form.setValue('valorProdutos', toMoneyInput(produtos), { shouldDirty: true })
    form.setValue('valorDesconto', toMoneyInput(desconto), { shouldDirty: true })
    form.setValue('origem', 'OS', { shouldDirty: true })
    form.setValue('tipoDocumento', produtos > 0 && servicos > 0 ? 'NOTA_MISTA_SIMULADA' : produtos > 0 ? 'NOTA_PRODUTO_SIMULADA' : 'NOTA_SERVICO_SIMULADA', { shouldDirty: true })
    form.setValue('naturezaOperacao', produtos > 0 && servicos > 0 ? 'Serviço com fornecimento de peças' : produtos > 0 ? 'Venda de peça/produto' : 'Prestação de serviço', { shouldDirty: true })
  }, [editing, form, ordemServicoId, ordensServico.data])

  const salvarDocumento = useMutation({
    mutationFn: (values: FiscalForm) => {
      const payload = toPayload(values)
      if (editing) return fiscalService.atualizarDocumento(editing.id, payload)
      return fiscalService.criarDocumento(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fiscal'] })
      setFeedback(editing ? 'Documento fiscal simulado atualizado com sucesso.' : 'Documento fiscal simulado criado com sucesso.')
      closeDialog()
    },
    onError: (error: any) => setFormError(error.message || 'Erro ao salvar documento fiscal simulado.'),
  })



  const cancelarDocumento = useMutation({
    mutationFn: (id: string) => fiscalService.cancelarDocumento(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fiscal'] })
      setFeedback('Documento cancelado gerencialmente.')
    },
  })

  const osDetalhesCalculados = useMemo(() => {
    if (!osSelecionada) return null
    const os = (ordensServico.data || []).find((item) => item.id === osSelecionada)
    if (!os) return null

    const servicos = Number(os.totalServicos ?? os.valorMaoDeObra ?? 0)
    const produtos = Number(os.totalPecas ?? 0)
    const desconto = Number(os.desconto ?? os.descontoAplicado ?? 0)
    
    let calcServicos = 0
    let calcProdutos = 0

    if (tipoGeracao === 'SERVICO') {
      calcServicos = servicos
    } else if (tipoGeracao === 'PRODUTO') {
      calcProdutos = produtos
    } else {
      calcServicos = servicos
      calcProdutos = produtos
    }

    const calcTotal = Math.max(0, calcServicos + calcProdutos - desconto)

    return {
      os,
      servicosBase: servicos,
      produtosBase: produtos,
      desconto,
      calcServicos,
      calcProdutos,
      calcTotal
    }
  }, [osSelecionada, ordensServico.data, tipoGeracao])

  const gerarDocumentoPorOs = useMutation({
    mutationFn: () => {
      if (!osDetalhesCalculados) throw new Error('Selecione uma Ordem de Serviço.')
      return fiscalService.gerarPorOs({ 
        ordemServicoId: osSelecionada, 
        tipoDocumento: tipoGeracao,
        valorServicos: osDetalhesCalculados.calcServicos,
        valorProdutos: osDetalhesCalculados.calcProdutos,
        valorDesconto: osDetalhesCalculados.desconto,
        valorTotal: osDetalhesCalculados.calcTotal,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fiscal'] })
      setFeedback('Documento fiscal simulado gerado com sucesso.')
      setOpenGerarPorOs(false)
      setOsSelecionada('')
      setGerarError('')
    },
    onError: (error: any) => {
      setGerarError(error?.response?.data?.message || error.message || 'Erro ao gerar documento por OS.')
    },
  })

  const exportarCsv = useMutation({
    mutationFn: () => fiscalService.exportarCsv(filters),
    onSuccess: (blob) => {
      downloadBlob(blob, 'fiscal_gerencial.csv')
      setFeedback('CSV fiscal gerencial exportado.')
    },
  })

  const porTipo = useMemo(() => resumo.data?.porTipoDocumento || [], [resumo.data?.porTipoDocumento])
  const porStatus = useMemo(() => resumo.data?.porStatus || [], [resumo.data?.porStatus])

  function updateFilter<K extends keyof FiltrosFiscal>(key: K, value: FiltrosFiscal[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setEditing(null)
    setFormError('')
    form.reset(emptyForm)
    setOpen(true)
  }

  function openEdit(documento: DocumentoFiscalSimulado) {
    setEditing(documento)
    setFormError('')
    form.reset(toForm(documento))
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setEditing(null)
    setFormError('')
    form.reset(emptyForm)
  }

  const columns: Array<DataTableColumn<DocumentoFiscalSimulado>> = [
    { key: 'data', header: 'Data', render: (row) => formatDate(row.dataEmissao) },
    { key: 'numero', header: 'Número', render: (row) => row.numero || '-' },
    { key: 'tipo', header: 'Tipo', render: (row) => <Badge className={tipoTone(row.tipoDocumento)}>{tipoLabels[row.tipoDocumento]}</Badge> },
    { key: 'natureza', header: 'Natureza', render: (row) => row.naturezaOperacao || '-' },
    { key: 'pessoa', header: 'Cliente/Fornecedor', render: (row) => row.cliente?.nome || row.fornecedor?.nome || '-' },
    { key: 'os', header: 'OS', render: (row) => (row.ordemServico?.numeroOS ? `#${row.ordemServico.numeroOS}` : '-') },
    { key: 'total', header: 'Valor total', render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(row.valorTotal)}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge className={statusTone(row.status)}>{statusLabels[row.status]}</Badge> },
    {
      key: 'validade',
      header: 'Validade fiscal',
      render: () => <Badge className="border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800/40 dark:bg-rose-900/30 dark:text-rose-400">Sem validade</Badge>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" className="h-9 px-3 text-xs font-medium" title="Abrir detalhes fiscais" onClick={() => openEdit(row)}>
            <Edit className="mr-2 h-5 w-5" /> Detalhes
          </Button>
          {row.status !== 'CANCELADO' && (
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-3 text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50"
              title="Cancelar gerencialmente"
              disabled={cancelarDocumento.isPending}
              onClick={() => cancelarDocumento.mutate(row.id)}
            >
              <Ban className="mr-1.5 h-4 w-4" /> Cancelar
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        title="Fiscal Gerencial"
        description="Controle fiscal simulado e preparação para futuras integrações fiscais da oficina."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['fiscal'] })}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" variant="secondary" disabled={exportarCsv.isPending} onClick={() => exportarCsv.mutate()}>
              {exportarCsv.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar CSV
            </Button>

            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo documento
            </Button>
          </>
        }
      />

      <Alert variant="warning">{avisoSemValidadeFiscal}</Alert>
      {feedback ? <Alert variant="success">{feedback}</Alert> : null}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
        <StatCard title="Documentos no período" value={resumo.data?.totalDocumentos || 0} icon={<FileSpreadsheet className="h-5 w-5" />} tone="blue" />
        <StatCard title="Emitidos simulados" value={resumo.data?.totalEmitidosSimulados || 0} tone="cyan" />
        <StatCard title="Rascunhos" value={resumo.data?.totalRascunhos || 0} tone="amber" />
        <StatCard title="Cancelados" value={resumo.data?.totalCancelados || 0} tone="rose" />
        <StatCard title="Valor total simulado" value={formatCurrency(resumo.data?.valorTotalSimulado || 0)} tone="green" />
        <StatCard title="Serviços" value={formatCurrency(resumo.data?.valorServicos || 0)} tone="green" />
        <StatCard title="Produtos" value={formatCurrency(resumo.data?.valorProdutos || 0)} tone="violet" />
      </div>

      <Card className="border-cyan-300 bg-cyan-100/80 dark:border-cyan-800/30 dark:bg-cyan-900/10">
        <CardHeader>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Consulta fiscal por OS
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Busque documentos fiscais já gerados para uma OS ou gere um novo documento fiscal simulado a partir de uma OS existente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              className="flex-1"
              value={filters.busca || ''}
              onChange={(e) => updateFilter('busca', e.target.value)}
              placeholder="Digite número da OS, placa, cliente ou CPF/CNPJ"
              onKeyDown={(e) => {
                if (e.key === 'Enter') queryClient.invalidateQueries({ queryKey: ['fiscal'] })
              }}
            />
            <Button
              variant="secondary"
              className="h-11 px-5 text-sm font-semibold"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['fiscal'] })}
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar documentos fiscais
            </Button>
            <Button
              className="h-11 px-5 text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600"
              onClick={() => { setOpenGerarPorOs(true); setOsSelecionada(''); setGerarError(''); }}
            >
              <ReceiptText className="mr-2 h-4 w-4" />
              Gerar fiscal de OS
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Search className="h-4 w-4 text-cyan-900" />
            Filtros
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <div>
              <Label>Data inicial</Label>
              <Input type="date" value={filters.inicio || ''} onChange={(event) => updateFilter('inicio', event.target.value)} />
            </div>
            <div>
              <Label>Data final</Label>
              <Input type="date" value={filters.fim || ''} onChange={(event) => updateFilter('fim', event.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filters.tipoDocumento || ''} onChange={(event) => updateFilter('tipoDocumento', event.target.value as TipoDocumentoFiscal | '')}>
                <option value="">Todos</option>
                {tiposDocumentoFiscal.map((tipo) => <option key={tipo} value={tipo}>{tipoLabels[tipo]}</option>)}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status || ''} onChange={(event) => updateFilter('status', event.target.value as StatusDocumentoFiscal | '')}>
                <option value="">Todos</option>
                {statusDocumentoFiscal.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </Select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={filters.clienteId || ''} onChange={(event) => updateFilter('clienteId', event.target.value)}>
                <option value="">Todos</option>
                {(clientes.data || []).map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={filters.fornecedorId || ''} onChange={(event) => updateFilter('fornecedorId', event.target.value)}>
                <option value="">Todos</option>
                {(fornecedores.data || []).map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nomeFantasia || fornecedor.razaoSocial}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>OS</Label>
              <Select value={filters.ordemServicoId || ''} onChange={(event) => updateFilter('ordemServicoId', event.target.value)}>
                <option value="">Todas</option>
                {(ordensServico.data || []).map((os) => (
                  <option key={os.id} value={os.id}>#{os.numeroOS || os.numero} - {os.placaVeiculo || os.veiculo?.placa || 'sem placa'}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={filters.origem || ''} onChange={(event) => updateFilter('origem', event.target.value as OrigemDocumentoFiscal | '')}>
                <option value="">Todas</option>
                {origensDocumentoFiscal.map((origem) => <option key={origem} value={origem}>{origemLabels[origem]}</option>)}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Documentos fiscais simulados</h3></CardHeader>
          <CardContent>
            {documentos.isLoading ? <LoadingState label="Carregando documentos fiscais simulados..." /> : null}
            {documentos.isError ? <ErrorState message="Erro ao carregar o Fiscal Gerencial. Verifique o backend e tente novamente." /> : null}
            {!documentos.isLoading && !documentos.isError && (documentos.data || []).length === 0 ? (
              <EmptyState title="Nenhum documento encontrado" message="Crie um documento fiscal simulado ou ajuste os filtros do período." />
            ) : null}
            {!documentos.isLoading && !documentos.isError && (documentos.data || []).length > 0 ? (
              <DataTable columns={columns} data={documentos.data || []} getRowKey={(row) => row.id} />
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Resumo por status</h3></CardHeader>
            <CardContent className="space-y-3">
              {porStatus.map((item) => (
                <div key={item.chave} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{statusLabels[item.chave as StatusDocumentoFiscal] || item.chave}</span>
                  <span className="text-slate-500 dark:text-slate-400">{item.quantidade} · {formatCurrency(item.total)}</span>
                </div>
              ))}
              {porStatus.length === 0 ? <p className="text-sm text-muted-foreground">Sem documentos no período.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Resumo por tipo</h3></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[360px]">
                <thead><tr><Th>Tipo</Th><Th>Qtd.</Th><Th>Total</Th></tr></thead>
                <tbody>
                  {porTipo.map((item) => (
                    <tr key={item.chave}>
                      <Td>{tipoLabels[item.chave as TipoDocumentoFiscal] || item.chave}</Td>
                      <Td>{item.quantidade}</Td>
                      <Td>{formatCurrency(item.total)}</Td>
                    </tr>
                  ))}
                  {porTipo.length === 0 ? <tr><Td colSpan={3}>Sem tipos no período.</Td></tr> : null}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <Alert variant="info">
            Em fase futura, documentos fiscais simulados poderão alimentar relatórios contábeis gerenciais, evitando duplicidade de receitas.
          </Alert>
        </div>
      </div>

      <Dialog
        open={open}
        title={editing ? 'Editar documento fiscal simulado' : 'Novo documento fiscal simulado'}
        description="Registro gerencial sem emissão fiscal real, sem transmissão externa e sem alteração de OS, estoque, financeiro ou PDV."
        contentClassName="max-w-5xl"
        onClose={closeDialog}
      >
        <Alert variant="warning" className="mb-4">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{avisoSemValidadeFiscal}</span>
          </div>
        </Alert>
        {formError ? <Alert variant="error" className="mb-4">{formError}</Alert> : null}
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => salvarDocumento.mutate(values))}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <Label>Tipo de documento</Label>
              <Select {...form.register('tipoDocumento')}>
                {tiposDocumentoFiscal.map((tipo) => <option key={tipo} value={tipo}>{tipoLabels[tipo]}</option>)}
              </Select>
            </div>
            <div>
              <Label>Número</Label>
              <Input {...form.register('numero')} placeholder="Controle interno" />
            </div>
            <div>
              <Label>Série</Label>
              <Input {...form.register('serie')} placeholder="Opcional" />
            </div>
            <div>
              <Label>Natureza da operação</Label>
              <Select {...form.register('naturezaOperacao')}>
                <option value="">Selecione</option>
                {naturezasOperacaoFiscal.map((natureza) => <option key={natureza} value={natureza}>{natureza}</option>)}
              </Select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select {...form.register('clienteId')}>
                <option value="">Sem cliente</option>
                {(clientes.data || []).map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label>Veículo</Label>
              <Select {...form.register('veiculoId')}>
                <option value="">Sem veículo</option>
                {(veiculos.data || []).map((veiculo) => (
                  <option key={veiculo.id} value={veiculo.id}>{veiculo.placa} - {[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select {...form.register('fornecedorId')}>
                <option value="">Sem fornecedor</option>
                {(fornecedores.data || []).map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nomeFantasia || fornecedor.razaoSocial}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>OS</Label>
              <Select {...form.register('ordemServicoId')}>
                <option value="">Sem OS</option>
                {(ordensServico.data || []).map((os) => (
                  <option key={os.id} value={os.id}>#{os.numeroOS || os.numero} - {os.placaVeiculo || os.veiculo?.placa || 'sem placa'}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Data de emissão</Label>
              <Input type="date" {...form.register('dataEmissao')} />
              {form.formState.errors.dataEmissao ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.dataEmissao.message}</p> : null}
            </div>
            <div>
              <Label>Data de competência</Label>
              <Input type="date" {...form.register('dataCompetencia')} />
            </div>
            <div>
              <Label>Valor de serviços</Label>
              <Input {...form.register('valorServicos')} inputMode="decimal" placeholder="0,00" />
              {form.formState.errors.valorServicos ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.valorServicos.message}</p> : null}
            </div>
            <div>
              <Label>Valor de produtos</Label>
              <Input {...form.register('valorProdutos')} inputMode="decimal" placeholder="0,00" />
              {form.formState.errors.valorProdutos ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.valorProdutos.message}</p> : null}
            </div>
            <div>
              <Label>Desconto</Label>
              <Input {...form.register('valorDesconto')} inputMode="decimal" placeholder="0,00" />
              {form.formState.errors.valorDesconto ? <p className="mt-1 text-xs text-rose-600">{form.formState.errors.valorDesconto.message}</p> : null}
            </div>
            <div>
              <Label>Total calculado</Label>
              <Input {...form.register('valorTotal')} inputMode="decimal" readOnly className="font-semibold text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <Label>Status</Label>
              <Select {...form.register('status')}>
                {statusDocumentoFiscal.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select {...form.register('origem')}>
                {origensDocumentoFiscal.map((origem) => <option key={origem} value={origem}>{origemLabels[origem]}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea {...form.register('observacoes')} rows={3} placeholder="Notas internas para conferência gerencial." />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {editing && (
                <>
                  <Button type="button" variant="secondary" onClick={() => gerarPdfSimulado(editing)}>
                    <FileText className="mr-2 h-4 w-4" /> PDF/DANFE simulado
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => gerarXmlSimulado(editing)}>
                    <Code className="mr-2 h-4 w-4" /> XML simulado
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={salvarDocumento.isPending}>
                {salvarDocumento.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={openGerarPorOs}
        title="Gerar fiscal de OS"
        description="Gere um documento fiscal simulado a partir de uma Ordem de Serviço existente."
        onClose={() => setOpenGerarPorOs(false)}
      >
        {gerarError ? <Alert variant="error" className="mb-4">{gerarError}</Alert> : null}
        <div className="space-y-4">
          <div>
            <Label>Buscar / Selecionar Ordem de Serviço</Label>
            <Select value={osSelecionada} onChange={(e) => setOsSelecionada(e.target.value)}>
              <option value="">Selecione uma OS</option>
              {(ordensServico.data || []).map((os) => (
                <option key={os.id} value={os.id}>
                  #{os.numeroOS || os.numero} - {os.cliente?.nome || 'Sem cliente'} - {os.placaVeiculo || os.veiculo?.placa || 'Sem placa'}
                </option>
              ))}
            </Select>
          </div>

          {osDetalhesCalculados && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <h4 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Resumo da OS #{osDetalhesCalculados.os.numeroOS || osDetalhesCalculados.os.numero}</h4>
              <div className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <div><span className="font-medium">Cliente:</span> {osDetalhesCalculados.os.cliente?.nome || '-'}</div>
                <div><span className="font-medium">CPF/CNPJ:</span> {osDetalhesCalculados.os.cliente?.documento || '-'}</div>
                <div><span className="font-medium">Veículo:</span> {[osDetalhesCalculados.os.veiculo?.marca, osDetalhesCalculados.os.veiculo?.modelo].filter(Boolean).join(' ') || osDetalhesCalculados.os.modeloVeiculo || '-'}</div>
                <div><span className="font-medium">Placa:</span> {osDetalhesCalculados.os.veiculo?.placa || osDetalhesCalculados.os.placaVeiculo || '-'}</div>
                <div><span className="font-medium">Serviços da OS:</span> {formatCurrency(osDetalhesCalculados.servicosBase)}</div>
                <div><span className="font-medium">Produtos da OS:</span> {formatCurrency(osDetalhesCalculados.produtosBase)}</div>
              </div>
            </div>
          )}

          <div>
            <Label>Tipo de documento</Label>
            <Select value={tipoGeracao} onChange={(e) => setTipoGeracao(e.target.value as any)}>
              <option value="SERVICO" disabled={osDetalhesCalculados?.servicosBase === 0}>
                Serviço {osDetalhesCalculados?.servicosBase === 0 ? '(Sem serviços)' : ''}
              </option>
              <option value="PRODUTO" disabled={osDetalhesCalculados?.produtosBase === 0}>
                Produto {osDetalhesCalculados?.produtosBase === 0 ? '(Sem produtos)' : ''}
              </option>
              <option value="MISTO">Serviço + Produto</option>
            </Select>
          </div>

          {osDetalhesCalculados && (
            <div className="rounded-md bg-cyan-100 p-4 dark:bg-cyan-900/10 border border-cyan-300 dark:border-cyan-800/30">
              <h4 className="mb-2 font-semibold text-cyan-900 dark:text-cyan-100">Cálculo Fiscal Resultante</h4>
              <div className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2 text-cyan-800 dark:text-cyan-200">
                <div><span>Total Serviços:</span> {formatCurrency(osDetalhesCalculados.calcServicos)}</div>
                <div><span>Total Produtos:</span> {formatCurrency(osDetalhesCalculados.calcProdutos)}</div>
                <div><span>Desconto aplicado:</span> {formatCurrency(osDetalhesCalculados.desconto)}</div>
                <div className="font-bold"><span>Total a faturar:</span> {formatCurrency(osDetalhesCalculados.calcTotal)}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpenGerarPorOs(false)}>Cancelar</Button>
            <Button type="button" disabled={!osSelecionada || gerarDocumentoPorOs.isPending} onClick={() => gerarDocumentoPorOs.mutate()}>
              {gerarDocumentoPorOs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
              Gerar Documento
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
