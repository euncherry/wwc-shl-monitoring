import { LayoutDashboard, Radio, Settings, Activity } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/devices', icon: Radio, label: '장치 관리' },
  { to: '/monitoring', icon: Activity, label: '모니터링' },
  { to: '/settings', icon: Settings, label: '설정' },
]

export function Sidebar() {
  return (
    <aside className="hidden w-64 border-r border-border bg-white md:flex md:flex-col">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Radio className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-base font-bold text-primary-dark">
          히어링루프
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-main-blue-1 hover:text-primary-dark'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          Hearing Loop Monitor v0.1.0
        </p>
      </div>
    </aside>
  )
}
