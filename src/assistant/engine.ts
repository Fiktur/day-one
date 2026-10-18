import { lc } from '../lib/cn'
import { people } from '../data/people'
import { SESSIONS, PLANNED_STARTS, groupFor, EXTRA_ATTENDEES } from '../data/cohorts'
import { LEAD_TIMES } from '../data/history'
import { HIRES } from '../data/hires'
import { addBiz, fmtDay, fmtLong, fmtShort, fmtWeekdayShort, nextWeekday, rel } from '../lib/dates'
import { useDemo } from '../engine/store'
import { selectViews, ctxOf } from '../engine/selectors'
import { STATUS_LABEL, managerFor, refName, safeName, type HireView } from '../engine/derive'
import { queueFor } from '../engine/queues'
import { messagesFor } from '../engine/messages'
import { checkDates, hypothetical } from '../engine/startcheck'
import { buddyOf } from '../hire/helpers'
import { clockTime, entry } from '../engine/log'

export interface AssistantAction {
  label: string
  run: () => string | void
}

export interface AssistantReply {
  text: string
  steps?: { label: string; ok: boolean }[]
  bullets?: string[]
  sources?: string[]
  note?: string
  actions?: AssistantAction[]
}

const S = () => useDemo.getState()
const first = (id: string) => people[id]?.name.split(' ')[0] ?? id
const hhmm = () => clockTime()

export function suggestionsFor(viewer: string): string[] {
  const role = people[viewer]?.role
  switch (role) {
    case 'hire':
      return ["What's left for me to do?", 'When will my laptop arrive?', 'Change my laptop delivery address', 'What happens on my first day?', 'Is my background check done?', 'How do benefits work?']
    case 'manager':
      return ['What do I need to do this week?', 'Is Virgil on track for Nov 2?', 'Draft my welcome message for Virgil', 'Could Peter start a week earlier?']
    case 'recruiter':
      return ['Where is Wanda in the process?', 'Is Nov 16 realistic for a Lisbon hire?', 'Who starts in the next two weeks?']
    case 'program':
      return ['Who is at risk for Nov 2?', 'Why is Hal at risk?', 'What messages go out tomorrow?', 'How many orientation seats are left?']
    case 'team':
      return ['What can I start on today?', 'Which laptops must ship this week?', 'What is late?']
    case 'head':
      return ['Can we handle the November hiring plan?', 'Where are we losing the most time?', 'Who is at risk right now?']
    default:
      return []
  }
}

function findHire(text: string, fallback?: string): HireView | null {
  const views = selectViews(S())
  const t = text.toLowerCase()
  for (const h of HIRES) {
    const n = people[h.id].name.toLowerCase()
    if (t.includes(n.split(' ')[0]) || t.includes(n.split(' ')[1])) return views[h.id]
  }
  return fallback ? views[fallback] : null
}

function laptopStatus(v: HireView, now: number): { text: string; when: number | null } {
  const b = v.by
  if (!b.laptop_release) return { text: 'Your returned laptop is being reissued', when: null }
  if (b.laptop_received?.state === 'verified') return { text: 'It has arrived', when: b.laptop_received.ver }
  if (b.laptop_deliver?.state === 'verified') return { text: `It was delivered on ${fmtDay(b.laptop_deliver.ver!)}`, when: b.laptop_deliver.ver }
  if (b.laptop_ship?.state === 'verified') return { text: `It's on its way and should arrive ${rel(b.laptop_deliver?.ver ?? now + 3, now)}`, when: b.laptop_deliver?.ver ?? null }
  if (b.laptop_prep?.eta != null && b.laptop_prep.state !== 'verified') return { text: `It's taking longer than usual. The new estimate is ${fmtDay(b.laptop_deliver?.ver ?? b.laptop_prep.eta)}`, when: b.laptop_deliver?.ver ?? null }
  if (b.laptop_release?.state === 'verified') return { text: `It's being prepared now and should arrive around ${fmtDay(b.laptop_deliver?.ver ?? now + 5)}`, when: b.laptop_deliver?.ver ?? null }
  return { text: `It ships after your background check. Based on recent hires, it should arrive around ${fmtDay(b.laptop_deliver?.ver ?? now + 8)}`, when: b.laptop_deliver?.ver ?? null }
}

