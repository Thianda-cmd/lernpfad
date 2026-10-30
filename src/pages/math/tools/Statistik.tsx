import type { ReactNode } from 'react'
import { describe, lineTex, outlierTest, regression, type DescOut, type OutlierMethod, type OutlierOut, type RegOut } from '../../../math/alg/stats'
import { fnt } from '../../../math/alg/units'
import { CalcPage, DataField, DataTable, Examples, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import DataPlot from '../../../math/ui/DataPlot'
import { Rich, Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

type Mode = 'kenngroessen' | 'ausreisser' | 'regression'

const RULES: Record<Mode, [string, string][]> = {
  kenngroessen: [
    ['\\bar{x} = \\frac{\\sum x_i}{n}', 'Mittelwert'],
    ['s = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n - 1}}', 'Standardabweichung (Stichprobe)'],
    ['\\text{VK} = \\frac{s}{\\bar{x}} \\cdot 100\\,\\%', 'Variationskoeffizient'],
    ['s_{\\bar{x}} = \\frac{s}{\\sqrt{n}}', 'Standardfehler des Mittelwerts'],
    ['\\bar{x} \\pm t \\cdot \\frac{s}{\\sqrt{n}}', '95-%-Vertrauensbereich (t aus der Tabelle)'],
  ],
  ausreisser: [
    ['G = \\frac{|x^* - \\bar{x}|}{s}', 'Grubbs-Test (n = 3 bis 30)'],
    ['Q = \\frac{|x^* - x_{\\text{Nachbar}}|}{x_{\\max} - x_{\\min}}', 'Q-Test nach Dixon (n = 3 bis 10)'],
    ['G > G_{\\text{krit}} \\;\\Rightarrow\\; \\text{Ausreißer}', 'Entscheidung (95 %, zweiseitig)'],
  ],
  regression: [
    ['y = m \\cdot x + b', 'Ausgleichsgerade'],
    ['m = \\frac{S_{xy}}{S_{xx}}', 'Steigung'],
    ['b = \\bar{y} - m \\cdot \\bar{x}', 'Achsenabschnitt'],
    ['r = \\frac{S_{xy}}{\\sqrt{S_{xx} \\cdot S_{yy}}}', 'Korrelationskoeffizient'],
    ['R^2 \\ge 0{,}99', 'gute Kalibriergerade'],
  ],
}

const EX_KENN: Record<string, { label: string; v: string }> = {
  pipette: { label: 'Pipettenprüfung (g)', v: '0,998; 1,002; 0,995; 1,001; 0,999; 1,003; 0,997; 1,000; 0,996; 1,004' },
  hb: { label: 'Hämoglobin (g/dL)', v: '14,2; 14,5; 14,1; 14,4; 14,3' },
  zellen: { label: 'Zellzählung (4 Quadrate)', v: '52; 47; 55; 50' },
  ph: { label: 'pH-Messungen', v: '7,41; 7,38; 7,40; 7,43; 7,39; 7,40' },
  essig: { label: 'Essigsäure im Essig (g/100 mL)', v: '5,02; 4,98; 5,05; 4,99; 5,01' },
}

const EX_OUT: Record<string, { label: string; v: string; test: OutlierMethod }> = {
  glucose: { label: 'Glucose (mg/dL) · Grubbs', v: '98; 101; 99; 100; 102; 97; 115', test: 'grubbs' },
  titration: { label: 'Titration (mL) · Dixon', v: '12,45; 12,48; 12,46; 12,61; 12,47', test: 'dixon' },
  ok: { label: 'kein Ausreißer · Grubbs', v: '5,2; 5,4; 5,3; 5,5; 5,3; 5,6', test: 'grubbs' },
  unten: { label: 'zu kleiner Wert · Dixon', v: '8,2; 9,9; 10,0; 10,1; 10,2; 9,8', test: 'dixon' },
}

const REG_DEFAULT = '0; 0,002\n5; 0,118\n10; 0,231\n15; 0,352\n20; 0,463\n25; 0,577'
const EX_REG: Record<string, { label: string; v: string; xl: string; yl: string }> = {
  bradford: { label: 'Bradford-Kalibrierung', v: REG_DEFAULT, xl: 'c in µg/mL', yl: 'Absorption A₅₉₅' },
  enzym: { label: 'Enzymreaktion', v: '0; 0\n2; 0,21\n4; 0,39\n6; 0,62\n8; 0,80\n10; 1,01', xl: 't in min', yl: 'Produkt in µmol' },
  pipette: { label: 'Pipette Soll/Ist', v: '10; 9,8\n20; 19,9\n50; 49,6\n100; 99,5\n200; 198,9', xl: 'Soll in µL', yl: 'Ist in µL' },
  groesse: { label: 'Größe und Körpermasse', v: '160; 55\n165; 62\n170; 60\n175; 72\n180; 70\n185; 80', xl: 'Größe in cm', yl: 'Masse in kg' },
}

const cell = (t: string): ReactNode => <Tex>{t}</Tex>

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="nf">
      <span className="nf__label">{label}</span>
      <span className="nf__row">
        <input className="nf__input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false} autoComplete="off" />
      </span>
    </label>
  )
}

