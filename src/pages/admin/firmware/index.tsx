import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Search,
  Plus,
  X,
  Cpu,
  Wifi,
  UploadCloud,
  Send,
  Radio,
  Building2,
  FileArchive,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { Firmware as FirmwareVM } from '@/types/firmware'
import type { HearingLoop } from '@/types/device'
import { connectionMeta } from '@/lib/connectionStatus'
import { formatDateTime } from '@/lib/format'
import { useFirmwares, useUploadFirmware } from '@/hooks/useFirmware'
import { firmwareApi } from '@/api/firmware'
import {
  applyProgressEvent,
  applyStreamClose,
  phaseFromSessionStatus,
  UNSETTLED_MESSAGE,
  type DeviceProgress as BaseDeviceProgress,
  type McuState,
  type ProgressPhase,
} from '@/lib/otaProgress'
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

/** S3 key → 파일명만 추출 (없으면 빈 문자열) */
function fileName(key: string): string {
  if (!key) return ''
  return key.split('/').pop() || key
}

/* ══════════════════════════════════════════════════════
   Upload Modal — 펌웨어 추가 (릴리즈 패키지 zip 1개)
   버전·변경내역은 zip 내 update.json에서 서버가 파싱.
   ══════════════════════════════════════════════════════ */

/** 단일 파일 선택 필드 */
function FilePicker({
  label,
  hint,
  icon: Icon,
  file,
  disabled,
  onPick,
  accept = '.bin,application/octet-stream',
}: {
  label: string
  hint: string
  icon: typeof Cpu
  file: File | null
  disabled: boolean
  onPick: (f: File | null) => void
  accept?: string
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">필수</span>
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-[13px] text-primary hover:bg-primary/10 transition-colors">
        <UploadCloud className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-semibold">{file ? file.name : hint}</span>
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>
    </div>
  )
}

function UploadModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll()
  const upload = useUploadFirmware()
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const submit = () => {
    setError('')
    if (!zipFile) { setError('펌웨어 패키지(zip)를 선택해주세요.'); return }
    upload.mutate(
      { zipFile },
      {
        onSuccess: onClose,
        onError: (err) => {
          const msg =
            axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
              ? (err.response.data as { message?: string }).message
              : undefined
          setError(msg || '펌웨어 업로드에 실패했습니다.')
        },
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
              <p className="text-[12px] text-muted-foreground">릴리즈 패키지(hearingloop_*.zip)를 업로드합니다. 버전·변경내역은 zip에서 자동 추출됩니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto scrollbar-thin p-6">
          <FilePicker label="펌웨어 패키지" hint="hearingloop_<날짜>.zip 선택" icon={FileArchive} file={zipFile} disabled={upload.isPending} onPick={setZipFile} accept=".zip,application/zip" />

          <div className="rounded-xl border border-border bg-page/40 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            zip 내부에 <span className="font-semibold text-foreground">update.json</span> + ESP32·nRF 펌웨어(.bin)가 포함되어야 합니다. 버전(릴리즈·WiFi·HL)과 변경 내역은 update.json에서 자동으로 읽습니다.
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
   Send Modal — 기기 선택 → SSE 구독 선행 → POST 트리거 → 실시간 진행 바
   ══════════════════════════════════════════════════════ */

// 판정 규칙·기본 타입은 lib/otaProgress 한 곳에서만 정의한다 (히어링루프 관리 모달과 공유)
interface DeviceProgress extends BaseDeviceProgress {
  sessionId: number | null
  firmwareId: number | null
}

/** self / target 진행 바 한 줄 */
function ProgressBar({ label, mcu }: { label: string; mcu: McuState | null }) {
  const pct = mcu?.progress ?? 0
  const isDone = mcu?.status === 'complete'
  const isFail = mcu?.status === 'failed'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className={`font-mono font-bold ${isDone ? 'text-success' : isFail ? 'text-destructive' : 'text-primary'}`}>
          {mcu ? `${pct}%` : '—'}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-success' : isFail ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {mcu?.status && mcu.status !== 'complete' && mcu.status !== 'failed' && (
        <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">{mcu.status}…</p>
      )}
    </div>
  )
}

