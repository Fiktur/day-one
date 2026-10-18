import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { SYSTEM_MODES, systemNames, type Mode, type SystemId } from '../../data/journey'
import type { LogEntry } from '../../engine/log'
import { Emoji, type EmojiName } from '../../ui/assets'
import { Num, springs } from '../../ui/motion'

export type MapNode = Exclude<SystemId, 'dayone'> | 'hire' | 'team'

const LEFT: MapNode[] = ['greenhouse', 'workday', 'checkr', 'immigration']
const RIGHT: MapNode[] = ['firstbase', 'google', 'calendar', 'benefits', 'badge']
export const MAP_SYSTEMS = [...LEFT, ...RIGHT] as Exclude<SystemId, 'dayone'>[]

export const NODE_META: Record<MapNode, { emoji: EmojiName; role: string; name: string; short?: string }> = {
  greenhouse: { emoji: 'seedling', role: 'Offers in', name: 'Greenhouse' },
  workday: { emoji: 'id', role: 'HR record and tasks', name: 'Workday' },
  checkr: { emoji: 'shield', role: 'Background checks', name: 'Checkr' },
  immigration: { emoji: 'globe', role: 'Work permits', name: 'Atlas Immigration', short: 'Atlas' },
  firstbase: { emoji: 'laptop', role: 'Laptops', name: 'Firstbase' },
  google: { emoji: 'key', role: 'Work accounts', name: 'Google Workspace', short: 'Google' },
  calendar: { emoji: 'calendar', role: 'Invites', name: 'Calendar' },
  benefits: { emoji: 'heart', role: 'Enrollment', name: 'Benefits site', short: 'Benefits' },
  badge: { emoji: 'office', role: 'Badges', name: 'Badge desk' },
  hire: { emoji: 'wave', role: 'Day One app', name: 'New hires' },
  team: { emoji: 'people', role: 'Tasks and alerts', name: 'Managers and teams', short: 'Teams' },
}

/** Log entries name systems in plain words; map them back to a node (null means Day One itself). */
function nodeFor(system: string): MapNode | null {
  const s = system.toLowerCase()
  if (s === 'day one') return null
  if (s === 'carrier') return 'firstbase'
  for (const id of MAP_SYSTEMS) if (s === id || s === systemNames[id].toLowerCase()) return id
  return null
}

type Pt = { x: number; y: number }
type Edge = [Pt, Pt, Pt]
interface Layout { w: number; h: number; narrow: boolean; card: { w: number; h: number }; hub: Pt; hubR: number; nodes: Record<MapNode, Pt>; edges: Record<MapNode, Edge> }

function onHub(hub: Pt, r: number, toward: Pt): Pt {
  const a = Math.atan2(toward.y - hub.y, toward.x - hub.x)
  return { x: hub.x + Math.cos(a) * r, y: hub.y + Math.sin(a) * r }
}

/** Wide: sources left, fulfilment right, people above and below. Narrow: hub on top, two columns feeding a central spine. */
function layoutFor(w: number): Layout {
  const nodes = {} as Record<MapNode, Pt>
  const edges = {} as Record<MapNode, Edge>
  if (w >= 760) {
    const h = 560
    const card = { w: Math.min(208, Math.round(w * 0.19)), h: 60 }
    const hub = { x: w / 2, y: h / 2 }
    const hubR = 62
    LEFT.forEach((id, i) => (nodes[id] = { x: card.w / 2 + 6, y: (h * (i + 1)) / (LEFT.length + 1) }))
    RIGHT.forEach((id, i) => (nodes[id] = { x: w - card.w / 2 - 6, y: (h * (i + 1)) / (RIGHT.length + 1) }))
    nodes.hire = { x: w / 2, y: 40 }
    nodes.team = { x: w / 2, y: h - 40 }
    for (const id of [...LEFT, ...RIGHT]) {
      const n = nodes[id]
      const p0 = { x: LEFT.includes(id) ? n.x + card.w / 2 : n.x - card.w / 2, y: n.y }
      const p2 = onHub(hub, hubR + 4, { x: (p0.x + hub.x) / 2, y: n.y })
      edges[id] = [p0, { x: (p0.x + p2.x) / 2, y: p0.y }, p2]
    }
    edges.hire = [{ x: hub.x, y: nodes.hire.y + card.h / 2 }, { x: hub.x, y: (nodes.hire.y + hub.y) / 2 }, { x: hub.x, y: hub.y - hubR - 4 }]
    edges.team = [{ x: hub.x, y: nodes.team.y - card.h / 2 }, { x: hub.x, y: (nodes.team.y + hub.y) / 2 }, { x: hub.x, y: hub.y + hubR + 4 }]
    return { w, h, narrow: false, card, hub, hubR, nodes, edges }
  }
  const card = { w: Math.min(160, Math.floor(w / 2) - 16), h: 50 }
  const hub = { x: w / 2, y: 62 }
  const hubR = 46
  const order: MapNode[] = ['hire', 'team', 'greenhouse', 'firstbase', 'workday', 'google', 'checkr', 'calendar', 'immigration', 'benefits', 'badge']
  const top = 168
  const step = 66
  order.forEach((id, i) => (nodes[id] = { x: i % 2 === 0 ? card.w / 2 + 6 : w - card.w / 2 - 6, y: top + Math.floor(i / 2) * step }))
  const h = top + Math.floor((order.length - 1) / 2) * step + card.h / 2 + 18
  for (const id of order) {
    const n = nodes[id]
    const left = n.x < hub.x
    const p0 = { x: left ? n.x + card.w / 2 : n.x - card.w / 2, y: n.y }
    edges[id] = [p0, { x: hub.x, y: n.y }, { x: hub.x, y: hub.y + hubR + 4 }]
  }
  return { w, h, narrow: true, card, hub, hubR, nodes, edges }
}

