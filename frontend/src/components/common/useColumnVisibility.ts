import { useMemo, useState } from 'react'
import type { DataTableColumn } from './DataTable'
import { readLocalPreference, writeLocalPreference } from '@/lib/storage'

export type ColumnOption = {
  key: string
  label: string
  required?: boolean
}

function readColumns(storageKey: string, options: ColumnOption[]) {
  const defaults = options.map((option) => option.key)
  const required = options.filter((option) => option.required).map((option) => option.key)
  const allowed = new Set(defaults)

  try {
    const saved = readLocalPreference(storageKey)
    if (!saved) return defaults
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return defaults
    return Array.from(new Set([...required, ...parsed.filter((key) => allowed.has(String(key))).map(String)]))
  } catch {
    return defaults
  }
}

export function useColumnVisibility(storageKey: string, options: ColumnOption[]) {
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => readColumns(storageKey, options))

  const requiredKeys = useMemo(
    () => options.filter((option) => option.required).map((option) => option.key),
    [options],
  )

  function persist(next: string[]) {
    const allowed = new Set(options.map((option) => option.key))
    const normalized = Array.from(new Set([...next, ...requiredKeys])).filter((key) => allowed.has(key))
    setVisibleKeys(normalized)
    writeLocalPreference(storageKey, JSON.stringify(normalized))
  }

  function toggleColumn(key: string) {
    if (requiredKeys.includes(key)) return
    persist(visibleKeys.includes(key) ? visibleKeys.filter((item) => item !== key) : [...visibleKeys, key])
  }

  function filterColumns<T>(columns: Array<DataTableColumn<T>>) {
    return columns.filter((column) => visibleKeys.includes(column.key))
  }

  return { visibleKeys, toggleColumn, filterColumns }
}