function hireReply(viewer: string, q: string): AssistantReply {
  const s = S()
  const now = s.now
  const v = selectViews(s)[viewer]
  const t = q.toLowerCase()
  const h = v.hire
  const buddy = buddyOf(v)

  if (/(change|update|different|new).*(address|deliver)|deliver.*(somewhere|elsewhere|address)/.test(t)) {
    const shipped = v.by.laptop_ship?.state === 'verified'
    if (!shipped) {
      const newAddr = h.id === 'virgil' ? '1830 W Division St, Chicago, IL' : 'your new address'
      s.addLog(entry(now, hhmm(), 'firstbase', 'order.updated', `${v.person.name} · delivery address changed by the assistant · confirmed`, 'ok', v.person.name))
      s.set({ addresses: { ...s.addresses, [h.id]: newAddr } })
      return {
        text: "Yes. Your laptop hasn't shipped yet, so I changed the address for you.",
        steps: [
          { label: 'Checked your laptop order: not shipped yet', ok: true },
          { label: 'Updated the delivery address in Firstbase', ok: true },
          { label: `Firstbase confirmed the change at ${clockTime().slice(0, 5)} am`, ok: true },
        ],
        bullets: [`New address: ${newAddr}`],
        sources: ['Firstbase · laptop order', 'Day One · your details'],
        note: 'Only you and IT can see your delivery address. Day One deletes it 30 days after your laptop arrives.',
      }
    }
    s.addRequest(h.id, 'Change laptop delivery address after shipping', 'felicity')
    return {
      text: "Your laptop has already shipped, so I can't change the address myself. I've sent IT a change request with everything they need.",
      steps: [
        { label: 'Checked your laptop order: already shipped', ok: true },
        { label: 'Created a request for IT with your order and new address', ok: true },
        { label: 'Felicity Smoak will reply within one business day', ok: true },
      ],
      sources: ['Firstbase · shipment', 'IT service desk'],
      note: "You'll see the request on your Help tab.",
    }
  }
  if (/left|to do|todo|need to do|what.*(do|finish)/.test(t)) {
    const mine = v.hireTasks.filter((x) => x.state === 'open' || x.state === 'soon' || x.state === 'late')
    const next = v.hireTasks.filter((x) => x.state === 'blank' && x.def.stage <= 4).sort((a, b) => (a.open ?? 99) - (b.open ?? 99))[0]
    return {
      text: mine.length ? `You have ${mine.length} thing${mine.length > 1 ? 's' : ''} to do right now.` : "Nothing needs you right now. You're all set.",
      bullets: [
        ...mine.map((x) => `${x.def.hire?.label ?? x.name} · ${lc(x.label)}${x.def.hire?.minutes ? ` · about ${x.def.hire.minutes} min` : ''}`),
        ...(next ? [`Next up: ${next.def.hire?.label ?? next.name}, ${lc(next.label)}`] : []),
      ],
      sources: ['Day One · your tasks', 'Workday · your tasks'],
    }
  }
  if (/laptop/.test(t)) {
    const l = laptopStatus(v, now)
    return { text: `${l.text}.`, bullets: [`Model: ${s.laptopModel[h.id] ?? h.laptop.model}`, `Delivering to: ${s.addresses[h.id] ?? h.laptop.address}`], sources: ['Firstbase · laptop order'], note: 'It arrives set up. On day one you just sign in.' }
  }
  if (/first day|day one|monday|orientation|start/.test(t)) {
    const sess = SESSIONS.find((x) => x.day === h.start && x.group === groupFor(h))
    return {
      text: `Your first day is ${fmtWeekdayShort(h.start)}. Here's how it goes:`,
      bullets: [
        'Sign in with your new work account. Your laptop is already set up.',
        `${sess ? sess.time.split('–')[0] : '9:00 am'}: orientation${sess ? `, ${sess.where.toLowerCase()}` : ''}, with the rest of your start group`,
        `1:00 pm: first 1:1 with ${first(managerFor(h, ctxOf(s)).id)}`,
        buddy ? `Day two: coffee with your buddy, ${people[buddy].name}` : 'Your manager will introduce you to the team',
      ],
      sources: ['Day One · your first week', 'Calendar · orientation invite'],
    }
  }
  if (/background|check|screen/.test(t)) {
    const c = v.by.clearance
    const b = v.by.bg_complete
    const text = c?.state === 'verified' ? 'Yes, your background check is complete. There’s nothing you need to do.'
      : b?.state === 'unknown' ? "It's still in progress. Checkr's updates are delayed right now, so we'll refresh it as soon as they're back."
      : v.by.consent?.state !== 'verified' ? 'It starts once you give consent in Checkr. That’s on your task list.'
      : 'It’s in progress with Checkr. There’s nothing you need to do, and most finish within a week.'
    return { text, sources: ['Checkr · status only'], note: "I can see the status, not the results. Only the screening team can see results." }
  }
  if (/benefit|insurance|401|health|dental|vision/.test(t)) {
    return {
      text: 'You choose your benefits on the benefits site, starting on your first day. You have 30 days.',
      bullets: ['Medical, dental and vision: three plans, Northbeam covers most of the premium', '401(k): 4% match from day one', 'Time off: flexible, with a 15-day minimum we encourage', 'Learning: $1,500 a year'],
      sources: ['Benefits guide 2026', 'Company and benefits page'],
    }
  }
  if (/buddy|team|who/.test(t)) {
    return { text: buddy ? `Your buddy is ${people[buddy].name}. You'll have coffee on day two.` : 'Your manager is picking your buddy and will introduce you to the team in week one.', sources: ['Day One · your people'] }
  }
  if (/person|human|talk|someone/.test(t)) {
    s.addRequest(h.id, q, 'maria')
    return { text: "I've passed this to Maria Hill on the onboarding team, with our conversation so far. She'll reply here, usually the same day.", steps: [{ label: 'Request created for the onboarding team', ok: true }] }
  }
  return fallback()
}

