import { useState } from 'react'
import { Hand, Link2, Plug, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { SYSTEM_MODES, systemNames, type SystemId } from '../../data/journey'
import { fmtShort } from '../../lib/dates'
import { Button, Card, Glyph, Pill, ReqTag } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'
import { Segmented } from '../../ui/motion'

const SYSTEMS: SystemId[] = ['greenhouse', 'workday', 'checkr', 'firstbase', 'google', 'calendar', 'immigration', 'benefits', 'badge']

const CONTRACT: Partial<Record<SystemId, { reads: string; writes: string; trigger: string; freq: string; owner: string; failure: string }>> = {
  greenhouse: { reads: 'Offer accepted, start date, role, location', writes: 'Nothing', trigger: 'Webhook on offer accepted', freq: 'Real time', owner: 'Recruiting', failure: 'Retries for 24 h. Duplicate events are recognised by event ID and ignored.' },
  workday: { reads: 'Task status, hire record status', writes: 'Pre-hire record, confirmed details', trigger: 'Webhook + hourly check', freq: 'Within 1 h', owner: 'People Systems', failure: 'Shows “can’t check” after 2 missed checks. Never shows green without a confirmation.' },
  checkr: { reads: 'Check status only (never results)', writes: 'Order a check', trigger: 'Status check every 15 min', freq: '15 min', owner: 'Screening', failure: 'Marks affected checks “can’t check right now”. Retries every 5 min.' },
  firstbase: { reads: 'Order, preparation, shipment, delivery', writes: 'Release order, change address before shipping', trigger: 'Webhook', freq: 'Real time', owner: 'IT', failure: 'Retries; a backorder triggers a start-date forecast.' },
  google: { reads: 'Account created, first sign-in', writes: 'Nothing (IT creates accounts)', trigger: 'Directory events', freq: 'Real time', owner: 'IT', failure: 'Falls back to IT marking it done.' },
}

export function Systems() {
  const { route, compact } = useNav()
  const s = useDemo()
  const views = useViews()
  const [tab, setTab] = useState(route.tab === 'log' ? 'log' : 'connections')
  const [sel, setSel] = useState<SystemId>('checkr')
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
          <>
            <Segmented value={s.setup} onChange={(v) => s.setSetup(v)} options={[['connected', 'Connected'], ['manual', 'Manual-first']] as const} />
            <Segmented value={tab} onChange={setTab} options={[['connections', 'Connections'], ['log', 'Under the hood']] as const} />
          </>
        }
      />
      {tab === 'connections' ? (
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
                  {!compact && <span className="flex items-center gap-1.5 text-muted"><Icon className="h-3.5 w-3.5" />{mode}</span>}
                  <span className="flex items-center gap-1.5">
                    <Glyph state={down ? 'late' : mode === 'manual' ? 'na' : 'verified'} size={12} />
                    {down ? `Not responding since ${fmtShort(s.down[sys]!)}` : mode === 'manual' ? 'Owners mark steps done' : mode === 'linked' ? 'Healthy · a person confirms' : 'Healthy'}
                  </span>
                  {!compact && <span className="font-mono text-[11px] text-muted">{ev ? ev.time.slice(0, 5) : '—'}</span>}
                  {!compact && <span className={cn('text-xs', n ? 'font-medium text-red' : 'text-muted')}>{n ? `${n} step${n > 1 ? 's' : ''} show “can't check”` : '—'}</span>}
                </button>
              )
            })}
          </Card>
          <Card className="h-fit space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{systemNames[sel]}</h3>
              <Pill tone={s.down[sel] != null ? 'red' : 'green'}>{s.down[sel] != null ? 'Down' : 'Up'}</Pill>
            </div>
            {CONTRACT[sel] ? (
              <dl className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                {Object.entries({ Reads: CONTRACT[sel]!.reads, Writes: CONTRACT[sel]!.writes, Trigger: CONTRACT[sel]!.trigger, Freshness: CONTRACT[sel]!.freq, Owner: CONTRACT[sel]!.owner, 'If it fails': CONTRACT[sel]!.failure }).map(([k, val]) => (
                  <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{val}</dd></div>
                ))}
              </dl>
            ) : <p className="text-[13px] text-muted">No API. People confirm these steps in Day One, with the date they happened.</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => { s.toggleDown(sel); toast(s.down[sel] != null ? `${systemNames[sel]} restored` : `${systemNames[sel]} marked as down`, { description: 'Every affected step updates everywhere.' }) }}>{s.down[sel] != null ? 'Restore connection' : 'Simulate an outage'}</Button>
              <Button size="sm" variant="ghost" onClick={() => toast.success('Retry sent', { description: 'Failed updates resume from the step that failed, without duplicating orders or checks.' })}><RefreshCw className="h-3.5 w-3.5" />Retry failed updates</Button>
            </div>
          </Card>
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
