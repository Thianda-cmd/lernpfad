import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { startIntro, T, type IntroHandle, type Stage } from './engine'
import './intro.css'

const EXIT_MS = T.exit
const EXIT_REDUCED_MS = 350

export const INTRO_KEY = 'lernlabor-intro'

export function introEnabled() {
  try {
    return localStorage.getItem(INTRO_KEY) !== 'aus'
  } catch {
    return true
  }
}

export function setIntroEnabled(on: boolean) {
  try {
    localStorage.setItem(INTRO_KEY, on ? 'an' : 'aus')
  } catch {
    /* ignorieren */
  }
}

/** Bildunterschriften der drei Stationen */
const CAPTIONS: { id: Stage; k: string; f: ReactNode }[] = [
  { id: 'chem', k: 'Schalenmodell', f: <>Natrium · 2 · 8 · 1</> },
  {
    id: 'ion',
    k: 'Ionisierung',
    f: (
      <>
        Na → Na<sup>+</sup> + e<sup>−</sup>
      </>
    ),
  },
  {
    id: 'math',
    k: 'Funktion',
    f: (
      <>
        <i>f</i>(<i>x</i>) = <i>x</i>
        <sup>2</sup> − 2<i>x</i> − 3
      </>
    ),
  },
  {
    id: 'roots',
    k: 'Nullstellen',
    f: (
      <>
        <i>x</i>
        <sub>1</sub> = −1 · <i>x</i>
        <sub>2</sub> = 3
      </>
    ),
  },
  { id: 'bio', k: 'Doppelhelix', f: <>A – T · G – C</> },
]

const STATIONS = ['Chemie', 'Mathematik', 'Biologie']

function stationOf(s: Stage) {
  if (s === 'chem' || s === 'ion') return 0
  if (s === 'math' || s === 'roots') return 1
  if (s === 'bio') return 2
  if (s === 'logo') return 3
  return -1
}

const WORD = [
  { t: 'Lern', em: false },
  { t: 'pfad', em: true },
]

export default function Intro({ exiting, onFinish, onDone }: { exiting: boolean; onFinish: () => void; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = useRef<IntroHandle | null>(null)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const [stage, setStage] = useState<Stage>(reduced ? 'logo' : 'start')
  const finished = useRef(false)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onFinish()
  }, [onFinish])

  useEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root) return
    finished.current = false
    const eng = startIntro({ canvas, root, reduced, onStage: setStage, onFinish: finish })
    engine.current = eng
    const onKey = () => finish()
    window.addEventListener('keydown', onKey)
    // falls requestAnimationFrame gedrosselt wird (Tab im Hintergrund)
    const fallback = window.setTimeout(finish, T.finish + 3000)
    return () => {
      eng.destroy()
      engine.current = null
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(fallback)
    }
  }, [reduced, finish])

  useEffect(() => {
    if (!exiting) return
    engine.current?.exit()
    const t = window.setTimeout(onDone, reduced ? EXIT_REDUCED_MS : EXIT_MS)
    return () => window.clearTimeout(t)
  }, [exiting, onDone, reduced])

  const st = stationOf(stage)
  let letter = 0
  return (
    <div
      ref={rootRef}
      className={`intro ${exiting ? 'is-exiting' : ''} ${reduced ? 'is-reduced' : ''} ${stage === 'logo' ? 'is-logo' : ''}`}
      onClick={finish}
      role="presentation"
    >
      <canvas ref={canvasRef} className="intro__canvas" aria-hidden="true" />

      <div className="intro__caps" aria-hidden="true">
        {CAPTIONS.map((c) => (
          <div key={c.id} className={`intro__cap ${stage === c.id ? 'is-on' : ''}`}>
            <span className="intro__k">{c.k}</span>
            <span className="intro__f">{c.f}</span>
          </div>
        ))}
      </div>

      <div className="intro__brand">
        <div className="intro__word" aria-label="Lernpfad">
          {WORD.map((part) => (
            <span key={part.t} className={part.em ? 'intro__em' : undefined}>
              {part.t.split('').map((ch) => (
                <span key={letter} className="intro__ch" style={{ '--i': letter++ } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </div>
        <div className="intro__sub">Werkzeuge für die BTA-Ausbildung</div>
      </div>

      <div className="intro__path" style={{ '--p': Math.max(0, Math.min(2, st)) / 2 } as CSSProperties} aria-hidden="true">
        <div className="intro__track">
          <span className="intro__fill" />
        </div>
        {STATIONS.map((s, i) => (
          <span key={s} className={`intro__stop ${st >= i ? 'is-done' : ''} ${st === i ? 'is-on' : ''}`} style={{ '--x': i / 2 } as CSSProperties}>
            <i />
            {s}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="intro__skip"
        onClick={(e) => {
          e.stopPropagation()
          finish()
        }}
      >
        Überspringen
      </button>
    </div>
  )
}
