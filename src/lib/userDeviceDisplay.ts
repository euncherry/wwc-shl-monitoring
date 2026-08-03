import type { HearingLoop, DeviceStatus } from '@/types/device'

/* ── 유저 페이지 오프라인 표시 정책 (2026-08-03 사용자 결정) ──
   일상적 소등이 문제로 보이지 않게 미연결 지속 시간에 따라 3단계로 표시한다. 관리자 페이지는 실시간 그대로.
   - 4시간 미만: 전부 정상 연출 (전원 ON·동작 정상·WiFi 정상·과열 실값)
   - 4~24시간: WiFi만 회색 '끊김' (나머지는 정상 연출 유지)
   - 24시간 이상: 진짜 상태 노출 — 빨간 '연결 끊김' 뱃지 + 전원 OFF·작동 중지·'—'
   기준 시각: disconnected_at(백엔드 DTO 노출 요청 중 — BACKEND_REQUIREMENTS §11)
   ?? last_seen_at 인터림(마지막 신호 시각이라 실제 끊김보다 이르게 판정될 수 있음).

   ⚠️ 이 모듈은 사용자 페이지와 표시 규격 실증 페이지(/status-spec)가 함께 쓴다.
   실증 페이지가 실제 정책과 어긋나지 않도록 판정 로직은 반드시 여기 한 곳에만 둔다. */

/** 사용자 페이지에서 '연결 끊김'(장애)으로 승격하는 미연결 지속 시간 */
export const DISCONNECT_ALERT_MS = 24 * 60 * 60 * 1000
/** WiFi '끊김' 표시 유예 — 백엔드 CONNECTION_LOST 알림 기준(connection_lost_hours=4h)과 동일 */
export const WIFI_CUT_SHOW_MS = 4 * 60 * 60 * 1000

export type UserDeviceStatus = DeviceStatus | 'disconnected'

export function deriveUserStatus(d: HearingLoop): UserDeviceStatus {
  if (d.status !== 'offline') return d.status
  if (d.provisionStatus === 'PENDING') return 'normal' // 최초 연결 전 — 끊김 아님
  const since = d.disconnectedAt ?? d.lastUpdated
  if (!since) return 'normal'
  return Date.now() - new Date(since).getTime() >= DISCONNECT_ALERT_MS ? 'disconnected' : 'normal'
}

/** 24h 미만 꺼짐(soft-off) — 전원 ON·동작 정상·과열 실값으로 연출한다.
 *  24h 이상 지속되면 false가 되어 진짜 상태(전원 OFF·작동 중지·'—')와 '연결 끊김' 뱃지가 드러난다. */
export function isSoftOff(d: HearingLoop): boolean {
  return !d.power && deriveUserStatus(d) !== 'disconnected'
}

/** soft-off 중 WiFi를 회색 '끊김'으로 보여줄지 — 미연결 4시간 이상일 때만. 그 전엔 '정상'으로 연출 */
export function isWifiCut(d: HearingLoop): boolean {
  const since = d.disconnectedAt ?? d.lastUpdated
  if (!since) return false
  return Date.now() - new Date(since).getTime() >= WIFI_CUT_SHOW_MS
}
