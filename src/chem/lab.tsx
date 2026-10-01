import { Fragment, useMemo } from 'react'
import { mulberry32 } from '../lib/random'
import { Formula } from './format'
import type { Ppt } from './nachweise'

/* ---------------------------------------------------------------------------
   Reaktionsgleichungen in Kurzschrift: „2 Ag^+ + CrO4^2- → Ag2CrO4↓{rot}“
   --------------------------------------------------------------------------- */

export function Sp({ s }: { s: string }) {
  let rest = s.trim()
  let coef = ''
  let label = ''
  let mark = ''
  let charge = ''
  const c = /^(\d+)\s+(.+)$/.exec(rest)
  if (c) {
    coef = c[1]
    rest = c[2]
  }
  const l = /\{([^}]*)\}$/.exec(rest)
  if (l) {
    label = l[1]
    rest = rest.slice(0, l.index)
  }
  if (/[↓↑]$/.test(rest)) {
    mark = rest.slice(-1)
    rest = rest.slice(0, -1)
  }
  const q = rest.indexOf('^')
  if (q >= 0) {
    charge = rest.slice(q + 1).replace(/-/g, '−')
    rest = rest.slice(0, q)
  }
  return (
    <span className={`sp ${label ? 'sp--l' : ''}`}>
      <span className="sp__f">
        {coef && <span className="sp__c">{coef}</span>}
        <Formula f={rest} charge={charge || undefined} />
        {mark && <span className={`sp__m ${mark === '↓' ? 'is-down' : 'is-up'}`}>{mark}</span>}
      </span>
      {label && <span className="sp__lab">{label}</span>}
    </span>
  )
}

export function Eq({ s }: { s: string }) {
  const sides = s.split(' → ')
  return (
    <span className="eqn">
      {sides.map((side, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="eqn__arrow">→</span>}
          {side.split(' + ').map((sp, j) => (
            <Fragment key={j}>
              {j > 0 && <span className="eqn__plus">+</span>}
              <Sp s={sp} />
            </Fragment>
          ))}
        </Fragment>
      ))}
    </span>
  )
}

/* ---------------------------------------------------------------------------
   Reagenzglas
   --------------------------------------------------------------------------- */

const TOP = 58
const STRAIGHT = 262
const R = 24
const BOTTOM = STRAIGHT + R
const H = BOTTOM - TOP

export type PptMode = 'new' | 'settled' | 'gone' | null

export interface TubeState {
  fill: number
  liquid: string
  ppt: Ppt | null
  pptMode: PptMode
  gas?: boolean
  drops?: boolean
  ring?: string
  heat?: boolean
}

function tubePath(cx: number) {
  return `M${cx - R} ${TOP} V${STRAIGHT} A${R} ${R} 0 0 0 ${cx + R} ${STRAIGHT} V${TOP}`
}

function particles(seed: number, size: Ppt['size']) {
  const rng = mulberry32(seed)
  const n = size === 'fein' ? 90 : 34
  return Array.from({ length: n }, () => {
    const r = size === 'fein' ? 1 + rng() * 1.1 : 2.4 + rng() * 2.6
    const x = -R + 3 + rng() * (2 * R - 6)
    // dichter am Boden
    const depth = Math.pow(rng(), 1.6) * (size === 'fein' ? 18 : 26)
    const yMax = STRAIGHT + Math.sqrt(Math.max(0, R * R - x * x)) - r - 1
    return { x, y: yMax - depth, r, d: rng() * 0.9, fall: 60 + rng() * 90 }
  })
}

