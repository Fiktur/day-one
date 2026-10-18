import { useShallow } from 'zustand/react/shallow'
import { useState } from 'react'
import { ArrowLeft, CalendarClock, Lock, RotateCcw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { cn, lc } from '../../lib/cn'
import { useNav, isCoordinator } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useView, ctxOf, useCtx } from '../../engine/selectors'
import { refName, safeName, stepIsSensitiveFor, type HireView, type StepView } from '../../engine/derive'
import { messagesFor } from '../../engine/messages'
import { MODE_LABEL, STAGES, STEPS, systemNames } from '../../data/journey'
import { people, teams, type TeamId } from '../../data/people'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, BallChip, Button, Card, Glyph, Pill, ReqTag, StageTrack, StatusPill } from '../../ui/parts'
import { StepRow } from '../../ui/StepRow'
import { Page } from '../StaffShell'
import { areaSummary } from '../shared/summaries'
import { burst } from '../../ui/fx'
import { FixButton } from './fixes'

export function HireRecord() {
  const { route, go, person, viewer, compact } = useNav()
  const v = useView(route.hireId ?? 'virgil')
  const now = useDemo((s) => s.now)
  const [tab, setTab] = useState(route.tab ?? 'next')
  const [full, setFull] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [showLater, setShowLater] = useState(false)
  const [openStages, setOpenStages] = useState<number[]>([])
  if (!v) return null
  const viewerCtx = { role: person.role, team: person.team }
  const back = person.role === 'team' ? 'queue' : person.role === 'head' ? 'command' : 'command'
  const started = v.status === 'started'
  const selected = v.by[sel ?? ''] ?? v.balls.find((b) => b.red) ?? v.primary ?? v.steps.filter((s) => s.state === 'verified').slice(-1)[0]
  // Teams see their own steps and what blocks them; Background screening never sees the rest of the journey.
  const team = person.role === 'team' ? person.team : undefined
  const ours = (s: StepView) => !!team && ((s.owner.kind === 'team' && s.owner.id === team) || s.owner.steward === team)
  const blockers = new Set(v.steps.filter((s) => ours(s) && s.state !== 'verified' && s.state !== 'na').flatMap((s) => s.def.deps ?? []))
  const scoped = !!team && (!full || team === 'screening')
  const shown = (s: StepView) => !scoped || ours(s) || (blockers.has(s.key) && s.state !== 'verified' && s.state !== 'na')
  const stages = [0, 1, 2, 3, 4].map((i) => ({ i, steps: v.steps.filter((s) => s.def.stage === i && (!s.def.cancel || v.status === 'withdrawn') && shown(s)) }))
  const later = v.steps.filter((s) => s.def.stage >= 5 && shown(s))
  const coord = isCoordinator(viewer)

  return (
    <Page>
      <button type="button" onClick={() => go({ name: back })} className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />{back === 'queue' ? 'Queue' : 'Command center'}</button>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar id={v.hire.id} size={46} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold leading-tight">{v.person.name}</h1>
              {v.hire.rehire && <Pill tone="accent"><RotateCcw className="h-3 w-3" />Rehire · history kept</Pill>}
            </div>
            <div className="text-[13px] text-muted">{v.hire.title} · {v.hire.location} · starts {fmtDay(v.hire.start)}{v.dateMoved && ` (was ${fmtShort(v.hire.originalStart)})`} · manager {people[v.hire.managerId].name}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={v.status} className="text-[13px]" />
          {coord && v.status !== 'withdrawn' && !started && (
            <Button onClick={() => useDemo.getState().setDialog({ type: 'changeDate', hireId: v.hire.id })}><CalendarClock className="h-3.5 w-3.5" />Change start date</Button>
          )}
          <ReqTag ids="O3 O8" />
        </div>
      </div>

      <BallBanner v={v} pick={shown} />

      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]')}>
        <Card className="p-2">
          <div className="px-2.5 pb-2 pt-2"><StageTrack stage={v.stage} labels /></div>
          {team && team !== 'screening' && (
            <div className="flex items-center justify-between rounded-lg bg-bg px-2.5 py-1.5 text-xs text-muted">
              <span>{scoped ? `${teams[team].name}'s steps and what they wait on` : 'The full journey'}</span>
              <button type="button" onClick={() => setFull(!full)} className="font-medium text-accent">{scoped ? 'Show full journey' : `Only ${teams[team].short}`}</button>
            </div>
          )}
          {stages.map(({ i, steps }) => {
            if (!steps.length) return null
            const done = steps.filter((s) => s.state === 'verified' || s.state === 'na').length
            const folded = done === steps.length && !openStages.includes(i)
            return (
            <div key={i} className="mt-1">
              <button type="button" onClick={() => setOpenStages((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))} className="flex w-full items-center justify-between rounded-md px-2.5 pb-1 pt-2 text-left hover:bg-bg">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-faint">{done === steps.length && <Glyph state="verified" size={11} />}{STAGES[i]}{folded && <span className="normal-case tracking-normal">· all done, tap to show</span>}</span>
                <span className="text-[10px] text-faint">{done}/{steps.length}</span>
              </button>
              {!folded && steps.map((s) => (
                <StepRow key={s.key} view={v} step={s} onOpen={() => { setSel(s.key); setTab('evidence') }} className={cn(selected?.key === s.key && 'ring-1 ring-accent/50')} />
              ))}
            </div>
            )
          })}
          <button type="button" onClick={() => setShowLater((x) => !x)} className="mt-1 w-full rounded-lg px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-faint hover:bg-sunken">
            {showLater ? '▾' : '▸'} Day one and first 90 days ({later.length})
          </button>
          {showLater && later.map((s) => <StepRow key={s.key} view={v} step={s} onOpen={() => { setSel(s.key); setTab('evidence') }} />)}
        </Card>

        <div className="space-y-3">
          <Card className="p-1">
            <div className="flex gap-1 border-b border-line px-2 pt-1 text-[13px]">
              {[['next', 'What’s next'], ['readiness', 'Readiness'], ['evidence', 'Evidence'], ['messages', 'Messages'], ['activity', 'Activity']].map(([t, l]) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={cn('-mb-px whitespace-nowrap border-b-2 px-2 py-2', tab === t ? 'border-accent font-semibold' : 'border-transparent text-muted hover:text-ink')}>{l}</button>
              ))}
            </div>
            <div className="p-3">
              {tab === 'next' && <WhatsNext v={v} viewer={viewerCtx} ours={ours} shown={shown} onPick={(k) => { setSel(k); setTab('evidence') }} />}
              {tab === 'readiness' && <ReadinessTab v={v} />}
              {tab === 'evidence' && selected && <Evidence v={v} s={selected} viewer={viewerCtx} />}
              {tab === 'messages' && <MessagesTab v={v} />}
              {tab === 'activity' && <ActivityTab v={v} />}
            </div>
          </Card>
          <p className="flex items-start gap-1.5 px-1 text-xs text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />Day One stores status, owners and dates. Documents and check results stay in their source systems. <ReqTag ids="T5 T6" /></p>
        </div>
      </div>
    </Page>
  )
}