export default function Statistik({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'kenngroessen')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'kenngroessen') as Mode
  const [werte, setWerte] = useParam('werte', EX_KENN.pipette.v)
  const [test, setTest] = useParam('test', 'grubbs')
  const [awerte, setAwerte] = useParam('awerte', EX_OUT.glucose.v)
  const [paare, setPaare] = useParam('paare', REG_DEFAULT)
  const [xl, setXl] = useParam('xl', 'c in µg/mL')
  const [yl, setYl] = useParam('yl', 'Absorption A₅₉₅')
  const method = (test === 'dixon' ? 'dixon' : 'grubbs') as OutlierMethod

  const { res, err } = useSolve(() => {
    if (m === 'kenngroessen') return werte.trim() ? describe(werte) : null
    if (m === 'ausreisser') return awerte.trim() ? outlierTest(awerte, method) : null
    return paare.trim() ? regression(paare) : null
  }, [m, werte, awerte, method, paare])

  const desc = m === 'kenngroessen' && res && 'rows' in res && 'sd' in res ? (res as DescOut) : null
  const out = m === 'ausreisser' && res && 'suspect' in res ? (res as OutlierOut) : null
  const reg = m === 'regression' && res && 'fit' in res ? (res as RegOut) : null

  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Messreihen auswerten wie im Labor: Mittelwert, Median, Standardabweichung, Variationskoeffizient und Vertrauensbereich, Ausreißertests nach Grubbs und Dixon sowie die Ausgleichsgerade mit Korrelationskoeffizient – mit Diagramm und vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['kenngroessen', 'Kenngrößen'],
            ['ausreisser', 'Ausreißertest'],
            ['regression', 'Regression'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'kenngroessen' && (
            <>
              <DataField label="Messwerte" sub="mindestens zwei" value={werte} onChange={setWerte} rows={4} placeholder="0,998; 1,002; 0,995" hint="Getrennt durch Semikolon, Leerzeichen oder neue Zeile; Dezimalkomma erlaubt." />
              <Examples items={Object.entries(EX_KENN).map(([k, e]) => [k, e.label] as [string, string])} onPick={(k) => setWerte(EX_KENN[k].v)} current={Object.keys(EX_KENN).find((k) => EX_KENN[k].v === werte)} />
            </>
          )}
          {m === 'ausreisser' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Test</span>
                <Seg
                  value={method}
                  onChange={setTest}
                  options={[
                    ['grubbs', 'Grubbs (3–30 Werte)'],
                    ['dixon', 'Dixon Q-Test (3–10 Werte)'],
                  ]}
                  label="Ausreißertest"
                />
              </div>
              <DataField label="Messwerte" sub="mindestens drei" value={awerte} onChange={setAwerte} rows={4} placeholder="98; 101; 99; 100; 115" hint="Getrennt durch Semikolon, Leerzeichen oder neue Zeile; Dezimalkomma erlaubt." />
              <Examples
                items={Object.entries(EX_OUT).map(([k, e]) => [k, e.label] as [string, string])}
                onPick={(k) => {
                  setAwerte(EX_OUT[k].v)
                  setTest(EX_OUT[k].test)
                }}
                current={Object.keys(EX_OUT).find((k) => EX_OUT[k].v === awerte && EX_OUT[k].test === method)}
              />
            </>
          )}
          {m === 'regression' && (
            <>
              <DataField label="Wertepaare" sub="je Zeile: x; y" value={paare} onChange={setPaare} rows={6} placeholder={'0; 0,002\n5; 0,118'} hint="x und y durch Semikolon oder Leerzeichen trennen, Dezimalkomma erlaubt." />
              <div className="calc__fields">
                <TextField label="Beschriftung x-Achse" value={xl} onChange={setXl} placeholder="x" />
                <TextField label="Beschriftung y-Achse" value={yl} onChange={setYl} placeholder="y" />
              </div>
              <Examples
                items={Object.entries(EX_REG).map(([k, e]) => [k, e.label] as [string, string])}
                onPick={(k) => {
                  const e = EX_REG[k]
                  setPaare(e.v)
                  setXl(e.xl)
                  setYl(e.yl)
                }}
                current={Object.keys(EX_REG).find((k) => EX_REG[k].v === paare)}
              />
            </>
          )}
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage Messwerte ein – Kenngrößen, Diagramm und Lösungsweg erscheinen hier.">
        {desc && <DescFigure d={desc} />}
        {out && <OutlierFigure o={out} />}
        {reg && <RegFigure r={reg} xl={xl.trim() || 'x'} yl={yl.trim() || 'y'} />}
      </SolutionCard>
    </CalcPage>
  )
}

