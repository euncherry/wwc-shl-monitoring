import { http, HttpResponse, bypass } from 'msw'
import type { DeviceResponseDto, ZoneResponseDto } from '@/types/device'
import type { FirmwareResponseDto } from '@/types/firmware'
import { mergeMockFields } from './deviceMock'
import { mergeZoneMock, mergeZoneDetailMock } from './zoneMock'
import { mergeFirmwareMock, rememberDescription } from './firmwareMock'

/**
 * MSW 핸들러 — 백엔드에 "아직 없는" API/필드만 처리(CLAUDE.md §3·§10·§13).
 * 등록되지 않은 경로는 그대로 통과 → 실제 staging 호출. 백엔드 배포 시 해당 핸들러를 제거해 실연동 전환.
 *
 * 현재 처리:
 * - GET /devices, GET /devices/:mac → passthrough 후 목 필드(power/network/volume/firmware/alerts) 병합.
 * - GET /zones        → managerEmail 목 병합. (deviceCount/online은 FE 매퍼에서 파생)
 * - GET /zones/:id    → managerEmail + 각 기기 텔레메트리(전원/네트워크/펌웨어) 목 병합.
 * - GET /firmware     → description(목) 병합. POST /firmware → 업로드 description 보관 후 통과.
 * - 기기 배정 해제(목) → DELETE /devices/:id/zone : 세션 오버라이드로 해제 흉내(백엔드 엔드포인트 없음).
 *   PUT /devices/:id/zone/:zoneId(실연동)는 가로채지 않고 통과시키되, 해제 오버라이드만 정리.
 *
 * 통과(실연동): POST /devices·/bulk, DELETE /devices/:id, PATCH /devices/:mac(별칭),
 *   PUT /devices/:id/zone/:zoneId(배정), /devices/:mac/status, /auth/*, /users/*, POST/PATCH/DELETE /zones …
 */

/** 배정 해제(목) — 세션 동안 미배정으로 흉내낼 기기 id. 새로고침 시 초기화. */
const unassignedDevices = new Set<number>()

export const handlers = [
  // 기기 목록: 목 필드 병합 + 해제 오버라이드 반영
  http.get('*/devices', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const devices = (await real.json()) as DeviceResponseDto[]
    return HttpResponse.json(
      devices.map((d) => {
        const merged = mergeMockFields(d)
        return unassignedDevices.has(d.id) ? { ...merged, zone_id: null, zone: null } : merged
      }),
    )
  }),

  // 기기 상세: 목 필드 병합 (`/devices/:mac/status`는 세그먼트가 더 많아 매칭 안 됨 → 통과)
  http.get('*/devices/:mac', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const device = (await real.json()) as DeviceResponseDto
    return HttpResponse.json(mergeMockFields(device))
  }),

  // 구역 목록: managerEmail 목 병합 + 해제된 기기 제외
  http.get('*/zones', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const zones = (await real.json()) as ZoneResponseDto[]
    return HttpResponse.json(
      zones.map((z) =>
        mergeZoneMock({ ...z, devices: z.devices.filter((d) => !unassignedDevices.has(d.id)) }),
      ),
    )
  }),

  // 구역 상세: managerEmail + 기기 텔레메트리 목 병합 + 해제된 기기 제외
  http.get('*/zones/:id', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const zone = (await real.json()) as ZoneResponseDto
    return HttpResponse.json(
      mergeZoneDetailMock({ ...zone, devices: zone.devices.filter((d) => !unassignedDevices.has(d.id)) }),
    )
  }),

  // 기기 배정 해제(목) — 백엔드 엔드포인트 없음. 세션 오버라이드에 기록.
  http.delete('*/devices/:id/zone', ({ params }) => {
    unassignedDevices.add(Number(params.id))
    return HttpResponse.json({ id: Number(params.id), zone_id: null })
  }),

  // 기기 배정(실연동 PUT)은 통과시키되 해제 오버라이드만 정리(재배정 시 다시 보이도록)
  http.put('*/devices/:id/zone/:zoneId', async ({ request, params }) => {
    unassignedDevices.delete(Number(params.id))
    return fetch(bypass(request))
  }),

  // 펌웨어 목록: description(목) 병합
  http.get('*/firmware', async ({ request }) => {
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    const list = (await real.json()) as FirmwareResponseDto[]
    return HttpResponse.json(list.map(mergeFirmwareMock))
  }),

  // 펌웨어 업로드(multipart): description(목)을 version 기준으로 보관한 뒤 통과 → 응답에도 병합
  http.post('*/firmware', async ({ request }) => {
    let version = ''
    let description = ''
    try {
      const form = await request.clone().formData()
      version = String(form.get('version') ?? '')
      description = String(form.get('description') ?? '')
    } catch {
      // formData 파싱 실패 시 그대로 통과
    }
    const real = await fetch(bypass(request))
    if (!real.ok) return real
    if (description) rememberDescription(version, description)
    const created = (await real.json()) as FirmwareResponseDto
    return HttpResponse.json(mergeFirmwareMock(created), { status: real.status })
  }),
]
