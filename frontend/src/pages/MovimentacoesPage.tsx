import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, getApiErrorMessage } from '@/lib/utils'
import { movimentacoesService } from '@/services/movimentacoes.service'
import type { Movimentacao } from '@/types/movimentacao'

const MOVIMENTACOES_QUERY_KEY = ['movimentacoes'] as const
const REFRESH_ERROR_MESSAGE = 'Não foi possível atualizar agora. Exibindo os dados carregados anteriormente.'

export function MovimentacoesPage() {
  const [search, setSearch] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const movimentacoes = useQuery({
    queryKey: MOVIMENTACOES_QUERY_KEY,
    queryFn: () => movimentacoesService.listarHistorico(),
    placeholderData: (previousData: Movimentacao[] | undefined) => previousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

  async function handleRefresh() {
    setRefreshError('')
    const result = await movimentacoes.refetch()
    setRefreshError(result.isError ? REFRESH_ERROR_MESSAGE : '')
  }

  if (movimentacoes.isLoading) return <LoadingState label="Carregando movimentações..." />
  const data = movimentacoes.data ?? []

  if (movimentacoes.isError && data.length === 0) return <ErrorState message={getApiErrorMessage(movimentacoes.error)} />
  const termo = search.trim().toLowerCase()
  const movimentacoesFiltradas = data.filter((movimentacao) =>
    [
      movimentacao.produto?.nome,
      movimentacao.product?.nome,
      movimentacao.produto?.sku,
      movimentacao.product?.sku,
      movimentacao.type || movimentacao.tipo,
      movimentacao.quantity ?? movimentacao.quantidade,
      movimentacao.reason || movimentacao.justificativa,
      movimentacao.osReferencia,
      movimentacao.cliente?.nome,
      movimentacao.veiculo?.modelo,
      movimentacao.usuario?.nome,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(termo),
  )

  return (
    <section>
      <PageHeader
        title="Movimentações de Estoque"
        description="Histórico consolidado pelas movimentações registradas em produtos."
        actions={
          <>
            <Link to="/produtos">
              <Button type="button" variant="secondary">
                Nova movimentação
              </Button>
            </Link>
            <Button type="button" onClick={() => void handleRefresh()} disabled={movimentacoes.isFetching}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </>
        }
      />

      <Alert variant="info" className="mb-4">
        Para registrar uma nova movimentação, acesse Produtos e clique em Movimentar no produto desejado.
      </Alert>
      {movimentacoes.isFetching && !movimentacoes.isLoading ? (
        <Alert variant="info" className="mb-4">Atualizando movimentações...</Alert>
      ) : null}
      {refreshError && data.length > 0 ? (
        <Alert variant="warning" className="mb-4">{refreshError}</Alert>
      ) : null}

      <div className="mb-4 max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por produto, SKU, tipo ou justificativa"
        />
      </div>

      {data.length === 0 ? (
        <EmptyState title="Nenhuma movimentação encontrada" message="Movimente um produto para ver o histórico aqui." />
      ) : movimentacoesFiltradas.length === 0 ? (
        <EmptyState title="Nenhuma movimentação encontrada" message="Ajuste a busca para ver outros registros." />
      ) : (
        <DataTable
          data={movimentacoesFiltradas}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'produto', header: 'Produto', render: (row) => row.product?.nome || row.produto?.nome || '-' },
            { key: 'sku', header: 'SKU', render: (row) => row.product?.sku || row.produto?.sku || '-' },
            { key: 'tipo', header: 'Tipo', render: (row) => <StatusBadge status={row.type || row.tipo} /> },
            { key: 'quantidade', header: 'Quantidade', render: (row) => row.quantity ?? row.quantidade ?? 0 },
            { key: 'anterior', header: 'Anterior', render: (row) => row.previousQuantity ?? '-' },
            { key: 'posterior', header: 'Posterior', render: (row) => row.newQuantity ?? '-' },
            { key: 'data', header: 'Data', render: (row) => formatDate(row.createdAt || row.timestamp || row.criadoEm) },
            {
              key: 'os',
              header: 'OS',
              render: (row) => {
                const os = row.ordemServico || row.os
                if (!os?.id) return row.osReferencia || row.serviceOrderNumber || '-'
                return (
                  <Link to={`/os/${os.id}`}>
                    <Button type="button" variant="secondary">
                      {row.osReferencia || `OS #${os.numeroOS || os.numero || os.id.slice(0, 8).toUpperCase()}`}
                    </Button>
                  </Link>
                )
              },
            },
            { key: 'cliente', header: 'Cliente', render: (row) => row.cliente?.nome || row.ordemServico?.cliente?.nome || '-' },
            { key: 'veiculo', header: 'Veículo', render: (row) => row.veiculo?.modelo || row.ordemServico?.veiculo?.modelo || row.ordemServico?.modeloVeiculo || '-' },
            { key: 'usuario', header: 'Usuário', render: (row) => row.usuario?.nome || row.user?.nome || '-' },
            { key: 'justificativa', header: 'Observação', render: (row) => row.reason || row.justificativa || row.notes || '-' },
          ]}
        />
      )}
    </section>
  )
}
