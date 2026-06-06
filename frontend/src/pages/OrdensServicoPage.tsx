import { useQuery } from '@tanstack/react-query'
import { FileText, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ColumnSelector } from '@/components/common/ColumnSelector'
import { useColumnVisibility } from '@/components/common/useColumnVisibility'
import { DataTable } from '@/components/common/DataTable'
import type { DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { numeroOrdemServico } from '@/lib/osDisplay'
import { formatCurrency, formatDate } from '@/lib/utils'
import { osService } from '@/services/os.service'
import type { OrdemServico } from '@/types/ordem-servico'

const columnOptions = [
  { key: 'numero', label: 'Número', required: true },
  { key: 'cliente', label: 'Cliente' },
  { key: 'veiculo', label: 'Veículo' },
  { key: 'placa', label: 'Placa' },
  { key: 'status', label: 'Status' },
  { key: 'data', label: 'Data' },
  { key: 'valor', label: 'Valor' },
  { key: 'pagamento', label: 'Pagamento' },
  { key: 'documentos', label: 'Documentos', required: true },
]

function getNumeroOS(os: OrdemServico) {
  return numeroOrdemServico(os)
}

export function OrdensServicoPage() {
  const [search, setSearch] = useState('')
  const columns = useColumnVisibility('columns.os', columnOptions)
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['ordens-servico'],
    queryFn: osService.listar,
  })

  if (isLoading) return <LoadingState label="Carregando Ordens de Serviço..." />
  if (isError) return <ErrorState message={error.message} />

  const ordens = data ?? []
  const termo = search.trim().toLowerCase()
  const ordensFiltradas = ordens.filter((os) =>
    [
      getNumeroOS(os),
      os.cliente?.nome,
      os.veiculo?.modelo,
      os.veiculo?.placa,
      os.modeloVeiculo,
      os.placaVeiculo,
      os.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(termo),
  )

  const tableColumns: Array<DataTableColumn<OrdemServico>> = [
    { key: 'numero', header: 'Número', render: (row) => getNumeroOS(row) },
    { key: 'cliente', header: 'Cliente', render: (row) => row.cliente?.nome || '-' },
    {
      key: 'veiculo',
      header: 'Veículo',
      render: (row) => row.veiculo?.modelo || row.modeloVeiculo || row.veiculo?.placa || row.placaVeiculo || '-',
    },
    { key: 'placa', header: 'Placa', render: (row) => row.veiculo?.placa || row.placaVeiculo || '-' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'data', header: 'Data', render: (row) => formatDate(row.criadoEm) },
    { key: 'valor', header: 'Valor', render: (row) => formatCurrency(row.valorFinal) },
    {
      key: 'pagamento',
      header: 'Pagamento',
      render: (row) => <StatusBadge status={row.statusFinanceiro || (row.status === 'PAGO' ? 'PAGO' : 'PENDENTE')} />,
    },
    {
      key: 'documentos',
      header: 'Documentos',
      render: (row) => (
        <Link to={`/os/${row.id}#documentos`}>
          <Button type="button" variant="secondary">
            <FileText className="h-4 w-4" />
            Documentos
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        title="Ordens de Serviço"
        description="Acompanhamento das OS abertas, em execução, concluídas e pagas."
        actions={
          <>
            <ColumnSelector options={columnOptions} visibleKeys={columns.visibleKeys} onToggle={columns.toggleColumn} />
            <Button type="button" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Link to="/os/nova">
              <Button type="button" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova OS
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 max-w-md">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por OS, cliente, veículo ou status" />
      </div>

      {ordens.length === 0 ? (
        <EmptyState title="Nenhuma OS encontrada" message="Crie uma nova Ordem de Serviço para iniciar o fluxo." />
      ) : ordensFiltradas.length === 0 ? (
        <EmptyState title="Nenhuma OS encontrada" message="Ajuste a busca para ver outras ordens." />
      ) : (
        <DataTable data={ordensFiltradas} getRowKey={(row) => row.id} columns={columns.filterColumns(tableColumns)} />
      )}
    </section>
  )
}
