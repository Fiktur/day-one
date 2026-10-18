export interface LogEntry {
  id: string
  day: number
  time: string
  system: string
  event: string
  subject?: string
  outcome: string
  tone: 'ok' | 'warn' | 'bad' | 'info'
}

let n = 0
export function entry(day: number, time: string, system: string, event: string, outcome: string, tone: LogEntry['tone'] = 'ok', subject?: string): LogEntry {
  n += 1
  return { id: `log${n}-${Math.random().toString(36).slice(2, 6)}`, day, time, system, event, subject, outcome, tone }
}

// Event times follow the demo clock (it's always just after 9:00 am), not the presenter's watch.
let tick = 9 * 3600 + 4 * 60 + 12
export function clockTime(): string {
  tick += 23 + Math.floor(Math.random() * 40)
  const h = Math.floor(tick / 3600)
  const m = Math.floor((tick % 3600) / 60)
  const sec = tick % 60
  return [h, m, sec].map((x) => String(x).padStart(2, '0')).join(':')
}
export function resetClockTime() {
  tick = 9 * 3600 + 4 * 60 + 12
}

export function seedLog(): LogEntry[] {
  return [
    entry(10, '09:02:14', 'workday', 'task.completed', 'Hal Jordan · direct deposit · confirmed', 'ok', 'Hal Jordan'),
    entry(10, '08:57:11', 'workday', 'task.completed', 'Virgil Hawkins · emergency contacts · already confirmed, no change', 'info', 'Virgil Hawkins'),
    entry(10, '08:51:40', 'google', 'user.created', 'hal.jordan@northbeam.example · work account created', 'ok', 'Hal Jordan'),
    entry(10, '08:44:03', 'firstbase', 'order.accepted', 'Hal Jordan · MacBook Pro 16" · order FB-20931', 'ok', 'Hal Jordan'),
    entry(10, '08:30:00', 'day one', 'forecast.run', '10 journeys checked · 2 at risk · 0 changes', 'info'),
    entry(10, '08:12:27', 'checkr', 'status.poll', '4 checks in progress · no changes', 'info'),
    entry(10, '07:58:09', 'greenhouse', 'offer.accepted', 'Peter Parker · journey already exists · ignored', 'info', 'Peter Parker'),
    entry(9, '16:20:51', 'workday', 'task.submitted', 'Virgil Hawkins · ID upload · waiting for review', 'info', 'Virgil Hawkins'),
    entry(9, '15:02:33', 'checkr', 'report.completed', 'Ted Kord · check complete (result stays in Checkr)', 'ok', 'Ted Kord'),
    entry(8, '11:41:00', 'greenhouse', 'offer.accepted', 'Peter Parker · journey created · 31 steps · 6 owners', 'ok', 'Peter Parker'),
  ]
}
