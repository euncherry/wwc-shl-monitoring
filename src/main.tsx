import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'
import { queryClient } from '@/lib/queryClient'

/**
 * MSW는 백엔드 미구현 API만 가로챈다(CLAUDE.md §6·§10).
 * VITE_ENABLE_MOCK이 true일 때만 워커를 띄우고, 시작을 await한 뒤 앱을 렌더한다.
 * 등록된 핸들러가 없으면(1단계) 모든 요청은 staging으로 통과한다.
 */
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCK !== 'true') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
})
