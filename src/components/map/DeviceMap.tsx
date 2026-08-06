import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, AlertCircle } from 'lucide-react'
import type { HearingLoop, ConnectionStatus } from '@/types/device'
import { loadKakaoMap } from '@/lib/kakaoMapLoader'
import { connectionMeta } from '@/lib/connectionStatus'
import { formatDateTime } from '@/lib/format'

/* ══════════════════════════════════════════════════════
   기기 위치 지도 (카카오맵) — 관리자 히어링루프 관리 · 대시보드 공용.
   - 좌표(latitude/longitude)가 있는 기기만 마커로 표시 (없으면 '위치 미지정'으로 집계)
   - 마커 아이콘 2종: 정상 작동(파란 핀) / 작동 중지(검정 핀).
     UPDATING은 기기가 살아있는 상태라 정상 작동 아이콘으로 표시한다.
   - 마커 클릭 → 인포윈도우(별칭·MAC·상태·마지막 신호 + 상세 보기/길찾기)
   - '상세 보기' → 기존 기기 상세 모달(onSelect) 재사용
   ══════════════════════════════════════════════════════ */

/** 성동구청 인근 — 마커가 하나도 없을 때의 기본 중심 */
const DEFAULT_CENTER = { lat: 37.5636, lng: 127.0367 }

/** 마커 아이콘 (public/markers/) — 원본 99×132(3x), 표시 33×44px로 원본 비율 유지.
 *  앵커는 핀 꼬리 끝(하단 중앙) — 좌표점에 정확히 꽂히도록. */
const MARKER_SRC: Record<'online' | 'offline', string> = {
  online: '/markers/marker-online.png',
  offline: '/markers/marker-offline.png',
}
const MARKER_W = 33
const MARKER_H = 44

function markerKind(status: ConnectionStatus): 'online' | 'offline' {
  return status === 'OFFLINE' ? 'offline' : 'online'
}

/** HTML 이스케이프 — 별칭·MAC은 사용자 입력이라 오버레이 HTML에 넣기 전 처리 */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )
}

/**
 * 마커 인포윈도우 DOM.
 * 별칭(없으면 MAC) + 상태 뱃지 / MAC 서브 / 마지막 신호 / [상세 보기] [길찾기]
 * 길찾기는 카카오맵 길안내 링크 — 현장 점검 이동에 바로 쓰도록.
 */
