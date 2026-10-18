import type { ProviderId, TeamId } from './people'
import type { HireBase } from './hires'

export type Area = 'employment' | 'tools' | 'arrival' | 'prep' | 'ramp'
export type SystemId = 'greenhouse' | 'workday' | 'checkr' | 'firstbase' | 'google' | 'dayone' | 'benefits' | 'immigration' | 'calendar' | 'badge'

export type Owner =
  | { type: 'hire' }
  | { type: 'manager' }
  | { type: 'recruiter' }
  | { type: 'team'; team: TeamId }
  | { type: 'provider'; id: ProviderId }

/** sla: business days after the step opens. rel: days relative to the start date (negative = before). */
export type Due = { sla: number } | { rel: number }

/**
 * How a step turns green once it's done:
 * system  – the source system confirms it (in a connected setup)
 * owner   – the owner's own mark counts as confirmation
 * instant – it happens inside Day One, so done is confirmed
 * manager – the hire does it and the manager confirms
 */
export type Confirm = 'system' | 'owner' | 'instant' | 'manager'

export interface StepDef {
  key: string
  name: string
  stage: number
  area: Area
  owner: Owner
  system: SystemId
  deps?: string[]
  /** Window opens this many days relative to the start date (e.g. -21), once deps are green. */
  opens?: number
  due: Due
  confirm: Confirm
  critical?: boolean
  gate?: boolean
  sensitive?: 'screening' | 'immigration'
  when?: (h: HireBase & { withdrawn: number | null }) => boolean
  rename?: (h: HireBase) => string | undefined
  /** Typical business days from opening to done, and from done to confirmed. */
  typ?: number
  lag?: number
  hire?: { label: string; help?: string; minutes?: number; cta?: string }
  /** What managers and others without detail access see. */
  safe?: { open: string; done: string }
  reqs?: string[]
  cancel?: boolean
}

export const STAGES = ['Offer', 'Set-up', 'Clearances', 'Equipment and access', 'Final week', 'Day one', 'First 90 days']
export const STAGE_SHORT = ['Offer', 'Set-up', 'Clear', 'Equip', 'Final', 'Day 1', '90d']

export const AREAS: { id: Exclude<Area, 'ramp'>; label: string; short: string }[] = [
  { id: 'employment', label: 'Employment', short: 'Employ.' },
  { id: 'tools', label: 'Tools and access', short: 'Tools' },
  { id: 'arrival', label: 'Arrival', short: 'Arrival' },
  { id: 'prep', label: 'Manager prep', short: 'Prep' },
]

const office = (h: HireBase) => h.mode === 'office'
const us = (h: HireBase) => h.country === 'US'

