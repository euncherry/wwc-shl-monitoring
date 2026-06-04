export type DeviceStatus = 'normal' | 'warning' | 'error' | 'offline'

export interface HearingLoop {
  id: string
  mac: string
  power: boolean
  operating: boolean
  networkConnected: boolean
  temperature: number
  volume: number
  firmwareVersion: string
  status: DeviceStatus
  telecoilZoneId: string | null
  telecoilZoneName: string | null
  lastUpdated: string
  registeredAt: string
  alerts: AlertHistory[]
}

export interface AlertHistory {
  id: string
  type: '온도 이상' | '전원 차단' | '볼륨 이상' | '연결 끊김' | '펌웨어 업데이트 필요'
  level: 'critical' | 'warning' | 'info'
  message: string
  createdAt: string
}

export type AlertLevel = 'critical' | 'warning' | 'info'
export type AlertType = '온도 이상' | '전원 차단' | '볼륨 이상' | '연결 끊김' | '펌웨어 업데이트 필요'
export type AlertState = 'pending' | 'forwarded' | 'dismissed'

export interface SystemAlert {
  id: string
  type: AlertType
  level: AlertLevel
  message: string
  deviceId: string
  deviceMac: string
  telecoilZoneId: string | null
  telecoilZoneName: string | null
  state: AlertState
  createdAt: string
  processedAt: string | null
  processedBy: string | null
}

export type ActionType = '제어' | '수정' | '삭제' | '생성' | '전달' | '종결'
export type TargetType = '디바이스' | '히어링루프' | '텔레코일존' | '알림' | '사용자'
export type SeverityLevel = '높음' | '보통' | '낮음'

export interface ActivityLog {
  id: string
  timestamp: string
  userName: string
  userRole: 'admin' | 'user'
  action: ActionType
  target: TargetType
  targetId: string
  description: string
  severity: SeverityLevel
  ipAddress: string
}

export type RawLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

export interface RawLog {
  id: string
  timestamp: string
  level: RawLogLevel
  message: string
}

export type ZoneStatus = 'active' | 'warning' | 'inactive'

export interface TelecoilZone {
  id: string
  name: string
  managerEmail: string
  userAccount: { id: string; username: string } | null
  status: ZoneStatus
  deviceCount: number
  activeDeviceCount: number
  registeredAt: string
  lastUpdated: string
  alerts: AlertHistory[]
}
