import { NavLink, useNavigate } from 'react-router-dom'
import {
  Radio,
  LayoutDashboard,
  Wifi,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { to: '/user', icon: LayoutDashboard, label: '대시보드' },
  { to: '/user/hearing-loops', icon: Wifi, label: '히어링루프 관리' },
  { to: '/user/settings', icon: Settings, label: '정보관리' },
  { to: '/user/support', icon: HelpCircle, label: '지원' },
]

export function UserHeader() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
        {/* ─── Left: Logo ─── */}
        <NavLink to="/user" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <span className="text-[15px] font-bold text-primary-dark tracking-tight hidden sm:block">
            히어링루프
          </span>
        </NavLink>

        {/* ─── Center: Nav tabs ─── */}
        <nav className="flex items-center gap-1 rounded-2xl bg-page p-1 mx-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/user'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-primary-dark shadow-sm'
                    : 'text-muted-foreground hover:text-primary-dark hover:bg-white/60'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ─── Right: Actions ─── */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="mx-1 h-8 w-px bg-border" />

          {user && (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center ring-2 ring-main-blue-1">
                <span className="text-xs font-bold text-white">
                  {user.name.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-[13px] font-semibold text-foreground leading-tight">{user.name}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">사용자</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-point-red"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  )
}
