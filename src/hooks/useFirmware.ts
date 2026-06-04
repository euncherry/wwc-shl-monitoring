import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { firmwareApi, type UploadFirmwareInput } from '@/api/firmware'
import type { Firmware, FirmwareApiResponse } from '@/types/firmware'

/** 펌웨어 쿼리 키 */
export const firmwareKeys = {
  all: ['firmware'] as const,
  list: () => [...firmwareKeys.all, 'list'] as const,
}

/** FirmwareApiResponse(실응답 + 목 description) → 뷰모델 */
function toFirmware(dto: FirmwareApiResponse): Firmware {
  return {
    id: dto.id,
    version: dto.version,
    s3Url: dto.s3_url,
    firmwareType: dto.firmware_type,
    description: dto.description ?? '',
    uploadedAt: dto.uploaded_at,
  }
}

/** 펌웨어 목록 — 최신 업로드순 정렬 */
export function useFirmwares() {
  return useQuery({
    queryKey: firmwareKeys.list(),
    queryFn: firmwareApi.list,
    select: (data) =>
      data
        .map(toFirmware)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
  })
}

/** 펌웨어 업로드 (multipart) — 409 중복은 호출부에서 처리 */
export function useUploadFirmware() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadFirmwareInput) => firmwareApi.upload(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: firmwareKeys.all }),
  })
}

/** 개별 기기 업데이트 전송 (POST /firmware/:id/send/:mac) */
export function useSendFirmwareUpdate() {
  return useMutation({
    mutationFn: ({ id, mac }: { id: number; mac: string }) => firmwareApi.sendUpdate(id, mac),
  })
}
