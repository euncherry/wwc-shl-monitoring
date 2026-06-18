import { Outlet } from 'react-router-dom'
import { AdminHeader } from './AdminHeader'
import { AdminFooter } from './AdminFooter'

export function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <AdminHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
      <AdminFooter />
    </div>
  )
}
