import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../lib/theme'
import { useProgress } from '../store/progress'
import { ALL_ORGANELLE_IDS } from '../data/organelles'
import { Logo } from './Logo'
import { ErrorBoundary } from './ErrorBoundary'
import SidebarAccount, { TopbarAccount } from './BlobAccount'
import { CHEM_CALC, MATH_TOOLS } from '../math/tools'
import {
  IconFlask,
  IconIons,
  IconTube,
  IconDivide,
  IconPeriodic,
  IconAnimalCell,
  IconBook,
  IconChevronRight,
  IconClose,
  IconCompare,
  IconMenu,
  IconMoon,
  IconOverview,
  IconPlantCell,
  IconSettings,
  IconSidebar,
  IconSun,
} from './icons'

const CRUMB_LABELS: Record<string, string> = {
  ...Object.fromEntries(MATH_TOOLS.map((t) => [t.id, t.title])),
  rechnen: CHEM_CALC.title,
  periodensystem: 'Periodensystem',
  molmasse: 'Molare Masse',
  ionen: 'Ionen & Salze',
  nachweise: 'Ionennachweise',
  zellteilung: 'Zellteilung',
  biologie: 'Biologie',
  chemie: 'Chemie',
  mathematik: 'Mathematik',
  zellbiologie: 'Zellbiologie',
  tierzelle: 'Tierzelle',
  pflanzenzelle: 'Pflanzenzelle',
  vergleich: 'Vergleich',
  lexikon: 'Organellen-Lexikon',
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
        const to = '/' + parts.slice(0, i + 1).join('/')
        const label = CRUMB_LABELS[p] ?? p
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

/** Abschnittsüberschrift, die zur Fachübersicht führt */
function NavSection({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} end className={({ isActive }) => `nav__section nav__section--link ${isActive ? 'is-active' : ''}`}>
      {label}
      <IconChevronRight size={13} />
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
  const total = ALL_ORGANELLE_IDS.length

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

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
          <Link to="/" className="brand" aria-label="Lernpfad – Übersicht">
            <span className="brand__mark">
              <Logo size={22} accent="#d2b57f" />
            </span>
            <span className="brand__text">
              <div className="brand__name">
                Lern<em>pfad</em>
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
          <NavSection to="/mathematik" label="Mathematik" />
          {MATH_TOOLS.map((t) => (
            <NavItem key={t.id} to={t.path} icon={<t.icon />} label={t.nav} />
          ))}
          <NavSection to="/chemie" label="Chemie" />
          <NavItem to="/chemie/periodensystem" icon={<IconPeriodic />} label="Periodensystem" />
          <NavItem to="/chemie/molmasse" icon={<IconFlask />} label="Molare Masse" />
          <NavItem to={CHEM_CALC.path} icon={<CHEM_CALC.icon />} label={CHEM_CALC.nav} />
          <NavItem to="/chemie/ionen" icon={<IconIons />} label="Ionen & Salze" />
          <NavItem to="/chemie/nachweise" icon={<IconTube />} label="Ionennachweise" />
          <NavSection to="/biologie" label="Biologie" />
          <NavItem to="/biologie/zellbiologie/tierzelle" icon={<IconAnimalCell />} label="Tierzelle" />
          <NavItem to="/biologie/zellbiologie/pflanzenzelle" icon={<IconPlantCell />} label="Pflanzenzelle" />
          <NavItem to="/biologie/zellbiologie/vergleich" icon={<IconCompare />} label="Vergleich" />
          <NavItem to="/biologie/zellbiologie/lexikon" icon={<IconBook />} label="Lexikon" />
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
          <SidebarAccount collapsed={collapsed} />
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
          <TopbarAccount />
        </header>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
