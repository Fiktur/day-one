import { toast } from 'sonner'
import { useNav } from '../../nav/NavContext'
import { useDemo, type DemoState } from '../../engine/store'
import { coverFor, managerFor, refName, type HireView, type Ref, type StepView } from '../../engine/derive'
import { ctxOf } from '../../engine/selectors'
import { people, teams, type TeamId } from '../../data/people'
import { systemNames } from '../../data/journey'
import { Button } from '../../ui/parts'
import { burst } from '../../ui/fx'

export interface Fix { label: string; run: () => void }

/** Decisions that unstick a step when the vendor has already answered. Scripted for Hal's backordered laptop. */
export function suggestedFixes(v: HireView, st: DemoState): Fix[] {
  if (!(v.hire.id === 'hal' && v.by.laptop_prep?.eta != null && v.by.laptop_prep.state !== 'verified')) return []
  return [
    { label: 'Switch to an in-stock model', run: () => { st.speedUp('hal', 'laptop_prep', 1); st.set({ laptopModel: { ...st.laptopModel, hal: 'MacBook Pro 14" (in stock)' } }); toast.success('Firstbase confirmed an in-stock MacBook Pro 14"', { description: 'Hal is back on track and will see the new model on the Day One home.' }) } },
    { label: 'Local pickup in San Diego', run: () => { st.speedUp('hal', 'laptop_prep', 1); st.speedUp('hal', 'laptop_deliver', 0); st.set({ laptopModel: { ...st.laptopModel, hal: 'San Diego office stock' } }); toast.success('Pickup booked for Hal at the San Diego office', { description: 'IT reserved a laptop from office stock.' }) } },
    { label: 'Move start to Nov 9', run: () => st.setDialog({ type: 'changeDate', hireId: 'hal', to: v.hire.start + 7 }) },
  ]
}

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
    const mgr = people[managerFor(v.hire, ctxOf(st)).id]
    return { label: `Tell ${mgr.name.split(' ')[0]}`, run: () => { st.nudge(v.hire.id, s.key, mgr.name, viewer); toast.success(`${mgr.name} told that ${systemNames[s.def.system]} is delayed`, { description: 'Hires already see “updates are delayed, nothing needed from you”.' }) } }
  }
  if (!s.red) return null
  // The vendor already gave a new date, so chasing changes nothing: the first decision is the fix.
  const decide = me?.role === 'program' ? suggestedFixes(v, st) : []
  if (decide.length && s.holder.kind === 'provider') return decide[0]
  if (s.holder.kind === 'provider') {
    const team = s.holder.steward ? teams[s.holder.steward].name : 'The owning team'
    return { label: `Chase ${s.holder.name}`, run: () => { st.nudge(v.hire.id, s.key, s.holder!.name, viewer); toast.success(`Asked ${s.holder!.name} for an update`, { description: `${team} sees the reply on its queue.` }) } }
  }
  if (s.holder.kind === 'person' && s.holder.id === viewer) return null
  return { label: `Nudge ${callName(s.holder)}`, run: () => { st.nudge(v.hire.id, s.key, refName(s.holder!), viewer); toast.success(`Nudge sent to ${refName(s.holder!)}`, { description: 'They get a reminder with a link straight to this step.' }) } }
}

const DONE: Record<string, string> = { Chase: 'Chased', Nudge: 'Nudged', Tell: 'Told' }

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
