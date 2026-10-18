# Project Day One

A clickable demo of an onboarding platform built around one promise: every new hire starts ready, and knows what happens next.

It's a working model, not a static mockup: status is calculated from events, so scenarios can run in any order and every view updates. There are no real connections, data or AI calls. Everyone in it is a fictional character, and Northbeam is a fictional company.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static build in dist/
npm run artifact     # one self-contained HTML file in dist-single/
```

## Presenting

The demo opens on a cover. Press `Enter` (or a scenario number) to start. The **1** logo in the presenter bar brings the cover back.

| Key | Does |
| --- | --- |
| `Enter` | Leave the cover |
| `1`–`8` | Run a scenario (listed below) |
| `[` `]` | Move the demo clock back or forward a day |
| `\` | Switch between split view and single view |
| `U` | Show the live event log ("under the hood") |
| `T` | Show requirement IDs from the brief on screen |
| `.` | Hide the presenter bar |
| `Shift+R` | Reset everything |
| `⌘K` / `Ctrl+K` | Jump to any screen, person, hire or scenario |

The bar at the top also switches between a **connected** setup (systems report progress) and a **manual-first** setup (owners mark steps done, with the date they happened). The speaker icon turns on small synthesized sound effects (off by default).

In the new-hire app, "Mark done" is press-and-hold: a fill sweeps across, then confetti. A quick tap shows a "Press and hold" hint. Enter or Space completes it straight away from the keyboard.

### Scenarios

1. **Workday round trip** (Virgil Hawkins): a task is marked done, waits to be confirmed, then turns green.
2. **Clearance opens the gate** (Virgil): the background check finishes and IT and People Systems can start.
3. **Laptop backordered** (Hal Jordan): the start date is forecast to be at risk, with suggested fixes.
4. **Start date moves** (Wanda Maximoff): preview the impact, confirm, and watch tasks and messages re-plan.
5. **Checkr goes down**: affected checks show "can't check right now", never green. Press again to restore.
6. **Duplicate offer event** (Peter Parker): recognised and ignored.
7. **Hire withdraws** (Wade Wilson): messages stop and owners get cancellations.
8. **Manager on leave** (Ted Kord): Lucius Fox takes over Bruce Wayne's tasks.

## How it's built

- **React 18, TypeScript, Vite, Tailwind**, with Radix primitives, cmdk, Sonner and Lucide.
- **Motion** ([framer-motion](https://motion.dev)) for springs, shared-element moves (cards fly between queue columns and task lists), page transitions and the tab and nav pills. `src/ui/motion.tsx` holds the shared vocabulary: `springs`, `Tilt`, `PageTransition`, `Segmented`, `Num`, `Reveal`.
- **[NumberFlow](https://number-flow.barvian.me)** rolls counters to new values. **[canvas-confetti](https://github.com/catdad/canvas-confetti)** celebrates moments worth one (`src/ui/fx.ts`), and respects reduced motion.
- **Assets** (`src/ui/assets.tsx`): [Fluent Emoji 3D](https://github.com/microsoft/fluentui-emoji) (Microsoft, MIT) bundled as PNGs, and [DiceBear](https://www.dicebear.com) "Notionists" avatars (CC0) generated locally from each name. Nothing is fetched at runtime except Google Fonts.
- `src/engine/simulate.ts` projects every step for a hire (when it opens, is due, is done, is confirmed). The past and the forecast come from the same projection, so they always agree.
- `src/engine/derive.ts` turns that into status: blank until a step opens, yellow when it's due, red when it's about to be late or late, green when confirmed. It also works out who has the ball, the readiness areas, and the start-date forecast.
- `src/engine/store.ts` holds the clock, scenarios and every action. `src/engine/scenarios.ts` defines the eight scenarios.
- `src/data/` holds the cast, the journey, the hires, messages, welcome boards and example history. Swap the cast or the company here.
- Brand colors live in `src/index.css` (`--accent` and friends). The demo is light-only by design; dark tokens remain in the file if you want them back.

## Systems map

People Systems → **Systems** opens on a live map (`src/staff/team/SystemsMap.tsx`). Day One is the hub; Greenhouse, Workday, Checkr and Atlas Immigration feed in on the left, fulfilment systems sit on the right, and new hires and teams sit above and below.

- Line style shows how each system is wired: live API, linked (a person confirms), or manual (the owner marks it done). The Connected / Manual-first switch rewires the map.
- Every event in the demo's log fires a packet along its connection, coloured by outcome, with a label. Live connections also carry a quiet heartbeat.
- When a system goes down (scenario 5, or "Simulate an outage"), its node turns red, the heartbeat stops and retries fail halfway, while "Can't check right now" counts up.
- Below 760px wide (for example inside split view) the map switches to a stacked layout feeding a central spine.

## The assistant

Answers are scripted (`src/assistant/engine.ts`) and started from suggested questions. `src/assistant/providers.ts` has a switched-off slot for a small model on Cloudflare Workers AI, with the same permission rules. Nothing is connected.
