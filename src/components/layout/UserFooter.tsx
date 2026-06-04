import { Radio } from 'lucide-react'

export function UserFooter() {
  return (
    <footer className="border-t border-border bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[13px] font-semibold text-primary-dark">
            히어링루프 모니터링 시스템
          </span>
          <span className="text-[11px] text-muted-foreground">v0.1.0</span>
        </div>

        {/* Center: Links */}
        <nav className="flex items-center gap-5">
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