function managerReply(viewer: string, q: string): AssistantReply {
  const s = S()
  const now = s.now
  const views = selectViews(s)
  const t = q.toLowerCase()
  const mineHires = Object.values(views).filter((v) => managerFor(v.hire, ctxOf(s)).id === viewer || v.hire.managerId === viewer)
  if (/draft|welcome message|write/.test(t)) {
    const v = findHire(q, mineHires[0]?.hire.id) ?? mineHires[0]
    if (!v) return fallback()
    const draft = `Hi ${first(v.hire.id)}, I'm really glad you're joining us. Your first project is the edge routing rollout, and you'll pair with ${buddyOf(v) ? first(buddyOf(v)!) : 'the team'} on it. Your first week is planned, and I've kept Wednesday afternoon free so we can talk properly. See you ${fmtWeekdayShort(v.hire.start)}. ${first(viewer)}`
    return {
      text: `Here's a draft for ${first(v.hire.id)}. It sends ${fmtDay(v.hire.start - 7)} in your name unless you change it.`,
      bullets: [draft],
      actions: [{ label: 'Use this draft', run: () => { S().editMessage(v.hire.id, 'manager_welcome', draft, viewer); return 'Saved. It will send in your name.' } }],
      sources: ['Your welcome message', `${first(v.hire.id)}'s first-week plan`],
    }
  }
  if (/earlier|sooner|move.*start|start.*(earlier|later|week)/.test(t)) {
    const v = findHire(q, mineHires[0]?.hire.id)
    if (!v) return fallback()
    const target = v.hire.start - 7
    const res = checkDates(v.hire, ctxOf(s), 8, s.extraSessions).find((d) => d.day === target)
    if (!res) return { text: `${fmtDay(target)} is too close to plan for.` }
    return {
      text: res.verdict === 'safe' ? `Yes. ${first(v.hire.id)} could start ${fmtDay(target)}.` : `Not safely. Starting ${fmtDay(target)} is ${res.verdict === 'no' ? 'not achievable' : 'at risk'}.`,
      bullets: [res.reason],
      sources: ['Start-date check', 'Lead times from the last 62 hires'],
      note: 'A recruiter or Maria Hill confirms any date change, and Day One re-plans everything after it.',
    }
  }
  if (/on track|ready|status|how is/.test(t)) {
    const v = findHire(q, mineHires[0]?.hire.id)
    if (!v) return fallback()
    const p = v.primary
    return {
      text: v.status === 'unknown' ? `${first(v.hire.id)}'s status for ${fmtDay(v.hire.start)} is unclear: a system can't be checked right now.` : `${first(v.hire.id)} is ${lc(STATUS_LABEL[v.status])} for ${fmtDay(v.hire.start)}.`,
      bullets: [
        ...v.areas.map((a) => `${a.label}: ${a.state === 'green' ? 'done' : a.state === 'red' ? 'needs attention' : a.state === 'unknown' ? "can't check right now" : `${a.done} of ${a.total} done`}`),
        ...(p?.holder ? [`Right now: waiting on ${refName(p.holder)} (${lc(safeName(p, { role: 'manager' }))}, ${lc(p.label)})`] : []),
      ],
      sources: ['Day One · readiness'],
      note: 'You see summaries for screening and immigration, not details.',
    }
  }
  // default: this week
  const q2 = queueFor(views, { person: viewer }, now)
  const week = q2.move
  const coming = q2.coming.filter((x) => (x.step.open ?? 99) <= now + 7)
  return {
    text: week.length ? `You have ${week.length} thing${week.length > 1 ? 's' : ''} to do.` : 'Nothing needs you right now.',
    bullets: [
      ...week.map((x) => `${x.step.name} for ${first(x.view.hire.id)} · ${lc(x.step.label)}`),
      ...coming.slice(0, 3).map((x) => `Coming up: ${x.step.name} for ${first(x.view.hire.id)}, ${lc(x.step.label)}`),
    ],
    sources: ['Day One · your moves'],
  }
}

