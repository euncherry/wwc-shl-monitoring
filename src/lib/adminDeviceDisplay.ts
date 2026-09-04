import type { HearingLoop, ConnectionStatus, WifiSignal } from '@/types/device'

/* ── 관리자 페이지 미연결 표시 정책 (2026-09-03 사용자 결정) ──
   야간 소등·주말 휴관 같은 일상적 전원 차단이 장애로 보이지 않게, 미연결 24시간까지는
   전원·동작을 정상으로 연출하고 **WiFi만 '끊김'** 으로 보여준다.
   - 24시간 미만: 전원 ON · 동작 정상 작동 · WiFi 끊김 · 과열은 마지막 실값
   - 24시간 이상: 진짜 상태 그대로 (전원 OFF · 작동 중지 · '—')

   ⚠️ 이전에는 관리자 화면이 '실시간 그대로'였다. 이 정책이 목록·지도·KPI·가동률·조치 필요에
      **전부 같은 기준으로** 걸려야 한다 — 한 곳만 빼면 같은 기기를 목록은 '정상 가동',
      대시보드는 '확인 필요'로 말하게 된다.
   ⚠️ 사용자 페이지 정책(userDeviceDisplay, 48시간·과열까지 가림)과는 별개다. 두 값을 묶지 말 것.

   기준 시각: disconnected_at(백엔드 DTO 노출 요청 중 — BACKEND_REQUIREMENTS §11)
   ?? last_seen_at 인터림(마지막 신호 시각이라 실제 끊김보다 이르게 판정될 수 있음). */

/** 관리자 화면에서 미연결을 '장애'로 드러내는 지속 시간 */
export const ADMIN_GRACE_MS = 24 * 60 * 60 * 1000

/** 24h 미만 미연결(soft-off) — 전원·동작을 정상으로 연출하는 구간인가.
 *  ⚠️ 프로비저닝 전(PENDING) 기기는 '미연결 시간'이라는 개념이 없어 유예 대상이 아니다.
 *     관리자는 이 기기들을 '프로비저닝 대기'로 따로 봐야 한다. */
export function isAdminSoftOff(d: HearingLoop): boolean {
  if (d.connectionStatus !== 'OFFLINE') return false
  if (d.provisionStatus === 'PENDING') return false
  const since = d.disconnectedAt ?? d.lastUpdated
  if (!since) return false
  const ms = new Date(since).getTime()
  if (!Number.isFinite(ms)) return false
  return Date.now() - ms < ADMIN_GRACE_MS
}

/** 관리자 화면이 기기를 '가동 중'으로 세는 기준 — ONLINE·UPDATING + 유예 구간의 soft-off */
export function isAdminLive(d: HearingLoop): boolean {
  return d.connectionStatus === 'ONLINE' || isAdminSoftOff(d)
}

export interface AdminDisplay {
  softOff: boolean
  /** 전원 ON으로 보일지 */
  alive: boolean
  /** 동작 칸에 쓸 연결 상태 — soft-off는 ONLINE으로 연출 */
  dispConn: ConnectionStatus
  /** WiFi 칸에 쓸 신호 — soft-off는 무조건 끊김 */
  wifiSignal: WifiSignal
}

/** 관리자 행·카드가 함께 쓰는 표시값. 판정을 여러 곳에 흩지 않도록 여기 한 곳에서 만든다. */
export function adminDisplay(d: HearingLoop): AdminDisplay {
  const softOff = isAdminSoftOff(d)
  return {
    softOff,
    alive: d.power || softOff,
    dispConn: softOff ? 'ONLINE' : d.connectionStatus,
    wifiSignal: softOff ? 'DISCONNECTED' : d.wifiSignal,
  }
}
