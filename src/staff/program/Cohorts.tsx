import { useState } from 'react'
import { Plus, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { EXTRA_ATTENDEES, SESSIONS, groupFor, type Session } from '../../data/cohorts'
import { people } from '../../data/people'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, Button, Card, Glyph, Pill, ReqTag } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'
import { burst } from '../../ui/fx'
import { entry, clockTime } from '../../engine/log'

export function Cohorts() {
  const { compact } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const extra = useDemo((s) => s.extraSessions)
  const sessions: Session[] = [
    ...SESSIONS,
    ...extra.map((d, i) => ({ id: `x${i}`, day: d, group: 'Remote, Americas', title: 'Orientation (added)', time: '9:00 am–12:30 pm PT', where: 'Video call', seats: 12, host: 'maria', invitesSent: null, run: SESSIONS[0].run })),
  ].sort((a, b) => a.day - b.day)
  const [sel, setSel] = useState(sessions[0].id)
  const s = sessions.find((x) => x.id === sel) ?? sessions[0]
  const attendees = (x: Session) => Object.values(views).filter((v) => v.hire.start === x.day && groupFor(v.hire) === x.group && v.status !== 'withdrawn')
  const taken = (x: Session) => attendees(x).length + (EXTRA_ATTENDEES[x.id] ?? 0)
  const sentFor = useDemo((st) => st.invitesSentFor)
  const sent = (x: Session) => (x.invitesSent != null && x.invitesSent <= now) || sentFor[x.id] != null
  const speakers = useDemo((st) => st.speakers)
  const confirmed = (x: Session, r: Session['run'][number]) => r.confirmed || speakers.includes(`${x.id}:${r.time}`)
  // Invites go out 14 days before; a session needs Maria when they're due, a speaker is unconfirmed, or it's full.
  const needs = (x: Session) => [
    !sent(x) && now >= x.day - 14 && 'Invites due',
    x.run.some((r) => !confirmed(x, r)) && 'Speaker to confirm',
    taken(x) >= x.seats && 'Full',
  ].filter(Boolean) as string[]

  return (
    <Page>
      <PageHeader title="Cohorts and sessions" sub="Who starts together, where, and the orientation that welcomes them." tags={<ReqTag ids="O10 X4" />} />
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[300px_1fr]')}>
        <div className="space-y-2">
          {sessions.map((x) => {
            const t = taken(x)
            const full = t >= x.seats
            return (
              <button key={x.id} type="button" onClick={() => setSel(x.id)} className={cn('w-full rounded-xl border bg-surface p-3 text-left shadow-card', sel === x.id ? 'border-accent ring-1 ring-accent' : 'border-line')}>
                <div className="flex items-baseline justify-between gap-2"><span className="font-semibold">{fmtDay(x.day)}</span>{needs(x).length > 0 && <Pill tone={full ? 'red' : 'amber'}>{needs(x)[0]}{needs(x).length > 1 ? ` +${needs(x).length - 1}` : ''}</Pill>}</div>
                <div className="text-xs text-muted">{x.group}</div>
                <div className="mt-2 h-1.5 rounded-full bg-sunken"><div className={cn('h-full rounded-full', full ? 'bg-red' : 'bg-accent')} style={{ width: `${Math.min(100, (t / x.seats) * 100)}%` }} /></div>
                <div className="mt-1 text-[11px] text-muted tnum">{t} of {x.seats} seats</div>
              </button>
            )
          })}
          <Button className="w-full" onClick={() => useDemo.getState().addSession(42)}><Plus className="h-3.5 w-3.5" />Add a session</Button>
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{s.title} · {s.group}</h2>
                <p className="text-[13px] text-muted">{fmtDay(s.day)} · {s.time} · {s.where} · host {people[s.host]?.name}</p>
              </div>
              <div className="flex gap-2">
                {sent(s) && <Button onClick={() => toast.success('Reminder sent to people who haven’t replied')}>Remind</Button>}
                <Button variant={sent(s) ? 'ghost' : 'primary'} onClick={(e) => {
                  const st = useDemo.getState()
                  const resend = sent(s)
                  st.set({ invitesSentFor: { ...st.invitesSentFor, [s.id]: now } })
                  st.addLog(entry(now, clockTime(), 'calendar', resend ? 'invites.resent' : 'invites.sent', `${s.title} · ${fmtShort(s.day)} · ${attendees(s).length} hires`, 'ok'))
                  if (!resend) burst('small', e.currentTarget)
                  toast.success(`Invites ${resend ? 're' : ''}sent for ${fmtShort(s.day)}`, { description: 'Calendar invites with the link and agenda. RSVPs show here.' })
                }}><Send className="h-3.5 w-3.5" />{sent(s) ? 'Resend invites' : 'Send invites'}</Button>
              </div>
            </div>
          </Card>
          <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-2')}>
            <Card className="p-4">
              <h3 className="mb-2 font-semibold">Run of show</h3>
              <ol className="space-y-1">
                {s.run.map((r) => (
                  <li key={r.time + r.title} className={cn('grid grid-cols-[14px_48px_1fr_auto] items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]', !confirmed(s, r) && 'bg-amber-soft')}>
                    <Glyph state={confirmed(s, r) ? 'verified' : 'open'} size={12} />
                    <span className="font-mono text-xs text-muted">{r.time}</span>
                    <span className="min-w-0"><span className="block truncate">{r.title}</span><span className="block truncate text-xs text-muted">{r.who}{confirmed(s, r) ? '' : ' · speaker not confirmed'}</span></span>
                    {!confirmed(s, r) && <Button size="xs" variant="primary" onClick={(e) => { burst('small', e.currentTarget); const st = useDemo.getState(); st.set({ speakers: [...st.speakers, `${s.id}:${r.time}`] }); toast.success(`${r.who} confirmed for ${r.title}`, { description: `${fmtShort(s.day)} · ${s.group}` }) }}>Confirm speaker</Button>}
                  </li>
                ))}
              </ol>
            </Card>
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Attendees</h3><span className="text-xs text-muted tnum">{taken(s)} of {s.seats}</span></div>
              <div className="space-y-1">
                {attendees(s).map((v) => {
                  const r = v.by.orient_rsvp
                  return (
                    <div key={v.hire.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13px]">
                      <Avatar id={v.hire.id} size={22} />
                      <span className="flex-1 truncate">{v.person.name}</span>
                      <Pill tone={r?.state === 'verified' ? 'green' : r?.state === 'blank' && !sent(s) ? 'neutral' : 'accent'}>{r?.state === 'verified' ? 'Accepted' : r?.state === 'blank' && !sent(s) ? 'Invite not sent' : 'Invited'}</Pill>
                    </div>
                  )
                })}
                {(EXTRA_ATTENDEES[s.id] ?? 0) > 0 && <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-muted"><Users className="h-3.5 w-3.5" />{EXTRA_ATTENDEES[s.id]} more people from other teams</div>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  )
}
