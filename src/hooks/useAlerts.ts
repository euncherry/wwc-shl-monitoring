import { useQuery } from '@tanstack/react-query'
import { alertsApi, type AlertListParams } from '@/api/alerts'

/** 알림 쿼리 키 */
export const alertKeys = {
  all: ['alerts'] as const,
  list: (params: AlertListParams) => [...alertKeys.all, 'list', params] as const,
}

/** 알림 목록 (GET /alerts) — 필터/페이지 파라미터 전달 */
export function useAlerts(params: AlertListParams = {}, enabled = true) {
  return useQuery({
    queryKey: alertKeys.list(params),
    queryFn: () => alertsApi.list(params),
    enabled,
  })
}
