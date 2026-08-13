import { useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { devicesApi } from '@/api/devices'
import { deviceKeys } from './useDevices'
import type { DeviceStatusLogDto } from '@/types/device'
import { DAY_MS, kstDayStartMs, toMs } from '@/lib/kst'
import { HEATMAP_DAYS, MAX_STATUS_PAGES, STATUS_PAGE_SIZE } from '@/lib/trend'

export interface DeviceStatusRange {
  /** reported_at 오름차순, id 중복 제거 완료 */
  logs: DeviceStatusLogDto[]
  rangeStartMs: number
  isLoading: boolean
  isError: boolean
  /** 아직 페이지를 더 받는 중 */
  isFetchingMore: boolean
  /** 페이지 상한에 걸려 조회 범위를 다 못 채웠다 */
  truncated: boolean
}

/** N일치 상태이력 수집.
 *
 *  `GET /devices/:mac/status`에 날짜 범위 필터가 없어서(page/limit만) **최신순으로 받다가
 *  범위 시작을 넘기면 중단**한다. 임의로 from/to를 보내면 안 된다 — 컨트롤러가 raw @Query라
 *  정의되지 않은 파라미터는 400 없이 조용히 무시돼서 "필터된 줄 알았는데 전체"가 된다.
 *
 *  모달을 열 때 한 번만 받고, 이후 히트맵 클릭·밴드 드래그는 전부 클라이언트 슬라이스라
 *  추가 요청이 발생하지 않는다.
 */
export function useDeviceStatusRange(
  mac: string | undefined,
  days = HEATMAP_DAYS,
  enabled = true,
): DeviceStatusRange {
  // 히트맵 행이 하루 단위라 '지금부터 7일 전'이 아니라 'KST 자정 기준 6일 전 00:00'으로 잡는다.
  const rangeStartMs = useMemo(() => kstDayStartMs(Date.now()) - (days - 1) * DAY_MS, [days])

  const q = useInfiniteQuery({
    // ⚠️ days는 키에 넣지 않는다 — 넣으면 기간을 넓힐 때마다 새 쿼리가 돼서 1페이지부터 다시 받는다.
    //    같은 키를 유지하면 cutoff가 뒤로 갈 때 필요한 페이지만 이어서 받는다.
    queryKey: [...deviceKeys.all, 'statusRange', mac ?? ''] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => devicesApi.getStatusLogs(mac as string, pageParam, STATUS_PAGE_SIZE),
    getNextPageParam: (last, pages) => {
      if (pages.length >= MAX_STATUS_PAGES) return undefined
      if (last.data.length < STATUS_PAGE_SIZE) return undefined
      // 응답은 reported_at DESC — 마지막 행이 범위 시작보다 이르면 더 받을 필요가 없다
      const oldest = last.data[last.data.length - 1]
      if (oldest && toMs(oldest.reported_at) < rangeStartMs) return undefined
      return pages.length + 1
    },
    enabled: enabled && Boolean(mac),
    // 과거 구간 조회라 폴링 불필요. 모달 재개폐 시 재요청만 줄인다(전역 기본은 30초).
    staleTime: 5 * 60 * 1000,
  })

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const logs = useMemo(() => {
    const pages = q.data?.pages ?? []
    // 서버 ORDER BY에 tie-breaker가 없어(reported_at 단일키) 오프셋 페이징에서 경계 행이 중복될 수 있다.
    const byId = new Map<number, DeviceStatusLogDto>()
    for (const p of pages) for (const row of p.data) byId.set(row.id, row)
    return [...byId.values()]
      .filter((r) => toMs(r.reported_at) >= rangeStartMs)
      .sort((a, b) => (toMs(a.reported_at) - toMs(b.reported_at)) || (a.id - b.id))
  }, [q.data, rangeStartMs])

  const pageCount = q.data?.pages.length ?? 0
  const lastPage = q.data?.pages[pageCount - 1]
  const truncated =
    pageCount >= MAX_STATUS_PAGES &&
    !!lastPage &&
    lastPage.data.length === STATUS_PAGE_SIZE

  return {
    logs,
    rangeStartMs,
    isLoading: q.isLoading,
    isError: q.isError,
    isFetchingMore: q.isFetchingNextPage,
    truncated,
  }
}
