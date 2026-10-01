import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../lib/theme'
import { useProgress } from '../store/progress'
import { ALL_ORGANELLE_IDS } from '../data/organelles'
import { Logo } from './Logo'
import { ErrorBoundary } from './ErrorBoundary'
import { CHAPTERS, MOCKS, SHEETS } from '../math/meta'
import {
  IconChapters,
  IconFlask,
  IconIons,
  IconTube,
  IconDivide,
  IconPeriodic,
  IconExam,
  IconFormula,
  IconSheet,
  IconAnimalCell,
  IconBiology,
  IconBook,
  IconCards,
  IconChemistry,
  IconChevronRight,
  IconClose,
  IconCompare,
  IconMath,
  IconMenu,
  IconMoon,
  IconOverview,
  IconPlantCell,
  IconQuiz,
  IconSettings,
  IconSidebar,
  IconSun,
} from './icons'

const CRUMB_LABELS: Record<string, string> = {
  ...Object.fromEntries(MOCKS.map((m) => [m.id, m.title])),
  ...Object.fromEntries(SHEETS.map((s) => [s.id, s.title])),
  ...Object.fromEntries(CHAPTERS.map((c) => [c.id, c.title])),
  periodensystem: 'Periodensystem',
  molmasse: 'Molare Masse',
  ionen: 'Ionen & Salze',
  nachweise: 'Ionennachweise',
  zellteilung: 'Zellteilung',
  blatt: 'Übungsblatt',
  probeklausur: 'Probeklausur',
  formelsammlung: 'Formelsammlung',
  biologie: 'Biologie',
  chemie: 'Chemie',
  mathematik: 'Mathematik',
  zellbiologie: 'Zellbiologie',
  tierzelle: 'Tierzelle',
  pflanzenzelle: 'Pflanzenzelle',
  vergleich: 'Vergleich',
  lexikon: 'Organellen-Lexikon',
  karteikarten: 'Karteikarten',
  quiz: 'Quiz',
  einstellungen: 'Einstellungen',
}

const COLLAPSE_KEY = 'lernlabor-sidebar'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = () => setMatches(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return matches
}

function Crumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  if (!parts.length)
    return (
      <nav className="crumbs" aria-label="Brotkrumen">
        <span className="crumbs__current">Übersicht</span>
      </nav>
    )
  return (
    <nav className="crumbs" aria-label="Brotkrumen">
      <Link to="/">Übersicht</Link>
      {parts.map((p, i) => {
        // Zwischenebenen ohne eigene Seite führen zur Fachübersicht
        const to = p === 'blatt' || p === 'probeklausur' ? '/' + parts.slice(0, i).join('/') : '/' + parts.slice(0, i + 1).join('/')
        const label = parts[i - 1] === 'blatt' ? (SHEETS.find((s) => s.id === p)?.title ?? p) : (CRUMB_LABELS[p] ?? p)
        const last = i === parts.length - 1
        return (
          <span key={to} style={{ display: 'contents' }}>
            <IconChevronRight size={14} />
            {last ? <span className="crumbs__current">{label}</span> : <Link to={to}>{label}</Link>}
          </span>
        )
      })}
    </nav>
  )
}

