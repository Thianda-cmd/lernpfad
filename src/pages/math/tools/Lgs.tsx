import { useMemo } from 'react'
import { equationPreview } from '../../../math/alg/equation'
import { solveLgs, type LgsMethod } from '../../../math/alg/lgs'
import { div, isZero, neg, toNum } from '../../../math/q'
import { CalcPage, Examples, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import Graph, { type GLine } from '../../../math/ui/Graph'
import MathInput from '../../../math/ui/MathInput'
import type { CalcTool } from '../../../math/tools'

const EX: [string, string, string][] = [
  ['2x + 3y = 12', '4x - y = 10', 'Standard'],
  ['6x - 5y + 25 = 2', '3x + 2y = 12', 'erst ordnen'],
  ['y = 2x - 1', 'y = -x + 5', 'beide nach y'],
  ['x + 15y = 55', 'x + 25y = 85', 'Tarif-Aufgabe'],
  ['0,5x + y = 2', 'x - 0,5y = 1,5', 'Kommazahlen'],
  ['2x + 4y = 6', 'x + 2y = 5', 'keine Lösung'],
  ['2x + 4y = 6', 'x + 2y = 3', 'unendlich viele'],
]

const RULES: [string, string][] = [
  ['\\text{I} + \\text{II}', 'Additionsverfahren: Gegenzahlen erzeugen, addieren'],
  ['y = \\ldots \\text{ in II}', 'Einsetzungsverfahren: Term in Klammern einsetzen'],
  ['\\text{I} = \\text{II}', 'Gleichsetzungsverfahren: beide nach derselben Variablen'],
  ['0 = 0', 'unendlich viele Lösungen (dieselbe Gerade)'],
  ['0 = 5', 'keine Lösung (parallele Geraden)'],
]

const METHODS: [LgsMethod, string][] = [
  ['addition', 'Additionsverfahren'],
  ['einsetzung', 'Einsetzungsverfahren'],
  ['gleichsetzung', 'Gleichsetzungsverfahren'],
]

export default function Lgs({ tool }: { tool: CalcTool }) {
  const [g1, setG1] = useParam('i', EX[0][0])
  const [g2, setG2] = useParam('ii', EX[0][1])
  const [m, setM] = useParam('verfahren', 'addition')
  const method = (METHODS.some(([k]) => k === m) ? m : 'addition') as LgsMethod
  const { res, err } = useSolve(() => (g1.trim() && g2.trim() ? solveLgs(g1, g2, method) : null), [g1, g2, method])
  const preview = useMemo(() => (s: string) => equationPreview(s), [])
  const fig = useMemo(() => {
    if (!res) return null
    const lines: GLine[] = res.lines.map((e, i) =>
      isZero(e.b) ? { m: 0, b: 0, vx: isZero(e.a) ? 0 : toNum(div(e.c, e.a)), label: i ? 'II' : 'I' } : { m: toNum(div(neg(e.a), e.b)), b: toNum(div(e.c, e.b)), label: i ? 'II' : 'I' },
    )
    const points = res.sol ? [{ x: toNum(res.sol[0]), y: toNum(res.sol[1]), label: 'S' }] : []
    return { lines, points }
  }, [res])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Zwei Gleichungen mit zwei Unbekannten eingeben – in beliebiger Form. Wähle das Verfahren; der Rechner ordnet, löst Schritt für Schritt, macht die Probe und zeigt die beiden Geraden."
      path={tool.path}
      actions={<Seg value={method} onChange={setM} options={METHODS} label="Verfahren" />}
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <span className="calc__label">Gleichung I</span>
          <MathInput value={g1} onChange={setG1} keys="equation" placeholder="z. B. 2x + 3y = 12" previewFn={preview} ariaLabel="Gleichung I" />
          <span className="calc__label">Gleichung II</span>
          <MathInput value={g2} onChange={setG2} keys={false} placeholder="z. B. 4x - y = 10" previewFn={preview} ariaLabel="Gleichung II" />
          <Examples
            items={EX.map(([a, b, l]) => [`${a}|${b}`, l] as [string, string])}
            current={`${g1}|${g2}`}
            onPick={(v) => {
              const [a, b] = v.split('|')
              setG1(a)
              setG2(b)
            }}
          />
        </section>
        <Rules items={RULES} />
      </div>
      <SolutionCard sol={res} err={err}>
        {fig && (
          <div className="calc__fig">
            <Graph lines={fig.lines} points={fig.points} />
            <p className="calc__figcap">Jede Gleichung ist eine Gerade. Die Lösung ist ihr Schnittpunkt{res?.kind === 'keine' ? ' – parallele Geraden haben keinen.' : res?.kind === 'unendlich' ? ' – hier liegen beide Geraden aufeinander.' : '.'}</p>
          </div>
        )}
      </SolutionCard>
    </CalcPage>
  )
}
