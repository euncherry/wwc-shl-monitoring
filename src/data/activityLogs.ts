import type { ActivityLog, RawLog } from '@/types/device'

export const activityLogs: ActivityLog[] = [
  {
    id: 'log-001', timestamp: '07-28 14:33:15', userName: '김관리', userRole: 'admin',
    action: '전달', target: '알림', targetId: 'AL001',
    description: '긴급 알림 AL001을 사용자에게 전달', severity: '높음', ipAddress: '192.168.1.100',
  },
  {
    id: 'log-002', timestamp: '07-28 14:20:30', userName: 'museum_admin', userRole: 'user',
    action: '제어', target: '디바이스', targetId: 'HL001',
    description: '히어링루프 HL001 볼륨을 75%에서 80%로 변경', severity: '낮음', ipAddress: '210.123.45.67',
  },
  {
    id: 'log-003', timestamp: '07-28 14:15:45', userName: '이관리', userRole: 'admin',
    action: '생성', target: '히어링루프', targetId: 'zone6',
    description: '새 히어링존 "경기도립미술관" 등록', severity: '보통', ipAddress: '192.168.1.101',
  },
  {
    id: 'log-004', timestamp: '07-28 13:55:20', userName: 'library_admin', userRole: 'user',
    action: '수정', target: '디바이스', targetId: 'HL002',
    description: '히어링루프 HL002 전원 상태 변경', severity: '낮음', ipAddress: '211.45.123.99',
  },
  {
    id: 'log-005', timestamp: '07-28 13:50:10', userName: '김관리', userRole: 'admin',
    action: '삭제', target: '디바이스', targetId: 'HL999',
    description: '오래된 히어링루프 디바이스 HL999 삭제', severity: '높음', ipAddress: '192.168.1.100',
  },
  {
    id: 'log-006', timestamp: '07-28 12:30:25', userName: 'sejong_admin', userRole: 'user',
    action: '제어', target: '디바이스', targetId: 'HL004',
    description: '세종문화회관 대극장 히어링루프 펌웨어 업데이트 시작', severity: '보통', ipAddress: '200.67.89.123',
  },
  {
    id: 'log-007', timestamp: '07-28 11:45:00', userName: '김관리', userRole: 'admin',
    action: '종결', target: '알림', targetId: 'AL015',
    description: '알림 AL015 관리자 종결 처리 (경미한 온도 상승)', severity: '낮음', ipAddress: '192.168.1.100',
  },
  {
    id: 'log-008', timestamp: '07-28 11:20:35', userName: '이관리', userRole: 'admin',
    action: '수정', target: '텔레코일존', targetId: 'tz-02',
    description: '부산역 대합실 담당자 이메일 변경', severity: '보통', ipAddress: '192.168.1.101',
  },
  {
    id: 'log-009', timestamp: '07-28 10:55:18', userName: 'airport_ops', userRole: 'user',
    action: '제어', target: '디바이스', targetId: 'HL030',
    description: '인천공항 T1 출국장 히어링루프 전원 ON', severity: '낮음', ipAddress: '10.0.5.42',
  },
  {
    id: 'log-010', timestamp: '07-28 10:30:00', userName: '김관리', userRole: 'admin',
    action: '생성', target: '사용자', targetId: 'u-07',
    description: '새 사용자 계정 "gwangju_user" 생성', severity: '보통', ipAddress: '192.168.1.100',
  },
  {
    id: 'log-011', timestamp: '07-28 09:45:22', userName: '이관리', userRole: 'admin',
    action: '전달', target: '알림', targetId: 'AL018',
    description: '알림 AL018 연결 끊김 사용자에게 전달', severity: '높음', ipAddress: '192.168.1.101',
  },
  {
    id: 'log-012', timestamp: '07-27 16:30:00', userName: '김관리', userRole: 'admin',
    action: '수정', target: '디바이스', targetId: 'HL040',
    description: '대전시청 종합상황실 HL-0040 볼륨 95% → 80% 조정', severity: '보통', ipAddress: '192.168.1.100',
  },
  {
    id: 'log-013', timestamp: '07-27 15:10:45', userName: 'museum_admin', userRole: 'user',
    action: '제어', target: '디바이스', targetId: 'HL020',
    description: '국립중앙박물관 전시관 1관 히어링루프 전원 재부팅', severity: '낮음', ipAddress: '210.123.45.67',
  },
  {
    id: 'log-014', timestamp: '07-27 14:25:30', userName: '이관리', userRole: 'admin',
    action: '삭제', target: '텔레코일존', targetId: 'tz-99',
    description: '테스트 텔레코일존 삭제 (포함 히어링루프 미배정 처리)', severity: '높음', ipAddress: '192.168.1.101',
  },
  {
    id: 'log-015', timestamp: '07-27 13:00:00', userName: '김관리', userRole: 'admin',
    action: '생성', target: '텔레코일존', targetId: 'tz-06',
    description: '광주광역시청 민원실 텔레코일존 등록', severity: '보통', ipAddress: '192.168.1.100',
  },
]

