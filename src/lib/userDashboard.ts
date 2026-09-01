/** 사용자 대시보드 집계 — 순수 로직. React 무의존.
 *
 *  ZONE_USER가 접근 가능한 엔드포인트는 둘뿐이다(백엔드 @Roles 확인):
 *   - GET /devices     → 소속 기기 자동 필터. 텔레메트리 전량
 *   - GET /alerts/my   → ⚠️ status=FORWARDED만. 관리자가 '전달'한 알림만 보인다(통계·날짜필터 없음)
 *  (/alerts, /alerts/settings/thresholds, /devices/:mac/errors, /firmware/* 는 전부 ADMIN 전용)
 *
 *  ⚠️ 상태 판정은 반드시 유저 표시 정책(userDeviceDisplay.deriveUserStatus)을 따른다.
 *     관리자 대시보드의 ONLINE 기준을 그대로 쓰면 야간 소등 때문에
 *     "전 기기 정상인데 가동률 50%"가 나와 화면끼리 어긋난다.
 */

import type { HearingLoop } from '@/types/device'
import type { AlertResponseDto } from '@/types/alert'
import { deriveUserStatus, type UserDeviceStatus } from './userDeviceDisplay'
import { kstDayStartMs, toMs } from './kst'

/* ── 기기 요약 ──────────────────────────────────────── */

export interface AttentionDevice {
  device: HearingLoop
  status: UserDeviceStatus
  /** 담당자가 읽고 바로 이해할 수 있는 한 줄 */
  reason: string
}

export interface UserDeviceSummary {
  total: number
  normal: number
  warning: number
  /** 연결 끊김(24h 이상 미연결) + 오류 — 히어링루프 관리 KPI와 같은 규격 */
  disconnected: number
  /** 정상 비율(%). 24h 미만 꺼짐은 정상으로 집계한다 */
  normalPct: number
  /** 조치가 필요한 기기 — 연결 끊김·오류 먼저, 그 다음 과열 */
  attention: AttentionDevice[]
}

const REASON: Record<UserDeviceStatus, string> = {
  normal: '정상 동작 중입니다',
  warning: '과열 경보가 감지되었습니다',
  error: '기기 오류가 보고되었습니다',
  offline: '전원이 꺼져 있습니다',
  disconnected: '24시간 이상 연결이 끊겨 있습니다',
}

/** 심각한 순 — 연결 끊김/오류(2) > 과열(1) > 나머지(0) */
function severity(s: UserDeviceStatus): number {
  if (s === 'disconnected' || s === 'error') return 2
  if (s === 'warning') return 1
  return 0
}

export function summarizeUserDevices(devices: HearingLoop[]): UserDeviceSummary {
  const rows = devices.map((device) => {
    // status==='error'는 deriveUserStatus를 통과해 그대로 남는다(에러 로그 파생 대비)
    const status = deriveUserStatus(device)
    return { device, status, reason: REASON[status] }
  })

  const normal = rows.filter((r) => r.status === 'normal').length
  const warning = rows.filter((r) => r.status === 'warning').length
  const disconnected = rows.filter((r) => severity(r.status) === 2).length

  const attention = rows
    .filter((r) => severity(r.status) > 0)
    .sort((a, b) => severity(b.status) - severity(a.status))

  return {
    total: devices.length,
    normal,
    warning,
    disconnected,
    normalPct: devices.length ? Math.round((normal / devices.length) * 100) : 0,
    attention,
  }
}

/* ── 지도 마커 표시 규격 ────────────────────────────── */

/** 사용자 페이지 지도 마커·인포윈도우 규격.
 *  ⚠️ 관리자 기본 규격(connection_status 원값)을 쓰면 24시간 미만 소등 기기까지 전부 '작동 중지' 핀이 되어
 *     같은 화면의 KPI('정상 N대')와 정면으로 어긋난다. 반드시 deriveUserStatus를 통과시킨다.
 *  반환 형태는 DeviceMap의 MapStatusResolver와 구조적으로 호환된다(lib이 컴포넌트를 import하지 않도록 형태만 맞춤). */
export function userMapStatus(device: HearingLoop): {
  kind: 'online' | 'offline'
  label: string
  color: string
} {
  const status = deriveUserStatus(device)
  if (status === 'disconnected') return { kind: 'offline', label: '연결 끊김', color: '#E74C3C' }
  if (status === 'error') return { kind: 'offline', label: '오류', color: '#E74C3C' }
  if (status === 'warning') return { kind: 'online', label: '과열 경보', color: '#f59e0b' }
  // 소프트오프(24시간 미만 꺼짐) 포함 — 정상으로 연출
  if (device.connectionStatus === 'UPDATING') return { kind: 'online', label: '업데이트 중', color: '#246BD1' }
  return { kind: 'online', label: '정상 동작', color: '#10b981' }
}

/* ── 전달받은 알림 요약 ─────────────────────────────── */

export interface UserAlertSummary {
  /** 최신 N건 */
  recent: AlertResponseDto[]
  /** 오늘(KST) 전달받은 건수 — 응답에 통계가 없어 받아온 페이지에서 센다 */
  todayCount: number
  /** 오늘 중 긴급 */
  todayCritical: number
}

export function summarizeMyAlerts(
  items: AlertResponseDto[],
  nowMs: number,
  take = 5,
): UserAlertSummary {
  const dayStart = kstDayStartMs(nowMs)
  const today = items.filter((a) => toMs(a.occurred_at) >= dayStart)
  return {
    recent: items.slice(0, take),
    todayCount: today.length,
    todayCritical: today.filter((a) => a.priority === 'CRITICAL').length,
  }
}
