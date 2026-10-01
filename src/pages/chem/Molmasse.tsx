import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ELEMENTS, fmtMass, position } from '../../chem/elements'
import { FormulaError, NA, molarMass, parseFormula } from '../../chem/formula'
import { Formula } from '../../chem/format'
import '../../styles/chem.css'

const EXAMPLES = ['H2O', 'NaCl', 'NaOH', 'HCl', 'H2SO4', 'C6H12O6', 'KMnO4', 'Ca3(PO4)2', 'CuSO4·5H2O', 'Al2(SO4)3']

const MASS_UNITS = [
  { u: 'kg', f: 1e3 },
  { u: 'g', f: 1 },
  { u: 'mg', f: 1e-3 },
  { u: 'µg', f: 1e-6 },
]
const MOL_UNITS = [
  { u: 'mol', f: 1 },
  { u: 'mmol', f: 1e-3 },
  { u: 'µmol', f: 1e-6 },
]

const de = (v: number, d = 4) => v.toLocaleString('de-DE', { maximumFractionDigits: d, useGrouping: false })
/** feste Nachkommastellen für Prozentwerte */
const pc = (v: number, d: number) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false })

function Sci({ v }: { v: number }) {
  if (!Number.isFinite(v) || v === 0) return <>0</>
  const e = Math.floor(Math.log10(Math.abs(v)))
  if (e >= -3 && e < 6) return <>{de(v, Math.max(0, 3 - e))}</>
  return (
    <>
      {de(v / 10 ** e, 3)} · 10<sup>{e}</sup>
    </>
  )
}

function Frac({ a, b }: { a: ReactNode; b: ReactNode }) {
  return (
    <span className="mm__frac">
      <span>{a}</span>
      <span>{b}</span>
    </span>
  )
}

