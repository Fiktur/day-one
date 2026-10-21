import { useState } from 'react'
import { ChevronDown, Maximize2, Smartphone, Monitor } from 'lucide-react'
import { cn, useNarrow } from '../lib/cn'
import { NavProvider } from '../nav/NavContext'
import { defaultRoute, useDemo, type Route } from '../engine/store'
import { people, personRoleLabel, switcherGroups } from '../data/people'
import { HirePortal } from '../hire/HirePortal'
import { StaffShell } from '../staff/StaffShell'
import { Avatar } from '../ui/parts'
import { Dropdown, DropItem, DropLabel } from '../ui/overlay'
import { Segmented, motion, springs } from '../ui/motion'

const EXTRA_VIEWERS = ['matt', 'ted', 'wade', 'dinah', 'barry', 'franklin', 'logan']

function ViewerPicker({ viewer, onPick }: { viewer: string; onPick: (id: string) => void }) {
  return (
    <Dropdown
      align="start"
      trigger={
        <button type="button" className="flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs hover:bg-surface/80">
          <Avatar id={viewer} size={20} />
          <span className="truncate font-medium">{people[viewer]?.name}</span>
          <span className="hidden truncate text-faint xl:inline">· {personRoleLabel(viewer)}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted" />
        </button>
      }
    >
      {switcherGroups.map((g) => (
        <div key={g.label}>
          <DropLabel>{g.label}</DropLabel>
          {g.ids.map((id) => (
            <DropItem key={id} active={id === viewer} onSelect={() => onPick(id)}>
              <Avatar id={id} size={20} />{people[id].name}<span className="ml-auto text-[11px] text-faint">{people[id].title.split(',')[0]}</span>
            </DropItem>
          ))}
        </div>
      ))}
      <DropLabel>More of the cast</DropLabel>
      {EXTRA_VIEWERS.map((id) => (
        <DropItem key={id} active={id === viewer} onSelect={() => onPick(id)}>
          <Avatar id={id} size={20} />{people[id].name}<span className="ml-auto text-[11px] text-faint">{personRoleLabel(id)}</span>
        </DropItem>
      ))}
    </Dropdown>
  )
}

export function SplitView() {
  const panes = useDemo((s) => s.panes)
  const setPane = useDemo((s) => s.setPane)
  const set = useDemo((s) => s.set)
  const cols = panes.map((p, i) => (people[p.viewer]?.role === 'hire' ? '372px' : i === 2 ? 'minmax(0,1.25fr)' : 'minmax(0,1fr)')).join(' ')
  return (
    <div className="grid h-full min-h-0 gap-3 p-3 pt-2" style={{ gridTemplateColumns: cols }}>
      {panes.map((p, i) => {
        const hire = people[p.viewer]?.role === 'hire'
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...springs.soft, delay: 0.08 * i }} className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px]', hire ? '' : 'border border-white/80 bg-surface/70 shadow-lift ring-1 ring-ink/5 backdrop-blur-xl')}>
            <div className={cn('flex h-9 shrink-0 items-center justify-between gap-2 px-2', hire ? '' : 'border-b border-line/70')}>
              <ViewerPicker viewer={p.viewer} onPick={(id) => setPane(i, { viewer: id, route: defaultRoute(id) })} />
              <button type="button" title="Open full screen" onClick={() => set({ split: false, main: { ...p } })} className="rounded-md p-1 text-faint hover:bg-sunken hover:text-ink"><Maximize2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className={cn('min-h-0 flex-1', hire && 'flex items-start justify-center')}>
              <NavProvider
                viewer={p.viewer}
                route={p.route}
                go={(r: Route) => setPane(i, { ...p, route: r })}
                setViewer={(id) => setPane(i, { viewer: id, route: defaultRoute(id) })}
                compact
              >
                {hire ? <HirePortal frame="phone" /> : <StaffShell />}
              </NavProvider>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function MainView() {
  const main = useDemo((s) => s.main)
  const goMain = useDemo((s) => s.goMain)
  const setMainViewer = useDemo((s) => s.setMainViewer)
  const [picked, setFrame] = useState<'phone' | 'none'>('phone')
  const narrow = useNarrow(1180)
  const tiny = useNarrow(480)
  const frame = tiny ? 'none' : picked
  const hire = people[main.viewer]?.role === 'hire'
  return (
    <NavProvider viewer={main.viewer} route={main.route} go={goMain} setViewer={setMainViewer} compact={narrow}>
      {hire ? (
        <div className="relative flex h-full min-h-0 flex-col items-center justify-start gap-3 overflow-y-auto px-4 pt-3">
          <div className="flex w-full max-w-5xl items-center justify-between">
            <ViewerPicker viewer={main.viewer} onPick={setMainViewer} />
            {!tiny && <Segmented className="glass shadow-card" value={frame} onChange={setFrame} options={[['phone', <span key="p" className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />Phone</span>], ['none', <span key="d" className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" />Desktop</span>]] as const} />}
          </div>
          {frame === 'phone' ? <HirePortal frame="phone" /> : <div className={cn('h-[calc(100%-60px)] w-full overflow-hidden rounded-[22px] border border-white/80 bg-bg shadow-lift', tiny ? 'max-w-2xl' : 'max-w-5xl')}><HirePortal frame={tiny ? 'none' : 'desktop'} /></div>}
        </div>
      ) : (
        <StaffShell />
      )}
    </NavProvider>
  )
}
