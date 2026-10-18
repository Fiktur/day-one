// Every person here is a fictional character. Northbeam is a fictional company.

export type TeamId = 'it' | 'hris' | 'screening' | 'mobility' | 'workplace' | 'program' | 'recruiting'
export type ProviderId = 'checkr' | 'firstbase' | 'carrier' | 'immigration' | 'workday' | 'google' | 'greenhouse' | 'calendar' | 'benefits'
export type Role = 'hire' | 'manager' | 'recruiter' | 'program' | 'team' | 'head'

export interface Person {
  id: string
  name: string
  title: string
  role: Role
  team?: TeamId
  location?: string
  hue?: number // poster/avatar tint index
}

export const people: Record<string, Person> = {}
function add(p: Person) {
  people[p.id] = p
}

// New hires (their journeys live in hires.ts)
add({ id: 'virgil', name: 'Virgil Hawkins', title: 'Network Engineer', role: 'hire', location: 'Remote, Chicago', hue: 0 })
add({ id: 'hal', name: 'Hal Jordan', title: 'Field Solutions Engineer', role: 'hire', location: 'San Diego', hue: 1 })
add({ id: 'wanda', name: 'Wanda Maximoff', title: 'Product Designer', role: 'hire', location: 'Lisbon office', hue: 2 })
add({ id: 'matt', name: 'Matt Murdock', title: 'Legal Counsel', role: 'hire', location: 'New York office', hue: 3 })
add({ id: 'peter', name: 'Peter Parker', title: 'Junior Software Engineer', role: 'hire', location: 'New York office', hue: 1 })
add({ id: 'wade', name: 'Wade Wilson', title: 'Account Executive', role: 'hire', location: 'Remote, Denver', hue: 2 })
add({ id: 'ted', name: 'Ted Kord', title: 'Hardware Engineer', role: 'hire', location: 'Chicago office', hue: 3 })
add({ id: 'kamala', name: 'Kamala Khan', title: 'Software Engineer', role: 'hire', location: 'New York office', hue: 0 })
add({ id: 'barry', name: 'Barry Allen', title: 'Data Engineer', role: 'hire', location: 'Remote, Kansas City', hue: 2 })
add({ id: 'dinah', name: 'Dinah Lance', title: 'Customer Success Manager', role: 'hire', location: 'Remote, Seattle', hue: 3 })

// Managers
add({ id: 'tony', name: 'Tony Stark', title: 'VP, Network and Platform Engineering', role: 'manager', hue: 0 })
add({ id: 'carol', name: 'Carol Danvers', title: 'Director, Solutions Engineering', role: 'manager', hue: 1 })
add({ id: 'diana', name: 'Diana Prince', title: 'Head of Design', role: 'manager', hue: 2 })
add({ id: 'franklin', name: 'Franklin Nelson', title: 'Deputy General Counsel', role: 'manager', hue: 3 })
add({ id: 'logan', name: 'Logan Howlett', title: 'Sales Director, West', role: 'manager', hue: 1 })
add({ id: 'bruce', name: 'Bruce Wayne', title: 'Director, Hardware Lab', role: 'manager', hue: 3 })
add({ id: 'lucius', name: 'Lucius Fox', title: 'Senior Director, Hardware', role: 'manager', hue: 0 })

// People team, specialists, IT, workplace
add({ id: 'kate', name: 'Kate Bishop', title: 'Recruiter', role: 'recruiter', team: 'recruiting', hue: 2 })
add({ id: 'maria', name: 'Maria Hill', title: 'Onboarding Program Manager', role: 'program', team: 'program', hue: 0 })
add({ id: 'alfred', name: 'Alfred Pennyworth', title: 'People Experience Coordinator', role: 'program', team: 'program', hue: 3 })
add({ id: 'monica', name: 'Monica Rambeau', title: 'Global Mobility Partner', role: 'team', team: 'mobility', hue: 1 })
add({ id: 'barbara', name: 'Barbara Gordon', title: 'People Systems Lead', role: 'team', team: 'hris', hue: 2 })
add({ id: 'jennifer', name: 'Jennifer Walters', title: 'Employment Compliance Lead', role: 'team', team: 'screening', hue: 3 })
add({ id: 'shuri', name: 'Shuri', title: 'IT Lead', role: 'team', team: 'it', hue: 0 })
add({ id: 'felicity', name: 'Felicity Smoak', title: 'IT Service Desk', role: 'team', team: 'it', hue: 1 })
add({ id: 'luke', name: 'Luke Cage', title: 'Workplace Manager', role: 'team', team: 'workplace', hue: 2 })
add({ id: 'pepper', name: 'Pepper Potts', title: 'Head of People', role: 'head', hue: 1 })

