import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { firmwareApi, type UploadFirmwareInput } from '@/api/firmware'
import type { Firmware, FirmwareResponseDto } from '@/types/firmware'

/** 펌웨어 쿼리 키 */
export const firmwareKeys = {
  all: ['firmware'] as const,
  list: () => [...firmwareKeys.all, 'list'] as const,
}

/** FirmwareResponseDto → 뷰모델 (구 응답엔 hl/wifi 키가 없을 수 있어 방어적으로 기본값) */
function toFirmware(dto: FirmwareResponseDto): Firmware {
  return {
    id: dto.id,
    version: dto.version,
    hlS3Key: dto.hl_s3_key ?? '',
    wifiS3Key: dto.wifi_s3_key ?? '',
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

/** 펌웨어 업로드 (multipart, HL+WiFi 2파일) — 400/500은 호출부에서 처리 */
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
