import { useMemo } from 'react'
import { parseNum } from '../../math/alg/numinput'
import { amount, atomsOf, composition, CONC_U, dilution, formulaTexOf, MASS_U, mixCross, mixResult, molarFromMass, molarMass, MOL_U, solution, VOL_U, type Given } from '../../math/alg/stoich'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../math/ui/Calc'
import { Tex } from '../../math/tex'
import { CHEM_CALC, type CalcTool } from '../../math/tools'

type Mode = 'stoffmenge' | 'molmasse' | 'atome' | 'zusammensetzung' | 'loesung' | 'verduennen' | 'mischen'

const RULES: Record<Mode, [string, string][]> = {
  stoffmenge: [
    ['n = \\frac{m}{M}', 'Stoffmenge aus Masse'],
    ['m = n \\cdot M', 'Masse aus Stoffmenge'],
    ['N = n \\cdot N_A', 'Teilchenzahl'],
    ['N_A = 6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1}', 'Avogadro-Konstante'],
    ['m_{\\text{Teilchen}} = \\frac{M}{N_A}', 'Masse eines einzelnen Teilchens'],
  ],
  molmasse: [
    ['M = \\frac{m}{n}', 'molare Masse aus Masse und Stoffmenge'],
    ['[M] = \\frac{\\text{g}}{\\text{mol}}', 'Masse in g, Stoffmenge in mol einsetzen'],
    ['M(\\text{Element}) \\;\\widehat{=}\\; \\text{Atommasse}', 'Zahlenwert wie im Periodensystem'],
  ],
  atome: [
    ['n = \\frac{m}{M}', 'erst die Stoffmenge der Verbindung'],
    ['N = n \\cdot N_A', 'Anzahl der Formeleinheiten (Moleküle)'],
    ['N_{\\text{Atome}} = k \\cdot N', 'k: Index des Elements in der Formel'],
  ],
  zusammensetzung: [
    ['w(E) = \\frac{k \\cdot M(E)}{M} \\cdot 100\\,\\%', 'Massenprozent eines Elements'],
    ['\\text{Atom-\\%} = \\frac{\\text{Atome von E}}{\\text{alle Atome}} \\cdot 100\\,\\%', 'Atomprozent'],
  ],
  loesung: [
    ['c = \\frac{n}{V}', 'Stoffmengenkonzentration'],
    ['m = c \\cdot V \\cdot M', 'Einwaage für eine Lösung'],
    ['1\\,\\text{L} = 1000\\,\\text{mL}', 'Volumen immer in Liter einsetzen'],
  ],
  verduennen: [
    ['c_1 \\cdot V_1 = c_2 \\cdot V_2', 'Stoffmenge bleibt gleich'],
    ['V_{\\text{Wasser}} = V_2 - V_1', 'zuzugebendes Lösungsmittel'],
  ],
  mischen: [
    ['m_1 : m_2 = (w_Z - w_2) : (w_1 - w_Z)', 'Mischungskreuz'],
    ['w_M = \\frac{m_1 w_1 + m_2 w_2}{m_1 + m_2}', 'Mischungsgleichung'],
    ['w = 0\\,\\%', 'reines Wasser im Mischungskreuz'],
  ],
}

const FORMULAS = ['NaCl', 'NaOH', 'H2SO4', 'HCl', 'CuSO4·5H2O', 'C6H12O6', 'KMnO4', 'Ca3(PO4)2', 'CH3COONa·3H2O']

/** Aufgaben vom Arbeitsblatt „M, m, n, m%, N“ zum Nachrechnen */
const TASKS: Record<string, { label: string; f: string; given: Given; val: string; unit: string }> = {
  a1: { label: '1) 130 g BaSO₄', f: 'BaSO4', given: 'm', val: '130', unit: 'g' },
  a2: { label: '2) 0,37 mmol Ca(NO₃)₂', f: 'Ca(NO3)2', given: 'n', val: '0,37', unit: 'mmol' },
  a6: { label: '6) 21 mg ZnS', f: 'ZnS', given: 'm', val: '21', unit: 'mg' },
  a11: { label: '11) ein Cu-Atom', f: 'Cu', given: 'N', val: '1', unit: '' },
  a12: { label: '12) drei H₂O-Moleküle', f: 'H2O', given: 'N', val: '3', unit: '' },
  a15: { label: '15) 2 µmol AgNO₃', f: 'AgNO3', given: 'n', val: '2', unit: 'µmol' },
  a17: { label: '17) 20 nmol Al₂(SO₄)₃', f: 'Al2(SO4)3', given: 'n', val: '20', unit: 'nmol' },
}

