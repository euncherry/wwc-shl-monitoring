import { Radio } from 'lucide-react'

export function AdminFooter() {
  return (
    <footer className="border-t border-border bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] flex-col flex-wrap items-center gap-4 px-4 py-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:py-6 sm:text-left">
        {/* Left: Brand */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[13px] font-semibold text-primary-dark">
            히어링루프 모니터링 시스템
          </span>
          <span className="text-[11px] text-muted-foreground">v0.1.0</span>
        </div>

        {/* Center: Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {['이용약관', '개인정보처리방침', '고객센터'].map((label) => (
            <button
              key={label}
              className="text-[12px] text-muted-foreground transition-colors hover:text-primary-dark"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right: Copyright */}
        <p className="text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} WHAT WE CARE. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
