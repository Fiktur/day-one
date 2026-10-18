import { AREAS, SYSTEM_MODES, SYSTEM_STEWARD, STEP_BY_KEY, systemNames, type Area, type Mode, type Setup, type StepDef, type SystemId } from '../data/journey'
import { people, providers, teams, type Person, type ProviderId, type TeamId } from '../data/people'
import { bizBetween, daysWord, fmtDay, fmtShort, rel } from '../lib/dates'
import { simulate, type Forced, type HireState, type SimStep } from './simulate'

export type StepState = 'blank' | 'open' | 'soon' | 'late' | 'confirming' | 'verified' | 'na' | 'unknown'
export type AreaState = 'green' | 'progress' | 'red' | 'unknown' | 'blank' | 'mine'
export type HireStatus = 'ontrack' | 'behind' | 'atrisk' | 'unknown' | 'ready' | 'withdrawn' | 'started'

export interface Ref {
  kind: 'person' | 'team' | 'provider' | 'system'
  id: string
  name: string
  short: string
  /** Vendors only: the team accountable for the vendor's work. */
  steward?: TeamId
}

export interface StepView extends SimStep {
  name: string
  state: StepState
  red: boolean
  owner: Ref
  confirmer: Ref | null
  holder: Ref | null
  heldSince: number | null
  mode: Mode
  label: string
  waitingOn: string | null
  ownerAway: boolean
  confirmSlow: boolean
}

export interface AreaView {
  id: Exclude<Area, 'ramp'>
  label: string
  short: string
  state: AreaState
  done: number
  total: number
}

export interface HireView {
  hire: HireState
  person: Person
  steps: StepView[]
  by: Record<string, StepView>
  areas: AreaView[]
  status: HireStatus
  balls: StepView[]
  primary: StepView | null
  stage: number
  forecastEnd: number | null
  risk: boolean
  dateMoved: boolean
  hireTasks: StepView[]
}

export interface DeriveCtx {
  now: number
  setup: Setup
  down: Partial<Record<SystemId, number>>
  ooo: Record<string, { until: number; delegate: string | null }>
  forced: Forced[]
}

export function personRef(id: string): Ref {
  const p = people[id]
  return { kind: 'person', id, name: p?.name ?? id, short: p ? p.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '?' }
}
export function teamRef(id: TeamId): Ref {
  const t = teams[id]
  return { kind: 'team', id, name: t.name, short: t.short.slice(0, 2).toUpperCase() }
}
export function providerRef(id: ProviderId): Ref {
  const p = providers[id]
  return { kind: 'provider', id, name: p.name, short: p.short, steward: SYSTEM_STEWARD[id === 'carrier' ? 'firstbase' : id] }
}
/** How a holder reads to people: a vendor shows under the team that answers for it ("IT · via Firstbase"). */
export function refName(r: Ref): string {
  return r.kind === 'provider' && r.steward ? `${teams[r.steward].short} · via ${r.name}` : r.name
}
const SYSTEM_PROVIDER: Partial<Record<SystemId, ProviderId>> = {
  greenhouse: 'greenhouse', workday: 'workday', checkr: 'checkr', firstbase: 'firstbase', google: 'google',
  benefits: 'benefits', immigration: 'immigration', calendar: 'calendar',
}

export function managerFor(h: HireState, ctx: DeriveCtx): { id: string; away: boolean } {
  const o = ctx.ooo[h.managerId]
  if (o && ctx.now <= o.until) {
    if (o.delegate) return { id: o.delegate, away: false }
    return { id: h.managerId, away: true }
  }
  return { id: h.managerId, away: false }
}

function ownerRef(def: StepDef, h: HireState, ctx: DeriveCtx): { ref: Ref; away: boolean } {
  const o = def.owner
  switch (o.type) {
    case 'hire':
      return { ref: personRef(h.id), away: false }
    case 'manager': {
      const m = managerFor(h, ctx)
      return { ref: personRef(m.id), away: m.away }
    }
    case 'recruiter':
      return { ref: personRef(h.recruiterId), away: false }
    case 'team':
      return { ref: teamRef(o.team), away: false }
    case 'provider':
      return { ref: providerRef(o.id), away: false }
  }
}

function confirmerRef(def: StepDef, h: HireState, ctx: DeriveCtx, mode: Mode, owner: Ref): Ref | null {
  if (def.confirm === 'instant' || def.confirm === 'owner') return owner
  if (def.confirm === 'manager') return personRef(managerFor(h, ctx).id)
  if (mode === 'connected') {
    const p = SYSTEM_PROVIDER[def.system]
    return p ? providerRef(p) : owner
  }
  if (mode === 'manual' && owner.kind !== 'person') return owner
  return teamRef(SYSTEM_STEWARD[def.system])
}

const RED: StepState[] = ['soon', 'late']

