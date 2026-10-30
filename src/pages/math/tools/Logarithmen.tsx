import { expEquation, GROWTH_TIME_U, growth, logCalc, powCalc, type ExpOut, type GrowthKind, type GrowthOut, type LogBase, type LogOut } from '../../../math/alg/logs'
import { parseNum } from '../../../math/alg/numinput'
import { fnt, unitNames } from '../../../math/alg/units'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import DataPlot, { type DPPoint } from '../../../math/ui/DataPlot'
import { Rich } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

/** Logarithmen rechnen auch mit riesigen Zahlen genau (über BigInt-Stellen) */
const BIG = 4000

type Mode = 'log' | 'gleichung' | 'wachstum'

const LAWS: [string, string][] = [
  ['\\lg(a \\cdot b) = \\lg a + \\lg b', 'Produkt wird zur Summe'],
  ['\\lg \\frac{a}{b} = \\lg a - \\lg b', 'Quotient wird zur Differenz'],
  ['\\lg(a^n) = n \\cdot \\lg a', 'Hochzahl wird zum Faktor'],
  ['\\log_b x = \\frac{\\lg x}{\\lg b}', 'Basiswechsel'],
]

const RULES: Record<Mode, [string, string][]> = {
  log: [['\\log_b x = y \\iff b^y = x', 'Definition'], ...LAWS, ['\\lg 1 = 0,\\quad \\lg 10 = 1', 'Sonderfälle']],
  gleichung: [['a \\cdot b^x = c \\;\\Rightarrow\\; x = \\frac{\\lg(c/a)}{\\lg b}', 'Lösungsformel'], ...LAWS],
  wachstum: [
    ['N = N_0 \\cdot 2^{t/T_d}', 'Wachstum mit Verdopplungszeit'],
    ['N = N_0 \\cdot \\left(\\tfrac{1}{2}\\right)^{t/T_{1/2}}', 'Zerfall mit Halbwertszeit'],
    ['t = T_d \\cdot \\frac{\\lg(N/N_0)}{\\lg 2}', 'Zeit (beim Zerfall: N₀/N)'],
    ['\\lg(a^n) = n \\cdot \\lg a', 'so kommt t aus der Hochzahl'],
  ],
}

const BASES: [LogBase, string][] = [
  ['10', 'lg (Basis 10)'],
  ['e', 'ln (Basis e)'],
  ['2', 'log₂'],
  ['b', 'eigene Basis'],
]

const EX_LOG: Record<string, { label: string; basis: LogBase; b?: string; ziel: 'log' | 'zahl'; x?: string; y?: string }> = {
  lg1000: { label: 'lg 1000', basis: '10', ziel: 'log', x: '1000' },
  lg2500: { label: 'lg 2500', basis: '10', ziel: 'log', x: '2500' },
  ln2: { label: 'ln 2', basis: 'e', ziel: 'log', x: '2' },
  lb64: { label: 'log₂ 64', basis: '2', ziel: 'log', x: '64' },
  log3: { label: 'log₃ 50', basis: 'b', b: '3', ziel: 'log', x: '50' },
  log48: { label: 'log₄ 8', basis: 'b', b: '4', ziel: 'log', x: '8' },
  ks: { label: 'Essigsäure: pKs 4,76 → Ks', basis: '10', ziel: 'zahl', y: '-4,76' },
  ph: { label: 'pH 7,4 → c(H₃O⁺)', basis: '10', ziel: 'zahl', y: '-7,4' },
  e05: { label: 'e hoch 0,5', basis: 'e', ziel: 'zahl', y: '0,5' },
}

const EX_GL: Record<string, { label: string; a: string; b: string; c: string; d: string }> = {
  g50: { label: '2^x = 50', a: '1', b: '2', c: '50', d: '' },
  g100: { label: '3 · 2^x + 4 = 100', a: '3', b: '2', c: '100', d: '4' },
  zins: { label: '1,05^x = 2', a: '1', b: '1,05', c: '2', d: '' },
  halb: { label: '0,5^x = 0,1', a: '1', b: '0,5', c: '0,1', d: '' },
  keine: { label: '2^x = −4 (keine Lösung)', a: '1', b: '2', c: '-4', d: '' },
}

