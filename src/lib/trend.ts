/** 기기 추이(과열·Wi-Fi) 집계 — 순수 로직. React 무의존.
 *
 *  소스는 `GET /devices/:mac/status`(device_status_log) **하나뿐**이다. 알림(/alerts)은 쓰지 않는다:
 *   - `dismissed_at`이 자동 해제(gpio 하강엣지 시각)와 관리자 수동 종결(클릭 시각)을 겸해서 구간 길이가 오염된다
 *   - 중복 방지가 PENDING에만 걸려서, 과열 지속 중 관리자가 '전달'을 누르면 같은 과열에 알림 행이 하나 더 생긴다
 *   - limit 100 하드캡 + 날짜 범위 필터 없음, ADMIN 전용
 *  status_log 한 행에 gpio_state와 wifi_rssi_dbm이 같이 있어 히트맵·밴드가 전부 여기서 나온다.
 *
 *  ⚠️ 표시 규격은 반드시 여기 한 곳에서만 정의한다(색 스케일 포함). 컴포넌트에서 임의 판정 금지.
 */

import type { DeviceStatusLogDto } from '@/types/device'
import { DAY_MS, HOUR_MS, kstDayKey, kstDayStartMs, kstShortDay, toMs } from './kst'

/** 히트맵이 보여주는 일수 */
export const HEATMAP_DAYS = 7
/** 뒤로 갈 수 있는 최대 칸 수. 상태이력 purge가 1개월이라 4주(28일)가 상한 */
export const MAX_WEEK_OFFSET = 3

/** 밴드 기본 창 — 과열 사이클이 3분 간격이라 하루면 막대가 뭉개진다 */
export const BAND_WINDOW_MS = 6 * HOUR_MS

/** 선택 가능한 밴드 창 크기 */
export const BAND_WINDOWS = [
  { label: '6시간', ms: 6 * HOUR_MS },
  { label: '12시간', ms: 12 * HOUR_MS },
  { label: '1일', ms: DAY_MS },
] as const

/** 연결 구간 판정 임계.
 *  StatusReport는 주기 전송이 아니라 이벤트 전송(gpio 변화 / RSSI 5dBm 이상 변화)이라
 *  조용하면 행이 안 생긴다. 즉 "행이 없다 ≠ 끊겼다"이므로 이 값은 추정치다.
 *  ⚠️ 실데이터 간격 분포를 보고 튜닝할 것. 화면 문구도 '끊김'이 아니라 '신호 수신'으로 쓴다. */
export const LINK_GAP_MS = 60 * 60 * 1000

/** 상태이력 페이지 크기 / 페이지 순회 상한 (날짜 범위 필터가 API에 없어 최신순으로 받다가 끊는다) */
export const STATUS_PAGE_SIZE = 1000
/** 4주까지 뒤로 갈 수 있어야 해서 상향. 실측: 과열 폭주가 있던 기기가 9일치에 4페이지 */
export const MAX_STATUS_PAGES = 15

/* ── 자료구조 ────────────────────────────────────────────── */

export interface HeatCell {
  /** KST 'YYYY-MM-DD' */
  dayKey: string
  /** KST 0~23 */
  hour: number
  /** 이 셀 시작 시각(epoch ms) — 셀 클릭 → 밴드 이동에 사용 */
  startMs: number
  /** 이 시간대의 과열 상승 엣지 수 */
  overheatCount: number
  /** 이 시간대에 수신한 status_log 행 수. 0이면 '데이터 없음'(과열 0회와 다르다) */
  sampleCount: number
}

export interface OverheatSpan {
  startMs: number
  endMs: number
  /** closed=하강엣지로 정상 복귀 확인 / ongoing=마지막 보고까지 과열 중 / unknown=보고가 끊겨 종료 미확인 */
  state: 'closed' | 'ongoing' | 'unknown'
  /** 조회 범위 이전부터 이어져 온 구간(시작 시각 미확인) */
  clippedLeft: boolean
}