export function deriveHire(h: HireState, ctx: DeriveCtx): HireView {
  const sim = simulate(h, ctx.forced)
  const now = ctx.now
  const withdrawn = h.withdrawn != null && now >= h.withdrawn
  const simBy: Record<string, SimStep> = Object.fromEntries(sim.map((s) => [s.key, s]))

  const steps: StepView[] = sim.map((s) => {
    const def = s.def
    const mode = SYSTEM_MODES[ctx.setup][def.system]
    const { ref: owner, away } = ownerRef(def, h, ctx)
    const confirmer = confirmerRef(def, h, ctx, mode, owner)
    const rename = def.rename?.(h)
    const name = rename ?? def.name
    let state: StepState = 'blank'
    let label = ''
    let waitingOn: string | null = null
    let confirmSlow = false
    const downSince = ctx.down[def.system]
    const systemDown = downSince != null && now >= downSince && mode !== 'manual' && def.confirm === 'system'

    if (withdrawn && !def.cancel && !(s.ver != null && s.ver < h.withdrawn!) && !(s.na && s.na.day <= now)) {
      state = 'na'
      label = 'Stopped: offer withdrawn'
    } else if (s.na && s.na.day <= now) {
      state = 'na'
      label = s.na.reason
    } else if (s.ver != null && s.ver <= now && !(systemDown && s.ver >= downSince!)) {
      state = 'verified'
      label = `Done ${fmtShort(s.ver)}`
    } else if (s.done != null && (s.doneRecorded ?? s.done) <= now) {
      state = systemDown ? 'unknown' : 'confirming'
      const since = s.doneRecorded ?? s.done
      confirmSlow = bizBetween(since, now) > 2
      label = systemDown ? "Can't check right now" : `Done ${rel(s.done, now)} · waiting to confirm`
    } else if (s.open != null && s.open <= now) {
      const due = s.due ?? s.open
      if (systemDown) {
        state = 'unknown'
        label = "Can't check right now"
      } else if (s.eta != null && s.eta > due) {
        state = 'soon'
        label = `Delayed · expected ${fmtDay(s.eta)}`
      } else if (now > due) {
        state = 'late'
        label = `Overdue · ${daysWord(bizBetween(due, now) || now - due)}`
      } else {
        const left = bizBetween(now, due)
        const windowLen = bizBetween(s.open, due)
        if (left <= 0 || (windowLen >= 5 && left <= 1)) {
          state = 'soon'
          label = left <= 0 ? 'Due today' : 'Due tomorrow'
        } else {
          state = 'open'
          label = `Due ${rel(due, now)}`
        }
      }
      if (s.rejected && s.rejected.day <= now) label = `${s.rejected.reason} · ${label.toLowerCase()}`
    } else {
      state = 'blank'
      if (s.open != null && s.open > now) {
        // Dependencies may already be green; the window just hasn't opened.
        const depsReady = (def.deps ?? []).every((d) => {
          const x = simBy[d]
          return !x || (x.na && x.na.day <= now) || (x.ver != null && x.ver <= now)
        })
        if (depsReady) label = `Opens ${rel(s.open, now)}`
      }
      if (!label) {
        for (const d of def.deps ?? []) {
          const x = simBy[d]
          if (!x) continue
          const ok = (x.na && x.na.day <= now) || (x.ver != null && x.ver <= now)
          if (!ok) {
            // Everyone reads this label, so a sensitive step only shows its safe wording.
            waitingOn = x.def.safe?.done ?? x.def.rename?.(h) ?? x.def.name
            break
          }
        }
        label = waitingOn ? `Opens after ${waitingOn.charAt(0).toLowerCase() + waitingOn.slice(1)}` : def.cancel ? 'Only if the offer is withdrawn' : 'Not yet'
      }
    }

    let holder: Ref | null = null
    let heldSince: number | null = null
    if (state === 'open' || state === 'soon' || state === 'late' || state === 'unknown') {
      holder = owner
      heldSince = s.open
    } else if (state === 'confirming') {
      holder = confirmer
      heldSince = s.doneRecorded ?? s.done
    }
    const red = RED.includes(state) || (state === 'confirming' && confirmSlow) || (away && holder?.id === h.managerId && state !== 'blank')

    return { ...s, name, state, red, owner, confirmer, holder, heldSince, mode, label, waitingOn, ownerAway: away, confirmSlow }
  })

  const by = Object.fromEntries(steps.map((s) => [s.key, s]))

  const areas: AreaView[] = AREAS.map((a) => {
    const list = steps.filter((s) => s.def.area === a.id && s.def.stage <= 4 && !s.def.cancel)
    // A withdrawn hire's steps are all "na"; counting them as done would paint every area green.
    const done = list.filter((s) => s.state === 'verified' || (s.state === 'na' && !withdrawn)).length
    let state: AreaState = 'blank'
    if (withdrawn) state = 'blank'
    else if (list.some((s) => s.red)) state = 'red'
    else if (list.some((s) => s.state === 'unknown')) state = 'unknown'
    else if (list.length && done === list.length) state = 'green'
    else if (list.some((s) => s.state !== 'blank')) state = 'progress'
    return { id: a.id, label: a.label, short: a.short, state, done, total: list.length }
  })

  // Forecast: when will the last critical pre-start step be confirmed?
  let forecastEnd: number | null = 0
  for (const s of steps) {
    if (!s.def.critical || s.def.stage > 4 || s.def.cancel) continue
    if (s.na) continue
    if (s.ver == null) { forecastEnd = null; break }
    forecastEnd = Math.max(forecastEnd ?? 0, s.ver)
  }
  const preStart = now < h.start
  const risk = preStart && !withdrawn && ((forecastEnd != null && forecastEnd >= h.start) || steps.some((s) => s.def.critical && s.red))

  const active = steps.filter((s) => s.holder && !(s.def.stage >= 5 && preStart))
  // A late step that blocks the start outranks a late one that doesn't.
  const rank = (s: StepView) => (s.red && s.def.critical ? 0 : s.state === 'late' ? 1 : s.state === 'soon' ? 2 : s.red ? 3 : s.state === 'unknown' ? 4 : s.state === 'confirming' ? 7 : s.def.critical ? 5 : 6)
  const balls = [...active].sort((a, b) => rank(a) - rank(b) || (a.due ?? 999) - (b.due ?? 999))

  // A start date that arrives with critical work unfinished (e.g. no work permit) is not a start.
  const blockedStart = !preStart && !withdrawn && steps.some((s) => s.def.critical && s.state !== 'verified' && s.state !== 'na')

  let status: HireStatus
  if (withdrawn) status = 'withdrawn'
  else if (blockedStart) status = 'atrisk'
  else if (!preStart) status = 'started'
  else if (risk) status = 'atrisk'
  else if (steps.some((s) => s.state === 'unknown')) status = 'unknown'
  else if (steps.some((s) => s.def.stage <= 4 && (s.state === 'late' || (s.state === 'soon' && s.eta != null && s.eta > (s.due ?? s.eta))))) status = 'behind'
  else if (areas.every((a) => a.state === 'green')) status = 'ready'
  else status = 'ontrack'

  let stage = 0
  if (!preStart) stage = now >= h.start + 1 ? 6 : 5
  else {
    const pending = steps.filter((s) => s.def.stage <= 4 && !s.def.cancel && s.state !== 'verified' && s.state !== 'na' && s.state !== 'blank')
    const critical = pending.filter((s) => s.def.critical)
    const pool = critical.length ? critical : pending
    stage = pool.length ? Math.min(...pool.map((s) => s.def.stage)) : Math.max(1, ...steps.filter((s) => s.state === 'verified').map((s) => Math.min(4, s.def.stage)))
    // A late side task (say, emergency contacts) must not pull the stage back behind critical work already done.
    stage = Math.max(stage, ...steps.filter((s) => s.def.critical && s.def.stage <= 4 && s.state === 'verified').map((s) => s.def.stage))
  }

  const hireTasks = steps.filter((s) => s.def.owner.type === 'hire' && s.def.hire)

  return {
    hire: h, person: people[h.id], steps, by, areas, status, balls, primary: balls[0] ?? null, stage,
    forecastEnd, risk, dateMoved: h.start !== h.originalStart, hireTasks,
  }
}

