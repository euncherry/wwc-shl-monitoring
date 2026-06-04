import type { HearingLoop } from '@/types/device'

export const hearingLoops: HearingLoop[] = [
  {
    id: 'HL-0001', mac: 'A4:CF:12:6B:3A:01', power: true, operating: true, networkConnected: true,
    temperature: 38, volume: 72, firmwareVersion: 'v2.4.1', status: 'normal',
    telecoilZoneId: 'tz-01', telecoilZoneName: '서울시청',
    lastUpdated: '2025-01-20 14:30', registeredAt: '2024-06-15', alerts: [],
  },
  {
    id: 'HL-0002', mac: 'A4:CF:12:6B:3A:02', power: true, operating: true, networkConnected: true,
    temperature: 36, volume: 65, firmwareVersion: 'v2.4.1', status: 'normal',
    telecoilZoneId: 'tz-01', telecoilZoneName: '서울시청',
    lastUpdated: '2025-01-20 14:28', registeredAt: '2024-06-15', alerts: [],
  },
  {
    id: 'HL-0003', mac: 'A4:CF:12:6B:3A:03', power: true, operating: true, networkConnected: true,
    temperature: 37, volume: 70, firmwareVersion: 'v2.5.0', status: 'normal',
    telecoilZoneId: 'tz-01', telecoilZoneName: '서울시청',
    lastUpdated: '2025-01-20 14:25', registeredAt: '2024-07-01', alerts: [],
  },
  {
    id: 'HL-0004', mac: 'A4:CF:12:6B:3A:04', power: true, operating: true, networkConnected: true,
    temperature: 34, volume: 68, firmwareVersion: 'v2.5.0', status: 'normal',
    telecoilZoneId: 'tz-01', telecoilZoneName: '서울시청',
    lastUpdated: '2025-01-20 14:22', registeredAt: '2025-01-08', alerts: [],
  },
  {
    id: 'HL-0010', mac: 'A4:CF:12:6B:3A:10', power: true, operating: true, networkConnected: true,
    temperature: 35, volume: 68, firmwareVersion: 'v2.4.1', status: 'normal',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    lastUpdated: '2025-01-20 14:20', registeredAt: '2024-05-10', alerts: [],
  },
  {
    id: 'HL-0011', mac: 'A4:CF:12:6B:3A:11', power: true, operating: false, networkConnected: true,
    temperature: 52, volume: 68, firmwareVersion: 'v2.3.0', status: 'warning',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    lastUpdated: '2025-01-20 13:55', registeredAt: '2024-05-10',
    alerts: [{ id: 'a1', type: '온도 이상', level: 'warning', message: '온도 52°C 감지', createdAt: '2025-01-20 13:55' }],
  },
  {
    id: 'HL-0012', mac: 'A4:CF:12:6B:3A:12', power: false, operating: false, networkConnected: false,
    temperature: 0, volume: 0, firmwareVersion: 'v2.3.0', status: 'error',
    telecoilZoneId: 'tz-02', telecoilZoneName: '부산역',
    lastUpdated: '2025-01-19 08:00', registeredAt: '2024-05-10',
    alerts: [
      { id: 'a2', type: '전원 차단', level: 'critical', message: '전원 OFF 24시간 이상 지속', createdAt: '2025-01-20 08:00' },
      { id: 'a3', type: '연결 끊김', level: 'critical', message: '네트워크 연결 끊김', createdAt: '2025-01-19 08:00' },
    ],
  },
  {
    id: 'HL-0020', mac: 'A4:CF:12:6B:3A:20', power: true, operating: true, networkConnected: true,
    temperature: 34, volume: 75, firmwareVersion: 'v2.5.0', status: 'normal',
    telecoilZoneId: 'tz-03', telecoilZoneName: '국립중앙박물관',
    lastUpdated: '2025-01-20 14:32', registeredAt: '2024-08-20', alerts: [],
  },
  {
    id: 'HL-0030', mac: 'A4:CF:12:6B:3A:30', power: true, operating: true, networkConnected: true,
    temperature: 36, volume: 60, firmwareVersion: 'v2.4.1', status: 'normal',
    telecoilZoneId: 'tz-04', telecoilZoneName: '인천공항',
    lastUpdated: '2025-01-20 14:31', registeredAt: '2024-04-05', alerts: [],
  },
  {
    id: 'HL-0040', mac: 'A4:CF:12:6B:3A:40', power: true, operating: true, networkConnected: true,
    temperature: 41, volume: 95, firmwareVersion: 'v2.3.0', status: 'warning',
    telecoilZoneId: 'tz-05', telecoilZoneName: '대전시청',
    lastUpdated: '2025-01-20 14:10', registeredAt: '2024-09-01',
    alerts: [{ id: 'a4', type: '볼륨 이상', level: 'warning', message: '볼륨 95% — 설정 범위 초과', createdAt: '2025-01-20 14:10' }],
  },
  {
    id: 'HL-0041', mac: 'A4:CF:12:6B:3A:41', power: true, operating: false, networkConnected: false,
    temperature: 39, volume: 70, firmwareVersion: 'v2.3.0', status: 'error',
    telecoilZoneId: 'tz-05', telecoilZoneName: '대전시청',
    lastUpdated: '2025-01-20 10:00', registeredAt: '2024-09-01',
    alerts: [{ id: 'a5', type: '연결 끊김', level: 'critical', message: '네트워크 연결 끊김', createdAt: '2025-01-20 10:00' }],
  },
  {
    id: 'HL-0050', mac: 'A4:CF:12:6B:3A:50', power: true, operating: true, networkConnected: true,
    temperature: 35, volume: 65, firmwareVersion: 'v2.5.0', status: 'normal',
    telecoilZoneId: 'tz-06', telecoilZoneName: '광주광역시청',
    lastUpdated: '2025-01-20 14:29', registeredAt: '2024-10-15', alerts: [],
  },
  // ─── 미배정 기기 ───
  {
    id: 'HL-0101', mac: 'AA:BB:CC:DD:EE:01', power: true, operating: true, networkConnected: true,
    temperature: 33, volume: 50, firmwareVersion: 'v2.5.0', status: 'normal',
    telecoilZoneId: null, telecoilZoneName: null,
    lastUpdated: '2025-01-20 12:00', registeredAt: '2025-01-10', alerts: [],
  },
  {
    id: 'HL-0102', mac: 'AA:BB:CC:DD:EE:02', power: true, operating: true, networkConnected: true,
    temperature: 34, volume: 55, firmwareVersion: 'v2.4.1', status: 'normal',
    telecoilZoneId: null, telecoilZoneName: null,
    lastUpdated: '2025-01-20 11:30', registeredAt: '2025-01-12', alerts: [],
  },
  {
    id: 'HL-0103', mac: 'AA:BB:CC:DD:EE:03', power: false, operating: false, networkConnected: false,
    temperature: 0, volume: 0, firmwareVersion: 'v2.4.1', status: 'offline',
    telecoilZoneId: null, telecoilZoneName: null,
    lastUpdated: '2025-01-14 09:00', registeredAt: '2025-01-14', alerts: [],
  },
]
