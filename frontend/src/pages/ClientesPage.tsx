import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Loader2, Plus, RefreshCw, Save } from 'lucide-react'
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
import { documentoCliente, possuiGrupoVeiculos, rotuloGrupoVeiculos, tipoCliente, totalVeiculosCliente } from '@/lib/clientes'
import { maskCep, maskCpfCnpj, maskTelefone, unmaskCep } from '@/lib/masks'
import { clienteSchema } from '@/schemas/cliente.schema'
import { buscarEnderecoPorCep } from '@/services/cep.service'
import { clientesService } from '@/services/clientes.service'
import type { Cliente } from '@/types/cliente'
import { CrmClientInteractions } from '@/components/crm/CrmClientInteractions'

type ClienteForm = z.infer<typeof clienteSchema>

const columnOptions = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'documento', label: 'CPF/CNPJ' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'totalVeiculos', label: 'Veículos' },
  { key: 'grupoFrota', label: 'Grupo/Frota' },
  { key: 'email', label: 'Email' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'acoes', label: 'Ações', required: true },
]

const emptyCliente: ClienteForm = {
  nome: '',
  cpf_cnpj: '',
  telefone: '',
  email: '',
  cep: '',
  bairro: '',
  rua: '',
  numero: '',
  complemento: '',
  cidade: '',
  estado: '',
}

function toClienteForm(cliente: Cliente): ClienteForm {
  const documento = documentoCliente(cliente)
  return {
    nome: cliente.nome || '',
    cpf_cnpj: documento ? maskCpfCnpj(documento) : '',
    telefone: maskTelefone(cliente.telefone || ''),
    email: cliente.email || '',
    cep: maskCep(cliente.cep || ''),
    bairro: cliente.bairro || '',
    rua: cliente.rua || '',
    numero: cliente.numero || '',
    complemento: cliente.complemento || '',
    cidade: cliente.cidade || '',
    estado: cliente.estado || '',
  }
}

