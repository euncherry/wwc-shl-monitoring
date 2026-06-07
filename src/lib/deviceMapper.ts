import type { DeviceApiResponse, DeviceStatus, HearingLoop } from '@/types/device'

/**
 * UI 상태 뱃지(normal/warning/error/offline) 파생.
 * ⚠️ 백엔드 `status`(PENDING/ACTIVE)와 무관 — `is_connected`(실값) + 온도로 FE가 계산한다.
 * - offline: is_connected=false (백엔드 최근 5분 통신 기준)
 * - warning: 온도 임계값 초과
 * - normal:  그 외 online
 * (error는 에러 로그/전원 OFF 장기 지속 기반이라 데이터 소스가 생기면 추가 — 현재 미파생)
 */
export function deriveStatus(dto: DeviceApiResponse): DeviceStatus {
  if (!dto.is_connected) return 'offline'
  if (dto.last_temperature != null && dto.last_temperature > 45) return 'warning'
  return 'normal'
}

/**
 * DeviceApiResponse(실응답 + MSW 목 병합) → HearingLoop 뷰모델.
 * 실값: mac/alias/zone/온도(last_temperature)/동작(last_gpio_state)/펌웨어버전(firmware_version)/연결(is_connected)/등록일/last_seen_at/id
 * 전원·네트워크: is_connected 실값으로 표시(연결=전원 ON·네트워크 연결됨). 별도 실신호 없어 연결 상태로 일원화.
 * 목값: volume / alerts (없으면 기본값)
 * 파생: status (is_connected 기반)
 */
export function toHearingLoop(dto: DeviceApiResponse): HearingLoop {
  return {
    id: String(dto.id),
    mac: dto.mac_address,
    alias: dto.alias,
    power: dto.is_connected,
    operating: dto.last_gpio_state ?? false,
    networkConnected: dto.is_connected,
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
