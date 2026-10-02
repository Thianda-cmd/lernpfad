import { simplifyInput } from '../../../math/alg/simplify'
import { factorInput } from '../../../math/alg/factor'
import { CalcPage, Examples, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import MathInput from '../../../math/ui/MathInput'
import type { CalcTool } from '../../../math/tools'

const EX_V: [string, string][] = [
  ['3x - (2x - 5) + 4(x + 2)', 'Plus- & Minusklammer'],
  ['4u + [11v - (4u + 3w)] - [21u + (66u - 14w)]', 'verschachtelt'],
  ['(x + 4)(x + 5)', 'Klammer mal Klammer'],
  ['(2a + 3)^2', '1. binomische'],
  ['(x - 3)(x + 3)', '3. binomische'],
  ['(4a - 3b)(a + 5b) - (2a + b)^2', 'gemischt'],
  ['3,2p + 6,2q - (1,5p - 0,7q)', 'Kommazahlen'],
  ['(4x + 6)/2', 'Summe teilen'],
]
const EX_F: [string, string][] = [
  ['12x^2 + 18x', 'ggT & Variable'],
  ['-6x^2 + 9x', 'mit Minus'],
  ['4a^2 + 12ab + 9b^2', '1. binomische rückwärts'],
  ['x^2 - 10x + 25', '2. binomische rückwärts'],
  ['3x^2 - 27', 'ausklammern + 3. binomische'],
]

const RULES: [string, string][] = [
  ['+(a - b) = a - b', 'Plusklammer: einfach weglassen'],
  ['-(a - b) = -a + b', 'Minusklammer: alle Vorzeichen umdrehen'],
  ['k(a + b) = ka + kb', 'Distributivgesetz'],
  ['(a + b)(c + d) = ac + ad + bc + bd', 'Klammer mal Klammer'],
  ['(a + b)^2 = a^2 + 2ab + b^2', '1. binomische Formel'],
  ['(a - b)^2 = a^2 - 2ab + b^2', '2. binomische Formel'],
  ['(a + b)(a - b) = a^2 - b^2', '3. binomische Formel'],
]

export default function Terme({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'vereinfachen')
  const factor = mode === 'ausklammern'
  const [t, setT] = useParam('t', EX_V[0][0])
  const { res, err } = useSolve(() => (t.trim() ? (factor ? factorInput(t) : simplifyInput(t)) : null), [t, factor])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Term eingeben – der Rechner löst Klammern von innen nach außen auf, multipliziert aus, erkennt binomische Formeln und fasst zusammen. Oder umgekehrt: ausklammern und faktorisieren."
      path={tool.path}
      actions={
        <Seg
          value={factor ? 'ausklammern' : 'vereinfachen'}
          onChange={(v) => {
            setMode(v)
            setT(v === 'ausklammern' ? EX_F[0][0] : EX_V[0][0])
          }}
          options={[
            ['vereinfachen', 'Vereinfachen'],
            ['ausklammern', 'Ausklammern & Faktorisieren'],
          ]}
          label="Modus"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <span className="calc__label">Term</span>
          <MathInput value={t} onChange={setT} keys="algebra" size="lg" placeholder="z. B. 3x - (2x - 5)" ariaLabel="Term" />
          <Examples items={factor ? EX_F : EX_V} onPick={setT} current={t} />
          <p className="calc__hint">
            Mal: <kbd>*</kbd> oder einfach <kbd>3x</kbd> · Hochzahl: <kbd>x^2</kbd> · Kommazahlen mit Komma · eckige Klammern <kbd>[ ]</kbd> gehen auch.
          </p>
        </section>
        <Rules items={RULES} />
      </div>
      <SolutionCard sol={res} err={err} />
    </CalcPage>
  )
}
