import { ChevronLeft, Home as HomeIcon, ListChecks, Heart, MessageCircle, LogOut, Signal, Wifi, BatteryFull } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { PageTransition, motion, springs, AnimatePresence } from '../ui/motion'
import { sfx } from '../ui/fx'
import { cn } from '../lib/cn'
import { useNav } from '../nav/NavContext'
import { useView } from '../engine/selectors'
import { useDemo } from '../engine/store'
import { Avatar } from '../ui/parts'
import { isOwnActionable } from './helpers'
import { HireHome } from './Home'
import { DayOneMoment } from './DayOne'
import { HireTasks } from './Tasks'
import { HireWelcome } from './Welcome'
import { HireHelp } from './Help'
import { FirstWeek, People, Company, SignIn, Withdrawn, DetailsPage, LaptopPage } from './More'

const TABS = [
  { name: 'home', label: 'Home', icon: HomeIcon },
  { name: 'tasks', label: 'Tasks', icon: ListChecks },
  { name: 'welcome', label: 'Welcome', icon: Heart },
  { name: 'help', label: 'Help', icon: MessageCircle },
]

const TAB_ORDER = TABS.map((t) => t.name)

const SUBPAGES: Record<string, string> = { firstweek: 'Your first week', people: 'Your people', company: 'Company and benefits', details: 'Your details', laptop: 'Your laptop' }

