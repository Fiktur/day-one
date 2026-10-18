import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useDemo } from './engine/store'

// Handy for automated checks in development; not part of the demo itself.
if (import.meta.env.DEV) (window as unknown as { __demo: typeof useDemo }).__demo = useDemo

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
