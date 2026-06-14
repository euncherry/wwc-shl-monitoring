import { Activity, CircleOff, type LucideIcon } from 'lucide-react'
import type { ConnectionStatus } from '@/types/device'

/**
 * 연결 상태(connection_status) 표시 메타 — 기기 동작/가동 상태.
 * ONLINE=정상 작동(초록) / CONNECTING=준비 중·워밍업(주황) / OFFLINE=작동 중지(회색).
 * '정상 가동' 집계는 ONLINE만 카운트한다.
 */
export const CONNECTION_META: Record<ConnectionStatus, { label: string; short: string; color: string; dot: string; Icon: LucideIcon }> = {
  // ONLINE/CONNECTING: 상세 '정상 작동'과 동일한 Activity(심박) 아이콘. OFFLINE: CircleOff(작동 중지).
  ONLINE: { label: '정상 작동', short: '가동', color: 'text-success', dot: 'bg-success', Icon: Activity },
  CONNECTING: { label: '준비 중', short: '준비', color: 'text-warning', dot: 'bg-warning', Icon: Activity },
  OFFLINE: { label: '작동 중지', short: '중지', color: 'text-muted-foreground', dot: 'bg-muted-foreground', Icon: CircleOff },
}

export function connectionMeta(status: ConnectionStatus) {
  return CONNECTION_META[status] ?? CONNECTION_META.OFFLINE
}
