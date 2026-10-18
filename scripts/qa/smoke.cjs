// Smoke test for the Day One demo. Runs against the dev server (npm run dev), so the
// engine modules can be imported straight from Vite and checked next to the screens.
// Usage: npm run smoke            (SMOKE_URL overrides http://localhost:5173/)
const { chromium } = require('playwright')

const URL = process.env.SMOKE_URL || 'http://localhost:5173/'
const failures = []
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`) }

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 960 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))
  await page.goto(URL, { waitUntil: 'networkidle' })
  const reset = () => page.evaluate(() => { window.__demo.getState().reset(); window.__demo.getState().set({ intro: false, split: false }) })
  const show = async (viewer, route) => {
    await page.evaluate(([viewer, route]) => window.__demo.getState().set({ split: false, main: { viewer, route } }), [viewer, route])
    await page.waitForTimeout(500)
    return page.locator('main, body').first().innerText()
  }
  await reset()

  // ---- Engine rules, checked on the same modules the app runs ----
  const engine = await page.evaluate(async () => {
    const sel = await import('/src/engine/selectors.ts')
    const der = await import('/src/engine/derive.ts')
    const msg = await import('/src/engine/messages.ts')
    const { people } = await import('/src/data/people.ts')
    const st = window.__demo.getState()
    const views = sel.selectViews(st)
    const ctx = sel.ctxOf(st)
    const out = { problems: [] }
    const bad = (m) => out.problems.push(m)
    for (const v of Object.values(views)) {
      const n = v.person.name
      if (v.status === 'ontrack' && v.steps.some((s) => s.red && s.def.stage <= 4)) bad(`${n} is "On track" with a late step`)
      for (const s of v.steps) {
        if (s.def.sensitive && s.def.safe) {
          const shown = der.safeName(s, { role: 'manager' }, { action: true })
          if (shown !== s.def.safe.open && shown !== s.def.safe.done) bad(`${n}: ${s.key} shows its private name to a manager`)
        }
        if (/^Opens after/.test(s.label) && /clearance recorded|consent$|permit approved|check ordered/i.test(s.label)) bad(`${n}: "${s.label}" leaks a private step`)
      }
      for (const m of msg.messagesFor(v, ctx, {})) {
        const picked = v.by.buddy?.ver != null && v.by.buddy.ver <= ctx.now
        if (m.template.from === 'buddy' && !picked && (m.status === 'sent' || m.status === 'scheduled')) bad(`${n}: buddy message ${m.status} before a buddy was picked`)
        if (m.template.id === 'manager_welcome') {
          const named = Object.values(people).find((p) => m.body.includes(`${p.name.split(' ')[0]} will be your buddy`))
          if (named && (!picked || named.id !== v.hire.buddyId)) bad(`${n}: manager note names ${named.name} as buddy`)
        }
      }
    }
    out.hal = { status: views.hal.status, contacts: views.hal.by.wd_contacts.label }
    out.ted = views.ted.status
    out.via = der.refName(der.providerRef('firstbase'))
    return out
  })
  check(engine.problems.length === 0, `engine rules hold${engine.problems.length ? ': ' + engine.problems.join('; ') : ''}`)
  check(engine.hal.status === 'behind' && /^Overdue/.test(engine.hal.contacts), `Hal is "Behind" with an overdue task (${engine.hal.status}, ${engine.hal.contacts})`)
  check(engine.ted !== 'ontrack', `Ted is not "On track" (${engine.ted})`)
  check(engine.via === 'IT · via Firstbase', `vendors read under their team (${engine.via})`)

  // ---- Screens: one vocabulary, no setup switch on staff screens ----
  const screens = [
    ['maria', { name: 'command' }], ['maria', { name: 'hire', hireId: 'hal' }], ['maria', { name: 'insights' }],
    ['tony', { name: 'myhires' }], ['tony', { name: 'hire', hireId: 'barry' }], ['kate', { name: 'candidates' }],
    ['shuri', { name: 'queue' }], ['shuri', { name: 'hires' }], ['shuri', { name: 'systems' }], ['wanda', { name: 'home' }],
  ]
  const texts = {}
  for (const [viewer, route] of screens) {
    const t = await show(viewer, route)
    texts[`${viewer}:${route.name}${route.hireId ? ':' + route.hireId : ''}`] = t
    check(!/\bthe ball\b|\bBall\b/.test(t), `${viewer} ${route.name}: no "ball" wording`)
    check(!/Manual-first|Connected setup/.test(t), `${viewer} ${route.name}: no setup switch or setup sentence`)
  }
  check(/waiting on/i.test(texts['maria:command']), 'command center says "Waiting on"')
  check(/Hal Jordan/.test(texts['maria:command']) && /Behind/.test(texts['maria:command']), 'command center opens on problems and shows Hal as Behind')
  check(/Hello done/.test(texts['tony:hire:barry']), 'board card falls back to step states (Barry)')
  check(/Accepted offers/.test(texts['kate:candidates']), 'recruiter nav and title say "Accepted offers"')
  check(/Your start date may move/.test(texts['wanda:home']), 'Wanda sees that her start date may move')
  check(await page.locator('[aria-label$="of your tasks done"]').count() === 1, 'progress ring says "of your tasks"')

  // ---- Withdrawn hire: blank areas, no prep actions, messages stopped ----
  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(7))
  await page.waitForTimeout(1500)
  const withdrawn = await page.evaluate(async () => {
    const sel = await import('/src/engine/selectors.ts')
    const v = Object.values(sel.selectViews(window.__demo.getState())).find((x) => x.status === 'withdrawn')
    return v && { id: v.hire.id, manager: v.hire.managerId, areas: v.areas.map((a) => a.state) }
  })
  check(!!withdrawn && withdrawn.areas.every((a) => a === 'blank'), `withdrawn hire's areas go blank (${withdrawn && withdrawn.areas})`)
  if (withdrawn) {
    const t = await show(withdrawn.manager, { name: 'hire', hireId: withdrawn.id })
    check(/withdrew on/.test(t) && /Stopped: offer withdrawn/.test(t) && !/Waiting on/.test(t), 'manager page for a withdrawn hire shows the stop, not a hand-off')
  }

  // ---- Cover dates, reset toasts ----
  await reset()
  const cover = await show('bruce', { name: 'covering' })
  const until = await page.evaluate(async () => (await import('/src/lib/dates.ts')).fmtDay(39))
  check(cover.includes(until), `cover "Until" defaults to the real leave end (${until})`)
  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(3))
  await page.waitForTimeout(800)
  await reset()
  await page.waitForTimeout(600)
  check(await page.locator('[data-sonner-toast]').count() === 1, 'reset clears old toasts')

  // ---- All eight scenarios run without console errors ----
  await reset()
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
    await page.keyboard.press(String(n))
    await page.waitForTimeout(n === 1 ? 3600 : n === 2 ? 3000 : 900)
    if (n === 4) { const b = page.getByRole('button', { name: 'Confirm new date' }); if (await b.count()) { await b.click(); await page.waitForTimeout(600) } }
    if (n === 5) { await page.keyboard.press('5'); await page.waitForTimeout(500) }
  }
  check(errors.length === 0, `no console errors or warnings${errors.length ? ':\n  ' + [...new Set(errors)].slice(0, 8).join('\n  ') : ''}`)

  await browser.close()
  console.log(failures.length ? `\n${failures.length} failed` : '\nAll smoke checks passed')
  process.exit(failures.length ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
