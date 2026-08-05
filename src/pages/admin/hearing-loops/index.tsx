import { createElement, useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Wifi,
  Thermometer,
  Shield,
  MapPin,
  ChevronRight,
  Package,
  X,
  Radio,
  Activity,
  Hash,
  Bell,
  Trash2,
  ArrowUpDown,
  Pencil,
  CheckCircle2,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  Building2,
  Target,
  Star,
  Check,
  Cpu,
  ChevronDown,
  RefreshCw,
  ChevronLeft,
  Download,
  List,
  Map as MapIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HearingLoop, DeviceStatusLogDto, DeviceLogDto, DeviceLogLevel, DeviceErrorLog } from '@/types/device'
import { WifiSignalIcon, WIFI_SIGNAL_LABEL } from '@/components/WifiSignalIcon'
import { connectionMeta } from '@/lib/connectionStatus'
import { formatDateTime, formatDateTimeSec } from '@/lib/format'
import {
  deviceKeys,
  useDevices,
  useUpdateAlias,
  useUpdateDevice,
  useDeleteDevice,
  useCreateDevicesBulk,
  useAssignZone,
  useDeviceStatusLogs,
  useDeviceErrors,
  useDeviceLogs,
} from '@/hooks/useDevices'
import { devicesApi } from '@/api/devices'
import { toHearingLoop } from '@/lib/deviceMapper'
import { useDeviceUpdateSessions, useUpdateSessionDetail, useFirmwares, firmwareKeys } from '@/hooks/useFirmware'
import { useAlerts, alertKeys } from '@/hooks/useAlerts'
import { ALERT_TYPE_LABEL, type AlertResponseDto, type AlertPriorityEnum } from '@/types/alert'
import { useZones } from '@/hooks/useZones'
import { OtaUpdateModal } from './OtaUpdateModal'
import { DeviceMap } from '@/components/map/DeviceMap'
import {
  AdminDeviceTableHead,
  AdminDeviceTableRow,
  AdminDeviceMobileCard,
  PowerIcon,
  ProvisioningBadge,
} from '@/components/device/AdminDeviceRow'
import type { CreateDeviceInput } from '@/api/devices'
import type { UpdateSessionDto } from '@/types/firmware'

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

/** 모달이 떠 있는 동안 배경(body) 스크롤 잠금 */
function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
}

/* ── 기기 이력 (알림 REAL / 상태 REAL / 업데이트 REAL / 에러 REAL / 전체 합본) ── */

type HistoryTab = 'alerts' | 'status' | 'updates' | 'errors' | 'logs' | 'all'

type LogModuleFilter = 'all' | 'wifi' | 'hl'

const LOG_LEVEL_META: Record<DeviceLogLevel, { label: string; cls: string }> = {
  UNSPECIFIED: { label: 'LOG',   cls: 'bg-muted text-muted-foreground' },
  DEBUG:       { label: 'DEBUG', cls: 'bg-muted text-muted-foreground' },
  INFO:        { label: 'INFO',  cls: 'bg-primary/10 text-primary' },
  WARN:        { label: 'WARN',  cls: 'bg-warning/10 text-warning' },
  ERROR:       { label: 'ERROR', cls: 'bg-destructive/10 text-destructive' },
}

function DeviceLogRow({ log }: { log: DeviceLogDto }) {
  const meta = LOG_LEVEL_META[log.level] ?? LOG_LEVEL_META.UNSPECIFIED
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 text-[12px]">
      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}>
        {meta.label}
      </span>
      <span className="shrink-0 rounded bg-page px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
        {log.module}
      </span>
      <span className="min-w-0 flex-1 break-all text-foreground">{log.message}</span>
      <span className="shrink-0 text-muted-foreground">{formatDateTimeSec(log.received_at)}</span>
    </div>
  )
}

function priorityStyle(p: AlertPriorityEnum) {
  if (p === 'CRITICAL') return { dot: 'bg-destructive', box: 'border-destructive/20 bg-destructive/5' }
  if (p === 'WARNING') return { dot: 'bg-warning', box: 'border-warning/20 bg-warning/5' }
  return { dot: 'bg-primary', box: 'border-primary/20 bg-primary/5' }
}

function AlertRow({ a }: { a: AlertResponseDto }) {
  const s = priorityStyle(a.priority)
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-[12px] ${s.box}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
      <span className="shrink-0 font-semibold text-foreground">{ALERT_TYPE_LABEL[a.type]}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.message}</span>
      <span className="shrink-0 text-muted-foreground">{formatDateTime(a.occurred_at)}</span>
    </div>
  )
}

function StatusRow({ s }: { s: DeviceStatusLogDto }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-page/30 px-4 py-3 text-[12px]">
      <Thermometer className={`h-3.5 w-3.5 shrink-0 ${s.gpio_state ? 'text-destructive' : 'text-success'}`} />
      <span className={`shrink-0 font-semibold ${s.gpio_state ? 'text-destructive' : 'text-foreground'}`}>{s.gpio_state ? '과열' : '정상'}</span>
      <span className="min-w-0 flex-1 text-muted-foreground">과열 경보</span>
      <span className="shrink-0 text-muted-foreground">{formatDateTime(s.reported_at)}</span>
    </div>
  )
}

function HistoryEmpty({ text }: { text: string }) {
  return <p className="px-1 py-6 text-center text-[12px] text-muted-foreground">{text}</p>
}

/* ── 업데이트 세션 상태 배지 ── */
function SessionStatusBadge({ status }: { status: UpdateSessionDto['status'] }) {
  if (status === 'complete') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
      <CheckCircle2 className="h-3 w-3" /> 완료
    </span>
  )
  if (status === 'failed') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
      <AlertCircle className="h-3 w-3" /> 실패
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
      <Loader2 className="h-3 w-3 animate-spin" /> 진행 중
    </span>
  )
}

/* ── 업데이트 세션 한 줄 (업데이트 이력 탭 + 전체보기 합본 공용) ── */
function SessionRow({ session, onClick }: { session: UpdateSessionDto; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left text-[12px] hover:border-primary/30 hover:bg-page/50 transition-colors"
    >
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-mono font-bold text-foreground">v{session.firmware_version}</span>
      <SessionStatusBadge status={session.status} />
      <span className="min-w-0 flex-1 text-muted-foreground">{formatDateTime(session.triggered_at)}</span>
      {session.completed_at && (
        <span className="shrink-0 text-muted-foreground">→ {formatDateTime(session.completed_at)}</span>
      )}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  )
}

/* ── 에러 로그 한 줄 (에러 로그 탭 + 전체보기 합본 공용) ── */
function ErrorRow({ e }: { e: DeviceErrorLog }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[12px]">
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
      <span className="shrink-0 font-mono font-bold text-foreground">{e.code}</span>
      {e.message && <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.message}</span>}
      <span className="shrink-0 text-muted-foreground">{formatDateTime(e.occurred_at)}</span>
    </div>
  )
}

