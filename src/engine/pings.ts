import { people, teams, type TeamId } from '../data/people'
import { systemNames, type SystemId } from '../data/journey'
import { fmtShort } from '../lib/dates'
import { lc } from '../lib/cn'
import { coverFor, managerFor, refName, safeName, type DeriveCtx, type HireView, type StepView } from './derive'
import type { DemoState } from './store'

export type Channel = 'Slack' | 'Text' | 'Email'
export type PingActionKind = 'open' | 'take' | 'done' | 'buddy' | 'chase' | 'reassign'
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

type PingState = Pick<DemoState, 'now' | 'nudges' | 'boards' | 'dateChanges' | 'down' | 'ooo' | 'claims' | 'assignments'>

const first = (id: string) => people[id]?.name.split(' ')[0] ?? id
const OPEN = ['open', 'soon', 'late']
const isNew = (s: StepView, now: number) => s.open === now
const lead = (team: TeamId) => teams[team].members[0]
const channelOf = (team: TeamId) => `#${teams[team].short.toLowerCase().replace(/\s+/g, '-')}-onboarding`

/**
 * Who gets pinged today, on which channel, and with which button: the notification table from the UX review.
 * Pure, like messagesFor: the Outbox panel only renders it and runs the buttons.
 */
export function pingsFor(views: Record<string, HireView>, st: PingState, ctx: DeriveCtx): Ping[] {
  const now = st.now
  const out: Ping[] = []
  const add = (p: Omit<Ping, 'id'>) => out.push({ ...p, id: `${p.to}:${p.hireId ?? ''}:${p.key ?? p.title}` })

  for (const v of Object.values(views)) {
    if (v.status === 'withdrawn' && v.hire.withdrawn !== now) continue
    const h = v.hire
    const hireFirst = first(h.id)
    const mgr = managerFor(h, ctx).id

    // The new hire: a task that opens or runs late, the laptop leaving, a moved date, new hellos.
    for (const s of v.hireTasks) {
      if (!OPEN.includes(s.state) || !(isNew(s, now) || s.state === 'late')) continue
      const label = s.def.hire?.label ?? s.name
      add({ to: h.id, toLabel: hireFirst, channel: 'Text', kind: 'todo', hireId: h.id, key: s.key, title: s.state === 'late' ? `Reminder: ${label}` : `New for you: ${label}`, body: `${s.def.hire?.minutes ? `About ${s.def.hire.minutes} minutes. ` : ''}${s.label}.`, actions: [{ kind: 'open', label: 'Open', by: h.id }] })
    }
    if (v.by.laptop_ship?.ver === now) add({ to: h.id, toLabel: hireFirst, channel: 'Email', kind: 'fyi', hireId: h.id, title: 'Your laptop is on its way', body: 'It arrives set up. On day one you just sign in.', actions: [{ kind: 'open', label: 'Track it', by: h.id }] })
    for (const c of st.dateChanges.filter((c) => c.hireId === h.id && c.day === now)) {
      add({ to: h.id, toLabel: hireFirst, channel: 'Email', kind: 'fyi', hireId: h.id, key: `date:${c.to}`, title: `Your start date is now ${fmtShort(c.to)}`, body: 'Everything in Day One has moved with it.', actions: [{ kind: 'open', label: 'Open Day One', by: h.id }] })
      add({ to: mgr, toLabel: first(mgr), channel: 'Slack', kind: 'fyi', hireId: h.id, key: `date:${c.to}`, title: `${hireFirst}'s start moved to ${fmtShort(c.to)}`, body: 'Your prep due dates moved with it.', actions: [{ kind: 'open', label: 'Open', by: mgr }] })
    }
    const hellos = st.boards[h.id]?.status === 'live' ? st.boards[h.id].posts.filter((p) => p.day === now) : []
    if (hellos.length) add({ to: h.id, toLabel: hireFirst, channel: 'Email', kind: 'fyi', hireId: h.id, key: 'hellos', title: `${hellos.length} new hello${hellos.length > 1 ? 's' : ''} on your welcome board`, body: `From ${hellos.map((p) => first(p.author)).join(', ')}.`, actions: [{ kind: 'open', label: 'Watch', by: h.id }] })

    // Managers: their to-dos with the real action, and FYIs when the hire is at risk or withdraws.
    for (const s of v.steps.filter((x) => x.holder?.kind === 'person' && x.holder.id === mgr && OPEN.includes(x.state) && (isNew(x, now) || x.red))) {
      const actions: PingAction[] = [{ kind: 'open', label: 'Open', by: mgr }]
      if (s.key === 'buddy' && h.buddyId) actions.unshift({ kind: 'buddy', label: `Pick ${first(h.buddyId)}`, by: mgr, arg: h.buddyId })
      add({ to: mgr, toLabel: first(mgr), channel: 'Slack', kind: 'todo', hireId: h.id, key: s.key, title: `${safeName(s, { role: 'manager' }, { action: true })} for ${hireFirst}`, body: s.label, actions })
    }
    if (h.withdrawn === now) add({ to: h.managerId, toLabel: first(h.managerId), channel: 'Slack', kind: 'fyi', hireId: h.id, key: 'withdrawn', title: `${hireFirst} withdrew`, body: 'Nothing needed from you. Open steps closed and messages stopped.', actions: [] })
    if (v.status === 'atrisk' && v.primary) {
      const p = v.primary
      const why = p.holder ? `Waiting on ${refName(p.holder)}: ${lc(p.label)}.` : p.label
      add({ to: mgr, toLabel: first(mgr), channel: 'Slack', kind: 'fyi', hireId: h.id, key: 'risk', title: `${hireFirst}'s start date is at risk`, body: `${why} Maria Hill is on it.`, actions: [{ kind: 'open', label: 'Open', by: mgr }] })
      add({ to: h.recruiterId, toLabel: first(h.recruiterId), channel: 'Slack', kind: 'fyi', hireId: h.id, key: 'risk', title: `${hireFirst}'s start date is at risk`, body: 'Hold off on promising the date until Maria confirms it.', actions: [{ kind: 'open', label: 'Open', by: h.recruiterId }] })
      add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', hireId: h.id, key: p.key, title: `${hireFirst} is at risk`, body: `${safeName(p, { role: 'program' })}: ${why}`, actions: p.holder?.kind === 'provider' ? [{ kind: 'chase', label: `Chase ${p.holder.name}`, by: 'maria', arg: p.holder.name }, { kind: 'open', label: 'Open', by: 'maria' }] : [{ kind: 'open', label: 'Open', by: 'maria' }] })
    }
    // An owner away with nobody covering: the onboarding team can hand it over in one tap.
    const away = v.steps.find((s) => s.ownerAway && s.red)
    const cover = coverFor(h.managerId, st.ooo, now)
    if (away && cover && st.ooo[h.managerId] && !st.ooo[h.managerId].delegate) add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', hireId: h.id, key: `away:${h.managerId}`, title: `${first(h.managerId)} is out and ${hireFirst}'s prep is slipping`, body: `${safeName(away, { role: 'program' }, { action: true })}: ${lc(away.label)}.`, actions: [{ kind: 'reassign', label: `Reassign to ${first(cover)}`, by: 'maria', arg: h.managerId }] })

    // Teams: a channel post per item that opens or runs late, with Take it and Done · today; late vendors get Chase.
    for (const s of v.steps) {
      if (s.holder?.kind === 'team' && OPEN.includes(s.state) && (isNew(s, now) || s.red)) {
        const team = s.holder.id as TeamId
        const claimed = st.claims[`${h.id}:${s.key}`]
        add({ to: team, toLabel: channelOf(team), channel: 'Slack', kind: 'todo', hireId: h.id, key: s.key, title: `${safeName(s, { role: 'team', team }, { action: true })} · ${v.person.name}`, body: `${s.label}${claimed ? ` · ${first(claimed)} has it` : ''}.`, actions: [...(claimed ? [] : [{ kind: 'take' as const, label: 'Take it', by: lead(team) }]), { kind: 'done', label: 'Done · today', by: claimed ?? lead(team) }] })
      }
      if (s.holder?.kind === 'provider' && s.holder.steward && s.red) {
        const team = s.holder.steward
        add({ to: team, toLabel: channelOf(team), channel: 'Slack', kind: 'todo', hireId: h.id, key: s.key, title: `${s.holder.name} is late on ${v.person.name}'s ${safeName(s, { role: 'team', team }).toLowerCase()}`, body: s.label, actions: [{ kind: 'chase', label: `Chase ${s.holder.name}`, by: lead(team), arg: s.holder.name }] })
      }
    }
  }

  // Outages go to the onboarding team once, not per step.
  for (const sys of Object.keys(st.down) as SystemId[]) {
    const n = Object.values(views).reduce((k, v) => k + v.steps.filter((s) => s.def.system === sys && s.state === 'unknown').length, 0)
    add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', key: `down:${sys}`, title: `${systemNames[sys]} isn't responding`, body: `${n} step${n === 1 ? '' : 's'} can't be checked. Hires see "updates are delayed".`, actions: [] })
  }

  // Nudges sent today land with whoever they name: a person, a team channel, or the vendor's support inbox.
  for (const n of st.nudges.filter((x) => x.day === now)) {
    const v = views[n.hireId]
    const step = v?.by[n.key]
    const person = Object.values(people).find((p) => p.name === n.to)
    const team = (Object.keys(teams) as TeamId[]).find((t) => teams[t].name === n.to)
    if (n.key.startsWith('start:')) {
      add({ to: 'maria', toLabel: 'Maria', channel: 'Slack', kind: 'todo', hireId: n.hireId, key: n.key, title: `${first(n.by)} proposes starting ${v?.person.name.split(' ')[0]} on ${fmtShort(Number(n.key.slice(6)))}`, body: 'The earliest date the start-date check says is safe.', actions: [{ kind: 'open', label: 'Review', by: 'maria' }] })
      continue
    }
    const what = step ? safeName(step, { role: person?.role ?? 'team', team: team ?? person?.team }, { action: true }) : n.key
    add({ to: person?.id ?? team ?? n.to, toLabel: person ? first(person.id) : team ? channelOf(team) : `${n.to} support`, channel: person || team ? 'Slack' : 'Email', kind: 'todo', hireId: n.hireId, key: `nudge:${n.key}`, title: `${first(n.by)} nudged you: ${what}`, body: `For ${v?.person.name ?? n.hireId}. ${step?.label ?? ''}`, actions: [{ kind: 'open', label: 'Open', by: person?.id ?? (team ? lead(team) : 'maria') }] })
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
