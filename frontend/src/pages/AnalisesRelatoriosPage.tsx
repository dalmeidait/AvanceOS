import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { analisesRelatoriosService } from '@/services/analisesRelatorios.service';
import type { TipoRelatorio } from '@/types/analisesRelatorios';

// Função auxiliar solicitada
function formatCurrency(valor: any) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0));
}

// Componente utilitário de gráfico em barra horizontal
function HorizontalBar({ label, value, max, colorClass }: { label: string, value: number, max: number, colorClass: string }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col gap-1 mb-3">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 w-full overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const reportPanelClass = 'mb-6 max-w-xl rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-border/50 dark:bg-transparent dark:shadow-none';
const reportHeaderRowClass = 'border-b border-slate-200 bg-slate-100/90 dark:border-border/50 dark:bg-transparent';
const reportHeaderCellClass = 'px-4 py-2 text-left text-sm font-semibold text-slate-600 dark:text-muted-foreground';
const reportRowClass = 'border-b border-slate-100 transition-colors even:bg-slate-50/45 hover:bg-blue-50/55 dark:border-border/10 dark:even:bg-transparent dark:hover:bg-white/5';
const metricBoxClass = 'rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center shadow-sm dark:border-border/50 dark:bg-transparent dark:shadow-none';

export function AnalisesRelatoriosPage() {
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('GERAL');

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ['analises-resumo', dataInicial, dataFinal],
    queryFn: () => analisesRelatoriosService.getResumo({ dataInicial, dataFinal }),
  });

  const { data: relatorioData, isLoading: loadingRelatorio } = useQuery<any>({
    queryKey: ['analises-relatorio', tipoRelatorio, dataInicial, dataFinal],
    queryFn: () => {
      const filtros = { dataInicial, dataFinal };
      switch (tipoRelatorio) {
        case 'OS': return analisesRelatoriosService.getOs(filtros);
        case 'FINANCEIRO': return analisesRelatoriosService.getFinanceiro(filtros);
        case 'ESTOQUE': return analisesRelatoriosService.getEstoque(filtros);
        case 'AGENDA': return analisesRelatoriosService.getAgenda(filtros);
        case 'MANUAIS': return analisesRelatoriosService.getManuais(filtros);
        default: return Promise.resolve(null);
      }
    },
  });

  const exportCSV = () => {
    if (!relatorioData && tipoRelatorio !== 'GERAL') return;
    
    let csv = '';
    const filename = `relatorio-${tipoRelatorio.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;

    if (tipoRelatorio === 'GERAL' && resumo) {
      csv = `Total OS;${resumo.totalOs}\n`;
      csv += `OS Abertas;${resumo.osAbertas}\n`;
      csv += `OS Em Execução;${resumo.osExecucao}\n`;
      csv += `OS Concluídas;${resumo.osConcluidas}\n`;
      csv += `Total Recebido;${formatCurrency(resumo.faturamentoTotal)}\n`;
      csv += `Ticket Médio Recebido;${formatCurrency(resumo.ticketMedio)}\n`;
      csv += `OS Pendentes de Pagamento;${resumo.osPendentes}\n`;
      csv += `Produtos Críticos;${resumo.produtosCriticos}\n`;
      csv += `Agendamentos;${resumo.agendamentos}\n`;
      csv += `Documentos Ativos;${resumo.documentosAtivos}\n`;
    } else if (tipoRelatorio === 'OS' && Array.isArray(relatorioData)) {
      csv = 'Número OS;Cliente;Placa;Status;Data de Abertura;Responsável;Valor Final\n';
      relatorioData.forEach((item: any) => {
        csv += `${item.numeroOS};${item.cliente?.nome || '-'};${item.placaVeiculo || '-'};${item.status};${item.criadoEm};${item.responsavel?.nome || '-'};${formatCurrency(item.valorFinal)}\n`;
      });
    } else if (tipoRelatorio === 'FINANCEIRO' && relatorioData && !Array.isArray(relatorioData)) {
      const data = relatorioData as any;
      csv = `Faturamento Projetado;${formatCurrency(data.totalFaturado)}\n`;
      csv += `Total Recebido;${formatCurrency(data.totalRecebido)}\n`;
      csv += `Total Pendente;${formatCurrency(data.totalPendente)}\n`;
      csv += `Ticket Médio Recebido;${formatCurrency(data.ticketMedio)}\n`;
      csv += `Descontos Concedidos;${formatCurrency(data.descontosConcedidos)}\n`;
      csv += `OS Pagas;${data.osPagas}\n`;
      csv += `OS Pendentes;${data.osPendentes}\n`;
    } else if (tipoRelatorio === 'ESTOQUE' && Array.isArray(relatorioData)) {
      csv = 'Nome;Categoria;Estoque Atual;Estoque Mínimo;Status;Preço de Venda\n';
      relatorioData.forEach((item: any) => {
        csv += `${item.nome};${item.categoria};${item.quantityInStock};${item.estoqueMinimo};${item.status};${formatCurrency(item.precoVenda)}\n`;
      });
    } else if (tipoRelatorio === 'AGENDA' && Array.isArray(relatorioData)) {
      csv = 'Data Início;Veículo/Desc;Máquina/Recurso;Status\n';
      relatorioData.forEach((item: any) => {
        csv += `${item.dataInicio};${item.veiculoDesc};${item.recurso?.nome || '-'};${item.status}\n`;
      });
    } else if (tipoRelatorio === 'MANUAIS' && Array.isArray(relatorioData)) {
      csv = 'Título;Área;Categoria;Tipo;Versão;Status\n';
      relatorioData.forEach((item: any) => {
        csv += `${item.titulo};${item.area};${item.categoria};${item.tipo};${item.versao || '-'};${item.status}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section>
      <PageHeader
        title="Análises e Relatórios"
        description="Indicadores estatísticos, relatórios operacionais e extração de dados da Oficina Avance."
        actions={
          <Button onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />
      <div className="flex flex-col gap-6 mt-6">
        {/* Filters */}
        <Card className="flex flex-col gap-4 border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-[0_14px_34px_rgba(51,65,85,0.12)] dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 md:flex-row md:items-end">
          <div className="w-full md:w-1/4 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Tipo de Relatório</label>
            <Select 
              value={tipoRelatorio} 
              onChange={(e) => setTipoRelatorio(e.target.value as TipoRelatorio)}
            >
              <option value="GERAL">Executivo Geral</option>
              <option value="OS">Ordens de Serviço</option>
              <option value="FINANCEIRO">Financeiro</option>
              <option value="ESTOQUE">Estoque</option>
              <option value="AGENDA">Agenda/Máquinas</option>
              <option value="MANUAIS">Manuais e Procedimentos</option>
            </Select>
          </div>
          <div className="w-full md:w-1/4 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Data Inicial</label>
            <Input 
              type="date" 
              value={dataInicial} 
              onChange={(e) => setDataInicial(e.target.value)} 
            />
          </div>
          <div className="w-full md:w-1/4 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Data Final</label>
            <Input 
              type="date" 
              value={dataFinal} 
              onChange={(e) => setDataFinal(e.target.value)} 
            />
          </div>
        </Card>

        {/* Executive Cards */}
        {tipoRelatorio === 'GERAL' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total de OS" value={loadingResumo ? '...' : resumo?.totalOs || 0} tone="blue" />
              <StatCard title="Total Recebido" value={loadingResumo ? '...' : formatCurrency(resumo?.faturamentoTotal)} tone="green" />
              <StatCard title="Produtos em Estoque Crítico" value={loadingResumo ? '...' : resumo?.produtosCriticos || 0} tone="rose" />
              <StatCard title="Agendamentos no Período" value={loadingResumo ? '...' : resumo?.agendamentos || 0} tone="cyan" />
              <StatCard title="Ticket Médio Recebido" value={loadingResumo ? '...' : formatCurrency(resumo?.ticketMedio)} tone="teal" />
              <StatCard title="OS Pendentes de Pagamento" value={loadingResumo ? '...' : resumo?.osPendentes || 0} tone="amber" />
            </div>
            
            {!loadingResumo && resumo && (
              <Card className="mt-2 p-5">
                <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">Distribuição de Ordens de Serviço (Por Status)</h3>
                <div className="max-w-xl">
                  <HorizontalBar label="Abertas" value={resumo.osAbertas} max={resumo.totalOs} colorClass="bg-blue-400" />
                  <HorizontalBar label="Em Execução" value={resumo.osExecucao} max={resumo.totalOs} colorClass="bg-orange-400" />
                  <HorizontalBar label="Concluídas" value={resumo.osConcluidas} max={resumo.totalOs} colorClass="bg-green-500" />
                </div>
              </Card>
            )}
          </>
        )}

        {/* Data Tables & Charts */}
        {tipoRelatorio === 'OS' && (
          <Card className="overflow-x-auto p-4">
            <h3 className="font-semibold mb-4">Relatório de Ordens de Serviço</h3>
            {loadingRelatorio ? (
              <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : (
              <>
                <div className={reportPanelClass}>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Distribuição Financeira (Valor Final)</h4>
                  <HorizontalBar 
                    label="Pagas/Baixadas" 
                    value={(relatorioData as any[])?.filter(o => o.statusFinanceiro === 'PAGO' || o.pagamentos?.length > 0).length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-emerald-500" 
                  />
                  <HorizontalBar 
                    label="Pendentes" 
                    value={(relatorioData as any[])?.filter(o => o.statusFinanceiro !== 'PAGO' && (!o.pagamentos || o.pagamentos.length === 0)).length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-rose-500" 
                  />
                </div>
                <Table>
                  <thead>
                    <tr className={reportHeaderRowClass}>
                      <th className={reportHeaderCellClass}>OS #</th>
                      <th className={reportHeaderCellClass}>Cliente</th>
                      <th className={reportHeaderCellClass}>Placa</th>
                      <th className={reportHeaderCellClass}>Status</th>
                      <th className={reportHeaderCellClass}>Valor Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(relatorioData as any[])?.map((item, idx) => (
                      <tr key={idx} className={reportRowClass}>
                        <td className="py-2 px-4 text-sm">{item.numeroOS}</td>
                        <td className="py-2 px-4 text-sm">{item.cliente?.nome || '-'}</td>
                        <td className="py-2 px-4 text-sm">{item.placaVeiculo || '-'}</td>
                        <td className="py-2 px-4 text-sm">{item.status}</td>
                        <td className="py-2 px-4 text-sm">{formatCurrency(item.valorFinal)}</td>
                      </tr>
                    ))}
                    {(!relatorioData || (relatorioData as any[]).length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">Nenhum dado encontrado</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </>
            )}
          </Card>
        )}

        {tipoRelatorio === 'FINANCEIRO' && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Relatório Financeiro Consolidado</h3>
            {loadingRelatorio ? (
              <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between border-b border-slate-200 p-3 dark:border-border/50">
                      <span className="text-muted-foreground">Faturamento Projetado</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency((relatorioData as any)?.totalFaturado)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 p-3 dark:border-border/50">
                      <span className="text-muted-foreground">Total Recebido (Caixa/Transações)</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency((relatorioData as any)?.totalRecebido)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 p-3 dark:border-border/50">
                      <span className="text-muted-foreground">Total Pendente</span>
                      <span className="font-semibold text-rose-500">{formatCurrency((relatorioData as any)?.totalPendente)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-border/50 dark:bg-transparent dark:shadow-none">
                    <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Comparativo Financeiro (Valores R$)</h4>
                    <HorizontalBar 
                      label="Recebido" 
                      value={Number((relatorioData as any)?.totalRecebido?.toFixed(2) || 0)} 
                      max={Number((relatorioData as any)?.totalFaturado?.toFixed(2) || 0)} 
                      colorClass="bg-emerald-500" 
                    />
                    <HorizontalBar 
                      label="Pendente" 
                      value={Number((relatorioData as any)?.totalPendente?.toFixed(2) || 0)} 
                      max={Number((relatorioData as any)?.totalFaturado?.toFixed(2) || 0)} 
                      colorClass="bg-rose-500" 
                    />
                  </div>
                </div>
                
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Métricas Operacionais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={metricBoxClass}>
                    <p className="text-sm text-muted-foreground">Ticket Médio Recebido</p>
                    <p className="text-lg font-bold">{formatCurrency((relatorioData as any)?.ticketMedio)}</p>
                  </div>
                  <div className={metricBoxClass}>
                    <p className="text-sm text-muted-foreground">Descontos Concedidos</p>
                    <p className="text-lg font-bold text-orange-500">{formatCurrency((relatorioData as any)?.descontosConcedidos)}</p>
                  </div>
                  <div className={metricBoxClass}>
                    <p className="text-sm text-muted-foreground">OS Pagas</p>
                    <p className="text-lg font-bold text-emerald-600">{(relatorioData as any)?.osPagas}</p>
                  </div>
                  <div className={metricBoxClass}>
                    <p className="text-sm text-muted-foreground">OS Pendentes</p>
                    <p className="text-lg font-bold text-rose-500">{(relatorioData as any)?.osPendentes}</p>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {tipoRelatorio === 'ESTOQUE' && (
          <Card className="overflow-x-auto p-4">
            <h3 className="font-semibold mb-4">Relatório de Estoque</h3>
            {loadingRelatorio ? (
              <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : (
              <>
                <div className={reportPanelClass}>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Status do Estoque</h4>
                  <HorizontalBar 
                    label="Produtos com Estoque Normal" 
                    value={(relatorioData as any[])?.filter(o => o.quantityInStock > o.estoqueMinimo).length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-emerald-500" 
                  />
                  <HorizontalBar 
                    label="Produtos com Estoque Crítico" 
                    value={(relatorioData as any[])?.filter(o => o.quantityInStock <= o.estoqueMinimo).length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-rose-500" 
                  />
                </div>
                <Table>
                  <thead>
                    <tr className={reportHeaderRowClass}>
                      <th className={reportHeaderCellClass}>Produto</th>
                      <th className={reportHeaderCellClass}>Categoria</th>
                      <th className={`${reportHeaderCellClass} text-center`}>Qtd Atual</th>
                      <th className={`${reportHeaderCellClass} text-center`}>Qtd Mínima</th>
                      <th className={reportHeaderCellClass}>Preço Venda</th>
                      <th className={reportHeaderCellClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(relatorioData as any[])?.map((item, idx) => (
                      <tr key={idx} className={reportRowClass}>
                        <td className="py-2 px-4 text-sm">{item.nome}</td>
                        <td className="py-2 px-4 text-sm">{item.categoria}</td>
                        <td className="py-2 px-4 text-sm text-center font-medium">{item.quantityInStock}</td>
                        <td className="py-2 px-4 text-sm text-center">{item.estoqueMinimo}</td>
                        <td className="py-2 px-4 text-sm">{formatCurrency(item.precoVenda)}</td>
                        <td className="py-2 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${item.quantityInStock <= item.estoqueMinimo ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                            {item.quantityInStock <= item.estoqueMinimo ? 'Crítico' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card>
        )}

        {tipoRelatorio === 'AGENDA' && (
          <Card className="overflow-x-auto p-4">
            <h3 className="font-semibold mb-4">Relatório de Agenda e Alocações</h3>
            {loadingRelatorio ? (
              <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : (
              <>
                <div className={reportPanelClass}>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Agendamentos por Status</h4>
                  <HorizontalBar 
                    label="Agendados" 
                    value={(relatorioData as any[])?.filter(o => o.status === 'AGENDADO').length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-blue-400" 
                  />
                  <HorizontalBar 
                    label="Em Andamento" 
                    value={(relatorioData as any[])?.filter(o => o.status === 'EM_ANDAMENTO').length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-orange-400" 
                  />
                  <HorizontalBar 
                    label="Concluídos" 
                    value={(relatorioData as any[])?.filter(o => o.status === 'CONCLUIDO').length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-green-500" 
                  />
                </div>
                <Table>
                  <thead>
                    <tr className={reportHeaderRowClass}>
                      <th className={reportHeaderCellClass}>Data Início</th>
                      <th className={reportHeaderCellClass}>Veículo/Descrição</th>
                      <th className={reportHeaderCellClass}>Recurso/Máquina</th>
                      <th className={reportHeaderCellClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(relatorioData as any[])?.map((item, idx) => (
                      <tr key={idx} className={reportRowClass}>
                        <td className="py-2 px-4 text-sm">{new Date(item.dataInicio).toLocaleDateString()}</td>
                        <td className="py-2 px-4 text-sm">{item.veiculoDesc}</td>
                        <td className="py-2 px-4 text-sm">{item.recurso?.nome || '-'}</td>
                        <td className="py-2 px-4 text-sm">
                          <span className="px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-800 font-medium dark:bg-slate-800 dark:text-slate-200">{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card>
        )}

        {tipoRelatorio === 'MANUAIS' && (
          <Card className="overflow-x-auto p-4">
            <h3 className="font-semibold mb-4">Relatório de Manuais e Procedimentos</h3>
            {loadingRelatorio ? (
              <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : (
              <>
                <div className={reportPanelClass}>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Proporção de Documentos Ativos</h4>
                  <HorizontalBar 
                    label="Ativos" 
                    value={(relatorioData as any[])?.filter(o => o.status === 'ATIVO').length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-emerald-500" 
                  />
                  <HorizontalBar 
                    label="Arquivados/Outros" 
                    value={(relatorioData as any[])?.filter(o => o.status !== 'ATIVO').length || 0} 
                    max={(relatorioData as any[])?.length || 0} 
                    colorClass="bg-slate-400" 
                  />
                </div>
                <Table>
                  <thead>
                    <tr className={reportHeaderRowClass}>
                      <th className={reportHeaderCellClass}>Título</th>
                      <th className={reportHeaderCellClass}>Área</th>
                      <th className={reportHeaderCellClass}>Categoria</th>
                      <th className={reportHeaderCellClass}>Versão</th>
                      <th className={reportHeaderCellClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(relatorioData as any[])?.map((item, idx) => (
                      <tr key={idx} className={reportRowClass}>
                        <td className="py-2 px-4 text-sm font-medium">{item.titulo}</td>
                        <td className="py-2 px-4 text-sm">{item.area}</td>
                        <td className="py-2 px-4 text-sm">{item.categoria}</td>
                        <td className="py-2 px-4 text-sm">{item.versao || '-'}</td>
                        <td className="py-2 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${item.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card>
        )}
      </div>
    </section>
  );
}