/* ── 세션 상세 모달 (기기 상세 위에 z-[60] 중첩) ── */
function UpdateSessionDetailModal({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  useLockBodyScroll()
  const [logPage, setLogPage] = useState(1)
  const { data, isLoading, isError } = useUpdateSessionDetail(sessionId, logPage, 50)

  const logs = data?.logs.data ?? []
  const logTotal = data?.logs.total ?? 0
  const totalPages = Math.ceil(logTotal / 50)

  const statusLabel: Record<string, string> = {
    downloading: '다운로드',
    verifying: '검증',
    flashing: '플래싱',
    complete: '완료',
    failed: '실패',
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">업데이트 세션 #{sessionId}</h3>
              {data && (
                <p className="text-[12px] text-muted-foreground">
                  펌웨어 v{data.firmware_version} · {formatDateTime(data.triggered_at)}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><span className="text-[13px]">불러오는 중…</span>
            </div>
          ) : isError ? (
            <HistoryEmpty text="세션 상세를 불러오지 못했습니다." />
          ) : (
            <>
              {/* 세션 메타 */}
              {data && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-page/30 px-4 py-3">
                  <SessionStatusBadge status={data.status} />
                  <span className="text-[12px] text-muted-foreground">
                    요청: {formatDateTime(data.triggered_at)}
                    {data.completed_at && <> · 완료: {formatDateTime(data.completed_at)}</>}
                  </span>
                </div>
              )}

              {/* 로그 목록 */}
              <div>
                <p className="mb-2 text-[12px] font-semibold text-muted-foreground">
                  업데이트 로그 ({logTotal}건)
                </p>
                {logs.length === 0 ? (
                  <HistoryEmpty text="로그가 없습니다." />
                ) : (
                  <div className="space-y-1.5">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[12px] ${
                          log.status === 'complete' ? 'border-success/20 bg-success/5'
                          : log.status === 'failed' ? 'border-destructive/20 bg-destructive/5'
                          : 'border-border bg-white'
                        }`}
                      >
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          log.type === 'self' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                        }`}>
                          {log.type === 'self' ? 'ESP32' : 'Nordic'}
                        </span>
                        <span className="w-16 shrink-0 font-mono font-bold text-foreground">
                          {log.progress_percent != null ? `${log.progress_percent}%` : '—'}
                        </span>
                        <span className={`shrink-0 font-semibold ${
                          log.status === 'complete' ? 'text-success'
                          : log.status === 'failed' ? 'text-destructive'
                          : 'text-foreground'
                        }`}>
                          {log.status ? statusLabel[log.status] ?? log.status : '—'}
                        </span>
                        {log.message && (
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">{log.message}</span>
                        )}
                        <span className="shrink-0 text-muted-foreground">{formatDateTime(log.occurred_at)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 로그 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={logPage === 1}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-[12px] text-muted-foreground">{logPage} / {totalPages}</span>
                    <button
                      onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))}
                      disabled={logPage === totalPages}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-border bg-page/30 px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

const LOG_LIMIT = 20
const SESSION_LIMIT = 10

function DeviceHistory({ deviceId, mac }: { deviceId: number; mac: string }) {
  const [tab, setTab] = useState<HistoryTab>('alerts')
  const [updatePage, setUpdatePage] = useState(1)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [logPage, setLogPage] = useState(1)
  const [logModule, setLogModule] = useState<LogModuleFilter>('all')

  // 이력 규모가 작아(기기당 수백 건) 전량을 한 번에 받는다 — 페이지네이션·모듈 필터는 클라이언트 처리.
  // 덕분에 '전체보기' 합본이 모든 종류·모든 건을 포함할 수 있다.
  // ⚠️ /alerts의 total·통계는 device_id 필터를 반영하지 않는 전역값 → 개수는 items.length 사용.
  const alertsQ = useAlerts({ device_id: deviceId, limit: 1000 })
  const statusQ = useDeviceStatusLogs(mac, 1, 1000)
  const updatesQ = useDeviceUpdateSessions(mac, 1, 1000)
  const errorsQ = useDeviceErrors(mac)
  // 카운트 뱃지를 위해 모달 열릴 때 즉시 로드(다른 탭들과 동일). 이전엔 tab==='logs'일 때만 enable돼 초기 카운트가 0으로 떴음.
  const logsQ = useDeviceLogs(mac, 1, 1000)

  const alerts = alertsQ.data?.items ?? []
  const statusLogs = statusQ.data?.data ?? []
  const sessions = updatesQ.data?.data ?? []
  const errors = errorsQ.data ?? []
  const allDeviceLogs = logsQ.data?.data ?? []

  const filteredLogs = logModule === 'all' ? allDeviceLogs : allDeviceLogs.filter((l) => l.module === logModule)
  const sessionTotalPages = Math.ceil(sessions.length / SESSION_LIMIT)
  const logTotalPages = Math.ceil(filteredLogs.length / LOG_LIMIT)
  const pagedSessions = sessions.slice((updatePage - 1) * SESSION_LIMIT, updatePage * SESSION_LIMIT)
  const pagedLogs = filteredLogs.slice((logPage - 1) * LOG_LIMIT, logPage * LOG_LIMIT)

  const merged = useMemo(() => {
    const items = [
      ...alerts.map((a) => ({ kind: 'alert' as const, ts: a.occurred_at, a })),
      ...statusLogs.map((s) => ({ kind: 'status' as const, ts: s.reported_at, s })),
      ...sessions.map((u) => ({ kind: 'session' as const, ts: u.triggered_at, u })),
      ...errors.map((e) => ({ kind: 'error' as const, ts: e.occurred_at, e })),
      ...allDeviceLogs.map((l) => ({ kind: 'log' as const, ts: l.received_at, l })),
    ]
    return items.sort((x, y) => new Date(y.ts).getTime() - new Date(x.ts).getTime())
  }, [alerts, statusLogs, sessions, errors, allDeviceLogs])

  const tabs: { key: HistoryTab; label: string; count: number }[] = [
    { key: 'alerts', label: '알림 이력', count: alerts.length },
    { key: 'status', label: '상태 이력', count: statusLogs.length },
    { key: 'updates', label: '업데이트 이력', count: sessions.length },
    { key: 'errors', label: '에러 로그', count: errors.length },
    { key: 'logs', label: '디바이스 로그', count: allDeviceLogs.length },
    { key: 'all', label: '전체보기', count: merged.length },
  ]

  const isLoading =
    tab === 'status' ? statusQ.isLoading
    : tab === 'alerts' ? alertsQ.isLoading
    : tab === 'updates' ? updatesQ.isLoading
    : tab === 'errors' ? errorsQ.isLoading
    : tab === 'logs' ? logsQ.isLoading
    : alertsQ.isLoading || statusQ.isLoading || updatesQ.isLoading || errorsQ.isLoading || logsQ.isLoading

  const isError =
    tab === 'status' ? statusQ.isError
    : tab === 'alerts' ? alertsQ.isError
    : tab === 'updates' ? updatesQ.isError
    : tab === 'errors' ? errorsQ.isError
    : tab === 'logs' ? logsQ.isError
    : alertsQ.isError || statusQ.isError || updatesQ.isError || errorsQ.isError || logsQ.isError

  const moduleFilterBtns: { key: LogModuleFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'wifi', label: 'WiFi' },
    { key: 'hl', label: 'HL' },
  ]

  return (
    <div>
      {/* 탭 헤더 */}
      <div className="mb-3 flex flex-wrap items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
              tab === t.key ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-page'
            }`}
          >
            {t.label}
            <span className={`text-[10px] font-bold ${tab === t.key ? 'opacity-80' : 'text-muted-foreground/60'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* 디바이스 로그 모듈 필터 */}
      {tab === 'logs' && (
        <div className="mb-3 flex items-center gap-1.5">
          {moduleFilterBtns.map((btn) => (
            <button
              key={btn.key}
              onClick={() => { setLogModule(btn.key); setLogPage(1) }}
              className={`rounded-lg border px-3 py-1 text-[11px] font-bold transition-all ${
                logModule === btn.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /><span className="text-[12px]">불러오는 중…</span>
        </div>
      ) : isError ? (
        <HistoryEmpty text="이력을 불러오지 못했습니다." />
      ) : tab === 'alerts' ? (
        alerts.length ? <div className="space-y-2">{alerts.map((a) => <AlertRow key={a.id} a={a} />)}</div> : <HistoryEmpty text="알림 이력이 없습니다." />
      ) : tab === 'status' ? (
        statusLogs.length ? <div className="space-y-2">{statusLogs.map((s) => <StatusRow key={s.id} s={s} />)}</div> : <HistoryEmpty text="상태 이력이 없습니다." />
      ) : tab === 'updates' ? (
        <>
          {sessions.length === 0 ? (
            <HistoryEmpty text="업데이트 이력이 없습니다." />
          ) : (
            <>
              <div className="space-y-1.5">
                {pagedSessions.map((session) => (
                  <SessionRow key={session.id} session={session} onClick={() => setSelectedSessionId(session.id)} />
                ))}
              </div>

              {/* 세션 페이지네이션 */}
              {sessionTotalPages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setUpdatePage((p) => Math.max(1, p - 1))}
                    disabled={updatePage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[12px] text-muted-foreground">{updatePage} / {sessionTotalPages}</span>
                  <button
                    onClick={() => setUpdatePage((p) => Math.min(sessionTotalPages, p + 1))}
                    disabled={updatePage === sessionTotalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : tab === 'errors' ? (
        errors.length === 0 ? (
          <HistoryEmpty text="에러 로그가 없습니다." />
        ) : (
          <div className="space-y-1.5">
            {errors.map((e) => (
              <ErrorRow key={e.id} e={e} />
            ))}
          </div>
        )
      ) : tab === 'logs' ? (
        <>
          {filteredLogs.length === 0 ? (
            <HistoryEmpty text="디바이스 로그가 없습니다." />
          ) : (
            <>
              <div className="space-y-1.5">
                {pagedLogs.map((log) => (
                  <DeviceLogRow key={log.id} log={log} />
                ))}
              </div>

              {/* 디바이스 로그 페이지네이션 */}
              {logTotalPages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[12px] text-muted-foreground">{logPage} / {logTotalPages}</span>
                  <button
                    onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                    disabled={logPage === logTotalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : merged.length ? (
        <div className="space-y-2">
          {merged.map((m) =>
            m.kind === 'alert' ? <AlertRow key={`a${m.a.id}`} a={m.a} />
            : m.kind === 'status' ? <StatusRow key={`s${m.s.id}`} s={m.s} />
            : m.kind === 'session' ? <SessionRow key={`u${m.u.id}`} session={m.u} onClick={() => setSelectedSessionId(m.u.id)} />
            : m.kind === 'error' ? <ErrorRow key={`e${m.e.id}`} e={m.e} />
            : <DeviceLogRow key={`l${m.l.id}`} log={m.l} />
          )}
        </div>
      ) : (
        <HistoryEmpty text="이력이 없습니다." />
      )}

      {/* 세션 상세 모달 (중첩) */}
      {selectedSessionId && (
        <UpdateSessionDetailModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  )
}

/** 펌웨어 현재(기기 보고) vs 세트(설치 번들) 비교 행 */
function FirmwareCompareRow({ icon: Icon, label, current, target }: { icon: LucideIcon; label: string; current: string | null; target: string | null }) {
  const cur = current || '—'
  const match = current && target ? current === target : null
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[12px] tabular-nums text-foreground">
          현재 <span className={`font-bold ${match === false ? 'text-warning' : ''}`}>{cur}</span>
          {target && <span className="text-muted-foreground"> · 세트 <span className="font-bold text-foreground">{target}</span></span>}
        </span>
        {match !== null ? (
          <span className={`inline-flex w-[58px] shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-full py-0.5 text-[10px] font-bold ${match ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            {match ? <Check className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}{match ? '일치' : '불일치'}
          </span>
        ) : (
          <span className="w-[58px] shrink-0" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Detail Modal — 조회 전용 + 별칭 편집 + 삭제
   ══════════════════════════════════════════════════════ */

export function DeviceDetailModal({
  device: deviceProp,
  onClose,
}: {
  device: HearingLoop
  onClose: () => void
}) {
  useLockBodyScroll()
  const qc = useQueryClient()
  const [freshDevice, setFreshDevice] = useState<HearingLoop | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [spin, setSpin] = useState(0) // 클릭마다 +1 → 아이콘 1회전
  /** 표시용 — 새로고침하면 GET /devices/:mac 최신값으로 교체(모달 안 닫힘) */
  const device = freshDevice ?? deviceProp

  const handleRefresh = async () => {
    setSpin((s) => s + 1) // 클릭 시 1회전
    setRefreshing(true)
    try {
      const dto = await devicesApi.get(deviceProp.mac)
      setFreshDevice(toHearingLoop(dto))
    } catch {
      // 실패 시 기존 값 유지(조용히)
    } finally {
      setRefreshing(false)
    }
    // 리스트 카드 + 이력 탭 동기화 (백그라운드 refetch)
    qc.invalidateQueries({ queryKey: deviceKeys.all })
    qc.invalidateQueries({ queryKey: alertKeys.all })
    qc.invalidateQueries({ queryKey: firmwareKeys.all })
  }

  const updateAlias = useUpdateAlias()
  const updateDevice = useUpdateDevice()
  const deleteDevice = useDeleteDevice()
  const assignZone = useAssignZone()
  const { data: zones, isLoading: zonesLoading } = useZones()

  const [displayAlias, setDisplayAlias] = useState<string>(device.alias ?? '')
  const [editingAlias, setEditingAlias] = useState(false)
  const [tempAlias, setTempAlias] = useState(displayAlias)
  const [aliasError, setAliasError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showOta, setShowOta] = useState(false)

  // 배치된 텔레코일존 (미배정이면 배정 — 실연동 PUT /devices/:id/zone/:zoneId)
  const [displayZone, setDisplayZone] = useState<{ id: number; name: string } | null>(
    device.telecoilZoneId && device.telecoilZoneName
      ? { id: Number(device.telecoilZoneId), name: device.telecoilZoneName }
      : null,
  )
  const [editingZone, setEditingZone] = useState(false)
  const [assignZoneId, setAssignZoneId] = useState('')

  const doAssign = () => {
    if (!assignZoneId) return
    assignZone.mutate(
      { id: Number(device.id), zoneId: Number(assignZoneId) },
      {
        onSuccess: () => {
          const z = zones?.find((zz) => String(zz.id) === assignZoneId)
          setDisplayZone({ id: Number(assignZoneId), name: z?.name ?? `구역 ${assignZoneId}` })
          setEditingZone(false)
        },
      },
    )
  }

  /* 설치 좌표 (지도뷰용, WGS84) — 별칭과 같은 로컬 표시 패턴 */
  const [displayCoords, setDisplayCoords] = useState<{ lat: number; lng: number } | null>(
    device.latitude != null && device.longitude != null
      ? { lat: device.latitude, lng: device.longitude }
      : null,
  )
  const [editingCoords, setEditingCoords] = useState(false)
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')
  const [coordError, setCoordError] = useState('')

  const startCoordEdit = () => {
    setLatInput(displayCoords ? String(displayCoords.lat) : '')
    setLngInput(displayCoords ? String(displayCoords.lng) : '')
    setCoordError('')
    setEditingCoords(true)
  }

  const saveCoords = () => {
    const lat = Number(latInput)
    const lng = Number(lngInput)
    if (!latInput.trim() || !lngInput.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setCoordError('위도·경도를 숫자로 입력해주세요.')
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setCoordError('범위를 벗어났습니다 (위도 -90~90, 경도 -180~180).')
      return
    }
    setCoordError('')
    updateDevice.mutate(
      { mac: device.mac, input: { latitude: lat, longitude: lng } },
      {
        onSuccess: () => { setDisplayCoords({ lat, lng }); setEditingCoords(false) },
        onError: () => setCoordError('좌표 저장에 실패했습니다.'),
      },
    )
  }

  const clearCoords = () => {
    setCoordError('')
    updateDevice.mutate(
      { mac: device.mac, input: { latitude: null, longitude: null } },
      {
        onSuccess: () => { setDisplayCoords(null); setEditingCoords(false) },
        onError: () => setCoordError('좌표 제거에 실패했습니다.'),
      },
    )
  }

  const hasAlias = Boolean(displayAlias.trim())
  const title = hasAlias ? displayAlias : device.mac

  const saveAlias = () => {
    const next = tempAlias.trim()
    setAliasError('')
    updateAlias.mutate(
      { mac: device.mac, alias: next },
      {
        onSuccess: () => {
          setDisplayAlias(next)
          setEditingAlias(false)
        },
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

  const handleDelete = () => {
    deleteDevice.mutate(Number(device.id), { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-5 border-b border-border bg-page/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                {device.provisionStatus === 'PENDING' && <ProvisioningBadge />}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="정보 새로고침"
                  title="정보 새로고침"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-page hover:text-primary transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className="h-4 w-4 transition-transform duration-500 ease-out"
                    style={{ transform: `rotate(${spin * 360}deg)` }}
                  />
                </button>
              </div>
              {hasAlias && <p className="text-[12px] text-muted-foreground font-mono">{device.mac}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin p-6">
          {/* 배치된 텔레코일존 — 배정 / 재배치 (실연동 PUT /devices/:id/zone/:zoneId) */}
          <div className="rounded-xl border border-primary/20 bg-primary/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-primary">배치된 텔레코일존</span>
              {!editingZone && (
                <button
                  onClick={() => { setAssignZoneId(displayZone ? String(displayZone.id) : ''); setEditingZone(true) }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  {displayZone ? '재배치' : '배정'}
                </button>
              )}
            </div>
            {editingZone ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={assignZoneId}
                    onChange={(e) => setAssignZoneId(e.target.value)}
                    disabled={assignZone.isPending || zonesLoading}
                    autoFocus
                    className="h-9 w-full appearance-none rounded-lg border border-primary/30 bg-white pl-3 pr-9 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  >
                    <option value="">{zonesLoading ? '불러오는 중…' : '존 선택'}</option>
                    {zones?.map((z) => (
                      <option key={z.id} value={String(z.id)}>{z.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <button
                  onClick={doAssign}
                  disabled={!assignZoneId || assignZone.isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40"
                >
                  {assignZone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditingZone(false)}
                  disabled={assignZone.isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page transition-colors disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : displayZone ? (
              <p className="flex items-center gap-1.5 text-[14px] font-bold text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {displayZone.name}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                미배정
              </p>
            )}
          </div>

          {/* 별칭 편집 */}
          <div className="rounded-xl border border-primary/20 bg-primary/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-primary">히어링루프 별칭</span>
              {!editingAlias && (
                <button
                  onClick={() => { setTempAlias(displayAlias); setAliasError(''); setEditingAlias(true) }}
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
                    onChange={(e) => setTempAlias(e.target.value)}
                    placeholder="별칭을 입력하세요"
                    className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                    disabled={updateAlias.isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveAlias()
                      if (e.key === 'Escape') { setTempAlias(displayAlias); setAliasError(''); setEditingAlias(false) }
                    }}
                  />
                  <button
                    onClick={saveAlias}
                    disabled={updateAlias.isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {updateAlias.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { setTempAlias(displayAlias); setAliasError(''); setEditingAlias(false) }}
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
              <p className="text-[14px] font-bold text-foreground">{hasAlias ? displayAlias : <span className="text-muted-foreground font-normal">별칭 없음 (MAC으로 표시)</span>}</p>
            )}
          </div>

          {/* Info grid — 조회 전용 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 전원 — 실값(is_connected = connection_status !== OFFLINE) */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">전원 상태</span>
              <div className="flex items-center gap-2">
                <PowerIcon on={device.power} />
                <span className="text-sm font-bold text-foreground">{device.power ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            {/* 기기 동작 여부 — 실값(connection_status). ONLINE=정상 작동/UPDATING=업데이트 중/OFFLINE=작동 중지 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">기기 동작 여부</span>
              <div className="flex items-center gap-2">
                {createElement(connectionMeta(device.connectionStatus).Icon, { className: `h-4 w-4 ${connectionMeta(device.connectionStatus).color}` })}
                <span className={`text-sm font-bold ${connectionMeta(device.connectionStatus).color}`}>{connectionMeta(device.connectionStatus).label}</span>
              </div>
            </div>

            {/* WiFi 신호 — 실값(wifi_signal). SSID는 신펌웨어(StatusReport.wifi_ssid) 기기만 표시 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">WiFi 신호</span>
              <div className="flex items-center gap-2">
                <WifiSignalIcon signal={device.wifiSignal} />
                <span className="text-sm font-bold text-foreground">{WIFI_SIGNAL_LABEL[device.wifiSignal]}</span>
                {device.wifiSsid && (
                  <span className="min-w-0 truncate text-[11px] text-muted-foreground" title={device.wifiSsid}>· {device.wifiSsid}</span>
                )}
              </div>
            </div>

            {/* 과열 경보 — 실값(last_gpio_state). true=과열 감지, false=정상. 전원 OFF면 값이 갱신되지 않으므로 '—'. (온도 센서 없음 → 온도값 대신 과열 여부만 표시) */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">과열 경보</span>
              <div className="flex items-center gap-2">
                <Thermometer className={`h-4 w-4 ${!device.power ? 'text-muted-foreground/50' : device.overTemperature ? 'text-destructive' : 'text-success'}`} />
                <span className={`text-sm font-bold ${!device.power ? 'text-muted-foreground' : device.overTemperature ? 'text-destructive' : 'text-foreground'}`}>{!device.power ? '—' : device.overTemperature ? '과열 감지' : '정상'}</span>
              </div>
            </div>

          </div>

          {/* Meta info */}
          <div className="space-y-2">
            {device.firmwareInconsistent && (
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-warning">펌웨어 불일치 감지</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    업데이트 도중 WiFi MCU와 HL MCU 중 하나만 성공하여 펌웨어 상태를 추적할 수 없습니다. 두 MCU가 동일한 버전이 되도록 재업데이트가 필요합니다.
                  </p>
                </div>
              </div>
            )}
            {/* 펌웨어 — 현재(기기 보고) vs 설치 세트(번들) */}
            <div className="rounded-xl border border-border p-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">펌웨어</span>
                </div>
                <button
                  onClick={() => setShowOta(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[12px] font-bold text-primary transition-colors hover:bg-primary/15"
                >
                  <Download className="h-3.5 w-3.5" /> 업데이트
                </button>
              </div>
              {device.installedFirmware ? (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2">
                  <span className="flex items-center gap-2 text-[12px] text-primary"><Package className="h-4 w-4 shrink-0" />설치된 세트</span>
                  <span className="text-right">
                    <span className="font-mono text-[13px] font-bold text-primary">v{device.installedFirmware.version}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">{formatDateTime(device.installedFirmware.uploaded_at)} 설치</span>
                  </span>
                </div>
              ) : (
                <p className="mb-2 rounded-lg bg-page px-3 py-2 text-[12px] text-muted-foreground">설치 이력 없음 (완료된 업데이트 없음)</p>
              )}
              <div className="divide-y divide-border/50">
                <FirmwareCompareRow icon={Wifi} label="WiFi (ESP32)" current={device.wifiFirmwareVersion} target={device.installedFirmware?.wifi_version ?? null} />
                <FirmwareCompareRow icon={Cpu} label="HL (Nordic)" current={device.hlFirmwareVersion} target={device.installedFirmware?.hl_version ?? null} />
              </div>
              {device.installedFirmware?.updates && device.installedFirmware.updates.length > 0 && (
                <div className="mt-3 border-t border-border/50 pt-3">
                  <p className="mb-1.5 text-[11px] text-muted-foreground">업데이트 내역 (세트 v{device.installedFirmware.version})</p>
                  {device.installedFirmware.updates.map((u, i) => (
                    <p key={i} className="py-0.5 text-[12px] leading-snug text-muted-foreground">· {u}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border divide-y divide-border/50">
              {[
                { label: 'MAC 주소', value: device.mac, icon: Hash },
                { label: '등록일', value: formatDateTime(device.registeredAt), icon: CalendarClock },
                { label: '최근 업데이트', value: formatDateTime(device.lastUpdated), icon: Activity },
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

              {/* 설치 좌표 (WGS84) — 지도 보기 마커 위치. 미지정이면 지도에서 제외 */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground">설치 좌표</span>
                  </div>
                  {!editingCoords && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-semibold tabular-nums ${displayCoords ? 'text-foreground' : 'text-warning'}`}>
                        {displayCoords ? `${displayCoords.lat}, ${displayCoords.lng}` : '미지정'}
                      </span>
                      <button
                        onClick={startCoordEdit}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Pencil className="h-3 w-3" /> 수정
                      </button>
                    </div>
                  )}
                </div>
                {editingCoords && (
                  <div className="mt-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="위도 (예: 37.5514247)"
                        value={latInput}
                        disabled={updateDevice.isPending}
                        onChange={(e) => setLatInput(e.target.value)}
                        className="w-[170px] rounded-lg border border-border bg-white px-3 py-2 text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="경도 (예: 127.04611)"
                        value={lngInput}
                        disabled={updateDevice.isPending}
                        onChange={(e) => setLngInput(e.target.value)}
                        className="w-[170px] rounded-lg border border-border bg-white px-3 py-2 text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button
                        onClick={saveCoords}
                        disabled={updateDevice.isPending}
                        className="rounded-lg bg-primary px-3.5 py-2 text-[12px] font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {updateDevice.isPending ? '저장중' : '저장'}
                      </button>
                      <button
                        onClick={() => { setEditingCoords(false); setCoordError('') }}
                        disabled={updateDevice.isPending}
                        className="rounded-lg px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:bg-page transition-colors disabled:opacity-50"
                      >
                        취소
                      </button>
                      {displayCoords && (
                        <button
                          onClick={clearCoords}
                          disabled={updateDevice.isPending}
                          className="rounded-lg px-3 py-2 text-[12px] font-semibold text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                        >
                          제거
                        </button>
                      )}
                    </div>
                    {coordError && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-destructive">
                        <AlertCircle className="h-3 w-3" /> {coordError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 기기 이력 — 알림(REAL) / 상태(REAL) / 전체 합본 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-destructive" />
              <h4 className="text-[14px] font-bold text-foreground">기기 이력</h4>
            </div>
            <DeviceHistory deviceId={Number(device.id)} mac={device.mac} />
          </div>
        </div>

        {/* Footer — 삭제 / 닫기 (제어·저장 없음) */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-border bg-page/30">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-destructive">정말 삭제할까요?</span>
              <button
                onClick={handleDelete}
                disabled={deleteDevice.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-[12px] font-bold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleteDevice.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                삭제
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteDevice.isPending}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-page transition-colors"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-destructive hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              기기 삭제
            </button>
          )}
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
            닫기
          </button>
        </div>
      </div>
      {showOta && <OtaUpdateModal macs={[device.mac]} onClose={() => setShowOta(false)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Register Modal — 상세 카드 입력(여러 대 누적) + MAC 빠른 입력
   ══════════════════════════════════════════════════════ */

interface DraftEntry { mac: string; zoneId: string; alias: string }

const ALIAS_MAX = 30

/* ── MAC 주소 형식 강제·정규화 ──
   표준형 = 두 자리씩 6쌍 · 콜론 구분 · 대문자 · 공백 없음 (AA:BB:CC:DD:EE:FF).
   백엔드는 MAC을 검증·정규화하지 않고 그대로 저장하며, 기기가 보고하는 MAC과
   정확히 일치해야 매칭되므로 FE에서 표준형을 강제한다. */
const MAC_CANONICAL = /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/

type MacStatus = 'ok' | 'fixable' | 'invalid'
interface MacCheck {
  /** ok=표준형 / fixable=정규화 가능(콜론·공백·대소문자) / invalid=교정 불가(16진수 12자리 아님) */
  status: MacStatus
  /** 표준형 결과 (ok·fixable일 때) */
  canonical: string | null
  /** 어떤 보정이 필요한지 (예: ['공백 제거', '대문자로', '콜론으로 구분']) */
  reasons: string[]
}

function checkMac(raw: string): MacCheck {
  const trimmed = raw.trim()
  if (MAC_CANONICAL.test(trimmed)) return { status: 'ok', canonical: trimmed, reasons: [] }

  const hex = trimmed.replace(/[^0-9a-fA-F]/g, '')
  if (hex.length !== 12) return { status: 'invalid', canonical: null, reasons: [] }

  const canonical = (hex.toUpperCase().match(/.{2}/g) as string[]).join(':')
  const reasons: string[] = []
  if (/\s/.test(trimmed)) reasons.push('공백 제거')
  if (/[a-f]/.test(trimmed)) reasons.push('대문자로')
  if (!/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(trimmed.replace(/\s/g, ''))) reasons.push('콜론으로 구분')
  if (reasons.length === 0) reasons.push('형식 정리')
  return { status: 'fixable', canonical, reasons }
}

/** 입력 필드 카드 (아이콘 · 제목/설명 · 입력) — 등록 폼 공통 레이아웃 */
function FieldRow({
  icon,
  iconCls,
  title,
  badge,
  desc,
  children,
}: {
  icon: ReactNode
  iconCls: string
  title: string
  badge?: ReactNode
  desc?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>{icon}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-2/5 sm:shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-foreground">{title}</span>
              {badge}
            </div>
            {desc && <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{desc}</p>}
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll()
  const createBulk = useCreateDevicesBulk()
  const { data: zones, isLoading: zonesLoading } = useZones()

  const [quickMode, setQuickMode] = useState(false)
  const [entries, setEntries] = useState<DraftEntry[]>([])
  const [mac, setMac] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [alias, setAlias] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null)

  const isPending = createBulk.isPending
  const zoneNameOf = (id: string) => zones?.find((z) => String(z.id) === id)?.name ?? '미배정'

  const addEntry = () => {
    setError('')
    const m = mac.trim()
    if (!m) { setError('MAC 주소를 입력해주세요.'); return }
    const c = checkMac(m)
    if (c.status === 'invalid') { setError('올바른 MAC 주소 형식이 아니에요 (16진수 12자리).'); return }
    if (c.status === 'fixable') { setError('MAC 형식을 표준형으로 먼저 맞춰주세요.'); return }
    const canonical = c.canonical as string
    if (entries.some((e) => e.mac === canonical)) { setError('이미 추가된 MAC 주소입니다.'); return }
    setEntries((prev) => [...prev, { mac: canonical, zoneId, alias: alias.trim() }])
    setMac(''); setZoneId(''); setAlias('')
  }

  const removeEntry = (m: string) => setEntries((prev) => prev.filter((e) => e.mac !== m))

  const toInput = (e: DraftEntry): CreateDeviceInput => ({
    mac_address: e.mac,
    ...(e.zoneId ? { zone_id: Number(e.zoneId) } : {}),
    ...(e.alias ? { alias: e.alias } : {}),
  })

  // 입력 중인 MAC의 형식 검사 (단일 모드 인라인 안내·정규화 제안)
  const macCheck = mac.trim() ? checkMac(mac) : null
  // 폼에 입력 중이고 아직 추가 안 한 MAC도 등록에 포함(단건 편의) — 표준형일 때만
  const pendingForm: DraftEntry | null =
    !quickMode && macCheck?.status === 'ok' && !entries.some((e) => e.mac === macCheck.canonical)
      ? { mac: macCheck.canonical as string, zoneId, alias: alias.trim() }
      : null
  const registerCount = quickMode ? 0 : entries.length + (pendingForm ? 1 : 0)

  // 일괄(quick) 입력 줄별 검사 — 줄바꿈·쉼표로 분리(줄 안의 공백 등은 정규화로 흡수)
  const bulkLines = bulkText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
  const bulkChecks = bulkLines.map((l) => ({ raw: l, ...checkMac(l) }))
  const bulkFixable = bulkChecks.filter((c) => c.status === 'fixable')
  const bulkInvalid = bulkChecks.filter((c) => c.status === 'invalid')
  const bulkOkCount = bulkChecks.filter((c) => c.status === 'ok').length
  const tidyBulk = () =>
    setBulkText(bulkChecks.map((c) => (c.status === 'invalid' ? c.raw : (c.canonical as string))).join('\n'))

  const submit = () => {
    setError('')
    setResult(null)
    let list: CreateDeviceInput[]
    if (quickMode) {
      if (bulkLines.length === 0) { setError('MAC 주소를 한 줄에 하나씩 입력해주세요.'); return }
      if (bulkInvalid.length > 0) { setError('형식이 잘못된 MAC이 있어요. 16진수 12자리로 수정해주세요.'); return }
      if (bulkFixable.length > 0) { setError("'표준형으로 정리'를 눌러 형식을 맞춘 뒤 등록해주세요."); return }
      const macs = Array.from(new Set(bulkChecks.map((c) => c.canonical as string)))
      list = macs.map((m) => ({ mac_address: m }))
    } else {
      if (mac.trim() && macCheck?.status !== 'ok') {
        setError('입력한 MAC을 표준형으로 맞추거나 비운 뒤 등록해주세요.'); return
      }
      const allEntries = pendingForm ? [...entries, pendingForm] : entries
      if (allEntries.length === 0) { setError('등록할 기기를 추가해주세요.'); return }
      list = allEntries.map(toInput)
    }
    createBulk.mutate(list, {
      onSuccess: (res) => {
        if (res.skipped.length === 0) onClose()
        else setResult({ created: res.created.length, skipped: res.skipped })
      },
      onError: () => setError('등록에 실패했습니다.'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-foreground">히어링루프 등록</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {quickMode ? 'MAC 주소만 빠르게 여러 대 등록합니다.' : '정보를 입력하고 추가하면 아래 목록에 쌓입니다. 한 번에 등록하세요.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin p-6">
          {quickMode ? (
            <div>
              <label className="mb-2 block text-[12px] font-semibold text-foreground">MAC 주소 (한 줄에 하나)</label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'AA:BB:CC:DD:EE:01\nAA:BB:CC:DD:EE:02'}
                rows={6}
                disabled={isPending}
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">텔레코일존·별칭 없이 MAC 주소만 일괄 등록합니다(미배정).</p>
              {bulkLines.length > 0 && (bulkFixable.length > 0 || bulkInvalid.length > 0) && (
                <div className="mt-2 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                      표준형 {bulkOkCount} · 정리 필요 {bulkFixable.length}{bulkInvalid.length > 0 ? ` · 오류 ${bulkInvalid.length}` : ''}
                    </p>
                    {bulkFixable.length > 0 && (
                      <button
                        type="button"
                        onClick={tidyBulk}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-destructive/90"
                      >
                        <Check className="h-3.5 w-3.5" /> 표준형으로 정리
                      </button>
                    )}
                  </div>
                  {bulkInvalid.length > 0 && (
                    <p className="text-[11px] text-destructive">
                      형식 오류(수정 필요): <span className="font-mono">{bulkInvalid.map((c) => c.raw).join(', ')}</span>
                    </p>
                  )}
                </div>
              )}
              {bulkLines.length > 0 && bulkFixable.length === 0 && bulkInvalid.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {bulkOkCount}개 모두 올바른 형식이에요
                </p>
              )}
            </div>
          ) : (
            <>
              {/* MAC */}
              <FieldRow
                icon={<Wifi className="h-5 w-5 text-primary" />}
                iconCls="bg-primary/10"
                title="MAC 주소"
                badge={<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">필수</span>}
              >
                <>
                  <input
                    type="text"
                    value={mac}
                    onChange={(e) => setMac(e.target.value)}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    autoFocus
                    disabled={isPending}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                      macCheck && macCheck.status !== 'ok'
                        ? 'border-destructive focus:ring-destructive/20 focus:border-destructive'
                        : 'border-border focus:ring-primary/20 focus:border-primary'
                    }`}
                    onKeyDown={(e) => { if (e.key === 'Enter') addEntry() }}
                  />
                  {macCheck?.status === 'fixable' && (
                    <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                      <p className="flex items-start gap-1.5 text-[12px] leading-snug text-foreground">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        <span>{macCheck.reasons.join(' · ')} 해야 하는 거 아니에요?</span>
                      </p>
                      <p className="mt-1.5 pl-5 font-mono text-[13px] font-bold tracking-tight text-foreground">{macCheck.canonical}</p>
                      <button
                        type="button"
                        onClick={() => setMac(macCheck.canonical as string)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-destructive px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-destructive/90"
                      >
                        <Check className="h-3.5 w-3.5" /> 이렇게 바꾸기
                      </button>
                    </div>
                  )}
                  {macCheck?.status === 'invalid' && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> 올바른 MAC 형식이 아니에요 — 16진수 12자리 (AA:BB:CC:DD:EE:FF)
                    </p>
                  )}
                  {macCheck?.status === 'ok' && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> 올바른 형식이에요
                    </p>
                  )}
                </>
              </FieldRow>

              {/* 텔레코일존 */}
              <FieldRow
                icon={<Target className="h-5 w-5 text-success" />}
                iconCls="bg-success/10"
                title="텔레코일존"
                badge={<span className="text-[11px] font-normal text-muted-foreground">선택</span>}
                desc={zonesLoading ? '텔레코일존 목록을 불러오는 중…' : '이미 등록된 텔레코일존만 선택할 수 있어요. 비우면 미배정으로 등록됩니다.'}
              >
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  disabled={isPending || zonesLoading}
                  className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
                >
                  <option value="">선택해주세요 (미배정)</option>
                  {zones?.map((z) => (
                    <option key={z.id} value={String(z.id)}>{z.name}</option>
                  ))}
                </select>
              </FieldRow>

              {/* 별칭 */}
              <FieldRow
                icon={<Star className="h-5 w-5 text-purple-600" />}
                iconCls="bg-purple-100"
                title="별칭"
                badge={<span className="text-[11px] font-normal text-muted-foreground">선택</span>}
                desc="비우면 MAC 주소로 표시되고, 나중에 변경할 수 있어요."
              >
                <div className="relative">
                  <input
                    type="text"
                    value={alias}
                    maxLength={ALIAS_MAX}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="예: 1층 안내데스크"
                    disabled={isPending}
                    className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 pr-14 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    onKeyDown={(e) => { if (e.key === 'Enter') addEntry() }}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
                    {alias.length} / {ALIAS_MAX}
                  </span>
                </div>
              </FieldRow>

              {/* 목록에 추가 */}
              <button
                onClick={addEntry}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/3 py-2.5 text-[13px] font-semibold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> 목록에 추가하기
              </button>

              {/* 추가된 기기 카드 목록 */}
              {entries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold text-muted-foreground">추가된 기기 {entries.length}대</p>
                  {entries.slice().reverse().map((e) => (
                    <div key={e.mac} className="flex items-center gap-3 rounded-xl border border-border bg-page/40 px-3.5 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Radio className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-foreground">{e.alias || e.mac}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{e.mac} · {zoneNameOf(e.zoneId)}</p>
                      </div>
                      <button onClick={() => removeEntry(e.mac)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {result && (
            <div className="rounded-lg bg-page p-3 text-[12px]">
              <p className="font-semibold text-success">등록 완료: {result.created}대</p>
              {result.skipped.length > 0 && (
                <p className="mt-1 text-warning">건너뜀(중복): {result.skipped.join(', ')}</p>
              )}
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-page/30 px-6 py-4">
          <button
            onClick={() => { setQuickMode((q) => !q); setError(''); setResult(null) }}
            className="text-[12px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            {quickMode ? '상세 입력으로 돌아가기' : 'MAC 주소로만 추가하기'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
              {result ? '닫기' : '취소'}
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              등록{!quickMode && registerCount > 0 ? ` (${registerCount})` : ''}
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
  const { data: devices, isLoading, isError, isFetching, refetch } = useDevices()

  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState<string>('all') // 'all' | 'unassigned' | zoneId
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedDevice, setSelectedDevice] = useState<HearingLoop | null>(null)
  const [listSpin, setListSpin] = useState(0) // 목록 새로고침 클릭마다 +1 → 아이콘 1회전
  const [view, setView] = useState<'list' | 'map'>('list') // 목록/지도 보기 토글
  const [showRegister, setShowRegister] = useState(false)
  const [otaMode, setOtaMode] = useState(false)
  const [otaSelected, setOtaSelected] = useState<Set<string>>(new Set())
  const [otaModalMacs, setOtaModalMacs] = useState<string[] | null>(null)
  const { data: firmwares } = useFirmwares()

  const all = useMemo(() => devices ?? [], [devices])

  /* 텔레코일존 필터 항목(키·라벨·기기수) — 로드된 기기에서 파생 */
  const zoneFilterItems = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    let unassigned = 0
    all.forEach((d) => {
      if (d.telecoilZoneId && d.telecoilZoneName) {
        const prev = map.get(d.telecoilZoneId)
        map.set(d.telecoilZoneId, { name: d.telecoilZoneName, count: (prev?.count ?? 0) + 1 })
      } else {
        unassigned++
      }
    })
    const items: { key: string; label: string; count: number }[] = [
      { key: 'all', label: '전체', count: all.length },
    ]
    if (unassigned > 0) items.push({ key: 'unassigned', label: '미배정', count: unassigned })
    map.forEach((v, id) => items.push({ key: id, label: v.name, count: v.count }))
    return items
  }, [all])

  /* 존 필터 pill 버튼들 — 목록/지도 두 모드에서 공용 */
  const zonePillButtons = zoneFilterItems.map((item) => {
    const isActive = zoneFilter === item.key
    return (
      <button
        key={item.key}
        onClick={() => setZoneFilter(item.key)}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
          isActive
            ? 'border-primary text-primary bg-white shadow-sm'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-page'
        }`}
      >
        {item.label}
        <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
          isActive ? 'bg-primary/10 text-primary' : 'bg-page text-muted-foreground/70'
        }`}>
          {item.count}
        </span>
      </button>
    )
  })

  /* 존 필터 적용 */
  const zoneBaseList = useMemo(() => {
    if (zoneFilter === 'all') return all
    if (zoneFilter === 'unassigned') return all.filter((d) => !d.telecoilZoneId)
    return all.filter((d) => d.telecoilZoneId === zoneFilter)
  }, [all, zoneFilter])

  const filteredDevices = useMemo(() => {
    let list = [...zoneBaseList]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (d) => d.mac.toLowerCase().includes(q) || (d.alias?.toLowerCase().includes(q) ?? false),
      )
    }
    list.sort((a, b) => {
      const da = new Date(a.lastUpdated).getTime()
      const db = new Date(b.lastUpdated).getTime()
      return sortOrder === 'latest' ? db - da : da - db
    })
    return list
  }, [zoneBaseList, search, sortOrder])

  // OTA 모드 파생 — 최신 펌웨어 기준 업데이트 필요 ONLINE 기기(펌웨어 선택은 전송 모달에서)
  const latestFw = firmwares?.[0] ?? null
  const needUpdateMacs = useMemo(
    () =>
      filteredDevices
        .filter(
          (d) =>
            d.connectionStatus === 'ONLINE' &&
            (!latestFw || d.wifiFirmwareVersion !== latestFw.wifiVersion || d.hlFirmwareVersion !== latestFw.hlVersion),
        )
        .map((d) => d.mac),
    [filteredDevices, latestFw],
  )
  const toggleOta = (mac: string) =>
    setOtaSelected((prev) => {
      const n = new Set(prev)
      n.has(mac) ? n.delete(mac) : n.add(mac)
      return n
    })

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <div className="flex flex-col gap-3 pb-3 pt-3 sm:flex-row sm:items-end sm:justify-between sm:pb-5 sm:pt-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">히어링루프 관리</h2>
          <p className="text-sm text-muted-foreground mt-2">등록된 히어링루프를 조회하고 관리할 수 있습니다.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {!otaMode && (
            <button
              onClick={() => { setOtaMode(true); setOtaSelected(new Set()) }}
              className="group flex items-center justify-center gap-2.5 rounded-xl border border-transparent py-2 pl-3 pr-4 text-[13px] font-bold text-primary-dark shadow-sm transition-all hover:shadow-[0_4px_16px_rgba(36,107,209,0.15)]"
              style={{ background: 'linear-gradient(135deg,#EDF1F8 0%,#D6E5F8 40%,#DDDAF8 75%,#EDE8F4 100%)' }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 shadow-sm">
                <Download className="h-4 w-4 text-primary transition-transform duration-300 group-hover:translate-y-0.5" />
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="text-primary-dark">OTA 업데이트</span>
                <span className="mt-0.5 text-[10px] text-primary-dark/40">펌웨어 원격 업데이트</span>
              </span>
            </button>
          )}
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            히어링루프 등록
          </button>
        </div>
      </div>

      {/* ─── Search · Zone filter · Sort ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="별칭, MAC 주소 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
          className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'latest' ? '최신순' : '오래된순'}
        </button>

        <button
          onClick={() => { setListSpin((s) => s + 1); refetch() }}
          disabled={isFetching}
          aria-label="목록 새로고침"
          title="목록 새로고침"
          className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5 transition-transform duration-500 ease-out" style={{ transform: `rotate(${listSpin * 360}deg)` }} />
          새로고침
        </button>

        <button
          onClick={() => setView(view === 'list' ? 'map' : 'list')}
          className={`flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold transition-colors ${
            view === 'map'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border bg-white text-muted-foreground hover:text-foreground'
          }`}
        >
          {view === 'list' ? <MapIcon className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          {view === 'list' ? '지도 보기' : '목록 보기'}
        </button>
      </div>

      {/* ─── OTA 모드 액션 바 ─── */}
      {otaMode && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15"><Download className="h-4 w-4 text-primary" /></span>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-primary-dark">OTA 업데이트 모드</p>
              <p className="text-[11px] text-muted-foreground"><b className="font-semibold text-foreground">{otaSelected.size}</b>대 선택 · ONLINE만 · 펌웨어는 전송 시 선택</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setOtaMode(false); setOtaSelected(new Set()) }}
              className="rounded-xl px-4 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-page"
            >
              취소
            </button>
            <button
              onClick={() => setOtaModalMacs([...otaSelected])}
              disabled={otaSelected.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-primary-dark px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-primary-dark/90 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> 선택 업데이트{otaSelected.size > 0 ? ` (${otaSelected.size})` : ''}
            </button>
            <button
              onClick={() => setOtaModalMacs(needUpdateMacs)}
              disabled={needUpdateMacs.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> 전체 업데이트 ({needUpdateMacs.length})
            </button>
          </div>
        </div>
      )}

      {/* ─── Table / Map ─── */}
      {view === 'map' ? (
        <>
          {/* 존 필터 (지도 모드) — 검색·정렬·필터가 지도 마커에 그대로 적용됨 */}
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-white px-5 py-3 shadow-sm overflow-x-auto scrollbar-thin">
            <Building2 className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
            {zonePillButtons}
          </div>
          <DeviceMap devices={filteredDevices} onSelect={setSelectedDevice} />
        </>
      ) : (
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Telecoil-zone filter pills (가로 스크롤) */}
        <div className="flex items-center gap-1 border-b border-border px-5 pb-3 pt-4 overflow-x-auto scrollbar-thin">
          <Building2 className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
          {zonePillButtons}
        </div>

        <div className="hidden md:block overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <AdminDeviceTableHead />
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm">기기 목록을 불러오는 중...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="h-8 w-8 text-destructive/60" />
                      <p className="text-sm text-muted-foreground">목록을 불러오지 못했습니다.</p>
                      <button onClick={() => refetch()} className="rounded-lg bg-page px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-border/50 transition-colors">
                        다시 시도
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Radio className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <AdminDeviceTableRow
                    key={device.id}
                    device={device}
                    onClick={() => setSelectedDevice(device)}
                    otaMode={otaMode}
                    otaChecked={otaSelected.has(device.mac)}
                    onToggleOta={() => toggleOta(device.mac)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Mobile cards (md 미만) ─── */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 px-5 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">기기 목록을 불러오는 중...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
              <p className="text-sm text-muted-foreground">목록을 불러오지 못했습니다.</p>
              <button onClick={() => refetch()} className="rounded-lg bg-page px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-border/50 transition-colors">
                다시 시도
              </button>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-16">
              <Radio className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {filteredDevices.map((device) => (
                <AdminDeviceMobileCard
                  key={device.id}
                  device={device}
                  onClick={() => setSelectedDevice(device)}
                  otaMode={otaMode}
                  otaChecked={otaSelected.has(device.mac)}
                  onToggleOta={() => toggleOta(device.mac)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-page/30">
          <span className="text-[12px] text-muted-foreground">
            총 <span className="font-bold text-foreground">{filteredDevices.length}</span>개 기기
          </span>
        </div>
      </div>
      )}

      {/* ─── Modals ─── */}
      {selectedDevice && (
        <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      {otaModalMacs && <OtaUpdateModal macs={otaModalMacs} onClose={() => setOtaModalMacs(null)} />}
    </div>
  )
}
