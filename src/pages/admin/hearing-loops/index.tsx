import { useState, useMemo } from 'react'
import {
  Search,
  Wifi,
  WifiOff,
  Power,
  PowerOff,
  Thermometer,
  Volume2,
  Shield,
  MapPin,
  ChevronRight,
  Package,
  Download,
  X,
  Radio,
  Activity,
  Hash,
  Bell,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  Pencil,
  CheckCircle2,
} from 'lucide-react'
import { hearingLoops } from '@/data/hearingLoops'
import type { HearingLoop, DeviceStatus } from '@/types/device'

/* ══════════════════════════════════════════════════════
   Tabs
   ══════════════════════════════════════════════════════ */

type TabKey = 'all' | 'unassigned' | 'ota'

const tabs: { key: TabKey; label: string; count: number }[] = [
  { key: 'all', label: '전체 히어링루프', count: hearingLoops.length },
  { key: 'unassigned', label: '미배정 기기', count: hearingLoops.filter((d) => !d.telecoilZoneId).length },
]

const otaCount = hearingLoops.filter((d) => d.firmwareVersion !== 'v2.5.0').length

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

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

function PowerIcon({ on }: { on: boolean }) {
  return on ? (
    <Power className="h-4 w-4 text-success" />
  ) : (
    <PowerOff className="h-4 w-4 text-muted-foreground" />
  )
}

function NetworkIcon({ connected }: { connected: boolean }) {
  return connected ? (
    <Wifi className="h-4 w-4 text-success" />
  ) : (
    <WifiOff className="h-4 w-4 text-destructive" />
  )
}

/* ══════════════════════════════════════════════════════
   Detail Modal
   ══════════════════════════════════════════════════════ */

