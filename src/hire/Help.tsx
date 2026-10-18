import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { useNav } from '../nav/NavContext'
import { useDemo } from '../engine/store'
import { AssistantPanel } from '../assistant/AssistantPanel'
import { people } from '../data/people'
import { fmtDay } from '../lib/dates'

export function HireHelp() {
  const { viewer } = useNav()
  const requests = useDemo(useShallow((s) => s.requests.filter((r) => r.hireId === viewer)))
  const addRequest = useDemo((s) => s.addRequest)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-2 pt-1">
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.02em]">Help</h1>
        {requests.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {requests.slice(0, 2).map((r) => (
              <div key={r.id} className="rounded-xl border border-line bg-surface px-3 py-2 text-xs">
                <div className="font-medium">With {people[r.to]?.name} · {fmtDay(r.day)}</div>
                <div className="truncate text-muted">{r.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <AssistantPanel
          viewer={viewer}
          compact
          onHuman={() => {
            addRequest(viewer, 'Asked to talk to a person', 'maria')
            toast.success('Maria Hill will reply here', { description: 'Your conversation so far is attached. Usually the same day.' })
          }}
        />
      </div>
    </div>
  )
}
