import { BUFFERS, bufferPh, bufferPrep, phConvert, STRONG, strongPh, WEAK, weakPh, type AcidBase, type BufIn, type BufferSolution, type KType, type PhGiven, type PhSolution } from '../../../math/alg/ph'
import { parseNum } from '../../../math/alg/numinput'
import { formulaTexOf } from '../../../math/alg/stoich'
import { CONC_U, MASS_U, MOL_U, unitNames, VOL_U } from '../../../math/alg/units'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import DataPlot from '../../../math/ui/DataPlot'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'
import '../../../styles/chem-a.css'

type Mode = 'umrechnen' | 'stark' | 'schwach' | 'puffer'

const RULES: Record<Mode, [string, string][]> = {
  umrechnen: [
    ['\\text{pH} = -\\lg c(\\mathrm{H_3O^+})', 'c in mol/L (nur der Zahlenwert)'],
    ['c(\\mathrm{H_3O^+}) = 10^{-\\text{pH}}', 'Umkehrung'],
    ['\\text{pH} + \\text{pOH} = 14', 'bei 25 °C'],
    ['c(\\mathrm{H_3O^+}) \\cdot c(\\mathrm{OH^-}) = 10^{-14}', 'Ionenprodukt des Wassers K_W'],
  ],
  stark: [
    ['c(\\mathrm{H_3O^+}) = z \\cdot c_0', 'starke Säure: vollständige Protolyse'],
    ['c(\\mathrm{OH^-}) = z \\cdot c_0', 'starke Base'],
    ['\\text{pH} = 14 - \\text{pOH}', 'Basen über den pOH-Wert'],
    ['c(\\mathrm{H_3O^+}) = \\tfrac{c}{2} + \\sqrt{\\tfrac{c^2}{4} + K_W}', 'sehr verdünnt (unter 10⁻⁶ mol/L)'],
  ],
  schwach: [
    ['\\text{pH} = \\tfrac{1}{2}\\left(\\text{p}K_S - \\lg c_0\\right)', 'Näherung für schwache Säuren'],
    ['\\text{pOH} = \\tfrac{1}{2}\\left(\\text{p}K_B - \\lg c_0\\right)', 'Näherung für schwache Basen'],
    ['\\text{p}K_S + \\text{p}K_B = 14', 'korrespondierendes Säure-Base-Paar'],
    ['\\alpha = \\frac{c(\\mathrm{H_3O^+})}{c_0}', 'Protolysegrad – Näherung gut bis etwa 5 %'],
  ],
  puffer: [
    ['\\text{pH} = \\text{p}K_S + \\lg\\frac{c(\\mathrm{A^-})}{c(\\mathrm{HA})}', 'Henderson-Hasselbalch'],
    ['\\frac{c(\\mathrm{A^-})}{c(\\mathrm{HA})} = 10^{\\text{pH} - \\text{p}K_S}', 'Verhältnis für einen Ziel-pH'],
    ['\\text{p}K_S \\pm 1', 'Pufferbereich'],
    ['c(\\mathrm{A^-}) = c(\\mathrm{HA}) \\Rightarrow \\text{pH} = \\text{p}K_S', 'größte Pufferkapazität'],
  ],
}

const P_EX: { id: string; label: string; given: PhGiven; value: string; unit?: string }[] = [
  { id: 'magen', label: 'Magensaft pH 1,5', given: 'pH', value: '1,5' },
  { id: 'blut', label: 'Blut pH 7,4', given: 'pH', value: '7,4' },
  { id: 'h', label: 'c(H₃O⁺) = 2,5 mmol/L', given: 'h', value: '2,5', unit: 'mmol/L' },
  { id: 'oh', label: 'c(OH⁻) = 0,01 mol/L', given: 'oh', value: '0,01', unit: 'mol/L' },
]

