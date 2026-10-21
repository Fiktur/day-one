import { useEffect, useState } from 'react'
import { Check, ExternalLink, KeyRound, Laptop, Lock, Mail, MapPin, Package, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../lib/cn'
import { useNav } from '../nav/NavContext'
import { useView, useCtx } from '../engine/selectors'
import { useDemo } from '../engine/store'
import { people } from '../data/people'
import { PEPPER_VIDEO } from '../data/welcome'
import { fmtDay, fmtWeekdayShort, rel } from '../lib/dates'
import { managerFor, type HireView } from '../engine/derive'
import { ctxOf } from '../engine/selectors'
import { Avatar, Button, Glyph, ReqTag } from '../ui/parts'
import { VideoPlayer } from '../ui/video'
import { burst } from '../ui/fx'
import { Emoji, type EmojiName } from '../ui/assets'
import { motion, springs } from '../ui/motion'
import { ShipTracker } from './Home'
import { buddyOf, confirmBy, heldBack, usePlan } from './helpers'

export function FirstWeek() {
  const { viewer } = useNav()
  const v = useView(viewer)!
  const now = useDemo((s) => s.now)
  const ctx = useCtx()
  const h = v.hire
  const mgr = people[managerFor(h, ctx).id]
  const planReady = v.by.first_week?.state === 'verified'
  const { plan } = usePlan(v)
  const days = plan.map((items, i) => ({ d: h.start + i, items: items.map((x) => [x.t, x.l]) }))
  if (heldBack(v, now)) {
    return <div className="px-4 pb-6"><div className="rounded-2xl bg-sunken px-3.5 py-3 text-[13px] text-muted">Your first week moves with your new start date. {people.maria.name.split(' ')[0]} will share it once the date is confirmed, by {fmtDay(confirmBy(h.start, now))}.</div></div>
  }
  return (
    <div className="space-y-3 px-4 pb-6">
      {!planReady && (
        <div className="rounded-2xl bg-sunken px-3.5 py-3 text-[13px] text-muted">
          {mgr.name.split(' ')[0]} is finishing your first-week plan. It'll be ready by {fmtDay(v.by.first_week?.due ?? h.start - 3)}. Here's the outline so far.
        </div>
      )}
      <ol className="space-y-2">
        {days.map((day, i) => (
          <li key={day.d} className="rounded-2xl border border-line bg-surface p-3 shadow-card">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">Day {i + 1}</div>
              <div className="font-mono text-xs text-muted">{fmtDay(day.d)}</div>
            </div>
            <ul className="mt-1.5 space-y-1 text-[13px]">
              {day.items.map(([t, l], j) => (
                <li key={j} className="grid grid-cols-[56px_1fr] gap-2"><span className="font-mono text-xs text-faint">{t}</span><span>{l}</span></li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="px-1 text-xs text-muted">{h.mode !== 'remote' ? `You’re starting at the ${h.location}. Pick up your badge at the front desk at 8:45.` : (v.by.laptop_deliver?.ver ?? 0) >= h.start && v.by.laptop_deliver?.state !== 'verified' ? `You’re starting remotely. Your laptop lands after your start date, so ${people.maria.name.split(' ')[0]} will tell you the plan for day one.` : 'You’re starting remotely. Your laptop arrives set up; on day one you just sign in.'}</p>
      {now >= h.start - 7 && <p className="px-1 text-xs text-faint">Updated {rel(now, now)}.</p>}
    </div>
  )
}

export function People() {
  const { viewer } = useNav()
  const v = useView(viewer)!
  const ctx = useCtx()
  const h = v.hire
  const list = [
    { id: managerFor(h, ctx).id, role: 'Your manager' },
    ...(buddyOf(v) ? [{ id: buddyOf(v)!, role: 'Your buddy for the first few weeks' }] : []),
    { id: 'maria', role: 'Onboarding team · your go-to for anything' },
    { id: h.recruiterId, role: 'Your recruiter, until day one' },
    { id: 'shuri', role: 'IT · laptop and accounts' },
  ]
  return (
    <div className="space-y-2 px-4 pb-6">
      <ReqTag ids="E10" />
      {list.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
          <Avatar id={p.id} size={40} />
          <div className="min-w-0">
            <div className="font-semibold">{people[p.id].name}</div>
            <div className="text-xs text-muted">{p.role}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Company() {
  const benefits: [string, string, EmojiName][] = [
    ['Medical, dental and vision', 'Three plans. Northbeam covers most of the premium.', 'heart'],
    ['401(k)', '4% match from day one.', 'seedling'],
    ['Time off', 'Flexible, with a 15-day minimum we encourage you to take.', 'sunrise'],
    ['Learning', '$1,500 a year for courses, books and conferences.', 'books'],
  ]
  return (
    <div className="space-y-3 px-4 pb-6">
      <VideoPlayer post={PEPPER_VIDEO} />
      <p className="text-xs text-muted">A welcome from Pepper Potts, Head of People</p>
      <div className="flex items-end justify-between px-1 pt-1">
        <div>
          <div className="font-display text-[17px] font-bold">Benefits</div>
          <p className="text-xs text-muted">Enrollment opens on your first day. You have 30 days.</p>
        </div>
        <Button size="sm" onClick={() => toast('Opens the benefits site')}>Site <ExternalLink className="h-3 w-3" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {benefits.map(([t, d, e], i) => (
          <motion.div key={t} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springs.bouncy, delay: 0.05 * i }} whileHover={{ y: -3 }} className="rounded-[20px] border border-line bg-surface p-3 shadow-card">
            <Emoji name={e} size={30} float delay={i * 0.5} />
            <div className="mt-2 text-[13px] font-semibold leading-snug">{t}</div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{d}</div>
          </motion.div>
        ))}
      </div>
      <div className="rounded-[22px] border border-line bg-surface p-1.5 text-[13px] shadow-card">
        <div className="px-2 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Good to read before day one</div>
        {([['Employee handbook', 'books'], ['How we work at Northbeam', 'office'], ['Security basics', 'shield']] as const).map(([t, e]) => (
          <button key={t} type="button" onClick={() => toast(`Opens ${t}`)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left font-medium hover:bg-sunken">
            <Emoji name={e} size={22} />{t}<ExternalLink className="ml-auto h-3 w-3 text-faint" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function SignIn() {
  const { viewer, go } = useNav()
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const first = people[viewer].name.split(' ')[0].toLowerCase()
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-6 py-8">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-accent font-display text-lg font-extrabold text-accent-ink">N</div>
      <div>
        <h1 className="font-display text-2xl font-bold">Sign in to Day One</h1>
        <p className="mt-1 text-[13px] text-muted">Before your first day, use your personal email. On day one you'll switch to your work account and keep everything. <ReqTag ids="E1" /></p>
      </div>
      {!sent ? (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
          <label className="text-xs text-muted" htmlFor="signin-email">Personal email</label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3"><Mail className="h-4 w-4 text-faint" /><input id="signin-email" defaultValue={`${first}@personalmail.example`} className="h-11 flex-1 bg-transparent text-[14px] outline-none" /></div>
          <Button variant="primary" size="md" className="w-full" type="submit">Email me a sign-in link</Button>
        </form>
      ) : (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); toast.success('Signed in'); go({ name: 'home' }) }}>
          <div className="flex items-center gap-2 rounded-xl bg-green-soft px-3 py-2 text-[13px] text-green"><Check className="h-4 w-4" />Link sent. It expires in 15 minutes.</div>
          <label className="text-xs text-muted" htmlFor="signin-code">Then enter the 6-digit code from your authenticator app</label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3"><KeyRound className="h-4 w-4 text-faint" /><input id="signin-code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className="h-11 flex-1 bg-transparent font-mono text-[15px] tracking-[0.3em] outline-none" /></div>
          <Button variant="primary" size="md" className="w-full" type="submit">Sign in</Button>
          <button type="button" onClick={() => toast('Recovery options: backup codes, or the onboarding team can verify you by video.')} className="w-full text-center text-xs text-muted">Lost your device?</button>
        </form>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-faint"><Lock className="h-3 w-3" />Before day one you can't see anything restricted to employees.</p>
      <button type="button" onClick={() => go({ name: 'home' })} className="text-xs text-accent">Back to the demo</button>
    </div>
  )
}

export function Withdrawn() {
  const { viewer } = useNav()
  const v = useView(viewer)!
  return (
    <div className="space-y-3 px-6 py-10 text-center">
      <ShieldCheck className="mx-auto h-8 w-8 text-muted" />
      <h1 className="font-display text-xl font-bold">Your onboarding is closed</h1>
      <p className="text-[13px] text-muted">Thanks for letting us know, {people[viewer].name.split(' ')[0]}. We've stopped all messages and cancelled anything in progress. If you change your mind, reply to Kate Bishop.</p>
      <p className="text-[13px] text-muted">We delete your personal details on <span className="font-medium text-ink">{fmtDay(v.hire.withdrawn! + 30)}</span>, 30 days after you withdrew. Documents in Workday and Checkr follow their own retention rules.</p>
    </div>
  )
}

export function DetailsPage() {
  const { viewer, go } = useNav()
  const v = useView(viewer)!
  const markDone = useDemo((s) => s.markDone)
  const address = useDemo((s) => s.addresses[viewer])
  const p = people[viewer]
  const [first, last] = p.name.split(' ')
  const fields: [string, string, string][] = [
    ['Legal name', p.name, 'Workday · payroll'],
    ['Preferred name', first, 'Everywhere people see you'],
    ['Personal email', `${first.toLowerCase()}@personalmail.example`, 'Day One sign-in until day one'],
    ['Phone', '(312) 555-0142', 'Workday · emergency only'],
    ['Delivery address', address ?? v.hire.laptop.address, 'Firstbase · laptop delivery'],
    ['Pronunciation', `${first.toUpperCase()} ${last}`, 'Your profile'],
  ]
  const step = v.by.details
  return (
    <div className="space-y-3 px-4 pb-6">
      <p className="text-[13px] text-muted">We filled in what we already know from your application. Check it once and we'll use it everywhere it's needed. <ReqTag ids="E4 T4" /></p>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {fields.map(([l, val, used]) => (
          <label key={l} className="block px-3.5 py-2.5">
            <span className="text-xs text-muted">{l}</span>
            <input defaultValue={val} className="mt-0.5 w-full bg-transparent text-[14px] font-medium outline-none" />
            <span className="mt-0.5 block text-[11px] text-faint">Used for: {used}</span>
          </label>
        ))}
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />Your address and your tax and bank details live in Workday. Day One passes changes straight through and keeps no copy.</p>
      <Button variant="primary" size="md" className="w-full" onClick={(e) => { burst('small', e.currentTarget); if (step && step.state !== 'verified') markDone(viewer, 'details', viewer); toast.success('Details confirmed', { description: 'Sent to Workday and Firstbase. You won’t be asked again.' }); go({ name: 'tasks' }) }}>
        {step?.state === 'verified' ? 'Save changes' : 'Confirm details'}
      </Button>
    </div>
  )
}

export function LaptopPage() {
  const { viewer, go } = useNav()
  const v = useView(viewer)!
  const now = useDemo((s) => s.now)
  const markDone = useDemo((s) => s.markDone)
  const model = useDemo((s) => s.laptopModel[viewer] ?? v.hire.laptop.model)
  const address = useDemo((s) => s.addresses[viewer] ?? v.hire.laptop.address)
  const set = useDemo((s) => s.set)
  const laptopModel = useDemo((s) => s.laptopModel)
  const chosen = v.by.laptop_choice?.state === 'verified'
  const arrives = v.by.laptop_deliver?.state === 'verified' ? null : v.by.laptop_deliver?.ver
  const options = ['MacBook Pro 14"', 'MacBook Pro 16"', 'ThinkPad X1 Carbon']
  const [pick, setPick] = useState(model)
  const track = [
    { k: 'laptop_release', l: v.hire.rehire ? 'Reissued' : 'Ordered' },
    { k: 'laptop_prep', l: 'Set up for you' },
    { k: 'laptop_ship', l: 'Shipped' },
    { k: 'laptop_deliver', l: 'Delivered' },
  ]
  return (
    <div className="space-y-3 px-4 pb-6">
      <ReqTag ids="E6" />
      {!chosen ? (
        <>
          <p className="text-[13px] text-muted">These models are approved for your role.</p>
          <div className="space-y-2">
            {options.map((o) => (
              <motion.button key={o} type="button" onClick={() => setPick(o)} whileTap={{ scale: 0.97 }} animate={pick === o ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ duration: 0.3 }} className={cn('flex w-full items-center gap-3 rounded-[20px] border bg-surface p-3 text-left shadow-card transition-colors', pick === o ? 'border-accent ring-2 ring-accent/20' : 'border-line')}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sunken"><Emoji name="laptop" size={28} /></span>
                <div className="flex-1"><div className="font-medium">{o}</div><div className="text-xs text-muted">{o.includes('16') ? 'Larger screen, heavier' : o.includes('ThinkPad') ? 'Windows' : 'Most popular on your team'}</div></div>
                {pick === o && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springs.bouncy} className="grid h-6 w-6 place-items-center rounded-full btn-gradient text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></motion.span>}
              </motion.button>
            ))}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3 text-[13px] shadow-card"><div className="text-xs text-muted">Deliver to</div><div className="font-medium">{address}</div></div>
          <Button variant="primary" size="md" className="w-full" onClick={(e) => { burst('small', e.currentTarget); set({ laptopModel: { ...laptopModel, [viewer]: pick } }); markDone(viewer, 'laptop_choice', viewer); toast.success(`${pick} chosen`, { description: "We'll tell you when it ships." }) }}>Choose {pick}</Button>
        </>
      ) : (
        <>
          <motion.div initial={{ y: 14, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={springs.bouncy} className="relative overflow-hidden rounded-[22px] border border-line bg-surface p-4 shadow-lift">
            <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-accent-soft blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sunken"><Emoji name="laptop" size={40} float /></span>
              <div className="min-w-0"><div className="font-display text-[17px] font-bold leading-tight">{model}</div><div className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{address}</span></div></div>
            </div>
            <div className="relative mt-3"><ShipTracker v={v} inset={false} /></div>
          </motion.div>
          <ol className="space-y-2.5 rounded-[22px] border border-line bg-surface p-3.5 shadow-card">
            {track.map((t) => {
              const s = v.by[t.k]
              if (!s) return null
              const st = s.state === 'verified' ? 'verified' : s.state === 'blank' ? 'blank' : 'prog'
              return (
                <li key={t.k} className="grid grid-cols-[14px_1fr_auto] items-center gap-2.5 text-[13px]">
                  <Glyph state={st} />
                  <span className={cn(st === 'blank' ? 'text-muted' : 'font-medium')}>{t.l}</span>
                  <span className="text-xs text-muted">{s.state === 'verified' ? fmtDay(s.ver!) : s.ver != null ? `around ${fmtDay(s.ver)}` : ''}</span>
                </li>
              )
            })}
          </ol>
          <p className="flex items-start gap-2 px-1 text-xs text-muted"><Emoji name="key" size={18} className="shrink-0" />{arrives != null && arrives >= v.hire.start
            ? `Taking longer than usual: expected ${fmtDay(arrives)}, after your start date. ${people.maria.name.split(' ')[0]} will tell you the plan for day one by ${fmtDay(confirmBy(v.hire.start, now))}.`
            : `Arrives set up and enrolled. On ${fmtWeekdayShort(v.hire.start)} you just sign in.`}</p>
          <AddressChange v={v} address={address} />
        </>
      )}
    </div>
  )
}

/** The new address goes straight to Workday, the system of record. Day One deletes its copy once Workday confirms. */
function AddressChange({ v, address }: { v: HireView; address: string }) {
  const { route, go } = useNav()
  const changeAddress = useDemo((s) => s.changeAddress)
  const [open, setOpen] = useState(route.step === 'address')
  // Opened from chat: take the flag off the route so the next hire on this page doesn't start with the form open.
  useEffect(() => { if (route.step === 'address') go({ name: 'laptop' }) }, [route.step, go])
  const [draft, setDraft] = useState('')
  const shipped = v.by.laptop_ship?.state === 'verified'
  if (!open) return <Button variant="secondary" size="md" className="w-full" onClick={() => setOpen(true)}><MapPin className="h-4 w-4" />Change the delivery address</Button>
  const send = () => {
    changeAddress(v.hire.id, draft.trim(), shipped)
    toast.success('Address updated in Workday', { description: shipped ? 'Your laptop already shipped, so IT will reroute it. Day One kept no copy.' : 'Your laptop order picks it up from there. Day One kept no copy.' })
    setOpen(false)
    setDraft('')
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) send() }} className="space-y-2 rounded-[22px] border border-line bg-surface p-3.5 shadow-card">
      <label className="block text-[13px] font-semibold" htmlFor="new-address">New delivery address</label>
      <input id="new-address" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={address} autoComplete="street-address" className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
      <p className="flex items-start gap-1.5 text-xs text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />Goes straight to Workday, where your address already lives. Day One deletes its copy as soon as Workday confirms.{shipped ? ' Your laptop has shipped, so IT will reroute it.' : ''}</p>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="md" className="flex-1" disabled={!draft.trim()}>Send to Workday</Button>
        <Button type="button" size="md" onClick={() => { setOpen(false); setDraft('') }}>Cancel</Button>
      </div>
    </form>
  )
}
