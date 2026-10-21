import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../lib/cn'
import { useDemo } from '../engine/store'
import { selectViews, ctxOf } from '../engine/selectors'
import { deriveHire } from '../engine/derive'
import { messagesFor } from '../engine/messages'
import { checkDates } from '../engine/startcheck'
import { SESSIONS, groupFor } from '../data/cohorts'
import { people } from '../data/people'
import { fmtDay, fmtShort } from '../lib/dates'
import { Button, Glyph, Pill, ReqTag } from '../ui/parts'
import { Modal } from '../ui/overlay'

export function ChangeDateDialog() {
  const dialog = useDemo((s) => s.dialog)
  if (dialog?.type !== 'changeDate') return null
  return <Inner hireId={dialog.hireId} initial={dialog.to} />
}

function Inner({ hireId, initial }: { hireId: string; initial?: number }) {
  const s = useDemo()
  const ctx = ctxOf(s)
  const v = selectViews(s)[hireId]
  const options = useMemo(() => checkDates(v.hire, ctx, 8, s.extraSessions), [v.hire, ctx, s.extraSessions])
  const [to, setTo] = useState<number>(initial ?? options.find((o) => o.verdict === 'safe')?.day ?? v.hire.start + 7)
  const approver = v.hire.managerId
  const close = () => s.setDialog(null)
  useEffect(() => { toast.dismiss() }, [])

  const impact = useMemo(() => {
    const next = deriveHire({ ...v.hire, start: to }, ctx)
    const replanned = v.steps.filter((st) => st.state !== 'verified' && st.state !== 'na' && next.by[st.key] && next.by[st.key].due !== st.due).length
    const before = messagesFor(v, ctx, s.msgEdits)
    const after = messagesFor(next, ctx, s.msgEdits)
    const moved = after.filter((m) => m.status === 'scheduled' && before.find((b) => b.key === m.key)?.day !== m.day).length
    const sentWithDate = before.filter((m) => m.status === 'sent' && m.template.trigger.type === 'rel')
    const oldSession = SESSIONS.find((x) => x.day === v.hire.start && x.group === groupFor(v.hire))
    const newSession = SESSIONS.find((x) => x.day === to && x.group === groupFor(v.hire))
    const verdict = options.find((o) => o.day === to)
    return { replanned, moved, sentWithDate, oldSession, newSession, verdict, risk: next.risk, end: next.forecastEnd }
  }, [to, v, ctx, s.msgEdits, options])

  return (
    <Modal
      open
      onOpenChange={(o) => !o && close()}
      title={`Change ${v.person.name.split(' ')[0]}’s start date`}
      description="See what changes before you confirm. Day One re-plans everything after it, and tells everyone affected."
      width="max-w-2xl"
      footer={
        <>
          <span className="mr-auto text-xs text-muted">Confirm once {people[approver].name} agrees. Recorded on the hire’s history. <ReqTag ids="O8 O9" /></span>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" disabled={to === v.hire.start || impact.verdict?.verdict === 'no'} title={impact.verdict?.verdict === 'no' ? 'Not achievable: pick a date marked Safe or At risk' : undefined} onClick={() => {
            s.changeStart(hireId, to, 'maria', approver)
            toast.success(`${v.person.name}’s start date is now ${fmtDay(to)}`, { description: `${impact.replanned} steps re-planned · ${impact.moved} messages moved · agreed with ${people[approver].name}` })
            close()
          }}>Confirm new date</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-[13px]">
          <span className="rounded-lg bg-sunken px-3 py-2 font-medium">{fmtDay(v.hire.start)}</span>
          <ArrowRight className="h-4 w-4 text-muted" />
          <span className="rounded-lg bg-accent-soft px-3 py-2 font-semibold text-accent">{fmtDay(to)}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {options.map((o) => (
            <button key={o.day} type="button" onClick={() => setTo(o.day)} className={cn('rounded-lg border px-2.5 py-2 text-left text-[12px]', to === o.day ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-faint')}>
              <div className="font-semibold tnum">{fmtShort(o.day)}</div>
              <div className="mt-0.5 flex items-center gap-1"><Glyph state={o.verdict === 'safe' ? 'verified' : o.verdict === 'risk' ? 'open' : 'late'} size={9} /><span className="text-muted">{o.verdict === 'safe' ? 'Safe' : o.verdict === 'risk' ? 'At risk' : 'Not achievable'}</span></div>
            </button>
          ))}
        </div>
        {impact.verdict && <p className={cn('text-[13px]', impact.verdict.verdict === 'safe' ? 'text-green' : 'text-red')}>{impact.verdict.reason}</p>}
        <div className="rounded-xl border border-line">
          <div className="border-b border-line bg-bg px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-faint">What changes</div>
          <ul className="divide-y divide-line text-[13px]">
            <li className="flex items-center gap-2 px-3 py-2"><Check className="h-4 w-4 text-green" /><span className="flex-1">Steps re-planned to the new date</span><Pill>{impact.replanned}</Pill></li>
            <li className="flex items-center gap-2 px-3 py-2"><Check className="h-4 w-4 text-green" /><span className="flex-1">Scheduled messages moved</span><Pill>{impact.moved}</Pill></li>
            <li className="flex items-center gap-2 px-3 py-2"><Check className="h-4 w-4 text-green" /><span className="flex-1">Orientation: {impact.oldSession ? `${fmtShort(impact.oldSession.day)} ${impact.oldSession.group}` : 'current seat'} → {impact.newSession ? `${fmtShort(impact.newSession.day)} ${impact.newSession.group}` : 'remote session that week'}</span></li>
            <li className="flex items-center gap-2 px-3 py-2"><Check className="h-4 w-4 text-green" /><span className="flex-1">Done work stays done: {v.steps.filter((x) => x.state === 'verified').length} completed steps are kept, not repeated</span></li>
          </ul>
        </div>
        <div className="rounded-xl border border-amber/50 bg-amber-soft/50">
          <div className="border-b border-amber/30 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-amber-ink">Can’t be undone automatically</div>
          <ul className="space-y-1.5 px-3 py-2 text-[13px]">
            {impact.sentWithDate.length > 0 ? impact.sentWithDate.map((m) => (
              <li key={m.key} className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" />“{m.subject}” already went out with the old date. A short correction will be sent.</li>
            )) : <li className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" />No messages with the old date have gone out yet.</li>}
            {v.by.laptop_release?.state === 'verified' && <li className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" />The laptop order is already with Firstbase. Delivery will be re-timed, not re-ordered.</li>}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
