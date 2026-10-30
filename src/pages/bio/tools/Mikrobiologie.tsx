import { colonyCount, growth, TIME_UNITS, weightedMean, type GrowthMode, type GrowthSolution } from '../../../math/alg/micro'
import { parseNum } from '../../../math/alg/numinput'
import { CalcPage, DataField, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import DataPlot from '../../../math/ui/DataPlot'
import type { CalcTool } from '../../../math/tools'

type Mode = 'kbe' | 'gewichtet' | 'wachstum'

const RULES: Record<Mode, [string, string][]> = {
  kbe: [
    ['N = \\frac{\\bar C}{V \\cdot d}', 'KbE pro mL (bzw. g)'],
    ['d = 10^{-k}', 'Verdünnungsstufe der Platte'],
    ['30 \\le C \\le 300', 'zählbarer Bereich pro Platte'],
    ['N \\approx 1{,}6 \\cdot 10^{8}', 'auf 2 gültige Ziffern runden'],
  ],
  gewichtet: [
    ['N = \\frac{\\sum C}{V \\cdot (n_1 + 0{,}1 \\cdot n_2) \\cdot d}', 'gewichtetes Mittel (DIN EN ISO 7218)'],
    ['n_1,\\ n_2', 'Platten der niedrigeren und der höheren Stufe'],
    ['d', 'Verdünnung der niedrigeren Stufe'],
    ['C \\le 300', 'nur Platten mit höchstens 300 Kolonien'],
  ],
  wachstum: [
    ['N_t = N_0 \\cdot 2^{\\,n}', 'exponentielles Wachstum'],
    ['n = \\frac{\\lg N_t - \\lg N_0}{\\lg 2}', 'Anzahl der Generationen'],
    ['g = \\frac{t}{n}', 'Generationszeit'],
    ['\\mu = \\frac{\\ln N_t - \\ln N_0}{t} = \\frac{\\ln 2}{g}', 'spezifische Wachstumsrate'],
  ],
}

const EX_KBE: Record<string, { label: string; plates: string; V: string; vu: string; k: string; per: string }> = {
  spatel: { label: 'Spatelplatten 0,1 mL, 10⁻⁵', plates: '156; 172; 164', V: '0,1', vu: 'mL', k: '5', per: 'mL' },
  guss: { label: 'Gussplatten 1 mL, 10⁻³', plates: '48; 56', V: '1', vu: 'mL', k: '3', per: 'mL' },
  lm: { label: 'Lebensmittel (KbE/g), 10⁻⁴', plates: '87; 95', V: '1', vu: 'mL', k: '4', per: 'g' },
  dicht: { label: 'Platten zu dicht', plates: '412; 389', V: '100', vu: 'µL', k: '3', per: 'mL' },
}

const EX_W: Record<string, { label: string; c1: string; c2: string; V: string; vu: string; k: string; per: string }> = {
  zwei: { label: 'Je 2 Platten, 10⁻² und 10⁻³', c1: '168; 215', c2: '14; 25', V: '1', vu: 'mL', k: '2', per: 'mL' },
  drei: { label: 'Futtermittel, je 3 Platten', c1: '295; 278; 274', c2: '19; 27; 23', V: '0,1', vu: 'mL', k: '4', per: 'g' },
  ueber: { label: 'Eine Platte über 300', c1: '312; 268; 281', c2: '31; 24; 29', V: '0,1', vu: 'mL', k: '5', per: 'mL' },
}

const EX_G: Record<string, { label: string; art: GrowthMode; N0: string; Nt?: string; t?: string; g?: string; N?: string; tu: string; unit: string }> = {
  ecoli: { label: 'E. coli: g bestimmen', art: 'messung', N0: '2·10^4', Nt: '6,4·10^5', t: '100', tu: 'min', unit: 'Zellen/mL' },
  hefe: { label: 'Hefe: g in Stunden', art: 'messung', N0: '1,5·10^6', Nt: '2,4·10^7', t: '6', tu: 'h', unit: 'Zellen/mL' },
  menge: { label: 'Zellzahl nach 3 h (g = 20 min)', art: 'menge', N0: '1·10^3', g: '20', t: '180', tu: 'min', unit: 'Zellen/mL' },
  dauer: { label: 'Zeit bis 10⁶ Zellen/mL', art: 'dauer', N0: '5·10^2', g: '30', N: '1·10^6', tu: 'min', unit: 'Zellen/mL' },
  kultur: { label: 'Zellkultur (g = 24 h)', art: 'dauer', N0: '2·10^5', g: '24', N: '1,6·10^6', tu: 'h', unit: 'Zellen' },
}

function GrowthPlot({ s }: { s: GrowthSolution }) {
  const { N0, g, t, Nt, tu } = s
  if (!(N0 > 0 && g > 0 && t > 0 && Nt > 0) || !Number.isFinite(Nt)) return null
  const lo = 10 ** Math.floor(Math.log10(N0))
  let hi = 10 ** Math.ceil(Math.log10(Nt))
  if (hi <= lo) hi = lo * 10
  return (
    <div className="calc__fig">
      <DataPlot
        logY
        fn={(x) => N0 * 2 ** (x / g)}
        points={[
          { x: 0, y: N0, label: 'N₀' },
          { x: t, y: Nt, kind: 'sample', label: 'N(t)' },
        ]}
        guides={[{ x: t, y: Nt }]}
        xLabel={`Zeit in ${tu}`}
        yLabel={`Zellzahl${s.unit ? ` (${s.unit})` : ''}, log. Achse`}
        xRange={[0, t * 1.15]}
        yRange={[lo, hi]}
        height={260}
      />
      <p className="calc__figcap">Exponentielles Wachstum: In jeder Generationszeit verdoppelt sich die Zellzahl. Auf der logarithmischen Achse wird die Kurve zur Geraden – so erkennt man im Labor die exponentielle Phase einer Wachstumskurve.</p>
    </div>
  )
}

export default function Mikrobiologie({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'kbe')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'kbe') as Mode
  // KbE
  const [plates, setPlates] = useParam('platten', '156; 172; 164')
  const [V, setV] = useParam('V', '0,1')
  const [vu, setVu] = useParam('vu', 'mL')
  const [k, setK] = useParam('k', '5')
  const [per, setPer] = useParam('bezug', 'mL')
  // gewichtetes Mittel
  const [c1, setC1] = useParam('s1', '168; 215')
  const [c2, setC2] = useParam('s2', '14; 25')
  const [gV, setGV] = useParam('gV', '1')
  const [gvu, setGvu] = useParam('gvu', 'mL')
  const [gk, setGk] = useParam('gk', '2')
  // Wachstum
  const [art, setArt] = useParam('art', 'messung')
  const [N0, setN0] = useParam('N0', '2·10^4')
  const [Nt, setNt] = useParam('Nt', '6,4·10^5')
  const [t, setT] = useParam('t', '100')
  const [g, setG] = useParam('g', '20')
  const [Nz, setNz] = useParam('Nziel', '1·10^6')
  const [tu, setTu] = useParam('tu', 'min')
  const [unit, setUnit] = useParam('einheit', 'Zellen/mL')

  const bezug = per === 'g' ? 'g' : 'mL'
  const vol = vu === 'µL' ? 'µL' : 'mL'
  const gvol = gvu === 'µL' ? 'µL' : 'mL'
  const ga = (['messung', 'menge', 'dauer'].includes(art) ? art : 'messung') as GrowthMode
  const tUnit = TIME_UNITS.includes(tu) ? tu : 'min'
  const { res, err } = useSolve(() => {
    if (m === 'kbe') return colonyCount({ plates, V: parseNum(V, 'Volumen'), vu: vol, k: parseNum(k, 'Verdünnungsstufe'), per: bezug })
    if (m === 'gewichtet') return weightedMean({ c1, c2, V: parseNum(gV, 'Volumen'), vu: gvol, k: parseNum(gk, 'Verdünnungsstufe'), per: bezug })
    return growth({ mode: ga, N0: parseNum(N0, 'N₀'), Nt: parseNum(Nt, 'Nₜ'), t: parseNum(t, 'Zeit'), g: parseNum(g, 'Generationszeit'), N: parseNum(Nz, 'Zellzahl N'), tu: tUnit, unit })
  }, [m, plates, V, vol, k, bezug, c1, c2, gV, gvol, gk, ga, N0, Nt, t, g, Nz, tUnit, unit])

  const pickKbe = (key: string) => {
    const e = EX_KBE[key]
    setPlates(e.plates)
    setV(e.V)
    setVu(e.vu)
    setK(e.k)
    setPer(e.per)
  }
  const pickW = (key: string) => {
    const e = EX_W[key]
    setC1(e.c1)
    setC2(e.c2)
    setGV(e.V)
    setGvu(e.vu)
    setGk(e.k)
    setPer(e.per)
  }
  const pickG = (key: string) => {
    const e = EX_G[key]
    setArt(e.art)
    setN0(e.N0)
    if (e.Nt) setNt(e.Nt)
    if (e.t) setT(e.t)
    if (e.g) setG(e.g)
    if (e.N) setNz(e.N)
    setTu(e.tu)
    setUnit(e.unit)
  }
  const growthRes = m === 'wachstum' && res && 'mu' in res ? (res as GrowthSolution) : null
  const bezugSeg = (
    <div className="calc__row">
      <span className="calc__label">Probe</span>
      <Seg
        value={bezug}
        onChange={setPer}
        options={[
          ['mL', 'flüssig (KbE/mL)'],
          ['g', 'fest (KbE/g)'],
        ]}
        label="Bezug"
      />
    </div>
  )

  return (
    <CalcPage
      eyebrow="Biologie · Laborrechner"
      title={tool.title}
      intro="Keimzahl aus ausgezählten Platten (KbE pro mL oder g), gewichtetes Mittel aus zwei Verdünnungsstufen nach DIN EN ISO 7218 und Generationszeit im exponentiellen Wachstum – mit vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['kbe', 'Koloniezahl (KbE)'],
            ['gewichtet', 'Gewichtetes Mittel'],
            ['wachstum', 'Generationszeit'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'kbe' && (
            <>
              <DataField label="Kolonien je Platte" sub="Parallelplatten derselben Stufe" value={plates} onChange={setPlates} rows={2} placeholder="156; 172; 164" hint="Werte mit Semikolon oder Leerzeichen trennen." />
              <div className="calc__fields">
                <NumField label="Ausplattiertes Volumen V" sub="Spatel 0,1 mL, Guss 1 mL" value={V} onChange={setV} unit={vol} units={['mL', 'µL']} onUnit={setVu} />
                <NumField label="Verdünnungsstufe k" sub="d = 10⁻ᵏ, z. B. 5 für 10⁻⁵" value={k} onChange={setK} />
              </div>
              {bezugSeg}
              <Examples items={Object.entries(EX_KBE).map(([key, e]) => [key, e.label] as [string, string])} onPick={pickKbe} />
            </>
          )}
          {m === 'gewichtet' && (
            <>
              <div className="calc__fields">
                <DataField label="Niedrigere Stufe" sub="mehr Kolonien" value={c1} onChange={setC1} rows={2} placeholder="168; 215" />
                <DataField label="Nächsthöhere Stufe" sub="10-mal verdünnter" value={c2} onChange={setC2} rows={2} placeholder="14; 25" />
              </div>
              <div className="calc__fields">
                <NumField label="Ausplattiertes Volumen V" sub="je Platte" value={gV} onChange={setGV} unit={gvol} units={['mL', 'µL']} onUnit={setGvu} />
                <NumField label="Stufe der niedrigeren Verdünnung k" sub="d = 10⁻ᵏ" value={gk} onChange={setGk} />
              </div>
              {bezugSeg}
              <Examples items={Object.entries(EX_W).map(([key, e]) => [key, e.label] as [string, string])} onPick={pickW} />
            </>
          )}
          {m === 'wachstum' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Gesucht</span>
                <Seg
                  value={ga}
                  onChange={setArt}
                  options={[
                    ['messung', 'Generationszeit g'],
                    ['menge', 'Zellzahl nach t'],
                    ['dauer', 'Zeit bis N'],
                  ]}
                  label="Gesucht"
                />
              </div>
              <div className="calc__fields">
                <NumField label="Anfangszellzahl N₀" value={N0} onChange={setN0} />
                {ga === 'messung' && <NumField label="Zellzahl Nₜ" sub="am Ende" value={Nt} onChange={setNt} />}
                {ga === 'dauer' && <NumField label="Gewünschte Zellzahl N" value={Nz} onChange={setNz} />}
                {ga !== 'dauer' && <NumField label="Zeit t" sub={ga === 'messung' ? 'zwischen den Messungen' : undefined} value={t} onChange={setT} unit={tUnit} units={TIME_UNITS} onUnit={setTu} />}
                {ga !== 'messung' && <NumField label="Generationszeit g" value={g} onChange={setG} unit={tUnit} units={TIME_UNITS} onUnit={setTu} />}
                <NumField label="Einheit der Zellzahl" sub="optional" value={unit} onChange={setUnit} placeholder="Zellen/mL" />
              </div>
              <Examples items={Object.entries(EX_G).map(([key, e]) => [key, e.label] as [string, string])} onPick={pickG} />
            </>
          )}
          <p className="calc__hint">Zehnerpotenzen wie 2·10^4 oder 2e4 gehen auch.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res} err={err} empty="Trage die Zählwerte ein – der Lösungsweg erscheint hier.">
        {growthRes && <GrowthPlot s={growthRes} />}
      </SolutionCard>
    </CalcPage>
  )
}
