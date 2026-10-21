import { useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useNav } from '../../nav/NavContext'
import { useDemo, type PlanDay } from '../../engine/store'
import { useCtx } from '../../engine/selectors'
import { managerFor, type HireView, type StepView } from '../../engine/derive'
import { HIRES } from '../../data/hires'
import { people } from '../../data/people'
import { SESSIONS, groupFor } from '../../data/cohorts'
import { fmtDay } from '../../lib/dates'
import { Avatar, Button } from '../../ui/parts'
import { Modal, Popover, PopClose } from '../../ui/overlay'
import { burst } from '../../ui/fx'
import { defaultFirstWeek } from '../../hire/helpers'

const OPEN = ['open', 'soon', 'late']
const first = (id: string) => people[id]?.name.split(' ')[0] ?? id

/** The real action behind a manager's prep step, or undefined to fall back to a plain "Mark done". */
export function prepActionFor(v: HireView, s: StepView): ReactNode | undefined {
  if (!OPEN.includes(s.state)) return undefined
  switch (s.key) {
    case 'buddy': return <BuddyPicker v={v} />
    case 'board_invite': return <StudioButton v={v} label="Invite people" />
    case 'hello': return <StudioButton v={v} label="Record a hello" />
    case 'first_week': return <PlanButton v={v} />
    case 'first_work': return <FirstWorkButton v={v} />
    default: return undefined
  }
}

function StudioButton({ v, label }: { v: HireView; label: string }) {
  const { go } = useNav()
  return <Button size="xs" variant="primary" onClick={() => go({ name: 'studio', hireId: v.hire.id })}>{label}</Button>
}

/** Suggest the team's usual buddies first: the one already lined up, then buddies from the same manager's other hires. */
function suggestedBuddies(v: HireView): string[] {
  // Teammates only: the hire's own suggestion, then buddies already working with this manager or department.
  const pool = [v.hire.buddyId, ...HIRES.filter((h) => h.managerId === v.hire.managerId || h.dept === v.hire.dept).map((h) => h.buddyId)]
  return Array.from(new Set(pool.filter((x): x is string => !!x))).slice(0, 3)
}

function BuddyPicker({ v }: { v: HireView }) {
  const { viewer } = useNav()
  const assign = useDemo((s) => s.assignBuddy)
  const hire = first(v.hire.id)
  return (
    <Popover align="end" className="w-72" trigger={<Button size="xs" variant="primary">Pick a buddy</Button>}>
      <div className="text-[13px] font-semibold">A buddy for {hire}</div>
      <p className="mb-2 text-xs text-muted">They say hi before day one and have coffee with {hire} on day two.</p>
      <ul className="space-y-1">
        {suggestedBuddies(v).map((id) => (
          <li key={id}>
            <PopClose asChild>
              <button
                type="button"
                onClick={(e) => {
                  burst('small', e.currentTarget)
                  assign(v.hire.id, id, viewer)
                  toast.success(`${people[id].name} is ${hire}'s buddy`, { description: `Their hello goes to ${hire} 5 days before the start.` })
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-sunken"
              >
                <Avatar id={id} size={28} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{people[id].name}</span><span className="block truncate text-xs text-muted">{people[id].title}</span></span>
                <span className="text-xs font-semibold text-accent">Pick</span>
              </button>
            </PopClose>
          </li>
        ))}
      </ul>
    </Popover>
  )
}

function PlanButton({ v }: { v: HireView }) {
  const { viewer } = useNav()
  const ctx = useCtx()
  const save = useDemo((s) => s.savePlan)
  const saved = useDemo((s) => s.plans[v.hire.id])
  const work = useDemo((s) => s.firstWork[v.hire.id])
  const [open, setOpen] = useState(false)
  const h = v.hire
  const session = SESSIONS.find((x) => x.day === h.start && x.group === groupFor(h))
  const buddy = v.by.buddy?.state === 'verified' && h.buddyId ? first(h.buddyId) : null
  const start = () => saved ?? defaultFirstWeek(h, first(managerFor(h, ctx).id), buddy, session?.where ?? null, work?.title ?? null)
  const [plan, setPlan] = useState<PlanDay[]>(start)
  const edit = (d: number, f: (items: PlanDay) => PlanDay) => setPlan(plan.map((items, i) => (i === d ? f(items) : items)))
  return (
    <>
      <Button size="xs" variant="primary" onClick={() => { setPlan(start()); setOpen(true) }}>Write the plan</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`${first(h.id)}'s first week`}
        description={`Starts from the ${groupFor(h)} agenda. ${first(h.id)} sees exactly this on their First week page.`}
        footer={<>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={(e) => { burst('small', e.currentTarget); save(h.id, plan.map((d) => d.filter((x) => x.l.trim())), viewer); setOpen(false); toast.success('First-week plan saved', { description: `${first(h.id)} sees it on their First week page.` }) }}>Save plan</Button>
        </>}
      >
        <ol className="space-y-3">
          {plan.map((items, d) => (
            <li key={d}>
              <div className="mb-1 flex items-baseline justify-between text-[13px]"><span className="font-semibold">Day {d + 1}</span><span className="font-mono text-xs text-muted">{fmtDay(h.start + d)}</span></div>
              <div className="space-y-1.5">
                {items.map((x, j) => (
                  <div key={j} className="flex items-center gap-1.5">
                    <input aria-label={`Day ${d + 1} time`} value={x.t} onChange={(e) => edit(d, (it) => it.map((y, k) => (k === j ? { ...y, t: e.target.value } : y)))} className="h-8 w-20 shrink-0 rounded-lg border border-line bg-surface px-2 font-mono text-xs focus:border-accent/50 focus:outline-none" />
                    <input aria-label={`Day ${d + 1} item`} value={x.l} onChange={(e) => edit(d, (it) => it.map((y, k) => (k === j ? { ...y, l: e.target.value } : y)))} className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[13px] focus:border-accent/50 focus:outline-none" />
                    <button type="button" aria-label="Remove" onClick={() => edit(d, (it) => it.filter((_, k) => k !== j))} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint hover:bg-sunken hover:text-ink"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => edit(d, (it) => [...it, { t: '', l: '' }])} className="inline-flex items-center gap-1 text-xs font-medium text-accent"><Plus className="h-3 w-3" />Add</button>
              </div>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  )
}

function FirstWorkButton({ v }: { v: HireView }) {
  const { viewer } = useNav()
  const set = useDemo((s) => s.setFirstWork)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const hire = first(v.hire.id)
  const input = 'h-9 w-full rounded-xl border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-accent/50 focus:outline-none'
  return (
    <Popover align="end" className="w-80" trigger={<Button size="xs" variant="primary">Choose the work</Button>}>
      <div className="space-y-2">
        <div>
          <div className="text-[13px] font-semibold">{hire}'s first piece of work</div>
          <p className="text-xs text-muted">Small, real and finishable in week one. {hire} sees it on day one.</p>
        </div>
        <input aria-label="Title" className={input} placeholder="e.g. Fix the flaky alert on the routing dashboard" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Link" className={input} placeholder="Link to the ticket or doc (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
        <PopClose asChild>
          <Button variant="primary" className="w-full" disabled={!title.trim()} onClick={(e) => { burst('small', e.currentTarget); set(v.hire.id, { title: title.trim(), link: link.trim() }, viewer); toast.success('First piece of work set', { description: `${hire} sees “${title.trim()}” on day one.` }) }}>Save</Button>
        </PopClose>
      </div>
    </Popover>
  )
}
