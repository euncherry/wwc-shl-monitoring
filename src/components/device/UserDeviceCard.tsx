import { createElement, type ReactNode } from 'react'
import {
  Radio,
  Power,
  PowerOff,
  Thermometer,
  Wifi,
  WifiOff,
  Building2,
  AlertTriangle,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-react'
import { TooltipRoot, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { HearingLoop, ConnectionStatus, WifiSignal } from '@/types/device'
import { WifiSignalIcon, WIFI_SIGNAL_LABEL } from '@/components/WifiSignalIcon'
import { connectionMeta } from '@/lib/connectionStatus'
import { formatDateTime } from '@/lib/format'
import { deriveUserStatus, isSoftOff, type UserDeviceStatus } from '@/lib/userDeviceDisplay'

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
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}
    >
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

/** 톤 → 글자색만. 칩 배경 없이 아이콘·텍스트만 쓰는 자리(테이블 칸, 대시보드 목록)에서 쓴다. */
export const TONE_TEXT: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
  info: 'text-primary',
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
  /* 48h 미만 꺼짐(soft-off)은 전부 정상으로 연출한다 — WiFi도, 과열도. (isSoftOff 참고) */
  const softOff = isSoftOff(device)
  const alive = device.power || softOff
  const dispConn: ConnectionStatus = softOff ? 'ONLINE' : device.connectionStatus
  const conn = connectionMeta(dispConn)

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
      !softOff && device.wifiSignal === 'DISCONNECTED' ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <Wifi className="h-4 w-4" />
      ),
    label: 'WiFi',
    value: !alive ? '—' : softOff ? '정상' : WIFI_SIGNAL_LABEL[device.wifiSignal],
    tone: !alive ? 'muted' : softOff ? 'success' : wifiTone(device.wifiSignal),
  }
  /* soft-off 구간에서는 마지막 실측 과열도 감춘다 — 유예 창 안에서는 '전부 정상'이 원칙.
     켜져 있는 기기의 과열은 유예 대상이 아니므로 그대로 빨갛게 뜬다. */
  const overheating = alive && !softOff && device.overTemperature
  const overheat: ChipProps = {
    icon: <Thermometer className="h-4 w-4" />,
    label: '과열',
    value: !alive ? '—' : overheating ? '과열' : '정상',
    tone: !alive ? 'muted' : overheating ? 'destructive' : 'success',
  }

  return { softOff, alive, dispConn, power, operation, wifi, overheat }
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

/* ── 테이블 뷰 (md 이상) — 관리자 목록(AdminDeviceRow)과 같은 컬럼·같은 배치.
   ⚠️ 다른 건 값뿐이다: 관리자는 실시간 원값, 여기는 사용자 표시 정책(4h/24h 유예)을 통과한 값.
      <table><tbody> 안에서만 렌더 가능. */

const U_HEAD = 'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'
const U_HEAD_C = 'px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'

/** 헤더 클릭으로 정렬 가능한 컬럼 — 관리자 테이블과 같은 두 가지 */
export type UserSortKey = 'name' | 'updated'
export type UserSortDir = 'asc' | 'desc'

export function UserDeviceTableHead({
  sortKey,
  sortDir = 'desc',
  onSort,
}: {
  sortKey?: UserSortKey
  /** 없으면 정렬 UI를 렌더하지 않는다(조회 전용 테이블) */
  sortDir?: UserSortDir
  onSort?: (key: UserSortKey) => void
} = {}) {
  /** 정렬 헤더 셀 — 비활성일 땐 옅은 ↕ 힌트, 활성일 땐 방향 화살표 */
  function SortHead({ column, label, hint }: { column: UserSortKey; label: string; hint: string }) {
    if (!onSort) return <>{label}</>
    const active = sortKey === column
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
    return (
      <button
        onClick={() => onSort(column)}
        title={active ? hint : '클릭하여 정렬'}
        className={`group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground ${
          active ? 'text-primary' : ''
        }`}
      >
        {label}
        <Icon
          className={`h-3 w-3 shrink-0 transition-colors ${
            active ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground'
          }`}
        />
      </button>
    )
  }

  return (
    <thead>
      <tr className="border-b border-border bg-page/50">
        <th className={U_HEAD}>
          <SortHead column="name" label="기기" hint={sortDir === 'asc' ? '가나다순' : '가나다 역순'} />
        </th>
        <th className={U_HEAD}>텔레코일존</th>
        <th className={U_HEAD_C}>전원</th>
        <th className={U_HEAD_C}>동작</th>
        <th className={U_HEAD_C}>WiFi</th>
        <th className={U_HEAD_C}>과열</th>
        <th className={U_HEAD_C}>펌웨어</th>
        <th className={U_HEAD}>
          <SortHead column="updated" label="최근 업데이트" hint={sortDir === 'asc' ? '오래된순' : '최신순'} />
        </th>
        <th className="w-12 px-5 py-3" />
      </tr>
    </thead>
  )
}

