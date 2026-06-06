import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Edit, ListFilter, Plus, RefreshCw, Save } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
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
import { Select } from '@/components/ui/select'
import { possuiGrupoVeiculos, rotuloGrupoVeiculos, tipoCliente, totalVeiculosCliente } from '@/lib/clientes'
import { maskKm, maskPlaca, normalizePlaca } from '@/lib/masks'
import { veiculoSchema } from '@/schemas/veiculo.schema'
import { clientesService } from '@/services/clientes.service'
import { veiculosService } from '@/services/veiculos.service'
import type { Veiculo } from '@/types/veiculo'

type VeiculoFormInput = z.input<typeof veiculoSchema>
type VeiculoForm = z.output<typeof veiculoSchema>

const columnOptions = [
  { key: 'placa', label: 'Placa', required: true },
  { key: 'cliente', label: 'Cliente' },
  { key: 'tipoCliente', label: 'Tipo cliente' },
  { key: 'grupoFrota', label: 'Grupo/Frota' },
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'ano', label: 'Ano' },
  { key: 'km', label: 'Quilometragem' },
  { key: 'cor', label: 'Cor' },
  { key: 'acoes', label: 'Ações', required: true },
]

const emptyVeiculo: VeiculoFormInput = {
  clienteId: '',
  marca: '',
  modelo: '',
  placa: '',
  ano: '',
  cor: '',
  quilometragem: '',
}

function toVeiculoForm(veiculo: Veiculo): VeiculoFormInput {
  return {
    clienteId: veiculo.clienteId || veiculo.cliente_id || veiculo.cliente?.id || '',
    marca: veiculo.marca || '',
    modelo: veiculo.modelo || '',
    placa: maskPlaca(veiculo.placa || ''),
    ano: veiculo.ano || '',
    cor: veiculo.cor || '',
    quilometragem: veiculo.quilometragem ?? '',
  }
}

function toPayload(values: VeiculoForm) {
  return {
    ...values,
    placa: normalizePlaca(values.placa),
    quilometragem:
      values.quilometragem === '' || values.quilometragem === undefined ? undefined : Number(values.quilometragem),
  }
}

