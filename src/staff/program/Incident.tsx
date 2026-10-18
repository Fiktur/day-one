import { toast } from 'sonner'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { ctxOf, useViews } from '../../engine/selectors'
import { managerFor } from '../../engine/derive'
import { systemNames, type SystemId } from '../../data/journey'
import { people } from '../../data/people'
import { fmtDay } from '../../lib/dates'
import { Button } from '../../ui/parts'
import { Emoji } from '../../ui/assets'
import { burst } from '../../ui/fx'

/** Steps a down system can't confirm right now, with the hire they belong to. */
export function useAffected(sys: SystemId) {
  const views = useViews()
  return Object.values(views).flatMap((v) => v.steps.filter((s) => s.def.system === sys && s.state === 'unknown').map((step) => ({ view: v, step })))
}

/** While a system is down: since when, what it touches, what hires see, and one button to tell the managers. */
export function IncidentCards() {
  const down = useDemo((s) => s.down)
  return <>{(Object.keys(down) as SystemId[]).map((sys) => <Incident key={sys} sys={sys} />)}</>
}

function Incident({ sys }: { sys: SystemId }) {
  const { go, viewer } = useNav()
  const st = useDemo()
  const affected = useAffected(sys)
  const ctx = ctxOf(st)
  const managers = Array.from(new Set(affected.map((x) => managerFor(x.view.hire, ctx).id)))
  const told = affected.length > 0 && affected.every((x) => st.nudges.some((n) => n.hireId === x.view.hire.id && n.key === x.step.key && n.day === st.now))
  const name = systemNames[sys]
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-2xl border border-dashed border-red/50 bg-red-soft/60 px-4 py-3 text-[13px]">
      <Emoji name="plug" size={30} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{name} isn't responding · since {fmtDay(st.down[sys]!)}</div>
        <p className="mt-0.5 text-muted">
          {affected.length ? `${affected.length} step${affected.length > 1 ? 's' : ''} can't be checked, for ${Array.from(new Set(affected.map((x) => x.view.person.name.split(' ')[0]))).join(', ')}.` : 'No open steps depend on it right now.'}
          {' '}Hires see “updates are delayed, nothing needed from you”. Nothing turns red while it's down, and Day One retries every 5 minutes.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="xs" onClick={() => go({ name: 'systems' })}>Open systems</Button>
        {managers.length > 0 && (
          <Button size="xs" variant="primary" disabled={told} onClick={(e) => {
            burst('small', e.currentTarget)
            for (const x of affected) st.nudge(x.view.hire.id, x.step.key, people[managerFor(x.view.hire, ctx).id]?.name ?? 'manager', viewer)
            toast.success(`Told ${managers.length} manager${managers.length > 1 ? 's' : ''} about the ${name} delay`, { description: managers.map((m) => people[m]?.name).join(', ') })
          }}>{told ? 'Managers told' : `Notify ${managers.length} manager${managers.length > 1 ? 's' : ''}`}</Button>
        )}
      </div>
    </div>
  )
}
