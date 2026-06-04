export type UserRole = 'admin' | 'user'

/** 백엔드 role enum → 프론트 UserRole 매핑(CLAUDE.md §5). */
export type BackendRole = 'ADMIN' | 'ZONE_USER'

/** 앱에서 쓰는 인증 사용자 뷰모델(헤더·가드가 소비). */
export interface User {
  /** JWT sub / users/me id */
  id: string
  username: string
  /** 표시용 이름(없으면 username으로 대체) */
  name: string
  role: UserRole
  email?: string
  /** 소속 텔레코일존(기관). admin은 보통 없음 */
  zoneId?: number | null
  zoneName?: string | null
  /** 담당자 부서(백엔드 미구현 시 없음 — §6) */
  department?: string
}

export interface LoginCredentials {
  username: string
  password: string
}

/** POST /auth/login 응답 */
export interface LoginResponse {
  access_token: string
}

/** JWT payload (CLAUDE.md §7) */
export interface JwtPayload {
  sub: string | number
  username: string
  role: BackendRole
  iat?: number
  exp?: number
}

/** GET /users/me 응답 (방어적 — 일부 필드는 백엔드 확장 대기) */
export interface MeResponse {
  id: number | string
  username: string
  email?: string
  name?: string
  role: BackendRole
  zone_id?: number | null
  zone?: { id: number; name: string } | null
  department?: string
}

/** UserResponseDto — POST/GET/PATCH /users 응답 */
export interface UserResponseDto {
  id: number
  username: string
  email: string
  name: string
  role: BackendRole
  zone_id: number | null
  zone?: { id: number; name: string } | null
  created_at: string
}
