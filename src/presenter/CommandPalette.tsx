import { Command } from 'cmdk'
import * as D from '@radix-ui/react-dialog'
import { Search } from 'lucide-react'
import { useDemo, defaultRoute } from '../engine/store'
import { useViews } from '../engine/selectors'
import { SCENARIOS, runScenario } from '../engine/scenarios'
import { people, personRoleLabel, switcherGroups } from '../data/people'
import { Avatar } from '../ui/parts'
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
  const close = () => set({ palette: false })
  const become = (id: string) => { set({ split: false, main: { viewer: id, route: defaultRoute(id) } }); close() }
  const openHire = (id: string) => { set({ split: false, main: { viewer: 'maria', route: { name: 'hire', hireId: id } } }); close() }
  const item = 'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]'
  return (
    <D.Root open={open} onOpenChange={(o) => set({ palette: o })}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[90] bg-ink/30 backdrop-blur-[3px] data-[state=open]:animate-fade" />
        <D.Content className="fixed left-1/2 top-[14vh] z-[91] w-[580px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-[24px] border border-line bg-surface shadow-pop data-[state=open]:animate-pop-top">
          <D.Title className="sr-only">Command palette</D.Title>
          <D.Description className="sr-only">Jump to a person, hire or scenario</D.Description>
          <Command label="Command palette" loop>
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="h-4 w-4 text-faint" />
              <Command.Input autoFocus placeholder="Jump to a person, a hire, or a scenario…" className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint focus-visible:outline-none" />
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
                <Command.Item value="requirement tags" onSelect={() => { set({ tags: !useDemo.getState().tags }); close() }} className={item}>Toggle requirement tags</Command.Item>
                <Command.Item value="manual first setup" onSelect={() => { useDemo.getState().setSetup(useDemo.getState().setup === 'manual' ? 'connected' : 'manual'); close() }} className={item}>Switch connected / manual-first setup</Command.Item>
                <Command.Item value="reset demo" onSelect={() => { useDemo.getState().reset(); clearChats(); close() }} className={item}>Reset the demo</Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
