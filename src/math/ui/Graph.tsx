import { LinePath, Plot } from './Figure'

export interface GLine {
  m: number
  b: number
  label?: string
  /** senkrechte Gerade x = vx */
  vx?: number
}
export interface GPoint {
  x: number
  y: number
  label?: string
}

function niceStep(span: number) {
  const raw = span / 12
  const p = 10 ** Math.floor(Math.log10(raw))
  for (const k of [1, 2, 5, 10]) if (raw <= k * p) return k * p
  return 10 * p
}

/** Ausschnitt so wählen, dass alle Punkte (und der Ursprung) zu sehen sind */
function autoRange(points: GPoint[], fn?: (x: number) => number, xs: number[] = []): { r: [number, number, number, number]; step: number } {
  const px = [0, ...points.map((p) => p.x), ...xs]
  const py = [0, ...points.map((p) => p.y)]
  if (fn) for (const x of xs) py.push(fn(x))
  let x0 = Math.min(...px)
  let x1 = Math.max(...px)
  let y0 = Math.min(...py)
  let y1 = Math.max(...py)
  const span = Math.max(x1 - x0, y1 - y0, 8)
  const step = niceStep(span * 1.25)
  const pad = Math.max(step * 1.5, span * 0.15)
  x0 -= pad
  x1 += pad
  y0 -= pad
  y1 += pad
  // quadratisch halten
  const w = x1 - x0
  const h = y1 - y0
  if (w > h) {
    const c = (y0 + y1) / 2
    y0 = c - w / 2
    y1 = c + w / 2
  } else {
    const c = (x0 + x1) / 2
    x0 = c - h / 2
    x1 = c + h / 2
  }
  const snap = (v: number, dir: 1 | -1) => (dir < 0 ? Math.floor(v / step) * step : Math.ceil(v / step) * step)
  return { r: [snap(x0, -1), snap(x1, 1), snap(y0, -1), snap(y1, 1)], step }
}

export default function Graph({ lines = [], points = [], fn, fnLabel, extraX = [] }: { lines?: GLine[]; points?: GPoint[]; fn?: (x: number) => number; fnLabel?: string; extraX?: number[] }) {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const { r, step } = autoRange(pts, fn, extraX)
  return (
    <div className="graph">
      <Plot range={r} width={360} height={360} step={step}>
        {({ X, Y, r: rr }) => (
          <>
            {fn && (
              <path
                className="plot__curve"
                d={Array.from({ length: 241 }, (_, i) => {
                  const x = rr[0] + ((rr[1] - rr[0]) * i) / 240
                  const y = Math.max(rr[2] - 1000, Math.min(rr[3] + 1000, fn(x)))
                  return `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`
                }).join(' ')}
              />
            )}
            {fn && fnLabel && (
              <text x={X(rr[1]) - 6} y={Y(fn(rr[1] - (rr[1] - rr[0]) * 0.08)) - 8} className="plot__label" textAnchor="end">
                {fnLabel}
              </text>
            )}
            {lines.map((l, i) =>
              l.vx !== undefined ? (
                <line key={i} x1={X(l.vx)} x2={X(l.vx)} y1={Y(rr[2])} y2={Y(rr[3])} className={`plot__line ${i ? 'plot__line--2' : ''}`} />
              ) : (
                <g key={i}>
                  <LinePath m={l.m} b={l.b} X={X} Y={Y} r={rr} className={`plot__line ${i ? 'plot__line--2' : ''}`} />
                  {l.label && (
                    <text x={X(rr[1] - (rr[1] - rr[0]) * 0.05)} y={Y(l.m * (rr[1] - (rr[1] - rr[0]) * 0.05) + l.b) - 8} className="plot__label" textAnchor="end">
                      {l.label}
                    </text>
                  )}
                </g>
              ),
            )}
            {pts.map((p, i) => (
              <g key={`p${i}`}>
                <circle cx={X(p.x)} cy={Y(p.y)} r={4.2} className="plot__pt plot__pt--hot" />
                {p.label && (
                  <text x={X(p.x) + 8} y={Y(p.y) - 8} className="plot__label">
                    {p.label}
                  </text>
                )}
              </g>
            ))}
          </>
        )}
      </Plot>
    </div>
  )
}
