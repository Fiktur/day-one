import { useEffect } from 'react'
import { ArrowRight, Smartphone } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { useDemo } from '../engine/store'
import { people } from '../data/people'
import { Emoji, avatarUri, type EmojiName } from '../ui/assets'
import { springs } from '../ui/motion'
import { Button, Kbd } from '../ui/parts'
import { sfx } from '../ui/fx'

// Everything decorative lives in the outer columns so it never crosses the headline.
const FLOATERS: { name: EmojiName; x: string; y: string; size: number; depth: number; r: number }[] = [
  { name: 'laptop', x: '4%', y: '8%', size: 80, depth: 30, r: -8 },
  { name: 'key', x: '89%', y: '11%', size: 56, depth: 18, r: 14 },
  { name: 'calendar', x: '87%', y: '63%', size: 72, depth: 26, r: 8 },
  { name: 'package', x: '6%', y: '64%', size: 66, depth: 22, r: 10 },
  { name: 'heart', x: '94%', y: '43%', size: 44, depth: 12, r: -10 },
  { name: 'coffee', x: '2.5%', y: '44%', size: 48, depth: 14, r: 6 },
  { name: 'shield', x: '76%', y: '5%', size: 42, depth: 10, r: -6 },
  { name: 'sparkles', x: '20%', y: '5%', size: 38, depth: 8, r: 0 },
]

const CAST = [
  { id: 'virgil', x: '3%', y: '26%' },
  { id: 'tony', x: '87%', y: '27%' },
  { id: 'maria', x: '66%', y: '81%' },
  { id: 'shuri', x: '22%', y: '81%' },
  { id: 'kate', x: '86%', y: '84%' },
  { id: 'wanda', x: '6%', y: '85%' },
]

const LINE1 = ['Every', 'new', 'hire', 'starts']
const LINE2 = ['and', 'knows', 'what', 'happens', 'next.']

export function Intro() {
  const open = useDemo((s) => s.intro)
  const set = useDemo((s) => s.set)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { set({ intro: false }); sfx('whoosh') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, set])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] overflow-hidden bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)', transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }}
          onPointerMove={(e) => {
            mx.set(e.clientX / window.innerWidth - 0.5)
            my.set(e.clientY / window.innerHeight - 0.5)
          }}
        >
          <div className="dawn" aria-hidden><i /></div>

          {/* The sunrise */}
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-[78%] h-[90vmin] w-[90vmin] rounded-full [@media(max-height:760px)]:top-[90%]"
            style={{ x: '-50%', background: 'radial-gradient(circle at 50% 40%, rgb(var(--accent-2) / 0.55), rgb(var(--accent) / 0.35) 45%, transparent 70%)' }}
            initial={{ y: '30%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ ...springs.soft, delay: 0.2 }}
          />
          <motion.div aria-hidden className="absolute inset-x-0 top-[78%] h-px [@media(max-height:760px)]:top-[90%] bg-gradient-to-r from-transparent via-accent/40 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }} />

          {FLOATERS.map((f, i) => (
            <Floater key={f.name} f={f} i={i} sx={sx} sy={sy} />
          ))}
          {CAST.map((c, i) => (
            <CastBubble key={c.id} c={c} i={i} sx={sx} sy={sy} />
          ))}

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex items-end gap-3 lg:hidden" aria-hidden>
              {(['laptop', 'key', 'calendar', 'heart'] as const).map((n, i) => (
                <motion.span key={n} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...springs.bouncy, delay: 0.4 + i * 0.08 }}>
                  <Emoji name={n} size={i % 2 ? 34 : 44} float delay={i * 0.4} />
                </motion.span>
              ))}
            </div>
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springs.soft, delay: 0.1 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-medium text-muted shadow-card backdrop-blur">
              <span className="grid h-5 w-5 place-items-center rounded-full btn-gradient font-display text-[10px] font-extrabold text-white">1</span>
              Project Day One · a working demo
            </motion.div>
            <h1 className="max-w-5xl font-display text-[clamp(2.6rem,6vw,6.2rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink">
              <span className="block text-balance">
                {LINE1.map((w, i) => (
                  <Word key={w + i} i={i}>{w}</Word>
                ))}
                <Word i={4}><span className="shimmer-text">ready,</span></Word>
              </span>
              <span className="block text-balance">
                {LINE2.map((w, i) => (
                  <Word key={w + i} i={i + 5}>{w}</Word>
                ))}
              </span>
            </h1>
            <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springs.soft, delay: 0.9 }} className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
              One onboarding journey, seen from every side: the new hire, their manager, recruiting, People Ops, IT, and the systems in between.
            </motion.p>
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ ...springs.bouncy, delay: 1.1 }} className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" variant="primary" onClick={() => { set({ intro: false }); sfx('whoosh') }}>
                Start the demo <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => { set({ intro: false, split: false, main: { viewer: 'virgil', route: { name: 'home' } } }); sfx('whoosh') }}>
                <Smartphone className="h-4 w-4" />See it as a new hire
              </Button>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="mt-6 hidden items-center gap-1.5 text-xs text-faint sm:flex [@media(max-height:760px)]:hidden">
              <Kbd>Enter</Kbd> to start · <Kbd>1</Kbd>–<Kbd>8</Kbd> run scenarios · <Kbd>⌘K</Kbd> jump anywhere
            </motion.p>
          </div>
          <p className="absolute bottom-3 left-0 right-0 z-10 text-center text-[11px] text-faint [@media(max-height:640px)]:hidden">Fictional people and company. No real systems are connected.</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Word({ children, i }: { children: React.ReactNode; i: number }) {
  return (
    <motion.span
      className="mr-[0.22em] inline-block last:mr-0"
      initial={{ y: '0.6em', opacity: 0, rotate: 6 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ ...springs.bouncy, delay: 0.25 + i * 0.06 }}
    >
      {children}
    </motion.span>
  )
}

