import { Dialog } from '@/components/ui/dialog'
import { FileText } from 'lucide-react'

interface DocumentosOsModalProps {
  open: boolean
  onClose: () => void
  documentosCount: number
}

export function DocumentosOsModal({ open, onClose, documentosCount }: DocumentosOsModalProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Documentos da OS" description="Resumo dos arquivos, comprovantes e fotos." contentClassName="max-w-md">
      <div className="space-y-6 pb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <FileText className="h-8 w-8" />
        </div>
        
        <div>
          <h4 className="text-lg font-semibold text-foreground">Gestão de Documentos</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta Ordem de Serviço possui <strong className="text-foreground">{documentosCount}</strong> documento(s) anexado(s) ou formalizado(s).
          </p>
        </div>

        <p className="rounded-xl border border-slate-200/90 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          A visualização detalhada, geração de PDFs e anexo de novos arquivos são feitos no botão <strong className="font-semibold text-foreground">Documentos</strong> localizado na barra de ações principal (topo da página).
        </p>
      </div>
    </Dialog>
  )
}
