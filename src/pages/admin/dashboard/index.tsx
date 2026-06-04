import {
  Building2,
  ArrowUpRight,
  MoreHorizontal,
  MapPin,
  ChevronRight,
  Package,
  Shield,
  Clock,
  ExternalLink,
  Sparkles,
  Download,
} from 'lucide-react'

import bannerImg from '@/assets/banner-illustration.png'
import mapImg from '@/assets/map-view.png'

/* ══════════════════════════════════════════════════════
   Dummy data
   ══════════════════════════════════════════════════════ */

const firmwareInfo = {
  current: 'v2.4.1',
  latest: 'v2.5.0',
  updatable: 12,
  releaseDate: '2025-01-15',
}

const unassignedDevices = [
  { id: 'HL-0101', mac: 'AA:BB:CC:DD:EE:01', registeredAt: '2025-01-10' },
  { id: 'HL-0102', mac: 'AA:BB:CC:DD:EE:02', registeredAt: '2025-01-12' },
  { id: 'HL-0103', mac: 'AA:BB:CC:DD:EE:03', registeredAt: '2025-01-14' },
]

const telecoilZoneSummary = [
  { name: '서울시청', total: 8, active: 8, status: 'normal' as const },
  { name: '부산역', total: 6, active: 5, status: 'warning' as const },
  { name: '국립중앙박물관', total: 12, active: 12, status: 'normal' as const },
  { name: '인천공항', total: 10, active: 10, status: 'normal' as const },
  { name: '대전시청', total: 4, active: 3, status: 'error' as const },
  { name: '광주광역시청', total: 6, active: 6, status: 'normal' as const },
]

const recentActivities = [
  { action: '볼륨 조정', target: 'HL-0042 (서울시청)', actor: '관리자', time: '10분 전' },
  { action: '기기 등록', target: 'HL-0103', actor: '관리자', time: '2시간 전' },
  { action: '알림 전달', target: '부산역 담당자에게', actor: '관리자', time: '3시간 전' },
  { action: 'OTA 업데이트', target: 'HL-0015 외 3대', actor: '시스템', time: '5시간 전' },
]

/* ══════════════════════════════════════════════════════
   Sub‑components
   ══════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: 'normal' | 'warning' | 'error' }) {
  const m = {
    normal: { label: '정상', dot: 'bg-success', cls: 'bg-success/10 text-success' },
    warning: { label: '경고', dot: 'bg-warning', cls: 'bg-warning/10 text-warning' },
    error: { label: '오류', dot: 'bg-destructive', cls: 'bg-destructive/10 text-destructive' },
  }
  const s = m[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}


/* ══════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════ */

