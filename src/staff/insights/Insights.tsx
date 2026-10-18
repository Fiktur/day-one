import { Lightbulb, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { HISTORY, LEAD_TIMES, PERMIT_LEAD, SLA_BY_OWNER, SUGGESTIONS } from '../../data/history'
import { PLANNED_STARTS } from '../../data/cohorts'
import { fmtShort } from '../../lib/dates'
import { Button, Card, ReqTag } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'
import { Num, Reveal, Tilt, motion, springs } from '../../ui/motion'
import { Emoji, type EmojiName } from '../../ui/assets'

export function Insights() {
  const { compact } = useNav()
  const views = useViews()
  const extra = useDemo((s) => s.extraSessions)
  const addSession = useDemo((s) => s.addSession)
  const atRisk = Object.values(views).filter((v) => v.status === 'atrisk').length
  const max = Math.max(...LEAD_TIMES.map((l) => l.p90))
  const lateRates = SLA_BY_OWNER.map((o) => ({ ...o, rate: o.breaches / o.total })).sort((a, b) => b.rate - a.rate)
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
          <h2 className="font-semibold">Late steps by owner</h2>
          <p className="text-xs text-muted">Share of each owner's steps that went past their due date. Owners with more steps aren't penalized for volume.</p>
          <div className="mt-3 space-y-2">
            {lateRates.map((o) => (
              <div key={o.owner} className="grid grid-cols-[150px_1fr_92px] items-center gap-3 text-[13px]">
                <span className="truncate" title={o.owner}>{o.owner}</span>
                <span className="h-2 rounded-full bg-sunken"><motion.span className={cn('block h-full rounded-full', o.rate >= 0.04 ? 'bg-red/80' : 'bg-amber')} initial={{ width: 0 }} animate={{ width: `${(o.rate / lateRates[0].rate) * 100}%` }} transition={{ ...springs.soft, delay: 0.2 }} /></span>
                <span className="text-right font-mono text-xs text-muted tnum" title={`${o.breaches} of ${o.total} steps`}>{(o.rate * 100).toFixed(1)}% · {o.breaches}/{o.total}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-accent" />Make it easier to run</h2>
          <div className="mt-3 space-y-3">
            {SUGGESTIONS.map((x) => (
              <div key={x.title} className="rounded-lg bg-bg p-3">
                <div className="text-[13px] font-semibold">{x.title}</div>
                <p className="mt-0.5 text-xs text-muted">{x.detail}</p>
                <p className="mt-1 text-xs font-medium text-green">{x.impact}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
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
