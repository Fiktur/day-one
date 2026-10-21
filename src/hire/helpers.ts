import { managerFor, type HireView, type StepView } from '../engine/derive'
import type { GlyphState } from '../ui/parts'
import { addBiz, fmtDay, fmtShort, prevWeekday, rel } from '../lib/dates'
import { systemNames } from '../data/journey'
import { people } from '../data/people'
import { useDemo, type PlanDay } from '../engine/store'
import { useCtx } from '../engine/selectors'
import { SESSIONS, groupFor } from '../data/cohorts'

export interface HandledItem {
  key: string
  label: string
  glyph: GlyphState
  text: string
  flashKeys: string[]
}

// What a waiting step is waiting on, in the hire's words.
const WAIT_ON: Record<string, string> = { consent: 'you give consent', bg_complete: 'your background check', clearance: 'your background check', permit: 'your work permit', wd_hire: 'HR finishes your hire record', laptop_choice: 'you pick a model', details: 'you confirm your details' }

/** The first unfinished thing a step waits on, walking back through its dependencies. */
export function waitingOn(v: HireView, key: string): string | null {
  for (const d of v.by[key]?.def.deps ?? []) {
    const x = v.by[d]
    if (!x || x.state === 'verified' || x.state === 'na') continue
    return waitingOn(v, d) ?? WAIT_ON[d] ?? null
  }
  return null
}

/** When the onboarding team promises to confirm a shaky start date: a week before, then the last working day, then two working days after. Fixed, so it doesn't slide; once all have passed, it's today. */
export function confirmBy(start: number, now: number): number {
  const weekBefore = prevWeekday(start - 7)
  const lastDay = prevWeekday(start - 1)
  return Math.max(now, now <= weekBefore ? weekBefore : now <= lastDay ? lastDay : addBiz(start, 2))
}

/** Past the last working day before the start with the date still at risk: the hire is told not to come in. */
export function heldBack(v: HireView, now: number): boolean {
  return v.status === 'atrisk' && now > prevWeekday(v.hire.start - 1)
}

/** Company-side work, in the hire's words. Never red: delays read "taking longer than usual". */
export function handledFor(v: HireView, now: number, laptopModel?: string): HandledItem[] {
  const b = v.by
  const out: HandledItem[] = []

  // Background check
  const clear = b.clearance
  const check = b.bg_complete
  if (clear) {
    let glyph: GlyphState = 'blank'
    let text = 'Starts after you give consent'
    if (clear.state === 'verified') { glyph = 'verified'; text = 'Complete' }
    else if (check?.state === 'unknown') { glyph = 'prog'; text = 'In progress · updates are delayed, nothing needed from you' }
    else if (check?.state === 'verified') { glyph = 'prog'; text = 'Finishing up · nothing needed from you' }
    else if (check && check.state !== 'blank') { glyph = 'prog'; text = 'In progress · nothing needed from you' }
    out.push({ key: 'bg', label: 'Background check', glyph, text, flashKeys: ['bg_complete', 'clearance'] })
  }

  // Work authorization, only when needed
  const permit = b.permit
  const permitNeeded = permit && permit.state !== 'na' && (permit.state !== 'blank' || v.hire.mobilityNote.startsWith('Needed'))
  if (permit && permitNeeded) {
    let glyph: GlyphState = 'prog'
    let text = 'In progress with Atlas Legal'
    if (permit.state === 'verified') { glyph = 'verified'; text = 'Approved' }
    else if (permit.eta != null) text = `${permit.eta >= v.hire.start ? 'Taking longer than usual' : 'In progress'} · expected ${fmtDay(permit.eta)}`
    out.push({ key: 'permit', label: 'Work permit', glyph, text, flashKeys: ['permit'] })
  }

  // Laptop
  const rel_ = b.laptop_release
  if (rel_) {
    const prep = b.laptop_prep
    const ship = b.laptop_ship
    const del = b.laptop_deliver
    let glyph: GlyphState = 'blank'
    const wait = waitingOn(v, 'laptop_release')
    let text = v.hire.rehire ? `Your returned laptop will be reissued${wait ? ` after ${wait}` : ' soon'}` : wait ? `Ships after ${wait}` : 'Ordering soon'
    const arrive = del?.ver != null ? fmtDay(del.ver) : null
    if (b.laptop_received?.state === 'verified') { glyph = 'verified'; text = 'Arrived' }
    else if (del?.state === 'verified') { glyph = 'verified'; text = `Delivered ${rel(del.ver!, now)}` }
    else if (ship?.state === 'verified') { glyph = 'prog'; text = `On its way · arrives ${arrive ? rel(del!.ver!, now) : 'soon'}` }
    else if (prep?.eta != null && prep.state !== 'verified') { glyph = 'prog'; text = `Taking longer than usual · we'll update you by ${fmtDay(Math.min(prep.eta, confirmBy(v.hire.start, now)))}` }
    else if (prep && prep.state !== 'blank') { glyph = 'prog'; text = `Being set up for you${arrive ? ` · arrives around ${fmtShort(del!.ver!)}${del!.ver! >= v.hire.start ? ', after your start date' : ''}` : ''}` }
    else if (rel_.state === 'verified') {
      glyph = 'prog'
      const waitingOnPermit = permit && permit.state !== 'verified' && permit.state !== 'na'
      text = `Ordered · set-up starts once your ${waitingOnPermit ? 'work permit' : 'work account'} is ready`
    }
    else if (rel_.state !== 'blank') { glyph = 'prog'; text = v.hire.rehire ? 'Reissuing your returned laptop now' : 'Ordering now' }
    out.push({ key: 'laptop', label: laptopModel ? `Laptop · ${laptopModel}` : 'Laptop', glyph, text, flashKeys: ['laptop_release', 'laptop_prep', 'laptop_ship', 'laptop_deliver'] })
  }

  // Work account
  const acct = b.account
  if (acct) {
    let glyph: GlyphState = 'blank'
    const wait = waitingOn(v, 'account')
    let text = wait ? `Created after ${wait}` : 'Being set up soon'
    if (acct.state === 'verified') { glyph = 'verified'; text = 'Ready on day one' }
    else if (acct.state !== 'blank') { glyph = 'prog'; text = 'Being created' }
    out.push({ key: 'account', label: 'Work account', glyph, text, flashKeys: ['wd_hire', 'account'] })
  }

  // Orientation
  const seat = b.cohort_seat
  if (seat) out.push({ key: 'seat', label: 'Orientation seat', glyph: seat.state === 'verified' ? 'verified' : 'prog', text: seat.state === 'verified' ? `Saved for ${fmtDay(v.hire.start)}` : 'Being booked', flashKeys: ['cohort_seat'] })

  return out
}

