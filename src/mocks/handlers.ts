import { http, HttpResponse, bypass } from 'msw'
import type { DeviceResponseDto } from '@/types/device'
import { mergeMockFields } from './deviceMock'

/**
 * MSW 핸들러 — 백엔드에 "아직 없는" 필드만 처리(CLAUDE.md §3·§10·§13).
 * 등록 안 된 경로는 그대로 통과 → 실 staging. 실값 내려오면 해당 처리를 제거.
 *
 * 현재 처리: GET /devices, GET /devices/:mac → 응답에 목 필드(volume/alerts) 병합.
 *   (전원·네트워크=is_connected 실값, 펌웨어버전·연결=실값으로 전환됨 → 더 이상 목 아님.
 *    deviceMock의 power/network는 미사용이나 잔존, 실제 사용은 volume·alerts)
 *
 * 통과(실연동): /zones·/zones/:id(active_device_count·user.email 실값), 배정해제 DELETE /devices/:id/zone(실 API),
 *   POST /devices·/bulk, DELETE /devices/:id, PATCH /devices/:mac, PUT /devices/:id/zone/:zoneId,
 *   /devices/:mac/status, /alerts*, /firmware*, /auth/*, /users/* …
 */

export const handlers = [
  // 기기 목록: 페이지네이션 응답({data,total,page,limit})의 data에 목 필드(volume/alerts) 병합
  http.get('*/devices', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const page = (await real.json()) as { data: DeviceResponseDto[]; total: number; page: number; limit: number }
    return HttpResponse.json({ ...page, data: (page.data ?? []).map(mergeMockFields) })
  }),

  // 기기 상세: 목 필드 병합 (`/devices/:mac/status`는 세그먼트가 더 많아 매칭 안 됨 → 통과)
  http.get('*/devices/:mac', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const device = (await real.json()) as DeviceResponseDto
    return HttpResponse.json(mergeMockFields(device))
  }),
]
