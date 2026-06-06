import { CheckCircle2, Clock3 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type PlaceholderModulePageProps = {
  title: string
  description: string
  features: string[]
}

export function PlaceholderModulePage({ title, description, features }: PlaceholderModulePageProps) {
  return (
    <section>
      <PageHeader title={title} description={description} />

      <Card className="max-w-4xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-slate-100">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Este espaço já está reservado na arquitetura oficial do AvanceOS.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
              <Clock3 className="h-4 w-4" />
              Módulo em preparação
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-4">
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Futuras funcionalidades</p>
            <ul className="mt-3 space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
