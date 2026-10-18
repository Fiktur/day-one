import { cn, lc } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews, ctxOf, useCtx } from '../../engine/selectors'
import { managerFor, refName, safeName, type HireView } from '../../engine/derive'
import { prepActionFor } from './PrepActions'
import { Emoji, type EmojiName } from '../../ui/assets'
import { StepActions } from '../../ui/StepRow'
import { queueFor } from '../../engine/queues'
import { people } from '../../data/people'
import { fmtShort } from '../../lib/dates'
import { BallChip, Card, Empty, Eyebrow, Glyph, ReadinessBar, ReqTag, StatusPill } from '../../ui/parts'
import { StepRow } from '../../ui/StepRow'
import { Avatar } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'
import { startLine } from '../shared/summaries'
import { Reveal, Tilt } from '../../ui/motion'

export function MyHires() {
  const { viewer, go, compact } = useNav()
  const views = useViews()
  const now = useDemo((s) => s.now)
  const ctx = useCtx()
  const ooo = useDemo((s) => s.ooo)
  const mine = Object.values(views).filter((v) => managerFor(v.hire, ctx).id === viewer || v.hire.managerId === viewer)
  const covering = Object.entries(ooo).filter(([, o]) => o.delegate === viewer && now <= o.until)
  const away = ooo[viewer] && now <= ooo[viewer].until
  const upcoming = mine.filter((v) => v.status !== 'started' && v.status !== 'withdrawn').sort((a, b) => a.hire.start - b.hire.start)
  const ramping = mine.filter((v) => v.status === 'started')
  const q = queueFor(views, { person: viewer }, now)
  // Things to know that aren't the manager's to do: a hire withdrew, or someone else is fixing a risk.
  const fyi = mine.flatMap((v): { v: HireView; emoji: EmojiName; title: string; text: string }[] => {
    const first = v.person.name.split(' ')[0]
    if (v.status === 'withdrawn') return [{ v, emoji: 'envelope', title: `${first} withdrew on ${fmtShort(v.hire.withdrawn!)}.`, text: 'Nothing needed from you. Open steps closed and messages stopped.' }]
    const p = v.primary
    if (v.status === 'atrisk' && p?.holder && !(p.holder.kind === 'person' && p.holder.id === viewer)) return [{ v, emoji: 'warning', title: `${first}'s start date is at risk.`, text: `Waiting on ${refName(p.holder)}: ${lc(p.label)}. Maria Hill is on it; nothing needed from you yet.` }]
    return []
  })

  return (
    <Page>
      <PageHeader title="My hires" sub={`${upcoming.length} starting · ${ramping.length} ramping`} tags={<ReqTag ids="M1 M2" />} />
      {covering.map(([m, o]) => (
        <div key={m} className="mb-4 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-[13px]">
          <Avatar id={m} size={28} />
          <div><span className="font-semibold">You're covering for {people[m].name} until {fmtShort(o.until)}.</span> Their hires and tasks show here with yours. <ReqTag ids="M6" /></div>
        </div>
      ))}
      {away && !ooo[viewer].delegate && (
        <div className="mb-4 rounded-xl border border-red/40 bg-red-soft px-4 py-3 text-[13px]">
          <span className="font-semibold">You're out of office until {fmtShort(ooo[viewer].until)} and nobody is covering.</span> Your hires' prep is slipping. <button type="button" className="font-semibold text-accent underline" onClick={() => go({ name: 'covering' })}>Choose someone to cover</button>
        </div>
      )}

      <section className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold">Your move</h2>
          <span className="text-xs text-muted">{q.move.length} now</span>
        </div>
        <Card className="p-1.5">
          {q.move.length === 0 && <Empty title="Nothing needs you right now" />}
          {q.move.map((x) => <StepRow key={x.view.hire.id + x.step.key} view={x.view} step={x.step} showHire showSource={false} actions={prepActionFor(x.view, x.step)} onOpen={() => go({ name: 'hire', hireId: x.view.hire.id })} />)}
          {q.coming.length > 0 && (
            <details className="group px-2.5 py-1.5 text-[13px]">
              <summary className="cursor-pointer list-none text-xs font-medium text-muted hover:text-ink">{q.coming.length} coming up <span className="group-open:hidden">· show</span></summary>
              <div className="mt-1">{q.coming.map((x) => <StepRow key={x.view.hire.id + x.step.key} view={x.view} step={x.step} showHire showSource={false} dense />)}</div>
            </details>
          )}
        </Card>
      </section>

      {fyi.length > 0 && (
        <section className="mb-5 space-y-2">
          {fyi.map((f) => (
            <button key={f.v.hire.id} type="button" onClick={() => go({ name: 'hire', hireId: f.v.hire.id })} className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left text-[13px] shadow-card hover:bg-bg">
              <Emoji name={f.emoji} size={24} />
              <span className="min-w-0"><span className="font-semibold">{f.title}</span> <span className="text-muted">{f.text}</span></span>
              <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">FYI</span>
            </button>
          ))}
        </section>
      )}

      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(290px,1fr))]')}>
        {upcoming.map((v, i) => <Reveal key={v.hire.id} i={i}><Tilt max={4}><HireCard v={v} /></Tilt></Reveal>)}
        {ramping.map((v, i) => <Reveal key={v.hire.id} i={upcoming.length + i}><Tilt max={4}><RampCard v={v} /></Tilt></Reveal>)}
      </div>
    </Page>
  )
}

