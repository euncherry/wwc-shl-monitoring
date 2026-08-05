import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, AlertCircle } from 'lucide-react'
import type { HearingLoop, ConnectionStatus } from '@/types/device'
import { loadKakaoMap } from '@/lib/kakaoMapLoader'

/* ══════════════════════════════════════════════════════
   기기 위치 지도 (카카오맵) — 관리자 히어링루프 관리의 지도 보기.
   - 좌표(latitude/longitude)가 있는 기기만 마커로 표시 (없으면 '위치 미지정'으로 집계)
   - 마커 색 = connection_status (성적서 ② 표시 정책과 동일: 🟢정상 작동/🔵업데이트 중/⚪작동 중지)
   - 마커 클릭 → 기존 기기 상세 모달(onSelect) 재사용
   ══════════════════════════════════════════════════════ */

/** 성동구청 인근 — 마커가 하나도 없을 때의 기본 중심 */
const DEFAULT_CENTER = { lat: 37.5636, lng: 127.0367 }

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  ONLINE: '#10b981',   // --color-success
  UPDATING: '#246BD1', // --color-primary
  OFFLINE: '#64748b',  // --color-muted-foreground
}

/** 상태색 원형 핀 (CustomOverlay용 DOM). Tailwind 대신 인라인 스타일 — 오버레이는 지도 내부 DOM이라 명시적으로 준다 */
function buildMarkerEl(device: HearingLoop, onClick: () => void): HTMLElement {
  const label = device.alias?.trim() || device.mac
  const el = document.createElement('button')
  el.type = 'button'
  el.title = label
  el.setAttribute('aria-label', label)
  el.style.cssText = [
    'width:22px', 'height:22px', 'border-radius:9999px',
    `background:${STATUS_COLOR[device.connectionStatus] ?? STATUS_COLOR.OFFLINE}`,
    'border:3px solid #ffffff', 'box-shadow:0 1px 6px rgba(0,0,0,.35)',
    'cursor:pointer', 'padding:0',
  ].join(';')
  el.addEventListener('click', onClick)
  return el
}

interface Props {
  devices: HearingLoop[]
  onSelect: (device: HearingLoop) => void
  /** 컨테이너 높이 클래스 (기본 h-[560px]) */
  heightClass?: string
}

export function DeviceMap({ devices, onSelect, heightClass = 'h-[560px]' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const located = devices.filter((d) => d.latitude != null && d.longitude != null)
  const unlocatedCount = devices.length - located.length

  /* SDK 로드 + 지도 1회 생성 */
  useEffect(() => {
    let cancelled = false
    loadKakaoMap()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const { kakao } = window
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: 6,
        })
        setStatus('ready')
      })
      .catch((e: Error) => {
        if (cancelled) return
        setErrorMsg(e.message)
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  /* 기기 목록 변경 시 마커 재구성 */
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    const { kakao } = window

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    if (located.length === 0) return

    const bounds = new kakao.maps.LatLngBounds()
    for (const device of located) {
      const pos = new kakao.maps.LatLng(device.latitude, device.longitude)
      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: buildMarkerEl(device, () => onSelect(device)),
        yAnchor: 0.5,
        zIndex: device.connectionStatus === 'OFFLINE' ? 1 : 2, // 가동 기기가 위로
      })
      overlaysRef.current.push(overlay)
      bounds.extend(pos)
    }
    map.setBounds(bounds, 48, 48, 48, 48)
    // 마커 1개면 setBounds가 과확대 → 적정 레벨로 완화
    if (located.length === 1 && map.getLevel() < 4) map.setLevel(4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, devices, onSelect])

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      {/* 헤더: 범례 + 집계 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR.ONLINE }} /> 정상 작동</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR.UPDATING }} /> 업데이트 중</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR.OFFLINE }} /> 작동 중지</span>
        </div>
        <span className="text-[12px] text-muted-foreground">
          지도 표시 <span className="font-bold text-foreground">{located.length}</span>대
          {unlocatedCount > 0 && <> · 위치 미지정 <span className="font-bold text-warning">{unlocatedCount}</span>대</>}
        </span>
      </div>

      {/* 지도 영역 */}
      <div className={`relative ${heightClass}`}>
        <div ref={containerRef} className="absolute inset-0" />
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-page/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-[12px] text-muted-foreground">지도를 불러오는 중…</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-page/80 px-6 text-center">
            <AlertCircle className="h-7 w-7 text-destructive/60" />
            <p className="text-[13px] font-semibold text-foreground">지도를 불러오지 못했습니다</p>
            <p className="text-[12px] text-muted-foreground">{errorMsg}</p>
          </div>
        )}
        {status === 'ready' && located.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground shadow-sm">
              <MapPin className="h-3.5 w-3.5" /> 좌표가 등록된 기기가 없습니다 — 기기 상세에서 설치 좌표를 입력하세요
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
