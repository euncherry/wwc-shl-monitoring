import { Activity, Minus, RefreshCw, type LucideIcon } from 'lucide-react'
import type { ConnectionStatus } from '@/types/device'

/**
 * 연결 상태(connection_status) 표시 메타 — 기기 동작/가동 상태.
 * ONLINE=정상 작동(초록) / UPDATING=업데이트 중(파랑) / OFFLINE=작동 중지(회색).
 * '정상 가동' 집계는 ONLINE만 카운트한다.
 */
export const CONNECTION_META: Record<ConnectionStatus, { label: string; short: string; color: string; dot: string; Icon: LucideIcon }> = {
  ONLINE: { label: '정상 작동', short: '가동', color: 'text-success', dot: 'bg-success', Icon: Activity },
  UPDATING: { label: '업데이트 중', short: '업데이트', color: 'text-primary', dot: 'bg-primary', Icon: RefreshCw },
  OFFLINE: { label: '작동 중지', short: '중지', color: 'text-muted-foreground', dot: 'bg-muted-foreground', Icon: Minus },
}

export function connectionMeta(status: ConnectionStatus) {
  return CONNECTION_META[status] ?? CONNECTION_META.OFFLINE
}
