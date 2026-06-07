import { apiClient } from './client'
import type { ZoneResponseDto, ZonePageDto } from '@/types/device'

/** 텔레코일존(구역) 엔드포인트. 응답에 user.email·active_device_count 포함(REAL). */
export const zonesApi = {
  /** GET /zones — 페이지네이션 응답 → data 언래핑. 전체 기기 수/목록은 GET /devices에서 파생. */
  list: async () => {
    const { data } = await apiClient.get<ZonePageDto>('/zones', { params: { limit: 1000 } })
    return data.data
  },

  /** GET /zones/:id — 구역 상세(devices 없음, active_device_count·user.email 포함) */
  get: async (id: number) => {
    const { data } = await apiClient.get<ZoneResponseDto>(`/zones/${id}`)
    return data
  },

  /** POST /zones { name } — 409 = 이름 중복 */
  create: async (name: string) => {
    const { data } = await apiClient.post<ZoneResponseDto>('/zones', { name })
    return data
  },

  /** PATCH /zones/:id { name } */
  update: async (id: number, name: string) => {
    const { data } = await apiClient.patch<ZoneResponseDto>(`/zones/${id}`, { name })
    return data
  },

  /** DELETE /zones/:id */
  remove: async (id: number) => {
    await apiClient.delete(`/zones/${id}`)
  },
}
