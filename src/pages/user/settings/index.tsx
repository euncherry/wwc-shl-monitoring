import { useState } from 'react'
import axios from 'axios'
import {
  Mail,
  Building2,
  MapPin,
  Phone,
  Pencil,
  Check,
  X,
  User,
  Hash,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateUser } from '@/hooks/useUsers'

/* ══════════════════════════════════════════════════════
   정보관리 — 기관 정보(기관명 실값·주소/대표번호 목) + 담당자(이름·계정ID 실값·이메일 실연동)
   ══════════════════════════════════════════════════════ */

interface MockInstitution {
  address: string
  phone: string
}

const DEFAULT_INSTITUTION: MockInstitution = {
  address: '주소 미등록',
  phone: '대표번호 미등록',
}

/* 기관 주소·대표번호는 백엔드 필드가 없어 목 — zone별 localStorage 보존 */
function loadMockInstitution(key: string): MockInstitution {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { ...DEFAULT_INSTITUTION, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_INSTITUTION
}

/* ══════════════════════════════════════════════════════
   Editable Field — 비동기 저장(이메일 PATCH) + 에러 지원
   ══════════════════════════════════════════════════════ */

function EditableField({
  label,
  value,
  icon: Icon,
  onSave,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  onSave: (val: string) => Promise<void> | void
  placeholder?: string
  type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [temp, setTemp] = useState(value)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const open = () => {
    setTemp(value)
    setError('')
    setEditing(true)
  }

  const handleSave = async () => {
    const next = temp.trim()
    if (!next) {
      setError('값을 입력해 주세요.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave(next)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setTemp(value)
    setError('')
    setEditing(false)
  }

  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-muted-foreground mb-1">{label}</p>
        {editing ? (
          <>
            <div className="flex items-center gap-2">
              <input
                type={type}
                value={temp}
                disabled={saving}
                onChange={(e) => setTemp(e.target.value)}
                placeholder={placeholder}
                className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-page transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-destructive">
                <AlertCircle className="h-3 w-3" /> {error}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 group">
            <p className="text-[14px] font-semibold text-foreground">
              {value || <span className="font-normal italic text-muted-foreground">미지정</span>}
            </p>
            <button
              onClick={open}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-all"
            >
              <Pencil className="h-3 w-3" />
              수정
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Read-only Field ── */

function ReadOnlyField({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-page shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-muted-foreground mb-1">{label}</p>
        <p className="text-[14px] font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function UserSettings() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const updateUserMut = useUpdateUser()

  const zoneName = user?.zoneName ?? '소속 기관 없음'
  const managerName = user?.name ?? '—'
  const username = user?.username ?? '—'
  const email = user?.email ?? ''

  const instKey = `hl-inst-${user?.zoneId ?? 'none'}`
  const [institution, setInstitution] = useState<MockInstitution>(() => loadMockInstitution(instKey))
  const [saved, setSaved] = useState(false)

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  /* 주소·대표번호 = 목(localStorage 보존) */
  const updateInstitution = (key: keyof MockInstitution, val: string) => {
    setInstitution((prev) => {
      const next = { ...prev, [key]: val }
      try {
        localStorage.setItem(instKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
    showSaved()
  }

  /* 이메일 = 실연동 PATCH /users/:id (409 = 중복) */
  const saveEmail = async (val: string) => {
    if (!user) throw new Error('로그인 정보가 없습니다.')
    try {
      await updateUserMut.mutateAsync({ id: Number(user.id), input: { email: val } })
      updateUser({ email: val })
      showSaved()
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        throw new Error('이미 사용 중인 이메일입니다.')
      }
      throw new Error('이메일 저장에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="pb-2">
        <h2 className="text-2xl font-black text-foreground tracking-tight mt-2">정보관리</h2>
        <p className="text-sm text-muted-foreground mt-2">
          소속 기관 정보와 담당자 이메일을 확인하고 수정할 수 있습니다.
        </p>
      </div>

      {/* 저장 완료 토스트 */}
      {saved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-success px-4 py-3 text-[13px] font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4" />
          변경사항이 저장되었습니다
        </div>
      )}

      {/* ─── 프로필 요약 배너 ─── */}
      <div className="flex items-center gap-5 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-white to-white p-6 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-foreground truncate">{zoneName}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              <ShieldCheck className="h-3 w-3" /> 사용자 모드
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            담당자 <span className="font-semibold text-foreground">{managerName}</span>
            {email && <> · {email}</>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ─── 기관 정보 ─── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border bg-page/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-[15px] font-bold text-foreground">기관 정보</h3>
          </div>
          <div className="px-6 divide-y divide-border/50">
            <ReadOnlyField label="기관명" value={zoneName} icon={Building2} />
            <EditableField
              label="주소"
              value={institution.address}
              icon={MapPin}
              onSave={(val) => updateInstitution('address', val)}
              placeholder="주소를 입력하세요"
            />
            <EditableField
              label="대표번호"
              value={institution.phone}
              icon={Phone}
              onSave={(val) => updateInstitution('phone', val)}
              placeholder="전화번호를 입력하세요"
              type="tel"
            />
          </div>
        </div>

        {/* ─── 담당자 정보 ─── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border bg-page/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-[15px] font-bold text-foreground">담당자 정보</h3>
          </div>
          <div className="px-6 divide-y divide-border/50">
            <ReadOnlyField label="담당자 이름" value={managerName} icon={User} />
            <ReadOnlyField label="계정 ID" value={username} icon={Hash} />
            <EditableField
              label="이메일"
              value={email}
              icon={Mail}
              onSave={saveEmail}
              placeholder="이메일을 입력하세요"
              type="email"
            />
          </div>
        </div>
      </div>

      {/* ─── 안내 문구 ─── */}
      <div className="rounded-xl bg-page/50 border border-border/50 px-5 py-3 text-[12px] text-muted-foreground">
        기관명·담당자 이름·계정 ID는 관리자가 관리합니다. 주소·대표번호는 표시용 정보로, 변경 사항은 이 브라우저에 저장됩니다.
      </div>
    </div>
  )
}
