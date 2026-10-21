import type { HireBase } from './hires'

export type MsgTrigger =
  | { type: 'offer' }
  | { type: 'rel'; rel: number }
  | { type: 'event'; step: string }

export type MsgFrom = 'company' | 'manager' | 'program' | 'buddy' | 'it'

export interface MsgTemplate {
  id: string
  name: string
  trigger: MsgTrigger
  from: MsgFrom
  subject: (first: string, managerFirst: string, buddyFirst: string | null) => string
  body: (first: string, managerFirst: string, buddyFirst: string | null) => string
  rules: string[]
  editableByManager?: number // days before start when edits close
  when?: (h: HireBase) => boolean
  reqs?: string[]
}

export const MSG_TEMPLATES: MsgTemplate[] = [
  {
    id: 'welcome', name: 'Welcome to Northbeam', trigger: { type: 'offer' }, from: 'company',
    subject: (f) => `Welcome to Northbeam, ${f}`,
    body: (f) => `${f}, we're so glad you said yes. Over the next few weeks Day One will show you exactly what to do and what we're handling for you.`,
    rules: ['Sends when the offer is accepted', 'Never sends twice for the same offer'],
  },
  {
    id: 'portal', name: 'Your Day One portal is ready', trigger: { type: 'offer' }, from: 'program',
    subject: () => 'Your Day One portal is ready',
    body: () => 'Sign in with this email address. You will switch to your work account on day one, and nothing will be lost.',
    rules: ['Sends to personal email', 'Sign-in link expires after 15 minutes'], reqs: ['E1'],
  },
  {
    id: 'clearance', name: 'Your background check is complete', trigger: { type: 'event', step: 'clearance' }, from: 'program',
    subject: () => 'Your background check is complete',
    body: () => "Good news: your background check is done. There's nothing you need to do. Next, we'll prepare your laptop and accounts.",
    rules: ['Sends when clearance is recorded', 'Never includes results'],
  },
  {
    id: 'digest', name: 'A few things to finish this week', trigger: { type: 'rel', rel: -14 }, from: 'program',
    subject: () => 'A few things to finish this week',
    body: () => 'One message with everything due in the next seven days, instead of a reminder for each.',
    rules: ['Bundles every reminder into one digest', 'Skips if nothing is due', 'At most one a day'], reqs: ['M3'],
  },
  {
    id: 'board_live', name: 'Your welcome board is live', trigger: { type: 'rel', rel: -12 }, from: 'manager',
    subject: (f, m) => `${m} and the team left you a few messages`,
    body: (f) => `${f}, your team has been recording hellos. Open your welcome board whenever you like.`,
    rules: ['Sends once the board has at least two posts'],
  },
  {
    id: 'orient', name: 'Your orientation details', trigger: { type: 'rel', rel: -10 }, from: 'program',
    subject: () => 'Your orientation details',
    body: () => 'Orientation runs 9:00 am to 12:30 pm on your first day. Your calendar invite has the link and the agenda.',
    rules: ['Sends 10 days before start, 9:00 am in the hire’s time zone', 'Stops if the hire withdraws'],
  },
  {
    id: 'shipped', name: 'Your laptop is on its way', trigger: { type: 'event', step: 'laptop_ship' }, from: 'it',
    subject: () => 'Your laptop is on its way',
    body: () => 'It arrives set up and ready. On day one you just sign in. Track it from Day One anytime.',
    rules: ['Sends when the laptop ships'],
  },
  {
    id: 'manager_welcome', name: 'A note from your manager', trigger: { type: 'rel', rel: -7 }, from: 'manager',
    subject: (f, m) => `A note from ${m}`,
    body: (f, m, b) => `Hi ${f}, I'm really looking forward to working with you. ${b ? `${b} will be your buddy for the first few weeks.` : 'We’re picking a buddy to show you around.'} See you soon. ${m}`,
    rules: ['Manager can edit until the day before it sends', 'The default sends if unchanged', 'Sent in the manager’s name'],
    editableByManager: -8, reqs: ['M4'],
  },
  {
    id: 'buddy', name: 'Hi from your buddy', trigger: { type: 'rel', rel: -5 }, from: 'buddy',
    subject: () => 'Hi from your buddy',
    body: (f) => `Hey ${f}! I'm your buddy for the first few weeks. I've booked us a coffee on day two.`,
    rules: ['Waits until the manager picks a buddy']
  },
  {
    id: 'logistics', name: 'How day one works', trigger: { type: 'rel', rel: -3 }, from: 'program',
    subject: () => 'Monday: how day one works',
    body: () => 'Sign in with your new work account, join orientation at 9:00 am, and meet your manager at 1:00 pm.',
    rules: ['Content changes for office and remote starts', 'Quiet hours: 8 pm to 8 am'],
  },
  {
    id: 'dayone', name: 'Welcome! Start here', trigger: { type: 'rel', rel: 0 }, from: 'company',
    subject: () => 'Welcome! Start here',
    body: () => 'Your first-day checklist, your first week, and who to ask for help.',
    rules: ['Sends to the new work email'],
  },
  {
    id: 'benefits', name: 'Benefits enrollment closes soon', trigger: { type: 'rel', rel: 21 }, from: 'program',
    subject: () => 'Benefits enrollment closes in 9 days',
    body: () => 'Choose your benefits on the benefits site. It takes about 20 minutes.',
    rules: ['Skips if benefits are already chosen'],
  },
]

export const FROM_LABEL: Record<MsgFrom, string> = {
  company: 'Pepper Potts, Head of People',
  manager: 'Hiring manager',
  program: 'Maria Hill, Onboarding team',
  buddy: 'Buddy (not picked yet)',
  it: 'Northbeam IT',
}
