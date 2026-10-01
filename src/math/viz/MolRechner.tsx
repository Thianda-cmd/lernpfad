import { useMemo, useState } from 'react'
import { Tex } from '../tex'
import { ELEMENTS, FormulaError, formulaTex, MASS_UNITS, molarMass, NA, parseFormula } from '../chem'
import { fmt, fsci, tn, tsci } from '../num'
import { VizHead } from './controls'

const QUICK = ['BaSO4', 'Ca(NO3)2', 'Ba(OH)2', 'AlCl3', 'Na2SO4', 'Ca3(PO4)2', 'Al2(SO4)3', 'H2O', 'C6H12O6']

export default function MolRechner() {
  const [f, setF] = useState('Ca3(PO4)2')
  const [m, setM] = useState('750')
  const [mu, setMu] = useState('mg')
  const res = useMemo(() => {
    try {
      const counts = parseFormula(f)
      return { counts, M: molarMass(counts) }
    } catch (e) {
      return { error: e instanceof FormulaError ? e.message : 'Formel nicht lesbar' }
    }
  }, [f])
  const mass = parseFloat(m.replace(',', '.'))
  const fac = MASS_UNITS.find((x) => x.u === mu)!.f

  return (
    <div className="mr">
      <VizHead title="Molare-Masse-Rechner" />
      <div className="mr__input">
        <label className="mr__field">
          <span>Summenformel</span>
          <input value={f} onChange={(e) => setF(e.target.value)} spellCheck={false} autoComplete="off" aria-label="Summenformel" />
        </label>
        <div className="viz__presets">
          {QUICK.map((q) => (
            <button key={q} type="button" className={`pill pill--sm ${q === f ? 'is-active' : ''}`} onClick={() => setF(q)}>
              <Tex>{formulaTex(q)}</Tex>
            </button>
          ))}
        </div>
      </div>
      {'error' in res ? (
        <p className="mr__error">{res.error}</p>
      ) : (
        <>
          <div className="mr__table-wrap">
            <table className="mr__table">
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Anzahl</th>
                  <th>Atommasse</th>
                  <th>Beitrag</th>
                  <th>Massen-%</th>
                </tr>
              </thead>
              <tbody>
                {res.counts!.map((c) => {
                  const part = c.n * ELEMENTS[c.el].m
                  return (
                    <tr key={c.el}>
                      <td>
                        <strong>{c.el}</strong> <span className="faint">{ELEMENTS[c.el].name}</span>
                      </td>
                      <td>{c.n}</td>
                      <td>{ELEMENTS[c.el].m.toFixed(2).replace('.', ',')} g/mol</td>
                      <td>{part.toFixed(2).replace('.', ',')} g/mol</td>
                      <td>{fmt((part / res.M!) * 100, 2)} %</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <Tex>{`M(${formulaTex(f)})`}</Tex>
                  </td>
                  <td>{res.counts!.reduce((s, c) => s + c.n, 0)} Atome</td>
                  <td />
                  <td>
                    <strong>{fmt(res.M!, 2)} g/mol</strong>
                  </td>
                  <td>100 %</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mr__stack" aria-hidden="true">
            {res.counts!.map((c, i) => {
              const w = ((c.n * ELEMENTS[c.el].m) / res.M!) * 100
              return (
                <span key={c.el} className={`mr__seg mr__seg--${i % 4}`} style={{ width: `${w}%` }} title={`${c.el}: ${fmt(w, 1)} %`}>
                  {w > 8 ? c.el : ''}
                </span>
              )
            })}
          </div>
          <div className="mr__conv">
            <div className="mr__conv-in">
              <label className="mr__field mr__field--sm">
                <span>Masse m</span>
                <input value={m} onChange={(e) => setM(e.target.value)} inputMode="decimal" aria-label="Masse" />
              </label>
              <select className="select" value={mu} onChange={(e) => setMu(e.target.value)} aria-label="Einheit">
                {MASS_UNITS.map((u) => (
                  <option key={u.u}>{u.u}</option>
                ))}
              </select>
            </div>
            {Number.isFinite(mass) && mass > 0 && (
              <div className="mr__conv-out">
                <Tex block>{`n = \\frac{m}{M} = \\frac{${tsci(mass * fac)}\\,\\text{g}}{${tn(res.M!, 2)}\\,\\text{g/mol}} = ${tsci((mass * fac) / res.M!)}\\,\\text{mol}`}</Tex>
                <Tex block>{`N = n \\cdot N_A = ${tsci(((mass * fac) / res.M!) * NA)}\\ \\text{Teilchen}`}</Tex>
                <p className="viz__note">
                  Ein Teilchen wiegt <Tex>{`\\frac{M}{N_A} = ${tsci(res.M! / NA)}\\,\\text{g}`}</Tex> ({fsci(res.M! / NA)} g).
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
