import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  MapPin,
  ChevronRight,
  Flame,
  CheckCircle2,
  Bell,
  Wifi,
  PackageSearch,
  ArrowRight,
  Loader2,
  Shield,
} from 'lucide-react'

import { DashboardBanner, BannerButton } from '@/components/dashboard/DashboardBanner'
import { BrandPanel } from '@/components/dashboard/BrandPanel'
import { kstBannerDate, formatKstTime, toMs } from '@/lib/kst'
import { useDevices } from '@/hooks/useDevices'
import { useZones } from '@/hooks/useZones'
import { useAlerts } from '@/hooks/useAlerts'
import { useOverheatAlerts } from '@/hooks/useOverheatAlerts'
import { DeviceMap } from '@/components/map/DeviceMap'
import { DeviceDetailModal } from '@/pages/admin/hearing-loops'
import type { HearingLoop } from '@/types/device'
import {
  buildOverheatSummary,
  buildPipeline,
  buildZoneRows,
  summarizeDevices,
  summarizeFirmware,
  summarizeWifi,
  wifiAxisPos,
  stackDots,
  WIFI_AXIS_MIN,
  WIFI_AXIS_MAX,
  WIFI_THRESHOLDS,
  type OverheatDevice,
  overheatDayBuckets,
} from '@/lib/dashboard'
import { formatDateTime } from '@/lib/format'

/* ══════════════════════════════════════════════════════
   공통 조각
   ══════════════════════════════════════════════════════ */

