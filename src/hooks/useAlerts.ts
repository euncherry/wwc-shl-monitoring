import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi, type AlertListParams } from '@/api/alerts'
import type { AlertStatusEnum } from '@/types/alert'

/** 알림 쿼리 키 */
export const alertKeys = {
  all: ['alerts'] as const,
  list: (params: AlertListParams) => [...alertKeys.all, 'list', params] as const,
  infinite: (params: AlertListParams) => [...alertKeys.all, 'infinite', params] as const,
}

/** 알림 목록 (GET /alerts) — 필터/페이지 파라미터 전달 */
export function useAlerts(params: AlertListParams = {}, enabled = true) {
  return useQuery({
    queryKey: alertKeys.list(params),
    queryFn: () => alertsApi.list(params),
    enabled,
  })
}

/** 알림 상태 변경 (PATCH /alerts/:id) — 전달/종결. 400(비-PENDING)은 호출부에서 처리 */
export function useUpdateAlertStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Extract<AlertStatusEnum, 'FORWARDED' | 'DISMISSED'> }) =>
      alertsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.all }),
  })
}
