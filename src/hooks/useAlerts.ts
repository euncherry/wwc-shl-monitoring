import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi, type AlertListParams, type MyAlertListParams } from '@/api/alerts'
import type { AlertStatusEnum, AlertThresholds } from '@/types/alert'

/** 알림 쿼리 키 */
export const alertKeys = {
  all: ['alerts'] as const,
  list: (params: AlertListParams) => [...alertKeys.all, 'list', params] as const,
  infinite: (params: AlertListParams) => [...alertKeys.all, 'infinite', params] as const,
  my: (params: MyAlertListParams) => [...alertKeys.all, 'my', params] as const,
  thresholds: () => [...alertKeys.all, 'thresholds'] as const,
}

/** 알림 목록 (GET /alerts) — 필터/페이지 파라미터 전달 */
export function useAlerts(params: AlertListParams = {}, enabled = true) {
  return useQuery({
    queryKey: alertKeys.list(params),
    queryFn: () => alertsApi.list(params),
    enabled,
  })
}

/** 내 존 알림 (GET /alerts/my) — ZONE_USER 전용, **전달된 알림만**.
 *  배정된 존이 없으면 403이 오는데 재시도해도 달라지지 않으므로 끈다. */
export function useMyAlerts(params: MyAlertListParams = {}, enabled = true) {
  return useQuery({
    queryKey: alertKeys.my(params),
    queryFn: () => alertsApi.listMy(params),
    enabled,
    retry: false,
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

/** 알림 임계값 조회 (GET /alerts/settings/thresholds) */
export function useAlertThresholds(enabled = true) {
  return useQuery({
    queryKey: alertKeys.thresholds(),
    queryFn: alertsApi.getThresholds,
    enabled,
  })
}

/** 알림 임계값 수정 (PATCH /alerts/settings/thresholds) */
export function useUpdateThresholds() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<AlertThresholds>) => alertsApi.updateThresholds(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.thresholds() }),
  })
}
