import { apiClient } from './client'

/** GET /zones 응답 중 화면에서 쓰는 최소 필드 (ZoneResponseDto는 devices/user까지 포함) */
export interface ZoneListItem {
  id: number
  name: string
}

/** 텔레코일존(구역) 엔드포인트 — 3B에서 확장. 지금은 목록만. */
export const zonesApi = {
  /** GET /zones — ADMIN 전체 구역 */
  list: async () => {
    const { data } = await apiClient.get<ZoneListItem[]>('/zones')
    return data
  },
}