export default function AdminDashboard() {
  return (
    <div className="space-y-6">

      {/* ─── Welcome Banner ─── */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'color-mix(in srgb, #246BD1 20%, transparent)',
          minHeight: '11.75rem',
          padding: '1.875rem 2.5rem',
        }}
      >
        <div className="relative z-10 max-w-xl">
          <h2 className="text-[clamp(1.375rem,1.1rem+0.8vw,1.625rem)] font-bold text-[#1E293B] mb-2">
            환영합니다, 관리자님!
          </h2>
          <p className="text-[clamp(0.8125rem,0.75rem+0.25vw,0.875rem)] text-[#475569] leading-[1.7] max-w-[24rem]">
            현재 전체 100개의 히어링 루프 중 98개가 정상 작동 중이며,
            <br />
            3개의 미확인 알림이 있습니다.
          </p>
        </div>
        <div className="absolute right-6 bottom-0 flex items-end" style={{ width: 'clamp(14rem, 25vw, 18rem)' }}>
          <img
            src={bannerImg}
            alt="히어링 루프 모니터링 일러스트"
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ─── Main grid: left (map + table) / right (widgets) ─── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_400px] items-stretch">

        {/* ══ Left column ══ */}
        <div className="flex flex-col gap-6">

          {/* Map View */}
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-[15px] font-bold text-foreground">전체 장비 지도뷰</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  시스템 정상
                </span>
                <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                  전체보기 <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Map area */}
            <div className="relative bg-gradient-to-br from-main-blue-1/40 to-page" style={{ minHeight: '400px' }}>
              <img
                src={mapImg}
                alt="전체 장비 지도뷰"
                className="w-full h-full object-cover"
                style={{ minHeight: '400px' }}
              />
              {/* Bottom overlay stats */}
              {/* <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                {[
                  { label: '전체', value: '100', color: 'bg-primary', ring: 'ring-primary/20' },
                  { label: '정상', value: '98', color: 'bg-success', ring: 'ring-success/20' },
                  { label: '경고', value: '1', color: 'bg-warning', ring: 'ring-warning/20' },
                  { label: '오류', value: '1', color: 'bg-destructive', ring: 'ring-destructive/20' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md px-3.5 py-2 shadow-md ring-1 ${s.ring}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                    <span className="text-[14px] font-extrabold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div> */}
            </div>
          </div>

          {/* Telecoil Zone Summary */}
          <div className="rounded-2xl border border-border bg-white shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-[15px] font-bold text-foreground">텔레코일존별 요약</h3>
              </div>
              <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                전체보기 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full h-full">
                <thead>
                  <tr className="bg-page/50">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">텔레코일존</th>
                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">장비수</th>
                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">가동</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ minWidth: '140px' }}>가동률</th>
                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">상태</th>
                    <th className="px-6 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {telecoilZoneSummary.map((zone, i) => (
                    <tr
                      key={i}
                      className="transition-colors hover:bg-main-blue-1/10 cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <span className="text-[13px] font-semibold text-foreground">{zone.name}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[13px] font-semibold text-foreground">{zone.total}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[13px] font-medium text-foreground">
                          {zone.active}<span className="text-muted-foreground">/{zone.total}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const pct = Math.round((zone.active / zone.total) * 100)
                          const barColor = pct === 100 ? 'bg-success' : pct >= 80 ? 'bg-primary' : pct >= 60 ? 'bg-warning' : 'bg-destructive'
                          return (
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-[11px] font-bold tabular-nums ${
                                pct === 100 ? 'text-success' : pct >= 80 ? 'text-primary' : pct >= 60 ? 'text-warning' : 'text-destructive'
                              }`}>
                                {pct}%
                              </span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={zone.status} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-page transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ══ Right column (widgets) ══ */}
        <div className="flex flex-col gap-6">

          {/* Recent Activity */}
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-[15px] font-bold text-foreground">최근 활동</h3>
              </div>
              <button className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                전체보기
              </button>
            </div>
            <div className="divide-y divide-border/40">
              {recentActivities.map((act, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  {/* Timeline dot */}
                  <div className="mt-1.5 flex flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {i < recentActivities.length - 1 && (
                      <span className="w-px flex-1 bg-border mt-1" style={{ minHeight: '20px' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-foreground leading-snug">
                      <span className="font-bold">{act.action}</span>
                      <span className="text-muted-foreground"> — {act.target}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {act.actor} · {act.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Firmware Card — eye-catching */}
          <div className="rounded-2xl border border-border/60 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #E8ECF4 0%, #D6E5F8 30%, #E0D6F8 70%, #EDE8F4 100%)' }}>
            <div className="px-5 py-4 border-b border-white/40">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-[15px] font-bold text-foreground">최신 펌웨어 정보</h3>
              </div>
            </div>
            <div className="p-5">
              {/* Version comparison */}
              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1 rounded-xl bg-white/80 backdrop-blur-sm p-4 text-center shadow-sm border border-white/60">
                  <p className="text-[11px] text-muted-foreground mb-1.5">현재 버전</p>
                  <p className="text-lg font-bold text-foreground">{firmwareInfo.current}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 shrink-0">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 rounded-xl bg-white/90 backdrop-blur-sm p-4 text-center shadow-sm border border-white/70">
                  <p className="text-[11px] text-primary/70 mb-1.5">최신 버전</p>
                  <p className="text-lg font-extrabold text-primary">{firmwareInfo.latest}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-warning" />
                  <span className="text-[12px] text-muted-foreground">업데이트 대상</span>
                </div>
                <span className="text-sm font-extrabold text-warning">{firmwareInfo.updatable}대</span>
              </div>

              {/* CTA */}
              <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-dark py-3 text-[13px] font-bold text-white transition-all hover:bg-primary-dark/90 hover:shadow-lg active:scale-[0.98]">
                <Download className="h-4 w-4" />
                OTA 업데이트 진행
              </button>
            </div>
          </div>

          {/* Unassigned Devices */}
          <div className="rounded-2xl border border-border bg-white shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-foreground">미배정 기기</h3>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/15 px-1.5 text-[11px] font-bold text-warning">
                  {unassignedDevices.length}
                </span>
              </div>
              <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-primary transition-colors hover:bg-primary-dark">
                배정하기
              </button>
            </div>
            <div className="divide-y divide-border/40 flex-1">
              {unassignedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-page/50 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                      <Package className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{device.id}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{device.mac}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{device.registeredAt}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
