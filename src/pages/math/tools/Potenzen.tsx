import { powerInput, sciInput } from '../../../math/alg/powers'
import { CalcPage, Examples, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import MathInput from '../../../math/ui/MathInput'
import type { CalcTool } from '../../../math/tools'

const EX_P: [string, string][] = [
  ['a^3 · a^5', 'malnehmen'],
  ['6x^4y^2 / (2xy^2)', 'teilen'],
  ['(2x^3)^2 · 3x', 'Klammer hoch'],
  ['27a^9 / (3a^3)^3', 'kürzen'],
  ['√(a^3) · ∛(a^2)', 'Wurzeln'],
  ['∛(64a^3b^9)', 'Wurzel ziehen'],
  ['1/√(x^3)', 'negative Hochzahl'],
  ['√72', 'teilweise Wurzel'],
]
const EX_S: [string, string][] = [
  ['0,000045', 'klein'],
  ['4500000', 'groß'],
  ['45·10^3', 'normieren'],
  ['(3·10^4)·(2·10^-7)', 'malnehmen'],
  ['(4,8·10^5):(1,2·10^-3)', 'teilen'],
  ['6,022·10^23 · 2', 'Avogadro'],
]

const RULES_P: [string, string][] = [
  ['a^m \\cdot a^n = a^{m+n}', 'gleiche Basis malnehmen'],
  ['\\frac{a^m}{a^n} = a^{m-n}', 'gleiche Basis teilen'],
  ['(a^m)^n = a^{m \\cdot n}', 'Potenz einer Potenz'],
  ['(a \\cdot b)^n = a^n \\cdot b^n', 'Produkt potenzieren'],
  ['a^0 = 1, \\quad a^{-n} = \\frac{1}{a^n}', 'Hoch 0 und negative Hochzahlen'],
  ['\\sqrt[n]{a^m} = a^{\\frac{m}{n}}', 'Wurzel als Potenz'],
]
const RULES_S: [string, string][] = [
  ['a \\cdot 10^n,\\; 1 \\le a < 10', 'wissenschaftliche Schreibweise'],
  ['0{,}0045 = 4{,}5 \\cdot 10^{-3}', 'Komma nach rechts → Hochzahl negativ'],
  ['10^a \\cdot 10^b = 10^{a+b}', 'Zehnerpotenzen malnehmen'],
  ['10^a : 10^b = 10^{a-b}', 'Zehnerpotenzen teilen'],
]

export default function Potenzen({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'gesetze')
  const sci = mode === 'zehner'
  const [t, setT] = useParam('t', EX_P[0][0])
  const { res, err } = useSolve(() => (t.trim() ? (sci ? sciInput(t) : powerInput(t)) : null), [t, sci])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro={
        sci
          ? 'Zahl umwandeln oder mit Zehnerpotenzen rechnen: Der Rechner verschiebt das Komma, fasst die Hochzahlen zusammen und normiert das Ergebnis.'
          : 'Produkt oder Quotient mit Potenzen und Wurzeln eingeben. Der Rechner schreibt Wurzeln als Potenzen, wendet die Potenzgesetze an und zieht Wurzeln so weit wie möglich.'
      }
      path={tool.path}
      actions={
        <Seg
          value={sci ? 'zehner' : 'gesetze'}
          onChange={(v) => {
            setMode(v)
            setT(v === 'zehner' ? EX_S[0][0] : EX_P[0][0])
          }}
          options={[
            ['gesetze', 'Potenzgesetze & Wurzeln'],
            ['zehner', 'Zehnerpotenzen'],
          ]}
          label="Modus"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <span className="calc__label">{sci ? 'Zahl oder Rechnung' : 'Term'}</span>
          <MathInput value={t} onChange={setT} keys="root" size="lg" sci={sci} placeholder={sci ? 'z. B. 0,000045' : 'z. B. a^3 · a^5'} ariaLabel={sci ? 'Zahl' : 'Term'} />
          <Examples items={sci ? EX_S : EX_P} onPick={setT} current={t} />
          <p className="calc__hint">
            Hochzahl: <kbd>a^3</kbd>, Bruch als Hochzahl: <kbd>a^(1/2)</kbd> · Wurzel: <kbd>√(…)</kbd> oder <kbd>sqrt(…)</kbd>, dritte Wurzel: <kbd>∛(…)</kbd> · Zehnerpotenz: <kbd>·10^-3</kbd>
          </p>
        </section>
        <Rules items={sci ? RULES_S : RULES_P} />
      </div>
      <SolutionCard sol={res} err={err} />
    </CalcPage>
  )
}
