import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Columns3, RotateCcw, Tag, Terminal, Volume2, VolumeX, X, Command as CommandIcon } from 'lucide-react'
import { Dropdown, DropItem } from '../ui/overlay'
import { cn } from '../lib/cn'
import { useDemo } from '../engine/store'
import { SCENARIOS, runScenario } from '../engine/scenarios'
import { TODAY, fmtDay } from '../lib/dates'
import { Tooltip } from '../ui/parts'
import { Segmented, springs, motion, AnimatePresence } from '../ui/motion'
import { clearChats } from '../assistant/AssistantPanel'
import { sfx } from '../ui/fx'

function IconBtn({ on, label, onClick, children }: { on?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={label} side="bottom">
      <motion.button
        type="button"
        aria-label={label}
        aria-pressed={on}
        onClick={onClick}
        whileTap={{ scale: 0.85 }}
        whileHover={{ y: -1 }}
        transition={springs.snappy}
        className={cn('grid h-8 w-8 place-items-center rounded-xl', on ? 'btn-gradient text-white shadow-glow' : 'text-muted hover:bg-sunken hover:text-ink')}
      >
        {children}
      </motion.button>
    </Tooltip>
  )
}

export function PresenterBar() {
  const s = useDemo()
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springs.bouncy}
      className="pointer-events-auto mx-auto flex w-fit max-w-[calc(100vw-24px)] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 glass rounded-2xl border border-white/80 px-2.5 py-1.5 text-ink shadow-lift ring-1 ring-ink/5"
    >
      <Tooltip content="Back to the cover" side="bottom">
        <motion.button type="button" onClick={() => s.set({ intro: true })} whileTap={{ scale: 0.9 }} className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-sunken">
          <span className="grid h-6 w-6 place-items-center rounded-full btn-gradient font-display text-[11px] font-extrabold text-white">1</span>
          <span className="hidden font-display text-[13px] font-bold sm:inline">Day One</span>
        </motion.button>
      </Tooltip>

      <span className="h-5 w-px bg-line" />

      <div className="flex items-center gap-1">
        <IconBtn label="Back a day  [" onClick={() => { s.shiftNow(-1); sfx('tick') }}><ChevronLeft className="h-4 w-4" /></IconBtn>
        <div className="relative h-7 w-[118px] overflow-hidden rounded-lg bg-sunken text-center font-mono text-[11px] leading-7 tnum">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={s.now} className="absolute inset-0" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={springs.snappy}>
              {fmtDay(s.now)} · 9:00
            </motion.span>
          </AnimatePresence>
        </div>
        <IconBtn label="Forward a day  ]" onClick={() => { s.shiftNow(1); sfx('tick') }}><ChevronRight className="h-4 w-4" /></IconBtn>
        <input aria-label="Demo date" type="range" min={-7} max={70} value={s.now} onChange={(e) => s.setNow(Number(e.target.value))} className="hidden w-20 accent-[rgb(var(--accent))] lg:block" />
        <AnimatePresence>
          {s.now !== TODAY && (
            <motion.button initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={springs.bouncy} type="button" onClick={() => s.setNow(TODAY)} className="rounded-lg border border-line px-1.5 py-0.5 text-[10px] hover:bg-sunken">
              Today
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <span className="h-5 w-px bg-line" />

      <ScenarioMenu />
      <div className="hidden items-center gap-1 sm:flex">
        {SCENARIOS.map((sc) => {
          const active = s.lastScenario === sc.n
          const down = sc.n === 5 && s.down.checkr != null
          return (
            <Tooltip key={sc.n} content={<span><b>{sc.n}. {sc.title}</b> · {sc.who}<br />{sc.blurb}</span>} side="bottom">
              <motion.button
                type="button"
                onClick={() => { runScenario(sc.n); sfx('whoosh') }}
                whileHover={{ y: -2, scale: 1.08 }}
                whileTap={{ scale: 0.8 }}
                transition={springs.bouncy}
                className={cn('grid h-7 w-7 place-items-center rounded-lg border font-mono text-[11px] font-semibold', down ? 'border-red bg-red text-white' : active ? 'border-transparent btn-gradient text-white shadow-glow' : 'border-line hover:bg-sunken')}
              >
                {sc.n}
              </motion.button>
            </Tooltip>
          )
        })}
      </div>

      <span className="h-5 w-px bg-line" />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="hidden min-[1100px]:block"><Segmented size="xs" value={s.split ? 'split' : 'single'} options={[['split', 'Split'], ['single', 'Single']] as const} onChange={(v) => s.setSplit(v === 'split')} /></span>
        <Segmented size="xs" value={s.setup} options={[['connected', 'Automatic'], ['manual', 'Manual updates']] as const} onChange={(v) => s.setSetup(v)} />
        <span className="hidden sm:contents">
          <IconBtn on={s.underHood} label="Under the hood: live event log  (U)" onClick={() => s.set({ underHood: !s.underHood })}><Terminal className="h-4 w-4" /></IconBtn>
          <IconBtn on={s.tags} label="Requirement tags from the brief  (T)" onClick={() => s.set({ tags: !s.tags })}><Tag className="h-4 w-4" /></IconBtn>
        </span>
        <IconBtn on={s.sound} label={s.sound ? 'Sound on' : 'Sound off'} onClick={() => { s.set({ sound: !s.sound }); window.setTimeout(() => sfx('pop'), 30) }}>{s.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</IconBtn>
        <span className="hidden sm:contents"><IconBtn label="Jump anywhere  (⌘K)" onClick={() => s.set({ palette: true })}><CommandIcon className="h-4 w-4" /></IconBtn></span>
        <IconBtn label="Reset the demo  (Shift+R)" onClick={() => { s.reset(); clearChats() }}><RotateCcw className="h-4 w-4" /></IconBtn>
        <IconBtn label="Hide this bar  (.)" onClick={() => s.set({ presenterHidden: true })}><ChevronDown className="h-4 w-4 rotate-180" /></IconBtn>
      </div>
    </motion.div>
  )
}

/** Below sm the eight scenario buttons fold into one menu so the bar stays on one or two rows. */
function ScenarioMenu() {
  const last = useDemo((s) => s.lastScenario)
  return (
    <span className="sm:hidden">
      <Dropdown
        align="center"
        trigger={
          <button type="button" className="flex h-8 items-center gap-1.5 rounded-xl btn-gradient px-3 text-[12px] font-semibold text-white shadow-glow">
            {last ? `Scenario ${last}` : 'Scenarios'}<ChevronDown className="h-3.5 w-3.5" />
          </button>
        }
      >
        {SCENARIOS.map((sc) => (
          <DropItem key={sc.n} active={last === sc.n} onSelect={() => { runScenario(sc.n); sfx('whoosh') }}>
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line font-mono text-[10px]">{sc.n}</span>
            <span className="min-w-0"><span className="block truncate font-medium">{sc.title}</span><span className="block truncate text-xs text-muted">{sc.who}</span></span>
          </DropItem>
        ))}
      </Dropdown>
    </span>
  )
}

/** A short caption under the bar while a scenario runs, so the room knows what to watch. */
export function ScenarioCaption() {
  const run = useDemo((s) => s.scenarioRun)
  const n = useDemo((s) => s.lastScenario)
  const intro = useDemo((s) => s.intro)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    if (!run) return
    setOpen(run)
    const t = window.setTimeout(() => setOpen((o) => (o === run ? null : o)), 7000)
    return () => window.clearTimeout(t)
  }, [run])
  const sc = SCENARIOS.find((x) => x.n === n)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-full z-30 flex justify-center px-3">
      <AnimatePresence>
        {open && sc && !intro && (
          <motion.div
            key={open}
            initial={{ y: -14, opacity: 0, scale: 0.96 }}
            animate={{ y: 6, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, transition: { duration: 0.18 } }}
            transition={springs.bouncy}
            className="glass pointer-events-auto relative flex max-w-[640px] items-start gap-3 overflow-hidden rounded-2xl border border-white/80 py-2.5 pl-2.5 pr-9 text-ink shadow-lift ring-1 ring-ink/5"
            role="status"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl btn-gradient font-mono text-[13px] font-bold text-white shadow-glow">{sc.n}</span>
            <span className="min-w-0 text-[12.5px] leading-snug">
              <span className="block font-semibold">{sc.title} <span className="font-normal text-muted">· {sc.who}</span></span>
              <span className="block text-muted">{sc.blurb}</span>
            </span>
            <button type="button" aria-label="Dismiss" onClick={() => setOpen(null)} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-faint hover:bg-sunken hover:text-ink"><X className="h-3.5 w-3.5" /></button>
            <motion.span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 origin-left btn-gradient" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 7, ease: 'linear' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ShowBarButton() {
  const set = useDemo((s) => s.set)
  return (
    <motion.button
      type="button"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      transition={springs.bouncy}
      onClick={() => set({ presenterHidden: false })}
      className="fixed left-1/2 z-50 flex items-center gap-1 glass rounded-full border border-white/80 px-2.5 py-1 text-[11px] font-medium text-ink shadow-lift"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 6px)', x: '-50%' }}
    >
      <Columns3 className="h-3 w-3" />Presenter
    </motion.button>
  )
}
