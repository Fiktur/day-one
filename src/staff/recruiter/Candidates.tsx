import { useShallow } from 'zustand/react/shallow'
import { useState } from 'react'
import { Lock, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn, lc } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews, orderedHires } from '../../engine/selectors'
import { refName, safeName, type HireView } from '../../engine/derive'
import { STAGES } from '../../data/journey'
import { people } from '../../data/people'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, BallChip, Button, Card, Pill, ReqTag, StageTrack, StatusPill } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'
import { Segmented } from '../../ui/motion'

export function Candidates() {
  const { compact } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const list = orderedHires(views).filter((v) => v.status !== 'started')
  const [sel, setSel] = useState<string>('wanda')
  const [filter, setFilter] = useState<'all' | 'attention' | 'soon'>('all')
  const shown = list.filter((v) => (filter === 'attention' ? v.status === 'atrisk' || v.status === 'behind' || v.status === 'unknown' || v.dateMoved : filter === 'soon' ? v.hire.start - now <= 30 : true))
  const current = views[sel]

  return (
    <Page>
      <PageHeader
        title="Accepted offers"
        sub="Where every accepted offer stands, without chasing anyone."
        tags={<ReqTag ids="M1 T5" />}
        right={
          <Segmented value={filter} onChange={setFilter} options={[['all', 'All'], ['attention', 'Needs attention'], ['soon', 'Starting in 30 days']] as const} />
        }
      />
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]')}>
        <Card className="overflow-hidden">
          {!compact && (
            <div className="grid grid-cols-[minmax(0,1.1fr)_64px_120px_minmax(0,1.6fr)_76px] gap-3 border-b border-line bg-bg px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-faint">
              <span>Hire</span><span>Starts</span><span>Stage</span><span>Waiting on</span><span>Status</span>
            </div>
          )}
          {shown.map((v) => <Row key={v.hire.id} v={v} selected={sel === v.hire.id} onSelect={() => setSel(v.hire.id)} compact={compact} />)}
        </Card>
        {current && <Drawer v={current} />}
      </div>
    </Page>
  )
}

function Row({ v, selected, onSelect, compact }: { v: HireView; selected: boolean; onSelect: () => void; compact: boolean }) {
  const now = useDemo((s) => s.now)
  const flash = useDemo((s) => `${v.hire.id}:start` in s.flashes)
  const flag = v.status === 'atrisk' ? <Pill tone="red">At risk</Pill> : v.status === 'behind' ? <Pill tone="amber">Behind</Pill> : v.status === 'unknown' ? <Pill tone="dashed">Can't check right now</Pill> : v.status === 'withdrawn' ? <Pill>Withdrawn</Pill> : v.dateMoved ? <Pill tone="amber">Date moved</Pill> : <span className="text-xs text-faint">—</span>
  if (compact) {
    return (
      <button type="button" onClick={onSelect} className={cn('flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-0', selected && 'bg-accent-soft', flash && 'animate-flash')}>
        <Avatar id={v.hire.id} size={26} />
        <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{v.person.name}</div><div className="text-xs text-muted">{fmtShort(v.hire.start)} · {STAGES[v.stage]}</div></div>
        {flag}
      </button>
    )
  }
  return (
    <button type="button" onClick={onSelect} className={cn('grid w-full grid-cols-[minmax(0,1.1fr)_64px_120px_minmax(0,1.6fr)_76px] items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 hover:bg-bg', selected && 'bg-accent-soft hover:bg-accent-soft', flash && 'animate-flash')}>
      <span className="flex min-w-0 items-center gap-2"><Avatar id={v.hire.id} size={26} /><span className="min-w-0"><span className="block truncate text-[13px] font-medium">{v.person.name}</span><span className="block truncate text-xs text-muted">{v.hire.title}</span></span></span>
      <span className="text-[13px] tnum">{v.status === 'withdrawn' ? '—' : fmtShort(v.hire.start)}{v.dateMoved && <span className="block text-[11px] text-muted">was {fmtShort(v.hire.originalStart)}</span>}</span>
      <span><StageTrack stage={v.stage} width={88} /><span className="mt-1 block text-[10px] leading-tight text-faint">{STAGES[v.stage]}</span></span>
      <span className="min-w-0">{v.primary ? <BallChip step={v.primary} now={now} size="sm" /> : <span className="text-xs text-faint">—</span>}</span>
      <span>{flag}</span>
    </button>
  )
}

function Drawer({ v }: { v: HireView }) {
  const { person } = useNav()
  const now = useDemo((s) => s.now)
  const changes = useDemo(useShallow((s) => s.dateChanges.filter((c) => c.hireId === v.hire.id)))
  const log = useDemo(useShallow((s) => s.log.filter((l) => l.subject === v.person.name).slice(0, 4)))
  const viewerCtx = { role: person.role, team: person.team }
  const active = v.balls.slice(0, 3)
  return (
    <Card className="h-fit space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Avatar id={v.hire.id} size={36} />
        <div className="min-w-0 flex-1"><div className="font-semibold">{v.person.name}</div><div className="text-xs text-muted">{v.hire.title} · {v.hire.location}</div></div>
        <StatusPill status={v.status} />
      </div>
      <div>
        <div className="text-xs text-muted">Stage</div>
        <div className="font-medium">{STAGES[v.stage]}</div>
        <div className="mt-1.5"><StageTrack stage={v.stage} /></div>
      </div>
      <div className="space-y-1.5">
        <div className="text-xs text-muted">Happening now</div>
        {active.length === 0 && <div className="text-[13px] text-muted">Nothing in progress.</div>}
        {active.map((s) => (
          <div key={s.key} className={cn('rounded-lg px-2.5 py-2 text-[13px]', s.red ? 'bg-red-soft' : 'bg-bg')}>
            <div className="font-medium">{safeName(s, viewerCtx)}</div>
            <div className={cn('text-xs', s.red ? 'text-red' : 'text-muted')}>{s.holder ? `Waiting on ${refName(s.holder)} · ` : ''}{lc(s.label)}</div>
          </div>
        ))}
      </div>
      {changes.map((c, i) => (
        <div key={i} className="rounded-lg bg-amber-soft px-2.5 py-2 text-[13px]">
          Start moved {fmtDay(c.from)} → <span className="font-semibold">{fmtDay(c.to)}</span> by {people[c.by]?.name ?? c.by} on {fmtShort(c.day)}. Approved by {people[c.approvedBy]?.name ?? c.approvedBy}.
        </div>
      ))}
      {v.hire.id === 'wanda' && changes.length === 0 && (
        <div className="rounded-lg bg-red-soft px-2.5 py-2 text-[13px] text-ink">Work authorization is expected {fmtDay(v.by.permit?.eta ?? now)}, after the start date. Maria Hill is reviewing a new date.</div>
      )}
      {log.length > 0 && (
        <div>
          <div className="text-xs text-muted">Recent</div>
          <ul className="mt-1 space-y-1 font-mono text-[11px] text-muted">
            {log.map((l) => <li key={l.id} className="truncate">{fmtShort(l.day)} {l.time.slice(0, 5)} · {l.system} · {l.outcome}</li>)}
          </ul>
        </div>
      )}
      <Button className="w-full" onClick={() => toast.success(`Message to ${v.person.name.split(' ')[0]} logged on their timeline`)}><MessageSquare className="h-3.5 w-3.5" />Message {v.person.name.split(' ')[0]}</Button>
      <p className="flex items-start gap-1.5 text-xs text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />Screening and immigration show stage and dates only.</p>
    </Card>
  )
}
