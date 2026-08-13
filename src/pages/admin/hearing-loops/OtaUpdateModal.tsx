import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Send, Package, Wifi, Cpu, Radio, Check, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useFirmwares, firmwareKeys } from '@/hooks/useFirmware'
import { useDevices, deviceKeys } from '@/hooks/useDevices'
import { firmwareApi } from '@/api/firmware'
import {
  applyProgressEvent,
  applyStreamClose,
  phaseFromSessionStatus,
  UNSETTLED_MESSAGE,
  type DeviceProgress,
  type McuState,
  type ProgressPhase,
} from '@/lib/otaProgress'
import type { HearingLoop } from '@/types/device'

/* ══════════════════════════════════════════════════════
   OTA 업데이트 모달 — 펌웨어 선택 → ONLINE 기기 전송 → SSE 실시간 진행
   (펌웨어 관리 페이지 SendModal의 검증된 진행 엔진을 재사용)
   ══════════════════════════════════════════════════════ */

// 판정 규칙·타입은 lib/otaProgress 한 곳에서만 정의한다 (펌웨어 관리 화면과 공유)

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
    </div>
  )
}

/** 현재(기기) vs 세트(선택 펌웨어) 한 줄 비교 */
function CompareLine({ label, current, target }: { label: string; current: string | null; target: string | null }) {
  const cur = current || '—'
  const match = current && target ? current === target : null
  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      {label} <span className={`font-bold ${match === false ? 'text-warning' : 'text-foreground'}`}>{cur}</span>
      {target && <> → <span className="font-bold text-foreground">{target}</span></>}
    </span>
  )
}