type MV = ReturnType<typeof useSpring>

function Floater({ f, i, sx, sy }: { f: (typeof FLOATERS)[number]; i: number; sx: MV; sy: MV }) {
  const x = useTransform(sx, (v) => v * -f.depth * 2)
  const y = useTransform(sy, (v) => v * -f.depth * 2)
  return (
    <motion.div aria-hidden className="absolute z-0 hidden lg:block" style={{ left: f.x, top: f.y, x, y }} initial={{ scale: 0, opacity: 0, rotate: f.r - 30 }} animate={{ scale: 1, opacity: 1, rotate: f.r }} transition={{ ...springs.bouncy, delay: 0.5 + i * 0.07 }}>
      <motion.div whileHover={{ scale: 1.25, rotate: f.r + 12 }} transition={springs.bouncy} className="pointer-events-auto">
        <Emoji name={f.name} size={f.size} float delay={i * 0.4} />
      </motion.div>
    </motion.div>
  )
}

function CastBubble({ c, i, sx, sy }: { c: (typeof CAST)[number]; i: number; sx: MV; sy: MV }) {
  const x = useTransform(sx, (v) => v * 26)
  const y = useTransform(sy, (v) => v * 26)
  const p = people[c.id]
  return (
    <motion.div aria-hidden className="absolute z-0 hidden xl:block [@media(max-height:760px)]:!hidden" style={{ left: c.x, top: c.y, x, y }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...springs.bouncy, delay: 0.8 + i * 0.08 }}>
      <div className="bob flex items-center gap-2 rounded-full border border-line bg-surface/90 py-1 pl-1 pr-3 shadow-lift backdrop-blur" style={{ animationDelay: `${i * 0.6}s` }}>
        <span className="h-8 w-8 overflow-hidden rounded-full" style={{ background: `rgb(var(--av${p.hue ?? 0}) / 0.16)` }}><img src={avatarUri(c.id)} alt="" className="h-full w-full" /></span>
        <span className="text-left leading-tight">
          <span className="block text-xs font-semibold text-ink">{p.name.split(' ')[0]}</span>
          <span className="block text-[10px] text-muted">{p.role === 'hire' ? 'New hire' : p.title.split(',')[0]}</span>
        </span>
      </div>
    </motion.div>
  )
}
