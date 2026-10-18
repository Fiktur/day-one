import { Hand, Link2, Plug } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { MODE_LABEL, STAGES, STEPS, SYSTEM_MODES, STEP_BY_KEY, systemNames, type StepDef } from '../../data/journey'
import { teams } from '../../data/people'
import { providerRef, refName } from '../../engine/derive'
import { Card, Pill, ReqTag } from '../../ui/parts'
import { Page, PageHeader } from '../StaffShell'

function ownerText(d: StepDef): string {
  const o = d.owner
  if (o.type === 'hire') return 'New hire'
  if (o.type === 'manager') return 'Hiring manager'
  if (o.type === 'recruiter') return 'Recruiter'
  if (o.type === 'team') return teams[o.team].name
  return refName(providerRef(o.id))
}

function dueText(d: StepDef): string {
  if ('sla' in d.due) return d.due.sla === 0 ? 'Same day' : `${d.due.sla} business day${d.due.sla > 1 ? 's' : ''} after it opens`
  const r = d.due.rel
  return r === 0 ? 'On the start date' : r < 0 ? `${-r} days before start` : `${r} days after start`
}

export function Journeys() {
  const { compact } = useNav()
  const setup = useDemo((s) => s.setup)
  return (
    <Page>
      <PageHeader
        title="Standard journey"
        sub="One shared core with variations for office starts, US hires, work authorization and rehires. Read-only in the demo."
        tags={<ReqTag ids="O2 O4 O11 T1" />}
        right={<div className="flex flex-wrap gap-1.5"><Pill tone="accent">v12 · published Sep 14</Pill><Pill>Variants: office · US · work authorization · rehire</Pill></div>}
      />
      <div className="space-y-4">
        {STAGES.map((stage, i) => {
          const steps = STEPS.filter((s) => s.stage === i && !s.cancel)
          return (
            <Card key={stage} className="overflow-hidden">
              <div className="border-b border-line bg-bg px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-faint">{stage}</div>
              {steps.map((d) => {
                const mode = SYSTEM_MODES[setup][d.system]
                const Icon = mode === 'connected' ? Plug : mode === 'linked' ? Link2 : Hand
                return (
                  <div key={d.key} className={cn('grid gap-2 border-b border-line px-4 py-2.5 text-[13px] last:border-0', compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]')}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-medium">{d.name}{d.gate && <span className="rounded bg-amber-soft px-1 font-mono text-[9px] font-semibold text-amber-ink">GATE</span>}{d.critical && <span className="rounded bg-sunken px-1 font-mono text-[9px] text-muted">CRITICAL</span>}{d.when && <span className="rounded bg-sunken px-1 font-mono text-[9px] text-muted">VARIANT</span>}</div>
                      {d.deps && d.deps.length > 0 && <div className="truncate text-xs text-muted">After: {d.deps.map((k) => STEP_BY_KEY[k]?.name).join(', ')}</div>}
                    </div>
                    <div className="text-muted">{ownerText(d)}</div>
                    <div className="flex items-center gap-1.5 text-muted">{mode !== 'native' && <Icon className="h-3.5 w-3.5" />}{systemNames[d.system]}{mode !== 'native' ? ` · ${MODE_LABEL[mode].toLowerCase()}` : ''}</div>
                    <div className="text-muted">{dueText(d)}{d.opens != null && d.opens !== 0 ? ` · opens ${Math.abs(d.opens)} days ${d.opens < 0 ? 'before' : 'after'} start` : ''}</div>
                  </div>
                )
              })}
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
