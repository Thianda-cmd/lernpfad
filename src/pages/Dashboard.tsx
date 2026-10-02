import { useDeferredValue, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ALL_ORGANELLE_IDS } from '../data/organelles'
import { useProgress } from '../store/progress'
import { CHEM_CALC, MATH_TOOLS } from '../math/tools'
import { detect } from '../math/quick'
import { CalcError } from '../math/q'
import { Tex } from '../math/tex'
import {
  IconAnimalCell,
  IconArrowRight,
  IconBook,
  IconCalc,
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

const QUICK_EX = ['2x + 3 = 16 - (2x - 3)', 'x^2 - 4x + 3 = 0', '(2a + 3)^2', '3/4 + 5/6', 'c = n/V', 'H2SO4', '2x + 3y = 12; 4x - y = 10']

function QuickCalc() {
  const [v, setV] = useState('')
  const dv = useDeferredValue(v)
  const nav = useNavigate()
  const hit = useMemo(() => detect(dv), [dv])
  const out = useMemo(() => {
    if (!hit) return null
    try {
      const r = hit.run()
      return r ? { tex: r.result } : null
    } catch (e) {
      return { err: e instanceof CalcError ? e.message : 'Noch nicht vollständig.' }
    }
  }, [hit])
  const go = () => {
    if (hit) nav(hit.to)
  }
  return (
    <section className="quick card" aria-label="Schnellrechner">
      <div className="quick__head">
        <span className="quick__icon">
          <IconCalc size={18} />
        </span>
        <div>
          <h2>Schnellrechner</h2>
          <p>Aufgabe eintippen – der passende Rechner wird erkannt. Enter öffnet den kompletten Lösungsweg.</p>
        </div>
      </div>
      <form
        className="quick__form"
        onSubmit={(e) => {
          e.preventDefault()
          go()
        }}
      >
        <input
          className="quick__input"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="z. B. 2x + 3 = 7  ·  (a + b)^2  ·  3/4 + 5/6  ·  H2SO4"
          spellCheck={false}
          autoComplete="off"
          aria-label="Aufgabe eingeben"
        />
        <button type="submit" className="btn btn--primary quick__go" disabled={!hit}>
          Lösungsweg <IconArrowRight size={16} />
        </button>
      </form>
      {hit ? (
        <div className="quick__out" aria-live="polite">
          <span className="quick__tool">
            <hit.icon size={15} />
            {hit.title}
          </span>
          {out && 'tex' in out && out.tex && (
            <span className="quick__res">
              <Tex>{out.tex}</Tex>
            </span>
          )}
          {out && 'err' in out && <span className="quick__err">{out.err}</span>}
        </div>
      ) : (
        <div className="quick__ex">
          {QUICK_EX.map((x) => (
            <button key={x} type="button" className="calc__chip" onClick={() => setV(x)}>
              {x}
            </button>
          ))}
        </div>
      )}
    </section>
  )
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

  const math: Tile[] = MATH_TOOLS.map((t) => ({ t: t.title, d: t.short, to: t.path, icon: t.icon }))
  const chem: Tile[] = [
    { t: 'Periodensystem', d: 'Alle 118 Elemente, Eigenschaften, Quiz', to: '/chemie/periodensystem', icon: IconPeriodic },
    { t: 'Molare Masse', d: 'Formel eingeben, M und Anteile sehen', to: '/chemie/molmasse', icon: IconFlask },
    { t: CHEM_CALC.title, d: 'Lösungen ansetzen, verdünnen, mischen', to: CHEM_CALC.path, icon: CHEM_CALC.icon },
    { t: 'Ionen & Salze', d: 'Salzformeln mit Überkreuzregel', to: '/chemie/ionen', icon: IconIons },
    { t: 'Ionennachweise', d: 'Ablauf, Beobachtung, Gleichung', to: '/chemie/nachweise', icon: IconTube },
  ]
  const bio: Tile[] = [
    { t: 'Tierzelle', d: '3D-Modell und Schaubild', to: '/biologie/zellbiologie/tierzelle', icon: IconAnimalCell },
    { t: 'Pflanzenzelle', d: '3D-Modell und Schaubild', to: '/biologie/zellbiologie/pflanzenzelle', icon: IconPlantCell },
    { t: 'Zellwand', d: 'Schichten, Bestandteile, Bausteine', to: '/biologie/zellbiologie/lexikon?o=zellwand', icon: IconWall },
    { t: 'Organellen-Lexikon', d: `${ALL_ORGANELLE_IDS.length} Bestandteile · ${learned} gelernt`, to: '/biologie/zellbiologie/lexikon', icon: IconBook },
    { t: 'Vergleich', d: 'Tier- und Pflanzenzelle', to: '/biologie/zellbiologie/vergleich', icon: IconCompare },
    { t: 'Mitose & Meiose', d: 'Zellteilung als Animation', to: '/biologie/zellteilung', icon: IconDivide },
  ]

  return (
    <div className="page dash">
      <header className="dash__head">
        <h1 className="title">{greeting()}</h1>
        <span className="dash__date">{date}</span>
      </header>

      <QuickCalc />

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

      <div className="dgroups">
        <section className="dgroup">
          <div className="section__head">
            <h2>Chemie</h2>
            <Link to="/chemie" className="link-arrow">
              Übersicht <IconArrowRight size={15} />
            </Link>
          </div>
          <TileGrid items={chem} />
        </section>
        <section className="dgroup">
          <div className="section__head">
            <h2>Biologie</h2>
            <Link to="/biologie" className="link-arrow">
              Übersicht <IconArrowRight size={15} />
            </Link>
          </div>
          <TileGrid items={bio} />
        </section>
      </div>
    </div>
  )
}
