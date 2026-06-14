import type { DeviceApiResponse, DeviceStatus, HearingLoop } from '@/types/device'

/**
 * UI 상태 뱃지(normal/warning/error/offline) 파생.
 * ⚠️ 백엔드 `status`(PENDING/ACTIVE)와 무관 — `is_connected`·`last_gpio_state`(실값)로 FE가 계산한다.
 * - offline: is_connected=false (IoT Core lifecycle 기반 — 동작/가동 여부 신뢰 키)
 * - warning: last_gpio_state=true (과열 Over Temperature 경보). 온도 센서가 없어 실제 온도값은 무의미.
 * - normal:  그 외 online
 * (error는 에러 로그 기반이라 GET /devices/:mac/errors 연동 시 추가 — 현재 미파생)
 */
export function deriveStatus(dto: DeviceApiResponse): DeviceStatus {
  if (!dto.is_connected) return 'offline'
  if (dto.last_gpio_state === true) return 'warning'
  return 'normal'
}

/**
 * DeviceApiResponse(실응답 + MSW 목 병합) → HearingLoop 뷰모델.
 * 실값: mac/alias/zone/과열경보(last_gpio_state)/펌웨어버전(firmware_version)/연결(is_connected)/등록일/last_seen_at/id
 * 동작/가동·전원·네트워크: is_connected 실값(IoT Core lifecycle)으로 일원화 — 별도 실신호 없음.
 * 과열 경보: last_gpio_state(true=과열, false=정상). ⚠️ 동작 여부 아님.
 * 온도(last_temperature)는 센서가 없어 무의미 → 과열 판단엔 미사용.
 * 목값: volume / alerts (없으면 기본값)
 * 파생: status (is_connected + 과열경보 기반)
 */
export function toHearingLoop(dto: DeviceApiResponse): HearingLoop {
  return {
    id: String(dto.id),
    mac: dto.mac_address,
    alias: dto.alias,
    power: dto.is_connected,
    overTemperature: dto.last_gpio_state ?? false,
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
