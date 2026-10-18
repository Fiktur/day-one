import { useId, useState, type ReactNode } from 'react'
import { Bell, Bot, ChevronDown, LayoutDashboard, Search, Users, Mail, CalendarRange, Heart, GitBranch, LineChart, ListTodo, Server, CalendarCheck, UserCog, ClipboardList } from 'lucide-react'
import { cn } from '../lib/cn'
import { useNav } from '../nav/NavContext'
import { useDemo } from '../engine/store'
import { useViews } from '../engine/selectors'
import { people, personRoleLabel, switcherGroups } from '../data/people'
import { countMoves, queueFor } from '../engine/queues'
import { Avatar, Glyph, Kbd } from '../ui/parts'
import { PageTransition, motion, springs, Num } from '../ui/motion'
import { Emoji } from '../ui/assets'
import { Dropdown, DropItem, DropLabel, Popover, Sheet } from '../ui/overlay'
import { AssistantPanel } from '../assistant/AssistantPanel'
import { MyHires } from './manager/MyHires'
import { ManagerHire } from './manager/ManagerHire'
import { Studio } from './manager/Studio'
import { Covering } from './manager/Covering'
import { StartCheck } from './shared/StartCheck'
import { Candidates } from './recruiter/Candidates'
import { Command } from './program/Command'
import { HireRecord } from './program/HireRecord'
import { Messages } from './program/Messages'
import { Cohorts } from './program/Cohorts'
import { WelcomeContent } from './program/WelcomeContent'
import { Journeys } from './program/Journeys'
import { Queue } from './team/Queue'
import { TeamHires } from './team/TeamHires'
import { Systems } from './team/Systems'
import { Insights } from './insights/Insights'

type Item = { name: string; label: string; icon: typeof Users }

export function navFor(viewer: string): Item[] {
  const p = people[viewer]
  switch (p?.role) {
    case 'manager':
      return [
        { name: 'myhires', label: 'My hires', icon: Users },
        { name: 'studio', label: 'Welcome studio', icon: Heart },
        { name: 'startcheck', label: 'Start-date check', icon: CalendarCheck },
        { name: 'covering', label: 'Covering for others', icon: UserCog },
      ]
    case 'recruiter':
      return [
        { name: 'candidates', label: 'Candidates', icon: ClipboardList },
        { name: 'startcheck', label: 'Start-date check', icon: CalendarCheck },
      ]
    case 'program':
      return [
        { name: 'command', label: 'Command center', icon: LayoutDashboard },
        { name: 'messages', label: 'Messages', icon: Mail },
        { name: 'cohorts', label: 'Cohorts and sessions', icon: CalendarRange },
        { name: 'welcome', label: 'Welcome content', icon: Heart },
        { name: 'journeys', label: 'Journeys', icon: GitBranch },
        { name: 'insights', label: 'Insights', icon: LineChart },
      ]
    case 'team': {
      const items: Item[] = [
        { name: 'queue', label: 'Queue', icon: ListTodo },
        { name: 'hires', label: 'Hires', icon: Users },
      ]
      if (p.team === 'hris' || p.team === 'it') items.push({ name: 'systems', label: 'Systems', icon: Server })
      return items
    }
    case 'head':
      return [
        { name: 'insights', label: 'Insights', icon: LineChart },
        { name: 'command', label: 'Command center', icon: LayoutDashboard },
      ]
    default:
      return []
  }
}

function Content() {
  const { route, person } = useNav()
  switch (route.name) {
    case 'myhires': return <MyHires />
    case 'hire': return person.role === 'manager' ? <ManagerHire /> : <HireRecord />
    case 'studio': return <Studio />
    case 'covering': return <Covering />
    case 'startcheck': return <StartCheck />
    case 'candidates': return <Candidates />
    case 'command': return <Command />
    case 'messages': return <Messages />
    case 'cohorts': return <Cohorts />
    case 'welcome': return <WelcomeContent />
    case 'journeys': return <Journeys />
    case 'queue': return <Queue />
    case 'hires': return <TeamHires />
    case 'systems': return <Systems />
    case 'insights': return <Insights />
    default: return <div className="p-6 text-muted">Pick a page from the menu.</div>
  }
}