function CardShell({
  icon,
  iconCls = 'bg-primary/10 text-primary',
  title,
  action,
  accent = false,
  children,
}: {
  icon: React.ReactNode
  iconCls?: string
  title: string
  action?: React.ReactNode
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm overflow-hidden transition-colors ${
        accent ? 'border-2 border-destructive/40' : 'border border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>{icon}</div>
          <h3 className="text-[15px] font-bold text-foreground truncate">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
    >
      {label} <ChevronRight className="h-3.5 w-3.5" />
    </button>
  )
}

/** 헤더 요약 한 줄 — 카드 KPI 스트립을 대신한다 */
function StatChip({ label, value, tone = 'muted' }: { label: string; value: number; tone?: 'muted' | 'success' | 'warning' | 'danger' }) {
  const cls = {
    muted: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  }[tone]
  return (
    <span className="flex items-center gap-1 whitespace-nowrap text-[12px] text-muted-foreground">
      {label}
      <b className={`font-bold tabular-nums ${cls}`}>{value}</b>
    </span>
  )
}

/** 기기 배치 파이프라인 한 단계 — 왼쪽 레일(점 + 연결선) + 라벨·건수 + 대기 기기 칩.
 *  칩은 클릭하면 기기 상세 모달로 간다. 칩이 많으면 6개까지만 두고 나머지는 '외 N대'로 접는다. */
function PipelineStep({
  label,
  count,
  dot,
  countCls,
  chipCls,
  devices = [],
  note,
  last,
  onSelect,
}: {
  label: string
  count: number
  /** 점 색 + ring 색 (ring은 점 둘레 후광) */
  dot: string
  countCls: string
  chipCls?: string
  devices?: HearingLoop[]
  note?: string
  last?: boolean
  onSelect?: (d: HearingLoop) => void
}) {
  const shown = devices.slice(0, 6)
  return (
    <div className="flex gap-3">
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span className={`mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full ring-[3px] ${dot}`} />
        {!last && <span className="mt-1 w-0.5 flex-1 bg-border/60" />}
      </div>
      <div className={`min-w-0 flex-1 ${last ? 'pb-3.5' : 'pb-4'}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-bold text-foreground">{label}</span>
          <span className={`text-[15px] font-extrabold tabular-nums ${countCls}`}>{count}</span>
        </div>
        {shown.length > 0 && (
          <div className="mt-[7px] flex flex-wrap gap-1.5">
            {shown.map((d) => (
              <button
                key={d.mac}
                onClick={() => onSelect?.(d)}
                className={`max-w-full truncate rounded-md px-2 py-1 font-mono text-[11px] font-semibold transition-opacity hover:opacity-70 ${chipCls}`}
              >
                {d.alias?.trim() || d.mac}
              </button>
            ))}
            {devices.length > shown.length && (
              <span className="px-1 py-1 text-[11px] text-muted-foreground">외 {devices.length - shown.length}대</span>
            )}
          </div>
        )}
        {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════ */

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [selectedDevice, setSelectedDevice] = useState<HearingLoop | null>(null)

  const { data: devices = [], isLoading: devicesLoading } = useDevices()
  const { data: zones = [] } = useZones()
  const { data: alertStats } = useAlerts({ limit: 1 })
  const overheatQ = useOverheatAlerts()

  // 렌더마다 흔들리지 않도록 마운트 시점으로 고정
  const nowMs = useMemo(() => Date.now(), [])
  const summary = useMemo(() => summarizeDevices(devices, nowMs), [devices, nowMs])
  const wifi = useMemo(() => summarizeWifi(devices), [devices])
  const pipeline = useMemo(() => buildPipeline(devices), [devices])
  const firmware = useMemo(() => summarizeFirmware(devices), [devices])
  const overheat = useMemo(
    () => buildOverheatSummary(overheatQ.alerts, devices, nowMs),
    [overheatQ.alerts, devices, nowMs],
  )
  const overheatDays = useMemo(
    () => overheatDayBuckets(overheatQ.alerts, nowMs),
    [overheatQ.alerts, nowMs],
  )
  const zoneRows = useMemo(
    () => buildZoneRows(zones, devices, overheat, nowMs),
    [zones, devices, overheat, nowMs],
  )

  /** 분포 스트립에 찍을 점 — RSSI가 있는 기기만. 같은 값은 위로 쌓는다 */
  const plotted = useMemo(() => {
    const withRssi = devices
      .filter((d) => d.connectionStatus !== 'OFFLINE' && d.wifiRssi != null)
      .sort((a, b) => (a.wifiRssi ?? 0) - (b.wifiRssi ?? 0))
    return stackDots(withRssi, (d) => d.wifiRssi ?? 0)
  }, [devices])
  const unplotted = wifi.connected - plotted.length
  /** 표 뷰용 — 연결된 전체를 약한 순으로 */
  const sortedByRssi = useMemo(
    () => devices.filter((d) => d.connectionStatus !== 'OFFLINE').sort((a, b) => (a.wifiRssi ?? 0) - (b.wifiRssi ?? 0)),
    [devices],
  )

  const openByMac = (mac: string) => {
    const d = devices.find((x) => x.mac === mac)
    if (d) setSelectedDevice(d)
  }

  /** 배너 eyebrow — 기기들이 마지막으로 보고한 시각 중 최신 */
  const lastSeenLabel = useMemo(() => {
    const times = devices.map((d) => (d.lastUpdated ? toMs(d.lastUpdated) : 0)).filter((t) => t > 0)
    return times.length ? formatKstTime(Math.max(...times)) : '—'
  }, [devices])

  const hotNow = overheat.currentDevices.length

  return (
    <div className="space-y-6">

      {/* ─── Welcome Banner (v2) ─── */}
      <DashboardBanner
        eyebrow={`${kstBannerDate(nowMs)} · 마지막 수신 ${lastSeenLabel}`}
        title="환영합니다, 관리자님"
        description={
          <>
            전체 <b className="font-bold">{summary.total}대</b> 중{' '}
            <b className="font-bold text-[#0E9F6E]">{summary.online}대</b>가 가동 중이며, 조치가 필요한 기기가{' '}
            <b className="font-bold text-destructive">{summary.buckets.fault}대</b> 있습니다.
          </>
        }
        actions={
          <>
            <BannerButton onClick={() => navigate('/admin/hearing-loops')}>
              장애 기기 보기 <ArrowRight className="h-3.5 w-3.5" />
            </BannerButton>
            <BannerButton variant="outline" onClick={() => navigate('/admin/alerts')}>
              알림센터 열기
            </BannerButton>
          </>
        }
        stats={[
          { label: 'DEVICES', value: summary.total },
          { label: 'ONLINE', value: summary.online, tone: 'success' },
          { label: 'FAULT', value: summary.buckets.fault, tone: 'danger' },
          { label: 'ALERTS', value: alertStats?.pending ?? 0, tone: 'primary' },
        ]}
        tickerRight={`SEONGDONG-GU · KST ${formatKstTime(nowMs)}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">

        {/* ══ Left column ══ */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* ① 지도뷰 — 마커·지도는 그대로, 헤더에 요약 한 줄만 추가.
              flex-1로 우측 열 높이에 맞춰 지도가 늘거나 준다 */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-[15px] font-bold text-foreground">전체 장비 지도뷰</h3>
              </div>
              <LinkButton label="전체보기" onClick={() => navigate('/admin/hearing-loops')} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-6 py-2.5 border-b border-border bg-page/40">
              <StatChip label="전체" value={summary.total} />
              <StatChip label="정상 가동" value={summary.online} tone="success" />
              <StatChip label="장애" value={summary.buckets.fault} tone="danger" />
              <StatChip label="미배정" value={summary.unassigned} />
              <span className="ml-auto text-[11px] text-muted-foreground">
                24시간 미만 미연결은 가동 중으로 집계(야간 소등·주말 휴관 포함)
              </span>
            </div>
            <DeviceMap
              devices={devices}
              onSelect={setSelectedDevice}
              className="flex min-h-0 flex-1 flex-col"
              /* 단일 열(xl 미만)에선 늘 자리가 없어 하한값이 곧 높이가 된다 */
              heightClass="min-h-[400px] flex-1 xl:min-h-[320px]"
            />
          </div>

          {/* ⑤ Wi-Fi 신호 — 위: RSSI 분포 스트립 / 아래: 약한 순 목록(스크롤) */}
          <CardShell
            icon={<Wifi className="h-4 w-4" />}
            iconCls={wifi.weak ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}
            title="Wi-Fi 신호"
            action={<span className="shrink-0 text-[11px] text-muted-foreground">연결된 {wifi.connected}대 기준</span>}
          >
            {wifi.connected === 0 ? (
              <p className="px-5 py-6 text-[12px] text-muted-foreground">연결된 기기가 없습니다.</p>
            ) : (
              <>
                {/* 분포 스트립 — 기기 하나 = 점 하나. 버킷으로 뭉개지 않아 임계 근처 밀집·이상치가 보인다 */}
                <div className="px-5 pt-4">
                  <div className="relative h-[62px] rounded-xl bg-page">
                    {WIFI_THRESHOLDS.map((v) => (
                      <span key={v} className="absolute inset-y-0 w-px bg-border-strong/70" style={{ left: `${wifiAxisPos(v) * 100}%` }}>
                        <span className="absolute left-1 top-1 whitespace-nowrap text-[10px] text-muted-foreground">{v}</span>
                      </span>
                    ))}
                    {plotted.map(({ item, level }) => (
                      <button
                        key={item.mac}
                        onClick={() => setSelectedDevice(item)}
                        title={`${item.alias || item.mac} · ${item.wifiRssi}dBm`}
                        aria-label={`${item.alias || item.mac} ${item.wifiRssi}dBm`}
                        /* 히트 영역은 24px(투명), 실제 마크는 9px — 9px 점은 정확히 못 누른다 */
                        className="group absolute -ml-3 -mb-3 flex h-6 w-6 items-center justify-center"
                        style={{ left: `${wifiAxisPos(item.wifiRssi ?? 0) * 100}%`, bottom: `${6 + level * 9}px` }}
                      >
                        {/* ring-page = 표면색 2px 링. 겹친 점끼리 서로를 먹지 않게 한다 */}
                        <span
                          className={`h-[9px] w-[9px] rounded-full ring-2 ring-page transition-transform group-hover:scale-150 ${
                            item.wifiSignal === 'WEAK' ? 'bg-warning' : item.wifiSignal === 'FAIR' ? 'bg-primary' : 'bg-success'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{WIFI_AXIS_MIN} dBm</span>
                    <span>약할수록 왼쪽</span>
                    <span>{WIFI_AXIS_MAX}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />강함 <b className="font-bold tabular-nums text-foreground">{wifi.strong}</b></span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />보통 <b className="font-bold tabular-nums text-foreground">{wifi.fair}</b></span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />약함 <b className="font-bold tabular-nums text-warning">{wifi.weak}</b></span>
                    {unplotted > 0 && <span className="ml-auto">RSSI 미수신 {unplotted}대</span>}
                  </div>
                </div>

                {/* 표 뷰 — 전체를 약한 순으로. 스트립의 초록·주황이 3:1 미만이라 값을 텍스트로도 읽을 수 있어야 한다 */}
                <div className="mt-3 border-t border-border">
                  <div className="flex items-center justify-between px-5 py-2">
                    <span className="text-[11px] text-muted-foreground">약한 순 · 전체 {wifi.connected}대</span>
                    {wifi.weak > 0 && <span className="text-[11px] text-muted-foreground">위 {wifi.weak}대가 약함</span>}
                  </div>
                  <div className="max-h-[128px] overflow-y-auto scrollbar-thin">
                    {sortedByRssi.map((d) => (
                      <button
                        key={d.mac}
                        onClick={() => setSelectedDevice(d)}
                        className="flex w-full items-center gap-2.5 px-5 py-1.5 text-left transition-colors hover:bg-page"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            d.wifiSignal === 'WEAK' ? 'bg-warning' : d.wifiSignal === 'FAIR' ? 'bg-primary' : 'bg-success'
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{d.alias || d.mac}</span>
                        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {d.wifiRssi != null ? `${d.wifiRssi} dBm` : '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardShell>

          {/* ② 텔레코일존별 요약 */}
          <CardShell
            icon={<Building2 className="h-4 w-4" />}
            title="텔레코일존별 요약"
            action={<LinkButton label="전체보기" onClick={() => navigate('/admin/telecoil-zones')} />}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="bg-page/50">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">텔레코일존</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">기기</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ minWidth: '132px' }}>가동률</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">장애</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">7일 과열</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {zoneRows.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-[12px] text-muted-foreground">텔레코일존이 없습니다.</td></tr>
                  )}
                  {zoneRows.map((z) => {
                    const pct = z.uptimePct
                    const bar = pct === null ? 'bg-border' : pct === 100 ? 'bg-success' : pct >= 80 ? 'bg-primary' : pct >= 60 ? 'bg-warning' : 'bg-destructive'
                    // 미충전 트랙은 채움과 같은 램프의 연한 단계 — 회색 트랙은 상태가 바 전체에서 안 읽힌다
                    const track = pct === null ? 'bg-border/40' : pct === 100 ? 'bg-success/15' : pct >= 80 ? 'bg-primary/15' : pct >= 60 ? 'bg-warning/15' : 'bg-destructive/15'
                    const pctText = pct === null ? 'text-muted-foreground' : pct === 100 ? 'text-success' : pct >= 80 ? 'text-primary' : pct >= 60 ? 'text-warning' : 'text-destructive'
                    return (
                      <tr
                        key={z.id ?? 'none'}
                        onClick={() => navigate('/admin/telecoil-zones')}
                        className="group cursor-pointer transition-colors hover:bg-main-blue-1/10"
                      >
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-semibold text-foreground">{z.name}</p>
                          {z.managerEmail && <p className="text-[11px] text-muted-foreground truncate">{z.managerEmail}</p>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-[13px] font-medium text-foreground tabular-nums">
                            {z.online}<span className="text-muted-foreground">/{z.total}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {pct === null ? (
                            <span className="text-[12px] text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className={`h-2 flex-1 overflow-hidden rounded-full ${track}`}>
                                <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-[11px] font-bold tabular-nums ${pctText}`}>{pct}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[13px] font-bold tabular-nums ${z.fault ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                            {z.fault || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[13px] font-bold tabular-nums ${z.overheat7d ? 'text-warning' : 'text-muted-foreground/50'}`}>
                            {z.overheat7d || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardShell>
        </div>

        {/* ══ Right column ══ */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* ③ 과열 — v2 다크 카드. 현재 > 7일 누적 > 요일 바 > 기기 위계 */}
          <div className="overflow-hidden rounded-2xl bg-[#26266B] text-white shadow-sm">
            {/* v2 질감 — 28px 그리드 + 하단 대각선 면 */}
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0 1px,transparent 1px 28px)' }} />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-white/5" style={{ clipPath: 'polygon(0 30%,100% 0,100% 100%,0 100%)' }} />
            <div className="relative flex items-center gap-2 border-b border-white/12 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Flame className={`h-4 w-4 ${hotNow ? 'text-red-300' : 'text-white/80'}`} />
              </div>
              <h3 className="text-[15px] font-bold">과열</h3>
              {hotNow > 0 ? (
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />발생 중
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />정상
                </span>
              )}
            </div>

            <div className="relative px-5 pb-5">
              {/* 현재 상태 박스 + 7일 누적 */}
              <div className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3.5 ${hotNow ? 'border-red-400/25 bg-red-500/15' : 'border-emerald-400/25 bg-emerald-400/10'}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hotNow ? 'bg-red-500/25' : 'bg-emerald-400/20'}`}>
                  {hotNow > 0 ? <Flame className="h-4 w-4 text-red-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold">{hotNow > 0 ? `지금 ${hotNow}대 과열 중` : '과열 중인 기기 없음'}</p>
                  <p className="text-[11px] text-white/50">가동 중인 {summary.online}대 기준 · 오프라인 기기의 마지막 값은 제외</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[28px] font-bold leading-none tabular-nums ${overheat.totalEvents > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                    {overheatQ.isLoading ? '—' : overheat.totalEvents}
                  </p>
                  <p className="mt-1 text-[10px] text-white/50">7일 누적</p>
                </div>
              </div>

              {/* 요일 미니 바 */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span>최근 7일 과열 기록</span>
                  <span className={`font-bold ${overheat.totalEvents > 0 ? 'text-red-300' : 'text-[#5EEAD4]'}`}>
                    {overheatQ.isLoading ? '—' : `${overheat.window.length ? `${overheat.window.length}대 · 약 ` : ''}${overheat.totalEvents}건`}
                  </span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {overheatDays.map((d, i) => (
                    <div key={i} className="flex-1">
                      <div
                        title={`${d.label} ${d.count}건`}
                        className={`relative h-[22px] overflow-hidden rounded-md ${
                          d.count >= 5
                            ? 'bg-red-500/80'
                            : d.count > 0
                              ? 'bg-red-400/50'
                              : d.isToday
                                ? 'bg-[rgba(52,211,153,0.28)] shadow-[inset_0_0_0_1.5px_#34D399]'
                                : 'bg-[rgba(52,211,153,0.18)]'
                        } ${d.isToday && d.count > 0 ? 'shadow-[inset_0_0_0_1.5px_#34D399]' : ''}`}
                      >
                        {d.isToday && (
                          <span aria-hidden className="hl-sweep absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        )}
                      </div>
                      <p className={`mt-1 text-center text-[10px] ${d.isToday ? 'font-bold text-[#5EEAD4]' : 'text-white/40'}`}>{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 기기 — 현재 과열 우선, 없으면 7일 내 최근 */}
              {overheatQ.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-white/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />이력 확인 중…
                </div>
              ) : hotNow > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {overheat.currentDevices.slice(0, 3).map((d) => (
                    <button
                      key={d.mac}
                      onClick={() => setSelectedDevice(d)}
                      className="flex w-full items-center gap-2 rounded-xl bg-red-500/20 px-3 py-2 text-left transition-colors hover:bg-red-500/30"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-red-200">{d.alias || d.mac}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-red-300" />
                    </button>
                  ))}
                </div>
              ) : overheat.window.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {overheat.window.slice(0, 3).map((o: OverheatDevice) => (
                    <button
                      key={o.mac}
                      onClick={() => openByMac(o.mac)}
                      className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-left transition-colors hover:bg-white/15"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-amber-300">{o.label}</span>
                        <span className="block text-[11px] text-white/50">약 {o.count}회 · {formatDateTime(o.lastAt)}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    </button>
                  ))}
                </div>
              ) : null}
              {overheatQ.truncated && (
                <p className="mt-2 text-[11px] text-amber-300">조회 상한에 걸려 일부가 빠졌습니다 — 표시된 대수는 하한입니다.</p>
              )}
            </div>
          </div>

          {/* ④ 알림 요약 */}
          <CardShell
            icon={<Bell className="h-4 w-4" />}
            iconCls={alertStats?.pending ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}
            title="알림 요약"
            action={<LinkButton label="알림센터" onClick={() => navigate('/admin/alerts')} />}
          >
            <div className="px-5 py-5">
              <div className="flex items-baseline gap-2.5">
                <span className={`text-[32px] font-bold leading-none ${alertStats?.pending ? 'text-destructive' : 'text-muted-foreground/70'}`}>
                  {alertStats?.pending ?? 0}
                </span>
                <span className="text-[13px] text-muted-foreground">건 미처리</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">오늘 발생</p>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-foreground">{alertStats?.today ?? 0}</p>
                </div>
                <div className="border-x border-border">
                  <p className="text-[11px] text-muted-foreground">전달됨</p>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-foreground">{alertStats?.forwarded ?? 0}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">종결</p>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-foreground">{alertStats?.dismissed ?? 0}</p>
                </div>
              </div>
              {firmware.outdated > 0 && (
                <button
                  onClick={() => navigate('/admin/firmware')}
                  className="mt-3 flex w-full items-center gap-2 rounded-xl bg-page px-3 py-2.5 text-left transition-colors hover:bg-main-blue-1/20"
                >
                  <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-[12px] text-muted-foreground">
                    펌웨어 구버전 <b className="font-bold text-foreground">{firmware.outdated}대</b>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </button>
              )}
            </div>
          </CardShell>

          {/* ⑥ 기기 배치 현황 */}
          <CardShell
            icon={<PackageSearch className="h-4 w-4" />}
            iconCls={pipeline.provisioning || pipeline.awaitingZone ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}
            title="기기 배치 현황"
            action={<LinkButton label="관리" onClick={() => navigate('/admin/hearing-loops')} />}
          >
            <div className="px-5 pb-2 pt-[18px]">
              {devicesLoading ? (
                <div className="flex items-center gap-2 pb-3 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />불러오는 중…
                </div>
              ) : (
                <>
                  <PipelineStep
                    label="프로비저닝 대기"
                    count={pipeline.provisioning}
                    dot="bg-warning ring-warning/15"
                    countCls="text-warning"
                    chipCls="bg-warning/10 text-warning"
                    devices={pipeline.provisioningDevices}
                    onSelect={setSelectedDevice}
                  />
                  <PipelineStep
                    label="존 배정 대기"
                    count={pipeline.awaitingZone}
                    dot="bg-primary ring-primary/15"
                    countCls="text-primary"
                    chipCls="bg-primary/10 text-primary"
                    devices={pipeline.awaitingZoneDevices}
                    onSelect={setSelectedDevice}
                  />
                  <PipelineStep
                    label="운영 중"
                    count={pipeline.operating}
                    dot="bg-success ring-success/15"
                    countCls="text-foreground"
                    last
                    note={
                      pipeline.provisioning === 0 && pipeline.awaitingZone === 0
                        ? `${summary.total}대 모두 등록·배정 완료`
                        : '존 배정 완료 · 정상 운영'
                    }
                  />
                </>
              )}
            </div>
          </CardShell>

          {/* ⑦ 브랜드 패널 (디자인 B) */}
          <BrandPanel footnote={`전체 ${summary.total}대 운영 중`} />
        </div>
      </div>

      {/* 지도 마커 '상세 보기' → 히어링루프 관리와 동일한 기기 상세 모달 */}
      {selectedDevice && (
        <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
    </div>
  )
}
