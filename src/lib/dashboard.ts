/** 관리자 대시보드 집계 — 순수 로직. React 무의존.
 *
 *  전부 이미 있는 엔드포인트의 FE 파생이다(백엔드 수정 0):
 *   - GET /devices  → 상태·Wi-Fi·배치 파이프라인 (1콜, 다른 페이지와 캐시 공유)
 *   - GET /zones    → 존 이름·담당자
 *   - GET /alerts?type=TEMPERATURE_ANOMALY → 과열 이력 (7일)
 *   - GET /alerts?limit=1 → 알림 총계(응답에 total/pending/forwarded/dismissed/today 내장)
 *
 *  ⚠️ 판정 규칙은 반드시 여기 한 곳에만 둔다. 컴포넌트에서 임의 파생 금지.
 */

import type { HearingLoop, TelecoilZone } from '@/types/device'
import type { AlertResponseDto } from '@/types/alert'
import { kstDayStartMs, toMs } from './kst'


export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

/** 과열 롤업 창 */
export const OVERHEAT_RECENT_MS = DAY_MS
export const OVERHEAT_WINDOW_MS = 7 * DAY_MS

/** 미연결 '장애' 승격 — 유저 페이지 정책(userDeviceDisplay.DISCONNECT_ALERT_MS)과 같은 24시간 */
export const OFFLINE_FAULT_MS = DAY_MS

/* ── 기기 상태 요약 ─────────────────────────────────── */

export interface OfflineBuckets {
  /** 미연결 4h 미만 — 일상 소등 범위 */
  recent: number
  /** 4~24h — 확인 필요 */
  watch: number
  /** 24h 이상 — 장애 */
  fault: number
  /** 아직 IoT 프로비저닝 전(한 번도 안 붙은 기기) — 위 셋과 배타 */
  neverSeen: number
}

export interface DeviceSummary {
  total: number
  online: number
  updating: number
  offline: number
  unassigned: number
  /** 배정된 기기 기준 가동률(%) — 미배정은 분모에서 제외(회의 32:34) */
  uptimePct: number
  buckets: OfflineBuckets
}

/** 미연결 시작 시각. disconnected_at이 DTO에 실리기 전에는 last_seen_at으로 근사한다. */
export function offlineSince(d: HearingLoop): number | null {
  const iso = d.disconnectedAt ?? d.lastUpdated
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isFinite(ms) ? ms : null
}

export function summarizeDevices(devices: HearingLoop[], nowMs: number, watchMs: number): DeviceSummary {
  const buckets: OfflineBuckets = { recent: 0, watch: 0, fault: 0, neverSeen: 0 }
  let online = 0
  let updating = 0
  let offline = 0
  let unassigned = 0
  let assignedOnline = 0
  let assigned = 0

  for (const d of devices) {
    if (!d.telecoilZoneId) unassigned += 1
    else {
      assigned += 1
      if (d.connectionStatus === 'ONLINE') assignedOnline += 1
    }

    if (d.connectionStatus === 'ONLINE') { online += 1; continue }
    if (d.connectionStatus === 'UPDATING') { updating += 1; continue }

    offline += 1
    // 한 번도 붙은 적 없는 기기는 '미연결 시간'이라는 개념이 성립하지 않는다
    if (d.provisionStatus === 'PENDING') { buckets.neverSeen += 1; continue }
    const since = offlineSince(d)
    if (since === null) { buckets.neverSeen += 1; continue }
    const elapsed = nowMs - since
    if (elapsed >= OFFLINE_FAULT_MS) buckets.fault += 1
    else if (elapsed >= watchMs) buckets.watch += 1
    else buckets.recent += 1
  }

  return {
    total: devices.length,
    online,
    updating,
    offline,
    unassigned,
    uptimePct: assigned ? Math.round((assignedOnline / assigned) * 100) : 0,
    buckets,
  }
}

/* ── Wi-Fi 신호 ─────────────────────────────────────── */

export interface WifiSummary {
  /** 연결된 기기 수 — 분모. 오프라인 기기의 DISCONNECTED는 '신호 약함'이 아니라 '안 붙음'이라 제외한다 */
  connected: number
  strong: number
  fair: number
  weak: number
  /** 신호가 약한 기기 목록(약함부터) — 설치 품질 점검 대상 */
  weakDevices: HearingLoop[]
}

export function summarizeWifi(devices: HearingLoop[]): WifiSummary {
  const linked = devices.filter((d) => d.connectionStatus !== 'OFFLINE')
  const by = (s: string) => linked.filter((d) => d.wifiSignal === s)
  const weakDevices = by('WEAK')
  return {
    connected: linked.length,
    strong: by('STRONG').length,
    fair: by('FAIR').length,
    weak: weakDevices.length,
    weakDevices: [...weakDevices].sort((a, b) => (a.wifiRssi ?? 0) - (b.wifiRssi ?? 0)),
  }
}

