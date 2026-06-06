import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Edit, Plus, Save, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ColumnSelector } from '@/components/common/ColumnSelector'
import { useColumnVisibility } from '@/components/common/useColumnVisibility'
import { DataTable } from '@/components/common/DataTable'
import type { DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { manualProcedimentoSchema } from '@/schemas/manualProcedimento.schema'
import { manuaisProcedimentosService } from '@/services/manuaisProcedimentos.service'
import type { ManualProcedimento } from '@/types/manualProcedimento'
import { authService } from '@/services/auth.service'
import { hasRole } from '@/lib/roles'

type ManualForm = z.infer<typeof manualProcedimentoSchema>

const columnOptions = [
  { key: 'titulo', label: 'Título', required: true },
  { key: 'tipo', label: 'Tipo' },
  { key: 'area', label: 'Área' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'nivelAcesso', label: 'Acesso' },
  { key: 'versao', label: 'Versão' },
  { key: 'status', label: 'Status' },
  { key: 'acoes', label: 'Ações', required: true },
]

const emptyManual: ManualForm = {
  titulo: '',
  descricao: '',
  area: 'TODOS',
  categoria: 'Geral',
  tipo: 'Manual',
  nivelAcesso: 'TODOS',
  arquivoUrl: '',
  conteudoTexto: '',
  versao: '1.0',
  status: 'ATIVO',
}

function toForm(doc: ManualProcedimento): ManualForm {
  let isUpload = false
  if (doc.arquivoUrl?.startsWith('{')) {
    try { JSON.parse(doc.arquivoUrl); isUpload = true } catch {}
  }
  return {
    titulo: doc.titulo,
    descricao: doc.descricao || '',
    area: doc.area,
    categoria: doc.categoria,
    tipo: doc.tipo,
    nivelAcesso: doc.nivelAcesso,
    arquivoUrl: isUpload ? '' : (doc.arquivoUrl || ''),
    conteudoTexto: doc.conteudoTexto || '',
    versao: doc.versao || '',
    status: doc.status,
  }
}

function parseAnexoInfo(arquivoUrl?: string | null) {
  if (!arquivoUrl) return null
  if (arquivoUrl.startsWith('{')) {
    try {
      return JSON.parse(arquivoUrl) as { type: string, path: string, originalName: string, size: number, mime: string }
    } catch {
      return null
    }
  }
  return null
}

function manualStatusLabel(status?: string | null) {
  if (status === 'ATIVO') return 'Ativo'
  if (status === 'RASCUNHO') return 'Rascunho'
  if (status === 'ARQUIVADO') return 'Arquivado'
  return status || '-'
}

function manualAreaLabel(area?: string | null) {
  const labels: Record<string, string> = {
    TODOS: 'Todas as áreas',
    ADMINISTRACAO: 'Administração',
    RECEPCAO: 'Recepção',
    MECANICA: 'Mecânica',
    FINANCEIRO: 'Financeiro',
    ESTOQUE: 'Estoque',
  }
  return area ? labels[area] || area : '-'
}

function manualTipoLabel(tipo?: string | null) {
  const labels: Record<string, string> = {
    Manual: 'Manual',
    Procedimento: 'Procedimento',
    Norma: 'Norma',
    Checklist: 'Checklist',
    Instrucao: 'Instrução Técnica',
    Politica: 'Política Interna',
  }
  return tipo ? labels[tipo] || tipo : '-'
}

export function ManuaisProcedimentosPage() {
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const isAdmin = hasRole(usuario?.cargo, ['ADMIN', 'GERENTE'])

  const [openForm, setOpenForm] = useState(false)
  const [openView, setOpenView] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<ManualProcedimento | null>(null)
  const [anexo, setAnexo] = useState<File | null>(null)
  
  const [search, setSearch] = useState('')
  const [filtroArea, setFiltroArea] = useState('TODOS')
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  
  const [feedback, setFeedback] = useState('')
  const [formError, setFormError] = useState('')

  const docsQuery = useQuery({ queryKey: ['manuais-procedimentos'], queryFn: manuaisProcedimentosService.listar })
  const columns = useColumnVisibility('columns.manuais', columnOptions)
  
  const form = useForm<ManualForm>({
    resolver: zodResolver(manualProcedimentoSchema),
    defaultValues: emptyManual,
  })

  const criarDoc = useMutation({
    mutationFn: manuaisProcedimentosService.criar,
    onSuccess: async (data) => {
      if (anexo) {
        await manuaisProcedimentosService.uploadAnexo(data.id, anexo)
      }
      await queryClient.invalidateQueries({ queryKey: ['manuais-procedimentos'] })
      setFeedback('Documento criado com sucesso.')
      closeForm()
    },
    onError: (error) => {
      setFeedback('')
      setFormError(error.message)
    },
  })

  const atualizarDoc = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ManualForm }) => manuaisProcedimentosService.atualizar(id, values),
    onSuccess: async (_, variables) => {
      if (anexo) {
        await manuaisProcedimentosService.uploadAnexo(variables.id, anexo)
      }
      await queryClient.invalidateQueries({ queryKey: ['manuais-procedimentos'] })
      setFeedback('Documento atualizado com sucesso.')
      closeForm()
    },
    onError: (error) => {
      setFeedback('')
      setFormError(error.message)
    },
  })

  function handleOpenCreate() {
    setSelectedDoc(null)
    setAnexo(null)
    setFormError('')
    form.reset(emptyManual)
    setOpenForm(true)
  }

  function handleOpenEdit(doc: ManualProcedimento) {
    setSelectedDoc(doc)
    setAnexo(null)
    setFormError('')
    form.reset(toForm(doc))
    setOpenForm(true)
  }

  function handleOpenView(doc: ManualProcedimento) {
    setSelectedDoc(doc)
    setOpenView(true)
  }

  function closeForm() {
    setOpenForm(false)
    setSelectedDoc(null)
    setAnexo(null)
    setFormError('')
    form.reset(emptyManual)
  }

  function onSubmit(values: ManualForm) {
    setFormError('')
    if (selectedDoc) {
      atualizarDoc.mutate({ id: selectedDoc.id, values })
    } else {
      criarDoc.mutate(values)
    }
  }

  async function handleDownloadAnexo() {
    if (!selectedDoc) return;
    try {
      const { api } = await import('@/lib/api');
      const response = await api.get(`/manuais-procedimentos/${selectedDoc.id}/anexo/download`, {
        responseType: 'blob'
      });
      const info = parseAnexoInfo(selectedDoc.arquivoUrl);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', info?.originalName || 'anexo');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('Erro ao baixar arquivo');
    }
  }

  async function handleViewAnexo() {
    if (!selectedDoc) return;
    try {
      const { api } = await import('@/lib/api');
      const response = await api.get(`/manuais-procedimentos/${selectedDoc.id}/anexo/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: response.data.type }));
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      alert('Erro ao abrir arquivo');
    }
  }

  if (docsQuery.isLoading) return <LoadingState label="Carregando documentos..." />
  if (docsQuery.isError) return <ErrorState message={docsQuery.error.message} />

  const docs = docsQuery.data ?? []
  const termo = search.trim().toLowerCase()
  
  const filtrados = docs.filter((doc) => {
    const matchTermo = [doc.titulo, doc.descricao, doc.categoria].filter(Boolean).join(' ').toLowerCase().includes(termo)
    const matchArea = filtroArea === 'TODOS' || doc.area === filtroArea
    const matchTipo = filtroTipo === 'TODOS' || doc.tipo === filtroTipo
    return matchTermo && matchArea && matchTipo
  })

  const tableColumns: Array<DataTableColumn<ManualProcedimento>> = [
    { key: 'titulo', header: 'Título', render: (row) => <div className="font-medium">{row.titulo}</div> },
    { key: 'tipo', header: 'Tipo', render: (row) => <Badge className="border border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-400">{manualTipoLabel(row.tipo)}</Badge> },
    { key: 'area', header: 'Área', render: (row) => manualAreaLabel(row.area) },
    { key: 'categoria', header: 'Categoria', render: (row) => row.categoria },
    { key: 'nivelAcesso', header: 'Acesso', render: (row) => <Badge className="border border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{manualAreaLabel(row.nivelAcesso)}</Badge> },
    { key: 'versao', header: 'Versão', render: (row) => row.versao || '-' },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row) => (
        <Badge className={row.status === 'ATIVO' ? 'border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400' : 'border border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}>
          {manualStatusLabel(row.status)}
        </Badge>
      )
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenView(row)}>
            <BookOpen className="mr-1 h-4 w-4" />
            Ler
          </Button>
          {isAdmin && (
            <Button type="button" variant="ghost" onClick={() => handleOpenEdit(row)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const areaOptions = [
    { value: 'TODOS', label: 'Todas as Áreas' },
    { value: 'ADMINISTRACAO', label: 'Administração' },
    { value: 'RECEPCAO', label: 'Recepção' },
    { value: 'MECANICA', label: 'Mecânica' },
    { value: 'FINANCEIRO', label: 'Financeiro' },
    { value: 'ESTOQUE', label: 'Estoque' },
  ]

  const tipoOptions = [
    { value: 'TODOS', label: 'Todos os Tipos' },
    { value: 'Manual', label: 'Manual' },
    { value: 'Procedimento', label: 'Procedimento' },
    { value: 'Norma', label: 'Norma' },
    { value: 'Checklist', label: 'Checklist' },
    { value: 'Instrucao', label: 'Instrução Técnica' },
    { value: 'Politica', label: 'Política Interna' },
  ]

  return (
    <section>
      <PageHeader
        title="Manuais e Procedimentos"
        description="Biblioteca interna da Oficina Avance para normas, manuais técnicos e procedimentos operacionais."
        actions={
          <>
            <ColumnSelector options={columnOptions} visibleKeys={columns.visibleKeys} onToggle={columns.toggleColumn} />
            {isAdmin && (
              <Button type="button" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Novo documento
              </Button>
            )}
          </>
        }
      />

      {feedback ? <Alert variant="success" className="mb-4">{feedback}</Alert> : null}

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, descrição ou categoria"
          />
        </div>
        <div className="w-48">
          <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {areaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="w-48">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {tipoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState title="Nenhum documento" message="Ainda não há manuais ou procedimentos cadastrados na biblioteca." />
      ) : filtrados.length === 0 ? (
        <EmptyState title="Nenhum resultado" message="Ajuste os filtros para encontrar o documento." />
      ) : (
        <DataTable data={filtrados} getRowKey={(row) => row.id} columns={columns.filterColumns(tableColumns)} />
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      <Dialog
        open={openForm}
        title={selectedDoc ? 'Editar Documento' : 'Novo Documento'}
        description="Cadastre as informações e o conteúdo do documento interno."
        onClose={closeForm}
        contentClassName="max-w-4xl"
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título" error={form.formState.errors.titulo?.message} className="md:col-span-2">
              <Input {...form.register('titulo')} placeholder="Ex.: Manual de Atendimento" />
            </Field>
            
            <Field label="Descrição" error={form.formState.errors.descricao?.message} className="md:col-span-2">
              <Input {...form.register('descricao')} placeholder="Breve resumo sobre o documento" />
            </Field>

            <Field label="Tipo" error={form.formState.errors.tipo?.message}>
              <select {...form.register('tipo')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                {tipoOptions.filter(o => o.value !== 'TODOS').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <Field label="Categoria" error={form.formState.errors.categoria?.message}>
              <Input {...form.register('categoria')} placeholder="Ex.: Segurança, Diagnóstico" />
            </Field>

            <Field label="Área Relacionada" error={form.formState.errors.area?.message}>
              <select {...form.register('area')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                {areaOptions.filter(o => o.value !== 'TODOS').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <Field label="Nível de Acesso (Visibilidade)" error={form.formState.errors.nivelAcesso?.message}>
              <select {...form.register('nivelAcesso')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                {areaOptions.filter(o => o.value !== 'TODOS').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Quem pode ler este documento?</p>
            </Field>
            
            <Field label="Versão" error={form.formState.errors.versao?.message}>
              <Input {...form.register('versao')} placeholder="Ex.: 1.0" />
            </Field>

            <Field label="Status" error={form.formState.errors.status?.message}>
              <select {...form.register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="ATIVO">Ativo</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="ARQUIVADO">Arquivado</option>
              </select>
            </Field>

            <Field label="Anexo / Upload de Arquivo" className="md:col-span-2">
              <Input type="file" onChange={(e) => setAnexo(e.target.files?.[0] || null)} accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.xls,.xlsx" />
              {anexo && <p className="text-xs text-emerald-400 mt-1">Arquivo selecionado: {anexo.name}</p>}
              {selectedDoc && parseAnexoInfo(selectedDoc.arquivoUrl) && !anexo && (
                <p className="text-xs text-cyan-400 mt-1">Já possui um arquivo anexado: {parseAnexoInfo(selectedDoc.arquivoUrl)?.originalName}</p>
              )}
            </Field>

            <Field label="Link Externo / Caminho Arquivo" error={form.formState.errors.arquivoUrl?.message} className="md:col-span-2">
              <Input {...form.register('arquivoUrl')} disabled={!!anexo} placeholder={anexo ? 'Upload pendente: campo de link desativado' : 'Ex.: \\\\SRV-DC01\\Documentacao ou https://drive.google.com/...'} />
            </Field>

            <Field label="Conteúdo Textual" error={form.formState.errors.conteudoTexto?.message} className="md:col-span-2">
              <Textarea {...form.register('conteudoTexto')} placeholder="Cole o conteúdo do procedimento aqui..." className="min-h-[200px]" />
            </Field>
          </div>

          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarDoc.isPending || atualizarDoc.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {criarDoc.isPending || atualizarDoc.isPending ? 'Salvando...' : 'Salvar documento'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL DE VISUALIZAÇÃO */}
      <Dialog
        open={openView}
        title={selectedDoc?.titulo || 'Documento'}
        onClose={() => setOpenView(false)}
        contentClassName="max-w-4xl"
      >
        {selectedDoc && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge className="border border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-400">{manualTipoLabel(selectedDoc.tipo)}</Badge>
              <Badge className="border border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{selectedDoc.categoria}</Badge>
              <span>Área: {manualAreaLabel(selectedDoc.area)}</span>
              <span>Versão: {selectedDoc.versao || '1.0'}</span>
              <span>Atualizado em: {new Date(selectedDoc.atualizadoEm).toLocaleDateString()}</span>
            </div>

            {selectedDoc.descricao && (
              <div className="rounded-lg border border-border bg-slate-900/30 p-4 text-slate-300">
                {selectedDoc.descricao}
              </div>
            )}

            {selectedDoc.conteudoTexto ? (
              <div className="prose prose-invert max-w-none whitespace-pre-wrap rounded-lg bg-[hsl(var(--surface-raised))] p-6 shadow-inner text-slate-200">
                {selectedDoc.conteudoTexto}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                Sem conteúdo textual disponível.
              </div>
            )}

            {selectedDoc.arquivoUrl && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-cyan-900/30 bg-cyan-950/10 p-4">
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-cyan-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-cyan-100">
                      {parseAnexoInfo(selectedDoc.arquivoUrl) ? 'Arquivo Anexado' : 'Arquivo ou Link de Referência'}
                    </span>
                    {parseAnexoInfo(selectedDoc.arquivoUrl) && (
                      <span className="text-xs text-cyan-300">
                        {parseAnexoInfo(selectedDoc.arquivoUrl)?.originalName} ({(parseAnexoInfo(selectedDoc.arquivoUrl)!.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                </div>
                {parseAnexoInfo(selectedDoc.arquivoUrl) ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleViewAnexo}>
                      Visualizar
                    </Button>
                    <Button variant="default" onClick={handleDownloadAnexo}>
                      Baixar
                    </Button>
                  </div>
                ) : (
                  <a 
                    href={selectedDoc.arquivoUrl.startsWith('http') ? selectedDoc.arquivoUrl : '#'} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm font-bold text-cyan-400 hover:text-cyan-300"
                  >
                    Acessar Original
                  </a>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button type="button" onClick={() => setOpenView(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  )
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
