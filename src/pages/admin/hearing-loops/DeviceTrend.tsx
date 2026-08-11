import { useMemo, useRef, useState } from 'react'
import { Loader2, AlertTriangle, Info } from 'lucide-react'
import { useDeviceStatusRange } from '@/hooks/useDeviceStatusRange'
import {
  BAND_WINDOWS,
  BAND_WINDOW_MS,
  HEATMAP_DAYS,
  HEAT_LEGEND,
  LINK_GAP_MS,
  RSSI_MAX,
  RSSI_MIN,
  RSSI_THRESHOLDS,
  buildTrendModel,
  clipToWindow,
  heatCellClass,
  type HeatCell,
  type LinkSpan,
} from '@/lib/trend'
import { DAY_MS, HOUR_MS, formatDuration, formatKst, formatKstTime, kstHourStartMs, kstShortDay } from '@/lib/kst'

const GRID_24 = 'grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]'
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const pct = (v: number) => `${(v * 100).toFixed(4)}%`

/* ══════════════════════════════════════════════════════
   양방향 화살표 — 셀 위 absolute 오버레이. 레이아웃을 차지하지 않아 셀 높이가 줄지 않는다.
   ══════════════════════════════════════════════════════ */
function LinkArrow({ left, width, title }: { left: number; width: number; title: string }) {
  const wide = width > 0.03
  return (
    <div className="absolute bottom-[2px] h-[2px] rounded-full bg-primary" style={{ left: pct(left), width: pct(width) }} title={title}>
      {wide && (
        <>
          <span className="absolute -left-[3px] top-1/2 -translate-y-1/2 border-y-[3px] border-r-[4px] border-y-transparent border-r-primary" />
          <span className="absolute -right-[3px] top-1/2 -translate-y-1/2 border-y-[3px] border-l-[4px] border-y-transparent border-l-primary" />
        </>
      )}
    </div>
  )
}

/** 히트맵에서 클릭한 1시간을 밴드 배경에 되짚어 주는 음영 */
function SelectedBand({ at }: { at: { left: number; width: number } | null }) {
  if (!at) return null
  return (
    <div
      className="pointer-events-none absolute inset-y-0 bg-highlight/35"
      style={{ left: pct(at.left), width: `max(2px, ${pct(at.width)})` }}
    />
  )
}

/* ══════════════════════════════════════════════════════
   Main
   ══════════════════════════════════════════════════════ */
