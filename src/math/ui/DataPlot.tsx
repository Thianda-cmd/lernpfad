import { useId } from 'react'

/**
 * Diagramm für Messwerte: Punkte, Ausgleichsgerade, Kurve, Ablesehilfen.
 * Beide Achsen werden unabhängig skaliert; y optional logarithmisch.
 */

export interface DPPoint {
  x: number
  y: number
  label?: string
  /** std = Messpunkt, sample = gesuchte Probe, muted = ausgegraut */
  kind?: 'std' | 'sample' | 'muted'
}

export interface DPLine {
  m: number
  b: number
  label?: string
}

const W = 440
const ML = 56
const MR = 16
const MT = 14
const MB = 42

function niceStep(span: number, target = 6) {
  if (!(span > 0)) return 1
  const raw = span / target
  const p = 10 ** Math.floor(Math.log10(raw))
  for (const k of [1, 2, 2.5, 5, 10]) if (raw <= k * p) return k * p
  return 10 * p
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const sup = (n: number) => String(n).replace(/./g, (c) => SUP[c] ?? c)

/** Zahl für Achsenbeschriftung: 0,25 · 1 200 · 2·10⁻⁴ */
export function axisNum(v: number) {
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a))
    const m = v / 10 ** e
    const ms = Number(m.toPrecision(3)).toString().replace('.', ',')
    return `${ms === '1' ? '' : ms + '·'}10${sup(e)}`
  }
  return Number(v.toPrecision(6)).toLocaleString('de-DE', { maximumFractionDigits: 6 })
}

function range(vals: number[], includeZero: boolean, given?: [number, number]): [number, number] {
  if (given) return given
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (includeZero) {
    lo = Math.min(lo, 0)
    hi = Math.max(hi, 0)
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1]
  if (hi - lo < 1e-12) {
    const d = Math.abs(hi) * 0.5 || 1
    lo -= d
    hi += d
  }
  const pad = (hi - lo) * 0.06
  if (!(includeZero && lo === 0)) lo -= pad
  hi += pad
  const st = niceStep(hi - lo)
  return [Math.floor(lo / st) * st, Math.ceil(hi / st) * st]
}