export function HirePortal({ frame }: { frame: 'phone' | 'none' }) {
  const { viewer, route, go, compact } = useNav()
  const v = useView(viewer)
  const now = useDemo((s) => s.now)
  const boardNew = useDemo((s) => (s.boards[viewer]?.posts.filter((p) => p.day >= now - 2).length ?? 0))
  const tabId = useId()
  const prev = useRef(0)
  const idx = TAB_ORDER.indexOf(route.name)
  const dir = idx < 0 ? 1 : idx >= prev.current ? 1 : -1
  useEffect(() => { if (idx >= 0) prev.current = idx }, [idx])
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [route.name])
  if (!v) return null
  const own = v.hireTasks.filter(isOwnActionable)
  const red = own.some((s) => s.red)
  const withdrawn = v.status === 'withdrawn'

  const body: ReactNode = withdrawn ? <Withdrawn /> : (() => {
    switch (route.name) {
      case 'tasks': return <HireTasks />
      case 'welcome': return <HireWelcome />
      case 'help': return <HireHelp />
      case 'firstweek': return <FirstWeek />
      case 'people': return <People />
      case 'company': return <Company />
      case 'details': return <DetailsPage />
      case 'laptop': return <LaptopPage />
      case 'signin': return <SignIn />
      default: return <HireHome />
    }
  })()

  const sub = SUBPAGES[route.name]
  // Task flows (details, laptop) and sign-in get the full screen; Help pins its chat box above the tab bar.
  const showNav = !withdrawn && !['signin', 'details', 'laptop'].includes(route.name)
  const fill = route.name === 'help'
  const screen = (
    <div className="relative flex h-full min-h-0 flex-col bg-bg">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(120%_80%_at_10%_0%,rgb(var(--glow-a)/0.35),transparent_60%),radial-gradient(90%_70%_at_100%_0%,rgb(var(--glow-b)/0.35),transparent_60%)]" />
      {route.name !== 'signin' && (
        <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-2">
          {sub ? (
            <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => go({ name: route.name === 'details' || route.name === 'laptop' ? 'tasks' : 'home' })} className="-ml-1 flex items-center gap-1 rounded-full bg-surface/70 py-1 pl-1 pr-3 text-[13px] font-semibold text-ink shadow-card backdrop-blur">
              <ChevronLeft className="h-4 w-4" />{sub}
            </motion.button>
          ) : (
            <span className="flex items-center gap-2 font-display text-[15px] font-bold">
              <span className="grid h-6 w-6 place-items-center rounded-lg btn-gradient text-[11px] font-extrabold text-white shadow-glow">N</span>Northbeam
            </span>
          )}
          <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }} transition={springs.bouncy} type="button" onClick={() => go({ name: 'signin' })} className="rounded-full ring-2 ring-white shadow-card" aria-label="Account">
            <Avatar id={viewer} size={30} />
          </motion.button>
        </header>
      )}
      <div ref={scroller} className={cn('relative min-h-0 flex-1 overflow-x-hidden', fill ? 'overflow-y-hidden' : 'scroll-thin overflow-y-auto', showNav ? (fill ? 'pb-[78px]' : 'pb-24') : 'pb-4')}>
        <PageTransition id={route.name} direction={dir} className={fill ? 'h-full' : undefined}>{body}</PageTransition>
      </div>
      <DayOneMoment />
      {showNav && (
        <nav className="glass absolute inset-x-3 bottom-3 z-20 flex justify-around rounded-[22px] border border-white/80 px-1.5 py-1.5 shadow-lift ring-1 ring-ink/5" aria-label="Portal">
          {TABS.map((t) => {
            const on = route.name === t.name || (t.name === 'home' && ['firstweek', 'people', 'company'].includes(route.name)) || (t.name === 'tasks' && ['details', 'laptop'].includes(route.name))
            const badge = t.name === 'tasks' ? own.length : t.name === 'welcome' ? boardNew : 0
            return (
              <motion.button key={t.name} type="button" whileTap={{ scale: 0.86 }} onClick={() => { go({ name: t.name }); sfx('tick') }} className={cn('relative flex min-w-[62px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10.5px] transition-colors', on ? 'font-semibold text-accent' : 'text-muted')}>
                {on && <motion.span layoutId={`tab-${tabId}`} transition={springs.bouncy} className="absolute inset-0 -z-10 rounded-2xl bg-accent-soft" />}
                <motion.span animate={on ? { y: [0, -5, 0], scale: [1, 1.18, 1] } : { y: 0, scale: 1 }} transition={{ duration: 0.45 }}>
                  <t.icon className="h-5 w-5" strokeWidth={on ? 2.4 : 1.8} />
                </motion.span>
                {t.label}
                <AnimatePresence>
                  {badge > 0 && (
                    <motion.span key={badge} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={springs.bouncy} className={cn('absolute right-2.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-surface', t.name === 'tasks' ? (red ? 'bg-red' : 'bg-amber') : 'bg-accent')}>{badge}</motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </nav>
      )}
    </div>
  )

  if (frame === 'none') return <div className="h-full">{screen}</div>
  return <PhoneFrame compact={compact}>{screen}</PhoneFrame>
}

function StatusBar() {
  return (
    <div className="relative z-30 flex h-9 shrink-0 items-center justify-between bg-bg px-7 pt-1 text-[12px] font-semibold text-ink">
      <span className="tnum">9:41</span>
      <span aria-hidden className="absolute left-1/2 top-2 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-[#0b0d16]" />
      <span className="flex items-center gap-1"><Signal className="h-3.5 w-3.5" /><Wifi className="h-3.5 w-3.5" /><BatteryFull className="h-4 w-4" /></span>
    </div>
  )
}

export function PhoneFrame({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0, rotateX: 8 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={springs.soft}
      style={{ transformPerspective: 1200 }}
      className={cn('relative mx-auto flex shrink-0 flex-col rounded-[48px] bg-gradient-to-b from-[#e9ebf3] via-[#cfd3e0] to-[#e3e6ef] p-[9px] shadow-phone ring-1 ring-ink/10', compact ? 'h-[min(720px,100%)] w-[min(352px,100%)]' : 'h-[min(812px,calc(100vh-130px))] w-[386px] max-w-full')}
    >
      <span aria-hidden className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-[#c3c7d4]" />
      <span aria-hidden className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-[#c3c7d4]" />
      <span aria-hidden className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#c3c7d4]" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[40px] bg-bg ring-[5px] ring-[#0b0d16]">
        <StatusBar />
        <div className="min-h-0 flex-1">{children}</div>
        <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-ink/80" />
      </div>
    </motion.div>
  )
}

export function SignOutHint() {
  return <LogOut className="h-4 w-4" />
}
