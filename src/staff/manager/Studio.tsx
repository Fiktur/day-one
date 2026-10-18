import { useEffect, useState } from 'react'
import { Brain, Camera, Circle, Eye, Link2, Plus, Send, Sparkle, Square, Trash2, UserPlus, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { NavProvider, useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { useViews, ctxOf, useCtx } from '../../engine/selectors'
import { managerFor } from '../../engine/derive'
import { messagesFor } from '../../engine/messages'
import { people } from '../../data/people'
import { PEPPER_VIDEO, type Board, type BoardSection, type MemoryItem } from '../../data/welcome'
import { fmtDay, fmtShort } from '../../lib/dates'
import { Avatar, Button, Card, Empty, Eyebrow, Pill, ReqTag } from '../../ui/parts'
import { Modal } from '../../ui/overlay'
import { VideoTile } from '../../ui/video'
import { Page, PageHeader } from '../StaffShell'
import { PhoneFrame } from '../../hire/HirePortal'
import { HireWelcome } from '../../hire/Welcome'
import { MessageEditor } from './MessageEditor'
import { burst } from '../../ui/fx'

export function Studio() {
  const { viewer, route, go, compact } = useNav()
  const views = useViews()
  const ctx = useCtx()
  const mine = Object.values(views)
    .filter((v) => (managerFor(v.hire, ctx).id === viewer || v.hire.managerId === viewer) && v.status !== 'started' && v.status !== 'withdrawn')
    .sort((a, b) => a.hire.start - b.hire.start)
  const hireId = route.hireId && mine.some((m) => m.hire.id === route.hireId) ? route.hireId : mine.find((m) => m.hire.id === 'peter')?.hire.id ?? mine[0]?.hire.id
  if (!hireId) return <Page><PageHeader title="Welcome studio" /><Empty title="No upcoming hires" /></Page>
  return (
    <Page>
      <PageHeader title="Welcome studio" sub="Build each hire’s welcome board from your team’s template. Day One remembers what worked on past boards." tags={<ReqTag ids="E10 M4 O12" />} />
      <div className="mb-4 flex flex-wrap gap-2">
        {mine.map((m) => (
          <button key={m.hire.id} type="button" onClick={() => go({ name: 'studio', hireId: m.hire.id })} className={cn('flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px]', m.hire.id === hireId ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-surface hover:border-faint')}>
            <Avatar id={m.hire.id} size={24} />{m.person.name}<span className="text-xs text-muted">{fmtShort(m.hire.start)}</span>
          </button>
        ))}
      </div>
      <BoardBuilder hireId={hireId} compact={compact} />
    </Page>
  )
}

function BoardBuilder({ hireId, compact }: { hireId: string; compact: boolean }) {
  const { viewer } = useNav()
  const s = useDemo()
  const board: Board = s.boards[hireId] ?? s.boardFor(hireId)
  const tpl = s.templates[board.template]
  const views = useViews()
  const v = views[hireId]
  const first = v.person.name.split(' ')[0]
  const [recording, setRecording] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [preview, setPreview] = useState(false)
  const [editingMsg, setEditingMsg] = useState(false)
  const flash = `board:${hireId}` in s.flashes
  const onBoard = new Set([...board.items.map((i) => i.text), ...board.posts.map((p) => p.text)])
  const suggestions = s.memory.filter((m) => m.template === board.template && !onBoard.has(m.text)).sort((a, b) => b.seenOn.length - a.seenOn.length)
  const msg = messagesFor(v, { now: s.now, setup: s.setup, down: s.down, ooo: s.ooo, forced: s.forced }, s.msgEdits).find((m) => m.template.id === 'manager_welcome')

  const ensureBoard = () => {
    if (!s.boards[hireId]) s.set({ boards: { ...s.boards, [hireId]: board } })
  }

  return (
    <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]')}>
      <div className="space-y-4">
        <Card className={cn('p-4', flash && 'animate-flash')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold">{first}’s welcome board</h2>
                {board.status === 'live' ? <Pill tone="green">Shared {fmtShort(board.shared!)}</Pill> : <Pill>Draft</Pill>}
              </div>
              <p className="mt-0.5 text-xs text-muted">Template: <span className="font-medium text-ink">{tpl.name}</span> · version {tpl.version} · updated {fmtDay(tpl.updated)}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPreview(true)}><Eye className="h-3.5 w-3.5" />Preview as {first}</Button>
              {board.status !== 'live' && <Button variant="primary" onClick={(e) => { burst('hearts', e.currentTarget); window.setTimeout(() => burst('big'), 250); ensureBoard(); s.shareBoard(hireId, viewer) }}><Send className="h-3.5 w-3.5" />Share with {first}</Button>}
            </div>
          </div>
        </Card>

        {tpl.sections.map((sec) => (
          <SectionEditor key={sec.id} sec={sec} board={board} hireId={hireId} onRecord={() => setRecording(true)} onInvite={() => setInviting(true)} />
        ))}

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Invited to post</h3>
            <Button size="xs" onClick={() => setInviting(true)}><UserPlus className="h-3.5 w-3.5" />Invite anyone</Button>
          </div>
          {board.invites.length === 0 && <p className="mt-1 text-[13px] text-muted">Nobody yet. Invite teammates, partners, or anyone {first} will work with.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {board.invites.map((i) => (
              <span key={i.person} className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 text-xs">
                <Avatar id={i.person} size={20} />{people[i.person]?.name}
                <span className={i.status === 'posted' ? 'text-green' : 'text-muted'}>{i.status === 'posted' ? 'posted' : 'invited'}</span>
              </span>
            ))}
          </div>
        </Card>

        {msg && (
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Your welcome message <ReqTag ids="M4" /></h3>
                <p className="text-xs text-muted">Sends {msg.day != null ? fmtDay(msg.day) : ''} at 9:00 am {first}’s time, in your name. {msg.edited ? 'Your version will send.' : 'The default sends unless you edit it.'} Edits close {msg.editableUntil != null ? fmtDay(msg.editableUntil) : ''}.</p>
              </div>
              <Button size="sm" onClick={() => setEditingMsg(true)}>Edit and preview</Button>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            <h3 className="font-semibold">Suggested from past boards</h3>
          </div>
          <p className="mt-1 text-xs leading-snug text-muted">Day One remembers links, rituals and reusable videos from boards your team has shared. Personal notes are never copied.</p>
          <div className="mt-3 space-y-2">
            {suggestions.length === 0 && <p className="text-[13px] text-muted">Nothing new to suggest. This board already has everything past boards had.</p>}
            {suggestions.map((m) => <Suggestion key={m.id} m={m} hireId={hireId} onAdd={ensureBoard} />)}
          </div>
        </Card>
        <Card className="p-4">
          <Eyebrow>How the template improves</Eyebrow>
          <ol className="mt-2 space-y-1.5 text-[13px] text-muted">
            <li><span className="font-medium text-ink">1.</span> Every board starts from the team template.</li>
            <li><span className="font-medium text-ink">2.</span> When you share a board, Day One remembers what you added.</li>
            <li><span className="font-medium text-ink">3.</span> Items that keep appearing are suggested for the template, for you or Maria Hill to approve.</li>
          </ol>
        </Card>
      </div>

      {recording && <Recorder hireId={hireId} onClose={() => setRecording(false)} />}
      {inviting && <InviteModal hireId={hireId} onClose={() => setInviting(false)} />}
      {editingMsg && msg && <MessageEditor msg={msg} hireName={v.person.name} by={viewer} onClose={() => setEditingMsg(false)} />}
      {preview && (
        <Modal open onOpenChange={setPreview} title={`Preview: ${first}’s board`} description={board.status === 'live' ? 'This is what they see.' : 'Shown as it will look once shared.'} width="max-w-md">
          <div className="flex justify-center">
            <PhoneFrame compact>
              <NavProvider viewer={hireId} route={{ name: 'welcome' }} go={() => {}} setViewer={() => {}} compact>
                <div className="h-full overflow-y-auto bg-bg pt-2">
                  <PreviewBoard hireId={hireId} />
                </div>
              </NavProvider>
            </PhoneFrame>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PreviewBoard({ hireId }: { hireId: string }) {
  const stored = useDemo((s) => s.boards[hireId])
  const now = useDemo((s) => s.now)
  const b = stored ?? useDemo.getState().boardFor(hireId)
  // Show a draft as it will look once shared, without changing the real board.
  return <HireWelcome boardOverride={b.status === 'live' ? b : { ...b, status: 'live', shared: now }} />
}

function SectionEditor({ sec, board, hireId, onRecord, onInvite }: { sec: BoardSection; board: Board; hireId: string; onRecord: () => void; onInvite: () => void }) {
  const s = useDemo()
  const { viewer } = useNav()
  const [text, setText] = useState('')
  const posts = board.posts.filter((p) => p.section === sec.id)
  const items = board.items.filter((i) => i.section === sec.id)
  const ensure = () => { if (!s.boards[hireId]) s.set({ boards: { ...s.boards, [hireId]: board } }) }
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{sec.title} {sec.required && <span className="text-xs font-normal text-muted">· required</span>}</h3>
          <p className="text-xs text-muted">{sec.prompt}</p>
        </div>
        {sec.id === 'manager' && posts.length === 0 && <Button size="sm" variant="primary" onClick={onRecord}><Camera className="h-3.5 w-3.5" />Record a hello</Button>}
        {(sec.id === 'team' || sec.id === 'buddy') && <Button size="xs" onClick={onInvite}><UserPlus className="h-3.5 w-3.5" />Invite</Button>}
      </div>
      {sec.id === 'company' && (
        <div className="mt-3 flex items-center gap-3">
          <div className="w-20"><VideoTile post={PEPPER_VIDEO} label={false} /></div>
          <p className="text-xs text-muted">Pepper Potts’s welcome is added to every board automatically.</p>
        </div>
      )}
      {posts.length > 0 && (
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
          {posts.map((p) => p.kind === 'video' ? (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-line p-2">
              <div className="w-12 shrink-0"><VideoTile post={p} label={false} /></div>
              <div className="min-w-0 text-xs"><div className="truncate font-medium">{people[p.author]?.name}</div><div className="text-muted">{Math.round((p.duration ?? 30))}s video{p.reusable ? ' · reusable' : ''}</div></div>
            </div>
          ) : (
            <div key={p.id} className="rounded-lg border border-line p-2 text-xs"><div className="line-clamp-3">“{p.text}”</div><div className="mt-1 text-muted">{people[p.author]?.name}</div></div>
          ))}
        </div>
      )}
      {sec.kind === 'notes' && posts.length === 0 && <p className="mt-2 text-[13px] text-muted">Notes appear here as people post.</p>}
      {sec.kind === 'items' && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {items.map((i) => (
              <span key={i.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg py-0.5 pl-2.5 pr-1 text-xs">
                {i.kind === 'link' ? <Link2 className="h-3 w-3 text-accent" /> : <Sparkle className="h-3 w-3 text-accent" />}
                {i.text}
                <button type="button" aria-label={`Remove ${i.text}`} onClick={() => { ensure(); s.removeItem(hireId, i.id) }} className="rounded-full p-0.5 text-faint hover:bg-sunken hover:text-ink"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; ensure(); s.addItem(hireId, { section: sec.id, text: text.trim(), kind: sec.id === 'links' ? 'link' : 'ritual' }); setText('') }}>
            <input aria-label={`Add to ${sec.title}`} value={text} onChange={(e) => setText(e.target.value)} placeholder={sec.id === 'links' ? 'Add a link or channel' : 'Add a ritual or habit'} className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] placeholder:text-faint focus:border-accent focus:outline-none" />
            <Button size="sm" type="submit"><Plus className="h-3.5 w-3.5" />Add</Button>
          </form>
        </div>
      )}
    </Card>
  )
}

function Suggestion({ m, hireId, onAdd }: { m: MemoryItem; hireId: string; onAdd: () => void }) {
  const s = useDemo()
  const Icon = m.kind === 'video' ? Video : m.kind === 'link' ? Link2 : Sparkle
  const self = people[hireId]?.name
  const seen = m.seenOn.filter((n) => n !== self)
  const canTemplate = !m.inTemplate && seen.length >= 2
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-snug">{m.text}</div>
          <div className="mt-0.5 text-xs text-muted">On {seen.length} recent board{seen.length === 1 ? '' : 's'}: {seen.slice(0, 3).join(', ')}{seen.length > 3 ? ` and ${seen.length - 3} more` : ''}{m.author ? ` · by ${people[m.author]?.name}, reuse allowed` : ''}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="xs" variant="primary" onClick={() => { onAdd(); s.useMemory(hireId, m.id) }}><Plus className="h-3 w-3" />Add to board</Button>
        {canTemplate && <Button size="xs" onClick={() => s.memoryToTemplate(m.id)}>Save to template</Button>}
        {m.inTemplate && <span className="text-xs text-green">In the template</span>}
      </div>
    </div>
  )
}

function Recorder({ hireId, onClose }: { hireId: string; onClose: () => void }) {
  const { viewer } = useNav()
  const addPost = useDemo((s) => s.addPost)
  const s = useDemo()
  const [phase, setPhase] = useState<'ready' | 'count' | 'rec' | 'done'>('ready')
  const [n, setN] = useState(3)
  const [secs, setSecs] = useState(0)
  const first = people[hireId].name.split(' ')[0]
  const me = people[viewer].name.split(' ')[0]
  useEffect(() => {
    if (phase === 'count') {
      if (n === 0) { setPhase('rec'); return }
      const t = window.setTimeout(() => setN((x) => x - 1), 700)
      return () => window.clearTimeout(t)
    }
    if (phase === 'rec') {
      const t = window.setInterval(() => setSecs((x) => x + 1), 1000)
      return () => window.clearInterval(t)
    }
  }, [phase, n])
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Record a hello for ${first}`} description="Keep it under a minute: what they'll work on first, and why you're glad they're joining." width="max-w-xl"
      footer={phase === 'done' ? (
        <>
          <Button onClick={() => { setPhase('ready'); setSecs(0); setN(3) }}>Record again</Button>
          <Button variant="primary" onClick={() => {
            if (!s.boards[hireId]) s.set({ boards: { ...s.boards, [hireId]: s.boardFor(hireId) } })
            addPost(hireId, { author: viewer, kind: 'video', section: 'manager', text: `Welcome, ${first}`, duration: Math.max(24, secs * 6), captions: [`Hi ${first}, ${me} here.`, "We're so glad you're joining the team.", "Your first week is planned, and you'll have a buddy from day one.", 'See you soon.'] })
            toast.success('Hello added to the board', { description: 'Captions were added automatically.' })
            onClose()
          }}>Use this take</Button>
        </>
      ) : undefined}
    >
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-stage text-stage-ink">
        <div aria-hidden className="absolute bottom-0 h-[70%] w-[42%] rounded-t-[999px] bg-stage-ink/10" />
        <div aria-hidden className="absolute top-[18%] h-[28%] aspect-square rounded-full bg-stage-ink/15" />
        {phase === 'count' && <div className="relative font-display text-6xl font-extrabold">{n || ''}</div>}
        {phase === 'rec' && <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-red px-2 py-0.5 font-mono text-xs text-white"><Circle className="h-2.5 w-2.5 fill-current" />REC 0:{String(secs).padStart(2, '0')}</div>}
        {phase === 'done' && <div className="relative rounded-lg bg-black/40 px-3 py-1.5 text-sm">Take ready · 0:{String(Math.max(24, secs * 6)).padStart(2, '0')}</div>}
        {phase === 'ready' && <div className="relative text-center text-sm opacity-80">Camera preview<br /><span className="text-xs">Nothing is recorded in the demo</span></div>}
      </div>
      <div className="mt-3 flex justify-center">
        {phase === 'ready' && <Button variant="danger" size="md" onClick={() => setPhase('count')}><Circle className="h-3.5 w-3.5 fill-current" />Start recording</Button>}
        {phase === 'rec' && <Button size="md" onClick={() => setPhase('done')}><Square className="h-3.5 w-3.5 fill-current" />Stop</Button>}
      </div>
    </Modal>
  )
}

function InviteModal({ hireId, onClose }: { hireId: string; onClose: () => void }) {
  const { viewer } = useNav()
  const s = useDemo()
  const [picked, setPicked] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const board = s.boards[hireId] ?? s.boardFor(hireId)
  const already = new Set(board.invites.map((i) => i.person))
  const pool = Object.values(people).filter((p) => p.id !== viewer && p.id !== hireId && !already.has(p.id) && p.role !== 'hire')
  const first = people[hireId].name.split(' ')[0]
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Invite people to ${first}’s board`} description="Anyone can leave a note or a short video. They get one message with a link and a deadline." width="max-w-lg"
      footer={
        <>
          <span className="mr-auto text-xs text-muted">Posting closes {fmtDay(s.now + 5)}.</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!picked.length && !email} onClick={() => {
            if (!s.boards[hireId]) s.set({ boards: { ...s.boards, [hireId]: board } })
            s.invite(hireId, picked, viewer)
            toast.success(`${picked.length + (email ? 1 : 0)} invite${picked.length + (email ? 1 : 0) === 1 ? '' : 's'} sent`, { description: `They’ll be asked: “One thing you wish you’d known in your first week.”` })
            onClose()
          }}>Send invites</Button>
        </>
      }
    >
      <div className="space-y-1">
        {pool.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-sunken">
            <input type="checkbox" checked={picked.includes(p.id)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, p.id] : x.filter((y) => y !== p.id)))} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            <Avatar id={p.id} size={26} />
            <span className="min-w-0"><span className="block text-[13px] font-medium">{p.name}</span><span className="block truncate text-xs text-muted">{p.title}</span></span>
          </label>
        ))}
      </div>
      <label className="mt-3 block text-xs text-muted" htmlFor="invite-email">Someone else, by email</label>
      <input id="invite-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@partner.example" className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-accent focus:outline-none" />
    </Modal>
  )
}
