import { useState, useMemo } from 'react'
import {
  Search,
  Building2,
  Mail,
  User,
  Radio,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Edit3,
  Bell,
  Power,
  PowerOff,
  Wifi,
  WifiOff,
  ArrowUpDown,
  Shield,
  UserPlus,
  AlertTriangle,
} from 'lucide-react'
import { telecoilZones } from '@/data/telecoilZones'
import { hearingLoops } from '@/data/hearingLoops'
import type { TelecoilZone, ZoneStatus, HearingLoop, DeviceStatus } from '@/types/device'

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function ZoneStatusBadge({ status }: { status: ZoneStatus }) {
  const m: Record<ZoneStatus, { label: string; dot: string; cls: string }> = {
    active: { label: '정상', dot: 'bg-success', cls: 'bg-success/10 text-success' },
    warning: { label: '주의', dot: 'bg-warning', cls: 'bg-warning/10 text-warning' },
    inactive: { label: '비활성', dot: 'bg-muted-foreground', cls: 'bg-muted text-muted-foreground' },
  }
  const s = m[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const m: Record<DeviceStatus, { label: string; dot: string; cls: string }> = {
    normal: { label: '정상', dot: 'bg-success', cls: 'bg-success/10 text-success' },
    warning: { label: '경고', dot: 'bg-warning', cls: 'bg-warning/10 text-warning' },
    error: { label: '오류', dot: 'bg-destructive', cls: 'bg-destructive/10 text-destructive' },
    offline: { label: '오프라인', dot: 'bg-muted-foreground', cls: 'bg-muted text-muted-foreground' },
  }
  const s = m[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

/* ══════════════════════════════════════════════════════
   Register Modal
   ══════════════════════════════════════════════════════ */

function RegisterModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    managerEmail: '',
    username: '',
    password: '',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-page/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">텔레코일존 등록</h3>
              <p className="text-[12px] text-muted-foreground">새로운 텔레코일존을 등록합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* 텔레코일존명 */}
          <div>
            <label className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground mb-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              텔레코일존명
            </label>
            <input
              type="text"
              placeholder="예: 서울시청"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-white py-2.5 px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* 담당자 이메일 */}
          <div>
            <label className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground mb-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              담당자 이메일
            </label>
            <input
              type="email"
              placeholder="긴급 알림 수신용 이메일"
              value={form.managerEmail}
              onChange={(e) => setForm({ ...form, managerEmail: e.target.value })}
              className="w-full rounded-xl border border-border bg-white py-2.5 px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* 사용자 계정 */}
          <div className="rounded-xl border border-border p-4 bg-page/30">
            <label className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground mb-3">
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              사용자 모드 계정 생성
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="사용자 ID"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="rounded-xl border border-border bg-white py-2.5 px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="rounded-xl border border-border bg-white py-2.5 px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">사용자 모드 접속용 계정입니다. 나중에 생성할 수도 있습니다.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-page/30">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
            취소
          </button>
          <button className="rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors">
            등록하기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Detail Modal
   ══════════════════════════════════════════════════════ */

function ZoneDetailModal({
  zone,
  devices,
  onClose,
}: {
  zone: TelecoilZone
  devices: HearingLoop[]
  onClose: () => void
}) {
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailValue, setEmailValue] = useState(zone.managerEmail)

  const operatingRate = zone.deviceCount > 0 ? Math.round((zone.activeDeviceCount / zone.deviceCount) * 100) : 0
  const barColor = operatingRate === 100 ? 'bg-success' : operatingRate >= 80 ? 'bg-primary' : operatingRate >= 60 ? 'bg-warning' : 'bg-destructive'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-border overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-page/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{zone.name}</h3>
                <ZoneStatusBadge status={zone.status} />
              </div>
              <p className="text-[12px] text-muted-foreground">{zone.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border shrink-0">
          <div className="rounded-xl border border-border p-3">
            <span className="text-[11px] text-muted-foreground">장비 수</span>
            <div className="flex items-center gap-2 mt-1">
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold text-foreground">{zone.deviceCount}</span>
            </div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <span className="text-[11px] text-muted-foreground">정상 가동</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-success">{zone.activeDeviceCount}</span>
              <span className="text-[12px] text-muted-foreground">/ {zone.deviceCount}</span>
            </div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <span className="text-[11px] text-muted-foreground">가동률</span>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${operatingRate}%` }} />
              </div>
              <span className={`text-[12px] font-bold ${operatingRate === 100 ? 'text-success' : operatingRate >= 80 ? 'text-primary' : operatingRate >= 60 ? 'text-warning' : 'text-destructive'}`}>
                {operatingRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable content — 모든 섹션 세로 배치 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── 기본 정보 ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-[14px] font-bold text-foreground">기본 정보</h4>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border divide-y divide-border/50">
                {[
                  { label: '텔레코일존명', value: zone.name, icon: Building2 },
                  { label: '등록일', value: zone.registeredAt, icon: Shield },
                  { label: '최근 업데이트', value: zone.lastUpdated, icon: Shield },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <row.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[13px] text-muted-foreground">{row.label}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* 담당자 이메일 */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[13px] font-semibold text-foreground">담당자 이메일</span>
                  </div>
                  <button
                    onClick={() => setEditingEmail(!editingEmail)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    {editingEmail ? '취소' : '수정'}
                  </button>
                </div>
                {editingEmail ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-white py-2 px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button className="rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-white hover:bg-primary-dark transition-colors">
                      저장
                    </button>
                  </div>
                ) : (
                  <p className="text-[13px] text-foreground">{zone.managerEmail}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">긴급 알림 수신용 이메일 주소입니다.</p>
              </div>

              {/* 사용자 계정 */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">사용자 모드 계정</span>
                </div>
                {zone.userAccount ? (
                  <div className="flex items-center justify-between rounded-lg bg-page/50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[13px] font-semibold text-foreground font-mono">{zone.userAccount.username}</span>
                    </div>
                    <button className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      비밀번호 변경
                    </button>
                  </div>
                ) : (
                  <button className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors w-full justify-center">
                    <UserPlus className="h-4 w-4" />
                    사용자 계정 생성
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── 구분선 ── */}
          <div className="border-t border-border/50" />

          {/* ── 히어링루프 목록 ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-4 w-4 text-primary" />
              <h4 className="text-[14px] font-bold text-foreground">히어링루프</h4>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
                {devices.length}
              </span>
            </div>
            {devices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 rounded-xl border border-dashed border-border">
                <Radio className="h-7 w-7 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">배정된 히어링루프가 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {devices.map((d) => {
                  const statusColor = d.status === 'normal' ? 'border-success/30 bg-success/3' : d.status === 'warning' ? 'border-warning/30 bg-warning/3' : d.status === 'error' ? 'border-destructive/30 bg-destructive/3' : 'border-border bg-page/30'
                  return (
                    <div key={d.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${statusColor}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Radio className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-foreground">{d.id}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{d.mac}</p>
                          </div>
                        </div>
                        <DeviceStatusBadge status={d.status} />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-white/60 py-2 border border-border/30">
                          {d.power ? <Power className="h-3.5 w-3.5 text-success" /> : <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className="text-[10px] text-muted-foreground">전원</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-white/60 py-2 border border-border/30">
                          {d.networkConnected ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
                          <span className="text-[10px] text-muted-foreground">네트워크</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-white/60 py-2 border border-border/30">
                          <span className={`text-[12px] font-bold ${d.temperature > 45 ? 'text-destructive' : d.temperature > 40 ? 'text-warning' : 'text-foreground'}`}>
                            {d.temperature > 0 ? `${d.temperature}°` : '—'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">온도</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-white/60 py-2 border border-border/30">
                          <span className={`text-[11px] font-mono font-bold ${d.firmwareVersion === 'v2.5.0' ? 'text-success' : 'text-warning'}`}>
                            {d.firmwareVersion}
                          </span>
                          <span className="text-[10px] text-muted-foreground">펌웨어</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <button className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors w-full justify-center mt-3">
              <Plus className="h-4 w-4" />
              히어링루프 추가 배정
            </button>
          </div>

          {/* ── 구분선 ── */}
          <div className="border-t border-border/50" />

          {/* ── 알림 이력 ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-warning" />
              <h4 className="text-[14px] font-bold text-foreground">알림 이력</h4>
              {zone.alerts.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/10 px-1.5 text-[11px] font-bold text-destructive">
                  {zone.alerts.length}
                </span>
              )}
            </div>
            {zone.alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 rounded-xl border border-dashed border-border">
                <Bell className="h-7 w-7 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">알림 이력이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {zone.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[12px] ${
                      alert.level === 'critical' ? 'bg-destructive/5 border border-destructive/20' :
                      alert.level === 'warning' ? 'bg-warning/5 border border-warning/20' : 'bg-primary/5 border border-primary/20'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${
                      alert.level === 'critical' ? 'bg-destructive' : alert.level === 'warning' ? 'bg-warning' : 'bg-primary'
                    }`} />
                    <span className="font-semibold text-foreground">{alert.type}</span>
                    <span className="text-muted-foreground flex-1">{alert.message}</span>
                    <span className="text-muted-foreground shrink-0">{alert.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-page/30 shrink-0">
          <button className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-destructive hover:bg-destructive/5 transition-colors">
            <Trash2 className="h-4 w-4" />
            텔레코일존 삭제
          </button>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function TelecoilZonesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ZoneStatus | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedZone, setSelectedZone] = useState<TelecoilZone | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts = { all: telecoilZones.length, active: 0, warning: 0, inactive: 0 }
    telecoilZones.forEach((z) => { counts[z.status]++ })
    return counts
  }, [])

  /* ── Filtered data ── */
  const filteredZones = useMemo(() => {
    let list = [...telecoilZones]

    if (statusFilter !== 'all') list = list.filter((z) => z.status === statusFilter)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          z.id.toLowerCase().includes(q) ||
          z.managerEmail.toLowerCase().includes(q),
      )
    }

    list.sort((a, b) => {
      const da = new Date(a.lastUpdated).getTime()
      const db = new Date(b.lastUpdated).getTime()
      return sortOrder === 'latest' ? db - da : da - db
    })

    return list
  }, [statusFilter, search, sortOrder])

  /* ── Get devices for a zone ── */
  const getZoneDevices = (zoneId: string) =>
    hearingLoops.filter((d) => d.telecoilZoneId === zoneId)

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <div className="pb-5 pt-5">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">텔레코일존 관리</h2>
        <p className="text-sm text-muted-foreground mt-2">텔레코일존을 등록하고 배치된 히어링루프를 관리합니다.</p>
      </div>

      {/* ─── Search & Sort & Register ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="텔레코일존명, ID, 이메일 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'latest' ? '최신순' : '오래된순'}
        </button>

        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors shadow-sm ml-auto"
        >
          <Plus className="h-4 w-4" />
          텔레코일존 등록
        </button>
      </div>

      {/* ─── Table card ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Status filter tabs inside table */}
        <div className="flex items-center gap-1 px-5 pt-4 pb-2">
          {(['all', 'active', 'warning', 'inactive'] as const).map((s) => {
            const labels: Record<string, string> = { all: '전체', active: '정상', warning: '주의', inactive: '비활성' }
            const dotColors: Record<string, string> = { all: 'bg-primary', active: 'bg-success', warning: 'bg-warning', inactive: 'bg-muted-foreground' }
            const borderColors: Record<string, string> = { all: 'border-primary text-primary', active: 'border-success text-success', warning: 'border-warning text-warning', inactive: 'border-muted-foreground text-muted-foreground' }
            const count = statusCounts[s]
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold border transition-all ${
                  isActive
                    ? `${borderColors[s]} bg-white shadow-sm`
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-page'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotColors[s]}`} />
                {labels[s]}
                <span className={`text-[11px] font-bold ${isActive ? 'opacity-70' : 'text-muted-foreground/60'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Card grid */}
        <div className="p-5">
          {filteredZones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Building2 className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredZones.map((zone) => {
                const rate = zone.deviceCount > 0 ? Math.round((zone.activeDeviceCount / zone.deviceCount) * 100) : 0
                const rateColor = rate === 100 ? 'bg-success' : rate >= 80 ? 'bg-primary' : rate >= 60 ? 'bg-warning' : 'bg-destructive'
                const rateTextColor = rate === 100 ? 'text-success' : rate >= 80 ? 'text-primary' : rate >= 60 ? 'text-warning' : 'text-destructive'
                const borderAccent = zone.status === 'active' ? 'border-success/20' : zone.status === 'warning' ? 'border-warning/20' : 'border-border'

                return (
                  <div
                    key={zone.id}
                    className={`rounded-xl border ${borderAccent} bg-white p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group`}
                    onClick={() => setSelectedZone(zone)}
                  >
                    {/* Header: 텔레코일존명 + 상태 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-foreground truncate">{zone.name}</p>
                        </div>
                      </div>
                      <ZoneStatusBadge status={zone.status} />
                    </div>

                    {/* 가동률 바 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-muted-foreground">가동률</span>
                        <span className={`text-[12px] font-bold tabular-nums ${rateTextColor}`}>{rate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-border/50 overflow-hidden">
                        <div className={`h-full rounded-full ${rateColor} transition-all duration-500`} style={{ width: `${rate}%` }} />
                      </div>
                    </div>

                    {/* 통계 그리드 */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-page/50 py-2.5">
                        <Radio className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[14px] font-bold text-foreground">{zone.deviceCount}</span>
                        <span className="text-[10px] text-muted-foreground">전체 장비</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-page/50 py-2.5">
                        <Power className="h-3.5 w-3.5 text-success" />
                        <span className="text-[14px] font-bold text-success">{zone.activeDeviceCount}</span>
                        <span className="text-[10px] text-muted-foreground">정상 가동</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-page/50 py-2.5">
                        {zone.alerts.length > 0 ? (
                          <>
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-[14px] font-bold text-destructive">{zone.alerts.length}</span>
                          </>
                        ) : (
                          <>
                            <Bell className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <span className="text-[14px] font-bold text-muted-foreground/40">0</span>
                          </>
                        )}
                        <span className="text-[10px] text-muted-foreground">알림</span>
                      </div>
                    </div>

                    {/* 하단 정보 */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/40">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">{zone.managerEmail}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-page/30">
          <span className="text-[12px] text-muted-foreground">
            총 <span className="font-bold text-foreground">{filteredZones.length}</span>개 텔레코일존
          </span>
        </div>
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          devices={getZoneDevices(selectedZone.id)}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* ─── Register Modal ─── */}
      {showRegister && (
        <RegisterModal onClose={() => setShowRegister(false)} />
      )}
    </div>
  )
}
