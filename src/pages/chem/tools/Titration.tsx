import { parseNum } from '../../../math/alg/numinput'
import { formulaTexOf } from '../../../math/alg/stoich'
import { PRIMARY, titer, titrationConc, titrationPredict, TITRATIONS, type ProbeGiven, type TitrationSolution } from '../../../math/alg/titration'
import { CONC_U, MASS_U, unitNames, VOL_U } from '../../../math/alg/units'
import { CalcPage, DataField, DataTable, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'
import '../../../styles/chem-a.css'

type Mode = 'probe' | 'titer' | 'verbrauch'

const RULES: Record<Mode, [string, string][]> = {
  probe: [
    ['n_M = c_M \\cdot t \\cdot V_M', 'Stoffmenge der Maßlösung'],
    ['n_P = n_M \\cdot \\frac{\\nu_P}{\\nu_M}', 'Verhältnis aus der Reaktionsgleichung'],
    ['c_P = \\frac{n_P}{V_P}', 'Konzentration der Probe'],
    ['m = n \\cdot M', 'Masse des gesuchten Stoffs'],
    ['w = \\frac{m}{m_{\\text{Einwaage}}} \\cdot 100\\,\\%', 'Gehalt'],
  ],
  titer: [
    ['n_U = \\frac{m}{M}', 'Stoffmenge der Urtitersubstanz'],
    ['c_{\\text{ist}} = \\frac{n_M}{V}', 'tatsächliche Konzentration'],
    ['t = \\frac{c_{\\text{ist}}}{c_{\\text{soll}}}', 'Titer (Korrekturfaktor)'],
    ['c_{\\text{ist}} = t \\cdot c_{\\text{soll}}', 'damit weiterrechnen'],
  ],
  verbrauch: [
    ['n_M = n_P \\cdot \\frac{\\nu_M}{\\nu_P}', 'Stoffmenge der Maßlösung'],
    ['V_M = \\frac{n_M}{c_M \\cdot t}', 'erwarteter Verbrauch'],
    ['n_P = c_P \\cdot V_P = \\frac{m}{M}', 'Stoffmenge in der Probe'],
  ],
}

function FormulaInput({ label, sub, value, onChange, M, setM }: { label: string; sub?: string; value: string; onChange: (v: string) => void; M: string; setM: (v: string) => void }) {
  return (
    <>
      <div className="calc__fields">
        <label className="nf">
          <span className="nf__label">
            {label}
            {sub && <small>{sub}</small>}
          </span>
          <span className="nf__row">
            <input className="nf__input nf__input--formula" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" placeholder="z. B. HCl" />
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

function Ratio({ a, setA, b, setB, la, lb }: { a: string; setA: (v: string) => void; b: string; setB: (v: string) => void; la: string; lb: string }) {
  return (
    <div className="chem-a-ratio">
      <NumField label="ν" sub={la} value={a} onChange={setA} />
      <span className="chem-a-ratio__colon" aria-hidden="true">
        :
      </span>
      <NumField label="ν" sub={lb} value={b} onChange={setB} />
    </div>
  )
}

const dez = (x: number, d = 2) => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: 3 })

function ReadingsTable({ sol }: { sol: TitrationSolution }) {
  const r = sol.readings ?? []
  if (r.length < 2 || sol.mean === undefined) return null
  const mean = sol.mean
  const u = sol.unit ?? 'mL'
  return (
    <div className="chem-a-table">
      <DataTable
        caption="Parallelbestimmungen"
        head={['Titration', `Verbrauch in ${u}`, 'Abweichung vom Mittelwert']}
        rows={r.map((v, i) => [`${i + 1}.`, dez(v), `${v - mean >= 0 ? '+' : '−'}${dez(Math.abs(v - mean))}`])}
        foot={['Mittelwert', dez(mean), '']}
      />
    </div>
  )
}

export default function Titration({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'probe')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'probe') as Mode
  // Reaktion und Maßlösung (Probe und Verbrauch)
  const [rk, setRk] = useParam('reaktion', 'hcl-naoh')
  const [cm, setCm] = useParam('cm', '0,1')
  const [cmu, setCmu] = useParam('cmu', 'mol/L')
  const [tt, setTt] = useParam('t', '1')
  const [np, setNp] = useParam('np', '1')
  const [nm, setNm] = useParam('nm', '1')
  const [fo, setFo] = useParam('formel', 'HCl')
  const [M, setM] = useParam('M', '')
  // Probe
  const [rd, setRd] = useParam('v', '18,45; 18,50; 18,40')
  const [vp, setVp] = useParam('vp', '20')
  const [vpu, setVpu] = useParam('vpu', 'mL')
  const [vk, setVk] = useParam('vk', '')
  const [vku, setVku] = useParam('vku', 'mL')
  const [me, setMe] = useParam('me', '')
  const [meu, setMeu] = useParam('meu', 'g')
  // Verbrauch
  const [gp, setGp] = useParam('gp', 'c')
  const pg = (gp === 'm' ? 'm' : 'c') as ProbeGiven
  const [cp, setCp] = useParam('cp', '0,1')
  const [cpu, setCpu] = useParam('cpu', 'mol/L')
  const [vp2, setVp2] = useParam('vp2', '20')
  const [vp2u, setVp2u] = useParam('vp2u', 'mL')
  const [mp, setMp] = useParam('mp', '0,2')
  const [mpu, setMpu] = useParam('mpu', 'g')
  // Titer
  const [ut, setUt] = useParam('urtiter', 'khp-naoh')
  const [um, setUm] = useParam('um', '0,4085')
  const [umu, setUmu] = useParam('umu', 'g')
  const [uM, setUM] = useParam('uM', '204,22')
  const [uf, setUf] = useParam('uformel', '')
  const [uv, setUv] = useParam('uv', '20,10')
  const [uvu, setUvu] = useParam('uvu', 'mL')
  const [cs, setCs] = useParam('csoll', '0,1')
  const [csu, setCsu] = useParam('csu', 'mol/L')
  const [nu, setNu] = useParam('nu', '1')
  const [num, setNum] = useParam('num', '1')

  // Vorlage nur benutzen, solange Formel und Verhältnis noch dazu passen
  const pre = TITRATIONS.find((x) => x.id === rk && String(x.nuP) === np.trim() && String(x.nuM) === nm.trim() && x.formula === fo.trim())
  const lab = { eq: pre?.eq, P: pre?.P ?? (fo.trim() ? formulaTexOf(fo) : undefined), M: pre?.M }
  const prim = PRIMARY.find((x) => x.id === ut && x.M === uM.trim() && String(x.nuU) === nu.trim() && String(x.nuM) === num.trim() && !uf.trim())

  const { res, err } = useSolve<TitrationSolution>(() => {
    switch (m) {
      case 'probe':
        return titrationConc({
          cM: parseNum(cm, 'c (Maßlösung)'),
          cmu,
          t: parseNum(tt, 'Titer'),
          readings: rd,
          vmu: 'mL',
          VP: parseNum(vp, 'V (Probe)'),
          vpu,
          nuP: parseNum(np, 'ν (Probe)'),
          nuM: parseNum(nm, 'ν (Maßlösung)'),
          formula: fo,
          Mp: parseNum(M, 'M'),
          VK: parseNum(vk, 'V (Messkolben)'),
          vku,
          mE: parseNum(me, 'Einwaage'),
          meu,
          ...lab,
        })
      case 'titer':
        return titer({
          m: parseNum(um, 'Einwaage'),
          mu: umu,
          formula: uf,
          M: parseNum(uM, 'M'),
          label: prim?.tex,
          V: parseNum(uv, 'Verbrauch'),
          vu: uvu,
          cSoll: parseNum(cs, 'c (soll)'),
          cu: csu,
          nuU: parseNum(nu, 'ν (Urtiter)'),
          nuM: parseNum(num, 'ν (Maßlösung)'),
          titrant: prim?.titrant,
          eq: prim?.eq,
        })
      case 'verbrauch':
        return titrationPredict({
          given: pg,
          cP: parseNum(cp, 'c (Probe)'),
          cpu,
          VP: parseNum(vp2, 'V (Probe)'),
          vpu: vp2u,
          mP: parseNum(mp, 'm (Probe)'),
          mpu,
          formula: fo,
          Mp: parseNum(M, 'M'),
          cM: parseNum(cm, 'c (Maßlösung)'),
          cmu,
          t: parseNum(tt, 'Titer'),
          nuP: parseNum(np, 'ν (Probe)'),
          nuM: parseNum(nm, 'ν (Maßlösung)'),
          ...lab,
        })
    }
  }, [m, cm, cmu, tt, rd, vp, vpu, np, nm, fo, M, vk, vku, me, meu, lab.eq, lab.P, lab.M, um, umu, uf, uM, prim?.tex, prim?.titrant, prim?.eq, uv, uvu, cs, csu, nu, num, pg, cp, cpu, vp2, vp2u, mp, mpu])

  const concs = unitNames(CONC_U)
  const vols = unitNames(VOL_U)
  const masses = unitNames(MASS_U)
  const pickReaction = (id: string, withSample: boolean) => {
    const x = TITRATIONS.find((r) => r.id === id)
    if (!x) return
    setRk(x.id)
    setCm(x.cM)
    setCmu('mol/L')
    setTt('1')
    setNp(String(x.nuP))
    setNm(String(x.nuM))
    setFo(x.formula)
    setM('')
    if (withSample) {
      setRd(x.readings)
      setVp(x.VP)
      setVpu('mL')
      setVk(x.VK ?? '')
      setVku('mL')
      setMe(x.mE ?? '')
      setMeu('g')
    }
  }
  const reaction = (withSample: boolean) => (
    <>
      <Examples items={TITRATIONS.map((x) => [x.id, x.label] as [string, string])} current={pre?.id} onPick={(id) => pickReaction(id, withSample)} />
      {pre && (
        <div className="chem-a-eq">
          <Tex>{pre.eq}</Tex>
        </div>
      )}
      {pre?.hint && withSample && <p className="calc__hint">{pre.hint}</p>}
      <span className="calc__label">Maßlösung</span>
      <div className="calc__fields">
        <NumField label="Konzentration c" value={cm} onChange={setCm} unit={cmu} units={concs} onUnit={setCmu} />
        <NumField label="Titer t" sub="leer = 1" value={tt} onChange={setTt} />
        <Ratio a={np} setA={setNp} b={nm} setB={setNm} la="Probe" lb="Maßlösung" />
      </div>
    </>
  )
  return (
    <CalcPage
      eyebrow="Chemie · Rechner"
      title={tool.title}
      intro="Maßanalyse mit vollständigem Rechenweg: Konzentration, Masse und Gehalt der Probe aus dem Verbrauch, Titer einer Maßlösung bestimmen und den Verbrauch vorab abschätzen."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['probe', 'Konzentration der Probe'],
            ['titer', 'Titer bestimmen'],
            ['verbrauch', 'Verbrauch vorhersagen'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'probe' && (
            <>
              {reaction(true)}
              <span className="calc__label">Probe</span>
              <DataField
                label="Verbrauch an Maßlösung"
                sub="in mL, mehrere Ablesungen möglich"
                value={rd}
                onChange={setRd}
                rows={2}
                placeholder="18,45; 18,50; 18,40"
                hint="Werte mit Semikolon, Leerzeichen oder neuer Zeile trennen – der Mittelwert wird verwendet."
              />
              <div className="calc__fields">
                <NumField label="Probevolumen" sub="vorgelegt" value={vp} onChange={setVp} unit={vpu} units={vols} onUnit={setVpu} />
                <NumField label="Messkolben" sub="optional, bei Aliquot" value={vk} onChange={setVk} unit={vku} units={vols} onUnit={setVku} />
                <NumField label="Einwaage" sub="optional, für Gehalt" value={me} onChange={setMe} unit={meu} units={masses} onUnit={setMeu} />
              </div>
              <FormulaInput label="Gesuchter Stoff" sub="optional, für Masse" value={fo} onChange={setFo} M={M} setM={setM} />
            </>
          )}
          {m === 'titer' && (
            <>
              <Examples
                items={PRIMARY.map((x) => [x.id, x.label] as [string, string])}
                current={prim?.id}
                onPick={(id) => {
                  const x = PRIMARY.find((p) => p.id === id)
                  if (!x) return
                  setUt(x.id)
                  setUM(x.M)
                  setUf('')
                  setUm(x.m)
                  setUmu('g')
                  setUv(x.V)
                  setUvu('mL')
                  setCs(x.cSoll)
                  setCsu('mol/L')
                  setNu(String(x.nuU))
                  setNum(String(x.nuM))
                }}
              />
              {prim && (
                <div className="chem-a-eq">
                  <Tex>{prim.eq}</Tex>
                </div>
              )}
              <span className="calc__label">Urtitersubstanz {prim ? `(${prim.name})` : ''}</span>
              <div className="calc__fields">
                <NumField label="Einwaage m" value={um} onChange={setUm} unit={umu} units={masses} onUnit={setUmu} />
                <NumField label="molare Masse M" sub="oder Formel" value={uM} onChange={setUM} unit="g/mol" />
                <label className="nf">
                  <span className="nf__label">
                    Summenformel<small>optional</small>
                  </span>
                  <span className="nf__row">
                    <input className="nf__input nf__input--formula" value={uf} onChange={(e) => setUf(e.target.value)} spellCheck={false} autoComplete="off" placeholder="z. B. Na2CO3" />
                  </span>
                </label>
              </div>
              <span className="calc__label">Maßlösung</span>
              <div className="calc__fields">
                <NumField label="Verbrauch V" value={uv} onChange={setUv} unit={uvu} units={vols} onUnit={setUvu} />
                <NumField label="Sollkonzentration" value={cs} onChange={setCs} unit={csu} units={concs} onUnit={setCsu} />
                <Ratio a={nu} setA={setNu} b={num} setB={setNum} la="Urtiter" lb="Maßlösung" />
              </div>
            </>
          )}
          {m === 'verbrauch' && (
            <>
              {reaction(false)}
              <div className="calc__row">
                <span className="calc__label">Probe bekannt als</span>
                <Seg
                  value={pg}
                  onChange={setGp}
                  options={[
                    ['c', 'Konzentration + Volumen'],
                    ['m', 'Masse'],
                  ]}
                  label="Probe"
                />
              </div>
              {pg === 'c' ? (
                <div className="calc__fields">
                  <NumField label="erwartete Konzentration" value={cp} onChange={setCp} unit={cpu} units={concs} onUnit={setCpu} />
                  <NumField label="Probevolumen" sub="vorgelegt" value={vp2} onChange={setVp2} unit={vp2u} units={vols} onUnit={setVp2u} />
                </div>
              ) : (
                <>
                  <div className="calc__fields">
                    <NumField label="Masse des Stoffs" value={mp} onChange={setMp} unit={mpu} units={masses} onUnit={setMpu} />
                  </div>
                  <FormulaInput label="Stoff" value={fo} onChange={setFo} M={M} setM={setM} />
                </>
              )}
            </>
          )}
          <p className="calc__hint">Das Stoffmengenverhältnis ν steht in der Reaktionsgleichung (Koeffizienten). Kommazahlen mit Komma oder Punkt.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die bekannten Werte ein.">
        {res && m === 'probe' && <ReadingsTable sol={res} />}
      </SolutionCard>
    </CalcPage>
  )
}