// Teammates and buddies
add({ id: 'jaime', name: 'Jaime Reyes', title: 'Network Engineer · buddy', role: 'manager', hue: 2 })
add({ id: 'ryan', name: 'Ryan Choi', title: 'Senior Network Engineer', role: 'manager', hue: 3 })
add({ id: 'miles', name: 'Miles Morales', title: 'Software Engineer, Platform', role: 'manager', hue: 1 })

export interface Team {
  id: TeamId
  name: string
  short: string
  members: string[]
}

export const teams: Record<TeamId, Team> = {
  it: { id: 'it', name: 'IT and equipment', short: 'IT', members: ['shuri', 'felicity'] },
  hris: { id: 'hris', name: 'People Systems', short: 'People Systems', members: ['barbara'] },
  screening: { id: 'screening', name: 'Screening and compliance', short: 'Screening', members: ['jennifer'] },
  mobility: { id: 'mobility', name: 'Global mobility', short: 'Global mobility', members: ['monica'] },
  workplace: { id: 'workplace', name: 'Workplace', short: 'Workplace', members: ['luke'] },
  program: { id: 'program', name: 'People Experience', short: 'People Experience', members: ['maria', 'alfred'] },
  recruiting: { id: 'recruiting', name: 'Recruiting', short: 'Recruiting', members: ['kate'] },
}

export interface Provider {
  id: ProviderId
  name: string
  short: string
}

export const providers: Record<ProviderId, Provider> = {
  checkr: { id: 'checkr', name: 'Checkr', short: 'CK' },
  firstbase: { id: 'firstbase', name: 'Firstbase', short: 'FB' },
  carrier: { id: 'carrier', name: 'Carrier', short: 'UP' },
  immigration: { id: 'immigration', name: 'Atlas Immigration', short: 'AI' },
  workday: { id: 'workday', name: 'Workday', short: 'WD' },
  google: { id: 'google', name: 'Google Workspace', short: 'GW' },
  greenhouse: { id: 'greenhouse', name: 'Greenhouse', short: 'GH' },
  calendar: { id: 'calendar', name: 'Calendar', short: 'CA' },
  benefits: { id: 'benefits', name: 'Benefits site', short: 'BN' },
}

/** People the presenter can "become" from the role switcher, grouped by role. */
export const switcherGroups: { label: string; ids: string[] }[] = [
  { label: 'New hires', ids: ['virgil', 'hal', 'wanda', 'peter', 'kamala'] },
  { label: 'Managers', ids: ['tony', 'carol', 'diana', 'lucius', 'bruce'] },
  { label: 'Recruiting', ids: ['kate'] },
  { label: 'People Experience', ids: ['maria'] },
  { label: 'Specialist teams', ids: ['shuri', 'felicity', 'barbara', 'jennifer', 'monica', 'luke'] },
  { label: 'Leadership', ids: ['pepper'] },
]

export const roleLabel: Record<Role, string> = {
  hire: 'New hire',
  manager: 'Hiring manager',
  recruiter: 'Recruiter',
  program: 'Program manager',
  team: 'Team',
  head: 'Head of People',
}

export function personRoleLabel(id: string): string {
  const p = people[id]
  if (!p) return ''
  if (p.role === 'team' && p.team) return teams[p.team].name
  return roleLabel[p.role]
}
