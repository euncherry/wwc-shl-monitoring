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
 * 실값: name · active_device_count(정상가동) · user.email(담당자) · created_at
 * deviceCount(전체 기기 수)는 응답에 없어 GET /devices에서 파생한 값을 인자로 받는다.
 */
export function toTelecoilZone(dto: ZoneResponseDto, deviceCount: number): TelecoilZone {
  const active = dto.active_device_count ?? 0
  return {
    id: String(dto.id),
    name: dto.name,
    managerEmail: dto.user?.email ?? '',
    userAccount: dto.user ? { id: String(dto.user.id), username: dto.user.username } : null,
    status: deriveZoneStatus(deviceCount, active),
    deviceCount,
    activeDeviceCount: active,
    registeredAt: dto.created_at,
    lastUpdated: dto.created_at, // 백엔드 updated_at 없음
    alerts: [],
  }
}
