import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { useDemo } from '../engine/store'
import { fmtShort } from '../lib/dates'
import { ReqTag } from '../ui/parts'
import { AnimatePresence, motion, springs } from '../ui/motion'

/** The live event log: every event Day One received or sent, newest first. */
export function UnderTheHood() {
  const open = useDemo((s) => s.underHood)
  const log = useDemo((s) => s.log)
  const set = useDemo((s) => s.set)
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="hood"
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96, transition: { duration: 0.18 } }}
          transition={springs.bouncy}
          style={{ originX: 1, originY: 1 }}
          className="glass fixed bottom-3 right-3 z-40 flex max-h-[60vh] w-[440px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[22px] border border-white/80 text-ink shadow-pop ring-1 ring-ink/5"
        >
          <div className="flex items-center justify-between border-b border-line/70 px-3.5 py-2.5">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green" /></span>
                Under the hood
              </div>
              <div className="text-[11px] text-muted">Every event received or sent, newest first <ReqTag ids="T1 T3 T6" /></div>
            </div>
            <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label="Close" onClick={() => set({ underHood: false })} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"><X className="h-4 w-4" /></motion.button>
          </div>
          <ul className="scroll-thin min-h-0 flex-1 space-y-1 overflow-y-auto p-2 font-mono text-[11px] leading-snug">
            <AnimatePresence initial={false}>
              {log.map((l, i) => (
                <motion.li
                  key={l.id}
                  layout="position"
                  initial={{ opacity: 0, x: 24, backgroundColor: 'rgba(51,85,255,0.16)' }}
                  animate={{ opacity: 1, x: 0, backgroundColor: i === 0 ? 'rgba(51,85,255,0.06)' : 'rgba(51,85,255,0)' }}
                  transition={{ ...springs.snappy, backgroundColor: { duration: 1.2 } }}
                  className="rounded-lg px-2 py-1"
                >
                  <span className="text-faint">{fmtShort(l.day)} {l.time}</span>{' '}
                  <span className="font-medium">{l.system}</span>{' '}
                  <span className="text-muted">{l.event}</span>
                  <div className={cn(l.tone === 'bad' ? 'text-red' : l.tone === 'warn' ? 'text-amber-ink' : l.tone === 'ok' ? 'text-green' : 'text-ink/80')}>{l.outcome}</div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