const BUF_IN: Record<BufIn, { a: string; b: string; unit: string; units: string[]; label: string }> = {
  c: { a: '0,1', b: '0,15', unit: 'mol/L', units: unitNames(CONC_U), label: 'Konzentration' },
  n: { a: '10', b: '15', unit: 'mmol', units: unitNames(MOL_U), label: 'Stoffmenge' },
  m: { a: '0,60', b: '1,42', unit: 'g', units: unitNames(MASS_U), label: 'Masse' },
  V: { a: '50', b: '50', unit: 'mL', units: unitNames(VOL_U), label: 'Volumen' },
}

/** pH-Skala 0 … 14 mit Markierung */
function PhScale({ pH }: { pH: number }) {
  if (!Number.isFinite(pH)) return null
  const x = Math.max(0, Math.min(14, pH))
  const r = Number(pH.toFixed(2))
  const k = r < 7 ? 'sauer' : r > 7 ? 'alkalisch' : 'neutral'
  const t = pH.toFixed(2).replace('.', ',').replace('-0,00', '0,00')
  return (
    <div className="chem-a-scale" role="img" aria-label={`pH-Skala: pH ${t}, ${k}`}>
      <div className="chem-a-scale__bar">
        <span className="chem-a-scale__mark" style={{ left: `${(x / 14) * 100}%` }} />
      </div>
      <div className="chem-a-scale__ticks" aria-hidden="true">
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} style={{ left: `${(i / 14) * 100}%` }}>
            {i}
          </span>
        ))}
      </div>
      <div className="chem-a-scale__labels">
        <span>sauer</span>
        <strong>
          pH {t} · {k}
        </strong>
        <span>alkalisch</span>
      </div>
    </div>
  )
}

/** Pufferkurve: pH über dem Anteil der Base */
function BufferPlot({ pKs, ratio, pH }: { pKs: number; ratio: number; pH: number }) {
  if (!(ratio > 0) || !Number.isFinite(pH)) return null
  const share = (100 * ratio) / (1 + ratio)
  const lo = Math.floor(Math.min(pKs - 3, pH - 0.5))
  const hi = Math.ceil(Math.max(pKs + 3, pH + 0.5))
  return (
    <div className="calc__fig">
      <DataPlot
        fn={(x) => pKs + Math.log10(x / (100 - x))}
        points={[
          { x: 100 / 11, y: pKs - 1, kind: 'muted', label: 'pKs − 1' },
          { x: 1000 / 11, y: pKs + 1, kind: 'muted', label: 'pKs + 1' },
          { x: share, y: pH, kind: 'sample', label: `pH ${pH.toFixed(2).replace('.', ',')}` },
        ]}
        guides={[{ x: share, y: pH }]}
        xLabel="Anteil der Base A⁻ in %"
        yLabel="pH"
        xRange={[0, 100]}
        yRange={[lo, hi]}
        includeZero={false}
        height={260}
      />
      <p className="calc__figcap">Pufferkurve: Zwischen pKs − 1 und pKs + 1 (etwa 9 % bis 91 % Base) ändert sich der pH-Wert nur wenig – dort puffert die Lösung.</p>
    </div>
  )
}

