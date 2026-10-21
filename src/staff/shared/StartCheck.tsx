import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews, ctxOf, useCtx } from '../../engine/selectors'
import { managerFor } from '../../engine/derive'
import { checkDates, hypothetical, type DateCheck } from '../../engine/startcheck'
import { fmtDay } from '../../lib/dates'
import { Avatar, Button, Card, Glyph, Pill, ReqTag } from '../../ui/parts'
import { toast } from 'sonner'
import { Page, PageHeader } from '../StaffShell'
import { Segmented } from '../../ui/motion'
import { Select } from '../../ui/overlay'

/** The one next move once the safe date is known: a recruiter copies it for the offer, a manager proposes it, Maria changes it. */
function ProposeDate({ day, hireId }: { day: number; hireId?: string }) {
  const { person, viewer } = useNav()
  const st = useDemo()
  const current = hireId ? st.hires[hireId]?.start : undefined
  if (hireId && current === day) return null
  if (person.role === 'program' && hireId) return <Button size="xs" variant="primary" onClick={() => st.setDialog({ type: 'changeDate', hireId, to: day })}>Move start to {fmtDay(day)}</Button>
  if (person.role === 'manager' && hireId) {
    const sent = st.nudges.some((n) => n.hireId === hireId && n.key === `start:${day}`)
    return <Button size="xs" variant="primary" disabled={sent} onClick={() => { st.nudge(hireId, `start:${day}`, 'Maria Hill', viewer); toast.success(`Proposed ${fmtDay(day)} to Maria Hill`, { description: 'She confirms the change; the hire hears from her, not from a system.' }) }}>{sent ? 'Proposed' : `Propose ${fmtDay(day)}`}</Button>
  }
  const text = `Start date: ${fmtDay(day)}. Day One's start-date check shows this date works with current lead times. The onboarding team confirms it once the offer is signed.`
  return <Button size="xs" variant="primary" onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); toast.success('Copied for the offer', { description: text }) }}>Copy for the offer</Button>
}

const VERDICT: Record<DateCheck['verdict'], { label: string; tone: 'green' | 'amber' | 'red' }> = {
  safe: { label: 'Safe', tone: 'green' },
  risk: { label: 'At risk', tone: 'amber' },
  no: { label: 'Not achievable', tone: 'red' },
}

export function StartCheck() {
  const { viewer, person, compact, route } = useNav()
  const views = useViews()
  const ctx = useCtx()
  const extra = useDemo((s) => s.extraSessions)
  const mine = Object.values(views).filter((v) => v.status !== 'started' && v.status !== 'withdrawn' && (person.role !== 'manager' || managerFor(v.hire, ctx).id === viewer || v.hire.managerId === viewer))
  const [mode, setMode] = useState<'hire' | 'new'>(person.role === 'recruiter' ? 'new' : 'hire')
  const [hireId, setHireId] = useState(mine.find((m) => m.hire.id === (route.hireId ?? 'wanda'))?.hire.id ?? mine[0]?.hire.id)
  const [loc, setLoc] = useState<'remote' | 'nyc' | 'chicago' | 'lisbon' | 'london'>('lisbon')
  const [auth, setAuth] = useState(true)

  const results = useMemo(() => {
    if (mode === 'hire' && hireId) return checkDates(views[hireId].hire, ctx, 7, extra)
    return checkDates(hypothetical({ location: loc, workAuth: auth, now: ctx.now }), ctx, 7, extra)
  }, [mode, hireId, loc, auth, views, ctx, extra])

  const earliest = results.find((r) => r.verdict === 'safe')
  // Dates that can't work collapse into one line; listing each one says the same thing several times.
  const firstOk = results.findIndex((r) => r.verdict !== 'no')
  const noRun = firstOk === -1 ? results : results.slice(0, firstOk)
  const folded = noRun.length > 1 ? noRun : []
  const row = (r: DateCheck) => (
    <div key={r.day} className={cn('grid grid-cols-[16px_110px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5', r.verdict === 'safe' && r === earliest && 'bg-green-soft/60')}>
      <Glyph state={r.verdict === 'safe' ? 'verified' : r.verdict === 'risk' ? 'open' : 'late'} />
      <span className="font-medium tnum">{fmtDay(r.day)}</span>
      <span className="text-xs text-muted">{r.reason}</span>
      <Pill tone={VERDICT[r.verdict].tone}>{VERDICT[r.verdict].label}</Pill>
    </div>
  )
  return (
    <Page>
      <PageHeader title="Start-date check" sub="Pick a date and see whether onboarding can meet it, using real lead times from recent hires." tags={<ReqTag ids="X2" />} />
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[300px_1fr]')}>
        <Card className="space-y-3 p-4">
          <Segmented value={mode} onChange={setMode} options={[['hire', 'Existing hire'], ['new', 'New offer']] as const} />
          {mode === 'hire' ? (
            <div className="space-y-1">
              {mine.map((m) => (
                <button key={m.hire.id} type="button" onClick={() => setHireId(m.hire.id)} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px]', hireId === m.hire.id ? 'bg-accent-soft font-semibold' : 'hover:bg-sunken')}>
                  <Avatar id={m.hire.id} size={22} /><span className="flex-1 truncate">{m.person.name}</span><span className="text-xs text-muted">{fmtDay(m.hire.start)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-[13px]">
              <div className="text-xs text-muted">Where they'll work
                <Select className="mt-1" label="Where they'll work" value={loc} onChange={setLoc} options={[['remote', 'Remote, Americas'], ['nyc', 'New York office'], ['chicago', 'Chicago office'], ['lisbon', 'Lisbon office'], ['london', 'London office']] as const} />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={auth} onChange={(e) => setAuth(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                Needs work authorization
              </label>
              <p className="text-xs text-muted">Assumes the offer is accepted today.</p>
            </div>
          )}
        </Card>
        <Card className="p-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-2 text-[13px]">
            <span>{earliest ? <>Earliest safe start: <span className="font-semibold">{fmtDay(earliest.day)}</span></> : 'No safe date in the next few weeks.'}</span>
            {earliest && <ProposeDate day={earliest.day} hireId={mode === 'hire' ? hireId : undefined} />}
          </div>
          {folded.length > 0 && (
            <details className="group rounded-lg">
              <summary className="grid cursor-pointer list-none grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-sunken">
                <Glyph state="late" />
                <span className="text-[13px]"><span className="font-medium">{firstOk === -1 ? `None of the next ${folded.length} dates work` : `Not before ${fmtDay(results[firstOk].day)}`}</span> <span className="text-xs text-muted">· {folded[folded.length - 1].reason}</span></span>
                <span className="text-xs text-accent group-open:hidden">Show {folded.length} dates</span>
              </summary>
              {folded.map(row)}
            </details>
          )}
          {results.filter((r) => !folded.includes(r)).map(row)}
          <p className="px-3 pb-2 pt-3 text-[11px] text-faint">Lead times come from when steps actually happened for the last 62 hires, including dates people entered by hand.</p>
        </Card>
      </div>
    </Page>
  )
}
