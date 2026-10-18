import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { MotionConfig } from 'framer-motion'
import * as Tip from '@radix-ui/react-tooltip'
import { useDemo } from './engine/store'
import { runScenario } from './engine/scenarios'
import { PresenterBar, ScenarioCaption, ShowBarButton } from './presenter/PresenterBar'
import { MainView, SplitView } from './presenter/Panes'
import { UnderTheHood } from './presenter/UnderTheHood'
import { CommandPalette } from './presenter/CommandPalette'
import { ChangeDateDialog } from './presenter/ChangeDateDialog'
import { Intro } from './presenter/Intro'
import { clearChats } from './assistant/AssistantPanel'
import { useNarrow } from './lib/cn'

// "System" follows the host's explicit choice (data-theme on the root) and then the OS setting.
function useTheme() {
  const theme = useDemo((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const host = root.getAttribute('data-theme')
      const dark = theme === 'dark' || (theme === 'system' && (host ? host === 'dark' : mq.matches))
      root.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    const obs = new MutationObserver(apply)
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { mq.removeEventListener('change', apply); obs.disconnect() }
  }, [theme])
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useDemo.getState()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        s.set({ palette: !s.palette, intro: false })
        return
      }
      const t = e.target as HTMLElement
      const typing = t && ((t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if (typing) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (s.dialog || s.palette) return
      // On the cover only the scenario keys (and Enter, handled by the cover) do anything.
      if (s.intro && !/^[1-8]$/.test(e.key)) return
      if (/^[1-8]$/.test(e.key)) { if (s.intro) s.set({ intro: false }); runScenario(Number(e.key)) }
      else if (e.key === '[') { e.preventDefault(); s.shiftNow(-1) }
      else if (e.key === ']') { e.preventDefault(); s.shiftNow(1) }
      else if (e.key === '\\') s.setSplit(!s.split)
      else if (e.key === 'u') s.set({ underHood: !s.underHood })
      else if (e.key === 't') s.set({ tags: !s.tags })
      else if (e.key === '.') s.set({ presenterHidden: !s.presenterHidden })
      else if (e.key === 'R' && e.shiftKey) { s.reset(); clearChats() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  useTheme()
  useShortcuts()
  const narrow = useNarrow(1280)
  const split = useDemo((s) => s.split) && !narrow
  const hidden = useDemo((s) => s.presenterHidden)
  const theme = useDemo((s) => s.theme)
  const hood = useDemo((s) => s.underHood)
  return (
    <MotionConfig reducedMotion="user">
    <Tip.Provider delayDuration={250}>
      <div className="dawn" aria-hidden><i /></div>
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {!hidden && <div className="relative z-40 shrink-0 px-3 pb-1 pt-2.5"><PresenterBar /><ScenarioCaption /></div>}
        {hidden && <ShowBarButton />}
        <div className="min-h-0 flex-1">{split ? <SplitView /> : <MainView />}</div>
      </div>
      <Intro />
      <UnderTheHood />
      <CommandPalette />
      <ChangeDateDialog />
      <Toaster position={hood ? 'top-center' : 'bottom-right'} offset={hood ? 76 : 16} richColors closeButton theme={theme === 'system' ? 'system' : theme} toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </Tip.Provider>
    </MotionConfig>
  )
}
