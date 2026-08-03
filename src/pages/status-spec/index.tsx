import { createElement, type ReactNode } from 'react'
import { Radio, Info, ShieldCheck, Clock, Building2 } from 'lucide-react'
import type {
  DeviceApiResponse,
  ConnectionStatus,
  WifiSignal,
  ProvisionStatus,
  HearingLoop,
} from '@/types/device'
import { toHearingLoop } from '@/lib/deviceMapper'
import { UserDeviceCard, StatusChip, userChipProps } from '@/components/device/UserDeviceCard'
import {
  AdminDeviceTableHead,
  AdminDeviceTableRow,
  AdminDeviceMobileCard,
  PowerIcon,
} from '@/components/device/AdminDeviceRow'
import { WifiSignalIcon, WIFI_SIGNAL_LABEL } from '@/components/WifiSignalIcon'
import { connectionMeta } from '@/lib/connectionStatus'
import {
  deriveUserStatus,
  isSoftOff,
  isWifiCut,
  DISCONNECT_ALERT_MS,
  WIFI_CUT_SHOW_MS,
} from '@/lib/userDeviceDisplay'
import { useDevices } from '@/hooks/useDevices'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/lib/format'

/* ══════════════════════════════════════════════════════
   표시 규격 실증 페이지 (/status-spec)

   시험성적서 `docs/시험성적서-표시규격.md` 에 기재한 표시 규격이
   실제 화면에서 그대로 구현되었음을 확인하기 위한 페이지.
   - 메뉴에 노출되지 않으며 URL 직접 입력으로만 접근한다(가드 밖 공개 라우트).
   - 관리자 뷰와 사용자(기관) 뷰를 나란히 배치해 동일 상태에서의 표시 차이를 대조한다.
   - 화면은 전부 **프로덕션 컴포넌트**(AdminDeviceRow / UserDeviceCard)와
     **프로덕션 매퍼**(toHearingLoop)를 그대로 사용한다. 데모용 마크업 재작성 금지 —
     재작성하면 실제 화면과 달라져 증빙 가치가 사라진다.
   - 예시 데이터는 임계값 동작 확인용 가상 데이터이며, 화면에 그 사실을 명시한다.
   ══════════════════════════════════════════════════════ */

const HOUR = 60 * 60 * 1000
const MINUTE = 60 * 1000

/* ── 예시(가상) 기기 생성 ──
   손으로 HearingLoop 뷰모델을 만들면 실제 파생 로직을 우회하게 되므로,
   가짜 DeviceApiResponse(백엔드 응답 형태)를 만들어 **프로덕션 매퍼 toHearingLoop()** 에 통과시킨다.
   → 매핑 파이프라인(deriveStatus·power 파생 포함)까지 함께 증명된다. */

interface FixtureSpec {
  id: number
  mac: string
  alias?: string | null
  zoneName?: string | null
  connection: ConnectionStatus
  /** 미연결 지속 시간(ms). null이면 연결 중 */
  offlineFor?: number | null
  wifi?: WifiSignal
  rssi?: number | null
  /** 과열 경보(last_gpio_state) */
  gpio?: boolean
  provision?: ProvisionStatus
  wifiFw?: string
  hlFw?: string
}

function makeFixture(spec: FixtureSpec, now: number): HearingLoop {
  const offline = spec.connection === 'OFFLINE'
  const since = spec.offlineFor != null ? new Date(now - spec.offlineFor).toISOString() : null
  /* disconnected_at 과 last_seen_at 을 같은 시각으로 둔다 —
     백엔드가 disconnected_at 을 노출하기 전(last_seen_at 인터림)과 노출한 후 모두
     동일한 단계로 판정되어, 어느 쪽이든 이 실증 결과가 유효하다. */
  const dto: DeviceApiResponse = {
    id: spec.id,
    mac_address: spec.mac,
    zone_id: spec.zoneName ? 1 : null,
    alias: spec.alias ?? null,
    status: spec.provision ?? 'ACTIVE',
    registered_at: new Date(now - 30 * 24 * HOUR).toISOString(),
    last_gpio_state: spec.gpio ?? false,
    last_temperature: null,
    last_seen_at: since ?? new Date(now - 3 * MINUTE).toISOString(),
    disconnected_at: since,
    firmware: null,
    wifi_firmware_version: spec.wifiFw ?? '3.1.0',
    hl_firmware_version: spec.hlFw ?? '1.5.0',
    connection_status: spec.connection,
    wifi_signal: offline ? 'DISCONNECTED' : (spec.wifi ?? 'FAIR'),
    wifi_rssi_dbm: offline ? null : (spec.rssi ?? -60),
    firmware_inconsistent: false,
    zone: spec.zoneName ? { id: 1, name: spec.zoneName, created_at: new Date(now).toISOString() } : null,
    created_at: new Date(now - 30 * 24 * HOUR).toISOString(),
  }
  return toHearingLoop(dto)
}

