/* ══════════════════════════════════════════════════════
   알림(Alert) 도메인 타입 — hearingloop-server alerts 모듈 (REAL)
   GET /alerts, GET /alerts/my, PATCH /alerts/:id
   ══════════════════════════════════════════════════════ */

export type AlertTypeEnum =
  | 'TEMPERATURE_ANOMALY'
  | 'CONNECTION_LOST'
  | 'FIRMWARE_UPDATE_AVAILABLE'
  | 'POWER_CUT'
export type AlertPriorityEnum = 'INFO' | 'WARNING' | 'CRITICAL'
export type AlertStatusEnum = 'PENDING' | 'FORWARDED' | 'DISMISSED'

/** AlertResponseDto.device */
export interface AlertDeviceDto {
  id: number
  mac_address: string
  alias: string | null
  zone: { id: number; name: string } | null
}

/** AlertResponseDto */
export interface AlertResponseDto {
  id: number
  type: AlertTypeEnum
  priority: AlertPriorityEnum
  message: string
  status: AlertStatusEnum
  device: AlertDeviceDto | null
  occurred_at: string
  forwarded_at: string | null
  dismissed_at: string | null
  created_at: string
}

/** AlertListResponseDto — 통계 내장 + 페이지네이션 */
export interface AlertListResponseDto {
  total: number
  pending: number
  forwarded: number
  dismissed: number
  today: number
  page: number
  limit: number
  items: AlertResponseDto[]
}

/* ── EN enum → 한글 라벨 ── */
export const ALERT_TYPE_LABEL: Record<AlertTypeEnum, string> = {
  TEMPERATURE_ANOMALY: '온도 이상',
  CONNECTION_LOST: '연결 끊김',
  FIRMWARE_UPDATE_AVAILABLE: '펌웨어 업데이트 필요',
  POWER_CUT: '전원 차단',
}
export const ALERT_PRIORITY_LABEL: Record<AlertPriorityEnum, string> = {
  INFO: '정보',
  WARNING: '경고',
  CRITICAL: '긴급',
}
export const ALERT_STATUS_LABEL: Record<AlertStatusEnum, string> = {
  PENDING: '처리 대기',
  FORWARDED: '전달됨',
  DISMISSED: '종결',
}
