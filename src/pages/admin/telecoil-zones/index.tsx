import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Search,
  Building2,
  Mail,
  User,
  Radio,
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
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
  Thermometer,
  Cpu,
  Info,
} from 'lucide-react'
import type { ZoneStatus, HearingLoop } from '@/types/device'
import { formatDateTime } from '@/lib/format'
import {
  useZones,
  useZone,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
} from '@/hooks/useZones'
import { useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { useDevices, useAssignZone, useUnassignZone } from '@/hooks/useDevices'
import { useAlerts } from '@/hooks/useAlerts'
import { ALERT_TYPE_LABEL, type AlertResponseDto, type AlertPriorityEnum } from '@/types/alert'

/* ══════════════════════════════════════════════════════
   유틸 / Sub-components
   ══════════════════════════════════════════════════════ */

/** 모달 동안 배경 스크롤 잠금 */
function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
}

/** 목 값 배지 */
function MockBadge() {
  return (
    <span className="ml-1 inline-block rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold text-warning align-middle">목</span>
  )
}

/** 존 상태 배지 (online 비율 파생 — 분류 기준은 상태 필터 헤더의 ⓘ 참고) */
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

function PowerIcon({ on }: { on: boolean }) {
  return on ? <Power className="h-3.5 w-3.5 text-success" /> : <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
}
function NetworkIcon({ connected }: { connected: boolean }) {
  return connected ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />
}

/* ── 존 알림 이력 (GET /alerts?zone_id=) — 존 소속 기기 알림(REAL) ── */
const ALERT_PRI: Record<AlertPriorityEnum, { dot: string; box: string }> = {
  CRITICAL: { dot: 'bg-destructive', box: 'border-destructive/20 bg-destructive/5' },
  WARNING: { dot: 'bg-warning', box: 'border-warning/20 bg-warning/5' },
  INFO: { dot: 'bg-primary', box: 'border-primary/20 bg-primary/5' },
}

