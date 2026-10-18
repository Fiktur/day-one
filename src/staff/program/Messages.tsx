import { useMemo, useState } from 'react'
import { Mail, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews, ctxOf, useCtx } from '../../engine/selectors'
import { messagesFor, type MsgInstance } from '../../engine/messages'
import { MSG_TEMPLATES } from '../../data/messages'
import { people } from '../../data/people'
import { fmtDay, fmtShort, isWeekend, nextWeekday, wdName } from '../../lib/dates'
import { Avatar, Button, Card, Pill, ReqTag, Chip } from '../../ui/parts'
import { toast } from 'sonner'
import { managerFor } from '../../engine/derive'
import { FixButton, fixFor } from './fixes'
import { Page, PageHeader } from '../StaffShell'
import { MsgStatusPill } from './HireRecord'
import { Segmented } from '../../ui/motion'

function triggerText(m: MsgInstance['template']): string {
  if (m.trigger.type === 'offer') return 'When the offer is accepted'
  if (m.trigger.type === 'event') return `When “${m.trigger.step.replace('_', ' ')}” is confirmed`
  const r = m.trigger.rel
  return r === 0 ? 'On the start date' : r < 0 ? `${-r} days before the start date` : `${r} days after the start date`
}

export function Messages() {
  const { route, compact } = useNav()
  const views = useViews()
  const ctx = useCtx()
  const edits = useDemo((s) => s.msgEdits)
  const flashes = useDemo((s) => s.flashes)
  const [tab, setTab] = useState<'needs' | 'timeline' | 'templates'>(route.hireId ? 'timeline' : 'needs')
  const [hire, setHire] = useState<string | 'all'>(route.hireId ?? 'all')
  const all = useMemo(() => Object.values(views).flatMap((v) => messagesFor(v, ctx, edits)), [views, ctx, edits])
  const [selKey, setSelKey] = useState<string | null>(null)
  const sel = all.find((m) => m.key === selKey) ?? null
  const hires = Object.values(views).filter((v) => v.status !== 'started').sort((a, b) => a.hire.start - b.hire.start)
  const moved = all.filter((m) => m.movedFrom != null && m.status === 'scheduled' && (hire === 'all' || m.hireId === hire)).length
  const stopped = all.filter((m) => m.status === 'stopped' && (hire === 'all' || m.hireId === hire)).length

  const days: number[] = []
  for (let d = nextWeekday(ctx.now); days.length < 10; d++) if (!isWeekend(d)) days.push(d)

  return (
    <Page>
      <PageHeader
        title="Messages"
        sub="Every message to every hire, on one timeline. It re-plans when dates move and stops when someone withdraws."
        tags={<ReqTag ids="M3 M4 O8" />}
        right={
          <Segmented value={tab} onChange={setTab} options={[['needs', 'Needs you'], ['timeline', 'Timeline'], ['templates', 'Templates']] as const} />
        }
      />
      {tab === 'needs' ? (
        <NeedsYou all={all} onOpen={(m) => { setTab('timeline'); setHire(m.hireId); setSelKey(m.key) }} />
      ) : tab === 'templates' ? (
        <Card className="divide-y divide-line">
          {MSG_TEMPLATES.map((t) => (
            <div key={t.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.2fr_1fr_1.4fr]">
              <div><div className="font-medium">{t.name}</div><div className="text-xs text-muted">From {t.from === 'manager' ? 'the hiring manager' : t.from === 'buddy' ? 'the buddy' : t.from === 'company' ? 'Pepper Potts' : t.from === 'it' ? 'Northbeam IT' : 'Maria Hill'}</div></div>
              <div className="text-[13px] text-muted">{triggerText(t)}</div>
              <div className="flex flex-wrap gap-1">{t.rules.map((r) => <span key={r} className="rounded bg-sunken px-1.5 py-0.5 text-[11px] text-muted">{r}</span>)}</div>
            </div>
          ))}
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            <Chip on={hire === 'all'} onClick={() => setHire('all')}>All hires</Chip>
            {hires.map((v) => (
              <Chip key={v.hire.id} on={hire === v.hire.id} onClick={() => setHire(v.hire.id)} className="py-0.5 pl-0.5 pr-3">
                <Avatar id={v.hire.id} size={20} />{v.person.name.split(' ')[0]}
              </Chip>
            ))}
          </div>
          {(moved > 0 || stopped > 0) && (
            <div className={cn('mb-3 inline-flex flex-wrap gap-2 rounded-xl border border-amber/30 bg-amber-soft px-3 py-1.5 text-xs text-amber-ink', Object.keys(flashes).some((k) => k.endsWith(':messages')) && 'animate-flash')}>
              {moved > 0 && <span>{moved} message{moved > 1 ? 's' : ''} moved to match a new start date</span>}
              {stopped > 0 && <span>{stopped} stopped after a withdrawal</span>}
            </div>
          )}
          <div className={cn('grid gap-4', compact || !sel ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]')}>
            {hire === 'all' ? (
              <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-5')}>
                {days.map((d) => {
                  const list = all.filter((m) => m.day === d && m.status !== 'skipped')
                  return (
                    <div key={d} className="min-w-0 space-y-1.5">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-faint">{wdName(d)} {fmtShort(d)}</div>
                      {list.length === 0 && <div className="rounded-lg border border-dashed border-line py-3 text-center text-[11px] text-faint">—</div>}
                      {list.map((m) => <MsgCard key={m.key} m={m} selected={m.key === selKey} onClick={() => setSelKey(m.key)} />)}
                    </div>
                  )
                })}
              </div>
            ) : (
              <Card className={cn('p-2', flashes[`${hire}:messages`] && 'animate-flash')}>
                {all.filter((m) => m.hireId === hire).sort((a, b) => (a.day ?? a.expected ?? 999) - (b.day ?? b.expected ?? 999)).map((m) => (
                  <button key={m.key} type="button" onClick={() => setSelKey(m.key)} className={cn('grid w-full grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-bg', m.key === selKey && 'bg-accent-soft', m.status === 'stopped' && 'opacity-60')}>
                    <span className="font-mono text-[11px] text-muted tnum">{m.day != null ? fmtDay(m.day) : m.expected != null ? `~${fmtShort(m.expected)}` : 'on event'}</span>
                    <span className="min-w-0"><span className={cn('block truncate text-[13px] font-medium', m.status === 'stopped' && 'line-through')}>{m.subject}</span><span className="block truncate text-xs text-muted">From {m.from}{m.movedFrom != null && m.status !== 'sent' ? ` · moved from ${fmtShort(m.movedFrom)}` : ''}{m.edited ? ' · edited by manager' : ''}</span></span>
                    <MsgStatusPill status={m.status} />
                  </button>
                ))}
              </Card>
            )}
            {sel && <Editor m={sel} />}
          </div>
        </>
      )}
    </Page>
  )
}

/** Only the messages a person has to look at; everything else sends on its own. */
function NeedsYou({ all, onOpen }: { all: MsgInstance[]; onOpen: (m: MsgInstance) => void }) {
  const { viewer } = useNav()
  const views = useViews()
  const st = useDemo()
  const ctx = ctxOf(st)
  const [reviewed, setReviewed] = useState<string[]>([])
  const now = st.now
  const items = all.flatMap((m) => {
    const v = views[m.hireId]
    if (v.status === 'withdrawn' || reviewed.includes(m.key)) return []
    if (m.status === 'scheduled' && m.movedFrom != null) return [{ m, why: `Moved from ${fmtShort(m.movedFrom)} to ${fmtShort(m.day!)} after a date change. Check the wording still fits.`, action: <Button size="xs" onClick={() => { setReviewed([...reviewed, m.key]); toast.success('Marked as reviewed', { description: m.subject }) }}>Looks right</Button> }]
    if (m.status === 'waiting' && m.template.from === 'buddy' && v.hire.start - now <= 14) {
      const mgr = managerFor(v.hire, ctx).id
      const asked = st.nudges.some((n) => n.hireId === m.hireId && n.key === 'buddy')
      // Same rule as everywhere else: an absent manager gets "Reassign", not a nudge they won't read.
      const action = fixFor(v, v.by.buddy, st, viewer)
        ? <FixButton v={v} s={v.by.buddy} />
        : <Button size="xs" variant="primary" disabled={asked} onClick={() => { st.nudge(m.hireId, 'buddy', people[mgr].name, viewer); toast.success(`Nudge sent to ${people[mgr].name}`, { description: 'With a link to the buddy picker.' }) }}>{asked ? 'Nudged today' : `Nudge ${people[mgr].name.split(' ')[0]}`}</Button>
      return [{ m, why: `Waiting on ${people[mgr].name.split(' ')[0]} to pick a buddy${v.by.buddy?.ownerAway ? `, who is out of office` : ''}. It should go out ${fmtShort(v.hire.start - 5)}.`, action }]
    }
    return []
  })
  const auto = all.filter((m) => m.status === 'scheduled' && m.day != null && m.day <= now + 7).length
  return (
    <div className="space-y-3">
      <Card className="divide-y divide-line">
        {items.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-muted">Nothing needs you. Every message is on schedule.</div>}
        {items.map(({ m, why, action }) => (
          <div key={m.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar id={m.hireId} size={28} />
            <button type="button" onClick={() => onOpen(m)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-medium">{m.subject} <span className="font-normal text-muted">· {people[m.hireId].name}</span></span>
              <span className="block text-xs text-muted">{why}</span>
            </button>
            {action}
          </div>
        ))}
      </Card>
      <p className="px-1 text-xs text-muted">{auto} automated message{auto === 1 ? '' : 's'} go out in the next 7 days on their own. See them on the Timeline.</p>
    </div>
  )
}

function MsgCard({ m, selected, onClick }: { m: MsgInstance; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('w-full rounded-lg border bg-surface p-2 text-left text-xs shadow-card', selected ? 'border-accent ring-1 ring-accent' : 'border-line', m.status === 'stopped' && 'opacity-60')}>
      <div className={cn('line-clamp-2 font-medium leading-snug', m.status === 'stopped' && 'line-through')}>{m.subject}</div>
      <div className="mt-1 flex items-center gap-1 text-muted"><Avatar id={m.hireId} size={16} /><span className="truncate">{people[m.hireId].name.split(' ')[0]}</span></div>
      {m.movedFrom != null && <div className="mt-1"><Pill tone="amber" className="text-[10px]">Moved</Pill></div>}
    </button>
  )
}

function Editor({ m }: { m: MsgInstance }) {
  const t = m.template
  return (
    <Card className="h-fit space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div><div className="font-semibold">{t.name}</div><div className="text-xs text-muted">to {people[m.hireId].name}</div></div>
        <MsgStatusPill status={m.status} />
      </div>
      <dl className="grid grid-cols-[76px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-muted">When</dt><dd>{triggerText(t)}{m.day != null ? ` · ${fmtDay(m.day)}, 9:00 am their time` : ''}</dd>
        <dt className="text-muted">From</dt><dd>{m.from}</dd>
        <dt className="text-muted">Channel</dt><dd>{m.channel}{m.channel === 'Personal email' ? '; work email after day one' : ''}</dd>
        {m.movedFrom != null && <><dt className="text-muted">Moved</dt><dd>from {fmtDay(m.movedFrom)}</dd></>}
      </dl>
      <div className="flex flex-wrap gap-1">{t.rules.map((r) => <span key={r} className="inline-flex items-center gap-1 rounded bg-sunken px-1.5 py-0.5 text-[11px] text-muted"><ShieldCheck className="h-3 w-3" />{r}</span>)}</div>
      <div className="rounded-xl border border-line bg-bg p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted"><Mail className="h-3 w-3" />Preview as {people[m.hireId].name.split(' ')[0]}</div>
        <div className="mt-1.5 text-[13px] font-semibold">{m.subject}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{m.body}</p>
      </div>
      <p className="text-[11px] text-faint">Quiet hours 8 pm–8 am in the hire's time zone · at most one message a day · reminders bundle into a digest.</p>
    </Card>
  )
}
