import { Fragment, useMemo } from 'react'
import { mulberry32 } from '../lib/random'
import { ARMS, CROSS, ORIGIN, frameAt, type Cht, type Phase } from './division'

const COL = { m: 'var(--green)', p: 'var(--sand)' } as const
const WIDTH = 7.2

const dir = (a: number) => [Math.sin((a * Math.PI) / 180), -Math.cos((a * Math.PI) / 180)]

function Chromatid({ c, i, swap }: { c: Cht; i: number; swap: boolean }) {
  if (c.op < 0.02) return null
  const [l1, l2] = ARMS[i]
  const col = COL[ORIGIN[i]]
  const tip = swap && CROSS[i] ? COL[CROSS[i]] : null
  return (
    <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`} opacity={c.op} className="dv-chr">
      <g transform={`rotate(${c.a1})`}>
        <rect x={-WIDTH / 2} y={-l1} width={WIDTH} height={l1 + WIDTH / 2} rx={WIDTH / 2} fill={col} />
      </g>
      <g transform={`rotate(${c.a2})`}>
        <rect x={-WIDTH / 2} y={-l2} width={WIDTH} height={l2 + WIDTH / 2} rx={WIDTH / 2} fill={col} />
        {tip && <rect x={-WIDTH / 2} y={-l2} width={WIDTH} height={l2 * 0.55} rx={WIDTH / 2} fill={tip} />}
      </g>
      <circle r={WIDTH / 2 + 0.4} fill={col} className="dv-cen" />
    </g>
  )
}

export default function DivisionSvg({ phases, t, labels = true, className = '' }: { phases: Phase[]; t: number; labels?: boolean; className?: string }) {
  const f = frameAt(phases, t)
  const labelOp = labels ? Math.max(0, 1 - Math.abs(t - Math.round(t)) * 5) : 0
  const squiggles = useMemo(() => {
    const rng = mulberry32(19)
    return Array.from({ length: 8 }, (_, k) => {
      const pts = Array.from({ length: 5 }, () => {
        const a = rng() * Math.PI * 2
        const r = 0.15 + rng() * 0.6
        return [Math.cos(a) * r, Math.sin(a) * r]
      })
      const d = `M${pts[0][0]} ${pts[0][1]} Q${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]} T${pts[3][0]} ${pts[3][1]} T${pts[4][0]} ${pts[4][1]}`
      return { d, m: k % 2 === 0 }
    })
  }, [])

  const chiasmata: [number, number][] = []
  if (f.chiasma) {
    for (const [a, b] of [
      [1, 2],
      [5, 6],
    ]) {
      const pa = f.ch[a]
      const pb = f.ch[b]
      const da = dir(pa.a2)
      const db = dir(pb.a2)
      const la = ARMS[a][1] * 0.45 * pa.s
      const lb = ARMS[b][1] * 0.45 * pb.s
      chiasmata.push([(pa.x + da[0] * la + pb.x + db[0] * lb) / 2, (pa.y + da[1] * la + pb.y + db[1] * lb) / 2])
    }
  }

  return (
    <svg className={`dv ${className}`} viewBox="0 0 440 300" role="img" aria-label="Zellteilung">
      {/* Zellen: erst Ränder, dann Füllung – so bleibt nur der Umriss der Vereinigung sichtbar */}
      <g className="dv-cells">
        {f.cells.map((c, k) => (
          <ellipse key={`s${k}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} className="dv-cell__edge" />
        ))}
        {f.cells.map((c, k) => (
          <ellipse key={`f${k}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} className="dv-cell__fill" />
        ))}
      </g>

      {f.nuclei.map((n, k) =>
        n.op > 0.02 || f.chromatin > 0.02 ? (
          <g key={k} opacity={Math.min(1, n.op * 1.2)}>
            <circle cx={n.cx} cy={n.cy} r={n.r} className={`dv-nuc ${n.op < 0.8 ? 'is-broken' : ''}`} />
            <g transform={`translate(${n.cx} ${n.cy}) scale(${n.r})`} opacity={f.chromatin}>
              {squiggles.map((s, j) => (
                <path key={j} d={s.d} className={`dv-chromatin ${s.m ? 'is-m' : 'is-p'}`} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          </g>
        ) : null,
      )}

      {f.plates.map((p, k) => (p.op > 0.02 ? <line key={k} {...p} opacity={p.op} className="dv-plate" /> : null))}

      <g className="dv-fibers" opacity={f.fiber}>
        {f.ch.map((c, i) => {
          if (c.pole < 0 || c.op < 0.05) return null
          const p = f.poles[c.pole]
          return <line key={i} x1={p.x} y1={p.y} x2={c.x} y2={c.y} />
        })}
      </g>

      {f.poles.map((p, k) =>
        p.op > 0.02 ? (
          <g key={k} transform={`translate(${p.x} ${p.y})`} opacity={p.op} className="dv-pole">
            {Array.from({ length: 10 }, (_, j) => {
              const a = (j / 10) * Math.PI * 2
              return <line key={j} x1={Math.cos(a) * 7} y1={Math.sin(a) * 7} x2={Math.cos(a) * 15} y2={Math.sin(a) * 15} />
            })}
            <rect x={-1.6} y={-4.5} width={3.2} height={9} rx={1} />
            <rect x={-4.5} y={-1.6} width={9} height={3.2} rx={1} />
          </g>
        ) : null,
      )}

      {f.ch.map((c, i) => (
        <Chromatid key={i} c={c} i={i} swap={f.swap} />
      ))}

      {chiasmata.map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={8} className="dv-chiasma" />
      ))}

      {labelOp > 0 &&
        f.labels?.map((l) => (
          <Fragment key={l.t + l.x}>
            <text x={l.x} y={l.y} textAnchor={l.anchor ?? 'middle'} className="dv-label" opacity={labelOp}>
              {l.t}
            </text>
          </Fragment>
        ))}
    </svg>
  )
}
