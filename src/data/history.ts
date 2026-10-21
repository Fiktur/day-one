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

/** Late-step share by owner over the last 90 days, plus the weekly rate for the last 12 weeks (oldest first). */
export const SLA_BY_OWNER: { owner: string; breaches: number; total: number; trend: number[] }[] = [
  { owner: 'IT · via Firstbase', breaches: 4, total: 58, trend: [0.031, 0.036, 0.04, 0.038, 0.047, 0.052, 0.049, 0.058, 0.061, 0.064, 0.066, 0.069] },
  { owner: 'Managers', breaches: 4, total: 186, trend: [0.041, 0.039, 0.036, 0.034, 0.033, 0.03, 0.029, 0.027, 0.025, 0.024, 0.023, 0.022] },
  { owner: 'Screening · via Checkr', breaches: 3, total: 62, trend: [0.052, 0.05, 0.053, 0.049, 0.051, 0.05, 0.048, 0.049, 0.047, 0.05, 0.049, 0.048] },
  { owner: 'IT', breaches: 2, total: 124, trend: [0.028, 0.026, 0.025, 0.024, 0.022, 0.021, 0.02, 0.019, 0.018, 0.017, 0.017, 0.016] },
  { owner: 'HR Operations', breaches: 1, total: 124, trend: [0.019, 0.018, 0.016, 0.015, 0.013, 0.012, 0.011, 0.01, 0.009, 0.009, 0.008, 0.008] },
]

export const SUGGESTIONS: { title: string; detail: string; impact: string; owner: string }[] = [
  {
    title: 'Turn on Workday task status updates',
    detail: 'Workday confirmations take 2.3 business days on average because HR Operations checks them by hand for 3 task types.',
    impact: 'Saves about 2 days per hire and 140 manual checks a quarter.',
    owner: 'barbara',
  },
  {
    title: 'Ask managers for the buddy at offer, not two weeks before',
    detail: 'Buddy selection is the most common late manager step (9 of the last 62 hires).',
    impact: 'Removes the most frequent reason a hire falls behind in week two.',
    owner: 'maria',
  },
  {
    title: 'Add an orientation session the week of Nov 16',
    detail: 'Planned starts (23) exceed seats (20) that week.',
    impact: 'Avoids moving 3 start dates.',
    owner: 'alfred',
  },
]
