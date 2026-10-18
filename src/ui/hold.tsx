import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useAnimationControls, useMotionValue, useTransform, type AnimationPlaybackControls } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../lib/cn'
import { springs } from './motion'
import { burst, sfx } from './fx'

/**
 * Press and hold to confirm. A fill sweeps across while held; letting go early springs it back.
 * Enter or Space completes straight away, so it never blocks keyboard users.
 */
export function HoldButton({ children, onDone, ms = 650, size = 'sm', className, celebrate = true }: {
  children: ReactNode
  onDone: () => void
  ms?: number
  size?: 'sm' | 'md'
  className?: string
  celebrate?: boolean
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const p = useMotionValue(0)
  const run = useRef<AnimationPlaybackControls>()
  const [hint, setHint] = useState(false)
  const [done, setDone] = useState(false)
  const shake = useAnimationControls()
  const pressing = useRef(false)
  const width = useTransform(p, (v) => `${v * 100}%`)

  const finish = () => {
    if (done) return
    setDone(true)
    run.current?.stop()
    p.set(1)
    if (celebrate) burst('small', ref.current)
    else sfx('pop')
    window.setTimeout(onDone, 260)
  }
  const start = () => {
    if (done) return
    pressing.current = true
    setHint(false)
    run.current?.stop()
    run.current = animate(p, 1, { duration: (ms / 1000) * (1 - p.get()), ease: [0.3, 0, 0.6, 1], onComplete: finish })
  }
  const cancel = () => {
    if (done || !pressing.current) return
    pressing.current = false
    run.current?.stop()
    if (p.get() < 0.4) {
      setHint(true)
      window.setTimeout(() => setHint(false), 1600)
      shake.start({ x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.35 } })
    }
    run.current = animate(p, 0, { type: 'spring', stiffness: 520, damping: 32 })
  }

  return (
    <span className="relative inline-flex">
    <AnimatePresence>
      {hint && (
        <motion.span
          key="hint"
          role="status"
          initial={{ opacity: 0, y: 6, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.9 }}
          transition={springs.bouncy}
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -ml-[60px] w-[120px] rounded-lg bg-ink px-2 py-1 text-center text-[11px] font-semibold text-surface shadow-pop"
        >
          Press and hold
          <span aria-hidden className="absolute left-1/2 top-full -ml-1 h-2 w-2 -translate-y-1 rotate-45 bg-ink" />
        </motion.span>
      )}
    </AnimatePresence>
    <motion.button
      ref={ref}
      type="button"
      animate={shake}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.95 }}
      transition={springs.snappy}
      onPointerDown={(e) => { e.preventDefault(); start() }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish() } }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={typeof children === 'string' ? `${children} (hold to confirm)` : undefined}
      className={cn(
        'relative inline-flex shrink-0 touch-none select-none items-center justify-center overflow-hidden whitespace-nowrap rounded-xl font-semibold text-white shadow-glow btn-gradient',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        className,
      )}
    >
      <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-white/30" style={{ width }} />
      <span className="relative flex items-center gap-1.5">
        {done ? (
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={springs.bouncy} className="flex items-center gap-1"><Check className="h-4 w-4" strokeWidth={3} />Nice!</motion.span>
        ) : children}
      </span>
    </motion.button>
    </span>
  )
}
