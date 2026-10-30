import { convertConc, fromStock, RHO_U, STOCKS, volumeFraction, W_U, type ConcKind, type PhiMode } from '../../../math/alg/concentration'
import { parseNum } from '../../../math/alg/numinput'
import { formulaTexOf } from '../../../math/alg/stoich'
import { CONC_U, MCONC_U, unitNames, VOL_U } from '../../../math/alg/units'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

type Mode = 'umrechnen' | 'stamm' | 'volumen'

const RULES: Record<Mode, [string, string][]> = {
  umrechnen: [
    ['\\beta = c \\cdot M', 'Massenkonzentration aus c'],
    ['c = \\frac{\\beta}{M}', 'Stoffmengenkonzentration aus β'],
    ['w = \\frac{\\beta}{\\rho}', 'Massenanteil – ρ in g/L einsetzen'],
    ['c = \\frac{w \\cdot \\rho \\cdot 1000}{M \\cdot 100}', 'w in %, ρ in g/mL'],
    ['1\\,\\text{ppm} = 1\\,\\tfrac{\\text{mg}}{\\text{kg}}', 'verdünnt wässrig ≈ 1 mg/L'],
  ],
  stamm: [
    ['c_{\\text{Stamm}} = \\frac{w \\cdot \\rho}{M}', 'Konzentration der Stammlösung'],
    ['c_1 \\cdot V_1 = c_2 \\cdot V_2', 'Stoffmenge bleibt beim Verdünnen gleich'],
    ['V_{\\text{Stamm}} = \\frac{c_{\\text{Ziel}} \\cdot V_{\\text{Ziel}}}{c_{\\text{Stamm}}}', 'abzumessendes Volumen'],
    ['\\text{Erst das Wasser, dann die Säure!}', 'Säure ins Wasser, nie umgekehrt'],
  ],
  volumen: [
    ['\\varphi = \\frac{V_{\\text{Stoff}}}{V_{\\text{Gesamt}}}', 'Volumenanteil'],
    ['V_{\\text{Stamm}} = \\frac{\\varphi_{\\text{Ziel}} \\cdot V_{\\text{Ziel}}}{\\varphi_{\\text{Stamm}}}', 'aus einer Stammlösung'],
    ['50\\,\\text{mL} + 50\\,\\text{mL} < 100\\,\\text{mL}', 'Volumenkontraktion (Ethanol/Wasser)'],
  ],
}

const KIND_UNITS: Record<ConcKind, string[]> = { c: unitNames(CONC_U), beta: unitNames(MCONC_U), w: unitNames(W_U) }
const KIND_DEFAULT: Record<ConcKind, [string, string]> = { c: ['1', 'mol/L'], beta: ['10', 'g/L'], w: ['10', '%'] }

const CONV_EX: { id: string; label: string; known: ConcKind; value: string; unit: string; formula: string; rho: string }[] = [
  { id: 'hcl', label: 'Salzsäure 37 %', known: 'w', value: '37', unit: '%', formula: 'HCl', rho: '1,19' },
  { id: 'h2so4', label: 'Schwefelsäure 96 %', known: 'w', value: '96', unit: '%', formula: 'H2SO4', rho: '1,84' },
  { id: 'naoh', label: 'Natronlauge 1 mol/L', known: 'c', value: '1', unit: 'mol/L', formula: 'NaOH', rho: '1,04' },
  { id: 'nacl', label: 'Kochsalzlösung 9 g/L', known: 'beta', value: '9', unit: 'g/L', formula: 'NaCl', rho: '1,005' },
  { id: 'nitrat', label: 'Nitrat 50 mg/L', known: 'beta', value: '50', unit: 'mg/L', formula: 'NO3', rho: '1' },
]

const PHI_EX: { id: string; label: string; phi1: string; phi2: string; V: string; name: string }[] = [
  { id: 'eth70', label: '70 % Ethanol aus 96 %', phi1: '96', phi2: '70', V: '100', name: 'Ethanol' },
  { id: 'eth80', label: '80 % Ethanol aus 96 %', phi1: '96', phi2: '80', V: '500', name: 'Ethanol' },
  { id: 'iso70', label: '70 % Isopropanol aus 99 %', phi1: '99', phi2: '70', V: '250', name: 'Isopropanol' },
]

function FormulaInput({ value, onChange, M, setM, sub }: { value: string; onChange: (v: string) => void; M: string; setM: (v: string) => void; sub?: string }) {
  return (
    <>
      <div className="calc__fields">
        <label className="nf">
          <span className="nf__label">
            Summenformel<small>{sub ?? 'z. B. HCl'}</small>
          </span>
          <span className="nf__row">
            <input className="nf__input nf__input--formula" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" placeholder="HCl" />
          </span>
        </label>
        <NumField label="oder molare Masse M" sub="falls keine Formel" value={M} onChange={setM} unit="g/mol" />
      </div>
      {value.trim() && (
        <div className="calc__formula">
          <Tex>{formulaTexOf(value)}</Tex>
        </div>
      )}
    </>
  )
}

