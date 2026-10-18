import { create } from 'zustand'
import { toast } from 'sonner'
import { HIRES, HIRE_BY_ID, OUT_OF_OFFICE } from '../data/hires'
import { SYSTEM_MODES, STEP_BY_KEY, systemNames, type Setup, type SystemId } from '../data/journey'
import { people, type TeamId } from '../data/people'
import { BOARDS, MEMORY, TEMPLATES, emptyBoard, type Board, type BoardItem, type BoardPost, type BoardTemplate, type MemoryItem } from '../data/welcome'
import { TODAY, fmtDay, fmtShort } from '../lib/dates'
import type { Forced } from './simulate'
import { clockTime, entry, resetClockTime, seedLog, type LogEntry } from './log'

export type Route = { name: string; hireId?: string; tab?: string }
export interface Pane {
  viewer: string
  route: Route
}

export type Dialog =
  | null
  | { type: 'changeDate'; hireId: string; to?: number }
  | { type: 'markDone'; hireId: string; key: string; by: string }
  | { type: 'na'; hireId: string; key: string; by: string }

export interface HireMut {
  start: number
  originalStart: number
  withdrawn: number | null
}

export interface DateChange {
  hireId: string
  day: number
  from: number
  to: number
  by: string
  approvedBy: string
}

export type PlanDay = { t: string; l: string }[]
export interface Nudge { hireId: string; key: string; to: string; by: string; day: number }

export interface HelpRequest {
  id: string
  hireId: string
  text: string
  day: number
  to: string
}

export function defaultRoute(viewer: string): Route {
  const role = people[viewer]?.role
  switch (role) {
    case 'hire': return { name: 'home' }
    case 'manager': return { name: 'myhires' }
    case 'recruiter': return { name: 'candidates' }
    case 'program': return { name: 'command' }
    case 'team': return { name: 'queue' }
    case 'head': return { name: 'insights' }
    default: return { name: 'home' }
  }
}

interface Data {
  now: number
  setup: Setup
  down: Partial<Record<SystemId, number>>
  forced: Forced[]
  hires: Record<string, HireMut>
  ooo: Record<string, { until: number; delegate: string | null; since?: number }>
  laptopModel: Record<string, string>
  addresses: Record<string, string>
  boards: Record<string, Board>
  templates: Record<string, BoardTemplate>
  memory: MemoryItem[]
  msgEdits: Record<string, { text: string; by: string }>
  extraSessions: number[]
  log: LogEntry[]
  flashes: Record<string, number>
  requests: HelpRequest[]
  dateChanges: DateChange[]
  split: boolean
  panes: [Pane, Pane, Pane]
  main: Pane
  presenterHidden: boolean
  underHood: boolean
  tags: boolean
  theme: 'light' | 'dark' | 'system'
  dialog: Dialog
  palette: boolean
  lastScenario: number | null
  scenarioRun: number
  sound: boolean
  intro: boolean
  /** Hires who have already seen their day-one welcome. */
  dayOneSeen: string[]
  /** Orientation sessions whose invites the program manager sent in the demo, by session id. */
  invitesSentFor: Record<string, number>
  /** What managers set up in the demo, by hire: the buddy they picked, the first-week plan, the first piece of work. */
  buddies: Record<string, string>
  plans: Record<string, PlanDay[]>
  firstWork: Record<string, { title: string; link: string }>
  /** Who took a team step, by "hire:key". */
  claims: Record<string, string>
  nudges: Nudge[]
  /** Orientation speakers confirmed in the demo, as "session:time". */
  speakers: string[]
}

