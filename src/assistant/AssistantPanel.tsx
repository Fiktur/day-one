import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { ArrowUp, Check, Info, ShieldCheck, UserRound } from 'lucide-react'
import { cn } from '../lib/cn'
import { people } from '../data/people'
import { respond, suggestionsFor, type AssistantReply } from './engine'
import { workersAI } from './providers'
import { Avatar, Button, ReqTag, Tooltip } from '../ui/parts'
import { motion, springs } from '../ui/motion'
import { Emoji } from '../ui/assets'
import { sfx } from '../ui/fx'

interface Msg {
  id: number
  role: 'user' | 'assistant'
  text: string
  reply?: AssistantReply
  done?: string[]
}

const useChats = create<{ chats: Record<string, Msg[]>; push: (viewer: string, m: Msg) => void; patch: (viewer: string, id: number, p: Partial<Msg>) => void; clear: () => void }>((set) => ({
  chats: {},
  push: (viewer, m) => set((s) => ({ chats: { ...s.chats, [viewer]: [...(s.chats[viewer] ?? []), m] } })),
  patch: (viewer, id, p) => set((s) => ({ chats: { ...s.chats, [viewer]: (s.chats[viewer] ?? []).map((m) => (m.id === id ? { ...m, ...p } : m)) } })),
  clear: () => set({ chats: {} }),
}))
export const clearChats = () => useChats.getState().clear()

let seq = 0
const EMPTY: Msg[] = []

