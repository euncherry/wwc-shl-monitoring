import type { ZoneResponseDto, TelecoilZone, ZoneStatus } from '@/types/device'

/** 존을 '정상'으로 볼 가동률 하한(%) — 카드의 가동률 막대가 '양호'로 바뀌는 지점과 같다 */
export const ZONE_HEALTHY_PCT = 80

/**
 * 존 상태 파생 — 가동률 기준(가동 판정은 adminDeviceDisplay.isAdminLive, 미연결 24h 유예):
 * - 기기 0 또는 정상가동 0 → inactive(비활성)
 * - 가동률 80% 이상 → active(정상)
 * - 그 미만 → warning(주의)
 *
 * ⚠️ 예전엔 '전부 정상가동'이어야 active였다. 50대 중 1대만 장애여도(98%) 존 전체가 '주의'로
 *    떨어져 같은 카드 안에서 '가동률 98%'와 '주의'가 부딪혔다.
 */
export function deriveZoneStatus(total: number, active: number): ZoneStatus {
  if (total === 0 || active === 0) return 'inactive'
  return Math.round((active / total) * 100) >= ZONE_HEALTHY_PCT ? 'active' : 'warning'
}

/**
 * ZoneResponseDto → TelecoilZone 뷰모델.
 * 실값: name · user.email(담당자) · created_at
 * deviceCount(전체 기기 수)·activeDeviceCount(정상가동 수)는 응답에 없거나 신뢰 불가라
 * GET /devices에서 FE가 파생한 값을 인자로 받는다(가동 판정은 adminDeviceDisplay.isAdminLive — 미연결 24h 유예).
 * ⚠️ 백엔드 dto.active_device_count는 staging에서 0 고정(미갱신)이라 사용하지 않음.
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
