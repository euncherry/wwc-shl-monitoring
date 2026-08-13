import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  MapPin,
  ChevronRight,
  Flame,
  Bell,
  Wifi,
  PackageSearch,
  ArrowRight,
  Loader2,
  Shield,
} from 'lucide-react'

import bannerImg from '@/assets/banner-illustration.png'
import { useDevices } from '@/hooks/useDevices'
import { useZones } from '@/hooks/useZones'
import { useAlerts, useAlertThresholds } from '@/hooks/useAlerts'
import { useOverheatAlerts } from '@/hooks/useOverheatAlerts'
import { DeviceMap } from '@/components/map/DeviceMap'
import { DeviceDetailModal } from '@/pages/admin/hearing-loops'
import type { HearingLoop } from '@/types/device'
import {
  HOUR_MS,
  buildOverheatSummary,
  buildPipeline,
  buildZoneRows,
  summarizeDevices,
  summarizeFirmware,
  summarizeWifi,
  type OverheatDevice,
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

/* ══════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════ */

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [selectedDevice, setSelectedDevice] = useState<HearingLoop | null>(null)

  const { data: devices = [], isLoading: devicesLoading } = useDevices()
  const { data: zones = [] } = useZones()
  const { data: alertStats } = useAlerts({ limit: 1 })
  const { data: thresholds } = useAlertThresholds()
  const overheatQ = useOverheatAlerts()

  // 렌더마다 흔들리지 않도록 마운트 시점으로 고정
  const nowMs = useMemo(() => Date.now(), [])
  /** '확인 필요' 구간의 시작 — 백엔드 CONNECTION_LOST 임계(알림 설정에서 변경 가능)를 그대로 따른다 */
  const watchMs = (thresholds?.connection_lost_hours ?? 4) * HOUR_MS

  const summary = useMemo(() => summarizeDevices(devices, nowMs, watchMs), [devices, nowMs, watchMs])
  const wifi = useMemo(() => summarizeWifi(devices), [devices])
  const pipeline = useMemo(() => buildPipeline(devices), [devices])
  const firmware = useMemo(() => summarizeFirmware(devices), [devices])
  const overheat = useMemo(
    () => buildOverheatSummary(overheatQ.alerts, devices, nowMs),
    [overheatQ.alerts, devices, nowMs],
  )
  const zoneRows = useMemo(
    () => buildZoneRows(zones, devices, overheat, nowMs),
    [zones, devices, overheat, nowMs],
  )

  const openByMac = (mac: string) => {
    const d = devices.find((x) => x.mac === mac)
    if (d) setSelectedDevice(d)
  }

  const hotNow = overheat.currentDevices.length
  const watchHours = thresholds?.connection_lost_hours ?? 4

  return (
    <div className="space-y-6">

      {/* ─── Welcome Banner ─── */}
      <section
        className="relative overflow-hidden rounded-2xl px-5 py-6 sm:px-10 sm:py-[1.875rem]"
        style={{ background: 'color-mix(in srgb, #246BD1 20%, transparent)', minHeight: '11.75rem' }}
      >
        <div className="relative z-10 max-w-xl">
          <h2 className="text-[clamp(1.375rem,1.1rem+0.8vw,1.625rem)] font-bold text-[#1E293B] mb-2">
            환영합니다, 관리자님!
          </h2>
          <p className="text-[clamp(0.8125rem,0.75rem+0.25vw,0.875rem)] text-[#475569] leading-[1.7] max-w-[26rem]">
            전체 <b className="font-bold">{summary.total}대</b> 중{' '}
            <b className="font-bold">{summary.online}대</b>가 정상 가동 중입니다.
            <br />
            미처리 알림 <b className="font-bold">{alertStats?.pending ?? 0}건</b>
            {summary.buckets.fault > 0 && (
              <> · 24시간 이상 미연결 <b className="font-bold text-destructive">{summary.buckets.fault}대</b></>
            )}
          </p>
        </div>
        <div className="absolute right-6 bottom-0 hidden sm:flex items-end" style={{ width: 'clamp(14rem, 25vw, 18rem)' }}>
          <img src={bannerImg} alt="히어링 루프 모니터링 일러스트" className="w-full h-auto" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px] items-start">

        {/* ══ Left column ══ */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* ① 지도뷰 — 마커·지도는 그대로, 헤더에 요약 한 줄만 추가 */}
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
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
              <StatChip label="확인 필요" value={summary.buckets.watch} tone="warning" />
              <StatChip label="장애" value={summary.buckets.fault} tone="danger" />
              <StatChip label="미배정" value={summary.unassigned} />
              <span className="ml-auto text-[11px] text-muted-foreground">
                확인 필요 {watchHours}시간+ · 장애 24시간+ 미연결
              </span>
            </div>
            <DeviceMap devices={devices} onSelect={setSelectedDevice} heightClass="h-[400px]" />
          </div>

          {/* ⑤ Wi-Fi 신호 */}
          <CardShell
            icon={<Wifi className="h-4 w-4" />}
            title="Wi-Fi 신호"
            action={<span className="text-[11px] text-muted-foreground">연결된 {wifi.connected}대 기준</span>}
          >
            <div className="px-5 py-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-[26px] font-bold leading-none tabular-nums ${wifi.weak ? 'text-warning' : 'text-muted-foreground'}`}>
                  {wifi.weak}
                </span>
                <span className="text-[13px] text-muted-foreground">대 신호 약함</span>
              </div>
              {wifi.connected > 0 ? (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-border/40">
                    <div className="bg-success" style={{ width: `${(wifi.strong / wifi.connected) * 100}%` }} />
                    <div className="bg-primary" style={{ width: `${(wifi.fair / wifi.connected) * 100}%` }} />
                    <div className="bg-warning" style={{ width: `${(wifi.weak / wifi.connected) * 100}%` }} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />강함 <b className="font-bold text-foreground tabular-nums">{wifi.strong}</b></span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />보통 <b className="font-bold text-foreground tabular-nums">{wifi.fair}</b></span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />약함 <b className="font-bold text-warning tabular-nums">{wifi.weak}</b></span>
                  </div>
                  {wifi.weakDevices.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {wifi.weakDevices.slice(0, 6).map((d) => (
                        <button
                          key={d.mac}
                          onClick={() => setSelectedDevice(d)}
                          className="max-w-full truncate rounded-lg bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning transition-colors hover:bg-warning/20"
                        >
                          {d.alias || d.mac}
                          {d.wifiRssi != null && <span className="ml-1 font-normal opacity-70">{d.wifiRssi}dBm</span>}
                        </button>
                      ))}
                      {wifi.weakDevices.length > 6 && (
                        <span className="px-1 py-1 text-[11px] text-muted-foreground">외 {wifi.weakDevices.length - 6}대</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-muted-foreground">연결된 기기가 없습니다.</p>
              )}
            </div>
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
                              <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
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

          {/* ③ 과열 — 현재 > 24시간 > 7일 위계 */}
          <CardShell
            icon={<Flame className="h-4 w-4" />}
            iconCls={hotNow ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}
            title="과열"
            accent={hotNow > 0}
            action={
              hotNow > 0 ? (
                <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">발생 중</span>
              ) : (
                <span className="shrink-0 text-[11px] text-muted-foreground">지금 상태</span>
              )
            }
          >
            <div className="px-5 py-5">
              {/* 현재 — 가장 큰 층위 */}
              <div className="flex items-baseline gap-2.5">
                <span className={`text-[40px] font-bold leading-none tabular-nums ${hotNow ? 'text-destructive' : 'text-muted-foreground/70'}`}>
                  {hotNow}
                </span>
                <span className={`text-[13px] ${hotNow ? 'text-destructive' : 'text-muted-foreground'}`}>대 과열 중</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                가동 중인 {summary.online}대 기준 · 오프라인 기기의 마지막 값은 제외
              </p>

              {/* 이력 — 보조 층위 */}
              <div className="mt-4 flex gap-3 border-t border-border pt-4">
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground">최근 24시간</p>
                  <p className="mt-1 text-[17px] font-bold leading-none tabular-nums text-foreground">
                    {overheatQ.isLoading ? '—' : overheat.recent.length}
                    <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">대</span>
                  </p>
                </div>
                <div className="flex-1 border-l border-border pl-3">
                  <p className="text-[11px] text-muted-foreground">최근 7일</p>
                  <p className={`mt-1 text-[17px] font-bold leading-none tabular-nums ${overheat.window.length ? 'text-warning' : 'text-foreground'}`}>
                    {overheatQ.isLoading ? '—' : overheat.window.length}
                    <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">대</span>
                  </p>
                </div>
              </div>

              {/* 기기 — 현재 과열 우선, 없으면 7일 내 최근 */}
              {overheatQ.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />이력 확인 중…
                </div>
              ) : hotNow > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {overheat.currentDevices.slice(0, 3).map((d) => (
                    <button
                      key={d.mac}
                      onClick={() => setSelectedDevice(d)}
                      className="flex w-full items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-left transition-colors hover:bg-destructive/15"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-destructive">{d.alias || d.mac}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    </button>
                  ))}
                </div>
              ) : overheat.window.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {overheat.window.slice(0, 3).map((o: OverheatDevice) => (
                    <button
                      key={o.mac}
                      onClick={() => openByMac(o.mac)}
                      className="flex w-full items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-left transition-colors hover:bg-warning/15"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-warning">{o.label}</span>
                        <span className="block text-[11px] text-warning/70">약 {o.count}회 · {formatDateTime(o.lastAt)}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-warning" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-page px-3 py-2.5 text-[12px] text-muted-foreground">
                  최근 7일간 과열 기록이 없습니다.
                </p>
              )}
              {overheatQ.truncated && (
                <p className="mt-2 text-[11px] text-warning">조회 상한에 걸려 일부가 빠졌습니다 — 표시된 대수는 하한입니다.</p>
              )}
            </div>
          </CardShell>

          {/* ④ 알림 요약 */}
          <CardShell
            icon={<Bell className="h-4 w-4" />}
            iconCls={alertStats?.pending ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}
            title="알림 요약"
            action={<LinkButton label="알림센터" onClick={() => navigate('/admin/alerts')} />}
          >
            <div className="px-5 py-5">
              <div className="flex items-baseline gap-2.5">
                <span className={`text-[32px] font-bold leading-none tabular-nums ${alertStats?.pending ? 'text-destructive' : 'text-muted-foreground/70'}`}>
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
            <div className="px-5 py-5">
              {devicesLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />불러오는 중…
                </div>
              ) : pipeline.provisioning === 0 && pipeline.awaitingZone === 0 ? (
                <p className="rounded-xl bg-success/10 px-3 py-3 text-[12px] font-semibold text-success">
                  {summary.total}대 모두 AWS IoT 등록·존 배정 완료
                </p>
              ) : (
                <>
                  <div className="flex items-stretch gap-1.5 text-center">
                    <div className="flex-1 rounded-xl bg-warning/10 px-2 py-3">
                      <p className="text-[19px] font-bold leading-none tabular-nums text-warning">{pipeline.provisioning}</p>
                      <p className="mt-1.5 text-[11px] leading-tight text-warning/80">프로비저닝<br />대기</p>
                    </div>
                    <div className="flex items-center"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" /></div>
                    <div className="flex-1 rounded-xl bg-primary/10 px-2 py-3">
                      <p className="text-[19px] font-bold leading-none tabular-nums text-primary">{pipeline.awaitingZone}</p>
                      <p className="mt-1.5 text-[11px] leading-tight text-primary/80">존 배정<br />대기</p>
                    </div>
                    <div className="flex items-center"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" /></div>
                    <div className="flex-1 rounded-xl bg-page px-2 py-3">
                      <p className="text-[19px] font-bold leading-none tabular-nums text-foreground">{pipeline.operating}</p>
                      <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">운영 중</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    {pipeline.provisioning > 0
                      ? `서버 등록은 됐지만 아직 한 번도 연결되지 않은 기기가 ${pipeline.provisioning}대 있습니다.`
                      : `AWS IoT 등록은 ${summary.total}대 모두 완료됐습니다.`}
                  </p>
                  {[...pipeline.provisioningDevices, ...pipeline.awaitingZoneDevices].slice(0, 3).length > 0 && (
                    <div className="mt-2.5 space-y-1">
                      {[...pipeline.provisioningDevices, ...pipeline.awaitingZoneDevices].slice(0, 3).map((d) => (
                        <button
                          key={d.mac}
                          onClick={() => setSelectedDevice(d)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-page"
                        >
                          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{d.alias || d.mac}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            d.provisionStatus === 'PENDING' ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'
                          }`}>
                            {d.provisionStatus === 'PENDING' ? '프로비저닝' : '존 배정'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardShell>
        </div>
      </div>

      {/* 지도 마커 '상세 보기' → 히어링루프 관리와 동일한 기기 상세 모달 */}
      {selectedDevice && (
        <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
    </div>
  )
}
