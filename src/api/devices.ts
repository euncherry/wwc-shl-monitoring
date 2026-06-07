import { apiClient } from './client'
import type { DeviceApiResponse, BulkCreateResult, StatusLogPageDto } from '@/types/device'

/** POST /devices, /devices/bulk 입력 (CreateDeviceDto) */
export interface CreateDeviceInput {
  mac_address: string
  zone_id?: number
  alias?: string
}

/** 기기 도메인 엔드포인트(REAL). MSW가 응답에 목 필드를 병합할 수 있음. */
export const devicesApi = {
  /** GET /devices — ADMIN=전체 / ZONE_USER=소속 */
  list: async () => {
    const { data } = await apiClient.get<DeviceApiResponse[]>('/devices')
    return data
  },

  /** GET /devices/:mac */
  get: async (mac: string) => {
    const { data } = await apiClient.get<DeviceApiResponse>(`/devices/${mac}`)
    return data
  },

  /** GET /devices/:mac/status — 상태(동작/온도) 보고 이력(페이지네이션) */
  getStatusLogs: async (mac: string, page = 1, limit = 20) => {
    const { data } = await apiClient.get<StatusLogPageDto>(`/devices/${mac}/status`, {
      params: { page, limit },
    })
    return data
  },

  /** POST /devices — 409 = MAC/별칭 중복 */
  create: async (input: CreateDeviceInput) => {
    const { data } = await apiClient.post<DeviceApiResponse>('/devices', input)
    return data
  },

  /** POST /devices/bulk → { created, skipped } */
  createBulk: async (devices: CreateDeviceInput[]) => {
    const { data } = await apiClient.post<BulkCreateResult>('/devices/bulk', { devices })
    return data
  },

  /** DELETE /devices/:id — 키는 숫자 id */
  remove: async (id: number) => {
    await apiClient.delete(`/devices/${id}`)
  },

  /** PATCH /devices/:mac { alias } — 409 = 별칭 중복 */
  updateAlias: async (mac: string, alias: string) => {
    const { data } = await apiClient.patch<DeviceApiResponse>(`/devices/${mac}`, { alias })
    return data
  },

  /** PUT /devices/:id/zone/:zoneId — 존 배정(실연동). zoneId는 경로 파라미터, body 없음. ADMIN. 키는 숫자 id */
  assignZone: async (id: number, zoneId: number) => {
    const { data } = await apiClient.put<DeviceApiResponse>(`/devices/${id}/zone/${zoneId}`)
    return data
  },

  /** 배정 해제(목) — 백엔드 엔드포인트 없음. MSW DELETE /devices/:id/zone로 흉내(§13). */
  unassignZone: async (id: number) => {
    await apiClient.delete(`/devices/${id}/zone`)
  },
}
