import { createElement } from 'react'
import {
  Radio,
  Package,
  Power,
  PowerOff,
  Thermometer,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { TooltipRoot, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { HearingLoop } from '@/types/device'
import { WifiSignalIcon, WIFI_SIGNAL_LABEL } from '@/components/WifiSignalIcon'
import { connectionMeta } from '@/lib/connectionStatus'
import { formatDateTime } from '@/lib/format'

/* ══════════════════════════════════════════════════════
   관리자 히어링루프 목록 표시 컴포넌트 (테이블 행 / 모바일 카드).
   /admin/hearing-loops 와 표시 규격 실증 페이지(/status-spec)가 공유한다 —
   실증 페이지가 실제 화면과 어긋나지 않도록 마크업은 반드시 여기 한 곳에만 둔다.
   ⚠️ 관리자 화면은 실시간 그대로 표시한다(사용자 페이지의 4h/24h 유예 정책 미적용).
   ══════════════════════════════════════════════════════ */

/** 별칭 있으면 별칭, 없으면 MAC */
export function displayTitle(device: Pick<HearingLoop, 'alias' | 'mac'>) {
  return device.alias?.trim() ? device.alias : device.mac
}

export function PowerIcon({ on }: { on: boolean }) {
  return on ? (
    <Power className="h-4 w-4 text-success" />
  ) : (
    <PowerOff className="h-4 w-4 text-muted-foreground" />
  )
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
        업데이트 도중 WiFi MCU와 HL MCU 중 하나만 성공하여 펌웨어 상태를 추적할 수 없는 상태입니다. 두 MCU가 동일한 버전이 되도록 재업데이트가 필요합니다.
      </TooltipContent>
    </TooltipRoot>
  )
}

export function ProvisioningBadge() {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          프로비저닝 대기
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        화이트리스트에 등록됐지만 아직 IoT Core 프로비저닝(최초 연결)이 안 된 상태입니다. 한 번도 연결된 적이 없어, 켜졌다 꺼진 오프라인 기기와는 다릅니다.
      </TooltipContent>
    </TooltipRoot>
  )
}

/** 관리자 목록 테이블 헤더 (9컬럼) */
export function AdminDeviceTableHead() {
  return (
    <thead>
      <tr className="bg-page/50 border-b border-border">
        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">기기</th>
        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">텔레코일존</th>
        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">전원</th>
        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">동작</th>
        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">WiFi</th>
        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">과열</th>
        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">펌웨어</th>
        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">최근 업데이트</th>
        <th className="px-5 py-3 w-12"></th>
      </tr>
    </thead>
  )
}

interface RowProps {
  device: HearingLoop
  onClick?: () => void
  /** OTA 선택 모드 — 체크박스 노출 (실증 페이지에서는 사용하지 않음) */
  otaMode?: boolean
  otaChecked?: boolean
  onToggleOta?: () => void
}

