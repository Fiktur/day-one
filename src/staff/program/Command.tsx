import { useId, useState } from 'react'
import { cn, lc } from '../../lib/cn'
import { useNav, isCoordinator } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews, orderedHires } from '../../engine/selectors'
import { safeName, type HireView } from '../../engine/derive'
import { STAGES } from '../../data/journey'
import { groupFor } from '../../data/cohorts'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, BallChip, Card, Chip, Glyph, Pill, ReadinessBar, ReqTag, StageTrack, StatusPill, displayState } from '../../ui/parts'
import { isMine } from '../../ui/StepRow'
import { Page, PageHeader } from '../StaffShell'
import { AnimatePresence, LayoutGroup, Num, Reveal, Segmented, Tilt, motion, springs } from '../../ui/motion'
import { Emoji, type EmojiName } from '../../ui/assets'

type ViewMode = 'list' | 'board' | 'calendar'

export function Command() {
  const { go, compact } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const [mode, setMode] = useState<ViewMode>('list')
  const groupId = useId()
  const [only, setOnly] = useState<'all' | 'attention'>('all')
  const [loc, setLoc] = useState<string>('all')
  const all = orderedHires(views)
  const groups = Array.from(new Set(all.map((v) => groupFor(v.hire))))
  const needsAttention = (v: HireView) => v.status === 'atrisk' || v.status === 'unknown' || v.balls.some((b) => b.red)
  const list = all.filter((v) => (only === 'attention' ? needsAttention(v) : true) && (loc === 'all' || groupFor(v.hire) === loc))
  const startA = 28
  const startB = 35
  const count = (d: number) => all.filter((v) => v.hire.start === d && v.status !== 'withdrawn').length
  const red = all.filter((v) => v.status !== 'withdrawn' && needsAttention(v)).length
  const unknown = all.reduce((n, v) => n + v.steps.filter((s) => s.state === 'unknown').length, 0)
  const confirming = all.reduce((n, v) => n + v.steps.filter((s) => s.state === 'confirming').length, 0)

  return (
    <Page>
      <PageHeader
        title="Command center"
        sub={`Every hire, who has the ball, and what's late. ${fmtDay(now)}.`}
        tags={<ReqTag ids="O6 O5 X1" />}
        right={
          <Segmented value={mode} onChange={setMode} options={[['list', 'List'], ['board', 'Board'], ['calendar', 'Calendar']] as const} />
        }
      />
      <div className={cn('mb-4 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-5')}>
        <Stat i={0} emoji="calendar" label={`Starting ${fmtShort(startA)}`} value={count(startA)} />
        <Stat i={1} emoji="rocket" label={`Starting ${fmtShort(startB)}`} value={count(startB)} />
        <Stat i={2} emoji="warning" label="Hires needing attention" value={red} tone={red ? 'red' : undefined} onClick={() => setOnly('attention')} />
        <Stat i={3} emoji="plug" label="Can't check" value={unknown} tone={unknown ? 'dashed' : undefined} />
        {!compact && <Stat i={4} emoji="hourglass" label="Waiting to confirm" value={confirming} />}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <Chip on={only === 'all'} onClick={() => setOnly('all')}>Everyone</Chip>
        <Chip on={only === 'attention'} onClick={() => setOnly('attention')}>Needs attention</Chip>
        <span className="mx-1 h-4 w-px bg-line" />
        <Chip on={loc === 'all'} onClick={() => setLoc('all')}>All locations</Chip>
        {groups.map((g) => <Chip key={g} on={loc === g} onClick={() => setLoc(g)}>{g}</Chip>)}
      </div>

      {mode === 'list' && (
        <Card className="overflow-hidden">
          {!compact && (
            <div className="grid grid-cols-[minmax(0,1.3fr)_64px_96px_minmax(0,1fr)_minmax(0,1.6fr)_96px] gap-3 border-b border-line bg-bg px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-faint">
              <span>Hire</span><span>Starts</span><span>Stage</span><span>Who has the ball</span><span>Next step</span><span>Status</span>
            </div>
          )}
          <AnimatePresence initial={false}>
            {list.map((v, i) => (
              <motion.div key={v.hire.id} layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ ...springs.layout, delay: Math.min(i, 10) * 0.025 }}>
                <HireRow v={v} compact={compact} onOpen={() => go({ name: 'hire', hireId: v.hire.id })} />
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      )}

      {mode === 'board' && (
        <LayoutGroup id={groupId}>
        <div className="scroll-thin flex gap-3 overflow-x-auto pb-2 pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)]">
          {STAGES.map((stage, i) => {
            const col = list.filter((v) => v.stage === i)
            return (
              <div key={stage} className="w-60 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-wider text-faint"><span>{stage}</span><span>{col.length}</span></div>
                <div className="space-y-2">
                  {col.map((v) => (
                    <motion.button layoutId={`board-${v.hire.id}`} layout transition={springs.bouncy} whileHover={{ y: -3, rotate: -0.6 }} whileTap={{ scale: 0.97 }} key={v.hire.id} type="button" onClick={() => go({ name: 'hire', hireId: v.hire.id })} className={cn('w-full rounded-2xl border bg-surface p-3 text-left shadow-card', v.status === 'atrisk' ? 'border-red/50' : 'border-line')}>
                      <div className="flex items-center gap-2"><Avatar id={v.hire.id} size={22} /><span className="truncate text-[13px] font-medium">{v.person.name}</span></div>
                      <div className="mt-1 text-xs text-muted">{fmtShort(v.hire.start)} · {v.hire.location}</div>
                      <div className="mt-2"><ReadinessBar areas={v.areas} compact /></div>
                      {v.primary && <div className="mt-2"><BallChip step={v.primary} now={now} size="sm" /></div>}
                    </motion.button>
                  ))}
                  {col.length === 0 && <div className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-faint">Nobody</div>}
                </div>
              </div>
            )
          })}
        </div>
        </LayoutGroup>
      )}

      {mode === 'calendar' && (
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-3')}>
          {Array.from(new Set(list.map((v) => v.hire.start))).sort((a, b) => a - b).map((d) => (
            <Card key={d} className="p-3">
              <div className="mb-2 flex items-baseline justify-between"><span className="font-semibold">{fmtDay(d)}</span><span className="text-xs text-muted">{list.filter((v) => v.hire.start === d).length} starting</span></div>
              <div className="space-y-1.5">
                {list.filter((v) => v.hire.start === d).map((v) => (
                  <button key={v.hire.id} type="button" onClick={() => go({ name: 'hire', hireId: v.hire.id })} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-sunken">
                    <Avatar id={v.hire.id} size={22} /><span className="flex-1 truncate text-[13px]">{v.person.name}</span><StatusPill status={v.status} />
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

function HireRow({ v, compact, onOpen }: { v: HireView; compact: boolean; onOpen: () => void }) {
  const { viewer, person } = useNav()
  const now = useDemo((s) => s.now)
  const flash = useDemo((s) => Object.keys(s.flashes).some((k) => k.startsWith(v.hire.id + ':')))
  const p = v.balls.find((b) => b.red) ?? v.primary
  const coord = isCoordinator(viewer)
  const ds = p ? displayState(p, isMine(p, viewer), coord) : 'blank'
  const nextName = p ? safeName(p, { role: person.role, team: person.team }) : v.status === 'started' ? 'Ramping' : 'Nothing open'
  const tint = v.status === 'atrisk' ? 'bg-red-soft/50' : v.status === 'unknown' ? 'bg-sunken/60' : ''
  if (compact) {
    return (
      <button type="button" onClick={onOpen} className={cn('flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-0', tint, flash && 'animate-flash')}>
        <Avatar id={v.hire.id} size={26} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="truncate text-[13px] font-medium">{v.person.name}</span><span className="text-xs text-muted">{fmtShort(v.hire.start)}</span></div>
          {p && <div className={cn('flex items-center gap-1.5 truncate text-xs', p.red ? 'text-red' : 'text-muted')}><Glyph state={ds} red={p.red} size={9} />{nextName} · {lc(p.label)}</div>}
        </div>
        {p?.holder && <BallChip step={p} now={now} size="sm" />}
      </button>
    )
  }
  return (
    <button type="button" onClick={onOpen} className={cn('grid w-full grid-cols-[minmax(0,1.3fr)_64px_96px_minmax(0,1fr)_minmax(0,1.6fr)_96px] items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 hover:bg-bg', tint, flash && 'animate-flash')}>
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar id={v.hire.id} size={28} />
        <span className="min-w-0"><span className="block truncate text-[13px] font-medium">{v.person.name}</span><span className="block truncate text-xs text-muted">{v.hire.title} · {groupFor(v.hire)}</span></span>
      </span>
      <span className="text-[13px] tnum">{v.status === 'withdrawn' ? '—' : fmtShort(v.hire.start)}{v.dateMoved && <span className="block text-[10px] text-muted">moved</span>}</span>
      <span><StageTrack stage={v.stage} width={88} /><span className="mt-1 block truncate text-[10px] text-faint">{STAGES[v.stage]}</span></span>
      <span className="min-w-0">{p?.holder ? <BallChip step={p} now={now} size="sm" /> : <span className="text-xs text-faint">—</span>}</span>
      <span className="flex min-w-0 items-center gap-2">
        {p && <Glyph state={ds} red={p.red} />}
        <span className="min-w-0">
          <span className="block truncate text-[13px]">{nextName}</span>
          {p && <span className={cn('block truncate text-xs', p.red ? 'font-medium text-red' : 'text-muted')}>{p.ownerAway ? 'Owner out of office · ' : ''}{p.label}</span>}
        </span>
      </span>
      <span className="flex flex-col items-start gap-1">
        <StatusPill status={v.status} />
        {v.dateMoved && v.status !== 'withdrawn' && <Pill tone="amber" className="text-[10px]">Date moved</Pill>}
      </span>
    </button>
  )
}

function Stat({ label, value, tone, onClick, emoji, i = 0 }: { label: string; value: number; tone?: 'red' | 'dashed'; onClick?: () => void; emoji: EmojiName; i?: number }) {
  return (
    <Reveal i={i}>
      <Tilt max={7}>
        <button type="button" onClick={onClick} className={cn('relative w-full overflow-hidden rounded-[20px] border bg-surface px-4 py-3.5 text-left shadow-card', tone === 'red' ? 'border-red/40 bg-gradient-to-br from-surface to-red-soft' : tone === 'dashed' ? 'border-dashed border-muted' : 'border-line/80', !onClick && 'cursor-default')}>
          <Emoji name={emoji} size={36} float delay={i * 0.6} className="absolute right-3 top-3" />
          <div className="pr-10 text-xs font-medium text-muted">{label}</div>
          <Num value={value} className={cn('mt-1 block font-display text-[34px] font-extrabold leading-none', tone === 'red' && 'text-red')} />
        </button>
      </Tilt>
    </Reveal>
  )
}