export const STATUS_LABEL: Record<HireStatus, string> = {
  ontrack: 'On track',
  behind: 'Behind',
  atrisk: 'At risk',
  unknown: "Can't check right now",
  ready: 'Ready',
  withdrawn: 'Withdrawn',
  started: 'Started',
}

export function stepIsSensitiveFor(def: StepDef, viewer: { role: string; team?: TeamId }): boolean {
  if (!def.sensitive) return false
  if (viewer.role === 'program' || viewer.role === 'head') return false
  if (def.sensitive === 'screening') return viewer.team !== 'screening'
  if (def.sensitive === 'immigration') return viewer.team !== 'mobility'
  return true
}

const TO_DO: StepState[] = ['blank', 'open', 'soon', 'late', 'unknown']

/** A step's name as this viewer may see it. `action` gives the to-do form while the step is still to be done. */
export function safeName(s: StepView, viewer: { role: string; team?: TeamId }, opts?: { action?: boolean }): string {
  if (stepIsSensitiveFor(s.def, viewer) && s.def.safe) return s.state === 'verified' ? s.def.safe.done : s.def.safe.open
  if (opts?.action && s.def.task && s.name === s.def.name && TO_DO.includes(s.state)) return s.def.task
  return s.name
}

export function systemLabel(id: SystemId): string {
  return systemNames[id]
}

export function stepDef(key: string): StepDef {
  return STEP_BY_KEY[key]
}
