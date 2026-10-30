import type { ReactNode } from 'react'
import { parseNum } from '../../../math/alg/numinput'
import { calibration, lambertBeer, transExt, type CalibOut, type TGiven } from '../../../math/alg/photometry'
import { CONC_U, fnt, T as unitTex, unitNames } from '../../../math/alg/units'
import { CalcPage, DataField, DataTable, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import DataPlot from '../../../math/ui/DataPlot'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

type Mode = 'lambert' | 'transmission' | 'kalibrierung'

const RULES: Record<Mode, [string, string][]> = {
  lambert: [
    ['E = \\varepsilon \\cdot c \\cdot d', 'Lambert-Beer-Gesetz'],
    ['c = \\frac{E}{\\varepsilon \\cdot d}', 'Konzentration aus der Extinktion'],
    ['[\\varepsilon] = \\tfrac{\\text{L}}{\\text{mol} \\cdot \\text{cm}}', 'molarer Extinktionskoeffizient'],
    ['c_{\\text{Probe}} = c \\cdot F', 'Verdünnung zurückrechnen'],
    ['\\beta = c \\cdot M', 'Massenkonzentration'],
  ],
  transmission: [
    ['T = \\frac{I}{I_0}', 'Transmission (durchgelassener Anteil)'],
    ['E = -\\lg T = \\lg \\frac{I_0}{I}', 'Extinktion'],
    ['T = 10^{-E}', 'zurück zur Transmission'],
    ['E = 2 - \\lg T_{\\%}', 'mit T in Prozent'],
    ['0{,}1 \\le E \\le 1', 'gut messbarer Bereich'],
  ],
  kalibrierung: [
    ['E = m \\cdot c + b', 'Kalibriergerade'],
    ['m = \\frac{\\sum (c_i - \\bar c)(E_i - \\bar E)}{\\sum (c_i - \\bar c)^2}', 'Steigung (kleinste Quadrate)'],
    ['b = \\bar E - m \\cdot \\bar c', 'Achsenabschnitt'],
    ['c = \\frac{E - b}{m}', 'Probe auswerten'],
    ['R^2 \\ge 0{,}99', 'gute Kalibrierung'],
  ],
}

const EX_LB: Record<string, { label: string; E: string; eps: string; c: string; cu: string; d: string; F: string; M: string }> = {
  nadh: { label: 'NADH bei 340 nm: c gesucht', E: '0,311', eps: '6220', c: '', cu: 'µmol/L', d: '1', F: '', M: '' },
  eps: { label: 'ε bestimmen', E: '0,622', eps: '', c: '0,1', cu: 'mmol/L', d: '1', F: '', M: '' },
  ext: { label: 'E gesucht', E: '', eps: '6220', c: '80', cu: 'µmol/L', d: '1', F: '', M: '' },
  farbstoff: { label: 'Farbstoff 1 : 10 verdünnt', E: '0,45', eps: '15000', c: '', cu: 'µmol/L', d: '1', F: '10', M: '300' },
}

const EX_T: Record<string, { label: string; tg: TGiven; T?: string; tu?: string; I?: string; I0?: string; Ex?: string }> = {
  t45: { label: 'T = 45 %', tg: 'T', T: '45', tu: '%' },
  t10: { label: 'T = 10 %', tg: 'T', T: '10', tu: '%' },
  anteil: { label: 'T = 0,8 (Anteil)', tg: 'T', T: '0,8', tu: 'Anteil' },
  intens: { label: 'I = 250, I₀ = 1000', tg: 'I', I: '250', I0: '1000' },
  e035: { label: 'E = 0,35', tg: 'E', Ex: '0,35' },
}

const STD_DEFAULT = '0; 0,002\n2; 0,084\n4; 0,165\n6; 0,249\n8; 0,331\n10; 0,410'
const EX_CAL: Record<string, { label: string; std: string; probe: string; nullp: string; F: string; unit: string }> = {
  standard: { label: 'Standardreihe 0–10 mg/L', std: STD_DEFAULT, probe: '0,205; 0,210; 0,207', nullp: '0', F: '', unit: 'mg/L' },
  verd: { label: 'Probe 1 : 5 verdünnt', std: STD_DEFAULT, probe: '0,205; 0,210; 0,207', nullp: '0', F: '5', unit: 'mg/L' },
  protein: { label: 'Protein (g/L)', std: '0; 0,000\n2; 0,105\n4; 0,208\n6; 0,315\n8; 0,411\n10; 0,518', probe: '0,290', nullp: '1', F: '', unit: 'g/L' },
  extra: { label: 'Probe zu konzentriert', std: STD_DEFAULT, probe: '0,512', nullp: '0', F: '', unit: 'mg/L' },
}

const cell = (t: string): ReactNode => <Tex>{t}</Tex>

export default function Photometrie({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'lambert')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'lambert') as Mode
  // Lambert-Beer
  const [E, setE] = useParam('E', '0,311')
  const [eps, setEps] = useParam('eps', '6220')
  const [c, setC] = useParam('c', '')
  const [cu, setCu] = useParam('cu', 'µmol/L')
  const [d, setD] = useParam('d', '1')
  const [du, setDu] = useParam('du', 'cm')
  const [F, setF] = useParam('F', '')
  const [M, setM] = useParam('M', '')
  // Transmission
  const [tg, setTg] = useParam('tg', 'T')
  const [T, setT] = useParam('T', '45')
  const [tu, setTu] = useParam('tu', '%')
  const [I, setI] = useParam('I', '250')
  const [I0, setI0] = useParam('I0', '1000')
  const [Ex, setEx] = useParam('Ex', '0,35')
  // Kalibrierung
  const [std, setStd] = useParam('std', STD_DEFAULT)
  const [probe, setProbe] = useParam('probe', '0,205; 0,210; 0,207')
  const [nullp, setNullp] = useParam('null', '0')
  const [kf, setKf] = useParam('kf', '')
  const [ku, setKu] = useParam('ku', 'mg/L')

  const given = (['T', 'I', 'E'].includes(tg) ? tg : 'T') as TGiven
  const cuOk = unitNames(CONC_U).includes(cu) ? cu : 'mol/L'
  const { res, err } = useSolve(() => {
    if (m === 'lambert') return lambertBeer({ E: parseNum(E, 'E'), eps: parseNum(eps, 'ε'), c: parseNum(c, 'c'), cu: cuOk, d: parseNum(d, 'd'), du, F: parseNum(F, 'Verdünnungsfaktor'), M: parseNum(M, 'M') })
    if (m === 'transmission') return transExt({ given, T: parseNum(T, 'T'), tu, I: parseNum(I, 'I'), I0: parseNum(I0, 'I₀'), E: parseNum(Ex, 'E') })
    if (!std.trim()) return null
    return calibration({ pairs: std, samples: probe, origin: nullp === '1', F: parseNum(kf, 'Verdünnungsfaktor'), unit: ku })
  }, [m, E, eps, c, cuOk, d, du, F, M, given, T, tu, I, I0, Ex, std, probe, nullp, kf, ku])

  const cal = m === 'kalibrierung' && res && 'fit' in res ? (res as CalibOut) : null
  const pickLB = (k: string) => {
    const e = EX_LB[k]
    setE(e.E)
    setEps(e.eps)
    setC(e.c)
    setCu(e.cu)
    setD(e.d)
    setDu('cm')
    setF(e.F)
    setM(e.M)
  }
  const pickT = (k: string) => {
    const e = EX_T[k]
    setTg(e.tg)
    if (e.T !== undefined) setT(e.T)
    if (e.tu !== undefined) setTu(e.tu)
    if (e.I !== undefined) setI(e.I)
    if (e.I0 !== undefined) setI0(e.I0)
    if (e.Ex !== undefined) setEx(e.Ex)
  }
  const pickCal = (k: string) => {
    const e = EX_CAL[k]
    setStd(e.std)
    setProbe(e.probe)
    setNullp(e.nullp)
    setKf(e.F)
    setKu(e.unit)
  }

  return (
    <CalcPage
      eyebrow="Chemie · Rechner"
      title={tool.title}
      intro="Photometrie im Labor: Konzentrationen mit dem Lambert-Beer-Gesetz, Transmission und Extinktion umrechnen und Proben über eine Kalibriergerade auswerten – mit Diagramm und vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['lambert', 'Lambert-Beer'],
            ['transmission', 'Transmission ↔ Extinktion'],
            ['kalibrierung', 'Kalibriergerade'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'lambert' && (
            <>
              <span className="calc__label">Drei Werte eintragen, einer bleibt leer</span>
              <div className="calc__fields">
                <NumField label="Extinktion E" sub="ohne Einheit" value={E} onChange={setE} />
                <NumField label="ε" sub="molarer Extinktionskoeffizient" value={eps} onChange={setEps} unit="L/(mol·cm)" />
                <NumField label="Konzentration c" value={c} onChange={setC} unit={cuOk} units={unitNames(CONC_U)} onUnit={setCu} />
                <NumField label="Schichtdicke d" sub="meist 1 cm" value={d} onChange={setD} unit={du} units={['cm', 'mm']} onUnit={setDu} />
              </div>
              <span className="calc__label">Optional</span>
              <div className="calc__fields">
                <NumField label="Verdünnungsfaktor F" sub="z. B. 10 bei 1 : 10" value={F} onChange={setF} />
                <NumField label="Molare Masse M" sub="für β in g/L" value={M} onChange={setM} unit="g/mol" />
              </div>
              <Examples items={Object.entries(EX_LB).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickLB} />
            </>
          )}
          {m === 'transmission' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Gegeben ist</span>
                <Seg
                  value={given}
                  onChange={setTg}
                  options={[
                    ['T', 'Transmission T'],
                    ['I', 'Intensitäten I, I₀'],
                    ['E', 'Extinktion E'],
                  ]}
                  label="Gegeben"
                />
              </div>
              <div className="calc__fields">
                {given === 'T' && <NumField label="Transmission T" value={T} onChange={setT} unit={tu} units={['%', 'Anteil']} onUnit={setTu} />}
                {given === 'I' && (
                  <>
                    <NumField label="I" sub="nach der Probe" value={I} onChange={setI} />
                    <NumField label="I₀" sub="ohne Probe (Blindwert)" value={I0} onChange={setI0} />
                  </>
                )}
                {given === 'E' && <NumField label="Extinktion E" value={Ex} onChange={setEx} />}
              </div>
              <Examples items={Object.entries(EX_T).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickT} />
            </>
          )}
          {m === 'kalibrierung' && (
            <>
              <DataField label="Standards" sub="je Zeile: Konzentration; Extinktion" value={std} onChange={setStd} rows={6} placeholder={'0; 0,002\n2; 0,084'} hint="Trennzeichen: Semikolon oder Leerzeichen, Dezimalkomma erlaubt." />
              <div className="calc__fields">
                <NumField label="Einheit der Konzentration" sub="frei, z. B. mg/L" value={ku} onChange={setKu} placeholder="mg/L" />
                <NumField label="Extinktion der Probe" sub="mehrere: Mittelwert" value={probe} onChange={setProbe} placeholder="0,205; 0,210" />
                <NumField label="Verdünnungsfaktor F" sub="optional" value={kf} onChange={setKf} />
              </div>
              <div className="calc__row">
                <span className="calc__label">Gerade</span>
                <Seg
                  value={nullp === '1' ? '1' : '0'}
                  onChange={setNullp}
                  options={[
                    ['0', 'mit Achsenabschnitt'],
                    ['1', 'durch den Nullpunkt'],
                  ]}
                  label="Art der Geraden"
                />
              </div>
              <Examples items={Object.entries(EX_CAL).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickCal} />
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt; Zehnerpotenzen wie 2·10^-3 gehen auch.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die Messwerte ein.">
        {cal && <CalibFigure cal={cal} />}
      </SolutionCard>
    </CalcPage>
  )
}

function CalibFigure({ cal }: { cal: CalibOut }) {
  const u = cal.unit
  const pts = cal.std.map(([x, y]) => ({ x, y, kind: 'std' as const }))
  const sample = cal.sample
  const points = sample ? [...pts, { x: sample.c, y: sample.E, kind: 'sample' as const, label: 'Probe' }] : pts
  const { m, b } = cal.fit
  return (
    <>
      <div className="calc__fig">
        <DataPlot points={points} lines={[{ m, b }]} guides={sample ? [{ x: sample.c, y: sample.E }] : []} xLabel={u ? `c in ${u}` : 'c'} yLabel="Extinktion E" />
        <div className="calc__figinfo">
          <div>
            <span>Kalibriergerade</span>
            <Tex>{b === 0 ? `E = ${fnt(m)} \\cdot c` : `E = ${fnt(m)} \\cdot c ${b < 0 ? '-' : '+'} ${fnt(Math.abs(b))}`}</Tex>
          </div>
          <div>
            <span>Bestimmtheitsmaß</span>
            <Tex>{`R^2 = ${fnt(cal.fit.r2, 5)}`}</Tex>
          </div>
          {sample && (
            <div>
              <span>Probe</span>
              <Tex>{`\\bar E = ${fnt(sample.E)} \\;\\Rightarrow\\; c = ${fnt(sample.c)}${unitTex(u)}`}</Tex>
              {cal.outside && <span>außerhalb des Kalibrierbereichs</span>}
            </div>
          )}
        </div>
      </div>
      <div className="calc__insert">
        <DataTable
          caption="Standards und Abweichung von der Geraden"
          head={['Nr.', cell(`c${u ? `\\ \\text{in}${unitTex(u)}` : ''}`), cell('E'), cell('E_{\\text{Gerade}}'), cell('\\Delta E')]}
          rows={cal.std.map(([x, y], i) => [String(i + 1), cell(fnt(x)), cell(fnt(y)), cell(fnt(m * x + b)), cell(fnt(y - (m * x + b), 2))])}
        />
      </div>
    </>
  )
}