function ZoneAlertRow({ a }: { a: AlertResponseDto }) {
  const p = ALERT_PRI[a.priority]
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12px] ${p.box}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${p.dot}`} />
      <span className="shrink-0 font-semibold text-foreground">{ALERT_TYPE_LABEL[a.type]}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.message}</span>
      <span className="shrink-0 truncate font-mono text-[10px] text-muted-foreground">{a.device?.alias?.trim() ? a.device.alias : a.device?.mac_address}</span>
      <span className="shrink-0 text-muted-foreground">{formatDateTime(a.occurred_at)}</span>
    </div>
  )
}

function ZoneAlertHistory({ zoneId }: { zoneId: number }) {
  const { data, isLoading, isError } = useAlerts({ zone_id: zoneId, limit: 50 })
  const alerts = data?.items ?? []

  if (isLoading) {
    return <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-[12px]">불러오는 중…</span></div>
  }
  if (isError) {
    return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8"><Bell className="h-7 w-7 text-muted-foreground/30" /><p className="text-[13px] text-muted-foreground">알림 이력을 불러오지 못했습니다.</p></div>
  }
  if (alerts.length === 0) {
    return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8"><Bell className="h-7 w-7 text-muted-foreground/30" /><p className="text-[13px] text-muted-foreground">알림 이력이 없습니다.</p></div>
  }
  return <div className="space-y-2">{alerts.map((a) => <ZoneAlertRow key={a.id} a={a} />)}</div>
}

/* ══════════════════════════════════════════════════════
   Register Modal — 통합 생성 (존 + 계정 오케스트레이션, 목)
   ══════════════════════════════════════════════════════ */

function RegisterModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll()
  const createZone = useCreateZone()
  const createUser = useCreateUser()

  const [form, setForm] = useState({ name: '', managerEmail: '', username: '', password: '' })
  const [error, setError] = useState('')
  const isPending = createZone.isPending || createUser.isPending

  const submit = async () => {
    setError('')
    const name = form.name.trim()
    if (!name) { setError('텔레코일존명을 입력해주세요.'); return }
    const wantsAccount = Boolean(form.username.trim() || form.password.trim())
    if (wantsAccount && !(form.username.trim() && form.password.trim() && form.managerEmail.trim())) {
      setError('계정을 만들려면 담당자 이메일·사용자 ID·비밀번호를 모두 입력해주세요.')
      return
    }
    try {
      const zone = await createZone.mutateAsync(name)
      if (wantsAccount) {
        try {
          await createUser.mutateAsync({
            username: form.username.trim(),
            email: form.managerEmail.trim(),
            password: form.password,
            name: form.username.trim(),
            role: 'ZONE_USER',
            zone_id: zone.id,
          })
        } catch (e) {
          if (axios.isAxiosError(e) && e.response?.status === 409) {
            setError('존은 생성됐지만 계정 생성 실패(아이디/이메일 중복). 상세에서 계정을 다시 만들어주세요.')
          } else {
            setError('존은 생성됐지만 계정 생성에 실패했습니다. 상세에서 다시 시도해주세요.')
          }
          return
        }
      }
      onClose()
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 409) setError('이미 존재하는 텔레코일존명입니다.')
      else setError('텔레코일존 생성에 실패했습니다.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="flex items-center text-lg font-bold text-foreground">텔레코일존 등록<MockBadge /></h3>
              <p className="text-[12px] text-muted-foreground">존과 사용자 계정을 함께 생성합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto scrollbar-thin p-6">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              텔레코일존명
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">필수</span>
            </label>
            <input
              type="text"
              placeholder="예: 서울시청"
              value={form.name}
              disabled={isPending}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              담당자 이메일
            </label>
            <input
              type="email"
              placeholder="긴급 알림 수신용 이메일"
              value={form.managerEmail}
              disabled={isPending}
              onChange={(e) => setForm({ ...form, managerEmail: e.target.value })}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="rounded-xl border border-border bg-page/30 p-4">
            <label className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              사용자 모드 계정 생성
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="사용자 ID"
                value={form.username}
                disabled={isPending}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={form.password}
                disabled={isPending}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">비워두면 존만 생성됩니다. 계정은 나중에 상세에서 만들 수 있어요.</p>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-page/30 px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">취소</button>
          <button
            onClick={submit}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            등록하기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Assign Device Modal — 미배정 기기 선택 → PUT 배정
   ══════════════════════════════════════════════════════ */

function AssignDeviceModal({ zoneId, onClose }: { zoneId: number; onClose: () => void }) {
  useLockBodyScroll()
  const { data: devices, isLoading } = useDevices()
  const assignZone = useAssignZone()
  const [search, setSearch] = useState('')

  const candidates = useMemo(() => {
    const list = (devices ?? []).filter((d) => !d.telecoilZoneId)
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((d) => d.mac.toLowerCase().includes(q) || (d.alias?.toLowerCase().includes(q) ?? false))
  }, [devices, search])

  const assign = (device: HearingLoop) => {
    assignZone.mutate({ id: Number(device.id), zoneId }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-4">
          <h3 className="text-[15px] font-bold text-foreground">히어링루프 추가 배정</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="shrink-0 px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="미배정 기기 검색 (별칭·MAC)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><p className="text-[13px]">불러오는 중…</p></div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10"><Radio className="h-7 w-7 text-muted-foreground/30" /><p className="text-[13px] text-muted-foreground">배정 가능한 미배정 기기가 없습니다.</p></div>
          ) : (
            <div className="space-y-1.5">
              {candidates.map((d) => (
                <button
                  key={d.id}
                  onClick={() => assign(d)}
                  disabled={assignZone.isPending}
                  className="flex w-full items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10"><Radio className="h-4 w-4 text-warning" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{d.alias?.trim() ? d.alias : d.mac}</p>
                    {d.alias?.trim() && <p className="truncate font-mono text-[11px] text-muted-foreground">{d.mac}</p>}
                  </div>
                  <Plus className="h-4 w-4 text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Detail Modal
   ══════════════════════════════════════════════════════ */

function ZoneDetailModal({ zoneId, onClose }: { zoneId: number; onClose: () => void }) {
  useLockBodyScroll()
  const { data, isLoading } = useZone(zoneId)
  const updateZone = useUpdateZone()
  const deleteZone = useDeleteZone()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const unassign = useUnassignZone()

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [resettingPw, setResettingPw] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameValue, setUsernameValue] = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [acct, setAcct] = useState({ username: '', email: '', password: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [actionError, setActionError] = useState('')

  const zone = data?.zone
  const devices = data?.devices ?? []
  const userId = zone?.userAccount ? Number(zone.userAccount.id) : null
  const rate = zone && zone.deviceCount > 0 ? Math.round((zone.activeDeviceCount / zone.deviceCount) * 100) : 0
  const barColor = rate === 100 ? 'bg-success' : rate >= 80 ? 'bg-primary' : rate >= 60 ? 'bg-warning' : 'bg-destructive'

  const saveName = () => {
    const v = nameValue.trim()
    if (!v) return
    setActionError('')
    updateZone.mutate({ id: zoneId, name: v }, {
      onSuccess: () => setEditingName(false),
      onError: (e) => setActionError(axios.isAxiosError(e) && e.response?.status === 409 ? '이미 존재하는 이름입니다.' : '이름 변경 실패'),
    })
  }
  const saveEmail = () => {
    if (!userId) return
    setActionError('')
    updateUser.mutate({ id: userId, input: { email: emailValue.trim() } }, {
      onSuccess: () => setEditingEmail(false),
      onError: (e) => setActionError(axios.isAxiosError(e) && e.response?.status === 409 ? '이미 사용 중인 이메일입니다.' : '이메일 변경 실패'),
    })
  }
  const saveUsername = () => {
    if (!userId) return
    const v = usernameValue.trim(); if (!v) return
    setActionError('')
    updateUser.mutate({ id: userId, input: { username: v } }, {
      onSuccess: () => setEditingUsername(false),
      onError: (e) => setActionError(axios.isAxiosError(e) && e.response?.status === 409 ? '이미 사용 중인 아이디입니다.' : '아이디 변경 실패'),
    })
  }
  const resetPw = () => {
    if (!userId || !pwValue.trim()) return
    setActionError('')
    updateUser.mutate({ id: userId, input: { password: pwValue } }, {
      onSuccess: () => { setResettingPw(false); setPwValue('') },
      onError: () => setActionError('비밀번호 재설정 실패'),
    })
  }
  // 존 삭제 = 계정 먼저 정리 → 존 삭제 (FK 방지). 배정 기기가 남아 FK로 막히면 안내.
  const handleDeleteZone = async () => {
    setActionError('')
    try {
      if (userId) await deleteUser.mutateAsync(userId)
      await deleteZone.mutateAsync(zoneId)
      onClose()
    } catch {
      setActionError('삭제 실패 — 배정된 히어링루프가 있으면 먼저 다른 존으로 옮긴 뒤 삭제해주세요.')
    }
  }

  const createAccount = () => {
    setActionError('')
    if (!(acct.username.trim() && acct.email.trim() && acct.password.trim())) { setActionError('아이디·이메일·비밀번호를 모두 입력해주세요.'); return }
    createUser.mutate({ username: acct.username.trim(), email: acct.email.trim(), password: acct.password, name: acct.username.trim(), role: 'ZONE_USER', zone_id: zoneId }, {
      onSuccess: () => { setCreatingAccount(false); setAcct({ username: '', email: '', password: '' }) },
      onError: (e) => setActionError(axios.isAxiosError(e) && e.response?.status === 409 ? '아이디 또는 이메일이 중복입니다.' : '계정 생성 실패'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{zone?.name ?? '…'}</h3>
                {zone && <ZoneStatusBadge status={zone.status} />}
              </div>
              <p className="text-[12px] text-muted-foreground">텔레코일존 #{zoneId}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {isLoading || !zone ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm">불러오는 중…</p></div>
        ) : (
          <>
            {/* Summary stats — 가동률(online) */}
            <div className="grid shrink-0 grid-cols-3 gap-4 border-b border-border px-6 py-4">
              <div className="rounded-xl border border-border p-3">
                <span className="text-[11px] text-muted-foreground">전체 장비</span>
                <div className="mt-1 flex items-center gap-2"><Radio className="h-4 w-4 text-primary" /><span className="text-lg font-bold text-foreground">{zone.deviceCount}</span></div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <span className="flex items-center text-[11px] text-muted-foreground">정상 가동<MockBadge /></span>
                <div className="mt-1 flex items-center gap-2"><span className="text-lg font-bold text-success">{zone.activeDeviceCount}</span><span className="text-[12px] text-muted-foreground">/ {zone.deviceCount}</span></div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <span className="flex items-center text-[11px] text-muted-foreground">가동률<MockBadge /></span>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/50"><div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${rate}%` }} /></div>
                  <span className={`text-[12px] font-bold ${rate === 100 ? 'text-success' : rate >= 80 ? 'text-primary' : rate >= 60 ? 'text-warning' : 'text-destructive'}`}>{rate}%</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin px-6 py-5">
              {actionError && (
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /> {actionError}</p>
              )}

              {/* 기본 정보 — 존 이름 수정 / 등록일 */}
              <div>
                <div className="mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><h4 className="text-[14px] font-bold text-foreground">기본 정보</h4></div>
                <div className="rounded-xl border border-border divide-y divide-border/50">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">텔레코일존명</span></div>
                    {editingName ? (
                      <div className="flex items-center gap-1.5">
                        <input value={nameValue} onChange={(e) => setNameValue(e.target.value)} autoFocus disabled={updateZone.isPending}
                          className="rounded-lg border border-primary/30 bg-white px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                          onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }} />
                        <button onClick={saveName} disabled={updateZone.isPending} className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50">{updateZone.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}</button>
                        <button onClick={() => setEditingName(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground">{zone.name}</span>
                        <button onClick={() => { setNameValue(zone.name); setEditingName(true) }} className="text-[11px] font-semibold text-primary hover:text-primary-dark">수정</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5"><Shield className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">등록일</span></div>
                    <span className="text-[13px] font-semibold text-foreground">{formatDateTime(zone.registeredAt)}</span>
                  </div>
                </div>
              </div>

              {/* 담당자 이메일 (목 — 계정 email) */}
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="flex items-center text-[13px] font-semibold text-foreground">담당자 이메일<MockBadge /></span></div>
                  {zone.userAccount && (
                    <button onClick={() => { setEmailValue(zone.managerEmail); setEditingEmail(!editingEmail) }} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5"><Edit3 className="h-3 w-3" />{editingEmail ? '취소' : '수정'}</button>
                  )}
                </div>
                {!zone.userAccount ? (
                  <p className="text-[13px] text-muted-foreground">계정이 없어 담당자 이메일이 없습니다.</p>
                ) : editingEmail ? (
                  <div className="flex items-center gap-2">
                    <input type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} disabled={updateUser.isPending}
                      className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <button onClick={saveEmail} disabled={updateUser.isPending} className="rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-white hover:bg-primary-dark disabled:opacity-50">{updateUser.isPending ? '저장중' : '저장'}</button>
                  </div>
                ) : (
                  <p className="text-[13px] text-foreground">{zone.managerEmail || '—'}</p>
                )}
              </div>

              {/* 사용자 모드 계정 */}
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] font-semibold text-foreground">사용자 모드 계정</span></div>
                {zone.userAccount ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-page/50 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10"><User className="h-3.5 w-3.5 text-primary" /></div>
                        {editingUsername ? (
                          <div className="flex items-center gap-1.5">
                            <input value={usernameValue} onChange={(e) => setUsernameValue(e.target.value)} autoFocus disabled={updateUser.isPending}
                              className="rounded-lg border border-primary/30 bg-white px-2.5 py-1 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                              onKeyDown={(e) => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false) }} />
                            <button onClick={saveUsername} disabled={updateUser.isPending} className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50">{updateUser.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}</button>
                            <button onClick={() => setEditingUsername(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <span className="font-mono text-[13px] font-semibold text-foreground">{zone.userAccount.username}</span>
                        )}
                      </div>
                      {!editingUsername && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setUsernameValue(zone.userAccount!.username); setEditingUsername(true) }} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">ID 수정</button>
                          <button onClick={() => { setResettingPw(!resettingPw); setPwValue('') }} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"><KeyRound className="h-3 w-3" />PW 재설정</button>
                        </div>
                      )}
                    </div>
                    {resettingPw && (
                      <div className="flex items-center gap-2">
                        <input type="password" placeholder="새 비밀번호" value={pwValue} onChange={(e) => setPwValue(e.target.value)} autoFocus disabled={updateUser.isPending}
                          className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                        <button onClick={resetPw} disabled={updateUser.isPending || !pwValue.trim()} className="rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-white hover:bg-primary-dark disabled:opacity-50">재설정</button>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">비밀번호는 조회할 수 없고 재설정만 가능합니다.</p>
                  </div>
                ) : creatingAccount ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="이메일" value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} className="rounded-lg border border-border bg-white px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input placeholder="아이디" value={acct.username} onChange={(e) => setAcct({ ...acct, username: e.target.value })} className="rounded-lg border border-border bg-white px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input type="password" placeholder="비밀번호" value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} className="rounded-lg border border-border bg-white px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setCreatingAccount(false)} className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-page">취소</button>
                      <button onClick={createAccount} disabled={createUser.isPending} className="flex items-center gap-1.5 rounded-lg bg-primary-dark px-4 py-1.5 text-[12px] font-bold text-white hover:bg-primary-dark/90 disabled:opacity-50">{createUser.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}생성</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setCreatingAccount(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors"><UserPlus className="h-4 w-4" />사용자 계정 생성</button>
                )}
              </div>

              {/* 구분선 */}
              <div className="border-t border-border/50" />

              {/* 히어링루프 목록 */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" />
                  <h4 className="text-[14px] font-bold text-foreground">히어링루프</h4>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">{devices.length}</span>
                </div>
                {devices.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8"><Radio className="h-7 w-7 text-muted-foreground/30" /><p className="text-[13px] text-muted-foreground">배정된 히어링루프가 없습니다.</p></div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {devices.map((d) => (
                      <div key={d.id} className="rounded-xl border border-border bg-page/30 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Radio className="h-4 w-4 text-primary" /></div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-foreground">{d.alias?.trim() ? d.alias : d.mac}</p>
                              {d.alias?.trim() && <p className="truncate font-mono text-[10px] text-muted-foreground">{d.mac}</p>}
                            </div>
                          </div>
                          <button onClick={() => unassign.mutate(Number(d.id))} disabled={unassign.isPending} title="배정 해제(목)" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors disabled:opacity-50"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex flex-col items-center gap-1 rounded-lg border border-border/30 bg-white/60 py-2"><PowerIcon on={d.power} /><span className="text-[10px] text-muted-foreground">전원<MockBadge /></span></div>
                          <div className="flex flex-col items-center gap-1 rounded-lg border border-border/30 bg-white/60 py-2"><NetworkIcon connected={d.networkConnected} /><span className="text-[10px] text-muted-foreground">네트워크<MockBadge /></span></div>
                          <div className="flex flex-col items-center gap-1 rounded-lg border border-border/30 bg-white/60 py-2"><Thermometer className={`h-3.5 w-3.5 ${d.temperature > 45 ? 'text-destructive' : d.temperature > 40 ? 'text-warning' : 'text-success'}`} /><span className="text-[10px] font-bold text-foreground">{d.temperature > 0 ? `${d.temperature}°` : '—'}</span></div>
                          <div className="flex flex-col items-center gap-1 rounded-lg border border-border/30 bg-white/60 py-2"><Cpu className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[9px] font-mono font-bold text-foreground">{d.firmwareVersion || '—'}</span><span className="text-[9px] text-muted-foreground">펌웨어<MockBadge /></span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowAssign(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors"><Plus className="h-4 w-4" />히어링루프 추가 배정</button>
              </div>

              {/* 구분선 */}
              <div className="border-t border-border/50" />

              {/* 알림 이력 (REAL — 존 소속 기기 알림) */}
              <div>
                <div className="mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-warning" /><h4 className="text-[14px] font-bold text-foreground">알림 이력</h4></div>
                <ZoneAlertHistory zoneId={zoneId} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-border bg-page/30 px-6 py-4">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-destructive">{zone.userAccount ? '계정도 함께 삭제됩니다. 삭제할까요?' : '존을 삭제할까요?'}</span>
                  <button onClick={handleDeleteZone} disabled={deleteUser.isPending || deleteZone.isPending} className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-[12px] font-bold text-white hover:bg-destructive/90 disabled:opacity-50">{(deleteUser.isPending || deleteZone.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}삭제</button>
                  <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-page">취소</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-destructive hover:bg-destructive/5 transition-colors"><Trash2 className="h-4 w-4" />텔레코일존 삭제</button>
              )}
              <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">닫기</button>
            </div>
          </>
        )}
      </div>

      {showAssign && <AssignDeviceModal zoneId={zoneId} onClose={() => setShowAssign(false)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function TelecoilZonesPage() {
  const { data: zones, isLoading, isError, refetch } = useZones()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ZoneStatus | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  const all = useMemo(() => zones ?? [], [zones])

  const statusCounts = useMemo(() => {
    const counts = { all: all.length, active: 0, warning: 0, inactive: 0 }
    all.forEach((z) => { counts[z.status]++ })
    return counts
  }, [all])

  const filteredZones = useMemo(() => {
    let list = [...all]
    if (statusFilter !== 'all') list = list.filter((z) => z.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((z) => z.name.toLowerCase().includes(q) || z.managerEmail.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      const da = new Date(a.lastUpdated).getTime()
      const db = new Date(b.lastUpdated).getTime()
      return sortOrder === 'latest' ? db - da : da - db
    })
    return list
  }, [all, statusFilter, search, sortOrder])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between pb-5 pt-5">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">텔레코일존 관리</h2>
          <p className="text-sm text-muted-foreground mt-2">텔레코일존을 등록하고 배치된 히어링루프를 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          텔레코일존 등록
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="텔레코일존명, 담당자 이메일 검색..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </div>
        <button onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')} className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowUpDown className="h-3.5 w-3.5" />{sortOrder === 'latest' ? '최신순' : '오래된순'}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Status filter */}
        <div className="flex items-center gap-1 border-b border-border px-5 pb-3 pt-4">
          {(['all', 'active', 'warning', 'inactive'] as const).map((s) => {
            const labels: Record<string, string> = { all: '전체', active: '정상', warning: '주의', inactive: '비활성' }
            const dotColors: Record<string, string> = { all: 'bg-primary', active: 'bg-success', warning: 'bg-warning', inactive: 'bg-muted-foreground' }
            const borderColors: Record<string, string> = { all: 'border-primary text-primary', active: 'border-success text-success', warning: 'border-warning text-warning', inactive: 'border-muted-foreground text-muted-foreground' }
            const isActive = statusFilter === s
            return (
              <button key={s} onClick={() => setStatusFilter(s)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all ${isActive ? `${borderColors[s]} bg-white shadow-sm` : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-page'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dotColors[s]}`} />{labels[s]}
                <span className={`text-[11px] font-bold ${isActive ? 'opacity-70' : 'text-muted-foreground/60'}`}>{statusCounts[s]}</span>
              </button>
            )
          })}

          {/* 분류 기준 안내 (ⓘ hover) */}
          <div className="group relative ml-auto shrink-0">
            <Info className="h-4 w-4 cursor-help text-muted-foreground/50 hover:text-muted-foreground" />
            <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-64 rounded-lg bg-foreground px-3 py-2.5 text-[11px] font-normal leading-relaxed text-white shadow-lg group-hover:block">
              <span className="font-semibold">상태 분류 기준</span><MockBadge />
              <span className="mt-1 block">· <span className="font-semibold text-success">정상</span> — 배정 기기 전부 정상 가동</span>
              <span className="block">· <span className="font-semibold text-warning">주의</span> — 일부만 정상 가동</span>
              <span className="block">· <span className="font-semibold">비활성</span> — 정상 가동 0대 / 기기 없음</span>
              <span className="absolute bottom-full right-2 border-4 border-transparent border-b-foreground" />
            </span>
          </div>
        </div>

        {/* Card grid */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm">텔레코일존을 불러오는 중...</p></div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16"><AlertCircle className="h-8 w-8 text-destructive/60" /><p className="text-sm text-muted-foreground">목록을 불러오지 못했습니다.</p><button onClick={() => refetch()} className="rounded-lg bg-page px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-border/50">다시 시도</button></div>
          ) : filteredZones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16"><Building2 className="h-8 w-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p></div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredZones.map((zone) => {
                const rate = zone.deviceCount > 0 ? Math.round((zone.activeDeviceCount / zone.deviceCount) * 100) : 0
                const rateColor = rate === 100 ? 'bg-success' : rate >= 80 ? 'bg-primary' : rate >= 60 ? 'bg-warning' : 'bg-destructive'
                const rateTextColor = rate === 100 ? 'text-success' : rate >= 80 ? 'text-primary' : rate >= 60 ? 'text-warning' : 'text-destructive'
                const borderAccent = zone.status === 'active' ? 'border-success/20' : zone.status === 'warning' ? 'border-warning/20' : 'border-border'
                return (
                  <div key={zone.id} className={`rounded-xl border ${borderAccent} group cursor-pointer bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg`} onClick={() => setSelectedZoneId(Number(zone.id))}>
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
                        <div className="min-w-0"><p className="truncate text-[14px] font-bold text-foreground">{zone.name}</p></div>
                      </div>
                      <ZoneStatusBadge status={zone.status} />
                    </div>

                    <div className="mb-4">
                      <div className="mb-1.5 flex items-center justify-between"><span className="flex items-center text-[11px] text-muted-foreground">가동률<MockBadge /></span><span className={`text-[12px] font-bold tabular-nums ${rateTextColor}`}>{rate}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-border/50"><div className={`h-full rounded-full ${rateColor} transition-all duration-500`} style={{ width: `${rate}%` }} /></div>
                    </div>

                    {/* 통계 — 전체장비(실) / 정상가동(목) (알림 제거) */}
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-page/50 py-2.5"><Radio className="h-3.5 w-3.5 text-primary" /><span className="text-[14px] font-bold text-foreground">{zone.deviceCount}</span><span className="text-[10px] text-muted-foreground">전체 장비</span></div>
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-page/50 py-2.5"><Power className="h-3.5 w-3.5 text-success" /><span className="text-[14px] font-bold text-success">{zone.activeDeviceCount}</span><span className="flex items-center text-[10px] text-muted-foreground">정상 가동<MockBadge /></span></div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5"><Mail className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="truncate text-[11px] text-muted-foreground">{zone.managerEmail || '계정 없음'}</span><MockBadge /></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-page/30 px-5 py-3">
          <span className="text-[12px] text-muted-foreground">총 <span className="font-bold text-foreground">{filteredZones.length}</span>개 텔레코일존</span>
        </div>
      </div>

      {selectedZoneId !== null && <ZoneDetailModal zoneId={selectedZoneId} onClose={() => setSelectedZoneId(null)} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </div>
  )
}
