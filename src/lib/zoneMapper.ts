import type {
  ZoneApiResponse,
  ZoneDeviceApiResponse,
  TelecoilZone,
  ZoneStatus,
  HearingLoop,
} from '@/types/device'

/**
 * 존 상태 파생 — 정상 가동(목) 비율 기준:
 * - 기기 0 또는 정상가동 0 → inactive(비활성)
 * - 전부 정상가동 → active(정상)
 * - 일부만 → warning(주의)
 * ⚠️ activeDeviceCount는 목(MSW). last_seen은 이벤트기반이라 online 판정 불가(§3) → 백엔드 "정상 가동 기기 수" 대기.
 */
export function deriveZoneStatus(total: number, active: number): ZoneStatus {
  if (total === 0 || active === 0) return 'inactive'
  if (active === total) return 'active'
  return 'warning'
}

/** ZoneApiResponse(실 + MSW 목 병합) → TelecoilZone 뷰모델 */
export function toTelecoilZone(dto: ZoneApiResponse): TelecoilZone {
  const total = dto.devices.length
  const active = dto.activeDeviceCount ?? 0 // 정상 가동(목)
  return {
    id: String(dto.id),
    name: dto.name,
    managerEmail: dto.managerEmail ?? '',
    userAccount: dto.user ? { id: String(dto.user.id), username: dto.user.username } : null,
    status: deriveZoneStatus(total, active),
    deviceCount: total,
    activeDeviceCount: active,
    registeredAt: dto.created_at,
    lastUpdated: dto.created_at, // 백엔드 updated_at 없음
    alerts: [], // 알림 목(5단계)
  }
}

/**
 * zone 상세의 기기(ZoneDeviceApiResponse = DeviceInZoneDto + 목 텔레메트리) → HearingLoop 뷰모델.
 * 전원/네트워크/펌웨어는 목, 온도/동작은 실값. status는 3B 상세에서 미사용.
 */
export function toZoneDevice(dto: ZoneDeviceApiResponse): HearingLoop {
  return {
    id: String(dto.id),
    mac: dto.mac_address,
    alias: dto.alias,
    power: dto.power ?? false,
    operating: dto.last_gpio_state ?? false,
    networkConnected: dto.network_connected ?? false,
    temperature: dto.last_temperature ?? 0,
    volume: dto.volume ?? 0,
    firmwareVersion: dto.firmware_version ?? '',
    status: 'normal', // 미사용
    telecoilZoneId: null,
    telecoilZoneName: null,
    lastUpdated: dto.last_seen_at ?? dto.created_at,
    registeredAt: dto.created_at,
    alerts: dto.alerts ?? [],
  }
}
