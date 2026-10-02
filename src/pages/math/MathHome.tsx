import { Link } from 'react-router-dom'
import { CHEM_CALC, MATH_TOOLS } from '../../math/tools'
import { Tex } from '../../math/tex'
import { IconArrowRight } from '../../components/icons'
import '../../styles/calc.css'

export default function MathHome() {
  return (
    <div className="page calc-home">
      <header className="page-head">
        <div>
          <p className="eyebrow">Fächer · Mathematik</p>
          <h1>Mathe-Rechner</h1>
          <p>Aufgabe eintippen, Lösung bekommen – mit vollständigem Rechenweg, Zeile für Zeile erklärt.</p>
        </div>
      </header>

      <div className="calcgrid">
        {MATH_TOOLS.map((t) => (
          <Link key={t.id} to={t.path} className="calctile card card--link">
            <span className="calctile__top">
              <span className="calctile__icon">
                <t.icon size={18} />
              </span>
              <span className="calctile__sig" aria-hidden="true">
                <Tex>{t.sig}</Tex>
              </span>
            </span>
            <h3>{t.title}</h3>
            <p>{t.short}</p>
            <span className="link-arrow calctile__cta">
              Öffnen <IconArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>

      <section className="section">
        <div className="section__head">
          <h2>Chemisches Rechnen</h2>
        </div>
        <Link to={CHEM_CALC.path} className="calcwide card card--link">
          <span className="calctile__icon">
            <CHEM_CALC.icon size={18} />
          </span>
          <span className="calcwide__text">
            <strong>{CHEM_CALC.title}</strong>
            <span>{CHEM_CALC.short}</span>
          </span>
          <span className="calctile__sig" aria-hidden="true">
            <Tex>{CHEM_CALC.sig}</Tex>
          </span>
          <IconArrowRight size={16} className="calcwide__arrow" />
        </Link>
      </section>
    </div>
  )
}
