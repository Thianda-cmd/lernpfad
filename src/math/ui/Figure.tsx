import { useId, type ReactNode } from 'react'
import type { Figure as Fig } from '../types'
import { fmt } from '../num'

interface PlotProps {
  range?: [number, number, number, number]
  width?: number
  height?: number
  children?: (map: { X: (x: number) => number; Y: (y: number) => number; r: [number, number, number, number] }) => ReactNode
  className?: string
  step?: number
}

/** Leeres Koordinatensystem mit Kästchengitter, Achsen und Beschriftung. */
export function Plot({ range = [-8, 8, -8, 8], width = 360, height = 360, children, className, step = 1 }: PlotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [x0, x1, y0, y1] = range
  const pad = 18
  const W = width
  const H = height
  const X = (x: number) => pad + ((x - x0) / (x1 - x0)) * (W - 2 * pad)
  const Y = (y: number) => H - pad - ((y - y0) / (y1 - y0)) * (H - 2 * pad)
  const xs: number[] = []
  for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step) xs.push(Math.round(x * 1000) / 1000)
  const ys: number[] = []
  for (let y = Math.ceil(y0 / step) * step; y <= y1 + 1e-9; y += step) ys.push(Math.round(y * 1000) / 1000)
  const labelEvery = (x1 - x0) / step > 14 ? 2 : 1
  return (
    <svg className={`plot ${className ?? ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Koordinatensystem">
      <defs>
        <clipPath id={`${uid}-clip`}>
          <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} />
        </clipPath>
        <marker id={`${uid}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" className="plot__arrowhead" />
        </marker>
      </defs>
      {xs.map((x) => (
        <line key={`gx${x}`} x1={X(x)} x2={X(x)} y1={pad} y2={H - pad} className="plot__grid" />
      ))}
      {ys.map((y) => (
        <line key={`gy${y}`} y1={Y(y)} y2={Y(y)} x1={pad} x2={W - pad} className="plot__grid" />
      ))}
      {y0 <= 0 && y1 >= 0 && <line x1={pad - 6} x2={W - pad + 8} y1={Y(0)} y2={Y(0)} className="plot__axis" markerEnd={`url(#${uid}-arrow)`} />}
      {x0 <= 0 && x1 >= 0 && <line y1={H - pad + 6} y2={pad - 8} x1={X(0)} x2={X(0)} className="plot__axis" markerEnd={`url(#${uid}-arrow)`} />}
      {xs
        .filter((x) => x !== 0 && Math.round(x / step) % labelEvery === 0)
        .map((x) => (
          <text key={`lx${x}`} x={X(x)} y={Y(0) + 13} className="plot__tick" textAnchor="middle">
            {fmt(x)}
          </text>
        ))}
      {ys
        .filter((y) => y !== 0 && Math.round(y / step) % labelEvery === 0)
        .map((y) => (
          <text key={`ly${y}`} x={X(0) - 5} y={Y(y) + 3.5} className="plot__tick" textAnchor="end">
            {fmt(y)}
          </text>
        ))}
      <text x={W - pad + 2} y={Y(0) - 7} className="plot__axis-label" textAnchor="end">
        x
      </text>
      <text x={X(0) + 8} y={pad - 2} className="plot__axis-label">
        y
      </text>
      <g clipPath={`url(#${uid}-clip)`}>{children?.({ X, Y, r: range })}</g>
    </svg>
  )
}

/** Gerade als SVG-Linie über den ganzen Bereich */
export function LinePath({ m, b, X, Y, r, className }: { m: number; b: number; X: (x: number) => number; Y: (y: number) => number; r: [number, number, number, number]; className?: string }) {
  return <line x1={X(r[0])} y1={Y(m * r[0] + b)} x2={X(r[1])} y2={Y(m * r[1] + b)} className={className ?? 'plot__line'} />
}

/** Abbildung zu einer Aufgabe */
export default function Figure({ fig }: { fig: Fig }) {
  const pts = fig.points ?? []
  let range = fig.range
  if (!range) {
    const ext = Math.max(6, ...pts.flatMap((p) => [Math.abs(p.x) + 2, Math.abs(p.y) + 2]))
    const e = Math.min(12, Math.ceil(ext))
    range = [-e, e, -e, e]
  }
  return (
    <div className="figure">
      <Plot range={range} width={320} height={320}>
        {({ X, Y, r }) => (
          <>
            {(fig.lines ?? []).map((l, i) => (
              <g key={i}>
                <LinePath m={l.m} b={l.b} X={X} Y={Y} r={r} className={`plot__line ${i ? 'plot__line--2' : ''}`} />
                {l.label && (
                  <text x={X(r[1] - 0.6)} y={Y(l.m * (r[1] - 0.6) + l.b) - 8} className="plot__label" textAnchor="end">
                    {l.label}
                  </text>
                )}
              </g>
            ))}
            {pts.map((p, i) => (
              <g key={`p${i}`}>
                <circle cx={X(p.x)} cy={Y(p.y)} r={4} className="plot__pt" />
                {p.label && (
                  <text x={X(p.x) + 7} y={Y(p.y) - 7} className="plot__label">
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