export function VeiculosPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState('')
  const [formError, setFormError] = useState('')
  const [modoCadastro, setModoCadastro] = useState<'unico' | 'grupo'>('unico')
  const [cadastroSequencial, setCadastroSequencial] = useState<{ clienteId: string; totalVeiculos: number } | null>(null)
  const veiculos = useQuery({ queryKey: ['veiculos'], queryFn: veiculosService.listar })
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: clientesService.listar })
  const columns = useColumnVisibility('columns.veiculos', columnOptions)
  const form = useForm<VeiculoFormInput, unknown, VeiculoForm>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: emptyVeiculo,
  })
  const placaValue = form.watch('placa') || ''
  const clienteIdValue = form.watch('clienteId') || ''

  const criarVeiculo = useMutation({
    mutationFn: veiculosService.criar,
    onSuccess: async (veiculoCriado, payload) => {
      await queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      await queryClient.invalidateQueries({ queryKey: ['clientes'] })
      if (modoCadastro === 'grupo') {
        const totalAtual = Number(veiculoCriado.cliente?.totalVeiculos ?? 0)
        setCadastroSequencial({
          clienteId: payload.clienteId,
          totalVeiculos: totalAtual > 0 ? totalAtual : 1,
        })
        setFeedback('Veículo criado com sucesso. Você pode cadastrar outro para o mesmo cliente.')
        return
      }
      setFeedback('Veículo criado com sucesso.')
      closeDialog()
    },
    onError: (error) => {
      setFeedback('')
      setFormError(error.message)
    },
  })

  const atualizarVeiculo = useMutation({
    mutationFn: ({ id, values }: { id: string; values: VeiculoForm }) => veiculosService.atualizar(id, toPayload(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      await queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setFeedback('Veículo atualizado com sucesso.')
      closeDialog()
    },
    onError: (error) => {
      setFeedback('')
      setFormError(error.message)
    },
  })

  function openCreate() {
    setEditingVeiculo(null)
    setFormError('')
    setModoCadastro('unico')
    setCadastroSequencial(null)
    form.reset(emptyVeiculo)
    setOpen(true)
  }

  function openEdit(veiculo: Veiculo) {
    setEditingVeiculo(veiculo)
    setFormError('')
    setModoCadastro('unico')
    setCadastroSequencial(null)
    form.reset(toVeiculoForm(veiculo))
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setEditingVeiculo(null)
    setFormError('')
    setModoCadastro('unico')
    setCadastroSequencial(null)
    form.reset(emptyVeiculo)
  }

  function cadastrarOutroVeiculo() {
    if (!cadastroSequencial) return
    form.reset({ ...emptyVeiculo, clienteId: cadastroSequencial.clienteId })
    setFormError('')
    setCadastroSequencial(null)
  }

  function verVeiculosDoCliente(nomeCliente: string) {
    setSearch(nomeCliente)
    closeDialog()
  }

  function onSubmit(values: VeiculoForm) {
    setFormError('')
    if (editingVeiculo) {
      atualizarVeiculo.mutate({ id: editingVeiculo.id, values })
      return
    }
    criarVeiculo.mutate(toPayload(values))
  }

  if (veiculos.isLoading || clientes.isLoading) return <LoadingState label="Carregando veículos..." />
  if (veiculos.isError) return <ErrorState message={veiculos.error.message} />
  if (clientes.isError) return <ErrorState message={clientes.error.message} />

  const veiculosLista = veiculos.data ?? []
  const clientesLista = clientes.data ?? []
  const clienteSelecionado = clientesLista.find((cliente) => cliente.id === clienteIdValue) ?? null
  const clienteSequencial = cadastroSequencial
    ? clientesLista.find((cliente) => cliente.id === cadastroSequencial.clienteId) ?? clienteSelecionado
    : clienteSelecionado
  const clienteDoVeiculo = (veiculo: Veiculo) =>
    veiculo.cliente ?? clientesLista.find((cliente) => cliente.id === (veiculo.clienteId || veiculo.cliente_id)) ?? null
  const termo = search.trim().toLowerCase()
  const veiculosFiltrados = veiculosLista.filter((veiculo) =>
    [
      veiculo.placa,
      veiculo.cliente_nome,
      veiculo.cliente?.nome,
      tipoCliente(clienteDoVeiculo(veiculo)),
      rotuloGrupoVeiculos(clienteDoVeiculo(veiculo)),
      veiculo.marca,
      veiculo.modelo,
      veiculo.ano,
      veiculo.quilometragem,
      veiculo.cor,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(termo),
  )

  const tableColumns: Array<DataTableColumn<Veiculo>> = [
    { key: 'placa', header: 'Placa', render: (row) => maskPlaca(row.placa) },
    { key: 'cliente', header: 'Cliente', render: (row) => row.cliente_nome || row.cliente?.nome || '-' },
    { key: 'tipoCliente', header: 'Tipo cliente', render: (row) => tipoCliente(clienteDoVeiculo(row)) },
    {
      key: 'grupoFrota',
      header: 'Grupo/Frota',
      render: (row) => {
        const cliente = clienteDoVeiculo(row)
        return (
          <Badge className={possuiGrupoVeiculos(cliente) ? 'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}>
            {rotuloGrupoVeiculos(cliente)}
          </Badge>
        )
      },
    },
    { key: 'marca', header: 'Marca', render: (row) => row.marca || '-' },
    { key: 'modelo', header: 'Modelo', render: (row) => row.modelo || '-' },
    { key: 'ano', header: 'Ano', render: (row) => row.ano || '-' },
    { key: 'km', header: 'Quilometragem', render: (row) => (row.quilometragem ? `${maskKm(row.quilometragem)} km` : '-') },
    { key: 'cor', header: 'Cor', render: (row) => row.cor || '-' },
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
        title="Veículos"
        description="Veículos vinculados aos clientes para abertura de Ordens de Serviço."
        actions={
          <>
            <ColumnSelector options={columnOptions} visibleKeys={columns.visibleKeys} onToggle={columns.toggleColumn} />
            <Button type="button" variant="secondary" onClick={() => veiculos.refetch()} disabled={veiculos.isFetching}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo veículo
            </Button>
          </>
        }
      />

      {feedback ? <Alert variant="success" className="mb-4">{feedback}</Alert> : null}

      <div className="mb-4 max-w-md">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por placa, cliente, marca ou modelo" />
      </div>

      {veiculosLista.length === 0 ? (
        <EmptyState title="Nenhum veículo cadastrado" message="Cadastre veículos vinculados aos clientes." />
      ) : veiculosFiltrados.length === 0 ? (
        <EmptyState title="Nenhum veículo encontrado" message="Ajuste a busca para ver outros veículos." />
      ) : (
        <DataTable data={veiculosFiltrados} getRowKey={(row) => row.id} columns={columns.filterColumns(tableColumns)} />
      )}

      <Dialog
        open={open}
        title={editingVeiculo ? 'Editar veículo' : 'Novo veículo'}
        description="Vincule o veículo ao cliente e mantenha os dados operacionais prontos para a OS."
        onClose={closeDialog}
        contentClassName="max-w-4xl"
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormSection title="Vínculo com cliente" description="Selecione o responsável pelo veículo no cadastro.">
            <Field label="Cliente" error={form.formState.errors.clienteId?.message} className="md:col-span-2">
              <Select {...form.register('clienteId', { onChange: () => setCadastroSequencial(null) })}>
                <option value="">Selecione um cliente</option>
                {(clientes.data ?? []).map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </Select>
            </Field>
            {!editingVeiculo && clienteSelecionado ? (
              <div className="space-y-3 md:col-span-2">
                <Label>Este cliente possui mais de um veículo para cadastrar?</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                    <input
                      type="radio"
                      name="modoCadastroVeiculo"
                      checked={modoCadastro === 'unico'}
                      onChange={() => {
                        setModoCadastro('unico')
                        setCadastroSequencial(null)
                      }}
                    />
                    <span>Apenas 1 veículo</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                    <input
                      type="radio"
                      name="modoCadastroVeiculo"
                      checked={modoCadastro === 'grupo'}
                      onChange={() => setModoCadastro('grupo')}
                    />
                    <span>Mais de 1 veículo / grupo de veículos</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Veículos atuais: {totalVeiculosCliente(clienteSelecionado)} | Grupo/Frota: {rotuloGrupoVeiculos(clienteSelecionado)}
                </p>
              </div>
            ) : null}
          </FormSection>

          <FormSection title="Identificação do veículo" description="Dados usados na recepção, OS e histórico de atendimento.">
            <Field label="Placa" error={form.formState.errors.placa?.message}>
              <Input
                {...form.register('placa')}
                value={placaValue}
                onChange={(event) => form.setValue('placa', maskPlaca(event.target.value), { shouldDirty: true, shouldValidate: true })}
                placeholder="Ex.: ABC-1234 ou ABC1D23"
              />
              <p className="text-xs text-muted-foreground">Aceita placa antiga e Mercosul.</p>
            </Field>
            <Field label="Marca" error={form.formState.errors.marca?.message}>
              <Input {...form.register('marca')} placeholder="Ex.: Chevrolet" />
            </Field>
            <Field label="Modelo" error={form.formState.errors.modelo?.message}>
              <Input {...form.register('modelo')} placeholder="Ex.: Onix 1.0 Turbo" />
            </Field>
            <Field label="Ano" error={form.formState.errors.ano?.message}>
              <Input {...form.register('ano')} placeholder="Ex.: 2020" />
            </Field>
            <Field label="Cor do veículo" error={form.formState.errors.cor?.message}>
              <Input {...form.register('cor')} placeholder="Ex.: Prata" />
              <p className="text-xs text-muted-foreground">Ex.: Prata, Preto, Branco.</p>
            </Field>
          </FormSection>

          <FormSection title="Controle operacional" description="Informações úteis para manutenção, diagnóstico e acompanhamento.">
            <Field label="Quilometragem" error={form.formState.errors.quilometragem?.message}>
              <Input type="number" min={0} {...form.register('quilometragem')} placeholder="Ex.: 85000" />
              <p className="text-xs text-muted-foreground">Informe a quilometragem atual aproximada.</p>
            </Field>
          </FormSection>

          {cadastroSequencial && clienteSequencial ? (
            <Alert variant="success">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">Veículo salvo para {clienteSequencial.nome}.</p>
                  <p className="text-sm">
                    Total atual de veículos vinculados: {cadastroSequencial.totalVeiculos}. Cliente com múltiplos veículos.
                    Estrutura preparada para agendamentos por grupo/frota.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={cadastrarOutroVeiculo}>
                    <Plus className="h-4 w-4" />
                    Cadastrar outro veículo para este cliente
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => verVeiculosDoCliente(clienteSequencial.nome)}>
                    <ListFilter className="h-4 w-4" />
                    Ver veículos deste cliente
                  </Button>
                  <Link to="/os/nova">
                    <Button type="button" variant="secondary">
                      <ClipboardList className="h-4 w-4" />
                      Ir para Ordens de Serviço
                    </Button>
                  </Link>
                </div>
              </div>
            </Alert>
          ) : null}

          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              {cadastroSequencial ? 'Concluir' : 'Cancelar'}
            </Button>
            {!cadastroSequencial ? (
              <Button type="submit" disabled={criarVeiculo.isPending || atualizarVeiculo.isPending}>
                <Save className="h-4 w-4" />
                {criarVeiculo.isPending || atualizarVeiculo.isPending ? 'Salvando...' : 'Salvar veículo'}
              </Button>
            ) : null}
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
