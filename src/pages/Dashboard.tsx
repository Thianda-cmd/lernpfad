import { Suspense, lazy, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ALL_ORGANELLE_IDS } from '../data/organelles'
import { useProgress } from '../store/progress'
import { BIO_TOOLS, CHEM_TOOLS, MATH_TOOLS, type CalcTool } from '../math/tools'
import QuickShell from './QuickShell'
import {
  IconAnimalCell,
  IconArrowRight,
  IconBook,
  IconCompare,
  IconDivide,
  IconFlask,
  IconIons,
  IconPeriodic,
  IconPlantCell,
  IconTube,
  IconWall,
} from '../components/icons'
import '../styles/calc.css'

// Rechenkerne und KaTeX erst nachladen (startet sofort, läuft parallel zur Start-Animation)
const loadQuick = () => import('./QuickCalc')
loadQuick()
const QuickCalc = lazy(loadQuick)

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

type IconT = ComponentType<{ size?: number }>

interface Tile {
  t: string
  d: string
  to: string
  icon: IconT
}

function TileGrid({ items }: { items: Tile[] }) {
  return (
    <div className="dtiles">
      {items.map((x) => (
        <Link key={x.to} to={x.to} className="dtile card card--link">
          <span className="dtile__icon">
            <x.icon size={18} />
          </span>
          <span className="dtile__text">
            <strong>{x.t}</strong>
            <span>{x.d}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const learned = useProgress((s) => Object.keys(s.learned).length)
  const recent = useProgress((s) => s.recent)
  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  const asTile = (t: CalcTool): Tile => ({ t: t.title, d: t.short, to: t.path, icon: t.icon })
  const math: Tile[] = MATH_TOOLS.map(asTile)
  const chemRef: Tile[] = [
    { t: 'Periodensystem', d: 'Alle 118 Elemente, Eigenschaften, Quiz', to: '/chemie/periodensystem', icon: IconPeriodic },
    { t: 'Ionennachweise', d: 'Ablauf, Beobachtung, Gleichung', to: '/chemie/nachweise', icon: IconTube },
    { t: 'Ionen & Salze', d: 'Salzformeln mit Überkreuzregel', to: '/chemie/ionen', icon: IconIons },
  ]
  const chemCalc: Tile[] = [{ t: 'Molare Masse', d: 'Formel eingeben, M und Anteile sehen', to: '/chemie/molmasse', icon: IconFlask }, ...CHEM_TOOLS.map(asTile)]
  const bio: Tile[] = [
    { t: 'Tierzelle', d: '3D-Modell und Schaubild', to: '/biologie/zellbiologie/tierzelle', icon: IconAnimalCell },
    { t: 'Pflanzenzelle', d: '3D-Modell und Schaubild', to: '/biologie/zellbiologie/pflanzenzelle', icon: IconPlantCell },
    { t: 'Zellwand', d: 'Schichten, Bestandteile, Bausteine', to: '/biologie/zellbiologie/lexikon?o=zellwand', icon: IconWall },
    { t: 'Organellen-Lexikon', d: `${ALL_ORGANELLE_IDS.length} Bestandteile · ${learned} gelernt`, to: '/biologie/zellbiologie/lexikon', icon: IconBook },
    { t: 'Vergleich', d: 'Tier- und Pflanzenzelle', to: '/biologie/zellbiologie/vergleich', icon: IconCompare },
    { t: 'Mitose & Meiose', d: 'Zellteilung als Animation', to: '/biologie/zellteilung', icon: IconDivide },
  ]
  const bioCalc: Tile[] = BIO_TOOLS.map(asTile)

  return (
    <div className="page dash">
      <header className="dash__head">
        <h1 className="title">{greeting()}</h1>
        <span className="dash__date">{date}</span>
      </header>

      <Suspense fallback={<QuickShell />}>
        <QuickCalc />
      </Suspense>

      {recent.length > 0 && (
        <nav className="drecent" aria-label="Zuletzt benutzt">
          <span>Zuletzt benutzt</span>
          {recent.slice(0, 5).map((r) => (
            <Link key={r.path} to={r.path} className="drecent__item">
              {r.title}
              <IconArrowRight size={13} />
            </Link>
          ))}
        </nav>
      )}

      <section className="dgroup">
        <div className="section__head">
          <h2>Mathematik</h2>
          <Link to="/mathematik" className="link-arrow">
            Alle Rechner <IconArrowRight size={15} />
          </Link>
        </div>
        <TileGrid items={math} />
      </section>

      <section className="dgroup">
        <div className="section__head">
          <h2>Chemie</h2>
          <Link to="/chemie" className="link-arrow">
            Übersicht <IconArrowRight size={15} />
          </Link>
        </div>
        <TileGrid items={chemRef} />
        <h3 className="dgroup__sub">Rechner</h3>
        <TileGrid items={chemCalc} />
      </section>

      <section className="dgroup">
        <div className="section__head">
          <h2>Biologie</h2>
          <Link to="/biologie" className="link-arrow">
            Übersicht <IconArrowRight size={15} />
          </Link>
        </div>
        <TileGrid items={bio} />
        <h3 className="dgroup__sub">Laborrechner</h3>
        <TileGrid items={bioCalc} />
      </section>
    </div>
  )
}
