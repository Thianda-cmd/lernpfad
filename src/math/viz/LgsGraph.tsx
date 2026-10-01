import { useState } from 'react'
import { Tex } from '../tex'
import { tn } from '../num'
import { sumTex, T } from '../poly'
import { Plot } from '../ui/Figure'
import { Presets, Slider, VizHead } from './controls'

type Eq = [number, number, number]
const PRESETS: { t: string; v: [Eq, Eq] }[] = [
  { t: 'Mitschrift 1', v: [[6, -5, -23], [8, 3, 37]] },
  { t: 'Mitschrift 2', v: [[2, -4, -4], [-3, 4, -2]] },
  { t: 'parallel', v: [[2, 1, 4], [4, 2, -2]] },
  { t: 'identisch', v: [[1, 1, 3], [2, 2, 6]] },
]

const eqTex = ([a, b, c]: Eq) => `${sumTex([T(a, 'x'), T(b, 'y')].filter((t) => t.c !== 0)) || '0'} = ${tn(c)}`

function Line({ e, X, Y, r, cls }: { e: Eq; X: (x: number) => number; Y: (y: number) => number; r: [number, number, number, number]; cls: string }) {
  const [a, b, c] = e
  if (b === 0) {
    if (a === 0) return null
    const x = c / a
    return <line x1={X(x)} x2={X(x)} y1={Y(r[2])} y2={Y(r[3])} className={cls} />
  }
  const f = (x: number) => (c - a * x) / b
  return <line x1={X(r[0])} y1={Y(f(r[0]))} x2={X(r[1])} y2={Y(f(r[1]))} className={cls} />
}

export default function LgsGraph() {
  const [pi, setPi] = useState(0)
  const [e1, setE1] = useState<Eq>(PRESETS[0].v[0])
  const [e2, setE2] = useState<Eq>(PRESETS[0].v[1])
  const pick = (i: number) => {
    setPi(i)
    setE1(PRESETS[i].v[0])
    setE2(PRESETS[i].v[1])
  }
  const det = e1[0] * e2[1] - e2[0] * e1[1]
  const x = det ? (e1[2] * e2[1] - e2[2] * e1[1]) / det : NaN
  const y = det ? (e1[0] * e2[2] - e2[0] * e1[2]) / det : NaN
  const same = !det && e1.every((v, i) => Math.abs(v * (e2[0] || e2[1]) - e2[i] * (e1[0] || e1[1])) < 1e-9)
  const R = 10
  const range: [number, number, number, number] = [-R, R, -R, R]
  const set = (which: 1 | 2, k: number, v: number) => {
    setPi(-1)
    ;(which === 1 ? setE1 : setE2)((e) => e.map((q, i) => (i === k ? v : q)) as Eq)
  }
  return (
    <div className="lg">
      <VizHead title="Jede Gleichung ist eine Gerade" />
      <Presets items={PRESETS} active={pi} onPick={pick} />
      <div className="lg__body">
        <Plot range={range} width={340} height={340} step={1}>
          {({ X, Y, r }) => (
            <>
              <Line e={e1} X={X} Y={Y} r={r} cls="plot__line" />
              <Line e={e2} X={X} Y={Y} r={r} cls="plot__line plot__line--2" />
              {det !== 0 && Math.abs(x) <= R && Math.abs(y) <= R && (
                <g>
                  <line x1={X(x)} x2={X(x)} y1={Y(0)} y2={Y(y)} className="plot__guide" />
                  <line x1={X(0)} x2={X(x)} y1={Y(y)} y2={Y(y)} className="plot__guide" />
                  <circle cx={X(x)} cy={Y(y)} r={5} className="plot__pt plot__pt--hot" />
                </g>
              )}
            </>
          )}
        </Plot>
        <div className="lg__side">
          <div className="lg__eqs">
            <div className="lg__eq lg__eq--1">
              <span className="lg__eq-n">I</span>
              <Tex>{eqTex(e1)}</Tex>
            </div>
            <div className="lg__eq lg__eq--2">
              <span className="lg__eq-n">II</span>
              <Tex>{eqTex(e2)}</Tex>
            </div>
          </div>
          <div className={`lg__result ${det ? 'is-one' : same ? 'is-inf' : 'is-none'}`}>
            {det ? (
              <>
                <strong>Genau eine Lösung</strong>
                <Tex>{`\\mathbb{L} = \\{(${tn(x, 2)} \\mid ${tn(y, 2)})\\}`}</Tex>
                <span>Die Geraden schneiden sich in einem Punkt.</span>
              </>
            ) : same ? (
              <>
                <strong>Unendlich viele Lösungen</strong>
                <span>Beide Gleichungen beschreiben dieselbe Gerade.</span>
              </>
            ) : (
              <>
                <strong>Keine Lösung</strong>
                <span>Die Geraden sind parallel – sie schneiden sich nie. Beim Rechnen entsteht ein Widerspruch wie 0 = 5.</span>
              </>
            )}
          </div>
          <details className="lg__edit">
            <summary>Koeffizienten selbst ändern</summary>
            {([1, 2] as const).map((w) => (
              <div key={w} className="lg__sliders">
                {(['a', 'b', 'c'] as const).map((n, k) => (
                  <Slider key={n} label={`${w === 1 ? 'I' : 'II'}: ${n}`} value={(w === 1 ? e1 : e2)[k]} min={k === 2 ? -40 : -9} max={k === 2 ? 40 : 9} step={1} onChange={(v) => set(w, k, v)} />
                ))}
              </div>
            ))}
            <p className="viz__note">
              Form: <Tex>{'a x + b y = c'}</Tex>
            </p>
          </details>
        </div>
      </div>
    </div>
  )
}
