/** KST(UTC+9) 고정 시각 유틸.
 *
 *  `formatDateTime`(lib/format.ts)은 브라우저 로컬 게터를 쓰기 때문에 뷰어 타임존이 KST가 아니면
 *  히트맵의 날짜·시간 버킷이 통째로 밀린다. 추이 화면은 "몇 시에 과열이 몰리는가"가 핵심이라
 *  로컬 타임존과 무관하게 KST로 고정한다.
 *
 *  구현: ms에 9시간을 더한 뒤 **UTC 게터**로 읽는다. Intl보다 훨씬 빠르고(수천 행 루프) 결과가 동일하다.
 */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

/** ISO 문자열 → epoch ms. 파싱 실패 시 NaN. */
export function toMs(iso: string): number {
  return new Date(iso).getTime()
}

/** KST 기준 날짜·시각 조각 */
export function kstParts(ms: number): { year: number; month: number; day: number; hour: number; minute: number } {
  const d = new Date(ms + KST_OFFSET_MS)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

const p2 = (n: number) => String(n).padStart(2, '0')

/** KST 기준 'YYYY-MM-DD' */
export function kstDayKey(ms: number): string {
  const { year, month, day } = kstParts(ms)
  return `${year}-${p2(month)}-${p2(day)}`
}

/** KST 기준 'MM/DD' — 히트맵 행 라벨용 */
export function kstShortDay(ms: number): string {
  const { month, day } = kstParts(ms)
  return `${p2(month)}/${p2(day)}`
}

/** KST 기준 그 날 00:00에 해당하는 epoch ms */
export function kstDayStartMs(ms: number): number {
  return Math.floor((ms + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS
}

/** KST 기준 그 시각이 속한 정시(00분)에 해당하는 epoch ms */
export function kstHourStartMs(ms: number): number {
  return Math.floor((ms + KST_OFFSET_MS) / HOUR_MS) * HOUR_MS - KST_OFFSET_MS
}

/** KST 기준 'MM/DD HH:mm' */
export function formatKst(ms: number): string {
  const { month, day, hour, minute } = kstParts(ms)
  return `${p2(month)}/${p2(day)} ${p2(hour)}:${p2(minute)}`
}

/** KST 기준 'HH:mm' */
export function formatKstTime(ms: number): string {
  const { hour, minute } = kstParts(ms)
  return `${p2(hour)}:${p2(minute)}`
}

/** 밀리초 → '1시간 23분' / '45초' 같은 사람이 읽는 길이 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '—'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}초`
  const min = Math.floor(sec / 60)
  if (min < 60) return sec % 60 ? `${min}분 ${sec % 60}초` : `${min}분`
  const hour = Math.floor(min / 60)
  return min % 60 ? `${hour}시간 ${min % 60}분` : `${hour}시간`
}
