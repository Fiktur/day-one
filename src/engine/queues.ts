import type { TeamId } from '../data/people'
import type { HireView, Ref, StepView } from './derive'

export interface QueueItem {
  view: HireView
  step: StepView
}

export interface Queue {
  move: QueueItem[]
  coming: QueueItem[]
  confirming: QueueItem[]
  done: QueueItem[]
}

function matches(ref: Ref | null, who: { team?: TeamId; person?: string }): boolean {
  if (!ref) return false
  if (who.team && ref.kind === 'team' && ref.id === who.team) return true
  if (who.person && ref.kind === 'person' && ref.id === who.person) return true
  return false
}

/** What a team (or a person) holds right now, what's coming, what's waiting on a system, and what they finished. */
export function queueFor(views: Record<string, HireView>, who: { team?: TeamId; person?: string }, now: number): Queue {
  const q: Queue = { move: [], coming: [], confirming: [], done: [] }
  for (const v of Object.values(views)) {
    for (const s of v.steps) {
      const ownerMatch = matches(s.owner, who)
      const holderMatch = matches(s.holder, who)
      if (holderMatch && s.state !== 'blank') {
        q.move.push({ view: v, step: s })
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
      }
    }
  }
  return { total, red }
}