/** The buddy, once the manager has really picked one. */
export function buddyOf(v: HireView): string | null {
  return v.hire.buddyId && v.by.buddy?.state === 'verified' ? v.hire.buddyId : null
}

/** The default first week: the manager edits it into the plan, and the hire sees whichever exists. */
export function defaultFirstWeek(h: HireView['hire'], mgrFirst: string, buddyFirst: string | null, sessionWhere: string | null, workTitle: string | null): PlanDay[] {
  return [
    [{ t: '9:00', l: sessionWhere ? `Orientation · ${sessionWhere}` : 'Orientation' }, { t: '1:00 pm', l: `First 1:1 with ${mgrFirst}` }, { t: '3:00 pm', l: 'Set up your tools with IT, if anything is left' }],
    [{ t: '10:00', l: buddyFirst ? `Coffee with ${buddyFirst}, your buddy` : 'Team coffee' }, { t: '2:00 pm', l: 'Team standup and introductions' }],
    [{ t: 'All day', l: 'Focus time: no-meeting Wednesday' }, { t: '', l: 'Read the onboarding guide for your team' }],
    [{ t: '11:00', l: workTitle ? `Walkthrough: ${workTitle}` : 'Walkthrough of your first piece of work' }, { t: '3:00 pm', l: 'Lunch and learn' }],
    [{ t: '3:00 pm', l: 'Friday demo hour' }, { t: '4:00 pm', l: `Week-one check-in with ${mgrFirst}` }],
  ]
}

/** The first week the hire sees: the manager's saved plan, or the default agenda until there is one. */
export function usePlan(v: HireView) {
  const ctx = useCtx()
  const saved = useDemo((s) => s.plans[v.hire.id])
  const stored = useDemo((s) => s.firstWork[v.hire.id])
  // A step done before the demo started has no saved text, so fall back to wording built from the hire's milestone.
  const work = stored ?? (v.by.first_work?.state === 'verified' ? { title: `A starter task toward your ${v.hire.milestone.charAt(0).toLowerCase() + v.hire.milestone.slice(1)}`, link: '' } : undefined)
  const h = v.hire
  const session = SESSIONS.find((x) => x.day === h.start && x.group === groupFor(h))
  const buddy = buddyOf(v)
  const firstName = (id: string) => people[id]?.name.split(' ')[0] ?? id
  const plan = saved ?? defaultFirstWeek(h, firstName(managerFor(h, ctx).id), buddy ? firstName(buddy) : null, session?.where ?? null, work?.title ?? null)
  return { plan, work, session, saved: !!saved || v.by.first_week?.state === 'verified' }
}

/** How a hire's own task reads to them. */
export function hireTaskLabel(s: StepView, v: HireView, now: number): string {
  switch (s.state) {
    case 'open':
      return `Due ${rel(s.due!, now)}`
    case 'soon':
      return s.label === 'Due tomorrow' ? 'Due tomorrow' : 'Due today'
    case 'late':
      return `Overdue since ${fmtDay(s.due!)}`
    case 'confirming':
      if (s.def.confirm === 'manager') return `Waiting for ${people[v.hire.managerId]?.name.split(' ')[0]} to confirm`
      return `You marked this done · waiting for ${systemNames[s.def.system]} to confirm`
    case 'verified':
      return `Done ${fmtShort(s.ver!)}`
    case 'unknown':
      return `Done? ${systemNames[s.def.system]} isn't updating right now`
    case 'na':
      return s.label
    default:
      if (s.open != null && s.open === v.hire.start) return 'Opens on day one'
      if (s.open != null && s.open > now && !s.waitingOn) return `Opens ${rel(s.open, now)}`
      if (s.key === 'laptop_received') return "Opens when it's delivered"
      if (s.key === 'consent') return 'Opens when Checkr sends the link'
      return s.label
  }
}

export function isOwnActionable(s: StepView): boolean {
  return s.state === 'open' || s.state === 'soon' || s.state === 'late'
}
