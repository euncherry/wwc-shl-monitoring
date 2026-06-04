import { useState } from 'react'
import {
  Radio,
  Power,
  PowerOff,
  Wifi,
  WifiOff,
  Activity,
  Search,
  Pencil,
  Check,
  X,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { hearingLoops } from '@/data/hearingLoops'
import type { HearingLoop, DeviceStatus } from '@/types/device'

/* ══════════════════════════════════════════════════════
   사용자 기관 히어링루프 (서울시청 민원실 기준)
   ══════════════════════════════════════════════════════ */

const MY_INSTITUTION = '서울시청'

/* ── Sub-components ── */

function StatusBadge({ status }: { status: DeviceStatus }) {
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

/* ── Detail Modal ── */

function DeviceDetailModal({
  device,
  nickname,
  onClose,
  onSaveNickname,
}: {
  device: HearingLoop
  nickname: string
  onClose: () => void
  onSaveNickname: (id: string, name: string) => void
}) {
  const [editingNickname, setEditingNickname] = useState(false)
  const [tempNickname, setTempNickname] = useState(nickname)

  const handleSave = () => {
    onSaveNickname(device.id, tempNickname.trim())
    setEditingNickname(false)
  }

  const handleCancel = () => {
    setTempNickname(nickname)
    setEditingNickname(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-page/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{device.id}</h3>
              <p className="text-[12px] text-muted-foreground font-mono">{device.mac}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={device.status} />
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* 별칭 */}
          <div className="rounded-xl border border-primary/20 bg-primary/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-primary">히어링루프 별칭</span>
              {!editingNickname && (
                <button
                  onClick={() => setEditingNickname(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </button>
              )}
            </div>
            {editingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  placeholder="별칭을 입력하세요 (예: 1층 안내데스크)"
                  className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') handleCancel()
                  }}
                />
                <button
                  onClick={handleSave}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-[14px] font-bold text-foreground">
                {nickname || <span className="text-muted-foreground font-normal italic">별칭 미지정</span>}
              </p>
            )}
          </div>

          {/* 실시간 상태 그리드 */}
          <div className="grid grid-cols-3 gap-3">
            {/* 전원 상태 */}
            <div className="rounded-xl border border-border p-4 text-center">
              <span className="text-[11px] text-muted-foreground block mb-2">전원 상태</span>
              <div className="flex items-center justify-center gap-2">
                {device.power ? (
                  <Power className="h-5 w-5 text-success" />
                ) : (
                  <PowerOff className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={`text-[14px] font-bold ${device.power ? 'text-success' : 'text-muted-foreground'}`}>
                  {device.power ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {/* 네트워크 */}
            <div className="rounded-xl border border-border p-4 text-center">
              <span className="text-[11px] text-muted-foreground block mb-2">네트워크</span>
              <div className="flex items-center justify-center gap-2">
                {device.networkConnected ? (
                  <Wifi className="h-5 w-5 text-success" />
                ) : (
                  <WifiOff className="h-5 w-5 text-destructive" />
                )}
                <span
                  className={`text-[14px] font-bold ${device.networkConnected ? 'text-success' : 'text-destructive'}`}
                >
                  {device.networkConnected ? '연결됨' : '끊김'}
                </span>
              </div>
            </div>

            {/* 기기 동작 여부 */}
            <div className="rounded-xl border border-border p-4 text-center">
              <span className="text-[11px] text-muted-foreground block mb-2">기기 동작</span>
              <div className="flex items-center justify-center gap-2">
                <Activity
                  className={`h-5 w-5 ${device.operating ? 'text-success' : 'text-destructive'}`}
                />
                <span
                  className={`text-[14px] font-bold ${device.operating ? 'text-success' : 'text-destructive'}`}
                >
                  {device.operating ? '정상' : '중지'}
                </span>
              </div>
            </div>
          </div>

          {/* 기기 정보 */}
          <div className="rounded-xl border border-border divide-y divide-border/50">
            {[
              { label: '텔레코일존', value: device.telecoilZoneName ?? '—' },
              { label: 'MAC 주소', value: device.mac },
              { label: '최근 업데이트', value: device.lastUpdated },
              { label: '등록일', value: device.registeredAt },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground">{row.label}</span>
                <span className="text-[13px] font-semibold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-page/30">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors"
          >
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

export default function UserHearingLoops() {
  const [search, setSearch] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<HearingLoop | null>(null)
  const [nicknames, setNicknames] = useState<Record<string, string>>(() => ({
    'HL-0001': '1층 민원 안내데스크',
    'HL-0002': '2층 민원 상담실',
    'HL-0003': '3층 대회의실',
  }))

  /* 우리 기관 기기만 필터 */
  const myDevices = hearingLoops.filter((d) => d.telecoilZoneName === MY_INSTITUTION)

  /* 검색 필터 */
  const filteredDevices = myDevices.filter((d) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      d.id.toLowerCase().includes(q) ||
      d.mac.toLowerCase().includes(q) ||
      (nicknames[d.id] ?? '').toLowerCase().includes(q) ||
      (d.telecoilZoneName ?? '').toLowerCase().includes(q)
    )
  })

  /* 상태 통계 */
  const stats = {
    total: myDevices.length,
    normal: myDevices.filter((d) => d.status === 'normal').length,
    warning: myDevices.filter((d) => d.status === 'warning').length,
    error: myDevices.filter((d) => d.status === 'error' || d.status === 'offline').length,
  }

  const handleSaveNickname = (id: string, name: string) => {
    setNicknames((prev) => ({ ...prev, [id]: name }))
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="pb-2">
        <h2 className="text-2xl font-bold text-foreground tracking-tight mt-2">히어링루프 관리</h2>
        <p className="text-sm text-muted-foreground mt-2">
          소속 기관에 등록된 히어링루프의 현재 상태를 조회하고 별칭을 관리할 수 있습니다.
        </p>
      </div>

      {/* ─── 상태 요약 KPI ─── */}
      <div className="grid grid-cols-4 gap-4">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">전체 기기</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-success/20 bg-success/3 p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">정상</p>
            <p className="text-2xl font-bold text-success">{stats.normal}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-warning/20 bg-warning/3 p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">경고</p>
            <p className={`text-2xl font-bold ${stats.warning > 0 ? 'text-warning' : 'text-muted-foreground/30'}`}>
              {stats.warning}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/3 p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">오류 / 오프라인</p>
            <p className={`text-2xl font-bold ${stats.error > 0 ? 'text-destructive' : 'text-muted-foreground/30'}`}>
              {stats.error}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 검색 ─── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="기기 ID, 별칭, MAC 주소로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* ─── 기기 카드 목록 ─── */}
      <div className="space-y-3">
        {filteredDevices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl border border-dashed border-border bg-white">
            <Radio className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-[14px] font-semibold text-muted-foreground">검색 결과가 없습니다</p>
          </div>
        ) : (
          filteredDevices.map((device) => {
            const nick = nicknames[device.id] || device.id
            return (
              <div
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className="group flex items-center gap-5 rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              >
                {/* 아이콘 */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
                    device.status === 'normal'
                      ? 'bg-success/10'
                      : device.status === 'warning'
                        ? 'bg-warning/10'
                        : 'bg-destructive/10'
                  }`}
                >
                  <Radio
                    className={`h-6 w-6 ${
                      device.status === 'normal'
                        ? 'text-success'
                        : device.status === 'warning'
                          ? 'text-warning'
                          : 'text-destructive'
                    }`}
                  />
                </div>

                {/* 기기 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[15px] font-bold text-foreground">{nick}</p>
                    <span className="rounded-md bg-page px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {device.id}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {device.telecoilZoneName ?? '—'} · <span className="font-mono">{device.mac}</span>
                  </p>
                </div>

                {/* 실시간 상태 인디케이터 */}
                <div className="flex items-center gap-5 shrink-0">
                  {/* 전원 */}
                  <div className="flex flex-col items-center gap-1">
                    {device.power ? (
                      <Power className="h-4 w-4 text-success" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-[10px] text-muted-foreground">전원</span>
                  </div>

                  {/* 네트워크 */}
                  <div className="flex flex-col items-center gap-1">
                    {device.networkConnected ? (
                      <Wifi className="h-4 w-4 text-success" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-[10px] text-muted-foreground">네트워크</span>
                  </div>

                  {/* 기기 동작 */}
                  <div className="flex flex-col items-center gap-1">
                    <Activity
                      className={`h-4 w-4 ${device.operating ? 'text-success' : 'text-destructive'}`}
                    />
                    <span className="text-[10px] text-muted-foreground">동작</span>
                  </div>
                </div>

                {/* 상태 뱃지 + 화살표 */}
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={device.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단 요약 */}
      {filteredDevices.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-page/50 border border-border/50 px-5 py-3">
          <span className="text-[12px] text-muted-foreground">
            총 <span className="font-bold text-foreground">{filteredDevices.length}</span>개 기기
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            실시간 모니터링 중
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          nickname={nicknames[selectedDevice.id] || selectedDevice.id}
          onClose={() => setSelectedDevice(null)}
          onSaveNickname={handleSaveNickname}
        />
      )}
    </div>
  )
}
