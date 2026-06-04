import { useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import {
  Search,
  Wifi,
  WifiOff,
  Power,
  PowerOff,
  Thermometer,
  Volume2,
  Shield,
  MapPin,
  ChevronRight,
  Package,
  X,
  Radio,
  Activity,
  Hash,
  Bell,
  Trash2,
  ArrowUpDown,
  Pencil,
  CheckCircle2,
  Plus,
  Loader2,
  AlertCircle,
  CalendarClock,
  Building2,
  Target,
  Star,
  Check,
  ChevronDown,
} from 'lucide-react'
import type { HearingLoop } from '@/types/device'
import { formatDateTime } from '@/lib/format'
import {
  useDevices,
  useUpdateAlias,
  useDeleteDevice,
  useCreateDevicesBulk,
  useAssignZone,
} from '@/hooks/useDevices'
import { useZones } from '@/hooks/useZones'
import type { CreateDeviceInput } from '@/api/devices'

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

/** 모달이 떠 있는 동안 배경(body) 스크롤 잠금 */
function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
}

/** 목 값 표시용 배지 — StatusReport 확장 배포 시 핸들러와 함께 제거(§13) */
function MockBadge() {
  return (
    <span className="ml-1 inline-block rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold text-warning align-middle">
      목
    </span>
  )
}

function PowerIcon({ on }: { on: boolean }) {
  return on ? (
    <Power className="h-4 w-4 text-success" />
  ) : (
    <PowerOff className="h-4 w-4 text-muted-foreground" />
  )
}

function NetworkIcon({ connected }: { connected: boolean }) {
  return connected ? (
    <Wifi className="h-4 w-4 text-success" />
  ) : (
    <WifiOff className="h-4 w-4 text-destructive" />
  )
}

/** 별칭 있으면 별칭, 없으면 MAC */
function displayTitle(device: Pick<HearingLoop, 'alias' | 'mac'>) {
  return device.alias?.trim() ? device.alias : device.mac
}

/* ══════════════════════════════════════════════════════
   Detail Modal — 조회 전용 + 별칭 편집 + 삭제
   ══════════════════════════════════════════════════════ */

