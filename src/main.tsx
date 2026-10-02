import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles/global.css'
import './styles/pages.css'
import './styles/cell.css'
import './lib/theme'
import App from './App'
import Intro, { introEnabled } from './intro/Intro'
import { startProgressSync } from './auth/sync'

// Angemeldet mit Blob: Lernfortschritt im Blob-Konto speichern und von dort holen
startProgressSync()

type Phase = 'intro' | 'exit' | 'done'

/** Zeigt zuerst die Start-Animation; die Seite wird erst eingesetzt, wenn sie fertig ist. */
function Root() {
  const [phase, setPhase] = useState<Phase>(() => (introEnabled() ? 'intro' : 'done'))
  const onFinish = useCallback(() => setPhase('exit'), [])
  const onDone = useCallback(() => {
    document.documentElement.classList.remove('intro-pending')
    setPhase('done')
  }, [])

  return (
    <>
      {phase !== 'intro' && (
        <div className={phase === 'exit' ? 'app-reveal' : undefined}>
          <App />
        </div>
      )}
      {phase !== 'done' && <Intro exiting={phase === 'exit'} onFinish={onFinish} onDone={onDone} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
