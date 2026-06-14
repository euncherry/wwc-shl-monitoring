import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import type { User, UserRole, JwtPayload } from '@/types/auth'
import { authApi } from '@/api/auth'
import { decodeJwt } from '@/lib/jwt'

interface AuthState {
  user: User | null
  /** JWT access token — axios 인터셉터가 Authorization 헤더로 사용(src/api/client.ts). */
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  /** 프로필 부분 갱신(예: 이메일 수정 후 동기화) */
  updateUser: (patch: Partial<User>) => void
}

/** 백엔드 role enum → 프론트 UserRole (CLAUDE.md §5) */
function mapRole(role: JwtPayload['role']): UserRole {
  return role === 'ADMIN' ? 'admin' : 'user'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username, password) => {
        try {
          // 1) 토큰 발급
          const { access_token } = await authApi.login(username, password)
          const payload = decodeJwt<JwtPayload>(access_token)
          const role = mapRole(payload.role)

          // 2) 토큰을 먼저 저장해야 이어지는 /users/me 요청에 인터셉터가 헤더를 붙인다
          set({ token: access_token })

          // 3) 프로필 보강 (실패해도 JWT 정보로 폴백)
          let user: User = {
            id: String(payload.sub),
            username: payload.username,
            name: payload.username,
            role,
          }
          try {
            const me = await authApi.me()
            user = {
              id: String(me.id),
              username: me.username,
              name: me.name ?? me.username,
              role: mapRole(me.role),
              email: me.email,
              zoneId: me.zone?.id ?? me.zone_id ?? null,
              zoneName: me.zone?.name ?? null,
              department: me.department,
            }
          } catch {
            // /users/me 실패: JWT 기반 최소 정보로 로그인 유지
          }

          set({ user, token: access_token, isAuthenticated: true })
          return { success: true }
        } catch (error) {
          // 로그인 실패 시 토큰/세션 정리
          set({ user: null, token: null, isAuthenticated: false })
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
              return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
            }
            if (!error.response) {
              return { success: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' }
            }
          }
          return { success: false, error: '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.' }
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateUser: (patch) => {
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user }))
      },
    }),
    {
      name: 'hearing-loop-auth',
    },
  ),
)
