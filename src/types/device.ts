import type { FirmwareResponseDto } from './firmware'

export type DeviceStatus = 'normal' | 'warning' | 'error' | 'offline'

/** Wi-Fi 신호 강도 (RSSI 기반, REAL — 백엔드 3f1f93a). STRONG≥-55 / FAIR≥-67 / WEAK<-67 / DISCONNECTED=미수신·끊김 */
export type WifiSignal = 'DISCONNECTED' | 'WEAK' | 'FAIR' | 'STRONG'

/**
 * 연결 상태 (REAL). is_connected를 보강·대체.
 * OFFLINE=끊김 / ONLINE=정상 운영 / UPDATING=펌웨어 업데이트 진행 중.
 * is_connected = (connection_status !== OFFLINE).
 */
export type ConnectionStatus = 'OFFLINE' | 'ONLINE' | 'UPDATING'

export interface HearingLoop {
  id: string
  mac: string
  /** 별칭(alias). 없으면 MAC이 메인 타이틀. (옛 mock 데이터엔 없을 수 있어 optional) */
  alias?: string | null
  /** 전원/연결 여부 (is_connected = connection_status !== OFFLINE) */
  power: boolean
  /** 기기 동작/가동 상태 (REAL — connection_status). ONLINE=정상 작동 / UPDATING=업데이트 중 / OFFLINE=작동 중지 */
  connectionStatus: ConnectionStatus
  /** 과열(Over Temperature) 경보. true=과열 감지, false=정상. ⚠️ 동작 여부 아님 — last_gpio_state 기반. */
  overTemperature: boolean
  networkConnected: boolean
  /** Wi-Fi 신호 강도 (REAL — wifi_signal) */
  wifiSignal: WifiSignal
  /** ⚠️ 임시: Wi-Fi RSSI 원시값(dBm). 백엔드가 신호 단계 디버깅용으로 추가 — 검증 후 제거 예정 */
  wifiRssi?: number | null
  /** 접속 중인 Wi-Fi SSID (REAL). 구펌웨어·미연결이면 null → UI에서 미표시 */
  wifiSsid?: string | null
  /** 설치 위치 (WGS84). 미지정이면 null — 지도뷰에서 제외 */
  latitude: number | null
  longitude: number | null
  temperature: number
  volume: number
  firmwareVersion: string
  /** 설치된 펌웨어 세트(번들) 객체 — develop firmware. null/undefined=설치 이력 없음. firmwareVersion은 이 객체의 version. */
  installedFirmware?: FirmwareResponseDto | null
  /** ESP32 WiFi MCU 펌웨어 버전 */
  wifiFirmwareVersion: string | null
  /** Nordic NRF HL MCU 펌웨어 버전 */
  hlFirmwareVersion: string | null
  /** 펌웨어 불일치 — 업데이트 도중 WiFi MCU·HL MCU 중 하나만 성공 시 true */
  firmwareInconsistent: boolean
  status: DeviceStatus
  /** 프로비저닝 상태 (REAL — DeviceResponseDto.status). PENDING=화이트리스트 등록·IoT 프로비저닝(최초 연결) 대기, ACTIVE=완료. ⚠️ 동작상태(status·connectionStatus)와 무관. */
  provisionStatus?: ProvisionStatus
  telecoilZoneId: string | null
  telecoilZoneName: string | null
  lastUpdated: string
  registeredAt: string
  /** 연결 끊김 시각(재연결 시 null). 백엔드 DTO 노출 대기 — 없으면 lastUpdated(last_seen_at)로 근사. */
  disconnectedAt?: string | null
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
  /** GPIO 상태 = 과열(Over Temperature) 경보 (REAL). true(1)=과열 감지, false(0)=정상. ⚠️ 동작/가동 여부 아님 — 온도 센서가 없어 실제 온도값은 못 내려오고, 과열 하드웨어 블럭 동작 여부만 판단. */
  last_gpio_state: boolean | null
  /** 온도 °C. ⚠️ 무의미 — 기기에 온도 센서 없음(고정/시드값). 고온 여부는 last_gpio_state(과열 경보)로 판단. */
  last_temperature: number | null
  last_seen_at: string | null
  /** 연결이 끊긴 시각(재연결 시 null). 백엔드 엔티티엔 있으나 DTO 미노출 — 노출 요청 중(BACKEND_REQUIREMENTS §11).
   *  내려오면 유저 페이지 '연결 끊김(24h 지속)' 판정의 정확한 기준이 됨(현재는 last_seen_at 인터림). */
  disconnected_at?: string | null
  /** 현재 설치된 펌웨어 세트(번들) 객체. 마지막 완료 설치 기준(firmware_version·firmware_id 대체 — develop 579ea6b). */
  firmware: FirmwareResponseDto | null
  /** ESP32 WiFi MCU 펌웨어 버전 */
  wifi_firmware_version: string | null
  /** Nordic NRF HL MCU 펌웨어 버전 */
  hl_firmware_version: string | null
  /** ⚠️ deprecated: staging 응답에서 제거됨. connection_status로 대체. (구버전 호환용 optional) */
  is_connected?: boolean
  /** 연결 상태 (REAL — d1d09c0). OFFLINE/CONNECTING/ONLINE. 동작/가동 판단의 신뢰 키. */
  connection_status: ConnectionStatus
  /** Wi-Fi 신호 강도 (REAL — 3f1f93a). RSSI ENUM. */
  wifi_signal: WifiSignal
  /** ⚠️ 임시: Wi-Fi RSSI 원시값(dBm). 신호 단계 디버깅용 — 검증 후 제거 예정 */
  wifi_rssi_dbm?: number | null
  /** 기기가 접속 중인 Wi-Fi SSID (REAL — 75e1841, 펌웨어 2026-07-13 StatusReport.wifi_ssid).
   *  구펌웨어(미전송)·미연결이면 null. 비밀번호·인증정보는 프로토콜상 전송되지 않음. */
  wifi_ssid?: string | null
  /** 설치 위치 위도 (REAL — 334dfb1, WGS84). 미지정이면 null. optional인 이유: prod 백엔드 반영 전 호환 */
  latitude?: number | null
  /** 설치 위치 경도 (REAL — 334dfb1, WGS84). 미지정이면 null */
  longitude?: number | null
  /** 펌웨어 불일치 — 업데이트 도중 WiFi MCU·HL MCU 중 하나만 성공 시 true */
  firmware_inconsistent: boolean
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
  /** GPIO 상태 = 과열(Over Temperature) 경보. true=과열, false=정상. (동작 ON/OFF 아님) */
  gpio_state: boolean | null
  /** 온도 °C — ⚠️ 무의미(센서 없음). 과열 여부는 gpio_state. */
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

/** GET /devices/:mac/errors — 기기 자체 에러 로그 */
export interface DeviceErrorLog {
  id: number
  mac_address: string
  code: string
  message: string | null
  occurred_at: string
  created_at: string
}

/** GET /devices/:mac/device-logs — 기기 디바이스 로그 레벨 */
export type DeviceLogLevel = 'UNSPECIFIED' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

/** GET /devices/:mac/device-logs — 단건 로그 항목 */
export interface DeviceLogDto {
  id: number
  mac_address: string
  level: DeviceLogLevel
  module: string
  message: string
  context: string | null
  received_at: string
  created_at: string
}

/** GET /devices/:mac/device-logs — 페이지네이션 응답 */
export interface DeviceLogPageDto {
  data: DeviceLogDto[]
  total: number
  page: number
  limit: number
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
