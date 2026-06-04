import { useState, useMemo } from 'react'
import {
  Search,
  Bell,
  BellOff,
  Thermometer,
  Power,
  Volume2,
  WifiOff,
  Shield,
  Building2,
  Radio,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  Send,
  XCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Layers,
  Timer,
  Filter,
  SlidersHorizontal,
} from 'lucide-react'
import { systemAlerts as initialAlerts } from '@/data/alerts'
import type { SystemAlert, AlertLevel, AlertType, AlertState } from '@/types/device'

/* ══════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════ */

type TabKey = 'pending' | 'forwarded' | 'dismissed' | 'all'

const tabConfig: { key: TabKey; label: string; icon: typeof Bell }[] = [
  { key: 'pending', label: '처리 대기', icon: Clock },
  { key: 'forwarded', label: '사용자에게 전달됨', icon: Send },
  { key: 'dismissed', label: '관리자 종결', icon: XCircle },
  { key: 'all', label: '전체', icon: Layers },
]

const levelConfig: Record<AlertLevel, { label: string; dot: string; bg: string; border: string; text: string; icon: typeof AlertTriangle }> = {
  critical: { label: '긴급', dot: 'bg-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20', text: 'text-destructive', icon: AlertTriangle },
  warning: { label: '경고', dot: 'bg-warning', bg: 'bg-warning/5', border: 'border-warning/20', text: 'text-warning', icon: AlertTriangle },
  info: { label: '정보', dot: 'bg-primary', bg: 'bg-primary/5', border: 'border-primary/20', text: 'text-primary', icon: Bell },
}

