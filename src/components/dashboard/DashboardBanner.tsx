import type { ReactNode } from 'react'
import bannerImg from '@/assets/banner-illustration.png'

/* ══════════════════════════════════════════════════════
   대시보드 상단 배너 (v2 디자인)

   관리자·사용자 대시보드가 공유한다. 구성은 넷:
     ① 28px 격자 텍스처   ② 우측 대각선 면 + 파문(ripple) 링
     ③ HEARING LOOP 아웃라인 워터마크
     ④ 하단 모노스페이스 티커 (라벨 + 수치)

   ⚠️ 워터마크·일러스트는 좁은 화면에서 텍스트를 덮으므로 lg 미만에서 숨긴다.
   ══════════════════════════════════════════════════════ */

export interface BannerStat {
  label: string
  value: number | string
  /** 값 색 — 기본은 진한 남색 */
  tone?: 'default' | 'success' | 'danger' | 'primary'
}

const TONE: Record<NonNullable<BannerStat['tone']>, string> = {
  default: 'text-[#132B52]',
  success: 'text-[#0E9F6E]',
  danger: 'text-[#E74C3C]',
  primary: 'text-[#1D5BB8]',
}

export function DashboardBanner({
  eyebrow,
  title,
  description,
  actions,
  stats,
  tickerRight,
}: {
  /** 날짜·마지막 수신 등 제목 위 한 줄 */
  eyebrow?: string
  title: string
  description: ReactNode
  actions?: ReactNode
  /** 하단 티커 좌측 수치들 */
  stats: BannerStat[]
  /** 하단 티커 우측 (지역·시각 등) */
  tickerRight?: string
}) {
  return (
    <section className="relative min-h-[196px] overflow-hidden rounded-2xl border border-[#DDE6F2] bg-white px-6 pb-12 pt-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] sm:px-10 sm:pt-[34px]">
      {/* ① 격자 텍스처 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(36,107,209,0.055) 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,rgba(36,107,209,0.055) 0 1px,transparent 1px 28px)',
        }}
      />

      {/* ② 우측 대각선 면 + 파문 링 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[#E4EEFB] lg:block"
        style={{ clipPath: 'polygon(17% 0,100% 0,100% 100%,0 100%)' }}
      />
      <div aria-hidden className="pointer-events-none absolute bottom-[29px] right-[164px] hidden lg:block">
        <span className="absolute -mb-[75px] -mr-[75px] h-[150px] w-[150px] rounded-full border-[1.5px] border-[rgba(36,107,209,0.30)]" />
        {[0, 1.5, 3].map((delay) => (
          <span
            key={delay}
            className="hl-ripple absolute -mb-[145px] -mr-[145px] h-[290px] w-[290px] rounded-full border-[1.5px] border-[rgba(36,107,209,0.28)]"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      {/* ③ 워터마크 */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-[300px] top-1/2 hidden -translate-y-[54%] select-none whitespace-nowrap text-[88px] font-extrabold tracking-[0.04em] text-transparent xl:block"
        style={{ WebkitTextStroke: '1.2px rgba(36,107,209,0.16)' }}
      >
        HEARING LOOP
      </span>

      {/* 본문 */}
      <div className="relative z-10 max-w-xl">
        {eyebrow && <p className="mb-1.5 text-[12px] font-semibold text-[#4E70A3]">{eyebrow}</p>}
        <h2 className="text-[clamp(1.25rem,1.05rem+0.7vw,1.4375rem)] font-extrabold tracking-[-0.01em] text-[#132B52]">
          {title}
        </h2>
        <p className="mt-2 max-w-[26rem] text-[clamp(0.8125rem,0.75rem+0.25vw,0.875rem)] leading-[1.7] text-[#475569]">
          {description}
        </p>
        {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* 일러스트 */}
      <div
        className="pointer-events-none absolute bottom-[30px] right-6 hidden items-end lg:flex"
        style={{ width: 'clamp(11rem, 18vw, 15rem)' }}
      >
        <img src={bannerImg} alt="" className="h-auto w-full" />
      </div>

      {/* ④ 하단 티커 */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-x-6 gap-y-1 overflow-hidden border-t border-[#E9EEF5] bg-white/75 px-6 py-[7px] font-mono text-[10px] tracking-[0.10em] text-[#7A8699] backdrop-blur-[6px] sm:px-9">
        <span className="shrink-0">SHL-MONITOR</span>
        {stats.map((s) => (
          <span key={s.label} className="shrink-0 whitespace-nowrap">
            {s.label} <b className={`font-extrabold ${TONE[s.tone ?? 'default']}`}>{s.value}</b>
          </span>
        ))}
        {tickerRight && <span className="ml-auto hidden shrink-0 whitespace-nowrap sm:block">{tickerRight}</span>}
      </div>
    </section>
  )
}

/** 배너 안 CTA — 채움 / 외곽선 두 종류 */
export function BannerButton({
  children,
  onClick,
  variant = 'solid',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'solid' | 'outline'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[12px] font-bold transition-colors ${
        variant === 'solid'
          ? 'bg-[#246BD1] text-white hover:bg-[#1D5BB8]'
          : 'border border-[#C9D9F0] bg-white text-[#1D5BB8] hover:bg-[#F5F9FF]'
      }`}
    >
      {children}
    </button>
  )
}