function DeviceDetailModal({
  device,
  onClose,
}: {
  device: HearingLoop
  onClose: () => void
}) {
  useLockBodyScroll()
  const updateAlias = useUpdateAlias()
  const deleteDevice = useDeleteDevice()
  const assignZone = useAssignZone()
  const { data: zones, isLoading: zonesLoading } = useZones()

  const [displayAlias, setDisplayAlias] = useState<string>(device.alias ?? '')
  const [editingAlias, setEditingAlias] = useState(false)
  const [tempAlias, setTempAlias] = useState(displayAlias)
  const [aliasError, setAliasError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 배치된 텔레코일존 (미배정이면 배정 — 목, §9)
  const [displayZone, setDisplayZone] = useState<{ id: number; name: string } | null>(
    device.telecoilZoneId && device.telecoilZoneName
      ? { id: Number(device.telecoilZoneId), name: device.telecoilZoneName }
      : null,
  )
  const [editingZone, setEditingZone] = useState(false)
  const [assignZoneId, setAssignZoneId] = useState('')

  const doAssign = () => {
    if (!assignZoneId) return
    assignZone.mutate(
      { id: Number(device.id), zoneId: Number(assignZoneId) },
      {
        onSuccess: () => {
          const z = zones?.find((zz) => String(zz.id) === assignZoneId)
          setDisplayZone({ id: Number(assignZoneId), name: z?.name ?? `구역 ${assignZoneId}` })
          setEditingZone(false)
        },
      },
    )
  }

  const hasAlias = Boolean(displayAlias.trim())
  const title = hasAlias ? displayAlias : device.mac

  const saveAlias = () => {
    const next = tempAlias.trim()
    setAliasError('')
    updateAlias.mutate(
      { mac: device.mac, alias: next },
      {
        onSuccess: () => {
          setDisplayAlias(next)
          setEditingAlias(false)
        },
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setAliasError('이미 사용 중인 별칭입니다.')
          } else {
            setAliasError('별칭 저장에 실패했습니다.')
          }
        },
      },
    )
  }

  const handleDelete = () => {
    deleteDevice.mutate(Number(device.id), { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-5 border-b border-border bg-page/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              {hasAlias && <p className="text-[12px] text-muted-foreground font-mono">{device.mac}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin p-6">
          {/* 별칭 편집 */}
          <div className="rounded-xl border border-primary/20 bg-primary/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-primary">히어링루프 별칭</span>
              {!editingAlias && (
                <button
                  onClick={() => { setTempAlias(displayAlias); setAliasError(''); setEditingAlias(true) }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </button>
              )}
            </div>
            {editingAlias ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempAlias}
                    onChange={(e) => setTempAlias(e.target.value)}
                    placeholder="별칭을 입력하세요"
                    className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                    disabled={updateAlias.isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveAlias()
                      if (e.key === 'Escape') { setTempAlias(displayAlias); setAliasError(''); setEditingAlias(false) }
                    }}
                  />
                  <button
                    onClick={saveAlias}
                    disabled={updateAlias.isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {updateAlias.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { setTempAlias(displayAlias); setAliasError(''); setEditingAlias(false) }}
                    disabled={updateAlias.isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {aliasError && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-destructive">
                    <AlertCircle className="h-3 w-3" /> {aliasError}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[14px] font-bold text-foreground">{hasAlias ? displayAlias : <span className="text-muted-foreground font-normal">별칭 없음 (MAC으로 표시)</span>}</p>
            )}
          </div>

          {/* 배치된 텔레코일존 — 배정 / 재배치 (목, §9) */}
          <div className="rounded-xl border border-primary/20 bg-primary/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">배치된 텔레코일존<MockBadge /></span>
              {!editingZone && (
                <button
                  onClick={() => { setAssignZoneId(displayZone ? String(displayZone.id) : ''); setEditingZone(true) }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  {displayZone ? '재배치' : '배정'}
                </button>
              )}
            </div>
            {editingZone ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={assignZoneId}
                    onChange={(e) => setAssignZoneId(e.target.value)}
                    disabled={assignZone.isPending || zonesLoading}
                    autoFocus
                    className="h-9 w-full appearance-none rounded-lg border border-primary/30 bg-white pl-3 pr-9 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  >
                    <option value="">{zonesLoading ? '불러오는 중…' : '존 선택'}</option>
                    {zones?.map((z) => (
                      <option key={z.id} value={String(z.id)}>{z.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <button
                  onClick={doAssign}
                  disabled={!assignZoneId || assignZone.isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40"
                >
                  {assignZone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditingZone(false)}
                  disabled={assignZone.isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page transition-colors disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : displayZone ? (
              <p className="flex items-center gap-1.5 text-[14px] font-bold text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {displayZone.name}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                미배정
              </p>
            )}
          </div>

          {/* Info grid — 조회 전용 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 전원 — 목 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">전원 상태<MockBadge /></span>
              <div className="flex items-center gap-2">
                <PowerIcon on={device.power} />
                <span className="text-sm font-bold text-foreground">{device.power ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            {/* 기기 동작 — 실값 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">기기 동작 여부</span>
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${device.operating ? 'text-success' : 'text-destructive'}`} />
                <span className="text-sm font-bold text-foreground">{device.operating ? '정상 작동' : '작동 중지'}</span>
              </div>
            </div>

            {/* 네트워크 — 목 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">네트워크 연결<MockBadge /></span>
              <div className="flex items-center gap-2">
                <NetworkIcon connected={device.networkConnected} />
                <span className="text-sm font-bold text-foreground">{device.networkConnected ? '연결됨' : '연결 끊김'}</span>
              </div>
            </div>

            {/* 온도 — 실값 */}
            <div className="rounded-xl border border-border p-4">
              <span className="text-[12px] text-muted-foreground block mb-2">온도</span>
              <div className="flex items-center gap-2">
                <Thermometer className={`h-4 w-4 ${device.temperature > 45 ? 'text-destructive' : device.temperature > 40 ? 'text-warning' : 'text-success'}`} />
                <span className="text-sm font-bold text-foreground">{device.temperature}°C</span>
              </div>
            </div>

            {/* 볼륨 — 목, 조회만 */}
            <div className="rounded-xl border border-border p-4 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-muted-foreground">볼륨<MockBadge /></span>
                <span className="text-sm font-bold text-primary">{device.volume}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${device.volume}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="rounded-xl border border-border divide-y divide-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] text-muted-foreground">펌웨어 버전<MockBadge /></span>
              </div>
              <span className="text-[13px] font-semibold text-foreground">{device.firmwareVersion || '—'}</span>
            </div>

            {[
              { label: 'MAC 주소', value: device.mac, icon: Hash },
              { label: '등록일', value: formatDateTime(device.registeredAt), icon: CalendarClock },
              { label: '최근 업데이트', value: formatDateTime(device.lastUpdated), icon: Activity },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <row.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">{row.label}</span>
                </div>
                <span className={`text-[13px] font-semibold ${row.value === '미배정' ? 'text-warning' : 'text-foreground'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Alerts history — 목 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-destructive" />
              <h4 className="text-[14px] font-bold text-foreground">알림 이력</h4>
              <MockBadge />
            </div>
            {device.alerts.length > 0 ? (
              <div className="space-y-2">
                {device.alerts.map((alert) => (
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
                    <span className="text-muted-foreground shrink-0">{formatDateTime(alert.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground px-1">최근 알림이 없습니다.</p>
            )}
          </div>
        </div>

        {/* Footer — 삭제 / 닫기 (제어·저장 없음) */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-t border-border bg-page/30">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-destructive">정말 삭제할까요?</span>
              <button
                onClick={handleDelete}
                disabled={deleteDevice.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-[12px] font-bold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleteDevice.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                삭제
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteDevice.isPending}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-page transition-colors"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-destructive hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              기기 삭제
            </button>
          )}
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Register Modal — 상세 카드 입력(여러 대 누적) + MAC 빠른 입력
   ══════════════════════════════════════════════════════ */

interface DraftEntry { mac: string; zoneId: string; alias: string }

const ALIAS_MAX = 30

/** 입력 필드 카드 (아이콘 · 제목/설명 · 입력) — 등록 폼 공통 레이아웃 */
function FieldRow({
  icon,
  iconCls,
  title,
  badge,
  desc,
  children,
}: {
  icon: ReactNode
  iconCls: string
  title: string
  badge?: ReactNode
  desc?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>{icon}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-2/5 sm:shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-foreground">{title}</span>
              {badge}
            </div>
            {desc && <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{desc}</p>}
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll()
  const createBulk = useCreateDevicesBulk()
  const { data: zones, isLoading: zonesLoading } = useZones()

  const [quickMode, setQuickMode] = useState(false)
  const [entries, setEntries] = useState<DraftEntry[]>([])
  const [mac, setMac] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [alias, setAlias] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null)

  const isPending = createBulk.isPending
  const zoneNameOf = (id: string) => zones?.find((z) => String(z.id) === id)?.name ?? '미배정'

  const addEntry = () => {
    setError('')
    const m = mac.trim()
    if (!m) { setError('MAC 주소를 입력해주세요.'); return }
    if (entries.some((e) => e.mac.toLowerCase() === m.toLowerCase())) { setError('이미 추가된 MAC 주소입니다.'); return }
    setEntries((prev) => [...prev, { mac: m, zoneId, alias: alias.trim() }])
    setMac(''); setZoneId(''); setAlias('')
  }

  const removeEntry = (m: string) => setEntries((prev) => prev.filter((e) => e.mac !== m))

  const toInput = (e: DraftEntry): CreateDeviceInput => ({
    mac_address: e.mac,
    ...(e.zoneId ? { zone_id: Number(e.zoneId) } : {}),
    ...(e.alias ? { alias: e.alias } : {}),
  })

  // 폼에 입력 중이고 아직 추가 안 한 MAC도 등록에 포함(단건 편의)
  const pendingForm: DraftEntry | null =
    !quickMode && mac.trim() && !entries.some((e) => e.mac.toLowerCase() === mac.trim().toLowerCase())
      ? { mac: mac.trim(), zoneId, alias: alias.trim() }
      : null
  const registerCount = quickMode ? 0 : entries.length + (pendingForm ? 1 : 0)

  const submit = () => {
    setError('')
    setResult(null)
    let list: CreateDeviceInput[]
    if (quickMode) {
      const macs = Array.from(new Set(bulkText.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)))
      if (macs.length === 0) { setError('MAC 주소를 한 줄에 하나씩 입력해주세요.'); return }
      list = macs.map((m) => ({ mac_address: m }))
    } else {
      const allEntries = pendingForm ? [...entries, pendingForm] : entries
      if (allEntries.length === 0) { setError('등록할 기기를 추가해주세요.'); return }
      list = allEntries.map(toInput)
    }
    createBulk.mutate(list, {
      onSuccess: (res) => {
        if (res.skipped.length === 0) onClose()
        else setResult({ created: res.created.length, skipped: res.skipped })
      },
      onError: () => setError('등록에 실패했습니다.'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-foreground">히어링루프 등록</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {quickMode ? 'MAC 주소만 빠르게 여러 대 등록합니다.' : '정보를 입력하고 추가하면 아래 목록에 쌓입니다. 한 번에 등록하세요.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin p-6">
          {quickMode ? (
            <div>
              <label className="mb-2 block text-[12px] font-semibold text-foreground">MAC 주소 (한 줄에 하나)</label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'AA:BB:CC:DD:EE:01\nAA:BB:CC:DD:EE:02'}
                rows={6}
                disabled={isPending}
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">텔레코일존·별칭 없이 MAC 주소만 일괄 등록합니다(미배정).</p>
            </div>
          ) : (
            <>
              {/* MAC */}
              <FieldRow
                icon={<Wifi className="h-5 w-5 text-primary" />}
                iconCls="bg-primary/10"
                title="MAC 주소"
                badge={<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">필수</span>}
              >
                <input
                  type="text"
                  value={mac}
                  onChange={(e) => setMac(e.target.value)}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  autoFocus
                  disabled={isPending}
                  className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[13px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  onKeyDown={(e) => { if (e.key === 'Enter') addEntry() }}
                />
              </FieldRow>

              {/* 텔레코일존 */}
              <FieldRow
                icon={<Target className="h-5 w-5 text-success" />}
                iconCls="bg-success/10"
                title="텔레코일존"
                badge={<span className="text-[11px] font-normal text-muted-foreground">선택</span>}
                desc={zonesLoading ? '텔레코일존 목록을 불러오는 중…' : '이미 등록된 텔레코일존만 선택할 수 있어요. 비우면 미배정으로 등록됩니다.'}
              >
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  disabled={isPending || zonesLoading}
                  className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
                >
                  <option value="">선택해주세요 (미배정)</option>
                  {zones?.map((z) => (
                    <option key={z.id} value={String(z.id)}>{z.name}</option>
                  ))}
                </select>
              </FieldRow>

              {/* 별칭 */}
              <FieldRow
                icon={<Star className="h-5 w-5 text-purple-600" />}
                iconCls="bg-purple-100"
                title="별칭"
                badge={<span className="text-[11px] font-normal text-muted-foreground">선택</span>}
                desc="비우면 MAC 주소로 표시되고, 나중에 변경할 수 있어요."
              >
                <div className="relative">
                  <input
                    type="text"
                    value={alias}
                    maxLength={ALIAS_MAX}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="예: 1층 안내데스크"
                    disabled={isPending}
                    className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 pr-14 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    onKeyDown={(e) => { if (e.key === 'Enter') addEntry() }}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
                    {alias.length} / {ALIAS_MAX}
                  </span>
                </div>
              </FieldRow>

              {/* 목록에 추가 */}
              <button
                onClick={addEntry}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/3 py-2.5 text-[13px] font-semibold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> 목록에 추가하기
              </button>

              {/* 추가된 기기 카드 목록 */}
              {entries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold text-muted-foreground">추가된 기기 {entries.length}대</p>
                  {entries.slice().reverse().map((e) => (
                    <div key={e.mac} className="flex items-center gap-3 rounded-xl border border-border bg-page/40 px-3.5 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Radio className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-foreground">{e.alias || e.mac}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{e.mac} · {zoneNameOf(e.zoneId)}</p>
                      </div>
                      <button onClick={() => removeEntry(e.mac)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {result && (
            <div className="rounded-lg bg-page p-3 text-[12px]">
              <p className="font-semibold text-success">등록 완료: {result.created}대</p>
              {result.skipped.length > 0 && (
                <p className="mt-1 text-warning">건너뜀(중복): {result.skipped.join(', ')}</p>
              )}
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-page/30 px-6 py-4">
          <button
            onClick={() => { setQuickMode((q) => !q); setError(''); setResult(null) }}
            className="text-[12px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            {quickMode ? '상세 입력으로 돌아가기' : 'MAC 주소로만 추가하기'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
              {result ? '닫기' : '취소'}
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              등록{!quickMode && registerCount > 0 ? ` (${registerCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function HearingLoopsPage() {
  const { data: devices, isLoading, isError, refetch } = useDevices()

  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState<string>('all') // 'all' | 'unassigned' | zoneId
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedDevice, setSelectedDevice] = useState<HearingLoop | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  const all = useMemo(() => devices ?? [], [devices])

  /* 텔레코일존 필터 항목(키·라벨·기기수) — 로드된 기기에서 파생 */
  const zoneFilterItems = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    let unassigned = 0
    all.forEach((d) => {
      if (d.telecoilZoneId && d.telecoilZoneName) {
        const prev = map.get(d.telecoilZoneId)
        map.set(d.telecoilZoneId, { name: d.telecoilZoneName, count: (prev?.count ?? 0) + 1 })
      } else {
        unassigned++
      }
    })
    const items: { key: string; label: string; count: number }[] = [
      { key: 'all', label: '전체', count: all.length },
    ]
    if (unassigned > 0) items.push({ key: 'unassigned', label: '미배정', count: unassigned })
    map.forEach((v, id) => items.push({ key: id, label: v.name, count: v.count }))
    return items
  }, [all])

  /* 존 필터 적용 */
  const zoneBaseList = useMemo(() => {
    if (zoneFilter === 'all') return all
    if (zoneFilter === 'unassigned') return all.filter((d) => !d.telecoilZoneId)
    return all.filter((d) => d.telecoilZoneId === zoneFilter)
  }, [all, zoneFilter])

  const filteredDevices = useMemo(() => {
    let list = [...zoneBaseList]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (d) => d.mac.toLowerCase().includes(q) || (d.alias?.toLowerCase().includes(q) ?? false),
      )
    }
    list.sort((a, b) => {
      const da = new Date(a.lastUpdated).getTime()
      const db = new Date(b.lastUpdated).getTime()
      return sortOrder === 'latest' ? db - da : da - db
    })
    return list
  }, [zoneBaseList, search, sortOrder])

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <div className="flex items-end justify-between pb-5 pt-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">히어링루프 관리</h2>
          <p className="text-sm text-muted-foreground mt-2">등록된 히어링루프를 조회하고 관리할 수 있습니다.</p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          히어링루프 등록
        </button>
      </div>

      {/* ─── Search · Zone filter · Sort ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="별칭, MAC 주소 검색..."
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
      </div>

      {/* ─── Table ─── */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Telecoil-zone filter pills (가로 스크롤) */}
        <div className="flex items-center gap-1 border-b border-border px-5 pb-3 pt-4 overflow-x-auto scrollbar-thin">
          <Building2 className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
          {zoneFilterItems.map((item) => {
            const isActive = zoneFilter === item.key
            return (
              <button
                key={item.key}
                onClick={() => setZoneFilter(item.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                  isActive
                    ? 'border-primary text-primary bg-white shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-page'
                }`}
              >
                {item.label}
                <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-page text-muted-foreground/70'
                }`}>
                  {item.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="bg-page/50 border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">기기</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">텔레코일존</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">전원<MockBadge /></th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">네트워크<MockBadge /></th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">온도</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">볼륨<MockBadge /></th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">펌웨어<MockBadge /></th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">최근 업데이트</th>
                <th className="px-5 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm">기기 목록을 불러오는 중...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="h-8 w-8 text-destructive/60" />
                      <p className="text-sm text-muted-foreground">목록을 불러오지 못했습니다.</p>
                      <button onClick={() => refetch()} className="rounded-lg bg-page px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-border/50 transition-colors">
                        다시 시도
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Radio className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => {
                  const hasAlias = Boolean(device.alias?.trim())
                  return (
                    <tr
                      key={device.id}
                      className="transition-colors hover:bg-main-blue-1/10 cursor-pointer group"
                      onClick={() => setSelectedDevice(device)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${!device.telecoilZoneId ? 'bg-warning/10' : 'bg-primary/10'}`}>
                            {!device.telecoilZoneId ? <Package className="h-4 w-4 text-warning" /> : <Radio className="h-4 w-4 text-primary" />}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-foreground">{displayTitle(device)}</p>
                            {hasAlias && <p className="text-[11px] text-muted-foreground font-mono">{device.mac}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {device.telecoilZoneName ? (
                          <p className="text-[13px] font-semibold text-foreground">{device.telecoilZoneName}</p>
                        ) : (
                          <span className="text-[12px] text-warning font-semibold">미배정</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center"><PowerIcon on={device.power} /></td>
                      <td className="px-5 py-3.5 text-center"><NetworkIcon connected={device.networkConnected} /></td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[13px] font-semibold ${device.temperature > 45 ? 'text-destructive' : device.temperature > 40 ? 'text-warning' : 'text-foreground'}`}>
                          {device.temperature > 0 ? `${device.temperature}°C` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[13px] font-semibold ${device.volume > 90 ? 'text-warning' : 'text-foreground'}`}>
                          {device.volume > 0 ? `${device.volume}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-[12px] font-mono font-semibold text-foreground">{device.firmwareVersion || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-[12px] text-muted-foreground">{formatDateTime(device.lastUpdated)}</span></td>
                      <td className="px-3 py-3.5 text-center">
                        <button className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-page transition-all">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-page/30">
          <span className="text-[12px] text-muted-foreground">
            총 <span className="font-bold text-foreground">{filteredDevices.length}</span>개 기기
          </span>
        </div>
      </div>

      {/* ─── Modals ─── */}
      {selectedDevice && (
        <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </div>
  )
}
