import { apiClient } from './client'
import type {
  AlertListResponseDto,
  AlertResponseDto,
  AlertStatusEnum,
  AlertThresholds,
  MyAlertListResponseDto,
} from '@/types/alert'

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

/** GET /alerts/my 쿼리 파라미터 (MyAlertQueryDto) — status 필터는 없다(FORWARDED 고정) */
export interface MyAlertListParams {
  device_id?: number
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

  /** GET /alerts/my — ZONE_USER 전용. 소속 존의 **전달된(FORWARDED)** 알림만.
   *  ⚠️ 배정된 존이 없으면 403. 대시보드는 이를 '알림 없음'으로 처리한다. */
  listMy: async (params: MyAlertListParams = {}) => {
    const { data } = await apiClient.get<MyAlertListResponseDto>('/alerts/my', { params })
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
