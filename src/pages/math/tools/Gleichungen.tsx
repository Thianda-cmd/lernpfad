import { useMemo } from 'react'
import { defaultVar, equationPreview, solveEquation, splitRelation } from '../../../math/alg/equation'
import { parseW } from '../../../math/alg/tree'
import { sumTex } from '../../../math/alg/poly'
import { add, div, isZero, mul, neg, q, qTex, toNum, approxTex, type Q } from '../../../math/q'
import { CalcPage, Examples, Rules, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import Graph from '../../../math/ui/Graph'
import MathInput from '../../../math/ui/MathInput'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

const EX: [string, string][] = [
  ['2x + 3 = 16 - (2x - 3)', 'mit Klammer'],
  ['4(x - 2) - 2(x + 1) = 3x - 1', 'ausmultiplizieren'],
  ['x/3 + x/4 = 7', 'mit Brüchen'],
  ['0,5x + 1,2 = 3,7', 'Kommazahlen'],
  ['15 - (3x - 2) < 19 - (2x + 4)', 'Ungleichung'],
  ['3x + 4a - 3b = x + 2a + 5b', 'mit Parametern'],
  ['(x + 3)^2 = (x - 1)^2 + 8', 'binomisch'],
  ['2x^2 - 8x + 6 = 0', 'quadratisch'],
]

const EX_PQ: [string, string][] = [
  ['x^2 - 4x + 3 = 0', 'Normalform'],
  ['2x^2 - 8x + 6 = 0', 'erst durch 2'],
  ['x^2 - 2x - 1 = 0', 'mit Wurzel'],
  ['x^2 + 4x + 5 = 0', 'keine Lösung'],
  ['x^2 - 6x + 9 = 0', 'eine Lösung'],
  ['3x^2 = 27', 'rein quadratisch'],
  ['x^2 - 5x = 0', 'ausklammern'],
  ['(x - 1)(x + 4) = 6', 'erst ausmultiplizieren'],
]

const RULES: [string, string][] = [
  ['a = b \\;\\Leftrightarrow\\; a + c = b + c', 'auf beiden Seiten dasselbe rechnen'],
  ['3x = 12 \\;\\big|\\; :3', 'durch die Zahl vor x teilen'],
  ['-2x < 6 \\;\\big|\\; :(-2) \\Rightarrow x > -3', 'Ungleichung: bei negativer Zahl dreht sich das Zeichen'],
  ['x_{1,2} = -\\tfrac{p}{2} \\pm \\sqrt{\\left(\\tfrac{p}{2}\\right)^2 - q}', 'p-q-Formel für x² + px + q = 0'],
]

const RULES_PQ: [string, string][] = [
  ['x^2 + px + q = 0', 'Normalform: rechts 0, vor x² eine 1'],
  ['x_{1,2} = -\\tfrac{p}{2} \\pm \\sqrt{\\left(\\tfrac{p}{2}\\right)^2 - q}', 'p-q-Formel'],
  ['D = \\left(\\tfrac{p}{2}\\right)^2 - q', 'D > 0: zwei · D = 0: eine · D < 0: keine Lösung'],
  ['S\\left(-\\tfrac{p}{2} \\mid -D\\right)', 'Scheitelpunkt der Normalparabel'],
]

function Parabola({ a, b, c, roots, v }: { a: Q; b: Q; c: Q; roots: number[]; v: string }) {
  const A = toNum(a)
  const B = toNum(b)
  const C = toNum(c)
  const xs = -B / (2 * A)
  const ys = A * xs * xs + B * xs + C
  const fn = (x: number) => A * x * x + B * x + C
  const vx = div(neg(b), mul(q(2), a))
  const vy = add(add(mul(a, mul(vx, vx)), mul(b, vx)), c)
  const exact = roots.every((r) => Number.isInteger(r))
  const lead = isZero(add(a, neg(q(1)))) ? '' : isZero(add(a, q(1))) ? '-' : qTex(a)
  const fac = (r: number) => (r === 0 ? v : `\\left(${v} ${r < 0 ? '+' : '-'} ${exact ? Math.abs(r) : approxTex(Math.abs(r))}\\right)`)
  const lin = roots.length === 2 ? `${lead}${fac(roots[0])}${fac(roots[1])}` : roots.length === 1 ? `${lead}${fac(roots[0])}^2` : null
  const fTex = sumTex(
    [
      { c: a, m: { [v]: 2 } },
      { c: b, m: { [v]: 1 } },
      { c, m: {} },
    ].filter((t) => !isZero(t.c)),
  )
  return (
    <div className="calc__fig">
      <Graph fn={fn} fnLabel="f" points={[...roots.map((r, i) => ({ x: r, y: 0, label: roots.length > 1 ? `x${i + 1}` : 'x₀' })), { x: xs, y: ys, label: 'S' }]} extraX={[xs - 3, xs + 3, ...roots]} />
      <div className="calc__figinfo">
        <div>
          <span>Funktion</span>
          <Tex>{`f(${v}) = ${fTex}`}</Tex>
        </div>
        <div>
          <span>Scheitelpunkt</span>
          <Tex>{`S(${qTex(vx)} \\mid ${qTex(vy)})`}</Tex>
        </div>
        <div>
          <span>Öffnung</span>
          <span>{A > 0 ? 'nach oben' : 'nach unten'}</span>
        </div>
        {lin && (
          <div>
            <span>Linearfaktoren</span>
            <Tex>{`f(${v}) ${exact ? '=' : '\\approx'} ${lin}`}</Tex>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Gleichungen({ tool, pq = false }: { tool: CalcTool; pq?: boolean }) {
  const examples = pq ? EX_PQ : EX
  const [g, setG] = useParam('g', examples[0][0])
  const [nach, setNach] = useParam('nach', '')
  const vars = useMemo(() => {
    try {
      const { L, R } = splitRelation(g, pq)
      return [...new Set([...parseW(L).vars, ...parseW(R).vars])].filter((x) => x !== 'π')
    } catch {
      return []
    }
  }, [g, pq])
  const v = nach && vars.includes(nach) ? nach : vars.length ? defaultVar(vars) : 'x'
  const { res, err } = useSolve(() => (g.trim() ? solveEquation(g, { variable: v, allowNoRel: pq }) : null), [g, v, pq])
  const preview = useMemo(() => (s: string) => equationPreview(s, pq), [pq])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro={
        pq
          ? 'Quadratische Gleichung eingeben – egal in welcher Form. Der Rechner bringt sie in die Normalform, liest p und q ab, rechnet die p-q-Formel aus und zeichnet die Parabel.'
          : 'Gleichung oder Ungleichung eingeben. Der Rechner löst Klammern auf, fasst zusammen und stellt Zeile für Zeile nach der gesuchten Variablen um – mit Probe. Quadratische Gleichungen löst er mit der p-q-Formel.'
      }
      path={tool.path}
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <span className="calc__label">{pq ? 'Quadratische Gleichung' : 'Gleichung'}</span>
          <MathInput value={g} onChange={setG} keys="equation" size="lg" placeholder={pq ? 'z. B. 2x^2 - 8x + 6 = 0' : 'z. B. 2x + 3 = 7'} previewFn={preview} ariaLabel="Gleichung" />
          {vars.length > 1 && (
            <div className="calc__var">
              <span>Lösen nach</span>
              <div className="seg">
                {vars.map((x) => (
                  <button key={x} type="button" className={`seg__btn ${v === x ? 'is-active' : ''}`} onClick={() => setNach(x)}>
                    <Tex>{x.replace(/_(\w+)/, '_{$1}')}</Tex>
                  </button>
                ))}
              </div>
            </div>
          )}
          <Examples items={examples} onPick={setG} current={g} />
          <p className="calc__hint">
            Zeichen: <kbd>=</kbd> <kbd>&lt;</kbd> <kbd>&gt;</kbd> <kbd>&lt;=</kbd> <kbd>&gt;=</kbd> · Hochzahl: <kbd>x^2</kbd> · Bruch: <kbd>x/3</kbd>
          </p>
        </section>
        <Rules items={pq ? RULES_PQ : RULES} />
      </div>
      <SolutionCard sol={res} err={err}>
        {res?.quad && !isZero(res.quad.a) && res.numeric && <Parabola a={res.quad.a} b={res.quad.b} c={res.quad.c} roots={res.roots} v={res.variable} />}
      </SolutionCard>
    </CalcPage>
  )
}
