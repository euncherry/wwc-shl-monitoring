import { apiClient } from './client'
import type { AlertListResponseDto } from '@/types/alert'

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
}
