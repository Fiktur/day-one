import { useState, type ReactNode } from 'react'
import { ExternalLink, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { cn, lc } from '../lib/cn'
import { useNav, isCoordinator } from '../nav/NavContext'
import { useDemo } from '../engine/store'
import { safeName, type HireView, type StepView } from '../engine/derive'
import { systemNames } from '../data/journey'
import { people } from '../data/people'
import { fmtDay } from '../lib/dates'
import { Avatar, BallChip, Button, Glyph, SourceBadge, displayState } from './parts'
import { Popover, PopClose, Dropdown, DropItem } from './overlay'
import { burst } from './fx'
import { motion } from './motion'

export function isMine(step: StepView, viewer: string): boolean {
  const p = people[viewer]
  if (!step.holder) return false
  if (step.holder.kind === 'person') return step.holder.id === viewer
  if (step.holder.kind === 'team') return p?.team === step.holder.id
  return false
}

export function useStepName(step: StepView, opts?: { action?: boolean }): string {
  const { person } = useNav()
  return safeName(step, { role: person.role, team: person.team }, opts)
}

/** Mark done with "When did this happen?" so manual steps keep honest lead times. */
export function MarkDoneButton({ view, step, label = 'Mark done', size = 'xs' }: { view: HireView; step: StepView; label?: string; size?: 'xs' | 'sm' }) {
  const { viewer } = useNav()
  const now = useDemo((s) => s.now)
  const markDone = useDemo((s) => s.markDone)
  const [when, setWhen] = useState(0)
  const [note, setNote] = useState('')
  const name = useStepName(step)
  const options = [0, 1, 2, 3].map((n) => now - n).filter((d) => step.open == null || d >= step.open)
  return (
    <Popover
      align="end"
      className="w-72"
      trigger={<Button size={size} variant="primary">{label}</Button>}
    >
      <div className="space-y-3">
        <div>
          <div className="text-[13px] font-semibold">{name}</div>
          <div className="text-xs text-muted">{view.person.name}</div>
        </div>
        <div className="text-xs text-muted" id={`when-${view.hire.id}-${step.key}`}>When did this happen?</div>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-labelledby={`when-${view.hire.id}-${step.key}`}>
          {options.map((d, i) => (
            <motion.button
              key={d}
              type="button"
              role="radio"
              aria-checked={when === i}
              onClick={() => setWhen(i)}
              whileTap={{ scale: 0.94 }}
              className={cn('rounded-xl border px-2 py-1.5 text-left text-[12px] leading-tight transition-colors', when === i ? 'border-accent/50 bg-accent-soft text-accent' : 'border-line bg-surface text-ink hover:border-faint')}
            >
              <span className="block font-semibold">{i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i} days ago`}</span>
              <span className={cn('block text-[11px]', when === i ? 'text-accent/80' : 'text-muted')}>{fmtDay(d)}</span>
            </motion.button>
          ))}
        </div>
        <input
          aria-label="Note"
          className="h-9 w-full rounded-xl border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="text-[11px] leading-snug text-faint">Today is the default. The real date keeps lead times accurate.</p>
        <PopClose asChild>
          <Button
            variant="primary"
            className="w-full"
            onClick={(e) => {
              burst('small', e.currentTarget)
              markDone(view.hire.id, step.key, viewer, options[when])
              toast.success(`${name}: done`, { description: `${view.person.name}${when ? ` · happened ${fmtDay(options[when])}` : ''}` })
            }}
          >
            Mark done
          </Button>
        </PopClose>
      </div>
    </Popover>
  )
}

export function StepActions({ view, step, compact }: { view: HireView; step: StepView; compact?: boolean }) {
  const { viewer, person } = useNav()
  const confirm = useDemo((s) => s.confirmStep)
  const markNA = useDemo((s) => s.markNA)
  // With manual updates, the team that runs a vendor records the vendor's steps itself.
  const mine = isMine(step, viewer) || (step.mode === 'manual' && step.holder?.kind === 'provider' && step.holder.steward === person.team)
  const name = useStepName(step)
  if (!mine) return null
  const actionable = step.state === 'open' || step.state === 'soon' || step.state === 'late'
  if (step.state === 'confirming') {
    return (
      <Button size="xs" variant="primary" onClick={(e) => { burst('small', e.currentTarget); confirm(view.hire.id, step.key, viewer); toast.success(`Confirmed: ${name}`, { description: view.person.name }) }}>
        Confirm
      </Button>
    )
  }
  if (!actionable) return null
  const teamOwner = person.role === 'team' || person.role === 'program'
  return (
    <div className="flex items-center gap-1">
      {!compact && step.mode !== 'native' && step.mode !== 'manual' && (
        <Button size="xs" variant="ghost" onClick={() => toast(`Opens ${systemNames[step.def.system]} in a new tab`, { description: 'In the demo nothing leaves this page.' })}>
          {systemNames[step.def.system]} <ExternalLink className="h-3 w-3" />
        </Button>
      )}
      <MarkDoneButton view={view} step={step} />
      {teamOwner && !compact && (
        <Dropdown trigger={<Button size="xs" variant="ghost" aria-label="More actions"><MoreHorizontal className="h-3.5 w-3.5" /></Button>}>
          <DropItem onSelect={() => { markNA(view.hire.id, step.key, 'Not needed for this hire', viewer); toast(`Marked not needed: ${name}`) }}>Mark not needed…</DropItem>
          <DropItem onSelect={() => toast('Reassign', { description: 'Pick a teammate to take this step. (Demo only.)' })}>Reassign…</DropItem>
        </Dropdown>
      )}
    </div>
  )
}

/** One step, the way it appears in lists across the staff workspace. */
export function StepRow({ view, step, showHire, showHolder = true, showSource = true, actions, className, onOpen, dense }: {
  view: HireView
  step: StepView
  showHire?: boolean
  showHolder?: boolean
  showSource?: boolean
  actions?: ReactNode
  className?: string
  onOpen?: () => void
  dense?: boolean
}) {
  const { viewer, compact } = useNav()
  const now = useDemo((s) => s.now)
  const flash = useDemo((s) => `${view.hire.id}:${step.key}` in s.flashes)
  const mine = isMine(step, viewer)
  const coord = isCoordinator(viewer)
  const ds = displayState(step, mine, coord)
  const name = useStepName(step, { action: mine })
  const tint = ds === 'open' ? 'bg-amber-soft/70' : ds === 'late' || ds === 'soon' || (step.red && ds !== 'prog') ? 'bg-red-soft/70' : ''
  return (
    <div className={cn('group grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2.5', dense ? 'py-1.5' : 'py-2', tint, flash && 'animate-flash', className)}>
      <Glyph state={ds} red={step.red && ds !== 'prog'} />
      <button type="button" onClick={onOpen} className={cn('min-w-0 text-left', !onOpen && 'cursor-default')}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {showHire && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Avatar id={view.hire.id} size={18} />
              {view.person.name}
              <span className="text-faint">·</span>
            </span>
          )}
          <span className={cn('truncate', step.state === 'blank' || step.state === 'na' ? 'text-muted' : 'font-medium')}>{name}</span>
          {step.def.gate && <span className="rounded bg-amber-soft px-1 font-mono text-[9px] font-semibold tracking-wider text-amber-ink">GATE</span>}
          {showSource && <SourceBadge system={step.def.system} mode={step.mode} />}
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className={cn('tnum', (step.state === 'late' || step.state === 'soon') && 'font-medium text-red', ds === 'open' && 'font-medium text-ink')}>{step.ownerAway && step.holder ? `${view.hire.managerId === viewer ? "You're" : `${people[view.hire.managerId]?.name.split(' ')[0]} is`} out of office · ${lc(step.label)}` : step.label}</span>
          {step.state === 'verified' && step.doneRecorded != null && step.done != null && step.doneRecorded !== step.done && (
            <span className="text-faint">happened {fmtDay(step.done)}, recorded {fmtDay(step.doneRecorded)}</span>
          )}
        </div>
      </button>
      {/* On a phone the chip and buttons drop under the name, so the name keeps its width. */}
      <div className={cn('flex items-center gap-2', compact && 'col-span-2 col-start-2 flex-wrap')}>
        {showHolder && step.holder && !mine && <BallChip step={step} now={now} size="sm" />}
        {actions ?? <StepActions view={view} step={step} />}
      </div>
    </div>
  )
}
