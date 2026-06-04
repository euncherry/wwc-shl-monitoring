import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { devicesApi, type CreateDeviceInput } from '@/api/devices'
import { toHearingLoop } from '@/lib/deviceMapper'

/** 기기 쿼리 키 */
export const deviceKeys = {
  all: ['devices'] as const,
  list: () => [...deviceKeys.all, 'list'] as const,
  detail: (mac: string) => [...deviceKeys.all, 'detail', mac] as const,
}

/** 기기 목록 — HearingLoop 뷰모델로 매핑해서 반환 */
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: devicesApi.list,
    select: (data) => data.map(toHearingLoop),
  })
}

/** 기기 상세(mac) — HearingLoop 뷰모델 */
export function useDevice(mac: string | undefined) {
  return useQuery({
    queryKey: deviceKeys.detail(mac ?? ''),
    queryFn: () => devicesApi.get(mac as string),
    enabled: Boolean(mac),
    select: toHearingLoop,
  })
}

/** 기기 등록(단건) */
export function useCreateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDeviceInput) => devicesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceKeys.all }),
  })
}

/** 기기 등록(일괄) */
export function useCreateDevicesBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (devices: CreateDeviceInput[]) => devicesApi.createBulk(devices),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceKeys.all }),
  })
}

/** 기기 삭제(숫자 id) */
export function useDeleteDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => devicesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceKeys.all }),
  })
}

/** 별칭 변경 (PATCH /devices/:mac) — 409 중복은 호출부에서 처리 */
export function useUpdateAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mac, alias }: { mac: string; alias: string }) =>
      devicesApi.updateAlias(mac, alias),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceKeys.all }),
  })
}

/** 존 배정 (PUT /devices/:id/zone/:zoneId) — 실연동 */
export function useAssignZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, zoneId }: { id: number; zoneId: number }) =>
      devicesApi.assignZone(id, zoneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deviceKeys.all })
      qc.invalidateQueries({ queryKey: ['zones'] })
    },
  })
}

/** 존 배정 해제 (DELETE /devices/:id/zone) — 목(§13, 백엔드 엔드포인트 없음) */
export function useUnassignZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => devicesApi.unassignZone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deviceKeys.all })
      qc.invalidateQueries({ queryKey: ['zones'] })
    },
  })
}
