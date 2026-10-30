import { gasChange, GAS_MOL_U, GAS_VOL_U, idealGas, molarVolume, TEMP_U, type VmCond } from '../../../math/alg/gas'
import { parseNum } from '../../../math/alg/numinput'
import { formulaTexOf } from '../../../math/alg/stoich'
import { MASS_U, MOL_U, PRESS_U, unitNames, VOL_U } from '../../../math/alg/units'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

type Mode = 'ideal' | 'molar' | 'zustand'

const RULES: Record<Mode, [string, string][]> = {
  ideal: [
    ['p \\cdot V = n \\cdot R \\cdot T', 'allgemeine Gasgleichung'],
    ['R = 8{,}314\\,\\frac{\\text{J}}{\\text{mol} \\cdot \\text{K}}', 'allgemeine Gaskonstante'],
    ['T = \\vartheta + 273{,}15', 'Temperatur in Kelvin'],
    ['1\\,\\text{J} = 1\\,\\text{Pa} \\cdot \\text{m}^3', 'darum p in Pa, V in m³'],
  ],
  molar: [
    ['V_m = \\frac{V}{n}', 'molares Volumen'],
    ['V_m = 22{,}414\\,\\tfrac{\\text{L}}{\\text{mol}}', 'Normbedingungen: 0 °C, 1013,25 hPa'],
    ['V_m \\approx 24{,}0\\,\\tfrac{\\text{L}}{\\text{mol}}', '20 °C, 1013,25 hPa'],
    ['V_m = \\frac{R \\cdot T}{p}', 'beliebige Bedingungen'],
  ],
  zustand: [
    ['\\frac{p_1 V_1}{T_1} = \\frac{p_2 V_2}{T_2}', 'allgemein (Stoffmenge gleich)'],
    ['p_1 V_1 = p_2 V_2', 'Boyle-Mariotte: T konstant'],
    ['\\frac{V_1}{T_1} = \\frac{V_2}{T_2}', 'Gay-Lussac: p konstant'],
    ['\\frac{p_1}{T_1} = \\frac{p_2}{T_2}', 'Amontons: V konstant'],
  ],
}

const IDEAL_EX: { id: string; label: string; p: string; pu: string; V: string; vu: string; n: string; nu: string; T: string; tu: string; f: string }[] = [
  { id: 'v', label: 'V von 50 mmol CO₂', p: '1013', pu: 'hPa', V: '', vu: 'L', n: '50', nu: 'mmol', T: '25', tu: '°C', f: 'CO2' },
  { id: 'p', label: 'Druck von 1 mol in 22,4 L', p: '', pu: 'hPa', V: '22,4', vu: 'L', n: '1', nu: 'mol', T: '0', tu: '°C', f: '' },
  { id: 'n', label: 'Gas im 500-mL-Kolben', p: '1', pu: 'bar', V: '500', vu: 'mL', n: '', nu: 'mmol', T: '20', tu: '°C', f: 'O2' },
  { id: 't', label: 'Temperatur gesucht', p: '2', pu: 'bar', V: '10', vu: 'L', n: '0,5', nu: 'mol', T: '', tu: 'K', f: '' },
]

const CHANGE_EX: { id: string; label: string; v: [string, string, string, string, string, string]; pu: string; vu: string; tu: string }[] = [
  { id: 'boyle', label: 'Boyle-Mariotte (T gleich)', v: ['1000', '2500', '5', '', '', ''], pu: 'hPa', vu: 'L', tu: '°C' },
  { id: 'gay', label: 'Gay-Lussac (p gleich)', v: ['', '', '2', '', '20', '80'], pu: 'hPa', vu: 'L', tu: '°C' },
  { id: 'amontons', label: 'Amontons (V gleich)', v: ['2', '', '', '', '20', '50'], pu: 'bar', vu: 'L', tu: '°C' },
  { id: 'allg', label: 'allgemein', v: ['1013', '2026', '10', '', '0', '273'], pu: 'hPa', vu: 'L', tu: '°C' },
]

const GIVEN_DEFAULT: Record<'V' | 'n' | 'm', [string, string]> = { V: ['1', 'L'], n: ['0,5', 'mol'], m: ['10', 'g'] }

function FormulaInput({ value, onChange, M, setM }: { value: string; onChange: (v: string) => void; M: string; setM: (v: string) => void }) {
  return (
    <>
      <div className="calc__fields">
        <label className="nf">
          <span className="nf__label">
            Gas (Summenformel)<small>optional, für Masse</small>
          </span>
          <span className="nf__row">
            <input className="nf__input nf__input--formula" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" placeholder="z. B. CO2" />
          </span>
        </label>
        <NumField label="oder molare Masse M" sub="falls keine Formel" value={M} onChange={setM} unit="g/mol" />
      </div>
      {value.trim() && (
        <div className="calc__formula">
          <Tex>{formulaTexOf(value)}</Tex>
        </div>
      )}
      <Examples items={['O2', 'N2', 'CO2', 'H2', 'CH4', 'NH3', 'Cl2']} onPick={onChange} current={value} />
    </>
  )
}

