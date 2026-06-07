import { apiClient } from './client'
import type { FirmwareResponseDto } from '@/types/firmware'

/** POST /firmware 입력 — HL + WiFi 펌웨어 2파일 세트 */
export interface UploadFirmwareInput {
  /** HearingLoop MCU 펌웨어 바이너리 */
  hlFile: File
  /** WiFi 모듈 펌웨어 바이너리 */
  wifiFile: File
  /** 간단 설명(선택, 255자) */
  description?: string
}

/**
 * 펌웨어 도메인 엔드포인트 (전부 REAL).
 * 2026-06-06 개편: 2파일 세트 업로드, 버전 서버 자동증가(409 없음), 설명/firmware_type 제거.
 */
export const firmwareApi = {
  /** GET /firmware — 최신 업로드순(서버) */
  list: async () => {
    const { data } = await apiClient.get<FirmwareResponseDto[]>('/firmware')
    return data
  },

  /** POST /firmware (multipart) — hl_file + wifi_file 둘 다 필수. 400=파일 누락, 500=S3 실패 */
  upload: async (input: UploadFirmwareInput) => {
    const form = new FormData()
    form.append('hl_file', input.hlFile)
    form.append('wifi_file', input.wifiFile)
    if (input.description?.trim()) form.append('description', input.description.trim())
    const { data } = await apiClient.post<FirmwareResponseDto>('/firmware', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** POST /firmware/:id/send/:mac — self(HL)+target(WiFi) 알림 동시 발송. 404=펌웨어 없음 */
  sendUpdate: async (id: number, mac: string) => {
    const { data } = await apiClient.post<{ message: string }>(`/firmware/${id}/send/${mac}`)
    return data
  },
}