function SendModal({ firmware, onClose }: { firmware: FirmwareVM; onClose: () => void }) {
  useLockBodyScroll()
  const { data: devices, isLoading } = useDevices()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState<Record<string, DeviceProgress>>({})

  const candidates = useMemo(() => {
    const list = devices ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (d) => d.mac.toLowerCase().includes(q) || (d.alias?.toLowerCase().includes(q) ?? false),
    )
  }, [devices, search])

  // 펌웨어 전송은 ONLINE 기기만 가능(백엔드 워밍업/오프라인 OTA 차단 — 비-ONLINE이면 400)
  const onlineMacs = useMemo(
    () => candidates.filter((d) => d.connectionStatus === 'ONLINE').map((d) => d.mac),
    [candidates],
  )

  const toggle = (mac: string) => {
    if (sending || done) return
    const d = candidates.find((c) => c.mac === mac)
    if (d && d.connectionStatus !== 'ONLINE') return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(mac) ? next.delete(mac) : next.add(mac)
      return next
    })
  }
  const toggleAll = () => {
    if (sending || done) return
    setSelected((prev) =>
      prev.size === onlineMacs.length && onlineMacs.length > 0 ? new Set() : new Set(onlineMacs),
    )
  }

  const UNASSIGNED = 'unassigned'
  const groups = useMemo(() => {
    const map = new Map<string, HearingLoop[]>()
    for (const d of candidates) {
      const key = d.telecoilZoneName ?? UNASSIGNED
      const arr = map.get(key) ?? []
      arr.push(d)
      map.set(key, arr)
    }
    return [...map.entries()]
      .sort((a, b) => {
        const au = a[0] === UNASSIGNED
        const bu = b[0] === UNASSIGNED
        if (au !== bu) return au ? 1 : -1
        return a[0].localeCompare(b[0])
      })
      .map(([key, list]) => ({ key, name: key === UNASSIGNED ? '미배정' : key, list }))
  }, [candidates])

  const toggleGroup = (list: HearingLoop[]) => {
    if (sending || done) return
    const sel = list.filter((d) => d.connectionStatus === 'ONLINE')
    if (sel.length === 0) return
    setSelected((prev) => {
      const next = new Set(prev)
      const all = sel.every((d) => next.has(d.mac))
      sel.forEach((d) => (all ? next.delete(d.mac) : next.add(d.mac)))
      return next
    })
  }

  /**
   * 전송 순서 (스펙 준수, 기기별 병렬):
   * 1. SSE 구독 먼저 (초기 이벤트 유실 방지)
   * 2. POST /firmware/:id/send/:mac 트리거
   * 3. SSE 이벤트로 self/target 진행 바 업데이트
   * 4. 스트림 자동 종료(complete/failed) → Promise resolve
   * 전체 기기를 Promise.all 로 동시에 처리
   */
  const send = async () => {
    setSending(true)
    const macList = [...selected]

    // 전체 기기 connecting 으로 초기화 (waiting 없이 바로 시작)
    setProgress(
      Object.fromEntries(
        macList.map((mac) => [mac, { phase: 'connecting' as ProgressPhase, self: null, target: null, errorMessage: null, sessionId: null, firmwareId: null }]),
      ),
    )

    await Promise.all(
      macList.map(
        (mac) =>
          new Promise<void>((resolve) => {
            let settled = false
            const settle = () => { if (!settled) { settled = true; resolve() } }

            // Step 1: SSE 구독
            const unsubscribe = firmwareApi.subscribeUpdateProgress(
              mac,
              (event) => {
                setProgress((prev) => {
                  const curr = prev[mac] ?? { phase: 'in_progress' as ProgressPhase, self: null, target: null, errorMessage: null, sessionId: null, firmwareId: null }
                  return { ...prev, [mac]: applyProgressEvent(curr, event) }
                })
              },
              () => {
                let unsettled = false
                setProgress((prev) => {
                  const curr = prev[mac]
                  if (!curr) return prev
                  const next = applyStreamClose(curr)
                  // 최종 판정 없이 끊겼다 — 완료로 위장하지 말고 서버에 물어본다
                  unsettled = next.phase === 'in_progress'
                  return { ...prev, [mac]: next }
                })
                if (!unsettled) { settle(); return }
                firmwareApi
                  .getSessions(mac, 1, 1)
                  .then((res) => {
                    const status = res.data?.[0]?.status
                    setProgress((prev) => {
                      const curr = prev[mac]
                      if (!curr || curr.phase !== 'in_progress') return prev
                      const phase = phaseFromSessionStatus(status)
                      return { ...prev, [mac]: { ...curr, phase, errorMessage: phase === 'failed' ? (curr.errorMessage ?? UNSETTLED_MESSAGE) : curr.errorMessage } }
                    })
                  })
                  .catch(() => {
                    setProgress((prev) => {
                      const curr = prev[mac]
                      if (!curr || curr.phase !== 'in_progress') return prev
                      return { ...prev, [mac]: { ...curr, phase: 'failed', errorMessage: UNSETTLED_MESSAGE } }
                    })
                  })
                  .finally(settle)
              },
            )

            // Step 2: 업데이트 트리거
            firmwareApi.sendUpdate(firmware.id, mac)
              .then((resp) => {
                setProgress((prev) => {
                  const curr = prev[mac]
                  if (!curr) return prev
                  return { ...prev, [mac]: { ...curr, sessionId: resp.session_id, firmwareId: resp.firmware_id } }
                })
              })
              .catch((err) => {
                const raw = err?.response?.data?.message
                const msg = typeof raw === 'string' && raw.includes('ONLINE')
                  ? '기기가 온라인 상태가 아니어서 전송할 수 없습니다.'
                  : (typeof raw === 'string' ? raw : '전송 요청 실패')
                setProgress((prev) => ({
                  ...prev,
                  [mac]: { phase: 'failed', self: null, target: null, errorMessage: msg, sessionId: null, firmwareId: null },
                }))
                unsubscribe()
                settle()
              })
          }),
      ),
    )

    setSending(false)
    setDone(true)
  }

  const progList = Object.values(progress)
  const okCount = progList.filter((p) => p.phase === 'complete').length
  const failCount = progList.filter((p) => p.phase === 'failed').length

  const inProgress = sending || done

  // 오버레이에 onClick={onClose} 미지정 — 외부 클릭으로 닫히지 않음(전송 중 실수 방지). 닫기는 X·취소 버튼으로만
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">펌웨어 업데이트 전송</h3>
              <p className="text-[12px] text-muted-foreground">
                <span className="font-mono font-semibold text-primary">v{firmware.version}</span>
                {inProgress ? ' 업데이트 진행 중' : ' — 기기를 선택하세요 (HL·WiFi 동시 발송)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search + select all (선택 단계만) */}
        {!inProgress && (
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
              disabled={onlineMacs.length === 0}
              className="shrink-0 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              {selected.size === onlineMacs.length && onlineMacs.length > 0 ? '전체 해제' : '전체 선택'}
            </button>
          </div>
        )}

        {/* 기기 목록 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><p className="text-[13px]">불러오는 중…</p>
            </div>
          ) : candidates.length === 0 && !inProgress ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Radio className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground">전송할 기기가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => {
                const groupOnline = g.list.filter((d) => d.connectionStatus === 'ONLINE')
                const groupAll = groupOnline.length > 0 && groupOnline.every((d) => selected.has(d.mac))
                const groupSel = g.list.filter((d) => selected.has(d.mac)).length
                // 전송 단계에서는 선택된 기기만 표시
                const visibleList = inProgress ? g.list.filter((d) => selected.has(d.mac)) : g.list
                if (inProgress && visibleList.length === 0) return null
                return (
                  <div key={g.key}>
                    {/* 존 헤더 */}
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className={`h-3.5 w-3.5 ${g.key === UNASSIGNED ? 'text-warning' : 'text-muted-foreground'}`} />
                        <span className="text-[12px] font-bold text-foreground">{g.name}</span>
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-page px-1 text-[10px] font-bold text-muted-foreground">
                          {inProgress ? visibleList.length : g.list.length}
                        </span>
                        {!inProgress && groupSel > 0 && (
                          <span className="text-[10px] font-semibold text-primary">{groupSel}대 선택</span>
                        )}
                      </div>
                      {!inProgress && (
                        <button
                          onClick={() => toggleGroup(g.list)}
                          className="text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
                        >
                          {groupAll ? '존 해제' : '존 전체'}
                        </button>
                      )}
                    </div>

                    {/* 기기 카드 */}
                    <div className="space-y-1.5">
                      {visibleList.map((d) => {
                        const checked = selected.has(d.mac)
                        const prog = progress[d.mac]

                        if (inProgress) {
                          // 전송/완료 단계: 진행 상태 카드
                          const phase = prog?.phase ?? 'waiting'
                          return (
                            <div
                              key={d.id}
                              className={`rounded-xl border px-3.5 py-2.5 transition-colors ${
                                phase === 'complete' ? 'border-success/30 bg-success/5'
                                : phase === 'failed' ? 'border-destructive/30 bg-destructive/5'
                                : phase === 'in_progress' ? 'border-primary/30 bg-primary/5'
                                : 'border-border bg-page/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                  <Radio className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-bold text-foreground">
                                    {d.alias?.trim() ? d.alias : d.mac}
                                  </p>
                                  {d.alias?.trim() && (
                                    <p className="truncate font-mono text-[11px] text-muted-foreground">{d.mac}</p>
                                  )}
                                </div>
                                {/* 상태 아이콘 */}
                                {phase === 'waiting' && (
                                  <span className="text-[11px] text-muted-foreground">대기 중</span>
                                )}
                                {phase === 'connecting' && (
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                                )}
                                {phase === 'complete' && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                                )}
                                {phase === 'failed' && (
                                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                                )}
                              </div>

                              {/* 진행 바 (in_progress) */}
                              {phase === 'in_progress' && (
                                <div className="mt-3 space-y-2.5">
                                  <ProgressBar label="ESP32 MCU (WiFi)" mcu={prog?.self ?? null} />
                                  <ProgressBar label="Nordic MCU (HL)" mcu={prog?.target ?? null} />
                                </div>
                              )}

                              {/* 완료 후 세션 링크 */}
                              {phase === 'complete' && prog?.sessionId && (
                                <p className="mt-1.5 text-[11px] text-success">
                                  세션 #{prog.sessionId} — 기기 상세에서 이력을 확인할 수 있습니다.
                                </p>
                              )}

                              {/* 실패 메시지 */}
                              {phase === 'failed' && prog?.errorMessage && (
                                <p className="mt-1.5 text-[11px] text-destructive">{prog.errorMessage}</p>
                              )}
                            </div>
                          )
                        }

                        // 선택 단계: 기존 체크박스 카드 (ONLINE 기기만 선택 가능)
                        const online = d.connectionStatus === 'ONLINE'
                        return (
                          <button
                            key={d.id}
                            onClick={() => toggle(d.mac)}
                            disabled={!online}
                            title={online ? undefined : '기기가 온라인 상태가 아니어서 전송할 수 없습니다'}
                            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                              !online ? 'cursor-not-allowed border-border bg-page/40 opacity-60'
                              : checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-page/50'
                            }`}
                          >
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${!online ? 'border-border bg-muted' : checked ? 'border-primary bg-primary text-white' : 'border-border bg-white'}`}>
                              {online && checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {!online && <span className="text-[11px] text-muted-foreground">—</span>}
                            </span>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Radio className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-bold text-foreground">{d.alias?.trim() ? d.alias : d.mac}</p>
                              {d.alias?.trim() && <p className="truncate font-mono text-[11px] text-muted-foreground">{d.mac}</p>}
                            </div>
                            {online ? (
                              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{d.firmwareVersion || '—'}</span>
                            ) : (
                              <span className={`shrink-0 text-[11px] font-semibold ${connectionMeta(d.connectionStatus).color}`}>{connectionMeta(d.connectionStatus).label}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-page/30 px-6 py-4">
          <span className="text-[12px] text-muted-foreground">
            {done ? (
              <>
                완료 — 성공 <span className="font-bold text-success">{okCount}</span>
                {failCount > 0 && <> · 실패 <span className="font-bold text-destructive">{failCount}</span></>}
              </>
            ) : sending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 전송 중…
              </span>
            ) : (
              <><span className="font-bold text-foreground">{selected.size}</span>대 선택됨</>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors">
              {done ? '닫기' : '취소'}
            </button>
            {!done && !sending && (
              <button
                onClick={send}
                disabled={selected.size === 0}
                className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                선택 전송
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
      (f) =>
        f.version.toLowerCase().includes(q) ||
        f.updates.join(' ').toLowerCase().includes(q) ||
        f.hlS3Key.toLowerCase().includes(q) ||
        f.wifiS3Key.toLowerCase().includes(q),
    )
  }, [all, search])

  return (
    <div className="space-y-6">
      <div className="pb-3 pt-3 sm:pb-5 sm:pt-5">
        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">펌웨어 관리</h2>
        <p className="text-sm text-muted-foreground mt-2">펌웨어를 업로드하고 기기에 업데이트를 전송합니다.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="버전, 파일명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        {/* 펌웨어 추가 — 원본 OTA 업데이트 버튼 디자인 재사용 */}
        <button
          onClick={() => setShowUpload(true)}
          className="group relative w-full sm:w-auto sm:ml-auto flex items-center gap-3 rounded-2xl border border-transparent pl-4 pr-5 py-2.5 text-[13px] font-bold text-primary-dark shadow-sm transition-all duration-300 cursor-pointer hover:shadow-[0_4px_16px_rgba(36,107,209,0.15)]"
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
          <>
            {/* 데스크톱: 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">버전</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">HL 펌웨어</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">WiFi 펌웨어</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">변경 내역</th>
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
                          <div className="leading-tight">
                            <span className="font-mono text-[13px] font-bold text-foreground">v{f.version}</span>
                            <span className="block text-[10px] text-muted-foreground">WiFi {f.wifiVersion || '—'} · HL {f.hlVersion || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 font-mono text-[12px] text-foreground" title={f.hlS3Key}>
                          <Cpu className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{fileName(f.hlS3Key) || <span className="text-muted-foreground">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 font-mono text-[12px] text-foreground" title={f.wifiS3Key}>
                          <Wifi className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{fileName(f.wifiS3Key) || <span className="text-muted-foreground">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {f.updates.length > 0 ? (
                          <ul className="space-y-0.5">
                            {f.updates.map((u, i) => (
                              <li key={i} className="text-[12px] text-foreground">{u}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">—</span>
                        )}
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
            </div>

            {/* 모바일: 카드 */}
            <div className="md:hidden space-y-3 p-4">
              {filtered.map((f) => (
                <div key={f.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  {/* 버전 헤더 */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Cpu className="h-4 w-4 text-primary" /></div>
                    <div className="leading-tight">
                      <span className="font-mono text-[14px] font-bold text-foreground">v{f.version}</span>
                      <span className="block text-[10px] text-muted-foreground">WiFi {f.wifiVersion || '—'} · HL {f.hlVersion || '—'}</span>
                    </div>
                  </div>

                  {/* 필드 스택 */}
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">HL 펌웨어</p>
                      <span className="mt-0.5 flex items-center gap-1.5 break-all font-mono text-[12px] text-foreground" title={f.hlS3Key}>
                        <Cpu className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{fileName(f.hlS3Key) || <span className="text-muted-foreground">—</span>}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">WiFi 펌웨어</p>
                      <span className="mt-0.5 flex items-center gap-1.5 break-all font-mono text-[12px] text-foreground" title={f.wifiS3Key}>
                        <Wifi className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{fileName(f.wifiS3Key) || <span className="text-muted-foreground">—</span>}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">변경 내역</p>
                      {f.updates.length > 0 ? (
                        <ul className="mt-0.5 space-y-0.5">
                          {f.updates.map((u, i) => (
                            <li key={i} className="text-[12px] text-foreground">{u}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">업로드 일시</p>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{formatDateTime(f.uploadedAt)}</span>
                    </div>
                  </div>

                  {/* 액션 */}
                  <button
                    onClick={() => setSendTarget(f)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-[12px] font-bold text-white hover:bg-primary-dark transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />업데이트 전송
                  </button>
                </div>
              ))}
            </div>
          </>
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
