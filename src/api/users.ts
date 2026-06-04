import { apiClient } from './client'
import type { UserResponseDto } from '@/types/auth'

/** POST /users 입력 (CreateUserDto). 텔레코일존 계정은 role=ZONE_USER + zone_id */
export interface CreateUserInput {
  username: string
  email: string
  password: string
  name: string
  role?: 'ADMIN' | 'ZONE_USER'
  zone_id?: number
}

/** PATCH /users/:id 입력 (UpdateUserDto) — username/email 변경, password 재설정 */
export interface UpdateUserInput {
  username?: string
  email?: string
  password?: string
}

/** 사용자 엔드포인트(실연동). 409 = 아이디/이메일 중복 */
export const usersApi = {
  /** POST /users */
  create: async (input: CreateUserInput) => {
    const { data } = await apiClient.post<UserResponseDto>('/users', input)
    return data
  },

  /** GET /users/:id — 실 email 포함 (zone.user엔 email 없어서 보강용) */
  get: async (id: number) => {
    const { data } = await apiClient.get<UserResponseDto>(`/users/${id}`)
    return data
  },

  /** PATCH /users/:id */
  update: async (id: number, input: UpdateUserInput) => {
    const { data } = await apiClient.patch<UserResponseDto>(`/users/${id}`, input)
    return data
  },

  /** DELETE /users/:id */
  remove: async (id: number) => {
    await apiClient.delete(`/users/${id}`)
  },
}
