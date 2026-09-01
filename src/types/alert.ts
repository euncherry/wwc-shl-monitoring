/* ══════════════════════════════════════════════════════
   알림(Alert) 도메인 타입 — hearingloop-server alerts 모듈 (REAL)
   GET /alerts, GET /alerts/my, PATCH /alerts/:id
   ══════════════════════════════════════════════════════ */

export type AlertTypeEnum =
  | 'TEMPERATURE_ANOMALY'
  | 'CONNECTION_LOST'
  | 'FIRMWARE_UPDATE_AVAILABLE'
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

/** MyAlertListResponseDto — GET /alerts/my (ZONE_USER).
 *  ⚠️ 관리자용 AlertListResponseDto와 달리 통계 필드가 없다(total/page/limit/items뿐).
 *  ⚠️ 백엔드가 status=FORWARDED로 고정 필터하므로 '관리자가 전달한 알림'만 내려온다. */
export interface MyAlertListResponseDto {
  total: number
  page: number
  limit: number
  items: AlertResponseDto[]
}

/* ── EN enum → 한글 라벨 ── */
export const ALERT_TYPE_LABEL: Record<AlertTypeEnum, string> = {
  TEMPERATURE_ANOMALY: '온도 이상',
  CONNECTION_LOST: '연결 끊김',
  FIRMWARE_UPDATE_AVAILABLE: '펌웨어 업데이트 필요',
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

/**
 * 알림 임계값 (AlertThresholdsDto, REAL).
 * ⚠️ temp_threshold는 백엔드 7dcb3ff에서 제거됨 — 온도 알림이 하드웨어 과열(gpio) 기반으로 전환되어
 * 온도 임계값 개념이 사라짐. 이제 미연결 임계값만 설정.
 */
export interface AlertThresholds {
  /** 미연결 임계값 시간 (이상 미연결 시 CONNECTION_LOST 알림) */
  connection_lost_hours: number
}