function HireCard({ v }: { v: HireView }) {
  const { viewer, go, person } = useNav()
  const now = useDemo((s) => s.now)
  const flash = useDemo((s) => Object.keys(s.flashes).some((k) => k.startsWith(v.hire.id + ':')))
  const myMoves = v.steps.filter((s) => s.holder?.kind === 'person' && s.holder.id === viewer && s.state !== 'blank')
  const ball = v.balls.find((b) => !(b.holder?.kind === 'person' && b.holder.id === viewer)) ?? v.primary
  return (
    <button type="button" onClick={() => go({ name: 'hire', hireId: v.hire.id })} className={cn('flex w-full flex-col gap-3 rounded-[20px] border border-line/80 bg-surface p-4 text-left shadow-card transition hover:shadow-lift', flash && 'animate-flash')}>
      <div className="flex items-start gap-3">
        <Avatar id={v.hire.id} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{v.person.name}</div>
          <div className="truncate text-xs text-muted">{v.hire.title} · {v.hire.location}</div>
        </div>
        <StatusPill status={v.status} />
      </div>
      <div className="text-[13px] tnum">{startLine(v, now)}{v.dateMoved && <span className="text-muted"> · moved from {fmtShort(v.hire.originalStart)}</span>}</div>
      <ReadinessBar areas={v.areas} mineArea={myMoves.some((s) => s.def.area === 'prep') ? 'prep' : null} />
      {ball && ball.holder && (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <span className="shrink-0">Waiting on</span>
          <BallChip step={ball} now={now} size="sm" />
          <span className="truncate">{safeName(ball, { role: person.role, team: person.team }, { action: true })}</span>
        </div>
      )}
      {myMoves.length > 0 && (
        <div className="space-y-1">
          {myMoves.slice(0, 2).map((s) => (
            <div key={s.key} className={cn('flex items-center gap-2 rounded-md px-2 py-1 text-xs', s.red ? 'bg-red-soft' : 'bg-amber-soft')}>
              <Glyph state={s.red ? 'late' : 'open'} size={10} />
              <span className="flex-1 truncate font-medium">{safeName(s, { role: person.role, team: person.team }, { action: true })}</span>
              <span className={cn('shrink-0', s.red ? 'text-red' : 'text-amber-ink')}>{s.label.replace('Due ', '')}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

function RampCard({ v }: { v: HireView }) {
  const { go } = useNav()
  const now = useDemo((s) => s.now)
  const ramp = v.steps.filter((s) => s.def.stage >= 5 && (s.key === 'milestone' || s.key === 'checkin30' || s.key === 'benefits'))
  return (
    <div className="flex w-full flex-col gap-3 rounded-[20px] border border-line/80 bg-surface p-4 text-left shadow-card transition hover:shadow-lift">
      <button type="button" onClick={() => go({ name: 'hire', hireId: v.hire.id })} className="flex items-start gap-3 text-left">
        <Avatar id={v.hire.id} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{v.person.name}</div>
          <div className="truncate text-xs text-muted">{v.hire.title} · day {now - v.hire.start + 1}</div>
        </div>
        <StatusPill status="started" />
      </button>
      <Eyebrow>First 90 days <ReqTag ids="T10" /></Eyebrow>
      <div className="space-y-1.5">
        {ramp.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <Glyph state={s.state === 'open' ? 'prog' : s.state} size={12} />
            <span className={cn('flex-1 truncate', s.state === 'blank' ? 'text-muted' : 'font-medium')}>{s.name}</span>
            <span className="shrink-0 text-muted">{s.state === 'verified' ? fmtShort(s.ver!) : s.label.replace('Due ', 'by ')}</span>
            <StepActions view={v} step={s} />
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted">Contribution is tracked apart from paperwork.</div>
    </div>
  )
}