export function Tube({ cx, state, id, uid }: { cx: number; state: TubeState; id: string; uid: string }) {
  const { fill, liquid, ppt, pptMode, gas, drops, ring, heat } = state
  const pts = useMemo(() => (ppt ? particles(id.length * 97 + cx, ppt.size) : []), [ppt, id, cx])
  const surface = BOTTOM - fill * H
  const clip = `tube-${uid}`
  const bubbles = useMemo(() => {
    const rng = mulberry32(cx + 11)
    return Array.from({ length: 12 }, () => ({ x: -R + 5 + rng() * (2 * R - 10), r: 1.2 + rng() * 2, d: rng() * 1.6, t: 1 + rng() * 0.8 }))
  }, [cx])
  return (
    <g className="tube">
      <defs>
        <clipPath id={clip}>
          <path d={tubePath(cx) + ' Z'} />
        </clipPath>
      </defs>
      {heat && (
        <g className="tube__heat" transform={`translate(${cx} ${BOTTOM + 6})`}>
          <path d="M0 22 C -9 14 -6 6 0 -2 C 6 6 9 14 0 22 Z" />
        </g>
      )}
      <g clipPath={`url(#${clip})`}>
        <rect className="tube__liquid" x={cx - R} y={TOP} width={2 * R} height={H} style={{ fill: liquid, transform: `translateY(${(1 - fill) * H}px)` }} />
        {fill > 0 && <line className="tube__meniscus" x1={cx - R} x2={cx + R} y1={surface} y2={surface} style={{ transform: `translateY(0)` }} />}
        {ring && <rect className="tube__ring" x={cx - R} y={BOTTOM - 0.24 * H} width={2 * R} height={7} style={{ fill: ring }} />}
        {ppt && pptMode === 'new' && fill > 0 && (
          <rect key={`cloud-${uid}`} className="tube__cloud" x={cx - R} y={surface} width={2 * R} height={BOTTOM - surface} style={{ fill: ppt.color }} />
        )}
        {ppt && (
          <g key={`${uid}-${pptMode}`} className={`tube__ppt is-${pptMode}`}>
            {pts.map((p, i) => (
              <circle
                key={i}
                cx={cx + p.x}
                cy={p.y}
                r={p.r}
                style={{ fill: ppt.color, animationDelay: `${p.d}s`, ['--fall' as string]: `-${fill > 0 ? p.fall : 0}px` }}
              />
            ))}
          </g>
        )}
        {gas && fill > 0 && (
          <g key={`gas-${uid}`} className="tube__gas">
            {bubbles.map((b, i) => (
              <circle key={i} cx={cx + b.x} cy={BOTTOM - 6} r={b.r} style={{ animationDelay: `${b.d}s`, animationDuration: `${b.t}s`, ['--rise' as string]: `-${Math.max(0, BOTTOM - 6 - surface)}px` }} />
            ))}
          </g>
        )}
      </g>
      <path className="tube__glass" d={tubePath(cx)} />
      <path className="tube__lip" d={`M${cx - R - 5} ${TOP} H${cx + R + 5}`} />
      {drops && (
        <g key={`drops-${uid}`} className="tube__pipette">
          <path className="tube__pip" d={`M${cx - 3} 4 h6 v26 l-2 10 h-2 l-2 -10 Z`} />
          <rect className="tube__bulb" x={cx - 6} y={-14} width={12} height={20} rx={6} />
          {[0, 1, 2].map((k) => (
            <ellipse key={k} className="tube__drop" cx={cx} cy={44} rx={2.2} ry={3} style={{ animationDelay: `${0.15 + k * 0.38}s`, ['--to' as string]: `${Math.max(10, surface - 44)}px` }} />
          ))}
        </g>
      )}
    </g>
  )
}

export const TUBE_H = BOTTOM + 34

/* ---------------------------------------------------------------------------
   Bunsenbrenner mit Flammenfärbung
   --------------------------------------------------------------------------- */

export function Burner({ color, stick, cobalt }: { color: string | null; stick?: boolean; cobalt?: boolean }) {
  const colored = color && color !== 'base'
  return (
    <svg className="burner" viewBox="0 0 240 300" role="img" aria-label={colored ? 'gefärbte Flamme' : 'nichtleuchtende Flamme'}>
      <g className="burner__flame" style={{ ['--fc' as string]: colored ? color : 'var(--flame-base)' }}>
        <path className="burner__outer" d="M120 66 C 150 112 156 150 148 176 C 142 194 132 202 120 202 C 108 202 98 194 92 176 C 84 150 90 112 120 66 Z" />
        <path className="burner__inner" d="M120 132 C 131 152 133 172 128 186 C 125 194 115 194 112 186 C 107 172 109 152 120 132 Z" />
      </g>
      <rect className="burner__barrel" x="109" y="200" width="22" height="70" rx="2" />
      <rect className="burner__collar" x="105" y="232" width="30" height="10" rx="2" />
      <path className="burner__foot" d="M84 284 L156 284 L148 270 L92 270 Z" />
      <path className="burner__hose" d="M84 279 C 60 279 46 286 26 286" />
      {stick && (
        <g className="burner__stick">
          <line x1="226" y1="40" x2="134" y2="146" />
          <circle cx="134" cy="146" r="3.2" />
        </g>
      )}
      {cobalt && (
        <g className="burner__glass">
          <rect x="62" y="52" width="116" height="140" rx="6" />
          <text x="70" y="70">Cobaltglas</text>
        </g>
      )}
    </svg>
  )
}
