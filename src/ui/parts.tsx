import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { springs } from './motion'
import { Emoji, SYSTEM_EMOJI, TEAM_EMOJI, avatarUri } from './assets'
import * as Tip from '@radix-ui/react-tooltip'
import { Check, Link2, Plug, Hand, Sparkles } from 'lucide-react'
import { cn } from '../lib/cn'
import { people } from '../data/people'
import type { Mode, SystemId } from '../data/journey'
import { MODE_LABEL, systemNames } from '../data/journey'
import type { AreaView, HireStatus, Ref, StepState, StepView } from '../engine/derive'
import { STATUS_LABEL, refName } from '../engine/derive'
import { STAGES } from '../data/journey'
import { REQS } from '../data/reqs'
import { useDemo } from '../engine/store'
import { heldFor } from '../lib/dates'

/* ---------- Status glyph ---------- */

export type GlyphState = StepState | 'prog'

export function Glyph({ state, red, size = 14, className, pulse }: { state: GlyphState; red?: boolean; size?: number; className?: string; pulse?: boolean }) {
  const s = red && state !== 'verified' && state !== 'na' ? 'late' : state
  // Pop on change (not on first paint), with a ring that bursts when something turns green.
  const prev = useRef(s)
  const changed = prev.current !== s
  useEffect(() => {
    prev.current = s
  })
  const base = 'relative inline-grid place-items-center rounded-full shrink-0'
  const style = { width: size, height: size }
  const check = <Check strokeWidth={3.4} style={{ width: size * 0.62, height: size * 0.62 }} />
  let cls = ''
  let label = 'Not yet'
  let inner: ReactNode = null
  let bg: React.CSSProperties | undefined
  switch (s) {
    case 'verified': cls = 'bg-green text-surface'; label = 'Verified'; inner = check; break
    case 'confirming': cls = 'border-2 border-green text-green bg-surface'; label = 'Done, waiting to confirm'; inner = check; break
    case 'open': cls = cn('bg-amber', pulse && 'halo-amber'); label = 'Due now'; break
    case 'soon':
    case 'late': cls = cn('bg-red', pulse && 'halo-red'); label = s === 'late' ? 'Overdue' : 'About to be overdue'; break
    case 'unknown': cls = 'border-[1.5px] border-dashed border-muted'; label = "Can't check right now"; break
    case 'na': cls = 'border-[1.5px] border-faint bg-sunken'; label = 'Not needed'; inner = <span className="block h-[1.5px] w-1/2 bg-faint" />; break
    case 'prog': cls = 'border-2 border-accent'; label = 'In progress'; bg = { background: 'conic-gradient(rgb(var(--accent)) 0 50%, transparent 50% 100%)' }; break
    default: cls = 'border-[1.5px] border-faint/60 bg-surface'
  }
  return (
    <motion.span
      key={s}
      aria-label={label}
      className={cn(base, cls, className)}
      style={{ ...style, ...bg }}
      initial={changed ? { scale: 0.2, rotate: -40 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={springs.bouncy}
    >
      {inner}
      {changed && s === 'verified' && (
        <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-green" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 2.8, opacity: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      )}
    </motion.span>
  )
}

/** Yellow is personal: someone else's open step shows as calm "in progress". */
export function displayState(step: StepView, mine: boolean, coordinator: boolean, hireView = false): GlyphState {
  if (hireView && !mine && (step.state === 'open' || step.state === 'soon' || step.state === 'late' || step.state === 'confirming')) return 'prog'
  if (step.state === 'open' && !mine && !coordinator) return 'prog'
  if (step.red && step.state === 'confirming') return 'late'
  return step.state
}

/* ---------- Avatars and people ---------- */

export function Avatar({ id, refObj, size = 28, className }: { id?: string; refObj?: Ref; size?: number; className?: string }) {
  const r: Ref | undefined = refObj ?? (id ? { kind: 'person', id, name: people[id]?.name ?? id, short: '' } : undefined)
  if (!r) return null
  if (r.kind === 'person') {
    const hue = people[r.id]?.hue ?? 0
    return (
      <span aria-hidden className={cn('inline-block shrink-0 overflow-hidden rounded-full ring-1 ring-surface', className)} style={{ width: size, height: size, background: `rgb(var(--av${hue}) / 0.16)` }}>
        <img src={avatarUri(r.id)} alt="" draggable={false} className="h-full w-full" />
      </span>
    )
  }
  const emoji = r.kind === 'team' ? TEAM_EMOJI[r.id] : r.kind === 'provider' ? SYSTEM_EMOJI[r.id] : undefined
  if (emoji) {
    return (
      <span aria-hidden className={cn('inline-grid shrink-0 place-items-center rounded-[30%] border border-line bg-surface', className)} style={{ width: size, height: size }}>
        <Emoji name={emoji} size={Math.round(size * 0.72)} className="drop-shadow-none" />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={cn('inline-grid shrink-0 place-items-center rounded-[30%] border border-line bg-sunken font-mono font-semibold leading-none text-muted', className)}
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.34) }}
    >
      {r.short || r.name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export function BallChip({ step, now, size = 'md', showTime = true }: { step: StepView; now: number; size?: 'sm' | 'md'; showTime?: boolean }) {
  if (!step.holder) return null
  const hot = step.red
  return (
    <motion.span
      key={step.holder.id}
      initial={{ opacity: 0, x: -10, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={springs.bouncy}
      title={shortName(step.holder)}
      className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full border bg-surface pr-2 shadow-card', size === 'sm' ? 'py-0.5 pl-0.5 text-xs' : 'py-0.5 pl-0.5 text-[13px]', hot ? 'border-red/70' : 'border-line')}
    >
      <Avatar refObj={step.holder} size={size === 'sm' ? 18 : 22} />
      <span className="truncate">{shortName(step.holder)}</span>
      {showTime && step.heldSince != null && (
        <span className={cn('font-mono text-2xs tnum', hot ? 'text-red' : 'text-faint')}>{heldFor(step.heldSince, now)}</span>
      )}
    </motion.span>
  )
}

export function shortName(r: Ref): string {
  if (r.kind === 'person') {
    const n = people[r.id]?.name ?? r.name
    const parts = n.split(' ')
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : n
  }
  return refName(r)
}

/* ---------- Pills ---------- */

export function StatusPill({ status, className }: { status: HireStatus; className?: string }) {
  const tone: Record<HireStatus, string> = {
    ontrack: 'bg-green-soft text-green',
    behind: 'bg-amber-soft text-amber-ink',
    ready: 'bg-green text-surface',
    atrisk: 'bg-red-soft text-red',
    unknown: 'border border-dashed border-muted text-muted',
    withdrawn: 'bg-sunken text-muted',
    started: 'bg-accent-soft text-accent',
  }
  return <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', tone[status], className)}>{STATUS_LABEL[status]}</span>
}

export function Pill({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'amber' | 'red' | 'green' | 'dashed'; className?: string }) {
  const t = {
    neutral: 'bg-sunken text-muted',
    accent: 'bg-accent-soft text-accent',
    amber: 'bg-amber-soft text-amber-ink',
    red: 'bg-red-soft text-red',
    green: 'bg-green-soft text-green',
    dashed: 'border border-dashed border-muted text-muted',
  }[tone]
  return <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', t, className)}>{children}</span>
}

/* ---------- Source badge ---------- */

export function SourceBadge({ system, mode, className }: { system: SystemId; mode: Mode; className?: string }) {
  if (mode === 'native') return null
  const Icon = mode === 'connected' ? Plug : mode === 'linked' ? Link2 : Hand
  return (
    <span title={MODE_LABEL[mode]} className={cn('inline-flex shrink-0 items-center gap-1 rounded border border-line bg-surface px-1.5 py-px font-mono text-2xs text-muted', className)}>
      <Icon className={cn('h-3 w-3', mode === 'connected' ? 'text-green' : mode === 'linked' ? 'text-accent' : 'text-faint')} />
      {systemNames[system]}
    </span>
  )
}

/* ---------- Readiness and stage ---------- */

export function ReadinessBar({ areas, mineArea, compact }: { areas: AreaView[]; mineArea?: string | null; compact?: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {areas.map((a) => {
        const st = a.id === mineArea && a.state === 'progress' ? 'mine' : a.state
        const fill = {
          green: 'bg-green',
          progress: 'bg-accent/80',
          red: 'bg-red',
          unknown: 'border border-dashed border-muted bg-transparent',
          blank: 'bg-sunken',
          mine: 'bg-amber',
        }[st]
        return (
          <div key={a.id} className="min-w-0" title={`${a.label}: ${a.done} of ${a.total} done`}>
            <div className={cn('h-1.5 rounded-full', fill)} />
            {!compact && <div className="mt-1 truncate text-2xs text-muted">{a.short}</div>}
          </div>
        )
      })}
    </div>
  )
}

export function StageTrack({ stage, labels = false, width }: { stage: number; labels?: boolean; width?: number }) {
  return (
    <div style={width ? { width } : undefined}>
      <div className="grid grid-cols-7 gap-0.5">
        {STAGES.map((l, i) => (
          <span key={i} title={l} className={cn('h-1.5 rounded-sm', i < stage ? 'bg-ink/80' : i === stage ? 'bg-accent' : 'bg-sunken')} />
        ))}
      </div>
      {labels && (
        <div className="mt-1 truncate text-[11px] text-muted"><span className="font-semibold text-accent">{STAGES[stage]}</span> · stage {stage + 1} of {STAGES.length}</div>
      )}
    </div>
  )
}

/* ---------- Buttons ---------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'; size?: 'xs' | 'sm' | 'md' | 'lg' }
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'secondary', size = 'sm', className, disabled, ...rest }, ref) {
  const v = {
    primary: 'btn-gradient text-white border border-transparent shadow-glow',
    secondary: 'bg-surface text-ink border border-line shadow-card hover:border-faint',
    ghost: 'text-muted hover:text-ink hover:bg-sunken border border-transparent',
    danger: 'bg-red text-white border border-red',
    quiet: 'bg-sunken text-ink border border-transparent hover:border-line',
  }[variant]
  const s = { xs: 'h-7 px-2.5 text-xs gap-1 rounded-lg', sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-xl', md: 'h-10 px-4 text-sm gap-2 rounded-xl', lg: 'h-12 px-6 text-[15px] gap-2 rounded-2xl' }[size]
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1.5 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={springs.snappy}
      className={cn('inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold disabled:opacity-50', v, s, className)}
      {...(rest as Record<string, unknown>)}
    />
  )
})

/** Filter chip: gradient when on, quiet when off. Used for every filter row. */
export function Chip({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <motion.button
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.9 }}
      transition={springs.bouncy}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 font-medium transition-colors', on ? 'border-transparent btn-gradient text-white shadow-glow' : 'border-line bg-surface/80 text-muted hover:border-faint hover:text-ink', className)}
    >
      {children}
    </motion.button>
  )
}

/* ---------- Layout bits ---------- */

export function Card({ children, className, flash }: { children: ReactNode; className?: string; flash?: boolean }) {
  return <div className={cn('rounded-2xl border border-line/80 bg-surface shadow-card', flash && 'animate-flash', className)}>{children}</div>
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('font-mono text-2xs uppercase tracking-[0.08em] text-faint', className)}>{children}</div>
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
      <Emoji name="sparkles" size={30} className="mx-auto mb-1.5" float />
      <div className="font-medium">{title}</div>
      {body && <div className="mt-1 text-[13px] text-muted">{body}</div>}
    </div>
  )
}

/* ---------- Requirement tags (presenter overlay) ---------- */

export function ReqTag({ ids, className }: { ids: string; className?: string }) {
  const on = useDemo((s) => s.tags)
  if (!on) return null
  return (
    <span className={cn('inline-flex flex-wrap gap-1 align-middle', className)}>
      {ids.split(/[ ,]+/).filter(Boolean).map((id) => (
        <Tooltip key={id} content={`${id}: ${REQS[id] ?? ''}`}>
          <span className="inline-flex items-center gap-0.5 rounded bg-stage px-1 py-px font-mono text-[10px] font-medium text-stage-ink">
            <Sparkles className="h-2.5 w-2.5" />
            {id}
          </span>
        </Tooltip>
      ))}
    </span>
  )
}

export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tip.Root delayDuration={200}>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content side={side} sideOffset={6} className="z-[80] max-w-xs rounded-md bg-stage px-2 py-1 text-xs text-stage-ink shadow-pop">
          {content}
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('inline-grid h-5 min-w-5 place-items-center rounded border border-b-2 border-line bg-surface px-1 font-mono text-[10px] text-muted', className)}>{children}</kbd>
}
