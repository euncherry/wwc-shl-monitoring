import { apiClient } from './client'
import type { LoginResponse, MeResponse } from '@/types/auth'

/** 인증 관련 엔드포인트(실연동). */
export const authApi = {
  /** POST /auth/login → { access_token } */
  login: async (username: string, password: string) => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', {
      username,
      password,
    })
    return data
  },

  /** GET /users/me → 로그인 사용자 프로필 + 소속 zone (Authorization 헤더 필요) */
  me: async () => {
    const { data } = await apiClient.get<MeResponse>('/users/me')
    return data
  },
}
