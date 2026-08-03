import { createElement, type ReactNode } from 'react'
import { Radio, Power, PowerOff, Thermometer, Wifi, WifiOff, Building2, AlertTriangle } from 'lucide-react'
import { TooltipRoot, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { HearingLoop, ConnectionStatus, WifiSignal } from '@/types/device'
import { WIFI_SIGNAL_LABEL } from '@/components/WifiSignalIcon'
import { connectionMeta } from '@/lib/connectionStatus'
import { formatDateTime } from '@/lib/format'
import {
  deriveUserStatus,
  isSoftOff,
  isWifiCut,
  type UserDeviceStatus,
} from '@/lib/userDeviceDisplay'

/* ══════════════════════════════════════════════════════
   사용자(기관) 페이지 기기 표시 컴포넌트.
   /user/hearing-loops 와 표시 규격 실증 페이지(/status-spec)가 공유한다 —
   실증 페이지가 실제 화면과 어긋나지 않도록 마크업은 반드시 여기 한 곳에만 둔다.
   ══════════════════════════════════════════════════════ */

/** 별칭 있으면 별칭, 없으면 MAC */
export function displayTitle(device: Pick<HearingLoop, 'alias' | 'mac'>) {
  return device.alias?.trim() ? device.alias : device.mac
}

export function FirmwareInconsistentBadge() {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
          <AlertTriangle className="h-2.5 w-2.5" />
          불일치
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        업데이트 도중 WiFi MCU와 HL MCU 중 하나만 성공하여 펌웨어 상태를 추적할 수 없는 상태입니다. 재업데이트가 필요합니다.
      </TooltipContent>
    </TooltipRoot>
  )
}

export function StatusBadge({ status }: { status: UserDeviceStatus }) {
  const m: Record<UserDeviceStatus, { label: string; dot: string; cls: string }> = {
    normal: { label: '정상', dot: 'bg-success', cls: 'bg-success/10 text-success' },
    warning: { label: '경고', dot: 'bg-warning', cls: 'bg-warning/10 text-warning' },
    error: { label: '오류', dot: 'bg-destructive', cls: 'bg-destructive/10 text-destructive' },
    offline: { label: '전원 꺼짐', dot: 'bg-muted-foreground', cls: 'bg-muted text-muted-foreground' },
    disconnected: { label: '연결 끊김', dot: 'bg-destructive', cls: 'bg-destructive/10 text-destructive' },
  }
  const s = m[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

/* ── Status Chip (전원·동작·WiFi·과열) ── */

export type Tone = 'success' | 'warning' | 'destructive' | 'muted' | 'info'

export const TONE: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-primary/10 text-primary',
}

export function connTone(s: ConnectionStatus): Tone {
  return s === 'ONLINE' ? 'success' : s === 'UPDATING' ? 'info' : 'muted'
}

export function wifiTone(s: WifiSignal): Tone {
  return s === 'STRONG' || s === 'FAIR' ? 'success' : s === 'WEAK' ? 'warning' : 'destructive'
}

export function StatusChip({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: Tone }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${TONE[tone]}`}>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] font-medium opacity-70">{label}</p>
        <p className="text-[12px] font-bold truncate">{value}</p>
      </div>
    </div>
  )
}

/** 상태 칩 1개 분량의 props */
export interface ChipProps {
  icon: ReactNode
  label: string
  value: string
  tone: Tone
}

/**
 * 사용자 카드의 상태 칩 4종(전원·동작·WiFi·과열) props를 계산한다.
 * 카드와 표시 규격 실증 페이지(/status-spec)가 이 함수를 함께 쓴다 —
 * 실증 페이지가 손으로 칩을 재현하지 않도록 계산은 여기 한 곳에만 둔다.
 */
export function userChipProps(device: HearingLoop) {
  /* 24h 미만 꺼짐은 정상으로 연출, 4h 이상부터 WiFi만 회색 '끊김' (isSoftOff·isWifiCut 참고) */
  const softOff = isSoftOff(device)
  const alive = device.power || softOff
  const dispConn: ConnectionStatus = softOff ? 'ONLINE' : device.connectionStatus
  const conn = connectionMeta(dispConn)
  const wifiCut = softOff && isWifiCut(device)

  const power: ChipProps = {
    icon: alive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />,
    label: '전원',
    value: alive ? 'ON' : 'OFF',
    tone: alive ? 'success' : 'muted',
  }
  const operation: ChipProps = {
    icon: createElement(conn.Icon, { className: 'h-4 w-4' }),
    label: '동작',
    value: conn.label,
    tone: connTone(dispConn),
  }
  const wifi: ChipProps = {
    icon:
      softOff
        ? (wifiCut ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />)
        : device.wifiSignal === 'DISCONNECTED'
          ? <WifiOff className="h-4 w-4" />
          : <Wifi className="h-4 w-4" />,
    label: 'WiFi',
    value: !alive ? '—' : softOff ? (wifiCut ? '끊김' : '정상') : WIFI_SIGNAL_LABEL[device.wifiSignal],
    tone: !alive ? 'muted' : softOff ? (wifiCut ? 'muted' : 'success') : wifiTone(device.wifiSignal),
  }
  const overheat: ChipProps = {
    icon: <Thermometer className="h-4 w-4" />,
    label: '과열',
    value: !alive ? '—' : device.overTemperature ? '과열' : '정상',
    tone: !alive ? 'muted' : device.overTemperature ? 'destructive' : 'success',
  }

  return { softOff, alive, dispConn, wifiCut, power, operation, wifi, overheat }
}

/** 사용자 페이지 기기 카드 — 헤더(뱃지) + 상태 칩 2×2 + 푸터 */
export function UserDeviceCard({ device, onClick }: { device: HearingLoop; onClick?: () => void }) {
  const uStatus = deriveUserStatus(device)
  const chips = userChipProps(device)

  return (
    <div
      onClick={onClick}
      className="group rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
    >
      {/* 헤더: 아이콘 + 타이틀 + 상태뱃지 */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${
            uStatus === 'normal'
              ? 'bg-success/10'
              : uStatus === 'warning'
                ? 'bg-warning/10'
                : uStatus === 'offline'
                  ? 'bg-muted'
                  : 'bg-destructive/10'
          }`}
        >
          <Radio
            className={`h-5 w-5 ${
              uStatus === 'normal'
                ? 'text-success'
                : uStatus === 'warning'
                  ? 'text-warning'
                  : uStatus === 'offline'
                    ? 'text-muted-foreground'
                    : 'text-destructive'
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-foreground truncate">{displayTitle(device)}</p>
          {device.alias?.trim() && (
            <p className="text-[11px] text-muted-foreground font-mono truncate">{device.mac}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={uStatus} />
          {device.firmwareInconsistent && <FirmwareInconsistentBadge />}
        </div>
      </div>

      {/* 상태 칩 2×2 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatusChip {...chips.power} />
        <StatusChip {...chips.operation} />
        <StatusChip {...chips.wifi} />
        <StatusChip {...chips.overheat} />
      </div>

      {/* 푸터: 존 + 최근 업데이트 */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 truncate">
          <Building2 className="h-3 w-3 shrink-0" />
          {device.telecoilZoneName ?? '—'}
        </span>
        <span className="shrink-0">{formatDateTime(device.lastUpdated)}</span>
      </div>
    </div>
  )
}
