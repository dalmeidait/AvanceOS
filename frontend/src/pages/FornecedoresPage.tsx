import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Loader2, Plus, RefreshCw, Save, Power, PowerOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
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
import { maskCep, maskCpfCnpj, maskTelefone, unmaskCep } from '@/lib/masks'
import { fornecedorSchema } from '@/schemas/fornecedor.schema'
import { buscarEnderecoPorCep } from '@/services/cep.service'
import { fornecedoresService } from '@/services/fornecedores.service'
import type { Fornecedor, CriarFornecedorPayload } from '@/types/fornecedor'

type FornecedorForm = z.infer<typeof fornecedorSchema>

const columnOptions = [
  { key: 'nomeFantasia', label: 'Nome Fantasia', required: true },
  { key: 'razaoSocial', label: 'Razão Social' },
  { key: 'cnpj', label: 'CNPJ/CPF' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'contato', label: 'Contato Principal' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'status', label: 'Status' },
  { key: 'acoes', label: 'Ações', required: true },
]

const emptyFornecedor: FornecedorForm = {
  cnpj: '',
  razaoSocial: '',
  nomeFantasia: '',
  tipoPessoa: 'PJ',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
  categoriaFornecedor: '',
  tipoFornecimento: '',
  nomeContatoPrincipal: '',
  telefone: '',
  whatsapp: '',
  email: '',
  emailFinanceiro: '',
  site: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  pais: 'Brasil',
  prazoEntregaMedioDias: '',
  condicaoPagamento: '',
  limiteCredito: '',
  fornecePecas: false,
  forneceServicos: false,
  forneceFerramentas: false,
  forneceInsumos: false,
  forneceTecnologia: false,
  aceitaPedidoUrgente: false,
  avaliacao: '',
  observacoesComerciais: '',
  observacoesInternas: '',
  status: 'ATIVO',
  ativo: true,
}

function statusFornecedorLabel(status?: string | null) {
  if (status === 'ATIVO') return 'Ativo'
  if (status === 'INATIVO') return 'Inativo'
  return status || '-'
}

function toFornecedorForm(fornecedor: Fornecedor): FornecedorForm {
  return {
    cnpj: maskCpfCnpj(fornecedor.cnpj || ''),
    razaoSocial: fornecedor.razaoSocial || '',
    nomeFantasia: fornecedor.nomeFantasia || '',
    tipoPessoa: fornecedor.tipoPessoa || 'PJ',
    inscricaoEstadual: fornecedor.inscricaoEstadual || '',
    inscricaoMunicipal: fornecedor.inscricaoMunicipal || '',
    categoriaFornecedor: fornecedor.categoriaFornecedor || '',
    tipoFornecimento: fornecedor.tipoFornecimento || '',
    nomeContatoPrincipal: fornecedor.nomeContatoPrincipal || '',
    telefone: maskTelefone(fornecedor.telefone || ''),
    whatsapp: maskTelefone(fornecedor.whatsapp || ''),
    email: fornecedor.email || '',
    emailFinanceiro: fornecedor.emailFinanceiro || '',
    site: fornecedor.site || '',
    cep: maskCep(fornecedor.cep || ''),
    logradouro: fornecedor.logradouro || '',
    numero: fornecedor.numero || '',
    complemento: fornecedor.complemento || '',
    bairro: fornecedor.bairro || '',
    cidade: fornecedor.cidade || '',
    estado: fornecedor.estado || '',
    pais: fornecedor.pais || 'Brasil',
    prazoEntregaMedioDias: fornecedor.prazoEntregaMedioDias ? String(fornecedor.prazoEntregaMedioDias) : '',
    condicaoPagamento: fornecedor.condicaoPagamento || '',
    limiteCredito: fornecedor.limiteCredito ? String(fornecedor.limiteCredito) : '',
    fornecePecas: fornecedor.fornecePecas,
    forneceServicos: fornecedor.forneceServicos,
    forneceFerramentas: fornecedor.forneceFerramentas,
    forneceInsumos: fornecedor.forneceInsumos,
    forneceTecnologia: fornecedor.forneceTecnologia,
    aceitaPedidoUrgente: fornecedor.aceitaPedidoUrgente,
    avaliacao: fornecedor.avaliacao ? String(fornecedor.avaliacao) : '',
    observacoesComerciais: fornecedor.observacoesComerciais || '',
    observacoesInternas: fornecedor.observacoesInternas || '',
    status: fornecedor.status || 'ATIVO',
    ativo: fornecedor.ativo,
  }
}