interface Actions {
  setNow: (day: number) => void
  shiftNow: (by: number) => void
  setSetup: (s: Setup) => void
  markDone: (hireId: string, key: string, by: string, occurred?: number) => void
  confirmStep: (hireId: string, key: string, by: string) => void
  markNA: (hireId: string, key: string, reason: string, by: string) => void
  reject: (hireId: string, key: string, reason: string) => void
  delay: (hireId: string, key: string, eta: number) => void
  speedUp: (hireId: string, key: string, typ: number, note?: string) => void
  changeStart: (hireId: string, to: number, by: string, approvedBy: string) => void
  withdraw: (hireId: string) => void
  delegate: (managerId: string, delegateId: string | null) => void
  toggleDown: (system: SystemId) => void
  addLog: (...e: LogEntry[]) => void
  flash: (...keys: string[]) => void
  addRequest: (hireId: string, text: string, to: string) => void
  assignBuddy: (hireId: string, buddyId: string, by: string) => void
  savePlan: (hireId: string, plan: PlanDay[], by: string) => void
  setFirstWork: (hireId: string, work: { title: string; link: string }, by: string) => void
  claim: (hireId: string, key: string, by: string) => void
  nudge: (hireId: string, key: string, to: string, by: string) => void
  // Welcome boards
  boardFor: (hireId: string) => Board
  invite: (hireId: string, personIds: string[], by: string) => void
  addPost: (hireId: string, post: Omit<BoardPost, 'id' | 'day'>) => void
  addItem: (hireId: string, item: Omit<BoardItem, 'id'>) => void
  removeItem: (hireId: string, itemId: string) => void
  useMemory: (hireId: string, memId: string) => void
  memoryToTemplate: (memId: string) => void
  shareBoard: (hireId: string, by: string) => void
  editMessage: (hireId: string, msgId: string, text: string, by: string) => void
  addSession: (day: number) => void
  // Navigation and presenter
  setMainViewer: (id: string) => void
  goMain: (r: Route) => void
  setPane: (i: number, p: Pane) => void
  setSplit: (on: boolean) => void
  setPanes: (p: [Pane, Pane, Pane]) => void
  setDialog: (d: Dialog) => void
  set: (p: Partial<Data>) => void
  reset: () => void
}

export type DemoState = Data & Actions

const timers: number[] = []
export function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms))
}

function initial(): Data {
  return {
    now: TODAY,
    setup: 'connected',
    down: {},
    forced: [],
    hires: Object.fromEntries(HIRES.map((h) => [h.id, { start: h.start, originalStart: h.start, withdrawn: null }])),
    ooo: JSON.parse(JSON.stringify(OUT_OF_OFFICE)),
    laptopModel: {},
    addresses: {},
    boards: JSON.parse(JSON.stringify(BOARDS)),
    templates: JSON.parse(JSON.stringify(TEMPLATES)),
    memory: JSON.parse(JSON.stringify(MEMORY)),
    msgEdits: {},
    extraSessions: [],
    log: seedLog(),
    flashes: {},
    requests: [],
    dateChanges: [],
    split: true,
    panes: [
      { viewer: 'virgil', route: { name: 'home' } },
      { viewer: 'tony', route: { name: 'myhires' } },
      { viewer: 'maria', route: { name: 'command' } },
    ],
    main: { viewer: 'maria', route: { name: 'command' } },
    presenterHidden: false,
    underHood: false,
    tags: false,
    theme: 'light',
    dialog: null,
    palette: false,
    lastScenario: null,
    scenarioRun: 0,
    sound: false,
    intro: true,
    dayOneSeen: [],
    invitesSentFor: {},
    buddies: {},
    plans: {},
    firstWork: {},
    claims: {},
    nudges: [],
    speakers: [],
  }
}

const hhmm = () => clockTime()
const nameOf = (id: string) => people[id]?.name ?? id
let postSeq = 0