export function OtaUpdateModal({
  macs,
  zoneName,
  onClose,
}: {
  macs: string[]
  zoneName?: string
  onClose: () => void
}) {
  useLockBodyScroll()
  const qc = useQueryClient()
  const { data: firmwares, isLoading: fwLoading } = useFirmwares()
  const { data: devices } = useDevices()

  const [selectedFwId, setSelectedFwId] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState<Record<string, DeviceProgress>>({})

  // 기본 선택 = 최신(목록 정렬상 첫 번째)
  const effectiveFwId = selectedFwId ?? firmwares?.[0]?.id ?? null
  const firmware = firmwares?.find((f) => f.id === effectiveFwId) ?? null

  const targets = useMemo<HearingLoop[]>(() => {
    const map = new Map((devices ?? []).map((d) => [d.mac, d]))
    return macs.map((m) => map.get(m)).filter((d): d is HearingLoop => Boolean(d))
  }, [devices, macs])

  const onlineTargets = useMemo(() => targets.filter((d) => d.connectionStatus === 'ONLINE'), [targets])
  const offlineCount = targets.length - onlineTargets.length

  const deviceState = (d: HearingLoop): 'offline' | 'latest' | 'needs' => {
    if (d.connectionStatus !== 'ONLINE') return 'offline'
    if (!firmware) return 'needs'
    const wifiMatch = d.wifiFirmwareVersion === firmware.wifiVersion
    const hlMatch = d.hlFirmwareVersion === firmware.hlVersion
    return wifiMatch && hlMatch ? 'latest' : 'needs'
  }

  /** 전송 — SSE 구독 선행 → POST 트리거, 기기별 병렬(Promise.all) */
  const send = async () => {
    if (!firmware || onlineTargets.length === 0) return
    setSending(true)
    const macList = onlineTargets.map((d) => d.mac)
    setProgress(
      Object.fromEntries(
        macList.map((mac) => [mac, { phase: 'connecting' as ProgressPhase, self: null, target: null, errorMessage: null }]),
      ),
    )

    await Promise.all(
      macList.map(
        (mac) =>
          new Promise<void>((resolve) => {
            let settled = false
            const settle = () => { if (!settled) { settled = true; resolve() } }

            const unsubscribe = firmwareApi.subscribeUpdateProgress(
              mac,
              (event) => {
                setProgress((prev) => {
                  const curr = prev[mac] ?? { phase: 'in_progress' as ProgressPhase, self: null, target: null, errorMessage: null }
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

            firmwareApi.sendUpdate(firmware.id, mac).catch((err) => {
              const raw = err?.response?.data?.message
              const msg = typeof raw === 'string' && raw.includes('ONLINE')
                ? '기기가 온라인 상태가 아니어서 전송할 수 없습니다.'
                : (typeof raw === 'string' ? raw : '전송 요청 실패')
              setProgress((prev) => ({ ...prev, [mac]: { phase: 'failed', self: null, target: null, errorMessage: msg } }))
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

  /** 닫기 — 전송을 했다면 기기·펌웨어 쿼리를 버린다.
   *  펌웨어가 바뀌면 목록 카드의 버전·설치 세트와 이력 탭의 세션이 전부 낡는다.
   *  아무것도 안 보내고 취소했으면 버릴 이유가 없다. */
  const close = () => {
    if (progList.length > 0) {
      qc.invalidateQueries({ queryKey: deviceKeys.all })
      qc.invalidateQueries({ queryKey: firmwareKeys.all })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-page/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">OTA 펌웨어 업데이트</h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {done
                  ? `완료 ${okCount}대${failCount ? ` · 실패 ${failCount}대` : ''}`
                  : sending
                    ? '업데이트 진행 중'
                    : `${zoneName ? `${zoneName} · ` : ''}대상 ${targets.length}대 (ONLINE ${onlineTargets.length}대${offlineCount ? ` · 오프라인 ${offlineCount}대 제외` : ''})`}
              </p>
            </div>
          </div>
          {!sending && (
            <button onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-page hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin p-6">
          {/* 펌웨어 선택 */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-foreground">전송할 펌웨어</label>
            {inProgress ? (
              firmware && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                  <Package className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-mono text-[13px] font-bold text-primary">v{firmware.version}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">WiFi {firmware.wifiVersion || '—'} · HL {firmware.hlVersion || '—'}</span>
                </div>
              )
            ) : fwLoading ? (
              <p className="flex items-center gap-2 px-1 py-3 text-[12px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />펌웨어 목록 불러오는 중…</p>
            ) : (
              <div className="space-y-2">
                {(firmwares ?? []).map((f, i) => {
                  const sel = f.id === effectiveFwId
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFwId(f.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${sel ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-white hover:border-primary/40'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Package className={`h-4 w-4 ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="font-mono text-[14px] font-bold text-foreground">v{f.version}</span>
                          {i === 0 && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">최신</span>}
                        </div>
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${sel ? 'border-primary bg-primary text-white' : 'border-border'}`}>
                          {sel && <Check className="h-3 w-3" />}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-page/60 px-2.5 py-1.5">
                          <Wifi className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">WiFi 펌웨어</span>
                          <span className="ml-auto font-mono text-[12px] font-semibold text-foreground">{f.wifiVersion || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-page/60 px-2.5 py-1.5">
                          <Cpu className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">HL 펌웨어</span>
                          <span className="ml-auto font-mono text-[12px] font-semibold text-foreground">{f.hlVersion || '—'}</span>
                        </div>
                      </div>
                      {f.updates.length > 0 && (
                        <div className="mt-2 border-t border-border/50 pt-2">
                          <p className="mb-1 text-[10px] font-semibold text-muted-foreground">변경 내역</p>
                          <ul className="space-y-0.5">
                            {f.updates.map((u, idx) => (
                              <li key={idx} className="text-[11px] leading-snug text-muted-foreground">· {u}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 대상 기기 목록 — 펌웨어 '선택 카드'와 구분되게 헤더 + 구분선 그룹 리스트 */}
          <div>
            <div className="mb-2 flex items-center gap-2 border-t border-border pt-4">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-semibold text-foreground">업데이트 대상</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-bold text-muted-foreground">{targets.length}</span>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-page/30">
              {targets.map((d) => {
                const st = deviceState(d)
                const prog = progress[d.mac]
                return (
                  <div key={d.mac} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Radio className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-foreground">{d.alias?.trim() ? d.alias : d.mac}</p>
                          {d.alias?.trim() && <p className="truncate font-mono text-[10px] text-muted-foreground">{d.mac}</p>}
                        </div>
                      </div>
                      {!inProgress && (
                        st === 'offline' ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">오프라인</span>
                        : st === 'latest' ? <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success"><Check className="h-2.5 w-2.5" />이미 최신</span>
                        : <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">업데이트 필요</span>
                      )}
                      {prog && (
                        prog.phase === 'complete' ? <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success"><CheckCircle2 className="h-2.5 w-2.5" />완료</span>
                        : prog.phase === 'failed' ? <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"><AlertTriangle className="h-2.5 w-2.5" />실패</span>
                        : <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"><Loader2 className="h-2.5 w-2.5 animate-spin" />진행</span>
                      )}
                    </div>

                    {!prog && st !== 'offline' && (
                      <div className="mt-1.5 flex flex-col gap-0.5 pl-[22px]">
                        <CompareLine label="WiFi" current={d.wifiFirmwareVersion} target={firmware?.wifiVersion ?? null} />
                        <CompareLine label="HL" current={d.hlFirmwareVersion} target={firmware?.hlVersion ?? null} />
                      </div>
                    )}
                    {prog && (
                      <div className="mt-2.5 space-y-2 pl-[22px]">
                        <ProgressBar label="WiFi (ESP32)" mcu={prog.self} />
                        <ProgressBar label="HL (Nordic)" mcu={prog.target} />
                        {prog.errorMessage && <p className="flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle className="h-3 w-3" />{prog.errorMessage}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {done && (
            <div className="rounded-lg bg-page p-3 text-[12px]">
              <p className="font-semibold text-success">완료 {okCount}대{failCount > 0 && <span className="ml-2 text-destructive">실패 {failCount}대</span>}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-page/30 px-6 py-4">
          {done ? (
            <button onClick={close} className="rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors">닫기</button>
          ) : (
            <>
              <button onClick={close} disabled={sending} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-page transition-colors disabled:opacity-50">취소</button>
              <button
                onClick={send}
                disabled={sending || !firmware || onlineTargets.length === 0}
                className="flex items-center gap-2 rounded-xl bg-primary-dark px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? '전송 중…' : `업데이트 전송 (${onlineTargets.length})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
