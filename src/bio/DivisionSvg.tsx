import { useMemo } from 'react'
import { mulberry32 } from '../lib/random'
import { ARMS, CROSS, ORIGIN, frameAt, type Cht, type Ell, type Label, type Phase, type Pole } from './division'

const COL = { m: 'var(--green)', p: 'var(--sand)' } as const
const WIDTH = 7.4
const BANDS = [0.4, 0.74]

const dir = (a: number) => [Math.sin((a * Math.PI) / 180), -Math.cos((a * Math.PI) / 180)]

function Arm({ len, angle, color, tip }: { len: number; angle: number; color: string; tip: string | null }) {
  return (
    <g transform={`rotate(${angle})`}>
      <rect x={-WIDTH / 2} y={-len} width={WIDTH} height={len + WIDTH / 2} rx={WIDTH / 2} fill={color} className="dv-arm" />
      {tip && <rect x={-WIDTH / 2} y={-len} width={WIDTH} height={len * 0.55} rx={WIDTH / 2} fill={tip} className="dv-arm" />}
      {BANDS.map((f) => (
        <rect key={f} x={-WIDTH / 2 + 0.6} y={-len * f} width={WIDTH - 1.2} height={1.5} className="dv-band" />
      ))}
      <line x1={-1.5} y1={-3} x2={-1.5} y2={-len + 3.2} className="dv-shine" />
    </g>
  )
}