export default function Konzentrationen({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'umrechnen')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'umrechnen') as Mode
  // Umrechnen
  const [known, setKnown] = useParam('gegeben', 'w')
  const kn = (['c', 'beta', 'w'].includes(known) ? known : 'w') as ConcKind
  const [val, setVal] = useParam('wert', '37')
  const [unit, setUnit] = useParam('einheit', '%')
  const [f, setF] = useParam('formel', 'HCl')
  const [M, setM] = useParam('M', '')
  const [rho, setRho] = useParam('rho', '1,19')
  const [rhoU, setRhoU] = useParam('rhou', 'g/mL')
  // aus konzentrierter Lösung
  const [stock, setStock] = useParam('stamm', 'hcl')
  const [sf, setSf] = useParam('sformel', 'HCl')
  const [sM, setSM] = useParam('sM', '')
  const [sw, setSw] = useParam('sw', '37')
  const [srho, setSrho] = useParam('srho', '1,19')
  const [cz, setCz] = useParam('c', '1')
  const [czu, setCzu] = useParam('cu', 'mol/L')
  const [vz, setVz] = useParam('V', '500')
  const [vzu, setVzu] = useParam('vu', 'mL')
  // Volumenanteil
  const [art, setArt] = useParam('art', 'ansetzen')
  const pm = (art === 'anteil' ? 'anteil' : 'ansetzen') as PhiMode
  const [phi1, setPhi1] = useParam('phi1', '96')
  const [phi2, setPhi2] = useParam('phi2', '70')
  const [pV, setPV] = useParam('pV', '100')
  const [pVu, setPVu] = useParam('pvu', 'mL')
  const [pName, setPName] = useParam('stoff', 'Ethanol')
  const [phi, setPhi] = useParam('phi', '')
  const [vs, setVs] = useParam('vs', '30')
  const [vg, setVg] = useParam('vg', '250')

  const units = KIND_UNITS[kn]
  const unitOk = units.includes(unit) ? unit : KIND_DEFAULT[kn][1]
  const pre = STOCKS.find((s) => s.id === stock && s.formula === sf.trim())

  const { res, err } = useSolve(() => {
    switch (m) {
      case 'umrechnen':
        return convertConc({ known: kn, value: parseNum(val, 'Wert'), unit: unitOk, formula: f, M: parseNum(M, 'M'), rho: parseNum(rho, 'ρ'), rhoUnit: rhoU })
      case 'stamm':
        return fromStock({ formula: sf, M: parseNum(sM, 'M'), w: parseNum(sw, 'w'), rho: parseNum(srho, 'ρ'), c: parseNum(cz, 'c'), cu: czu, V: parseNum(vz, 'V'), vu: vzu, kind: pre?.kind })
      case 'volumen':
        return pm === 'ansetzen'
          ? volumeFraction({ art: 'ansetzen', phi1: parseNum(phi1, 'φ (Stamm)'), phi2: parseNum(phi2, 'φ (Ziel)'), V: parseNum(pV, 'V'), vu: pVu, name: pName })
          : volumeFraction({ art: 'anteil', phi: parseNum(phi, 'φ'), Vs: parseNum(vs, 'V (Stoff)'), Vg: parseNum(vg, 'V (Gesamt)'), vu: pVu, name: pName })
    }
  }, [m, kn, val, unitOk, f, M, rho, rhoU, sf, sM, sw, srho, cz, czu, vz, vzu, pre?.kind, pm, phi1, phi2, pV, pVu, pName, phi, vs, vg])

  const vols = unitNames(VOL_U)
  return (
    <CalcPage
      eyebrow="Chemie · Rechner"
      title={tool.title}
      intro="Stoffmengenkonzentration, Massenkonzentration, Massenanteil und Volumenanteil ineinander umrechnen – mit Dichte, Einheiten und Lösungsweg. Auch: verdünnte Lösungen aus konzentrierten Säuren und Laugen ansetzen."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['umrechnen', 'Umrechnen'],
            ['stamm', 'Aus konzentrierter Lösung'],
            ['volumen', 'Volumenanteil'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'umrechnen' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Gegeben ist</span>
                <Seg
                  value={kn}
                  onChange={(v) => {
                    setKnown(v)
                    setVal(KIND_DEFAULT[v][0])
                    setUnit(KIND_DEFAULT[v][1])
                  }}
                  options={[
                    ['c', 'c (mol/L)'],
                    ['beta', 'β (g/L)'],
                    ['w', 'w (%)'],
                  ]}
                  label="Gegeben"
                />
              </div>
              <div className="calc__fields">
                <NumField
                  label={kn === 'c' ? 'Stoffmengenkonzentration c' : kn === 'beta' ? 'Massenkonzentration β' : 'Massenanteil w'}
                  value={val}
                  onChange={setVal}
                  unit={unitOk}
                  units={units}
                  onUnit={setUnit}
                />
                <NumField label="Dichte ρ der Lösung" sub={kn === 'w' ? 'nötig' : 'für w'} value={rho} onChange={setRho} unit={rhoU} units={unitNames(RHO_U)} onUnit={setRhoU} />
              </div>
              <FormulaInput value={f} onChange={setF} M={M} setM={setM} />
              <Examples
                items={CONV_EX.map((e) => [e.id, e.label] as [string, string])}
                current={CONV_EX.find((e) => e.known === kn && e.value === val && e.formula === f && e.unit === unitOk)?.id}
                onPick={(id) => {
                  const e = CONV_EX.find((x) => x.id === id)
                  if (!e) return
                  setKnown(e.known)
                  setVal(e.value)
                  setUnit(e.unit)
                  setF(e.formula)
                  setM('')
                  setRho(e.rho)
                  setRhoU('g/mL')
                }}
              />
              <p className="calc__hint">Dichten stehen auf dem Etikett oder im Tabellenbuch. Für verdünnte wässrige Lösungen ist ρ ≈ 1 g/mL.</p>
            </>
          )}
          {m === 'stamm' && (
            <>
              <Examples
                items={STOCKS.map((s) => [s.id, s.name] as [string, string])}
                current={pre?.id}
                onPick={(id) => {
                  const s = STOCKS.find((x) => x.id === id)
                  if (!s) return
                  setStock(s.id)
                  setSf(s.formula)
                  setSM('')
                  setSw(s.w)
                  setSrho(s.rho)
                }}
              />
              <span className="calc__label">Konzentrierte Lösung</span>
              <div className="calc__fields">
                <NumField label="Massenanteil w" value={sw} onChange={setSw} unit="%" />
                <NumField label="Dichte ρ" value={srho} onChange={setSrho} unit="g/mL" />
              </div>
              <FormulaInput value={sf} onChange={setSf} M={sM} setM={setSM} sub="des gelösten Stoffs" />
              <span className="calc__label">Gewünschte Lösung</span>
              <div className="calc__fields">
                <NumField label="Konzentration c" value={cz} onChange={setCz} unit={czu} units={unitNames(CONC_U)} onUnit={setCzu} />
                <NumField label="Volumen V" sub="Messkolben" value={vz} onChange={setVz} unit={vzu} units={vols} onUnit={setVzu} />
              </div>
            </>
          )}
          {m === 'volumen' && (
            <>
              <div className="calc__row">
                <Seg
                  value={pm}
                  onChange={setArt}
                  options={[
                    ['ansetzen', 'Aus Stammlösung ansetzen'],
                    ['anteil', 'φ berechnen'],
                  ]}
                  label="Art"
                />
              </div>
              {pm === 'ansetzen' ? (
                <>
                  <Examples
                    items={PHI_EX.map((e) => [e.id, e.label] as [string, string])}
                    current={PHI_EX.find((e) => e.phi1 === phi1 && e.phi2 === phi2 && e.V === pV)?.id}
                    onPick={(id) => {
                      const e = PHI_EX.find((x) => x.id === id)
                      if (!e) return
                      setPhi1(e.phi1)
                      setPhi2(e.phi2)
                      setPV(e.V)
                      setPVu('mL')
                      setPName(e.name)
                    }}
                  />
                  <div className="calc__fields">
                    <NumField label="φ Stammlösung" value={phi1} onChange={setPhi1} unit="%" />
                    <NumField label="φ gewünscht" value={phi2} onChange={setPhi2} unit="%" />
                    <NumField label="Volumen V" sub="Ziel" value={pV} onChange={setPV} unit={pVu} units={vols} onUnit={setPVu} />
                    <label className="nf">
                      <span className="nf__label">
                        Stoff<small>optional</small>
                      </span>
                      <span className="nf__row">
                        <input className="nf__input" value={pName} onChange={(e) => setPName(e.target.value)} spellCheck={false} autoComplete="off" placeholder="z. B. Ethanol" />
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <span className="calc__label">Zwei Werte eintragen, einer bleibt leer</span>
                  <div className="calc__fields">
                    <NumField label="Volumenanteil φ" value={phi} onChange={setPhi} unit="%" />
                    <NumField label="V Stoff" sub="rein" value={vs} onChange={setVs} unit={pVu} units={vols} onUnit={setPVu} />
                    <NumField label="V Gesamt" sub="Mischung" value={vg} onChange={setVg} unit={pVu} />
                  </div>
                </>
              )}
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt; Zehnerpotenzen wie 2·10^-3 oder 2e-3.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die bekannten Werte ein." />
    </CalcPage>
  )
}
