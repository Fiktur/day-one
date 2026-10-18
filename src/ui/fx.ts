import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useDemo } from '../engine/store'

type Origin = Element | { x: number; y: number } | null | undefined

function originOf(o: Origin): { x: number; y: number } {
  if (!o) return { x: 0.5, y: 0.4 }
  if ('getBoundingClientRect' in o) {
    const r = o.getBoundingClientRect()
    return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
  }
  return o
}

const BRAND = ['#3355FF', '#20ACFF', '#16A35C', '#FFC93C', '#FF7A59', '#7C4DFF']

/** Little celebrations for moments worth one: a task done, a gate opening, a board shared. */
export function burst(kind: 'small' | 'big' | 'hearts' | 'stars', from?: Origin) {
  const origin = originOf(from)
  const base = { origin, disableForReducedMotion: true, zIndex: 120, colors: BRAND }
  if (kind === 'small') {
    confetti({ ...base, particleCount: 40, spread: 60, startVelocity: 26, scalar: 0.8, ticks: 120 })
  } else if (kind === 'big') {
    confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 38, ticks: 200 })
    window.setTimeout(() => confetti({ ...base, particleCount: 50, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 160)
    window.setTimeout(() => confetti({ ...base, particleCount: 50, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 260)
  } else if (kind === 'hearts') {
    const heart = confetti.shapeFromText({ text: '💙', scalar: 2 })
    confetti({ ...base, shapes: [heart], scalar: 2, particleCount: 18, spread: 70, startVelocity: 22, ticks: 140, flat: true })
  } else {
    const star = confetti.shapeFromText({ text: '✨', scalar: 2 })
    confetti({ ...base, shapes: [star], scalar: 2, particleCount: 16, spread: 90, startVelocity: 24, ticks: 140, flat: true })
  }
  sfx(kind === 'small' ? 'pop' : 'chime')
}

let ctx: AudioContext | null = null

/** Tiny synthesized sounds. No audio files; off unless the presenter turns sound on. */
export function sfx(kind: 'pop' | 'chime' | 'tick' | 'whoosh') {
  if (!useDemo.getState().sound) return
  try {
    ctx = ctx ?? new AudioContext()
    const now = ctx.currentTime
    const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, now + start)
      g.gain.setValueAtTime(0.0001, now + start)
      g.gain.exponentialRampToValueAtTime(vol, now + start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      o.connect(g).connect(ctx!.destination)
      o.start(now + start)
      o.stop(now + start + dur + 0.02)
    }
    if (kind === 'pop') { tone(660, 0, 0.12, 'triangle'); tone(990, 0.05, 0.14, 'sine', 0.08) }
    if (kind === 'chime') { tone(784, 0, 0.35); tone(1047, 0.09, 0.4); tone(1319, 0.18, 0.5, 'sine', 0.09) }
    if (kind === 'tick') tone(1400, 0, 0.05, 'square', 0.03)
    if (kind === 'whoosh') { tone(320, 0, 0.25, 'sawtooth', 0.025); tone(180, 0.05, 0.25, 'sine', 0.05) }
  } catch {
    // Audio isn't available here; the demo works the same without it.
  }
}

/** Fire a celebration from an element when `when` flips from false to true (not on first render). */
export function useCelebrate<T extends Element>(when: boolean, kind: Parameters<typeof burst>[0] = 'stars') {
  const ref = useRef<T>(null)
  const was = useRef(when)
  useEffect(() => {
    if (when && !was.current) burst(kind, ref.current)
    was.current = when
  }, [when, kind])
  return ref
}
