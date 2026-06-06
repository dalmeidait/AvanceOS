import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Table, Td, Th } from '@/components/ui/table'

export type DataTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>
  data: T[]
  getRowKey: (row: T) => string
}

export function DataTable<T>({ columns, data, getRowKey }: DataTableProps<T>) {
  return (
    <Card className="overflow-hidden border-slate-200/95 bg-white/95 shadow-[0_16px_38px_rgba(51,65,85,0.14),0_3px_12px_rgba(148,163,184,0.20)] dark:border-slate-700/70 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <Table className="min-w-[840px]">
          <thead className="bg-slate-100/90 dark:bg-[hsl(var(--surface-subtle))]">
            <tr>
              {columns.map((column) => (
                <Th key={column.key}>{column.header}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={getRowKey(row)} className="animate-fade-in border-t border-slate-100 bg-white transition duration-150 even:bg-slate-50/45 hover:bg-blue-50/55 dark:border-border/70 dark:bg-transparent dark:even:bg-transparent dark:hover:bg-[hsl(var(--surface-hover))]">
                {columns.map((column) => (
                  <Td key={column.key}>{column.render(row)}</Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  )
}
