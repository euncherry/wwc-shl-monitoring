import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zonesApi } from '@/api/zones'
import { toTelecoilZone } from '@/lib/zoneMapper'
import { useDevices } from './useDevices'
import { isAdminLive } from '@/lib/adminDeviceDisplay'
import type { HearingLoop } from '@/types/device'

export const zoneKeys = {
  all: ['zones'] as const,
  list: () => [...zoneKeys.all, 'list'] as const,
  detail: (id: number) => [...zoneKeys.all, 'detail', id] as const,
}

/** zone_id별 { 전체 기기 수, 정상가동 수 } 맵 (GET /devices 파생).
 *  ⚠️ 가동 판정은 관리자 표시 정책(isAdminLive — 미연결 24h 유예)을 따른다.
 *     connection_status 원값으로 세면 기기 목록은 '정상 가동'인데 존 가동률만 낮게 나온다. */
function countByZone(devices: HearingLoop[] | undefined) {
  const map = new Map<string, { total: number; online: number }>()
  for (const d of devices ?? []) {
    if (!d.telecoilZoneId) continue
    const e = map.get(d.telecoilZoneId) ?? { total: 0, online: 0 }
    e.total += 1
    if (isAdminLive(d)) e.online += 1
    map.set(d.telecoilZoneId, e)
  }
  return map
}

/**
 * 텔레코일존 목록 — TelecoilZone 뷰모델.
 * zone 응답엔 전체 기기 수가 없어 GET /devices에서 zone_id별로 집계해 deviceCount를 채운다.
 */
export function useZones() {
  const zonesQ = useQuery({ queryKey: zoneKeys.list(), queryFn: zonesApi.list })
  const devicesQ = useDevices()

  const data = useMemo(() => {
    if (!zonesQ.data) return undefined
    const counts = countByZone(devicesQ.data)
    return zonesQ.data.map((z) => {
      const c = counts.get(String(z.id)) ?? { total: 0, online: 0 }
      return toTelecoilZone(z, c.total, c.online)
    })
  }, [zonesQ.data, devicesQ.data])

  return {
    data,
    isLoading: zonesQ.isLoading || devicesQ.isLoading,
    isError: zonesQ.isError || devicesQ.isError,
    refetch: () => {
      zonesQ.refetch()
      devicesQ.refetch()
    },
  }
}

/**
 * 텔레코일존 상세 — { zone, devices(HearingLoop[]) }.
 * 배정 기기 목록은 GET /devices에서 zone_id로 필터(실 텔레메트리).
 */
export function useZone(id: number | undefined) {
  const zoneQ = useQuery({
    queryKey: zoneKeys.detail(id ?? 0),
    queryFn: () => zonesApi.get(id as number),
    enabled: Boolean(id),
  })
  const devicesQ = useDevices()

  const data = useMemo(() => {
    if (!zoneQ.data) return undefined
    const devices = (devicesQ.data ?? []).filter((d) => d.telecoilZoneId === String(zoneQ.data.id))
    const online = devices.filter(isAdminLive).length
    return { zone: toTelecoilZone(zoneQ.data, devices.length, online), devices }
  }, [zoneQ.data, devicesQ.data])

  return {
    data,
    isLoading: zoneQ.isLoading || devicesQ.isLoading,
    isError: zoneQ.isError || devicesQ.isError,
  }
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
