import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Search,
  Plus,
  X,
  Cpu,
  HardDrive,
  UploadCloud,
  Send,
  Radio,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Tag,
} from 'lucide-react'
import type { Firmware as FirmwareVM } from '@/types/firmware'
import { formatDateTime } from '@/lib/format'
import { useFirmwares, useUploadFirmware, useSendFirmwareUpdate } from '@/hooks/useFirmware'
import { useDevices } from '@/hooks/useDevices'

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

/* ══════════════════════════════════════════════════════
   Upload Modal — 펌웨어 추가 (파일 + 버전 + 간단 설명[목])
   ══════════════════════════════════════════════════════ */

function UploadModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll()
  const upload = useUploadFirmware()
  const [version, setVersion] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const submit = () => {
    setError('')
    const v = version.trim()
    if (!v) { setError('펌웨어 버전을 입력해주세요.'); return }
    if (!file) { setError('펌웨어 파일을 선택해주세요.'); return }
    upload.mutate(
      { version: v, file, description: description.trim() || undefined },
      {
        onSuccess: onClose,
        onError: (e) =>
          setError(axios.isAxiosError(e) && e.response?.status === 409 ? '이미 존재하는 버전입니다.' : '펌웨어 업로드에 실패했습니다.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UploadCloud className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">펌웨어 추가</h3>
              <p className="text-[12px] text-muted-foreground">펌웨어 파일을 업로드합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto scrollbar-thin p-6">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              펌웨어 버전
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">필수</span>
            </label>
            <input
              type="text"
              placeholder="예: 2.5.0"
              value={version}
              disabled={upload.isPending}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              펌웨어 파일
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">필수</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-[13px] text-primary hover:bg-primary/10 transition-colors">
              <UploadCloud className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-semibold">{file ? file.name : '파일 선택 (.bin)'}</span>
              <input
                type="file"
                accept=".bin,application/octet-stream"
                disabled={upload.isPending}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              간단 설명<MockBadge />
            </label>
            <textarea
              placeholder="예: 온도 센서 안정화 및 연결 끊김 개선"
              value={description}
              disabled={upload.isPending}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
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
            disabled={upload.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
          >
            {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            업로드
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Send Modal — 버전 선택 → 여러 기기 선택 → 순차 개별 전송(REAL)
   ══════════════════════════════════════════════════════ */

type SendResult = 'ok' | 'fail'

function SendModal({ firmware, onClose }: { firmware: FirmwareVM; onClose: () => void }) {
  useLockBodyScroll()
  const { data: devices, isLoading } = useDevices()
  const sendUpdate = useSendFirmwareUpdate()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<Record<string, SendResult>>({})
  const [done, setDone] = useState(false)

  const candidates = useMemo(() => {
    const list = devices ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (d) => d.mac.toLowerCase().includes(q) || (d.alias?.toLowerCase().includes(q) ?? false),
    )
  }, [devices, search])

  const toggle = (mac: string) => {
    if (sending || done) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(mac) ? next.delete(mac) : next.add(mac)
      return next
    })
  }
  const toggleAll = () => {
    if (sending || done) return
    setSelected((prev) =>
      prev.size === candidates.length ? new Set() : new Set(candidates.map((d) => d.mac)),
    )
  }

  // 선택된 기기에 순차 전송 (개별 POST /firmware/:id/send/:mac 반복)
  const send = async () => {
    setSending(true)
    const next: Record<string, SendResult> = {}
    for (const mac of selected) {
      try {
        await sendUpdate.mutateAsync({ id: firmware.id, mac })
        next[mac] = 'ok'
      } catch {
        next[mac] = 'fail'
      }
      setResults({ ...next })
    }
    setSending(false)
    setDone(true)
  }

  const okCount = Object.values(results).filter((r) => r === 'ok').length
  const failCount = Object.values(results).filter((r) => r === 'fail').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">펌웨어 업데이트 전송</h3>
              <p className="text-[12px] text-muted-foreground">
                <span className="font-mono font-semibold text-primary">v{firmware.version}</span> 을(를) 보낼 기기를 선택하세요.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search + select all */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="기기 검색 (별칭·MAC)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button
            onClick={toggleAll}
            disabled={sending || done || candidates.length === 0}
            className="shrink-0 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            {selected.size === candidates.length && candidates.length > 0 ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><p className="text-[13px]">불러오는 중…</p></div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10"><Radio className="h-7 w-7 text-muted-foreground/30" /><p className="text-[13px] text-muted-foreground">전송할 기기가 없습니다.</p></div>
          ) : (
            <div className="space-y-1.5">
              {candidates.map((d) => {
                const checked = selected.has(d.mac)
                const result = results[d.mac]
                return (
                  <button
                    key={d.id}
                    onClick={() => toggle(d.mac)}
                    disabled={sending || done}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors disabled:cursor-default ${
                      checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-page/50'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${checked ? 'border-primary bg-primary text-white' : 'border-border bg-white'}`}>
                      {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Radio className="h-4 w-4 text-primary" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-foreground">{d.alias?.trim() ? d.alias : d.mac}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {d.alias?.trim() ? d.mac : (d.telecoilZoneName ?? '미배정')}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{d.firmwareVersion || '—'}<MockBadge /></span>
                    {result === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                    {result === 'fail' && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-page/30 px-6 py-4">
          <span className="text-[12px] text-muted-foreground">
            {done ? (
              <>전송 완료 — 성공 <span className="font-bold text-success">{okCount}</span>{failCount > 0 && <> · 실패 <span className="font-bold text-destructive">{failCount}</span></>}</>
            ) : (
              <><span className="font-bold text-foreground">{selected.size}</span>대 선택됨</>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">{done ? '닫기' : '취소'}</button>
            {!done && (
              <button
                onClick={send}
                disabled={sending || selected.size === 0}
                className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? '전송 중…' : '선택 전송'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function FirmwarePage() {
  const { data: firmwares, isLoading, isError, refetch } = useFirmwares()
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [sendTarget, setSendTarget] = useState<FirmwareVM | null>(null)

  const all = useMemo(() => firmwares ?? [], [firmwares])

  const filtered = useMemo(() => {
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter(
      (f) => f.version.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    )
  }, [all, search])

  return (
    <div className="space-y-6">
      <div className="pb-5 pt-5">
        <h2 className="text-2xl font-black text-foreground tracking-tight">펌웨어 관리</h2>
        <p className="text-sm text-muted-foreground mt-2">펌웨어를 업로드하고 기기에 업데이트를 전송합니다.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="버전, 설명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        {/* 펌웨어 추가 — 원본 OTA 업데이트 버튼 디자인 재사용 */}
        <button
          onClick={() => setShowUpload(true)}
          className="group relative ml-auto flex items-center gap-3 rounded-2xl border border-transparent pl-4 pr-5 py-2.5 text-[13px] font-bold text-primary-dark shadow-sm transition-all duration-300 cursor-pointer hover:shadow-[0_4px_16px_rgba(36,107,209,0.15)]"
          style={{ background: 'linear-gradient(135deg, #EDF1F8 0%, #D6E5F8 40%, #DDDAF8 75%, #EDE8F4 100%)' }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 shadow-sm transition-all">
            <Plus className="h-4 w-4 text-primary transition-transform duration-300 group-hover:rotate-90" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[13px] font-bold text-primary-dark">펌웨어 추가</span>
            <span className="mt-0.5 text-[10px] text-primary-dark/40">새 펌웨어 업로드</span>
          </div>
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm">펌웨어를 불러오는 중...</p></div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16"><AlertCircle className="h-8 w-8 text-destructive/60" /><p className="text-sm text-muted-foreground">목록을 불러오지 못했습니다.</p><button onClick={() => refetch()} className="rounded-lg bg-page px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-border/50">다시 시도</button></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16"><Cpu className="h-8 w-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{all.length === 0 ? '업로드된 펌웨어가 없습니다.' : '검색 결과가 없습니다.'}</p></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">버전</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">설명</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">타입</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">업로드 일시</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">전송</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-page/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Cpu className="h-4 w-4 text-primary" /></div>
                      <span className="font-mono text-[13px] font-bold text-foreground">v{f.version}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[13px] text-foreground">{f.description || <span className="text-muted-foreground">—</span>}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-block rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{f.firmwareType}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[13px] text-muted-foreground">{formatDateTime(f.uploadedAt)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSendTarget(f)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-bold text-white hover:bg-primary-dark transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />업데이트 전송
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between border-t border-border bg-page/30 px-5 py-3">
          <span className="text-[12px] text-muted-foreground">총 <span className="font-bold text-foreground">{filtered.length}</span>개 펌웨어</span>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {sendTarget && <SendModal firmware={sendTarget} onClose={() => setSendTarget(null)} />}
    </div>
  )
}
