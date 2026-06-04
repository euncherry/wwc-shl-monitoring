/* ══════════════════════════════════════════════════════
   펌웨어 도메인 타입 (3C) — hearingloop-server firmware 모듈 대조
   ══════════════════════════════════════════════════════ */

/**
 * FirmwareResponseDto — GET /firmware, POST /firmware 응답.
 * ⚠️ 백엔드 엔티티에 `description` 없음 → MSW가 목으로 병합(§10·§13).
 */
export interface FirmwareResponseDto {
  id: number
  version: string
  s3_url: string
  /** 'self' | 'target' (현재 self 고정) */
  firmware_type: string
  uploaded_at: string
}

/** MSW가 병합하는 목 필드(엔티티에 없음 — 배포되면 제거). */
export interface FirmwareMockFields {
  /** 간단 설명(목) */
  description?: string
}

/** 실응답 + MSW 목 병합 결과 */
export type FirmwareApiResponse = FirmwareResponseDto & FirmwareMockFields

/** 펌웨어 뷰모델 */
export interface Firmware {
  id: number
  version: string
  s3Url: string
  firmwareType: string
  /** 간단 설명(목) */
  description: string
  uploadedAt: string
}
