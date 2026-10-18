import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn, lc } from '../lib/cn'
import { useNav } from '../nav/NavContext'
import { useCtx, useView } from '../engine/selectors'
import { useDemo } from '../engine/store'
import { managerFor, type HireView } from '../engine/derive'
import { fmtDay, fmtShort, fmtWeekdayShort } from '../lib/dates'
import { people } from '../data/people'
import { PEPPER_VIDEO } from '../data/welcome'
import { Avatar, Button, Glyph, ReqTag } from '../ui/parts'
import { VideoTile } from '../ui/video'
import { Emoji, STEP_EMOJI, type EmojiName } from '../ui/assets'
import { HoldButton } from '../ui/hold'
import { AnimatePresence, Num, Tilt, motion, springs } from '../ui/motion'
import { useCelebrate } from '../ui/fx'
import { buddyOf, confirmBy, handledFor, hireTaskLabel, isOwnActionable, usePlan, type HandledItem } from './helpers'
import { systemNames } from '../data/journey'

const HANDLED_EMOJI: Record<string, EmojiName> = { bg: 'shield', permit: 'globe', laptop: 'laptop', account: 'key', seat: 'calendar' }

export function HireHome({ wide }: { wide?: boolean }) {
  const { viewer, go } = useNav()
  const v = useView(viewer)
  const now = useDemo((s) => s.now)
  const laptopModel = useDemo((s) => s.laptopModel[viewer])
  const board = useDemo((s) => s.boards[viewer])
  const flashes = useDemo((s) => s.flashes)
  const markDone = useDemo((s) => s.markDone)
  const change = useDemo((s) => [...s.dateChanges].reverse().find((c) => c.hireId === viewer))
  const [showHandled, setShowHandled] = useState(false)
  if (!v) return null
  const h = v.hire
  const first = v.person.name.split(' ')[0]
  const blocked = now >= h.start && v.status === 'atrisk'
  const started = now >= h.start && !blocked
  const days = Math.max(0, h.start - now)
  const own = v.hireTasks.filter((s) => s.def.stage <= 4)
  const actionable = v.hireTasks.filter(isOwnActionable).sort((a, b) => Number(b.red) - Number(a.red) || (a.due ?? 99) - (b.due ?? 99))
  const doneCount = own.filter((s) => s.state === 'verified' || s.state === 'confirming').length
  const next = actionable[0]
  const nextOpen = v.hireTasks.filter((s) => s.state === 'blank' && s.open != null && s.open > now).sort((a, b) => a.open! - b.open!)[0]
  const anyRed = actionable.some((s) => s.red)
  const handled = handledFor(v, now, laptopModel)
  const companySlow = handled.some((x) => x.text.startsWith('Taking longer'))
  const pct = own.length ? doneCount / own.length : 0
  // The forecast says the date won't hold, but nobody has moved it yet: say so plainly, without alarm.
  const mayMove = !blocked && !change && v.forecastEnd != null && v.forecastEnd >= h.start
  const slow = handled.filter((x) => x.text.startsWith('Taking longer'))
  const inMotion = handled.filter((x) => x.glyph === 'prog').length

  if (started) return wide ? <div className="mx-auto max-w-2xl"><StartedHome /></div> : <StartedHome />

  // The same sections stack on a phone and sit in two columns on a desktop, so the two layouts never drift apart.
  const left = (
    <>
      <div className="pt-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Day One <ReqTag ids="E2" /></div>
        <h1 className="flex items-center gap-2 font-display text-[32px] font-extrabold leading-[1.02] tracking-[-0.02em]">
          <motion.span initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={springs.bouncy}>Hi {first}</motion.span>
          <Emoji name="wave" size={34} wave />
        </h1>
      </div>

      {/* Countdown hero */}
      <Tilt max={4}>
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ ...springs.bouncy, delay: 0.05 }}
          className={cn('relative overflow-hidden rounded-[26px] btn-gradient p-4 text-white shadow-glow', flashes[`${viewer}:start`] && 'animate-flash')}
        >
          <div aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-xl" />
          <div aria-hidden className="absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/75">Your first day</div>
              {blocked ? (
                <div className="mt-1 font-display text-[22px] font-extrabold leading-tight">We're confirming a new start date</div>
              ) : (
                <div className="mt-1 flex items-baseline gap-1.5">
                  <Num value={days} className="font-display text-[54px] font-extrabold leading-none" />
                  <span className="text-[15px] font-semibold text-white/90">day{days === 1 ? '' : 's'} to go</span>
                </div>
              )}
              <div className="mt-1 text-[13px] font-medium text-white/85">{blocked ? `Not ${fmtWeekdayShort(h.start)}. ${people.maria.name.split(' ')[0]} will be in touch.` : fmtWeekdayShort(h.start)}</div>
              {mayMove && <div className="mt-1 text-[12px] text-white/85">Your start date may move. {people.maria.name.split(' ')[0]} will confirm it with you by {fmtShort(confirmBy(h.start, now))}.</div>}
            </div>
            <Ring pct={pct} label={<><Num value={doneCount} />/{own.length}</>} aria={`${doneCount} of ${own.length} of your tasks done`} />
          </div>
          <div className="relative mt-3 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-[12.5px] backdrop-blur">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white">
              <Glyph state={anyRed ? 'late' : blocked || mayMove ? 'prog' : 'verified'} size={14} />
            </span>
            <span className="min-w-0 truncate font-medium">{anyRed ? 'One thing needs you today' : blocked ? 'We’ll confirm your new date with you' : mayMove ? (actionable.length ? 'Keep going. We’ll confirm your date.' : 'Nothing you need to do right now') : actionable.length ? (companySlow ? "You're on track. One thing is with us." : "You're on track. Nothing late.") : "You're all set for now"}</span>
          </div>
          {!blocked && !mayMove && <Emoji name="rocket" size={46} float className="absolute bottom-12 right-[92px] opacity-95" />}
        </motion.div>
      </Tilt>

      {change && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.bouncy} className={cn('flex gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13px]', flashes[`${viewer}:start`] && 'animate-flash')}>
          <Emoji name="calendar" size={30} />
          <div>
            <div className="font-semibold">Your start date is now {fmtWeekdayShort(change.to)} <span className="font-normal text-muted">(was {fmtShort(change.from)})</span></div>
            <p className="mt-0.5 text-muted">Everything below has been updated for the new date. Your manager will be in touch.</p>
          </div>
        </motion.div>
      )}

      {blocked && <WhatHappensNow v={v} handled={handled} />}
      {!blocked && !mayMove && days > 0 && days <= 3 && <FirstDay v={v} title={`Your first day · ${fmtWeekdayShort(h.start)}`} />}

      <AnimatePresence mode="popLayout" initial={false}>
        {next ? (
          <motion.div
            key={next.key}
            layout
            initial={{ x: 60, opacity: 0, rotate: 2 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
            transition={springs.bouncy}
            className={cn('relative overflow-hidden rounded-[22px] border bg-surface p-3.5 shadow-lift', next.red ? 'border-red/40' : 'border-amber/40', flashes[`${viewer}:${next.key}`] && 'animate-flash')}
          >
            <div aria-hidden className={cn('absolute inset-y-0 left-0 w-1', next.red ? 'bg-red' : 'bg-amber')} />
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Your next step <ReqTag ids="E3" /></div>
              {actionable.length > 1 && <button type="button" onClick={() => go({ name: 'tasks' })} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-accent">+{actionable.length - 1} more</button>}
            </div>
            <div className="mt-2 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-display text-[17px] font-bold leading-snug"><Glyph state={next.state} pulse />{next.def.hire?.label ?? next.name}</div>
                <div className={cn('mt-0.5 text-xs', next.red ? 'font-medium text-red' : 'text-muted')}>
                  {systemNames[next.def.system] !== 'Day One' ? `${systemNames[next.def.system]} · ` : ''}{next.def.hire?.minutes ? `about ${next.def.hire.minutes} min · ` : ''}{lc(hireTaskLabel(next, v, now))}
                </div>
                {next.def.hire?.help && <p className="mt-1 text-xs text-muted">{next.def.hire.help}</p>}
              </div>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sunken">
                <Emoji name={STEP_EMOJI[next.key] ?? 'sparkles'} size={38} float />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {next.def.system === 'dayone' ? (
                <Button variant="primary" onClick={() => go({ name: next.key === 'laptop_choice' ? 'laptop' : next.key === 'details' ? 'details' : 'tasks' })}>{next.def.hire?.cta ?? 'Open'}</Button>
              ) : (
                <>
                  <Button onClick={() => toast(`Opens ${systemNames[next.def.system]} in a new tab`, { description: 'Come back and hold “Mark done” when you’ve finished.' })}>{next.def.hire?.cta ?? `Open in ${systemNames[next.def.system]}`} <ExternalLink className="h-3 w-3" /></Button>
                  <HoldButton onDone={() => markDone(viewer, next.key, viewer)}>Mark done</HoldButton>
                </>
              )}
              {next.red && <Button variant="ghost" onClick={() => go({ name: 'help' })}>Need a hand?</Button>}
            </div>
          </motion.div>
        ) : blocked || (!mayMove && days > 0 && days <= 3) ? null : (
          <motion.div key="none" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.bouncy} className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-3.5 shadow-card">
            <Emoji name="party" size={40} float />
            <div>
              <div className="font-semibold">{nextOpen && !(mayMove && nextOpen.open! >= h.start) ? `Nothing until ${fmtWeekdayShort(nextOpen.open!)}` : 'Nothing needs you right now'}</div>
              <div className="mt-0.5 text-xs text-muted">{mayMove ? 'We’ll tell you as soon as your start date is confirmed.' : nextOpen ? `Then: ${nextOpen.def.hire?.label ?? nextOpen.name}.` : 'We will let you know when something does.'}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
  const right = (
    <>
      <div className="rounded-[22px] border border-line bg-surface p-3.5 shadow-card">
        <button type="button" aria-expanded={showHandled} onClick={() => setShowHandled(!showHandled)} className="flex w-full items-center gap-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Being handled for you <ReqTag ids="E7 T2" /></span>
            <span className="mt-0.5 block text-[13px] font-semibold">{inMotion ? `${inMotion} thing${inMotion > 1 ? 's' : ''} in motion` : 'All done so far'}<span className="font-normal text-muted"> · {slow.length ? 'one is taking longer' : 'all on track'}</span></span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition', showHandled && 'rotate-180')} />
        </button>
        {(showHandled || slow.length > 0) && (
          <ul className="mt-2.5 space-y-2">
            {(showHandled ? handled : slow).map((x, i) => (
              <HandledRow key={x.key} x={x} i={i} flash={x.flashKeys.some((k) => flashes[`${viewer}:${k}`])} v={v} />
            ))}
          </ul>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => go({ name: 'welcome' })} className="block w-full overflow-hidden rounded-[22px] border border-line bg-surface p-3.5 text-left shadow-card">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold"><Emoji name="heart" size={20} />Welcome board</span>
          <span className="flex items-center gap-1 text-xs font-medium text-accent">{board?.status === 'live' ? `${board.posts.length + 1} messages` : 'Coming soon'}<ChevronRight className="h-3.5 w-3.5" /></span>
        </div>
        <div className="mt-3 flex items-end justify-center gap-0 pb-1">
          {(board?.status === 'live' ? board.posts.filter((p) => p.kind === 'video').slice(0, 2) : []).concat([PEPPER_VIDEO]).slice(0, 3).map((p, i, arr) => (
            <motion.div
              key={p.id}
              initial={{ y: 30, opacity: 0, rotate: 0 }}
              animate={{ y: 0, opacity: 1, rotate: arr.length === 1 ? -3 : (i - (arr.length - 1) / 2) * 7 }}
              whileHover={{ y: -8, rotate: 0, scale: 1.06, zIndex: 5 }}
              transition={{ ...springs.bouncy, delay: 0.1 + i * 0.07 }}
              className="-mx-1 w-[31%] rounded-xl bg-white p-1 pb-4 shadow-lift ring-1 ring-ink/5"
            >
              <VideoTile post={p} still className="rounded-lg" />
            </motion.div>
          ))}
          {board?.status !== 'live' && (
            <div className="ml-3 grid flex-1 place-items-center rounded-xl border border-dashed border-line px-2 py-6 text-center text-[11px] text-muted">
              <Emoji name="camera" size={26} float className="mb-1" />Your team is recording hellos
            </div>
          )}
        </div>
      </motion.button>

      <QuickLinks names={wide ? ['firstweek', 'company'] : ['firstweek', 'people', 'company']} />
    </>
  )
  if (wide) {
    return (
      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start gap-5 px-6 pb-8 pt-2">
        <div className="space-y-3.5">{left}</div>
        <div className="space-y-3.5"><YourPeople v={v} />{right}</div>
      </div>
    )
  }
  return <div className="space-y-3.5 px-4 pb-4">{left}{right}</div>
}

const LINKS: Record<string, { label: string; emoji: EmojiName }> = {
  firstweek: { label: 'First week', emoji: 'calendar' },
  people: { label: 'Your people', emoji: 'people' },
  company: { label: 'Benefits', emoji: 'heart' },
  welcome: { label: 'Welcome board', emoji: 'heart' },
}

function QuickLinks({ names }: { names: string[] }) {
  const { go } = useNav()
  return (
    <div className="flex flex-wrap gap-2">
      {names.map((name) => (
        <motion.button key={name} whileTap={{ scale: 0.94 }} whileHover={{ y: -1.5 }} transition={springs.bouncy} type="button" onClick={() => go({ name })} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3 text-[13px] font-semibold shadow-card">
          <Emoji name={LINKS[name].emoji} size={20} />
          {LINKS[name].label}
        </motion.button>
      ))}
    </div>
  )
}

/** Desktop only: the people around the hire, one click from the full page. */
function YourPeople({ v }: { v: HireView }) {
  const { go } = useNav()
  const ctx = useCtx()
  const buddy = buddyOf(v)
  const list = [{ id: managerFor(v.hire, ctx).id, role: 'Manager' }, ...(buddy ? [{ id: buddy, role: 'Buddy' }] : []), { id: 'maria', role: 'Onboarding team' }]
  return (
    <button type="button" onClick={() => go({ name: 'people' })} className="block w-full rounded-[22px] border border-line bg-surface p-3.5 text-left shadow-card">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Your people</div>
      <ul className="space-y-2">
        {list.map((x) => <li key={x.id} className="flex items-center gap-2.5 text-[13px]"><Avatar id={x.id} size={30} /><span className="min-w-0"><span className="block truncate font-semibold">{people[x.id]?.name}</span><span className="block text-xs text-muted">{x.role}</span></span></li>)}
      </ul>
    </button>
  )
}

/** The first day, hour by hour, from the manager's plan, plus the first piece of work once it's chosen. */
function FirstDay({ v, title }: { v: HireView; title: string }) {
  const { plan, work, saved, session } = usePlan(v)
  const remote = session?.where === 'Video call'
  return (
    <div className="rounded-[22px] border border-accent/30 bg-surface p-3.5 shadow-card">
      <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{title}</span>{!saved && <span className="text-[11px] text-muted">Draft agenda</span>}</div>
      <ol className="space-y-1.5">
        {plan[0].map((x, i) => <li key={i} className="grid grid-cols-[58px_1fr] gap-2 text-[13px]"><span className="font-mono text-xs text-faint">{x.t}</span><span>{x.l}</span></li>)}
      </ol>
      {session && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
          <span>{remote ? `Orientation starts at ${session.time.split('–')[0]}. The link opens at 8:45.` : `${session.where}. Front desk from 8:45 for your badge.`}</span>
          {remote && <Button size="xs" onClick={() => toast('Opens the orientation call in a new tab', { description: 'The same link is in your calendar invite.' })}>Join</Button>}
        </div>
      )}
      {work && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-[13px]">
          <Emoji name="target" size={20} />
          <span className="min-w-0 flex-1"><span className="block text-[11px] text-muted">Your first piece of work</span><span className="block truncate font-semibold">{work.title}</span></span>
          {work.link && <a href={work.link} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-accent">Open</a>}
        </div>
      )}
    </div>
  )
}

/** When the start date can't hold: what's still open, who decides the new date, and that nothing is on the hire. */
function WhatHappensNow({ v, handled }: { v: HireView; handled: HandledItem[] }) {
  const now = useDemo((s) => s.now)
  const open = handled.filter((x) => x.glyph !== 'verified')
  const mgr = people[v.hire.managerId]?.name.split(' ')[0]
  return (
    <div className="rounded-[22px] border border-line bg-surface p-3.5 shadow-card">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">What happens now</div>
      <ol className="space-y-2 text-[13px]">
        {open.map((x) => <li key={x.key} className="flex gap-2"><Glyph state={x.glyph} size={14} className="mt-0.5" /><span><span className="font-semibold">{x.label}:</span> <span className="text-muted">{x.text}</span></span></li>)}
        <li className="flex gap-2"><Glyph state="prog" size={14} className="mt-0.5" /><span><span className="font-semibold">New date:</span> <span className="text-muted">Maria Hill agrees it with {mgr} and tells you by {fmtShort(confirmBy(v.hire.start, now))}.</span></span></li>
        <li className="flex gap-2"><Glyph state="verified" size={14} className="mt-0.5" /><span className="text-muted">Your laptop, account and orientation seat move with the date. Nothing for you to do.</span></li>
      </ol>
    </div>
  )
}

function HandledRow({ x, i, flash, v }: { x: HandledItem; i: number; flash: boolean; v: HireView }) {
  const ref = useCelebrate<HTMLLIElement>(flash && x.glyph === 'verified')
  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...springs.soft, delay: 0.05 * i }}
      className={cn('rounded-2xl px-1.5 py-1', flash && 'animate-flash')}
    >
      <div className="flex items-center gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', x.glyph === 'verified' ? 'bg-green-soft' : x.glyph === 'prog' ? 'bg-accent-soft' : 'bg-sunken')}>
          <Emoji name={HANDLED_EMOJI[x.key] ?? 'sparkles'} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">{x.label}</div>
          <div className="text-xs text-muted">{x.text}</div>
        </div>
        <Glyph state={x.glyph} size={16} />
      </div>
      {x.key === 'laptop' && <ShipTracker v={v} />}
    </motion.li>
  )
}

