import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radio,
  Bell,
  CheckCircle,
  ChevronRight,
  LifeBuoy,
  Loader2,
  AlertCircle,
  MapPin,
  Flame,
  Wifi,
} from 'lucide-react'

import { DashboardBanner, BannerButton } from '@/components/dashboard/DashboardBanner'
import { BrandPanel } from '@/components/dashboard/BrandPanel'
import { useDevices } from '@/hooks/useDevices'
import { useMyAlerts } from '@/hooks/useAlerts'
import { useAuthStore } from '@/stores/authStore'
import { summarizeUserDevices, summarizeMyAlerts, userMapStatus } from '@/lib/userDashboard'
import { DeviceMap } from '@/components/map/DeviceMap'
import { displayTitle, userChipProps, type ChipProps, type Tone } from '@/components/device/UserDeviceCard'
import { ALERT_PRIORITY_LABEL, ALERT_TYPE_LABEL, type AlertPriorityEnum } from '@/types/alert'
import { formatKst, formatKstTime, kstDayStartMs, toMs, kstBannerDate } from '@/lib/kst'
import {
  overheatDayBuckets,
  summarizeWifi,
  stackDots,
  wifiAxisPos,
  WIFI_AXIS_MIN,
  WIFI_AXIS_MAX,
  WIFI_THRESHOLDS,
} from '@/lib/dashboard'
import { deriveUserStatus } from '@/lib/userDeviceDisplay'
import type { HearingLoop } from '@/types/device'
import { SUPPORT_CONTACT } from '@/lib/support'

/* ══════════════════════════════════════════════════════
   사용자 대시보드 — 관리자 대시보드와 같은 레이아웃 골격을 쓴다.
   배너 → grid[1fr_400px] · 좌(지도·Wi-Fi·지원) / 우(확인 필요·과열·알림·브랜드)
   지도 위에 KPI 카드를 따로 얹지 않고, 관리자처럼 헤더 칩 스트립으로 요약한다.

   데이터: GET /devices(소속 기기 자동 필터) + GET /alerts/my(전달된 알림만).
   상태·비율 판정은 전부 lib/userDashboard → userDeviceDisplay 정책을 따른다.
   ══════════════════════════════════════════════════════ */

const PRIORITY_STYLE: Record<AlertPriorityEnum, { box: string; dot: string; text: string }> = {
  CRITICAL: { box: 'bg-destructive/5 border-destructive/15', dot: 'bg-destructive', text: 'text-destructive' },
  WARNING: { box: 'bg-warning/5 border-warning/15', dot: 'bg-warning', text: 'text-warning' },
  INFO: { box: 'bg-primary/5 border-primary/15', dot: 'bg-primary', text: 'text-primary' },
}

/** 기기 요약 아이콘 색 — 기기 카드 칩(TONE)에서 배경을 뺀 글자색만 */
const ICON_TONE: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
  info: 'text-primary',
}

/** 기기 요약 정렬용 — WiFi 칩 색이 좋은 순 */
const WIFI_RANK: Record<Tone, number> = { success: 0, info: 1, warning: 2, muted: 3, destructive: 4 }

/* ── 조각 컴포넌트 — 관리자 대시보드와 같은 규격 ────────── */

function StatChip({
  label,
  value,
  tone = 'muted',
}: {
  label: string
  value: number | string
  tone?: 'muted' | 'success' | 'warning' | 'danger'
}) {
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

function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary transition-colors hover:text-primary-dark"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  )
}

