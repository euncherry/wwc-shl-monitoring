import { createElement, useState, type ReactNode } from 'react'
import axios from 'axios'
import {
  Radio,
  Power,
  PowerOff,
  Thermometer,
  Wifi,
  WifiOff,
  Building2,
  Search,
  Pencil,
  Check,
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { HearingLoop, DeviceStatus, ConnectionStatus, WifiSignal } from '@/types/device'
import { useDevices, useUpdateAlias } from '@/hooks/useDevices'
import { WifiSignalIcon, WIFI_SIGNAL_LABEL, wifiSignalColor } from '@/components/WifiSignalIcon'
import { connectionMeta } from '@/lib/connectionStatus'
import { formatDateTime } from '@/lib/format'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

/* ══════════════════════════════════════════════════════
   사용자 기관 히어링루프 — GET /devices (ZONE_USER는 백엔드가 소속 존 자동 필터)
   ══════════════════════════════════════════════════════ */

/** 별칭 있으면 별칭, 없으면 MAC */
function displayTitle(device: Pick<HearingLoop, 'alias' | 'mac'>) {
  return device.alias?.trim() ? device.alias : device.mac
}

/* ── Sub-components ── */

function StatusBadge({ status }: { status: DeviceStatus }) {
  const m: Record<DeviceStatus, { label: string; dot: string; cls: string }> = {
    normal: { label: '정상', dot: 'bg-success', cls: 'bg-success/10 text-success' },
    warning: { label: '경고', dot: 'bg-warning', cls: 'bg-warning/10 text-warning' },
    error: { label: '오류', dot: 'bg-destructive', cls: 'bg-destructive/10 text-destructive' },
    offline: { label: '오프라인', dot: 'bg-muted-foreground', cls: 'bg-muted text-muted-foreground' },
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

type Tone = 'success' | 'warning' | 'destructive' | 'muted'

const TONE: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
}

function connTone(s: ConnectionStatus): Tone {
  return s === 'ONLINE' ? 'success' : s === 'CONNECTING' ? 'warning' : 'muted'
}

function wifiTone(s: WifiSignal): Tone {
  return s === 'STRONG' || s === 'FAIR' ? 'success' : s === 'WEAK' ? 'warning' : 'destructive'
}

function StatusChip({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: Tone }) {
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

/* ── Detail Modal ── */

function DeviceDetailModal({
  device,
  onClose,
}: {
  device: HearingLoop
  onClose: () => void
}) {
  useLockBodyScroll()
  const updateAlias = useUpdateAlias()
  const hasAlias = !!device.alias?.trim()
  const [editingAlias, setEditingAlias] = useState(false)
  const [tempAlias, setTempAlias] = useState(device.alias ?? '')
  const [aliasError, setAliasError] = useState('')

  const handleSave = () => {
    const next = tempAlias.trim()
    setAliasError('')
    updateAlias.mutate(
      { mac: device.mac, alias: next },
      {
        onSuccess: () => setEditingAlias(false),
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setAliasError('이미 사용 중인 별칭입니다.')
          } else {
            setAliasError('별칭 저장에 실패했습니다.')
          }
        },
      },
    )
  }

  const handleCancel = () => {
    setTempAlias(device.alias ?? '')
    setAliasError('')
    setEditingAlias(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-page/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{displayTitle(device)}</h3>
              {hasAlias && <p className="text-[12px] text-muted-foreground font-mono">{device.mac}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={device.status} />
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* 별칭 */}
          <div className="rounded-xl border border-primary/20 bg-primary/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-primary">히어링루프 별칭</span>
              {!editingAlias && (
                <button
                  onClick={() => setEditingAlias(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </button>
              )}
            </div>
            {editingAlias ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempAlias}
                    disabled={updateAlias.isPending}
                    onChange={(e) => setTempAlias(e.target.value)}
                    placeholder="별칭을 입력하세요 (예: 1층 안내데스크)"
                    className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave()
                      if (e.key === 'Escape') handleCancel()
                    }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={updateAlias.isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {updateAlias.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={updateAlias.isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {aliasError && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-destructive">
                    <AlertCircle className="h-3 w-3" /> {aliasError}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[14px] font-bold text-foreground">
                {hasAlias ? device.alias : <span className="text-muted-foreground font-normal italic">별칭 미지정</span>}
              </p>
            )}
          </div>

          {/* 실시간 상태 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 전원 상태 */}
            <div className="rounded-xl border border-border p-4 text-center">
              <span className="text-[11px] text-muted-foreground block mb-2">전원 상태</span>
              <div className="flex items-center justify-center gap-2">
                {device.power ? (
                  <Power className="h-5 w-5 text-success" />
                ) : (
                  <PowerOff className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={`text-[14px] font-bold ${device.power ? 'text-success' : 'text-muted-foreground'}`}>
                  {device.power ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {/* 기기 동작 — connection_status */}
            <div className="rounded-xl border border-border p-4 text-center">
              <span className="text-[11px] text-muted-foreground block mb-2">기기 동작</span>
              <div className="flex items-center justify-center gap-2">
                {createElement(connectionMeta(device.connectionStatus).Icon, { className: `h-5 w-5 ${connectionMeta(device.connectionStatus).color}` })}
                <span className={`text-[14px] font-bold ${connectionMeta(device.connectionStatus).color}`}>
                  {connectionMeta(device.connectionStatus).label}
                </span>
              </div>
            </div>

            {/* WiFi 신호 */}
            <div className="rounded-xl border border-border p-4 text-center">
              <span className="text-[11px] text-muted-foreground block mb-2">WiFi 신호</span>
              <div className="flex items-center justify-center gap-2">
                <WifiSignalIcon signal={device.wifiSignal} className="h-5 w-5" />
                <span className={`text-[14px] font-bold ${wifiSignalColor(device.wifiSignal)}`}>
                  {WIFI_SIGNAL_LABEL[device.wifiSignal]}
                </span>
              </div>
            </div>

            {/* 과열 경보 — last_gpio_state. true=과열, false=정상 */}
            <div className="rounded-xl border border-border p-4 text-center">
              <span className="text-[11px] text-muted-foreground block mb-2">과열 경보</span>
              <div className="flex items-center justify-center gap-2">
                <Thermometer
                  className={`h-5 w-5 ${device.overTemperature ? 'text-destructive' : 'text-success'}`}
                />
                <span
                  className={`text-[14px] font-bold ${device.overTemperature ? 'text-destructive' : 'text-success'}`}
                >
                  {device.overTemperature ? '과열' : '정상'}
                </span>
              </div>
            </div>
          </div>

          {/* 기기 정보 */}
          <div className="rounded-xl border border-border divide-y divide-border/50">
            {[
              { label: '텔레코일존', value: device.telecoilZoneName ?? '—' },
              { label: 'MAC 주소', value: device.mac },
              { label: '최근 업데이트', value: formatDateTime(device.lastUpdated) },
              { label: '등록일', value: formatDateTime(device.registeredAt) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">{row.label}</span>
                <span className="text-[13px] font-semibold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-page/30">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function UserHearingLoops() {
  const [search, setSearch] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<HearingLoop | null>(null)

  /* 소속 기관 기기 (ZONE_USER는 GET /devices가 자동 필터) */
  const { data: devices = [], isLoading, isError } = useDevices()

  /* 검색 필터 (별칭·MAC) */
  const filteredDevices = devices.filter((d) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return d.mac.toLowerCase().includes(q) || (d.alias ?? '').toLowerCase().includes(q)
  })

  /* 상태 통계 */
  const stats = {
    total: devices.length,
    normal: devices.filter((d) => d.status === 'normal').length,
    warning: devices.filter((d) => d.status === 'warning').length,
    error: devices.filter((d) => d.status === 'error' || d.status === 'offline').length,
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="pb-2">
        <h2 className="text-2xl font-black text-foreground tracking-tight mt-2">히어링루프 관리</h2>
        <p className="text-sm text-muted-foreground mt-2">
          소속 기관에 등록된 히어링루프의 현재 상태를 조회하고 별칭을 관리할 수 있습니다.
        </p>
      </div>

      {/* ─── 상태 요약 KPI ─── */}
      <div className="grid grid-cols-4 gap-4">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">전체 기기</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-success/20 bg-success/3 p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">정상</p>
            <p className="text-2xl font-bold text-success">{stats.normal}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-warning/20 bg-warning/3 p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">경고</p>
            <p className={`text-2xl font-bold ${stats.warning > 0 ? 'text-warning' : 'text-muted-foreground/30'}`}>
              {stats.warning}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/3 p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">오류 / 오프라인</p>
            <p className={`text-2xl font-bold ${stats.error > 0 ? 'text-destructive' : 'text-muted-foreground/30'}`}>
              {stats.error}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 검색 ─── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="별칭, MAC 주소로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* ─── 기기 카드 목록 ─── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl border border-dashed border-border bg-white">
            <Loader2 className="h-8 w-8 text-muted-foreground/40 animate-spin" />
            <p className="text-[14px] font-semibold text-muted-foreground">불러오는 중…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl border border-dashed border-destructive/30 bg-white">
            <AlertCircle className="h-10 w-10 text-destructive/40" />
            <p className="text-[14px] font-semibold text-destructive">기기 목록을 불러오지 못했습니다</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl border border-dashed border-border bg-white">
            <Radio className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-[14px] font-semibold text-muted-foreground">소속 기관에 등록된 히어링루프가 없습니다</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl border border-dashed border-border bg-white">
            <Radio className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-[14px] font-semibold text-muted-foreground">검색 결과가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredDevices.map((device) => {
              const conn = connectionMeta(device.connectionStatus)
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className="group rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                >
                  {/* 헤더: 아이콘 + 타이틀 + 상태뱃지 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${
                        device.status === 'normal'
                          ? 'bg-success/10'
                          : device.status === 'warning'
                            ? 'bg-warning/10'
                            : 'bg-destructive/10'
                      }`}
                    >
                      <Radio
                        className={`h-5 w-5 ${
                          device.status === 'normal'
                            ? 'text-success'
                            : device.status === 'warning'
                              ? 'text-warning'
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
                    <StatusBadge status={device.status} />
                  </div>

                  {/* 상태 칩 2×2 */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <StatusChip
                      icon={device.power ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      label="전원"
                      value={device.power ? 'ON' : 'OFF'}
                      tone={device.power ? 'success' : 'muted'}
                    />
                    <StatusChip
                      icon={createElement(conn.Icon, { className: 'h-4 w-4' })}
                      label="동작"
                      value={conn.label}
                      tone={connTone(device.connectionStatus)}
                    />
                    <StatusChip
                      icon={device.wifiSignal === 'DISCONNECTED' ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                      label="WiFi"
                      value={WIFI_SIGNAL_LABEL[device.wifiSignal]}
                      tone={wifiTone(device.wifiSignal)}
                    />
                    <StatusChip
                      icon={<Thermometer className="h-4 w-4" />}
                      label="과열"
                      value={device.overTemperature ? '과열' : '정상'}
                      tone={device.overTemperature ? 'destructive' : 'success'}
                    />
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
            })}
          </div>
        )}
      </div>

      {/* 하단 요약 */}
      {filteredDevices.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-page/50 border border-border/50 px-5 py-3">
          <span className="text-[12px] text-muted-foreground">
            총 <span className="font-bold text-foreground">{filteredDevices.length}</span>개 기기
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            실시간 모니터링 중
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </div>
  )
}
