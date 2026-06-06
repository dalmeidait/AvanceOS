import { api } from '@/lib/api'
import type { DashboardExecutivo } from '@/types/dashboard'

export const dashboardService = {
  async resumoExecutivo() {
    const { data } = await api.get<DashboardExecutivo>('/analytics/dashboard-executivo')
    return data
  },
}