const EX_W: Record<string, { label: string; art: GrowthKind; N: string; N0: string; t: string; tu: string; T: string; Tu: string; u: string }> = {
  ecoli: { label: 'E. coli: 20 min, nach 3 h', art: 'verdopplung', N: '', N0: '1000', t: '3', tu: 'h', T: '20', Tu: 'min', u: 'Zellen' },
  zeit: { label: 'Wann sind es 10⁹ Zellen?', art: 'verdopplung', N: '10^9', N0: '1000', t: '', tu: 'h', T: '20', Tu: 'min', u: 'Zellen' },
  gen: { label: 'Generationszeit aus Zählung', art: 'verdopplung', N: '80000', N0: '10000', t: '90', tu: 'min', T: '', Tu: 'min', u: 'Zellen/mL' },
  p32: { label: '³²P: T½ = 14,3 d, nach 30 d', art: 'halbwert', N: '', N0: '100', t: '30', tu: 'd', T: '14,3', Tu: 'd', u: '%' },
  c14: { label: '¹⁴C: wie alt bei 25 %?', art: 'halbwert', N: '25', N0: '100', t: '', tu: 'a', T: '5730', Tu: 'a', u: '%' },
  hwz: { label: 'Halbwertszeit aus Messung', art: 'halbwert', N: '20', N0: '80', t: '10', tu: 'h', T: '', Tu: 'h', u: 'mg/L' },
}

const TIME = unitNames(GROWTH_TIME_U)

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