const q = (e: Edge, t: number): Pt => {
  const u = 1 - t
  return { x: u * u * e[0].x + 2 * u * t * e[1].x + t * t * e[2].x, y: u * u * e[0].y + 2 * u * t * e[1].y + t * t * e[2].y }
}
const pathOf = (e: Edge) => `M${e[0].x},${e[0].y} Q${e[1].x},${e[1].y} ${e[2].x},${e[2].y}`

const TONE = { ok: 'rgb(var(--green))', warn: 'rgb(var(--amber))', bad: 'rgb(var(--red))', info: 'rgb(var(--accent))' } as const
type Tone = keyof typeof TONE

interface Pulse { id: number; node: MapNode; dir: 'in' | 'out'; kind: 'event' | 'ambient' | 'retry'; tone: Tone }
interface Label { id: number; node: MapNode; text: string; tone: Tone }

/** One packet travelling along a connection. Inbound runs node → hub; outbound hub → node. Retries die halfway. */
function PulseDot({ edge, p, onDone }: { edge: Edge; p: Pulse; onDone: (id: number) => void }) {
  const from = p.dir === 'in' ? 0 : 1
  const to = p.kind === 'retry' ? 0.5 : p.dir === 'in' ? 1 : 0
  const t = useMotionValue(from)
  const [popped, setPopped] = useState(false)
  useEffect(() => {
    const dur = p.kind === 'ambient' ? 1.7 : p.kind === 'retry' ? 0.8 : 1.15
    const c = animate(t, to, {
      duration: dur,
      ease: p.kind === 'event' ? [0.45, 0, 0.2, 1] : 'easeInOut',
      onComplete: () => {
        if (p.kind === 'retry') {
          setPopped(true)
          window.setTimeout(() => onDone(p.id), 420)
        } else onDone(p.id)
      },
    })
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const lag = p.dir === 'in' ? -1 : 1
  const cx = useTransform(t, (v) => q(edge, v).x)
  const cy = useTransform(t, (v) => q(edge, v).y)
  const cx1 = useTransform(t, (v) => q(edge, Math.min(1, Math.max(0, v + lag * 0.045))).x)
  const cy1 = useTransform(t, (v) => q(edge, Math.min(1, Math.max(0, v + lag * 0.045))).y)
  const cx2 = useTransform(t, (v) => q(edge, Math.min(1, Math.max(0, v + lag * 0.09))).x)
  const cy2 = useTransform(t, (v) => q(edge, Math.min(1, Math.max(0, v + lag * 0.09))).y)
  const color = TONE[p.tone]
  const big = p.kind === 'event'
  if (popped) {
    const at = q(edge, 0.5)
    return (
      <g>
        <motion.circle cx={at.x} cy={at.y} r={4} fill="none" stroke={TONE.bad} strokeWidth={2} initial={{ r: 4, opacity: 1 }} animate={{ r: 16, opacity: 0 }} transition={{ duration: 0.4 }} />
        <motion.text x={at.x} y={at.y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={TONE.bad} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }}>×</motion.text>
      </g>
    )
  }
  return (
    <g style={{ pointerEvents: 'none' }}>
      {big && <motion.circle cx={cx} cy={cy} r={13} fill={color} opacity={0.18} />}
      <motion.circle cx={cx2} cy={cy2} r={big ? 3 : 1.6} fill={color} opacity={0.3} />
      <motion.circle cx={cx1} cy={cy1} r={big ? 4.2 : 2.2} fill={color} opacity={0.55} />
      <motion.circle cx={cx} cy={cy} r={big ? 6 : 3.2} fill={color} opacity={p.kind === 'ambient' ? 0.75 : 1} stroke={big ? 'white' : undefined} strokeWidth={big ? 2 : 0} />
    </g>
  )
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export function SystemsMap({ selected, onSelect }: { selected: MapNode; onSelect: (n: MapNode) => void }) {
  const setup = useDemo((s) => s.setup)
  const down = useDemo((s) => s.down)
  const log = useDemo((s) => s.log)
  const now = useDemo((s) => s.now)
  const views = useViews()
  const reduced = useReducedMotion()
  const [ref, width] = useWidth<HTMLDivElement>()
  const L = width ? layoutFor(width) : null

  const [pulses, setPulses] = useState<Pulse[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [ripples, setRipples] = useState<number[]>([])
  const [bumps, setBumps] = useState<Partial<Record<MapNode, number>>>({})
  const seq = useRef(0)
  const done = (id: number) => setPulses((ps) => ps.filter((x) => x.id !== id))
  const spawn = (p: Omit<Pulse, 'id'>) => {
    const id = ++seq.current
    setPulses((ps) => (ps.length > 30 && p.kind === 'ambient' ? ps : [...ps, { ...p, id }]))
    return id
  }
  const say = (node: MapNode, text: string, tone: Tone) => {
    const id = ++seq.current
    setLabels((ls) => [...ls.filter((l) => l.node !== node), { id, node, text, tone }])
    window.setTimeout(() => setLabels((ls) => ls.filter((l) => l.id !== id)), 2800)
    setBumps((b) => ({ ...b, [node]: id }))
  }
  const ripple = () => {
    const id = ++seq.current
    setRipples((r) => [...r, id])
    window.setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 1400)
  }

  // Every new event in the log becomes a packet on the right connection.
  const lastTop = useRef<string | null>(null)
  useEffect(() => {
    const top = log[0]?.id ?? ''
    if (lastTop.current == null) { lastTop.current = top; return }
    const fresh: LogEntry[] = []
    for (const e of log) { if (e.id === lastTop.current) break; fresh.push(e) }
    lastTop.current = top
    if (fresh.length === 0 || fresh.length > 6) return // a reset replaces the whole log; don't replay it
    fresh.reverse().forEach((e, i) => window.setTimeout(() => fire(e), i * 320))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log])

  function fire(e: LogEntry) {
    const tone: Tone = e.tone
    const who = e.subject ? ` · ${e.subject.split(' ')[0]}` : ''
    const node = nodeFor(e.system)
    if (e.event === 'step.marked_done') {
      const byHire = e.subject != null && e.outcome.includes(`by ${e.subject}`)
      const from: MapNode = byHire ? 'hire' : 'team'
      spawn({ node: from, dir: 'in', kind: 'event', tone: 'info' })
      say(from, `marked done${who}`, 'info')
      window.setTimeout(ripple, 1100)
      return
    }
    if (!node) {
      // Day One's own work: re-plans, forecasts, messages. It reaches people.
      ripple()
      spawn({ node: 'team', dir: 'out', kind: 'event', tone })
      say('team', `${e.event}${who}`, tone)
      if (/message|board|start|invite|withdraw/.test(e.event + e.outcome)) spawn({ node: 'hire', dir: 'out', kind: 'event', tone })
      return
    }
    const out = /invites\.|order\.created|release|cancel|retry|request/.test(e.event)
    spawn({ node, dir: out ? 'out' : 'in', kind: 'event', tone })
    say(node, `${e.event}${who}`, tone)
    if (!out) window.setTimeout(ripple, 1100)
  }

  // A quiet heartbeat on every live connection; failing retries on anything that's down.
  useEffect(() => {
    if (reduced) return
    let tick = 0
    const id = window.setInterval(() => {
      if (document.hidden) return
      tick += 1
      const st = useDemo.getState()
      const live = MAP_SYSTEMS.filter((s) => SYSTEM_MODES[st.setup][s] === 'connected' && st.down[s] == null)
      const linked = MAP_SYSTEMS.filter((s) => SYSTEM_MODES[st.setup][s] === 'linked' && st.down[s] == null)
      const pool: MapNode[] = [...live, ...live, ...(tick % 3 === 0 ? linked : []), 'hire', 'team']
      const n = pool[Math.floor(Math.random() * pool.length)]
      if (n) spawn({ node: n, dir: Math.random() < 0.55 ? 'in' : 'out', kind: 'ambient', tone: 'info' })
      if (tick % 3 === 0) for (const s of MAP_SYSTEMS) if (st.down[s] != null) spawn({ node: s, dir: 'out', kind: 'retry', tone: 'bad' })
    }, 900)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const modeOf = (n: MapNode): Mode | 'people' => (n === 'hire' || n === 'team' ? 'people' : SYSTEM_MODES[setup][n])
  const isDown = (n: MapNode) => n !== 'hire' && n !== 'team' && down[n] != null
  const today = log.filter((l) => l.day === now).length
  const lastFor = (n: MapNode) => log.find((l) => nodeFor(l.system) === n)
  const unknownFor = (n: MapNode) => Object.values(views).reduce((c, v) => c + v.steps.filter((s) => s.def.system === n && s.state === 'unknown').length, 0)

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: L?.h ?? 560 }}>
      {L && (
        <>
          <svg width={L.w} height={L.h} className="absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.22" />
                <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={L.hub.x} cy={L.hub.y} r={L.hubR * 2.2} fill="url(#hub-glow)" />
            {(Object.keys(L.edges) as MapNode[]).map((n) => {
              const e = L.edges[n]
              const m = modeOf(n)
              const dn = isDown(n)
              const d = pathOf(e)
              const sel = n === selected
              return (
                <g key={n}>
                  <path d={d} fill="none" stroke={dn ? 'rgb(var(--red) / 0.55)' : sel ? 'rgb(var(--accent) / 0.45)' : 'rgb(var(--line))'} strokeWidth={sel ? 3 : 2} strokeDasharray={dn ? '6 6' : m === 'manual' ? '2 7' : m === 'linked' ? '7 6' : undefined} strokeLinecap="round" />
                  {!dn && (m === 'connected' || m === 'people') && <path d={d} fill="none" stroke="rgb(var(--accent))" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="3 11" strokeLinecap="round" className="edge-flow" />}
                  {!dn && m === 'linked' && <path d={d} fill="none" stroke="rgb(var(--accent))" strokeOpacity={0.28} strokeWidth={2} strokeDasharray="3 11" strokeLinecap="round" className="edge-flow-slow" />}
                  {dn && (() => { const at = q(e, 0.5); return <g><circle cx={at.x} cy={at.y} r={9} fill="rgb(var(--surface))" stroke="rgb(var(--red))" strokeWidth={1.5} /><text x={at.x} y={at.y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="rgb(var(--red))">×</text></g> })()}
                </g>
              )
            })}
            {pulses.map((p) => <PulseDot key={p.id} edge={L.edges[p.node]} p={p} onDone={done} />)}
          </svg>

          {/* Hub */}
          <div className="absolute" style={{ left: L.hub.x - L.hubR, top: L.hub.y - L.hubR, width: L.hubR * 2, height: L.hubR * 2 }}>
            <AnimatePresence>
              {ripples.map((r) => (
                <motion.span key={r} className="absolute inset-0 rounded-full border-2 border-accent" initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.9, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.3, ease: 'easeOut' }} />
              ))}
            </AnimatePresence>
            <span aria-hidden className="absolute -inset-1.5 animate-[spin_9s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,rgb(var(--accent)/0.0),rgb(var(--accent-2)/0.9),rgb(var(--accent)/0.0)_45%)] motion-reduce:animate-none" />
            <motion.div
              key={ripples.length ? ripples[ripples.length - 1] : 0}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 0.45 }}
              className="relative grid h-full w-full place-items-center rounded-full btn-gradient text-center text-white shadow-glow ring-4 ring-surface"
            >
              <div>
                <div className={cn('font-display font-extrabold leading-none', L.narrow ? 'text-[20px]' : 'text-[26px]')}>1</div>
                <div className={cn('font-display font-bold leading-tight', L.narrow ? 'text-[11px]' : 'text-[13px]')}>Day One</div>
                {!L.narrow && <div className="text-[10px] text-white/80"><Num value={today} /> events today</div>}
              </div>
            </motion.div>
          </div>

          {/* Nodes */}
          {(Object.keys(L.nodes) as MapNode[]).map((n, i) => {
            const pt = L.nodes[n]
            const meta = NODE_META[n]
            const m = modeOf(n)
            const dn = isDown(n)
            const last = lastFor(n)
            const unk = unknownFor(n)
            const status = dn ? (unk ? `Down · ${unk} can't check` : 'Down · retrying') : m === 'connected' ? `Live API${last ? ` · ${last.time.slice(0, 5)}` : ''}` : m === 'linked' ? 'Linked · a person confirms' : m === 'manual' ? 'Manual · owner marks done' : meta.role
            return (
              <motion.button
                key={n}
                type="button"
                onClick={() => onSelect(n)}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={dn ? { opacity: 1, scale: 1, x: [0, -5, 5, -3, 3, 0] } : { opacity: 1, scale: 1, x: 0 }}
                transition={{ ...springs.bouncy, delay: 0.03 * i, x: { duration: 0.45 } }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.96 }}
                aria-pressed={n === selected}
                aria-label={`${meta.name}: ${status}`}
                className={cn(
                  'absolute flex items-center gap-2.5 rounded-2xl border bg-surface/90 px-2 text-left shadow-card backdrop-blur transition-colors',
                  dn ? cn('border-red/60 halo-red', n === selected && 'ring-2 ring-red/25') : n === selected ? 'border-accent/60 ring-2 ring-accent/20' : 'border-line/80 hover:border-faint',
                )}
                style={{ left: pt.x - L.card.w / 2, top: pt.y - L.card.h / 2, width: L.card.w, height: L.card.h }}
              >
                <motion.span key={bumps[n] ?? 0} initial={{ scale: 1 }} animate={bumps[n] ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] } : {}} transition={{ duration: 0.45 }} className={cn('grid shrink-0 place-items-center rounded-xl', L.narrow ? 'h-8 w-8' : 'h-10 w-10', dn ? 'bg-red-soft' : 'bg-sunken')}>
                  <Emoji name={meta.emoji} size={L.narrow ? 22 : 28} />
                </motion.span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className={cn('block truncate font-semibold', L.narrow ? 'text-[12px]' : 'text-[13px]')}>{L.narrow ? meta.short ?? meta.name : meta.name}</span>
                  <span className={cn('block truncate', L.narrow ? 'text-[10px]' : 'text-[11px]', dn ? 'font-medium text-red' : 'text-muted')}>{L.narrow ? (dn ? 'Down · retrying' : m === 'connected' ? 'Live' : m === 'linked' ? 'Linked' : m === 'manual' ? 'Manual' : meta.role) : status}</span>
                </span>
                <span className={cn('absolute right-2 top-2 h-2 w-2 rounded-full', dn ? 'bg-red' : m === 'connected' || m === 'people' ? 'bg-green' : m === 'linked' ? 'bg-accent' : 'bg-faint')} />
              </motion.button>
            )
          })}

          {/* Event labels ride next to the connection they happened on */}
          <AnimatePresence>
            {labels.map((l) => {
              const at = q(L.edges[l.node], L.narrow ? 0.55 : 0.4)
              return (
                <motion.div
                  key={l.id}
                  className="pointer-events-none absolute z-10"
                  style={{ left: at.x, top: at.y }}
                  initial={{ opacity: 0, scale: 0.7, x: '-50%', y: '-130%' }}
                  animate={{ opacity: 1, scale: 1, x: '-50%', y: '-150%' }}
                  exit={{ opacity: 0, y: '-190%', transition: { duration: 0.3 } }}
                  transition={springs.bouncy}
                >
                  <span className={cn('block whitespace-nowrap rounded-full border bg-surface px-2 py-0.5 font-mono text-[10.5px] font-medium shadow-pop', l.tone === 'bad' ? 'border-red/40 text-red' : l.tone === 'warn' ? 'border-amber/40 text-amber-ink' : l.tone === 'ok' ? 'border-green/40 text-green' : 'border-accent/30 text-accent')}>{l.text}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export function MapLegend({ className }: { className?: string }) {
  const item = (svg: ReactNode, label: string) => (
    <span className="flex items-center gap-1.5"><svg width="28" height="8" aria-hidden>{svg}</svg>{label}</span>
  )
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted', className)}>
      {item(<line x1="2" y1="4" x2="26" y2="4" stroke="rgb(var(--accent))" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />, 'Live API')}
      {item(<line x1="2" y1="4" x2="26" y2="4" stroke="rgb(var(--faint))" strokeWidth="2" strokeDasharray="7 5" />, 'Linked: a person confirms')}
      {item(<line x1="2" y1="4" x2="26" y2="4" stroke="rgb(var(--faint))" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />, 'Manual: owner marks done')}
      {item(<line x1="2" y1="4" x2="26" y2="4" stroke="rgb(var(--red))" strokeWidth="2" strokeDasharray="6 4" />, 'Down: retrying')}
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green" />Event confirmed</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber" />Warning</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red" />Failed</span>
    </div>
  )
}
