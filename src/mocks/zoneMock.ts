import type { ZoneResponseDto, ZoneApiResponse, UserSummary, DeviceInZoneDto } from '@/types/device'
import { mockFieldsFor } from './deviceMock'

/**
 * 구역(Zone) 목 필드 — 백엔드 응답 보강 요청 예정(§13).
 * - managerEmail: 담당자(zone.user) 이메일. 실 user 응답엔 email이 없어 목으로 생성.
 * - activeDeviceCount: 정상 가동(온라인) 기기 수. ⚠️ 목 — 기기 카드의 '전원(목)'과 같은 소스(mockFieldsFor.power)로 계산해
 *   "전원 ON인데 정상가동 0" 불일치를 없앤다. 백엔드가 "정상 가동 기기 수"를 내려주면 제거.
 * - 상세(GET /zones/:id)에선 각 기기에 전원/네트워크/펌웨어 목 텔레메트리 병합(온도는 gpio처럼 백엔드값이나 펌웨어상 0 고정).
 */

function mockManagerEmail(user: UserSummary | null): string | null {
  if (!user) return null
  return `${user.username}@example.com`
}

/**
 * zone 상세 한정 목 펌웨어 버전. DeviceInZoneDto엔 firmware_version이 없어 여기서만 목으로 채운다(§2).
 * 메인 GET /devices는 실 firmware_version을 내려주므로 목 대상 아님.
 */
const ZONE_FW_VERSIONS = ['v2.5.0', 'v2.4.1', 'v2.3.0']
function mockZoneFirmware(mac: string): string {
  let h = 0
  for (let i = 0; i < mac.length; i++) h = (h * 31 + mac.charCodeAt(i)) >>> 0
  return ZONE_FW_VERSIONS[h % ZONE_FW_VERSIONS.length]
}

/** 정상 가동(목) = mock 전원이 ON인 기기 수 (기기 카드 전원과 동일 기준) */
function mockActiveCount(devices: DeviceInZoneDto[]): number {
  return devices.filter((d) => mockFieldsFor(d).power).length
}

/** GET /zones — managerEmail + 정상가동 수(목) 병합 */
export function mergeZoneMock(zone: ZoneResponseDto): ZoneApiResponse {
  return { ...zone, managerEmail: mockManagerEmail(zone.user), activeDeviceCount: mockActiveCount(zone.devices) }
}

/** GET /zones/:id — managerEmail + 정상가동 수 + 각 기기 텔레메트리 목 병합 */
export function mergeZoneDetailMock(zone: ZoneResponseDto): ZoneApiResponse {
  return {
    ...zone,
    managerEmail: mockManagerEmail(zone.user),
    activeDeviceCount: mockActiveCount(zone.devices),
    devices: zone.devices.map((d) => ({ ...d, ...mockFieldsFor(d), firmware_version: mockZoneFirmware(d.mac_address) })),
  }
}