/* ── 배치 파이프라인 ────────────────────────────────── */

export interface ProvisionPipeline {
  /** 서버 등록만 됨 — IoT 프로비저닝(최초 연결) 대기 */
  provisioning: number
  /** 프로비저닝 완료, 존 배정 대기 */
  awaitingZone: number
  /** 존에 배정돼 운영 중 */
  operating: number
  /** 프로비저닝 대기 기기 목록 */
  provisioningDevices: HearingLoop[]
  awaitingZoneDevices: HearingLoop[]
}

/** 회의 20:19 워크플로 — 사전 등록 → 프로비저닝 → 존 배정 → 운영. 각 단계는 배타적이라 합이 전체와 같다. */
export function buildPipeline(devices: HearingLoop[]): ProvisionPipeline {
  const provisioningDevices = devices.filter((d) => d.provisionStatus === 'PENDING')
  const awaitingZoneDevices = devices.filter((d) => d.provisionStatus !== 'PENDING' && !d.telecoilZoneId)
  const operating = devices.filter((d) => d.provisionStatus !== 'PENDING' && !!d.telecoilZoneId).length
  return {
    provisioning: provisioningDevices.length,
    awaitingZone: awaitingZoneDevices.length,
    operating,
    provisioningDevices,
    awaitingZoneDevices,
  }
}

/* ── 과열 롤업 ──────────────────────────────────────── */

export interface OverheatDevice {
  mac: string
  label: string
  zoneName: string | null
  count: number
  lastAt: string
}

export interface OverheatSummary {
  /** 지금 과열 중 — ⚠️ ONLINE 기기만. 오프라인 기기의 last_gpio_state는 마지막 값이라 '현재'가 아니다 */
  currentDevices: HearingLoop[]
  /** 최근 24시간에 과열이 있었던 기기 */
  recent: OverheatDevice[]
  /** 최근 7일에 과열이 있었던 기기 (recent 포함) */
  window: OverheatDevice[]
  /** 창 안 총 발생 건수 (알림 행 수 — 관리자 조작에 따라 실제 횟수와 어긋날 수 있어 '약'으로 표기) */
  totalEvents: number
}

export function buildOverheatSummary(
  alerts: AlertResponseDto[],
  devices: HearingLoop[],
  nowMs: number,
): OverheatSummary {
  const roll = (sinceMs: number): OverheatDevice[] => {
    const map = new Map<string, OverheatDevice>()
    for (const a of alerts) {
      if (a.type !== 'TEMPERATURE_ANOMALY' || !a.device) continue
      const t = new Date(a.occurred_at).getTime()
      if (!Number.isFinite(t) || t < sinceMs) continue
      const mac = a.device.mac_address
      const cur = map.get(mac)
      if (cur) {
        cur.count += 1
        if (a.occurred_at > cur.lastAt) cur.lastAt = a.occurred_at
      } else {
        map.set(mac, {
          mac,
          label: a.device.alias || mac,
          zoneName: a.device.zone?.name ?? null,
          count: 1,
          lastAt: a.occurred_at,
        })
      }
    }
    return [...map.values()].sort((x, y) => (x.lastAt < y.lastAt ? 1 : -1))
  }

  const window = roll(nowMs - OVERHEAT_WINDOW_MS)
  return {
    currentDevices: devices.filter((d) => d.connectionStatus === 'ONLINE' && d.overTemperature),
    recent: roll(nowMs - OVERHEAT_RECENT_MS),
    window,
    totalEvents: window.reduce((n, d) => n + d.count, 0),
  }
}

/* ── 존별 요약 행 ───────────────────────────────────── */

export interface ZoneRow {
  id: string | null
  name: string
  managerEmail: string | null
  total: number
  online: number
  uptimePct: number | null
  fault: number
  overheat7d: number
}

