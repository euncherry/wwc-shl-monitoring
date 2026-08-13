/** OTA 진행률 판정 — 순수 로직. 전송 모달 두 곳(히어링루프 관리 / 펌웨어 관리)이 공유한다.
 *
 *  ⚠️ 판정 규칙은 반드시 여기 한 곳에만 둔다. 두 화면이 서로 다르게 판정하면 안 된다.
 *
 *  백엔드가 `is_final: true`를 붙여 보내는 이벤트가 **최종 판정**이고, 그 이벤트의 `status`가
 *  성공/실패를 가른다. `type`은 경로마다 다르니(아래) 절대 type으로 판정하면 안 된다:
 *
 *    hello 완료      iot.service.ts:217   type 'target'   status 'complete'
 *    self 실패       iot.service.ts:388   type 'self'     status 'failed'
 *    target 실패     iot.service.ts:443   type 'target'   status 'failed'
 *    세션 타임아웃    firmware.service.ts:388  type 'session'  status 'failed'
 *    버전 동일 완료   firmware.service.ts:250  type 'session'  status 'complete'
 */

import type { FirmwareUpdateProgress } from '@/types/firmware'

export type ProgressPhase = 'waiting' | 'connecting' | 'in_progress' | 'complete' | 'failed'

export interface McuState {
  progress: number
  status: string
}

export interface DeviceProgress {
  phase: ProgressPhase
  self: McuState | null
  target: McuState | null
  errorMessage: string | null
}

/** 진행 이벤트 하나를 반영한 다음 상태.
 *
 *  이전 구현은 스트림이 닫히면 무조건 'complete'로 쳤다. 그래서 9%에서 타임아웃이 나도
 *  '완료'로 표시됐다(실측 2026-08-13, 세션 19). 판정은 이벤트 내용으로만 한다.
 */
export function applyProgressEvent<T extends DeviceProgress>(curr: T, event: FirmwareUpdateProgress): T {
  const failed = event.status === 'failed'
  const phase: ProgressPhase = event.is_final
    ? (event.status === 'complete' ? 'complete' : 'failed')
    : failed
      ? 'failed'
      : 'in_progress'

  const next: T = {
    ...curr,
    phase,
    errorMessage: failed ? (event.message ?? '업데이트 실패') : curr.errorMessage,
  }
  // 'session'은 MCU가 아니라 세션 전체에 대한 이벤트 — 진행률 슬롯에 넣지 않는다.
  if (event.type === 'self' || event.type === 'target') {
    next[event.type] = { progress: event.progress_percent, status: event.status }
  }
  return next
}

/** 스트림이 닫혔을 때의 상태.
 *
 *  - waiting/connecting: 이벤트를 하나도 못 받고 끊김 → 연결 실패
 *  - complete/failed: 이미 최종 판정을 받음 → 그대로 둔다
 *  - in_progress: 판정을 못 받고 끊김. **완료로 치면 안 된다** — 세션 조회로 확정해야 한다.
 *    확정 전까지는 진행 중으로 두고, 호출부가 resolveUnsettled로 마무리한다.
 */
export function applyStreamClose<T extends DeviceProgress>(curr: T): T {
  if (curr.phase === 'connecting' || curr.phase === 'waiting') {
    return { ...curr, phase: 'failed', errorMessage: 'SSE 연결 실패' }
  }
  return curr
}

/** 세션 status → 최종 phase. 스트림이 판정 없이 끊겼을 때 서버에 물어본 결과를 반영한다. */
export function phaseFromSessionStatus(status: string | undefined): ProgressPhase {
  if (status === 'complete') return 'complete'
  if (status === 'failed') return 'failed'
  return 'failed' // in_progress인 채로 스트림이 끊겼다 = 결과를 알 수 없음. 성공으로 위장하지 않는다.
}

/** 판정을 못 받고 끝난 경우의 안내 문구 */
export const UNSETTLED_MESSAGE = '결과를 확인하지 못했습니다. 기기 이력에서 확인해 주세요.'