/** Ordered → set up → shipped → delivered, with the parcel riding along the line. */
export function ShipTracker({ v, inset = true }: { v: HireView; inset?: boolean }) {
  const b = v.by
  const ordered = b.laptop_release && b.laptop_release.state !== 'blank'
  if (!ordered) return null
  const placed = b.laptop_release!.state === 'verified'
  const stops = [v.hire.rehire ? (placed ? 'Reissued' : 'Reissuing') : placed ? 'Ordered' : 'Ordering', 'Set up', 'Shipped', 'Delivered']
  const at =
    b.laptop_deliver?.state === 'verified' || b.laptop_received?.state === 'verified' ? 3
      : b.laptop_ship?.state === 'verified' ? 2
        : b.laptop_prep?.state === 'verified' ? 1
          : 0
  const pct = (at / 3) * 100
  return (
    <div className={cn('mt-2 pr-1', inset && 'ml-[52px]')}>
      <div className="relative h-6">
        <div className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-sunken" />
        <div className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2">
          <motion.div className="h-full origin-left rounded-full btn-gradient" initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ ...springs.soft, delay: 0.3 }} />
        </div>
        {stops.map((s, i) => (
          <span key={s} className={cn('absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface', i <= at ? 'bg-accent' : 'bg-line')} style={{ left: `calc(${(i / 3) * 100}% + ${4 - (i / 3) * 8}px)` }} />
        ))}
        <div className="pointer-events-none absolute inset-x-1 top-1/2">
          <motion.div className="w-full" initial={{ x: '0%' }} animate={{ x: `${pct}%` }} transition={{ ...springs.bouncy, delay: 0.3 }}>
            <span className="block w-fit -translate-x-1/2 -translate-y-[85%]"><Emoji name="package" size={22} className="bob" /></span>
          </motion.div>
        </div>
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-faint">
        {stops.map((s, i) => <span key={s} className={cn(i === at && 'font-semibold text-accent')}>{s}</span>)}
      </div>
    </div>
  )
}