function BallBanner({ v, pick }: { v: HireView; pick: (s: StepView) => boolean }) {
  const now = useDemo((s) => s.now)
  const s = useDemo()
  const { viewer, person } = useNav()
  const pool = v.balls.filter(pick)
  const red = pool.find((b) => b.red)
  const p = red ?? pool[0]
  if (v.status === 'withdrawn') {
    return <div className="mb-4 rounded-xl border border-line bg-sunken px-4 py-3 text-[13px]"><span className="font-semibold">{v.person.name.split(' ')[0]} withdrew on {fmtDay(v.hire.withdrawn!)}.</span> Scheduled messages stopped. Open steps closed. Cancellations went to their owners.</div>
  }
  if (!p) return null
  const hal = v.hire.id === 'hal' && v.by.laptop_prep?.eta != null && v.by.laptop_prep.state !== 'verified'
  const fixes = hal ? [
    { l: 'Switch to an in-stock model', run: () => { s.speedUp('hal', 'laptop_prep', 1); s.set({ laptopModel: { ...s.laptopModel, hal: 'MacBook Pro 14" (in stock)' } }); toast.success('Firstbase confirmed an in-stock MacBook Pro 14"', { description: 'Hal is back on track and will see the new model on the Day One home.' }) } },
    { l: 'Local pickup in San Diego', run: () => { s.speedUp('hal', 'laptop_prep', 1); s.speedUp('hal', 'laptop_deliver', 0); s.set({ laptopModel: { ...s.laptopModel, hal: 'San Diego office stock' } }); toast.success('Pickup booked for Hal at the San Diego office', { description: 'IT reserved a laptop from office stock.' }) } },
    { l: 'Move start to Nov 9', run: () => s.setDialog({ type: 'changeDate', hireId: 'hal', to: v.hire.start + 7 }) },
  ] : []
  const forecast = v.forecastEnd != null ? `Forecast: everything ready by ${fmtDay(v.forecastEnd)}, ${v.forecastEnd >= v.hire.start ? `${v.forecastEnd - v.hire.start + 1} day${v.forecastEnd - v.hire.start ? 's' : ''} after the start date` : `${v.hire.start - v.forecastEnd} days before the start`}.` : 'Forecast is waiting on a decision.'
  return (
    <div className={cn('mb-4 rounded-xl border px-4 py-3', red ? (v.risk ? 'border-red/40 bg-red-soft' : 'border-amber/40 bg-amber-soft') : 'border-line bg-surface')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {red ? <TriangleAlert className={cn('h-4 w-4', v.risk ? 'text-red' : 'text-amber-ink')} /> : <Glyph state="prog" />}
        <span className="text-[13px]"><span className="font-semibold">Waiting on {p.holder ? refName(p.holder) : 'the owner'}{p.heldSince != null && p.heldSince < now ? ` for ${now - p.heldSince} day${now - p.heldSince > 1 ? 's' : ''}` : ''}.</span> {safeName(p, { role: person.role, team: person.team }, { action: true })}: {p.ownerAway ? 'owner is out of office, ' : ''}{lc(p.label)}.</span>
        {p.holder && <BallChip step={p} now={now} />}
        <FixButton v={v} s={p} />
      </div>
      <div className={cn('mt-1 text-xs', v.risk ? 'font-medium text-red' : 'text-muted')}>{forecast} <ReqTag ids="X2 O7" /></div>
      {fixes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className="self-center text-xs text-muted">Suggested fixes:</span>
          {fixes.map((f, i) => <Button key={f.l} size="xs" variant="secondary" onClick={(e) => { if (i < 2) burst('big', e.currentTarget); f.run() }}>{f.l}</Button>)}
        </div>
      )}
    </div>
  )
}

