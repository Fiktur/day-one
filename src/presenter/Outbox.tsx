import { useState } from 'react'
import { Mail, MessageSquare, Smartphone, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../lib/cn'
import { useDemo, defaultRoute, type Route } from '../engine/store'
import { ctxOf, selectViews } from '../engine/selectors'
import { coverFor } from '../engine/derive'
import { digestFor, pingsFor, type Channel, type Ping, type PingAction } from '../engine/pings'
import { people, teams, type TeamId } from '../data/people'
import { fmtDay } from '../lib/dates'
import { Avatar, Button } from '../ui/parts'
import { Select } from '../ui/overlay'
import { AnimatePresence, Segmented, motion, springs } from '../ui/motion'
import { burst } from '../ui/fx'
import { notifyManagers } from '../staff/program/Incident'
import type { SystemId } from '../data/journey'

const CHANNEL_ICON: Record<Channel, typeof Mail> = { Slack: MessageSquare, Text: Smartphone, Email: Mail }

function routeFor(a: PingAction, p: Ping): Route {
  if (people[a.by]?.role === 'hire') return { name: a.arg ?? 'home' }
  if (p.key?.startsWith('assign:')) return { name: 'insights' }
  if (p.key?.startsWith('cover:')) return { name: 'covering' }
  return p.hireId ? { name: 'hire', hireId: p.hireId } : defaultRoute(a.by)
}

/** Each button does what the same button does inside the app; "Open" lands the right person on the right page. */
function run(a: PingAction, p: Ping) {
  const s = useDemo.getState()
  const hire = p.hireId && people[p.hireId]?.name
  // Whoever is on screen clicks the channel button if they're in that team; otherwise the team lead does.
  const by = p.to in teams && teams[p.to as TeamId].members.includes(s.main.viewer) ? s.main.viewer : a.by
  switch (a.kind) {
    case 'open': s.set({ split: false, main: { viewer: a.by, route: routeFor(a, p) } }); return
    case 'take': s.claim(p.hireId!, p.key!, by); toast.success(`${people[by]?.name} took it`, { description: `${p.title} · from the team channel` }); return
    case 'done': s.markDone(p.hireId!, p.key!, by); toast.success('Marked done from the notification', { description: `${hire} · nobody had to open Day One` }); return
    case 'notify': notifyManagers(a.arg as SystemId, a.by); return
    case 'buddy': s.assignBuddy(p.hireId!, a.arg!, a.by); toast.success(`${people[a.arg!]?.name} is ${hire?.split(' ')[0]}'s buddy`, { description: 'Picked straight from Slack.' }); return
    case 'chase': s.nudge(p.hireId!, p.key!, a.arg!, a.by); toast.success(`Asked ${a.arg} for an update`, { description: hire }); return
    case 'reassign': {
      const to = coverFor(a.arg!, s.ooo, s.now)
      if (to) { s.delegate(a.arg!, to); toast.success(`${people[to].name} is covering for ${people[a.arg!].name}`) }
    }
  }
}

function Recipient({ id, label }: { id: string; label: string }) {
  const team = id in teams
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {team ? <Avatar refObj={{ kind: 'team', id, name: teams[id as TeamId].name, short: '' }} size={18} /> : id in people ? <Avatar id={id} size={18} /> : null}
      <span className="truncate font-medium">{label}</span>
    </span>
  )
}

/** The notifications Day One would send today, so the app is only for work that needs a screen. */
export function Outbox() {
  const open = useDemo((s) => s.outbox)
  const set = useDemo((s) => s.set)
  const st = useDemo()
  const views = selectViews(st)
  const pings = pingsFor(views, st, ctxOf(st))
  const [tab, setTab] = useState<'pings' | 'digests'>('pings')
  const [who, setWho] = useState('all')
  const recipients = Array.from(new Set(pings.map((p) => p.to)))
  const label = (id: string) => pings.find((p) => p.to === id)?.toLabel ?? id
  const shown = pings.filter((p) => who === 'all' || p.to === who)
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="outbox"
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96, transition: { duration: 0.18 } }}
          transition={springs.bouncy}
          style={{ originX: 0, originY: 1 }}
          aria-label="Outbox"
          className="glass fixed bottom-3 left-3 z-40 flex max-h-[72vh] w-[420px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[22px] border border-white/80 text-ink shadow-pop ring-1 ring-ink/5"
        >
          <div className="space-y-2 border-b border-line/70 px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider">Outbox · {fmtDay(st.now)}</div>
                <div className="text-[11px] text-muted">What Day One would send today, so people don't log in to check</div>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label="Close" onClick={() => set({ outbox: false })} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"><X className="h-4 w-4" /></motion.button>
            </div>
            <div className="flex items-center gap-2">
              <Segmented size="xs" value={tab} onChange={setTab} options={[['pings', `Pings · ${pings.length}`], ['digests', '9am digests']] as const} />
              {tab === 'pings' && <Select className="min-w-0 flex-1" label="Recipient" value={who} onChange={setWho} options={[['all', 'Everyone'], ...recipients.map((r) => [r, label(r)] as const)] as const} />}
            </div>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
            {tab === 'digests' ? (
              <ul className="space-y-1.5">
                {recipients.map((r) => (
                  <li key={r} className="rounded-xl bg-surface/70 px-3 py-2 text-[12px]">
                    <Recipient id={r} label={label(r)} />
                    <div className="mt-0.5 text-muted">{digestFor(r, pings)}</div>
                  </li>
                ))}
                {recipients.length === 0 && <li className="px-3 py-6 text-center text-[12px] text-muted">Nobody needs a digest today.</li>}
              </ul>
            ) : (
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {shown.map((p) => {
                    const Icon = CHANNEL_ICON[p.channel]
                    return (
                      <motion.li key={p.id} layout="position" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={springs.snappy} className={cn('rounded-xl border bg-surface/80 px-3 py-2 text-[12px]', p.kind === 'todo' ? 'border-accent/25' : 'border-line')}>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                          <Recipient id={p.to} label={p.toLabel} />
                          <span className="flex shrink-0 items-center gap-1"><Icon className="h-3 w-3" />{p.channel}{p.kind === 'fyi' ? ' · FYI' : ''}</span>
                        </div>
                        <div className="mt-1 font-semibold leading-snug">{p.title}</div>
                        <div className="text-muted">{p.body}</div>
                        {p.actions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {p.actions.map((a, i) => <Button key={a.kind} size="xs" variant={i === 0 && a.kind !== 'open' ? 'primary' : 'secondary'} onClick={(e) => { if (a.kind !== 'open') burst('small', e.currentTarget); run(a, p) }}>{a.label}</Button>)}
                          </div>
                        )}
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
                {shown.length === 0 && <li className="px-3 py-6 text-center text-[12px] text-muted">Nothing to send today.</li>}
              </ul>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
