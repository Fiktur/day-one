import { toast } from 'sonner'
import { useNav } from '../../nav/NavContext'
import { useDemo, type DemoState } from '../../engine/store'
import { coverFor, refName, type HireView, type Ref, type StepView } from '../../engine/derive'
import { people, teams, type TeamId } from '../../data/people'
import { systemNames } from '../../data/journey'
import { Button } from '../../ui/parts'
import { burst } from '../../ui/fx'

export interface Fix { label: string; run: () => void }

const callName = (r: Ref) => (r.kind === 'person' ? (people[r.id]?.name ?? r.name).split(' ')[0] : r.kind === 'team' ? teams[r.id as TeamId].short : r.name)

/**
 * The one move that unsticks a step, by why it is stuck: owner away → reassign, a person or team → nudge,
 * a vendor → chase, a system that can't be read → tell the managers. Null when nothing is stuck.
 */
export function fixFor(v: HireView, s: StepView | null, st: DemoState, viewer: string): Fix | null {
  if (!s || !s.holder) return null
  const first = v.person.name.split(' ')[0]
  const me = people[viewer]
  // The onboarding team unsticks anything; a team only chases its own vendor; everyone else just sees the state.
  if (me?.role === 'team') {
    if (!(s.red && s.holder.kind === 'provider' && s.holder.steward === me.team)) return null
  } else if (me?.role !== 'program') return null
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

const DONE: Record<string, string> = { Chase: 'Chased', Nudge: 'Nudged', Notify: 'Managers told' }

export function FixButton({ v, s, size = 'xs', variant = 'primary' }: { v: HireView; s: StepView | null; size?: 'xs' | 'sm'; variant?: 'primary' | 'secondary' }) {
  const { viewer } = useNav()
  const st = useDemo()
  const fix = fixFor(v, s, st, viewer)
  if (!fix || !s) return null
  // A nudge or chase sent today stays visible on the card, so nobody sends it twice.
  const sent = st.nudges.some((n) => n.hireId === v.hire.id && n.key === s.key && n.day === st.now)
  const verb = fix.label.split(' ')[0]
  if (sent && DONE[verb]) return <Button size={size} variant="ghost" disabled>{DONE[verb]} today</Button>
  return <Button size={size} variant={variant} onClick={(e) => { e.stopPropagation(); burst('small', e.currentTarget); fix.run() }}>{fix.label}</Button>
}
