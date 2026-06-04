/**
 * JWT payload 디코드(검증 없음 — role 분기/표시용).
 * 서명 검증은 백엔드 책임이며, 여기서는 base64url payload만 파싱한다.
 */
export function decodeJwt<T>(token: string): T {
  const part = token.split('.')[1]
  if (!part) throw new Error('Invalid JWT: no payload segment')
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json) as T
}
