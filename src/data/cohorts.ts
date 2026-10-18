export interface RunItem {
  time: string
  title: string
  who: string
  confirmed: boolean
}

export interface Session {
  id: string
  day: number
  group: string
  title: string
  time: string
  where: string
  seats: number
  host: string
  invitesSent: number | null
  run: RunItem[]
}

const remoteRun: RunItem[] = [
  { time: '9:00', title: 'Welcome to Northbeam', who: 'Pepper Potts', confirmed: true },
  { time: '9:30', title: 'Get set up', who: 'Shuri', confirmed: true },
  { time: '10:30', title: 'Benefits, explained', who: 'Total Rewards team', confirmed: false },
  { time: '11:30', title: 'Meet your buddy', who: 'Buddies', confirmed: true },
  { time: '12:00', title: 'Questions with the onboarding team', who: 'Maria Hill', confirmed: true },
]
const officeRun: RunItem[] = [
  { time: '9:00', title: 'Breakfast and badges', who: 'Luke Cage', confirmed: true },
  { time: '9:30', title: 'Welcome to Northbeam', who: 'Pepper Potts (video)', confirmed: true },
  { time: '10:00', title: 'Get set up', who: 'Felicity Smoak', confirmed: true },
  { time: '11:00', title: 'Office tour', who: 'Luke Cage', confirmed: true },
  { time: '11:30', title: 'Questions with the onboarding team', who: 'Alfred Pennyworth', confirmed: false },
]

export const SESSIONS: Session[] = [
  { id: 's1', day: 28, group: 'Remote, Americas', title: 'Orientation', time: '9:00 am–12:30 pm PT', where: 'Video call', seats: 12, host: 'maria', invitesSent: 14, run: remoteRun },
  { id: 's2', day: 28, group: 'New York office', title: 'Orientation', time: '9:00 am–12:00 pm ET', where: 'Hudson room, 12th floor', seats: 20, host: 'alfred', invitesSent: 14, run: officeRun },
  { id: 's3', day: 28, group: 'Chicago office', title: 'Orientation', time: '9:00 am–12:00 pm CT', where: 'Lakeview room', seats: 10, host: 'alfred', invitesSent: 14, run: officeRun },
  { id: 's4', day: 35, group: 'Remote, Americas', title: 'Orientation', time: '9:00 am–12:30 pm PT', where: 'Video call', seats: 12, host: 'maria', invitesSent: null, run: remoteRun },
  { id: 's5', day: 35, group: 'New York office', title: 'Orientation', time: '9:00 am–12:00 pm ET', where: 'Hudson room, 12th floor', seats: 20, host: 'alfred', invitesSent: null, run: officeRun },
  { id: 's6', day: 35, group: 'Lisbon office', title: 'Orientation', time: '9:30 am–12:30 pm WET', where: 'Tejo room', seats: 8, host: 'maria', invitesSent: null, run: officeRun },
  { id: 's7', day: 56, group: 'Lisbon office', title: 'Orientation', time: '9:30 am–12:30 pm WET', where: 'Tejo room', seats: 8, host: 'maria', invitesSent: null, run: officeRun },
]

/** Headcount plan by start week, used by the capacity forecast. Includes the hires in the demo. */
export const PLANNED_STARTS: { day: number; planned: number; seats: number }[] = [
  { day: 28, planned: 9, seats: 42 },
  { day: 35, planned: 14, seats: 40 },
  { day: 42, planned: 23, seats: 20 },
  { day: 49, planned: 5, seats: 0 },
  { day: 56, planned: 11, seats: 28 },
]

/** Extra people starting alongside the demo cast, so sessions look realistic. */
export const EXTRA_ATTENDEES: Record<string, number> = { s1: 4, s2: 2, s3: 1, s4: 3, s5: 6, s6: 2, s7: 3 }

export function groupFor(h: { mode: string; location: string }): string {
  if (h.mode === 'remote') return 'Remote, Americas'
  return h.location
}
