import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { leatherTile } from './leather'
import { LOGO_NUCLEOLUS, LOGO_NUCLEUS, LOGO_RING, LOGO_VESICLE } from '../components/Logo'
import './intro.css'

/** Dauer der eigentlichen Animation – erst danach wird die Seite geladen und freigelegt. */
const FINISH_MS = 3750
const FINISH_REDUCED_MS = 900
const EXIT_MS = 1000
const EXIT_REDUCED_MS = 350

const CELL = 128 // Kantenlänge eines Steppkissens (px)
const WORD = 'LernLabor'

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

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

/** Rautenförmig gestepptes Leder, dessen Ziernähte sich nacheinander „nähen“. */
type Panel = { x: number; y: number; w: number; h: number } | null

function Quilt({ w, h, clearR, panel }: { w: number; h: number; clearR: number; panel: Panel }) {
  const cx = w / 2
  const cy = h * 0.46
  const R = Math.hypot(w, h) / 2 + CELL * 2
  const K = Math.ceil(R / CELL)
  const lines = useMemo(() => {
    const out: { d: string; delay: number }[] = []
    for (let k = -K; k <= K; k++) {
      const u = (k + 0.5) * CELL
      // von der Mitte nach außen versetzt, Nährichtung abwechselnd
      const delay = 0.3 + Math.abs(k + 0.5) * 0.075
      const a = k % 2 ? R : -R
      out.push({ d: `M${u},${a} L${u},${-a}`, delay })
      out.push({ d: `M${-a},${u} L${a},${u}`, delay: delay + 0.05 })
    }
    return out
  }, [K, R])
  const t = `translate(${cx} ${cy}) rotate(45)`
  return (
    <svg className="intro__quilt" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <radialGradient id="intro-puff" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.09" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.025" />
          <stop offset="78%" stopColor="#000" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.44" />
        </radialGradient>
        <pattern
          id="intro-cushion"
          width={CELL}
          height={CELL}
          patternUnits="userSpaceOnUse"
          patternTransform={`${t} translate(${-CELL / 2} ${-CELL / 2})`}
        >
          <rect width={CELL} height={CELL} fill="url(#intro-puff)" />
        </pattern>
        {/* glatte Fläche für das Medaillon */}
        <mask id="intro-clear" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <rect width={w} height={h} fill="#fff" />
          <circle cx={cx} cy={cy} r={clearR} fill="#000" />
          {panel && <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx={panel.h / 2} fill="#000" />}
        </mask>
        <mask id="intro-sew" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <g transform={t}>
            {lines.map((l, i) => (
              <path key={i} d={l.d} className="intro__sew" pathLength={1} style={{ animationDelay: `${l.delay}s` } as CSSProperties} />
            ))}
          </g>
        </mask>
      </defs>
      <g mask="url(#intro-clear)">
        <rect width={w} height={h} fill="url(#intro-cushion)" />
        <g transform={t}>
          {lines.map((l, i) => (
            <path key={`g${i}`} d={l.d} className="intro__groove" />
          ))}
          {lines.map((l, i) => (
            <path key={`h${i}`} d={l.d} className="intro__groove-hi" />
          ))}
        </g>
        <g mask="url(#intro-sew)">
          <g transform={t}>
            {lines.map((l, i) => (
              <path key={`s${i}`} d={l.d} className="intro__thread-shadow" />
            ))}
            {lines.map((l, i) => (
              <path key={`t${i}`} d={l.d} className="intro__thread" />
            ))}
          </g>
        </g>
      </g>
      {/* weicher Übergang an der Kante der glatten Fläche */}
      <circle cx={cx} cy={cy} r={clearR} className="intro__clear-edge" />
      {panel && <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx={panel.h / 2} className="intro__clear-edge" />}
    </svg>
  )
}