/** 미연결 지속 시간을 사람이 읽는 형태로 */
function humanDuration(ms: number | null | undefined): string {
  if (ms == null) return '연결 중'
  const h = Math.floor(ms / HOUR)
  const m = Math.round((ms % HOUR) / MINUTE)
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/* ── 검증 항목 태그 ──
   시험성적서의 세 항목(① 전원 / ② 기기 동작 / ③ 네트워크)과 각 섹션을 연결한다.
   섹션은 A~F로 매기고 항목 번호는 ①②③ — 성적서 번호와 헷갈리지 않게 구분한다. */

type SpecItem = 'power' | 'operation' | 'network'

const SPEC_ITEM: Record<SpecItem, { no: string; label: string; cls: string }> = {
  power: { no: '①', label: '전원 상태', cls: 'bg-success/10 text-success' },
  operation: { no: '②', label: '기기 동작', cls: 'bg-primary/10 text-primary' },
  network: { no: '③', label: '네트워크(Wi-Fi)', cls: 'bg-warning/10 text-warning' },
}

const ALL_ITEMS: SpecItem[] = ['power', 'operation', 'network']

function SpecTags({ items, compact }: { items: SpecItem[]; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'mt-3'}`}>
      <span className="text-[11px] font-semibold text-muted-foreground">검증 항목</span>
      {items.map((k) => {
        const m = SPEC_ITEM[k]
        return (
          <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${m.cls}`}>
            {m.no} {m.label}
          </span>
        )
      })}
    </div>
  )
}

/* ── 레이아웃 조각 ── */

function Section({ n, title, items, desc, children }: { n: string; title: string; items: SpecItem[]; desc?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-5 border-b border-border pb-4">
        <h2 className="flex items-center gap-2 text-[17px] font-black text-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">{n}</span>
          {title}
        </h2>
        {desc && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{desc}</p>}
        <SpecTags items={items} />
      </div>
      {children}
    </section>
  )
}

/* ── 항목별 표시 정책 (성적서 기재 내용 ↔ 실제 렌더 대조) ── */

/** 관리자 페이지에서 해당 항목이 실제로 어떻게 보이는지 (모바일 카드 칩과 동일 표기) */
function AdminItemView({ item, device }: { item: SpecItem; device: HearingLoop }) {
  if (item === 'power') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-page/50 px-2 py-1 text-[11px]">
        <PowerIcon on={device.power} />
        <span className="font-semibold text-foreground">{device.power ? 'ON' : 'OFF'}</span>
      </span>
    )
  }
  if (item === 'operation') {
    const m = connectionMeta(device.connectionStatus)
    return (
      <span className="inline-flex items-center gap-1.5">
        {createElement(m.Icon, { className: `h-4 w-4 ${m.color}` })}
        <span className={`text-[11px] font-bold ${m.color}`}>{m.label}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-page/50 px-2 py-1 text-[11px]">
      <WifiSignalIcon signal={device.wifiSignal} />
      <span className="font-semibold text-foreground">{WIFI_SIGNAL_LABEL[device.wifiSignal]}</span>
      {device.wifiRssi != null && <span className="tabular-nums text-muted-foreground">{device.wifiRssi}dBm</span>}
    </span>
  )
}

/** 사용자 페이지에서 해당 항목이 실제로 어떻게 보이는지 (카드 칩 그대로) */
function UserItemView({ item, device }: { item: SpecItem; device: HearingLoop }) {
  const c = userChipProps(device)
  const chip = item === 'power' ? c.power : item === 'operation' ? c.operation : c.wifi
  return (
    <div className="w-[136px]">
      <StatusChip {...chip} />
    </div>
  )
}

