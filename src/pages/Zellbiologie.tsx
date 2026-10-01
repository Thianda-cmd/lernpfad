import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import AnimalCell2D from '../cell2d/AnimalCell2D'
import PlantCell2D from '../cell2d/PlantCell2D'
import { CELL_ORGANELLES, type OrganelleId } from '../data/organelles'
import { P } from '../data/palette'
import { useProgress } from '../store/progress'
import { IconArrowRight } from '../components/icons'
import { TOOLS } from '../data/tools'

interface ScaleItem {
  name: string
  meters: number
  text: string
  color: string
}

const SCALE: ScaleItem[] = [
  { name: 'Zellmembran (Dicke)', meters: 7.5e-9, text: 'ca. 7–10 nm', color: P.membran.base },
  { name: 'Ribosom', meters: 2.5e-8, text: 'ca. 25–30 nm', color: P.ribo.base },
  { name: 'Grippevirus', meters: 1e-7, text: 'ca. 100 nm', color: P.skelett.base },
  { name: 'Bakterium (E. coli)', meters: 2e-6, text: 'ca. 2 µm lang', color: P.ser.base },
  { name: 'Mitochondrium', meters: 3e-6, text: 'ca. 1–10 µm lang', color: P.mito.base },
  { name: 'Chloroplast', meters: 6e-6, text: 'ca. 3–10 µm', color: P.chloro.base },
  { name: 'Rotes Blutkörperchen', meters: 7.5e-6, text: 'ca. 7,5 µm', color: P.zentro.base },
  { name: 'Tierzelle', meters: 2e-5, text: 'meist 10–30 µm', color: P.membran.dark },
  { name: 'Pflanzenzelle', meters: 5e-5, text: 'meist 10–100 µm', color: P.wand.dark },
  { name: 'Menschliche Eizelle', meters: 1.2e-4, text: 'ca. 0,1–0,12 mm', color: P.golgi.base },
]

const MIN = -9
const MAX = -3
const pos = (m: number) => ((Math.log10(m) - MIN) / (MAX - MIN)) * 100