function TextField({ label, sub, value, onChange, placeholder, formula }: { label: string; sub?: string; value: string; onChange: (v: string) => void; placeholder?: string; formula?: boolean }) {
  return (
    <label className="nf">
      <span className="nf__label">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <span className="nf__row">
        <input className={`nf__input ${formula ? 'nf__input--formula' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" placeholder={placeholder} />
      </span>
    </label>
  )
}

export default function Ph({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'umrechnen')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'umrechnen') as Mode
  // pH ↔ c
  const [given, setGiven] = useParam('gegeben', 'pH')
  const gv = (['pH', 'pOH', 'h', 'oh'].includes(given) ? given : 'pH') as PhGiven
  const [val, setVal] = useParam('wert', '3,5')
  const [cu, setCu] = useParam('cu', 'mol/L')
  // stark
  const [sArt, setSArt] = useParam('sart', 'saeure')
  const [sStoff, setSStoff] = useParam('sstoff', 'hcl')
  const [sc, setSc] = useParam('sc', '0,01')
  const [scu, setScu] = useParam('scu', 'mol/L')
  const [sz, setSz] = useParam('sz', '1')
  // schwach
  const [wArt, setWArt] = useParam('wart', 'saeure')
  const [wStoff, setWStoff] = useParam('wstoff', 'essig')
  const [wkt, setWkt] = useParam('wkt', 'pKs')
  const [wk, setWk] = useParam('wk', '4,76')
  const [wc, setWc] = useParam('wc', '0,1')
  const [wcu, setWcu] = useParam('wcu', 'mol/L')
  // Puffer
  const [bpm, setBpm] = useParam('pm', 'berechnen')
  const [bPre, setBPre] = useParam('puffer', 'acetat')
  const [pks, setPks] = useParam('pks', '4,76')
  const [acid, setAcid] = useParam('saeure', 'CH3COOH')
  const [base, setBase] = useParam('base', 'CH3COONa')
  const [ang, setAng] = useParam('angabe', 'c')
  const bi = (['c', 'n', 'm', 'V'].includes(ang) ? ang : 'c') as BufIn
  const [ba, setBa] = useParam('a', BUF_IN.c.a)
  const [bb, setBb] = useParam('b', BUF_IN.c.b)
  const [bu, setBu] = useParam('au', BUF_IN.c.unit)
  const [ca, setCa] = useParam('ca', '0,1')
  const [cb, setCb] = useParam('cb', '0,1')
  const [csu, setCsu] = useParam('csu', 'mol/L')
  const [vp, setVp] = useParam('vp', '')
  const [vpu, setVpu] = useParam('vpu', 'mL')
  const [zug, setZug] = useParam('zugabe', 'keine')
  const [czu, setCzu] = useParam('czu', '0,1')
  const [czuu, setCzuu] = useParam('czuu', 'mol/L')
  const [vzu, setVzu] = useParam('vzu', '1')
  const [vzuu, setVzuu] = useParam('vzuu', 'mL')
  const [phz, setPhz] = useParam('phz', '5')
  const [cges, setCges] = useParam('cges', '0,1')
  const [cgu, setCgu] = useParam('cgu', 'mol/L')
  const [pv, setPv] = useParam('pv', '100')
  const [pvu, setPvu] = useParam('pvu', 'mL')
  const [sca, setSca] = useParam('sca', '1')
  const [scb, setScb] = useParam('scb', '')
  const [scu2, setScu2] = useParam('scu2', 'mol/L')

  const sKind = (sArt === 'base' ? 'base' : 'saeure') as AcidBase
  const wKind = (wArt === 'base' ? 'base' : 'saeure') as AcidBase
  const kt = (['pKs', 'Ks', 'pKb', 'Kb'].includes(wkt) ? wkt : 'pKs') as KType
  const bUnits = BUF_IN[bi].units
  const bUnit = bUnits.includes(bu) ? bu : BUF_IN[bi].unit
  const zugabe = (['saeure', 'base'].includes(zug) ? zug : 'keine') as AcidBase | 'keine'
  const prep = bpm === 'ansetzen'

  const { res, err } = useSolve<PhSolution>(() => {
    switch (m) {
      case 'umrechnen':
        return phConvert({ given: gv, value: parseNum(val, gv === 'pH' ? 'pH' : gv === 'pOH' ? 'pOH' : 'c'), unit: cu })
      case 'stark':
        return strongPh({ kind: sKind, c: parseNum(sc, 'c₀'), cu: scu, z: parseNum(sz, 'z'), preset: sStoff })
      case 'schwach':
        return weakPh({ kind: wKind, kType: kt, k: parseNum(wk, kt), c: parseNum(wc, 'c₀'), cu: wcu, preset: wStoff })
      case 'puffer':
        if (prep)
          return bufferPrep({
            pKs: parseNum(pks, 'pKs'),
            pH: parseNum(phz, 'pH'),
            cTot: parseNum(cges, 'c (gesamt)'),
            cu: cgu,
            V: parseNum(pv, 'V'),
            vu: pvu,
            acid,
            base,
            ca: parseNum(sca, 'c (Säure-Stammlösung)'),
            cb: parseNum(scb, 'c (Base-Stammlösung)'),
            csu: scu2,
          })
        return bufferPh({
          pKs: parseNum(pks, 'pKs'),
          input: bi,
          a: parseNum(ba, 'Säure'),
          b: parseNum(bb, 'Base'),
          unit: bUnit,
          ca: parseNum(ca, 'c (Säurelösung)'),
          cb: parseNum(cb, 'c (Baselösung)'),
          csu,
          acid,
          base,
          Vp: parseNum(vp, 'Puffervolumen'),
          vpu,
          add: zugabe,
          cAdd: parseNum(czu, 'c (Zugabe)'),
          caddu: czuu,
          vAdd: parseNum(vzu, 'V (Zugabe)'),
          vaddu: vzuu,
        })
    }
  }, [m, gv, val, cu, sKind, sc, scu, sz, sStoff, wKind, kt, wk, wc, wcu, wStoff, prep, pks, phz, cges, cgu, pv, pvu, acid, base, sca, scb, scu2, bi, ba, bb, bUnit, ca, cb, csu, vp, vpu, zugabe, czu, czuu, vzu, vzuu])

  const concs = unitNames(CONC_U)
  const vols = unitNames(VOL_U)
  // res kommt verzögert – nach dem Wechsel der Aufgabe kann es kurz noch das vorige Ergebnis sein
  const buf = res && m === 'puffer' && 'ratio' in res ? (res as BufferSolution) : null
  const pickBuffer = (id: string) => {
    const b = BUFFERS.find((x) => x.id === id)
    if (!b) return
    setBPre(b.id)
    setPks(b.pKs)
    setAcid(b.acid)
    setBase(b.base)
    setSca(b.acidStock ?? '')
    setScb(b.baseStock ?? '')
  }
  const curBuf = BUFFERS.find((b) => b.id === bPre && b.acid === acid && b.base === base && b.pKs === pks)
  return (
    <CalcPage
      eyebrow="Chemie · Rechner"
      title={tool.title}
      intro="pH-Werte von starken und schwachen Säuren und Basen, Umrechnung zwischen pH, pOH und Konzentrationen und Puffer nach Henderson-Hasselbalch – berechnen und ansetzen. Alle Werte für 25 °C."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['umrechnen', 'pH ↔ Konzentration'],
            ['stark', 'Starke Säure/Base'],
            ['schwach', 'Schwache Säure/Base'],
            ['puffer', 'Puffer'],
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
                  value={gv}
                  onChange={(v) => {
                    setGiven(v)
                    setVal(v === 'pH' ? '3,5' : v === 'pOH' ? '4,2' : v === 'h' ? '2,5' : '0,01')
                    setCu(v === 'h' ? 'mmol/L' : 'mol/L')
                  }}
                  options={[
                    ['pH', 'pH'],
                    ['pOH', 'pOH'],
                    ['h', 'c(H₃O⁺)'],
                    ['oh', 'c(OH⁻)'],
                  ]}
                  label="Gegeben"
                />
              </div>
              <div className="calc__fields">
                {gv === 'pH' || gv === 'pOH' ? (
                  <NumField label={gv === 'pH' ? 'pH-Wert' : 'pOH-Wert'} value={val} onChange={setVal} />
                ) : (
                  <NumField label={gv === 'h' ? 'c(H₃O⁺)' : 'c(OH⁻)'} sub="Konzentration" value={val} onChange={setVal} unit={cu} units={concs} onUnit={setCu} />
                )}
              </div>
              <Examples
                items={P_EX.map((e) => [e.id, e.label] as [string, string])}
                current={P_EX.find((e) => e.given === gv && e.value === val && (!e.unit || e.unit === cu))?.id}
                onPick={(id) => {
                  const e = P_EX.find((x) => x.id === id)
                  if (!e) return
                  setGiven(e.given)
                  setVal(e.value)
                  if (e.unit) setCu(e.unit)
                }}
              />
            </>
          )}
          {m === 'stark' && (
            <>
              <div className="calc__row">
                <Seg
                  value={sKind}
                  onChange={(v) => {
                    setSArt(v)
                    const first = STRONG.find((s) => s.kind === v)
                    if (first) {
                      setSStoff(first.id)
                      setSz(String(first.z))
                    }
                  }}
                  options={[
                    ['saeure', 'Säure'],
                    ['base', 'Base'],
                  ]}
                  label="Art"
                />
              </div>
              <Examples
                items={STRONG.filter((s) => s.kind === sKind).map((s) => [s.id, s.name] as [string, string])}
                current={STRONG.find((s) => s.id === sStoff && s.kind === sKind && String(s.z) === sz)?.id}
                onPick={(id) => {
                  const s = STRONG.find((x) => x.id === id)
                  if (!s) return
                  setSStoff(s.id)
                  setSArt(s.kind)
                  setSz(String(s.z))
                }}
              />
              <div className="calc__fields">
                <NumField label="Konzentration c₀" value={sc} onChange={setSc} unit={scu} units={concs} onUnit={setScu} />
                <NumField label="z" sub={sKind === 'saeure' ? 'H⁺ pro Teilchen' : 'OH⁻ pro Formeleinheit'} value={sz} onChange={setSz} />
              </div>
            </>
          )}
          {m === 'schwach' && (
            <>
              <div className="calc__row">
                <Seg
                  value={wKind}
                  onChange={(v) => {
                    setWArt(v)
                    const first = WEAK.find((w) => w.kind === v)
                    if (first) {
                      setWStoff(first.id)
                      setWkt(first.kType)
                      setWk(first.pK)
                    }
                  }}
                  options={[
                    ['saeure', 'Säure'],
                    ['base', 'Base'],
                  ]}
                  label="Art"
                />
                <Seg
                  value={kt}
                  onChange={setWkt}
                  options={[
                    ['pKs', 'pKs'],
                    ['Ks', 'Ks'],
                    ['pKb', 'pKb'],
                    ['Kb', 'Kb'],
                  ]}
                  label="Konstante"
                />
              </div>
              <Examples
                items={WEAK.filter((w) => w.kind === wKind).map((w) => [w.id, `${w.name} (${w.kType === 'pKs' ? 'pKs' : 'pKb'} ${w.pK})`] as [string, string])}
                current={WEAK.find((w) => w.id === wStoff && w.kind === wKind && w.kType === kt && w.pK === wk)?.id}
                onPick={(id) => {
                  const w = WEAK.find((x) => x.id === id)
                  if (!w) return
                  setWStoff(w.id)
                  setWArt(w.kind)
                  setWkt(w.kType)
                  setWk(w.pK)
                }}
              />
              <div className="calc__fields">
                <NumField label={kt} sub={kt === 'Ks' || kt === 'Kb' ? 'in mol/L, z. B. 1,8·10^-5' : kt === (wKind === 'saeure' ? 'pKb' : 'pKs') ? 'der korrespondierenden ' + (wKind === 'saeure' ? 'Base' : 'Säure') : undefined} value={wk} onChange={setWk} />
                <NumField label="Ausgangskonzentration c₀" value={wc} onChange={setWc} unit={wcu} units={concs} onUnit={setWcu} />
              </div>
            </>
          )}
          {m === 'puffer' && (
            <>
              <div className="calc__row">
                <Seg
                  value={prep ? 'ansetzen' : 'berechnen'}
                  onChange={setBpm}
                  options={[
                    ['berechnen', 'pH berechnen'],
                    ['ansetzen', 'Puffer ansetzen'],
                  ]}
                  label="Art"
                />
              </div>
              <Examples items={BUFFERS.map((b) => [b.id, `${b.name} (pKs ${b.pKs})`] as [string, string])} current={curBuf?.id} onPick={pickBuffer} />
              <div className="calc__fields">
                <NumField label="pKs" sub="der Puffersäure" value={pks} onChange={setPks} />
                <TextField label="Säure HA" sub="Formel" value={acid} onChange={setAcid} placeholder="CH3COOH" formula />
                <TextField label="Base A⁻" sub="Formel" value={base} onChange={setBase} placeholder="CH3COONa" formula />
              </div>
              {(acid.trim() || base.trim()) && (
                <div className="chem-a-eq">
                  <Tex>{`${acid.trim() ? formulaTexOf(acid) : '\\mathrm{HA}'} \\;/\\; ${base.trim() ? formulaTexOf(base) : '\\mathrm{A^-}'}`}</Tex>
                </div>
              )}
              {!prep ? (
                <>
                  <div className="calc__row">
                    <span className="calc__label">Angabe als</span>
                    <Seg
                      value={bi}
                      onChange={(v) => {
                        setAng(v)
                        setBa(BUF_IN[v].a)
                        setBb(BUF_IN[v].b)
                        setBu(BUF_IN[v].unit)
                      }}
                      options={[
                        ['c', 'Konzentrationen'],
                        ['n', 'Stoffmengen'],
                        ['m', 'Massen'],
                        ['V', 'Volumina'],
                      ]}
                      label="Angabe"
                    />
                  </div>
                  <div className="calc__fields">
                    <NumField label={`${BUF_IN[bi].label} Säure`} value={ba} onChange={setBa} unit={bUnit} units={bUnits} onUnit={setBu} />
                    {bi === 'V' && <NumField label="c Säurelösung" value={ca} onChange={setCa} unit={csu} units={concs} onUnit={setCsu} />}
                    <NumField label={`${BUF_IN[bi].label} Base`} value={bb} onChange={setBb} unit={bUnit} />
                    {bi === 'V' && <NumField label="c Baselösung" value={cb} onChange={setCb} unit={csu} />}
                  </div>
                  <div className="calc__row">
                    <span className="calc__label">Zugabe</span>
                    <Seg
                      value={zugabe}
                      onChange={setZug}
                      options={[
                        ['keine', 'keine'],
                        ['saeure', 'starke Säure'],
                        ['base', 'starke Lauge'],
                      ]}
                      label="Zugabe"
                    />
                  </div>
                  {zugabe !== 'keine' && (
                    <div className="calc__fields">
                      <NumField label={zugabe === 'saeure' ? 'c (z. B. HCl)' : 'c (z. B. NaOH)'} value={czu} onChange={setCzu} unit={czuu} units={concs} onUnit={setCzuu} />
                      <NumField label="V zugegeben" value={vzu} onChange={setVzu} unit={vzuu} units={vols} onUnit={setVzuu} />
                      {bi !== 'V' && <NumField label="Puffervolumen" sub={bi === 'c' ? 'nötig' : 'optional'} value={vp} onChange={setVp} unit={vpu} units={vols} onUnit={setVpu} />}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="calc__fields">
                    <NumField label="Ziel-pH" value={phz} onChange={setPhz} />
                    <NumField label="Gesamtkonzentration" sub="Säure + Base" value={cges} onChange={setCges} unit={cgu} units={concs} onUnit={setCgu} />
                    <NumField label="Puffervolumen V" value={pv} onChange={setPv} unit={pvu} units={vols} onUnit={setPvu} />
                  </div>
                  <span className="calc__label">Stammlösungen (optional – sonst wird eingewogen)</span>
                  <div className="calc__fields">
                    <NumField label="c Säure-Stammlösung" value={sca} onChange={setSca} unit={scu2} units={concs} onUnit={setScu2} />
                    <NumField label="c Base-Stammlösung" value={scb} onChange={setScb} unit={scu2} />
                  </div>
                </>
              )}
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt; Zehnerpotenzen wie 1,8·10^-5 oder 1,8e-5.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die bekannten Werte ein.">
        {res && <PhScale pH={res.pH} />}
        {buf && <BufferPlot pKs={buf.pKs} ratio={buf.ratio} pH={buf.pH} />}
      </SolutionCard>
    </CalcPage>
  )
}
