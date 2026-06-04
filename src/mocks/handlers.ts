import type { RequestHandler } from 'msw'

/**
 * MSW 핸들러 — 백엔드에 "아직 없는" API만 등록한다(CLAUDE.md §3·§10).
 * 등록되지 않은 경로는 그대로 통과 → 실제 staging 호출.
 * 백엔드가 staging에 배포되면 해당 핸들러를 제거해 실연동으로 전환한다(§13).
 *
 * 1단계에서는 빈 배열로 시작한다. (알림센터 등 목은 5단계에서 추가)
 */
export const handlers: RequestHandler[] = []
