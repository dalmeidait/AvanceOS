import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { playNewOsSound } from '@/lib/audio'
import { possuiGrupoVeiculos, rotuloGrupoVeiculos, totalVeiculosCliente } from '@/lib/clientes'
import { novaOSSchema } from '@/schemas/os.schema'
import { authService } from '@/services/auth.service'
import { clientesService } from '@/services/clientes.service'
import { osService } from '@/services/os.service'
import { veiculosService } from '@/services/veiculos.service'
import type { StatusOS } from '@/types/ordem-servico'

type NovaOSForm = z.infer<typeof novaOSSchema>

export function NovaOSPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const [submitError, setSubmitError] = useState('')

  const clientes = useQuery({ queryKey: ['clientes'], queryFn: clientesService.listar })
  const veiculos = useQuery({ queryKey: ['veiculos'], queryFn: veiculosService.listar })

  const form = useForm<NovaOSForm>({
    resolver: zodResolver(novaOSSchema),
    defaultValues: { clienteId: '', veiculoId: '', descricao: '', diagnostico: '', relatoMecanico: '', status: 'ABERTA' },
  })

  const clienteId = form.watch('clienteId')
  const veiculoId = form.watch('veiculoId')
  const veiculosFiltrados = useMemo(
    () =>
      (veiculos.data ?? []).filter((veiculo) => {
        const vinculo = veiculo.clienteId || veiculo.cliente_id || veiculo.cliente?.id
        return vinculo === clienteId
      }),
    [clienteId, veiculos.data],
  )
  const veiculoSelecionado = useMemo(
    () => (veiculos.data ?? []).find((veiculo) => veiculo.id === veiculoId),
    [veiculoId, veiculos.data],
  )
  const clienteSelecionado = useMemo(
    () => (clientes.data ?? []).find((cliente) => cliente.id === clienteId) ?? veiculoSelecionado?.cliente ?? null,
    [clienteId, clientes.data, veiculoSelecionado],
  )

  const criarOS = useMutation({
    mutationFn: osService.criar,
    onSuccess: async (os) => {
      await queryClient.invalidateQueries({ queryKey: ['ordens-servico'] })
      playNewOsSound()
      navigate(`/os/${os.id}`)
    },
    onError: (error) => setSubmitError(error.message),
  })

  function onSubmit(values: NovaOSForm) {
    setSubmitError('')
    const veiculo = veiculos.data?.find((item) => item.id === values.veiculoId)
    criarOS.mutate({
      ...values,
      status: values.status as StatusOS,
      responsavelId: usuario?.id,
      placaVeiculo: veiculo?.placa,
      modeloVeiculo: [veiculo?.marca, veiculo?.modelo].filter(Boolean).join(' '),
    })
  }

  if (clientes.isLoading || veiculos.isLoading) return <LoadingState label="Carregando clientes e veículos..." />
  if (clientes.isError) return <ErrorState message={clientes.error.message} />
  if (veiculos.isError) return <ErrorState message={veiculos.error.message} />

  return (
    <section>
      <PageHeader
        title="Nova Ordem de Serviço"
        description="Abra uma OS vinculada a um cliente e veículo cadastrados."
        actions={
          <Link to="/os">
            <Button type="button" variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent>
          <form className="grid grid-cols-2 gap-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="clienteId">Cliente</Label>
              <Select
                id="clienteId"
                {...form.register('clienteId', {
                  onChange: () => form.setValue('veiculoId', ''),
                })}
              >
                <option value="">Selecione</option>
                {(clientes.data ?? []).map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </Select>
              {form.formState.errors.clienteId ? (
                <p className="text-sm text-red-300">{form.formState.errors.clienteId.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="veiculoId">Veículo</Label>
              <Select id="veiculoId" {...form.register('veiculoId')}>
                <option value="">Selecione</option>
                {veiculosFiltrados.map((veiculo) => (
                  <option key={veiculo.id} value={veiculo.id}>
                    {veiculo.placa} - {[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}
                  </option>
                ))}
              </Select>
              {clienteId && veiculosFiltrados.length === 0 ? (
                <p className="text-sm text-amber-200">Nenhum veículo vinculado a este cliente.</p>
              ) : null}
              {form.formState.errors.veiculoId ? (
                <p className="text-sm text-red-300">{form.formState.errors.veiculoId.message}</p>
              ) : null}
            </div>

            {veiculoSelecionado ? (
              <div className="col-span-2 space-y-3">
                <div className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/8 p-4 text-sm md:grid-cols-6">
                  <ResumoVeiculo label="Marca" value={veiculoSelecionado.marca || '-'} />
                  <ResumoVeiculo label="Modelo" value={veiculoSelecionado.modelo || '-'} />
                  <ResumoVeiculo label="Placa" value={veiculoSelecionado.placa || '-'} />
                  <ResumoVeiculo label="Cor" value={veiculoSelecionado.cor || '-'} />
                  <ResumoVeiculo
                    label="Quilometragem"
                    value={
                      veiculoSelecionado.quilometragem === null || veiculoSelecionado.quilometragem === undefined
                        ? '-'
                        : String(veiculoSelecionado.quilometragem)
                    }
                  />
                  <ResumoVeiculo label="Grupo/Frota" value={rotuloGrupoVeiculos(clienteSelecionado)} />
                </div>
                {possuiGrupoVeiculos(clienteSelecionado) ? (
                  <Alert variant="info">
                    Este veiculo pertence a {rotuloGrupoVeiculos(clienteSelecionado).toLowerCase()} deste cliente.
                    Total de veiculos do cliente: {totalVeiculosCliente(clienteSelecionado)}.
                  </Alert>
                ) : null}
              </div>
            ) : null}

            <div className="col-span-2 space-y-2">
              <Label htmlFor="descricao">Relato inicial</Label>
              <Textarea id="descricao" {...form.register('descricao')} />
              {form.formState.errors.descricao ? (
                <p className="text-sm text-red-300">{form.formState.errors.descricao.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status inicial</Label>
              <Select id="status" {...form.register('status')}>
                <option value="ABERTA">Aberta</option>
                <option value="EM_DIAGNOSTICO">Em diagnóstico</option>
                <option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnostico">Diagnóstico inicial</Label>
              <Textarea id="diagnostico" {...form.register('diagnostico')} placeholder="Opcional" />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="relatoMecanico">Observações internas</Label>
              <Textarea id="relatoMecanico" {...form.register('relatoMecanico')} placeholder="Opcional" />
            </div>

            {submitError ? (
              <Alert variant="error" className="col-span-2">{submitError}</Alert>
            ) : null}

            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={criarOS.isPending}>
                <Save className="h-4 w-4" />
                {criarOS.isPending ? 'Criando...' : 'Criar OS'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

function ResumoVeiculo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">{label}</p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  )
}
