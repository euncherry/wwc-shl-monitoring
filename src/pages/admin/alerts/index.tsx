import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  Bell,
  BellOff,
  Thermometer,
  WifiOff,
  Shield,
  Building2,
  Radio,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  XCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  Layers,
  Settings,
  Loader2,
  Info,
} from 'lucide-react'
import { alertsApi } from '@/api/alerts'
import {
  alertKeys,
  useAlerts,
  useUpdateAlertStatus,
  useAlertThresholds,
  useUpdateThresholds,
} from '@/hooks/useAlerts'
import {
  ALERT_TYPE_LABEL,
  type AlertResponseDto,
  type AlertTypeEnum,
  type AlertPriorityEnum,
  type AlertStatusEnum,
} from '@/types/alert'
import { formatDateTime } from '@/lib/format'

/* ══════════════════════════════════════════════════════
   Constants / 매핑
   ══════════════════════════════════════════════════════ */

const LIMIT = 30
type TabKey = 'pending' | 'forwarded' | 'dismissed' | 'all'
type LevelKey = 'critical' | 'warning' | 'info'

const TAB_TO_STATUS: Record<Exclude<TabKey, 'all'>, AlertStatusEnum> = {
  pending: 'PENDING',
  forwarded: 'FORWARDED',
  dismissed: 'DISMISSED',
}

const tabConfig: { key: TabKey; label: string; icon: typeof Bell }[] = [
  { key: 'pending', label: '처리 대기', icon: Clock },
  { key: 'forwarded', label: '사용자에게 전달됨', icon: Send },
  { key: 'dismissed', label: '관리자 종결', icon: XCircle },
  { key: 'all', label: '전체', icon: Layers },
]

const PRIORITY_TO_LEVEL: Record<AlertPriorityEnum, LevelKey> = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
}

const levelConfig: Record<LevelKey, { label: string; dot: string; bg: string; border: string; text: string }> = {
  critical: { label: '긴급', dot: 'bg-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20', text: 'text-destructive' },
  warning: { label: '경고', dot: 'bg-warning', bg: 'bg-warning/5', border: 'border-warning/20', text: 'text-warning' },
  info: { label: '정보', dot: 'bg-primary', bg: 'bg-primary/5', border: 'border-primary/20', text: 'text-primary' },
}

const TYPE_ICON: Record<AlertTypeEnum, typeof Thermometer> = {
  TEMPERATURE_ANOMALY: Thermometer,
  CONNECTION_LOST: WifiOff,
  FIRMWARE_UPDATE_AVAILABLE: Shield,
}

const TYPE_OPTIONS: AlertTypeEnum[] = ['TEMPERATURE_ANOMALY', 'CONNECTION_LOST', 'FIRMWARE_UPDATE_AVAILABLE']