function Evidence({ v, s, viewer }: { v: HireView; s: StepView; viewer: { role: string; team?: TeamId } }) {
  const hidden = stepIsSensitiveFor(s.def, viewer)
  const name = safeName(s, viewer)
  const unlocks = STEPS.filter((d) => d.deps?.includes(s.key)).map((d) => v.by[d.key]).filter(Boolean).map((d) => safeName(d!, viewer))
  const deps = (s.def.deps ?? []).map((d) => v.by[d]).filter(Boolean).map((d) => safeName(d!, viewer))
  const rows: [string, string][] = [
    ['Owner', refName(s.owner)],
    ['Source', s.mode === 'native' ? 'Day One' : `${systemNames[s.def.system]} · ${MODE_LABEL[s.mode].toLowerCase()}`],
    ['Opened', s.open != null && s.state !== 'blank' ? fmtDay(s.open) : '—'],
    ['Due', s.due != null && s.state !== 'blank' ? fmtDay(s.due) : '—'],
    ['Happened', s.done != null && s.state !== 'blank' && s.state !== 'open' && s.state !== 'soon' && s.state !== 'late' ? fmtDay(s.done) : '—'],
    ['Recorded', s.doneRecorded != null && s.state !== 'blank' && s.state !== 'open' && s.state !== 'soon' && s.state !== 'late' ? fmtDay(s.doneRecorded) : '—'],
    ['Confirmed by', s.state === 'verified' ? `${(s.verBy && people[s.verBy]?.name) ?? s.verBy ?? s.confirmer?.name ?? s.owner.name} · ${fmtDay(s.ver!)}` : s.state === 'confirming' ? `Waiting on ${s.confirmer?.name}` : '—'],
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Glyph state={s.state} red={s.red} className="mt-0.5" />
        <div>
          <div className="font-semibold">{name}</div>
          <div className={cn('text-xs', s.red ? 'text-red' : 'text-muted')}>{s.label}</div>
        </div>
      </div>
      {hidden ? (
        <p className="rounded-lg bg-sunken px-3 py-2 text-xs text-muted">Details for this step are limited to {s.def.sensitive === 'screening' ? 'Background screening' : 'Immigration and visas'}. You see the status and dates.</p>
      ) : null}
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        {rows.map(([k, val]) => (
          <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="tnum">{val}</dd></div>
        ))}
        {s.eta != null && <div className="contents"><dt className="text-muted">Provider ETA</dt><dd className="font-medium text-red">{fmtDay(s.eta)}</dd></div>}
        {deps.length > 0 && <div className="contents"><dt className="text-muted">Waits on</dt><dd>{deps.join(', ')}</dd></div>}
        {unlocks.length > 0 && <div className="contents"><dt className="text-muted">Unlocks</dt><dd>{unlocks.join(', ')}</dd></div>}
        {s.na && !hidden && <div className="contents"><dt className="text-muted">Decision</dt><dd>{s.na.reason}</dd></div>}
        {s.key === 'mobility_review' && !hidden && <div className="contents"><dt className="text-muted">Decision</dt><dd>{v.hire.mobilityNote}</dd></div>}
      </dl>
      {s.doneRecorded != null && s.done != null && s.doneRecorded !== s.done && s.state === 'verified' && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs">Marked done {fmtDay(s.doneRecorded)} with the real date, {fmtDay(s.done)}. Lead times use the real date.</p>
      )}
      <p className="text-[11px] text-faint">Green only when the source system confirms it, or the accountable owner does where no system exists. <ReqTag ids="T2" /></p>
    </div>
  )
}