/* ══════════════════════════════════════════════════════
   Raw Log Stream Data
   ══════════════════════════════════════════════════════ */

export const rawLogs: RawLog[] = [
  { id: 'r-001', timestamp: '2025-07-28 16:54:49', level: 'INFO', message: 'Device HL001 volume changed from 75% to 80%' },
  { id: 'r-002', timestamp: '2025-07-28 16:54:48', level: 'ERROR', message: 'Network latency spike detected: 150ms' },
  { id: 'r-003', timestamp: '2025-07-28 16:54:46', level: 'WARN', message: 'Temperature alert: HL001 threshold exceeded' },
  { id: 'r-004', timestamp: '2025-07-28 16:54:44', level: 'DEBUG', message: 'Device HL003 connection restored' },
  { id: 'r-005', timestamp: '2025-07-28 16:54:42', level: 'ERROR', message: 'Hearing zone registration: 새로운기관' },
  { id: 'r-006', timestamp: '2025-07-28 16:54:39', level: 'DEBUG', message: 'Database backup completed successfully' },
  { id: 'r-007', timestamp: '2025-07-28 16:54:36', level: 'ERROR', message: 'User login: museum_admin from 210.123.45.67' },
  { id: 'r-008', timestamp: '2025-07-28 16:54:33', level: 'INFO', message: 'Device HL003 connection restored' },
  { id: 'r-009', timestamp: '2025-07-28 16:54:30', level: 'WARN', message: 'Temperature alert: HL001 threshold exceeded' },
  { id: 'r-010', timestamp: '2025-07-28 16:54:27', level: 'ERROR', message: 'Alert AL002 status changed to delivered' },
  { id: 'r-011', timestamp: '2025-07-28 16:54:24', level: 'WARN', message: 'Temperature alert: HL001 threshold exceeded' },
  { id: 'r-012', timestamp: '2025-07-28 16:54:21', level: 'DEBUG', message: 'Network latency spike detected: 160ms' },
  { id: 'r-013', timestamp: '2025-07-28 16:54:18', level: 'WARN', message: 'Temperature alert: HL001 threshold exceeded' },
  { id: 'r-014', timestamp: '2025-07-28 16:54:15', level: 'ERROR', message: 'User login: museum_admin from 210.123.45.67' },
  { id: 'r-015', timestamp: '2025-07-28 16:54:12', level: 'WARN', message: 'Device HL003 connection restored' },
  { id: 'r-016', timestamp: '2025-07-28 16:54:09', level: 'DEBUG', message: 'System health check: All services OK' },
  { id: 'r-017', timestamp: '2025-07-28 16:54:06', level: 'INFO', message: 'Device HL001 volume changed from 75% to 80%' },
  { id: 'r-018', timestamp: '2025-07-28 16:54:03', level: 'ERROR', message: 'Cache cleared for user session sess_abc123' },
  { id: 'r-019', timestamp: '2025-07-28 16:54:00', level: 'INFO', message: 'Firmware OTA update initiated for HL-0040' },
  { id: 'r-020', timestamp: '2025-07-28 16:53:57', level: 'WARN', message: 'Connection timeout: HL-0041 retry attempt 3/5' },
]

/* Helper to generate simulated new log entries on "refresh" */
const sampleMessages: { level: RawLog['level']; message: string }[] = [
  { level: 'INFO', message: 'Device HL001 heartbeat received' },
  { level: 'DEBUG', message: 'WebSocket connection pool: 12/50 active' },
  { level: 'WARN', message: 'Temperature alert: HL011 approaching threshold (44°C)' },
  { level: 'ERROR', message: 'Database query timeout: alerts_collection > 5000ms' },
  { level: 'INFO', message: 'Device HL003 firmware check: v2.5.0 (up to date)' },
  { level: 'DEBUG', message: 'Cache hit ratio: 94.2% (last 5min)' },
  { level: 'WARN', message: 'Memory usage: 78% — approaching threshold' },
  { level: 'ERROR', message: 'Failed to send email notification to admin@seoul.go.kr' },
  { level: 'INFO', message: 'Scheduled backup: hearing_loops_20250728.sql completed' },
  { level: 'DEBUG', message: 'API rate limit: 1240/5000 requests used' },
  { level: 'WARN', message: 'Device HL-0012 offline for > 48 hours' },
  { level: 'INFO', message: 'New user session: 김관리 from 192.168.1.100' },
  { level: 'ERROR', message: 'MQTT broker connection interrupted — reconnecting...' },
  { level: 'DEBUG', message: 'Garbage collection completed: freed 24MB' },
  { level: 'WARN', message: 'SSL certificate expiring in 14 days' },
]

let logCounter = rawLogs.length

export function generateNewLogs(count: number): RawLog[] {
  const newLogs: RawLog[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const sample = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]
    const ts = new Date(now.getTime() - i * 2000)
    logCounter++
    newLogs.push({
      id: `r-gen-${logCounter}`,
      timestamp: ts.toISOString().slice(0, 19).replace('T', ' '),
      level: sample.level,
      message: sample.message,
    })
  }
  return newLogs
}