function NavItem({ to, icon, label, badge, end, match }: { to: string; icon: ReactNode; label: string; badge?: string; end?: boolean; match?: RegExp }) {
  const { pathname } = useLocation()
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav__link ${(match ? match.test(pathname) : isActive) ? 'active' : ''}`}
      data-label={label}
      aria-label={label}
    >
      {icon}
      <span className="nav__label">{label}</span>
      {badge && <span className="nav__badge">{badge}</span>}
    </NavLink>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [collapsedPref, setCollapsedPref] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const mobile = useMediaQuery('(max-width: 960px)')
  const { pathname } = useLocation()
  // Vollbild-Seiten: Seitenleiste standardmäßig eingeklappt, lässt sich aber aufklappen
  const fullscreen = pathname === '/chemie/periodensystem'
  const [fsExpanded, setFsExpanded] = useState(false)
  const collapsed = !mobile && (fullscreen ? !fsExpanded : collapsedPref)
  const theme = useTheme()
  const learned = useProgress((s) => Object.keys(s.learned).length)
  const touchDay = useProgress((s) => s.touchDay)
  const total = ALL_ORGANELLE_IDS.length

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    touchDay()
  }, [touchDay])

  const toggleCollapsed = () => {
    if (fullscreen) {
      setFsExpanded((x) => !x)
      return
    }
    setCollapsedPref((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* ignorieren */
      }
      return !c
    })
  }

  return (
    <div className={`app ${open ? 'nav-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Hauptnavigation">
        <div className="sidebar__top">
          <Link to="/" className="brand" aria-label="LernLabor – Übersicht">
            <span className="brand__mark">
              <Logo size={22} accent="#d2b57f" />
            </span>
            <span className="brand__text">
              <div className="brand__name">
                Lern<em>Labor</em>
              </div>
              <div className="brand__sub">BTA · Bückeburg</div>
            </span>
          </Link>
          <button
            className="icon-btn sidebar__collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
            title={collapsed ? 'Ausklappen' : 'Einklappen'}
          >
            <IconSidebar />
          </button>
        </div>
        <nav className="nav">
          <NavItem to="/" end icon={<IconOverview />} label="Übersicht" />
          <div className="nav__section">Fächer</div>
          <NavItem to="/biologie" icon={<IconBiology />} label="Biologie" />
          <NavItem to="/chemie" icon={<IconChemistry />} label="Chemie" />
          <NavItem to="/mathematik" icon={<IconMath />} label="Mathematik" />
          <div className="nav__section">Chemie</div>
          <NavItem to="/chemie/periodensystem" icon={<IconPeriodic />} label="Periodensystem" />
          <NavItem to="/chemie/molmasse" icon={<IconFlask />} label="Molare Masse" />
          <NavItem to="/chemie/ionen" icon={<IconIons />} label="Ionen & Salze" />
          <NavItem to="/chemie/nachweise" icon={<IconTube />} label="Ionennachweise" />
          <div className="nav__section">Mathematik</div>
          <NavItem to="/mathematik/klammern" match={/^\/mathematik\/(?!blatt|probeklausur|formelsammlung)[^/]+$/} icon={<IconChapters />} label="Kapitel" />
          <NavItem to="/mathematik/blatt/klammern" match={/^\/mathematik\/blatt\//} icon={<IconSheet />} label="Übungsblätter" />
          <NavItem to="/mathematik/probeklausur/lf1t" match={/^\/mathematik\/probeklausur\//} icon={<IconExam />} label="Probeklausur" />
          <NavItem to="/mathematik/formelsammlung" icon={<IconFormula />} label="Formelsammlung" />
          <div className="nav__section">Zellbiologie</div>
          <NavItem to="/biologie/zellbiologie/tierzelle" icon={<IconAnimalCell />} label="Tierzelle" />
          <NavItem to="/biologie/zellbiologie/pflanzenzelle" icon={<IconPlantCell />} label="Pflanzenzelle" />
          <NavItem to="/biologie/zellbiologie/vergleich" icon={<IconCompare />} label="Vergleich" />
          <NavItem to="/biologie/zellbiologie/lexikon" icon={<IconBook />} label="Lexikon" />
          <NavItem to="/biologie/zellbiologie/karteikarten" icon={<IconCards />} label="Karteikarten" />
          <NavItem to="/biologie/zellbiologie/quiz" icon={<IconQuiz />} label="Quiz" />
          <div className="nav__section">Zellteilung</div>
          <NavItem to="/biologie/zellteilung" icon={<IconDivide />} label="Mitose & Meiose" />
        </nav>
        <div className="sidebar__footer">
          <div className="mini-progress">
            <div className="mini-progress__top">
              <span>Organellen gelernt</span>
              <strong>
                {learned}/{total}
              </strong>
            </div>
            <div className="progress">
              <div className="progress__bar" style={{ width: `${(learned / total) * 100}%` }} />
            </div>
          </div>
          <div className="sidebar__actions">
            <button className="icon-btn" onClick={theme.toggle} aria-label="Farbschema wechseln" title={theme.dark ? 'Helles Design' : 'Dunkles Design'}>
              {theme.dark ? <IconSun /> : <IconMoon />}
            </button>
            <NavLink to="/einstellungen" className="icon-btn" aria-label="Einstellungen" title="Einstellungen">
              <IconSettings />
            </NavLink>
          </div>
        </div>
      </aside>
      <div className="backdrop" onClick={() => setOpen(false)} />
      <div className="app__main">
        <header className="topbar">
          <button className="icon-btn topbar__menu" onClick={() => setOpen((o) => !o)} aria-label="Menü öffnen">
            {open ? <IconClose /> : <IconMenu />}
          </button>
          <Crumbs />
          <div className="topbar__spacer" />
        </header>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
