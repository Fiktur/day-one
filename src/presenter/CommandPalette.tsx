import { useState } from 'react'
import { Command } from 'cmdk'
import * as D from '@radix-ui/react-dialog'
import { Search } from 'lucide-react'
import { useDemo, defaultRoute } from '../engine/store'
import { ctxOf, useViews } from '../engine/selectors'
import { SCENARIOS, runScenario } from '../engine/scenarios'
import { people, personRoleLabel, switcherGroups } from '../data/people'
import { Avatar, Glyph } from '../ui/parts'
import { managerFor, safeName, type HireView, type StepView } from '../engine/derive'
import { Emoji, type EmojiName } from '../ui/assets'
import { navFor } from '../staff/StaffShell'
import type { Route } from '../engine/store'
import { clearChats } from '../assistant/AssistantPanel'

const NAV_EMOJI: Record<string, EmojiName> = {
  myhires: 'smile', studio: 'heart', startcheck: 'calendar', covering: 'handshake', candidates: 'magnifier', command: 'target',
  messages: 'envelope', cohorts: 'calendar', welcome: 'heart', journeys: 'gear', insights: 'chart', queue: 'books', hires: 'smile', systems: 'plug',
}

// Every staff screen once, seen by the first person who has it, plus the new-hire app.
const SCREENS: { key: string; label: string; viewer: string; route: Route; emoji: EmojiName }[] = (() => {
  const out: { key: string; label: string; viewer: string; route: Route; emoji: EmojiName }[] = [
    { key: 'h-home', label: 'New hire app: home', viewer: 'virgil', route: { name: 'home' }, emoji: 'wave' },
    { key: 'h-tasks', label: 'New hire app: tasks', viewer: 'virgil', route: { name: 'tasks' }, emoji: 'check' },
    { key: 'h-welcome', label: 'New hire app: welcome board', viewer: 'virgil', route: { name: 'welcome' }, emoji: 'party' },
    { key: 'h-help', label: 'New hire app: help and assistant', viewer: 'virgil', route: { name: 'help' }, emoji: 'speech' },
  ]
  const seen = new Set<string>()
  for (const id of switcherGroups.flatMap((g) => g.ids)) {
    for (const n of navFor(id)) {
      const k = `${n.name}:${n.label}`
      if (seen.has(k) || people[id].role === 'hire') continue
      seen.add(k)
      out.push({ key: `${id}-${n.name}`, label: n.label, viewer: id, route: { name: n.name }, emoji: NAV_EMOJI[n.name] ?? 'sparkles' })
    }
  }
  return out
})()

