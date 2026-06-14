import { Wifi, WifiHigh, WifiLow, WifiOff } from 'lucide-react'
import type { WifiSignal } from '@/types/device'
import { cn } from '@/lib/utils'

/**
 * Wi-Fi 신호 강도 아이콘 (REAL — wifi_signal).
 * STRONG/FAIR = 양호(초록), WEAK = 약함(주황), DISCONNECTED = 끊김(빨강).
 */
const WIFI_SIGNAL: Record<WifiSignal, { Icon: typeof Wifi; color: string; label: string }> = {
  STRONG: { Icon: Wifi, color: 'text-success', label: '강함' },
  FAIR: { Icon: WifiHigh, color: 'text-success', label: '보통' },
  WEAK: { Icon: WifiLow, color: 'text-warning', label: '약함' },
  DISCONNECTED: { Icon: WifiOff, color: 'text-destructive', label: '끊김' },
}

export const WIFI_SIGNAL_LABEL: Record<WifiSignal, string> = {
  STRONG: '강함',
  FAIR: '보통',
  WEAK: '약함',
  DISCONNECTED: '끊김',
}

export function wifiSignalColor(signal: WifiSignal): string {
  return (WIFI_SIGNAL[signal] ?? WIFI_SIGNAL.DISCONNECTED).color
}

export function WifiSignalIcon({ signal, className = 'h-4 w-4' }: { signal: WifiSignal; className?: string }) {
  const { Icon, color } = WIFI_SIGNAL[signal] ?? WIFI_SIGNAL.DISCONNECTED
  return <Icon className={cn(className, color)} aria-label={`WiFi 신호 ${WIFI_SIGNAL_LABEL[signal] ?? ''}`} />
}