export function UserDeviceTableRow({ device, onClick }: { device: HearingLoop; onClick?: () => void }) {
  const uStatus = deriveUserStatus(device)
  const chips = userChipProps(device)
  const { alive, softOff, dispConn } = chips
  const hasAlias = Boolean(device.alias?.trim())
  const conn = connectionMeta(dispConn)

  /* WiFi 칸 — 아이콘 아래 실측값(dBm)과 SSID. 정책상 값을 감추는 구간은 문구로 대체한다 */
  const wifiSub = !alive ? '—' : softOff ? '정상' : device.wifiRssi != null ? `${device.wifiRssi}dBm` : '—'

  return (
    <tr onClick={onClick} className="group cursor-pointer transition-colors hover:bg-main-blue-1/10">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
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
              className={`h-4 w-4 ${
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
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-foreground">{displayTitle(device)}</p>
              {device.firmwareInconsistent && <FirmwareInconsistentBadge />}
            </div>
            {hasAlias && <p className="font-mono text-[11px] text-muted-foreground">{device.mac}</p>}
          </div>
        </div>
      </td>

      <td className="px-5 py-3.5">
        <p className="text-[13px] font-semibold text-foreground">{device.telecoilZoneName ?? '—'}</p>
      </td>

      <td className="px-5 py-3.5 text-center" title={alive ? '전원 ON' : '전원 OFF'}>
        <div className="flex justify-center">
          {alive ? <Power className="h-4 w-4 text-success" /> : <PowerOff className="h-4 w-4 text-muted-foreground" />}
        </div>
      </td>

      <td className="px-5 py-3.5 text-center" title={conn.label}>
        <div className="flex justify-center">
          {createElement(conn.Icon, { className: `h-4 w-4 ${conn.color}` })}
        </div>
      </td>

      <td className="px-5 py-3.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          {!alive ? (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          ) : softOff ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiSignalIcon signal={device.wifiSignal} />
          )}
          <span className="text-[10px] tabular-nums text-muted-foreground">{wifiSub}</span>
          {alive && device.wifiSsid && (
            <span className="max-w-[96px] truncate text-[10px] text-muted-foreground" title={device.wifiSsid}>
              {device.wifiSsid}
            </span>
          )}
        </div>
      </td>

      <td className="px-5 py-3.5 text-center">
        <span className={`text-[13px] font-semibold ${TONE_TEXT[chips.overheat.tone]}`}>{chips.overheat.value}</span>
      </td>

      <td className="px-5 py-3.5 text-center">
        <div className="inline-flex flex-col items-center gap-1">
          {device.firmwareVersion && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
              세트 v{device.firmwareVersion}
            </span>
          )}
          <p className="text-[10px] leading-tight text-muted-foreground">
            <span className="font-medium">WiFi</span>{' '}
            <span className="font-mono font-semibold text-foreground">{device.wifiFirmwareVersion || '—'}</span>
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground">
            <span className="font-medium">HL</span>{' '}
            <span className="font-mono font-semibold text-foreground">{device.hlFirmwareVersion || '—'}</span>
          </p>
        </div>
      </td>

      <td className="px-5 py-3.5">
        <span className="whitespace-nowrap text-[12px] text-muted-foreground">{formatDateTime(device.lastUpdated)}</span>
      </td>

      <td className="px-3 py-3.5 text-center">
        <ChevronRight className="mx-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </td>
    </tr>
  )
}
