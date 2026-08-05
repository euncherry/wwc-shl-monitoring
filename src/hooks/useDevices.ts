import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { devicesApi, type CreateDeviceInput, type UpdateDeviceInput } from '@/api/devices'
import { toHearingLoop } from '@/lib/deviceMapper'

/** 기기 쿼리 키 */
export const deviceKeys = {
  all: ['devices'] as const,
  list: () => [...deviceKeys.all, 'list'] as const,
  detail: (mac: string) => [...deviceKeys.all, 'detail', mac] as const,
  statusLogs: (mac: string, page: number, limit: number) =>
    [...deviceKeys.all, 'statusLogs', mac, page, limit] as const,
  errors: (mac: string) => [...deviceKeys.all, 'errors', mac] as const,
  deviceLogs: (mac: string, page: number, limit: number, module?: string) =>
    [...deviceKeys.all, 'deviceLogs', mac, page, limit, module ?? ''] as const,
}

/** 기기 목록 — HearingLoop 뷰모델로 매핑해서 반환.
 *  enabled=false면 요청하지 않는다(비로그인 화면에서 401 리다이렉트를 피하기 위함 — /status-spec). */
export function useDevices(enabled = true) {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: devicesApi.list,
    enabled,
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

/** 기기 상태 이력 (GET /devices/:mac/status) — 동작/온도 시계열 */
export function useDeviceStatusLogs(mac: string | undefined, page = 1, limit = 20, enabled = true) {
  return useQuery({
    queryKey: deviceKeys.statusLogs(mac ?? '', page, limit),
    queryFn: () => devicesApi.getStatusLogs(mac as string, page, limit),
    enabled: enabled && Boolean(mac),
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

/** 기기 수정 (PATCH /devices/:mac) — 별칭·설치 좌표. 좌표는 null=제거 */
export function useUpdateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mac, input }: { mac: string; input: UpdateDeviceInput }) =>
      devicesApi.update(mac, input),
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

/** 존 배정 해제 (DELETE /devices/:id/zone) — 실연동(ADMIN) */
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

/** 기기 에러 로그 (GET /devices/:mac/errors) */
export function useDeviceErrors(mac: string | undefined, enabled = true) {
  return useQuery({
    queryKey: deviceKeys.errors(mac ?? ''),
    queryFn: () => devicesApi.getErrors(mac as string),
    enabled: enabled && Boolean(mac),
  })
}

/** 기기 디바이스 로그 (GET /devices/:mac/device-logs) */
export function useDeviceLogs(mac: string | undefined, page = 1, limit = 20, module?: string, enabled = true) {
  return useQuery({
    queryKey: deviceKeys.deviceLogs(mac ?? '', page, limit, module),
    queryFn: () => devicesApi.getDeviceLogs(mac as string, page, limit, module),
    enabled: enabled && Boolean(mac),
  })
}
