import { useState } from 'react'
import { toast } from 'sonner'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews } from '../../engine/selectors'
import { people } from '../../data/people'
import { HIRES } from '../../data/hires'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, Button, Card, Empty, ReqTag } from '../../ui/parts'
import { StepRow } from '../../ui/StepRow'
import { Page, PageHeader } from '../StaffShell'
import { Select } from '../../ui/overlay'

export function Covering() {
  const { viewer } = useNav()
  const ooo = useDemo((s) => s.ooo)
  const now = useDemo((s) => s.now)
  const delegate = useDemo((s) => s.delegate)
  const set = useDemo((s) => s.set)
  const views = useViews()
  const mineAway = ooo[viewer]
  const coveringFor = Object.entries(ooo).filter(([, o]) => o.delegate === viewer && now <= o.until)
  const managers = Object.values(people).filter((p) => p.role === 'manager' && p.id !== viewer && !HIRES.some((h) => h.buddyId === p.id))
  const [pick, setPick] = useState(managers.find((m) => m.id === 'lucius')?.id ?? managers[0].id)
  const [until, setUntil] = useState(mineAway?.until ?? now + 14)
  const untilOptions = Array.from(new Set([...[7, 14, 21, 29].map((d) => now + d), ...(mineAway ? [mineAway.until] : [])])).sort((a, b) => a - b)

  return (
    <Page>
      <PageHeader title="Covering for others" sub="Hand your onboarding tasks to someone while you're away. Nothing gets stuck with a person who isn't there." tags={<ReqTag ids="M6" />} />
      {coveringFor.map(([m, o]) => (
        <Card key={m} className="mb-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar id={m} size={32} />
            <div><div className="font-semibold">You're covering for {people[m].name}</div><div className="text-xs text-muted">Until {fmtDay(o.until)}</div></div>
          </div>
          <div className="mt-3">
            {Object.values(views).filter((v) => v.hire.managerId === m).flatMap((v) => v.steps.filter((s) => s.holder?.id === viewer && s.state !== 'blank').map((s) => <StepRow key={v.hire.id + s.key} view={v} step={s} showHire showSource={false} />))}
          </div>
        </Card>
      ))}
      <Card className="p-4">
        <h2 className="font-semibold">{mineAway ? `You're out of office until ${fmtShort(mineAway.until)}` : 'Going away?'}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{mineAway?.delegate ? `${people[mineAway.delegate].name} is covering. Your tasks show on their home until you're back.` : 'Choose who handles your new-hire tasks. They get the tasks, the context and the deadlines.'}</p>
        {!mineAway?.delegate && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="w-56 text-xs text-muted">Covered by
              <Select className="mt-1" label="Covered by" value={pick} onChange={setPick} options={managers.map((m) => [m.id, <span key={m.id} className="flex items-center gap-2"><Avatar id={m.id} size={20} />{m.name}</span>] as const)} />
            </div>
            <div className="w-44 text-xs text-muted">Until
              <Select className="mt-1" label="Until" value={until} onChange={setUntil} options={untilOptions.map((d) => [d, fmtDay(d)] as const)} />
            </div>
            <Button variant="primary" onClick={() => {
              set({ ooo: { ...ooo, [viewer]: { until, delegate: null } } })
              delegate(viewer, pick)
              toast.success(`${people[pick].name} is covering for you`, { description: 'Your open tasks moved to them.' })
            }}>Set cover</Button>
          </div>
        )}
      </Card>
      {!mineAway && coveringFor.length === 0 && <div className="mt-4"><Empty title="You're not covering for anyone" /></div>}
    </Page>
  )
}
