import { useState } from 'react'
import { Heart, Link2, Sparkle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../lib/cn'
import { useNav } from '../nav/NavContext'
import { useDemo } from '../engine/store'
import { people } from '../data/people'
import { PEPPER_VIDEO, type Board, type BoardPost } from '../data/welcome'
import { Avatar, Button, ReqTag } from '../ui/parts'
import { VideoPlayer, VideoTile } from '../ui/video'
import { Emoji } from '../ui/assets'
import { Tilt, motion, springs, Reveal } from '../ui/motion'
import { burst, useCelebrate } from '../ui/fx'

export function HireWelcome({ boardOverride }: { boardOverride?: Board } = {}) {
  const { viewer } = useNav()
  const stored = useDemo((s) => s.boards[viewer])
  const board = boardOverride ?? stored
  const flash = useDemo((s) => `board:${viewer}` in s.flashes)
  const tpl = useDemo((s) => (board ? s.templates[board.template] : null))
  const [playing, setPlaying] = useState<BoardPost | null>(null)
  const first = people[viewer].name.split(' ')[0]
  const live = board?.status === 'live'
  const celebrate = useCelebrate<HTMLDivElement>(live && flash, 'hearts')

  if (!board || board.status !== 'live') {
    return (
      <div className="space-y-3 px-4 pb-6">
        <h1 className="pt-1 font-display text-[28px] font-extrabold tracking-[-0.02em]">Welcome</h1>
        <div className="rounded-[22px] border border-dashed border-line bg-surface/60 px-4 py-5 text-center">
          <Emoji name="camera" size={48} float className="mx-auto" />
          <div className="mt-2 font-semibold">Your team is getting your board ready</div>
          <p className="mt-1 text-[13px] text-muted">Hellos and notes from your manager and teammates will appear here soon.</p>
        </div>
        <Section title="From Northbeam">
          <VideoPlayer post={PEPPER_VIDEO} />
          <Byline id="pepper" sub="Head of People" />
        </Section>
      </div>
    )
  }

  const manager = board.posts.find((p) => p.section === 'manager' && p.kind === 'video')
  const buddy = board.posts.filter((p) => p.section === 'buddy')
  const notes = board.posts.filter((p) => p.section === 'team' || (p.kind === 'note' && p.section !== 'buddy'))
  const videos = board.posts.filter((p) => p.kind === 'video' && p !== manager && p.section !== 'buddy')
  const how = board.items.filter((i) => i.section === 'how')
  const links = board.items.filter((i) => i.section === 'links')
  const featured = playing ?? manager ?? PEPPER_VIDEO

  return (
    <div ref={celebrate} className={cn('space-y-4 px-4 pb-4', flash && 'animate-flash rounded-2xl')}>
      <div className="flex items-start justify-between gap-2 pt-1">
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em]">Welcome, {first}</h1>
          <p className="text-[13px] text-muted">{board.posts.length + 1} {board.posts.length + 1 === 1 ? 'message' : 'messages'} from your team at Northbeam <ReqTag ids="E10" /></p>
        </div>
        <Emoji name="party" size={44} float />
      </div>
      <div className="space-y-2">
        <VideoPlayer key={featured.id} post={featured} autoPlay={!!playing} />
        <div className="flex items-center justify-between gap-2">
          <Byline id={featured.author} sub={featured === manager ? 'Your manager' : featured.section === 'company' ? 'Head of People' : people[featured.author]?.title} />
          <Button size="sm" onClick={(e) => { burst('hearts', e.currentTarget); toast.success('Thanks sent', { description: `${people[featured.author]?.name.split(' ')[0]} will see it on their Day One home.` }) }}><Heart className="h-3.5 w-3.5 fill-red text-red" />Say thanks</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-0.5">
        {[...(manager && featured !== manager ? [manager] : []), ...buddy.filter((p) => p.kind === 'video'), ...videos, ...(featured.id !== 'company' ? [PEPPER_VIDEO] : [])].map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ y: 24, opacity: 0, rotate: 0 }}
            animate={{ y: 0, opacity: 1, rotate: [-3, 2, -1.5, 3][i % 4] }}
            whileHover={{ rotate: 0, scale: 1.07, y: -4, zIndex: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ ...springs.bouncy, delay: 0.05 * i }}
            className="rounded-xl bg-white p-1 pb-3 shadow-lift ring-1 ring-ink/5"
          >
            <VideoTile post={p} onClick={() => setPlaying(p)} className="rounded-lg" />
          </motion.div>
        ))}
      </div>

      {buddy.filter((p) => p.kind === 'note').length > 0 && (
        <Section title="Meet your buddy">
          {buddy.filter((p) => p.kind === 'note').map((p, i) => <Note key={p.id} post={p} i={i} />)}
        </Section>
      )}

      {notes.length > 0 && (
        <Section title={tpl?.sections.find((s) => s.id === 'team')?.title ?? 'Notes from the team'}>
          {notes.map((p, i) => <Note key={p.id} post={p} i={i + 1} />)}
        </Section>
      )}

      {how.length > 0 && (
        <Section title="How we work">
          <ul className="space-y-1.5">
            {how.map((i, n) => <Reveal key={i.id} i={n}><li className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-[13px] shadow-card"><Sparkle className="h-3.5 w-3.5 text-accent" />{i.text}</li></Reveal>)}
          </ul>
        </Section>
      )}
      {links.length > 0 && (
        <Section title="Useful links">
          <div className="flex flex-wrap gap-1.5">
            {links.map((i) => <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} transition={springs.bouncy} key={i.id} type="button" onClick={() => toast(`Opens ${i.text}`)} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs shadow-card"><Link2 className="h-3 w-3 text-accent" />{i.text}</motion.button>)}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">{title}</h2>
      {children}
    </section>
  )
}

function Byline({ id, sub }: { id: string; sub?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar id={id} size={30} />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold">{people[id]?.name}</div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
      </div>
    </div>
  )
}

const NOTE_TINTS = ['#FFF6D6', '#E8F0FF', '#FFE9EF', '#E6F8EE']

function Note({ post, i = 0 }: { post: BoardPost; i?: number }) {
  return (
    <Tilt max={6}>
      <motion.div
        initial={{ y: 20, opacity: 0, rotate: 0 }}
        animate={{ y: 0, opacity: 1, rotate: i % 2 ? 1.2 : -1.2 }}
        transition={{ ...springs.bouncy, delay: 0.06 * i }}
        className="relative rounded-[18px] p-3.5 shadow-lift ring-1 ring-ink/5"
        style={{ background: NOTE_TINTS[i % NOTE_TINTS.length] }}
      >
        <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-3deg] rounded-sm bg-white/70 shadow-sm" />
        <p className="font-display text-[14px] leading-relaxed text-[#1b1f33]">“{post.text}”</p>
        <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-[#4b5270]"><Avatar id={post.author} size={22} />{people[post.author]?.name}</div>
      </motion.div>
    </Tilt>
  )
}
