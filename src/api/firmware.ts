import { apiClient } from './client'
import type { FirmwareApiResponse } from '@/types/firmware'

/** POST /firmware 입력 */
export interface UploadFirmwareInput {
  version: string
  file: File
  /** 간단 설명(목 — 엔티티에 없음, MSW가 보관) */
  description?: string
}

/**
 * 펌웨어 도메인 엔드포인트.
 * - list/upload/sendUpdate = REAL (`/firmware`, `/firmware/:id/send/:mac`)
 * - description = MSW 목 병합(§10·§13). version은 unique(409).
 */
export const firmwareApi = {
  /** GET /firmware — MSW가 응답에 description(목) 병합 */
  list: async () => {
    const { data } = await apiClient.get<FirmwareApiResponse[]>('/firmware')
    return data
  },

  /** POST /firmware (multipart) — 409 = 버전 중복. description은 목이라 백엔드는 무시, MSW가 보관 */
  upload: async (input: UploadFirmwareInput) => {
    const form = new FormData()
    form.append('version', input.version)
    form.append('file', input.file)
    if (input.description) form.append('description', input.description)
    const { data } = await apiClient.post<FirmwareApiResponse>('/firmware', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** POST /firmware/:id/send/:mac — 개별 기기 업데이트 알림. 404 = 펌웨어/기기 없음 */
  sendUpdate: async (id: number, mac: string) => {
    const { data } = await apiClient.post<{ message: string }>(`/firmware/${id}/send/${mac}`)
    return data
  },
}