export default function DeviceTrend({ mac }: { mac: string }) {
  const { logs, isLoading, isError, isFetchingMore, truncated } = useDeviceStatusRange(mac, HEATMAP_DAYS)

  // 렌더마다 흔들리지 않도록 마운트 시점으로 고정
  const nowMs = useMemo(() => Date.now(), [])
  const model = useMemo(() => buildTrendModel(logs, nowMs, HEATMAP_DAYS), [logs, nowMs])

  const [winMs, setWinMs] = useState<number>(BAND_WINDOW_MS)
  const [winStartMs, setWinStartMs] = useState<number | null>(null)
  // 히트맵에서 강조할 1시간. 셀 클릭이면 그 셀, 드래그면 창 중앙 시각의 셀로 따라간다.
  const [focusStartMs, setFocusStartMs] = useState<number | null>(null)

  const minStart = model.rangeStartMs
  const maxStart = Math.max(model.rangeStartMs, model.rangeEndMs - winMs)

  // 기본 창 = 가장 최근 과열 구간 주변(없으면 최근 구간).
  // 사용자가 드래그·셀클릭을 하기 전까지는 winStartMs가 null이라 이 값이 그대로 쓰이고,
  // 페이지가 순차적으로 들어와도 자동으로 최신 과열 쪽으로 따라간다.
  // (한 번 조작하면 winStartMs가 잡혀서 더는 움직이지 않는다.)
  const defaultStart = useMemo(() => {
    const last = model.spans[model.spans.length - 1]
    const center = last ? last.startMs + (last.endMs - last.startMs) / 2 : model.rangeEndMs - winMs / 2
    return clamp(center - winMs / 2, minStart, maxStart)
  }, [model.spans, model.rangeEndMs, winMs, minStart, maxStart])

  const winStart = winStartMs ?? defaultStart
  const winEnd = winStart + winMs

  const changeWindow = (ms: number) => {
    const center = winStart + winMs / 2
    setWinMs(ms)
    setWinStartMs(clamp(center - ms / 2, model.rangeStartMs, Math.max(model.rangeStartMs, model.rangeEndMs - ms)))
  }

  const jumpTo = (cell: HeatCell) => {
    setFocusStartMs(cell.startMs)
    setWinStartMs(clamp(cell.startMs + HOUR_MS / 2 - winMs / 2, minStart, maxStart))
  }

  /** 창을 옮길 때 강조 셀도 창 중앙 시각으로 따라간다 */
  const moveWindow = (nextStart: number) => {
    setWinStartMs(nextStart)
    setFocusStartMs(kstHourStartMs(nextStart + winMs / 2))
  }

  /** 밴드 안에서의 위치(0~1). 창 밖이면 null */
  const selectedInBand = useMemo(() => {
    if (focusStartMs === null) return null
    if (focusStartMs >= winEnd || focusStartMs + HOUR_MS <= winStart) return null
    const l = clamp((focusStartMs - winStart) / winMs, 0, 1)
    return { left: l, width: clamp((focusStartMs + HOUR_MS - winStart) / winMs, 0, 1) - l }
  }, [focusStartMs, winStart, winEnd, winMs])

  /** 히트맵 한 행(하루)에서 현재 창이 차지하는 구간. 창이 자정을 넘으면 두 행에 걸치는데,
   *  잘린 쪽 모서리를 각지게 해서 "이어진 하나"로 읽히게 한다. */
  const windowInDay = (dayStart: number) => {
    const s = Math.max(winStart, dayStart)
    const e = Math.min(winEnd, dayStart + DAY_MS)
    if (e <= s) return null
    return {
      left: (s - dayStart) / DAY_MS,
      width: (e - s) / DAY_MS,
      openLeft: winStart < dayStart,
      openRight: winEnd > dayStart + DAY_MS,
    }
  }

  /* ── 미니맵 드래그 ── */
  const miniRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; start: number } | null>(null)
  const fullMs = model.rangeEndMs - model.rangeStartMs

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = miniRef.current?.getBoundingClientRect()
    if (!box) return
    // 창 밖을 누르면 그 지점을 창 중앙으로
    const t = model.rangeStartMs + ((e.clientX - box.left) / box.width) * fullMs
    const next = t < winStart || t > winEnd ? clamp(t - winMs / 2, minStart, maxStart) : winStart
    moveWindow(next)
    dragRef.current = { x: e.clientX, start: next }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    const box = miniRef.current?.getBoundingClientRect()
    if (!d || !box) return
    const delta = ((e.clientX - d.x) / box.width) * fullMs
    moveWindow(clamp(d.start + delta, minStart, maxStart))
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  /* ── 창 안 데이터 ── */
  const winSpans = useMemo(() => clipToWindow(model.spans, winStart, winEnd), [model.spans, winStart, winEnd])
  const winRssi = useMemo(() => model.rssi.filter((p) => p.ms >= winStart && p.ms <= winEnd), [model.rssi, winStart, winEnd])

  // RSSI polyline — 보간 금지. 두 곳에서 선을 끊는다:
  //  ① 결측(null = 원본이 null이거나 0)
  //  ② 수신 간격이 LINK_GAP_MS를 넘는 공백 — 히트맵 화살표와 같은 임계라 두 뷰가 같은 얘기를 한다.
  //     (안 끊으면 심야 4~6시간 무보고 구간이 직선으로 이어져 신호가 계속 온 것처럼 보인다)
  const rssiPaths = useMemo(() => {
    const segs: string[] = []
    let cur: string[] = []
    let prevMs: number | null = null
    const flush = () => { if (cur.length > 1) segs.push(cur.join(' ')); cur = [] }
    for (const p of winRssi) {
      if (p.dbm === null) { flush(); prevMs = null; continue }
      if (prevMs !== null && p.ms - prevMs > LINK_GAP_MS) flush()
      const x = ((p.ms - winStart) / winMs) * 1000
      const y = ((RSSI_MAX - clamp(p.dbm, RSSI_MIN, RSSI_MAX)) / (RSSI_MAX - RSSI_MIN)) * 100
      cur.push(`${x.toFixed(2)},${y.toFixed(2)}`)
      prevMs = p.ms
    }
    flush()
    return segs
  }, [winRssi, winStart, winMs])

  const hourTicks = useMemo(() => {
    const step = winMs <= 6 * HOUR_MS ? HOUR_MS : winMs <= 12 * HOUR_MS ? 2 * HOUR_MS : 3 * HOUR_MS
    const out: number[] = []
    for (let t = Math.ceil(winStart / step) * step; t <= winEnd; t += step) out.push(t)
    return out
  }, [winStart, winEnd, winMs])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /><span className="text-[12px]">추이를 불러오는 중…</span>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-destructive">
        <AlertTriangle className="h-4 w-4" /><span className="text-[12px]">추이를 불러오지 못했습니다.</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>최근 {HEATMAP_DAYS}일 · 과열 <b className="text-destructive">{model.totalOverheats}</b>회</span>
        <span>수신 {model.sampleCount.toLocaleString()}건</span>
        {isFetchingMore && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />더 받는 중…</span>}
        {truncated && <span className="text-warning">조회 상한에 걸려 일부 구간이 빠졌습니다</span>}
      </div>

      {/* ── A. 히트맵 ── */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="w-9 shrink-0" />
          <div className={`${GRID_24} flex-1`}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center text-[10px] leading-none text-muted-foreground/70">
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-[3px]">
          {model.days.map((day, dayIdx) => {
            const dayStart = day.startMs
            const dayEnd = dayStart + DAY_MS
            const dayLinks: LinkSpan[] = model.links.filter((l) => l.endMs >= dayStart && l.startMs <= dayEnd)
            const isToday = dayIdx === model.days.length - 1
            const winBar = windowInDay(dayStart)
            return (
              <div key={day.dayKey} className="flex items-center gap-1.5">
                <span className={`w-9 shrink-0 text-[10px] leading-none ${isToday ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                  {day.label}
                </span>
                <div className="relative flex-1">
                  <div className={GRID_24}>
                    {model.cells.slice(dayIdx * 24, dayIdx * 24 + 24).map((cell) => {
                      const key = `${cell.dayKey}#${cell.hour}`
                      const future = cell.startMs > model.rangeEndMs
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={future}
                          onClick={() => jumpTo(cell)}
                          title={
                            future
                              ? `${day.label} ${cell.hour}시 · 아직 오지 않음`
                              : `${day.label} ${cell.hour}시 · 과열 ${cell.overheatCount}회 · 수신 ${cell.sampleCount}건`
                          }
                          className={`h-6 overflow-hidden rounded-[3px] transition-all ${
                            future ? 'bg-transparent' : heatCellClass(cell)
                          } ${
                            focusStartMs === cell.startMs ? 'ring-2 ring-highlight/50 ring-offset-1' : ''
                          } ${future ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                        >
                          {/* 강조 셀 — 테두리는 연하게, 안쪽 wash는 진하게 */}
                          {focusStartMs === cell.startMs && <span className="block h-full w-full bg-highlight/60" />}
                        </button>
                      )
                    })}
                  </div>
                  {/* 현재 밴드 창 — 셀을 감싸는 형광펜 박스. 미니맵의 창 사각형과 같은 표현이라
                      "같은 것"으로 읽힌다. 라임은 파랑(기기 신호)·빨강(과열) 어느 쪽과도 안 겹치고,
                      옅은 wash만 깔아 형광펜처럼 보이면서 셀의 과열 농도 판독을 해치지 않는다.
                      창이 자정을 넘어 잘린 쪽은 모서리를 각지게 하고 그쪽 테두리를 없애
                      두 조각이 '이어진 하나'로 읽히게 한다. */}
                  {winBar && (
                    <div
                      className={`pointer-events-none absolute -inset-y-[3px] bg-highlight/25 ${
                        winBar.openLeft ? 'rounded-l-none border-l-0' : 'rounded-l-[8px]'
                      } ${winBar.openRight ? 'rounded-r-none border-r-0' : 'rounded-r-[8px]'}`}
                      style={{
                        left: `calc(${pct(winBar.left)} - 2px)`,
                        width: `calc(max(4px, ${pct(winBar.width)}) + 4px)`,
                      }}
                    />
                  )}
                  {/* Wi-Fi 신호 수신 구간 — 셀 위 absolute 오버레이 */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[8px]">
                    {dayLinks.map((l, i) => {
                      const s = Math.max(l.startMs, dayStart)
                      const e = Math.min(l.endMs, dayEnd)
                      return (
                        <LinkArrow
                          key={i}
                          left={(s - dayStart) / DAY_MS}
                          width={Math.max((e - s) / DAY_MS, 0.004)}
                          title={`신호 수신 ${formatKstTime(s)} – ${formatKstTime(e)}`}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-[42px] text-[10px] text-muted-foreground">
          <span className="font-semibold">과열</span>
          {HEAT_LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <span className={`h-2.5 w-4 rounded-[2px] ${l.cls}`} />{l.label}
            </span>
          ))}
          <span className="ml-1 flex items-center gap-1">
            <span className="h-[2px] w-5 rounded-full bg-primary" />신호 수신
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-[11px] w-5 rounded-[4px] bg-highlight/40" />
            아래 밴드 구간
          </span>
        </div>
      </div>

      {/* ── B. 밴드 ── */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-bold text-foreground">{formatKst(winStart)} – {formatKstTime(winEnd)}</span>
          <div className="ml-auto flex items-center gap-1">
            {BAND_WINDOWS.map((w) => (
              <button
                key={w.label}
                type="button"
                onClick={() => changeWindow(w.ms)}
                className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold transition-all ${
                  winMs === w.ms
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* 과열 레인 */}
        <div className="mb-1 flex items-center gap-2">
          <span className="w-11 shrink-0 text-[10px] font-semibold text-destructive">과열</span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-page">
            <SelectedBand at={selectedInBand} />
            {winSpans.map((s, i) => {
              const l = clamp((s.startMs - winStart) / winMs, 0, 1)
              const w = clamp((s.endMs - winStart) / winMs, 0, 1) - l
              const dur = formatDuration(s.endMs - s.startMs)
              const note = s.state === 'closed' ? '' : s.state === 'ongoing' ? ' · 진행 중' : ' · 종료 미확인'
              return (
                <div
                  key={i}
                  title={`${formatKst(s.startMs)} · ${dur}${note}${s.clippedLeft ? ' · 시작 미확인' : ''}`}
                  className={`absolute inset-y-[2px] rounded-[2px] ${s.state === 'closed' ? 'bg-destructive' : 'bg-destructive/50'}`}
                  style={{ left: pct(l), width: `max(2px, ${pct(w)})` }}
                />
              )
            })}
          </div>
        </div>

        {/* RSSI 레인 */}
        <div className="flex items-start gap-2">
          <span className="w-11 shrink-0 pt-1 text-[10px] font-semibold text-primary">RSSI</span>
          <div className="relative h-[72px] flex-1 overflow-hidden rounded-md bg-page">
            {/* SVG보다 먼저 렌더해야 RSSI 선을 가리지 않는다 */}
            <SelectedBand at={selectedInBand} />
            {RSSI_THRESHOLDS.map((v) => (
              <div
                key={v}
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border"
                style={{ top: pct((RSSI_MAX - v) / (RSSI_MAX - RSSI_MIN)) }}
              >
                <span className="absolute right-1 -top-3.5 text-[9px] text-muted-foreground/70">{v}</span>
              </div>
            ))}
            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              {rssiPaths.map((pts, i) => (
                <polyline
                  key={i}
                  points={pts}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {rssiPaths.length === 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
                이 구간에 수신된 신호가 없습니다
              </span>
            )}
          </div>
        </div>

        {/* 시각 눈금 */}
        <div className="relative ml-[52px] mt-1 h-4">
          {hourTicks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 text-[10px] text-muted-foreground/70"
              style={{ left: pct((t - winStart) / winMs) }}
            >
              {formatKstTime(t)}
            </span>
          ))}
        </div>

        {/* 미니맵 */}
        <div
          ref={miniRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative ml-[52px] mt-1.5 h-7 cursor-grab touch-none select-none rounded-md bg-page active:cursor-grabbing"
        >
          {model.days.slice(1).map((d) => (
            <div key={d.dayKey} className="absolute inset-y-0 w-px bg-border" style={{ left: pct((d.startMs - model.rangeStartMs) / fullMs) }} />
          ))}
          {model.spans.map((s, i) => (
            <div
              key={i}
              className="pointer-events-none absolute inset-y-1 bg-destructive"
              style={{ left: pct((s.startMs - model.rangeStartMs) / fullMs), width: `max(1px, ${pct((s.endMs - s.startMs) / fullMs)})` }}
            />
          ))}
          <div
            className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-highlight/70 bg-highlight/25"
            style={{ left: pct((winStart - model.rangeStartMs) / fullMs), width: pct(winMs / fullMs) }}
          />
        </div>
        <div className="ml-[52px] mt-0.5 flex justify-between text-[10px] text-muted-foreground/70">
          <span>{kstShortDay(model.rangeStartMs)}</span>
          <span>{kstShortDay(model.rangeEndMs)}</span>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
        <Info className="mt-px h-3 w-3 shrink-0" />
        <span>
          기기는 상태가 변할 때만 보고합니다(과열 변화 · Wi-Fi 신호 5dBm 이상 변화). 신호가 안정적이면 보고가 뜸해지므로,
          화살표가 끊긴 구간은 <b>연결이 끊긴 것이 아니라 보고가 없던 구간</b>입니다(판정 간격 {formatDuration(LINK_GAP_MS)}).
          시각은 모두 KST 기준 서버 수신 시각입니다.
        </span>
      </p>
    </div>
  )
}
