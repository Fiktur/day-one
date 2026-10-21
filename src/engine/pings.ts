import { people, teams, type TeamId } from '../data/people'
import { SYSTEM_STEWARD, systemNames, type SystemId } from '../data/journey'
import { fmtShort, fmtWeekdayShort } from '../lib/dates'
import { lc } from '../lib/cn'
import { coverFor, managerFor, refName, safeName, type DeriveCtx, type HireView, type StepView } from './derive'
import { factsFor } from './queues'
import type { DemoState } from './store'

export type Channel = 'Slack' | 'Text' | 'Email'
export type PingActionKind = 'open' | 'take' | 'done' | 'buddy' | 'chase' | 'reassign' | 'notify'
/** `arg` is the buddy, vendor, manager or system the button acts on; for "open" on a hire ping, the page to land on. */
export interface PingAction { kind: PingActionKind; label: string; by: string; arg?: string }

/** One notification Day One would send instead of making someone log in to check. */
export interface Ping {
  id: string
  /** A person id, or a team id when it goes to the team's channel. */
  to: string
  toLabel: string
  channel: Channel
  kind: 'todo' | 'fyi'
  title: string
  body: string
  hireId?: string
  key?: string
  actions: PingAction[]
}

type PingState = Pick<DemoState, 'now' | 'nudges' | 'boards' | 'dateChanges' | 'down' | 'ooo' | 'claims' | 'assignments' | 'laptopModel'>

const first = (id: string) => people[id]?.name.split(' ')[0] ?? id
const OPEN = ['open', 'soon', 'late']
const isNew = (s: StepView, now: number) => s.open === now
const lead = (team: TeamId) => teams[team].members[0]
const channelOf = (team: TeamId) => `#${teams[team].short.toLowerCase().replace(/\s+/g, '-')}-onboarding`
const away = (id: string, st: PingState) => !!st.ooo[id] && st.now <= st.ooo[id].until && !st.ooo[id].delegate
const task = (s: StepView, role: string, team?: TeamId) => safeName(s, { role, team }, { action: true })

/**
 * Who gets pinged today, on which channel, and with which button: the notification table from the UX review.
 * Pure, like messagesFor: the Outbox panel only renders it and runs the buttons.
 */