function programReply(viewer: string, q: string): AssistantReply {
  const s = S()
  const now = s.now
  const views = selectViews(s)
  const t = q.toLowerCase()
  if (/why/.test(t)) {
    const v = findHire(q, 'hal')!
    const p = v.balls.find((b) => b.red) ?? v.primary
    if (!p) return { text: `${first(v.hire.id)} isn't at risk right now.` }
    const fixes: AssistantAction[] = []
    if (v.hire.id === 'hal' && v.by.laptop_prep?.eta != null && v.by.laptop_prep.state !== 'verified') {
      fixes.push({ label: 'Switch to an in-stock model', run: () => { S().speedUp('hal', 'laptop_prep', 1); S().set({ laptopModel: { ...S().laptopModel, hal: 'MacBook Pro 14" (in stock)' } }); return 'Done. Firstbase confirmed an in-stock MacBook Pro 14". Hal is back on track.' } })
      fixes.push({ label: 'Move start to Nov 9', run: () => { S().setDialog({ type: 'changeDate', hireId: 'hal', to: v.hire.start + 7 }) } })
    }
    return {
      text: `${first(v.hire.id)} is at risk because ${p.name.toLowerCase()} is ${lc(p.label)}.`,
      bullets: [
        `Waiting on ${p.holder ? refName(p.holder) : 'the owner'}${p.heldSince != null ? ` since ${fmtDay(p.heldSince)}` : ''}.`,
        v.forecastEnd != null ? `Forecast: the last critical step finishes ${fmtDay(v.forecastEnd)}, ${v.forecastEnd >= v.hire.start ? 'after' : 'before'} the start date (${fmtDay(v.hire.start)}).` : 'The forecast is waiting on a decision.',
        ...(v.hire.id === 'hal' ? ['Options: an in-stock model ships in 1–2 days; local pickup in San Diego; or move the start a week.'] : []),
      ],
      actions: fixes,
      sources: ['Hire record · steps and forecast', 'Firstbase · order status'],
      note: 'I can suggest changes. A date change needs your confirmation and the manager’s approval.',
    }
  }
  if (/risk|trouble|problem|attention/.test(t)) {
    const list = Object.values(views).filter((v) => v.status === 'atrisk' || v.status === 'behind' || v.status === 'unknown')
    return {
      text: list.length ? `${list.length} hire${list.length > 1 ? 's need' : ' needs'} attention.` : 'Nobody is at risk right now.',
      bullets: list.map((v) => `${v.person.name} (${fmtShort(v.hire.start)}): ${(v.balls.find((b) => b.red) ?? v.primary)?.name.toLowerCase() ?? 'status unknown'}, ${(v.balls.find((b) => b.red) ?? v.primary)?.label.toLowerCase() ?? ''}`),
      sources: ['Command center'],
    }
  }
  if (/message|tomorrow|going out|send/.test(t)) {
    const day = nextWeekday(now + 1)
    const msgs = Object.values(views).flatMap((v) => messagesFor(v, ctxOf(s), s.msgEdits)).filter((m) => m.day === day && m.status === 'scheduled')
    return { text: msgs.length ? `${msgs.length} message${msgs.length > 1 ? 's go' : ' goes'} out ${rel(day, now)}.` : `Nothing is scheduled for ${rel(day, now)}.`, bullets: msgs.map((m) => `${m.subject} → ${people[m.hireId].name} · from ${m.from}`), sources: ['Messages timeline'] }
  }
  if (/seat|orientation|capacity/.test(t)) {
    return {
      text: 'Orientation seats for the next sessions:',
      bullets: SESSIONS.filter((x) => x.day >= now).slice(0, 6).map((x) => {
        const taken = Object.values(views).filter((v) => v.hire.start === x.day && groupFor(v.hire) === x.group && v.status !== 'withdrawn').length + (EXTRA_ATTENDEES[x.id] ?? 0)
        return `${fmtShort(x.day)} · ${x.group}: ${x.seats - taken} of ${x.seats} left`
      }),
      sources: ['Cohorts and sessions'],
    }
  }
  return fallback()
}

