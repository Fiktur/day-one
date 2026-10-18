import { useState } from 'react'
import { Lightbulb, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { people } from '../../data/people'
import { burst } from '../../ui/fx'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { HISTORY, LEAD_TIMES, PERMIT_LEAD, SLA_BY_OWNER, SUGGESTIONS } from '../../data/history'
import { PLANNED_STARTS } from '../../data/cohorts'
import { fmtShort } from '../../lib/dates'
import { Avatar, Button, Card, ReqTag } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'
import { Num, Reveal, Tilt, motion, springs } from '../../ui/motion'
import { Emoji, type EmojiName } from '../../ui/assets'

export function Insights() {
  const { compact, viewer } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const assignments = useDemo((s) => s.assignments)
  const assign = useDemo((s) => s.assign)
  const [asTable, setAsTable] = useState(false)
  const extra = useDemo((s) => s.extraSessions)
  const addSession = useDemo((s) => s.addSession)
  const atRisk = Object.values(views).filter((v) => v.status === 'atrisk').length
  const max = Math.max(...LEAD_TIMES.map((l) => l.p90))
  const lateRates = SLA_BY_OWNER.map((o) => ({ ...o, rate: o.breaches / o.total })).sort((a, b) => b.rate - a.rate)
  // One scale for every sparkline, so the rows can be compared with each other.
  const trendMax = Math.max(...SLA_BY_OWNER.flatMap((o) => o.trend))
  const weeks = PLANNED_STARTS.map((w) => ({ ...w, seats: w.seats + (extra.includes(w.day) ? 12 : 0) }))
  const capMax = Math.max(...weeks.map((w) => Math.max(w.planned, w.seats)))

  return (
    <Page>
      <PageHeader title="Insights" sub={`What Day One learned from the last 90 days (${HISTORY.hires} hires), from the dates steps really happened.`} tags={<ReqTag ids="T9 X4 X6" />} />
      <div className={cn('mb-4 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-5')}>
        <Kpi i={0} emoji="hourglass" label="Offer to day-one ready" value={HISTORY.offerToReadyMedian} suffix=" days" note="median" />
        <Kpi i={1} emoji="trophy" label="Ready on time" value={Math.round(HISTORY.readyOnTime * 100)} suffix="%" note="54 of 62" />
        <Kpi i={2} emoji="bell" label="Steps past SLA" value={HISTORY.stepsPastSla} note="this month" />
        <Kpi i={3} emoji="handshake" label="Hand-offs per hire" value={HISTORY.handoffsPerHire} note="across 6 teams" />
        <div className={cn(compact && 'col-span-2')}><Kpi i={4} emoji="warning" label="At risk now" value={atRisk} note="of upcoming starts" tone={atRisk ? 'red' : undefined} /></div>
      </div>
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <Card className="p-4">
          <h2 className="font-semibold">Where the time goes</h2>
          <p className="text-xs text-muted">Business days each step waits on its owner. Bar is the median, the line marks the slowest 10%.</p>
          <div className="mt-4 space-y-3">
            {LEAD_TIMES.map((l, li) => (
              <div key={l.label} className="grid grid-cols-[150px_1fr_44px] items-center gap-3 text-[13px]">
                <span className="truncate" title={l.label}>{l.label}</span>
                <span className="relative h-3 rounded-sm bg-sunken">
                  <motion.span className="absolute inset-y-0 left-0 rounded-sm btn-gradient" initial={{ width: 0 }} animate={{ width: `${(l.median / max) * 100}%` }} transition={{ ...springs.soft, delay: 0.1 + li * 0.06 }} />
                  <span className="absolute -top-0.5 h-4 w-0.5 bg-ink/50" style={{ left: `${(l.p90 / max) * 100}%` }} />
                </span>
                <span className="text-right font-mono text-xs tnum">{l.median.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Shown separately: {PERMIT_LEAD.label}, median {PERMIT_LEAD.median} days ({PERMIT_LEAD.cases} cases).</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">Orientation seats vs planned starts</h2>
              <p className="text-xs text-muted">From the headcount plan. Red means more starts than seats that week.</p>
            </div>
            <Button size="xs" onClick={() => addSession(42)} disabled={extra.includes(42)}><Plus className="h-3 w-3" />Add Nov 16 session</Button>
          </div>
          <div className="mt-4 grid h-44 grid-cols-5 items-end gap-4">
            {weeks.map((w) => {
              const over = w.planned > w.seats
              return (
                <div key={w.day} className="flex h-full flex-col items-center justify-end gap-1">
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <motion.div className="w-1/3 rounded-t-md border border-faint bg-sunken" initial={{ height: 0 }} animate={{ height: `${(w.seats / capMax) * 100}%` }} transition={springs.bouncy} title={`${w.seats} seats`} />
                    <motion.div className={cn('w-1/3 rounded-t-md', over ? 'bg-red' : 'btn-gradient')} initial={{ height: 0 }} animate={{ height: `${(w.planned / capMax) * 100}%` }} transition={{ ...springs.bouncy, delay: 0.08 }} title={`${w.planned} planned starts`} />
                  </div>
                  <span className="font-mono text-[10px] text-muted">{fmtShort(w.day)}</span>
                  <span className={cn('font-mono text-[10px] tnum', over ? 'font-semibold text-red' : 'text-faint')}>{w.planned}/{w.seats}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-muted"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-faint bg-sunken" />Seats</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" />Planned starts</span></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Late steps by owner</h2>
              <p className="text-xs text-muted">Share of each owner's steps that went past their due date, last 90 days, and the weekly rate over 12 weeks.</p>
            </div>
            <Button size="xs" variant="ghost" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>{asTable ? 'Chart' : 'Table'}</Button>
          </div>
          {asTable ? (
            <table className="mt-3 w-full text-[12px]">
              <thead className="text-left text-muted"><tr><th className="font-medium">Owner</th><th className="text-right font-medium">90 days</th><th className="text-right font-medium">12 weeks ago</th><th className="text-right font-medium">This week</th></tr></thead>
              <tbody className="tnum">{lateRates.map((o) => <tr key={o.owner} className="border-t border-line"><td className="py-1">{o.owner}</td><td className="text-right">{pct(o.rate)} ({o.breaches}/{o.total})</td><td className="text-right">{pct(o.trend[0])}</td><td className="text-right">{pct(o.trend[o.trend.length - 1])}</td></tr>)}</tbody>
            </table>
          ) : (
            <div className="mt-3 space-y-2.5">
              {lateRates.map((o) => (
                <div key={o.owner} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_96px_64px] items-center gap-3 text-[13px]">
                  <span className="truncate" title={o.owner}>{o.owner}</span>
                  <span className="h-2 rounded-full bg-sunken"><motion.span className="block h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${(o.rate / lateRates[0].rate) * 100}%` }} transition={{ ...springs.soft, delay: 0.2 }} /></span>
                  <Sparkline values={o.trend} max={trendMax} now={now} label={o.owner} />
                  <span className="text-right font-mono text-xs text-muted tnum" title={`${o.breaches} of ${o.total} steps`}>{pct(o.rate)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-accent" />Make it easier to run</h2>
          <div className="mt-3 space-y-3">
            {SUGGESTIONS.map((x) => {
              const done = assignments.find((a) => a.title === x.title)
              return (
                <div key={x.title} className="rounded-lg bg-bg p-3">
                  <div className="text-[13px] font-semibold">{x.title}</div>
                  <p className="mt-0.5 text-xs text-muted">{x.detail}</p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-green">{x.impact}</p>
                    {done
                      ? <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Avatar id={done.to} size={18} />Assigned to {people[done.to].name.split(' ')[0]}</span>
                      : <Button size="xs" variant="primary" onClick={(e) => { burst('small', e.currentTarget); assign(x.title, x.owner, viewer); toast.success(`Assigned to ${people[x.owner].name}`, { description: 'They get it as a Slack message with the numbers. See the Outbox.' }) }}>Assign to {people[x.owner].name.split(' ')[0]}</Button>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </Page>
  )
}

const pct = (r: number) => `${(r * 100).toFixed(1)}%`

/** 12 weekly points in the de-emphasis ink, this week in the accent; hover shows the week and its rate. */
function Sparkline({ values, max, now, label }: { values: number[]; max: number; now: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 96, H = 26, pad = 4
  const x = (i: number) => pad + (i * (W - pad * 2)) / (values.length - 1)
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.length - 1
  const week = (i: number) => fmtShort(now - 7 * (last - i))
  const at = hover ?? last
  return (
    <span className="relative block" onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${pct(values[0])} twelve weeks ago, ${pct(values[last])} this week`} className="overflow-visible"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left - pad) / (W - pad * 2)) * last)))) }}>
        <path d={d} fill="none" stroke="rgb(var(--faint))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="rgb(var(--line))" strokeWidth={1} />}
        <circle cx={x(at)} cy={y(values[at])} r={4} fill="rgb(var(--accent))" stroke="rgb(var(--surface))" strokeWidth={2} />
      </svg>
      {hover != null && <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[10px] text-surface">Week of {week(hover)}: {pct(values[hover])}</span>}
    </span>
  )
}

function Kpi({ label, value, suffix, note, tone, emoji, i }: { label: string; value: number; suffix?: string; note: string; tone?: 'red'; emoji: EmojiName; i: number }) {
  return (
    <Reveal i={i}>
      <Tilt max={7}>
        <Card className={cn('relative overflow-hidden px-4 py-3.5', tone === 'red' && 'border-red/40 bg-gradient-to-br from-surface to-red-soft')}>
          <Emoji name={emoji} size={34} float delay={i * 0.5} className="absolute right-3 top-3" />
          <div className="pr-10 text-xs font-medium text-muted">{label}</div>
          <Num value={value} suffix={suffix} className={cn('mt-1 block font-display text-[30px] font-extrabold leading-none', tone === 'red' && 'text-red')} />
          <div className="mt-1 text-[11px] text-faint">{note}</div>
        </Card>
      </Tilt>
    </Reveal>
  )
}
