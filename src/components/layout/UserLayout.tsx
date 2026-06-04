import { Outlet } from 'react-router-dom'
import { UserHeader } from './UserHeader'
import { UserFooter } from './UserFooter'

export function UserLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <UserHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-6">
        <Outlet />
      </main>
      <UserFooter />
    </div>
  )
}