function recruiterReply(viewer: string, q: string): AssistantReply {
  const s = S()
  const views = selectViews(s)
  const t = q.toLowerCase()
  if (/realistic|nov|date|lisbon|london/.test(t)) {
    const target = 42
    const h = hypothetical({ location: /london/.test(t) ? 'london' : 'lisbon', workAuth: true, now: s.now })
    const res = checkDates(h, ctxOf(s), 8, s.extraSessions).find((d) => d.day === target)
    return {
      text: res?.verdict === 'safe' ? 'Yes, Nov 16 works.' : `Nov 16 is ${res?.verdict === 'no' ? 'not achievable' : 'risky'} for a Lisbon hire who needs a work permit.`,
      bullets: [res?.reason ?? '', 'Work permits for Portugal take a median of 31 days (last 9 cases).', 'Without a permit, the earliest safe date would be about 3 weeks from offer.'],
      sources: ['Start-date check', 'Lead times'],
    }
  }
  if (/next two weeks|who starts|starting/.test(t)) {
    const list = Object.values(views).filter((v) => v.hire.start >= s.now && v.hire.start <= s.now + 21 && v.status !== 'withdrawn')
    return { text: `${list.length} people start in the next three weeks.`, bullets: list.map((v) => `${v.person.name} · ${fmtShort(v.hire.start)} · ${lc(STATUS_LABEL[v.status])}`), sources: ['Candidates'] }
  }
  const v = findHire(q, 'wanda')!
  return {
    text: `${v.person.name} is in ${['the offer stage', 'set-up', 'clearances', 'equipment and access', 'the final week', 'day one', 'the first 90 days'][v.stage]}.`,
    bullets: [
      v.primary?.holder ? `Waiting on ${refName(v.primary.holder)}: ${lc(safeName(v.primary, { role: 'recruiter' }))}, ${lc(v.primary.label)}` : 'Nothing is waiting on anyone right now',
      v.dateMoved ? `Start date moved to ${fmtDay(v.hire.start)} (was ${fmtDay(v.hire.originalStart)})` : `Starts ${fmtDay(v.hire.start)}`,
    ],
    sources: ['Candidates'],
    note: 'You see stage and dates for screening and immigration, not details.',
  }
}

