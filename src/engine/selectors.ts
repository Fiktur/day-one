import { useMemo } from 'react'
import { HIRES } from '../data/hires'
import { deriveHire, type DeriveCtx, type HireView } from './derive'
import type { HireState } from './simulate'
import { useDemo, type DemoState } from './store'

let cache: { key: unknown[]; value: Record<string, HireView> } | null = null

export function ctxOf(s: DemoState): DeriveCtx {
  return { now: s.now, setup: s.setup, down: s.down, ooo: s.ooo, forced: s.forced }
}

export function hireState(s: Pick<DemoState, 'hires' | 'buddies'>, id: string): HireState {
  const base = HIRES.find((h) => h.id === id)!
  const mut = s.hires[id]
  return { ...base, buddyId: s.buddies[id] ?? base.buddyId, start: mut.start, originalStart: mut.originalStart, withdrawn: mut.withdrawn }
}

/** Every hire's derived view, recomputed only when the inputs change. */
export function selectViews(s: DemoState): Record<string, HireView> {
  const key = [s.now, s.setup, s.down, s.forced, s.hires, s.ooo, s.buddies]
  if (cache && key.every((k, i) => k === cache!.key[i])) return cache.value
  const ctx = ctxOf(s)
  const value: Record<string, HireView> = {}
  for (const h of HIRES) value[h.id] = deriveHire(hireState(s, h.id), ctx)
  cache = { key, value }
  return value
}

export const useViews = () => useDemo(selectViews)
export const useView = (id: string) => useDemo((s) => selectViews(s)[id])
export const useNow = () => useDemo((s) => s.now)
export const useFlash = (key: string) => useDemo((s) => key in s.flashes)

/** Hires that haven't started yet, plus recent starters, in start-date order. */
export function orderedHires(views: Record<string, HireView>): HireView[] {
  const rank: Record<string, number> = { atrisk: 0, unknown: 1, behind: 2, ontrack: 3, ready: 4, started: 5, withdrawn: 6 }
  return Object.values(views).sort((a, b) => rank[a.status] - rank[b.status] || a.hire.start - b.hire.start || a.person.name.localeCompare(b.person.name))
}

/** The derive context as a stable object, safe to use as a hook dependency. */
export function useCtx(): DeriveCtx {
  const now = useDemo((s) => s.now)
  const setup = useDemo((s) => s.setup)
  const down = useDemo((s) => s.down)
  const ooo = useDemo((s) => s.ooo)
  const forced = useDemo((s) => s.forced)
  return useMemo(() => ({ now, setup, down, ooo, forced }), [now, setup, down, ooo, forced])
}
