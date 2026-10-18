import { useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Transition } from 'framer-motion'
import NumberFlow from '@number-flow/react'
import { cn } from '../lib/cn'

/** One motion vocabulary for the whole product. */
export const springs = {
  snappy: { type: 'spring', stiffness: 520, damping: 32, mass: 0.8 } as Transition,
  bouncy: { type: 'spring', stiffness: 420, damping: 16, mass: 0.9 } as Transition,
  soft: { type: 'spring', stiffness: 170, damping: 22 } as Transition,
  layout: { type: 'spring', stiffness: 380, damping: 34 } as Transition,
}

/** Cards that lean toward the pointer, then settle back on a spring. */
export function Tilt({ children, className, max = 5, lift = true }: { children: ReactNode; className?: string; max?: number; lift?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 250, damping: 20 })
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 250, damping: 20 })
  const still = useReducedMotion()
  if (still) return <div className={className}>{children}</div>
  return (
    <motion.div
      ref={ref}
      className={cn('[transform-style:preserve-3d]', className)}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileHover={lift ? { y: -4 } : undefined}
      transition={springs.snappy}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        x.set((e.clientX - r.left) / r.width - 0.5)
        y.set((e.clientY - r.top) / r.height - 0.5)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

const pageVariants = {
  enter: (d: number) => ({ opacity: 0, x: d * 28, y: d ? 0 : 10, filter: 'blur(4px)' }),
  center: { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' },
  exit: (d: number) => ({ opacity: 0, x: d * -28, y: 0, filter: 'blur(2px)', transition: { duration: 0.12 } }),
}

/** Screens slide and fade in when the route changes. The exiting screen leaves in the same direction. */
export function PageTransition({ id, children, direction = 0, className }: { id: string; children: ReactNode; direction?: number; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
      <motion.div
        key={id}
        custom={direction}
        className={className}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ ...springs.soft, opacity: { duration: 0.2 }, filter: { duration: 0.25, ease: 'easeOut' } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/** Segmented control with a pill that springs between options. */
export function Segmented<T extends string>({ value, options, onChange, size = 'sm', className, tone = 'light' }: {
  value: T
  options: readonly (readonly [T, ReactNode])[]
  onChange: (v: T) => void
  size?: 'xs' | 'sm'
  className?: string
  tone?: 'light' | 'stage'
}) {
  const id = useId()
  return (
    <div className={cn('relative flex rounded-xl p-1', tone === 'stage' ? 'bg-stage-ink/10' : 'bg-sunken', className)} role="tablist">
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(v)}
            className={cn(
              'relative z-0 flex-1 whitespace-nowrap rounded-lg font-medium transition-colors',
              size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
              on ? (tone === 'stage' ? 'text-stage' : 'text-ink') : tone === 'stage' ? 'text-stage-ink/70 hover:text-stage-ink' : 'text-muted hover:text-ink',
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className={cn('absolute inset-0 -z-10 rounded-lg', tone === 'stage' ? 'bg-stage-ink' : 'bg-surface shadow-card')}
                transition={springs.bouncy}
              />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** Numbers roll to their new value instead of jumping. */
export function Num({ value, className, suffix, prefix }: { value: number; className?: string; suffix?: string; prefix?: string }) {
  return <NumberFlow value={value} className={cn('tnum', className)} suffix={suffix} prefix={prefix} transformTiming={{ duration: 700, easing: 'cubic-bezier(.2,1.4,.4,1)' }} spinTiming={{ duration: 700, easing: 'cubic-bezier(.2,1.4,.4,1)' }} />
}

/** Fade up on first appearance, staggered by index. */
export function Reveal({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...springs.soft, delay: Math.min(i, 12) * 0.045 }}>
      {children}
    </motion.div>
  )
}

export { motion, AnimatePresence, LayoutGroup }
