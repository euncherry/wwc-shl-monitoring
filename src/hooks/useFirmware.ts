import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { firmwareApi, type UploadFirmwareInput } from '@/api/firmware'
import type { Firmware, FirmwareResponseDto } from '@/types/firmware'

/** 펌웨어 쿼리 키 */
export const firmwareKeys = {
  all: ['firmware'] as const,
  list: () => [...firmwareKeys.all, 'list'] as const,
  sessions: (mac: string, page: number, limit: number) =>
    [...firmwareKeys.all, 'sessions', mac, page, limit] as const,
  sessionDetail: (sessionId: number, page: number, limit: number) =>
    [...firmwareKeys.all, 'session', sessionId, page, limit] as const,
}

/** FirmwareResponseDto → 뷰모델 (방어적 기본값) */
function toFirmware(dto: FirmwareResponseDto): Firmware {
  return {
    id: dto.id,
    version: dto.version,
    hlVersion: dto.hl_version ?? '',
    wifiVersion: dto.wifi_version ?? '',
    hlS3Key: dto.hl_s3_key ?? '',
    wifiS3Key: dto.wifi_s3_key ?? '',
    updates: dto.updates ?? [],
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

/** 펌웨어 업로드 (multipart, 단일 zip) — 400/500은 호출부에서 처리 */
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

/** 기기 업데이트 세션 목록 (GET /firmware/:mac/sessions) */
export function useDeviceUpdateSessions(
  mac: string | undefined,
  page = 1,
  limit = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: firmwareKeys.sessions(mac ?? '', page, limit),
    queryFn: () => firmwareApi.getSessions(mac as string, page, limit),
    enabled: enabled && Boolean(mac),
  })
}

/** 업데이트 세션 상세 (GET /firmware/sessions/:sessionId) */
export function useUpdateSessionDetail(
  sessionId: number | undefined,
  page = 1,
  limit = 50,
) {
  return useQuery({
    queryKey: firmwareKeys.sessionDetail(sessionId ?? 0, page, limit),
    queryFn: () => firmwareApi.getSessionDetail(sessionId as number, page, limit),
    enabled: Boolean(sessionId),
  })
}
