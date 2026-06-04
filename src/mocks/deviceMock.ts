import type { AlertHistory, DeviceApiResponse, DeviceResponseDto } from '@/types/device'

/**
 * 백엔드 StatusReport 확장(§1) 전까지 임시로 채우는 목 필드 생성기.
 * MAC 주소를 시드로 한 결정적 값이라 새로고침해도 동일하게 유지된다.
 * 실값이 내려오기 시작하면 이 파일과 핸들러를 함께 제거(§13).
 */

const FW_VERSIONS = ['v2.5.0', 'v2.4.1', 'v2.3.0']

const ALERT_TEMPLATES: Pick<AlertHistory, 'type' | 'level' | 'message'>[] = [
  { type: '온도 이상', level: 'warning', message: '온도가 정상 범위를 초과했습니다.' },
  { type: '연결 끊김', level: 'critical', message: '기기와의 연결이 끊어졌습니다.' },
  { type: '볼륨 이상', level: 'info', message: '볼륨이 권장 범위를 벗어났습니다.' },
]

/** MAC → 안정적인 양의 정수 해시 */
function hashMac(mac: string): number {
  let h = 0
  for (let i = 0; i < mac.length; i++) {
    h = (h * 31 + mac.charCodeAt(i)) >>> 0
  }
  return h
}

/** 기기 하나에 대한 목 필드 (power/network/volume/firmware/alerts).
 *  DeviceResponseDto·DeviceInZoneDto 모두 받도록 필요한 필드만 좁게 받는다. */
export function mockFieldsFor(dto: { mac_address: string; last_seen_at: string | null; created_at: string }) {
  const h = hashMac(dto.mac_address)
  const alertCount = h % 3 // 0~2개
  const occurredAt = dto.last_seen_at ?? dto.created_at
  const alerts: AlertHistory[] = Array.from({ length: alertCount }, (_, i) => {
    const t = ALERT_TEMPLATES[(h + i) % ALERT_TEMPLATES.length]
    return {
      id: `${dto.mac_address}-mock-${i}`,
      type: t.type,
      level: t.level,
      message: t.message,
      createdAt: occurredAt,
    }
  })

  return {
    power: h % 10 !== 0, // 약 90% ON
    network_connected: h % 7 !== 0,
    volume: 50 + (h % 51), // 50~100
    firmware_version: FW_VERSIONS[h % FW_VERSIONS.length],
    alerts,
  }
}

/** 실응답 DTO에 목 필드를 병합 */
export function mergeMockFields(dto: DeviceResponseDto): DeviceApiResponse {
  return { ...dto, ...mockFieldsFor(dto) }
}