/** 인접 수신 간격이 LINK_GAP_MS 이내인 연속 구간 = "신호가 계속 오고 있던 구간" */
export interface LinkSpan {
  startMs: number
  endMs: number
}

export interface RssiPoint {
  ms: number
  /** null = 결측. 원본이 null이거나 0(미조회/미연결)인 경우. 보간하지 않는다. */
  dbm: number | null
}

export interface TrendModel {
  rangeStartMs: number
  rangeEndMs: number
  /** 히트맵 행 — 오래된 날짜부터 */
  days: { dayKey: string; label: string; startMs: number }[]
  /** days.length × 24, 행 우선 정렬 */
  cells: HeatCell[]
  spans: OverheatSpan[]
  links: LinkSpan[]
  rssi: RssiPoint[]
  /** 조회 범위 안에서 관측된 총 과열 횟수 */
  totalOverheats: number
  /** 수신한 status_log 총 행 수 */
  sampleCount: number
}

/* ── 색 스케일 ───────────────────────────────────────────── */

/** 과열 횟수 → 셀 배경 클래스. 신규 토큰 없이 destructive 알파 램프만 사용. */
export function heatCellClass(cell: HeatCell): string {
  if (cell.sampleCount === 0) return 'bg-muted/40'
  if (cell.overheatCount === 0) return 'bg-muted'
  if (cell.overheatCount <= 2) return 'bg-destructive/20'
  if (cell.overheatCount <= 6) return 'bg-destructive/40'
  if (cell.overheatCount <= 12) return 'bg-destructive/65'
  return 'bg-destructive'
}

/** 범례용 — heatCellClass와 같은 경계를 쓴다 */
export const HEAT_LEGEND: { label: string; cls: string }[] = [
  { label: '데이터 없음', cls: 'bg-muted/40' },
  { label: '0', cls: 'bg-muted' },
  { label: '1–2', cls: 'bg-destructive/20' },
  { label: '3–6', cls: 'bg-destructive/40' },
  { label: '7–12', cls: 'bg-destructive/65' },
  { label: '13+', cls: 'bg-destructive' },
]

/* ── 집계 ────────────────────────────────────────────────── */

/** status_log 배열 → 추이 모델.
 *  logs는 정렬돼 있지 않아도 되지만, 호출부에서 id dedupe는 마쳐야 한다.
 */
