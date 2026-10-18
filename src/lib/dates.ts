// The demo runs on a day counter. Day 0 is Monday, Oct 5, 2026.
const BASE = { y: 2026, m: 9, d: 5 }
export const TODAY = 10 // Thursday, Oct 15, 2026

export function toDate(day: number): Date {
  return new Date(BASE.y, BASE.m, BASE.d + day)
}

export function weekday(day: number): number {
  return toDate(day).getDay()
}

export function isWeekend(day: number): boolean {
  const w = weekday(day)
  return w === 0 || w === 6
}

/** Move forward to a weekday if `day` falls on a weekend. */
export function nextWeekday(day: number): number {
  let d = day
  while (isWeekend(d)) d++
  return d
}

/** Move back to a weekday if `day` falls on a weekend. */
export function prevWeekday(day: number): number {
  let d = day
  while (isWeekend(d)) d--
  return d
}

/** Add business days. Adding 0 to a weekend lands on the next Monday. */
export function addBiz(day: number, n: number): number {
  let d = nextWeekday(day)
  let left = Math.max(0, Math.round(n))
  while (left > 0) {
    d++
    if (!isWeekend(d)) left--
  }
  return d
}

/** Business days from a to b (negative when b is before a). */
export function bizBetween(a: number, b: number): number {
  if (a === b) return 0
  const sign = b > a ? 1 : -1
  let n = 0
  for (let d = a; d !== b; d += sign) {
    const next = d + sign
    if (!isWeekend(next)) n += sign
  }
  return n
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MO_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Oct 15" */
export function fmtShort(day: number): string {
  const d = toDate(day)
  return `${MO[d.getMonth()]} ${d.getDate()}`
}
/** "Thu Oct 15" */
export function fmtDay(day: number): string {
  const d = toDate(day)
  return `${WD[d.getDay()]} ${MO[d.getMonth()]} ${d.getDate()}`
}
/** "Thursday, October 15" */
export function fmtLong(day: number): string {
  const d = toDate(day)
  return `${WD_LONG[d.getDay()]}, ${MO_LONG[d.getMonth()]} ${d.getDate()}`
}
/** "Monday, Nov 2" */
export function fmtWeekdayShort(day: number): string {
  const d = toDate(day)
  return `${WD_LONG[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`
}
export function wdName(day: number): string {
  return WD[weekday(day)]
}

/** Relative wording used across the app: "today", "tomorrow", "Mon Oct 19". */
export function rel(day: number, now: number): string {
  if (day === now) return 'today'
  if (day === now + 1) return 'tomorrow'
  if (day === now - 1) return 'yesterday'
  if (day > now && day - now < 7) return WD_LONG[weekday(day)]
  return fmtDay(day)
}

export function daysWord(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`
}

/** "2d", "5h" style compact durations for ball chips. */
export function heldFor(since: number, now: number): string {
  const n = Math.max(0, now - since)
  if (n === 0) return 'today'
  return `${n}d`
}

export function mondaysFrom(day: number, count: number): number[] {
  let d = day
  while (weekday(d) !== 1) d++
  return Array.from({ length: count }, (_, i) => d + i * 7)
}
