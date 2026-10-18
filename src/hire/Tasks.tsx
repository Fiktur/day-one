import { useId, useState } from 'react'
import { ExternalLink, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../lib/cn'
import { useNav } from '../nav/NavContext'
import { useView } from '../engine/selectors'
import { useDemo } from '../engine/store'
import { systemNames } from '../data/journey'
import { Button, Glyph, ReqTag } from '../ui/parts'
import { HoldButton } from '../ui/hold'
import { Emoji, STEP_EMOJI } from '../ui/assets'
import { AnimatePresence, LayoutGroup, motion, springs, Segmented, Num } from '../ui/motion'
import { hireTaskLabel, isOwnActionable } from './helpers'
import type { StepView } from '../engine/derive'
import { burst } from '../ui/fx'

export function HireTasks() {
  const { viewer, go } = useNav()
  const v = useView(viewer)
  const now = useDemo((s) => s.now)
  const markDone = useDemo((s) => s.markDone)
  const flashes = useDemo((s) => s.flashes)
  const [tab, setTab] = useState<'move' | 'coming' | 'done'>('move')
  const groupId = useId()
  if (!v) return null
  const tasks = v.hireTasks
  const move = tasks.filter(isOwnActionable).sort((a, b) => Number(b.red) - Number(a.red) || (a.due ?? 99) - (b.due ?? 99))
  const confirming = tasks.filter((s) => s.state === 'confirming' || s.state === 'unknown')
  const coming = tasks.filter((s) => s.state === 'blank').sort((a, b) => (a.open ?? 999) - (b.open ?? 999))
  const done = tasks.filter((s) => s.state === 'verified' || s.state === 'na').sort((a, b) => (b.ver ?? 0) - (a.ver ?? 0))

  const row = (s: StepView) => {
    const actionable = isOwnActionable(s)
    const native = s.def.system === 'dayone'
    return (
      <motion.li
        key={s.key}
        layoutId={`task-${viewer}-${s.key}`}
        layout
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
        transition={springs.layout}
        className={cn('rounded-[20px] border px-3 py-3', actionable ? (s.red ? 'border-red/25 bg-red-soft' : 'border-amber/25 bg-amber-soft') : s.state === 'verified' ? 'border-line bg-surface' : 'border-line bg-surface/80', flashes[`${viewer}:${s.key}`] && 'animate-flash')}
      >
        <div className="grid grid-cols-[40px_1fr] gap-3">
          <span className={cn('relative grid h-10 w-10 place-items-center rounded-xl', actionable ? 'bg-white/80' : s.state === 'verified' ? 'bg-green-soft' : 'bg-sunken', s.state === 'blank' && 'opacity-60 grayscale')}>
            <Emoji name={STEP_EMOJI[s.key] ?? 'sparkles'} size={26} />
            <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-surface shadow-card"><Glyph state={s.state} size={12} pulse={actionable} /></span>
          </span>
          <div className="min-w-0">
            <div className={cn('text-[14px] leading-snug', s.state === 'blank' ? 'text-muted' : 'font-semibold')}>{s.def.hire?.label ?? s.name}</div>
            <div className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-xs', s.red && actionable ? 'font-medium text-red' : 'text-muted')}>
              {!native && <span className="rounded bg-surface/70 px-1.5 py-px font-mono text-[10px] text-muted">{systemNames[s.def.system]}</span>}
              {s.def.hire?.minutes && actionable && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{s.def.hire.minutes} min</span>}
              <span>{hireTaskLabel(s, v, now)}</span>
            </div>
            {s.def.hire?.help && (actionable || s.state === 'confirming') && <p className="mt-1 text-xs text-muted">{s.def.hire.help}</p>}
            {actionable && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {native ? (
                  <Button size="sm" variant="primary" onClick={(e) => { if (s.key === 'laptop_choice') go({ name: 'laptop' }); else if (s.key === 'details') go({ name: 'details' }); else { burst('small', e.currentTarget); markDone(viewer, s.key, viewer) } }}>{s.def.hire?.cta ?? 'Done'}</Button>
                ) : (
                  <>
                    <Button size="sm" onClick={() => toast(`Opens ${systemNames[s.def.system]} in a new tab`, { description: 'Come back and hold “Mark done” when you’ve finished.' })}>{s.def.hire?.cta ?? 'Open'} <ExternalLink className="h-3 w-3" /></Button>
                    <HoldButton onDone={() => markDone(viewer, s.key, viewer)}>Mark done</HoldButton>
                  </>
                )}
                {s.red && <Button size="sm" variant="ghost" onClick={() => go({ name: 'help' })}>Need a hand?</Button>}
              </div>
            )}
          </div>
        </div>
      </motion.li>
    )
  }

  return (
    <div className="space-y-3 px-4 pb-6">
      <div className="flex items-end justify-between pt-1">
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.02em]">Tasks</h1>
        <ReqTag ids="E3 E5 T2" />
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          ['move', <span key="m">Your move · <Num value={move.length} /></span>],
          ['coming', <span key="c">Coming · <Num value={coming.length} /></span>],
          ['done', <span key="d">Done · <Num value={done.length + confirming.length} /></span>],
        ] as const}
      />
      <LayoutGroup id={groupId}>
      {tab === 'move' && (
        <>
          <AnimatePresence>
            {move.length === 0 && (
              <motion.div key="empty" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.bouncy} className="rounded-[20px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">
                <Emoji name="party" size={44} float className="mx-auto mb-2" />
                <div className="font-semibold text-ink">All caught up!</div>
                Nothing needs you right now.
              </motion.div>
            )}
          </AnimatePresence>
          <ul className="space-y-2"><AnimatePresence mode="popLayout">{move.map(row)}</AnimatePresence></ul>
          {confirming.length > 0 && (
            <>
              <motion.div layout className="pt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">Waiting to confirm</motion.div>
              <ul className="space-y-2"><AnimatePresence mode="popLayout">{confirming.map(row)}</AnimatePresence></ul>
            </>
          )}
          {coming.length > 0 && (
            <button type="button" onClick={() => setTab('coming')} className="w-full rounded-xl px-2 py-2 text-xs text-muted hover:text-ink">{coming.length} more coming up later</button>
          )}
        </>
      )}
      {tab === 'coming' && <ul className="space-y-2"><AnimatePresence mode="popLayout">{coming.map(row)}</AnimatePresence></ul>}
      {tab === 'done' && (
        <ul className="space-y-2">
          <AnimatePresence mode="popLayout">
            {confirming.map(row)}
            {done.map(row)}
          </AnimatePresence>
        </ul>
      )}
      </LayoutGroup>
      <p className="px-1 text-[11px] leading-relaxed text-faint">Some tasks live in Workday or Checkr. When you finish one there, hold “Mark done” here. It turns green once the system confirms it.</p>
    </div>
  )
}
