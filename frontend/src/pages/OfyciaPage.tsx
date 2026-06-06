import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { enableAppSounds, getAppSoundsEnabled, setAppSoundsEnabled } from '@/lib/audio';
import { 
  Brain, AlertCircle, CheckCircle2, ChevronRight, FileSearch, Loader2, Activity,
  Zap, History, LayoutDashboard, Target, Leaf, ClipboardList, BookOpen, ShieldAlert, Clock, ArrowRight, Server, FileText,
  MessageSquare, ShieldCheck, Database, Sparkles, Wrench, Volume2, VolumeX
} from 'lucide-react';
import type { OfyciaAnalysisResponse } from '@/services/ofyciaService';
import { ofyciaService } from '@/services/ofyciaService';
import { AxiosError } from 'axios';

export function OfyciaPage() {
  const navigate = useNavigate();
  const [osId, setOsId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<OfyciaAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(() => getAppSoundsEnabled());

  const normalizarEntradaOs = (input: string): string => {
    let valor = input.trim();
    if (!valor) return '';
    
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    const matchUuid = valor.match(uuidRegex);
    if (matchUuid) return matchUuid[0];

    try {
      const url = new URL(valor);
      valor = url.hash || url.pathname;
    } catch {
      valor = valor.replace(/^https?:\/\/[^/]+/i, '');
    }

    valor = valor.replace(/^#\/?/, '');
    valor = valor.replace(/[?#].*$/, '');
    
    if (valor.includes('/')) {
      const parts = valor.split('/').filter(Boolean);
      valor = parts[parts.length - 1] || valor;
    }
    
    valor = valor.replace(/\s+/g, '');
    valor = valor.replace(/^OS-?/i, '');
    
    return valor;
  };

  const handleAnalyze = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const idParaAnalisar = normalizarEntradaOs(osId);

    if (!idParaAnalisar) {
      setErrorMsg('Ordem de Serviço não encontrada. Verifique o número, ID ou link informado.');
      return;
    }

    setIsLoading(true);
    setAnalysis(null);

    try {
      const result = await ofyciaService.analisarOs(idParaAnalisar);
      setAnalysis(result);
      setSuccessMsg('Análise concluída com sucesso.');
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          setErrorMsg('Ordem de Serviço não encontrada. Verifique o número, ID ou link informado.');
        } else if (error.response?.status === 401 || error.response?.status === 403) {
          setErrorMsg('Você não tem permissão para realizar esta análise.');
        } else {
          setErrorMsg(error.response?.data?.message || 'Ocorreu um erro ao analisar a OS.');
        }
      } else {
        setErrorMsg('Erro desconhecido ao comunicar com a IA local.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSounds = () => {
    const nextEnabled = !soundsEnabled;

    if (nextEnabled) {
      setAppSoundsEnabled(true);
      enableAppSounds();
    } else {
      setAppSoundsEnabled(false);
    }

    setSoundsEnabled(nextEnabled);
  };

  const getRiscoBadge = (risco: string) => {
    switch (risco) {
      case 'BAIXO':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Risco Baixo</Badge>;
      case 'MEDIO':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Risco Médio</Badge>;
      case 'ALTO':
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Risco Alto</Badge>;
      default:
        return <Badge>{risco}</Badge>;
    }
  };

  const metrics = [
    { title: "OS analisadas hoje", value: "0", desc: "Análises operacionais registradas no dia", icon: <FileText className="h-5 w-5" />, tone: 'cyan' },
    { title: "Pendentes de análise", value: "0", desc: "Ordens de Serviço aguardando leitura", icon: <Clock className="h-5 w-5" />, tone: 'amber' },
    { title: "Criticidade alta", value: "0", desc: "Casos que exigem atenção técnica", icon: <ShieldAlert className="h-5 w-5" />, tone: 'rose' },
    { title: "Risco ambiental", value: "Médio", desc: "Classificação predominante estimada", icon: <Leaf className="h-5 w-5" />, tone: 'teal' },
    { title: "Preventivas detectadas", value: "0", desc: "Eventos preventivos identificados", icon: <Target className="h-5 w-5" />, tone: 'violet' },
    { title: "Modo da OFYCIA", value: "Local", desc: "Foundry/Phi disponível sob demanda", icon: <Server className="h-5 w-5" />, tone: 'blue' },
  ] as const;

  const features = [
    { title: "Resumo técnico da OS", desc: "Leitura e simplificação dos dados operacionais.", icon: <FileText className="h-5 w-5 text-cyan-500" /> },
    { title: "Hipóteses técnicas", desc: "Prováveis causas com base no histórico e sintomas.", icon: <Brain className="h-5 w-5 text-indigo-500" /> },
    { title: "Checklist sugerido", desc: "Etapas recomendadas para validação da falha.", icon: <ClipboardList className="h-5 w-5 text-emerald-500" /> },
    { title: "Orientação ao cliente", desc: "Argumentos claros para explicação comercial.", icon: <BookOpen className="h-5 w-5 text-blue-500" /> },
    { title: "Sustentabilidade", desc: "Avaliação de impacto ambiental e descarte.", icon: <Leaf className="h-5 w-5 text-green-500" /> },
    { title: "Plano de ação", desc: "Passos operacionais recomendados para a oficina.", icon: <Target className="h-5 w-5 text-amber-500" /> },
  ];

  const tituloAnalise = typeof analysis?.titulo === 'string' && analysis.titulo ? analysis.titulo : 'Analise da Ordem de Servico';
  const resumoAnalise = typeof analysis?.resumo === 'string' && analysis.resumo ? analysis.resumo : 'Nenhum resumo disponivel para esta Ordem de Servico.';
  const riscoAnalise = typeof analysis?.risco === 'string' ? analysis.risco : 'BAIXO';
  const inconsistencias = Array.isArray(analysis?.inconsistencias) ? analysis.inconsistencias : [];
  const riscosIdentificados = Array.isArray(analysis?.riscosIdentificados) ? analysis.riscosIdentificados : [];
  const recomendacoes = Array.isArray(analysis?.recomendacoes) ? analysis.recomendacoes : [];
  const proximosPassos = Array.isArray(analysis?.proximosPassos) ? analysis.proximosPassos : [];
  const dadosAusentes = Array.isArray(analysis?.dadosAusentes) ? analysis.dadosAusentes : [];
  const diagnosticosLabTech = Array.isArray(analysis?.diagnosticosLabTech)
    ? analysis.diagnosticosLabTech
    : Array.isArray(analysis?.diagnosticosAvancados)
      ? analysis.diagnosticosAvancados
      : [];
  const textoSeguro = (valor: unknown, fallback = '-') => typeof valor === 'string' && valor ? valor : fallback;

  return (
    <div className="animate-page-in space-y-6 pb-12">
      <PageHeader
        title="OFYCIA"
        description="A OFYCIA organiza dados da Ordem de Serviço, identifica criticidade, impacto ambiental, itens preventivos e apoia o diagnóstico técnico da oficina."
        actions={
          <div className="flex items-center gap-2">
            <Badge className="border-cyan-200 bg-cyan-100 text-cyan-800 dark:border-cyan-800/40 dark:bg-cyan-900/30 dark:text-cyan-400">
              <Brain className="mr-1 h-3.5 w-3.5" />
              IA Local
            </Badge>
            <Badge className="border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/30 dark:text-indigo-400">
              <Activity className="mr-1 h-3.5 w-3.5" />
              Foundry/Phi sob demanda
            </Badge>
            <Badge className="border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800/40 dark:bg-slate-800/50 dark:text-slate-300">
              <Server className="mr-1 h-3.5 w-3.5" />
              Operação local-first
            </Badge>
            <Button
              type="button"
              variant="secondary"
              onClick={handleToggleSounds}
              className="h-8 border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {soundsEnabled ? <Volume2 className="mr-1.5 h-3.5 w-3.5" /> : <VolumeX className="mr-1.5 h-3.5 w-3.5" />}
              Sons do sistema: {soundsEnabled ? 'Ativado' : 'Desativado'}
            </Button>
          </div>
        }
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <StatCard key={i} title={m.title} value={m.value} note={m.desc} icon={m.icon} tone={m.tone} />
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-md bg-rose-50 p-4 border border-rose-200 text-rose-800 text-sm dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-200">
          {errorMsg}
        </div>
      )}
      
      {successMsg && (
        <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-sm dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-200">
          {successMsg}
        </div>
      )}

      {/* Main Analysis Card */}
      <Card className="relative overflow-hidden border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/80 to-indigo-50/60 shadow-[0_24px_70px_rgba(8,145,178,0.13),inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-cyan-400/25 dark:from-slate-950 dark:via-cyan-950/45 dark:to-indigo-950/35">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/16 blur-3xl dark:bg-cyan-300/12" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-indigo-400/12 blur-3xl dark:bg-indigo-400/10" />
        <CardHeader className="relative border-b border-cyan-100/80 dark:border-cyan-400/15">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center">
            <span className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-200/80 bg-white/80 text-cyan-600 shadow-[0_10px_22px_rgba(8,145,178,0.14)] dark:border-cyan-400/20 dark:bg-slate-950/50 dark:text-cyan-300">
              <Brain className="h-5 w-5" />
            </span>
            Analisar Ordem de Serviço
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Informe o ID, número ou cole o link da Ordem de Serviço para abrir a análise operacional da OFYCIA.
          </p>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <label htmlFor="osId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ID, número ou link da Ordem de Serviço
              </label>
              <div className="relative">
                <FileSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="osId"
                  placeholder="Ex: 000004, OS-000004 ou link da OS"
                  value={osId}
                  onChange={(e) => setOsId(e.target.value)}
                  className="pl-9 shadow-sm dark:bg-slate-900/70 dark:border-cyan-400/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAnalyze();
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Você pode informar o número da OS, o ID interno ou colar o link completo da Ordem de Serviço.
              </p>
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Analisar OS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis ? (
        <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Resumo e Risco */}
          <Card className="md:col-span-2 border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between pb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                <CheckCircle2 className="mr-2 h-5 w-5 text-cyan-600" />
                {tituloAnalise}
              </h3>
              {getRiscoBadge(riscoAnalise)}
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{resumoAnalise}</p>
            </CardContent>
          </Card>

          {/* Inconsistências */}
          <Card className="border-rose-100 shadow-sm dark:border-rose-900/50 dark:bg-slate-900">
            <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50 pb-4">
              <h3 className="text-md font-semibold text-rose-800 dark:text-rose-400 flex items-center">
                <AlertCircle className="mr-2 h-4 w-4 text-rose-600 dark:text-rose-500" />
                Inconsistências
              </h3>
            </CardHeader>
            <CardContent className="pt-4">
              {inconsistencias.length > 0 ? (
                <ul className="space-y-2">
                  {inconsistencias.map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                      <ChevronRight className="h-4 w-4 text-rose-400 mr-1 mt-0.5 shrink-0" />
                      {String(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">Nenhuma inconsistência encontrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Riscos Identificados */}
          <Card className="border-amber-100 shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
            <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/50 pb-4">
              <h3 className="text-md font-semibold text-amber-800 dark:text-amber-400 flex items-center">
                <AlertCircle className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-500" />
                Riscos Identificados
              </h3>
            </CardHeader>
            <CardContent className="pt-4">
              {riscosIdentificados.length > 0 ? (
                <ul className="space-y-2">
                  {riscosIdentificados.map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                      <ChevronRight className="h-4 w-4 text-amber-400 mr-1 mt-0.5 shrink-0" />
                      {String(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">Nenhum risco operacional identificado.</p>
              )}
            </CardContent>
          </Card>

          {/* Recomendações */}
          <Card className="border-emerald-100 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/50 pb-4">
              <h3 className="text-md font-semibold text-emerald-800 dark:text-emerald-400 flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                Recomendações Assistivas
              </h3>
            </CardHeader>
            <CardContent className="pt-4">
              {recomendacoes.length > 0 ? (
                <ul className="space-y-2">
                  {recomendacoes.map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                      <ChevronRight className="h-4 w-4 text-emerald-400 mr-1 mt-0.5 shrink-0" />
                      {String(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">Nenhuma recomendação disponível.</p>
              )}
            </CardContent>
          </Card>

          {/* Próximos Passos & Dados Ausentes */}
          <div className="space-y-6">
            <Card className="border-cyan-100 shadow-sm dark:border-cyan-900/50 dark:bg-slate-900">
              <CardHeader className="bg-cyan-50/50 dark:bg-cyan-950/20 border-b border-cyan-100 dark:border-cyan-900/50 pb-4">
                <h3 className="text-md font-semibold text-cyan-800 dark:text-cyan-400 flex items-center">
                  <ChevronRight className="mr-2 h-4 w-4 text-cyan-600 dark:text-cyan-500" />
                  Próximos Passos
                </h3>
              </CardHeader>
              <CardContent className="pt-4">
                {proximosPassos.length > 0 ? (
                  <ul className="space-y-2">
                    {proximosPassos.map((item, i) => (
                      <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mr-2 mt-2 shrink-0"></span>
                        {String(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">Nenhum passo obrigatório mapeado.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                  <FileSearch className="mr-2 h-4 w-4 text-slate-500" />
                  Dados Ausentes
                </h3>
              </CardHeader>
              <CardContent className="pt-4">
                {dadosAusentes.length > 0 ? (
                  <ul className="space-y-2">
                    {dadosAusentes.map((item, i) => (
                      <li key={i} className="flex items-start text-sm text-slate-600 dark:text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-2 mt-2 shrink-0"></span>
                        {String(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">Nenhum dado ausente identificado.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Seção Diagnósticos LAB-TECH */}
          <div className="mt-6 md:col-span-2">
            <Card className="border-indigo-100 shadow-sm dark:border-indigo-900/50 dark:bg-slate-900">
              <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/50 pb-4">
                <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-400 flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-500" />
                  Diagnósticos Avançados (LAB-TECH)
                </h3>
              </CardHeader>
              <CardContent className="pt-6">
                {diagnosticosLabTech.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">
                    Nenhum diagnóstico LAB-TECH encontrado.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {diagnosticosLabTech.map((diag, i) => {
                      const safeDiag = (diag && typeof diag === 'object' ? diag : {}) as Partial<(typeof diagnosticosLabTech)[number]>;
                      const sintomas = Array.isArray(safeDiag.sintomas) ? safeDiag.sintomas : [];
                      const leituras = safeDiag.leituras && typeof safeDiag.leituras === 'object' && !Array.isArray(safeDiag.leituras)
                        ? safeDiag.leituras
                        : {};
                      const leiturasAny = leituras as any;
                      const dtcs = Array.isArray(safeDiag.dtcs)
                        ? safeDiag.dtcs
                        : Array.isArray(leiturasAny.dtcs)
                          ? leiturasAny.dtcs
                          : Array.isArray(leiturasAny.troubleCodes)
                            ? leiturasAny.troubleCodes
                            : [];
                      const gravidade = typeof safeDiag.gravidade === 'string' ? safeDiag.gravidade : '';
                      const gravidadeNormalizada = gravidade.toLowerCase();
                      const tipo = textoSeguro(safeDiag.tipo, 'Diagnostico');
                      const origem = textoSeguro(safeDiag.origem);
                      const modulo = textoSeguro(safeDiag.modulo, '');
                      const numeroOS = textoSeguro(safeDiag.numeroOS);
                      const placa = textoSeguro(safeDiag.placa);
                      const arquivo = textoSeguro(safeDiag.arquivo);
                      const cenario = textoSeguro(safeDiag.cenario, '');
                      const resumoDiagnostico = textoSeguro(safeDiag.resumo || safeDiag.descricao, 'Nenhum resumo disponivel.');
                      const observacoes = textoSeguro(safeDiag.observacoes, '');

                      return (
                      <Card key={i} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-800 dark:text-slate-100 text-md">{tipo}</h4>
                              <span className="text-xs text-slate-500">
                                Origem: {origem}{modulo ? ` / ${modulo}` : ''} | OS: {numeroOS} | Placa: {placa} | Arq: {arquivo}
                              </span>
                              <div className="mt-1 flex gap-2">
                                {gravidade && (
                                  <Badge className={
                                    gravidadeNormalizada === 'crítica' || gravidadeNormalizada === 'alta'
                                      ? 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                                      : gravidadeNormalizada === 'média' || gravidadeNormalizada === 'media'
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                  }>
                                    {gravidade}
                                  </Badge>
                                )}
                                  {cenario && (
                                  <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">{cenario}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <p className="text-sm text-slate-700 dark:text-slate-300">{resumoDiagnostico}</p>
                          
                          {dtcs.length > 0 ? (
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">DTCs Registrados</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {dtcs.map((dtc: unknown, idx: number) => (
                                  <Badge key={idx} className="border border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/30 dark:text-rose-400">
                                      {String(dtc)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 italic">Nenhum cÃ³digo de falha (DTC) ativo no momento.</p>
                          )}

                          {sintomas.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sintomas</span>
                              <ul className="mt-1 space-y-1">
                                {sintomas.map((s, idx) => (
                                  <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-2 mt-1.5 shrink-0"></span>
                                      {String(s)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {Object.keys(leituras).length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leituras Principais</span>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {Object.entries(leituras).map(([key, value], idx) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 text-xs flex flex-col">
                                    <span className="text-slate-500 truncate" title={key}>{key}</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {observacoes && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/50 mt-2">
                              <span className="text-xs font-semibold text-amber-800 dark:text-amber-500 uppercase tracking-wider block mb-1">Observações do Scanner</span>
                              <p className="text-xs text-amber-900 dark:text-amber-200">{observacoes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in duration-500">
          
          {/* BLOCO INFORMATIVO: O QUE É A OFYCIA */}
          <div className="space-y-8">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-lg border border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/70 to-indigo-50/60 px-6 py-7 text-center shadow-[0_22px_60px_rgba(8,145,178,0.10),inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-cyan-400/20 dark:from-slate-950 dark:via-cyan-950/35 dark:to-indigo-950/25">
              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/14 blur-3xl dark:bg-cyan-300/10" />
              <div className="relative space-y-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-cyan-600" />
                O que é a OFYCIA?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                A OFYCIA é a inteligência operacional do AvanceOS. Ela foi criada para apoiar oficinas automotivas na leitura técnica das Ordens de Serviço, organização de diagnósticos, identificação de criticidade, orientação ao cliente e geração de planos de ação operacionais.
              </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 text-center">
                Como ela atua dentro do AvanceOS
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/45 to-white dark:border-cyan-400/20 dark:from-slate-900 dark:via-cyan-950/25 dark:to-slate-900">
                  <CardContent className="p-6 space-y-4">
                    <div className="h-11 w-11 rounded-lg border border-cyan-200/70 bg-white/80 dark:bg-cyan-950/30 flex items-center justify-center shadow-sm">
                      <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">Leitura da Ordem de Serviço</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      A OFYCIA interpreta dados da OS, relatos do cliente, serviços, produtos, diagnósticos e evidências registradas pela oficina.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/45 to-white dark:border-indigo-400/20 dark:from-slate-900 dark:via-indigo-950/25 dark:to-slate-900">
                  <CardContent className="p-6 space-y-4">
                    <div className="h-11 w-11 rounded-lg border border-indigo-200/70 bg-white/80 dark:bg-indigo-950/30 flex items-center justify-center shadow-sm">
                      <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">Apoio ao diagnóstico técnico</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Organiza hipóteses técnicas, checklist de verificação, pontos pendentes e recomendações para auxiliar o mecânico responsável.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/45 to-white dark:border-emerald-400/20 dark:from-slate-900 dark:via-emerald-950/25 dark:to-slate-900">
                  <CardContent className="p-6 space-y-4">
                    <div className="h-11 w-11 rounded-lg border border-emerald-200/70 bg-white/80 dark:bg-emerald-950/30 flex items-center justify-center shadow-sm">
                      <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">Comunicação com o cliente</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Transforma informações técnicas em orientações mais claras, ajudando a oficina a explicar o serviço de forma profissional.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200/70 bg-gradient-to-br from-white via-blue-50/45 to-white dark:border-blue-400/20 dark:from-slate-900 dark:via-blue-950/25 dark:to-slate-900">
                  <CardContent className="p-6 space-y-4">
                    <div className="h-11 w-11 rounded-lg border border-blue-200/70 bg-white/80 dark:bg-blue-950/30 flex items-center justify-center shadow-sm">
                      <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">Inteligência híbrida</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Opera com análises locais no AvanceOS e pode consultar Microsoft Foundry/Phi sob demanda para análises complementares, mantendo o controle operacional no ambiente da oficina.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Arquitetura local-first e Fluxo */}
            <div className="rounded-lg border border-cyan-200/70 bg-gradient-to-br from-slate-50 via-white to-cyan-50/60 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] dark:border-cyan-400/20 dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950/30">
              <div className="flex flex-col xl:flex-row gap-8 items-center">
                <div className="flex-1 space-y-3">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Database className="h-5 w-5 text-cyan-600" />
                    Arquitetura local-first
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    O AvanceOS mantém os dados operacionais em SQL Server local. A OFYCIA utiliza inteligência local para análises determinísticas e pode acionar IA Microsoft apenas como apoio sob demanda, sem substituir a validação técnica da oficina.
                  </p>
                </div>
                <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                  <div className="min-w-[500px] rounded-lg border border-white/70 bg-white/85 p-5 text-xs font-semibold text-slate-600 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-300 sm:text-sm flex items-center justify-between">
                    <div className="flex flex-col items-center gap-2 w-20 text-center"><FileText className="h-5 w-5 text-slate-500" /> <span>Ordem de<br/>Serviço</span></div>
                    <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mx-2" />
                    <div className="flex flex-col items-center gap-2 w-20 text-center"><Server className="h-5 w-5 text-cyan-600" /> <span>OFYCIA<br/>Local</span></div>
                    <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mx-2" />
                    <div className="flex flex-col items-center gap-2 w-20 text-center"><Activity className="h-5 w-5 text-indigo-500" /> <span>Análise<br/>Operacional</span></div>
                    <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mx-2" />
                    <div className="flex flex-col items-center gap-2 w-20 text-center"><Brain className="h-5 w-5 text-purple-500" /> <span>Foundry/Phi<br/>(Opcional)</span></div>
                    <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mx-2" />
                    <div className="flex flex-col items-center gap-2 w-20 text-center"><ShieldCheck className="h-5 w-5 text-emerald-500" /> <span>Resultado<br/>na OS</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Antigos Módulos do Dashboard (O que a OFYCIA entrega, Alertas, etc) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">O que a OFYCIA entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <Card key={i} className="border-slate-200/80 bg-gradient-to-br from-white via-slate-50/70 to-blue-50/35 dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/20">
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="shrink-0 rounded-lg border border-white/70 bg-white/80 p-2.5 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/60">
                      {f.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 dark:text-slate-100">{f.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Alertas e Histórico (Col Span 1) */}
          <div className="space-y-6">
            <Card className="border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                  Alertas operacionais
                </h3>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma OS crítica pendente no momento.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5"><Target className="h-4 w-4 text-cyan-500" /></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Preventivas serão destacadas quando houver dados do TechHub.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5"><Activity className="h-4 w-4 text-indigo-500" /></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Análises detalhadas podem ser solicitadas dentro da Ordem de Serviço.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                  <History className="mr-2 h-4 w-4 text-slate-500" />
                  Histórico recente
                </h3>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-3 pb-6">
                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <History className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhuma análise registrada</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto">
                    As análises salvas futuramente serão exibidas aqui com data, criticidade, e risco ambiental.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      )}

      {/* Ações Rápidas */}
      <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => navigate('/ordens-servico')} 
            variant="secondary"
          >
            <ClipboardList className="mr-2 h-4 w-4 text-cyan-600" /> Abrir Ordens de Serviço
          </Button>
          <Button 
            onClick={() => navigate('/techhub')} 
            variant="secondary"
          >
            <Wrench className="mr-2 h-4 w-4 text-indigo-600" /> Ir para TechHub
          </Button>
          <Button 
            onClick={() => navigate('/analises-relatorios')} 
            variant="secondary"
          >
            <LayoutDashboard className="mr-2 h-4 w-4 text-amber-600" /> Ver Análises e Relatórios
          </Button>
          <Button 
            onClick={() => navigate('/produtos')} 
            variant="secondary"
          >
            <Zap className="mr-2 h-4 w-4 text-rose-600" /> Abrir Produtos e Serviços
          </Button>
        </div>
      </div>
    </div>
  );
}