const MM_TASKS: Record<string, { label: string; m: string; mu: string; n: string; nu: string }> = {
  a9: { label: '9) 31,725 g ≙ 250 mmol', m: '31,725', mu: 'g', n: '250', nu: 'mmol' },
  a10: { label: '10) 25,07 mg ≙ 125 µmol', m: '25,07', mu: 'mg', n: '125', nu: 'µmol' },
  acetat: { label: 'Verbindung: 4,1 g ≙ 50 mmol', m: '4,1', mu: 'g', n: '50', nu: 'mmol' },
}

const AT_TASKS: Record<string, { label: string; f: string; el: string; given: Given; val: string; unit: string }> = {
  a16: { label: '16) Fe in 30 g FeO', f: 'FeO', el: 'Fe', given: 'm', val: '30', unit: 'g' },
  a18: { label: '18) O in 25 mg Ca(OH)₂', f: 'Ca(OH)2', el: 'O', given: 'm', val: '25', unit: 'mg' },
  acetat: { label: 'C in 1 g Natriumacetat', f: 'CH3COONa', el: 'C', given: 'm', val: '1', unit: 'g' },
  h2o: { label: 'H in 1 mol H₂O', f: 'H2O', el: 'H', given: 'n', val: '1', unit: 'mol' },
}

function FormulaField({ value, onChange, M, setM }: { value: string; onChange: (v: string) => void; M: string; setM: (v: string) => void }) {
  return (
    <>
      <div className="calc__fields">
        <label className="nf">
          <span className="nf__label">
            Summenformel<small>z. B. H2SO4</small>
          </span>
          <span className="nf__row">
            <input className="nf__input nf__input--formula" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" placeholder="H2SO4" />
          </span>
        </label>
        <NumField label="oder molare Masse M" sub="falls keine Formel" value={M} onChange={setM} unit="g/mol" />
      </div>
      {value.trim() && (
        <div className="calc__formula">
          <Tex>{formulaTexOf(value)}</Tex>
        </div>
      )}
      <Examples items={FORMULAS} onPick={onChange} current={value} />
    </>
  )
}

