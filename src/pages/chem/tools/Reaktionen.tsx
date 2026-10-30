import { useMemo, type ReactNode } from 'react'
import { parseNum } from '../../../math/alg/numinput'
import { balanceEquation, equationTex, isGas, parseReaction, pickWanted, reactionAmounts, reactionYield, VM, type AmountRow, type GivenKind, type YieldRow } from '../../../math/alg/reaction'
import { MASS_U, MOL_U, nt, unitNames, VOL_U } from '../../../math/alg/units'
import { CalcPage, DataTable, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

type Mode = 'ausgleichen' | 'massen' | 'ausbeute'

const RULES: Record<Mode, [string, string][]> = {
  ausgleichen: [
    ['\\text{Atome links} = \\text{Atome rechts}', 'für jedes Element'],
    ['\\textstyle\\sum \\text{Ladung links} = \\sum \\text{Ladung rechts}', 'bei Ionengleichungen'],
    ['2\\,\\mathrm{H_2O} \\ne \\mathrm{H_4O_2}', 'nur Koeffizienten ändern, nie die Indizes'],
    ['a, b, c, \\dots \\in \\mathbb{N}', 'Koeffizienten: kleinste ganze Zahlen'],
  ],
  massen: [
    ['n = \\frac{m}{M}', 'Masse → Stoffmenge'],
    ['\\frac{n(\\mathrm{B})}{n(\\mathrm{A})} = \\frac{\\nu_{\\mathrm{B}}}{\\nu_{\\mathrm{A}}}', 'Stoffmengen verhalten sich wie die Koeffizienten'],
    ['m = n \\cdot M', 'Stoffmenge → Masse'],
    ['V = n \\cdot V_m', 'Gasvolumen: Vₘ = 22,414 L/mol (0 °C) bzw. 24,0 L/mol (20 °C)'],
  ],
  ausbeute: [
    ['\\frac{n}{\\nu} \\text{ am kleinsten}', 'dieser Stoff steht im Unterschuss und begrenzt'],
    ['n(\\mathrm{P}) = \\frac{\\nu_{\\mathrm{P}}}{\\nu_{\\mathrm{A}}} \\cdot n(\\mathrm{A})', 'Produkt aus dem Stoff im Unterschuss'],
    ['\\eta = \\frac{m_{\\text{ist}}}{m_{\\text{theor.}}} \\cdot 100\\,\\%', 'Ausbeute'],
  ],
}

const EX_BAL: [string, string][] = [
  ['Fe + O2 -> Fe2O3', 'Eisen rostet'],
  ['C3H8 + O2 -> CO2 + H2O', 'Propan verbrennt'],
  ['CH3COOH + NaOH -> CH3COONa + H2O', 'Essigsäure + Natronlauge'],
  ['CaCO3 + CH3COOH -> Ca(CH3COO)2 + H2O + CO2', 'Kalk + Essig (Acetat)'],
  ['Al + HCl -> AlCl3 + H2', 'Aluminium + Salzsäure'],
  ['C6H12O6 + O2 -> CO2 + H2O', 'Zellatmung'],
  ['KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O', 'Permanganat + Salzsäure'],
  ['Cu + HNO3 -> Cu(NO3)2 + NO + H2O', 'Kupfer + Salpetersäure'],
  ['MnO4^- + Fe^2+ + H^+ -> Mn^2+ + Fe^3+ + H2O', 'Ionen: MnO₄⁻ + Fe²⁺'],
]

/** Vorlagen „Massen berechnen“: Gleichung, gegebener Stoff, Art, Wert, Einheit, gesuchter Stoff, Vm */
const EX_MASS: Record<string, { label: string; gl: string; stoff: string; art: GivenKind; wert: string; einheit: string; gesucht: string; vm?: string }> = {
  kalk: { label: '10 g Kalk brennen', gl: 'CaCO3 -> CaO + CO2', stoff: '0', art: 'm', wert: '10', einheit: 'g', gesucht: '2' },
  acetat: { label: 'Natron + Essig (Acetat)', gl: 'CH3COOH + NaHCO3 -> CH3COONa + H2O + CO2', stoff: '1', art: 'm', wert: '8,4', einheit: 'g', gesucht: '4', vm: '24,0' },
  katalase: { label: 'H₂O₂ zerfällt (Katalase)', gl: 'H2O2 -> H2O + O2', stoff: '0', art: 'm', wert: '3,4', einheit: 'g', gesucht: '2', vm: '24,0' },
  zink: { label: 'Zink + Salzsäure: H₂', gl: 'Zn + HCl -> ZnCl2 + H2', stoff: '0', art: 'm', wert: '6,54', einheit: 'g', gesucht: '3', vm: '24,0' },
  glucose: { label: '18 g Glucose veratmen', gl: 'C6H12O6 + O2 -> CO2 + H2O', stoff: '0', art: 'm', wert: '18', einheit: 'g', gesucht: '2' },
  ammoniak: { label: '1 kg Ammoniak', gl: 'N2 + H2 -> NH3', stoff: '2', art: 'm', wert: '1', einheit: 'kg', gesucht: '1' },
}

const EX_YIELD: Record<string, { label: string; gl: string; m: [string, string, string, string]; produkt: string; ist: string }> = {
  fes: { label: 'Eisen + Schwefel', gl: 'Fe + S -> FeS', m: ['10', '5', '', ''], produkt: '0', ist: '12' },
  ester: { label: 'Ethylacetat (Ester)', gl: 'CH3COOH + C2H5OH -> CH3COOC2H5 + H2O', m: ['12', '11,5', '', ''], produkt: '0', ist: '11' },
  ammoniak: { label: 'Ammoniak-Synthese', gl: 'N2 + H2 -> NH3', m: ['28', '5', '', ''], produkt: '0', ist: '20' },
  mgo: { label: 'Magnesium verbrennt', gl: 'Mg + O2 -> MgO', m: ['2,43', '1', '', ''], produkt: '0', ist: '2,2' },
}

const DEFAULT_GL: Record<Mode, string> = { ausgleichen: EX_BAL[0][0], massen: EX_MASS.kalk.gl, ausbeute: EX_YIELD.fes.gl }

const KIND_UNITS: Record<GivenKind, string[]> = { m: unitNames(MASS_U), n: unitNames(MOL_U), V: unitNames(VOL_U) }
const KIND_BASE: Record<GivenKind, string> = { m: 'g', n: 'mol', V: 'L' }

const cell = (t: string): ReactNode => <Tex>{t}</Tex>

export default function Reaktionen({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'ausgleichen')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'ausgleichen') as Mode
  const [gl, setGl] = useParam('gl', DEFAULT_GL[m])
  // Massen berechnen
  const [stoff, setStoff] = useParam('stoff', '0')
  const [art, setArt] = useParam('art', 'm')
  const [wert, setWert] = useParam('wert', '10')
  const [einheit, setEinheit] = useParam('einheit', 'g')
  const [gesucht, setGesucht] = useParam('gesucht', '2')
  const [vm, setVm] = useParam('vm', '22,414')
  // Ausbeute
  const [m1, setM1] = useParam('m1', '10')
  const [m2, setM2] = useParam('m2', '5')
  const [m3, setM3] = useParam('m3', '')
  const [m4, setM4] = useParam('m4', '')
  const [u1, setU1] = useParam('u1', 'g')
  const [u2, setU2] = useParam('u2', 'g')
  const [u3, setU3] = useParam('u3', 'g')
  const [u4, setU4] = useParam('u4', 'g')
  const [produkt, setProdukt] = useParam('produkt', '0')
  const [ist, setIst] = useParam('ist', '12')
  const [iu, setIu] = useParam('iu', 'g')

  const parsed = useMemo(() => {
    try {
      return parseReaction(gl)
    } catch {
      return null
    }
  }, [gl])
  const kind = (['m', 'n', 'V'].includes(art) ? art : 'm') as GivenKind
  const unitOk = KIND_UNITS[kind].includes(einheit) ? einheit : KIND_BASE[kind]
  const N = parsed?.all.length ?? 0
  const given = Math.min(Math.max(parseInt(stoff, 10) || 0, 0), Math.max(N - 1, 0))
  const wanted = parseInt(gesucht, 10)
  const nRight = parsed?.right.length ?? 0
  const prod = Math.min(Math.max(parseInt(produkt, 10) || 0, 0), Math.max(nRight - 1, 0))
  const masses = [m1, m2, m3, m4]
  const setMasses = [setM1, setM2, setM3, setM4]
  const units = [u1, u2, u3, u4]
  const setUnits = [setU1, setU2, setU3, setU4]

  const { res, err } = useSolve(() => {
    if (!gl.trim()) return null
    if (m === 'ausgleichen') return balanceEquation(gl)
    if (m === 'massen') return reactionAmounts({ equation: gl, given, kind, value: parseNum(wert, 'Gegebene Menge'), unit: unitOk, vm, wanted: Number.isFinite(wanted) ? wanted : null })
    return reactionYield({
      equation: gl,
      masses: masses.map((x, i) => parseNum(x, `Masse ${i + 1}`)),
      units,
      product: prod,
      actual: parseNum(ist, 'Erhaltene Masse'),
      actualUnit: iu,
    })
  }, [m, gl, given, kind, wert, unitOk, vm, wanted, m1, m2, m3, m4, u1, u2, u3, u4, prod, ist, iu])

  const switchMode = (v: Mode) => {
    if (Object.values(DEFAULT_GL).includes(gl)) setGl(DEFAULT_GL[v])
    setMode(v)
  }
  const pickMass = (k: string) => {
    const e = EX_MASS[k]
    setGl(e.gl)
    setStoff(e.stoff)
    setArt(e.art)
    setWert(e.wert)
    setEinheit(e.einheit)
    setGesucht(e.gesucht)
    setVm(e.vm ?? '22,414')
  }
  const pickYield = (k: string) => {
    const e = EX_YIELD[k]
    setGl(e.gl)
    e.m.forEach((x, i) => {
      setMasses[i](x)
      setUnits[i]('g')
    })
    setProdukt(e.produkt)
    setIst(e.ist)
    setIu('g')
  }
  const hasGas = parsed?.all.some(isGas) ?? false
  const wantedIdx = parsed ? pickWanted(parsed, given, Number.isFinite(wanted) ? wanted : null) : -1
  // res kommt verzögert (useDeferredValue): direkt nach dem Wechsel der Aufgabe kann es noch das Ergebnis
  // der vorigen Aufgabe sein – deshalb an der Form der Zeilen prüfen, nicht nur am Modus
  const rows = res && 'rows' in res ? (res.rows as object[]) : null
  const amountRows = m === 'massen' && rows?.every((r) => 'side' in r) ? (rows as AmountRow[]) : null
  const yRows = m === 'ausbeute' && rows?.every((r) => 'role' in r) ? (rows as YieldRow[]) : null

  return (
    <CalcPage
      eyebrow="Chemie · Rechner"
      title={tool.title}
      intro="Reaktionsgleichungen ausgleichen – auch mit Ionen und Elektronen –, Massen und Gasvolumina über das Stoffmengenverhältnis berechnen, den Stoff im Unterschuss finden und die Ausbeute bestimmen. Mit vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={switchMode}
          options={[
            ['ausgleichen', 'Ausgleichen'],
            ['massen', 'Massen berechnen'],
            ['ausbeute', 'Ausbeute & Unterschuss'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <label className="nf">
            <span className="nf__label">
              Reaktionsgleichung<small>Pfeil als -&gt; oder =</small>
            </span>
            <span className="nf__row">
              <input className="nf__input nf__input--formula" value={gl} onChange={(e) => setGl(e.target.value)} spellCheck={false} autoComplete="off" placeholder="Fe + O2 -> Fe2O3" aria-label="Reaktionsgleichung" />
            </span>
          </label>
          {parsed && (
            <div className="calc__formula">
              <Tex>{equationTex(parsed)}</Tex>
            </div>
          )}
          {m === 'ausgleichen' && <Examples items={EX_BAL} onPick={setGl} current={gl} />}
          {m === 'massen' && <Examples items={Object.entries(EX_MASS).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickMass} />}
          {m === 'ausbeute' && <Examples items={Object.entries(EX_YIELD).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickYield} />}

          {m === 'massen' && parsed && (
            <>
              <div className="calc__row">
                <span className="calc__label">Gegeben ist</span>
                <Seg value={String(given)} onChange={setStoff} options={parsed.all.map((s, i) => [String(i), s.label] as [string, string])} label="Gegebener Stoff" />
              </div>
              <div className="calc__row">
                <Seg
                  value={kind}
                  onChange={(v) => {
                    setArt(v)
                    setEinheit(KIND_BASE[v])
                  }}
                  options={[
                    ['m', 'Masse m'],
                    ['n', 'Stoffmenge n'],
                    ['V', 'Gasvolumen V'],
                  ]}
                  label="Art der Angabe"
                />
              </div>
              <div className="calc__fields">
                <NumField label={kind === 'm' ? 'Masse m' : kind === 'n' ? 'Stoffmenge n' : 'Volumen V'} sub={parsed.all[given]?.label} value={wert} onChange={setWert} unit={unitOk} units={KIND_UNITS[kind]} onUnit={setEinheit} />
              </div>
              <div className="calc__row">
                <span className="calc__label">Gesucht</span>
                <Seg
                  value={String(wantedIdx)}
                  onChange={setGesucht}
                  options={parsed.all.flatMap((s, i) => (i === given || s.electron ? [] : [[String(i), s.label] as [string, string]]))}
                  label="Gesuchter Stoff"
                />
              </div>
              {(kind === 'V' || hasGas) && (
                <div className="calc__row">
                  <span className="calc__label">Molares Volumen</span>
                  <Seg
                    value={vm in VM ? vm : '22,414'}
                    onChange={setVm}
                    options={[
                      ['22,414', '22,414 L/mol · 0 °C'],
                      ['24,0', '24,0 L/mol · 20 °C'],
                      ['24,47', '24,47 L/mol · 25 °C'],
                    ]}
                    label="Molares Volumen"
                  />
                </div>
              )}
            </>
          )}

          {m === 'ausbeute' && parsed && (
            <>
              <span className="calc__label">Eingesetzte Massen der Edukte</span>
              <div className="calc__fields">
                {parsed.left.slice(0, 4).map((s, i) =>
                  s.electron ? null : <NumField key={i} label={<Tex>{s.tex}</Tex>} sub="Masse" value={masses[i]} onChange={setMasses[i]} unit={units[i]} units={unitNames(MASS_U)} onUnit={setUnits[i]} />,
                )}
              </div>
              <div className="calc__row">
                <span className="calc__label">Produkt</span>
                <Seg value={String(prod)} onChange={setProdukt} options={parsed.right.flatMap((s, i) => (s.electron ? [] : [[String(i), s.label] as [string, string]]))} label="Produkt" />
              </div>
              <div className="calc__fields">
                <NumField label="Erhalten" sub="optional, für die Ausbeute" value={ist} onChange={setIst} unit={iu} units={unitNames(MASS_U)} onUnit={setIu} />
              </div>
            </>
          )}
          <p className="calc__hint">
            Stoffe mit „+“ trennen. Ladungen mit ^ schreiben: Fe^3+, SO4^2-, H^+, Elektronen e^-. Zustände wie (g) oder (aq) sind erlaubt. Eingetippte Koeffizienten werden ignoriert.
          </p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Gib eine Reaktionsgleichung ein, z. B. „Fe + O2 -> Fe2O3“.">
        {amountRows && (
          <div className="calc__insert">
            <DataTable
              caption="Alle Stoffe der Reaktion"
              head={['Stoff', cell('\\nu'), cell('M\\ \\text{in g/mol}'), cell('n\\ \\text{in mol}'), cell('m\\ \\text{in g}'), cell('V\\ \\text{in L}')]}
              rows={reactionAmountsRows(amountRows)}
            />
          </div>
        )}
        {yRows && (
          <div className="calc__insert">
            <DataTable
              caption="Vergleich der Edukte"
              head={['Stoff', cell('m\\ \\text{in g}'), cell('n\\ \\text{in mol}'), cell('n / \\nu'), 'Rolle']}
              rows={yieldRows(yRows)}
            />
          </div>
        )}
      </SolutionCard>
    </CalcPage>
  )
}

function reactionAmountsRows(rows: AmountRow[]): ReactNode[][] {
  return rows.map((r) => [
    <span key="s">
      <Tex>{r.tex}</Tex>
      {r.given ? ' (gegeben)' : ''}
    </span>,
    cell(String(r.nu)),
    r.M ? cell(nt(r.M, 6)) : '–',
    cell(nt(r.n)),
    r.m ? cell(nt(r.m)) : '–',
    r.V ? cell(nt(r.V)) : '–',
  ])
}

function yieldRows(rows: YieldRow[]): ReactNode[][] {
  return rows.map((r) => [cell(r.tex), cell(nt(r.m)), cell(nt(r.n)), cell(nt(r.per)), r.role === 'limit' ? 'Unterschuss' : r.role === 'exact' ? 'passend' : 'Überschuss'])
}
