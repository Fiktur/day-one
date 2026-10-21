import { useState } from 'react'
import { Hand, Link2, Plug, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { MODE_LABEL, SYSTEM_MODES, systemNames, type SystemId } from '../../data/journey'
import { fmtShort } from '../../lib/dates'
import { Button, Card, Glyph, Pill, ReqTag } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'
import { AnimatePresence, Num, Reveal, Segmented, motion, springs } from '../../ui/motion'
import { Emoji } from '../../ui/assets'
import { MapLegend, NODE_META, SystemsMap, type MapNode } from './SystemsMap'
import { useAffected } from '../program/Incident'
import { safeName } from '../../engine/derive'

const SYSTEMS: Exclude<SystemId, 'dayone'>[] = ['greenhouse', 'workday', 'checkr', 'firstbase', 'google', 'calendar', 'immigration', 'benefits', 'badge']

const CONTRACT: Partial<Record<SystemId, { reads: string; writes: string; trigger: string; freq: string; owner: string; failure: string }>> = {
  greenhouse: { reads: 'Offer accepted, start date, role, location', writes: 'Nothing', trigger: 'Webhook on offer accepted', freq: 'Real time', owner: 'Recruiting', failure: 'Retries for 24 h. Duplicate events are recognised by event ID and ignored.' },
  workday: { reads: 'Task status, hire record status', writes: 'Pre-hire record, confirmed details', trigger: 'Webhook + hourly check', freq: 'Within 1 h', owner: 'HR Operations', failure: 'Shows “can’t check right now” after 2 missed checks. Never shows green without a confirmation.' },
  checkr: { reads: 'Check status only (never results)', writes: 'Order a check', trigger: 'Status check every 15 min', freq: '15 min', owner: 'Screening', failure: 'Marks affected checks “can’t check right now”. Retries every 5 min.' },
  firstbase: { reads: 'Order, preparation, shipment, delivery', writes: 'Release order, change address before shipping', trigger: 'Webhook', freq: 'Real time', owner: 'IT', failure: 'Retries; a backorder triggers a start-date forecast.' },
  google: { reads: 'Account created, first sign-in', writes: 'Nothing (IT creates accounts)', trigger: 'Directory events', freq: 'Real time', owner: 'IT', failure: 'Falls back to IT marking it done.' },
}

export function Systems() {
  const { route, compact } = useNav()
  const s = useDemo()
  const views = useViews()
  const [tab, setTab] = useState(route.tab === 'log' ? 'log' : route.tab === 'connections' ? 'connections' : 'map')
  const [sel, setSel] = useState<MapNode>('checkr')
  const unknownBy = (sys: SystemId) => Object.values(views).reduce((n, v) => n + v.steps.filter((x) => x.def.system === sys && x.state === 'unknown').length, 0)
  const lastEvent = (sys: SystemId) => s.log.find((l) => l.system === systemNames[sys].toLowerCase() || l.system === sys)
  const topFlash = 'log:top' in s.flashes

  return (
    <Page>
      <PageHeader
        title="Systems"
        sub="How each system connects, whether it's healthy, and what happens when it isn't."
        tags={<ReqTag ids="T1 T3 T7" />}
        right={
          <Segmented value={tab} onChange={setTab} options={[['map', 'Live map'], ['connections', 'Connections'], ['log', 'Event log']] as const} />
        }
      />
      {tab === 'map' ? (
        <MapTab sel={sel} setSel={setSel} />
      ) : tab === 'connections' ? (
        <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]')}>
          <Card className="overflow-hidden">
            {!compact && <div className="grid grid-cols-[1fr_110px_1.3fr_90px_1fr] gap-3 border-b border-line bg-bg px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-faint"><span>System</span><span>Mode</span><span>Status</span><span>Last event</span><span>Affects</span></div>}
            {SYSTEMS.map((sys) => {
              const mode = SYSTEM_MODES[s.setup][sys]
              const down = s.down[sys] != null
              const Icon = mode === 'connected' ? Plug : mode === 'linked' ? Link2 : Hand
              const ev = lastEvent(sys)
              const n = unknownBy(sys)
              return (
                <button key={sys} type="button" onClick={() => setSel(sys)} className={cn('grid w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left text-[13px] last:border-0 hover:bg-bg', compact ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_110px_1.3fr_90px_1fr]', down && 'bg-red-soft/70 hover:bg-red-soft', sel === sys && 'ring-1 ring-inset ring-accent/40')}>
                  <span className="font-medium">{systemNames[sys]}</span>
                  {!compact && <span className="flex items-center gap-1.5 text-muted"><Icon className="h-3.5 w-3.5" />{MODE_LABEL[mode]}</span>}
                  <span className="flex items-center gap-1.5">
                    <Glyph state={down ? 'late' : mode === 'manual' ? 'na' : 'verified'} size={12} />
                    {down ? `Not responding since ${fmtShort(s.down[sys]!)}` : mode === 'manual' ? 'Owner marks done' : mode === 'linked' ? 'Healthy · a person confirms' : 'Healthy'}
                  </span>
                  {!compact && <span className="font-mono text-[11px] text-muted">{ev ? ev.time.slice(0, 5) : '—'}</span>}
                  {!compact && <span className={cn('text-xs', n ? 'font-medium text-red' : 'text-muted')}>{n ? `${n} step${n > 1 ? 's' : ''} show “can't check right now”` : '—'}</span>}
                </button>
              )
            })}
          </Card>
          <SystemDetail sel={sel} />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-bg px-4 py-2 text-xs text-muted">Every event Day One received or sent, in plain words. Newest first.</div>
          <ul className="divide-y divide-line font-mono text-[12px]">
            {s.log.slice(0, 40).map((l, i) => (
              <li key={l.id} className={cn('grid gap-3 px-4 py-2', compact ? 'grid-cols-[72px_1fr]' : 'grid-cols-[110px_110px_160px_1fr]', i === 0 && topFlash && 'animate-flash')}>
                <span className="text-faint">{fmtShort(l.day)} {l.time}</span>
                {!compact && <span className="text-ink">{l.system}</span>}
                {!compact && <span className="text-muted">{l.event}</span>}
                <span className={cn(l.tone === 'bad' ? 'text-red' : l.tone === 'warn' ? 'text-amber-ink' : l.tone === 'ok' ? 'text-ink' : 'text-muted')}>{compact ? `${l.system} · ` : ''}{l.outcome}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  )
}

function SystemDetail({ sel }: { sel: MapNode }) {
  const s = useDemo()
  if (sel === 'hire' || sel === 'team') {
    const meta = NODE_META[sel]
    return (
      <Card className="h-fit space-y-2 p-4">
        <div className="flex items-center gap-2.5"><Emoji name={meta.emoji} size={28} /><h3 className="font-semibold">{meta.name}</h3></div>
        <p className="text-[13px] text-muted">
          {sel === 'hire'
            ? 'The Day One app: their next step, what is being handled, the welcome board and the assistant. Tasks in Workday or Checkr link out; Day One never stores their documents.'
            : 'Each owner gets only their own next step, with a due date, plus a nudge before anything turns red. The onboarding team sees every hand-off.'}
        </p>
      </Card>
    )
  }
  return (
          <Card className="h-fit space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{systemNames[sel]}</h3>
              <Pill tone={s.down[sel] != null ? 'red' : 'green'}>{s.down[sel] != null ? 'Down' : 'Up'}</Pill>
            </div>
            {s.down[sel] != null && <DownSteps sys={sel} />}
            {CONTRACT[sel] ? (
              <dl className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                {Object.entries({ Reads: CONTRACT[sel]!.reads, Writes: CONTRACT[sel]!.writes, Trigger: CONTRACT[sel]!.trigger, Freshness: CONTRACT[sel]!.freq, Owner: CONTRACT[sel]!.owner, 'If it fails': CONTRACT[sel]!.failure }).map(([k, val]) => (
                  <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{val}</dd></div>
                ))}
              </dl>
            ) : <p className="text-[13px] text-muted">No API. People confirm these steps in Day One, with the date they happened.</p>}
            {/* Outages are staged from the presenter bar (scenario 5); staff only get the real control. */}
            {s.down[sel] != null && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => toast(`${systemNames[sel]} still isn't responding`, { description: 'Nothing was lost. Day One tries again in 5 minutes and resumes from the step that failed.' })}><RefreshCw className="h-3.5 w-3.5" />Retry now</Button>
              </div>
            )}
          </Card>
  )
}

/** What a down system is holding up, and what Day One will retry once it's back. */
function DownSteps({ sys, titled }: { sys: SystemId; titled?: boolean }) {
  const { person } = useNav()
  const affected = useAffected(sys)
  return (
    <div className="rounded-xl bg-red-soft/60 px-3 py-2 text-[13px]">
      <div className="font-medium">{titled ? `${systemNames[sys]} isn't responding · ` : ''}{affected.length ? `${affected.length} step${affected.length > 1 ? 's' : ''} can't be checked right now` : 'Nothing is waiting on it right now'}</div>
      <ul className="mt-1 space-y-0.5 text-xs">
        {affected.map(({ view, step }) => <li key={view.hire.id + step.key}><span className="font-medium">{view.person.name}</span> · {safeName(step, { role: person.role, team: person.team })}</li>)}
      </ul>
      <div className="mt-1.5 text-xs text-muted">Retry queue: {affected.length} update{affected.length === 1 ? '' : 's'} · next try in 5 min. Each resumes from the step that failed.</div>
    </div>
  )
}

/** The live map, with the numbers that matter above it and the event feed beside the detail card. */
function MapTab({ sel, setSel }: { sel: MapNode; setSel: (n: MapNode) => void }) {
  const { compact } = useNav()
  const s = useDemo()
  const views = useViews()
  const steps = Object.values(views).flatMap((v) => v.steps)
  const live = SYSTEMS.filter((x) => SYSTEM_MODES[s.setup][x] === 'connected' && s.down[x] == null).length
  const stats = [
    { label: 'Events today', value: s.log.filter((l) => l.day === s.now).length, emoji: 'bell' as const },
    { label: 'Automatic connections', value: live, suffix: ` of ${SYSTEMS.length}`, emoji: 'plug' as const },
    { label: 'Waiting to confirm', value: steps.filter((x) => x.state === 'confirming').length, emoji: 'hourglass' as const },
    { label: "Can't check right now", value: steps.filter((x) => x.state === 'unknown').length, emoji: 'warning' as const, tone: 'red' as const },
  ]
  return (
    <div className="space-y-4">
      {/* An outage leads the page: what it holds up shows before the map, not under it. */}
      {(Object.keys(s.down) as SystemId[]).map((sys) => <DownSteps key={sys} sys={sys} titled />)}
      <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-4')}>
        {stats.map((x, i) => (
          <Reveal key={x.label} i={i}>
            <Card className={cn('relative overflow-hidden px-4 py-3', x.tone === 'red' && x.value > 0 && 'border-red/40 bg-gradient-to-br from-surface to-red-soft')}>
              <Emoji name={x.emoji} size={28} float delay={i * 0.5} className="absolute right-3 top-3" />
              <div className="pr-8 text-xs font-medium text-muted">{x.label}</div>
              <Num value={x.value} suffix={x.suffix} className={cn('mt-1 block font-display text-[28px] font-extrabold leading-none', x.tone === 'red' && x.value > 0 && 'text-red')} />
            </Card>
          </Reveal>
        ))}
      </div>
      <Card className="overflow-hidden p-3 sm:p-4">
        <SystemsMap selected={sel} onSelect={setSel} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
          <MapLegend />
          <span className="text-[11px] text-faint">Click a system for its contract.</span>
        </div>
      </Card>
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)]')}>
        <SystemDetail sel={sel} />
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green" /></span>
            <span className="text-[13px] font-semibold">Live feed</span>
            <span className="text-xs text-muted">· newest first</span>
          </div>
          <ul className="divide-y divide-line/70">
            <AnimatePresence initial={false}>
              {s.log.slice(0, 6).map((l) => (
                <motion.li key={l.id} layout="position" initial={{ opacity: 0, x: 20, backgroundColor: 'rgba(51,85,255,0.10)' }} animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(51,85,255,0)' }} exit={{ opacity: 0 }} transition={{ ...springs.snappy, backgroundColor: { duration: 1.4 } }} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 text-[12.5px]">
                  <span className={cn('h-2 w-2 rounded-full', l.tone === 'bad' ? 'bg-red' : l.tone === 'warn' ? 'bg-amber' : l.tone === 'ok' ? 'bg-green' : 'bg-accent')} />
                  <span className="min-w-0"><span className="font-medium">{l.system}</span> <span className="font-mono text-[11px] text-muted">{l.event}</span><span className="block truncate text-muted">{l.outcome}</span></span>
                  <span className="font-mono text-[11px] text-faint">{l.time.slice(0, 5)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Card>
      </div>
    </div>
  )
}
