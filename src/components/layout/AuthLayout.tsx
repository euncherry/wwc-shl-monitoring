import { useEffect, useState, type ReactNode } from 'react'
import { Radio } from 'lucide-react'

/** 목업 차트가 순환하는 막대 모양들(막대 높이 %).
 *  한 모양으로 바뀐 뒤 잠시 머물렀다가 다음 모양으로 넘어간다 — 데이터가 갱신되는 것처럼 보이게. */
const BAR_SHAPES = [
  [40, 65, 45, 80, 55, 70, 60, 75, 50, 85, 65, 90],
  [72, 48, 88, 52, 90, 42, 78, 58, 82, 62, 46, 68],
  [55, 82, 62, 45, 74, 88, 50, 90, 66, 40, 78, 56],
  [86, 58, 70, 90, 46, 64, 84, 44, 76, 52, 88, 60],
]
/** 모양 전환(0.45s) + 유지(2.5s) */
const SHAPE_HOLD_MS = 2950
const SHAPE_MORPH_MS = 450

/** 목업 막대 차트 — 모양 전체가 한 번에 바뀌고 잠시 멈춘다.
 *  높이가 아니라 scaleY를 바꿔 매 프레임 리플로우가 없다. */
function MockBarChart() {
  const [step, setStep] = useState(0)
  /** 마운트 직후 바닥에서 첫 모양으로 자라 오르게 하는 스위치 */
  const [grown, setGrown] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setGrown(true)
      return // 움직임 최소화 — 첫 모양으로 고정하고 순환하지 않는다
    }
    const rise = setTimeout(() => setGrown(true), 250)
    const cycle = setInterval(() => setStep((v) => (v + 1) % BAR_SHAPES.length), SHAPE_HOLD_MS)
    return () => {
      clearTimeout(rise)
      clearInterval(cycle)
    }
  }, [])

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex h-16 items-end gap-1">
        {BAR_SHAPES[step].map((h, i) => (
          <div
            key={i}
            className="h-full flex-1 origin-bottom rounded-sm bg-primary/20 ease-out"
            style={{
              transform: `scaleY(${grown ? h / 100 : 0})`,
              transition: `transform ${SHAPE_MORPH_MS}ms cubic-bezier(.22,.61,.36,1)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* ─── Left: Branding with dashboard preview ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-page flex-col justify-between p-12">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary/8 blur-2xl" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h1 className="text-4xl font-bold leading-tight text-primary-dark">
              스마트 히어링루프
              <br />
              모니터링 시스템
            </h1>
            <p className="mt-4 text-lg text-primary-dark/60">
              실시간 모니터링으로 히어링루프 장치를 효율적으로 관리하세요
            </p>
          </div>

          {/* Dashboard preview card — 실데이터가 아닌 장식. '살아 있는 대시보드' 인상만 준다.
              모든 애니메이션은 index.css에 있고 prefers-reduced-motion에서 꺼진다. */}
          <div className="relative z-10 mt-8">
            <div className="hl-rise overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm">
              <div className="p-6">
                {/* Mini header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <span
                      aria-hidden
                      className="hl-pulse-ring pointer-events-none absolute inset-0 rounded-lg border border-primary"
                    />
                    <Radio className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-primary-dark text-sm">HearingLoop Monitor</span>
                </div>

                {/* Stat cards */}
                <div className="flex gap-4 mb-6">
                  {[
                    { label: '전체 장치', bar: 'bg-primary/20' },
                    { label: '정상 운영', bar: 'bg-point-1/40' },
                    { label: '경고', bar: 'bg-warning/20' },
                  ].map((c, i) => (
                    <div
                      key={c.label}
                      className="hl-rise flex-1 rounded-xl bg-gray-50 p-4"
                      style={{ animationDelay: `${0.15 + i * 0.09}s` }}
                    >
                      <div className="mb-2 h-2 w-12 rounded bg-main-20" />
                      <div className={`h-5 w-8 rounded ${c.bar}`} />
                      <p className="mt-1 text-[10px] text-gray-400">{c.label}</p>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <MockBarChart />
              </div>

              {/* Activity rows */}
              <div className="border-t border-gray-100 px-6 py-3">
                <div className="mb-3 h-2 w-20 rounded bg-main-20" />
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="hl-rise flex items-center gap-3 py-2"
                    style={{ animationDelay: `${0.45 + i * 0.1}s` }}
                  >
                    <div className="h-2 w-2 rounded-full bg-main-20" />
                    <div className="hl-shimmer relative h-2 flex-1 overflow-hidden rounded bg-gray-100" />
                    <div className="h-2 w-16 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right: Auth form ─── */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2 bg-gradient-to-b from-auth-start to-auth-end">
        {children}
      </div>
    </div>
  )
}