function teamReply(viewer: string, q: string): AssistantReply {
  const s = S()
  const views = selectViews(s)
  const p = people[viewer]
  const t = q.toLowerCase()
  const qu = queueFor(views, { team: p.team }, s.now)
  if (/ship|laptop/.test(t)) {
    const list = Object.values(views).filter((v) => v.by.laptop_ship && v.by.laptop_ship.state !== 'verified' && v.status !== 'withdrawn' && v.hire.start > s.now)
    return {
      text: 'Ship-by dates for upcoming starts:',
      bullets: list.map((v) => `${v.person.name}: ship by ${fmtDay(addBiz(v.hire.start - 7, 0))} · ${v.by.laptop_prep?.state === 'blank' ? 'not released yet' : v.by.laptop_prep?.label.toLowerCase()}`),
      sources: ['Firstbase', 'Start dates'],
    }
  }
  const late = /late/.test(t)
  const items = late ? qu.move.filter((x) => x.step.red) : qu.move
  return {
    text: items.length ? `${items.length} item${items.length > 1 ? 's' : ''} ${late ? 'are late or about to be' : 'are ready for you'}.` : 'Nothing is waiting on your team right now.',
    bullets: items.map((x) => `${x.view.person.name}: ${x.step.name} · ${lc(x.step.label)}`),
    sources: ['Team queue'],
  }
}

function headReply(viewer: string, q: string): AssistantReply {
  const s = S()
  const t = q.toLowerCase()
  if (/time|lose|slow|where/.test(t)) {
    return { text: 'The biggest waits in the last 90 days:', bullets: LEAD_TIMES.slice(0, 4).map((l) => `${l.label}: median ${l.median} business days (${l.owner})`), sources: ['Insights · lead times'], note: 'Workday confirmations are the easiest win: HR Operations checks three task types by hand.' }
  }
  if (/risk/.test(t)) return programReply(viewer, q)
  const over = PLANNED_STARTS.map((w) => ({ ...w, seats: w.seats + (s.extraSessions.includes(w.day) ? 12 : 0) })).filter((w) => w.planned > w.seats)
  return {
    text: over.length ? `Mostly. ${over.length === 1 ? 'One week needs' : `${over.length} weeks need`} more orientation capacity.` : 'Yes. Seats, IT capacity and equipment stock cover the November plan.',
    bullets: over.map((w) => `Week of ${fmtShort(w.day)}: ${w.planned} planned starts, ${w.seats} seats`),
    actions: over.filter((w) => w.seats > 0).map((w) => ({ label: `Add a session the week of ${fmtShort(w.day)}`, run: () => { S().addSession(w.day); return 'Added. That week is now covered.' } })),
    sources: ['Insights · capacity', 'Headcount plan'],
  }
}

function fallback(): AssistantReply {
  return { text: "I don't have a good answer for that in this demo. Try one of the suggestions below, or ask to talk to a person." }
}

export function respond(viewer: string, q: string): AssistantReply {
  const role = people[viewer]?.role
  try {
    switch (role) {
      case 'hire': return hireReply(viewer, q)
      case 'manager': return managerReply(viewer, q)
      case 'program': return programReply(viewer, q)
      case 'recruiter': return recruiterReply(viewer, q)
      case 'team': return teamReply(viewer, q)
      case 'head': return headReply(viewer, q)
    }
  } catch {
    return fallback()
  }
  return fallback()
}

export { fmtLong }