export default function Logarithmen({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'log')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'log') as Mode
  // Logarithmus
  const [basis, setBasis] = useParam('basis', '10')
  const [lb, setLb] = useParam('b', '3')
  const [ziel, setZiel] = useParam('ziel', 'log')
  const [lx, setLx] = useParam('x', '2500')
  const [ly, setLy] = useParam('y', '-4,76')
  // Gleichung
  const [ga, setGa] = useParam('ga', '1')
  const [gb, setGb] = useParam('gb', '2')
  const [gc, setGc] = useParam('gc', '50')
  const [gd, setGd] = useParam('gd', '')
  // Wachstum
  const [art, setArt] = useParam('art', 'verdopplung')
  const [wN, setWN] = useParam('N', '')
  const [wN0, setWN0] = useParam('N0', '1000')
  const [wt, setWt] = useParam('t', '3')
  const [wtu, setWtu] = useParam('tu', 'h')
  const [wT, setWT] = useParam('T', '20')
  const [wTu, setWTu] = useParam('Tu', 'min')
  const [wu, setWu] = useParam('einheit', 'Zellen')

  const base = (BASES.some(([k]) => k === basis) ? basis : '10') as LogBase
  const toPow = ziel === 'zahl'
  const kind = (art === 'halbwert' ? 'halbwert' : 'verdopplung') as GrowthKind
  const grow = kind === 'verdopplung'

  const { res, err } = useSolve(() => {
    if (m === 'log') {
      const b = base === 'b' ? parseNum(lb, 'Basis b') : null
      return toPow ? powCalc({ base, b, y: parseNum(ly, 'Logarithmus y') }) : logCalc({ base, b, x: parseNum(lx, 'Zahl x', BIG) })
    }
    if (m === 'gleichung') return expEquation({ a: parseNum(ga, 'a'), b: parseNum(gb, 'Basis b'), c: parseNum(gc, 'c', BIG), d: parseNum(gd, 'd') })
    return growth({ kind, N: parseNum(wN, 'N'), N0: parseNum(wN0, 'N₀'), t: parseNum(wt, 'Zeit t'), tu: wtu, T: parseNum(wT, grow ? 'Verdopplungszeit' : 'Halbwertszeit'), Tu: wTu, unit: wu })
  }, [m, base, lb, toPow, lx, ly, ga, gb, gc, gd, kind, wN, wN0, wt, wtu, wT, wTu, wu, grow])

  // res kommt verzögert (useDeferredValue): direkt nach dem Wechsel der Aufgabe kann es noch das Ergebnis
  // der vorigen Aufgabe sein – deshalb an der Form der Diagrammdaten prüfen, nicht nur am Modus
  const plot = res && 'plot' in res ? (res.plot as object) : null
  const logOut = m === 'log' && plot && 'y' in plot ? (res as LogOut) : null
  const expOut = m === 'gleichung' && plot && 'a' in plot ? (res as ExpOut) : null
  const growOut = m === 'wachstum' && plot && 'N0' in plot ? (res as GrowthOut) : null
  const unitText = wu.trim()

  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Logarithmen berechnen (lg, ln, log₂ oder jede Basis) und zurückrechnen, Exponentialgleichungen wie 3 · 2^x + 4 = 100 lösen und Wachstum oder Zerfall mit Verdopplungs- bzw. Halbwertszeit berechnen – mit Logarithmengesetzen, Probe und Graph."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['log', 'Logarithmus berechnen'],
            ['gleichung', 'Exponentialgleichung'],
            ['wachstum', 'Wachstum & Zerfall'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'log' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Gesucht</span>
                <Seg
                  value={toPow ? 'zahl' : 'log'}
                  onChange={setZiel}
                  options={[
                    ['log', 'Logarithmus y'],
                    ['zahl', 'Zahl x (delogarithmieren)'],
                  ]}
                  label="Gesucht"
                />
              </div>
              <Seg value={base} onChange={setBasis} options={BASES} label="Basis" />
              <div className="calc__fields">
                {base === 'b' && <NumField label="Basis b" sub="b > 0, b ≠ 1" value={lb} onChange={setLb} />}
                {toPow ? <NumField label="Logarithmus y" sub="z. B. −pH oder −pKs" value={ly} onChange={setLy} /> : <NumField label="Zahl x" sub="x > 0" value={lx} onChange={setLx} />}
              </div>
              <Examples
                items={Object.entries(EX_LOG).map(([k, e]) => [k, e.label] as [string, string])}
                onPick={(k) => {
                  const e = EX_LOG[k]
                  setBasis(e.basis)
                  if (e.b) setLb(e.b)
                  setZiel(e.ziel)
                  if (e.x) setLx(e.x)
                  if (e.y) setLy(e.y)
                }}
              />
            </>
          )}
          {m === 'gleichung' && (
            <>
              <span className="calc__label">
                Gleichung <span style={{ textTransform: 'none' }}>a · bˣ + d = c</span>
              </span>
              <div className="calc__fields">
                <NumField label="a" sub="Faktor, leer = 1" value={ga} onChange={setGa} placeholder="1" />
                <NumField label="b" sub="Basis, b > 0 und b ≠ 1" value={gb} onChange={setGb} />
                <NumField label="d" sub="Summand, leer = 0" value={gd} onChange={setGd} placeholder="0" />
                <NumField label="c" sub="rechte Seite" value={gc} onChange={setGc} />
              </div>
              <Examples
                items={Object.entries(EX_GL).map(([k, e]) => [k, e.label] as [string, string])}
                onPick={(k) => {
                  const e = EX_GL[k]
                  setGa(e.a)
                  setGb(e.b)
                  setGc(e.c)
                  setGd(e.d)
                }}
              />
            </>
          )}
          {m === 'wachstum' && (
            <>
              <Seg
                value={kind}
                onChange={setArt}
                options={[
                  ['verdopplung', 'Verdopplungszeit (Wachstum)'],
                  ['halbwert', 'Halbwertszeit (Zerfall)'],
                ]}
                label="Art"
              />
              <span className="calc__label">Drei Werte eintragen, einer bleibt leer</span>
              <div className="calc__fields">
                <NumField label="Anfangsmenge N₀" value={wN0} onChange={setWN0} unit={unitText || undefined} />
                <NumField label="Menge N" sub="nach der Zeit t" value={wN} onChange={setWN} unit={unitText || undefined} />
                <NumField label="Zeit t" value={wt} onChange={setWt} unit={TIME.includes(wtu) ? wtu : 'h'} units={TIME} onUnit={setWtu} />
                <NumField label={grow ? 'Verdopplungszeit T_d' : 'Halbwertszeit T½'} sub={grow ? 'Generationszeit' : undefined} value={wT} onChange={setWT} unit={TIME.includes(wTu) ? wTu : 'h'} units={TIME} onUnit={setWTu} />
                <TextField label="Einheit der Menge" sub="optional" value={wu} onChange={setWu} placeholder="z. B. Zellen, %, MBq" />
              </div>
              <Examples
                items={Object.entries(EX_W).map(([k, e]) => [k, e.label] as [string, string])}
                onPick={(k) => {
                  const e = EX_W[k]
                  setArt(e.art)
                  setWN(e.N)
                  setWN0(e.N0)
                  setWt(e.t)
                  setWtu(e.tu)
                  setWT(e.T)
                  setWTu(e.Tu)
                  setWu(e.u)
                }}
              />
              <p className="calc__hint">Zeiteinheiten: a = Jahr (365,25 d), d = Tag, h = Stunde. Große Zahlen auch als 10^9.</p>
            </>
          )}
          {m !== 'wachstum' && <p className="calc__hint">Kommazahlen mit Komma oder Punkt, Brüche wie 1/2 gehen auch.</p>}
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die Werte ein – Lösungsweg und Graph erscheinen hier.">
        {logOut && <LogFigure o={logOut} />}
        {expOut && <ExpFigure o={expOut} />}
        {growOut && <GrowthFigure o={growOut} unit={unitText} />}
      </SolutionCard>
    </CalcPage>
  )
}

