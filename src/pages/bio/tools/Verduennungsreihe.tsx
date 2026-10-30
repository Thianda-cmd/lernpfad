import type { ReactNode } from 'react'
import { parseNum } from '../../../math/alg/numinput'
import { dilTex, qt, sciT, serialDilution, standardSeries, STD_UNIT_NAMES, totalDilution, VOL_NAMES, volTex, type SerialBasis, type SerialSolution, type StdSolution } from '../../../math/alg/serial'
import { T } from '../../../math/alg/units'
import { toNum } from '../../../math/q'
import { CalcPage, DataField, DataTable, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

type Mode = 'seriell' | 'standard' | 'gesamt'

const RULES: Record<Mode, [string, string][]> = {
  seriell: [
    ['1 : F \\;\\widehat{=}\\; 1 + (F - 1)', '1 Teil Probe in insgesamt F Teilen'],
    ['V_{\\text{Ü}} = \\frac{V}{F}', 'Übertrag je Stufe'],
    ['V_{\\text{VM}} = V - V_{\\text{Ü}}', 'Verdünnungsmittel je Stufe'],
    ['c_n = \\frac{c_0}{F^{\\,n}}', 'Konzentration nach n Stufen'],
    ['F_{\\text{ges}} = F^{\\,k}', 'Gesamtverdünnung'],
  ],
  standard: [
    ['c_1 \\cdot V_1 = c_2 \\cdot V_2', 'Stoffmenge bleibt gleich'],
    ['V_{\\text{Stamm}} = \\frac{c_{\\text{Std}} \\cdot V}{c_{\\text{Stamm}}}', 'Volumen Stammlösung je Standard'],
    ['V_{\\text{VM}} = V - V_{\\text{Stamm}}', 'Verdünnungsmittel je Standard'],
    ['1\\,\\text{mg/mL} = 1000\\,\\mu\\text{g/mL}', 'Einheiten angleichen'],
  ],
  gesamt: [
    ['F_{\\text{ges}} = F_1 \\cdot F_2 \\cdot \\ldots', 'Faktoren multiplizieren'],
    ['1 : 10 \\;\\widehat{=}\\; 1 + 9', 'gleiche Verdünnung, andere Schreibweise'],
    ['c_0 = c_{\\text{gemessen}} \\cdot F_{\\text{ges}}', 'zurück zur Ausgangskonzentration'],
    ['10 \\cdot 10 \\cdot 10 = 10^{3} \\;\\widehat{=}\\; 10^{-3}', 'Verdünnungsstufe'],
  ],
}

const EX_SER: Record<string, { label: string; c0: string; cu: string; F: string; k: string; V: string; vu: string; basis: SerialBasis }> = {
  keime: { label: 'Keimzahl: 6 Stufen 1 : 10', c0: '1·10^8', cu: 'KbE/mL', F: '10', k: '6', V: '10', vu: 'mL', basis: 'misch' },
  mtp: { label: 'Mikrotiterplatte 1 : 2, je 100 µL', c0: '64', cu: 'µg/mL', F: '2', k: '8', V: '100', vu: 'µL', basis: 'rest' },
  fuenf: { label: '1 : 5 in 1 mL, 4 Stufen', c0: '', cu: '', F: '5', k: '4', V: '1', vu: 'mL', basis: 'misch' },
}

const EX_STD: Record<string, { label: string; stock: string; su: string; targets: string; tu: string; V: string; vu: string }> = {
  bsa: { label: 'BSA 0–200 µg/mL aus 2 mg/mL', stock: '2', su: 'mg/mL', targets: '0; 25; 50; 100; 200', tu: 'µg/mL', V: '500', vu: 'µL' },
  glucose: { label: 'Glucose 0–10 mmol/L aus 100 mmol/L', stock: '100', su: 'mmol/L', targets: '0; 2; 4; 6; 8; 10', tu: 'mmol/L', V: '1', vu: 'mL' },
  nitrat: { label: 'Nitrat 0–50 mg/L im 50-mL-Kolben', stock: '1', su: 'g/L', targets: '0; 5; 10; 25; 50', tu: 'mg/L', V: '50', vu: 'mL' },
}

const EX_TOT: Record<string, { label: string; f: string; c: string; cu: string }> = {
  drei: { label: '1:10 · 1:10 · 1:2', f: '1:10; 1:10; 1:2', c: '0,35', cu: 'mg/mL' },
  lm: { label: 'Lebensmittel: 10 g + 90 mL, dann 3 × 1:10', f: '1+9; 1:10; 1:10; 1:10', c: '', cu: '' },
  protein: { label: 'Probe 1 + 4, dann 1 : 20', f: '1+4; 1:20', c: '0,42', cu: 'µg/mL' },
}

const tex = (t: string): ReactNode => <Tex>{t}</Tex>

function SerialTable({ s }: { s: SerialSolution }) {
  const hasC = s.rows.some((r) => r.c)
  const head = ['Stufe', 'Verdünnung', ...(hasC ? [`Konzentration${s.unit ? ` in ${s.unit}` : ''}`] : []), 'Übertrag', 'Verdünnungsmittel']
  const rows = s.rows.map((r) => [String(r.i), tex(dilTex(r.F)), ...(hasC ? [tex(sciT(toNum(r.c!), 3))] : []), tex(volTex(s.vT)), tex(volTex(s.vD))])
  return (
    <div className="calc__insert">
      <DataTable caption="Pipettierschema" head={head} rows={rows} />
      <p className="calc__insert-hint">
        Verdünnungsmittel in allen Röhrchen vorlegen, dann den Übertrag aus der vorigen Stufe (Stufe 1: aus der Ausgangslösung) dazugeben und gut mischen. Inhalt je Röhrchen nach dem Mischen: <Tex>{volTex(s.vMix)}</Tex>.
      </p>
    </div>
  )
}

function StdTable({ s }: { s: StdSolution }) {
  const vt = T(s.vu)
  return (
    <div className="calc__insert">
      <DataTable
        caption="Pipettierschema der Standards"
        head={['Standard', `c in ${s.cu}`, tex(`V_{\\text{Stamm}}\\ \\text{in}${vt}`), tex(`V_{\\text{VM}}\\ \\text{in}${vt}`)]}
        rows={s.rows.map((r) => [String(r.i), tex(qt(r.c, 6)), tex(qt(r.vS)), tex(qt(r.vD))])}
        foot={['Summe', '', tex(qt(s.totalS)), tex(qt(s.totalD))]}
      />
    </div>
  )
}

export default function Verduennungsreihe({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'seriell')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'seriell') as Mode
  // seriell
  const [c0, setC0] = useParam('c0', '1·10^8')
  const [cu, setCu] = useParam('cu', 'KbE/mL')
  const [F, setF] = useParam('F', '10')
  const [k, setK] = useParam('k', '6')
  const [V, setV] = useParam('V', '10')
  const [vu, setVu] = useParam('vu', 'mL')
  const [basis, setBasis] = useParam('bezug', 'misch')
  // Standardreihe
  const [stock, setStock] = useParam('stamm', '2')
  const [su, setSu] = useParam('su', 'mg/mL')
  const [targets, setTargets] = useParam('std', '0; 25; 50; 100; 200')
  const [tu, setTu] = useParam('tu', 'µg/mL')
  const [sV, setSV] = useParam('sV', '500')
  const [svu, setSvu] = useParam('svu', 'µL')
  // Gesamtverdünnung
  const [fs, setFs] = useParam('faktoren', '1:10; 1:10; 1:2')
  const [cm, setCm] = useParam('cm', '0,35')
  const [cmu, setCmu] = useParam('cmu', 'mg/mL')

  const b: SerialBasis = basis === 'rest' ? 'rest' : 'misch'
  const vUnit = VOL_NAMES.includes(vu) ? vu : 'mL'
  const sUnit = VOL_NAMES.includes(svu) ? svu : 'µL'
  const suOk = STD_UNIT_NAMES.includes(su) ? su : 'mg/mL'
  const tuOk = STD_UNIT_NAMES.includes(tu) ? tu : 'µg/mL'
  const { res, err } = useSolve(() => {
    if (m === 'seriell') return serialDilution({ c0: parseNum(c0, 'Ausgangskonzentration'), unit: cu, F: parseNum(F, 'Verdünnungsfaktor'), k: parseNum(k, 'Anzahl der Stufen'), V: parseNum(V, 'Volumen'), vu: vUnit, basis: b })
    if (m === 'standard') return standardSeries({ stock: parseNum(stock, 'Stammlösung'), su: suOk, targets, tu: tuOk, V: parseNum(sV, 'Volumen'), vu: sUnit })
    return totalDilution({ factors: fs, c: parseNum(cm, 'Gemessene Konzentration'), unit: cmu })
  }, [m, c0, cu, F, k, V, vUnit, b, stock, suOk, targets, tuOk, sV, sUnit, fs, cm, cmu])

  const pickSer = (key: string) => {
    const e = EX_SER[key]
    setC0(e.c0)
    setCu(e.cu)
    setF(e.F)
    setK(e.k)
    setV(e.V)
    setVu(e.vu)
    setBasis(e.basis)
  }
  const pickStd = (key: string) => {
    const e = EX_STD[key]
    setStock(e.stock)
    setSu(e.su)
    setTargets(e.targets)
    setTu(e.tu)
    setSV(e.V)
    setSvu(e.vu)
  }
  const pickTot = (key: string) => {
    const e = EX_TOT[key]
    setFs(e.f)
    setCm(e.c)
    setCmu(e.cu)
  }
  const serial = m === 'seriell' && res && 'vT' in res ? (res as SerialSolution) : null
  const std = m === 'standard' && res && 'totalS' in res ? (res as StdSolution) : null

  return (
    <CalcPage
      eyebrow="Biologie · Laborrechner"
      title={tool.title}
      intro="Verdünnungsreihen planen: serielle Verdünnung mit Pipettierschema, Standardreihe aus einer Stammlösung und die Gesamtverdünnung mehrerer Schritte. „1 : 10“ heißt hier immer 1 Teil Probe in insgesamt 10 Teilen (gemischt 1 + 9)."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['seriell', 'Seriell'],
            ['standard', 'Standardreihe'],
            ['gesamt', 'Gesamtverdünnung'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'seriell' && (
            <>
              <div className="calc__fields">
                <NumField label="Verdünnungsfaktor F" sub="je Stufe, z. B. 10 für 1 : 10" value={F} onChange={setF} />
                <NumField label="Anzahl der Stufen" value={k} onChange={setK} />
                <NumField label={b === 'rest' ? 'Volumen, das übrig bleibt' : 'Volumen je Stufe'} sub={b === 'rest' ? 'nach dem Weiterpipettieren' : 'nach dem Mischen'} value={V} onChange={setV} unit={vUnit} units={VOL_NAMES} onUnit={setVu} />
              </div>
              <div className="calc__row">
                <span className="calc__label">Volumen gilt</span>
                <Seg
                  value={b}
                  onChange={setBasis}
                  options={[
                    ['misch', 'nach dem Mischen'],
                    ['rest', 'als Rest je Röhrchen'],
                  ]}
                  label="Bezug des Volumens"
                />
              </div>
              <span className="calc__label">Ausgangslösung (optional)</span>
              <div className="calc__fields">
                <NumField label="Konzentration c₀" value={c0} onChange={setC0} placeholder="leer = nur Volumina" />
                <NumField label="Einheit" sub="frei, z. B. KbE/mL" value={cu} onChange={setCu} placeholder="KbE/mL" />
              </div>
              <Examples items={Object.entries(EX_SER).map(([key, e]) => [key, e.label] as [string, string])} onPick={pickSer} />
            </>
          )}
          {m === 'standard' && (
            <>
              <div className="calc__fields">
                <NumField label="Stammlösung" sub="Konzentration" value={stock} onChange={setStock} unit={suOk} units={STD_UNIT_NAMES} onUnit={setSu} />
                <NumField label="Volumen je Standard" value={sV} onChange={setSV} unit={sUnit} units={VOL_NAMES} onUnit={setSvu} />
                <label className="nf">
                  <span className="nf__label">Einheit der Standards</span>
                  <span className="nf__row">
                    <select className="nf__input" value={tuOk} onChange={(e) => setTu(e.target.value)} aria-label="Einheit der Standards">
                      {STD_UNIT_NAMES.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
              <DataField label="Konzentrationen der Standards" sub={`in ${tuOk}`} value={targets} onChange={setTargets} rows={2} placeholder="0; 25; 50; 100; 200" hint="Der Wert 0 ergibt den Leerwert (nur Verdünnungsmittel)." />
              <Examples items={Object.entries(EX_STD).map(([key, e]) => [key, e.label] as [string, string])} onPick={pickStd} />
            </>
          )}
          {m === 'gesamt' && (
            <>
              <DataField
                label="Einzelne Verdünnungen"
                sub="z. B. 1:10; 1:10; 1+1 oder 10; 10; 2"
                value={fs}
                onChange={setFs}
                rows={2}
                placeholder="1:10; 1:10; 1:2"
                hint="„1:10“ = 1 Teil in 10 Teilen, „1+9“ = 1 Teil Probe + 9 Teile Verdünnungsmittel – beides ist der Faktor 10."
              />
              <span className="calc__label">Gemessen (optional)</span>
              <div className="calc__fields">
                <NumField label="Konzentration der letzten Lösung" value={cm} onChange={setCm} placeholder="für die Rückrechnung" />
                <NumField label="Einheit" sub="frei" value={cmu} onChange={setCmu} placeholder="mg/mL" />
              </div>
              <Examples items={Object.entries(EX_TOT).map(([key, e]) => [key, e.label] as [string, string])} onPick={pickTot} />
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt; Zehnerpotenzen wie 1·10^8 gehen auch.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res} err={err} empty="Trage die Werte ein – Pipettierschema und Lösungsweg erscheinen hier.">
        {serial && <SerialTable s={serial} />}
        {std && <StdTable s={std} />}
      </SolutionCard>
    </CalcPage>
  )
}
