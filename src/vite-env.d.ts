/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** staging/prod API 베이스 URL */
  readonly VITE_API_BASE_URL: string
  /** MSW 목 활성화 여부 ('true' | 'false') */
  readonly VITE_ENABLE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
