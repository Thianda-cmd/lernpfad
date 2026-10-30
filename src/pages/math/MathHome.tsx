import { Link } from 'react-router-dom'
import { MATH_TOOLS } from '../../math/tools'
import ToolGrid from '../../components/ToolGrid'
import { IconArrowRight, IconChemistry, IconBiology } from '../../components/icons'
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

      <ToolGrid items={MATH_TOOLS} />

      <section className="section">
        <div className="section__head">
          <h2>Rechnen im Labor</h2>
        </div>
        <div className="grid grid--2">
          <Link to="/chemie#rechner" className="calcwide card card--link">
            <span className="calctile__icon">
              <IconChemistry size={18} />
            </span>
            <span className="calcwide__text">
              <strong>Chemie-Rechner</strong>
              <span>Stoffmenge, Konzentrationen, pH-Wert, Titration, Gase, Reaktionsgleichungen, Photometrie</span>
            </span>
            <IconArrowRight size={16} className="calcwide__arrow" />
          </Link>
          <Link to="/biologie#laborrechner" className="calcwide card card--link">
            <span className="calctile__icon">
              <IconBiology size={18} />
            </span>
            <span className="calcwide__text">
              <strong>Laborrechner Biologie</strong>
              <span>Zellzahl, Keimzahl & Wachstum, Verdünnungsreihe, Mikroskopie, Zentrifuge, DNA, PCR-Ansatz</span>
            </span>
            <IconArrowRight size={16} className="calcwide__arrow" />
          </Link>
        </div>
      </section>
    </div>
  )
}
