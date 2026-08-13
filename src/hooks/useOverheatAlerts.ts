import { useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { alertsApi } from '@/api/alerts'
import { alertKeys } from './useAlerts'
import type { AlertResponseDto } from '@/types/alert'
import { OVERHEAT_WINDOW_MS } from '@/lib/dashboard'

/** ⚠️ 백엔드가 limit을 100으로 하드캡한다(alerts.service.ts `Math.min(100, …)`). 더 크게 보내면 400이 아니라 조용히 잘린다. */
const PAGE_SIZE = 100
/** 폭주 기기 하나가 페이지를 다 먹는 상황에 대비한 상한. 걸리면 truncated로 알린다. */
const MAX_PAGES = 5

export interface OverheatAlertRange {
  alerts: AlertResponseDto[]
  isLoading: boolean
  isError: boolean
  isFetchingMore: boolean
  /** 상한에 걸려 창을 다 못 채웠다 — 기기 수가 하한값이 된다 */
  truncated: boolean
}

/**
 * 과열 알림 N일치 수집 (대시보드 롤업용).
 *
 * 과열은 하드웨어가 30초 만에 자동 복구해서 현재값만 보면 놓친다(회의 15:30).
 * 알림은 자동 종결돼도 `occurred_at`이 남으므로 "됐었는지"의 유일한 소스다.
 *
 * ⚠️ 날짜 범위 필터가 API에 없어서(AlertQueryDto) 최신순으로 받다가 창 경계를 넘으면 중단한다.
 *    임의로 from/to를 보내면 안 된다 — ValidationPipe가 DTO 클래스에만 걸려 400 없이 조용히 무시된다.
 * ⚠️ 응답의 total·pending 등 통계는 필터를 무시한 전역값이라 페이지 수 계산에 쓸 수 없다.
 */
export function useOverheatAlerts(windowMs = OVERHEAT_WINDOW_MS, enabled = true): OverheatAlertRange {
  const cutoffMs = useMemo(() => Date.now() - windowMs, [windowMs])

  const q = useInfiniteQuery({
    queryKey: [...alertKeys.all, 'overheatRange', windowMs] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      alertsApi.list({ type: 'TEMPERATURE_ANOMALY', limit: PAGE_SIZE, page: pageParam }),
    getNextPageParam: (last, pages) => {
      if (pages.length >= MAX_PAGES) return undefined
      if (last.items.length < PAGE_SIZE) return undefined
      // occurred_at DESC — 마지막 행이 창 밖이면 더 받을 필요가 없다
      const oldest = last.items[last.items.length - 1]
      if (oldest && new Date(oldest.occurred_at).getTime() < cutoffMs) return undefined
      return pages.length + 1
    },
    enabled,
    // 과거 구간이라 초 단위 신선도가 불필요한데, 요청 1건이 서버에서 COUNT 5회 + 무인덱스 스캔이라 비싸다.
    staleTime: 5 * 60 * 1000,
  })

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const alerts = useMemo(() => {
    // 서버 ORDER BY에 tie-breaker가 없어 오프셋 페이징에서 경계 행이 중복될 수 있다
    const byId = new Map<number, AlertResponseDto>()
    for (const p of q.data?.pages ?? []) for (const a of p.items) byId.set(a.id, a)
    return [...byId.values()].filter((a) => new Date(a.occurred_at).getTime() >= cutoffMs)
  }, [q.data, cutoffMs])

  const pages = q.data?.pages ?? []
  const truncated = pages.length >= MAX_PAGES && pages[pages.length - 1]?.items.length === PAGE_SIZE

  return {
    alerts,
    isLoading: q.isLoading,
    isError: q.isError,
    isFetchingMore: q.isFetchingNextPage,
    truncated,
  }
}
