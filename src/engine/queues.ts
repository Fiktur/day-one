import type { TeamId } from '../data/people'
import type { HireView, Ref, StepView } from './derive'
import { fmtShort } from '../lib/dates'

export interface QueueItem {
  view: HireView
  step: StepView
}

export interface Queue {
  move: QueueItem[]
  coming: QueueItem[]
  confirming: QueueItem[]
  done: QueueItem[]
  /** Work a vendor holds for this team: the team still answers for it. */
  vendor: QueueItem[]
}

function matches(ref: Ref | null, who: { team?: TeamId; person?: string }): boolean {
  if (!ref) return false
  if (who.team && ref.kind === 'team' && ref.id === who.team) return true
  if (who.person && ref.kind === 'person' && ref.id === who.person) return true
  return false
}

const viaTeam = (ref: Ref | null, who: { team?: TeamId }) => !!who.team && ref?.kind === 'provider' && ref.steward === who.team

/** What a team (or a person) holds right now, what's coming, what's waiting on a system, and what they finished. */
export function queueFor(views: Record<string, HireView>, who: { team?: TeamId; person?: string }, now: number): Queue {
  const q: Queue = { move: [], coming: [], confirming: [], done: [], vendor: [] }
  for (const v of Object.values(views)) {
    for (const s of v.steps) {
      const ownerMatch = matches(s.owner, who)
      const holderMatch = matches(s.holder, who)
      if (holderMatch && s.state !== 'blank') {
        q.move.push({ view: v, step: s })
      } else if (viaTeam(s.holder, who) && s.state !== 'blank' && !(s.state === 'confirming' && !s.red) && v.status !== 'withdrawn') {
        q.vendor.push({ view: v, step: s })
      } else if (ownerMatch && s.state === 'confirming') {
        q.confirming.push({ view: v, step: s })
      } else if (ownerMatch && s.state === 'blank' && v.status !== 'withdrawn' && !s.def.cancel && !(s.def.stage >= 5 && v.status === 'started')) {
        q.coming.push({ view: v, step: s })
      } else if (ownerMatch && s.state === 'verified' && s.ver != null && s.ver >= now - 7 && s.ver <= now) {
        q.done.push({ view: v, step: s })
      }
    }
  }
  const redRank = (s: StepView) => (s.state === 'late' ? 0 : s.red ? 1 : s.state === 'unknown' ? 2 : 3)
  q.move.sort((a, b) => redRank(a.step) - redRank(b.step) || (a.step.due ?? 999) - (b.step.due ?? 999))
  q.coming.sort((a, b) => (a.step.open ?? 999) - (b.step.open ?? 999) || a.view.hire.start - b.view.hire.start)
  q.done.sort((a, b) => (b.step.ver ?? 0) - (a.step.ver ?? 0))
  q.vendor.sort((a, b) => redRank(a.step) - redRank(b.step) || (a.step.due ?? 999) - (b.step.due ?? 999))
  return q
}

export function countMoves(views: Record<string, HireView>, who: { team?: TeamId; person?: string }): { total: number; red: number } {
  let total = 0
  let red = 0
  for (const v of Object.values(views)) {
    for (const s of v.steps) {
      if (s.state !== 'blank' && matches(s.holder, who)) {
        total++
        if (s.red) red++
      } else if (s.red && viaTeam(s.holder, who)) {
        // A late vendor is the team's problem too, so it counts toward the badge.
        total++
        red++
      }
    }
  }
  return { total, red }
}

/** What the person doing the step needs to know, without opening anything. No home addresses: the vendor has those. */
export function factsFor(v: HireView, s: StepView, model?: string): string | null {
  const h = v.hire
  const [first, last] = v.person.name.toLowerCase().split(' ')
  switch (s.key) {
    case 'cancel_laptop': return `Offer withdrawn${h.withdrawn != null ? ` ${fmtShort(h.withdrawn)}` : ''} · stop the ${model ?? h.laptop.model} order`
    case 'laptop_release': case 'laptop_prep': case 'laptop_ship':
      return `${model ?? h.laptop.model} · ${h.location} · needed by ${fmtShort(h.start - 2)}`
    case 'laptop_deliver': return `${h.location} · needed by ${fmtShort(h.start - 2)}`
    case 'account': return `${first}.${last ?? ''}@northbeam.com${h.rehire ? ' · restore the old account' : ''} · by ${fmtShort(h.start - 1)}`
    case 'badge': return `${h.location} · first day ${fmtShort(h.start)}`
    case 'wd_hire': return `${h.title} · starts ${fmtShort(h.start)}`
    default: return null
  }
}