export const STEPS: StepDef[] = [
  // Stage 0 — Offer
  { key: 'offer', name: 'Offer accepted', stage: 0, area: 'employment', owner: { type: 'recruiter' }, system: 'greenhouse', due: { sla: 0 }, confirm: 'system', typ: 0, lag: 0, reqs: ['O1'] },

  // Stage 1 — Set-up (runs in parallel)
  { key: 'wd_prehire', name: 'Pre-hire record created', stage: 1, area: 'employment', owner: { type: 'team', team: 'hris' }, system: 'workday', deps: ['offer'], due: { sla: 1 }, confirm: 'system', typ: 0, lag: 0, reqs: ['T4'] },
  { key: 'details', name: 'Confirm your details', stage: 1, area: 'employment', owner: { type: 'hire' }, system: 'dayone', deps: ['offer'], due: { sla: 3 }, confirm: 'instant', typ: 1,
    hire: { label: 'Confirm your details', help: 'We filled in what we already know. Check it once and we reuse it everywhere.', minutes: 4, cta: 'Review details' }, reqs: ['E4'] },
  { key: 'laptop_choice', name: 'Choose a laptop', stage: 1, area: 'tools', owner: { type: 'hire' }, system: 'dayone', deps: ['offer'], due: { sla: 4 }, confirm: 'instant', typ: 1,
    when: (h) => !h.rehire,
    hire: { label: 'Choose your laptop', help: 'Pick a model and where it should be delivered.', minutes: 3, cta: 'Choose laptop' }, reqs: ['E6'] },
  { key: 'bg_order', name: 'Background check ordered', stage: 1, area: 'employment', owner: { type: 'team', team: 'screening' }, system: 'checkr', deps: ['offer'], due: { sla: 1 }, confirm: 'system', typ: 0, lag: 0, sensitive: 'screening',
    safe: { open: 'Background check being set up', done: 'Background check started' } },
  { key: 'consent', name: 'Background check consent', stage: 1, area: 'employment', owner: { type: 'hire' }, system: 'checkr', deps: ['bg_order'], due: { sla: 3 }, confirm: 'system', typ: 1, lag: 0, sensitive: 'screening',
    hire: { label: 'Give consent for your background check', help: 'Opens Checkr in a new tab. Your answers stay with Checkr.', minutes: 10, cta: 'Open Checkr' },
    safe: { open: 'Waiting on the hire to give consent', done: 'Consent given' } },
  { key: 'mobility_review', name: 'Work authorization review', stage: 1, area: 'employment', owner: { type: 'team', team: 'mobility' }, system: 'dayone', deps: ['offer'], due: { sla: 2 }, confirm: 'owner', typ: 1, sensitive: 'immigration',
    safe: { open: 'Work authorization review', done: 'Work authorization reviewed' } },
  { key: 'cohort_seat', name: 'Orientation seat held', stage: 1, area: 'arrival', owner: { type: 'team', team: 'program' }, system: 'dayone', deps: ['offer'], due: { sla: 1 }, confirm: 'instant', typ: 0, reqs: ['O10'] },
  { key: 'wd_contacts', name: 'Add emergency contacts', stage: 1, area: 'employment', owner: { type: 'hire' }, system: 'workday', deps: ['wd_prehire'], due: { sla: 5 }, confirm: 'system', typ: 2, lag: 0,
    hire: { label: 'Add your emergency contacts', minutes: 3, cta: 'Open in Workday' } },
  { key: 'wd_id', name: 'Upload a copy of your ID', stage: 1, area: 'employment', owner: { type: 'hire' }, system: 'workday', deps: ['wd_prehire'], due: { sla: 7 }, confirm: 'system', typ: 3, lag: 2,
    hire: { label: 'Upload a copy of your passport or ID', help: 'The document stays in Workday. Day One never stores it.', minutes: 5, cta: 'Open in Workday' } },
  { key: 'wd_tax', name: 'Complete tax forms', stage: 1, area: 'employment', owner: { type: 'hire' }, system: 'workday', deps: ['wd_prehire'], due: { sla: 7 }, confirm: 'system', typ: 3, lag: 0, when: us,
    hire: { label: 'Complete your tax forms', minutes: 15, cta: 'Open in Workday' } },
  { key: 'wd_deposit', name: 'Set up direct deposit', stage: 1, area: 'employment', owner: { type: 'hire' }, system: 'workday', deps: ['wd_prehire'], opens: -21, due: { rel: -10 }, confirm: 'system', typ: 6, lag: 0,
    hire: { label: 'Set up direct deposit', minutes: 5, cta: 'Open in Workday' } },
  { key: 'buddy', name: 'Pick a buddy', stage: 1, area: 'prep', owner: { type: 'manager' }, system: 'dayone', deps: ['offer'], opens: -28, due: { rel: -14 }, confirm: 'instant', typ: 3, reqs: ['M2'] },
  { key: 'board_invite', name: 'Invite people to the welcome board', stage: 1, area: 'prep', owner: { type: 'manager' }, system: 'dayone', deps: ['offer'], opens: -21, due: { rel: -12 }, confirm: 'instant', typ: 2, reqs: ['E10', 'M2'] },
  { key: 'hello', name: 'Record a hello', stage: 1, area: 'prep', owner: { type: 'manager' }, system: 'dayone', deps: ['offer'], opens: -21, due: { rel: -8 }, confirm: 'instant', typ: 4, reqs: ['E10'] },

  // Stage 2 — Clearances
  { key: 'bg_complete', name: 'Background check complete', stage: 2, area: 'employment', owner: { type: 'provider', id: 'checkr' }, system: 'checkr', deps: ['consent'], due: { sla: 7 }, confirm: 'system', typ: 5, lag: 0, critical: true, sensitive: 'screening',
    hire: { label: 'Background check' }, safe: { open: 'Background check in progress', done: 'Background check complete' } },
  { key: 'clearance', name: 'Clearance recorded', stage: 2, area: 'employment', owner: { type: 'team', team: 'screening' }, system: 'dayone', deps: ['bg_complete'], due: { sla: 1 }, confirm: 'owner', typ: 0, critical: true, gate: true, sensitive: 'screening',
    safe: { open: 'Clearance in progress', done: 'Clearance complete' }, reqs: ['O9'] },
  { key: 'permit', name: 'Work permit approved', stage: 2, area: 'employment', owner: { type: 'provider', id: 'immigration' }, system: 'immigration', deps: ['mobility_review'], due: { rel: -8 }, confirm: 'system', typ: 20, lag: 0, critical: true, gate: true, sensitive: 'immigration',
    safe: { open: 'Work authorization in progress', done: 'Work authorization complete' } },

  // Stage 3 — Equipment and access
  { key: 'wd_hire', name: 'Hire record finalized', stage: 3, area: 'tools', owner: { type: 'team', team: 'hris' }, system: 'workday', deps: ['clearance', 'permit'], due: { sla: 2 }, confirm: 'system', typ: 1, lag: 0, critical: true },
  { key: 'account', name: 'Work account created', stage: 3, area: 'tools', owner: { type: 'team', team: 'it' }, system: 'google', deps: ['wd_hire'], due: { sla: 2 }, confirm: 'system', typ: 1, lag: 0, critical: true,
    rename: (h) => (h.rehire ? 'Work account restored' : undefined), hire: { label: 'Work account' } },
  { key: 'laptop_release', name: 'Laptop order released', stage: 3, area: 'tools', owner: { type: 'team', team: 'it' }, system: 'firstbase', deps: ['clearance', 'laptop_choice', 'details'], due: { sla: 1 }, confirm: 'system', typ: 1, lag: 0, critical: true,
    rename: (h) => (h.rehire ? 'Reissue returned laptop' : undefined), reqs: ['E6'] },
  { key: 'laptop_prep', name: 'Laptop prepared and enrolled', stage: 3, area: 'tools', owner: { type: 'provider', id: 'firstbase' }, system: 'firstbase', deps: ['laptop_release', 'account'], due: { sla: 3 }, confirm: 'system', typ: 2, lag: 0, critical: true },
  { key: 'laptop_ship', name: 'Laptop shipped', stage: 3, area: 'tools', owner: { type: 'provider', id: 'firstbase' }, system: 'firstbase', deps: ['laptop_prep'], due: { sla: 1 }, confirm: 'system', typ: 1, lag: 0, critical: true },
  { key: 'laptop_deliver', name: 'Laptop delivered', stage: 4, area: 'tools', owner: { type: 'provider', id: 'carrier' }, system: 'firstbase', deps: ['laptop_ship'], due: { sla: 3 }, confirm: 'system', typ: 3, lag: 0, critical: true,
    hire: { label: 'Laptop' } },
  { key: 'laptop_received', name: 'Confirm the laptop arrived', stage: 4, area: 'tools', owner: { type: 'hire' }, system: 'dayone', deps: ['laptop_deliver'], due: { sla: 2 }, confirm: 'instant', typ: 0,
    hire: { label: 'Confirm your laptop arrived', minutes: 1, cta: 'It arrived' } },
  { key: 'badge', name: 'Badge printed', stage: 3, area: 'arrival', owner: { type: 'team', team: 'workplace' }, system: 'badge', deps: ['clearance'], opens: -6, due: { rel: -2 }, confirm: 'owner', typ: 1, when: office },
  { key: 'orient_rsvp', name: 'Orientation invite accepted', stage: 3, area: 'arrival', owner: { type: 'hire' }, system: 'calendar', deps: ['cohort_seat'], opens: -14, due: { rel: -7 }, confirm: 'system', typ: 2, lag: 0,
    hire: { label: 'Accept your orientation invite', minutes: 1, cta: 'Open invite' } },
  { key: 'wd_conduct', name: 'Sign the code of conduct', stage: 4, area: 'employment', owner: { type: 'hire' }, system: 'workday', deps: ['wd_prehire'], opens: -7, due: { rel: -3 }, confirm: 'system', typ: 2, lag: 0,
    hire: { label: 'Sign the code of conduct', minutes: 10, cta: 'Open in Workday' } },
  { key: 'first_week', name: 'Build the first-week plan', stage: 4, area: 'prep', owner: { type: 'manager' }, system: 'dayone', deps: ['offer'], opens: -10, due: { rel: -3 }, confirm: 'instant', typ: 4, reqs: ['M5'] },
  { key: 'first_work', name: 'Choose a first piece of work', stage: 4, area: 'prep', owner: { type: 'manager' }, system: 'dayone', deps: ['offer'], opens: -10, due: { rel: -2 }, confirm: 'instant', typ: 5, reqs: ['M5'] },

  // Stage 5 — Day one
  { key: 'activate', name: 'Sign in with the work account', stage: 5, area: 'ramp', owner: { type: 'hire' }, system: 'google', deps: ['account'], opens: 0, due: { rel: 0 }, confirm: 'system', typ: 0, lag: 0,
    hire: { label: 'Sign in with your work account', minutes: 5 } },
  { key: 'orientation', name: 'Attend orientation', stage: 5, area: 'ramp', owner: { type: 'hire' }, system: 'calendar', deps: ['orient_rsvp'], opens: 0, due: { rel: 0 }, confirm: 'system', typ: 0, lag: 0,
    hire: { label: 'Attend orientation' } },
  { key: 'rtw', name: 'Employer right-to-work check', stage: 5, area: 'ramp', owner: { type: 'team', team: 'hris' }, system: 'workday', deps: ['wd_id'], opens: 0, due: { rel: 3 }, confirm: 'system', typ: 1, lag: 0, when: us },

  // Stage 6 — First 90 days
  { key: 'benefits', name: 'Choose benefits', stage: 6, area: 'ramp', owner: { type: 'hire' }, system: 'benefits', deps: ['activate'], opens: 0, due: { rel: 30 }, confirm: 'system', typ: 9, lag: 0,
    hire: { label: 'Choose your benefits', help: 'You have 30 days from your start date.', minutes: 20, cta: 'Open benefits site' } },
  { key: 'milestone', name: 'First contribution', stage: 6, area: 'ramp', owner: { type: 'hire' }, system: 'dayone', deps: ['activate'], opens: 0, due: { rel: 21 }, confirm: 'manager', typ: 9, lag: 1,
    rename: (h) => h.milestone, reqs: ['T10'] },
  { key: 'checkin30', name: '30-day check-in', stage: 6, area: 'ramp', owner: { type: 'manager' }, system: 'dayone', deps: ['activate'], opens: 25, due: { rel: 30 }, confirm: 'instant', typ: 2, reqs: ['M7'] },

  // Created only when a hire withdraws
  { key: 'cancel_laptop', name: 'Cancel the laptop order', stage: 3, area: 'tools', owner: { type: 'team', team: 'it' }, system: 'firstbase', due: { sla: 1 }, confirm: 'owner', typ: 1, cancel: true, when: (h) => h.withdrawn != null },
  { key: 'cancel_check', name: 'Cancel the background check', stage: 2, area: 'employment', owner: { type: 'team', team: 'screening' }, system: 'checkr', due: { sla: 1 }, confirm: 'owner', typ: 0, cancel: true, sensitive: 'screening', when: (h) => h.withdrawn != null },
]

