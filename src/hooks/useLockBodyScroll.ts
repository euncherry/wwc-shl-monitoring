import { useEffect } from 'react'

/**
 * 모달이 열려 있는 동안 배경(body) 스크롤(휠) 잠금.
 * - 컴포넌트형 모달: 마운트 동안 잠금 → 인자 없이 `useLockBodyScroll()`
 * - 인라인 조건부 모달: 상태값 전달 → `useLockBodyScroll(!!open)`
 */
export function useLockBodyScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [enabled])
}
