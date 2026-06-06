import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { crmService } from '@/services/crm.service'

export function CrmDashboardCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: crmService.getDashboardMetrics,
  })

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-slate-800 rounded-lg" />
  }

  const metrics = data || { pendentes: 0, posVendas: 0, orcamentos: 0, reclamacoes: 0 }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium tracking-tight">Contatos Pendentes</h3>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.pendentes}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium tracking-tight">Pós-vendas</h3>
          <CheckCircle className="h-4 w-4 text-cyan-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.posVendas}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium tracking-tight">Orçamentos Pendentes</h3>
          <FileText className="h-4 w-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.orcamentos}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium tracking-tight">Reclamações</h3>
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.reclamacoes}</div>
        </CardContent>
      </Card>
    </div>
  )
}
