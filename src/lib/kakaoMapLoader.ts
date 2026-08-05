/**
 * 카카오맵 JS SDK 동적 로더.
 * - 앱키는 VITE_KAKAO_MAP_APP_KEY (JavaScript 키 — 브라우저 노출 전제, 카카오 콘솔 도메인 등록으로 보호)
 * - autoload=false로 받아 kakao.maps.load() 완료 시점에 resolve — 로드 전 kakao.maps 접근 방지
 * - 여러 곳에서 불러도 스크립트는 1회만 삽입 (promise 캐시)
 */

// SDK 공식 타입이 없어 최소한으로만 선언 (마커·오버레이 수준 사용)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any
  }
}

let loading: Promise<void> | null = null

export function loadKakaoMap(): Promise<void> {
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    if (window.kakao?.maps?.Map) {
      resolve()
      return
    }
    // JavaScript 키는 브라우저 노출 전제(도메인 등록으로 보호)라 소스 폴백을 둔다 —
    // .env*가 git-ignore라 배포 빌드(Vercel)에는 env가 없기 때문. env가 있으면 env 우선.
    const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY || 'c12cd8c33634882a30f41d8ff23f504b'
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`
    script.async = true
    script.onload = () => window.kakao.maps.load(() => resolve())
    script.onerror = () => reject(new Error('카카오맵 SDK 로드 실패 — 앱키·도메인 등록을 확인하세요.'))
    document.head.appendChild(script)
  })

  // 실패 시 다음 시도에서 재로드할 수 있게 캐시 해제
  loading.catch(() => { loading = null })
  return loading
}
