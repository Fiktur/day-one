import { STEPS, type StepDef } from '../data/journey'
import type { HireBase } from '../data/hires'
import { addBiz, nextWeekday, prevWeekday } from '../lib/dates'

/** Something that actually happened (or was decided) during the demo, on top of the seeded history. */
export interface Forced {
  hire: string
  key: string
  type: 'done' | 'ver' | 'na' | 'delay' | 'undelay' | 'reject' | 'reopen' | 'fast'
  day: number
  /** For manual marks: the day it really happened, if different from when it was recorded. */
  occurred?: number
  by?: string
  reason?: string
  eta?: number
  typ?: number
}

export interface SimStep {
  def: StepDef
  key: string
  open: number | null
  due: number | null
  done: number | null
  doneRecorded: number | null
  ver: number | null
  na: { day: number; reason: string } | null
  eta: number | null
  doneBy?: string
  verBy?: string
  rejected?: { day: number; reason: string }
  forcedDone: boolean
  forcedVer: boolean
}

export interface HireState extends HireBase {
  start: number
  originalStart: number
  withdrawn: number | null
}

function relDay(h: HireState, rel: number, kind: 'open' | 'due'): number {
  const d = h.start + rel
  return kind === 'open' ? nextWeekday(d) : prevWeekday(d)
}

/**
 * Projects every step for one hire: when it opens, when it's due, and when it's likely done and
 * confirmed. History before "now" comes from the same projection, so the past and the forecast
 * always agree. Forced events from scenarios and clicks override the projection.
 */
export function simulate(h: HireState, forced: Forced[]): SimStep[] {
  const mine = forced.filter((f) => f.hire === h.id)
  const out: Record<string, SimStep> = {}
  const list: SimStep[] = []

  for (const def of STEPS) {
    if (def.when && !def.when(h)) continue
    const ov = h.overrides[def.key] ?? {}
    const fs = mine.filter((f) => f.key === def.key)
    const last = (t: Forced['type']) => [...fs].reverse().find((f) => f.type === t)

    const s: SimStep = {
      def, key: def.key, open: null, due: null, done: null, doneRecorded: null, ver: null, na: null, eta: null,
      forcedDone: false, forcedVer: false,
    }

    // Opening: all dependencies confirmed (or not needed), and the time window reached.
    let open: number | null
    if (def.cancel) {
      open = h.withdrawn
    } else {
      open = h.offer
      for (const dep of def.deps ?? []) {
        const d = out[dep]
        if (!d) continue // dependency excluded for this hire counts as satisfied
        const sat = d.na ? d.na.day : d.ver
        if (sat == null) { open = null; break }
        open = Math.max(open, sat)
      }
      if (open != null && def.opens != null) open = Math.max(open, relDay(h, def.opens, 'open'))
      if (open != null) open = nextWeekday(open)
    }
    s.open = open

    // Not needed: work permits for people who don't need one, and anything decided as not needed.
    const forcedNa = last('na')
    if (def.key === 'permit' && !h.needsWorkAuth) {
      const review = out['mobility_review']
      if (review?.ver != null) s.na = { day: review.ver, reason: h.mobilityNote }
    }
    if (ov.na) s.na = { day: h.offer, reason: ov.na }
    if (forcedNa) s.na = { day: forcedNa.day, reason: forcedNa.reason ?? 'Not needed' }

    if (open != null) {
      s.due = 'sla' in def.due ? addBiz(open, def.due.sla) : relDay(h, def.due.rel, 'due')
      if (s.due < open) s.due = open
    }

    if (open != null && !s.na) {
      // Provider delays push the projected finish out.
      const delay = last('delay')
      const undelay = last('undelay')
      let eta: number | null = ov.eta ?? null
      if (delay && (!undelay || undelay.day < delay.day || (undelay.day === delay.day && fs.indexOf(undelay) < fs.indexOf(delay)))) eta = delay.eta ?? null
      else if (undelay) eta = null
      s.eta = eta

      const fDone = last('done')
      const fVer = last('ver')
      const fast = last('fast')
      const typ = fast?.typ ?? ov.typ ?? def.typ ?? 1
      let done: number | null
      if (fDone) {
        done = fDone.occurred ?? fDone.day
        s.doneRecorded = fDone.day
        s.doneBy = fDone.by
        s.forcedDone = true
      } else if (ov.doneAt != null) {
        done = ov.doneAt
      } else if (ov.never) {
        done = null
      } else {
        done = addBiz(fast ? Math.max(open, fast.day) : open, typ)
        if (eta != null) done = Math.max(done, eta)
      }
      if (done != null && done < open && !fDone) done = open
      s.done = done
      if (s.doneRecorded == null) s.doneRecorded = done

      const reject = last('reject')
      if (reject && done != null && reject.day >= done && (!fDone || fs.indexOf(reject) > fs.indexOf(fDone))) {
        s.rejected = { day: reject.day, reason: reject.reason ?? 'Sent back' }
        s.done = null
        s.doneRecorded = null
      }

      if (s.done != null) {
        if (fVer && fVer.day >= (s.doneRecorded ?? s.done)) {
          s.ver = fVer.day
          s.verBy = fVer.by
          s.forcedVer = true
        } else if (ov.verAt != null && !fDone) {
          s.ver = ov.verAt
        } else if (def.confirm === 'instant' || def.confirm === 'owner') {
          s.ver = s.doneRecorded ?? s.done
        } else if (fDone) {
          // Marked done during the demo: it stays "confirming" until the system or a person confirms it.
          s.ver = null
        } else {
          const lag = ov.lag ?? def.lag ?? 0
          s.ver = addBiz(s.doneRecorded ?? s.done, lag)
        }
      }
    }

    out[def.key] = s
    list.push(s)
  }
  return list
}
