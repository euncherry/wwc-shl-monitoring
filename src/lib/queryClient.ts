import { QueryClient } from '@tanstack/react-query'

/**
 * 앱 전역 QueryClient.
 * - retry 1: 실연동 staging의 일시 오류만 한 번 재시도
 * - refetchOnWindowFocus off: 모니터링 화면 포커스 전환마다 재요청 방지
 * - staleTime 30s: 짧은 캐시로 과도한 요청 억제
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})