function DescFigure({ d }: { d: DescOut }) {
  const n = d.values.length
  const lines = [{ m: 0, b: d.mean, label: 'x̄' }]
  if (d.sd > 0) lines.push({ m: 0, b: d.mean + d.sd, label: 'x̄ + s' }, { m: 0, b: d.mean - d.sd, label: 'x̄ − s' })
  return (
    <>
      <div className="calc__fig">
        <DataPlot points={d.values.map((y, i) => ({ x: i + 1, y }))} lines={lines} includeZero={false} xRange={[0, n + 1]} xLabel="Messung Nr." yLabel="Messwert" height={260} />
        <p className="calc__figcap">
          <Rich text={'Die Punkte streuen um den Mittelwert $\\bar{x}$ (grüne Linie). Zwischen den Linien $\\bar{x} \\pm s$ liegen bei normalverteilten Werten etwa zwei Drittel der Messungen.'} />
        </p>
      </div>
      <div className="calc__insert">
        <DataTable caption="Abweichungen vom Mittelwert" head={['Nr.', cell('x_i'), cell('x_i - \\bar{x}'), cell('(x_i - \\bar{x})^2')]} rows={d.rows.map((r) => [r[0], cell(r[1]), cell(r[2]), cell(r[3])])} foot={[cell(d.foot[0]), cell(d.foot[1]), cell(d.foot[2]), cell(d.foot[3])]} />
      </div>
    </>
  )
}

function OutlierFigure({ o }: { o: OutlierOut }) {
  const n = o.values.length
  const mean = o.values.reduce((a, b) => a + b, 0) / n
  return (
    <div className="calc__fig">
      <DataPlot
        points={o.values.map((y, i) => (i === o.suspect ? { x: i + 1, y, kind: 'sample' as const, label: o.outlier ? 'Ausreißer' : 'verdächtig' } : { x: i + 1, y }))}
        lines={[{ m: 0, b: mean, label: 'x̄' }]}
        includeZero={false}
        xRange={[0, n + 1]}
        xLabel="Messung Nr."
        yLabel="Messwert"
        height={260}
      />
      <div className="calc__figinfo">
        <div>
          <span>Verdächtiger Wert</span>
          <Tex>{`x^* = ${fnt(o.values[o.suspect], 6)}`}</Tex>
        </div>
        <div>
          <span>Entscheidung (95 %)</span>
          <Tex>{o.outlier ? '\\text{Ausreißer – darf gestrichen werden}' : '\\text{kein Ausreißer – Wert bleibt}'}</Tex>
        </div>
      </div>
    </div>
  )
}

function RegFigure({ r, xl, yl }: { r: RegOut; xl: string; yl: string }) {
  const { m, b } = r.fit
  return (
    <>
      <div className="calc__fig">
        <DataPlot points={r.pts.map(([x, y]) => ({ x, y }))} lines={[{ m, b }]} xLabel={xl} yLabel={yl} />
        <div className="calc__figinfo">
          <div>
            <span>Ausgleichsgerade</span>
            <Tex>{lineTex(m, b)}</Tex>
          </div>
          <div>
            <span>Bestimmtheitsmaß</span>
            <Tex>{Number.isFinite(r.fit.r2) ? `R^2 = ${fnt(r.fit.r2, 5)}` : '\\text{nicht definiert}'}</Tex>
          </div>
          <div>
            <span>Reststandardabweichung</span>
            <Tex>{`s_y = ${fnt(r.fit.sy, 4)}`}</Tex>
          </div>
        </div>
      </div>
      <div className="calc__insert">
        <DataTable caption="Messpunkte und Abweichung von der Geraden" head={['Nr.', cell('x'), cell('y'), cell('\\hat{y} = m x + b'), cell('y - \\hat{y}')]} rows={r.rows.map((row) => [row[0], cell(row[1]), cell(row[2]), cell(row[3]), cell(row[4])])} />
      </div>
    </>
  )
}
