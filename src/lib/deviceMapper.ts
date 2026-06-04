import type { DeviceApiResponse, DeviceStatus, HearingLoop } from '@/types/device'

/**
 * 오프라인 판정 임계값. 기본 5분(§3 — 미확정, StatusReport 주기 확정 시 조정).
 * 백엔드가 connection_status를 내려주면 이 파생 로직 자체를 제거(§13).
 */
export const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000

/**
 * UI 상태 뱃지(normal/warning/error/offline) 파생.
 * ⚠️ 백엔드 `status`(PENDING/ACTIVE)와 무관 — `last_seen_at` + 임계값으로 FE가 계산한다.
 * - offline: last_seen_at 없음 또는 임계값 초과
 * - warning: 온도 임계값 초과 (목 기준)
 * - normal:  그 외 online
 * (error는 에러 로그/전원 OFF 장기 지속 기반이라 데이터 소스가 생기면 추가 — 현재 미파생)
 */
export function deriveStatus(dto: DeviceApiResponse): DeviceStatus {
  if (!dto.last_seen_at) return 'offline'
  const lastSeen = new Date(dto.last_seen_at).getTime()
  if (Number.isNaN(lastSeen) || Date.now() - lastSeen > OFFLINE_THRESHOLD_MS) {
    return 'offline'
  }
  if (dto.last_temperature != null && dto.last_temperature > 45) return 'warning'
  return 'normal'
}

/**
 * DeviceApiResponse(실응답 + MSW 목 병합) → HearingLoop 뷰모델.
 * 실값: mac/alias/zone/온도(last_temperature)/동작(last_gpio_state)/등록일/last_seen_at/id
 * 목값: power / network_connected / volume / firmware_version / alerts (없으면 기본값)
 * 파생: status
 */
export function toHearingLoop(dto: DeviceApiResponse): HearingLoop {
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
    status: deriveStatus(dto),
    telecoilZoneId: dto.zone_id != null ? String(dto.zone_id) : null,
    telecoilZoneName: dto.zone?.name ?? null,
    lastUpdated: dto.last_seen_at ?? dto.created_at,
    registeredAt: dto.registered_at ?? dto.created_at,
    alerts: dto.alerts ?? [],
  }
}
