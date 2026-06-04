import type { FirmwareApiResponse, FirmwareResponseDto } from '@/types/firmware'

/**
 * 펌웨어 `description`은 백엔드 엔티티에 없는 목 필드(§10·§13).
 * 업로드 시 version을 키로 세션 동안 보관하고, 목록 응답에 병합한다.
 * 새로고침 시 초기화(다른 목과 동일하게 네트워크 레이어 한정). 백엔드에 컬럼 추가되면 제거.
 */
const descriptions = new Map<string, string>()

/** 업로드 시 호출 — version → description 기록 */
export function rememberDescription(version: string, description: string) {
  if (version) descriptions.set(version, description)
}

/** 실응답 DTO에 description(목) 병합 */
export function mergeFirmwareMock(dto: FirmwareResponseDto): FirmwareApiResponse {
  return { ...dto, description: descriptions.get(dto.version) ?? '' }
}