export function buildZoneRows(
  zones: TelecoilZone[],
  devices: HearingLoop[],
  overheat: OverheatSummary,
  nowMs: number,
): ZoneRow[] {
  const hotZones = new Map<string, number>()
  for (const o of overheat.window) {
    const d = devices.find((x) => x.mac === o.mac)
    const key = d?.telecoilZoneId ?? '__none__'
    hotZones.set(key, (hotZones.get(key) ?? 0) + 1)
  }

  const rowFor = (id: string | null, name: string, managerEmail: string | null): ZoneRow => {
    const mine = devices.filter((d) => (id === null ? !d.telecoilZoneId : d.telecoilZoneId === id))
    const online = mine.filter((d) => d.connectionStatus === 'ONLINE').length
    const fault = mine.filter((d) => {
      if (d.connectionStatus !== 'OFFLINE' || d.provisionStatus === 'PENDING') return false
      const since = offlineSince(d)
      return since !== null && nowMs - since >= OFFLINE_FAULT_MS
    }).length
    return {
      id,
      name,
      managerEmail,
      total: mine.length,
      online,
      uptimePct: mine.length ? Math.round((online / mine.length) * 100) : null,
      fault,
      overheat7d: hotZones.get(id ?? '__none__') ?? 0,
    }
  }

  const rows = zones.map((z) => rowFor(String(z.id), z.name, z.managerEmail ?? null))
  const unassigned = devices.filter((d) => !d.telecoilZoneId)
  if (unassigned.length) rows.push({ ...rowFor(null, '미배정', null), uptimePct: null })
  return rows
}

/* ── 펌웨어 버전 ────────────────────────────────────── */

export interface FirmwareSummary {
  /** 최빈 버전 조합 = 사실상 최신. 배포 이력이 아니라 실제 설치 분포에서 뽑는다 */
  latest: string | null
  outdated: number
  unknown: number
  outdatedDevices: HearingLoop[]
}

/** 기기별 설치 버전 분포에서 구버전을 센다.
 *  ⚠️ FIRMWARE_UPDATE_AVAILABLE 알림 건수를 쓰면 안 된다 — 처리 안 된 과거 알림이 누적돼
 *     실제 구버전 대수와 어긋난다(실측: 알림 13건 vs 실제 구버전 3대). */
export function summarizeFirmware(devices: HearingLoop[]): FirmwareSummary {
  const key = (d: HearingLoop) =>
    d.wifiFirmwareVersion && d.hlFirmwareVersion ? `${d.wifiFirmwareVersion} / ${d.hlFirmwareVersion}` : null

  const counts = new Map<string, number>()
  let unknown = 0
  for (const d of devices) {
    const k = key(d)
    if (!k) { unknown += 1; continue }
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  let latest: string | null = null
  let best = 0
  for (const [k, n] of counts) if (n > best) { latest = k; best = n }

  const outdatedDevices = devices.filter((d) => {
    const k = key(d)
    return k !== null && k !== latest
  })
  return { latest, outdated: outdatedDevices.length, unknown, outdatedDevices }
}

/* ── Wi-Fi 분포 스트립 축 ───────────────────────────── */

/** 분포 스트립 x축 고정 범위. 데이터에 맞춰 늘리면 점 위치가 매번 달라져 비교가 안 된다. */
export const WIFI_AXIS_MIN = -85
export const WIFI_AXIS_MAX = -30
/** 백엔드 WifiSignalStatus 경계와 동일 */
export const WIFI_THRESHOLDS = [-67, -55]

/* ── 과열 요일 버킷 ─────────────────────────────────── */

export interface OverheatDayBucket {
  /** 요일 한 글자, 오늘은 '오늘' */
  label: string
  count: number
  isToday: boolean
}

/** 최근 7일 과열 알림을 KST 일 단위 7칸으로 묶는다(옛날→오늘) — 대시보드 미니 요일 바용.
 *  관리자(전체 알림)와 사용자(전달받은 알림) 카드가 같은 모양을 공유한다. */
export function overheatDayBuckets(
  alerts: { occurred_at: string }[],
  nowMs: number,
): OverheatDayBucket[] {
  const todayStart = kstDayStartMs(nowMs)
  const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
  return Array.from({ length: 7 }, (_, i) => {
    const start = todayStart - (6 - i) * DAY_MS
    const end = start + DAY_MS
    const count = alerts.reduce((n, a) => {
      const ms = toMs(a.occurred_at)
      return ms >= start && ms < end ? n + 1 : n
    }, 0)
    const isToday = i === 6
    // KST 요일 = UTC+9 시각의 UTC 요일
    const label = isToday ? '오늘' : WEEKDAY[new Date(start + 9 * 3600 * 1000).getUTCDay()]
    return { label, count, isToday }
  })
}

/** RSSI → 스트립 내 x 위치(0~1). 축 밖은 잘라낸다. */
export function wifiAxisPos(rssi: number): number {
  const t = (rssi - WIFI_AXIS_MIN) / (WIFI_AXIS_MAX - WIFI_AXIS_MIN)
  return Math.min(1, Math.max(0, t))
}

/** 같은 RSSI 값이 겹치면 위로 쌓기 위한 층 번호 */
export function stackDots<T>(items: T[], valueOf: (x: T) => number): { item: T; level: number }[] {
  const seen = new Map<number, number>()
  return items.map((item) => {
    const v = valueOf(item)
    const level = seen.get(v) ?? 0
    seen.set(v, level + 1)
    return { item, level }
  })
}