/** 관리자 목록 테이블 행 — ⚠️ <table><tbody> 안에서만 렌더 가능 */
export function AdminDeviceTableRow({ device, onClick, otaMode, otaChecked, onToggleOta }: RowProps) {
  const hasAlias = Boolean(device.alias?.trim())
  return (
    <tr
      className="transition-colors hover:bg-main-blue-1/10 cursor-pointer group"
      onClick={onClick}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {otaMode && (
            <input
              type="checkbox"
              checked={otaChecked}
              disabled={device.connectionStatus !== 'ONLINE'}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleOta?.()}
              aria-label="OTA 선택"
              className="h-4 w-4 shrink-0 rounded border-border accent-primary disabled:opacity-40"
            />
          )}
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${!device.telecoilZoneId ? 'bg-warning/10' : 'bg-primary/10'}`}>
            {!device.telecoilZoneId ? <Package className="h-4 w-4 text-warning" /> : <Radio className="h-4 w-4 text-primary" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-foreground">{displayTitle(device)}</p>
              {device.provisionStatus === 'PENDING' && <ProvisioningBadge />}
            </div>
            {hasAlias && <p className="text-[11px] text-muted-foreground font-mono">{device.mac}</p>}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {device.telecoilZoneName ? (
          <p className="text-[13px] font-semibold text-foreground">{device.telecoilZoneName}</p>
        ) : (
          <span className="text-[12px] text-warning font-semibold">미배정</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-center"><PowerIcon on={device.power} /></td>
      <td className="px-5 py-3.5 text-center" title={connectionMeta(device.connectionStatus).label}>
        <div className="flex justify-center">
          {createElement(connectionMeta(device.connectionStatus).Icon, { className: `h-4 w-4 ${connectionMeta(device.connectionStatus).color}` })}
        </div>
      </td>
      <td className="px-5 py-3.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <WifiSignalIcon signal={device.wifiSignal} />
          {/* 임시: RSSI 원시값(dBm) 표시 — 신호 단계 디버깅용 */}
          <span className="text-[10px] tabular-nums text-muted-foreground">{device.wifiRssi != null ? `${device.wifiRssi}dBm` : '—'}</span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className={`text-[13px] font-semibold ${!device.power ? 'text-muted-foreground' : device.overTemperature ? 'text-destructive' : 'text-success'}`}>
          {!device.power ? '—' : device.overTemperature ? '과열' : '정상'}
        </span>
      </td>
      <td className="px-5 py-3.5 text-center">
        <div className="inline-flex flex-col items-center gap-1">
          {device.firmwareVersion && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">세트 v{device.firmwareVersion}</span>
          )}
          {device.firmwareInconsistent && <FirmwareInconsistentBadge />}
          <p className="text-[10px] text-muted-foreground leading-tight">
            <span className="font-medium">WiFi</span>{' '}
            <span className="font-mono font-semibold text-foreground">{device.wifiFirmwareVersion || '—'}</span>
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            <span className="font-medium">HL</span>{' '}
            <span className="font-mono font-semibold text-foreground">{device.hlFirmwareVersion || '—'}</span>
          </p>
        </div>
      </td>
      <td className="px-5 py-3.5"><span className="text-[12px] text-muted-foreground">{formatDateTime(device.lastUpdated)}</span></td>
      <td className="px-3 py-3.5 text-center">
        <button className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-page transition-all">
          <ChevronRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

/** 관리자 목록 모바일 카드 (md 미만) */
export function AdminDeviceMobileCard({ device, onClick, otaMode, otaChecked, onToggleOta }: RowProps) {
  const hasAlias = Boolean(device.alias?.trim())
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-3 rounded-xl border border-border bg-white p-4 text-left transition-colors hover:bg-main-blue-1/10"
    >
      {/* 타이틀 + 동작 상태 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {otaMode && (
            <input
              type="checkbox"
              checked={otaChecked}
              disabled={device.connectionStatus !== 'ONLINE'}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleOta?.()}
              aria-label="OTA 선택"
              className="h-4 w-4 shrink-0 rounded border-border accent-primary disabled:opacity-40"
            />
          )}
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${!device.telecoilZoneId ? 'bg-warning/10' : 'bg-primary/10'}`}>
            {!device.telecoilZoneId ? <Package className="h-4 w-4 text-warning" /> : <Radio className="h-4 w-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[13px] font-bold text-foreground">{displayTitle(device)}</p>
              {device.provisionStatus === 'PENDING' && <ProvisioningBadge />}
            </div>
            {hasAlias && <p className="truncate text-[11px] text-muted-foreground font-mono">{device.mac}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" title={connectionMeta(device.connectionStatus).label}>
          {createElement(connectionMeta(device.connectionStatus).Icon, { className: `h-4 w-4 ${connectionMeta(device.connectionStatus).color}` })}
          <span className={`text-[11px] font-bold ${connectionMeta(device.connectionStatus).color}`}>{connectionMeta(device.connectionStatus).label}</span>
        </div>
      </div>

      {/* 텔레코일존 */}
      <div className="flex items-center gap-1.5 text-[12px]">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {device.telecoilZoneName ? (
          <span className="font-semibold text-foreground">{device.telecoilZoneName}</span>
        ) : (
          <span className="font-semibold text-warning">미배정</span>
        )}
      </div>

      {/* 상태 칩 */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-page/50 px-2 py-1">
          <PowerIcon on={device.power} />
          <span className="font-semibold text-foreground">{device.power ? 'ON' : 'OFF'}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-page/50 px-2 py-1">
          <WifiSignalIcon signal={device.wifiSignal} />
          <span className="font-semibold text-foreground">{WIFI_SIGNAL_LABEL[device.wifiSignal]}</span>
          {device.wifiRssi != null && <span className="tabular-nums text-muted-foreground">{device.wifiRssi}dBm</span>}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-page/50 px-2 py-1">
          <Thermometer className={`h-3.5 w-3.5 ${!device.power ? 'text-muted-foreground/50' : device.overTemperature ? 'text-destructive' : 'text-success'}`} />
          <span className={`font-semibold ${!device.power ? 'text-muted-foreground' : device.overTemperature ? 'text-destructive' : 'text-success'}`}>{!device.power ? '—' : device.overTemperature ? '과열' : '정상'}</span>
        </span>
      </div>

      {/* 펌웨어 + 최근 업데이트 */}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          {device.firmwareVersion && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">세트 v{device.firmwareVersion}</span>
          )}
          {device.firmwareInconsistent && <FirmwareInconsistentBadge />}
          <span className="text-muted-foreground">
            <span className="font-medium">WiFi</span>{' '}
            <span className="font-mono font-semibold text-foreground">{device.wifiFirmwareVersion || '—'}</span>
            {' · '}
            <span className="font-medium">HL</span>{' '}
            <span className="font-mono font-semibold text-foreground">{device.hlFirmwareVersion || '—'}</span>
          </span>
        </div>
        <span className="shrink-0 text-muted-foreground">{formatDateTime(device.lastUpdated)}</span>
      </div>
    </button>
  )
}
