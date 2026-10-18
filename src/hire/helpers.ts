import type { HireView, StepView } from '../engine/derive'
import type { GlyphState } from '../ui/parts'
import { addBiz, fmtDay, fmtShort, rel } from '../lib/dates'
import { systemNames } from '../data/journey'
import { people } from '../data/people'

export interface HandledItem {
  key: string
  label: string
  glyph: GlyphState
  text: string
  flashKeys: string[]
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
    let text = 'In progress with Atlas Immigration'
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
    let text = v.hire.rehire ? 'Your returned laptop will be reissued after your background check' : 'Ships after your background check'
    const arrive = del?.ver != null ? fmtDay(del.ver) : null
    if (b.laptop_received?.state === 'verified') { glyph = 'verified'; text = 'Arrived' }
    else if (del?.state === 'verified') { glyph = 'verified'; text = `Delivered ${rel(del.ver!, now)}` }
    else if (ship?.state === 'verified') { glyph = 'prog'; text = `On its way · arrives ${arrive ? rel(del!.ver!, now) : 'soon'}` }
    else if (prep?.eta != null && prep.state !== 'verified') { glyph = 'prog'; text = `Taking longer than usual · we'll update you by ${fmtDay(Math.min(prep.eta, addBiz(now, 2)))}` }
    else if (prep && prep.state !== 'blank') { glyph = 'prog'; text = `Being set up for you${arrive ? ` · arrives around ${fmtShort(del!.ver!)}` : ''}` }
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
    let text = 'Created after your background check'
    if (acct.state === 'verified') { glyph = 'verified'; text = 'Ready on day one' }
    else if (acct.state !== 'blank') { glyph = 'prog'; text = 'Being created' }
    out.push({ key: 'account', label: 'Work account', glyph, text, flashKeys: ['wd_hire', 'account'] })
  }

  // Orientation
  const seat = b.cohort_seat
  if (seat) out.push({ key: 'seat', label: 'Orientation seat', glyph: seat.state === 'verified' ? 'verified' : 'prog', text: seat.state === 'verified' ? `Saved for ${fmtDay(v.hire.start)}` : 'Being booked', flashKeys: ['cohort_seat'] })

  return out
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
      return `You marked this done · ${systemNames[s.def.system]} is confirming`
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
