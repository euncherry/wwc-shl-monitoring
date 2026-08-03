import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

/**
 * 공용 axios 인스턴스.
 * - baseURL: staging/prod (VITE_API_BASE_URL)
 * - 요청: authStore의 token을 Authorization 헤더로 주입
 * - 응답: 401 → 로그아웃 후 /login 이동
 *
 * 서버 데이터는 컴포넌트에서 직접 호출하지 말고 TanStack Query 훅을 통해 사용한다(CLAUDE.md §12).
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── 요청 인터셉터: JWT 주입 ───
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── 응답 인터셉터: 401 → 로그아웃 ───
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      // 로그인 화면이 아닐 때만 이동 (무한 루프 방지).
      // /status-spec은 비로그인 열람이 가능한 표시 규격 실증 페이지라 튕기지 않고
      // 실기기 섹션만 '로그인 필요'로 처리한다.
      const NO_REDIRECT = ['/login', '/status-spec']
      if (!NO_REDIRECT.includes(window.location.pathname)) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)
