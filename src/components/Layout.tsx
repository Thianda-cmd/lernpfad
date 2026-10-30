import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../lib/theme'
import { useProgress } from '../store/progress'
import { ALL_ORGANELLE_IDS } from '../data/organelles'
import { Logo } from './Logo'
import { ErrorBoundary } from './ErrorBoundary'
import { ALL_TOOLS, BIO_TOOLS, CHEM_TOOLS, MATH_TOOLS, type Subject } from '../math/tools'
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
  ...Object.fromEntries(ALL_TOOLS.map((t) => [t.id, t.title])),
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
const CLOSED_KEY = 'lernpfad-nav-zu'

interface NavEntry {
  to: string
  icon: ComponentType<{ size?: number }>
  label: string
}
interface NavSec {
  id: Subject
  label: string
  to: string
  groups: { sub?: string; items: NavEntry[] }[]
}

const tools = (list: typeof ALL_TOOLS): NavEntry[] => list.map((t) => ({ to: t.path, icon: t.icon, label: t.nav }))

const SECTIONS: NavSec[] = [
  { id: 'mathematik', label: 'Mathematik', to: '/mathematik', groups: [{ items: tools(MATH_TOOLS) }] },
  {
    id: 'chemie',
    label: 'Chemie',
    to: '/chemie',
    groups: [
      {
        items: [
          { to: '/chemie/periodensystem', icon: IconPeriodic, label: 'Periodensystem' },
          { to: '/chemie/nachweise', icon: IconTube, label: 'Ionennachweise' },
          { to: '/chemie/ionen', icon: IconIons, label: 'Ionen & Salze' },
        ],
      },
      { sub: 'Rechner', items: [{ to: '/chemie/molmasse', icon: IconFlask, label: 'Molare Masse' }, ...tools(CHEM_TOOLS)] },
    ],
  },
  {
    id: 'biologie',
    label: 'Biologie',
    to: '/biologie',
    groups: [
      {
        items: [
          { to: '/biologie/zellbiologie/tierzelle', icon: IconAnimalCell, label: 'Tierzelle' },
          { to: '/biologie/zellbiologie/pflanzenzelle', icon: IconPlantCell, label: 'Pflanzenzelle' },
          { to: '/biologie/zellbiologie/vergleich', icon: IconCompare, label: 'Vergleich' },
          { to: '/biologie/zellbiologie/lexikon', icon: IconBook, label: 'Lexikon' },
          { to: '/biologie/zellteilung', icon: IconDivide, label: 'Mitose & Meiose' },
        ],
      },
      { sub: 'Laborrechner', items: tools(BIO_TOOLS) },
    ],
  },
]

function readClosed(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

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

/** Abschnittsüberschrift: Name führt zur Fachübersicht, Pfeil klappt ein und aus */
function NavSection({ to, label, open, onToggle }: { to: string; label: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="nav__section-row">
      <NavLink to={to} end className={({ isActive }) => `nav__section nav__section--link ${isActive ? 'is-active' : ''}`}>
        {label}
        <IconChevronRight size={13} />
      </NavLink>
      <button type="button" className={`nav__toggle ${open ? 'is-open' : ''}`} onClick={onToggle} aria-expanded={open} aria-label={`${label} ${open ? 'einklappen' : 'ausklappen'}`}>
        <IconChevronRight size={14} />
      </button>
    </div>
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
  const [closed, setClosed] = useState<string[]>(readClosed)
  const toggleSection = (id: string) =>
    setClosed((c) => {
      const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
      try {
        localStorage.setItem(CLOSED_KEY, JSON.stringify(next))
      } catch {
        /* ignorieren */
      }
      return next
    })
  const theme = useTheme()
  const learned = useProgress((s) => Object.keys(s.learned).length)
  const total = ALL_ORGANELLE_IDS.length

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
    // eingeklappten Abschnitt öffnen, wenn man hineinnavigiert
    const sec = SECTIONS.find((x) => pathname === x.to || pathname.startsWith(x.to + '/'))
    if (sec) setClosed((c) => (c.includes(sec.id) ? c.filter((x) => x !== sec.id) : c))
    // aktiven Eintrag in der (langen) Seitenleiste sichtbar machen
    const t = window.setTimeout(() => document.querySelector('.nav .nav__link.active')?.scrollIntoView({ block: 'nearest' }), 80)
    return () => window.clearTimeout(t)
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
          {SECTIONS.map((sec) => {
            const open = !closed.includes(sec.id)
            return (
              <div key={sec.id} className="nav__group">
                <NavSection to={sec.to} label={sec.label} open={open} onToggle={() => toggleSection(sec.id)} />
                <div className={`nav__items ${open ? '' : 'is-closed'}`}>
                  {sec.groups.map((g, gi) => (
                    <div key={gi} className="nav__grp">
                      {g.sub && <span className="nav__sub">{g.sub}</span>}
                      {g.items.map((it) => (
                        <NavItem key={it.to} to={it.to} icon={<it.icon />} label={it.label} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
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
