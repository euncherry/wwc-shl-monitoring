import type { ReactNode } from 'react'
import { Radio } from 'lucide-react'

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

          {/* Dashboard preview card */}
          <div className="relative z-10 mt-8">
            <div className="rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm overflow-hidden">
              <div className="p-6">
                {/* Mini header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <Radio className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-primary-dark text-sm">HearingLoop Monitor</span>
                </div>

                {/* Stat cards */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 rounded-xl bg-gray-50 p-4">
                    <div className="h-2 w-12 rounded bg-main-20 mb-2" />
                    <div className="h-5 w-8 rounded bg-primary/20" />
                    <p className="text-[10px] text-gray-400 mt-1">전체 장치</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-gray-50 p-4">
                    <div className="h-2 w-12 rounded bg-main-20 mb-2" />
                    <div className="h-5 w-8 rounded bg-point-1/40" />
                    <p className="text-[10px] text-gray-400 mt-1">정상 운영</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-gray-50 p-4">
                    <div className="h-2 w-12 rounded bg-main-20 mb-2" />
                    <div className="h-5 w-8 rounded bg-warning/20" />
                    <p className="text-[10px] text-gray-400 mt-1">경고</p>
                  </div>
                </div>

                {/* Chart placeholder */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-end gap-1 h-16">
                    {[40, 65, 45, 80, 55, 70, 60, 75, 50, 85, 65, 90].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-primary/20"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity rows */}
              <div className="border-t border-gray-100 px-6 py-3">
                <div className="h-2 w-20 rounded bg-main-20 mb-3" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-main-20" />
                    <div className="h-2 flex-1 rounded bg-gray-100" />
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
