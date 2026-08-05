/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** staging/prod API 베이스 URL */
  readonly VITE_API_BASE_URL: string
  /** MSW 목 활성화 여부 ('true' | 'false') */
  readonly VITE_ENABLE_MOCK: string
  /** 카카오맵 JavaScript 키 (지도뷰). 브라우저 노출 전제 — 도메인 등록으로 보호 */
  readonly VITE_KAKAO_MAP_APP_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
