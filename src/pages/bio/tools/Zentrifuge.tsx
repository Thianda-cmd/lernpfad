import { rcfFromRpm, rotorSwap, rpmFromRcf } from '../../../math/alg/centrifuge'
import { parseNum } from '../../../math/alg/numinput'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import type { CalcTool } from '../../../math/tools'

type Mode = 'rzb' | 'drehzahl' | 'rotor'

const RULES: Record<Mode, [string, string][]> = {
  rzb: [
    ['\\text{RZB} = 1{,}118 \\cdot 10^{-5} \\cdot r \\cdot n^2', 'r in cm, n in min⁻¹'],
    ['a = \\omega^2 \\cdot r,\\quad \\omega = \\frac{2\\pi n}{60}', 'woher die Formel kommt'],
    ['\\text{RZB} = \\frac{a}{g},\\quad g = 9{,}81\\,\\tfrac{\\text{m}}{\\text{s}^2}', 'Vielfaches der Erdbeschleunigung'],
    ['r = r_{\\max}', 'Achse bis Röhrchenboden'],
  ],
  drehzahl: [
    ['n = \\sqrt{\\frac{\\text{RZB}}{1{,}118 \\cdot 10^{-5} \\cdot r}}', 'Drehzahl aus der RZB'],
    ['\\text{RZB} = 1{,}118 \\cdot 10^{-5} \\cdot r \\cdot n^2', 'r in cm, n in min⁻¹'],
    ['\\text{rpm} = \\text{min}^{-1}', 'Umdrehungen pro Minute'],
  ],
  rotor: [
    ['r_1 \\cdot n_1^2 = r_2 \\cdot n_2^2', 'gleiche RZB in beiden Rotoren'],
    ['n_2 = n_1 \\cdot \\sqrt{\\frac{r_1}{r_2}}', 'Drehzahl im eigenen Rotor'],
    ['\\text{RZB} = 1{,}118 \\cdot 10^{-5} \\cdot r \\cdot n^2', 'r in cm, n in min⁻¹'],
  ],
}

const EX: Record<Mode, Record<string, { label: string; r?: string; ru?: string; n?: string; g?: string; r1?: string; n1?: string; r2?: string }>> = {
  rzb: {
    tisch: { label: 'r = 10 cm, 3000 min⁻¹', r: '10', ru: 'cm', n: '3000' },
    mikro: { label: 'r = 84 mm, 13 000 min⁻¹', r: '84', ru: 'mm', n: '13000' },
    doppelt: { label: 'r = 10 cm, 6000 min⁻¹', r: '10', ru: 'cm', n: '6000' },
  },
  drehzahl: {
    hoch: { label: '10 000 × g bei r = 7 cm', r: '7', ru: 'cm', g: '10000' },
    zellen: { label: '300 × g bei r = 15 cm (Zellen pelletieren)', r: '15', ru: 'cm', g: '300' },
  },
  rotor: {
    protokoll: { label: 'Protokoll 4000 min⁻¹ (r = 15 cm) → r = 10 cm', r1: '15', n1: '4000', r2: '10', ru: 'cm' },
    gross: { label: '12 000 min⁻¹ (r = 8 cm) → r = 9,5 cm', r1: '8', n1: '12000', r2: '9,5', ru: 'cm' },
  },
}

export default function Zentrifuge({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'rzb')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'rzb') as Mode
  const [r, setR] = useParam('r', '10')
  const [ru, setRu] = useParam('ru', 'cm')
  const [n, setN] = useParam('n', '3000')
  const [g, setG] = useParam('rzb', '10000')
  const [r1, setR1] = useParam('r1', '15')
  const [n1, setN1] = useParam('n1', '4000')
  const [r2, setR2] = useParam('r2', '10')

  const unit = ru === 'mm' ? 'mm' : 'cm'
  const { res, err } = useSolve(() => {
    if (m === 'rzb') return rcfFromRpm({ r: parseNum(r, 'Radius'), ru: unit, n: parseNum(n, 'Drehzahl') })
    if (m === 'drehzahl') return rpmFromRcf({ r: parseNum(r, 'Radius'), ru: unit, rcf: parseNum(g, 'RZB') })
    return rotorSwap({ r1: parseNum(r1, 'Radius r₁'), n1: parseNum(n1, 'Drehzahl n₁'), r2: parseNum(r2, 'Radius r₂'), ru: unit })
  }, [m, r, unit, n, g, r1, n1, r2])

  const pick = (k: string) => {
    const e = EX[m][k]
    if (e.r !== undefined) setR(e.r)
    if (e.ru !== undefined) setRu(e.ru)
    if (e.n !== undefined) setN(e.n)
    if (e.g !== undefined) setG(e.g)
    if (e.r1 !== undefined) setR1(e.r1)
    if (e.n1 !== undefined) setN1(e.n1)
    if (e.r2 !== undefined) setR2(e.r2)
  }

  return (
    <CalcPage
      eyebrow="Biologie · Laborrechner"
      title={tool.title}
      intro="Relative Zentrifugalbeschleunigung (RZB, × g) und Drehzahl (min⁻¹, rpm) umrechnen – und herausfinden, wie schnell der eigene Rotor laufen muss, wenn ein Protokoll nur eine Drehzahl nennt."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['rzb', 'Drehzahl → RZB'],
            ['drehzahl', 'RZB → Drehzahl'],
            ['rotor', 'Rotor wechseln'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m !== 'rotor' ? (
            <div className="calc__fields">
              <NumField label="Radius r" sub="Achse bis Röhrchenboden" value={r} onChange={setR} unit={unit} units={['cm', 'mm']} onUnit={setRu} />
              {m === 'rzb' ? <NumField label="Drehzahl n" sub="Umdrehungen pro Minute" value={n} onChange={setN} unit="min⁻¹" /> : <NumField label="RZB" sub="relative Zentrifugalbeschleunigung" value={g} onChange={setG} unit="× g" />}
            </div>
          ) : (
            <>
              <span className="calc__label">Laut Protokoll</span>
              <div className="calc__fields">
                <NumField label="Radius r₁" sub="Rotor im Protokoll" value={r1} onChange={setR1} unit={unit} units={['cm', 'mm']} onUnit={setRu} />
                <NumField label="Drehzahl n₁" value={n1} onChange={setN1} unit="min⁻¹" />
              </div>
              <span className="calc__label">Eigener Rotor</span>
              <div className="calc__fields">
                <NumField label="Radius r₂" sub="Achse bis Röhrchenboden" value={r2} onChange={setR2} unit={unit} />
              </div>
            </>
          )}
          <Examples items={Object.entries(EX[m]).map(([k, e]) => [k, e.label] as [string, string])} onPick={pick} />
          <p className="calc__hint">Den Radius findest du im Datenblatt des Rotors (meist als r max). Kommazahlen mit Komma oder Punkt.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res} err={err} empty="Trage Radius und Drehzahl ein – der Lösungsweg erscheint hier." />
    </CalcPage>
  )
}
