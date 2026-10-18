import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Captions, VolumeX } from 'lucide-react'
import { cn } from '../lib/cn'
import { people } from '../data/people'
import type { BoardPost } from '../data/welcome'

function fmt(t: number) {
  const s = Math.floor(t)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function posterStyle(author: string) {
  const hue = people[author]?.hue ?? 0
  return {
    background: `radial-gradient(120% 90% at 20% 15%, rgb(var(--av${hue}) / 0.95) 0%, rgb(var(--av${hue}) / 0.55) 45%, rgb(20 25 34 / 0.92) 100%)`,
  }
}

/** A captioned "video". There's no media file in the demo: the poster, captions and progress play along in real time. */
export function VideoPlayer({ post, className, autoPlay = false, onEnded }: { post: BoardPost; className?: string; autoPlay?: boolean; onEnded?: () => void }) {
  const duration = post.duration ?? 30
  const caps = post.captions ?? [post.text]
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const raf = useRef<number>()
  const last = useRef<number>()

  useEffect(() => {
    if (!playing) return
    const tick = (ts: number) => {
      if (last.current != null) {
        const dt = (ts - last.current) / 1000
        setT((x) => {
          const n = x + dt
          if (n >= duration) {
            setPlaying(false)
            onEnded?.()
            return duration
          }
          return n
        })
      }
      last.current = ts
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      last.current = undefined
    }
  }, [playing, duration, onEnded])

  const idx = Math.min(caps.length - 1, Math.floor((t / duration) * caps.length))
  const name = people[post.author]?.name ?? post.author
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  const started = t > 0 || playing

  return (
    <div className={cn('group relative aspect-[16/10] w-full overflow-hidden rounded-2xl text-white', className)} style={posterStyle(post.author)}>
      {/* A soft "person" silhouette so the poster reads as a frame of video */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 mx-auto h-[78%] w-[58%] rounded-t-[999px] bg-white/10 blur-[1px]" />
      <div aria-hidden className={cn('absolute left-1/2 top-[22%] h-[30%] aspect-square -translate-x-1/2 rounded-full bg-white/15 transition-transform duration-[3000ms]', playing && 'scale-[1.03]')} />
      <div className="absolute left-3 top-3 font-display text-3xl font-extrabold opacity-90">{initials}</div>
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[10px]"><Captions className="h-3 w-3" />CC</span>
        <span className="inline-flex items-center rounded bg-black/45 px-1 py-0.5"><VolumeX className="h-3 w-3" /></span>
      </div>
      {started && (
        <div className="absolute inset-x-3 bottom-10 rounded-md bg-black/65 px-2.5 py-1.5 text-[13px] leading-snug" aria-live="polite">
          {caps[idx]}
        </div>
      )}
      {!started && (
        <div className="absolute inset-x-3 bottom-10 text-[13px] font-medium drop-shadow">{post.text}</div>
      )}
      <button
        type="button"
        aria-label={playing ? `Pause video from ${name}` : `Play video from ${name}`}
        onClick={() => {
          if (t >= duration) setT(0)
          setPlaying((p) => !p)
        }}
        className={cn('absolute inset-0 m-auto grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink shadow-pop transition', playing && 'opacity-0 group-hover:opacity-100')}
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
        <div
          className="relative h-1 flex-1 cursor-pointer rounded-full bg-white/30"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            setT(((e.clientX - r.left) / r.width) * duration)
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${(t / duration) * 100}%` }} />
        </div>
        <span className="font-mono text-[10px] tnum">{fmt(t)} / {fmt(duration)}</span>
      </div>
    </div>
  )
}

export function VideoTile({ post, onClick, className, label = true, still = false }: { post: BoardPost; onClick?: () => void; className?: string; label?: boolean; still?: boolean }) {
  const name = people[post.author]?.name ?? post.author
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  const Tag = still ? 'div' : 'button'
  return (
    <Tag {...(still ? {} : { type: 'button' as const, onClick, 'aria-label': `Play video from ${name}` })} className={cn('group relative block aspect-[3/4] w-full overflow-hidden rounded-xl text-left text-white', className)} style={posterStyle(post.author)}>
      <div aria-hidden className="absolute inset-x-0 bottom-0 mx-auto h-[70%] w-[64%] rounded-t-[999px] bg-white/10" />
      <span className="absolute left-2 top-2 font-display text-lg font-extrabold">{initials}</span>
      <span className="absolute right-2 top-2 rounded bg-black/45 px-1 py-0.5 font-mono text-[10px]">{fmt(post.duration ?? 30)}</span>
      <span className="absolute inset-0 m-auto grid h-8 w-8 place-items-center rounded-full bg-white/85 text-ink opacity-90 transition group-hover:scale-105"><Play className="ml-0.5 h-3.5 w-3.5" /></span>
      {label && <span className="absolute inset-x-2 bottom-2 truncate text-[11px] font-medium drop-shadow">{name.split(' ')[0]}</span>}
    </Tag>
  )
}
