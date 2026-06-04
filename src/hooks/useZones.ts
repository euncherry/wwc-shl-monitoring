import { useQuery } from '@tanstack/react-query'
import { zonesApi } from '@/api/zones'

export const zoneKeys = {
  all: ['zones'] as const,
  list: () => [...zoneKeys.all, 'list'] as const,
}

/** 텔레코일존 목록 (등록 폼 드롭다운 등) */
export function useZones() {
  return useQuery({
    queryKey: zoneKeys.list(),
    queryFn: zonesApi.list,
  })
}
