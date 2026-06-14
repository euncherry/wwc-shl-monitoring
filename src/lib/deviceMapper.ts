import type { DeviceApiResponse, DeviceStatus, HearingLoop } from '@/types/device'

/**
 * UI 상태 뱃지(normal/warning/error/offline) 파생.
 * ⚠️ 백엔드 `status`(PENDING/ACTIVE)와 무관 — `connection_status`·`last_gpio_state`(실값)로 FE가 계산한다.
 * - offline: connection_status === 'OFFLINE'
 * - warning: last_gpio_state=true (과열 Over Temperature 경보). 온도 센서가 없어 실제 온도값은 무의미.
 * - normal:  그 외 (CONNECTING·ONLINE)
 * (error는 에러 로그 기반이라 GET /devices/:mac/errors 연동 시 추가 — 현재 미파생)
 * ⚠️ is_connected는 staging 응답에서 제거됨(connection_status로 대체) → 더 이상 사용 안 함.
 */
export function deriveStatus(dto: DeviceApiResponse): DeviceStatus {
  if ((dto.connection_status ?? 'OFFLINE') === 'OFFLINE') return 'offline'
  if (dto.last_gpio_state === true) return 'warning'
  return 'normal'
}

/**
 * DeviceApiResponse(실응답 + MSW 목 병합) → HearingLoop 뷰모델.
 * 실값: mac/alias/zone/과열경보(last_gpio_state)/펌웨어버전(firmware_version)/연결상태(connection_status)/등록일/last_seen_at/id
 * 동작/가동·전원·네트워크: connection_status로 파생(OFFLINE=꺼짐/끊김, CONNECTING·ONLINE=켜짐). 전원=연결여부, 동작=ONLINE.
 *   ⚠️ is_connected는 staging 응답에서 제거됨 → connection_status에서 파생(!== OFFLINE).
 * 과열 경보: last_gpio_state(true=과열, false=정상). ⚠️ 동작 여부 아님.
 * 온도(last_temperature)는 센서가 없어 무의미 → 과열 판단엔 미사용.
 * 목값: volume / alerts (없으면 기본값)
 * 파생: status (connection_status + 과열경보 기반)
 */
export function toHearingLoop(dto: DeviceApiResponse): HearingLoop {
  const connectionStatus = dto.connection_status ?? 'OFFLINE'
  const connected = connectionStatus !== 'OFFLINE'
  return {
    id: String(dto.id),
    mac: dto.mac_address,
    alias: dto.alias,
    power: connected,
    connectionStatus,
    overTemperature: dto.last_gpio_state ?? false,
    networkConnected: connected,
    wifiSignal: dto.wifi_signal ?? 'DISCONNECTED',
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