export default function DataPlot({
  points = [],
  lines = [],
  fn,
  xLabel = 'x',
  yLabel = 'y',
  logY = false,
  includeZero = true,
  height = 300,
  xRange,
  yRange,
  guides = [],
}: {
  points?: DPPoint[]
  lines?: DPLine[]
  fn?: (x: number) => number
  xLabel?: string
  yLabel?: string
  logY?: boolean
  includeZero?: boolean
  height?: number
  xRange?: [number, number]
  yRange?: [number, number]
  /** gestrichelte Ablesehilfen von den Achsen zum Punkt */
  guides?: { x: number; y: number }[]
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const H = height
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (!logY || p.y > 0))
  const xs = pts.map((p) => p.x)
  for (const g of guides) xs.push(g.x)
  const [x0, x1] = range(xs.length ? xs : [0, 1], includeZero, xRange)
  const ysRaw = pts.map((p) => p.y)
  for (const g of guides) ysRaw.push(g.y)
  for (const l of lines) ysRaw.push(l.m * x0 + l.b, l.m * x1 + l.b)
  if (fn) for (let i = 0; i <= 40; i++) ysRaw.push(fn(x0 + ((x1 - x0) * i) / 40))
  const ys = ysRaw.filter((v) => Number.isFinite(v) && (!logY || v > 0))
  let y0: number
  let y1: number
  if (logY) {
    const ls = ys.map((v) => Math.log10(v))
    ;[y0, y1] = yRange ? [Math.log10(yRange[0]), Math.log10(yRange[1])] : [Math.floor(Math.min(...ls, 0)), Math.ceil(Math.max(...ls, 1))]
    if (y1 - y0 < 1) y1 = y0 + 1
  } else [y0, y1] = range(ys.length ? ys : [0, 1], includeZero, yRange)

  const X = (x: number) => ML + ((x - x0) / (x1 - x0)) * (W - ML - MR)
  const Yv = (y: number) => (logY ? Math.log10(Math.max(y, 1e-300)) : y)
  const Y = (y: number) => H - MB - ((Yv(y) - y0) / (y1 - y0)) * (H - MT - MB)

  const xst = niceStep(x1 - x0)
  const xt: number[] = []
  for (let v = Math.ceil(x0 / xst - 1e-9) * xst; v <= x1 + 1e-9 * Math.abs(xst); v += xst) xt.push(Number(v.toPrecision(10)))
  const yt: number[] = []
  if (logY) for (let e = Math.ceil(y0); e <= y1; e++) yt.push(10 ** e)
  else {
    const yst = niceStep(y1 - y0)
    for (let v = Math.ceil(y0 / yst - 1e-9) * yst; v <= y1 + 1e-9 * Math.abs(yst); v += yst) yt.push(Number(v.toPrecision(10)))
  }
  const clip = `${uid}-clip`
  const curve =
    fn &&
    Array.from({ length: 201 }, (_, i) => {
      const x = x0 + ((x1 - x0) * i) / 200
      const y = fn(x)
      if (!Number.isFinite(y) || (logY && y <= 0)) return ''
      return `${X(x).toFixed(1)},${Math.max(-1000, Math.min(H + 1000, Y(y))).toFixed(1)}`
    })
      .filter(Boolean)
      .map((p, i) => `${i ? 'L' : 'M'}${p}`)
      .join(' ')

  return (
    <div className="graph dplot">
      <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Diagramm ${yLabel} über ${xLabel}`}>
        <defs>
          <clipPath id={clip}>
            <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} />
          </clipPath>
        </defs>
        {xt.map((v) => (
          <line key={`gx${v}`} x1={X(v)} x2={X(v)} y1={MT} y2={H - MB} className="plot__grid" />
        ))}
        {yt.map((v) => (
          <line key={`gy${v}`} x1={ML} x2={W - MR} y1={Y(v)} y2={Y(v)} className="plot__grid" />
        ))}
        <line x1={ML} x2={W - MR} y1={H - MB} y2={H - MB} className="plot__axis" />
        <line x1={ML} x2={ML} y1={MT} y2={H - MB} className="plot__axis" />
        {xt.map((v) => (
          <text key={`tx${v}`} x={X(v)} y={H - MB + 14} className="plot__tick dplot__tick" textAnchor="middle">
            {axisNum(v)}
          </text>
        ))}
        {yt.map((v) => (
          <text key={`ty${v}`} x={ML - 6} y={Y(v) + 3.5} className="plot__tick dplot__tick" textAnchor="end">
            {axisNum(v)}
          </text>
        ))}
        <text x={(ML + W - MR) / 2} y={H - 6} className="dplot__title" textAnchor="middle">
          {xLabel}
        </text>
        <text x={14} y={(MT + H - MB) / 2} className="dplot__title" textAnchor="middle" transform={`rotate(-90 14 ${(MT + H - MB) / 2})`}>
          {yLabel}
        </text>
        <g clipPath={`url(#${clip})`}>
          {guides.map((g, i) => (
            <path key={`g${i}`} d={`M${X(g.x)} ${H - MB} V${Y(g.y)} H${ML}`} className="dplot__guide" />
          ))}
          {curve && <path d={curve} className="plot__curve" />}
          {lines.map((l, i) => (
            <line key={`l${i}`} x1={X(x0)} y1={Y(l.m * x0 + l.b)} x2={X(x1)} y2={Y(l.m * x1 + l.b)} className={`plot__line ${i ? 'plot__line--2' : ''}`} />
          ))}
        </g>
        {lines.map(
          (l, i) =>
            l.label && (
              <text key={`ll${i}`} x={W - MR - 4} y={Y(l.m * (x1 - (x1 - x0) * 0.04) + l.b) - 8} className="plot__label" textAnchor="end">
                {l.label}
              </text>
            ),
        )}
        {pts.map((p, i) =>
          p.kind === 'sample' ? (
            <path key={`p${i}`} d={`M${X(p.x)} ${Y(p.y) - 6} L${X(p.x) + 6} ${Y(p.y)} L${X(p.x)} ${Y(p.y) + 6} L${X(p.x) - 6} ${Y(p.y)} Z`} className="dplot__sample" />
          ) : (
            <circle key={`p${i}`} cx={X(p.x)} cy={Y(p.y)} r={4.2} className={`plot__pt ${p.kind === 'muted' ? 'dplot__muted' : ''}`} />
          ),
        )}
        {pts.map(
          (p, i) =>
            p.label && (
              <text key={`pl${i}`} x={X(p.x) + 8} y={Y(p.y) - 8} className="plot__label">
                {p.label}
              </text>
            ),
        )}
      </svg>
    </div>
  )
}
