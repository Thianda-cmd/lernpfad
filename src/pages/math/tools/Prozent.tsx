import { massFraction, percentBasic, percentChange, type ChangeMode } from '../../../math/alg/percent'
import { parseNum } from '../../../math/alg/numinput'
import { CalcPage, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import type { CalcTool } from '../../../math/tools'

const RULES: [string, string][] = [
  ['W = \\frac{G \\cdot p}{100}', 'Prozentwert (Anteil)'],
  ['p = \\frac{W}{G} \\cdot 100', 'Prozentsatz'],
  ['G = \\frac{W \\cdot 100}{p}', 'Grundwert (das Ganze)'],
  ['G_{\\text{neu}} = G \\cdot \\left(1 \\pm \\tfrac{p}{100}\\right)', 'Aufschlag (+) bzw. Rabatt (−)'],
  ['w = \\frac{m_{\\text{Stoff}}}{m_{\\text{Lösung}}} \\cdot 100\\,\\%', 'Massenanteil einer Lösung'],
]

type Mode = 'grund' | 'aendern' | 'anteil'

export default function Prozent({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'grund')
  const m = (['grund', 'aendern', 'anteil'].includes(mode) ? mode : 'grund') as Mode
  // Grundaufgaben
  const [G, setG] = useParam('G', '240')
  const [W, setW] = useParam('W', '')
  const [p, setP] = useParam('p', '15')
  const [unit, setUnit] = useParam('einheit', '')
  // Änderung
  const [cm, setCm] = useParam('art', 'neu')
  const [up, setUp] = useParam('richtung', 'auf')
  const [a, setA] = useParam('a', '349')
  const [b, setB] = useParam('b', '19')
  // Massenanteil
  const [w, setWw] = useParam('w', '')
  const [ms, setMs] = useParam('ms', '12')
  const [mlm, setMlm] = useParam('mlm', '188')
  const [ml, setMl] = useParam('ml', '')
  const { res, err } = useSolve(() => {
    if (m === 'grund') return percentBasic(parseNum(G, 'G'), parseNum(W, 'W'), parseNum(p, 'p'), unit.trim())
    if (m === 'aendern') return percentChange(cm as ChangeMode, up === 'auf', parseNum(a, 'Wert'), parseNum(b, 'Wert'), unit.trim())
    return massFraction(parseNum(w, 'w'), parseNum(ms, 'm(Stoff)'), parseNum(mlm, 'm(Lösungsmittel)'), parseNum(ml, 'm(Lösung)'), 'g')
  }, [m, G, W, p, unit, cm, up, a, b, w, ms, mlm, ml])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Werte eintragen, die du kennst – das leere Feld wird berechnet. Mit Formel und zusätzlich mit dem Dreisatz."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['grund', 'G · W · p'],
            ['aendern', 'Aufschlag & Rabatt'],
            ['anteil', 'Massenanteil'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'grund' && (
            <>
              <span className="calc__label">Zwei Werte eintragen, einer bleibt leer</span>
              <div className="calc__fields">
                <NumField label="Grundwert G" sub="das Ganze" value={G} onChange={setG} unit={unit || undefined} />
                <NumField label="Prozentwert W" sub="der Anteil" value={W} onChange={setW} unit={unit || undefined} />
                <NumField label="Prozentsatz p" value={p} onChange={setP} unit="%" />
                <NumField label="Einheit" sub="optional" value={unit} onChange={setUnit} placeholder="z. B. €, g, Proben" />
              </div>
            </>
          )}
          {m === 'aendern' && (
            <>
              <div className="calc__row">
                <Seg
                  value={cm as ChangeMode}
                  onChange={(v) => {
                    setCm(v)
                    if (v === 'satz') {
                      setA('80')
                      setB('92')
                    } else if (v === 'alt') {
                      setA('255')
                      setB('15')
                    } else {
                      setA('349')
                      setB('19')
                    }
                  }}
                  options={[
                    ['neu', 'Neuer Preis'],
                    ['alt', 'Alter Preis'],
                    ['satz', 'Änderung in %'],
                  ]}
                  label="Gesucht"
                />
                {cm !== 'satz' && (
                  <Seg
                    value={up}
                    onChange={setUp}
                    options={[
                      ['auf', '+ Aufschlag'],
                      ['ab', '− Rabatt'],
                    ]}
                    label="Richtung"
                  />
                )}
              </div>
              <div className="calc__fields">
                <NumField label={cm === 'alt' ? 'Neuer Wert' : 'Alter Wert'} value={a} onChange={setA} unit={unit || undefined} />
                {cm === 'satz' ? <NumField label="Neuer Wert" value={b} onChange={setB} unit={unit || undefined} /> : <NumField label={up === 'auf' ? 'Aufschlag p' : 'Rabatt p'} value={b} onChange={setB} unit="%" />}
                <NumField label="Einheit" sub="optional" value={unit} onChange={setUnit} placeholder="z. B. €" />
              </div>
            </>
          )}
          {m === 'anteil' && (
            <>
              <span className="calc__label">Zwei Werte eintragen</span>
              <div className="calc__fields">
                <NumField label="Massenanteil w" value={w} onChange={setWw} unit="%" />
                <NumField label="Masse Stoff" sub="gelöster Stoff" value={ms} onChange={setMs} unit="g" />
                <NumField label="Masse Lösungsmittel" sub="z. B. Wasser" value={mlm} onChange={setMlm} unit="g" />
                <NumField label="Masse Lösung" sub="Stoff + Lösungsmittel" value={ml} onChange={setMl} unit="g" />
              </div>
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt, Brüche wie 1/3 gehen auch.</p>
        </section>
        <Rules items={RULES} />
      </div>
      <SolutionCard sol={res} err={err} empty="Trage die bekannten Werte ein." />
    </CalcPage>
  )
}
