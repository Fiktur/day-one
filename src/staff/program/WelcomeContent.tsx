import { useState } from 'react'
import { Brain, Check, Link2, Sparkle, Video } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNav } from '../../nav/NavContext'
import { useDemo } from '../../engine/store'
import { PEPPER_VIDEO } from '../../data/welcome'
import { people } from '../../data/people'
import { fmtDay } from '../../lib/dates'
import { Button, Card, Pill, ReqTag } from '../../ui/parts'
import { VideoPlayer } from '../../ui/video'
import { Page, PageHeader } from '../StaffShell'
import { Segmented } from '../../ui/motion'

export function WelcomeContent() {
  const { compact } = useNav()
  const templates = useDemo((s) => s.templates)
  const memory = useDemo((s) => s.memory)
  const boards = useDemo((s) => s.boards)
  const toTemplate = useDemo((s) => s.memoryToTemplate)
  const [tab, setTab] = useState<'suggested' | 'templates' | 'company'>('suggested')
  const suggested = memory.filter((m) => !m.inTemplate && m.seenOn.length >= 3)
  const live = Object.values(boards).filter((b) => b.status === 'live').length

  return (
    <Page>
      <PageHeader
        title="Welcome content"
        sub={`Board templates for each team, what past boards suggest adding, and company-wide content. ${live} boards shared so far.`}
        tags={<ReqTag ids="E10 O12 X6" />}
        right={
          <Segmented value={tab} onChange={setTab} options={[['suggested', `Suggested updates · ${suggested.length}`], ['templates', 'Templates'], ['company', 'Company content']] as const} />
        }
      />
      {tab === 'suggested' && (
        <div className="space-y-3">
          <Card className="flex items-start gap-3 p-4">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-[13px] text-muted">These items keep showing up on boards managers share, but aren't in the team template yet. Approve one and every future board for that team starts with it. Personal notes are never suggested.</p>
          </Card>
          {suggested.length === 0 && <Card className="p-6 text-center text-[13px] text-muted">No suggestions right now. They appear once an item is on three or more boards.</Card>}
          {suggested.map((m) => {
            const Icon = m.kind === 'video' ? Video : m.kind === 'link' ? Link2 : Sparkle
            const t = templates[m.template]
            return (
              <Card key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                <Icon className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{m.text}</div>
                  <div className="text-xs text-muted">On {m.seenOn.length} boards: {m.seenOn.join(', ')} · for the {t.name} template, “{t.sections.find((s) => s.id === m.section)?.title}”{m.author ? ` · by ${people[m.author]?.name}, reuse allowed` : ''}</div>
                </div>
                <Button variant="primary" onClick={() => toTemplate(m.id)}><Check className="h-3.5 w-3.5" />Add to template</Button>
              </Card>
            )
          })}
        </div>
      )}
      {tab === 'templates' && (
        <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-3')}>
          {Object.values(templates).map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-baseline justify-between"><h3 className="font-semibold">{t.name}</h3><Pill>v{t.version}</Pill></div>
              <p className="text-xs text-muted">Updated {fmtDay(t.updated)}</p>
              <div className="mt-3 space-y-2">
                {t.sections.map((s) => (
                  <div key={s.id} className="text-[13px]">
                    <div className="font-medium">{s.title}{s.required && <span className="text-xs font-normal text-muted"> · required</span>}</div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {t.items.filter((i) => i.section === s.id).map((i) => <span key={i.id} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-muted">{i.text}</span>)}
                      {t.items.filter((i) => i.section === s.id).length === 0 && <span className="text-[11px] text-faint">{s.prompt}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
      {tab === 'company' && (
        <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-2')}>
          <Card className="space-y-2 p-4">
            <h3 className="font-semibold">Leadership welcome</h3>
            <VideoPlayer post={PEPPER_VIDEO} />
            <p className="text-xs text-muted">Added to every board automatically. The file lives in the company video service; Day One keeps the link.</p>
          </Card>
          <Card className="space-y-2 p-4">
            <h3 className="font-semibold">Benefits and policies</h3>
            {['Benefits guide 2026', 'Employee handbook', 'How we work at Northbeam', 'Security basics'].map((x) => (
              <div key={x} className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-[13px]"><span className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5 text-accent" />{x}</span><span className="text-xs text-muted">Owner: People Experience · review in Jan</span></div>
            ))}
          </Card>
        </div>
      )}
    </Page>
  )
}
