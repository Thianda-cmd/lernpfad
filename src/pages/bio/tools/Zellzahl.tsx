import { CHAMBERS, chamberById, chamberCount, seeding, viability } from '../../../math/alg/cells'
import { parseNum } from '../../../math/alg/numinput'
import { VOL_NAMES } from '../../../math/alg/serial'
import { CalcPage, DataField, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import type { CalcTool } from '../../../math/tools'

type Mode = 'kammer' | 'vitalitaet' | 'aussaeen'

const RULES: Record<Mode, [string, string][]> = {
  kammer: [
    ['c = \\frac{\\bar N}{V_Q} \\cdot F', 'Zellen pro mL'],
    ['V_Q = A \\cdot h', 'Volumen über einem Quadrat'],
    ['1\\,\\text{mm}^3 = 1\\,\\mu\\text{L} = 10^{-3}\\,\\text{mL}', 'Einheiten umrechnen'],
    ['c = \\bar N \\cdot F \\cdot 10^{4}\\,\\text{mL}^{-1}', 'Neubauer-Großquadrat (0,1 µL)'],
    ['F_{\\text{Trypan}} = \\frac{V_{\\text{Zellen}} + V_{\\text{Trypan}}}{V_{\\text{Zellen}}}', '1 + 1 gemischt → F = 2'],
  ],
  vitalitaet: [
    ['\\text{Vitalität} = \\frac{N_{\\text{lebend}}}{N_{\\text{lebend}} + N_{\\text{tot}}} \\cdot 100\\,\\%', 'Anteil lebender Zellen'],
    ['c_{\\text{lebend}} = \\frac{\\bar N_{\\text{lebend}}}{V_Q} \\cdot F', 'lebende Zellen pro mL'],
    ['\\text{blau} \\Rightarrow \\text{tot}', 'Trypanblau dringt nur in tote Zellen ein'],
  ],
  aussaeen: [
    ['c_1 \\cdot V_1 = c_2 \\cdot V_2', 'die Zellzahl bleibt beim Verdünnen gleich'],
    ['c_2 = \\frac{N}{V_{\\text{Gefäß}}}', 'Zielkonzentration im Ansatz'],
    ['N = \\text{Dichte} \\cdot A', 'Zellen pro Gefäß aus Zellen/cm²'],
    ['V_{\\text{Medium}} = V_2 - V_1', 'Medium zum Auffüllen'],
  ],
}

interface CountEx {
  label: string
  counts: string
  chamber: string
  vz: string
  vt: string
  vor: string
  vol: string
}

const EX_COUNT: Record<string, CountEx> = {
  kultur: { label: 'Zellkultur, Trypanblau 1 + 1', counts: '52; 47; 55; 50', chamber: 'gross', vz: '10', vt: '10', vor: '', vol: '10' },
  leuko: { label: 'Leukozyten (Türk 1 : 20)', counts: '35; 42; 38; 45', chamber: 'gross', vz: '', vt: '', vor: '20', vol: '' },
  ery: { label: 'Erythrozyten (1 : 200)', counts: '98; 102; 95; 105; 100', chamber: 'gruppe', vz: '', vt: '', vor: '200', vol: '' },
  hefe: { label: 'Hefe (Kleinstquadrate, 1 : 10)', counts: '6; 4; 5; 7; 3; 5; 6; 4; 5; 5; 6; 7; 4; 5; 6; 2; 5; 4; 6; 5', chamber: 'klein', vz: '', vt: '', vor: '10', vol: '' },
  liquor: { label: 'Liquor (Fuchs-Rosenthal)', counts: '1; 0; 2; 1; 0; 1; 1; 0; 2; 1; 0; 1; 1; 1; 0; 0', chamber: 'fr', vz: '', vt: '', vor: '', vol: '' },
}

const EX_VIT: Record<string, { label: string; live: string; dead: string; sq: string }> = {
  gut: { label: 'Gesunde Kultur (je Quadrat)', live: '48; 52; 45; 50', dead: '4; 3; 5; 4', sq: '' },
  summe: { label: 'Summen aus 4 Quadraten', live: '180', dead: '45', sq: '4' },
}

/** Wachstumsfläche und Medium je Gefäß: Richtwerte (z. B. Thermo Fisher), je nach Hersteller etwas anders */
const VESSELS: Record<string, { label: string; area: string; med: string; n: string }> = {
  w96: { label: '96-Well · 0,32 cm²', area: '0,32', med: '0,1', n: '96' },
  w24: { label: '24-Well · 1,9 cm²', area: '1,9', med: '0,5', n: '24' },
  w12: { label: '12-Well · 3,5 cm²', area: '3,5', med: '1', n: '12' },
  w6: { label: '6-Well · 9,6 cm²', area: '9,6', med: '2', n: '6' },
  t25: { label: 'T25-Flasche · 25 cm²', area: '25', med: '5', n: '1' },
  t75: { label: 'T75-Flasche · 75 cm²', area: '75', med: '15', n: '1' },
}

function ChamberFields({ chamber, setChamber, A, setA, h, setH }: { chamber: string; setChamber: (v: string) => void; A: string; setA: (v: string) => void; h: string; setH: (v: string) => void }) {
  const ch = chamberById(chamber)
  return (
    <>
      <label className="nf">
        <span className="nf__label">Zählkammer und gezähltes Quadrat</span>
        <span className="nf__row">
          <select className="nf__input" value={ch.id} onChange={(e) => setChamber(e.target.value)} aria-label="Zählkammer und gezähltes Quadrat">
            {CHAMBERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </span>
      </label>
      <p className="calc__hint">{ch.use}</p>
      {ch.id === 'eigen' && (
        <div className="calc__fields">
          <NumField label="Fläche eines Quadrats" sub="A" value={A} onChange={setA} unit="mm²" />
          <NumField label="Kammertiefe" sub="h" value={h} onChange={setH} unit="mm" />
        </div>
      )}
    </>
  )
}

function DilutionFields({ vz, setVz, vt, setVt, vor, setVor }: { vz: string; setVz: (v: string) => void; vt: string; setVt: (v: string) => void; vor: string; setVor: (v: string) => void }) {
  return (
    <>
      <span className="calc__label">Verdünnung</span>
      <div className="calc__fields">
        <NumField label="Zellsuspension" sub="im Ansatz mit Trypanblau" value={vz} onChange={setVz} unit="µL" />
        <NumField label="Trypanblau" sub="beide leer = ohne" value={vt} onChange={setVt} unit="µL" />
        <NumField label="Vorverdünnung F" sub="optional, z. B. 20 für 1 : 20" value={vor} onChange={setVor} />
      </div>
    </>
  )
}

export default function Zellzahl({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'kammer')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'kammer') as Mode
  // Kammer (für Zählung und Vitalität)
  const [chamber, setChamber] = useParam('kammer', 'gross')
  const [A, setA] = useParam('A', '0,25')
  const [h, setH] = useParam('h', '0,1')
  const [vz, setVz] = useParam('vz', '10')
  const [vt, setVt] = useParam('vt', '10')
  const [vor, setVor] = useParam('vor', '')
  const [vol, setVol] = useParam('vol', '10')
  const [volu, setVolu] = useParam('volu', 'mL')
  // Zählung
  const [counts, setCounts] = useParam('zellen', '52; 47; 55; 50')
  // Vitalität
  const [live, setLive] = useParam('lebend', '48; 52; 45; 50')
  const [dead, setDead] = useParam('tot', '4; 3; 5; 4')
  const [sq, setSq] = useParam('quadrate', '')
  // Aussäen
  const [c, setC] = useParam('c', '1,02·10^6')
  const [target, setTarget] = useParam('ziel', 'abs')
  const [perV, setPerV] = useParam('N', '5·10^4')
  const [dens, setDens] = useParam('dichte', '2·10^4')
  const [area, setArea] = useParam('flaeche', '1,9')
  const [n, setN] = useParam('anzahl', '24')
  const [med, setMed] = useParam('medium', '0,5')
  const [medu, setMedu] = useParam('mu', 'mL')
  const [res0, setRes0] = useParam('zuschlag', '10')

  const tg = target === 'flaeche' ? 'flaeche' : 'abs'
  const volUnit = VOL_NAMES.includes(volu) ? volu : 'mL'
  const medUnit = VOL_NAMES.includes(medu) ? medu : 'mL'
  const { res, err } = useSolve(() => {
    const ch = {
      chamber,
      area: parseNum(A, 'Fläche'),
      depth: parseNum(h, 'Kammertiefe'),
      vCells: parseNum(vz, 'Zellsuspension'),
      vStain: parseNum(vt, 'Trypanblau'),
      pre: parseNum(vor, 'Vorverdünnung'),
      vol: parseNum(vol, 'Volumen'),
      volUnit,
    }
    if (m === 'kammer') return chamberCount({ ...ch, counts })
    if (m === 'vitalitaet') return viability({ ...ch, live, dead, squares: parseNum(sq, 'Anzahl der Quadrate') })
    return seeding({
      c: parseNum(c, 'Zellkonzentration'),
      target: tg,
      perVessel: parseNum(perV, 'Zellen pro Gefäß'),
      density: parseNum(dens, 'Aussaatdichte'),
      area: parseNum(area, 'Fläche'),
      n: parseNum(n, 'Anzahl der Gefäße'),
      vMed: parseNum(med, 'Medium pro Gefäß'),
      vu: medUnit,
      reserve: parseNum(res0, 'Zuschlag'),
    })
  }, [m, chamber, A, h, vz, vt, vor, vol, volUnit, counts, live, dead, sq, c, tg, perV, dens, area, n, med, medUnit, res0])

  const pickCount = (k: string) => {
    const e = EX_COUNT[k]
    setCounts(e.counts)
    setChamber(e.chamber)
    setVz(e.vz)
    setVt(e.vt)
    setVor(e.vor)
    setVol(e.vol)
  }
  const pickVit = (k: string) => {
    const e = EX_VIT[k]
    setLive(e.live)
    setDead(e.dead)
    setSq(e.sq)
  }
  const pickVessel = (k: string) => {
    const e = VESSELS[k]
    // Gefäßvorlagen bringen ihre Wachstumsfläche mit – die zählt nur bei „Zellen pro cm²“
    // (sonst bekäme eine T75-Flasche dieselben 5 · 10⁴ Zellen wie ein Well)
    setTarget('flaeche')
    setArea(e.area)
    setMed(e.med)
    setMedu('mL')
    setN(e.n)
  }

  return (
    <CalcPage
      eyebrow="Biologie · Laborrechner"
      title={tool.title}
      intro="Zellen zählen mit der Zählkammer: Zellen pro mL aus den Zählwerten, Vitalität mit Trypanblau und das Aussäen in Platten und Flaschen – jeweils mit vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['kammer', 'Zählkammer'],
            ['vitalitaet', 'Vitalität'],
            ['aussaeen', 'Zellen aussäen'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'kammer' && (
            <>
              <DataField
                label="Zellen pro Quadrat"
                sub="ein Wert je ausgezähltem Quadrat"
                value={counts}
                onChange={setCounts}
                rows={3}
                placeholder="52; 47; 55; 50"
                hint="Werte mit Semikolon, Leerzeichen oder neuer Zeile trennen."
              />
              <ChamberFields chamber={chamber} setChamber={setChamber} A={A} setA={setA} h={h} setH={setH} />
              <DilutionFields vz={vz} setVz={setVz} vt={vt} setVt={setVt} vor={vor} setVor={setVor} />
              <div className="calc__fields">
                <NumField label="Volumen der Zellsuspension" sub="optional, für die Gesamtzellzahl" value={vol} onChange={setVol} unit={volUnit} units={VOL_NAMES} onUnit={setVolu} />
              </div>
              <Examples items={Object.entries(EX_COUNT).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickCount} />
            </>
          )}
          {m === 'vitalitaet' && (
            <>
              <div className="calc__fields">
                <DataField label="Lebende Zellen" sub="ungefärbt, hell" value={live} onChange={setLive} rows={2} placeholder="48; 52; 45; 50" />
                <DataField label="Tote Zellen" sub="blau gefärbt" value={dead} onChange={setDead} rows={2} placeholder="4; 3; 5; 4" />
              </div>
              <div className="calc__fields">
                <NumField label="Anzahl der Quadrate" sub="nur bei Summen nötig" value={sq} onChange={setSq} placeholder="aus der Liste" />
              </div>
              <ChamberFields chamber={chamber} setChamber={setChamber} A={A} setA={setA} h={h} setH={setH} />
              <DilutionFields vz={vz} setVz={setVz} vt={vt} setVt={setVt} vor={vor} setVor={setVor} />
              <div className="calc__fields">
                <NumField label="Volumen der Zellsuspension" sub="optional" value={vol} onChange={setVol} unit={volUnit} units={VOL_NAMES} onUnit={setVolu} />
              </div>
              <Examples items={Object.entries(EX_VIT).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickVit} />
            </>
          )}
          {m === 'aussaeen' && (
            <>
              <div className="calc__fields">
                <NumField label="Zellkonzentration c₁" sub="lebende Zellen, aus der Zählung" value={c} onChange={setC} unit="Zellen/mL" />
              </div>
              <div className="calc__row">
                <span className="calc__label">Ziel</span>
                <Seg
                  value={tg}
                  onChange={setTarget}
                  options={[
                    ['abs', 'Zellen pro Gefäß'],
                    ['flaeche', 'Zellen pro cm²'],
                  ]}
                  label="Ziel"
                />
              </div>
              <div className="calc__fields">
                {tg === 'abs' ? (
                  <NumField label="Zellen pro Gefäß" sub="N" value={perV} onChange={setPerV} />
                ) : (
                  <>
                    <NumField label="Aussaatdichte" value={dens} onChange={setDens} unit="Zellen/cm²" />
                    <NumField label="Wachstumsfläche" sub="je Gefäß" value={area} onChange={setArea} unit="cm²" />
                  </>
                )}
                <NumField label="Anzahl der Gefäße" sub="z. B. Wells" value={n} onChange={setN} />
                <NumField label="Medium pro Gefäß" value={med} onChange={setMed} unit={medUnit} units={['µL', 'mL']} onUnit={setMedu} />
                <NumField label="Zuschlag" sub="für Pipettierverluste" value={res0} onChange={setRes0} unit="%" />
              </div>
              <Examples items={Object.entries(VESSELS).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickVessel} />
              <p className="calc__hint">Wachstumsflächen und Medienvolumen sind Richtwerte – je nach Hersteller etwas anders.</p>
            </>
          )}
          <p className="calc__hint">Zehnerpotenzen wie 1,02·10^6 oder 1,02e6 gehen auch.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res} err={err} empty="Trage die Zählwerte ein – der Lösungsweg erscheint hier." />
    </CalcPage>
  )
}
