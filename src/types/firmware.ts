/* ══════════════════════════════════════════════════════
   펌웨어 도메인 타입 (3C) — hearingloop-server firmware 모듈 대조
   2026-06-06 백엔드 개편: HL+WiFi 2파일 세트, 버전 서버 자동증가, presigned URL
   ══════════════════════════════════════════════════════ */

/**
 * FirmwareResponseDto — GET /firmware, POST /firmware 응답.
 * version은 서버가 자동 부여하는 증가 번호("1","2"...). 설명·firmware_type 없음.
 */
export interface FirmwareResponseDto {
  id: number
  /** 자동 증가 버전 번호 ("1", "2", "3" ...) */
  version: string
  /** HearingLoop MCU 펌웨어 S3 key */
  hl_s3_key: string
  /** WiFi 모듈 펌웨어 S3 key */
  wifi_s3_key: string
  /** 간단 설명(선택, REAL — 367714f) */
  description: string | null
  uploaded_at: string
}

/** 펌웨어 뷰모델 */
export interface Firmware {
  id: number
  version: string
  /** HL(HearingLoop MCU) 펌웨어 S3 key */
  hlS3Key: string
  /** WiFi 모듈 펌웨어 S3 key */
  wifiS3Key: string
  /** 간단 설명 */
  description: string
  uploadedAt: string
}
