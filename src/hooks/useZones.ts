import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zonesApi } from '@/api/zones'
import { toTelecoilZone, toZoneDevice } from '@/lib/zoneMapper'

export const zoneKeys = {
  all: ['zones'] as const,
  list: () => [...zoneKeys.all, 'list'] as const,
  detail: (id: number) => [...zoneKeys.all, 'detail', id] as const,
}

/** 텔레코일존 목록 — TelecoilZone 뷰모델로 매핑(가동률=online 파생) */
export function useZones() {
  return useQuery({
    queryKey: zoneKeys.list(),
    queryFn: zonesApi.list,
    select: (data) => data.map(toTelecoilZone),
  })
}

/** 텔레코일존 상세 — { zone, devices(HearingLoop[]) } */
export function useZone(id: number | undefined) {
  return useQuery({
    queryKey: zoneKeys.detail(id ?? 0),
    queryFn: () => zonesApi.get(id as number),
    enabled: Boolean(id),
    select: (dto) => ({ zone: toTelecoilZone(dto), devices: dto.devices.map(toZoneDevice) }),
  })
}

/** 존 생성 (이름) — 통합 생성은 호출부에서 계정 생성과 오케스트레이션 */
export function useCreateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => zonesApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  })
}

/** 존 이름 수정 */
export function useUpdateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => zonesApi.update(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  })
}

/** 존 삭제 */
export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => zonesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  })
}