export function ClientesPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState('')
  const [formError, setFormError] = useState('')
  const [cepStatus, setCepStatus] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const lastCepConsultedRef = useRef('')
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: clientesService.listar })
  const columns = useColumnVisibility('columns.clientes', columnOptions)
  const form = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: emptyCliente,
  })
  const cpfCnpjValue = form.watch('cpf_cnpj') || ''
  const telefoneValue = form.watch('telefone') || ''
  const cepValue = form.watch('cep') || ''

  const criarCliente = useMutation({
    mutationFn: clientesService.criar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setFeedback('Cliente criado com sucesso.')
      closeDialog()
    },
    onError: (error) => {
      setFeedback('')
      setFormError(error.message)
    },
  })

  const atualizarCliente = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ClienteForm }) => clientesService.atualizar(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setFeedback('Cliente atualizado com sucesso.')
      closeDialog()
    },
    onError: (error) => {
      setFeedback('')
      setFormError(error.message)
    },
  })

  function openCreate() {
    setEditingCliente(null)
    setFormError('')
    setCepStatus('')
    lastCepConsultedRef.current = ''
    form.reset(emptyCliente)
    setOpen(true)
  }

  function openEdit(cliente: Cliente) {
    setEditingCliente(cliente)
    setFormError('')
    setCepStatus('')
    lastCepConsultedRef.current = ''
    form.reset(toClienteForm(cliente))
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setEditingCliente(null)
    setFormError('')
    setCepStatus('')
    lastCepConsultedRef.current = ''
    form.reset(emptyCliente)
  }

  async function consultarCep(cep: string) {
    const digits = unmaskCep(cep)
    if (!digits) {
      setCepStatus('')
      return
    }
    if (digits.length !== 8) {
      setCepStatus('Informe um CEP com 8 dígitos ou preencha o endereço manualmente.')
      return
    }
    if (lastCepConsultedRef.current === digits) return

    lastCepConsultedRef.current = digits
    setCepLoading(true)
    setCepStatus('Buscando endereço...')
    try {
      const endereco = await buscarEnderecoPorCep(digits)
      form.setValue('cep', maskCep(endereco.cep), { shouldDirty: true })
      form.setValue('rua', endereco.logradouro, { shouldDirty: true })
      form.setValue('bairro', endereco.bairro, { shouldDirty: true })
      form.setValue('cidade', endereco.cidade, { shouldDirty: true })
      form.setValue('estado', endereco.uf, { shouldDirty: true })
      const complementoAtual = form.getValues('complemento')?.trim()
      const complementoCep = endereco.complemento?.trim()
      if (!complementoAtual && complementoCep) {
        form.setValue('complemento', complementoCep, { shouldDirty: true })
      }
      setCepStatus('Endereço preenchido automaticamente pelo CEP.')
    } catch (error) {
      lastCepConsultedRef.current = ''
      setCepStatus(error instanceof Error ? error.message : 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.')
    } finally {
      setCepLoading(false)
    }
  }

  function onSubmit(values: ClienteForm) {
    setFormError('')
    if (editingCliente) {
      atualizarCliente.mutate({ id: editingCliente.id, values })
      return
    }
    criarCliente.mutate(values)
  }

  if (clientes.isLoading) return <LoadingState label="Carregando clientes..." />
  if (clientes.isError) return <ErrorState message={clientes.error.message} />

  const clientesLista = clientes.data ?? []
  const termo = search.trim().toLowerCase()
  const clientesFiltrados = clientesLista.filter((cliente) =>
    [cliente.nome, documentoCliente(cliente), tipoCliente(cliente), cliente.telefone, cliente.email, cliente.cidade, cliente.estado]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(termo),
  )

  const tableColumns: Array<DataTableColumn<Cliente>> = [
    { key: 'nome', header: 'Nome', render: (row) => row.nome },
    { key: 'documento', header: 'CPF/CNPJ', render: (row) => maskCpfCnpj(documentoCliente(row)) || '-' },
    { key: 'tipo', header: 'Tipo', render: (row) => tipoCliente(row) },
    { key: 'telefone', header: 'Telefone', render: (row) => maskTelefone(row.telefone || '') || '-' },
    { key: 'totalVeiculos', header: 'Veículos', render: (row) => totalVeiculosCliente(row) },
    {
      key: 'grupoFrota',
      header: 'Grupo/Frota',
      render: (row) => (
        <Badge className={possuiGrupoVeiculos(row) ? 'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}>
          {rotuloGrupoVeiculos(row)}
        </Badge>
      ),
    },
    { key: 'email', header: 'Email', render: (row) => row.email || '-' },
    {
      key: 'cidade',
      header: 'Cidade',
      render: (row) => [row.cidade, row.estado].filter(Boolean).join(' / ') || '-',
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <Button type="button" variant="secondary" onClick={() => openEdit(row)}>
          <Edit className="h-4 w-4" />
          Editar
        </Button>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes usados nas Ordens de Serviço e no caixa."
        actions={
          <>
            <ColumnSelector options={columnOptions} visibleKeys={columns.visibleKeys} onToggle={columns.toggleColumn} />
            <Button type="button" variant="secondary" onClick={() => clientes.refetch()} disabled={clientes.isFetching}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo cliente
            </Button>
          </>
        }
      />

      {feedback ? <Alert variant="success" className="mb-4">{feedback}</Alert> : null}

      <div className="mb-4 max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, documento, telefone ou email"
        />
      </div>

      {clientesLista.length === 0 ? (
        <EmptyState title="Nenhum cliente cadastrado" message="Crie o primeiro cliente para abrir uma OS." />
      ) : clientesFiltrados.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" message="Ajuste a busca para ver outros clientes." />
      ) : (
        <DataTable data={clientesFiltrados} getRowKey={(row) => row.id} columns={columns.filterColumns(tableColumns)} />
      )}

      <Dialog
        open={open}
        title={editingCliente ? 'Editar cliente' : 'Novo cliente'}
        description="Organize identificação, contato e endereço para uso nas Ordens de Serviço."
        onClose={closeDialog}
        contentClassName="max-w-4xl"
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormSection title="Identificação" description="Dados principais do cliente ou da razão social.">
            <Field label="Nome completo / Razão social" error={form.formState.errors.nome?.message} className="md:col-span-2">
              <Input {...form.register('nome')} placeholder="Ex.: Daniel Barros Almeida" />
            </Field>
            <Field label="CPF/CNPJ" error={form.formState.errors.cpf_cnpj?.message}>
              <Input
                {...form.register('cpf_cnpj')}
                value={cpfCnpjValue}
                onChange={(event) =>
                  form.setValue('cpf_cnpj', maskCpfCnpj(event.target.value), { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Ex.: 000.000.000-00"
              />
              <p className="text-xs text-muted-foreground">Digite somente números ou cole o documento completo.</p>
            </Field>
          </FormSection>

          <FormSection title="Contato" description="Informações usadas para atendimento e retorno da oficina.">
            <Field label="Telefone" error={form.formState.errors.telefone?.message}>
              <Input
                {...form.register('telefone')}
                value={telefoneValue}
                onChange={(event) =>
                  form.setValue('telefone', maskTelefone(event.target.value), { shouldDirty: true, shouldValidate: true })
                }
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="E-mail" error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register('email')} placeholder="Ex.: cliente@email.com" />
            </Field>
          </FormSection>

          <FormSection title="Endereço" description="Digite o CEP para preencher rua, bairro, cidade e UF automaticamente.">
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
            <Field label="Rua / Logradouro" error={form.formState.errors.rua?.message}>
              <Input {...form.register('rua')} placeholder="Ex.: Praça da Sé" />
            </Field>
            <Field label="Número" error={form.formState.errors.numero?.message}>
              <Input {...form.register('numero')} placeholder="Ex.: 100" autoComplete="off" />
              <p className="text-xs text-muted-foreground">Informe o número do endereço.</p>
            </Field>
            <Field label="Complemento" error={form.formState.errors.complemento?.message}>
              <Input {...form.register('complemento')} placeholder="Ex.: Apto 12, bloco B, sala 3" autoComplete="off" />
            </Field>
            <Field label="Bairro" error={form.formState.errors.bairro?.message}>
              <Input {...form.register('bairro')} placeholder="Ex.: Centro" />
            </Field>
            <Field label="Cidade" error={form.formState.errors.cidade?.message}>
              <Input {...form.register('cidade')} placeholder="Ex.: São Paulo" />
            </Field>
            <Field label="Estado / UF" error={form.formState.errors.estado?.message}>
              <Input {...form.register('estado')} placeholder="Ex.: SP" />
            </Field>
            {cepStatus ? (
              <Alert variant={cepStatus.startsWith('Não') ? 'warning' : 'info'} className="md:col-span-2">
                {cepStatus}
              </Alert>
            ) : null}
          </FormSection>

          {editingCliente && (
            <FormSection title="Relacionamento / CRM" description="Histórico de contatos e interações com este cliente.">
              <div className="md:col-span-2">
                <CrmClientInteractions clienteId={editingCliente.id} />
              </div>
            </FormSection>
          )}

          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarCliente.isPending || atualizarCliente.isPending}>
              <Save className="h-4 w-4" />
              {criarCliente.isPending || atualizarCliente.isPending ? 'Salvando...' : 'Salvar cliente'}
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