export function pingsFor(views: Record<string, HireView>, st: PingState, ctx: DeriveCtx): Ping[] {
  const now = st.now
  const out: Ping[] = []
  const add = (p: Omit<Ping, 'id'>) => {
    const id = `${p.to}:${p.hireId ?? ''}:${p.key ?? p.title}`
    if (!out.some((x) => x.id === id)) out.push({ ...p, id })
  }

  for (const v of Object.values(views)) {
    if (v.status === 'withdrawn' && v.hire.withdrawn !== now) continue
    const h = v.hire
    const hireFirst = first(h.id)
    const m = managerFor(h, ctx)
    const mgr = m.id

    // The new hire: a task that opens or runs late, the laptop leaving, a moved date, new hellos, a start that won't happen.
    for (const s of v.hireTasks) {
      if (!OPEN.includes(s.state) || !(isNew(s, now) || s.state === 'late')) continue
      const label = s.def.hire?.label ?? s.name
      const mins = s.def.hire?.minutes
      add({ to: h.id, toLabel: hireFirst, channel: 'Text', kind: 'todo', hireId: h.id, key: s.key, title: s.state === 'late' ? `Reminder: ${label}` : `New for you: ${label}`, body: `${mins ? `About ${mins} minute${mins === 1 ? '' : 's'}. ` : ''}${s.label}.`, actions: [{ kind: 'open', label: 'Open', by: h.id }] })
    }
    const del = v.by.laptop_deliver?.ver
    if (v.by.laptop_ship?.ver === now) add({ to: h.id, toLabel: hireFirst, channel: 'Email', kind: 'fyi', hireId: h.id, title: 'Your laptop is on its way', body: del != null && del >= h.start ? `It arrives ${fmtShort(del)}, after your start date. Maria will tell you the plan for day one.` : 'It arrives set up. On day one you just sign in.', actions: [{ kind: 'open', label: 'Track it', by: h.id, arg: 'laptop' }] })
    for (const c of st.dateChanges.filter((c) => c.hireId === h.id && c.day === now)) {
      add({ to: h.id, toLabel: hireFirst, channel: 'Email', kind: 'fyi', hireId: h.id, key: `date:${c.to}`, title: `Your start date is now ${fmtShort(c.to)}`, body: 'Everything in Day One has moved with it.', actions: [{ kind: 'open', label: 'Open Day One', by: h.id }] })
      if (!m.away) add({ to: mgr, toLabel: first(mgr), channel: 'Slack', kind: 'fyi', hireId: h.id, key: `date:${c.to}`, title: `${hireFirst}'s start moved to ${fmtShort(c.to)}`, body: 'Your prep due dates moved with it.', actions: [{ kind: 'open', label: 'Open', by: mgr }] })
    }
    if (v.status === 'atrisk' && (now === h.start - 1 || now === h.start) && !st.dateChanges.some((c) => c.hireId === h.id)) {
      add({ to: h.id, toLabel: hireFirst, channel: 'Text', kind: 'fyi', hireId: h.id, key: 'hold', title: `Please don't come in on ${fmtWeekdayShort(h.start)}`, body: "Your start date is moving. Maria will confirm the new one with you. You don't need to do anything.", actions: [{ kind: 'open', label: 'Open Day One', by: h.id }] })
    }
    const hellos = st.boards[h.id]?.status === 'live' ? st.boards[h.id].posts.filter((p) => p.day === now) : []
    if (hellos.length) add({ to: h.id, toLabel: hireFirst, channel: 'Email', kind: 'fyi', hireId: h.id, key: 'hellos', title: `${hellos.length} new hello${hellos.length > 1 ? 's' : ''} on your welcome board`, body: `From ${hellos.map((p) => first(p.author)).join(', ')}.`, actions: [{ kind: 'open', label: 'Watch', by: h.id, arg: 'welcome' }] })

    // Managers: their to-dos with the real action, and FYIs when the hire is at risk or withdraws. Nothing while they're out with no cover.
    if (!m.away) {
      for (const s of v.steps.filter((x) => x.holder?.kind === 'person' && x.holder.id === mgr && ((OPEN.includes(x.state) && (isNew(x, now) || x.red)) || (x.state === 'confirming' && ((x.doneRecorded ?? x.done) === now || x.red))))) {
        const actions: PingAction[] = [{ kind: 'open', label: 'Open', by: mgr }]
        if (s.key === 'buddy' && h.buddyId) actions.unshift({ kind: 'buddy', label: `Pick ${first(h.buddyId)}`, by: mgr, arg: h.buddyId })
        const what = s.state === 'confirming' ? `Confirm: ${lc(s.name)}` : task(s, 'manager')
        add({ to: mgr, toLabel: first(mgr), channel: 'Slack', kind: 'todo', hireId: h.id, key: s.key, title: `${what} for ${hireFirst}`, body: s.label, actions })
      }
      if (h.withdrawn === now) add({ to: mgr, toLabel: first(mgr), channel: 'Slack', kind: 'fyi', hireId: h.id, key: 'withdrawn', title: `${hireFirst} withdrew`, body: 'Nothing needed from you. Open steps closed and messages stopped.', actions: [] })
    }
    if (v.status === 'atrisk' && v.primary) {
      const p = v.primary
      const why = p.holder ? `Waiting on ${refName(p.holder)}: ${lc(p.label)}.` : `${p.label}.`
      if (!m.away) add({ to: mgr, toLabel: first(mgr), channel: 'Slack', kind: 'fyi', hireId: h.id, key: 'risk', title: `${hireFirst}'s start date is at risk`, body: `${why} Maria Hill is on it.`, actions: [{ kind: 'open', label: 'Open', by: mgr }] })
      add({ to: h.recruiterId, toLabel: first(h.recruiterId), channel: 'Slack', kind: 'fyi', hireId: h.id, key: 'risk', title: `${hireFirst}'s start date is at risk`, body: 'Hold off on promising the date until Maria confirms it.', actions: [{ kind: 'open', label: 'Open', by: h.recruiterId }] })
      // Same rule as the Command row (fixFor): chase the vendor unless there's a decision to make instead.
      // shortcut: the only scripted decision is Hal's backorder (suggestedFixes); move both to one shared rule if more are added.
      const chase = p.holder?.kind === 'provider' && !(h.id === 'hal' && p.key === 'laptop_prep')
      add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', hireId: h.id, key: p.key, title: `${hireFirst}'s start date is at risk`, body: `${task(p, 'program')}. ${p.label}.`, actions: chase ? [{ kind: 'chase', label: `Chase ${p.holder!.name}`, by: 'maria', arg: p.holder!.name }, { kind: 'open', label: 'Open', by: 'maria' }] : [{ kind: 'open', label: p.holder?.kind === 'provider' ? 'Choose a fix' : 'Open', by: 'maria' }] })
    }
    // An owner away with nobody covering: the onboarding team can hand it over in one tap.
    const late = v.steps.find((s) => s.ownerAway && s.red)
    const cover = coverFor(h.managerId, st.ooo, now)
    if (late && cover && away(h.managerId, st)) add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', hireId: h.id, key: `away:${h.managerId}`, title: `${first(h.managerId)} is out and ${hireFirst}'s prep is slipping`, body: `${task(late, 'program')}: ${lc(late.label)}.`, actions: [{ kind: 'reassign', label: `Reassign to ${first(cover)}`, by: 'maria', arg: h.managerId }] })

    // Teams: a channel post per item that opens or runs late, with Take it and Done · today; late vendors get Chase.
    for (const s of v.steps) {
      const facts = factsFor(v, s, st.laptopModel[h.id])
      if (s.holder?.kind === 'team' && OPEN.includes(s.state) && (isNew(s, now) || s.red)) {
        const team = s.holder.id as TeamId
        const claimed = st.claims[`${h.id}:${s.key}`]
        add({ to: team, toLabel: channelOf(team), channel: 'Slack', kind: 'todo', hireId: h.id, key: s.key, title: `${task(s, 'team', team)} · ${v.person.name}`, body: `${s.label}${facts ? ` · ${facts}` : ''}${claimed ? ` · ${first(claimed)} has it` : ''}.`, actions: [...(claimed ? [] : [{ kind: 'take' as const, label: 'Take it', by: lead(team) }]), { kind: 'done', label: 'Done · today', by: claimed ?? lead(team) }] })
      }
      if (s.holder?.kind === 'provider' && s.holder.steward && s.red && s.state !== 'confirming') {
        const team = s.holder.steward
        add({ to: team, toLabel: channelOf(team), channel: 'Slack', kind: 'todo', hireId: h.id, key: s.key, title: `${s.holder.name} · ${task(s, 'team', team)} for ${v.person.name}`, body: `${s.label}${v.status === 'atrisk' && s.def.critical ? ' · start date at risk' : ''}${facts ? ` · ${facts}` : ''}.`, actions: [{ kind: 'chase', label: `Chase ${s.holder.name}`, by: lead(team), arg: s.holder.name }] })
      }
    }
  }

  // Cover handed over today: the cover hears it from Day One, with the hires that moved.
  for (const [id, o] of Object.entries(st.ooo)) {
    if (!o.delegate || o.since !== now) continue
    const moved = Object.values(views).filter((v) => v.hire.managerId === id && v.status !== 'withdrawn' && v.status !== 'started').map((v) => first(v.hire.id))
    add({ to: o.delegate, toLabel: first(o.delegate), channel: 'Slack', kind: 'todo', key: `cover:${id}`, title: `You're covering for ${first(id)} until ${fmtShort(o.until)}`, body: moved.length ? `${moved.join(', ')}: their prep moved to you, with the deadlines.` : 'Nothing open right now.', actions: [{ kind: 'open', label: 'Open Covering', by: o.delegate }] })
  }

  // Outages go to the onboarding team and the team that runs the system, once, not per step.
  for (const sys of Object.keys(st.down) as SystemId[]) {
    const steps = Object.values(views).flatMap((v) => v.steps.filter((s) => s.def.system === sys && s.state === 'unknown').map((s) => ({ v, s })))
    const n = steps.length
    const untold = new Set(steps.filter(({ v, s }) => !st.nudges.some((x) => x.hireId === v.hire.id && x.key === s.key && x.day === now)).map(({ v }) => managerFor(v.hire, ctx).id))
    const what = `${n} step${n === 1 ? '' : 's'} can't be checked. Hires see "updates are delayed".`
    add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', key: `down:${sys}`, title: `${systemNames[sys]} isn't responding`, body: what, actions: untold.size ? [{ kind: 'notify', label: `Notify ${untold.size} manager${untold.size > 1 ? 's' : ''}`, by: 'maria', arg: sys }] : [] })
    const steward = SYSTEM_STEWARD[sys]
    if (steward && steward !== 'program') add({ to: steward, toLabel: channelOf(steward), channel: 'Slack', kind: 'fyi', key: `down:${sys}`, title: `${systemNames[sys]} isn't responding`, body: `${what} Day One retries every 5 minutes. Nothing turns red while it's down.`, actions: [] })
  }

  // Nudges sent today land with whoever they name: a person, a team channel, or the vendor's support inbox.
  const outage = new Map<string, { to: string; sys: SystemId; hires: string[] }>()
  for (const n of st.nudges.filter((x) => x.day === now)) {
    const v = views[n.hireId]
    const step = v?.by[n.key]
    const person = Object.values(people).find((p) => p.name === n.to)
    const team = (Object.keys(teams) as TeamId[]).find((t) => teams[t].name === n.to)
    if (n.key.startsWith('start:')) {
      add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', hireId: n.hireId, key: n.key, title: `${first(n.by)} proposes starting ${v?.person.name.split(' ')[0]} on ${fmtShort(Number(n.key.slice(6)))}`, body: 'The earliest date the start-date check says is safe.', actions: [{ kind: 'open', label: 'Review', by: 'maria' }] })
      continue
    }
    if (person && away(person.id, st)) continue
    // "Notify managers" during an outage: one FYI per manager and system, not a to-do per step.
    if (person && step?.state === 'unknown') {
      const k = `${person.id}:${step.def.system}`
      const o = outage.get(k) ?? { to: person.id, sys: step.def.system, hires: [] }
      if (!o.hires.includes(first(n.hireId))) o.hires.push(first(n.hireId))
      outage.set(k, o)
      continue
    }
    const what = step ? task(step, person?.role ?? 'team', team ?? person?.team) : n.key
    add({ to: person?.id ?? team ?? n.to, toLabel: person ? first(person.id) : team ? channelOf(team) : `${n.to} support`, channel: person?.role === 'hire' ? 'Text' : person || team ? 'Slack' : 'Email', kind: 'todo', hireId: n.hireId, key: `nudge:${n.key}`, title: `${first(n.by)} nudged you: ${what}`, body: `For ${v?.person.name ?? n.hireId}. ${step?.label ?? ''}`, actions: [{ kind: 'open', label: 'Open', by: person?.id ?? (team ? lead(team) : 'maria') }] })
  }
  for (const o of outage.values()) {
    add({ to: o.to, toLabel: first(o.to), channel: 'Slack', kind: 'fyi', key: `down:${o.sys}`, title: `${systemNames[o.sys]} is down: updates for ${o.hires.join(', ')} are delayed`, body: 'Nothing needed from you. Day One retries every 5 minutes and tells you when it is back.', actions: [] })
  }

  // Insights suggestions someone handed over today.
  for (const a of st.assignments.filter((x) => x.day === now)) {
    add({ to: a.to, toLabel: first(a.to), channel: 'Slack', kind: 'todo', key: `assign:${a.title}`, title: `${first(a.by)} assigned you: ${a.title}`, body: 'From Insights, with the numbers behind it.', actions: [{ kind: 'open', label: 'Open Insights', by: a.to }] })
  }

  // To-dos first: an FYI never pushes a button below the fold.
  return out.sort((a, b) => Number(a.kind === 'fyi') - Number(b.kind === 'fyi'))
}

/** The 9am summary each person would get instead of opening the app to check. */
export function digestFor(to: string, pings: Ping[]): string {
  const mine = pings.filter((p) => p.to === to)
  const todo = mine.filter((p) => p.kind === 'todo').length
  const fyi = mine.length - todo
  return todo || fyi ? `${todo} to do${fyi ? `, ${fyi} FYI` : ''} · ${mine.slice(0, 3).map((p) => p.title).join(' · ')}` : 'Nothing today. No email sent.'
}
