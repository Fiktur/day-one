import { HIRE_BY_ID, type HireBase } from '../data/hires'
import { SESSIONS, groupFor } from '../data/cohorts'
import { fmtDay, mondaysFrom } from '../lib/dates'
import { deriveHire, type DeriveCtx } from './derive'
import type { HireState } from './simulate'

export type Verdict = 'safe' | 'risk' | 'no'

export interface DateCheck {
  day: number
  verdict: Verdict
  end: number | null
  reason: string
  session: boolean
}

/** Try each candidate Monday as the start date and see whether the critical path finishes in time. */
export function checkDates(base: HireState, ctx: DeriveCtx, count = 6, extraSessions: number[] = []): DateCheck[] {
  const days = mondaysFrom(ctx.now + 7, count)
  return days.map((day) => {
    const h: HireState = { ...base, start: day }
    const v = deriveHire(h, { ...ctx, now: ctx.now })
    const end = v.forecastEnd
    // The long pole: a delayed critical step if there is one, otherwise the slowest critical step.
    let pole = ''
    let poleDay = -1
    let worst = -1
    for (const s of v.steps) {
      if (!s.def.critical || s.def.stage > 4 || s.na || s.ver == null || s.open == null) continue
      const span = s.eta != null ? 1000 + s.ver : s.ver - s.open
      if (span > worst) {
        worst = span
        poleDay = s.ver
        pole = s.def.rename?.(h) ?? s.def.name
      }
    }
    const group = groupFor(h)
    // Remote and New York run orientation every Monday; the sessions listed are only the ones already booked.
    const session = SESSIONS.some((x) => x.day === day && x.group === group) || extraSessions.includes(day) || group.startsWith('Remote') || group === 'New York office'
    let verdict: Verdict
    let reason: string
    if (end == null) {
      verdict = 'risk'
      reason = 'Waiting on a decision, so the finish date is unknown'
    } else if (end >= day) {
      verdict = 'no'
      reason = `${pole} is the long pole: expected ${fmtDay(poleDay)}`
    } else if (end >= day - 2) {
      verdict = 'risk'
      reason = `Tight: ${pole.toLowerCase()} expected ${fmtDay(poleDay)}, with less than 2 days to spare`
    } else {
      verdict = 'safe'
      reason = `Everything is expected by ${fmtDay(end)}`
    }
    if (verdict === 'safe' && !session) {
      verdict = 'risk'
      reason = 'No orientation session that week for this location'
    }
    return { day, verdict, end, reason, session }
  })
}

/** A hypothetical hire for the recruiter's "is this date realistic?" check. */
export function hypothetical(opts: { location: 'remote' | 'nyc' | 'chicago' | 'lisbon' | 'london'; workAuth: boolean; now: number }): HireState {
  const base: HireBase = JSON.parse(JSON.stringify(HIRE_BY_ID.virgil))
  const intl = opts.location === 'lisbon' || opts.location === 'london'
  const h: HireState = {
    ...base,
    id: 'virgil',
    offer: opts.now,
    start: opts.now + 21,
    originalStart: opts.now + 21,
    withdrawn: null,
    mode: opts.location === 'remote' ? 'remote' : 'office',
    location: { remote: 'Remote, Americas', nyc: 'New York office', chicago: 'Chicago office', lisbon: 'Lisbon office', london: 'London office' }[opts.location],
    country: intl ? 'PT' : 'US',
    needsWorkAuth: opts.workAuth,
    overrides: opts.workAuth ? { permit: { typ: opts.location === 'london' ? 18 : 22 }, laptop_deliver: { typ: intl ? 2 : 3 } } : {},
  }
  return h
}
