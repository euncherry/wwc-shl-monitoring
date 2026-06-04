import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi, type CreateUserInput, type UpdateUserInput } from '@/api/users'
import { zoneKeys } from './useZones'

export const userKeys = {
  all: ['users'] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
}

/** 사용자 상세 — 실 email 포함(zone.user엔 email 없어 보강용) */
export function useUser(id: number | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? 0),
    queryFn: () => usersApi.get(id as number),
    enabled: Boolean(id),
  })
}

/** 사용자 계정 생성 (텔레코일존 계정 = role:ZONE_USER + zone_id) */
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  })
}

/** 사용자 수정 (ID·이메일 변경 / PW 재설정) */
export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateUserInput }) => usersApi.update(id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(vars.id) })
      qc.invalidateQueries({ queryKey: zoneKeys.all })
    },
  })
}

/** 사용자 삭제 (존 삭제 전 계정 정리용) */
export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  })
}