const typeIcons: Record<AlertType, typeof Thermometer> = {
  '온도 이상': Thermometer,
  '전원 차단': Power,
  '볼륨 이상': Volume2,
  '연결 끊김': WifiOff,
  '펌웨어 업데이트 필요': Shield,
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function LevelBadge({ level }: { level: AlertLevel }) {
  const c = levelConfig[level]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function StateBadge({ state }: { state: AlertState }) {
  const m: Record<AlertState, { label: string; cls: string }> = {
    pending: { label: '대기', cls: 'bg-warning/10 text-warning border border-warning/20' },
    forwarded: { label: '전달됨', cls: 'bg-primary/10 text-primary border border-primary/20' },
    dismissed: { label: '종결', cls: 'bg-muted text-muted-foreground border border-border' },
  }
  const s = m[state]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

/* ══════════════════════════════════════════════════════
   Alert Detail Modal
   ══════════════════════════════════════════════════════ */

function AlertDetailModal({
  alert,
  onClose,
  onForward,
  onDismiss,
}: {
  alert: SystemAlert
  onClose: () => void
  onForward: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const c = levelConfig[alert.level]
  const TypeIcon = typeIcons[alert.type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with level color accent */}
        <div className={`px-6 py-5 border-b ${c.border} ${c.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${c.border} bg-white/80`}>
                <TypeIcon className={`h-5 w-5 ${c.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{alert.type}</h3>
                  <LevelBadge level={alert.level} />
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">{alert.id} · {alert.createdAt}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-white/80 hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Message */}
          <div className={`rounded-xl p-4 border ${c.border} ${c.bg}`}>
            <p className="text-[14px] font-semibold text-foreground leading-relaxed">{alert.message}</p>
          </div>

          {/* Device & Zone info */}
          <div className="rounded-xl border border-border divide-y divide-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] text-muted-foreground">기기</span>
              </div>
              <div className="text-right">
                <span className="text-[13px] font-semibold text-foreground">{alert.deviceId}</span>
                <span className="text-[11px] text-muted-foreground font-mono ml-2">{alert.deviceMac}</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] text-muted-foreground">텔레코일존</span>
              </div>
              <span className={`text-[13px] font-semibold ${alert.telecoilZoneName ? 'text-foreground' : 'text-warning'}`}>
                {alert.telecoilZoneName ?? '미배정'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] text-muted-foreground">발생 시각</span>
              </div>
              <span className="text-[13px] font-semibold text-foreground">{alert.createdAt}</span>
            </div>
            {alert.processedAt && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">처리 시각</span>
                </div>
                <span className="text-[13px] font-semibold text-foreground">{alert.processedAt}</span>
              </div>
            )}
          </div>

          {/* Current state */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">현재 상태:</span>
            <StateBadge state={alert.state} />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-page/30">
          {alert.state === 'pending' && (
            <>
              <button
                onClick={() => { onDismiss(alert.id); onClose() }}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors"
              >
                <XCircle className="h-4 w-4" />
                무시(종결)
              </button>
              <button
                onClick={() => { onForward(alert.id); onClose() }}
                className="flex items-center gap-1.5 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors"
              >
                <Send className="h-4 w-4" />
                사용자에게 전달
              </button>
            </>
          )}
          {alert.state !== 'pending' && (
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Alert Rules Settings Modal
   ══════════════════════════════════════════════════════ */

function AlertSettingsModal({ onClose }: { onClose: () => void }) {
  const [tempThreshold, setTempThreshold] = useState(45)
  const [volumeThreshold, setVolumeThreshold] = useState(90)
  const [disconnectHours] = useState(2)
  const [escalationHours, setEscalationHours] = useState(24)
  const [groupBy, setGroupBy] = useState<'type' | 'institution' | 'none'>('none')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-border overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-page/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">알림 설정</h3>
              <p className="text-[12px] text-muted-foreground">알림 규칙, 그룹화, 에스컬레이션 설정</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 알림 규칙 설정 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h4 className="text-[14px] font-bold text-foreground">임계값 설정</h4>
            </div>
            <div className="space-y-4">
              {/* 온도 임계값 */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-destructive" />
                    <span className="text-[13px] font-semibold text-foreground">온도 임계값</span>
                  </div>
                  <span className="text-[14px] font-bold text-destructive">{tempThreshold}°C</span>
                </div>
                <input
                  type="range" min={30} max={60} value={tempThreshold}
                  onChange={(e) => setTempThreshold(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-border/50 accent-destructive cursor-pointer"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">30°C</span>
                  <span className="text-[10px] text-muted-foreground">60°C</span>
                </div>
              </div>

              {/* 볼륨 임계값 */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-warning" />
                    <span className="text-[13px] font-semibold text-foreground">볼륨 임계값</span>
                  </div>
                  <span className="text-[14px] font-bold text-warning">{volumeThreshold}%</span>
                </div>
                <input
                  type="range" min={50} max={100} value={volumeThreshold}
                  onChange={(e) => setVolumeThreshold(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-border/50 accent-warning cursor-pointer"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">50%</span>
                  <span className="text-[10px] text-muted-foreground">100%</span>
                </div>
              </div>

              {/* 연결 끊김 시간 */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <WifiOff className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-semibold text-foreground">연결 끊김 알림 기준</span>
                  </div>
                  <span className="text-[14px] font-bold text-primary">{disconnectHours}시간</span>
                </div>
                <p className="text-[11px] text-muted-foreground">네트워크 미연결 지속 시 알림 발생</p>
              </div>
            </div>
          </div>

          {/* 그룹화 설정 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-primary" />
              <h4 className="text-[14px] font-bold text-foreground">알림 그룹화</h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'none' as const, label: '그룹 없음', desc: '개별 표시' },
                { key: 'type' as const, label: '유형별', desc: '동일 유형 묶기' },
                { key: 'institution' as const, label: '텔레코일존별', desc: '같은 텔레코일존 묶기' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setGroupBy(opt.key)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    groupBy === opt.key
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-page'
                  }`}
                >
                  <p className={`text-[12px] font-bold ${groupBy === opt.key ? 'text-primary' : 'text-foreground'}`}>{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 에스컬레이션 설정 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Timer className="h-4 w-4 text-primary" />
              <h4 className="text-[14px] font-bold text-foreground">에스컬레이션</h4>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-foreground">미처리 자동 상위 보고</span>
                <span className="text-[14px] font-bold text-primary">{escalationHours}시간</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                처리 대기 알림이 설정 시간 내 처리되지 않을 시 자동으로 상위 관리자에게 보고됩니다.
              </p>
              <input
                type="range" min={1} max={72} value={escalationHours}
                onChange={(e) => setEscalationHours(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-border/50 accent-primary cursor-pointer"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">1시간</span>
                <span className="text-[10px] text-muted-foreground">72시간</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-page/30 shrink-0">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
            취소
          </button>
          <button className="rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors">
            설정 저장
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<SystemAlert[]>(initialAlerts)
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<AlertLevel | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => ({
    pending: alerts.filter((a) => a.state === 'pending').length,
    forwarded: alerts.filter((a) => a.state === 'forwarded').length,
    dismissed: alerts.filter((a) => a.state === 'dismissed').length,
    all: alerts.length,
  }), [alerts])

  /* ── Tab-based list ── */
  const tabBaseList = useMemo(() => {
    if (activeTab === 'all') return [...alerts]
    return alerts.filter((a) => a.state === activeTab)
  }, [alerts, activeTab])

  /* ── Filtered list ── */
  const filteredAlerts = useMemo(() => {
    let list = [...tabBaseList]

    if (levelFilter !== 'all') list = list.filter((a) => a.level === levelFilter)
    if (typeFilter !== 'all') list = list.filter((a) => a.type === typeFilter)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.deviceId.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          a.telecoilZoneName?.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q),
      )
    }

    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime()
      const db = new Date(b.createdAt).getTime()
      return sortOrder === 'latest' ? db - da : da - db
    })

    return list
  }, [tabBaseList, levelFilter, typeFilter, search, sortOrder])

  /* ── Actions ── */
  const handleForward = (id: string) => {
    setAlerts((prev) => prev.map((a) =>
      a.id === id ? { ...a, state: 'forwarded' as const, processedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), processedBy: '관리자' } : a
    ))
  }

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.map((a) =>
      a.id === id ? { ...a, state: 'dismissed' as const, processedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), processedBy: '관리자' } : a
    ))
  }

  /* ── KPI summary ── */
  const kpi = useMemo(() => ({
    total: alerts.length,
    pending: alerts.filter((a) => a.state === 'pending').length,
    critical: alerts.filter((a) => a.state === 'pending' && a.level === 'critical').length,
    todayCount: alerts.filter((a) => a.createdAt.startsWith('2025-01-20')).length,
  }), [alerts])

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <div className="flex items-center justify-between pb-5 pt-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">알림센터</h2>
          <p className="text-sm text-muted-foreground mt-2">시스템에서 발생한 알림을 관리하고 처리 내역을 추적합니다.</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-page transition-colors shadow-sm"
        >
          <Settings className="h-4 w-4" />
          알림 설정
        </button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '전체 알림', value: kpi.total, icon: Bell, color: 'text-primary', bg: 'bg-primary/8', sub: '누적 알림 수' },
          { label: '처리 대기', value: kpi.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/8', sub: '즉시 확인 필요' },
          { label: '긴급 알림', value: kpi.critical, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/8', sub: '처리 대기 중 긴급' },
          { label: '오늘 발생', value: kpi.todayCount, icon: Bell, color: 'text-success', bg: 'bg-success/8', sub: '2025-01-20 기준' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">{card.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── Alert list table ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Tab header inside table — 4등분 */}
        <div className="grid grid-cols-4 border-b border-border">
          {tabConfig.map((tab) => {
            const isActive = activeTab === tab.key
            const styles: Record<TabKey, { activeBg: string; activeText: string; countBg: string; iconBg: string }> = {
              pending: { activeBg: 'bg-amber-50', activeText: 'text-amber-700', countBg: 'bg-destructive text-white', iconBg: 'bg-amber-100 text-amber-600' },
              forwarded: { activeBg: 'bg-blue-50', activeText: 'text-blue-700', countBg: 'bg-success text-white', iconBg: 'bg-blue-100 text-blue-600' },
              dismissed: { activeBg: 'bg-slate-50', activeText: 'text-slate-600', countBg: 'bg-slate-400 text-white', iconBg: 'bg-slate-100 text-slate-500' },
              all: { activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', countBg: 'bg-primary text-white', iconBg: 'bg-indigo-100 text-indigo-600' },
            }
            const s = styles[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setLevelFilter('all'); setTypeFilter('all'); setSearch('') }}
                className={`relative flex items-center justify-center gap-2.5 py-4 text-[13px] font-semibold transition-all border-r last:border-r-0 border-border/50 ${
                  isActive
                    ? `${s.activeBg} ${s.activeText}`
                    : 'text-muted-foreground hover:text-foreground hover:bg-page/40'
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isActive ? s.iconBg : 'bg-page text-muted-foreground'}`}>
                  <tab.icon className="h-3.5 w-3.5" />
                </div>
                {tab.label}
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  isActive ? s.countBg : 'bg-page text-muted-foreground'
                }`}>
                  {tabCounts[tab.key]}
                </span>
                {isActive && (
                  <span className={`absolute bottom-0 left-0 right-0 h-[2.5px] ${
                    tab.key === 'pending' ? 'bg-amber-500' :
                    tab.key === 'forwarded' ? 'bg-blue-500' :
                    tab.key === 'dismissed' ? 'bg-slate-400' :
                    'bg-indigo-500'
                  }`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Filters row — inside card */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border/50 bg-page/30">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="알림 메시지, 텔레코일존, 디바이스 ID로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Type filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTypeFilter(!showTypeFilter)}
              className={`flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold transition-colors ${
                typeFilter !== 'all' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {typeFilter === 'all' ? '알림 유형' : typeFilter}
              {showTypeFilter ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showTypeFilter && (
              <div className="absolute top-full left-0 mt-1 z-20 rounded-xl border border-border bg-white shadow-lg p-1.5 min-w-[180px]">
                <button
                  onClick={() => { setTypeFilter('all'); setShowTypeFilter(false) }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${typeFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                >
                  전체 유형
                </button>
                {(['온도 이상', '전원 차단', '볼륨 이상', '연결 끊김', '펌웨어 업데이트 필요'] as AlertType[]).map((t) => {
                  const Icon = typeIcons[t]
                  return (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t); setShowTypeFilter(false) }}
                      className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors flex items-center gap-2 ${typeFilter === t ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {t}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Level filter dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                const levels: (AlertLevel | 'all')[] = ['all', 'critical', 'warning', 'info']
                const idx = levels.indexOf(levelFilter)
                setLevelFilter(levels[(idx + 1) % levels.length])
              }}
              className={`flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold transition-colors ${
                levelFilter !== 'all' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {levelFilter === 'all' ? '우선순위' : levelConfig[levelFilter].label}
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === 'latest' ? '최신순' : '오래된순'}
          </button>

          {/* Filter apply button */}
          <button className="flex items-center gap-1.5 rounded-lg bg-primary-dark px-3.5 py-2 text-[12px] font-bold text-white hover:bg-primary-dark/90 transition-colors">
            <Search className="h-3.5 w-3.5" />
            필터 적용
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-page/50 border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-primary-dark/70">발생 시간</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-primary-dark/70">유형</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-primary-dark/70">우선순위</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-primary-dark/70">알림 메시지</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-primary-dark/70">텔레코일존/디바이스</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-primary-dark/70">상태</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-primary-dark/70">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <BellOff className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">해당 조건의 알림이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const c = levelConfig[alert.level]
                  const TypeIcon = typeIcons[alert.type]
                  return (
                    <tr key={alert.id} className="transition-colors hover:bg-main-blue-1/10 cursor-pointer" onClick={() => setSelectedAlert(alert)}>
                      {/* 발생 시간 */}
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-muted-foreground font-mono">{alert.createdAt}</span>
                      </td>
                      {/* 유형 */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${c.border} ${c.bg}`}>
                            <TypeIcon className={`h-3.5 w-3.5 ${c.text}`} />
                          </div>
                          <span className="text-[12px] font-semibold text-foreground">{alert.type}</span>
                        </div>
                      </td>
                      {/* 우선순위 */}
                      <td className="px-5 py-3.5 text-center">
                        <LevelBadge level={alert.level} />
                      </td>
                      {/* 알림 메시지 */}
                      <td className="px-5 py-3.5">
                        <p className="text-[12px] text-foreground max-w-[280px] truncate">{alert.message}</p>
                        {alert.telecoilZoneName && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{alert.telecoilZoneName}</p>
                        )}
                      </td>
                      {/* 텔레코일존/디바이스 */}
                      <td className="px-5 py-3.5">
                        <p className="text-[12px] font-semibold text-foreground">{alert.telecoilZoneName ?? '미배정'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{alert.deviceId}</p>
                      </td>
                      {/* 상태 */}
                      <td className="px-5 py-3.5 text-center">
                        <StateBadge state={alert.state} />
                      </td>
                      {/* 작업 */}
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {alert.state === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleForward(alert.id)}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-white bg-primary hover:bg-primary-dark transition-colors"
                              >
                                <Send className="h-3 w-3" />
                                전달
                              </button>
                              <button
                                onClick={() => handleDismiss(alert.id)}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                              >
                                <XCircle className="h-3 w-3" />
                                무시
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-page/30">
          <span className="text-[12px] text-muted-foreground">
            총 <span className="font-bold text-foreground">{filteredAlerts.length}</span>개 알림
          </span>
          {activeTab === 'pending' && filteredAlerts.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => filteredAlerts.forEach((a) => handleDismiss(a.id))}
                className="rounded-xl px-3.5 py-2 text-[12px] font-semibold text-muted-foreground hover:bg-page transition-colors"
              >
                전체 종결
              </button>
              <button
                onClick={() => filteredAlerts.forEach((a) => handleForward(a.id))}
                className="rounded-xl bg-primary-dark px-3.5 py-2 text-[12px] font-bold text-white hover:bg-primary-dark/90 transition-colors"
              >
                전체 전달
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onForward={handleForward}
          onDismiss={handleDismiss}
        />
      )}

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <AlertSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
