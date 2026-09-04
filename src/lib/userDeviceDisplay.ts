import type { HearingLoop, DeviceStatus } from '@/types/device'

/* ── 유저 페이지 오프라인 표시 정책 (2026-09-02 사용자 결정으로 갱신) ──
   일상적 소등이 문제로 보이지 않게, 미연결 48시간까지는 **전부 정상으로 연출**한다.
   관리자 페이지는 별도 정책(adminDeviceDisplay — 24시간, WiFi만 끊김).
   - 48시간 미만: 전원 ON · 동작 정상 · WiFi 정상 · **과열도 정상**(마지막 실측값을 감춘다)
   - 48시간 이상: 진짜 상태 노출 — 빨간 '연결 끊김' 뱃지 + 전원 OFF · 작동 중지 · '—'
   기준 시각: disconnected_at(백엔드 DTO 노출 요청 중 — BACKEND_REQUIREMENTS §11)
   ?? last_seen_at 인터림(마지막 신호 시각이라 실제 끊김보다 이르게 판정될 수 있음).

   ⚠️ 이전 3단계(4h WiFi 회색 '끊김')는 폐지했다. 유예 구간 안에서 유일하게 비정상으로 보이던
      두 신호(4h WiFi 끊김 · 마지막 과열)를 없애, 창 안에서는 화면이 서로 어긋나지 않는다.
      켜져 있는 기기의 과열은 유예 대상이 아니라 그대로 '경고'로 뜬다.

   ⚠️ 이 모듈은 사용자 페이지와 표시 규격 실증 페이지(/status-spec)가 함께 쓴다.
   실증 페이지가 실제 정책과 어긋나지 않도록 판정 로직은 반드시 여기 한 곳에만 둔다. */

/** 사용자 페이지에서 '연결 끊김'(장애)으로 승격하는 미연결 지속 시간 */
export const DISCONNECT_ALERT_MS = 48 * 60 * 60 * 1000

export type UserDeviceStatus = DeviceStatus | 'disconnected'

export function deriveUserStatus(d: HearingLoop): UserDeviceStatus {
  if (d.status !== 'offline') return d.status
  if (d.provisionStatus === 'PENDING') return 'normal' // 최초 연결 전 — 끊김 아님
  const since = d.disconnectedAt ?? d.lastUpdated
  if (!since) return 'normal'
  return Date.now() - new Date(since).getTime() >= DISCONNECT_ALERT_MS ? 'disconnected' : 'normal'
}

/** 48h 미만 꺼짐(soft-off) — 전원 ON·동작 정상·WiFi 정상·과열 정상으로 연출한다.
 *  48h 이상 지속되면 false가 되어 진짜 상태(전원 OFF·작동 중지·'—')와 '연결 끊김' 뱃지가 드러난다. */
export function isSoftOff(d: HearingLoop): boolean {
  return !d.power && deriveUserStatus(d) !== 'disconnected'
}