function SizeScale() {
  const [active, setActive] = useState(7)
  const a = SCALE[active]
  return (
    <div className="scale card card--pad">
      <div className="scale__head">
        <div>
          <h3>Größenordnungen</h3>
          <p className="muted">Logarithmische Skala – jeder Abschnitt ist 10-mal größer als der vorherige.</p>
        </div>
        <div className="scale__readout" style={{ '--c': a.color } as CSSProperties}>
          <span className="swatch" />
          <div>
            <strong>{a.name}</strong>
            <span>{a.text}</span>
          </div>
        </div>
      </div>
      <div className="scale__track">
        <div className="scale__band" style={{ left: 0, width: `${pos(2e-7)}%` }}>
          Elektronenmikroskop
        </div>
        <div className="scale__band" style={{ left: `${pos(2e-7)}%`, width: `${pos(1e-4) - pos(2e-7)}%` }}>
          Lichtmikroskop (ab ca. 0,2 µm)
        </div>
        <div className="scale__band" style={{ left: `${pos(1e-4)}%`, width: `${100 - pos(1e-4)}%` }}>
          Auge
        </div>
        {SCALE.map((s, i) => (
          <button
            key={s.name}
            className={`scale__dot ${i === active ? 'is-active' : ''}`}
            style={{ left: `${pos(s.meters)}%`, '--c': s.color } as CSSProperties}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${s.name}: ${s.text}`}
          />
        ))}
      </div>
      <div className="scale__axis">
        {['1 nm', '10 nm', '100 nm', '1 µm', '10 µm', '100 µm', '1 mm'].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <p className="scale__foot faint">1 mm = 1.000 µm · 1 µm = 1.000 nm</p>
    </div>
  )
}

export default function Zellbiologie() {
  const learned = useProgress((s) => s.learned)
  const count = (ids: OrganelleId[]) => ids.filter((i) => learned[i]).length
  const tier = CELL_ORGANELLES.tier
  const pflanze = CELL_ORGANELLES.pflanze
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Zellbiologie</h1>
          <p>Aufbau der eukaryotischen Tier- und Pflanzenzelle.</p>
        </div>
      </header>

      <div className="grid grid--2">
        <Link to="/biologie/zellbiologie/tierzelle" className="cellcard card card--link">
          <div className="cellcard__art">
            <AnimalCell2D compact />
          </div>
          <div className="cellcard__body">
            <h2>Tierzelle</h2>
            <p>Ohne Zellwand, mit Zentrosom und Lysosomen. Der Zellkern liegt meist zentral.</p>
            <div className="cellcard__meta">
              {tier.length} Bestandteile · {count(tier)} gelernt
            </div>
            <span className="link-arrow">
              Öffnen <IconArrowRight size={16} />
            </span>
          </div>
        </Link>
        <Link to="/biologie/zellbiologie/pflanzenzelle" className="cellcard card card--link">
          <div className="cellcard__art">
            <PlantCell2D compact />
          </div>
          <div className="cellcard__body">
            <h2>Pflanzenzelle</h2>
            <p>Mit Zellwand, Zentralvakuole und Chloroplasten. Der Zellkern liegt oft am Rand.</p>
            <div className="cellcard__meta">
              {pflanze.length} Bestandteile · {count(pflanze)} gelernt
            </div>
            <span className="link-arrow">
              Öffnen <IconArrowRight size={16} />
            </span>
          </div>
        </Link>
      </div>

      <div className="toolgrid">
        {TOOLS.map((x) => (
          <Link key={x.to} to={x.to} className="toolgrid__i card card--link">
            <span className="row__icon">
              <x.icon size={18} />
            </span>
            <span className="row__text">
              <strong>{x.t}</strong>
              <span>{x.d}</span>
            </span>
          </Link>
        ))}
      </div>

      <section className="section">
        <div className="section__head">
          <h2>Grundwissen</h2>
        </div>
        <SizeScale />
        <div className="grid grid--3" style={{ marginTop: 16 }}>
          <article className="know card card--pad">
            <h3>Die Zelltheorie</h3>
            <ul className="bullets">
              <li>Alle Lebewesen bestehen aus einer oder mehreren Zellen (Schleiden & Schwann, 1838/39).</li>
              <li>Die Zelle ist die kleinste selbstständig lebensfähige Einheit.</li>
              <li>Zellen entstehen nur aus Zellen – „Omnis cellula e cellula“ (Virchow, 1855).</li>
            </ul>
          </article>
          <article className="know card card--pad">
            <h3>Prokaryoten und Eukaryoten</h3>
            <table className="mini-table">
              <thead>
                <tr>
                  <th />
                  <th>Prokaryoten</th>
                  <th>Eukaryoten</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Beispiele</td>
                  <td>Bakterien, Archaeen</td>
                  <td>Tiere, Pflanzen, Pilze</td>
                </tr>
                <tr>
                  <td>Zellkern</td>
                  <td>nein (Nucleoid)</td>
                  <td>ja</td>
                </tr>
                <tr>
                  <td>Organellen</td>
                  <td>keine mit Membran</td>
                  <td>viele</td>
                </tr>
                <tr>
                  <td>Ribosomen</td>
                  <td>70S</td>
                  <td>80S (Cytoplasma)</td>
                </tr>
                <tr>
                  <td>Größe</td>
                  <td>ca. 1–10 µm</td>
                  <td>ca. 10–100 µm</td>
                </tr>
              </tbody>
            </table>
          </article>
          <article className="know card card--pad">
            <h3>Endosymbiontentheorie</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              Mitochondrien und Chloroplasten stammen von Bakterien ab, die vor langer Zeit von einer Vorläuferzelle aufgenommen wurden. Belege:
            </p>
            <ul className="bullets" style={{ marginTop: 10 }}>
              <li>Doppelmembran</li>
              <li>eigene ringförmige DNA</li>
              <li>eigene 70S-Ribosomen</li>
              <li>Vermehrung durch Teilung</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  )
}
