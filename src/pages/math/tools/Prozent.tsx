import { massFraction, percentBasic, percentChange, ruleOfThree, type ChangeMode, type ThreeKind } from '../../../math/alg/percent'
import { parseNum } from '../../../math/alg/numinput'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import type { CalcTool } from '../../../math/tools'

const RULES_PCT: [string, string][] = [
  ['W = \\frac{G \\cdot p}{100}', 'Prozentwert (Anteil)'],
  ['p = \\frac{W}{G} \\cdot 100', 'Prozentsatz'],
  ['G = \\frac{W \\cdot 100}{p}', 'Grundwert (das Ganze)'],
  ['G_{\\text{neu}} = G \\cdot \\left(1 \\pm \\tfrac{p}{100}\\right)', 'Aufschlag (+) bzw. Rabatt (−)'],
  ['w = \\frac{m_{\\text{Stoff}}}{m_{\\text{Lösung}}} \\cdot 100\\,\\%', 'Massenanteil einer Lösung'],
]

const RULES_DREISATZ: [string, string][] = [
  ['a_1 \\;\\widehat{=}\\; b_1', 'Bedingungssatz: was zusammengehört'],
  ['1 \\;\\widehat{=}\\; \\frac{b_1}{a_1}', 'proportional: Schluss auf die Einheit'],
  ['b_2 = \\frac{b_1}{a_1} \\cdot a_2', 'proportional: je mehr, desto mehr'],
  ['b_2 = \\frac{b_1 \\cdot a_1}{a_2}', 'antiproportional: je mehr, desto weniger'],
  ['\\frac{b_1}{a_1} = \\frac{b_2}{a_2}', 'quotientengleich (proportional)'],
  ['a_1 \\cdot b_1 = a_2 \\cdot b_2', 'produktgleich (antiproportional)'],
]

type Mode = 'grund' | 'aendern' | 'anteil' | 'dreisatz'

const RULES: Record<Mode, [string, string][]> = { grund: RULES_PCT, aendern: RULES_PCT, anteil: RULES_PCT, dreisatz: RULES_DREISATZ }

const EX_DREISATZ: Record<string, { label: string; kind: ThreeKind; a1: string; b1: string; a2: string; ea: string; eb: string }> = {
  loesung: { label: '3 g in 250 mL → 400 mL', kind: 'prop', a1: '250', b1: '3', a2: '400', ea: 'mL', eb: 'g' },
  acetat: { label: 'Natriumacetat: 8,2 g pro Liter → 250 mL', kind: 'prop', a1: '1000', b1: '8,2', a2: '250', ea: 'mL', eb: 'g' },
  preis: { label: '5 Packungen kosten 32,50 €', kind: 'prop', a1: '5', b1: '32,50', a2: '8', ea: 'Packungen', eb: '€' },
  personen: { label: '4 Personen brauchen 6 h', kind: 'anti', a1: '4', b1: '6', a2: '3', ea: 'Personen', eb: 'h' },
  vorrat: { label: 'Vorrat: 15 Tage bei 40 mL/Tag', kind: 'anti', a1: '40', b1: '15', a2: '50', ea: 'mL/Tag', eb: 'Tage' },
}

function TextField({ label, sub, value, onChange, placeholder }: { label: string; sub?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="nf">
      <span className="nf__label">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <span className="nf__row">
        <input className="nf__input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false} autoComplete="off" />
      </span>
    </label>
  )
}

export default function Prozent({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'grund')
  const m = (['grund', 'aendern', 'anteil', 'dreisatz'].includes(mode) ? mode : 'grund') as Mode
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
  // Dreisatz
  const [zu, setZu] = useParam('zuordnung', 'prop')
  const [a1, setA1] = useParam('a1', '250')
  const [b1, setB1] = useParam('b1', '3')
  const [a2, setA2] = useParam('a2', '400')
  const [ea, setEa] = useParam('ea', 'mL')
  const [eb, setEb] = useParam('eb', 'g')
  const kind = (zu === 'anti' ? 'anti' : 'prop') as ThreeKind
  const { res, err } = useSolve(() => {
    if (m === 'grund') return percentBasic(parseNum(G, 'G'), parseNum(W, 'W'), parseNum(p, 'p'), unit.trim())
    if (m === 'aendern') return percentChange(cm as ChangeMode, up === 'auf', parseNum(a, 'Wert'), parseNum(b, 'Wert'), unit.trim())
    if (m === 'dreisatz') return ruleOfThree(kind, parseNum(a1, 'a₁'), parseNum(b1, 'b₁'), parseNum(a2, 'a₂'), ea, eb)
    return massFraction(parseNum(w, 'w'), parseNum(ms, 'm(Stoff)'), parseNum(mlm, 'm(Lösungsmittel)'), parseNum(ml, 'm(Lösung)'), 'g')
  }, [m, G, W, p, unit, cm, up, a, b, w, ms, mlm, ml, kind, a1, b1, a2, ea, eb])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Werte eintragen, die du kennst – das leere Feld wird berechnet. Mit Formel und zusätzlich mit dem Dreisatz – im Modus Dreisatz auch für proportionale und antiproportionale Zuordnungen."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['grund', 'G · W · p'],
            ['aendern', 'Aufschlag & Rabatt'],
            ['anteil', 'Massenanteil'],
            ['dreisatz', 'Dreisatz'],
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
          {m === 'dreisatz' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Zuordnung</span>
                <Seg
                  value={kind}
                  onChange={setZu}
                  options={[
                    ['prop', 'je mehr, desto mehr'],
                    ['anti', 'je mehr, desto weniger'],
                  ]}
                  label="Zuordnung"
                />
              </div>
              <span className="calc__label">
                Bekannt: <span style={{ textTransform: 'none' }}>a₁ ≙ b₁</span> – gesucht: <span style={{ textTransform: 'none' }}>b₂</span> zu <span style={{ textTransform: 'none' }}>a₂</span>
              </span>
              <div className="calc__fields">
                <NumField label="a₁" value={a1} onChange={setA1} unit={ea.trim() || undefined} />
                <NumField label="b₁" sub="gehört zu a₁" value={b1} onChange={setB1} unit={eb.trim() || undefined} />
                <NumField label="a₂" sub="neuer Wert" value={a2} onChange={setA2} unit={ea.trim() || undefined} />
              </div>
              <div className="calc__fields">
                <TextField label="Einheit von a" sub="optional" value={ea} onChange={setEa} placeholder="z. B. mL" />
                <TextField label="Einheit von b" sub="optional" value={eb} onChange={setEb} placeholder="z. B. g" />
              </div>
              <Examples
                items={Object.entries(EX_DREISATZ).map(([k, e]) => [k, e.label] as [string, string])}
                onPick={(k) => {
                  const e = EX_DREISATZ[k]
                  setZu(e.kind)
                  setA1(e.a1)
                  setB1(e.b1)
                  setA2(e.a2)
                  setEa(e.ea)
                  setEb(e.eb)
                }}
              />
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt, Brüche wie 1/3 gehen auch.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res} err={err} empty="Trage die bekannten Werte ein." />
    </CalcPage>
  )
}