export default function Molmasse() {
  const [params] = useSearchParams()
  const [f, setF] = useState(params.get('formel') ?? 'Ca3(PO4)2')
  const [amount, setAmount] = useState('10')
  const [unit, setUnit] = useState('g')
  const ref = useRef<HTMLInputElement>(null)

  const res = useMemo(() => {
    try {
      const counts = parseFormula(f)
      return { counts, M: molarMass(counts) }
    } catch (e) {
      return { error: e instanceof FormulaError ? e.message : 'Formel nicht lesbar.' }
    }
  }, [f])

  const insert = (s: string) => {
    const el = ref.current
    const a = el?.selectionStart ?? f.length
    const b = el?.selectionEnd ?? f.length
    setF(f.slice(0, a) + s + f.slice(b))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(a + s.length, a + s.length)
    })
  }

  const x = parseFloat(amount.replace(',', '.'))
  const isMass = MASS_UNITS.some((m) => m.u === unit)
  const fac = (isMass ? MASS_UNITS : MOL_UNITS).find((m) => m.u === unit)!.f
  const clean = f.replace(/\s+/g, '')

  return (
    <div className="page chem-tool">
      <header className="page-head">
        <div>
          <p className="eyebrow">Chemie</p>
          <h1>Molare Masse</h1>
          <p>Standard-Atomgewichte nach IUPAC.</p>
        </div>
      </header>

      <div className="mm">
        <section className="mm__main card">
          <div className="mm__in">
            <input ref={ref} className="mm__input" value={f} onChange={(e) => setF(e.target.value)} spellCheck={false} autoComplete="off" aria-label="Summenformel" placeholder="z. B. H2SO4" />
            <div className="mm__examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" className={`mm__ex ${ex === clean ? 'is-on' : ''}`} onClick={() => setF(ex)}>
                  <Formula f={ex} />
                </button>
              ))}
            </div>
          </div>

          {'error' in res ? (
            <p className="mm__error">{res.error}</p>
          ) : (
            <div className="mm__out" key={clean}>
              <div className="mm__result">
                <span className="mm__lhs">
                  M(<Formula f={clean} />)
                </span>
                <strong>{de(res.M!, 3)}</strong>
                <em>g/mol</em>
              </div>
              <p className="mm__way">
                {res.counts!.map((c, i) => (
                  <span key={c.el.sym}>
                    {i > 0 && ' + '}
                    {c.n > 1 && `${c.n} · `}
                    {fmtMass(c.el)}
                  </span>
                ))}{' '}
                = {de(res.M!, 3)}
              </p>

              <div className="mm__bar" aria-hidden="true">
                {res.counts!.map((c) => {
                  const w = (c.el.mass * c.n) / res.M!
                  return (
                    <span key={c.el.sym} className={`c-${c.el.cat}`} style={{ flexGrow: w }}>
                      {w > 0.09 && (
                        <>
                          <b>{c.el.sym}</b> {pc(w * 100, 1)} %
                        </>
                      )}
                    </span>
                  )
                })}
              </div>

              <table className="mm__table">
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>Anzahl</th>
                    <th>Atommasse</th>
                    <th>Beitrag</th>
                    <th>Massenanteil</th>
                  </tr>
                </thead>
                <tbody>
                  {res.counts!.map((c) => (
                    <tr key={c.el.sym}>
                      <td>
                        <b>{c.el.sym}</b> <span className="faint">{c.el.name}</span>
                      </td>
                      <td>{c.n}</td>
                      <td>{fmtMass(c.el)} u</td>
                      <td>{de(c.el.mass * c.n, 3)} g/mol</td>
                      <td>{pc(((c.el.mass * c.n) / res.M!) * 100, 2)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {res.counts!.some((c) => c.el.radio) && <p className="faint mm__note">Enthält Elemente ohne stabile Isotope – dort zählt die Massenzahl.</p>}
            </div>
          )}

          {!('error' in res) && (
            <div className="mm__conv">
              <span className="mm__conv-k">Umrechnen</span>
              <div className="mm__conv-in">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Menge" />
                <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Einheit">
                  <optgroup label="Masse">
                    {MASS_UNITS.map((m) => (
                      <option key={m.u}>{m.u}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Stoffmenge">
                    {MOL_UNITS.map((m) => (
                      <option key={m.u}>{m.u}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              {Number.isFinite(x) && x > 0 && (() => {
                const n = isMass ? (x * fac) / res.M! : x * fac
                const M = <>{de(res.M!, 3)} g/mol</>
                return (
                  <div className="mm__calc">
                    {fac !== 1 && (
                      <p>
                        <i>{isMass ? 'm' : 'n'}</i> = {de(x)} {unit} = <Sci v={x * fac} /> {isMass ? 'g' : 'mol'}
                      </p>
                    )}
                    {isMass ? (
                      <p>
                        <i>n</i> = <Frac a={<i>m</i>} b={<i>M</i>} /> = <Frac a={<><Sci v={x * fac} /> g</>} b={M} /> = <strong><Sci v={n} /> mol</strong>
                      </p>
                    ) : (
                      <p>
                        <i>m</i> = <i>n</i> · <i>M</i> = <Sci v={n} /> mol · {M} = <strong><Sci v={n * res.M!} /> g</strong>
                      </p>
                    )}
                    <p>
                      <i>N</i> = <i>n</i> · <i>N</i><sub>A</sub> = <Sci v={n} /> mol · 6,022 · 10<sup>23</sup> mol<sup>−1</sup> = <strong><Sci v={n * NA} /></strong> Teilchen
                    </p>
                  </div>
                )
              })()}
            </div>
          )}
        </section>

        <aside className="mm__keys card" aria-label="Elemente einfügen">
          <div className="mm__pse">
            {ELEMENTS.map((e) => {
              const p = position(e.z)
              return (
                <button key={e.z} type="button" className={`mm__k c-${e.cat}`} style={{ gridRow: p.row, gridColumn: p.col }} onClick={() => insert(e.sym)} title={e.name}>
                  {e.sym}
                </button>
              )
            })}
          </div>
          <div className="mm__digits">
            {['2', '3', '4', '5', '6', '7', '8', '9', '(', ')', '·'].map((d) => (
              <button key={d} type="button" onClick={() => insert(d)}>
                {d}
              </button>
            ))}
            <button type="button" onClick={() => setF((s) => s.slice(0, -1))} aria-label="Letztes Zeichen löschen">
              ⌫
            </button>
            <button type="button" className="mm__clear" onClick={() => setF('')}>
              Leeren
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