export function FornecedoresPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState('')
  const [formError, setFormError] = useState('')
  const [cepStatus, setCepStatus] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  
  const lastCepConsultedRef = useRef('')
  const fornecedores = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedoresService.listar })
  const columns = useColumnVisibility('columns.fornecedores', columnOptions)
  
  const form = useForm<FornecedorForm>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: emptyFornecedor,
  })
  
  const cnpjValue = form.watch('cnpj') || ''
  const telefoneValue = form.watch('telefone') || ''
  const whatsappValue = form.watch('whatsapp') || ''
  const cepValue = form.watch('cep') || ''

  const criarFornecedor = useMutation({
    mutationFn: fornecedoresService.criar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fornecedores'] })
      setFeedback('Fornecedor criado com sucesso.')
      closeDialog()
    },
    onError: (error: any) => {
      setFeedback('')
      setFormError(error.response?.data?.message || error.message || 'Erro ao criar fornecedor')
    },
  })

  const atualizarFornecedor = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CriarFornecedorPayload }) => fornecedoresService.atualizar(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fornecedores'] })
      setFeedback('Fornecedor atualizado com sucesso.')
      closeDialog()
    },
    onError: (error: any) => {
      setFeedback('')
      setFormError(error.response?.data?.message || error.message || 'Erro ao atualizar fornecedor')
    },
  })
  
  const alterarStatusFornecedor = useMutation({
    mutationFn: ({ id, status, ativo }: { id: string; status: string; ativo: boolean }) => 
      fornecedoresService.atualizarStatus(id, status, ativo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fornecedores'] })
      setFeedback('Status do fornecedor atualizado com sucesso.')
    },
  })

  function openCreate() {
    setEditingFornecedor(null)
    setFormError('')
    setCepStatus('')
    lastCepConsultedRef.current = ''
    form.reset(emptyFornecedor)
    setOpen(true)
  }

  function openEdit(fornecedor: Fornecedor) {
    setEditingFornecedor(fornecedor)
    setFormError('')
    setCepStatus('')
    lastCepConsultedRef.current = ''
    form.reset(toFornecedorForm(fornecedor))
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setEditingFornecedor(null)
    setFormError('')
    setCepStatus('')
    lastCepConsultedRef.current = ''
    form.reset(emptyFornecedor)
  }
  
  function handleToggleStatus(row: Fornecedor) {
    const isAtivo = row.status === 'ATIVO'
    alterarStatusFornecedor.mutate({
      id: row.id,
      status: isAtivo ? 'INATIVO' : 'ATIVO',
      ativo: !isAtivo
    })
  }

  async function consultarCep(cep: string) {
    const digits = unmaskCep(cep)
    if (!digits) {
      setCepStatus('')
      return
    }
    if (digits.length !== 8) {
      setCepStatus('Informe um CEP com 8 dígitos.')
      return
    }
    if (lastCepConsultedRef.current === digits) return

    lastCepConsultedRef.current = digits
    setCepLoading(true)
    setCepStatus('Buscando endereço...')
    try {
      const endereco = await buscarEnderecoPorCep(digits)
      form.setValue('cep', maskCep(endereco.cep), { shouldDirty: true })
      form.setValue('logradouro', endereco.logradouro, { shouldDirty: true })
      form.setValue('bairro', endereco.bairro, { shouldDirty: true })
      form.setValue('cidade', endereco.cidade, { shouldDirty: true })
      form.setValue('estado', endereco.uf, { shouldDirty: true })
      setCepStatus('Endereço preenchido.')
    } catch (error) {
      lastCepConsultedRef.current = ''
      setCepStatus(error instanceof Error ? error.message : 'Erro ao consultar CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  function onSubmit(values: FornecedorForm) {
    setFormError('')
    
    // Convert Form to Payload
    const payload: CriarFornecedorPayload = {
      ...values,
      cnpj: values.cnpj ? values.cnpj.replace(/\D/g, '') : '',
      razaoSocial: values.razaoSocial || '',
      nomeFantasia: values.nomeFantasia || '',
      tipoPessoa: values.tipoPessoa || 'PJ',
      prazoEntregaMedioDias: values.prazoEntregaMedioDias ? parseInt(values.prazoEntregaMedioDias, 10) : null,
      limiteCredito: values.limiteCredito ? parseFloat(values.limiteCredito) : null,
      avaliacao: values.avaliacao ? parseInt(values.avaliacao, 10) : null,
      fornecePecas: Boolean(values.fornecePecas),
      forneceServicos: Boolean(values.forneceServicos),
      forneceFerramentas: Boolean(values.forneceFerramentas),
      forneceInsumos: Boolean(values.forneceInsumos),
      forneceTecnologia: Boolean(values.forneceTecnologia),
      aceitaPedidoUrgente: Boolean(values.aceitaPedidoUrgente),
      ativo: Boolean(values.ativo),
      status: values.status || 'ATIVO',
    }
    
    if (editingFornecedor) {
      atualizarFornecedor.mutate({ id: editingFornecedor.id, values: payload })
      return
    }
    criarFornecedor.mutate(payload)
  }

  if (fornecedores.isLoading) return <LoadingState label="Carregando fornecedores..." />
  if (fornecedores.isError) return <ErrorState message={fornecedores.error.message} />

  const fornecedoresLista = fornecedores.data ?? []
  const termo = search.trim().toLowerCase()
  const fornecedoresFiltrados = fornecedoresLista.filter((forn) =>
    [forn.nomeFantasia, forn.razaoSocial, forn.cnpj, forn.telefone, forn.email, forn.cidade, forn.categoriaFornecedor, forn.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(termo),
  )

  const tableColumns: Array<DataTableColumn<Fornecedor>> = [
    { key: 'nomeFantasia', header: 'Nome Fantasia', render: (row) => row.nomeFantasia },
    { key: 'razaoSocial', header: 'Razão Social', render: (row) => row.razaoSocial || '-' },
    { key: 'cnpj', header: 'CNPJ/CPF', render: (row) => maskCpfCnpj(row.cnpj) || '-' },
    { key: 'categoria', header: 'Categoria', render: (row) => row.categoriaFornecedor || '-' },
    { key: 'contato', header: 'Contato', render: (row) => row.nomeContatoPrincipal || '-' },
    { key: 'telefone', header: 'Telefone', render: (row) => maskTelefone(row.telefone || row.whatsapp || '') || '-' },
    { key: 'email', header: 'Email', render: (row) => row.email || '-' },
    {
      key: 'cidade',
      header: 'Cidade',
      render: (row) => [row.cidade, row.estado].filter(Boolean).join(' / ') || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge className={row.status === 'ATIVO' ? 'border-green-300/40 bg-green-300/12 text-green-500' : 'bg-muted/30 text-muted-foreground'}>
          {statusFornecedorLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => openEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleToggleStatus(row)}>
             {row.status === 'ATIVO' ? <PowerOff className="h-4 w-4 text-red-400" /> : <Power className="h-4 w-4 text-green-400" />}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        title="Fornecedores"
        description="Cadastro completo de fornecedores, serviços terceirizados, tecnologia e demais."
        actions={
          <>
            <ColumnSelector options={columnOptions} visibleKeys={columns.visibleKeys} onToggle={columns.toggleColumn} />
            <Button type="button" variant="secondary" onClick={() => fornecedores.refetch()} disabled={fornecedores.isFetching}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Button>
          </>
        }
      />

      {feedback ? <Alert variant="success" className="mb-4">{feedback}</Alert> : null}

      <div className="mb-4 max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, cnpj, email..."
        />
      </div>

      {fornecedoresLista.length === 0 ? (
        <EmptyState title="Nenhum fornecedor cadastrado" message="Crie o primeiro fornecedor." />
      ) : fornecedoresFiltrados.length === 0 ? (
        <EmptyState title="Nenhum fornecedor encontrado" message="Ajuste a busca." />
      ) : (
        <DataTable data={fornecedoresFiltrados} getRowKey={(row) => row.id} columns={columns.filterColumns(tableColumns)} />
      )}

      <Dialog
        open={open}
        title={editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        description="Cadastre ou atualize as informações deste fornecedor."
        onClose={closeDialog}
        contentClassName="max-w-4xl"
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormSection title="Dados Principais" description="Informações gerais e de identificação">
            <Field label="Nome Fantasia" error={form.formState.errors.nomeFantasia?.message} className="md:col-span-2">
              <Input {...form.register('nomeFantasia')} placeholder="Ex.: Auto Peças São José" />
            </Field>
            <Field label="Razão Social" error={form.formState.errors.razaoSocial?.message} className="md:col-span-2">
              <Input {...form.register('razaoSocial')} placeholder="Ex.: São José Comércio de Peças LTDA" />
            </Field>
            <Field label="CNPJ/CPF" error={form.formState.errors.cnpj?.message}>
              <Input
                {...form.register('cnpj')}
                value={cnpjValue}
                onChange={(event) =>
                  form.setValue('cnpj', maskCpfCnpj(event.target.value), { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Ex.: 00.000.000/0000-00"
              />
            </Field>
            <Field label="Categoria" error={form.formState.errors.categoriaFornecedor?.message}>
              <Input {...form.register('categoriaFornecedor')} placeholder="Ex.: PEÇAS, SERVIÇOS..." />
            </Field>
            <Field label="Inscrição Estadual" error={form.formState.errors.inscricaoEstadual?.message}>
              <Input {...form.register('inscricaoEstadual')} />
            </Field>
            <Field label="Inscrição Municipal" error={form.formState.errors.inscricaoMunicipal?.message}>
              <Input {...form.register('inscricaoMunicipal')} />
            </Field>
          </FormSection>

          <FormSection title="Contato" description="Dados de comunicação">
            <Field label="Contato Principal" error={form.formState.errors.nomeContatoPrincipal?.message}>
              <Input {...form.register('nomeContatoPrincipal')} placeholder="Ex.: João Silva" />
            </Field>
            <Field label="Telefone Fixo" error={form.formState.errors.telefone?.message}>
              <Input
                {...form.register('telefone')}
                value={telefoneValue}
                onChange={(event) =>
                  form.setValue('telefone', maskTelefone(event.target.value), { shouldDirty: true, shouldValidate: true })
                }
                placeholder="(11) 9999-9999"
              />
            </Field>
            <Field label="WhatsApp" error={form.formState.errors.whatsapp?.message}>
              <Input
                {...form.register('whatsapp')}
                value={whatsappValue}
                onChange={(event) =>
                  form.setValue('whatsapp', maskTelefone(event.target.value), { shouldDirty: true, shouldValidate: true })
                }
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="E-mail" error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register('email')} placeholder="Ex.: contato@empresa.com" />
            </Field>
            <Field label="E-mail Financeiro" error={form.formState.errors.emailFinanceiro?.message}>
              <Input type="email" {...form.register('emailFinanceiro')} placeholder="Ex.: financeiro@empresa.com" />
            </Field>
            <Field label="Site" error={form.formState.errors.site?.message}>
              <Input {...form.register('site')} placeholder="Ex.: www.empresa.com.br" />
            </Field>
          </FormSection>

          <FormSection title="Endereço" description="Dados de localização do fornecedor">
            <Field label="CEP" error={form.formState.errors.cep?.message}>
              <div className="relative">
                <Input
                  {...form.register('cep')}
                  value={cepValue}
                  placeholder="Ex.: 01001-000"
                  onChange={(event) => {
                    const masked = maskCep(event.target.value)
                    form.setValue('cep', masked, { shouldDirty: true, shouldValidate: true })
                    if (unmaskCep(masked).length === 8) void consultarCep(masked)
                  }}
                  onBlur={(event) => {
                    form.register('cep').onBlur(event)
                    void consultarCep(event.target.value)
                  }}
                />
                {cepLoading ? <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-cyan-200" /> : null}
              </div>
            </Field>
            <Field label="Logradouro" error={form.formState.errors.logradouro?.message}>
              <Input {...form.register('logradouro')} placeholder="Ex.: Rua das Peças" />
            </Field>
            <Field label="Número" error={form.formState.errors.numero?.message}>
              <Input {...form.register('numero')} />
            </Field>
            <Field label="Complemento" error={form.formState.errors.complemento?.message}>
              <Input {...form.register('complemento')} />
            </Field>
            <Field label="Bairro" error={form.formState.errors.bairro?.message}>
              <Input {...form.register('bairro')} />
            </Field>
            <Field label="Cidade" error={form.formState.errors.cidade?.message}>
              <Input {...form.register('cidade')} />
            </Field>
            <Field label="UF" error={form.formState.errors.estado?.message}>
              <Input {...form.register('estado')} placeholder="Ex.: SP" />
            </Field>
            {cepStatus ? (
              <Alert variant={cepStatus.startsWith('Não') || cepStatus.startsWith('Erro') ? 'warning' : 'info'} className="md:col-span-2">
                {cepStatus}
              </Alert>
            ) : null}
          </FormSection>

          <FormSection title="Comercial" description="Dados e condições de fornecimento">
             <Field label="Condição de Pagamento" error={form.formState.errors.condicaoPagamento?.message}>
              <Input {...form.register('condicaoPagamento')} placeholder="Ex.: 30/60/90" />
            </Field>
            <Field label="Prazo Médio Entrega (Dias)" error={form.formState.errors.prazoEntregaMedioDias?.message}>
              <Input {...form.register('prazoEntregaMedioDias')} placeholder="Ex.: 5" />
            </Field>
            <Field label="Limite Crédito R$" error={form.formState.errors.limiteCredito?.message}>
              <Input {...form.register('limiteCredito')} placeholder="Ex.: 15000.00" />
            </Field>
            <Field label="Avaliação Interna (1 a 5)" error={form.formState.errors.avaliacao?.message}>
              <Input {...form.register('avaliacao')} placeholder="Ex.: 5" />
            </Field>
            <Field label="Tipos de Fornecimento" className="md:col-span-2">
               <div className="flex flex-wrap gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" {...form.register('fornecePecas')} className="rounded border-slate-700 bg-slate-800" /> Peças
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" {...form.register('forneceServicos')} className="rounded border-slate-700 bg-slate-800" /> Serviços
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" {...form.register('forneceFerramentas')} className="rounded border-slate-700 bg-slate-800" /> Ferramentas
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" {...form.register('forneceInsumos')} className="rounded border-slate-700 bg-slate-800" /> Insumos
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" {...form.register('forneceTecnologia')} className="rounded border-slate-700 bg-slate-800" /> Tecnologia
                  </label>
               </div>
            </Field>
            <Field label="Observações Internas" error={form.formState.errors.observacoesInternas?.message} className="md:col-span-2">
              <Input {...form.register('observacoesInternas')} />
            </Field>
          </FormSection>

          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarFornecedor.isPending || atualizarFornecedor.isPending}>
              <Save className="h-4 w-4" />
              {criarFornecedor.isPending || atualizarFornecedor.isPending ? 'Salvando...' : 'Salvar Fornecedor'}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-slate-950/35 p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
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
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
