import { FROM_LABEL, MSG_TEMPLATES, type MsgTemplate } from '../data/messages'
import { people } from '../data/people'
import { prevWeekday } from '../lib/dates'
import { managerFor, type DeriveCtx, type HireView } from './derive'

export type MsgStatus = 'sent' | 'scheduled' | 'stopped' | 'waiting' | 'skipped'

export interface MsgInstance {
  key: string
  hireId: string
  template: MsgTemplate
  day: number | null
  expected: number | null
  status: MsgStatus
  movedFrom: number | null
  from: string
  fromId: string | null
  channel: 'Personal email' | 'Work email'
  subject: string
  body: string
  edited: { text: string; by: string } | null
  editableUntil: number | null
}

export function messagesFor(v: HireView, ctx: DeriveCtx, edits: Record<string, { text: string; by: string }>): MsgInstance[] {
  const h = v.hire
  const now = ctx.now
  const first = v.person.name.split(' ')[0]
  const mgr = managerFor(h, ctx).id
  const mgrFirst = people[mgr]?.name.split(' ')[0] ?? 'Your manager'
  const out: MsgInstance[] = []

  for (const t of MSG_TEMPLATES) {
    if (t.when && !t.when(h)) continue
    let day: number | null = null
    let expected: number | null = null
    let movedFrom: number | null = null
    if (t.trigger.type === 'offer') day = h.offer
    else if (t.trigger.type === 'rel') {
      day = prevWeekday(h.start + t.trigger.rel)
      if (h.originalStart !== h.start) {
        const was = prevWeekday(h.originalStart + t.trigger.rel)
        if (was !== day) movedFrom = was
      }
    } else {
      const st = v.by[t.trigger.step]
      if (st?.ver != null && st.ver <= now) day = st.ver
      else expected = st?.ver ?? null
    }

    let status: MsgStatus
    if (h.withdrawn != null && (day == null || day >= h.withdrawn)) status = 'stopped'
    else if (day == null) status = 'waiting'
    else if (day <= now) status = 'sent'
    else status = 'scheduled'

    if (t.id === 'digest' && day != null && day <= now) {
      const due = v.hireTasks.filter((s) => s.due != null && s.due >= day! && s.due <= day! + 7 && !(s.ver != null && s.ver <= day!))
      if (!due.length && status !== 'stopped') status = 'skipped'
    }
    if (t.id === 'benefits' && day != null && day <= now && v.by.benefits?.ver != null && v.by.benefits.ver <= day) status = 'skipped'

    let fromId: string | null = null
    let from = FROM_LABEL[t.from]
    if (t.from === 'manager') { fromId = mgr; from = people[mgr]?.name ?? from }
    if (t.from === 'buddy' && h.buddyId) { fromId = h.buddyId; from = people[h.buddyId]?.name ?? from }
    if (t.from === 'company') fromId = 'pepper'
    if (t.from === 'program') fromId = 'maria'

    const edited = edits[`${h.id}:${t.id}`] ?? null
    out.push({
      key: `${h.id}:${t.id}`,
      hireId: h.id,
      template: t,
      day,
      expected,
      status,
      movedFrom,
      from,
      fromId,
      channel: day != null && day >= h.start ? 'Work email' : 'Personal email',
      subject: t.subject(first, mgrFirst),
      body: edited?.text ?? t.body(first, mgrFirst),
      edited,
      editableUntil: t.editableByManager != null ? prevWeekday(h.start + t.editableByManager) : null,
    })
  }
  return out.sort((a, b) => (a.day ?? a.expected ?? 999) - (b.day ?? b.expected ?? 999))
}
