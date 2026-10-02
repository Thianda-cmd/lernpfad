import { fractionInput, fractionPreview } from '../../../math/alg/fractions'
import { CalcPage, Examples, Rules, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import MathInput from '../../../math/ui/MathInput'
import type { CalcTool } from '../../../math/tools'

const EX: [string, string][] = [
  ['3/4 + 7/6 - 1/12', 'Hauptnenner'],
  ['(2/3 + 1/4) : 5/6', 'Klammer & Kehrwert'],
  ['3/4 · 8/9', 'malnehmen'],
  ['(1/2) / (1/3 - 1/4)', 'Doppelbruch'],
  ['84/126', 'kürzen'],
  ['2 1/2 + 1 3/4', 'gemischte Zahlen'],
  ['(3/4)^2 - 1/8', 'Potenz'],
  ['3a/4 + 7a/6', 'Bruchterm'],
  ['2/(3z) - 1/(4z) + 5/(6z)', 'Variable im Nenner'],
]

const RULES: [string, string][] = [
  ['\\frac{a}{b} = \\frac{a \\cdot k}{b \\cdot k}', 'Erweitern (Hauptnenner = kgV der Nenner)'],
  ['\\frac{a}{c} + \\frac{b}{c} = \\frac{a + b}{c}', 'Gleichnamige Brüche addieren'],
  ['\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{a \\cdot c}{b \\cdot d}', 'Zähler mal Zähler, Nenner mal Nenner'],
  ['\\frac{a}{b} : \\frac{c}{d} = \\frac{a}{b} \\cdot \\frac{d}{c}', 'Teilen = mal Kehrwert'],
  ['\\frac{a : g}{b : g}', 'Kürzen mit dem ggT'],
]

export default function Brueche({ tool }: { tool: CalcTool }) {
  const [b, setB] = useParam('b', EX[0][0])
  const { res, err } = useSolve(() => (b.trim() ? fractionInput(b) : null), [b])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Rechnung mit Brüchen eingeben. Der Rechner hält die Reihenfolge ein (Klammern, Potenzen, Punkt vor Strich), sucht den Hauptnenner, erweitert, nimmt den Kehrwert und kürzt am Ende vollständig."
      path={tool.path}
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <span className="calc__label">Rechnung</span>
          <MathInput value={b} onChange={setB} keys="number" size="lg" placeholder="z. B. 3/4 + 5/6" previewFn={fractionPreview} ariaLabel="Rechnung mit Brüchen" />
          <Examples items={EX} onPick={setB} current={b} />
          <p className="calc__hint">
            Bruch: <kbd>3/4</kbd> · geteilt: <kbd>:</kbd> · mal: <kbd>*</kbd> · gemischte Zahl: <kbd>2 1/2</kbd> · Doppelbruch: <kbd>(1/2)/(1/3)</kbd>
          </p>
        </section>
        <Rules items={RULES} />
      </div>
      <SolutionCard sol={res} err={err} />
    </CalcPage>
  )
}
