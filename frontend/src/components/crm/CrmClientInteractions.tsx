import { useQuery } from '@tanstack/react-query'
import { clientesService } from '@/services/clientes.service'
import { DataTable } from '@/components/common/DataTable'

function interactionTipoLabel(tipo?: string | null) {
  const labels: Record<string, string> = {
    LEMBRETE: 'Lembrete',
    OFERTA: 'Oferta / Promoção',
    POS_VENDA: 'Pós-venda',
    RECLAMACAO: 'Reclamação',
    OUTRO: 'Outro',
  }
  return tipo ? labels[tipo] || tipo : '-'
}

function interactionStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    AGENDADO: 'Agendado',
    REALIZADO: 'Realizado',
    CANCELADO: 'Cancelado',
  }
  return status ? labels[status] || status : '-'
}

export function CrmClientInteractions({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cliente-interacoes', clienteId],
    queryFn: () => clientesService.buscarInteracoes(clienteId),
    enabled: Boolean(clienteId),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico...</p>
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Nenhum histórico de relacionamento.</p>

  const columns = [
    { key: 'data', header: 'Data', render: (row: any) => new Date(row.criadoEm).toLocaleDateString('pt-BR') },
    { key: 'tipo', header: 'Tipo', render: (row: any) => interactionTipoLabel(row.tipo) },
    { key: 'status', header: 'Status', render: (row: any) => <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-100">{interactionStatusLabel(row.status)}</span> },
    { key: 'assunto', header: 'Assunto', render: (row: any) => row.assunto },
    { key: 'detalhes', header: 'Detalhes', render: (row: any) => row.detalhes || '-' },
  ]

  return (
    <div className="mt-4">
      <DataTable data={data} columns={columns} getRowKey={(row) => row.id} />
    </div>
  )
}
