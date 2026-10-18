import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useDemo } from '../../engine/store'
import type { MsgInstance } from '../../engine/messages'
import { fmtDay } from '../../lib/dates'
import { Button } from '../../ui/parts'
import { Modal } from '../../ui/overlay'

export function MessageEditor({ msg, hireName, onClose, by }: { msg: MsgInstance; hireName: string; onClose: () => void; by: string }) {
  const edit = useDemo((s) => s.editMessage)
  const [text, setText] = useState(msg.body)
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={msg.template.name}
      description={`To ${hireName} · ${msg.day != null ? fmtDay(msg.day) : 'when triggered'}, 9:00 am their time · from ${msg.from}`}
      width="max-w-2xl"
      footer={
        <>
          <span className="mr-auto text-xs text-muted">{msg.editableUntil != null ? `Edits close ${fmtDay(msg.editableUntil)}. If you change nothing, the default sends.` : ''}</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { edit(msg.hireId, msg.template.id, text, by); onClose() }}>Save my version</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="msg-body" className="text-xs font-medium text-muted">Message</label>
          <textarea id="msg-body" value={text} onChange={(e) => setText(e.target.value)} rows={9} className="w-full rounded-lg border border-line bg-bg p-3 text-[13px] leading-relaxed focus:border-accent focus:outline-none" />
          <div className="flex flex-wrap gap-1">
            {msg.template.rules.map((r) => <span key={r} className="rounded bg-sunken px-1.5 py-0.5 text-[11px] text-muted">{r}</span>)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-medium text-muted">Preview as {hireName.split(' ')[0]} sees it</div>
          <div className="rounded-xl border border-line bg-bg p-4">
            <div className="flex items-center gap-2 text-xs text-muted"><Mail className="h-3.5 w-3.5" />{msg.channel}</div>
            <div className="mt-2 font-semibold">{msg.subject}</div>
            <div className="text-xs text-muted">From {msg.from}</div>
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed">{text}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
