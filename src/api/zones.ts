import { apiClient } from './client'
import type { ZoneApiResponse } from '@/types/device'

/** 텔레코일존(구역) 엔드포인트. MSW가 응답에 목 필드(managerEmail·기기 텔레메트리)를 병합할 수 있음. */
export const zonesApi = {
  /** GET /zones — ADMIN 전체 구역 (devices[]·user 포함) */
  list: async () => {
    const { data } = await apiClient.get<ZoneApiResponse[]>('/zones')
    return data
  },

  /** GET /zones/:id — 구역 상세 (상세 기기 텔레메트리는 MSW 목 병합) */
  get: async (id: number) => {
    const { data } = await apiClient.get<ZoneApiResponse>(`/zones/${id}`)
    return data
  },

  /** POST /zones { name } — 409 = 이름 중복 */
  create: async (name: string) => {
    const { data } = await apiClient.post<ZoneApiResponse>('/zones', { name })
    return data
  },

  /** PATCH /zones/:id { name } */
  update: async (id: number, name: string) => {
    const { data } = await apiClient.patch<ZoneApiResponse>(`/zones/${id}`, { name })
    return data
  },

  /** DELETE /zones/:id */
  remove: async (id: number) => {
    await apiClient.delete(`/zones/${id}`)
  },
}