export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const { viewer, setViewer } = useNav()
  return (
    <Dropdown
      align="end"
      trigger={
        <button type="button" aria-label={`Signed in as ${people[viewer]?.name}`} className={cn('flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 text-[13px] hover:border-faint', compact ? 'pr-1.5' : 'pr-2.5')}>
          <Avatar id={viewer} size={24} />
          {!compact && (
            <span className="min-w-0 truncate whitespace-nowrap text-left">
              <span className="font-medium">{people[viewer]?.name}</span>
              <span className="text-muted"> · {personRoleLabel(viewer)}</span>
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
        </button>
      }
    >
      {switcherGroups.map((g) => (
        <div key={g.label}>
          <DropLabel>{g.label}</DropLabel>
          {g.ids.map((id) => (
            <DropItem key={id} active={id === viewer} onSelect={() => setViewer(id)}>
              <Avatar id={id} size={22} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{people[id].name}</span>
                <span className="block truncate text-xs text-muted">{people[id].title}</span>
              </span>
            </DropItem>
          ))}
        </div>
      ))}
    </Dropdown>
  )
}

function Notifications() {
  const { viewer, go } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const p = people[viewer]
  const who = p.role === 'team' || p.role === 'program' ? { team: p.team } : { person: viewer }
  const overseer = p.role === 'program' || p.role === 'head'
  const q = queueFor(views, who, now)
  const late = Object.values(views).flatMap((v) => v.balls.filter((b) => b.red).map((step) => ({ view: v, step })))
  const list = overseer && q.move.length === 0 ? late : q.move
  const items = list.slice(0, 6)
  const red = list.filter((x) => x.step.red).length
  return (
    <Popover
      align="end"
      className="w-80 p-0"
      trigger={
        <button type="button" aria-label="Notifications" className="relative grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
          <Bell className="h-4 w-4" />
          {list.length > 0 && <span className={cn('absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-surface', red ? 'bg-red' : 'bg-amber')} />}
        </button>
      }
    >
      <div className="border-b border-line px-3 py-2 text-[13px] font-semibold">{overseer && q.move.length === 0 ? 'Needs attention across all hires' : "It's your turn"}</div>
      <div className="max-h-80 overflow-y-auto p-1">
        {items.length === 0 && <div className="px-3 py-4 text-center text-[13px] text-muted"><Emoji name="party" size={30} float className="mx-auto mb-1" />Nothing waiting on you.</div>}
        {items.map((x) => (
          <button key={x.view.hire.id + x.step.key} type="button" onClick={() => go({ name: p.role === 'manager' ? 'hire' : 'hire', hireId: x.view.hire.id })} className="grid w-full grid-cols-[14px_1fr] gap-2 rounded-lg px-2 py-2 text-left hover:bg-sunken">
            <Glyph state={x.step.red ? 'late' : 'open'} className="mt-0.5" />
            <span className="min-w-0 text-[13px]">
              <span className="font-medium">{x.step.name}</span> for {x.view.person.name}
              <span className={cn('block text-xs', x.step.red ? 'text-red' : 'text-muted')}>{x.step.label}</span>
            </span>
          </button>
        ))}
      </div>
    </Popover>
  )
}

export function StaffShell() {
  const { viewer, route, go, compact } = useNav()
  const items = navFor(viewer)
  const views = useViews()
  const setPalette = (on: boolean) => useDemo.getState().set({ palette: on })
  const [assistant, setAssistant] = useState(false)
  const navId = useId()
  const p = people[viewer]
  const who = p.role === 'team' || p.role === 'program' ? { team: p.team } : { person: viewer }
  const counts = countMoves(views, who)
  const current = items.find((i) => i.name === route.name) ?? (route.name === 'hire' ? { name: 'hire', label: views[route.hireId ?? '']?.person.name ?? 'Hire', icon: Users } : items[0])

  const nav: ReactNode = compact ? (
    <Dropdown
      align="start"
      trigger={
        <button type="button" className="flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[13px] font-semibold hover:bg-sunken">
          {current && <current.icon className="h-4 w-4 text-accent" />}
          {current?.label}
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </button>
      }
    >
      {items.map((i) => (
        <DropItem key={i.name} active={route.name === i.name} onSelect={() => go({ name: i.name })}>
          <i.icon className="h-4 w-4 text-muted" />{i.label}
        </DropItem>
      ))}
    </Dropdown>
  ) : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg/50">
      <header className="glass relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line/70 px-3">
        <span className="flex shrink-0 items-center gap-2 font-display text-[15px] font-bold">
          <motion.span whileHover={{ rotate: -12, scale: 1.1 }} transition={springs.bouncy} className="grid h-6 w-6 place-items-center rounded-full btn-gradient text-[11px] font-extrabold text-white shadow-glow">1</motion.span>
          {!compact && <>Day One <span className="font-sans text-xs font-normal text-faint">Northbeam</span></>}
        </span>
        {nav}
        <div className="flex-1" />
        {!compact && (
          <button type="button" onClick={() => setPalette(true)} className="hidden h-8 w-56 items-center justify-between rounded-xl border border-line bg-surface/70 px-2.5 text-[13px] text-faint transition hover:border-accent/40 hover:shadow-glow lg:flex">
            <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" />Search people and steps</span><Kbd>⌘K</Kbd>
          </button>
        )}
        <motion.button type="button" aria-label="Ask Day One" onClick={() => setAssistant(true)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }} transition={springs.bouncy} className="flex h-8 items-center gap-1.5 rounded-xl btn-gradient px-2.5 text-[12px] font-semibold text-white shadow-glow"><Bot className="h-4 w-4" />{!compact && 'Ask'}</motion.button>
        <Notifications />
        <RoleSwitcher compact={compact} />
      </header>
      <div className="flex min-h-0 flex-1">
        {!compact && (
          <aside className="relative z-10 flex w-56 shrink-0 flex-col gap-0.5 border-r border-line/70 bg-surface/55 p-2 backdrop-blur-xl">
            {items.map((i) => {
              const on = route.name === i.name || (route.name === 'hire' && i.name === items[0].name)
              const badge = (i.name === 'queue' || i.name === 'myhires') && counts.total > 0
              return (
                <motion.button key={i.name} type="button" onClick={() => go({ name: i.name })} whileTap={{ scale: 0.96 }} className={cn('relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors', on ? 'font-semibold text-accent' : 'text-muted hover:text-ink')}>
                  {on && <motion.span layoutId={`nav-${navId}`} transition={springs.bouncy} className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-card ring-1 ring-accent/15" />}
                  <motion.span animate={on ? { rotate: [0, -14, 8, 0], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: 0.5 }}><i.icon className="h-4 w-4" /></motion.span>
                  <span className="flex-1">{i.label}</span>
                  {badge && <motion.span key={counts.total} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={springs.bouncy} className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold', counts.red ? 'bg-red text-white' : 'bg-amber-soft text-amber-ink')}><Num value={counts.total} /></motion.span>}
                </motion.button>
              )
            })}
            <div className="flex-1" />
            <div className="flex items-center gap-2 rounded-xl bg-surface/70 px-2 py-2 text-[11px] leading-snug text-muted ring-1 ring-line/70">
              <Avatar id={viewer} size={30} />
              <span className="min-w-0"><span className="block truncate font-medium text-ink">{p.name}</span><span className="block truncate">{p.title}</span></span>
            </div>
          </aside>
        )}
        <main className="scroll-thin relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <PageTransition id={`${route.name}:${route.hireId ?? ''}:${route.tab ?? ''}`}>
            <Content />
          </PageTransition>
        </main>
      </div>
      <Sheet open={assistant} onOpenChange={setAssistant} title="Ask Day One" width="w-[400px]">
        <AssistantPanel viewer={viewer} />
      </Sheet>
    </div>
  )
}

export function PageHeader({ title, sub, right, tags }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; tags?: ReactNode }) {
  const { compact } = useNav()
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', compact ? 'mb-3' : 'mb-5')}>
      <div className="min-w-0">
        <h1 className={cn('font-display font-extrabold leading-tight tracking-[-0.02em]', compact ? 'text-xl' : 'text-[30px]')}>{title} {tags}</h1>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export function Page({ children }: { children: ReactNode }) {
  const { compact } = useNav()
  return <div className={cn('mx-auto w-full', compact ? 'max-w-none px-3 py-3' : 'max-w-[1240px] px-6 py-6')}>{children}</div>
}
