import { apiClient } from './client'
import type { DeviceApiResponse, BulkCreateResult } from '@/types/device'

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

  /** PATCH /devices/:id/zone { zone_id } — 존 배정. ⚠️ body 미명세(목, §9). 키는 숫자 id */
  assignZone: async (id: number, zoneId: number) => {
    const { data } = await apiClient.patch<DeviceApiResponse>(`/devices/${id}/zone`, { zone_id: zoneId })
    return data
  },
}
