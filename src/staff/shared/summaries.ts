import { safeName, type AreaView, type HireView } from '../../engine/derive'
import { lc } from '../../lib/cn'
import { fmtDay, fmtShort, rel } from '../../lib/dates'

/** One-line, privacy-safe summary of each readiness area, for managers and recruiters. */
export function areaSummary(v: HireView, a: AreaView, now: number): string {
  if (v.status === 'withdrawn') return a.done ? `Stopped at ${a.done} of ${a.total} done when the offer was withdrawn.` : 'Stopped when the offer was withdrawn.'
  // A red area leads with the step that made it red, so "Clearance complete" never sits alone on a red card.
  const red = v.steps.find((s) => s.def.area === a.id && s.red)
  return `${red ? `${safeName(red, { role: 'manager' }, { action: true })}: ${lc(red.label)}. ` : ''}${areaDetail(v, a, now)}`
}

function areaDetail(v: HireView, a: AreaView, now: number): string {
  const b = v.by
  switch (a.id) {
    case 'employment': {
      if (b.permit && b.permit.state !== 'na' && b.permit.state !== 'verified') return `Work authorization in progress${b.permit.eta ? `, expected ${fmtShort(b.permit.eta)}` : ''}.`
      if (b.bg_complete?.state === 'unknown') return "Background check: can't check right now."
      if (b.clearance?.state === 'verified') return 'Clearance complete. Details stay with Background screening.'
      if (b.consent && b.consent.state !== 'verified') return 'Waiting on the hire to give background check consent.'
      return 'Background check in progress.'
    }
    case 'tools': {
      if (b.laptop_received?.state === 'verified') return 'Laptop arrived. Account ready.'
      if (b.laptop_deliver?.state === 'verified') return `Laptop delivered ${fmtShort(b.laptop_deliver.ver!)}.`
      if (b.laptop_prep?.eta != null && b.laptop_prep.state !== 'verified') return `Laptop delayed · expected ${fmtShort(b.laptop_prep.eta)}.`
      if (b.laptop_ship?.state === 'verified') return `Laptop shipped, arrives ${rel(b.laptop_deliver?.ver ?? now + 2, now)}.`
      if (b.laptop_release && b.laptop_release.state !== 'blank') return `Laptop being prepared${b.laptop_deliver?.ver ? `, arrives around ${fmtShort(b.laptop_deliver.ver)}${b.laptop_deliver.ver >= v.hire.start ? ', after the start date' : ''}` : ''}.`
      return 'Laptop and accounts start after clearance.'
    }
    case 'arrival': {
      const rsvp = b.orient_rsvp
      if (rsvp?.state === 'verified') return `${v.hire.mode === 'remote' ? 'Remote start' : v.hire.location}. Orientation accepted.`
      return `${v.hire.mode === 'remote' ? 'Remote start' : v.hire.location}. Orientation seat held${rsvp?.open ? `, invite ${rsvp.open > now ? `goes out ${fmtShort(rsvp.open)}` : 'sent'}` : ''}.`
    }
    case 'prep':
      return `${a.done} of ${a.total} done.`
  }
}

export function startLine(v: HireView, now: number): string {
  const d = v.hire.start - now
  if (v.status === 'withdrawn') return 'Withdrawn'
  if (d < 0) return `Started ${fmtDay(v.hire.start)}`
  if (d === 0) return 'Starts today'
  return `Starts ${fmtDay(v.hire.start)} · ${d} day${d === 1 ? '' : 's'}`
}
