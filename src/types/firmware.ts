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

/* ══════════════════════════════════════════════════════
   펌웨어 업데이트 진행 — SSE + 세션 도메인
   ══════════════════════════════════════════════════════ */

/** POST /firmware/:id/send/:mac 응답 */
export interface SendFirmwareResponse {
  message: string
  session_id: number
}

/** SSE GET /firmware/:mac/update-progress 이벤트 data */
export interface FirmwareUpdateProgress {
  mac: string
  type: 'self' | 'target'
  progress_percent: number
  status: 'downloading' | 'verifying' | 'flashing' | 'complete' | 'failed'
  message: string | null
}

/** GET /firmware/:mac/sessions 항목 */
export interface UpdateSessionDto {
  id: number
  mac_address: string
  device_id: number | null
  /** 펌웨어 삭제 시 null */
  firmware_id: number | null
  /** 펌웨어 삭제 후에도 보존 */
  firmware_version: string
  status: 'in_progress' | 'complete' | 'failed'
  triggered_at: string
  /** 진행 중이면 null */
  completed_at: string | null
  created_at: string
}

export interface UpdateSessionPageDto {
  data: UpdateSessionDto[]
  total: number
  page: number
  limit: number
}

/** GET /firmware/sessions/:sessionId 로그 항목 */
export interface UpdateSessionLogDto {
  id: number
  session_id: number
  type: 'self' | 'target'
  progress_percent: number | null
  status: 'downloading' | 'verifying' | 'flashing' | 'complete' | 'failed' | null
  message: string | null
  occurred_at: string
  created_at: string
}

/** GET /firmware/sessions/:sessionId 상세 (로그 포함) */
export interface UpdateSessionDetailDto extends UpdateSessionDto {
  logs: {
    data: UpdateSessionLogDto[]
    total: number
    page: number
    limit: number
  }
}
