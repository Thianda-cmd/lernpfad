import { IconArrowRight, IconCalc } from '../components/icons'

export const QUICK_EX = ['2x + 3 = 16 - (2x - 3)', 'x^2 - 4x + 3 = 0', '(2a + 3)^2', '3/4 + 5/6', 'c = n/V', 'H2SO4', 'Fe + O2 -> Fe2O3', '2x + 3y = 12; 4x - y = 10']

export function QuickHead() {
  return (
    <div className="quick__head">
      <span className="quick__icon">
        <IconCalc size={18} />
      </span>
      <div>
        <h2>Schnellrechner</h2>
        <p>Aufgabe eintippen – der passende Rechner wird erkannt. Enter öffnet den kompletten Lösungsweg.</p>
      </div>
    </div>
  )
}

/** Platzhalter, solange die Rechenkerne laden – sieht aus wie der fertige Schnellrechner */
export default function QuickShell() {
  return (
    <section className="quick card" aria-label="Schnellrechner" aria-busy="true">
      <QuickHead />
      <div className="quick__form">
        <input className="quick__input" placeholder="z. B. 2x + 3 = 7  ·  (a + b)^2  ·  3/4 + 5/6  ·  H2SO4" disabled aria-label="Aufgabe eingeben" />
        <button type="button" className="btn btn--primary quick__go" disabled>
          Lösungsweg <IconArrowRight size={16} />
        </button>
      </div>
      <div className="quick__ex">
        {QUICK_EX.map((x) => (
          <span key={x} className="calc__chip">
            {x}
          </span>
        ))}
      </div>
    </section>
  )
}
