// Example history for the Insights view: what Day One would have learned from the last 90 days of hires.

export const HISTORY = {
  hires: 62,
  offerToReadyMedian: 19,
  readyOnTime: 0.87,
  stepsPastSla: 14,
  handoffsPerHire: 23,
  manualTouches: 6.2,
}

export const LEAD_TIMES: { label: string; median: number; p90: number; owner: string; note?: string }[] = [
  { label: 'Background check', median: 4.0, p90: 7.5, owner: 'Screening · via Checkr' },
  { label: 'Laptop prepared and shipped', median: 3.1, p90: 6.0, owner: 'IT · via Firstbase' },
  { label: 'Workday task confirmations', median: 2.3, p90: 4.1, owner: 'HR Ops · via Workday' },
  { label: 'Hire record finalized', median: 1.5, p90: 3.0, owner: 'HR Operations' },
  { label: 'Laptop delivery', median: 2.6, p90: 4.0, owner: 'IT · via UPS' },
  { label: 'Work account created', median: 1.0, p90: 2.0, owner: 'IT' },
  { label: 'Manager prep (buddy, plan, first work)', median: 6.5, p90: 11.0, owner: 'Managers' },
]

export const PERMIT_LEAD = { label: 'Work permit, Portugal', median: 31, p90: 44, cases: 9 }

export const SLA_BY_OWNER: { owner: string; breaches: number; total: number }[] = [
  { owner: 'IT · via Firstbase', breaches: 4, total: 58 },
  { owner: 'Managers', breaches: 4, total: 186 },
  { owner: 'Screening · via Checkr', breaches: 3, total: 62 },
  { owner: 'IT', breaches: 2, total: 124 },
  { owner: 'HR Operations', breaches: 1, total: 124 },
]

export const SUGGESTIONS: { title: string; detail: string; impact: string }[] = [
  {
    title: 'Turn on Workday task status updates',
    detail: 'Workday confirmations take 2.3 business days on average because HR Operations checks them by hand for 3 task types.',
    impact: 'Saves about 2 days per hire and 140 manual checks a quarter.',
  },
  {
    title: 'Ask managers for the buddy at offer, not two weeks before',
    detail: 'Buddy selection is the most common late manager step (9 of the last 62 hires).',
    impact: 'Removes the most frequent reason a hire is "at risk" in week two.',
  },
  {
    title: 'Add an orientation session the week of Nov 16',
    detail: 'Planned starts (23) exceed seats (20) that week.',
    impact: 'Avoids moving 3 start dates.',
  },
]
