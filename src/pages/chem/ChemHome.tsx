import { Link } from 'react-router-dom'
import { ELEMENTS, position } from '../../chem/elements'
import { IconArrowRight, IconFlask } from '../../components/icons'
import ToolGrid from '../../components/ToolGrid'
import { CHEM_TOOLS } from '../../math/tools'
import { useHashScroll } from '../../lib/useHashScroll'
import '../../styles/chem.css'

const MOLMASSE = { path: '/chemie/molmasse', title: 'Molare Masse', short: 'Formel eingeben, Anteile sehen, zwischen Masse, Stoffmenge und Teilchenzahl umrechnen.', sig: 'M(\\mathrm{H_2O})', icon: IconFlask }

const CONSTANTS: [string, string, string][] = [
  ['Avogadro-Konstante', 'N_A', '6,022 140 76 · 10²³ mol⁻¹'],
  ['Universelle Gaskonstante', 'R', '8,314 462 618 J/(mol · K)'],
  ['Molares Volumen idealer Gase (0 °C, 1013,25 hPa)', 'V_m', '22,414 L/mol'],
  ['Faraday-Konstante', 'F', '96 485,332 C/mol'],
  ['Elementarladung', 'e', '1,602 176 634 · 10⁻¹⁹ C'],
  ['Atomare Masseneinheit', 'u', '1,660 539 07 · 10⁻²⁷ kg'],
  ['Boltzmann-Konstante', 'k_B', '1,380 649 · 10⁻²³ J/K'],
  ['Ionenprodukt des Wassers (25 °C)', 'K_W', '1,0 · 10⁻¹⁴ mol²/L²'],
  ['Absoluter Nullpunkt', 'T₀', '0 K = −273,15 °C'],
]

function Sym({ s }: { s: string }) {
  const [a, b] = s.split('_')
  return (
    <span className="const__sym">
      <i>{a}</i>
      {b && <sub>{b}</sub>}
    </span>
  )
}

export default function ChemHome() {
  useHashScroll()
  return (
    <div className="page chem-home">
      <header className="page-head">
        <div>
          <p className="eyebrow">Fächer · Chemie</p>
          <h1>Chemie</h1>
          <p>Periodensystem, Rechner und Nachschlagewerk für das Labor.</p>
        </div>
      </header>

      <Link to="/chemie/periodensystem" className="pse-hero card card--link">
        <div className="pse-hero__text">
          <h2>Periodensystem der Elemente</h2>
          <p>Alle 118 Elemente mit Schalenmodell, Orbitalen und Stoffdaten. Mit Eigenschaften in 3D, Aggregatzustand bei jeder Temperatur, Zeitreise der Entdeckungen und Quiz.</p>
          <span className="link-arrow">
            Öffnen <IconArrowRight size={16} />
          </span>
        </div>
        <div className="pse-hero__art" aria-hidden="true">
          {ELEMENTS.map((e) => {
            const p = position(e.z)
            return <span key={e.z} className={`c-${e.cat}`} style={{ gridRow: p.row, gridColumn: p.col, animationDelay: `${(p.col + p.row) * 45}ms` }} />
          })}
        </div>
      </Link>

      <section className="section">
        <div className="section__head">
          <h2>Nachschlagen</h2>
        </div>
        <div className="grid grid--2">
          <Link to="/chemie/nachweise" className="tool card card--link">
            <span className="tool__sig">
              Ba<sup>2+</sup> + SO<sub>4</sub>
              <sup>2−</sup> → BaSO<sub>4</sub>↓
            </span>
            <h3>Ionennachweise</h3>
            <p>Fällungen, Tüpfelplatte, Gaskammer und Flammenfärbung – Schritt für Schritt mit Gleichung.</p>
          </Link>
          <Link to="/chemie/ionen" className="tool card card--link">
            <span className="tool__sig">
              Ca<sup>2+</sup> + PO<sub>4</sub>
              <sup>3−</sup>
            </span>
            <h3>Ionen & Salzformeln</h3>
            <p>Formeln und Namen von Salzen bilden – mit Überkreuzregel.</p>
          </Link>
        </div>
      </section>

      <section className="section" id="rechner">
        <div className="section__head">
          <h2>Rechner</h2>
        </div>
        <ToolGrid items={[MOLMASSE, ...CHEM_TOOLS]} />
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Konstanten</h2>
        </div>
        <div className="consts card">
          {CONSTANTS.map(([n, s, v]) => (
            <div key={s} className="const">
              <Sym s={s} />
              <span className="const__name">{n}</span>
              <span className="const__val">{v}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