function buildInfoWindow(
  device: HearingLoop,
  handlers: { onDetail: () => void; onClose: () => void },
): HTMLElement {
  const hasAlias = Boolean(device.alias?.trim())
  const title = hasAlias ? device.alias!.trim() : device.mac
  const conn = connectionMeta(device.connectionStatus)
  const isOffline = device.connectionStatus === 'OFFLINE'
  const dotColor = isOffline ? '#64748b' : device.connectionStatus === 'UPDATING' ? '#246BD1' : '#10b981'
  const routeUrl = `https://map.kakao.com/link/to/${encodeURIComponent(title)},${device.latitude},${device.longitude}`

  const el = document.createElement('div')
  // yAnchor=1(하단 기준) + 핀 높이만큼 margin-bottom → 말풍선이 핀 바로 위에 뜨고 꼬리가 핀을 가리킴
  el.style.cssText = [
    'position:relative', 'width:250px', 'background:#ffffff',
    'border:1px solid #e2e8f0', 'border-radius:12px',
    'box-shadow:0 6px 20px rgba(15,23,42,.18)', 'padding:12px 12px 10px',
    'font-family:inherit', `margin-bottom:${MARKER_H + 8}px`,
  ].join(';')

  el.innerHTML = `
    <button data-role="close" aria-label="닫기"
      style="position:absolute;top:8px;right:8px;width:20px;height:20px;border:0;background:transparent;color:#94a3b8;font-size:15px;line-height:1;cursor:pointer;padding:0">×</button>
    <div style="display:flex;align-items:center;gap:6px;padding-right:20px">
      <span style="font-size:13px;font-weight:800;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(title)}</span>
      <span style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0;font-size:11px;font-weight:700;color:${dotColor}">
        <span style="width:6px;height:6px;border-radius:9999px;background:${dotColor}"></span>${esc(conn.label)}
      </span>
    </div>
    ${hasAlias ? `<p style="margin:3px 0 0;font-size:11px;color:#64748b;font-family:ui-monospace,monospace">${esc(device.mac)}</p>` : ''}
    <p style="margin:4px 0 0;font-size:11px;color:#64748b">마지막 신호 ${esc(formatDateTime(device.lastUpdated))}</p>
    <div style="display:flex;gap:6px;margin-top:10px">
      <button data-role="detail"
        style="flex:1;padding:7px 0;border:0;border-radius:8px;background:#246BD1;color:#fff;font-size:12px;font-weight:700;cursor:pointer">상세 보기</button>
      <a href="${routeUrl}" target="_blank" rel="noopener noreferrer"
        style="flex:1;padding:7px 0;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#475569;font-size:12px;font-weight:700;text-align:center;text-decoration:none;line-height:1.2">길찾기</a>
    </div>
    <span style="position:absolute;left:50%;bottom:-7px;transform:translateX(-50%) rotate(45deg);width:12px;height:12px;background:#fff;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0"></span>
  `

  el.querySelector('[data-role="detail"]')?.addEventListener('click', handlers.onDetail)
  el.querySelector('[data-role="close"]')?.addEventListener('click', handlers.onClose)
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
  /** 현재 열려 있는 인포윈도우 — 마커 클릭 시 이전 것을 닫는다(한 번에 하나) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoRef = useRef<any>(null)
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
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: 6,
        })
        // 빈 지도를 클릭하면 열린 인포윈도우 닫기
        kakao.maps.event.addListener(map, 'click', () => {
          infoRef.current?.setMap(null)
          infoRef.current = null
        })
        mapRef.current = map
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
    infoRef.current?.setMap(null)
    infoRef.current = null

    if (located.length === 0) return

    const closeInfo = () => {
      infoRef.current?.setMap(null)
      infoRef.current = null
    }

    const bounds = new kakao.maps.LatLngBounds()
    for (const device of located) {
      const pos = new kakao.maps.LatLng(device.latitude, device.longitude)
      const kind = markerKind(device.connectionStatus)
      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        title: device.alias?.trim() || device.mac,
        image: new kakao.maps.MarkerImage(
          MARKER_SRC[kind],
          new kakao.maps.Size(MARKER_W, MARKER_H),
          { offset: new kakao.maps.Point(MARKER_W / 2, MARKER_H) }, // 핀 꼬리 끝이 좌표점
        ),
        zIndex: kind === 'offline' ? 1 : 2, // 가동 기기가 위로
        clickable: true,
      })
      // 마커 클릭 → 인포윈도우 (한 번에 하나만 열림)
      const infoWindow = new kakao.maps.CustomOverlay({
        position: pos,
        content: buildInfoWindow(device, {
          onDetail: () => { closeInfo(); onSelect(device) },
          onClose: closeInfo,
        }),
        yAnchor: 1,          // 말풍선 하단이 기준점 → 핀 위로 뜸
        zIndex: 10,
        clickable: true,
      })
      kakao.maps.event.addListener(marker, 'click', () => {
        closeInfo()
        infoWindow.setMap(map)
        infoRef.current = infoWindow
        map.panTo(pos)
      })
      overlaysRef.current.push(marker)
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
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><img src={MARKER_SRC.online} alt="" className="h-5 w-auto" /> 정상 작동</span>
          <span className="inline-flex items-center gap-1.5"><img src={MARKER_SRC.offline} alt="" className="h-5 w-auto" /> 작동 중지</span>
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