/** The next few hand-offs in order: who has each one now, and what opens after. */
function WhatsNext({ v, viewer, ours, shown, onPick }: { v: HireView; viewer: { role: string; team?: TeamId }; ours: (s: StepView) => boolean; shown: (s: StepView) => boolean; onPick: (key: string) => void }) {
  const now = useDemo((s) => s.now)
  const active = v.balls.filter(shown)
  const upcoming = v.steps.filter((s) => s.state === 'blank' && !s.def.cancel && s.def.stage <= 4 && shown(s)).sort((a, b) => (a.open ?? 999) - (b.open ?? 999)).slice(0, Math.max(0, 6 - active.length))
  if (!active.length && !upcoming.length) return <p className="text-[13px] text-muted">{v.status === 'withdrawn' ? 'Nothing: the journey stopped when the offer was withdrawn.' : 'Nothing left before day one.'}</p>
  const row = (s: StepView) => (
    <button key={s.key} type="button" onClick={() => onPick(s.key)} className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-bg">
      <Glyph state={s.state} red={s.red} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-medium">{safeName(s, viewer, { action: true })}{ours(s) && <Pill tone="accent" className="text-[10px]">Yours</Pill>}</span>
        <span className={cn('block text-xs', s.red ? 'text-red' : 'text-muted')}>{s.holder ? `${refName(s.holder)} · ` : `${refName(s.owner)} · `}{s.label}</span>
      </span>
      {s.holder && s.heldSince != null && s.heldSince < now && <span className="shrink-0 font-mono text-[10px] text-faint tnum">{now - s.heldSince}d</span>}
    </button>
  )
  return (
    <div className="space-y-2">
      {active.length > 0 && <div><div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-faint">Now</div>{active.map(row)}</div>}
      {upcoming.length > 0 && <div><div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-faint">Then</div>{upcoming.map(row)}</div>}
    </div>
  )
}

function ReadinessTab({ v }: { v: HireView }) {
  const now = useDemo((s) => s.now)
  return (
    <div className="space-y-2">
      {v.areas.map((a) => (
        <div key={a.id} className="flex items-start gap-2.5 rounded-lg bg-bg px-3 py-2">
          <Glyph state={a.state === 'green' ? 'verified' : a.state === 'red' ? 'late' : a.state === 'unknown' ? 'unknown' : a.state === 'blank' ? 'blank' : 'prog'} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2"><span className="font-medium">{a.label}</span><span className="text-xs text-muted tnum">{a.done}/{a.total}</span></div>
            <div className="text-xs text-muted">{areaSummary(v, a, now)}</div>
          </div>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted">Readiness is separate from completion: {v.hireTasks.filter((s) => s.state === 'verified').length} of {v.hireTasks.length} of {v.person.name.split(' ')[0]}'s own tasks are done, but day-one readiness needs all four areas green. <ReqTag ids="X1" /></p>
    </div>
  )
}

function MessagesTab({ v }: { v: HireView }) {
  const ctx = useCtx()
  const edits = useDemo((s) => s.msgEdits)
  const flash = useDemo((s) => `${v.hire.id}:messages` in s.flashes)
  const msgs = messagesFor(v, ctx, edits)
  return (
    <div className={cn('space-y-1', flash && 'animate-flash rounded-lg')}>
      {msgs.map((m) => (
        <div key={m.key} className="grid grid-cols-[74px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-[13px]">
          <span className="font-mono text-[11px] text-muted tnum">{m.day != null ? fmtShort(m.day) : m.expected != null ? `~${fmtShort(m.expected)}` : 'on event'}</span>
          <span className="min-w-0"><span className="block truncate">{m.subject}</span>{m.movedFrom != null && m.status !== 'sent' && <span className="block text-[11px] text-muted">moved from {fmtShort(m.movedFrom)}</span>}</span>
          <MsgStatusPill status={m.status} />
        </div>
      ))}
    </div>
  )
}

export function MsgStatusPill({ status }: { status: string }) {
  const map: Record<string, [string, 'green' | 'accent' | 'neutral' | 'red' | 'amber']> = {
    sent: ['Sent', 'green'], scheduled: ['Scheduled', 'accent'], waiting: ['On event', 'neutral'], stopped: ['Stopped', 'neutral'], skipped: ['Skipped', 'neutral'],
  }
  const [l, t] = map[status] ?? [status, 'neutral']
  return <Pill tone={t} className="text-[10px]">{l}</Pill>
}

function ActivityTab({ v }: { v: HireView }) {
  const log = useDemo(useShallow((s) => s.log.filter((l) => l.subject === v.person.name)))
  const changes = useDemo(useShallow((s) => s.dateChanges.filter((c) => c.hireId === v.hire.id)))
  return (
    <div className="space-y-2">
      {changes.map((c, i) => (
        <div key={i} className="rounded-lg bg-amber-soft px-3 py-2 text-[13px]">Start date {fmtDay(c.from)} → {fmtDay(c.to)} · by {people[c.by]?.name}, approved by {people[c.approvedBy]?.name}</div>
      ))}
      <ul className="space-y-1.5 font-mono text-[11px]">
        {log.map((l) => (
          <li key={l.id} className="grid grid-cols-[86px_1fr] gap-2">
            <span className="text-faint">{fmtShort(l.day)} {l.time.slice(0, 5)}</span>
            <span className={cn(l.tone === 'bad' ? 'text-red' : l.tone === 'warn' ? 'text-amber-ink' : 'text-muted')}><span className="text-ink">{l.system}</span> · {l.event} · {l.outcome}</span>
          </li>
        ))}
        {log.length === 0 && <li className="text-muted">No events recorded yet.</li>}
      </ul>
    </div>
  )
}