function Reveal({ reply, onAction, done }: { reply: AssistantReply; onAction: (label: string, result: string | void) => void; done: string[] }) {
  const total = (reply.steps?.length ?? 0) + 1
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= total) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 650 : 420)
    return () => window.clearTimeout(t)
  }, [shown, total])
  const stepsShown = Math.min(shown, reply.steps?.length ?? 0)
  const textShown = shown >= total
  return (
    <div className="space-y-2">
      {shown === 0 && (
        <div className="flex gap-1 py-1" aria-label="Thinking">
          {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint" style={{ animationDelay: `${i * 120}ms` }} />)}
        </div>
      )}
      {reply.steps && stepsShown > 0 && (
        <ol className="space-y-1">
          {reply.steps.slice(0, stepsShown).map((s, i) => (
            <li key={i} className="flex animate-rise items-start gap-2 text-[12.5px] text-muted">
              <span className="mt-0.5 inline-grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-green text-surface"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
              {s.label}
            </li>
          ))}
        </ol>
      )}
      {textShown && (
        <div className="animate-rise space-y-2">
          <p className="leading-relaxed">{reply.text}</p>
          {reply.bullets && reply.bullets.length > 0 && (
            <ul className="space-y-1">
              {reply.bullets.map((b, i) => <li key={i} className="flex gap-2 text-[13px] leading-snug"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-faint" />{b}</li>)}
            </ul>
          )}
          {reply.actions && reply.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {reply.actions.map((a, i) => (
                <Button key={a.label} size="xs" variant={done.includes(a.label) ? 'quiet' : i === 0 ? 'primary' : 'secondary'} disabled={done.includes(a.label)} onClick={() => onAction(a.label, a.run())}>
                  {done.includes(a.label) ? <><Check className="h-3 w-3" />Done</> : a.label}
                </Button>
              ))}
            </div>
          )}
          {reply.sources && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {reply.sources.map((s) => <span key={s} className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-muted">{s}</span>)}
            </div>
          )}
          {reply.note && (
            <p className="flex items-start gap-1.5 text-xs text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />{reply.note}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function AssistantPanel({ viewer, compact, onHuman }: { viewer: string; compact?: boolean; onHuman?: () => void }) {
  const msgs = useChats((s) => s.chats[viewer] ?? EMPTY)
  const push = useChats((s) => s.push)
  const patch = useChats((s) => s.patch)
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const sugg = suggestionsFor(viewer)
  const p = people[viewer]

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs.length])

  const chips = sugg.map((q, i) => (
            <motion.button
              key={q}
              type="button"
              onClick={() => { ask(q); sfx('pop') }}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.92 }}
              transition={{ ...springs.bouncy, delay: i * 0.04 }}
              className="rounded-full border border-accent/15 bg-accent-soft px-2.5 py-1 text-left text-xs font-medium text-accent"
            >
              {q}
            </motion.button>
          ))

  function ask(q: string) {
    if (!q.trim()) return
    push(viewer, { id: ++seq, role: 'user', text: q })
    const reply = respond(viewer, q)
    push(viewer, { id: ++seq, role: 'assistant', text: reply.text, reply, done: [] })
    setText('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {msgs.length === 0 && (
          <motion.div initial={{ y: 12, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={springs.bouncy} className="space-y-2 rounded-[20px] border border-accent/20 bg-gradient-to-br from-accent-soft to-surface px-3.5 py-4 text-[13px]">
            {compact && <div className="flex items-center gap-2 font-display text-[15px] font-bold"><Emoji name="sparkles" size={26} float />Ask Day One</div>}
            <p className={cn('text-muted', !compact && 'flex gap-2.5')}>
              {!compact && <Emoji name="sparkles" size={26} float className="shrink-0" />}
              <span>
              {p?.role === 'hire'
                ? 'Answers come from Northbeam’s onboarding content and your own status. I can also do a few things for you, like changing where your laptop goes.'
                : 'Answers use only what you’re allowed to see. Anything consequential, like a date change, still needs a person to confirm.'}
              </span>
            </p>
            <ReqTag ids="E8 E9 T8" />
          </motion.div>
        )}
        {msgs.length === 0 && (
          <div className="space-y-2 pt-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Try asking</span>
            <div className="flex flex-wrap gap-1.5">{chips}</div>
          </div>
        )}
        {msgs.map((m) =>
          m.role === 'user' ? (
            <motion.div key={m.id} initial={{ x: 30, y: 10, opacity: 0, scale: 0.9 }} animate={{ x: 0, y: 0, opacity: 1, scale: 1 }} transition={springs.bouncy} style={{ originX: 1, originY: 1 }} className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-md btn-gradient px-3 py-2 text-[13px] text-white shadow-glow">{m.text}</motion.div>
          ) : (
            <motion.div key={m.id} initial={{ x: -20, y: 10, opacity: 0, scale: 0.94 }} animate={{ x: 0, y: 0, opacity: 1, scale: 1 }} transition={{ ...springs.bouncy, delay: 0.15 }} style={{ originX: 0, originY: 1 }} className="max-w-[92%] rounded-[18px] rounded-bl-md border border-line bg-surface px-3 py-2.5 text-[13px] shadow-card">
              <Reveal
                reply={m.reply!}
                done={m.done ?? []}
                onAction={(label, result) => {
                  patch(viewer, m.id, { done: [...(m.done ?? []), label] })
                  if (typeof result === 'string') push(viewer, { id: ++seq, role: 'assistant', text: result, reply: { text: result }, done: [] })
                }}
              />
            </motion.div>
          ),
        )}
        <div ref={end} />
      </div>
      <div className="space-y-2 border-t border-line bg-surface/90 px-3 pb-3 pt-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{msgs.length ? 'Try asking' : ''}</span>
          <Tooltip content={`Scripted answers in this demo. ${workersAI.label}: built, switched off.`}>
            <span className="inline-flex items-center gap-1 text-[10px] text-faint"><Info className="h-3 w-3" />Demo answers</span>
          </Tooltip>
        </div>
        {msgs.length > 0 && <div className="scroll-thin -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [&>*]:shrink-0 [&>*]:whitespace-nowrap">{chips}</div>}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            ask(text)
          }}
        >
          <input
            aria-label="Ask a question"
            className="h-10 min-w-0 flex-1 rounded-full border border-line bg-bg px-4 text-[13px] placeholder:text-faint focus:border-accent focus:outline-none"
            placeholder={p?.role === 'hire' ? 'Ask anything about starting at Northbeam' : 'Ask about your hires'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }} transition={springs.bouncy} type="submit" aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full btn-gradient text-white shadow-glow disabled:opacity-40 disabled:shadow-none" disabled={!text.trim()}>
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        </form>
        {onHuman && (
          <button type="button" onClick={onHuman} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink">
            <UserRound className="h-3.5 w-3.5" />Talk to a person instead
          </button>
        )}
      </div>
    </div>
  )
}

export function AssistantAvatar() {
  return <Avatar refObj={{ kind: 'system', id: 'dayone', name: 'Day One', short: 'D1' }} size={24} />
}