export const useDemo = create<DemoState>()((set, get) => ({
  ...initial(),

  setNow: (day) => set({ now: Math.max(-7, Math.min(70, day)) }),
  shiftNow: (by) => get().setNow(get().now + by),
  setSetup: (setup) => {
    set({ setup })
    get().addLog(entry(get().now, hhmm(), 'day one', 'setup.changed', setup === 'manual' ? 'Manual updates: Firstbase, Google and immigration steps are marked done by their owners' : 'Automatic updates: systems report progress on their own', 'info'))
  },

  markDone: (hireId, key, by, occurred) => {
    const s = get()
    const def = STEP_BY_KEY[key]
    if (!def) return
    const mode = SYSTEM_MODES[s.setup][def.system]
    const f: Forced = { hire: hireId, key, type: 'done', day: s.now, occurred: occurred != null && occurred !== s.now ? occurred : undefined, by }
    const add: Forced[] = [f]
    // With no system to report back, the owner's mark is the confirmation.
    if (def.confirm === 'system' && mode === 'manual') add.push({ hire: hireId, key, type: 'ver', day: s.now, by })
    set({ forced: [...s.forced, ...add] })
    get().flash(`${hireId}:${key}`)
    const sys = systemNames[def.system]
    get().addLog(entry(s.now, hhmm(), mode === 'native' ? 'day one' : sys.toLowerCase(), 'step.marked_done', `${nameOf(hireId)} · ${def.name} · by ${nameOf(by)}${f.occurred != null ? ` · happened ${fmtShort(f.occurred)}` : ''}`, 'ok', nameOf(hireId)))
    if (def.confirm === 'system' && mode === 'connected') {
      later(2400, () => {
        const cur = get()
        if (cur.forced.some((x) => x.hire === hireId && x.key === key && x.type === 'ver' && x.day === cur.now)) return
        if (cur.down[def.system] != null) return
        set({ forced: [...cur.forced, { hire: hireId, key, type: 'ver', day: cur.now, by: sys }] })
        get().flash(`${hireId}:${key}`)
        get().addLog(entry(cur.now, hhmm(), sys.toLowerCase(), 'task.confirmed', `${nameOf(hireId)} · ${def.name} · confirmed`, 'ok', nameOf(hireId)))
        toast.success(`${sys} confirmed “${def.rename?.(HIRE_BY_ID[hireId]) ?? def.name}”`, { description: `${nameOf(hireId)} · now green everywhere` })
      })
    }
  },

  confirmStep: (hireId, key, by) => {
    const s = get()
    set({ forced: [...s.forced, { hire: hireId, key, type: 'ver', day: s.now, by }] })
    get().flash(`${hireId}:${key}`)
    get().addLog(entry(s.now, hhmm(), 'day one', 'step.confirmed', `${nameOf(hireId)} · ${STEP_BY_KEY[key]?.name} · confirmed by ${nameOf(by)}`, 'ok', nameOf(hireId)))
  },

  markNA: (hireId, key, reason, by) => {
    const s = get()
    set({ forced: [...s.forced, { hire: hireId, key, type: 'na', day: s.now, by, reason }] })
    get().flash(`${hireId}:${key}`)
    get().addLog(entry(s.now, hhmm(), 'day one', 'step.not_needed', `${nameOf(hireId)} · ${STEP_BY_KEY[key]?.name} · ${reason} · by ${nameOf(by)}`, 'info', nameOf(hireId)))
  },

  reject: (hireId, key, reason) => {
    const s = get()
    set({ forced: [...s.forced, { hire: hireId, key, type: 'reject', day: s.now, reason }] })
    get().flash(`${hireId}:${key}`)
  },

  delay: (hireId, key, eta) => {
    const s = get()
    set({ forced: [...s.forced, { hire: hireId, key, type: 'delay', day: s.now, eta }] })
    get().flash(`${hireId}:${key}`)
  },

  speedUp: (hireId, key, typ) => {
    const s = get()
    set({ forced: [...s.forced, { hire: hireId, key, type: 'undelay', day: s.now }, { hire: hireId, key, type: 'fast', day: s.now, typ }] })
    get().flash(`${hireId}:${key}`)
  },

  changeStart: (hireId, to, by, approvedBy) => {
    const s = get()
    const cur = s.hires[hireId]
    set({
      hires: { ...s.hires, [hireId]: { ...cur, start: to } },
      dateChanges: [...s.dateChanges, { hireId, day: s.now, from: cur.start, to, by, approvedBy }],
    })
    get().flash(`${hireId}:start`, `${hireId}:messages`)
    get().addLog(entry(s.now, hhmm(), 'day one', 'start_date.changed', `${nameOf(hireId)} · ${fmtDay(cur.start)} → ${fmtDay(to)} · by ${nameOf(by)}, approved by ${nameOf(approvedBy)}`, 'warn', nameOf(hireId)))
  },

  withdraw: (hireId) => {
    const s = get()
    set({ hires: { ...s.hires, [hireId]: { ...s.hires[hireId], withdrawn: s.now } } })
    get().flash(`${hireId}:start`, `${hireId}:messages`)
    get().addLog(
      entry(s.now, hhmm(), 'greenhouse', 'offer.withdrawn', `${nameOf(hireId)} · journey stopped`, 'warn', nameOf(hireId)),
      entry(s.now, hhmm(), 'day one', 'messages.stopped', `${nameOf(hireId)} · all scheduled messages stopped`, 'info', nameOf(hireId)),
      entry(s.now, hhmm(), 'day one', 'tasks.created', `${nameOf(hireId)} · cancel laptop order (IT), cancel background check (Screening)`, 'info', nameOf(hireId)),
    )
  },

  delegate: (managerId, delegateId) => {
    const s = get()
    const cur = s.ooo[managerId] ?? { until: s.now + 14, delegate: null }
    set({ ooo: { ...s.ooo, [managerId]: { ...cur, delegate: delegateId, since: s.now } } })
    get().addLog(entry(s.now, hhmm(), 'day one', 'delegation.set', `${nameOf(managerId)} → ${delegateId ? nameOf(delegateId) : 'nobody'} until ${fmtShort(cur.until)}`, 'info'))
  },

  toggleDown: (system) => {
    const s = get()
    const down = { ...s.down }
    if (down[system] != null) delete down[system]
    else down[system] = s.now
    set({ down })
  },

  addLog: (...e) => set((s) => ({ log: [...e.reverse(), ...s.log].slice(0, 200) })),

  flash: (...keys) => {
    const stamp = Date.now()
    set((s) => ({ flashes: { ...s.flashes, ...Object.fromEntries(keys.map((k) => [k, stamp])) } }))
    later(2600, () => set((s) => {
      const f = { ...s.flashes }
      for (const k of keys) if (f[k] === stamp) delete f[k]
      return { flashes: f }
    }))
  },

  addRequest: (hireId, text, to) => {
    const s = get()
    set({ requests: [{ id: `r${s.requests.length + 1}`, hireId, text, day: s.now, to }, ...s.requests] })
  },

  assignBuddy: (hireId, buddyId, by) => {
    set((s) => ({ buddies: { ...s.buddies, [hireId]: buddyId } }))
    get().markDone(hireId, 'buddy', by)
    get().addLog(entry(get().now, hhmm(), 'day one', 'buddy.assigned', `${nameOf(hireId)} · buddy ${nameOf(buddyId)} · by ${nameOf(by)}`, 'ok', nameOf(hireId)))
  },

  savePlan: (hireId, plan, by) => {
    set((s) => ({ plans: { ...s.plans, [hireId]: plan } }))
    get().markDone(hireId, 'first_week', by)
  },

  setFirstWork: (hireId, work, by) => {
    set((s) => ({ firstWork: { ...s.firstWork, [hireId]: work } }))
    get().markDone(hireId, 'first_work', by)
  },

  claim: (hireId, key, by) => {
    const s = get()
    set({ claims: { ...s.claims, [`${hireId}:${key}`]: by } })
    get().flash(`${hireId}:${key}`)
    get().addLog(entry(s.now, hhmm(), 'day one', 'step.claimed', `${nameOf(hireId)} · ${STEP_BY_KEY[key]?.name} · taken by ${nameOf(by)}`, 'info', nameOf(hireId)))
  },

  nudge: (hireId, key, to, by) => {
    const s = get()
    set({ nudges: [...s.nudges, { hireId, key, to, by, day: s.now }] })
    get().addLog(entry(s.now, hhmm(), 'day one', 'nudge.sent', `${nameOf(hireId)} · ${STEP_BY_KEY[key]?.name} · ${to} nudged by ${nameOf(by)}`, 'info', nameOf(hireId)))
  },

  boardFor: (hireId) => {
    const s = get()
    return s.boards[hireId] ?? emptyBoard(hireId, HIRE_BY_ID[hireId]?.boardTemplate ?? 'default')
  },

  invite: (hireId, personIds, by) => {
    const s = get()
    const b = s.boardFor(hireId)
    const existing = new Set(b.invites.map((i) => i.person))
    const invites = [...b.invites, ...personIds.filter((p) => !existing.has(p)).map((p) => ({ person: p, status: 'invited' as const, day: s.now }))]
    set({ boards: { ...s.boards, [hireId]: { ...b, invites } } })
    get().markDone(hireId, 'board_invite', by)
  },

  addPost: (hireId, post) => {
    const s = get()
    const b = s.boardFor(hireId)
    postSeq += 1
    const p: BoardPost = { ...post, id: `p${postSeq}`, day: s.now }
    const invites = b.invites.map((i) => (i.person === post.author ? { ...i, status: 'posted' as const } : i))
    set({ boards: { ...s.boards, [hireId]: { ...b, posts: [...b.posts, p], invites } } })
    get().flash(`board:${hireId}`)
    const h = HIRE_BY_ID[hireId]
    if (h && post.kind === 'video' && post.section === 'manager') get().markDone(hireId, 'hello', post.author)
  },

  addItem: (hireId, item) => {
    const s = get()
    const b = s.boardFor(hireId)
    postSeq += 1
    set({ boards: { ...s.boards, [hireId]: { ...b, items: [...b.items, { ...item, id: `i${postSeq}` }] } } })
  },

  removeItem: (hireId, itemId) => {
    const s = get()
    const b = s.boardFor(hireId)
    set({ boards: { ...s.boards, [hireId]: { ...b, items: b.items.filter((i) => i.id !== itemId) } } })
  },

  useMemory: (hireId, memId) => {
    const s = get()
    const m = s.memory.find((x) => x.id === memId)
    if (!m) return
    if (m.kind === 'video' && m.author) {
      s.addPost(hireId, { author: m.author, kind: 'video', section: m.section, text: m.text, duration: 120, reusable: true, captions: [`Hi, I'm ${nameOf(m.author).split(' ')[0]}.`, 'This is the short tour I give everyone joining the team.', 'Pause it whenever you like.'] })
    } else {
      s.addItem(hireId, { section: m.section, text: m.text, kind: m.kind === 'video' ? 'tip' : m.kind })
    }
    toast.success('Added to the board', { description: m.text })
  },

  memoryToTemplate: (memId) => {
    const s = get()
    const m = s.memory.find((x) => x.id === memId)
    if (!m) return
    const t = s.templates[m.template]
    postSeq += 1
    const templates = {
      ...s.templates,
      [m.template]: { ...t, version: t.version + 1, updated: s.now, items: [...t.items, { id: `t${postSeq}`, section: m.section, text: m.text, kind: m.kind === 'video' ? 'tip' as const : m.kind }] },
    }
    set({ templates, memory: s.memory.map((x) => (x.id === memId ? { ...x, inTemplate: true } : x)) })
    toast.success(`Saved to the ${t.name} template`, { description: `Version ${t.version + 1}. Future boards start with it.` })
  },

  shareBoard: (hireId, by) => {
    const s = get()
    const b = s.boardFor(hireId)
    const tpl = s.templates[b.template]
    const tplTexts = new Set(tpl.items.map((i) => i.text))
    // Learn reusable items: anything on this board that isn't already in the template.
    const learned: string[] = []
    let memory = [...s.memory]
    for (const it of b.items) {
      if (tplTexts.has(it.text)) continue
      const existing = memory.find((m) => m.text === it.text && m.template === b.template)
      if (existing) {
        if (!existing.seenOn.includes(nameOf(hireId))) memory = memory.map((m) => (m === existing ? { ...m, seenOn: [...m.seenOn, nameOf(hireId)] } : m))
      } else {
        memory.push({ id: `m${memory.length + 10}`, template: b.template, section: it.section, kind: it.kind, text: it.text, seenOn: [nameOf(hireId)], inTemplate: false })
      }
      learned.push(it.text)
    }
    for (const p of b.posts) {
      if (!p.reusable) continue
      const existing = memory.find((m) => m.text === p.text && m.template === b.template)
      if (existing && !existing.seenOn.includes(nameOf(hireId))) memory = memory.map((m) => (m === existing ? { ...m, seenOn: [...m.seenOn, nameOf(hireId)] } : m))
      if (!existing) memory.push({ id: `m${memory.length + 10}`, template: b.template, section: p.section, kind: 'video', text: p.text, author: p.author, seenOn: [nameOf(hireId)], inTemplate: false })
      learned.push(p.text)
    }
    set({ boards: { ...s.boards, [hireId]: { ...b, status: 'live', shared: s.now } }, memory })
    get().flash(`board:${hireId}`)
    toast.success(`Board shared with ${nameOf(hireId).split(' ')[0]}`, {
      description: learned.length ? `${nameOf(hireId).split(' ')[0]} sees it on their Welcome tab. Day One saved ${learned.length} reusable item${learned.length === 1 ? '' : 's'} for future ${tpl.name} boards.` : `${nameOf(hireId).split(' ')[0]} sees it on their Welcome tab now.`,
    })
  },

  editMessage: (hireId, msgId, text, by) => {
    const s = get()
    set({ msgEdits: { ...s.msgEdits, [`${hireId}:${msgId}`]: { text, by } } })
    toast.success('Message updated', { description: `It will send in ${nameOf(by)}'s name.` })
  },

  addSession: (day) => {
    const s = get()
    if (s.extraSessions.includes(day)) return
    set({ extraSessions: [...s.extraSessions, day] })
    toast.success(`Orientation session added for the week of ${fmtShort(day)}`, { description: '12 more seats. Invites go out 14 days before.' })
  },

  setMainViewer: (id) => set({ main: { viewer: id, route: defaultRoute(id) } }),
  goMain: (r) => set((s) => ({ main: { ...s.main, route: r } })),
  setPane: (i, p) => set((s) => {
    const panes = [...s.panes] as [Pane, Pane, Pane]
    panes[i] = p
    return { panes }
  }),
  setSplit: (on) => set({ split: on }),
  setPanes: (panes) => set({ panes }),
  setDialog: (dialog) => set({ dialog }),
  set: (p) => set(p),
  reset: () => {
    while (timers.length) window.clearTimeout(timers.pop())
    resetClockTime()
    const s = get()
    set({ ...initial(), theme: s.theme, split: s.split, sound: s.sound, intro: false, presenterHidden: false })
    toast.dismiss()
    toast('Demo reset', { description: 'Back to Thursday, Oct 15, 9:00 am.' })
  },
}))

export type { TeamId }