export function CommandPalette() {
  const open = useDemo((s) => s.palette)
  const set = useDemo((s) => s.set)
  const views = useViews()
  const main = useDemo((s) => s.main)
  const [q, setQ] = useState('')
  const close = () => { set({ palette: false }); setQ('') }
  const become = (id: string) => { set({ split: false, main: { viewer: id, route: defaultRoute(id) } }); close() }
  const openHire = (id: string) => { set({ split: false, main: { viewer: 'maria', route: { name: 'hire', hireId: id } } }); close() }
  const item = 'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]'
  // Steps are searched as the person on screen; the presenter (or a hire) searches as the onboarding team.
  const onScreen = people[main.viewer]
  const staff = onScreen && ['program', 'head', 'team', 'manager'].includes(onScreen.role)
  const stepViewer = staff ? main.viewer : 'maria'
  const me = staff ? { role: onScreen.role, team: onScreen.team } : { role: 'program' }
  const ctx = ctxOf(useDemo.getState())
  const seesHire = (v: HireView) => me.role !== 'manager' || managerFor(v.hire, ctx).id === stepViewer
  const seesStep = (st: StepView) => me.role !== 'team' || [st.owner, st.holder].some((r) => r && ((r.kind === 'team' && r.id === me.team) || (r.kind === 'provider' && r.steward === me.team)))
  return (
    <D.Root open={open} onOpenChange={(o) => (o ? set({ palette: true }) : close())}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[90] bg-ink/30 backdrop-blur-[3px] data-[state=open]:animate-fade" />
        <D.Content className="fixed left-1/2 top-[14vh] z-[91] w-[580px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-[24px] border border-line bg-surface shadow-pop data-[state=open]:animate-pop-top">
          <D.Title className="sr-only">Command palette</D.Title>
          <D.Description className="sr-only">Jump to a person, hire or scenario</D.Description>
          <Command label="Command palette" loop filter={(value, search) => (search.toLowerCase().split(/\s+/).filter(Boolean).every((w) => value.toLowerCase().includes(w)) ? 1 : 0)}>
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="h-4 w-4 text-faint" />
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Jump to a person, a hire, a step, or a scenario…" className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint focus-visible:outline-none" />
            </div>
            <Command.List className="scroll-thin max-h-[56vh] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-[13px] text-muted">No matches.</Command.Empty>
              <Command.Group heading="Go to a screen">
                {SCREENS.map((x) => (
                  <Command.Item key={x.key} value={`screen ${x.label} ${people[x.viewer].name}`} onSelect={() => { set({ split: false, main: { viewer: x.viewer, route: x.route } }); close() }} className={item}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sunken"><Emoji name={x.emoji} size={20} /></span>{x.label}<span className="ml-auto text-xs text-faint">as {people[x.viewer].name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Scenarios">
                {SCENARIOS.map((sc) => (
                  <Command.Item key={sc.n} value={`scenario ${sc.n} ${sc.title} ${sc.who}`} onSelect={() => { runScenario(sc.n); close() }} className={item}>
                    <span className="grid h-5 w-5 place-items-center rounded border border-line font-mono text-[10px]">{sc.n}</span>
                    {sc.title}<span className="ml-auto text-xs text-faint">{sc.who}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              {/* Steps only once the search has a word in it: there are hundreds, and the empty palette stays short. */}
              {q.trim().length >= 2 && (
                <Command.Group heading="Steps">
                  {Object.values(views).filter((v) => v.status !== 'withdrawn' && seesHire(v)).flatMap((v) => v.steps.filter((s) => !s.def.cancel && s.state !== 'na' && seesStep(s)).map((s) => {
                    // Need-to-know: names are masked for whoever is on screen, and only their own steps show.
                    const name = safeName(s, me, { action: true })
                    return (
                      <Command.Item key={v.hire.id + s.key} value={`step ${name} ${v.person.name}`} onSelect={() => { set({ split: false, main: { viewer: stepViewer, route: { name: 'hire', hireId: v.hire.id, step: s.key } } }); close() }} className={item}>
                        <Glyph state={s.state} red={s.red} size={12} />
                        <span className="min-w-0 truncate">{name}</span>
                        <span className="ml-auto shrink-0 text-xs text-faint">{v.person.name.split(' ')[0]} · {s.label}</span>
                      </Command.Item>
                    )
                  }))}
                </Command.Group>
              )}
              <Command.Group heading="Open a hire record">
                {Object.values(views).map((v) => (
                  <Command.Item key={v.hire.id} value={`hire ${v.person.name} ${v.hire.title}`} onSelect={() => openHire(v.hire.id)} className={item}>
                    <Avatar id={v.hire.id} size={22} />{v.person.name}<span className="ml-auto text-xs text-faint">{v.hire.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="See the demo as">
                {switcherGroups.flatMap((g) => g.ids).map((id) => (
                  <Command.Item key={id} value={`as ${people[id].name} ${personRoleLabel(id)}`} onSelect={() => become(id)} className={item}>
                    <Avatar id={id} size={22} />{people[id].name}<span className="ml-auto text-xs text-faint">{personRoleLabel(id)}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Demo">
                <Command.Item value="split view" onSelect={() => { set({ split: true }); close() }} className={item}>Split view: three people side by side</Command.Item>
                <Command.Item value="under the hood event log" onSelect={() => { set({ underHood: true }); close() }} className={item}>Under the hood: event log</Command.Item>
                <Command.Item value="outbox notifications pings slack email" onSelect={() => { set({ outbox: true }); close() }} className={item}>Outbox: today's notifications</Command.Item>
                <Command.Item value="requirement tags" onSelect={() => { set({ tags: !useDemo.getState().tags }); close() }} className={item}>Toggle requirement tags</Command.Item>
                <Command.Item value="automatic manual updates setup" onSelect={() => { useDemo.getState().setSetup(useDemo.getState().setup === 'manual' ? 'connected' : 'manual'); close() }} className={item}>Switch automatic / manual updates</Command.Item>
                <Command.Item value="reset demo" onSelect={() => { useDemo.getState().reset(); clearChats(); close() }} className={item}>Reset the demo</Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
