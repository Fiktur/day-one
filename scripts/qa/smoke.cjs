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
      if (v.status === 'ontrack' && v.steps.some((s) => s.state === 'late' && s.def.stage <= 4)) bad(`${n} is "On track" with a late step`)
      for (const s of v.steps) {
        if (s.def.sensitive && s.def.safe) {
          const shown = der.safeName(s, { role: 'manager' }, { action: true })
          if (shown !== s.def.safe.open && shown !== s.def.safe.done) bad(`${n}: ${s.key} shows its private name to a manager`)
        }
        if (/^Opens after/.test(s.label) && /clearance recorded|consent$|permit approved|check ordered/i.test(s.label)) bad(`${n}: "${s.label}" leaks a private step`)
      }
      for (const m of msg.messagesFor(v, ctx, {})) {
        const picked = v.by.buddy?.ver != null && v.by.buddy.ver <= ctx.now
        if (m.template.from === 'buddy' && !picked && (m.status === 'sent' || m.status === 'scheduled' || m.fromId)) bad(`${n}: buddy message ${m.status} from ${m.from} before a buddy was picked`)
        if (m.template.id === 'manager_welcome') {
          const named = Object.values(people).find((p) => m.body.includes(`${p.name.split(' ')[0]} will be your buddy`))
          if (named && (!picked || named.id !== v.hire.buddyId)) bad(`${n}: manager note names ${named.name} as buddy`)
        }
      }
    }
    // Across the weeks before the starts: "Behind" only with something overdue, "At risk" only when the forecast misses the date, and the stage never slides back.
    const last = {}
    for (let day = 10; day <= 27; day++) {
      st.setNow(day)
      for (const v of Object.values(sel.selectViews(window.__demo.getState()))) {
        if (v.status === 'withdrawn' || day >= v.hire.start) continue
        if (v.status === 'behind' && !v.steps.some((s) => s.red && (s.state === 'late' || /^Delayed/.test(s.label) || s.ownerAway || s.state === 'confirming'))) bad(`${v.person.name} is "Behind" on day ${day} with nothing overdue`)
        if (v.status === 'atrisk' && v.forecastEnd != null && v.forecastEnd < v.hire.start) bad(`${v.person.name} is "At risk" on day ${day} though the forecast lands before the start`)
        if (last[v.hire.id] != null && v.stage < last[v.hire.id]) bad(`${v.person.name}'s stage goes back on day ${day}`)
        last[v.hire.id] = v.stage
      }
    }
    st.setNow(10)
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
    ['shuri', { name: 'queue' }], ['shuri', { name: 'hires' }], ['monica', { name: 'hires' }], ['shuri', { name: 'systems' }], ['wanda', { name: 'home' }],
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
  check(/Wanda Maximoff/.test(texts['monica:hires']), "Immigration's Hires tab shows Wanda, whose permit is with their vendor")
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

  // ---- PR 2: every stated problem has its button ----
  const state = () => page.evaluate(() => { const s = window.__demo.getState(); return { buddies: s.buddies, claims: s.claims, nudges: s.nudges.length, plans: Object.keys(s.plans), log: s.log.slice(0, 5).map((l) => l.event) } })
  const views = (fn) => page.evaluate(async (src) => {
    const sel = await import('/src/engine/selectors.ts')
    const msg = await import('/src/engine/messages.ts')
    const st = window.__demo.getState()
    return new Function('views', 'messagesFor', 'ctx', `return (${src})(views, messagesFor, ctx)`)(sel.selectViews(st), msg.messagesFor, sel.ctxOf(st))
  }, fn.toString())

  await reset()
  await show('tony', { name: 'myhires' })
  await page.getByRole('button', { name: 'Pick a buddy', exact: true }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Pick$/ }).first().click()
  await page.waitForTimeout(600)
  const picked = await state()
  const hireWithBuddy = Object.keys(picked.buddies)[0]
  const buddyMsg = hireWithBuddy && await views(new Function('id', `return (views, messagesFor, ctx) => { const v = views['${hireWithBuddy}']; const m = messagesFor(v, ctx, {}).find((x) => x.template.id === 'buddy'); return { step: v.by.buddy.state, status: m.status, fromId: m.fromId } }`)())
  check(!!buddyMsg && buddyMsg.step === 'verified' && buddyMsg.fromId === picked.buddies[hireWithBuddy] && buddyMsg.status !== 'waiting', `buddy picker records the buddy and schedules their message (${JSON.stringify(buddyMsg)})`)

  await page.evaluate(() => window.__demo.getState().setNow(20))
  await show('tony', { name: 'hire', hireId: 'virgil' })
  const plan = page.getByRole('button', { name: 'Write the plan', exact: true })
  if (await plan.count()) { await plan.click(); await page.waitForTimeout(300); await page.getByRole('button', { name: 'Save plan' }).click(); await page.waitForTimeout(400) }
  check((await state()).plans.includes('virgil'), 'first-week plan saves and completes the step')
  const fw = await show('virgil', { name: 'firstweek' })
  check(/First 1:1 with Tony/.test(fw), "the hire's First week page shows the plan")

  await reset()
  await show('shuri', { name: 'queue' })
  await page.getByRole('button', { name: 'Take it', exact: true }).first().click()
  await page.waitForTimeout(300)
  check(Object.values((await state()).claims).includes('shuri'), '"Take it" claims a team step')

  await show('maria', { name: 'hire', hireId: 'hal' })
  const nudge = page.getByRole('button', { name: /^Nudge / }).first()
  const before = (await state()).nudges
  if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300) }
  const after = await state()
  check(after.nudges === before + 1 && after.log.includes('nudge.sent'), 'Nudge from the hire record lands in the log')

  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(3))
  await page.waitForTimeout(1500)
  const lane = await show('shuri', { name: 'queue' })
  check(/Waiting on your vendor/.test(lane) && /Chase Firstbase/.test(lane), "IT's queue shows Hal's backorder in the vendor lane with Chase")

  await reset()
  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(5))
  await page.waitForTimeout(1500)
  const cmd = await show('maria', { name: 'command' })
  check(/isn't responding/.test(cmd) && /Notify \d manager/.test(cmd), 'Command center shows an incident card with Notify while Checkr is down')
  const rec = await show('maria', { name: 'hire', hireId: 'virgil' })
  check(/What’s next/.test(rec), 'hire record opens on "What’s next"')

  await reset()
  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(7))
  await page.waitForTimeout(1500)
  const gone = await page.evaluate(async () => Object.values((await import('/src/engine/selectors.ts')).selectViews(window.__demo.getState())).find((v) => v.status === 'withdrawn')?.hire.id)
  check(!!gone && /We delete your personal details on/.test(await show(gone, { name: 'home' })), 'withdrawn hire is told when their details are deleted')

  // ---- PR 3: notifications instead of logging in, desktop layout, search ----
  await reset()
  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(3))
  await page.waitForTimeout(1500)
  await show('maria', { name: 'command' })
  await page.keyboard.press('o')
  await page.waitForTimeout(600)
  const outbox = page.locator('aside[aria-label="Outbox"]')
  check(/Chase Firstbase/.test(await outbox.innerText()), 'Outbox shows a Chase ping for the backordered laptop')
  const take = outbox.getByRole('button', { name: 'Take it', exact: true }).first()
  const claimsBefore = Object.keys((await state()).claims).length
  if (await take.count()) { await take.click(); await page.waitForTimeout(400) }
  check(Object.keys((await state()).claims).length === claimsBefore + 1, '"Take it" in a ping claims the step without opening the app')
  await page.keyboard.press('o')

  await page.setViewportSize({ width: 1280, height: 900 })
  await show('virgil', { name: 'home' })
  await page.getByText('Desktop', { exact: true }).first().click()
  await page.waitForTimeout(800)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(overflow <= 0 && /your people/i.test(await page.locator('body').innerText()), `desktop hire layout fits 1280px with two columns (overflow ${overflow}px)`)
  await page.getByText('Phone', { exact: true }).first().click()
  await page.setViewportSize({ width: 1600, height: 960 })

  await page.keyboard.press('Control+k')
  await page.waitForTimeout(300)
  await page.keyboard.type('laptop')
  await page.waitForTimeout(300)
  const stepHits = await page.locator('[cmdk-group-heading]:has-text("Steps")').count()
  await page.locator('[cmdk-group]:has([cmdk-group-heading]:has-text("Steps")) [cmdk-item]').first().click()
  await page.waitForTimeout(500)
  const landed = await page.evaluate(() => window.__demo.getState().main.route)
  check(stepHits === 1 && !!landed.step, `⌘K "laptop" finds steps and opens one (${JSON.stringify(landed)})`)

  await show('maria', { name: 'insights' })
  await page.getByRole('button', { name: /^Assign to / }).first().click()
  await page.waitForTimeout(300)
  check((await page.evaluate(() => window.__demo.getState().assignments.length)) === 1, 'Insights suggestion can be assigned')

  await show('diana', { name: 'startcheck' })
  const propose = page.getByRole('button', { name: /^Propose / }).first()
  if (await propose.count()) { await propose.click(); await page.waitForTimeout(300) }
  check(await page.evaluate(() => window.__demo.getState().nudges.some((n) => n.key.startsWith('start:'))), 'a manager can propose the earliest safe start to Maria')

  // ---- Rescore fixes: need-to-know, quiet Outbox, honest outage pings ----
  await reset()
  await show('shuri', { name: 'queue' })
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(300)
  await page.keyboard.type('permit')
  await page.waitForTimeout(300)
  const leak = await page.locator('[cmdk-group]:has([cmdk-group-heading]:has-text("Steps"))').innerText().catch(() => '')
  await page.keyboard.press('Escape')
  check(!/work permit/i.test(leak), `⌘K as IT doesn't show another team's work permit step${leak ? ` (${leak.slice(0, 80)})` : ''}`)

  const asst = await page.evaluate(async () => (await import('/src/assistant/engine.ts')).respond('carol', 'Is Virgil on track?').text)
  check(/isn't one of your hires/.test(asst), `the assistant won't tell a manager about someone else's hire ("${asst.slice(0, 60)}")`)

  const pingsTo = (to) => page.evaluate(async (to) => {
    const sel = await import('/src/engine/selectors.ts')
    const { pingsFor } = await import('/src/engine/pings.ts')
    const st = window.__demo.getState()
    return pingsFor(sel.selectViews(st), st, sel.ctxOf(st)).filter((p) => p.to === to).map((p) => `${p.kind}:${p.title}`)
  }, to)
  check((await pingsTo('bruce')).length === 0, 'an out-of-office manager with no cover gets no pings')

  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(5))
  await page.waitForTimeout(800)
  await page.evaluate(async () => (await import('/src/staff/program/Incident.tsx')).notifyManagers('checkr', 'maria'))
  const told = await pingsTo('tony')
  check(told.length > 0 && told.every((t) => t.startsWith('fyi:')) && told.filter((t) => /Checkr/.test(t)).length === 1, `outage notice reaches a manager as one FYI, not a to-do per step (${told.join(' | ')})`)
  await page.evaluate(async () => (await import('/src/engine/scenarios.ts')).runScenario(5))

  const jen = await show('jennifer', { name: 'hire', hireId: 'virgil' })
  check(!/Messages/.test(jen.split('What’s next')[1] ?? '') && !/Activity/.test(jen.split('What’s next')[1] ?? ''), 'Background screening sees no messages or activity on a hire record')

  // ---- Address changes go through Workday; Day One keeps no copy and the chat never invents one ----
  await reset()
  const chat = await page.evaluate(async () => { const r = (await import('/src/assistant/engine.ts')).respond('virgil', 'Change my laptop delivery address'); return { text: r.text, addr: window.__demo.getState().addresses.virgil ?? null } })
  check(chat.addr === null && /form/.test(chat.text), `the assistant points to the address form instead of changing it ("${chat.text.slice(0, 50)}")`)
  await page.evaluate(() => window.__demo.getState().setNow(16))
  await show('virgil', { name: 'laptop', step: 'address' })
  await page.locator('#new-address').fill('500 W Madison St, Chicago, IL')
  await page.getByRole('button', { name: 'Send to Workday' }).click()
  await page.waitForTimeout(400)
  const addr = await page.evaluate(() => { const s = window.__demo.getState(); return { a: s.addresses.virgil, log: s.log.slice(0, 4).map((l) => `${l.system}:${l.event}`) } })
  check(addr.a === '500 W Madison St, Chicago, IL' && addr.log.includes('workday:address.updated') && addr.log.includes('day one:address.deleted'), `address goes to Workday and Day One deletes its copy (${addr.log.join(', ')})`)

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
