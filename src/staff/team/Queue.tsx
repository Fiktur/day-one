import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { queueFor, type QueueItem } from '../../engine/queues'
import { safeName } from '../../engine/derive'
import { teams } from '../../data/people'
import { fmtDay } from '../../lib/dates'
import { Avatar, Glyph, ReqTag, SourceBadge } from '../../ui/parts'
import { StepActions } from '../../ui/StepRow'
import { Page, PageHeader } from '../StaffShell'
import { forwardRef, useId } from 'react'
import { AnimatePresence, LayoutGroup, Num, motion, springs } from '../../ui/motion'
import { Emoji, type EmojiName } from '../../ui/assets'

export function Queue() {
  const { person, compact, go } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const setup = useDemo((s) => s.setup)
  const team = person.team ?? 'it'
  const groupId = useId()
  const q = queueFor(views, { team }, now)
  const cols: { k: keyof typeof q; label: string; hint: string; emoji: EmojiName }[] = [
    { k: 'move', label: 'Your move', hint: 'Ready to start, sorted by urgency', emoji: 'target' },
    { k: 'coming', label: 'Coming up', hint: 'Waiting on earlier steps', emoji: 'hourglass' },
    { k: 'confirming', label: 'Confirming', hint: 'Done, waiting on a system', emoji: 'magnifier' },
    { k: 'done', label: 'Done this week', hint: 'With the date it really happened', emoji: 'check' },
  ]
  return (
    <Page>
      <PageHeader
        title={teams[team].name}
        sub={`What can we start on today? ${teams[team].members.length > 1 ? `Shared by ${teams[team].members.length} people.` : ''} ${setup === 'manual' ? 'Manual-first setup: you mark steps done, with the real date.' : 'Connected setup: most steps update on their own.'}`}
        tags={<ReqTag ids="O5 O7 O4" />}
      />
      <LayoutGroup id={groupId}>
      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-4')}>
        {cols.map((c) => (
          <section key={c.k} className="min-w-0">
            <div className="mb-2 flex items-center justify-between rounded-2xl bg-surface/60 px-2 py-1.5 ring-1 ring-line/70 backdrop-blur">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold"><Emoji name={c.emoji} size={20} />{c.label}</span>
              <span className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold', c.k === 'move' && q.move.length ? 'bg-amber-soft text-amber-ink' : 'bg-sunken text-muted')}><Num value={q[c.k].length} /></span>
            </div>
            <div className="space-y-2">
              {q[c.k].length === 0 && <div className="rounded-2xl border border-dashed border-line px-3 py-5 text-center text-xs text-faint"><Emoji name={c.k === 'move' ? 'party' : 'sparkles'} size={28} float className="mx-auto mb-1" />{c.k === 'move' ? 'Nothing waiting on you' : 'Nothing here'}</div>}
              <AnimatePresence mode="popLayout">
                {(c.k === 'coming' ? q[c.k].slice(0, compact ? 3 : 8) : q[c.k]).map((x) => <QCard key={x.view.hire.id + x.step.key} x={x} col={c.k} onOpen={() => go({ name: 'hire', hireId: x.view.hire.id })} />)}
              </AnimatePresence>
              {c.k === 'coming' && q.coming.length > 8 && !compact && <div className="px-1 text-xs text-faint">+{q.coming.length - 8} more</div>}
            </div>
          </section>
        ))}
      </div>
      </LayoutGroup>
    </Page>
  )
}

const QCard = forwardRef<HTMLDivElement, { x: QueueItem; col: string; onOpen: () => void }>(function QCard({ x, col, onOpen }, ref) {
  const { person } = useNav()
  const flash = useDemo((s) => `${x.view.hire.id}:${x.step.key}` in s.flashes)
  const s = x.step
  const tint = col === 'move' ? (s.red ? 'border-transparent bg-red-soft' : s.state === 'unknown' ? 'border-dashed border-muted bg-surface' : s.state === 'confirming' ? 'border-line bg-surface' : 'border-transparent bg-amber-soft') : 'border-line bg-surface'
  return (
    <motion.div
      ref={ref}
      layoutId={`q-${x.view.hire.id}-${s.key}`}
      layout
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={springs.layout}
      whileHover={{ y: -2 }}
      className={cn('rounded-2xl border p-3 text-[13px] shadow-card', tint, flash && 'animate-flash')}
    >
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 text-left">
        <Avatar id={x.view.hire.id} size={22} />
        <span className="min-w-0 flex-1 truncate font-semibold">{x.view.person.name}</span>
        <Glyph state={col === 'done' ? 'verified' : col === 'coming' ? 'blank' : s.state} red={s.red} size={12} />
      </button>
      <div className={cn('mt-1.5', col === 'coming' && 'text-muted')}>{safeName(s, { role: person.role, team: person.team })}</div>
      <div className={cn('mt-0.5 text-xs', s.red ? 'font-medium text-red' : 'text-muted')}>
        {col === 'done' ? (s.doneRecorded != null && s.done != null && s.doneRecorded !== s.done ? `Happened ${fmtDay(s.done)} · recorded ${fmtDay(s.doneRecorded)}` : `Done ${fmtDay(s.ver!)}`) : s.label}
        {col === 'move' && s.def.critical ? ` · starts ${fmtDay(x.view.hire.start)}` : ''}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <SourceBadge system={s.def.system} mode={s.mode} />
        {(col === 'move') && <StepActions view={x.view} step={s} />}
      </div>
    </motion.div>
  )
})
