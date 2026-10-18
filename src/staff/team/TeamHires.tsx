import { useNav } from '../../nav/NavContext'
import { useViews, orderedHires } from '../../engine/selectors'
import { useDemo } from '../../engine/store'
import { fmtShort } from '../../lib/dates'
import { Avatar, Card, ReadinessBar, StatusPill } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'

export function TeamHires() {
  const { person, go } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const list = orderedHires(views).filter((v) => v.status !== 'started')
  return (
    <Page>
      <PageHeader title="Hires" sub="Everyone your team is preparing for, and how many of their steps are yours." />
      <Card className="divide-y divide-line">
        {list.map((v) => {
          const mine = v.steps.filter((s) => s.owner.kind === 'team' && s.owner.id === person.team)
          const open = mine.filter((s) => s.holder && s.state !== 'blank').length
          return (
            <button key={v.hire.id} type="button" onClick={() => go({ name: 'hire', hireId: v.hire.id })} className="grid w-full grid-cols-[minmax(0,1.4fr)_70px_minmax(0,1fr)_110px] items-center gap-3 px-4 py-2.5 text-left hover:bg-bg">
              <span className="flex min-w-0 items-center gap-2"><Avatar id={v.hire.id} size={26} /><span className="truncate text-[13px] font-medium">{v.person.name}</span></span>
              <span className="text-[13px] tnum">{fmtShort(v.hire.start)}</span>
              <span className="min-w-0"><ReadinessBar areas={v.areas} compact /><span className="mt-1 block text-[11px] text-muted">{open} open for your team · {mine.filter((s) => s.state === 'verified').length}/{mine.length} done</span></span>
              <StatusPill status={v.status} />
            </button>
          )
        })}
      </Card>
    </Page>
  )
}
