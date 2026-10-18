import { useState } from 'react'
import { ArrowLeft, Eye, Lock, Pencil } from 'lucide-react'
import { cn, lc } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useView, ctxOf, useCtx } from '../../engine/selectors'
import { messagesFor } from '../../engine/messages'
import { AREAS } from '../../data/journey'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, BallChip, Button, Card, Glyph, ReqTag, StageTrack, StatusPill } from '../../ui/parts'
import { StepRow } from '../../ui/StepRow'
import { Page } from '../StaffShell'
import { areaSummary, startLine } from '../shared/summaries'
import { MessageEditor } from './MessageEditor'
import { safeName } from '../../engine/derive'

export function ManagerHire() {
  const { route, go, viewer, compact, person } = useNav()
  const v = useView(route.hireId ?? 'virgil')
  const now = useDemo((s) => s.now)
  const ctx = useCtx()
  const edits = useDemo((s) => s.msgEdits)
  const board = useDemo((s) => s.boards[route.hireId ?? ''])
  const [editing, setEditing] = useState<string | null>(null)
  if (!v) return null
  const prep = v.steps.filter((s) => s.def.area === 'prep' || (s.def.owner.type === 'manager' && s.def.stage <= 4))
  const msgs = messagesFor(v, ctx, edits).filter((m) => m.template.from === 'manager' || m.template.from === 'buddy')
  const ball = v.balls.find((b) => b.holder?.id !== viewer) ?? v.primary
  const editingMsg = msgs.find((m) => m.key === editing)

  return (
    <Page>
      <button type="button" onClick={() => go({ name: 'myhires' })} className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />My hires</button>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar id={v.hire.id} size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">{v.person.name}</h1>
            <div className="text-[13px] text-muted">{v.hire.title} · {v.hire.location} · {startLine(v, now)}</div>
          </div>
        </div>
        <StatusPill status={v.status} className="text-[13px]" />
      </div>

      <Card className="mb-4 p-4">
        <StageTrack stage={v.stage} labels />
        {ball?.holder && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">Who has the ball:</span>
            <BallChip step={ball} now={now} />
            <span>{safeName(ball, { role: person.role })}</span>
            <span className={cn('text-xs', ball.red ? 'text-red' : 'text-muted')}>· {lc(ball.label)}</span>
          </div>
        )}
      </Card>

      <div className={cn('mb-4 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-4')}>
        {v.areas.map((a) => (
          <Card key={a.id} className="p-3.5">
            <div className="flex items-center gap-2 font-semibold">
              <Glyph state={a.state === 'green' ? 'verified' : a.state === 'red' ? 'late' : a.state === 'unknown' ? 'unknown' : a.id === 'prep' && prep.some((s) => s.holder?.id === viewer && s.state !== 'blank') ? 'open' : a.state === 'blank' ? 'blank' : 'prog'} />
              {AREAS.find((x) => x.id === a.id)?.label}
            </div>
            <p className="mt-1 text-xs leading-snug text-muted">{areaSummary(v, a, now)}</p>
          </Card>
        ))}
      </div>

      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[1.3fr_1fr]')}>
        <Card className="p-2">
          <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
            <h2 className="font-display text-base font-bold">Your prep <ReqTag ids="M2 M5" /></h2>
            <span className="text-xs text-muted">{prep.filter((s) => s.state === 'verified').length} of {prep.length} done</span>
          </div>
          {prep.map((s) => (
            <StepRow
              key={s.key}
              view={v}
              step={s}
              showSource={false}
              showHolder={false}
              actions={(s.key === 'hello' || s.key === 'board_invite') && s.state !== 'verified' && s.state !== 'blank' ? <Button size="xs" variant="primary" onClick={() => go({ name: 'studio', hireId: v.hire.id })}>{s.key === 'hello' ? 'Record' : 'Invite'}</Button> : undefined}
            />
          ))}
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 font-display text-base font-bold">Sending from you <ReqTag ids="M4" /></h2>
            <div className="space-y-2">
              {msgs.map((m) => (
                <div key={m.key} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">{m.subject}</div>
                      <div className="text-xs text-muted">{m.status === 'sent' ? `Sent ${fmtDay(m.day!)}` : m.day != null ? `${fmtDay(m.day)} · 9:00 am ${v.person.name.split(' ')[0]}'s time` : 'Waiting'} · from {m.from}</div>
                    </div>
                    {m.edited && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">Edited</span>}
                  </div>
                  {m.editableUntil != null && m.status === 'scheduled' && (
                    <>
                      <p className="mt-1.5 text-xs text-muted">{m.edited ? 'Your version will send.' : 'The default sends unless you edit it'} · edits close {fmtDay(m.editableUntil)}</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="xs" onClick={() => setEditing(m.key)}><Eye className="h-3 w-3" />Preview</Button>
                        <Button size="xs" onClick={() => setEditing(m.key)}><Pencil className="h-3 w-3" />Edit</Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Welcome board</h2>
              <Button size="xs" onClick={() => go({ name: 'studio', hireId: v.hire.id })}>Open studio</Button>
            </div>
            <p className="mt-1 text-xs text-muted">{board ? `${board.status === 'live' ? `Shared ${fmtShort(board.shared!)}` : 'Draft'} · ${board.posts.length} posts · ${board.invites.filter((i) => i.status === 'invited').length} invites waiting` : 'Not started'}</p>
            <div className="mt-2 flex -space-x-1.5">
              {(board?.invites ?? []).map((i) => <span key={i.person} className={cn('rounded-full ring-2 ring-surface', i.status === 'invited' && 'opacity-50')}><Avatar id={i.person} size={24} /></span>)}
            </div>
          </Card>
          <p className="flex items-start gap-1.5 px-1 text-xs text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />You see summaries for screening and immigration. Results and documents stay with those teams. <ReqTag ids="T5" /></p>
        </div>
      </div>
      {editingMsg && <MessageEditor msg={editingMsg} hireName={v.person.name} onClose={() => setEditing(null)} by={viewer} />}
    </Page>
  )
}

