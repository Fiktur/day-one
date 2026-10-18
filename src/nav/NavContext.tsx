import { createContext, useContext, type ReactNode } from 'react'
import { people, type Person } from '../data/people'
import { defaultRoute, type Route } from '../engine/store'

export interface Nav {
  viewer: string
  person: Person
  route: Route
  go: (r: Route) => void
  setViewer: (id: string) => void
  /** Rendered inside a split-view pane: tighter layout, no presenter-only chrome. */
  compact: boolean
}

const Ctx = createContext<Nav | null>(null)

export function NavProvider({ viewer, route, go, setViewer, compact, children }: Omit<Nav, 'person'> & { children: ReactNode }) {
  return <Ctx.Provider value={{ viewer, person: people[viewer], route, go, setViewer, compact }}>{children}</Ctx.Provider>
}

export function useNav(): Nav {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNav outside NavProvider')
  return v
}

export { defaultRoute }

/** Coordinators see everyone's yellow; everyone else sees yellow only on their own moves. */
export function isCoordinator(viewer: string): boolean {
  const r = people[viewer]?.role
  return r === 'program' || r === 'head'
}