export const STEP_BY_KEY: Record<string, StepDef> = Object.fromEntries(STEPS.map((s) => [s.key, s]))

export const systemNames: Record<SystemId, string> = {
  greenhouse: 'Greenhouse',
  workday: 'Workday',
  checkr: 'Checkr',
  firstbase: 'Firstbase',
  google: 'Google Workspace',
  dayone: 'Day One',
  benefits: 'Benefits site',
  immigration: 'Atlas Immigration',
  calendar: 'Calendar',
  badge: 'Badge desk',
}

export type Mode = 'connected' | 'linked' | 'manual' | 'native'
export type Setup = 'connected' | 'manual'

/** How each system is wired up in the two demo setups. */
export const SYSTEM_MODES: Record<Setup, Record<SystemId, Mode>> = {
  connected: {
    greenhouse: 'connected', workday: 'connected', checkr: 'connected', firstbase: 'connected', google: 'connected', calendar: 'connected',
    immigration: 'linked', benefits: 'linked', badge: 'manual', dayone: 'native',
  },
  manual: {
    greenhouse: 'linked', workday: 'linked', checkr: 'linked', firstbase: 'manual', google: 'manual', calendar: 'linked',
    immigration: 'manual', benefits: 'linked', badge: 'manual', dayone: 'native',
  },
}

/** Which team checks a linked system when there's no API to do it. */
export const SYSTEM_STEWARD: Record<SystemId, TeamId> = {
  greenhouse: 'recruiting', workday: 'hris', checkr: 'screening', firstbase: 'it', google: 'it', dayone: 'program',
  benefits: 'program', immigration: 'mobility', calendar: 'program', badge: 'workplace',
}
