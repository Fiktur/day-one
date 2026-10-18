import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { queueFor, type QueueItem } from '../../engine/queues'
import { safeName } from '../../engine/derive'
import { people, teams } from '../../data/people'
import { toast } from 'sonner'
import { FixButton } from '../program/fixes'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, Button, Glyph, ReqTag, SourceBadge } from '../../ui/parts'
import { StepActions } from '../../ui/StepRow'
import { Page, PageHeader } from '../StaffShell'
import { forwardRef, useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, LayoutGroup, Num, motion, springs } from '../../ui/motion'
import { Emoji, type EmojiName } from '../../ui/assets'

export function Queue() {
  const { person, compact, go } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const team = person.team ?? 'it'
  const groupId = useId()
  const q = queueFor(views, { team }, now)
  const viewer = { role: person.role, team: person.team }
  // "Your move" always shows, so an empty queue reads as good news; the other column only when it has cards.
  const cols = ([
    { k: 'move', label: 'Your move', emoji: 'target' },
    { k: 'vendor', label: 'Waiting on your vendor', emoji: 'package' },
    { k: 'confirming', label: 'Waiting to confirm', emoji: 'magnifier' },
  ] as { k: 'move' | 'vendor' | 'confirming'; label: string; emoji: EmojiName }[]).filter((c) => c.k === 'move' || q[c.k].length > 0)
  const coming = Object.values(
    q.coming.reduce<Record<string, { name: string; n: number; open: number | null }>>((acc, x) => {
      const name = safeName(x.step, viewer, { action: true })
      const g = (acc[name] ??= { name, n: 0, open: null })
      g.n++
      if (x.step.open != null && (g.open == null || x.step.open < g.open)) g.open = x.step.open
      return acc
    }, {}),
  )
  return (
    <Page>
      <PageHeader
        title={teams[team].name}
        sub={`What can we start on today?${teams[team].members.length > 1 ? ` Shared by ${teams[team].members.length} people.` : ''}`}
        tags={<ReqTag ids="O5 O7 O4" />}
      />
      <LayoutGroup id={groupId}>
        <div className={cn('grid gap-3', !compact && cols.length === 2 && 'grid-cols-2', !compact && cols.length === 3 && 'grid-cols-3')}>
          {cols.map((c) => (
            <section key={c.k} className="min-w-0">
              <div className="mb-2 flex items-center justify-between rounded-2xl bg-surface/60 px-2 py-1.5 ring-1 ring-line/70 backdrop-blur">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold"><Emoji name={c.emoji} size={20} />{c.label}</span>
                <span className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold', c.k === 'move' && q.move.length ? 'bg-amber-soft text-amber-ink' : c.k === 'vendor' && q.vendor.some((x) => x.step.red) ? 'bg-red-soft text-red' : 'bg-sunken text-muted')}><Num value={q[c.k].length} /></span>
              </div>
              <div className={cn('gap-2', !compact && cols.length === 1 ? 'grid grid-cols-2 xl:grid-cols-3' : 'space-y-2')}>
                {q[c.k].length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-line px-3 py-5 text-center text-xs text-faint"><Emoji name="party" size={28} float className="mx-auto mb-1" />Nothing waiting on you</div>}
                <AnimatePresence mode="popLayout">
                  {q[c.k].map((x) => <QCard key={x.view.hire.id + x.step.key} x={x} col={c.k} onOpen={() => go({ name: 'hire', hireId: x.view.hire.id })} />)}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      </LayoutGroup>
      <div className={cn('mt-4 grid items-start gap-3', !compact && 'grid-cols-2')}>
        {coming.length > 0 && (
          <Fold emoji="hourglass" title="Coming up" note={`${q.coming.length} steps waiting on earlier ones`}>
            {coming.map((g) => (
              <li key={g.name} className="flex items-baseline justify-between gap-3">
                <span className="truncate">{g.name} <span className="text-muted">× {g.n}</span></span>
                <span className="shrink-0 text-xs text-muted tnum">{g.open != null && g.open > now ? `first opens ${fmtDay(g.open)}` : 'after earlier steps'}</span>
              </li>
            ))}
          </Fold>
        )}
        {q.done.length > 0 && (
          <Fold emoji="check" title="Done this week" note={String(q.done.length)}>
            {q.done.map(({ view, step }) => (
              <li key={view.hire.id + step.key} className="flex items-baseline justify-between gap-3">
                <span className="truncate"><span className="font-medium">{view.person.name}</span> · {safeName(step, viewer)}</span>
                <span className="shrink-0 text-xs text-muted tnum" title={step.doneRecorded != null && step.done != null && step.doneRecorded !== step.done ? `Recorded ${fmtDay(step.doneRecorded)}` : undefined}>{fmtDay(step.done ?? step.ver!)}</span>
              </li>
            ))}
          </Fold>
        )}
      </div>
    </Page>
  )
}

function Fold({ emoji, title, note, children }: { emoji: EmojiName; title: string; note: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface px-3 py-2 text-[13px]">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold">
        <Emoji name={emoji} size={18} />{title}<span className="font-normal text-muted">· {note}</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted transition group-open:rotate-180" />
      </summary>
      <ul className="mt-2 space-y-1">{children}</ul>
    </details>
  )
}

/** What the person doing the step needs to know, without opening anything. No home addresses: the vendor has those. */
function factsFor(v: QueueItem['view'], s: QueueItem['step'], model?: string): string | null {
  const h = v.hire
  const [first, last] = v.person.name.toLowerCase().split(' ')
  switch (s.key) {
    case 'laptop_release': case 'laptop_prep': case 'laptop_ship': case 'cancel_laptop':
      return `${model ?? h.laptop.model} · ${h.location} · needed by ${fmtShort(h.start - 2)}`
    case 'laptop_deliver': return `${h.location} · needed by ${fmtShort(h.start - 2)}`
    case 'account': return `${first}.${last ?? ''}@northbeam.com${h.rehire ? ' · restore the old account' : ''} · by ${fmtShort(h.start - 1)}`
    case 'badge': return `${h.location} · first day ${fmtShort(h.start)}`
    case 'wd_hire': return `${h.title} · starts ${fmtShort(h.start)}`
    default: return null
  }
}

const QCard = forwardRef<HTMLDivElement, { x: QueueItem; col: string; onOpen: () => void }>(function QCard({ x, col, onOpen }, ref) {
  const { person, viewer } = useNav()
  const flash = useDemo((s) => `${x.view.hire.id}:${x.step.key}` in s.flashes)
  const model = useDemo((s) => s.laptopModel[x.view.hire.id])
  const claimedBy = useDemo((s) => s.claims[`${x.view.hire.id}:${x.step.key}`])
  const claim = useDemo((s) => s.claim)
  const s = x.step
  const facts = factsFor(x.view, s, model)
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
        <Glyph state={s.state} red={s.red} size={12} />
      </button>
      <div className="mt-1.5">{safeName(s, { role: person.role, team: person.team }, { action: col === 'move' })}</div>
      <div className={cn('mt-0.5 text-xs', s.red ? 'font-medium text-red' : 'text-muted')}>
        {col === 'vendor' && s.holder ? `${s.holder.name} · ` : ''}{s.label}
        {col === 'move' && s.def.critical ? ` · starts ${fmtDay(x.view.hire.start)}` : ''}
      </div>
      {facts && <div className="mt-1 text-xs text-muted">{facts}</div>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {col === 'move' && s.holder?.kind === 'team'
          ? claimedBy
            ? <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Avatar id={claimedBy} size={18} />{claimedBy === viewer ? 'You have it' : `${people[claimedBy]?.name.split(' ')[0]} has it`}</span>
            : <Button size="xs" variant="ghost" onClick={() => { claim(x.view.hire.id, s.key, viewer); toast.success(`You took “${safeName(s, { role: person.role, team: person.team }, { action: true })}”`, { description: `${x.view.person.name} · your teammates see it's yours` }) }}>Take it</Button>
          : <SourceBadge system={s.def.system} mode={s.mode} />}
        {col === 'move' && <StepActions view={x.view} step={s} />}
        {col === 'vendor' && <FixButton v={x.view} s={s} />}
      </div>
    </motion.div>
  )
})
