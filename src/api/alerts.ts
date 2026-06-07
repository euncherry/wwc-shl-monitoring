import { apiClient } from './client'
import type { AlertListResponseDto, AlertResponseDto, AlertStatusEnum, AlertThresholds } from '@/types/alert'

/** GET /alerts 쿼리 파라미터 (AlertQueryDto) */
export interface AlertListParams {
  device_id?: number
  zone_id?: number
  status?: string
  type?: string
  priority?: string
  page?: number
  limit?: number
}

/** 알림 도메인 엔드포인트 (REAL) */
export const alertsApi = {
  /** GET /alerts — 관리자 전용, 필터·페이지네이션·통계 내장 */
  list: async (params: AlertListParams = {}) => {
    const { data } = await apiClient.get<AlertListResponseDto>('/alerts', { params })
    return data
  },

  /** PATCH /alerts/:id — 전달/종결. ⚠️ PENDING일 때만 가능(아니면 400) */
  updateStatus: async (id: number, status: Extract<AlertStatusEnum, 'FORWARDED' | 'DISMISSED'>) => {
    const { data } = await apiClient.patch<AlertResponseDto>(`/alerts/${id}`, { status })
    return data
  },

  /** GET /alerts/settings/thresholds — 현재 임계값 */
  getThresholds: async () => {
    const { data } = await apiClient.get<AlertThresholds>('/alerts/settings/thresholds')
    return data
  },

  /** PATCH /alerts/settings/thresholds — 임계값 수정 (둘 다 선택, 최솟값 1) */
  updateThresholds: async (input: Partial<AlertThresholds>) => {
    const { data } = await apiClient.patch<AlertThresholds>('/alerts/settings/thresholds', input)
    return data
  },
}