function Ring({ pct, label, aria }: { pct: number; label: React.ReactNode; aria: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <div role="img" aria-label={aria} title={aria} className="relative grid h-[78px] w-[78px] shrink-0 place-items-center">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="7" />
        <motion.circle cx="36" cy="36" r={r} fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ ...springs.soft, delay: 0.25 }} />
      </svg>
      <div className="text-center leading-none">
        <div className="font-display text-[17px] font-extrabold">{label}</div>
        <div className="mt-0.5 text-[8px] font-medium uppercase leading-tight tracking-wider text-white/75">your<br />tasks</div>
      </div>
    </div>
  )
}

function StartedHome() {
  const { viewer, go } = useNav()
  const v = useView(viewer)!
  const now = useDemo((s) => s.now)
  const week = Math.floor((now - v.hire.start) / 7) + 1
  const ramp = v.steps.filter((s) => s.def.stage >= 5 && s.def.owner.type !== 'team')
  const doneRamp = ramp.filter((s) => s.state === 'verified').length
  return (
    <div className="space-y-3.5 px-4 pb-4">
      <div className="pt-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Week {week}</div>
        <h1 className="flex items-center gap-2 font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em]">{now === v.hire.start ? 'Welcome aboard' : 'Welcome back'}, {v.person.name.split(' ')[0]} <Emoji name="sunrise" size={32} float /></h1>
        <p className="mt-1 text-[13px] text-muted">{now === v.hire.start ? 'Today is your first day.' : `You started ${fmtDay(v.hire.start)}.`} Here's what's next on your ramp.</p>
      </div>
      {now === v.hire.start && <FirstDay v={v} title="Today" />}
      <Tilt max={4}>
        <div className="relative overflow-hidden rounded-[26px] btn-gradient p-4 text-white shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/75">Your first 90 days</div>
              <div className="mt-1 flex items-baseline gap-1.5"><Num value={doneRamp} className="font-display text-[44px] font-extrabold leading-none" /><span className="font-semibold text-white/90">of {ramp.length} milestones</span></div>
            </div>
            <Emoji name="seedling" size={56} float />
          </div>
        </div>
      </Tilt>
      <div className="rounded-[22px] border border-line bg-surface p-3.5 shadow-card">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Your ramp <ReqTag ids="T10 X5" /></div>
        <ul className="space-y-2.5">
          {ramp.map((s, i) => {
            // On day one the day's own sessions read "Today", not done, until the day is over.
            const today = now === v.hire.start && s.done === now
            return (
            <motion.li key={s.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springs.soft, delay: 0.05 * i }} className="flex items-center gap-3">
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.state === 'verified' ? 'bg-green-soft' : 'bg-sunken')}><Emoji name={STEP_EMOJI[s.key] ?? 'target'} size={24} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{s.key === 'checkin30' ? `30-day check-in with ${people[v.hire.managerId].name.split(' ')[0]}` : s.def.hire?.label ?? s.name}</div>
                <div className="text-xs text-muted">{today ? 'Today' : hireTaskLabel(s, v, now)}{s.key === 'milestone' && s.state === 'verified' ? ` · confirmed by ${people[v.hire.managerId].name.split(' ')[0]}` : ''}</div>
              </div>
              <Glyph state={today ? 'prog' : s.state} size={16} />
            </motion.li>
            )
          })}
        </ul>
      </div>
      <QuickLinks names={['welcome', 'people', 'company']} />
      <p className="px-1 text-xs text-muted">Your first contribution is tracked separately from paperwork. It's agreed with your manager, not counted from clicks.</p>
      <Button variant="secondary" className="w-full" onClick={() => go({ name: 'help' })}>Ask a question</Button>
    </div>
  )
}