export function buildTrendModel(
  logs: DeviceStatusLogDto[],
  nowMs: number,
  days = HEATMAP_DAYS,
  /** 0=최근 N일, 1=그 전 N일 … 과거로 한 칸씩 */
  weekOffset = 0,
): TrendModel {
  const rangeStartMs = kstDayStartMs(nowMs) - (days - 1) * DAY_MS - weekOffset * days * DAY_MS
  const rangeEndMs = weekOffset === 0 ? nowMs : rangeStartMs + days * DAY_MS - 1

  // 오름차순 정렬. reported_at 동률은 id로 안정화(서버 ORDER BY에 tie-breaker가 없다).
  // 창 밖 로그는 여기서 잘라낸다 — 요약(과열 횟수·수신 건수)이 화면에 보이는 구간과 일치해야 한다.
  const sorted = logs
    .map((l) => ({ ...l, ms: toMs(l.reported_at) }))
    .filter((l) => Number.isFinite(l.ms) && l.ms >= rangeStartMs && l.ms <= rangeEndMs)
    .sort((a, b) => (a.ms - b.ms) || (a.id - b.id))

  // 히트맵 행/셀 뼈대 (데이터가 없는 날도 행은 만든다)
  const dayList: TrendModel['days'] = []
  const cells: HeatCell[] = []
  const cellIndex = new Map<string, HeatCell>()
  for (let d = 0; d < days; d++) {
    const dayStart = rangeStartMs + d * DAY_MS
    const dayKey = kstDayKey(dayStart)
    dayList.push({ dayKey, label: kstShortDay(dayStart), startMs: dayStart })
    for (let h = 0; h < 24; h++) {
      const cell: HeatCell = { dayKey, hour: h, startMs: dayStart + h * HOUR_MS, overheatCount: 0, sampleCount: 0 }
      cells.push(cell)
      cellIndex.set(`${dayKey}#${h}`, cell)
    }
  }
  const bump = (ms: number, field: 'overheatCount' | 'sampleCount') => {
    if (ms < rangeStartMs || ms > rangeEndMs) return
    // 셀 좌표는 rangeStart로부터의 오프셋으로 직접 계산(KST 자정 정렬이 이미 되어 있다)
    const offset = ms - rangeStartMs
    const dayIdx = Math.floor(offset / DAY_MS)
    const hour = Math.floor((offset % DAY_MS) / HOUR_MS)
    const day = dayList[dayIdx]
    if (!day) return
    const cell = cellIndex.get(`${day.dayKey}#${hour}`)
    if (cell) cell[field] += 1
  }

  const spans: OverheatSpan[] = []
  const links: LinkSpan[] = []
  const rssi: RssiPoint[] = []

  let prevGpio: boolean | null = null
  let openStart: number | null = null
  let openClipped = false
  let linkStart: number | null = null
  let prevMs: number | null = null
  let totalOverheats = 0

  for (const log of sorted) {
    const ms = log.ms

    bump(ms, 'sampleCount')

    // ── RSSI: 0은 값이 아니라 '미조회/미연결'. 백엔드 toWifiSignal의 `!rssi`와 같은 규칙.
    rssi.push({ ms, dbm: log.wifi_rssi_dbm === null || log.wifi_rssi_dbm === 0 ? null : log.wifi_rssi_dbm })

    // ── 연결 구간: 인접 수신 간격이 임계 이내면 이어붙인다
    if (prevMs === null) {
      linkStart = ms
    } else if (ms - prevMs > LINK_GAP_MS) {
      if (linkStart !== null) links.push({ startMs: linkStart, endMs: prevMs })
      linkStart = ms
    }
    prevMs = ms

    // ── 과열 엣지
    const gpio = log.gpio_state
    if (gpio !== null) {
      if (prevGpio === null) {
        // 첫 유효 관측이 이미 과열이면 시작 시각을 모른다
        if (gpio === true) { openStart = ms; openClipped = true }
      } else if (prevGpio === false && gpio === true) {
        openStart = ms
        openClipped = false
        totalOverheats += 1
        bump(ms, 'overheatCount')
      } else if (prevGpio === true && gpio === false) {
        if (openStart !== null) {
          spans.push({ startMs: openStart, endMs: ms, state: 'closed', clippedLeft: openClipped })
          openStart = null
          openClipped = false
        }
      }
      prevGpio = gpio
    }
  }

  if (linkStart !== null && prevMs !== null) links.push({ startMs: linkStart, endMs: prevMs })

  if (openStart !== null && prevMs !== null) {
    // 마지막 보고가 최근이면 '진행 중', 오래 끊겼으면 '종료 미확인'
    const stillFresh = nowMs - prevMs <= LINK_GAP_MS
    spans.push({
      startMs: openStart,
      endMs: stillFresh ? nowMs : prevMs,
      state: stillFresh ? 'ongoing' : 'unknown',
      clippedLeft: openClipped,
    })
  }

  return {
    rangeStartMs,
    rangeEndMs,
    days: dayList,
    cells,
    spans,
    links,
    rssi,
    totalOverheats,
    sampleCount: sorted.length,
  }
}

/** 창 안에 걸치는 항목만 남긴다(경계에 걸친 것 포함) */
export function clipToWindow<T extends { startMs: number; endMs: number }>(items: T[], from: number, to: number): T[] {
  return items.filter((i) => i.endMs >= from && i.startMs <= to)
}

/** RSSI 축 범위 — 실측이 좁아도 판독이 흔들리지 않게 고정 */
export const RSSI_MIN = -90
export const RSSI_MAX = -40
/** 백엔드 WifiSignalStatus 경계와 동일 */
export const RSSI_THRESHOLDS = [-55, -67]
