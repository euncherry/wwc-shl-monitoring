import { apiClient } from './client'
import { useAuthStore } from '@/stores/authStore'
import type {
  FirmwareResponseDto,
  SendFirmwareResponse,
  FirmwareUpdateProgress,
  UpdateSessionPageDto,
  UpdateSessionDetailDto,
} from '@/types/firmware'

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

  /** POST /firmware/:id/send/:mac — session_id 포함 응답 */
  sendUpdate: async (id: number, mac: string): Promise<SendFirmwareResponse> => {
    const { data } = await apiClient.post<SendFirmwareResponse>(`/firmware/${id}/send/${mac}`)
    return data
  },

  /**
   * SSE GET /firmware/:mac/update-progress
   * EventSource는 커스텀 헤더 미지원 → fetch + ReadableStream 으로 Bearer 토큰 전달.
   * 반환값은 구독 해제 함수(AbortController.abort).
   */
  subscribeUpdateProgress: (
    mac: string,
    onEvent: (event: FirmwareUpdateProgress) => void,
    onClose: () => void,
  ): (() => void) => {
    const token = useAuthStore.getState().token
    const baseURL = import.meta.env.VITE_API_BASE_URL
    const controller = new AbortController()

    const run = async () => {
      try {
        const res = await fetch(
          `${baseURL}/firmware/${encodeURIComponent(mac)}/update-progress`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
              Accept: 'text/event-stream',
            },
            signal: controller.signal,
          },
        )
        if (!res.ok || !res.body) { onClose(); return }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          // SSE 이벤트는 \n\n 으로 구분
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''
          for (const part of parts) {
            const dataLine = part.split('\n').find((l) => l.startsWith('data:'))
            if (dataLine) {
              try {
                const json = JSON.parse(dataLine.slice(5).trim()) as FirmwareUpdateProgress
                onEvent(json)
                if (json.is_final) { reader.cancel(); return }
              } catch { /* JSON 파싱 실패 무시 */ }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
      onClose()
    }

    run()
    return () => controller.abort()
  },

  /** GET /firmware/:mac/sessions — 업데이트 세션 목록(페이지네이션) */
  getSessions: async (mac: string, page = 1, limit = 20): Promise<UpdateSessionPageDto> => {
    const { data } = await apiClient.get<UpdateSessionPageDto>(
      `/firmware/${encodeURIComponent(mac)}/sessions`,
      { params: { page, limit } },
    )
    return data
  },

  /** GET /firmware/sessions/:sessionId — 세션 상세 + 로그(페이지네이션) */
  getSessionDetail: async (sessionId: number, page = 1, limit = 50): Promise<UpdateSessionDetailDto> => {
    const { data } = await apiClient.get<UpdateSessionDetailDto>(
      `/firmware/sessions/${sessionId}`,
      { params: { page, limit } },
    )
    return data
  },
}
