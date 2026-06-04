import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Search,
  ScrollText,
  RefreshCw,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
  User,
  Shield,
  Radio,
  Pencil,
  PlusCircle,
  Send,
  XCircle,
  Terminal,
  ArrowDown,
} from 'lucide-react'
import { activityLogs, rawLogs as initialRawLogs, generateNewLogs } from '@/data/activityLogs'
import type { ActionType, TargetType, SeverityLevel, RawLog, RawLogLevel } from '@/types/device'

/* ══════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════ */

const actionConfig: Record<ActionType, { color: string; bg: string; border: string; icon: typeof Pencil }> = {
  '제어': { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: Radio },
  '수정': { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: Pencil },
  '삭제': { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: Trash2 },
  '생성': { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: PlusCircle },
  '전달': { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: Send },
  '종결': { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', icon: XCircle },
}

const severityConfig: Record<SeverityLevel, { dot: string; text: string }> = {
  '높음': { dot: 'bg-destructive', text: 'text-destructive' },
  '보통': { dot: 'bg-warning', text: 'text-warning' },
  '낮음': { dot: 'bg-success', text: 'text-success' },
}

const logLevelColors: Record<RawLogLevel, string> = {
  INFO: 'text-[#4ADE80]',
  WARN: 'text-[#FBBF24]',
  ERROR: 'text-[#F87171]',
  DEBUG: 'text-[#94A3B8]',
}

const logLevelBg: Record<RawLogLevel, string> = {
  INFO: 'bg-[#4ADE80]/10',
  WARN: 'bg-[#FBBF24]/10',
  ERROR: 'bg-[#F87171]/10',
  DEBUG: 'bg-[#94A3B8]/10',
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function ActionBadge({ action }: { action: ActionType }) {
  const c = actionConfig[action]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${c.bg} ${c.color} ${c.border}`}>
      {action}
    </span>
  )
}

function SeverityDot({ severity }: { severity: SeverityLevel }) {
  const c = severityConfig[severity]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      <span className={`text-[11px] font-semibold ${c.text}`}>{severity}</span>
    </span>
  )
}

/* ══════════════════════════════════════════════════════
   Raw Log Stream Component
   ══════════════════════════════════════════════════════ */

function LogStream() {
  const [logs, setLogs] = useState<RawLog[]>(initialRawLogs)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleRefresh = useCallback(() => {
    const newLogs = generateNewLogs(5)
    setLogs((prev) => [...prev, ...newLogs])
  }, [])

  const handleClear = () => setLogs([])

  const handleScrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      setAutoScroll(true)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-[#1a1a2e] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#16162a]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-3 w-3 items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-white/30" />
          </div>
          <Terminal className="h-4 w-4 text-white/60" />
          <span className="text-[13px] font-bold text-white/90">로그 스트림</span>
          <span className="text-[11px] text-white/30 font-mono">{logs.length} 줄</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#4ADE80] bg-[#4ADE80]/10 hover:bg-[#4ADE80]/20 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            새로고침
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            지우기
          </button>
          <button
            onClick={handleScrollToBottom}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            <ArrowDown className="h-3 w-3" />
            맨 아래로
          </button>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={scrollRef}
        className="h-[320px] overflow-y-auto p-4 font-mono text-[12px] leading-relaxed scrollbar-thin"
        onScroll={() => {
          if (!scrollRef.current) return
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
          setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
        }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-white/20 text-[13px]">로그가 없습니다.</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`flex gap-3 py-0.5 hover:bg-white/[0.03] rounded px-1 -mx-1 ${logLevelBg[log.level]} bg-opacity-0 hover:bg-opacity-100 transition-colors`}>
              <span className="text-white/25 shrink-0 select-none">[{log.timestamp}]</span>
              <span className={`font-bold shrink-0 w-[52px] text-right ${logLevelColors[log.level]}`}>[{log.level}]</span>
              <span className="text-white/70">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function ActivityLogPage() {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [actionFilter, setActionFilter] = useState<ActionType | 'all'>('all')
  const [targetFilter, setTargetFilter] = useState<TargetType | 'all'>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [showActionDrop, setShowActionDrop] = useState(false)
  const [showTargetDrop, setShowTargetDrop] = useState(false)
  const [showUserDrop, setShowUserDrop] = useState(false)

  /* ── KPI ── */
  const kpi = useMemo(() => {
    const today = activityLogs.filter((l) => l.timestamp.startsWith('07-28'))
    return {
      today: today.length,
      thisWeek: activityLogs.length,
      thisMonth: activityLogs.length,
      total: activityLogs.length,
    }
  }, [])

  /* ── Unique users ── */
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>()
    activityLogs.forEach((l) => set.add(l.userName))
    return Array.from(set)
  }, [])

  /* ── Filtered list ── */
  const filteredLogs = useMemo(() => {
    let list = [...activityLogs]

    if (actionFilter !== 'all') list = list.filter((l) => l.action === actionFilter)
    if (targetFilter !== 'all') list = list.filter((l) => l.target === targetFilter)
    if (userFilter !== 'all') list = list.filter((l) => l.userName === userFilter)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q) ||
          l.action.includes(q) ||
          l.target.includes(q),
      )
    }

    list.sort((a, b) => {
      return sortOrder === 'latest'
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp)
    })

    return list
  }, [actionFilter, targetFilter, userFilter, search, sortOrder])

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const handler = () => { setShowActionDrop(false); setShowTargetDrop(false); setShowUserDrop(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <div className="pb-5 pt-5">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">활동 로그</h2>
        <p className="text-sm text-muted-foreground mt-2">시스템 전체 활동을 기록하고 추적합니다.</p>
      </div>

      {/* ─── KPI Cards + Actions ─── */}
      <div className="flex items-start gap-4">
        <div className="flex-1 grid grid-cols-4 gap-4">
        {[
          { label: '오늘 활동', value: kpi.today, color: 'text-primary', bg: 'bg-primary/8' },
          { label: '이번 주', value: kpi.thisWeek, color: 'text-success', bg: 'bg-success/8' },
          { label: '이번 달', value: kpi.thisMonth, color: 'text-warning', bg: 'bg-warning/8' },
          { label: '전체 기록', value: kpi.total, color: 'text-primary-dark', bg: 'bg-primary-dark/8' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-white p-5 shadow-sm text-center">
            <p className={`text-3xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
        </div>
        <div className="flex flex-col gap-2 shrink-0 mt-1">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-primary hover:bg-primary/5 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            로그 내보내기
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* ─── Activity Table Section ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <h3 className="text-[14px] font-bold text-foreground">활동 기록 조회</h3>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border/50 bg-page/30">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="사용자명, 액션, 디바이스 ID 등으로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* User filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowUserDrop(!showUserDrop); setShowActionDrop(false); setShowTargetDrop(false) }}
              className={`flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold transition-colors ${
                userFilter !== 'all' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              {userFilter === 'all' ? '전체 사용자' : userFilter}
              {showUserDrop ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showUserDrop && (
              <div className="absolute top-full left-0 mt-1 z-20 rounded-xl border border-border bg-white shadow-lg p-1.5 min-w-[160px]">
                <button
                  onClick={() => { setUserFilter('all'); setShowUserDrop(false) }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${userFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                >
                  전체 사용자
                </button>
                {uniqueUsers.map((u) => (
                  <button
                    key={u}
                    onClick={() => { setUserFilter(u); setShowUserDrop(false) }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${userFilter === u ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowActionDrop(!showActionDrop); setShowUserDrop(false); setShowTargetDrop(false) }}
              className={`flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold transition-colors ${
                actionFilter !== 'all' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {actionFilter === 'all' ? '액션 유형' : actionFilter}
              {showActionDrop ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showActionDrop && (
              <div className="absolute top-full left-0 mt-1 z-20 rounded-xl border border-border bg-white shadow-lg p-1.5 min-w-[140px]">
                <button
                  onClick={() => { setActionFilter('all'); setShowActionDrop(false) }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${actionFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                >
                  전체
                </button>
                {(['제어', '수정', '삭제', '생성', '전달', '종결'] as ActionType[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => { setActionFilter(a); setShowActionDrop(false) }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${actionFilter === a ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowTargetDrop(!showTargetDrop); setShowUserDrop(false); setShowActionDrop(false) }}
              className={`flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold transition-colors ${
                targetFilter !== 'all' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {targetFilter === 'all' ? '대상' : targetFilter}
              {showTargetDrop ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showTargetDrop && (
              <div className="absolute top-full left-0 mt-1 z-20 rounded-xl border border-border bg-white shadow-lg p-1.5 min-w-[140px]">
                <button
                  onClick={() => { setTargetFilter('all'); setShowTargetDrop(false) }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${targetFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                >
                  전체
                </button>
                {(['디바이스', '히어링루프', '텔레코일존', '알림', '사용자'] as TargetType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTargetFilter(t); setShowTargetDrop(false) }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${targetFilter === t ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-page'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === 'latest' ? '최신순' : '오래된순'}
          </button>

          {/* Search button */}
          <button className="flex items-center gap-1.5 rounded-lg bg-primary-dark px-3.5 py-2 text-[12px] font-bold text-white hover:bg-primary-dark/90 transition-colors">
            <Search className="h-3.5 w-3.5" />
            검색
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-page/50 border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">시간</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">사용자</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">액션</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">대상</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">설명</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">심각도</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">IP 주소</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const ac = actionConfig[log.action]
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-main-blue-1/10">
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-muted-foreground font-mono">{log.timestamp}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center ${log.userRole === 'admin' ? 'bg-primary/10' : 'bg-page'}`}>
                            {log.userRole === 'admin' ? (
                              <Shield className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-[12px] font-bold text-foreground">{log.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{log.userRole === 'admin' ? '관리자' : '사용자'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-md ${ac.bg}`}>
                            <ac.icon className={`h-3 w-3 ${ac.color}`} />
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-foreground">{log.target}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{log.targetId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[12px] text-foreground max-w-[300px] truncate">{log.description}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <SeverityDot severity={log.severity} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] text-muted-foreground font-mono">{log.ipAddress}</span>
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
            총 <span className="font-bold text-foreground">{filteredLogs.length}</span>개 기록
          </span>
        </div>
      </div>

      {/* ─── Raw Log Stream ─── */}
      <LogStream />
    </div>
  )
}