export default function Rechnen({ tool = CHEM_CALC }: { tool?: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'stoffmenge')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'stoffmenge') as Mode
  const [f, setF] = useParam('formel', 'H2SO4')
  const [M, setM] = useParam('M', '')
  // Stoffmenge
  const [given, setGiven] = useParam('gegeben', 'm')
  const [val, setVal] = useParam('wert', '10')
  const [unit, setUnit] = useParam('einheit', 'g')
  // Lösung
  const [c, setC] = useParam('c', '0,5')
  const [cu, setCu] = useParam('cu', 'mol/L')
  const [V, setV] = useParam('V', '250')
  const [vu, setVu] = useParam('vu', 'mL')
  const [mm, setMm] = useParam('masse', '')
  const [mu, setMu] = useParam('mu', 'g')
  // Verdünnen
  const [c1, setC1] = useParam('c1', '2')
  const [V1, setV1] = useParam('V1', '50')
  const [c2, setC2] = useParam('c2', '0,5')
  const [V2, setV2] = useParam('V2', '')
  // Mischen
  const [mix, setMix] = useParam('mischen', 'kreuz')
  const [w1, setW1] = useParam('w1', '40')
  const [w2, setW2] = useParam('w2', '10')
  const [wz, setWz] = useParam('wz', '25')
  const [mg, setMg] = useParam('mg', '600')
  const [m1, setM1] = useParam('m1', '2')
  const [m2, setM2] = useParam('m2', '3')
  const [x1, setX1] = useParam('x1', '80')
  const [x2, setX2] = useParam('x2', '20')
  // Molare Masse gesucht
  const [mmv, setMmv] = useParam('mm', '31,725')
  const [mmu, setMmu] = useParam('mmu', 'g')
  const [nnv, setNnv] = useParam('nn', '250')
  const [nnu, setNnu] = useParam('nnu', 'mmol')
  // Atome eines Elements
  const [el, setEl] = useParam('element', '')
  const elements = useMemo(() => {
    try {
      return molarMass(f).parts.map((p) => p.sym)
    } catch {
      return []
    }
  }, [f])
  const elOk = elements.includes(el) ? el : (elements[0] ?? '')

  const units: string[] = given === 'm' ? MASS_U.map((x) => x.u) : given === 'n' ? MOL_U.map((x) => x.u) : []
  const unitOk = units.includes(unit) ? unit : (units[given === 'm' ? 1 : 0] ?? '')
  const { res, err } = useSolve(() => {
    switch (m) {
      case 'stoffmenge':
        return amount({ formula: f, M: parseNum(M, 'M'), given: given as Given, value: parseNum(val, 'Wert'), unit: unitOk })
      case 'molmasse':
        return molarFromMass(parseNum(mmv, 'Masse m'), mmu, parseNum(nnv, 'Stoffmenge n'), nnu)
      case 'atome':
        return f.trim() ? atomsOf({ formula: f, element: elOk, given: given as Given, value: parseNum(val, 'Wert'), unit: unitOk }) : null
      case 'zusammensetzung':
        return f.trim() ? composition(f) : null
      case 'loesung':
        return solution({ formula: f, M: parseNum(M, 'M'), c: parseNum(c, 'c'), cu, V: parseNum(V, 'V'), vu, m: parseNum(mm, 'm'), mu })
      case 'verduennen':
        return dilution(parseNum(c1, 'c₁'), parseNum(V1, 'V₁'), parseNum(c2, 'c₂'), parseNum(V2, 'V₂'), cu, vu)
      case 'mischen':
        if (mix === 'kreuz') return mixCross(parseNum(w1, 'w₁'), parseNum(w2, 'w₂'), parseNum(wz, 'Ziel'), parseNum(mg, 'Gesamtmasse'), 'g')
        return mixResult(parseNum(m1, 'm₁'), parseNum(x1, 'Wert 1'), parseNum(m2, 'm₂'), parseNum(x2, 'Wert 2'), mix === 'temp' ? 'T' : 'w', mix === 'temp' ? 'kg' : 'g')
    }
  }, [m, f, M, given, val, unitOk, c, cu, V, vu, mm, mu, c1, V1, c2, V2, mix, w1, w2, wz, mg, m1, m2, x1, x2, mmv, mmu, nnv, nnu, elOk])
  const conc = useMemo(() => CONC_U.map((x) => x.u), [])
  const vols = useMemo(() => VOL_U.map((x) => x.u), [])
  const masses = useMemo(() => MASS_U.map((x) => x.u), [])
  const mols = useMemo(() => MOL_U.map((x) => x.u), [])
  return (
    <CalcPage
      eyebrow="Chemie · Rechner"
      title={tool.title}
      intro="Chemisches Rechnen fürs Labor: Stoffmenge und Teilchenzahl, molare Masse aus Messwerten (welches Element?), Atome eines Elements zählen, Zusammensetzung von Verbindungen, Lösungen ansetzen, verdünnen und mischen – jeweils mit vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['stoffmenge', 'Stoffmenge'],
            ['molmasse', 'M gesucht'],
            ['atome', 'Atome zählen'],
            ['zusammensetzung', 'Zusammensetzung'],
            ['loesung', 'Lösung ansetzen'],
            ['verduennen', 'Verdünnen'],
            ['mischen', 'Mischen'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {(m === 'stoffmenge' || m === 'loesung') && <FormulaField value={f} onChange={setF} M={M} setM={setM} />}
          {(m === 'zusammensetzung' || m === 'atome') && (
            <>
              <label className="nf">
                <span className="nf__label">Summenformel</span>
                <span className="nf__row">
                  <input className="nf__input nf__input--formula" value={f} onChange={(e) => setF(e.target.value)} spellCheck={false} autoComplete="off" placeholder="C6H12O6" />
                </span>
              </label>
              {m === 'atome' && f.trim() && elements.length > 0 && (
                <div className="calc__formula">
                  <Tex>{formulaTexOf(f)}</Tex>
                </div>
              )}
              <Examples items={FORMULAS} onPick={setF} current={f} />
            </>
          )}
          {m === 'atome' && elements.length > 0 && (
            <div className="calc__row">
              <span className="calc__label">Atome von</span>
              <Seg value={elOk} onChange={setEl} options={elements.map((e) => [e, e] as [string, string])} label="Element" />
            </div>
          )}
          {(m === 'stoffmenge' || m === 'atome') && (
            <>
              <div className="calc__row">
                <span className="calc__label">Gegeben ist</span>
                <Seg
                  value={given as Given}
                  onChange={(v) => {
                    setGiven(v)
                    setUnit(v === 'm' ? 'g' : v === 'n' ? 'mmol' : '')
                    setVal(v === 'N' ? '6,022·10^21' : v === 'n' ? '25' : '10')
                  }}
                  options={[
                    ['m', 'Masse m'],
                    ['n', 'Stoffmenge n'],
                    ['N', m === 'atome' ? 'Formeleinheiten N' : 'Teilchenzahl N'],
                  ]}
                  label="Gegeben"
                />
              </div>
              <div className="calc__fields">
                <NumField label={given === 'm' ? 'Masse m' : given === 'n' ? 'Stoffmenge n' : m === 'atome' ? 'Formeleinheiten N' : 'Teilchenzahl N'} value={val} onChange={setVal} unit={unitOk} units={units.length ? units : undefined} onUnit={setUnit} />
              </div>
              <span className="calc__label">Aufgaben vom Arbeitsblatt</span>
              {m === 'stoffmenge' ? (
                <Examples
                  items={Object.entries(TASKS).map(([k, t]) => [k, t.label] as [string, string])}
                  onPick={(k) => {
                    const t = TASKS[k]
                    setF(t.f)
                    setGiven(t.given)
                    setVal(t.val)
                    setUnit(t.unit)
                  }}
                />
              ) : (
                <Examples
                  items={Object.entries(AT_TASKS).map(([k, t]) => [k, t.label] as [string, string])}
                  onPick={(k) => {
                    const t = AT_TASKS[k]
                    setF(t.f)
                    setEl(t.el)
                    setGiven(t.given)
                    setVal(t.val)
                    setUnit(t.unit)
                  }}
                />
              )}
            </>
          )}
          {m === 'molmasse' && (
            <>
              <span className="calc__label">Masse und Stoffmenge derselben Portion</span>
              <div className="calc__fields">
                <NumField label="Masse m" value={mmv} onChange={setMmv} unit={mmu} units={masses} onUnit={setMmu} />
                <NumField label="Stoffmenge n" value={nnv} onChange={setNnv} unit={nnu} units={mols} onUnit={setNnu} />
              </div>
              <span className="calc__label">Aufgaben vom Arbeitsblatt</span>
              <Examples
                items={Object.entries(MM_TASKS).map(([k, t]) => [k, t.label] as [string, string])}
                onPick={(k) => {
                  const t = MM_TASKS[k]
                  setMmv(t.m)
                  setMmu(t.mu)
                  setNnv(t.n)
                  setNnu(t.nu)
                }}
              />
            </>
          )}
          {m === 'loesung' && (
            <>
              <span className="calc__label">Zwei der drei Größen eintragen</span>
              <div className="calc__fields">
                <NumField label="Konzentration c" value={c} onChange={setC} unit={cu} units={conc} onUnit={setCu} />
                <NumField label="Volumen V" value={V} onChange={setV} unit={vu} units={vols} onUnit={setVu} />
                <NumField label="Masse m" sub="Einwaage" value={mm} onChange={setMm} unit={mu} units={masses} onUnit={setMu} />
              </div>
            </>
          )}
          {m === 'verduennen' && (
            <>
              <span className="calc__label">Drei Werte eintragen, einer bleibt leer</span>
              <div className="calc__fields">
                <NumField label="c₁" sub="Ausgangslösung" value={c1} onChange={setC1} unit={cu} units={conc} onUnit={setCu} />
                <NumField label="V₁" sub="davon abmessen" value={V1} onChange={setV1} unit={vu} units={vols} onUnit={setVu} />
                <NumField label="c₂" sub="gewünscht" value={c2} onChange={setC2} unit={cu} />
                <NumField label="V₂" sub="Endvolumen" value={V2} onChange={setV2} unit={vu} />
              </div>
            </>
          )}
          {m === 'mischen' && (
            <>
              <div className="calc__row">
                <Seg
                  value={mix}
                  onChange={setMix}
                  options={[
                    ['kreuz', 'Mischungskreuz'],
                    ['gleichung', 'Mischung berechnen'],
                    ['temp', 'Mischtemperatur'],
                  ]}
                  label="Art"
                />
              </div>
              {mix === 'kreuz' ? (
                <div className="calc__fields">
                  <NumField label="w₁" sub="Lösung 1" value={w1} onChange={setW1} unit="%" />
                  <NumField label="w₂" sub="Lösung 2 (Wasser: 0)" value={w2} onChange={setW2} unit="%" />
                  <NumField label="Ziel" sub="gewünschter Gehalt" value={wz} onChange={setWz} unit="%" />
                  <NumField label="Gesamtmasse" sub="optional" value={mg} onChange={setMg} unit="g" />
                </div>
              ) : (
                <div className="calc__fields">
                  <NumField label="m₁" value={m1} onChange={setM1} unit={mix === 'temp' ? 'kg' : 'g'} />
                  <NumField label={mix === 'temp' ? 'T₁' : 'w₁'} value={x1} onChange={setX1} unit={mix === 'temp' ? '°C' : '%'} />
                  <NumField label="m₂" value={m2} onChange={setM2} unit={mix === 'temp' ? 'kg' : 'g'} />
                  <NumField label={mix === 'temp' ? 'T₂' : 'w₂'} value={x2} onChange={setX2} unit={mix === 'temp' ? '°C' : '%'} />
                </div>
              )}
            </>
          )}
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die Werte ein." />
    </CalcPage>
  )
}
