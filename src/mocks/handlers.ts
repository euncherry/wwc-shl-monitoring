import { http, HttpResponse, bypass } from 'msw'
import type { DeviceResponseDto } from '@/types/device'
import { mergeMockFields } from './deviceMock'

/**
 * MSW 핸들러 — 백엔드에 "아직 없는" API/필드만 처리(CLAUDE.md §3·§10).
 * 등록되지 않은 경로는 그대로 통과 → 실제 staging 호출.
 * 백엔드가 staging에 배포되면 해당 핸들러를 제거해 실연동으로 전환한다(§13).
 *
 * 현재 처리:
 * - GET /devices, GET /devices/:mac
 *   → 실제 staging 응답을 받아온(passthrough) 뒤 목 필드(power/network/volume/firmware/alerts)를 병합.
 *     StatusReport 확장(§1) 배포 시 이 핸들러와 deviceMock.ts를 함께 제거.
 *
 * 통과(목 처리 안 함, 전부 실연동): POST /devices, /devices/bulk, DELETE,
 *   PATCH /devices/:mac(별칭), PUT /devices/:id/zone/:zoneId(존 배정), /devices/:mac/status,
 *   /auth/*, /users/*, /zones/* …
 */
export const handlers = [
  // 목록: 실응답 배열에 각 기기 목 필드 병합
  http.get('*/devices', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const devices = (await real.json()) as DeviceResponseDto[]
    return HttpResponse.json(devices.map(mergeMockFields))
  }),

  // 상세: 단건 목 필드 병합 (`/devices/:mac/status`는 세그먼트가 더 많아 매칭되지 않음 → 통과)
  http.get('*/devices/:mac', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const device = (await real.json()) as DeviceResponseDto
    return HttpResponse.json(mergeMockFields(device))
  }),
]
