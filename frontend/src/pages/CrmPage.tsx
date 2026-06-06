import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { DataTable } from '@/components/common/DataTable'
import type { DataTableColumn } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { crmService } from '@/services/crm.service'
import { CrmDashboardCards } from '@/components/crm/CrmDashboardCards'
import { CrmRegistrarContatoModal } from '@/components/crm/CrmRegistrarContatoModal'
import { CrmInteractionModal } from '@/components/crm/CrmInteractionModal'
import { Plus, Copy, MessageSquare, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function CrmPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [registrarOpen, setRegistrarOpen] = useState(false)
  const [selectedInteracao, setSelectedInteracao] = useState<any>(null)
  
  const navigate = useNavigate()

  const { data: interacoes, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['crm-interacoes'],
    queryFn: () => crmService.listarInteracoes({ status: 'PENDENTE' }),
  })

  function handleCopy(message: string) {
    navigator.clipboard.writeText(message)
    alert('Mensagem copiada para a área de transferência.')
  }

  const columns: Array<DataTableColumn<any>> = [
    { 
      key: 'cliente', 
      header: 'Cliente', 
      render: (row) => (
        <div>
          <p className="font-medium text-slate-200">{row.cliente?.nome || 'Desconhecido'}</p>
          <p className="text-xs text-slate-400">{row.cliente?.telefone || 'Sem telefone'}</p>
        </div>
      )
    },
    { key: 'veiculo', header: 'Veículo', render: (row) => row.veiculo ? `${row.veiculo.modelo} (${row.veiculo.placa})` : '-' },
    { key: 'assunto', header: 'Assunto', render: (row) => row.assunto },
    { key: 'canal', header: 'Canal Sugerido', render: (row) => <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-100">{row.canal}</span> },
    { 
      key: 'prioridade', 
      header: 'Prioridade', 
      render: (row) => {
        const cores: any = {
          BAIXA: 'border border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
          NORMAL: 'bg-blue-1000/20 text-blue-300',
          ALTA: 'bg-orange-500/20 text-orange-300',
          URGENTE: 'bg-red-500/20 text-red-300'
        }
        return <span className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold ${cores[row.prioridade]}`}>{row.prioridade}</span>
      }
    },
    { 
      key: 'dataPrevista', 
      header: 'Prazo', 
      render: (row) => row.dataPrevista ? new Date(row.dataPrevista).toLocaleDateString('pt-BR') : '-' 
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.mensagemSugerida && (
            <Button variant="ghost" title="Copiar Mensagem" onClick={() => handleCopy(row.mensagemSugerida)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button variant="secondary" onClick={() => { setSelectedInteracao(row); setRegistrarOpen(true) }}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Registrar
          </Button>
          {row.ordemServicoId && (
            <Button variant="ghost" title="Abrir OS" onClick={() => navigate(`/os/${row.ordemServicoId}`)}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const termo = search.trim().toLowerCase()
  const filtrados = (interacoes || []).filter((i: any) => 
    [i.cliente?.nome, i.veiculo?.placa, i.assunto].join(' ').toLowerCase().includes(termo)
  )

  return (
    <section>
      <PageHeader
        title="CRM / Relacionamento"
        description="Acompanhe o relacionamento com os clientes, pós-vendas e orçamentos pendentes."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contato
          </Button>
        }
      />

      <CrmDashboardCards />

      <div className="mb-4 max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, placa ou assunto"
        />
      </div>

      {isLoading ? (
        <LoadingState label="Carregando interações..." />
      ) : isError ? (
        <ErrorState message={(error as Error).message} />
      ) : filtrados.length === 0 ? (
        <EmptyState title="Nenhum contato pendente" message="Você não possui contatos aguardando retorno no momento." />
      ) : (
        <DataTable data={filtrados} columns={columns} getRowKey={(r) => r.id} />
      )}

      {modalOpen && (
        <CrmInteractionModal 
          open={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSuccess={() => { setModalOpen(false); refetch(); }} 
        />
      )}

      {registrarOpen && selectedInteracao && (
        <CrmRegistrarContatoModal
          open={registrarOpen}
          interacao={selectedInteracao}
          onClose={() => { setRegistrarOpen(false); setSelectedInteracao(null) }}
          onSuccess={() => { setRegistrarOpen(false); setSelectedInteracao(null); refetch(); }}
        />
      )}
    </section>
  )
}
