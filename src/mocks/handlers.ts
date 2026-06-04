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
 *   → 실제 staging 응답을 받아온(passthrough) 뒤 목 필드(power/network/volume/firmware/alerts) 병합 + 존 배정 오버라이드 반영.
 * - PATCH /devices/:id/zone (존 배정)
 *   → ⚠️ Swagger에 요청 body가 명세되지 않아 계약 불확실 → '목' 처리. 세션 내 오버라이드 맵으로 흉내내고,
 *     GET 응답에 반영한다. 백엔드 body 확정 시 이 핸들러 + 오버라이드를 제거(실연동 전환).
 *
 * 통과(목 처리 안 함): POST /devices, /devices/bulk, DELETE, PATCH /devices/:mac(별칭), /devices/:mac/status, /auth/*, /users/*, /zones/* …
 */

/** 세션 동안만 유지되는 기기→존 배정 목 상태(새로고침 시 초기화) */
const zoneOverrides = new Map<number, { zone_id: number; name: string }>()

function applyZoneOverride<T extends DeviceResponseDto>(dto: T): T {
  const ov = zoneOverrides.get(dto.id)
  if (!ov) return dto
  return { ...dto, zone_id: ov.zone_id, zone: { id: ov.zone_id, name: ov.name, created_at: dto.created_at } }
}

export const handlers = [
  // 목록: 실응답 배열에 목 필드 + 존 오버라이드 반영
  http.get('*/devices', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const devices = (await real.json()) as DeviceResponseDto[]
    return HttpResponse.json(devices.map((d) => applyZoneOverride(mergeMockFields(d))))
  }),

  // 상세: 단건 목 필드 + 존 오버라이드 (`/devices/:mac/status`는 세그먼트가 더 많아 매칭되지 않음 → 통과)
  http.get('*/devices/:mac', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const device = (await real.json()) as DeviceResponseDto
    return HttpResponse.json(applyZoneOverride(mergeMockFields(device)))
  }),

  // 존 배정 — 목(요청 body 미명세). 세션 오버라이드로 흉내, 존 이름은 실제 /zones에서 조회.
  http.patch('*/devices/:id/zone', async ({ request, params }) => {
    const id = Number(params.id)
    const body = (await request.json().catch(() => ({}))) as { zone_id?: number }
    if (body.zone_id == null) {
      return HttpResponse.json({ message: 'zone_id is required' }, { status: 400 })
    }
    let name = `구역 ${body.zone_id}`
    try {
      const zonesUrl = new URL('/zones', request.url).toString()
      const zres = await fetch(bypass(new Request(zonesUrl, { headers: request.headers })))
      if (zres.ok) {
        const zones = (await zres.json()) as { id: number; name: string }[]
        const z = zones.find((zz) => zz.id === body.zone_id)
        if (z) name = z.name
      }
    } catch {
      /* 이름 조회 실패 시 기본값 유지 */
    }
    zoneOverrides.set(id, { zone_id: body.zone_id, name })
    return HttpResponse.json({ id, zone_id: body.zone_id, zone: { id: body.zone_id, name } })
  }),
]