/** 카드 껍데기 — 관리자 CardShell과 같은 형태(헤더 + 본문) */
function CardShell({
  icon,
  iconCls = 'bg-primary/10 text-primary',
  title,
  action,
  children,
}: {
  icon: React.ReactNode
  iconCls?: string
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls}`}>{icon}</div>
        <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  )
}

/** 상태 칩을 아이콘 하나로 압축한 것 — 값은 title/aria-label로만 읽힌다.
 *  기기 카드(userChipProps)와 같은 톤 규격을 쓰므로 목록↔카드 사이에 색이 어긋나지 않는다. */
function IconStat({ chip }: { chip: ChipProps }) {
  return (
    <span
      title={`${chip.label} · ${chip.value}`}
      aria-label={`${chip.label} ${chip.value}`}
      className={`flex w-7 shrink-0 justify-center ${ICON_TONE[chip.tone]}`}
    >
      {chip.icon}
    </span>
  )
}

/** 기기 요약 한 줄 — 기기명 + 동작·WiFi 아이콘 둘.
 *  구분선 방식은 Wi-Fi 신호 목록과 같은 규격으로 맞췄다. */
function DeviceSummaryRow({ device, onClick }: { device: HearingLoop; onClick: () => void }) {
  const chips = userChipProps(device)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 border-b border-border/60 px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-page"
    >
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground">
        {displayTitle(device)}
      </span>
      <IconStat chip={chips.operation} />
      <IconStat chip={chips.wifi} />
    </button>
  )
}

/** '도움이 필요하신가요' 자가진단 단계 카드 — 1·2단계(회색) 공통 */
function HelpStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[#EDF1F6] bg-[#FAFBFD] px-[13px] py-3">
      <div className="mb-[5px] flex items-center gap-[7px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF1FC] text-[10px] font-extrabold text-[#1D5BB8]">
          {n}
        </span>
        <p className="truncate text-[12px] font-extrabold text-foreground">{title}</p>
      </div>
      <p className="text-[11px] leading-[1.5] text-[#8794A6]">{desc}</p>
    </div>
  )
}

/** 단계 사이 화살표 — 좁아지면(2열 미만) 숨긴다 */
function StepArrow() {
  return (
    <span aria-hidden className="hidden shrink-0 self-center sm:block">
      <ChevronRight className="h-[13px] w-[13px] text-[#B9C2CE]" />
    </span>
  )
}

/* ══════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════ */

export default function UserDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { data: devices = [], isLoading, isError } = useDevices()
  /* 전달된 알림은 드물어 페이지 하나면 충분하다. '오늘 N건'은 이 페이지 안에서만 센다(응답에 통계 없음). */
  const alertsQ = useMyAlerts({ limit: 50 })
  /* 과열 요일 바 — 전달받은 과열 알림으로 7일 창을 그린다. limit 100은 백엔드 하드캡. */
  const overheatQ = useMyAlerts({ type: 'TEMPERATURE_ANOMALY', limit: 100 })

  // 렌더마다 흔들리지 않도록 마운트 시점으로 고정 (관리자 대시보드와 동일)
  const [nowMs] = useState(() => Date.now())
  const summary = useMemo(() => summarizeUserDevices(devices), [devices])
  const alerts = useMemo(() => summarizeMyAlerts(alertsQ.data?.items ?? [], nowMs), [alertsQ.data, nowMs])
  const overheatDays = useMemo(
    () => overheatDayBuckets(overheatQ.data?.items ?? [], nowMs),
    [overheatQ.data, nowMs],
  )
  const overheatWeekTotal = useMemo(() => overheatDays.reduce((n, d) => n + d.count, 0), [overheatDays])
  const wifi = useMemo(() => summarizeWifi(devices), [devices])
  const wifiPlotted = useMemo(() => {
    const withRssi = devices
      .filter((d) => d.connectionStatus !== 'OFFLINE' && d.wifiRssi != null)
      .sort((a, b) => (a.wifiRssi ?? 0) - (b.wifiRssi ?? 0))
    return stackDots(withRssi, (d) => d.wifiRssi ?? 0)
  }, [devices])
  /* 신호 강한 순. RSSI가 없는 기기는 방향과 무관하게 늘 맨 아래로 보낸다
     (0으로 두면 내림차순에서 '가장 강함'으로 올라온다). */
  const sortedByRssi = useMemo(
    () =>
      devices
        .filter((d) => d.connectionStatus !== 'OFFLINE')
        .sort((a, b) => (b.wifiRssi ?? -Infinity) - (a.wifiRssi ?? -Infinity)),
    [devices],
  )

  /** 배너 eyebrow — 소속 기기 중 마지막 보고 시각 */
  const lastSeenLabel = useMemo(() => {
    const times = devices.map((d) => (d.lastUpdated ? toMs(d.lastUpdated) : 0)).filter((t) => t > 0)
    return times.length ? formatKstTime(Math.max(...times)) : '—'
  }, [devices])

  /* 기기 요약 카드에 올릴 목록 — 정상 동작 중인 것만 4대. 전수 확인이 아니라 '잘 돌고 있다'는 표본이라 짧게 끊는다.
     같은 '정상' 안에서도 WiFi가 온전한 기기를 앞에 세운다(소등 4h 경과분은 WiFi가 회색 '끊김'으로 뜬다). */
  const healthy = useMemo(
    () =>
      devices
        .filter((d) => deriveUserStatus(d) === 'normal')
        .map((d) => ({ d, rank: WIFI_RANK[userChipProps(d).wifi.tone] }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 4)
        .map((x) => x.d),
    [devices],
  )

  const zoneName = user?.zoneName ?? devices[0]?.telecoilZoneName ?? '우리 기관'
  const goDevices = () => navigate('/user/hearing-loops')

  return (
    <div className="space-y-6">
      {/* ─── Welcome Banner (v2) ─── */}
      <DashboardBanner
        eyebrow={`${kstBannerDate(nowMs)} · 마지막 수신 ${lastSeenLabel}`}
        title={`안녕하세요, ${user?.name ?? zoneName}님`}
        description={
          <>
            {zoneName}에 설치된 <b className="font-bold">{summary.total}대</b> 중{' '}
            <b className="font-bold text-[#0E9F6E]">{summary.normal}대</b>가 정상 동작 중입니다.
            {summary.attention.length > 0 ? (
              <>
                {' '}확인이 필요한 기기가{' '}
                <b className="font-bold text-destructive">{summary.attention.length}대</b> 있습니다.
              </>
            ) : (
              alerts.todayCount > 0 && (
                <> 오늘 전달받은 알림이 <b className="font-bold">{alerts.todayCount}건</b> 있습니다.</>
              )
            )}
          </>
        }
        actions={
          <>
            <BannerButton onClick={goDevices}>
              기기 상태 보기 <ChevronRight className="h-3.5 w-3.5" />
            </BannerButton>
            <BannerButton variant="outline" onClick={() => navigate('/user/support')}>
              사용 가이드
            </BannerButton>
          </>
        }
        stats={[
          { label: 'DEVICES', value: summary.total },
          { label: 'NORMAL', value: summary.normal, tone: 'success' },
          { label: 'OFFLINE', value: summary.disconnected, tone: 'danger' },
          { label: 'ALERTS', value: alerts.todayCount, tone: 'primary' },
        ]}
        tickerRight={`${zoneName} · KST ${formatKstTime(nowMs)}`}
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-20 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p className="text-[14px] font-semibold text-muted-foreground">불러오는 중…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-20 shadow-sm">
          <AlertCircle className="h-10 w-10 text-destructive/40" />
          <p className="text-[14px] font-semibold text-destructive">기기 정보를 불러오지 못했습니다</p>
        </div>
      ) : summary.total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-20 shadow-sm">
          <Radio className="h-10 w-10 text-muted-foreground/20" />
          <p className="text-[14px] font-semibold text-muted-foreground">
            소속 기관에 등록된 히어링루프가 없습니다
          </p>
          <p className="text-[12px] text-muted-foreground">기기 등록은 관리자에게 문의해 주세요.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* ══ Left column ══ */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* ① 설치 지도 — 관리자 지도뷰와 같은 골격. KPI는 헤더 칩 스트립으로 */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-[15px] font-bold text-foreground">우리 기관 설치 지도</h3>
                  <span className="text-[12px] text-muted-foreground">{zoneName}</span>
                </div>
                <LinkButton label="전체 기기 보기" onClick={goDevices} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border bg-page/40 px-6 py-2.5">
                <StatChip label="전체" value={summary.total} />
                <StatChip label="정상" value={summary.normal} tone="success" />
                <StatChip label="경고" value={summary.warning} tone="warning" />
                <StatChip label="연결 끊김" value={summary.disconnected} tone="danger" />
                <StatChip
                  label="정상률"
                  value={`${summary.normalPct}%`}
                  tone={summary.normalPct === 100 ? 'success' : summary.normalPct >= 80 ? 'muted' : 'danger'}
                />
                <span className="ml-auto text-[11px] text-muted-foreground">
                  48시간 미만 꺼짐은 정상으로 집계(일과 후 소등·주말 휴관 포함)
                </span>
              </div>
              <DeviceMap
                devices={devices}
                onSelect={goDevices}
                statusOf={userMapStatus}
                legend={{ online: '정상', offline: '연결 끊김' }}
                emptyHint="설치 좌표가 등록된 기기가 없습니다 — 관리자에게 문의해 주세요"
                className="flex min-h-0 flex-1 flex-col"
                /* 우측 열 높이에 맞춰 늘거나 준다. 단일 열(xl 미만)에선 늘 자리가 없어 하한값이 곧 높이 */
                heightClass="min-h-[420px] flex-1 xl:min-h-[320px]"
              />
            </div>

            {/* ② Wi-Fi 신호 — 관리자 위젯과 같은 규격 */}
            <CardShell
              icon={<Wifi className="h-4 w-4" />}
              iconCls={wifi.weak ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}
              title="Wi-Fi 신호"
              action={
                <span className="shrink-0 text-[11px] text-muted-foreground">연결된 {wifi.connected}대 기준</span>
              }
            >
              {wifi.connected === 0 ? (
                <p className="px-5 py-6 text-[12px] text-muted-foreground">연결된 기기가 없습니다.</p>
              ) : (
                <>
                  {/* 분포 스트립 — 기기 하나 = 점 하나 */}
                  <div className="px-5 pt-4">
                    <div className="relative h-[62px] rounded-xl bg-page">
                      {WIFI_THRESHOLDS.map((v) => (
                        <span
                          key={v}
                          className="absolute inset-y-0 w-px bg-border-strong/70"
                          style={{ left: `${wifiAxisPos(v) * 100}%` }}
                        >
                          <span className="absolute left-1 top-1 whitespace-nowrap text-[10px] text-muted-foreground">
                            {v}
                          </span>
                        </span>
                      ))}
                      {wifiPlotted.map(({ item, level }) => (
                        <button
                          key={item.mac}
                          onClick={goDevices}
                          title={`${item.alias || item.mac} · ${item.wifiRssi}dBm`}
                          aria-label={`${item.alias || item.mac} ${item.wifiRssi}dBm`}
                          className="group absolute -mb-3 -ml-3 flex h-6 w-6 items-center justify-center"
                          style={{
                            left: `${wifiAxisPos(item.wifiRssi ?? 0) * 100}%`,
                            bottom: `${6 + level * 9}px`,
                          }}
                        >
                          <span
                            className={`h-[9px] w-[9px] rounded-full ring-2 ring-page transition-transform group-hover:scale-150 ${
                              item.wifiSignal === 'WEAK'
                                ? 'bg-warning'
                                : item.wifiSignal === 'FAIR'
                                  ? 'bg-primary'
                                  : 'bg-success'
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
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        강함 <b className="font-bold tabular-nums text-foreground">{wifi.strong}</b>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        보통 <b className="font-bold tabular-nums text-foreground">{wifi.fair}</b>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-warning" />
                        약함 <b className="font-bold tabular-nums text-warning">{wifi.weak}</b>
                      </span>
                    </div>
                  </div>

                  {/* 표 뷰 — 전체를 강한 순으로 */}
                  <div className="mt-3 border-t border-border">
                    <div className="flex items-center justify-between px-5 py-2">
                      <span className="text-[11px] text-muted-foreground">강한 순 · 전체 {wifi.connected}대</span>
                      {wifi.weak > 0 && (
                        <span className="text-[11px] text-muted-foreground">아래 {wifi.weak}대가 약함</span>
                      )}
                    </div>
                    <div className="max-h-[128px] overflow-y-auto scrollbar-thin">
                      {sortedByRssi.map((d) => (
                        <button
                          key={d.mac}
                          onClick={goDevices}
                          className="flex w-full items-center gap-2.5 px-5 py-1.5 text-left transition-colors hover:bg-page"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              d.wifiSignal === 'WEAK'
                                ? 'bg-warning'
                                : d.wifiSignal === 'FAIR'
                                  ? 'bg-primary'
                                  : 'bg-success'
                            }`}
                          />
                          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                            {d.alias || d.mac}
                          </span>
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

            {/* ③ 도움이 필요하신가요 — Wi-Fi 아래. 좌측 열이 넓어 안내 문구 옆에 연락처 두 장을 나란히 둔다 */}
            <CardShell
              icon={<LifeBuoy className="h-4 w-4" />}
              title="도움이 필요하신가요?"
              action={<LinkButton label="사용 가이드 보기" onClick={() => navigate('/user/support')} />}
            >
              {/* 자가진단 3단계 — 전원 → 와이파이 → 문의. 좁아지면 세로로 쌓인다 */}
              <div className="flex flex-col items-stretch gap-2 px-6 pb-[18px] pt-4 sm:flex-row">
                <HelpStep n={1} title="전원·콘센트 확인" desc="경고·연결 끊김 대부분은 전원 문제" />
                <StepArrow />
                <HelpStep n={2} title="와이파이 확인" desc="공유기 전원·신호 세기 확인" />
                <StepArrow />

                {/* 3 — 문의. 마지막 단계라 살짝 강조(파란 톤 + 남색 배지) */}
                <div className="min-w-0 flex-1 rounded-xl border border-[#DDE6F2] bg-[#F5F8FD] px-[13px] py-3 sm:flex-[1.3]">
                  <div className="mb-[5px] flex items-center gap-[7px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-dark text-[10px] font-extrabold text-white">
                      3
                    </span>
                    <p className="truncate text-[12px] font-extrabold text-foreground">해결되지 않으면 문의</p>
                  </div>
                  <a
                    href={`tel:${SUPPORT_CONTACT.phone}`}
                    className="block text-[12px] font-extrabold tabular-nums text-[#132B52] transition-colors hover:text-primary"
                  >
                    {SUPPORT_CONTACT.phone}
                    <span className="ml-1 text-[10.5px] font-normal text-[#8794A6]">{SUPPORT_CONTACT.phoneHours}</span>
                  </a>
                  <a
                    href={`mailto:${SUPPORT_CONTACT.email}`}
                    className="mt-0.5 block truncate text-[10.5px] text-[#5C6B80] transition-colors hover:text-primary"
                  >
                    {SUPPORT_CONTACT.email}
                  </a>
                </div>
              </div>
            </CardShell>
          </div>

          {/* ══ Right column ══ */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* ① 기기 요약 — 정상 동작 중인 기기만 추려 동작·WiFi 아이콘으로 보여준다.
                조치가 필요한 기기는 여기 올리지 않는다(사용자 페이지 표시 정책). */}
            <CardShell
              icon={<Radio className="h-4 w-4" />}
              iconCls="bg-success/10 text-success"
              title="기기 요약"
              action={<LinkButton label={`전체 ${summary.total}대 보기`} onClick={goDevices} />}
            >
              {healthy.length === 0 ? (
                <p className="px-5 py-6 text-[12px] text-muted-foreground">
                  정상 동작 중인 기기가 없습니다.
                </p>
              ) : (
                <div className="py-2">
                  {healthy.map((d) => (
                    <DeviceSummaryRow key={d.id} device={d} onClick={goDevices} />
                  ))}
                  {summary.normal > healthy.length && (
                    <p className="px-5 pb-1 pt-3 text-[11px] text-muted-foreground">
                      외 {summary.normal - healthy.length}대
                    </p>
                  )}
                </div>
              )}
            </CardShell>

            {/* ② 과열 — v2 다크 카드 */}
            <div className="relative overflow-hidden rounded-2xl bg-[#26266B] text-white shadow-sm">
              {/* v2 질감 — 28px 그리드 + 하단 대각선 면 */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0 1px,transparent 1px 28px)',
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-white/5"
                style={{ clipPath: 'polygon(0 30%,100% 0,100% 100%,0 100%)' }}
              />
              <div className="relative flex items-center gap-2.5 border-b border-white/12 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Flame className={`h-4 w-4 ${summary.warning > 0 ? 'text-red-300' : 'text-white/80'}`} />
                </div>
                <h3 className="text-[15px] font-bold">과열</h3>
                {summary.warning > 0 ? (
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    {summary.warning}대 과열
                  </span>
                ) : (
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    정상
                  </span>
                )}
              </div>

              <div className="relative px-5 pb-5">
                <div
                  className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3.5 ${
                    summary.warning > 0
                      ? 'border-red-400/25 bg-red-500/15'
                      : 'border-emerald-400/25 bg-emerald-400/10'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      summary.warning > 0 ? 'bg-red-500/25' : 'bg-emerald-400/20'
                    }`}
                  >
                    {summary.warning > 0 ? (
                      <Flame className="h-4 w-4 text-red-300" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold">
                      {summary.warning > 0 ? `지금 ${summary.warning}대 과열 중` : '과열 중인 기기 없음'}
                    </p>
                    <p className="text-[11px] text-white/50">소속 {summary.total}대 기준</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-[28px] font-bold leading-none tabular-nums ${
                        overheatWeekTotal > 0 ? 'text-red-300' : 'text-emerald-300'
                      }`}
                    >
                      {overheatQ.isLoading ? '—' : overheatWeekTotal}
                    </p>
                    <p className="mt-1 text-[10px] text-white/50">7일 누적</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>최근 7일 과열 기록</span>
                    <span className={`font-bold ${overheatWeekTotal > 0 ? 'text-red-300' : 'text-[#5EEAD4]'}`}>
                      {overheatQ.isLoading ? '—' : `${overheatWeekTotal}건`}
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
                            <span
                              aria-hidden
                              className="hl-sweep absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            />
                          )}
                        </div>
                        <p
                          className={`mt-1 text-center text-[10px] ${
                            d.isToday ? 'font-bold text-[#5EEAD4]' : 'text-white/40'
                          }`}
                        >
                          {d.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ③ 전달받은 알림 */}
            <CardShell
              icon={<Bell className="h-4 w-4" />}
              iconCls={alerts.todayCritical > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
              title="전달받은 알림"
              action={
                <span
                  className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-[12px] font-bold ${
                    alerts.todayCount > 0 ? 'bg-warning/10 text-warning' : 'bg-page text-muted-foreground'
                  }`}
                >
                  오늘 {alerts.todayCount}
                </span>
              }
            >
              <div className="p-5">
                {alertsQ.isLoading ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                  </div>
                ) : alerts.recent.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Bell className="h-7 w-7 text-muted-foreground/20" />
                    <p className="text-[13px] text-muted-foreground">전달받은 알림이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.recent.map((a) => {
                      const st = PRIORITY_STYLE[a.priority]
                      const ms = toMs(a.occurred_at)
                      const isToday = ms >= kstDayStartMs(nowMs)
                      return (
                        <div
                          key={a.id}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-[12px] ${st.box}`}
                        >
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground">{ALERT_TYPE_LABEL[a.type]}</p>
                              <span className={`text-[10px] font-bold ${st.text}`}>
                                {ALERT_PRIORITY_LABEL[a.priority]}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-muted-foreground">
                              {a.device ? `${a.device.alias || a.device.mac_address} · ` : ''}
                              {a.message}
                            </p>
                          </div>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {isToday ? formatKstTime(ms) : formatKst(ms)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground">
                  관리자가 기관으로 전달한 알림만 표시됩니다.
                </p>
              </div>
            </CardShell>

            {/* ④ 브랜드 패널 (디자인 B) */}
            <BrandPanel footnote={`${zoneName} ${summary.total}대 운영 중`} />
          </div>
        </div>
      )}
    </div>
  )
}
