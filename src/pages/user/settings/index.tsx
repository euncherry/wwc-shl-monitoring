import { useState } from 'react'
import {
  Mail,
  Building2,
  MapPin,
  Phone,
  Pencil,
  Check,
  X,
  User,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════
   Mock data — 기관 & 담당자 정보
   ══════════════════════════════════════════════════════ */

interface InstitutionInfo {
  name: string
  address: string
  phone: string
}

interface ManagerInfo {
  name: string
  email: string
  department: string
}

const initialInstitution: InstitutionInfo = {
  name: '서울시청',
  address: '서울특별시 중구 세종대로 110',
  phone: '02-120',
}

const initialManager: ManagerInfo = {
  name: '김담당',
  email: 'manager@seoul.go.kr',
  department: '시민봉사과',
}

/* ══════════════════════════════════════════════════════
   Editable Field Component
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
  onSave: (val: string) => void
  placeholder?: string
  type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [temp, setTemp] = useState(value)

  const handleSave = () => {
    if (temp.trim()) {
      onSave(temp.trim())
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setTemp(value)
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
          <div className="flex items-center gap-2">
            <input
              type={type}
              value={temp}
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
          <div className="flex items-center gap-2 group">
            <p className="text-[14px] font-semibold text-foreground">{value}</p>
            <button
              onClick={() => { setTemp(value); setEditing(true) }}
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

/* ══════════════════════════════════════════════════════
   Read-only Field Component
   ══════════════════════════════════════════════════════ */

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
        <p className="text-[14px] font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function UserSettings() {
  const [institution, setInstitution] = useState<InstitutionInfo>(initialInstitution)
  const [manager, setManager] = useState<ManagerInfo>(initialManager)
  const [saved, setSaved] = useState(false)

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateInstitution = <K extends keyof InstitutionInfo>(key: K, val: InstitutionInfo[K]) => {
    setInstitution((prev) => ({ ...prev, [key]: val }))
    showSaved()
  }

  const updateManager = <K extends keyof ManagerInfo>(key: K, val: ManagerInfo[K]) => {
    setManager((prev) => ({ ...prev, [key]: val }))
    showSaved()
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="pb-2">
        <h2 className="text-2xl font-bold text-foreground tracking-tight mt-2">정보관리</h2>
        <p className="text-sm text-muted-foreground mt-2">
          담당자 이메일 및 기관 정보를 확인하고 수정할 수 있습니다.
        </p>
      </div>

      {/* 저장 완료 토스트 */}
      {saved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-success px-4 py-3 text-[13px] font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4" />
          변경사항이 저장되었습니다
        </div>
      )}

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
            <ReadOnlyField label="기관명" value={institution.name} icon={Building2} />
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
            <ReadOnlyField label="담당자 이름" value={manager.name} icon={User} />
            <EditableField
              label="이메일"
              value={manager.email}
              icon={Mail}
              onSave={(val) => updateManager('email', val)}
              placeholder="이메일을 입력하세요"
              type="email"
            />
            <ReadOnlyField label="부서" value={manager.department} icon={Building2} />
          </div>
        </div>
      </div>

      {/* ─── 안내 문구 ─── */}
      <div className="rounded-xl bg-page/50 border border-border/50 px-5 py-3 text-[12px] text-muted-foreground">
        기관명, 담당자 이름, 부서 정보는 관리자에게 문의하여 변경할 수 있습니다.
      </div>
    </div>
  )
}