function LogFigure({ o }: { o: LogOut }) {
  const { b, x, y } = o.plot
  if (![b, x, y].every(Number.isFinite) || x <= 0 || x > 1e12) return null
  const xMax = Math.max(1.5 * x, b > 1 && b < 50 ? 1.3 * b : 2)
  const pts: DPPoint[] = [{ x, y, kind: 'sample', label: 'P' }, { x: 1, y: 0, kind: 'muted' }]
  if (b > 0 && b <= xMax) pts.push({ x: b, y: 1, kind: 'muted' })
  return (
    <div className="calc__fig">
      <DataPlot fn={(t) => (t > 0 ? Math.log(t) / Math.log(b) : NaN)} points={pts} guides={[{ x, y }]} xRange={[0, xMax]} xLabel="x" yLabel={b === 10 ? 'y = lg x' : b === Math.E ? 'y = ln x' : 'y = log_b x'} height={260} />
      <p className="calc__figcap">
        <Rich text={`Der Graph des Logarithmus geht immer durch $(1 \\mid 0)$ und $(b \\mid 1)$ (grau). Der gesuchte Punkt $P$ liegt bei $x \\approx ${fnt(x)}$, $y \\approx ${fnt(y)}$.`} />
      </p>
    </div>
  )
}

function ExpFigure({ o }: { o: ExpOut }) {
  const { a, b, c, d, x } = o.plot
  if (![a, b, c, d, x].every(Number.isFinite) || Math.abs(x) > 1e4) return null
  const lo = Math.min(0, Math.floor(x) - 2)
  const hi = Math.max(0, Math.ceil(x) + 2)
  return (
    <div className="calc__fig">
      <DataPlot fn={(t) => a * b ** t + d} lines={[{ m: 0, b: c, label: `y = ${fnt(c)}` }]} points={[{ x, y: c, kind: 'sample', label: 'Lösung' }]} guides={[{ x, y: c }]} xRange={[lo, hi]} xLabel="x" yLabel="y" height={260} />
      <p className="calc__figcap">
        <Rich text={`Die Lösung ist die $x$-Koordinate des Schnittpunkts von $y = a \\cdot b^x + d$ mit der Waagerechten $y = c$: $x \\approx ${fnt(x)}$.`} />
      </p>
    </div>
  )
}

function GrowthFigure({ o, unit }: { o: GrowthOut; unit: string }) {
  const { N0, N, t, T, grow } = o.plot
  if (![N0, N, t, T].every(Number.isFinite) || T <= 0) return null
  const b = grow ? 2 : 0.5
  const xMax = Math.max(t, T) * 1.15 || 1
  return (
    <div className="calc__fig">
      <DataPlot
        fn={(x) => N0 * b ** (x / T)}
        points={[
          { x: 0, y: N0, label: 'N₀' },
          { x: t, y: N, kind: 'sample', label: 'N' },
        ]}
        guides={[{ x: t, y: N }]}
        xRange={[0, xMax]}
        xLabel={`t in ${o.plot.unit}`}
        yLabel={unit ? `N in ${unit}` : 'N'}
        height={260}
      />
      <p className="calc__figcap">
        <Rich text={grow ? `Exponentielles Wachstum: Nach jeder Verdopplungszeit $T_d = ${fnt(T)}$ ${o.plot.unit} ist die Menge doppelt so groß.` : `Exponentieller Zerfall: Nach jeder Halbwertszeit $T_{1/2} = ${fnt(T)}$ ${o.plot.unit} ist nur noch die Hälfte da.`} />
      </p>
    </div>
  )
}
