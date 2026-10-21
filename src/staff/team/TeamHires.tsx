import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useViews, orderedHires } from '../../engine/selectors'
import { refName, safeName, type StepView } from '../../engine/derive'
import { fmtShort } from '../../lib/dates'
import { Avatar, Card, Empty, Glyph, StatusPill } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'

const RISK: Record<string, number> = { atrisk: 0, behind: 1, unknown: 2 }
const urgency = (s: StepView) => (s.state === 'late' ? 0 : s.red ? 1 : s.state === 'unknown' ? 2 : s.holder ? 3 : 4)

export function TeamHires() {
  const { person, go, compact } = useNav()
  const views = useViews()
  const viewer = { role: person.role, team: person.team }
  // Only hires with work still ahead for this team, most urgent first.
  const rows = orderedHires(views)
    .filter((v) => v.status !== 'started' && v.status !== 'withdrawn')
    .map((v) => {
      const ours = (s: StepView) => (s.owner.kind === 'team' && s.owner.id === person.team) || s.owner.steward === person.team
      const left = v.steps.filter((s) => ours(s) && s.state !== 'verified' && s.state !== 'na')
      const top = [...left].sort((a, b) => urgency(a) - urgency(b) || (a.due ?? 999) - (b.due ?? 999))[0]
      return { v, left, top }
    })
    .filter((r) => r.top)
    .sort((a, b) => (RISK[a.v.status] ?? 3) - (RISK[b.v.status] ?? 3) || urgency(a.top!) - urgency(b.top!) || a.v.hire.start - b.v.hire.start)
  // "At risk" or "Behind" says why, in the words this team may see.
  const why = (v: (typeof rows)[number]['v']) => {
    if (v.status !== 'atrisk' && v.status !== 'behind') return null
    const p = v.balls.find((b) => b.red && b.def.critical) ?? v.balls.find((b) => b.red) ?? v.primary
    return p?.holder ? `Waiting on ${refName(p.holder)}` : null
  }
  const pill = (v: (typeof rows)[number]['v']) => <span className="flex flex-col items-start gap-0.5"><StatusPill status={v.status} />{why(v) && <span className="text-[10px] leading-tight text-muted">{why(v)}</span>}</span>
  return (
    <Page>
      <PageHeader title="Hires" sub={`${rows.length} hire${rows.length === 1 ? '' : 's'} with work still ahead for your team.`} />
      {rows.length === 0 ? <Empty title="No hire needs your team right now" /> : (
        <Card className="divide-y divide-line">
          {rows.map(({ v, left, top }) => {
            const next = (
              <span className="flex min-w-0 items-center gap-2">
                <Glyph state={top!.state} red={top!.red} size={12} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px]">{safeName(top!, viewer, { action: true })}{left.length > 1 && <span className="text-muted"> +{left.length - 1} more</span>}</span>
                  <span className={cn('block truncate text-xs', top!.red ? 'font-medium text-red' : 'text-muted')}>{top!.label}</span>
                </span>
              </span>
            )
            return compact ? (
              <button key={v.hire.id} type="button" onClick={() => go({ name: 'hire', hireId: v.hire.id })} className="block w-full space-y-1.5 px-3 py-2.5 text-left">
                <span className="flex items-center gap-2"><Avatar id={v.hire.id} size={24} /><span className="min-w-0 flex-1 truncate text-[13px] font-medium">{v.person.name}</span><span className="text-xs text-muted tnum">{fmtShort(v.hire.start)}</span>{pill(v)}</span>
                {next}
              </button>
            ) : (
              <button key={v.hire.id} type="button" onClick={() => go({ name: 'hire', hireId: v.hire.id })} className="grid w-full grid-cols-[minmax(0,1.2fr)_64px_minmax(0,1.6fr)_150px] items-center gap-3 px-4 py-2.5 text-left hover:bg-bg">
                <span className="flex min-w-0 items-center gap-2"><Avatar id={v.hire.id} size={26} /><span className="truncate text-[13px] font-medium">{v.person.name}</span></span>
                <span className="text-[13px] tnum">{fmtShort(v.hire.start)}</span>
                {next}
                {pill(v)}
              </button>
            )
          })}
        </Card>
      )}
    </Page>
  )
}
