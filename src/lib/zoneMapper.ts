import type { ZoneResponseDto, TelecoilZone, ZoneStatus } from '@/types/device'

/**
 * 존 상태 파생 — 정상 가동(active_device_count, REAL) 비율 기준:
 * - 기기 0 또는 정상가동 0 → inactive(비활성)
 * - 전부 정상가동 → active(정상)
 * - 일부만 → warning(주의)
 */
export function deriveZoneStatus(total: number, active: number): ZoneStatus {
  if (total === 0 || active === 0) return 'inactive'
  if (active === total) return 'active'
  return 'warning'
}

/**
 * ZoneResponseDto → TelecoilZone 뷰모델.
 * 실값: name · user.email(담당자) · created_at
 * deviceCount(전체 기기 수)·activeDeviceCount(정상가동=ONLINE 수)는 응답에 없거나 신뢰 불가라
 * GET /devices의 connection_status에서 FE가 파생한 값을 인자로 받는다.
 * ⚠️ 백엔드 dto.active_device_count는 staging에서 0 고정(미갱신)이라 사용하지 않음 — connection_status==='ONLINE' 집계로 대체.
 */
export function toTelecoilZone(dto: ZoneResponseDto, deviceCount: number, activeDeviceCount: number): TelecoilZone {
  return {
    id: String(dto.id),
    name: dto.name,
    managerEmail: dto.user?.email ?? '',
    userAccount: dto.user ? { id: String(dto.user.id), username: dto.user.username } : null,
    status: deriveZoneStatus(deviceCount, activeDeviceCount),
    deviceCount,
    activeDeviceCount,
    registeredAt: dto.created_at,
    lastUpdated: dto.created_at, // 백엔드 updated_at 없음
    alerts: [],
  }
}
