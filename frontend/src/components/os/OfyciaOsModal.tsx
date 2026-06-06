import { Dialog } from '@/components/ui/dialog'
import { Sparkles } from 'lucide-react'

interface OfyciaOsModalProps {
  open: boolean
  onClose: () => void
  ordemServico: any
}

export function OfyciaOsModal({ open, onClose, ordemServico: _ordemServico }: OfyciaOsModalProps) {
  return (
    <Dialog open={open} onClose={onClose} title="OFYCIA - Análise Assistiva" description="Visão avançada da inteligência artificial sobre a OS." contentClassName="max-h-[85vh] max-w-4xl overflow-y-auto">
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3 rounded-xl border border-cyan-300/40 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.15),transparent_50%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.1),transparent_50%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-cyan-950 dark:text-cyan-50">Análise OFYCIA</h4>
            <p className="text-sm text-cyan-800 dark:text-cyan-200">
              A análise assistiva completa pode ser consultada no módulo OFYCIA.
            </p>
          </div>
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Possíveis causas', desc: 'Análise probabilística do defeito' },
            { title: 'Riscos de não reparo', desc: 'Consequências ao veículo' },
            { title: 'Peças sugeridas', desc: 'Previsão de itens em estoque' },
            { title: 'Impacto no custo', desc: 'Estimativa baseada no histórico' },
            { title: 'Observações ambientais', desc: 'Descarte de fluidos/peças' },
            { title: 'Apoio ao diagnóstico', desc: 'Dicas de testes adicionais' },
          ].map((item) => (
            <div key={item.title} className="flex flex-col gap-1 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-cyan-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-cyan-800">
              <span className="font-semibold text-foreground">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
              <span className="mt-2 inline-block w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">Aguardando processamento</span>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
