// Ten fictional hires. Day numbers count from Mon Oct 5, 2026 (day 0). Today in the demo is day 10.

export interface Override {
  /** Business days from open to done, if different from the step's typical time. */
  typ?: number
  /** Business days from done to confirmed. */
  lag?: number
  /** Projection never completes it (someone is waiting on a decision). */
  never?: boolean
  /** Fixed days for history that's already happened. */
  doneAt?: number
  verAt?: number
  /** A provider has given a later date than planned. */
  eta?: number
  na?: string
  by?: string
  note?: string
}

export interface HireBase {
  id: string
  title: string
  dept: string
  managerId: string
  recruiterId: string
  buddyId?: string
  location: string
  mode: 'remote' | 'office'
  country: 'US' | 'PT'
  tz: string
  offer: number
  start: number
  needsWorkAuth?: boolean
  rehire?: boolean
  milestone: string
  boardTemplate: string
  laptop: { model: string; address: string }
  mobilityNote: string
  overrides: Record<string, Override>
}

export const HIRES: HireBase[] = [
  {
    id: 'virgil', title: 'Network Engineer', dept: 'Network Engineering', managerId: 'tony', recruiterId: 'kate', buddyId: 'jaime',
    location: 'Remote, Chicago', mode: 'remote', country: 'US', tz: 'Central time', offer: 0, start: 28,
    milestone: 'First reviewed network change', boardTemplate: 'network',
    laptop: { model: 'MacBook Pro 14"', address: '22 Grant Ave, Chicago, IL' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: {
      consent: { doneAt: 3 },
      wd_id: { doneAt: 9, lag: 2 },
      bg_complete: { doneAt: 14 },
      buddy: { doneAt: 4 },
      board_invite: { doneAt: 8 },
      hello: { doneAt: 9 },
    },
  },
  {
    id: 'hal', title: 'Field Solutions Engineer', dept: 'Solutions Engineering', managerId: 'carol', recruiterId: 'kate', buddyId: 'ryan',
    location: 'Remote, San Diego', mode: 'remote', country: 'US', tz: 'Pacific time', offer: 0, start: 28,
    milestone: 'First customer demo, supervised', boardTemplate: 'default',
    laptop: { model: 'MacBook Pro 16"', address: '410 Ferris Way, San Diego, CA' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: {
      consent: { doneAt: 1 },
      wd_deposit: { doneAt: 8 },
      wd_id: { doneAt: 3 },
      wd_contacts: { never: true },
      buddy: { doneAt: 3 },
      board_invite: { doneAt: 8 },
      hello: { doneAt: 9 },
    },
  },
  {
    id: 'wanda', title: 'Product Designer', dept: 'Design', managerId: 'diana', recruiterId: 'kate', buddyId: 'kitty',
    location: 'Lisbon office', mode: 'office', country: 'PT', tz: 'Lisbon time', offer: 1, start: 35, needsWorkAuth: true,
    milestone: 'First design shipped to customers', boardTemplate: 'default',
    laptop: { model: 'MacBook Pro 14"', address: 'Northbeam Lisbon, Av. da Liberdade 110' },
    mobilityNote: 'Needed: non-EU citizen, Portugal role',
    overrides: {
      consent: { doneAt: 3 },
      permit: { eta: 44 },
      laptop_deliver: { typ: 1 },
      buddy: { doneAt: 6 },
    },
  },
  {
    id: 'matt', title: 'Legal Counsel', dept: 'Legal', managerId: 'franklin', recruiterId: 'kate', buddyId: 'foggy',
    location: 'New York office', mode: 'office', country: 'US', tz: 'Eastern time', offer: 4, start: 28,
    milestone: 'First contract review, supervised', boardTemplate: 'default',
    laptop: { model: 'MacBook Air 15"', address: 'Northbeam New York, 85 Broad St' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: { consent: { doneAt: 7 } },
  },
  {
    id: 'peter', title: 'Junior Software Engineer', dept: 'Platform Engineering', managerId: 'tony', recruiterId: 'kate', buddyId: 'miles',
    location: 'New York office', mode: 'office', country: 'US', tz: 'Eastern time', offer: 8, start: 35,
    milestone: 'First reviewed code change', boardTemplate: 'platform',
    laptop: { model: 'MacBook Pro 14"', address: 'Northbeam New York, 85 Broad St' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: { consent: { doneAt: 14 } },
  },
  {
    id: 'wade', title: 'Account Executive', dept: 'Sales, West', managerId: 'logan', recruiterId: 'kate', buddyId: 'oliver',
    location: 'Remote, Denver', mode: 'remote', country: 'US', tz: 'Mountain time', offer: 7, start: 35,
    milestone: 'First customer call, supervised', boardTemplate: 'default',
    laptop: { model: 'MacBook Air 15"', address: '9 Larimer Sq, Denver, CO' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: { consent: { doneAt: 8 } },
  },
  {
    id: 'ted', title: 'Hardware Engineer', dept: 'Hardware Lab', managerId: 'bruce', recruiterId: 'kate', buddyId: 'jane',
    location: 'Chicago office', mode: 'office', country: 'US', tz: 'Central time', offer: 2, start: 28, rehire: true,
    milestone: 'First lab validation signed off', boardTemplate: 'default',
    laptop: { model: 'Returned laptop NB-4471', address: 'Northbeam Chicago, 300 N LaSalle' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: {
      consent: { doneAt: 3 },
      bg_complete: { doneAt: 9 },
      laptop_release: { doneAt: 14 },
      buddy: { never: true },
      board_invite: { never: true },
      hello: { never: true },
    },
  },
  {
    id: 'kamala', title: 'Software Engineer', dept: 'Platform Engineering', managerId: 'tony', recruiterId: 'kate', buddyId: 'miles',
    location: 'New York office', mode: 'office', country: 'US', tz: 'Eastern time', offer: -35, start: -7,
    milestone: 'First reviewed code change', boardTemplate: 'platform',
    laptop: { model: 'MacBook Pro 14"', address: 'Northbeam New York, 85 Broad St' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: { milestone: { doneAt: 3, verAt: 4 } },
  },
  {
    id: 'barry', title: 'Data Engineer', dept: 'Platform Engineering', managerId: 'tony', recruiterId: 'kate', buddyId: 'miles',
    location: 'Remote, Kansas City', mode: 'remote', country: 'US', tz: 'Central time', offer: -5, start: 28,
    milestone: 'First reviewed code change', boardTemplate: 'platform',
    laptop: { model: 'MacBook Pro 14"', address: '1400 Main St, Kansas City, MO' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: { wd_deposit: { doneAt: 8 }, board_invite: { doneAt: 7 }, hello: { doneAt: 9 } },
  },
  {
    id: 'dinah', title: 'Customer Success Manager', dept: 'Sales, West', managerId: 'logan', recruiterId: 'kate', buddyId: 'oliver',
    location: 'Remote, Seattle', mode: 'remote', country: 'US', tz: 'Pacific time', offer: 7, start: 35,
    milestone: 'First customer check-in, supervised', boardTemplate: 'default',
    laptop: { model: 'MacBook Air 15"', address: '1201 Pike St, Seattle, WA' },
    mobilityNote: 'Not needed: US citizen, US role',
    overrides: { consent: { doneAt: 8 } },
  },
]

export const HIRE_BY_ID: Record<string, HireBase> = Object.fromEntries(HIRES.map((h) => [h.id, h]))

/** Bruce Wayne is out of office; scenario 8 hands his tasks to Lucius Fox. */
export const OUT_OF_OFFICE: Record<string, { until: number; delegate: string | null }> = {
  bruce: { until: 39, delegate: null },
}
