/* ══════════════════════════════════════════════════════
   펌웨어 도메인 타입 (3C) — hearingloop-server firmware 모듈 대조
   2026-06-18 백엔드 개편(develop): 단일 zip 업로드(update.json 내장),
   version=release_version, description→updates[], hl/wifi 버전 분리.
   ══════════════════════════════════════════════════════ */

/**
 * FirmwareResponseDto — GET /firmware, POST /firmware 응답.
 * version = update.json의 release_version(날짜형 "260617", 중복 업로드 시 400).
 */
export interface FirmwareResponseDto {
  id: number
  /** 릴리즈 버전 (update.json release_version, 예: "260617") */
  version: string
  /** HL(nRF) 펌웨어 버전 (예: "1.1.0") */
  hl_version: string
  /** WiFi(ESP32) 펌웨어 버전 (예: "1.1.5") */
  wifi_version: string
  /** HearingLoop MCU 펌웨어 S3 key */
  hl_s3_key: string
  /** WiFi 모듈 펌웨어 S3 key */
  wifi_s3_key: string
  /** 변경 내역 (update.json updates[], 예: "wifi: ...", "hl: ...") */
  updates: string[] | null
  uploaded_at: string
}

/** 펌웨어 뷰모델 */
export interface Firmware {
  id: number
  /** 릴리즈 버전 ("260617") */
  version: string
  /** HL(nRF) 펌웨어 버전 */
  hlVersion: string
  /** WiFi(ESP32) 펌웨어 버전 */
  wifiVersion: string
  /** HL(HearingLoop MCU) 펌웨어 S3 key */
  hlS3Key: string
  /** WiFi 모듈 펌웨어 S3 key */
  wifiS3Key: string
  /** 변경 내역 */
  updates: string[]
  uploadedAt: string
}

/* ══════════════════════════════════════════════════════
   펌웨어 업데이트 진행 — SSE + 세션 도메인
   ══════════════════════════════════════════════════════ */

/** POST /firmware/:id/send/:mac 응답 */
export interface SendFirmwareResponse {
  message: string
  session_id: number
  firmware_id: number
}

/** SSE GET /firmware/:mac/update-progress 이벤트 data */
export interface FirmwareUpdateProgress {
  mac: string
  /** ⚠️ 'session'은 MCU가 아니라 세션 전체 이벤트(타임아웃·버전동일 자동완료). 백엔드 UpdateProgressEvent와 동일 */
  type: 'self' | 'target' | 'session'
  progress_percent: number
  status: 'downloading' | 'verifying' | 'flashing' | 'complete' | 'failed'
  message: string | null
  /** true 이면 이 이벤트가 마지막 — 프론트에서 SSE 스트림 종료 */
  is_final?: boolean
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
