import { HIRES } from '../src/data/hires'
import { deriveHire } from '../src/engine/derive'
import { checkDates } from '../src/engine/startcheck'
import { fmtDay } from '../src/lib/dates'

const now = Number(process.argv[2] ?? 10)
const ctx = { now, setup: 'connected' as const, down: {}, ooo: { bruce: { until: 39, delegate: null } }, forced: [] }
for (const b of HIRES) {
  const h = { ...b, originalStart: b.start, withdrawn: null }
  const v = deriveHire(h, ctx)
  console.log(`\n== ${v.person.name} start ${fmtDay(h.start)} status=${v.status} stage=${v.stage} end=${v.forecastEnd != null ? fmtDay(v.forecastEnd) : 'null'} areas=${v.areas.map(a => a.id + ':' + a.state).join(' ')}`)
  console.log('   balls:', v.balls.slice(0, 4).map(s => `${s.name}[${s.state}] ${s.holder?.name} — ${s.label}`).join(' | '))
  if (process.argv[3] === h.id) for (const s of v.steps) console.log(`   ${s.key.padEnd(16)} ${s.state.padEnd(10)} open=${s.open} due=${s.due} done=${s.done} ver=${s.ver} ${s.label}`)
}
const wanda = HIRES.find(h => h.id === 'wanda')!
console.log('\nWanda dates:', checkDates({ ...wanda, originalStart: wanda.start, withdrawn: null }, ctx).map(d => `${fmtDay(d.day)} ${d.verdict} (${d.reason})`).join('\n  '))