export default function Gase({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'ideal')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'ideal') as Mode
  // ideales Gas
  const [p, setP] = useParam('p', '1013')
  const [pu, setPu] = useParam('pu', 'hPa')
  const [V, setV] = useParam('V', '')
  const [vu, setVu] = useParam('vu', 'L')
  const [n, setN] = useParam('n', '50')
  const [nu, setNu] = useParam('nu', 'mmol')
  const [ms, setMs] = useParam('m', '')
  const [mu, setMu] = useParam('mu', 'g')
  const [T, setT] = useParam('T', '25')
  const [tu, setTu] = useParam('tu', '°C')
  const [f, setF] = useParam('formel', 'CO2')
  const [M, setM] = useParam('M', '')
  // molares Volumen
  const [bed, setBed] = useParam('bed', 'norm')
  const cond = (['norm', '20', '25', 'frei'].includes(bed) ? bed : 'norm') as VmCond
  const [mp, setMp] = useParam('mp', '950')
  const [mpu, setMpu] = useParam('mpu', 'hPa')
  const [mt, setMt] = useParam('mt', '30')
  const [mtu, setMtu] = useParam('mtu', '°C')
  const [gv, setGv] = useParam('gegeben', 'V')
  const given = (['V', 'n', 'm'].includes(gv) ? gv : 'V') as 'V' | 'n' | 'm'
  const [val, setVal] = useParam('wert', '1')
  const [unit, setUnit] = useParam('einheit', 'L')
  const [mf, setMf] = useParam('mformel', 'O2')
  const [mM, setMM] = useParam('mM', '')
  // Zustandsänderung
  const [p1, setP1] = useParam('p1', '1000')
  const [p2, setP2] = useParam('p2', '2500')
  const [zpu, setZpu] = useParam('zpu', 'hPa')
  const [V1, setV1] = useParam('V1', '5')
  const [V2, setV2] = useParam('V2', '')
  const [zvu, setZvu] = useParam('zvu', 'L')
  const [T1, setT1] = useParam('T1', '')
  const [T2, setT2] = useParam('T2', '')
  const [ztu, setZtu] = useParam('ztu', '°C')

  const press = unitNames(PRESS_U)
  const gvols = unitNames(GAS_VOL_U)
  const temps = [...TEMP_U] as string[]
  const givenUnits = given === 'V' ? gvols : given === 'n' ? unitNames(MOL_U) : unitNames(MASS_U)
  const unitOk = givenUnits.includes(unit) ? unit : GIVEN_DEFAULT[given][1]

  const { res, err } = useSolve(() => {
    switch (m) {
      case 'ideal':
        return idealGas({
          p: parseNum(p, 'p'),
          pu,
          V: parseNum(V, 'V'),
          vu,
          n: parseNum(n, 'n'),
          nu,
          m: parseNum(ms, 'm'),
          mu,
          T: parseNum(T, 'T'),
          tu,
          formula: f,
          M: parseNum(M, 'M'),
        })
      case 'molar':
        return molarVolume({ cond, p: parseNum(mp, 'p'), pu: mpu, T: parseNum(mt, 'T'), tu: mtu, given, value: parseNum(val, 'Wert'), unit: unitOk, formula: mf, M: parseNum(mM, 'M') })
      case 'zustand':
        return gasChange({
          p1: parseNum(p1, 'p₁'),
          p2: parseNum(p2, 'p₂'),
          pu: zpu,
          V1: parseNum(V1, 'V₁'),
          V2: parseNum(V2, 'V₂'),
          vu: zvu,
          T1: parseNum(T1, 'T₁'),
          T2: parseNum(T2, 'T₂'),
          tu: ztu,
        })
    }
  }, [m, p, pu, V, vu, n, nu, ms, mu, T, tu, f, M, cond, mp, mpu, mt, mtu, given, val, unitOk, mf, mM, p1, p2, zpu, V1, V2, zvu, T1, T2, ztu])

  const tLabel = (u: string) => (u === 'K' ? 'Temperatur T' : 'Temperatur ϑ')
  return (
    <CalcPage
      eyebrow="Chemie · Rechner"
      title={tool.title}
      intro="Rechnen mit idealen Gasen: allgemeine Gasgleichung p · V = n · R · T, molares Volumen bei Norm- und Raumbedingungen und Zustandsänderungen nach Boyle-Mariotte, Gay-Lussac und Amontons – mit Einheiten und Lösungsweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['ideal', 'Ideales Gas'],
            ['molar', 'Molares Volumen'],
            ['zustand', 'Zustandsänderung'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'ideal' && (
            <>
              <Examples
                items={IDEAL_EX.map((e) => [e.id, e.label] as [string, string])}
                current={IDEAL_EX.find((e) => e.p === p && e.V === V && e.n === n && e.T === T && !ms)?.id}
                onPick={(id) => {
                  const e = IDEAL_EX.find((x) => x.id === id)
                  if (!e) return
                  setP(e.p)
                  setPu(e.pu)
                  setV(e.V)
                  setVu(e.vu)
                  setN(e.n)
                  setNu(e.nu)
                  setMs('')
                  setT(e.T)
                  setTu(e.tu)
                  setF(e.f)
                  setM('')
                }}
              />
              <span className="calc__label">Drei Größen eintragen, eine bleibt leer</span>
              <div className="calc__fields">
                <NumField label="Druck p" value={p} onChange={setP} unit={pu} units={press} onUnit={setPu} />
                <NumField label="Volumen V" value={V} onChange={setV} unit={vu} units={gvols} onUnit={setVu} />
                <NumField label="Stoffmenge n" value={n} onChange={setN} unit={nu} units={unitNames(GAS_MOL_U)} onUnit={setNu} />
                <NumField label={tLabel(tu)} value={T} onChange={setT} unit={tu} units={temps} onUnit={setTu} />
                <NumField label="oder Masse m" sub="statt n, mit Formel" value={ms} onChange={setMs} unit={mu} units={unitNames(MASS_U)} onUnit={setMu} />
              </div>
              <FormulaInput value={f} onChange={setF} M={M} setM={setM} />
            </>
          )}
          {m === 'molar' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Bedingungen</span>
                <Seg
                  value={cond}
                  onChange={setBed}
                  options={[
                    ['norm', '0 °C (Norm)'],
                    ['20', '20 °C'],
                    ['25', '25 °C'],
                    ['frei', 'eigene'],
                  ]}
                  label="Bedingungen"
                />
              </div>
              {cond === 'frei' && (
                <div className="calc__fields">
                  <NumField label="Druck p" value={mp} onChange={setMp} unit={mpu} units={press} onUnit={setMpu} />
                  <NumField label={tLabel(mtu)} value={mt} onChange={setMt} unit={mtu} units={temps} onUnit={setMtu} />
                </div>
              )}
              <div className="calc__row">
                <span className="calc__label">Gegeben ist</span>
                <Seg
                  value={given}
                  onChange={(v) => {
                    setGv(v)
                    setVal(GIVEN_DEFAULT[v][0])
                    setUnit(GIVEN_DEFAULT[v][1])
                  }}
                  options={[
                    ['V', 'Volumen V'],
                    ['n', 'Stoffmenge n'],
                    ['m', 'Masse m'],
                  ]}
                  label="Gegeben"
                />
              </div>
              <div className="calc__fields">
                <NumField label={given === 'V' ? 'Volumen V' : given === 'n' ? 'Stoffmenge n' : 'Masse m'} value={val} onChange={setVal} unit={unitOk} units={givenUnits} onUnit={setUnit} />
              </div>
              <FormulaInput value={mf} onChange={setMf} M={mM} setM={setMM} />
            </>
          )}
          {m === 'zustand' && (
            <>
              <Examples
                items={CHANGE_EX.map((e) => [e.id, e.label] as [string, string])}
                current={CHANGE_EX.find((e) => e.v.join('|') === [p1, p2, V1, V2, T1, T2].join('|'))?.id}
                onPick={(id) => {
                  const e = CHANGE_EX.find((x) => x.id === id)
                  if (!e) return
                  const [a, b, c, d, g, h] = e.v
                  setP1(a)
                  setP2(b)
                  setV1(c)
                  setV2(d)
                  setT1(g)
                  setT2(h)
                  setZpu(e.pu)
                  setZvu(e.vu)
                  setZtu(e.tu)
                }}
              />
              <span className="calc__label">Zustand 1</span>
              <div className="calc__fields">
                <NumField label="p₁" value={p1} onChange={setP1} unit={zpu} units={press} onUnit={setZpu} />
                <NumField label="V₁" value={V1} onChange={setV1} unit={zvu} units={unitNames(VOL_U)} onUnit={setZvu} />
                <NumField label={ztu === 'K' ? 'T₁' : 'ϑ₁'} value={T1} onChange={setT1} unit={ztu} units={temps} onUnit={setZtu} />
              </div>
              <span className="calc__label">Zustand 2</span>
              <div className="calc__fields">
                <NumField label="p₂" value={p2} onChange={setP2} unit={zpu} />
                <NumField label="V₂" value={V2} onChange={setV2} unit={zvu} />
                <NumField label={ztu === 'K' ? 'T₂' : 'ϑ₂'} value={T2} onChange={setT2} unit={ztu} />
              </div>
              <p className="calc__hint">Ein Feld leer lassen – es wird berechnet. Bleibt eine Größe gleich (z. B. die Temperatur), ihre beiden Felder leer lassen.</p>
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt; Temperaturen in °C oder K – gerechnet wird immer in Kelvin.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die bekannten Werte ein." />
    </CalcPage>
  )
}