function Chromatid({ c, i, swap }: { c: Cht; i: number; swap: boolean }) {
  if (c.op < 0.02) return null
  const [l1, l2] = ARMS[i]
  const col = COL[ORIGIN[i]]
  const tip = swap && CROSS[i] ? COL[CROSS[i]] : null
  return (
    <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`} opacity={c.op}>
      <Arm len={l1} angle={c.a1} color={col} tip={null} />
      <Arm len={l2} angle={c.a2} color={col} tip={tip} />
      <circle r={WIDTH / 2 + 0.5} fill={col} className="dv-cen" />
    </g>
  )
}

/** Organellen-Andeutung je Zelle (normierte Lage im Ellipsenraum) */
function texture(seed: number) {
  const rng = mulberry32(seed)
  const pt = () => {
    for (;;) {
      const u = rng() * 2 - 1
      const v = rng() * 2 - 1
      const d = u * u + v * v
      if (d < 0.74 && d > 0.2) return [u, v]
    }
  }
  return {
    dots: Array.from({ length: 22 }, () => {
      const [u, v] = pt()
      return { u, v, r: 0.9 + rng() * 1.3 }
    }),
    mito: Array.from({ length: 5 }, () => {
      const [u, v] = pt()
      return { u, v, a: rng() * 180 }
    }),
  }
}

function sameCell(a: Ell, b: Ell) {
  return Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) + Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry)
}

function polePairs(p: Pole[]): [number, number][] {
  if (p.length === 2) return [[0, 1]]
  return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) < 30 ? [[0, 2]] : [[0, 1], [2, 3]]
}

function LabelEl({ l, op, chiasmata }: { l: Label; op: number; chiasmata: [number, number][] }) {
  const target = l.chiasma !== undefined ? chiasmata[l.chiasma] : l.px !== undefined && l.py !== undefined ? [l.px, l.py] : null
  const anchor = l.anchor ?? 'middle'
  let sx = l.x
  let sy = l.y - 4
  if (target) {
    if (anchor === 'start') sx = l.x - 4
    else if (anchor === 'end') sx = l.x + 4
    else sy = target[1] > l.y ? l.y + 4 : l.y - 13
  }
  return (
    <g opacity={op} className="dv-lab">
      {target && (
        <>
          <line x1={sx} y1={sy} x2={target[0]} y2={target[1]} />
          <circle cx={target[0]} cy={target[1]} r={2.2} />
        </>
      )}
      <text x={l.x} y={l.y} textAnchor={anchor}>
        {l.t}
      </text>
    </g>
  )
}

export default function DivisionSvg({ phases, t, labels = true, className = '' }: { phases: Phase[]; t: number; labels?: boolean; className?: string }) {
  const f = frameAt(phases, t)
  const labelOp = labels ? Math.max(0, 1 - Math.abs(t - Math.round(t)) * 5) : 0
  const squiggles = useMemo(() => {
    const rng = mulberry32(19)
    return Array.from({ length: 9 }, (_, k) => {
      const pts = Array.from({ length: 5 }, () => {
        const a = rng() * Math.PI * 2
        const r = 0.15 + rng() * 0.62
        return [Math.cos(a) * r, Math.sin(a) * r]
      })
      const d = `M${pts[0][0]} ${pts[0][1]} Q${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]} T${pts[3][0]} ${pts[3][1]} T${pts[4][0]} ${pts[4][1]}`
      return { d, m: k % 2 === 0 }
    })
  }, [])
  const tex = useMemo(() => [0, 1, 2, 3].map((k) => texture(41 + k * 7)), [])

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
      <g>
        {f.cells.map((c, k) => (
          <ellipse key={`s${k}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} className="dv-cell__edge" />
        ))}
        {f.cells.map((c, k) => (
          <ellipse key={`f${k}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} className="dv-cell__fill" />
        ))}
      </g>

      {/* Organellen im Cytoplasma – deckungsgleiche Zellen nur einmal */}
      {f.cells.map((c, k) => {
        const sep = k === 0 ? 99 : Math.min(...f.cells.slice(0, k).map((d) => sameCell(c, d)))
        const op = Math.min(1, sep / 24)
        if (op < 0.03) return null
        const tx = tex[k]
        return (
          <g key={`t${k}`} opacity={op} className="dv-cyto">
            {tx.dots.map((d, j) => (
              <circle key={j} cx={c.cx + d.u * c.rx} cy={c.cy + d.v * c.ry} r={d.r} />
            ))}
            {tx.mito.map((m, j) => (
              <rect key={j} x={-5.5} y={-2.4} width={11} height={4.8} rx={2.4} transform={`translate(${c.cx + m.u * c.rx} ${c.cy + m.v * c.ry}) rotate(${m.a})`} className="dv-mito" />
            ))}
          </g>
        )
      })}

      {f.nuclei.map((n, k) =>
        n.op > 0.02 ? (
          <g key={k} opacity={Math.min(1, n.op * 1.2)}>
            <circle cx={n.cx} cy={n.cy} r={n.r} className={`dv-nuc ${n.op < 0.8 ? 'is-broken' : ''}`} />
            <g transform={`translate(${n.cx} ${n.cy}) scale(${n.r})`} opacity={f.chromatin}>
              {squiggles.map((s, j) => (
                <path key={j} d={s.d} className={`dv-chromatin ${s.m ? 'is-m' : 'is-p'}`} vectorEffect="non-scaling-stroke" />
              ))}
              <circle cx={0.28} cy={-0.2} r={0.16} className="dv-nucleolus" />
            </g>
          </g>
        ) : null,
      )}

      {f.plates.map((p, k) => (p.op > 0.02 ? <line key={k} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} opacity={p.op} className="dv-plate" /> : null))}

      {/* Spindelapparat: Polfasern als Bögen, Kinetochorfasern zu den Zentromeren */}
      <g className="dv-fibers" opacity={f.fiber}>
        {polePairs(f.poles).map(([a, b]) => {
          const A = f.poles[a]
          const B = f.poles[b]
          const len = Math.hypot(B.x - A.x, B.y - A.y)
          if (len < 20) return null
          const nx = -(B.y - A.y) / len
          const ny = (B.x - A.x) / len
          const mx = (A.x + B.x) / 2
          const my = (A.y + B.y) / 2
          return [-0.2, -0.1, 0.1, 0.2].map((o) => <path key={`${a}${o}`} d={`M${A.x} ${A.y} Q${mx + nx * o * len} ${my + ny * o * len} ${B.x} ${B.y}`} className="dv-polar" />)
        })}
        {f.ch.map((c, i) => {
          if (c.pole < 0 || c.op < 0.05) return null
          const p = f.poles[c.pole]
          return <line key={i} x1={p.x} y1={p.y} x2={c.x} y2={c.y} className="dv-kin" />
        })}
      </g>

      {f.poles.map((p, k) =>
        p.op > 0.02 ? (
          <g key={k} transform={`translate(${p.x} ${p.y})`} opacity={p.op} className="dv-pole">
            {Array.from({ length: 12 }, (_, j) => {
              const a = (j / 12) * Math.PI * 2
              return <line key={j} x1={Math.cos(a) * 7} y1={Math.sin(a) * 7} x2={Math.cos(a) * (j % 2 ? 13 : 17)} y2={Math.sin(a) * (j % 2 ? 13 : 17)} />
            })}
            <rect x={-1.7} y={-4.6} width={3.4} height={9.2} rx={1.2} />
            <rect x={-4.6} y={-1.7} width={9.2} height={3.4} rx={1.2} />
          </g>
        ) : null,
      )}

      {f.ch.map((c, i) => (
        <Chromatid key={i} c={c} i={i} swap={f.swap} />
      ))}

      {chiasmata.map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={8.5} className="dv-chiasma" />
      ))}

      {labelOp > 0 && f.labels?.map((l) => <LabelEl key={l.t + l.x + l.y} l={l} op={labelOp} chiasmata={chiasmata} />)}
    </svg>
  )
}
