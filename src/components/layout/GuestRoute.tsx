import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  if (isAuthenticated && user) {
    // Role-based redirect
    const target = user.role === 'admin' ? '/admin' : '/user'
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
