import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ANIONS, CATIONS, combine, type Ion } from '../../chem/ions'
import { molarMass, parseFormula } from '../../chem/formula'
import { Formula, chargeText } from '../../chem/format'
import { IconArrowRight } from '../../components/icons'
import '../../styles/chem.css'

function IonChip({ ion, on, onClick }: { ion: Ion; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`ion ${on ? 'is-on' : ''} ${ion.q > 0 ? 'ion--c' : 'ion--a'}`} onClick={onClick}>
      <Formula f={ion.f} charge={chargeText(ion.q)} />
      <span>{ion.q > 0 ? ion.name : ion.name.charAt(0).toUpperCase() + ion.name.slice(1)}</span>
    </button>
  )
}

function Group({ ions, sel, onPick }: { ions: Ion[]; sel: string; onPick: (id: string) => void }) {
  const byQ = [...new Set(ions.map((i) => Math.abs(i.q)))].sort()
  return (
    <>
      {byQ.map((q) => (
        <div key={q} className="ions__row">
          <span className="ions__q">{q === 1 ? 'einfach' : q === 2 ? 'zweifach' : 'dreifach'}</span>
          <div className="ions__chips">
            {ions
              .filter((i) => Math.abs(i.q) === q)
              .map((i) => (
                <IonChip key={i.id} ion={i} on={sel === i.id} onClick={() => onPick(i.id)} />
              ))}
          </div>
        </div>
      ))}
    </>
  )
}

export default function Ionen() {
  const [c, setC] = useState('Ca')
  const [a, setA] = useState('PO4')
  const cat = CATIONS.find((x) => x.id === c)!
  const an = ANIONS.find((x) => x.id === a)!
  const salt = useMemo(() => combine(cat, an), [cat, an])
  const M = useMemo(() => molarMass(parseFormula(salt.formula)), [salt])
  const key = `${c}-${a}`

  return (
    <div className="page chem-tool">
      <header className="page-head">
        <div>
          <p className="eyebrow">Chemie · Werkzeug</p>
          <h1>Ionen & Salzformeln</h1>
          <p>Kation und Anion wählen – Formel, Name und molare Masse ergeben sich aus dem Ladungsausgleich.</p>
        </div>
      </header>

      <section className="salt card" key={key}>
        <div className="salt__ions">
          <div className="salt__ion salt__ion--c">
            <Formula f={cat.f} charge={chargeText(cat.q)} />
            <span>{cat.name}-Ion</span>
          </div>
          <svg className="salt__cross" viewBox="0 0 120 60" aria-hidden="true">
            <path d="M18 12 C 50 12, 70 48, 102 48" className="salt__arrow" />
            <path d="M102 12 C 70 12, 50 48, 18 48" className="salt__arrow salt__arrow--2" />
          </svg>
          <div className="salt__ion salt__ion--a">
            <Formula f={an.f} charge={chargeText(an.q)} />
            <span>{an.name.charAt(0).toUpperCase() + an.name.slice(1)}-Ion</span>
          </div>
        </div>
        <div className="salt__eq">
          {salt.nc} · (+{cat.q}) + {salt.na} · (−{Math.abs(an.q)}) = 0
        </div>
        <div className="salt__result">
          <strong>
            <Formula f={salt.formula} />
          </strong>
          <span className="salt__name">{salt.name}</span>
          <Link to={`/chemie/molmasse?formel=${encodeURIComponent(salt.formula)}`} className="salt__mass">
            M = {M.toLocaleString('de-DE', { maximumFractionDigits: 2 })} g/mol <IconArrowRight size={14} />
          </Link>
        </div>
        <p className="salt__hint">Die Ladungszahl des einen Ions wird zur Anzahl des anderen (Überkreuzregel), danach kürzen. Mehratomige Ionen kommen in Klammern.</p>
      </section>

      <div className="ions">
        <section>
          <h2 className="ions__h">Kationen</h2>
          <Group ions={CATIONS} sel={c} onPick={setC} />
        </section>
        <section>
          <h2 className="ions__h">Anionen</h2>
          <Group ions={ANIONS} sel={a} onPick={setA} />
        </section>
      </div>
    </div>
  )
}
