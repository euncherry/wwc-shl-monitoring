export type DeviceStatus = 'normal' | 'warning' | 'error' | 'offline'

export interface HearingLoop {
  id: string
  mac: string
  /** 별칭(alias). 없으면 MAC이 메인 타이틀. (옛 mock 데이터엔 없을 수 있어 optional) */
  alias?: string | null
  power: boolean
  operating: boolean
  networkConnected: boolean
  temperature: number
  volume: number
  firmwareVersion: string
  status: DeviceStatus
  telecoilZoneId: string | null
  telecoilZoneName: string | null
  lastUpdated: string
  registeredAt: string
  alerts: AlertHistory[]
}

export interface AlertHistory {
  id: string
  type: '온도 이상' | '전원 차단' | '볼륨 이상' | '연결 끊김' | '펌웨어 업데이트 필요'
  level: 'critical' | 'warning' | 'info'
  message: string
  createdAt: string
}

/* ══════════════════════════════════════════════════════
   백엔드 API 응답 타입 (Swagger) — 3A 기기 도메인
   ══════════════════════════════════════════════════════ */

/** ⚠️ 프로비저닝 상태. UI 상태 뱃지(normal/warning/error/offline)와 무관 — 혼동 금지. */
export type ProvisionStatus = 'PENDING' | 'ACTIVE'

/** ZoneSummaryDto */
export interface ZoneSummary {
  id: number
  name: string
  created_at: string
}

/** DeviceResponseDto — GET /devices, GET /devices/:mac 등 */
export interface DeviceResponseDto {
  id: number
  mac_address: string
  zone_id: number | null
  alias: string | null
  status: ProvisionStatus
  registered_at: string | null
  /** GPIO 상태 → 기기 동작 여부 (REAL) */
  last_gpio_state: boolean | null
  /** 온도 °C (REAL) */
  last_temperature: number | null
  last_seen_at: string | null
  zone: ZoneSummary | null
  created_at: string
}

/**
 * MSW가 응답에 병합하는 목 필드(StatusReport 확장 대기 — §1).
 * 실값이 내려오기 시작하면 MSW 핸들러와 함께 제거(§13).
 */
export interface MockDeviceFields {
  power?: boolean
  network_connected?: boolean
  volume?: number
  firmware_version?: string
  alerts?: AlertHistory[]
}

/** 실응답 + MSW 목 병합 결과 (프론트가 실제로 받는 형태) */
export type DeviceApiResponse = DeviceResponseDto & MockDeviceFields

/** POST /devices/bulk 응답 (BulkCreateDeviceResponseDto) */
export interface BulkCreateResult {
  created: DeviceResponseDto[]
  skipped: string[]
}

export type AlertLevel = 'critical' | 'warning' | 'info'
export type AlertType = '온도 이상' | '전원 차단' | '볼륨 이상' | '연결 끊김' | '펌웨어 업데이트 필요'
export type AlertState = 'pending' | 'forwarded' | 'dismissed'

export interface SystemAlert {
  id: string
  type: AlertType
  level: AlertLevel
  message: string
  deviceId: string
  deviceMac: string
  telecoilZoneId: string | null
  telecoilZoneName: string | null
  state: AlertState
  createdAt: string
  processedAt: string | null
  processedBy: string | null
}

export type ZoneStatus = 'active' | 'warning' | 'inactive'

export interface TelecoilZone {
  id: string
  name: string
  managerEmail: string
  userAccount: { id: string; username: string } | null
  status: ZoneStatus
  deviceCount: number
  activeDeviceCount: number
  registeredAt: string
  lastUpdated: string
  alerts: AlertHistory[]
}

/* ══════════════════════════════════════════════════════
   구역(Zone) API 응답 타입 (Swagger) — 3B 텔레코일존
   ══════════════════════════════════════════════════════ */

/** ZoneResponseDto.devices[] (DeviceInZoneDto) — zone 응답에 포함된 기기 요약 */
export interface DeviceInZoneDto {
  id: number
  mac_address: string
  alias: string | null
  status: ProvisionStatus
  last_gpio_state: boolean | null
  last_temperature: number | null
  last_seen_at: string | null
  created_at: string
}

/** ZoneResponseDto.user (UserSummaryDto) — email 없음(목으로 보강) */
export interface UserSummary {
  id: number
  username: string
  name: string
  role: 'ADMIN' | 'ZONE_USER'
}

/** ZoneResponseDto */
export interface ZoneResponseDto {
  id: number
  name: string
  devices: DeviceInZoneDto[]
  user: UserSummary | null
  created_at: string
}

/**
 * MSW가 zone 응답에 병합하는 목 필드(§13 — 백엔드 보강 요청 예정).
 * - managerEmail: 담당자(zone.user) 이메일 (실 user 응답엔 없음)
 * - activeDeviceCount: 정상 가동(온라인) 기기 수 — ⚠️ 목. last_seen은 이벤트기반이라 online 판정 불가(§3),
 *   백엔드에 "정상 가동 기기 수" 요청 예정. 가동률 = activeDeviceCount / devices.length.
 */
export interface ZoneMockFields {
  managerEmail?: string | null
  activeDeviceCount?: number
}

/** 실 zone 응답 + MSW 목 병합 */
export type ZoneApiResponse = ZoneResponseDto & ZoneMockFields

/** zone 상세의 기기 카드용 — DeviceInZoneDto + 목 텔레메트리(전원/네트워크/펌웨어, 온도는 실값) */
export type ZoneDeviceApiResponse = DeviceInZoneDto & MockDeviceFields
