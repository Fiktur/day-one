// Welcome boards: templates, the boards themselves, and what Day One has learned from past boards.

export type SectionKind = 'video' | 'notes' | 'items'

export interface BoardSection {
  id: string
  title: string
  kind: SectionKind
  prompt: string
  required?: boolean
}

export interface BoardItem {
  id: string
  section: string
  text: string
  kind: 'link' | 'ritual' | 'tip'
}

export interface BoardTemplate {
  id: string
  name: string
  version: number
  updated: number
  sections: BoardSection[]
  items: BoardItem[]
}

export interface BoardPost {
  id: string
  author: string
  kind: 'video' | 'note'
  section: string
  text: string
  duration?: number
  captions?: string[]
  reusable?: boolean
  day: number
}

export interface Invite {
  person: string
  status: 'posted' | 'invited'
  day: number
}

export interface Board {
  hireId: string
  template: string
  status: 'draft' | 'live'
  shared: number | null
  invites: Invite[]
  posts: BoardPost[]
  items: BoardItem[]
}

/** A reusable thing seen on earlier boards that could go on the next one, or into the template. */
export interface MemoryItem {
  id: string
  template: string
  section: string
  kind: 'link' | 'ritual' | 'tip' | 'video'
  text: string
  author?: string
  seenOn: string[]
  inTemplate: boolean
}

const baseSections: BoardSection[] = [
  { id: 'manager', title: 'From your manager', kind: 'video', prompt: 'A short hello: what they will work on first and why you are excited.', required: true },
  { id: 'company', title: 'From Northbeam', kind: 'video', prompt: 'Leadership welcome, added automatically.' },
  { id: 'buddy', title: 'Meet your buddy', kind: 'video', prompt: 'Who you are and what you will do together in week one.' },
  { id: 'team', title: 'Notes from the team', kind: 'notes', prompt: 'One thing you wish you had known in your first week.' },
  { id: 'how', title: 'How we work', kind: 'items', prompt: 'Team rituals and habits.' },
  { id: 'links', title: 'Useful links', kind: 'items', prompt: 'Channels, docs and tools the team uses every day.' },
]

export const TEMPLATES: Record<string, BoardTemplate> = {
  default: {
    id: 'default', name: 'Northbeam welcome', version: 5, updated: -40, sections: baseSections,
    items: [
      { id: 'd1', section: 'links', text: 'Employee handbook', kind: 'link' },
      { id: 'd2', section: 'links', text: '#new-at-northbeam channel', kind: 'link' },
    ],
  },
  network: {
    id: 'network', name: 'Network Engineering', version: 3, updated: -21, sections: baseSections,
    items: [
      { id: 'n1', section: 'how', text: 'Friday demo hour, 3 pm Central', kind: 'ritual' },
      { id: 'n2', section: 'how', text: 'No-meeting Wednesdays', kind: 'ritual' },
      { id: 'n3', section: 'links', text: '#net-eng channel', kind: 'link' },
      { id: 'n4', section: 'links', text: 'Lab booking sheet', kind: 'link' },
      { id: 'n5', section: 'links', text: 'Network runbook index', kind: 'link' },
    ],
  },
  platform: {
    id: 'platform', name: 'Platform Engineering', version: 2, updated: -60, sections: baseSections,
    items: [
      { id: 'p1', section: 'how', text: 'Tuesday coffee roulette', kind: 'ritual' },
      { id: 'p2', section: 'links', text: '#platform channel', kind: 'link' },
      { id: 'p3', section: 'links', text: 'Service catalog', kind: 'link' },
    ],
  },
}

export const MEMORY: MemoryItem[] = [
  { id: 'm1', template: 'platform', section: 'links', kind: 'link', text: 'Platform on-call primer', seenOn: ['Kamala Khan', 'Barry Allen', 'Riri Williams'], inTemplate: false },
  { id: 'm2', template: 'platform', section: 'buddy', kind: 'video', text: "Miles's two-minute tour of the codebase", author: 'miles', seenOn: ['Kamala Khan', 'Barry Allen'], inTemplate: false },
  { id: 'm3', template: 'platform', section: 'team', kind: 'tip', text: 'Ask Miles about the deploy train before your first change', seenOn: ['Kamala Khan', 'Barry Allen'], inTemplate: false },
  { id: 'm4', template: 'platform', section: 'how', kind: 'ritual', text: 'Thursday architecture office hours', seenOn: ['Barry Allen', 'Riri Williams', 'Kamala Khan'], inTemplate: false },
  { id: 'm5', template: 'network', section: 'buddy', kind: 'video', text: "Ryan's lab safety walkthrough", author: 'ryan', seenOn: ['Virgil Hawkins', 'Sam Wilson', 'Kate Kane'], inTemplate: false },
  { id: 'm6', template: 'default', section: 'team', kind: 'tip', text: 'Book your first 1:1s in week one, not week two', seenOn: ['Hal Jordan', 'Dinah Lance', 'Matt Murdock', 'Wade Wilson'], inTemplate: false },
]