/** Medaillon mit goldgeprägtem Logo. */
function Medallion({ size }: { size: number }) {
  return (
    <svg className="intro__medallion" width={size} height={size} viewBox="-120 -120 240 240" aria-hidden="true">
      <defs>
        <radialGradient id="intro-disc" cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.04" />
          <stop offset="78%" stopColor="#000" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.42" />
        </radialGradient>
        <linearGradient id="intro-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8d6c3b" />
          <stop offset="32%" stopColor="#d4b67e" />
          <stop offset="50%" stopColor="#efdcab" />
          <stop offset="68%" stopColor="#c5a468" />
          <stop offset="100%" stopColor="#80613a" />
        </linearGradient>
        {/* Lichtband im 48er-Raster des Logos: startet außerhalb und wandert diagonal durch */}
        <linearGradient id="intro-shine" gradientUnits="userSpaceOnUse" x1="-26" y1="-26" x2="-2" y2="-2">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff8e6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="76 76" dur="1.05s" begin="2.5s" fill="freeze" />
        </linearGradient>
        <mask id="intro-hole" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
          <rect width="48" height="48" fill="#fff" />
          <circle {...LOGO_NUCLEOLUS} fill="#000" />
        </mask>
        <mask id="intro-ring-sew" maskUnits="userSpaceOnUse" x="-120" y="-120" width="240" height="240">
          <circle r="101" className="intro__ring-sew" pathLength={1} transform="rotate(-90)" />
        </mask>
      </defs>

      {/* eingeprägte Scheibe */}
      <g className="intro__disc">
        <circle r="92" fill="url(#intro-disc)" />
        <circle r="92" className="intro__disc-edge" />
        <path d="M-80,46 A92,92 0 0 0 80,46" className="intro__disc-light" />
      </g>

      {/* umlaufende Ziernaht */}
      <g mask="url(#intro-ring-sew)">
        <circle r="101" className="intro__thread-shadow intro__thread--ring" />
        <circle r="101" className="intro__thread intro__thread--ring" />
      </g>

      {/* Logo (48er-Raster, zentriert) */}
      <g transform="translate(-60 -60) scale(2.5)">
        <g className="intro__deboss" transform="translate(0 -0.45)">
          <path d={LOGO_RING} className="intro__logo-ring" pathLength={1} strokeWidth={3.4} stroke="#000" />
          <g className="intro__logo-nuc">
            <circle {...LOGO_NUCLEUS} fill="#000" mask="url(#intro-hole)" />
          </g>
        </g>
        <path d={LOGO_RING} className="intro__logo-ring" pathLength={1} strokeWidth={3.4} stroke="url(#intro-gold)" />
        <g className="intro__logo-nuc">
          <circle {...LOGO_NUCLEUS} fill="url(#intro-gold)" mask="url(#intro-hole)" />
        </g>
        <circle {...LOGO_VESICLE} fill="url(#intro-gold)" className="intro__logo-ves" />
        <g className="intro__shine">
          <path d={LOGO_RING} fill="none" strokeWidth={3.4} strokeLinecap="round" stroke="url(#intro-shine)" />
          <circle {...LOGO_NUCLEUS} fill="url(#intro-shine)" mask="url(#intro-hole)" />
          <circle {...LOGO_VESICLE} fill="url(#intro-shine)" />
        </g>
      </g>
    </svg>
  )
}

export default function Intro({ exiting, onFinish, onDone }: { exiting: boolean; onFinish: () => void; onDone: () => void }) {
  const vp = useViewport()
  const tile = useMemo(() => leatherTile({ size: 384, cells: 36 }), [])
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const finished = useRef(false)
  const textRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const medSize = Math.round(Math.min(250, Math.max(176, Math.min(vp.w, vp.h) * 0.3)))

  const finish = () => {
    if (finished.current) return
    finished.current = true
    onFinish()
  }

  // glatte Lederfläche hinter dem Schriftzug (Nähte enden davor)
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const padX = 34
    const padY = 16
    const pw = Math.max(0, Math.min(vp.w - 24, r.width + padX * 2))
    setPanel({ x: (vp.w - pw) / 2, y: r.top - padY, w: pw, h: r.height + padY * 2 })
  }, [vp.w, vp.h, medSize])

  useEffect(() => {
    const t = window.setTimeout(finish, reduced ? FINISH_REDUCED_MS : FINISH_MS)
    const onKey = () => finish()
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!exiting) return
    const t = window.setTimeout(onDone, reduced ? EXIT_REDUCED_MS : EXIT_MS)
    return () => window.clearTimeout(t)
  }, [exiting, onDone, reduced])

  return (
    <div
      className={`intro ${exiting ? 'is-exiting' : ''} ${reduced ? 'is-reduced' : ''}`}
      style={{ ['--med' as string]: `${medSize}px` }}
      onClick={finish}
      role="presentation"
    >
      <div className="intro__surface" style={{ backgroundImage: tile ? `url(${tile})` : undefined }}>
        <Quilt w={vp.w} h={vp.h} clearR={medSize * (112 / 240)} panel={panel} />
      </div>
      <div className="intro__vignette" />
      <div className="intro__lights" />
      <div className="intro__center">
        <div className="intro__med-wrap">
          <Medallion size={medSize} />
        </div>
        <div className="intro__text" ref={textRef}>
          <div className="intro__word" aria-label="LernLabor">
            {WORD.split('').map((c, i) => (
              <span key={i} style={{ animationDelay: `${1.95 + i * 0.055}s` }} className={i >= 4 ? 'is-b' : undefined}>
                {c}
              </span>
            ))}
          </div>
          <div className="intro__rule" />
          <div className="intro__sub">BTA-Ausbildung · Bückeburg</div>
        </div>
      </div>
      <div className="intro__sheen" />
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
