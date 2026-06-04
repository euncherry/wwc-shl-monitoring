import type { SystemAlert } from '@/types/device'

export const systemAlerts: SystemAlert[] = [
  // ─── 처리 대기 (pending) ───
  {
    id: 'sa-001', type: '온도 이상', level: 'critical',
    message: '온도 52°C 감지 — 임계값(45°C) 초과',
    deviceId: 'HL-0011', deviceMac: 'A4:CF:12:6B:3A:11',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    state: 'pending', createdAt: '2025-01-20 13:55', processedAt: null, processedBy: null,
  },
  {
    id: 'sa-002', type: '전원 차단', level: 'critical',
    message: '전원 OFF 24시간 이상 지속 — 즉시 점검 필요',
    deviceId: 'HL-0012', deviceMac: 'A4:CF:12:6B:3A:12',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    state: 'pending', createdAt: '2025-01-20 08:00', processedAt: null, processedBy: null,
  },
  {
    id: 'sa-003', type: '연결 끊김', level: 'critical',
    message: '네트워크 연결 끊김 — 36시간 이상 미연결',
    deviceId: 'HL-0012', deviceMac: 'A4:CF:12:6B:3A:12',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    state: 'pending', createdAt: '2025-01-19 08:00', processedAt: null, processedBy: null,
  },
  {
    id: 'sa-004', type: '볼륨 이상', level: 'warning',
    message: '볼륨 95% — 설정 범위(0~90%) 초과',
    deviceId: 'HL-0040', deviceMac: 'A4:CF:12:6B:3A:40',
    telecoilZoneId: 'tz-05', telecoilZoneName: '대전시청',
    state: 'pending', createdAt: '2025-01-20 14:10', processedAt: null, processedBy: null,
  },
  {
    id: 'sa-005', type: '연결 끊김', level: 'critical',
    message: '네트워크 연결 끊김 — 4시간 이상 미연결',
    deviceId: 'HL-0041', deviceMac: 'A4:CF:12:6B:3A:41',
    telecoilZoneId: 'tz-05', telecoilZoneName: '대전시청',
    state: 'pending', createdAt: '2025-01-20 10:00', processedAt: null, processedBy: null,
  },
  {
    id: 'sa-006', type: '펌웨어 업데이트 필요', level: 'info',
    message: 'v2.3.0 → v2.5.0 업데이트 가능',
    deviceId: 'HL-0011', deviceMac: 'A4:CF:12:6B:3A:11',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    state: 'pending', createdAt: '2025-01-20 09:00', processedAt: null, processedBy: null,
  },
  {
    id: 'sa-007', type: '펌웨어 업데이트 필요', level: 'info',
    message: 'v2.4.1 → v2.5.0 업데이트 가능',
    deviceId: 'HL-0001', deviceMac: 'A4:CF:12:6B:3A:01',
    telecoilZoneId: 'tz-01', telecoilZoneName: '서울시청',
    state: 'pending', createdAt: '2025-01-20 09:00', processedAt: null, processedBy: null,
  },

  // ─── 사용자에게 전달됨 (forwarded) ───
  {
    id: 'sa-101', type: '온도 이상', level: 'warning',
    message: '온도 43°C 감지 — 주의 필요',
    deviceId: 'HL-0040', deviceMac: 'A4:CF:12:6B:3A:40',
    telecoilZoneId: 'tz-05', telecoilZoneName: '대전시청',
    state: 'forwarded', createdAt: '2025-01-19 16:30', processedAt: '2025-01-19 17:00', processedBy: '관리자',
  },
  {
    id: 'sa-102', type: '볼륨 이상', level: 'warning',
    message: '볼륨 92% — 설정 범위 초과',
    deviceId: 'HL-0030', deviceMac: 'A4:CF:12:6B:3A:30',
    telecoilZoneId: 'tz-04', telecoilZoneName: '인천공항',
    state: 'forwarded', createdAt: '2025-01-18 11:20', processedAt: '2025-01-18 12:00', processedBy: '관리자',
  },
  {
    id: 'sa-103', type: '연결 끊김', level: 'critical',
    message: '네트워크 연결 끊김 — 2시간 미연결',
    deviceId: 'HL-0010', deviceMac: 'A4:CF:12:6B:3A:10',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    state: 'forwarded', createdAt: '2025-01-17 14:00', processedAt: '2025-01-17 14:30', processedBy: '관리자',
  },

  // ─── 관리자 종결(무시) (dismissed) ───
  {
    id: 'sa-201', type: '펌웨어 업데이트 필요', level: 'info',
    message: 'v2.4.1 → v2.5.0 업데이트 가능',
    deviceId: 'HL-0030', deviceMac: 'A4:CF:12:6B:3A:30',
    telecoilZoneId: 'tz-04', telecoilZoneName: '인천공항',
    state: 'dismissed', createdAt: '2025-01-16 10:00', processedAt: '2025-01-16 15:00', processedBy: '관리자',
  },
  {
    id: 'sa-202', type: '온도 이상', level: 'info',
    message: '온도 41°C — 경미한 상승 (센서 보정 완료)',
    deviceId: 'HL-0050', deviceMac: 'A4:CF:12:6B:3A:50',
    telecoilZoneId: 'tz-06', telecoilZoneName: '광주광역시청',
    state: 'dismissed', createdAt: '2025-01-15 09:30', processedAt: '2025-01-15 10:00', processedBy: '관리자',
  },
  {
    id: 'sa-203', type: '볼륨 이상', level: 'warning',
    message: '볼륨 91% — 경미한 초과 (자동 조정됨)',
    deviceId: 'HL-0020', deviceMac: 'A4:CF:12:6B:3A:20',
    telecoilZoneId: 'tz-03', telecoilZoneName: '국립중앙박물관',
    state: 'dismissed', createdAt: '2025-01-14 13:00', processedAt: '2025-01-14 14:00', processedBy: '관리자',
  },
]
