import { toast } from 'sonner'
import { useNav } from '../../nav/NavContext'
import { useDemo, type DemoState } from '../../engine/store'
import { refName, type HireView, type Ref, type StepView } from '../../engine/derive'
import { HIRES } from '../../data/hires'
import { people, teams, type TeamId } from '../../data/people'
import { systemNames } from '../../data/journey'
import { Button } from '../../ui/parts'
import { burst } from '../../ui/fx'

export interface Fix { label: string; run: () => void }

const callName = (r: Ref) => (r.kind === 'person' ? (people[r.id]?.name ?? r.name).split(' ')[0] : r.kind === 'team' ? teams[r.id as TeamId].short : r.name)

/** Someone who can cover for an absent manager: another manager, not a buddy and not away themselves. */
export function coverFor(managerId: string, ooo: DemoState['ooo'], now: number): string | undefined {
  const pool = Object.values(people).filter((p) => p.role === 'manager' && p.id !== managerId && !HIRES.some((h) => h.buddyId === p.id) && !(ooo[p.id] && now <= ooo[p.id].until))
  return (pool.find((p) => p.id === 'lucius') ?? pool[0])?.id
}

/**
 * The one move that unsticks a step, by why it is stuck: owner away → reassign, a person or team → nudge,
 * a vendor → chase, a system that can't be read → tell the managers. Null when nothing is stuck.
 */
export function fixFor(v: HireView, s: StepView | null, st: DemoState, viewer: string): Fix | null {
  if (!s || !s.holder) return null
  const first = v.person.name.split(' ')[0]
  if (s.ownerAway && s.holder.kind === 'person') {
    const to = coverFor(s.holder.id, st.ooo, st.now)
    if (!to) return null
    return { label: `Reassign to ${people[to].name.split(' ')[0]}`, run: () => { st.delegate(s.holder!.id, to); toast.success(`${people[to].name} is covering for ${people[s.holder!.id].name}`, { description: `${first}'s prep moved to them, with the context and deadlines.` }) } }
  }
  if (s.state === 'unknown') {
    return { label: 'Notify managers', run: () => { st.nudge(v.hire.id, s.key, `managers waiting on ${systemNames[s.def.system]}`, viewer); toast.success(`Managers told that ${systemNames[s.def.system]} is delayed`, { description: 'Hires already see “updates are delayed, nothing needed from you”.' }) } }
  }
  if (!s.red) return null
  if (s.holder.kind === 'provider') {
    return { label: `Chase ${s.holder.name}`, run: () => { st.nudge(v.hire.id, s.key, s.holder!.name, viewer); toast.success(`Asked ${s.holder!.name} for an update`, { description: `${refName(s.holder!)} gets their reply on the queue.` }) } }
  }
  if (s.holder.kind === 'person' && s.holder.id === viewer) return null
  return { label: `Nudge ${callName(s.holder)}`, run: () => { st.nudge(v.hire.id, s.key, refName(s.holder!), viewer); toast.success(`Nudge sent to ${refName(s.holder!)}`, { description: 'They get a reminder with a link straight to this step.' }) } }
}

export function FixButton({ v, s, size = 'xs', variant = 'primary' }: { v: HireView; s: StepView | null; size?: 'xs' | 'sm'; variant?: 'primary' | 'secondary' }) {
  const { viewer } = useNav()
  const st = useDemo()
  const fix = fixFor(v, s, st, viewer)
  if (!fix) return null
  return <Button size={size} variant={variant} onClick={(e) => { e.stopPropagation(); burst('small', e.currentTarget); fix.run() }}>{fix.label}</Button>
}
