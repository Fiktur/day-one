import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNav } from '../nav/NavContext'
import { useView } from '../engine/selectors'
import { useDemo } from '../engine/store'
import { people } from '../data/people'
import { Emoji, type EmojiName } from '../ui/assets'
import { Glyph } from '../ui/parts'
import { AnimatePresence, motion, springs } from '../ui/motion'
import { burst } from '../ui/fx'

/**
 * The payoff of the whole product: on the start date the hire opens the app and sees, one by one,
 * that everything is ready. Shows once per hire, only on the first day.
 */
export function DayOneMoment() {
  const { viewer } = useNav()
  const v = useView(viewer)
  const now = useDemo((s) => s.now)
  const seen = useDemo((s) => s.dayOneSeen.includes(viewer))
  const board = useDemo((s) => s.boards[viewer])
  const set = useDemo((s) => s.set)
  const ref = useRef<HTMLDivElement>(null)
  const show = !!v && v.status === 'started' && now === v.hire.start && !seen

  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(() => burst('big', ref.current), 350)
    return () => window.clearTimeout(t)
  }, [show])

  if (!v) return null
  const b = v.by
  const ok = (k: string) => b[k]?.state === 'verified'
  const items: { e: EmojiName; label: string; ready: boolean; note: string }[] = [
    { e: 'laptop', label: 'Laptop', ready: ok('laptop_deliver') || ok('laptop_received'), note: ok('laptop_deliver') || ok('laptop_received') ? 'Set up and waiting for you' : 'Arriving today' },
    { e: 'key', label: 'Work account', ready: ok('account'), note: ok('account') ? 'Sign in with your new email' : 'Being finished now' },
    { e: 'calendar', label: 'Orientation', ready: ok('cohort_seat'), note: ok('cohort_seat') ? 'Your seat is saved for 9:00' : 'Seat being confirmed' },
    { e: 'heart', label: 'Your team', ready: board?.status === 'live', note: board?.status === 'live' ? `${board.posts.length + 1} hellos on your board` : `${people[v.hire.managerId]?.name.split(' ')[0]} is expecting you` },
  ]
  if (b.badge && b.badge.state !== 'na') items.splice(2, 0, { e: 'id', label: 'Badge', ready: ok('badge'), note: ok('badge') ? 'Pick it up at reception' : 'Being printed' })
  const first = v.person.name.split(' ')[0]
  const close = () => set({ dayOneSeen: [...useDemo.getState().dayOneSeen, viewer] })

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={ref}
          key="dayone"
          className="absolute inset-0 z-40 flex flex-col overflow-hidden btn-gradient px-5 pb-5 pt-10 text-white"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, y: 40, transition: { duration: 0.25 } }}
          transition={springs.soft}
          role="dialog"
          aria-label={`It's day one, ${first}`}
        >
          <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div aria-hidden className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...springs.bouncy, delay: 0.15 }} className="relative">
            <Emoji name="sunrise" size={64} float />
          </motion.div>
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springs.bouncy, delay: 0.25 }} className="relative mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Welcome to Northbeam</div>
            <h2 className="mt-1 font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.02em]">It's day one, {first}!</h2>
            <p className="mt-1.5 text-[13px] text-white/85">Here's what's ready for you.</p>
          </motion.div>
          <ul className="relative mt-4 space-y-2">
            {items.map((x, i) => (
              <motion.li
                key={x.label}
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ ...springs.bouncy, delay: 0.55 + i * 0.32 }}
                className="flex items-center gap-3 rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur"
              >
                <Emoji name={x.e} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{x.label}</div>
                  <div className="truncate text-[11.5px] text-white/80">{x.note}</div>
                </div>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...springs.bouncy, delay: 0.75 + i * 0.32 }} className="grid h-6 w-6 place-items-center rounded-full bg-white">
                  <Glyph state={x.ready ? 'verified' : 'prog'} size={15} />
                </motion.span>
              </motion.li>
            ))}
          </ul>
          <div className="flex-1" />
          <motion.button
            type="button"
            onClick={close}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ ...springs.bouncy, delay: 0.7 + items.length * 0.32 }}
            className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-accent shadow-lift"
          >
            Let's go <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