function PolicyTable({ head, rows }: { head: string; rows: { label: string; view: ReactNode }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="border-b border-border bg-page/50 px-4 py-2 text-[12px] font-bold text-foreground">{head}</div>
      <table className="w-full">
        <tbody className="divide-y divide-border/50">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="w-[132px] px-4 py-2.5 align-middle text-[12px] font-semibold text-muted-foreground">{r.label}</td>
              <td className="px-4 py-2.5 align-middle">{r.view}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 항목 1개(전원/동작/네트워크)의 표시 정책 — 관리자 / 사용자 각각 실제 렌더로 보여준다 */
function ItemPolicySection({
  item,
  title,
  basis,
  adminNote,
  adminRows,
  userRows,
}: {
  item: SpecItem
  title: string
  basis: ReactNode
  adminNote: string
  adminRows: { label: string; device: HearingLoop }[]
  userRows: { label: string; device: HearingLoop }[]
}) {
  const m = SPEC_ITEM[item]
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-5 border-b border-border pb-4">
        <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-black text-foreground">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${m.cls}`}>
            {m.no} {m.label}
          </span>
          {title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">판정 근거 · </span>
          {basis}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <PolicyTable head="관리자 페이지 — 실시간 그대로" rows={adminRows.map((r) => ({ label: r.label, view: <AdminItemView item={item} device={r.device} /> }))} />
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted-foreground">{adminNote}</p>
        </div>
        <div>
          <PolicyTable head="사용자(기관) 페이지 — 미연결 지속 시간 기준" rows={userRows.map((r) => ({ label: r.label, view: <UserItemView item={item} device={r.device} /> }))} />
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted-foreground">
            야간 소등 같은 일상적 전원 차단을 장애로 표시하지 않기 위한 유예 정책입니다.
          </p>
        </div>
      </div>
    </section>
  )
}

/** 판정 근거 값 — 심사자가 "왜 이렇게 보이는지" 추적할 수 있게 원본 필드를 노출 */
function Basis({ device, offlineFor }: { device: HearingLoop; offlineFor?: number | null }) {
  const uStatus = deriveUserStatus(device)
  return (
    <div className="rounded-lg bg-page/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
      <div>connection_status = <span className="font-bold text-foreground">{device.connectionStatus}</span></div>
      <div>미연결 지속 = <span className="font-bold text-foreground">{humanDuration(offlineFor)}</span></div>
      <div>
        사용자 판정 ={' '}
        <span className="font-bold text-foreground">
          {uStatus === 'disconnected' ? '연결 끊김' : uStatus === 'normal' ? '정상' : uStatus}
        </span>
        {isSoftOff(device) && <span className="text-foreground"> · soft-off{isWifiCut(device) ? ' · WiFi 끊김' : ''}</span>}
      </div>
    </div>
  )
}

/** 한 시나리오: 판정 근거 + 관리자 뷰 / 사용자 뷰 좌우 대조 */
function Scenario({
  label,
  note,
  device,
  offlineFor,
  items,
}: {
  label: string
  note?: string
  device: HearingLoop
  offlineFor?: number | null
  /** 이 시나리오가 실제로 변화를 보여주는 항목 (생략 시 태그 없음 — 섹션 태그를 따름) */
  items?: SpecItem[]
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-page/20 p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="text-[14px] font-bold text-foreground">{label}</h3>
        {note && <span className="text-[12px] text-muted-foreground">{note}</span>}
      </div>
      {items && (
        <div className="mb-3">
          <SpecTags items={items} compact />
        </div>
      )}

      <Basis device={device} offlineFor={offlineFor} />

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">관리자 — 실시간</p>
          <AdminDeviceMobileCard device={device} />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">사용자(기관) — 지속시간 기준</p>
          <UserDeviceCard device={device} />
        </div>
      </div>
    </div>
  )
}

/** 관리자 목록 테이블 — <tr>은 table 안에서만 렌더 가능하므로 실제 페이지 래퍼를 그대로 재현 */
function AdminTable({ devices }: { devices: HearingLoop[] }) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <AdminDeviceTableHead />
          <tbody className="divide-y divide-border/40">
            {devices.map((d) => (
              <AdminDeviceTableRow key={d.id} device={d} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── 실기기 현황 (로그인 시에만 마운트) ──
   훅은 조건부 호출이 불가하므로 별도 컴포넌트로 분리한다. */
function LiveDeviceSection() {
  const { data: devices = [], isLoading, isError } = useDevices()

  if (isLoading) return <p className="py-8 text-center text-[13px] text-muted-foreground">불러오는 중…</p>
  if (isError) return <p className="py-8 text-center text-[13px] text-muted-foreground">기기 목록을 불러오지 못했습니다(권한 또는 세션 만료).</p>
  if (devices.length === 0) return <p className="py-8 text-center text-[13px] text-muted-foreground">조회 가능한 기기가 없습니다.</p>

  const bucket = (d: HearingLoop) => {
    if (d.power) return '연결 중'
    const u = deriveUserStatus(d)
    if (u === 'disconnected') return '24시간 이상'
    return isWifiCut(d) ? '4~24시간' : '4시간 미만'
  }

  return (
    <>
      <AdminTable devices={devices} />
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {devices.map((d) => (
          <div key={d.id}>
            <p className="mb-2 text-[11px] font-bold text-muted-foreground">
              {bucket(d)} · 사용자 뷰
            </p>
            <UserDeviceCard device={d} />
          </div>
        ))}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════ */

export default function StatusSpecPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  /* 기준 시각 — 렌더 시점에 계산한다. 픽스처 타임스탬프를 여기에 맞춰 생성해
     경계값(3시간 59분 등)이 캡처 도중 다음 단계로 넘어가지 않게 한다. */
  const now = Date.now()
  const f = (spec: FixtureSpec) => makeFixture(spec, now)

  /* ① 미연결 지속 시간 3단계 */
  const stages: { label: string; note: string; offlineFor: number | null; device: HearingLoop }[] = [
    {
      label: '연결 중 (정상 가동)',
      note: 'connection_status = ONLINE',
      offlineFor: null,
      device: f({ id: 1, mac: 'AA:BB:CC:00:00:01', alias: '1층 안내데스크', zoneName: '성동구청', connection: 'ONLINE', wifi: 'FAIR', rssi: -60 }),
    },
    {
      label: '미연결 2시간 — 4시간 미만',
      note: '전부 정상 연출',
      offlineFor: 2 * HOUR,
      device: f({ id: 2, mac: 'AA:BB:CC:00:00:02', alias: '2층 민원실', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 2 * HOUR }),
    },
    {
      label: '미연결 6시간 — 4~24시간',
      note: 'WiFi만 회색 "끊김"',
      offlineFor: 6 * HOUR,
      device: f({ id: 3, mac: 'AA:BB:CC:00:00:03', alias: '3층 대회의실', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 6 * HOUR }),
    },
    {
      label: '미연결 30시간 — 24시간 이상',
      note: '연결 끊김 + 진짜 상태 노출',
      offlineFor: 30 * HOUR,
      device: f({ id: 4, mac: 'AA:BB:CC:00:00:04', alias: '지하 주차장', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 30 * HOUR }),
    },
  ]

  /* ② 경계값 — 4시간 경계는 Wi-Fi만, 24시간 경계는 세 항목 전부가 바뀐다 */
  const edges: { label: string; note: string; offlineFor: number; device: HearingLoop; items: SpecItem[] }[] = [
    { label: '3시간 59분', note: 'WiFi 정상 유지', offlineFor: 3 * HOUR + 59 * MINUTE, items: ['network'], device: f({ id: 11, mac: 'AA:BB:CC:00:01:01', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 3 * HOUR + 59 * MINUTE }) },
    { label: '4시간 1분', note: 'WiFi 회색 "끊김"으로 전환', offlineFor: 4 * HOUR + 1 * MINUTE, items: ['network'], device: f({ id: 12, mac: 'AA:BB:CC:00:01:02', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 4 * HOUR + 1 * MINUTE }) },
    { label: '23시간 59분', note: '아직 정상 뱃지', offlineFor: 23 * HOUR + 59 * MINUTE, items: ALL_ITEMS, device: f({ id: 13, mac: 'AA:BB:CC:00:01:03', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 23 * HOUR + 59 * MINUTE }) },
    { label: '24시간 1분', note: '연결 끊김으로 전환', offlineFor: 24 * HOUR + 1 * MINUTE, items: ALL_ITEMS, device: f({ id: 14, mac: 'AA:BB:CC:00:01:04', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 24 * HOUR + 1 * MINUTE }) },
  ]

  /* ③ WiFi 4등급 (연결 중 실값 + 끊김) */
  const wifiCases = [
    f({ id: 21, mac: 'AA:BB:CC:00:02:01', alias: '강함 (RSSI ≥ -55)', zoneName: '성동구청', connection: 'ONLINE', wifi: 'STRONG', rssi: -45 }),
    f({ id: 22, mac: 'AA:BB:CC:00:02:02', alias: '보통 (-67 ~ -55)', zoneName: '성동구청', connection: 'ONLINE', wifi: 'FAIR', rssi: -60 }),
    f({ id: 23, mac: 'AA:BB:CC:00:02:03', alias: '약함 (< -67)', zoneName: '성동구청', connection: 'ONLINE', wifi: 'WEAK', rssi: -75 }),
    f({ id: 24, mac: 'AA:BB:CC:00:02:04', alias: '끊김 (연결 해제)', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 30 * HOUR }),
  ]

  /* ④ 동작 상태 3종 */
  const connCases = [
    f({ id: 31, mac: 'AA:BB:CC:00:03:01', alias: '정상 작동 (ONLINE)', zoneName: '성동구청', connection: 'ONLINE', wifi: 'STRONG', rssi: -50 }),
    f({ id: 32, mac: 'AA:BB:CC:00:03:02', alias: '업데이트 중 (UPDATING)', zoneName: '성동구청', connection: 'UPDATING', wifi: 'FAIR', rssi: -58 }),
    f({ id: 33, mac: 'AA:BB:CC:00:03:03', alias: '작동 중지 (OFFLINE)', zoneName: '성동구청', connection: 'OFFLINE', offlineFor: 30 * HOUR }),
  ]

  const allStageDevices = stages.map((s) => s.device)

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        {/* ─── Header ─── */}
        <header className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-black tracking-tight text-foreground">
                히어링루프 모니터링 상태 표시 규격
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                시험성적서 기재 표시 규격이 실제 화면에 그대로 구현되었음을 확인하는 페이지입니다.
                각 섹션(A~F) 머리에 <span className="font-semibold text-foreground">검증 항목</span> 태그로
                성적서 <span className="font-semibold text-foreground">①전원 · ②기기 동작 · ③네트워크</span> 중 무엇을 증명하는지 표시합니다.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-page/40 px-4 py-3">
              <p className="text-[11px] text-muted-foreground">문서</p>
              <p className="text-[13px] font-bold text-foreground">시험성적서-표시규격 v1.1</p>
            </div>
            <div className="rounded-xl border border-border bg-page/40 px-4 py-3">
              <p className="text-[11px] text-muted-foreground">대상 항목</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ALL_ITEMS.map((k) => {
                  const m = SPEC_ITEM[k]
                  return (
                    <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${m.cls}`}>
                      {m.no} {m.label}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-page/40 px-4 py-3">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> 렌더링 기준 시각</p>
              <p className="text-[13px] font-bold tabular-nums text-foreground">{formatDateTime(new Date(now).toISOString())}</p>
            </div>
          </div>

          {/* 예시 데이터 고지 */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-[12px] leading-relaxed text-foreground">
              <span className="font-bold">아래 A~E는 임계값 동작 확인을 위한 예시(가상) 데이터입니다.</span>{' '}
              실제 운영 중인 기기의 상태가 아니며, 실기기 현황은 맨 아래 F에서 별도로 확인합니다.
              예시 데이터는 기준 시각으로부터 상대 시각으로 생성되어 언제 열어도 동일한 단계를 보여줍니다.
            </p>
          </div>

          {/* 역할별 정책 요약 */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-[12px] font-bold text-foreground">관리자 페이지 — 실시간 그대로</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                연결이 끊기면 즉시 전원 OFF·작동 중지로 표시(운영·점검용).
              </p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-[12px] font-bold text-foreground">사용자(기관) 페이지 — 미연결 지속 시간 기준 3단계</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                4시간 미만 정상 · 4~24시간 WiFi만 회색 '끊김' · 24시간 이상 '연결 끊김'.
                야간 소등 같은 일상적 전원 차단을 장애로 표시하지 않기 위함.
              </p>
            </div>
          </div>
        </header>

        {/* ─── 표시 정책 (성적서 기재 내용) — 항목별 ①②③ ─── */}
        <div className="flex items-center gap-3 pt-2">
          <h2 className="shrink-0 text-[14px] font-black text-foreground">표시 정책 (시험성적서 기재 내용)</h2>
          <span className="text-[12px] text-muted-foreground">각 항목이 관리자 / 사용자 페이지에서 실제로 어떻게 표시되는지</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <ItemPolicySection
          item="power"
          title="전원 상태 (ON / OFF)"
          basis={
            <>
              전원이 인가되면 기기가 부팅 → Wi-Fi 접속 → MQTT 브로커 연결을 수립하고, 브로커가 연결 수립/해제를 실시간 감지해{' '}
              <span className="font-mono font-semibold">connection_status</span>를 갱신한다. 연결은 전원이 인가된 상태에서만 성립하므로 전원 판정의 확정 지표로 사용한다.
            </>
          }
          adminNote="연결이 끊기면 즉시 OFF로 표시합니다. 목록 표에서는 공간상 아이콘만, 상세 모달·모바일 카드에서는 위와 같이 'ON/OFF' 라벨을 함께 표시합니다."
          adminRows={[
            { label: '연결 중', device: stages[0].device },
            { label: '연결 끊김 (즉시)', device: stages[1].device },
          ]}
          userRows={[
            { label: '연결 중', device: stages[0].device },
            { label: '미연결 4시간 미만', device: stages[1].device },
            { label: '미연결 4~24시간', device: stages[2].device },
            { label: '미연결 24시간 이상', device: stages[3].device },
          ]}
        />

        <ItemPolicySection
          item="operation"
          title="기기 동작 여부 (정상 작동 / 업데이트 중 / 작동 중지)"
          basis={
            <>
              연결 상태(<span className="font-mono font-semibold">connection_status</span>)와 연결이 끊긴 시각
              (<span className="font-mono font-semibold">disconnected_at</span>). 끊기면 시각을 기록하고 재연결 시 초기화하며, 이 시각으로 미연결 지속 시간을 계산한다.
            </>
          }
          adminNote="연결이 끊기면 즉시 '작동 중지'로 표시합니다. 펌웨어 원격 업데이트(OTA)가 진행 중이면 '업데이트 중'으로 구분됩니다."
          adminRows={[
            { label: 'ONLINE', device: connCases[0] },
            { label: 'UPDATING', device: connCases[1] },
            { label: 'OFFLINE', device: connCases[2] },
          ]}
          userRows={[
            { label: '연결 중', device: stages[0].device },
            { label: '미연결 4시간 미만', device: stages[1].device },
            { label: '미연결 4~24시간', device: stages[2].device },
            { label: '미연결 24시간 이상', device: stages[3].device },
          ]}
        />

        <ItemPolicySection
          item="network"
          title="네트워크 연결 상태 (Wi-Fi)"
          basis={
            <>
              기기가 보고하는 Wi-Fi 신호세기 원시값(<span className="font-mono font-semibold">wifi_rssi_dbm</span>)을 백엔드가 4단계 등급
              (<span className="font-mono font-semibold">wifi_signal</span>)으로 산출한다 — 강함(≥ -55dBm) / 보통(-67 ~ -55) / 약함(&lt; -67) / 끊김(연결 해제·RSSI 미수신).
            </>
          }
          adminNote="등급 아이콘에 색상을 적용하고 라벨과 RSSI 원시값(dBm)을 함께 표시합니다. 연결이 끊기면 즉시 '끊김'."
          adminRows={[
            { label: '강함 (≥ -55dBm)', device: wifiCases[0] },
            { label: '보통 (-67 ~ -55)', device: wifiCases[1] },
            { label: '약함 (< -67)', device: wifiCases[2] },
            { label: '끊김 (연결 해제)', device: wifiCases[3] },
          ]}
          userRows={[
            { label: '연결 중', device: stages[0].device },
            { label: '미연결 4시간 미만', device: stages[1].device },
            { label: '미연결 4~24시간', device: stages[2].device },
            { label: '미연결 24시간 이상', device: stages[3].device },
          ]}
        />

        {/* ─── 표시 규격 실증 ─── */}
        <div className="flex items-center gap-3 pt-2">
          <h2 className="shrink-0 text-[14px] font-black text-foreground">표시 규격 실증</h2>
          <span className="text-[12px] text-muted-foreground">시나리오별 실제 화면 · 경계값 검증 · 실기기 현황</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ─── A. 3단계 ─── */}
        <Section
          n="A"
          title="미연결 지속 시간별 표시 (관리자 / 사용자 대조)"
          items={ALL_ITEMS}
          desc={
            <>
              동일한 기기 상태를 두 페이지가 어떻게 다르게 표시하는지 나란히 비교합니다.
              판정 기준은 <span className="font-mono font-semibold">disconnected_at</span>(연결이 끊긴 시각)이며,
              임계값은 <span className="font-semibold">{DISCONNECT_ALERT_MS / HOUR}시간</span>(연결 끊김) ·{' '}
              <span className="font-semibold">{WIFI_CUT_SHOW_MS / HOUR}시간</span>(WiFi 끊김 표시)입니다.
            </>
          }
        >
          <div className="space-y-4">
            {stages.map((s) => (
              <Scenario key={s.device.id} label={s.label} note={s.note} device={s.device} offlineFor={s.offlineFor} />
            ))}
          </div>
        </Section>

        {/* ─── ② 경계값 ─── */}
        <Section
          n="B"
          title="임계값 경계 동작 검증"
          items={ALL_ITEMS}
          desc="임계값 직전과 직후를 나란히 배치해 4시간·24시간 경계에서 표시가 실제로 전환되는지 확인합니다."
        >
          <div className="space-y-4">
            {edges.map((e) => (
              <Scenario key={e.device.id} label={e.label} note={e.note} device={e.device} offlineFor={e.offlineFor} items={e.items} />
            ))}
          </div>
        </Section>

        {/* ─── ③ WiFi 4등급 ─── */}
        <Section
          n="C"
          title="Wi-Fi 신호 등급 4단계"
          items={['network']}
          desc="RSSI 값에 따른 등급별 아이콘·색상. 관리자 목록에는 RSSI 원시값(dBm)이 함께 표시됩니다."
        >
          <AdminTable devices={wifiCases} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {wifiCases.map((d) => (
              <UserDeviceCard key={d.id} device={d} />
            ))}
          </div>
        </Section>

        {/* ─── ④ 동작 상태 3종 ─── */}
        <Section
          n="D"
          title="기기 동작 상태 3종"
          items={['operation']}
          desc="정상 작동(ONLINE) · 업데이트 중(UPDATING, 펌웨어 원격 업데이트 진행) · 작동 중지(OFFLINE)."
        >
          <AdminTable devices={connCases} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {connCases.map((d) => (
              <UserDeviceCard key={d.id} device={d} />
            ))}
          </div>
        </Section>

        {/* ─── 관리자 목록 표 통합 ─── */}
        <Section
          n="E"
          title="관리자 목록 표 (전체 시나리오)"
          items={ALL_ITEMS}
          desc="관리자 목록 표에서는 공간상 전원이 아이콘만으로 표시되고, 상세 모달·모바일 카드에서 'ON/OFF' 라벨이 함께 표시됩니다."
        >
          <AdminTable devices={allStageDevices} />
        </Section>

        {/* ─── ⑥ 실기기 현황 ─── */}
        <Section
          n="F"
          title="실기기 현황"
          items={ALL_ITEMS}
          desc={
            <>
              현재 운영 중인 실제 기기입니다(예시 데이터 아님). 로그인한 계정 권한 범위의 기기만 표시됩니다 —
              관리자는 전체, 기관 계정은 소속 기관 기기.
            </>
          }
        >
          {isAuthenticated ? (
            <LiveDeviceSection />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10">
              <Building2 className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-[13px] font-semibold text-muted-foreground">로그인 후 확인할 수 있습니다</p>
              <p className="text-[12px] text-muted-foreground">위 A~E 예시 데이터는 로그인 없이도 확인 가능합니다.</p>
            </div>
          )}
        </Section>

        <footer className="flex items-center justify-center gap-2 py-4 text-[11px] text-muted-foreground">
          <Radio className="h-3 w-3" />
          히어링루프 모니터링 시스템 — 표시 규격 실증 페이지
        </footer>
      </div>
    </div>
  )
}
