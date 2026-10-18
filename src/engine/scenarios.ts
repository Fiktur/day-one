import { toast } from 'sonner'
import { addBiz, fmtDay } from '../lib/dates'
import { clockTime, entry } from './log'
import { later, useDemo, type Pane } from './store'
import { selectViews } from './selectors'
import { burst } from '../ui/fx'

export interface Scenario {
  n: number
  title: string
  who: string
  blurb: string
  panes: [Pane, Pane, Pane]
  /** Which pane to show in single view. Defaults to the last (usually the program view). */
  focus?: 0 | 1 | 2
  run: () => void
}

const hhmm = () => clockTime()
const S = () => useDemo.getState()

export const SCENARIOS: Scenario[] = [
  {
    n: 1,
    title: 'Workday round trip',
    focus: 0,
    who: 'Virgil Hawkins',
    blurb: 'Virgil marks a Workday task done. It waits to be confirmed, then Workday confirms it and it turns green.',
    panes: [
      { viewer: 'virgil', route: { name: 'tasks' } },
      { viewer: 'barbara', route: { name: 'systems' } },
      { viewer: 'maria', route: { name: 'hire', hireId: 'virgil' } },
    ],
    run: () => {
      S().markDone('virgil', 'wd_deposit', 'virgil')
      toast('Virgil marked “Set up direct deposit” done', { description: 'Waiting for Workday to confirm it' })
      later(2600, () => {
        const s = S()
        s.confirmStep('virgil', 'wd_id', 'Workday')
        s.addLog(entry(s.now, hhmm(), 'workday', 'task.reviewed', 'Virgil Hawkins · ID upload · accepted', 'ok', 'Virgil Hawkins'))
        burst('small', { x: 0.13, y: 0.5 })
      })
    },
  },
  {
    n: 2,
    title: 'Clearance opens the gate',
    who: 'Virgil Hawkins',
    blurb: "Checkr finishes Virgil's check and Screening records clearance. The laptop order and hire record unlock for IT and People Systems.",
    panes: [
      { viewer: 'virgil', route: { name: 'home' } },
      { viewer: 'tony', route: { name: 'myhires' } },
      { viewer: 'shuri', route: { name: 'queue' } },
    ],
    run: () => {
      const s = S()
      if (selectViews(s).virgil.by.clearance.state === 'verified') {
        toast("Virgil's clearance is already recorded", { description: 'Press Shift+R to reset the demo and run it again.' })
        return
      }
      s.set({ forced: [...s.forced, { hire: 'virgil', key: 'bg_complete', type: 'done', day: s.now, by: 'Checkr' }, { hire: 'virgil', key: 'bg_complete', type: 'ver', day: s.now, by: 'Checkr' }] })
      s.flash('virgil:bg_complete')
      s.addLog(entry(s.now, hhmm(), 'checkr', 'report.completed', 'Virgil Hawkins · check complete (result stays in Checkr)', 'ok', 'Virgil Hawkins'))
      toast('Checkr finished Virgil’s background check', { description: 'Jennifer Walters can now record clearance' })
      later(1900, () => {
        S().markDone('virgil', 'clearance', 'jennifer')
        S().flash('virgil:laptop_release', 'virgil:wd_hire')
        S().addLog(entry(S().now, hhmm(), 'day one', 'gate.opened', 'Virgil Hawkins · clearance → laptop order (IT), hire record (People Systems)', 'ok', 'Virgil Hawkins'))
        toast.success('Gate opened: two teams can start', { description: 'IT: release laptop order · People Systems: finalize hire record' })
        burst('stars')
      })
    },
  },
  {
    n: 3,
    title: 'Laptop backordered',
    who: 'Hal Jordan',
    blurb: "Firstbase reports Hal's laptop is backordered. Day One forecasts that his start date is now at risk and suggests fixes.",
    panes: [
      { viewer: 'hal', route: { name: 'home' } },
      { viewer: 'carol', route: { name: 'hire', hireId: 'hal' } },
      { viewer: 'maria', route: { name: 'hire', hireId: 'hal' } },
    ],
    run: () => {
      const s = S()
      const eta = addBiz(s.now, 9)
      s.delay('hal', 'laptop_prep', eta)
      s.addLog(entry(s.now, hhmm(), 'firstbase', 'order.backordered', `Hal Jordan · MacBook Pro 16" · available ${fmtDay(eta)}`, 'warn', 'Hal Jordan'))
      s.addLog(entry(s.now, hhmm(), 'day one', 'forecast.changed', 'Hal Jordan · laptop now expected after the start date · at risk', 'bad', 'Hal Jordan'))
      toast.error('Early warning: Hal Jordan’s start date is at risk', { description: `Laptop now available ${fmtDay(eta)}. Three fixes suggested.` })
    },
  },
  {
    n: 4,
    title: 'Start date moves',
    who: 'Wanda Maximoff',
    blurb: "Wanda's work permit won't arrive in time. Maria previews the impact of moving her start to Nov 30, then confirms.",
    panes: [
      { viewer: 'wanda', route: { name: 'home' } },
      { viewer: 'kate', route: { name: 'candidates' } },
      { viewer: 'maria', route: { name: 'messages', hireId: 'wanda' } },
    ],
    run: () => {
      S().setDialog({ type: 'changeDate', hireId: 'wanda', to: 56 })
    },
  },
  {
    n: 5,
    title: 'Checkr goes down',
    who: 'Matt Murdock and others',
    blurb: 'Checkr stops responding. Every check it owns shows “can’t check right now”, never green. Press again to restore it.',
    panes: [
      { viewer: 'franklin', route: { name: 'myhires' } },
      { viewer: 'barbara', route: { name: 'systems' } },
      { viewer: 'maria', route: { name: 'command' } },
    ],
    run: () => {
      const s = S()
      const wasDown = s.down.checkr != null
      s.toggleDown('checkr')
      if (wasDown) {
        s.addLog(entry(s.now, hhmm(), 'checkr', 'connection.restored', 'Statuses refreshed for 3 hires', 'ok'))
        toast.success('Checkr is back', { description: 'Statuses refreshed. Nothing was lost.' })
        burst('small')
      } else {
        s.addLog(entry(s.now, hhmm(), 'checkr', 'status.poll', 'Timed out after 30 s · retrying every 5 min · 3 steps marked can’t check', 'bad'))
        toast.error('Checkr isn’t responding', { description: 'Affected checks now show “can’t check right now”, never green.' })
      }
    },
  },
  {
    n: 6,
    title: 'Duplicate offer event',
    focus: 1,
    who: 'Peter Parker',
    blurb: 'Greenhouse sends Peter’s offer-accepted event again. Day One recognises it and creates nothing new.',
    panes: [
      { viewer: 'peter', route: { name: 'home' } },
      { viewer: 'barbara', route: { name: 'systems', tab: 'log' } },
      { viewer: 'maria', route: { name: 'hire', hireId: 'peter', tab: 'activity' } },
    ],
    run: () => {
      const s = S()
      s.addLog(
        entry(s.now, hhmm(), 'greenhouse', 'offer.accepted', 'Peter Parker · duplicate of event gh_88213 · ignored · 0 new requests', 'info', 'Peter Parker'),
      )
      s.flash('log:top')
      toast('Greenhouse sent Peter Parker’s offer again', { description: 'Recognised as a duplicate: still one journey, no new requests to Checkr, Workday or Firstbase.' })
    },
  },
  {
    n: 7,
    title: 'Hire withdraws',
    who: 'Wade Wilson',
    blurb: 'Wade withdraws. Scheduled messages stop, open steps close, and owners get the cancellations they need to do.',
    panes: [
      { viewer: 'logan', route: { name: 'myhires' } },
      { viewer: 'shuri', route: { name: 'queue' } },
      { viewer: 'maria', route: { name: 'messages', hireId: 'wade' } },
    ],
    run: () => {
      const s = S()
      if (s.hires.wade.withdrawn != null) return
      s.withdraw('wade')
      toast('Wade Wilson withdrew his acceptance', { description: 'Scheduled messages stopped. IT and Screening each got one cancellation to do.' })
    },
  },
  {
    n: 8,
    title: 'Manager on leave',
    focus: 0,
    who: 'Ted Kord',
    blurb: "Bruce Wayne is out of office and Ted's prep is slipping. Lucius Fox takes over Bruce's tasks.",
    panes: [
      { viewer: 'lucius', route: { name: 'myhires' } },
      { viewer: 'ted', route: { name: 'home' } },
      { viewer: 'maria', route: { name: 'hire', hireId: 'ted' } },
    ],
    run: () => {
      const s = S()
      s.delegate('bruce', 'lucius')
      s.flash('ted:buddy', 'ted:board_invite', 'ted:hello')
      toast.success('Lucius Fox is covering for Bruce Wayne', { description: "Ted Kord's 3 prep tasks moved to Lucius until Nov 13." })
    },
  },
]

export function runScenario(n: number) {
  const sc = SCENARIOS.find((x) => x.n === n)
  if (!sc) return
  const s = S()
  toast.dismiss()
  if (s.split) s.setPanes(sc.panes)
  else s.set({ main: { ...sc.panes[sc.focus ?? 2] } })
  s.set({ lastScenario: n, scenarioRun: s.scenarioRun + 1 })
  sc.run()
}
