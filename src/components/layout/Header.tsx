import { Bell, LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <button className="md:hidden" aria-label="메뉴 열기">
        <Menu className="h-6 w-6 text-foreground" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-main-blue-1 hover:text-primary"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-point-red" />
        </button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 ml-2">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === 'admin' ? '관리자' : '사용자'}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user.name.charAt(0)}
              </span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-point-red"
          aria-label="로그아웃"
          title="로그아웃"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
