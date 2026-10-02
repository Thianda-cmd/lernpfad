import { useMemo } from 'react'
import { equationPreview } from '../../../math/alg/equation'
import { analyzeLine, lineFromPointSlope, lineThroughPoints, twoLines, type Pt } from '../../../math/alg/lines'
import { parseNum } from '../../../math/alg/numinput'
import { CalcError } from '../../../math/q'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import Graph from '../../../math/ui/Graph'
import MathInput from '../../../math/ui/MathInput'
import type { CalcTool } from '../../../math/tools'

const RULES: [string, string][] = [
  ['y = mx + b', 'm: Steigung, b: y-Achsenabschnitt'],
  ['m = \\frac{y_2 - y_1}{x_2 - x_1}', 'Steigung aus zwei Punkten'],
  ['0 = mx + b', 'Nullstelle: y = 0 setzen'],
  ['m_g = m_h', 'parallel (oder identisch)'],
  ['m_g \\cdot m_h = -1', 'senkrecht'],
]

type Mode = 'punkte' | 'steigung' | 'gleichung' | 'zwei'

function pt(x: string, y: string, name: string): Pt | null {
  const a = parseNum(x, `${name}: x`)
  const b = parseNum(y, `${name}: y`)
  if (!a && !b) return null
  if (!a || !b) throw new CalcError(`Beim Punkt ${name} fehlt eine Koordinate.`)
  return { x: a.q, y: b.q }
}

export default function Geraden({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'punkte')
  const m = (['punkte', 'steigung', 'gleichung', 'zwei'].includes(mode) ? mode : 'punkte') as Mode
  const [x1, setX1] = useParam('x1', '1')
  const [y1, setY1] = useParam('y1', '2')
  const [x2, setX2] = useParam('x2', '3')
  const [y2, setY2] = useParam('y2', '8')
  const [s, setS] = useParam('m', '1/2')
  const [g, setG] = useParam('g', '2x + 3y = 6')
  const [h, setH] = useParam('h', 'y = -0,5x + 4')
  const [px, setPx] = useParam('px', '')
  const [py, setPy] = useParam('py', '')
  const preview = useMemo(() => (v: string) => equationPreview(v), [])
  const { res, err } = useSolve(() => {
    if (m === 'punkte') {
      const P = pt(x1, y1, 'P')
      const Q = pt(x2, y2, 'Q')
      if (!P || !Q) return null
      return lineThroughPoints(P, Q, { dec: [x1, y1, x2, y2].some((v) => /[.,]/.test(v)) })
    }
    if (m === 'steigung') {
      const P = pt(x1, y1, 'P')
      const mm = parseNum(s, 'Steigung m')
      if (!P || !mm) return null
      return lineFromPointSlope(P, mm.q, { dec: mm.dec || /[.,]/.test(x1 + y1) })
    }
    if (m === 'gleichung') {
      if (!g.trim()) return null
      return analyzeLine(g, pt(px, py, 'P') ?? undefined)
    }
    if (!g.trim() || !h.trim()) return null
    return twoLines(g, h)
  }, [m, x1, y1, x2, y2, s, g, h, px, py])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Geradengleichung aus zwei Punkten oder aus Punkt und Steigung, eine Gerade untersuchen (Steigung, Achsenabschnitt, Nullstelle, Punktprobe) oder zwei Geraden vergleichen und schneiden."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['punkte', 'Zwei Punkte'],
            ['steigung', 'Punkt & Steigung'],
            ['gleichung', 'Gerade untersuchen'],
            ['zwei', 'Zwei Geraden'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {(m === 'punkte' || m === 'steigung') && (
            <>
              <span className="calc__label">Punkt P</span>
              <div className="calc__fields calc__fields--pt">
                <NumField label="x₁" value={x1} onChange={setX1} />
                <NumField label="y₁" value={y1} onChange={setY1} />
              </div>
            </>
          )}
          {m === 'punkte' && (
            <>
              <span className="calc__label">Punkt Q</span>
              <div className="calc__fields calc__fields--pt">
                <NumField label="x₂" value={x2} onChange={setX2} />
                <NumField label="y₂" value={y2} onChange={setY2} />
              </div>
            </>
          )}
          {m === 'steigung' && (
            <div className="calc__fields calc__fields--pt">
              <NumField label="Steigung m" value={s} onChange={setS} placeholder="z. B. 1/2 oder -3" />
            </div>
          )}
          {(m === 'gleichung' || m === 'zwei') && (
            <>
              <span className="calc__label">{m === 'zwei' ? 'Gerade g' : 'Geradengleichung'}</span>
              <MathInput value={g} onChange={setG} keys="equation" placeholder="z. B. y = 2x - 1 oder 2x + 3y = 6" previewFn={preview} ariaLabel="Gerade g" />
            </>
          )}
          {m === 'zwei' && (
            <>
              <span className="calc__label">Gerade h</span>
              <MathInput value={h} onChange={setH} keys={false} placeholder="z. B. y = -0,5x + 4" previewFn={preview} ariaLabel="Gerade h" />
              <Examples
                items={[
                  ['y = 2x - 1|y = -0,5x + 4', 'senkrecht'],
                  ['y = 2x - 1|4x - 2y = 6', 'parallel'],
                  ['y = 3x + 2|y = -x + 6', 'Schnittpunkt'],
                  ['y = x + 1|2y = 2x + 2', 'identisch'],
                ]}
                current={`${g}|${h}`}
                onPick={(v) => {
                  const [a, b] = v.split('|')
                  setG(a)
                  setH(b)
                }}
              />
            </>
          )}
          {m === 'gleichung' && (
            <>
              <span className="calc__label">Punktprobe (optional)</span>
              <div className="calc__fields calc__fields--pt">
                <NumField label="x" value={px} onChange={setPx} />
                <NumField label="y" value={py} onChange={setPy} />
              </div>
            </>
          )}
        </section>
        <Rules items={RULES} />
      </div>
      <SolutionCard sol={res} err={err} empty="Trage die Werte ein.">
        {res && (
          <div className="calc__fig">
            <Graph lines={res.fig.lines} points={res.fig.points} />
          </div>
        )}
      </SolutionCard>
    </CalcPage>
  )
}
