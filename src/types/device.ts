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
  /** ESP32 펌웨어 버전 (REAL — HelloRequest 수신 시 갱신) */
  firmware_version: string | null
  /** 기기 연결 여부 (REAL — 최근 5분 이내 통신 시 true) */
  is_connected: boolean
  zone: ZoneSummary | null
  created_at: string
}

/**
 * MSW가 응답에 병합하는 목 필드(StatusReport 확장 대기 — §1).
 * 실값이 내려오기 시작하면 MSW 핸들러와 함께 제거(§13).
 * (firmware_version·is_connected는 백엔드 실값으로 전환됨 → 목에서 제외)
 */
export interface MockDeviceFields {
  power?: boolean
  network_connected?: boolean
  volume?: number
  alerts?: AlertHistory[]
}

/** 실응답 + MSW 목 병합 결과 (프론트가 실제로 받는 형태) */
export type DeviceApiResponse = DeviceResponseDto & MockDeviceFields

/** GET /devices — 페이지네이션 응답(DevicePageDto). 백엔드 7b79fc5에서 배열→객체로 변경됨. */
export interface DevicePageDto {
  data: DeviceApiResponse[]
  total: number
  page: number
  limit: number
}

/** POST /devices/bulk 응답 (BulkCreateDeviceResponseDto) */
export interface BulkCreateResult {
  created: DeviceResponseDto[]
  skipped: string[]
}

/* ── 기기 상태 이력 (GET /devices/:mac/status) — StatusReport 시계열, REAL ── */
export interface DeviceStatusLogDto {
  id: number
  mac_address: string
  /** GPIO 상태(동작 ON/OFF) */
  gpio_state: boolean | null
  /** 온도 °C */
  temperature: number | null
  /** 기기 보고 시각 */
  reported_at: string
  created_at: string
}

export interface StatusLogPageDto {
  data: DeviceStatusLogDto[]
  total: number
  page: number
  limit: number
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

/** ZoneResponseDto.user (UserSummaryDto) — email 포함(REAL, b667885) */
export interface UserSummary {
  id: number
  username: string
  email: string
  name: string
  role: 'ADMIN' | 'ZONE_USER'
}

/**
 * ZoneResponseDto (b667885 이후) — devices[] 제거, active_device_count·user.email 추가(REAL).
 * ⚠️ 전체 기기 수(device_count)는 응답에 없음 → FE가 GET /devices에서 파생.
 */
export interface ZoneResponseDto {
  id: number
  name: string
  /** 정상 가동(최근 5분 통신) 기기 수 — REAL DB 집계 */
  active_device_count: number
  user: UserSummary | null
  created_at: string
}

/** GET /zones — 페이지네이션 응답(ZonePageDto). 7b79fc5에서 배열→객체. */
export interface ZonePageDto {
  data: ZoneResponseDto[]
  total: number
  page: number
  limit: number
}
