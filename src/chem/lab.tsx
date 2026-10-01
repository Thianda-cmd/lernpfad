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
   Uhrglas (z. B. Carbonat mit Schwefelsäure)
   Glas: quadratische Kurve von (30|212) über (120|268) nach (210|212), tiefster Punkt y = 240
   --------------------------------------------------------------------------- */

export interface DishState {
  solid: number
  fill: number
  liquid: string
  gas?: boolean
  drops?: boolean
}

const GLASS = 'M30 212 Q120 268 210 212'

export function Dish({ state, uid }: { state: DishState; uid: string }) {
  const { solid, fill, liquid, gas, drops } = state
  const clip = `dish-${uid}`
  const level = 240 - fill * 22
  const fizz = useMemo(() => {
    const rng = mulberry32(5)
    return Array.from({ length: 16 }, () => ({ x: 120 + (rng() - 0.5) * 70, r: 1 + rng() * 1.8, d: rng() * 1.4, t: 0.7 + rng() * 0.6 }))
  }, [])
  const grains = useMemo(() => {
    const rng = mulberry32(9)
    return Array.from({ length: 14 }, () => ({ x: 120 + (rng() - 0.5) * 40, y: 236 - rng() * 8, r: 0.8 + rng() * 1.2 }))
  }, [])
  return (
    <g className="dish">
      <defs>
        <clipPath id={clip}>
          <path d={GLASS + ' Z'} />
        </clipPath>
      </defs>
      <rect className="dish__tile" x="14" y="242" width="212" height="12" rx="3" />
      <g clipPath={`url(#${clip})`}>
        <rect className="dish__liquid" x="30" y="212" width="180" height="30" style={{ fill: liquid, transform: `translateY(${(1 - fill) * 30}px)` }} />
        <g className="dish__solid" style={{ transform: `scale(${solid})` }}>
          <path d="M92 241 Q120 214 148 241 Z" />
          {grains.map((g, i) => (
            <circle key={i} cx={g.x} cy={g.y} r={g.r} />
          ))}
        </g>
        {gas && fill > 0 && (
          <g key={`fizz-${uid}`} className="dish__fizz">
            {fizz.map((b, i) => (
              <circle key={i} cx={b.x} cy={level + 1} r={b.r} style={{ animationDelay: `${b.d}s`, animationDuration: `${b.t}s` }} />
            ))}
          </g>
        )}
      </g>
      <path className="dish__glass" d={GLASS} />
      <path className="dish__shine" d="M52 222 Q86 240 108 243" />
      {gas && fill > 0 && (
        <g key={`co2-${uid}`} className="dish__co2">
          {[0, 1, 2, 3].map((k) => (
            <text key={k} x={98 + k * 15} y={222} style={{ animationDelay: `${k * 0.55}s` }}>
              CO₂
            </text>
          ))}
        </g>
      )}
      {drops && (
        <g key={`drops-${uid}`} className="tube__pipette">
          <path className="tube__pip" d="M117 140 h6 v34 l-2 10 h-2 l-2 -10 Z" />
          <rect className="tube__bulb" x={114} y={120} width={12} height={22} rx={6} />
          {[0, 1, 2].map((k) => (
            <ellipse key={k} className="tube__drop" cx={120} cy={188} rx={2.2} ry={3} style={{ animationDelay: `${0.15 + k * 0.38}s`, ['--to' as string]: `${level - 190}px` }} />
          ))}
        </g>
      )}
      <text className="dish__label" x="120" y="272">
        Uhrglas
      </text>
    </g>
  )
}

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