function DeviceDetailModal({
  device,
  nickname,
  onClose,
  onSaveNickname,
}: {
  device: HearingLoop
  nickname: string
  onClose: () => void
  onSaveNickname: (id: string, name: string) => void
}) {
  const [localPower, setLocalPower] = useState(device.power)
  const [localVolume, setLocalVolume] = useState(device.volume)
  const [editingNickname, setEditingNickname] = useState(false)
  const [tempNickname, setTempNickname] = useState(nickname)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-page/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{nickname}</h3>
                <span className="rounded-md bg-page px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{device.id}</span>
              </div>
              <p className="text-[12px] text-muted-foreground font-mono">{device.mac}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={device.status} />
            <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* 별칭 편집 */}
          <div className="rounded-xl border border-primary/20 bg-primary/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-primary">히어링루프 별칭</span>
              {!editingNickname && (
                <button
                  onClick={() => setEditingNickname(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </button>
              )}
            </div>
            {editingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  placeholder="별칭을 입력하세요"
                  className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { onSaveNickname(device.id, tempNickname.trim() || device.id); setEditingNickname(false) }
                    if (e.key === 'Escape') { setTempNickname(nickname); setEditingNickname(false) }
                  }}
                />
                <button
                  onClick={() => { onSaveNickname(device.id, tempNickname.trim() || device.id); setEditingNickname(false) }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setTempNickname(nickname); setEditingNickname(false) }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-[14px] font-bold text-foreground">{nickname}</p>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* 전원 상태 — 제어 가능 */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-muted-foreground">전원 상태</span>
                <button
                  onClick={() => setLocalPower(!localPower)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localPower ? 'bg-success' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${localPower ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <PowerIcon on={localPower} />
                <span className="text-sm font-bold text-foreground">{localPower ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            {/* 기기 동작 여부 — 조회만 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">기기 동작 여부</span>
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${device.operating ? 'text-success' : 'text-destructive'}`} />
                <span className="text-sm font-bold text-foreground">{device.operating ? '정상 작동' : '작동 중지'}</span>
              </div>
            </div>

            {/* 네트워크 — 조회만 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">네트워크 연결</span>
              <div className="flex items-center gap-2">
                <NetworkIcon connected={device.networkConnected} />
                <span className="text-sm font-bold text-foreground">{device.networkConnected ? '연결됨' : '연결 끊김'}</span>
              </div>
            </div>

            {/* 온도 — 조회만 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">온도</span>
              <div className="flex items-center gap-2">
                <Thermometer className={`h-4 w-4 ${device.temperature > 45 ? 'text-destructive' : device.temperature > 40 ? 'text-warning' : 'text-success'}`} />
                <span className="text-sm font-bold text-foreground">{device.temperature}°C</span>
              </div>
            </div>

            {/* 볼륨 — 제어 가능 */}
            <div className="rounded-xl border border-border p-4 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-muted-foreground">볼륨</span>
                <span className="text-sm font-bold text-primary">{localVolume}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-primary shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={localVolume}
                  onChange={(e) => setLocalVolume(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-border/50 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="rounded-xl border border-border divide-y divide-border/50">
            {[
              { label: '펌웨어 버전', value: device.firmwareVersion, icon: Shield },
              { label: '배치된 텔레코일존', value: device.telecoilZoneName ?? '미배정', icon: MapPin },
              { label: 'MAC 주소', value: device.mac, icon: Hash },
              { label: '최근 업데이트', value: device.lastUpdated, icon: Activity },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <row.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">{row.label}</span>
                </div>
                <span className={`text-[13px] font-semibold ${row.value === '미배정' ? 'text-warning' : 'text-foreground'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Alerts history */}
          {device.alerts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-destructive" />
                <h4 className="text-[14px] font-bold text-foreground">알림 이력</h4>
              </div>
              <div className="space-y-2">
                {device.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[12px] ${
                      alert.level === 'critical' ? 'bg-destructive/5 border border-destructive/20' :
                      alert.level === 'warning' ? 'bg-warning/5 border border-warning/20' : 'bg-primary/5 border border-primary/20'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${
                      alert.level === 'critical' ? 'bg-destructive' : alert.level === 'warning' ? 'bg-warning' : 'bg-primary'
                    }`} />
                    <span className="font-semibold text-foreground">{alert.type}</span>
                    <span className="text-muted-foreground flex-1">{alert.message}</span>
                    <span className="text-muted-foreground shrink-0">{alert.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-page/30">
          <button className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-destructive hover:bg-destructive/5 transition-colors">
            <Trash2 className="h-4 w-4" />
            기기 삭제
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
              닫기
            </button>
            <button className="rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors">
              변경사항 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function HearingLoopsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedDevice, setSelectedDevice] = useState<HearingLoop | null>(null)
  const [otaSelected, setOtaSelected] = useState<Set<string>>(new Set())
  const [nicknames, setNicknames] = useState<Record<string, string>>({})

  const getNickname = (id: string) => nicknames[id] || id
  const handleSaveNickname = (id: string, name: string) => {
    setNicknames((prev) => ({ ...prev, [id]: name }))
  }

  /* ── Tab-based list (before status filter) ── */
  const tabBaseList = useMemo(() => {
    let list = [...hearingLoops]
    if (activeTab === 'unassigned') list = list.filter((d) => !d.telecoilZoneId)
    if (activeTab === 'ota') list = list.filter((d) => d.firmwareVersion !== 'v2.5.0')
    return list
  }, [activeTab])

  /* ── Status counts for inner tabs ── */
  const statusCounts = useMemo(() => {
    const counts = { all: tabBaseList.length, normal: 0, warning: 0, error: 0, offline: 0 }
    tabBaseList.forEach((d) => { counts[d.status]++ })
    return counts
  }, [tabBaseList])

  /* ── Filtered data ── */
  const filteredDevices = useMemo(() => {
    let list = [...tabBaseList]

    // Status filter
    if (statusFilter !== 'all') list = list.filter((d) => d.status === statusFilter)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.telecoilZoneName?.toLowerCase().includes(q) ||
          d.mac.toLowerCase().includes(q),
      )
    }

    // Sort
    list.sort((a, b) => {
      const da = new Date(a.lastUpdated).getTime()
      const db = new Date(b.lastUpdated).getTime()
      return sortOrder === 'latest' ? db - da : da - db
    })

    return list
  }, [tabBaseList, statusFilter, search, sortOrder])

  const toggleOta = (id: string) => {
    setOtaSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleOtaAll = () => {
    if (otaSelected.size === filteredDevices.length) {
      setOtaSelected(new Set())
    } else {
      setOtaSelected(new Set(filteredDevices.map((d) => d.id)))
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <div className="pb-5 pt-5">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">히어링루프 관리</h2>
        <p className="text-sm text-muted-foreground mt-2">등록된 히어링루프를 조회하고 제어할 수 있습니다.</p>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-2xl bg-white border border-border p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setStatusFilter('all') }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-dark text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-page'
              }`}
            >
              {tab.label}
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-page text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* OTA 업데이트 — 오른쪽 독립 버튼 */}
        <button
          onClick={() => { setActiveTab(activeTab === 'ota' ? 'all' : 'ota'); setSearch(''); setStatusFilter('all') }}
          className={`group relative flex items-center gap-3 rounded-2xl pl-4 pr-5 py-2.5 text-[13px] font-bold border transition-all duration-300 cursor-pointer ${
            activeTab === 'ota'
              ? 'text-white border-white/20 shadow-[0_4px_20px_rgba(36,107,209,0.35)]'
              : 'text-primary-dark border-transparent shadow-sm hover:shadow-[0_4px_16px_rgba(36,107,209,0.15)]'
          }`}
          style={{ background: activeTab === 'ota'
            ? 'linear-gradient(135deg, #1E1E5A 0%, #246BD1 60%, #5A94E3 100%)'
            : 'linear-gradient(135deg, #EDF1F8 0%, #D6E5F8 40%, #DDDAF8 75%, #EDE8F4 100%)'
          }}
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
            activeTab === 'ota' ? 'bg-white/15' : 'bg-white/70 shadow-sm'
          }`}>
            <RefreshCw className={`h-4 w-4 transition-transform duration-300 group-hover:rotate-45 ${
              activeTab === 'ota' ? 'text-white' : 'text-primary'
            }`} />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className={`text-[13px] font-bold ${activeTab === 'ota' ? 'text-white' : 'text-primary-dark'}`}>
              OTA 업데이트
            </span>
            <span className={`text-[10px] mt-0.5 ${activeTab === 'ota' ? 'text-white/50' : 'text-primary-dark/40'}`}>
              펌웨어 원격 업데이트
            </span>
          </div>
          <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-extrabold ml-1 ${
            activeTab === 'ota'
              ? 'bg-white/20 text-white ring-1 ring-white/10'
              : 'bg-white/80 text-primary shadow-sm'
          }`}>
            {otaCount}
          </span>
        </button>
      </div>

      {/* ─── Search & Sort bar ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="기기 ID, 텔레코일존, MAC 주소 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'latest' ? '최신순' : '오래된순'}
        </button>

        {activeTab === 'ota' && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[12px] text-muted-foreground">{otaSelected.size}대 선택</span>
            <button
              disabled={otaSelected.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-primary-dark px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-40 hover:bg-primary-dark/90 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              선택 업데이트
            </button>
            <button className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[12px] font-bold text-white hover:bg-primary/90 transition-colors">
              <Download className="h-3.5 w-3.5" />
              전체 업데이트
            </button>
          </div>
        )}
      </div>

      {/* ─── Table ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Status filter tabs inside table */}
        <div className="flex items-center gap-1 px-5 pt-4 pb-2">
          {(['all', 'normal', 'warning', 'error', 'offline'] as const).map((s) => {
            const labels: Record<string, string> = { all: '전체', normal: '정상', warning: '경고', error: '오류', offline: '오프라인' }
            const dotColors: Record<string, string> = { all: 'bg-primary', normal: 'bg-success', warning: 'bg-warning', error: 'bg-destructive', offline: 'bg-muted-foreground' }
            const borderColors: Record<string, string> = { all: 'border-primary text-primary', normal: 'border-success text-success', warning: 'border-warning text-warning', error: 'border-destructive text-destructive', offline: 'border-muted-foreground text-muted-foreground' }
            const count = statusCounts[s]
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold border transition-all ${
                  isActive
                    ? `${borderColors[s]} bg-white shadow-sm`
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-page'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotColors[s]}`} />
                {labels[s]}
                <span className={`text-[11px] font-bold ${isActive ? 'opacity-70' : 'text-muted-foreground/60'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-page/50 border-b border-border">
                {activeTab === 'ota' && (
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={otaSelected.size === filteredDevices.length && filteredDevices.length > 0}
                      onChange={toggleOtaAll}
                      className="rounded border-border accent-primary"
                    />
                  </th>
                )}
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">기기 ID</th>
                {activeTab !== 'unassigned' && (
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">텔레코일존</th>
                )}
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">전원</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">네트워크</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">온도</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">볼륨</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">펌웨어</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">상태</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">최근 업데이트</th>
                <th className="px-5 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={20} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Radio className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr
                    key={device.id}
                    className="transition-colors hover:bg-main-blue-1/10 cursor-pointer group"
                    onClick={() => setSelectedDevice(device)}
                  >
                    {activeTab === 'ota' && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={otaSelected.has(device.id)}
                          onChange={() => toggleOta(device.id)}
                          className="rounded border-border accent-primary"
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${!device.telecoilZoneId ? 'bg-warning/10' : 'bg-primary/10'}`}>
                          {!device.telecoilZoneId ? <Package className="h-4 w-4 text-warning" /> : <Radio className="h-4 w-4 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-bold text-foreground">{getNickname(device.id)}</p>
                            {nicknames[device.id] && (
                              <span className="rounded bg-page px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{device.id}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">{device.mac}</p>
                        </div>
                      </div>
                    </td>
                    {activeTab !== 'unassigned' && (
                      <td className="px-5 py-3.5">
                        {device.telecoilZoneName ? (
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">{device.telecoilZoneName}</p>
                          </div>
                        ) : (
                          <span className="text-[12px] text-warning font-semibold">미배정</span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-center"><PowerIcon on={device.power} /></td>
                    <td className="px-5 py-3.5 text-center"><NetworkIcon connected={device.networkConnected} /></td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[13px] font-semibold ${device.temperature > 45 ? 'text-destructive' : device.temperature > 40 ? 'text-warning' : 'text-foreground'}`}>
                        {device.temperature > 0 ? `${device.temperature}°C` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[13px] font-semibold ${device.volume > 90 ? 'text-warning' : 'text-foreground'}`}>
                        {device.volume > 0 ? `${device.volume}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[12px] font-mono font-semibold ${device.firmwareVersion === 'v2.5.0' ? 'text-success' : 'text-warning'}`}>
                        {device.firmwareVersion}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={device.status} /></td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] text-muted-foreground">{device.lastUpdated}</span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-page transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-page/30">
          <span className="text-[12px] text-muted-foreground">
            총 <span className="font-bold text-foreground">{filteredDevices.length}</span>개 기기
          </span>
          {activeTab === 'unassigned' && (
            <button className="rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-white hover:bg-primary-dark transition-colors">
              선택 기기 배정
            </button>
          )}
        </div>
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedDevice && (
        <DeviceDetailModal device={selectedDevice} nickname={getNickname(selectedDevice.id)} onClose={() => setSelectedDevice(null)} onSaveNickname={handleSaveNickname} />
      )}
    </div>
  )
}