/** 알림 발생 기준 안내 (백엔드 alerts.service 트리거 조건 기준) */
const ALERT_GUIDE: { type: AlertTypeEnum; priority: AlertPriorityEnum; condition: string }[] = [
  { type: 'CONNECTION_LOST', priority: 'CRITICAL', condition: '기기가 설정한 시간(기본 4시간) 이상 서버와 통신되지 않을 때' },
  { type: 'TEMPERATURE_ANOMALY', priority: 'CRITICAL', condition: '기기에서 과열(고온 보호 동작)이 감지될 때' },
  { type: 'FIRMWARE_UPDATE_AVAILABLE', priority: 'INFO', condition: '기기 펌웨어 버전이 최신 등록 버전보다 낮을 때' },
]

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function LevelBadge({ level }: { level: LevelKey }) {
  const c = levelConfig[level]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function StateBadge({ status }: { status: AlertStatusEnum }) {
  const m: Record<AlertStatusEnum, { label: string; cls: string }> = {
    PENDING: { label: '대기', cls: 'bg-warning/10 text-warning border border-warning/20' },
    FORWARDED: { label: '전달됨', cls: 'bg-primary/10 text-primary border border-primary/20' },
    DISMISSED: { label: '종결', cls: 'bg-muted text-muted-foreground border border-border' },
  }
  const s = m[status]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
}

function deviceTitle(a: AlertResponseDto): string {
  if (!a.device) return '미배정'
  return a.device.alias?.trim() ? a.device.alias : a.device.mac_address
}

/* ── 상세 모달 ── */

function AlertDetailModal({
  alert,
  onClose,
  onForward,
  onDismiss,
  pending,
}: {
  alert: AlertResponseDto
  onClose: () => void
  onForward: (id: number) => void
  onDismiss: (id: number) => void
  pending: boolean
}) {
  const level = PRIORITY_TO_LEVEL[alert.priority]
  const c = levelConfig[level]
  const TypeIcon = TYPE_ICON[alert.type]
  const processedAt = alert.forwarded_at ?? alert.dismissed_at

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={`px-6 py-5 border-b ${c.border} ${c.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${c.border} bg-white/80`}>
                <TypeIcon className={`h-5 w-5 ${c.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{ALERT_TYPE_LABEL[alert.type]}</h3>
                  <LevelBadge level={level} />
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">#{alert.id} · {formatDateTime(alert.occurred_at)}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-white/80 hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className={`rounded-xl p-4 border ${c.border} ${c.bg}`}>
            <p className="text-[14px] font-semibold text-foreground leading-relaxed">{alert.message}</p>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5"><Radio className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">기기</span></div>
              <div className="text-right">
                <span className="text-[13px] font-semibold text-foreground">{deviceTitle(alert)}</span>
                {alert.device?.alias?.trim() && <span className="text-[11px] text-muted-foreground font-mono ml-2">{alert.device.mac_address}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">텔레코일존</span></div>
              <span className={`text-[13px] font-semibold ${alert.device?.zone ? 'text-foreground' : 'text-warning'}`}>{alert.device?.zone?.name ?? '미배정'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">발생 시각</span></div>
              <span className="text-[13px] font-semibold text-foreground">{formatDateTime(alert.occurred_at)}</span>
            </div>
            {processedAt && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">처리 시각</span></div>
                <span className="text-[13px] font-semibold text-foreground">{formatDateTime(processedAt)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">현재 상태:</span>
            <StateBadge status={alert.status} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-page/30">
          {alert.status === 'PENDING' ? (
            <>
              <button
                onClick={() => onDismiss(alert.id)}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />무시(종결)
              </button>
              <button
                onClick={() => onForward(alert.id)}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}사용자에게 전달
              </button>
            </>
          ) : (
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">닫기</button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 알림 임계값 설정 모달 (REAL — 온도/미연결 시간) ── */

function ThresholdsModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useAlertThresholds()
  const update = useUpdateThresholds()
  const [conn, setConn] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (data) {
      setConn(String(data.connection_lost_hours))
    }
  }, [data])

  const save = () => {
    setError('')
    const c = Number(conn)
    if (!Number.isInteger(c) || c < 1) { setError('미연결 시간은 1 이상의 정수여야 합니다.'); return }
    update.mutate({ connection_lost_hours: c }, {
      onSuccess: onClose,
      onError: () => setError('임계값 저장에 실패했습니다.'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-page/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Settings className="h-5 w-5 text-primary" /></div>
            <div>
              <h3 className="text-lg font-bold text-foreground">알림 설정</h3>
              <p className="text-[12px] text-muted-foreground">미연결 임계값 (자동 알림 발생 기준)</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-[13px]">불러오는 중…</span></div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-border p-4">
              <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-foreground"><WifiOff className="h-4 w-4 text-primary" />미연결 임계값 (시간)</label>
              <input type="number" min={1} value={conn} disabled={update.isPending}
                onChange={(e) => setConn(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">이 시간 이상 미연결 시 '연결 끊김' 알림이 발생합니다.</p>
            </div>
            {error && <p className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-page/30">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">취소</button>
          <button onClick={save} disabled={isLoading || update.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50">
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}저장
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
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [typeFilter, setTypeFilter] = useState<AlertTypeEnum | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<AlertPriorityEnum | 'all'>('all')
  const [selectedAlert, setSelectedAlert] = useState<AlertResponseDto | null>(null)
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState<'FORWARDED' | 'DISMISSED' | null>(null)
  const [bulkRunning, setBulkRunning] = useState(false)

  const filters = {
    status: activeTab === 'all' ? undefined : TAB_TO_STATUS[activeTab],
    type: typeFilter === 'all' ? undefined : typeFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
  }

  const listQuery = useInfiniteQuery({
    queryKey: alertKeys.infinite(filters),
    queryFn: ({ pageParam }) => alertsApi.list({ ...filters, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.items.length === LIMIT ? pages.length + 1 : undefined),
  })

  const pages = listQuery.data?.pages ?? []
  const items = pages.flatMap((p) => p.items)
  const stats = pages[0]

  // 긴급(처리 대기 중) 카운트 — 통계에 없어 별도 호출(최대 100)
  const criticalQuery = useAlerts({ status: 'PENDING', priority: 'CRITICAL', limit: 100 })
  const criticalCount = criticalQuery.data?.items.length ?? 0

  const update = useUpdateAlertStatus()

  const forward = (id: number) => update.mutate({ id, status: 'FORWARDED' }, { onSuccess: () => setSelectedAlert(null) })
  const dismiss = (id: number) => update.mutate({ id, status: 'DISMISSED' }, { onSuccess: () => setSelectedAlert(null) })

  const bulk = async (status: 'FORWARDED' | 'DISMISSED') => {
    setBulkRunning(true)
    for (const a of items.filter((x) => x.status === 'PENDING')) {
      try { await update.mutateAsync({ id: a.id, status }) } catch { /* skip */ }
    }
    setBulkRunning(false)
  }

  const tabCounts: Record<TabKey, number> = {
    pending: stats?.pending ?? 0,
    forwarded: stats?.forwarded ?? 0,
    dismissed: stats?.dismissed ?? 0,
    all: stats?.total ?? 0,
  }

  const kpiCards = [
    { label: '전체 알림', value: stats?.total ?? 0, icon: Bell, color: 'text-primary', bg: 'bg-primary/8', sub: '누적 알림 수' },
    { label: '처리 대기', value: stats?.pending ?? 0, icon: Clock, color: 'text-warning', bg: 'bg-warning/8', sub: '즉시 확인 필요' },
    { label: '긴급 알림', value: criticalCount, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/8', sub: '처리 대기 중 긴급' },
    { label: '오늘 발생', value: stats?.today ?? 0, icon: Bell, color: 'text-success', bg: 'bg-success/8', sub: '오늘 발생 알림' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between pb-5 pt-5">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">알림센터</h2>
          <p className="text-sm text-muted-foreground mt-2">시스템에서 발생한 알림을 관리하고 처리 내역을 추적합니다.</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-page transition-colors shadow-sm"
        >
          <Settings className="h-4 w-4" />알림 설정
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
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

      {/* Alert list */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="grid grid-cols-4 border-b border-border">
          {tabConfig.map((tab) => {
            const isActive = activeTab === tab.key
            const styles: Record<TabKey, { activeBg: string; activeText: string; countBg: string; iconBg: string; bar: string }> = {
              pending: { activeBg: 'bg-amber-50', activeText: 'text-amber-700', countBg: 'bg-destructive text-white', iconBg: 'bg-amber-100 text-amber-600', bar: 'bg-amber-500' },
              forwarded: { activeBg: 'bg-blue-50', activeText: 'text-blue-700', countBg: 'bg-success text-white', iconBg: 'bg-blue-100 text-blue-600', bar: 'bg-blue-500' },
              dismissed: { activeBg: 'bg-slate-50', activeText: 'text-slate-600', countBg: 'bg-slate-400 text-white', iconBg: 'bg-slate-100 text-slate-500', bar: 'bg-slate-400' },
              all: { activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', countBg: 'bg-primary text-white', iconBg: 'bg-indigo-100 text-indigo-600', bar: 'bg-indigo-500' },
            }
            const s = styles[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setTypeFilter('all'); setPriorityFilter('all') }}
                className={`relative flex items-center justify-center gap-2.5 py-4 text-[13px] font-semibold transition-all border-r last:border-r-0 border-border/50 ${
                  isActive ? `${s.activeBg} ${s.activeText}` : 'text-muted-foreground hover:text-foreground hover:bg-page/40'
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isActive ? s.iconBg : 'bg-page text-muted-foreground'}`}>
                  <tab.icon className="h-3.5 w-3.5" />
                </div>
                {tab.label}
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? s.countBg : 'bg-page text-muted-foreground'}`}>
                  {tabCounts[tab.key]}
                </span>
                {isActive && <span className={`absolute bottom-0 left-0 right-0 h-[2.5px] ${s.bar}`} />}
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border/50 bg-page/30">
          {/* Type filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTypeFilter(!showTypeFilter)}
              className={`flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold transition-colors ${typeFilter !== 'all' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Filter className="h-3.5 w-3.5" />
              {typeFilter === 'all' ? '알림 유형' : ALERT_TYPE_LABEL[typeFilter]}
              {showTypeFilter ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showTypeFilter && (
              <div className="absolute top-full left-0 mt-1 z-20 rounded-xl border border-border bg-white shadow-lg p-1.5 min-w-[180px]">
                <button
                  onClick={() => { setTypeFilter('all'); setShowTypeFilter(false) }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${typeFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                >전체 유형</button>
                {TYPE_OPTIONS.map((t) => {
                  const Icon = TYPE_ICON[t]
                  return (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t); setShowTypeFilter(false) }}
                      className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors flex items-center gap-2 ${typeFilter === t ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />{ALERT_TYPE_LABEL[t]}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Priority filter cycle */}
          <button
            onClick={() => {
              const order: (AlertPriorityEnum | 'all')[] = ['all', 'CRITICAL', 'WARNING', 'INFO']
              const idx = order.indexOf(priorityFilter)
              setPriorityFilter(order[(idx + 1) % order.length])
            }}
            className={`flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold transition-colors ${priorityFilter !== 'all' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {priorityFilter === 'all' ? '우선순위' : levelConfig[PRIORITY_TO_LEVEL[priorityFilter]].label}
            <ChevronDown className="h-3 w-3" />
          </button>

          <span className="ml-auto text-[12px] text-muted-foreground">최신순</span>
        </div>

        {/* 알림 발생 기준 안내 (접이식) */}
        <div className="border-b border-border/50 bg-page/20">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="flex w-full items-center gap-2 px-5 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="h-3.5 w-3.5 text-primary" />
            알림은 이런 경우 발생해요
            {showGuide ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
          </button>
          {showGuide && (
            <div className="space-y-2 px-5 pb-4 pt-1">
              {ALERT_GUIDE.map(({ type, priority, condition }) => {
                const Icon = TYPE_ICON[type]
                const lv = levelConfig[PRIORITY_TO_LEVEL[priority]]
                return (
                  <div key={type} className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 ${lv.border} ${lv.bg}`}>
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${lv.text}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-foreground">{ALERT_TYPE_LABEL[type]}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${lv.border} ${lv.text}`}>{lv.label}</span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{condition}</p>
                    </div>
                  </div>
                )
              })}
              <p className="px-1 pt-1 text-[11px] text-muted-foreground">※ '연결 끊김'의 미연결 기준 시간은 우측 상단 <span className="font-semibold text-foreground">'알림 설정'</span>에서 변경할 수 있습니다.</p>
            </div>
          )}
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
              {listQuery.isLoading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm">알림을 불러오는 중...</p></div></td></tr>
              ) : listQuery.isError ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center"><div className="flex flex-col items-center gap-2"><AlertTriangle className="h-8 w-8 text-destructive/60" /><p className="text-sm text-muted-foreground">알림을 불러오지 못했습니다.</p><button onClick={() => listQuery.refetch()} className="rounded-lg bg-page px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-border/50">다시 시도</button></div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center"><div className="flex flex-col items-center gap-2"><BellOff className="h-8 w-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">해당 조건의 알림이 없습니다.</p></div></td></tr>
              ) : (
                items.map((alert) => {
                  const level = PRIORITY_TO_LEVEL[alert.priority]
                  const c = levelConfig[level]
                  const TypeIcon = TYPE_ICON[alert.type]
                  return (
                    <tr key={alert.id} className="transition-colors hover:bg-main-blue-1/10 cursor-pointer" onClick={() => setSelectedAlert(alert)}>
                      <td className="px-5 py-3.5"><span className="text-[12px] text-muted-foreground font-mono">{formatDateTime(alert.occurred_at)}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${c.border} ${c.bg}`}><TypeIcon className={`h-3.5 w-3.5 ${c.text}`} /></div>
                          <span className="text-[12px] font-semibold text-foreground">{ALERT_TYPE_LABEL[alert.type]}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center"><LevelBadge level={level} /></td>
                      <td className="px-5 py-3.5"><p className="text-[12px] text-foreground max-w-[280px] truncate">{alert.message}</p></td>
                      <td className="px-5 py-3.5">
                        <p className="text-[12px] font-semibold text-foreground">{alert.device?.zone?.name ?? '미배정'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{deviceTitle(alert)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center"><StateBadge status={alert.status} /></td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {alert.status === 'PENDING' ? (
                            <>
                              <button onClick={() => forward(alert.id)} disabled={update.isPending || bulkRunning} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"><Send className="h-3 w-3" />전달</button>
                              <button onClick={() => dismiss(alert.id)} disabled={update.isPending || bulkRunning} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50"><XCircle className="h-3 w-3" />무시</button>
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

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-page/30">
          <span className="text-[12px] text-muted-foreground">표시 <span className="font-bold text-foreground">{items.length}</span>개{listQuery.hasNextPage && ' (더 있음)'}</span>
          <div className="flex items-center gap-2">
            {activeTab === 'pending' && items.some((a) => a.status === 'PENDING') && (
              <>
                <button onClick={() => setBulkConfirm('DISMISSED')} disabled={bulkRunning} className="rounded-xl px-3.5 py-2 text-[12px] font-semibold text-muted-foreground hover:bg-page transition-colors disabled:opacity-50">표시분 종결</button>
                <button onClick={() => setBulkConfirm('FORWARDED')} disabled={bulkRunning} className="flex items-center gap-1.5 rounded-xl bg-primary-dark px-3.5 py-2 text-[12px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50">{bulkRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}표시분 전달</button>
              </>
            )}
            {listQuery.hasNextPage && (
              <button onClick={() => listQuery.fetchNextPage()} disabled={listQuery.isFetchingNextPage} className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                {listQuery.isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}더보기
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onForward={forward}
          onDismiss={dismiss}
          pending={update.isPending}
        />
      )}

      {showSettings && <ThresholdsModal onClose={() => setShowSettings(false)} />}

      {/* 표시분 일괄 전달/종결 확인 모달 */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { if (!bulkRunning) setBulkConfirm(null) }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bulkConfirm === 'FORWARDED' ? 'bg-primary/10' : 'bg-muted'}`}>
                  {bulkConfirm === 'FORWARDED' ? <Send className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{bulkConfirm === 'FORWARDED' ? '표시분 일괄 전달' : '표시분 일괄 종결'}</h3>
                  <p className="text-[12px] text-muted-foreground">현재 표시된 처리 대기 알림을 한 번에 처리합니다.</p>
                </div>
              </div>
              <p className="text-[13px] text-foreground">
                처리 대기 <span className="font-bold">{items.filter((a) => a.status === 'PENDING').length}건</span>을 모두{' '}
                {bulkConfirm === 'FORWARDED' ? '사용자에게 전달' : '종결'}하시겠습니까?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-page/30">
              <button onClick={() => setBulkConfirm(null)} disabled={bulkRunning} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors disabled:opacity-50">취소</button>
              <button
                onClick={async () => { const s = bulkConfirm; await bulk(s); setBulkConfirm(null) }}
                disabled={bulkRunning}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-colors disabled:opacity-50 ${bulkConfirm === 'FORWARDED' ? 'bg-primary-dark hover:bg-primary-dark/90' : 'bg-destructive hover:bg-destructive/90'}`}
              >
                {bulkRunning && <Loader2 className="h-4 w-4 animate-spin" />}{bulkConfirm === 'FORWARDED' ? '전달' : '종결'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