const tonyVirgil = [
  'Hey Virgil, Tony here.',
  'The whole network team has been counting down to your first day.',
  "Your first project is the new edge routing rollout. You'll pair with Jaime on it.",
  "Bring every question you have. We'd much rather hear them early.",
  'See you on November 2nd.',
]
const jaimeVirgil = [
  "Hi Virgil! I'm Jaime, your buddy.",
  "In week one we'll get your lab access sorted and grab a virtual coffee.",
  'Ping me anytime, even for the small stuff. Especially for the small stuff.',
]
const pepperAll = [
  'Welcome to Northbeam.',
  "You're joining at a busy, exciting time, and we're glad you're here.",
  "Our promise: you'll start ready, and you'll always know what happens next.",
  "If something isn't clear, ask. That's how we get better.",
]

export const PEPPER_VIDEO: BoardPost = { id: 'company', author: 'pepper', kind: 'video', section: 'company', text: 'A welcome from our Head of People', duration: 75, captions: pepperAll, day: -30 }

export const BOARDS: Record<string, Board> = {
  virgil: {
    hireId: 'virgil', template: 'network', status: 'live', shared: 8,
    invites: [
      { person: 'jaime', status: 'posted', day: 8 },
      { person: 'ryan', status: 'posted', day: 8 },
      { person: 'kamala', status: 'posted', day: 8 },
      { person: 'shuri', status: 'posted', day: 8 },
      { person: 'felicity', status: 'invited', day: 8 },
    ],
    posts: [
      { id: 'v1', author: 'tony', kind: 'video', section: 'manager', text: 'Welcome to the team', duration: 48, captions: tonyVirgil, day: 9 },
      { id: 'v2', author: 'jaime', kind: 'video', section: 'buddy', text: 'Meet your buddy', duration: 32, captions: jaimeVirgil, reusable: false, day: 9 },
      { id: 'v3', author: 'ryan', kind: 'note', section: 'team', text: "Welcome aboard. I'll walk you through the lab setup in week one.", day: 9 },
      { id: 'v4', author: 'kamala', kind: 'note', section: 'team', text: 'I started three weeks ago. The first week is easier than it looks, I promise.', day: 9 },
      { id: 'v5', author: 'shuri', kind: 'note', section: 'team', text: 'Your laptop arrives set up and ready. Day one is just signing in.', day: 10 },
    ],
    items: TEMPLATES.network.items,
  },
  hal: {
    hireId: 'hal', template: 'default', status: 'live', shared: 8,
    invites: [{ person: 'ryan', status: 'posted', day: 8 }],
    posts: [
      { id: 'h1', author: 'carol', kind: 'video', section: 'manager', text: 'Welcome, Hal', duration: 41, captions: ['Hal, Carol here. Welcome to Solutions Engineering.', "You'll shadow three customer demos in week one.", 'Then the stage is yours.'], day: 9 },
      { id: 'h2', author: 'ryan', kind: 'note', section: 'buddy', text: "I'm your buddy. I'll show you the demo environment on day two.", day: 9 },
    ],
    items: TEMPLATES.default.items,
  },
  kamala: {
    hireId: 'kamala', template: 'platform', status: 'live', shared: -24,
    invites: [
      { person: 'miles', status: 'posted', day: -24 },
      { person: 'ryan', status: 'posted', day: -24 },
    ],
    posts: [
      { id: 'k1', author: 'tony', kind: 'video', section: 'manager', text: 'Welcome to Platform', duration: 44, captions: ['Kamala, Tony here. Welcome to Platform Engineering.', 'Your first week is about getting comfortable, not shipping.', 'By week three you’ll have your first change merged.'], day: -23 },
      { id: 'k2', author: 'miles', kind: 'note', section: 'buddy', text: "I'm your buddy. Coffee on day two, and I'll pair with you on your first change.", day: -23 },
      { id: 'k3', author: 'ryan', kind: 'note', section: 'team', text: 'Ask anything, any time. Nobody expects you to know our systems yet.', day: -22 },
    ],
    items: TEMPLATES.platform.items,
  },
  peter: {
    hireId: 'peter', template: 'platform', status: 'draft', shared: null,
    invites: [{ person: 'miles', status: 'invited', day: 10 }],
    posts: [],
    items: TEMPLATES.platform.items,
  },
}

export function emptyBoard(hireId: string, template: string): Board {
  return { hireId, template, status: 'draft', shared: null, invites: [], posts: [], items: TEMPLATES[template]?.items ?? [] }
}
