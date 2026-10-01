import { Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { CELL_META, ORGANELLES, type CellType, type OrganelleId } from '../data/organelles'
import { useViewer } from '../cell3d/viewerStore'
import { focusOrganelle } from '../cell3d/interaction'
import { OrganellePanel } from '../components/OrganellePanel'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ZoomPan } from '../components/ZoomPan'
import { useTheme } from '../lib/theme'
import { useProgress } from '../store/progress'
import AnimalCell2D from '../cell2d/AnimalCell2D'
import PlantCell2D from '../cell2d/PlantCell2D'
import {
  IconArrowRight,
  IconClose,
  IconCollapse,
  IconCube,
  IconCut,
  IconDiagram,
  IconExpand,
  IconLabels,
  IconNetwork,
  IconOrbit,
  IconQuality,
  IconRestart,
} from '../components/icons'

const CellScene = lazy(() => import('../cell3d/CellScene'))

type Mode = '3d' | '2d'

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function ToolButton({ on, onClick, tip, children }: { on?: boolean; onClick: () => void; tip: string; children: ReactNode }) {
  return (
    <button className={`icon-btn tip ${on ? 'is-on' : ''}`} data-tip={tip} aria-label={tip} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [full, setFull] = useState(false)
  useEffect(() => {
    const h = () => setFull(document.fullscreenElement === ref.current)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [ref])
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else ref.current?.requestFullscreen?.()
  }
  return { full, toggle }
}

/** Name des Organells unter dem Mauszeiger – folgt dem Zeiger innerhalb der Bühne. */
function HoverTip({ stageRef }: { stageRef: RefObject<HTMLElement | null> }) {
  const hovered = useViewer((s) => s.hovered)
  const selected = useViewer((s) => s.selected)
  const ref = useRef<HTMLDivElement>(null)
  const [inside, setInside] = useState(false)
  useEffect(() => {
    const st = stageRef.current
    if (!st) return
    const move = (e: PointerEvent) => {
      const r = st.getBoundingClientRect()
      const x = Math.min(e.clientX - r.left + 14, r.width - 180)
      if (ref.current) ref.current.style.transform = `translate(${x}px, ${e.clientY - r.top + 18}px)`
    }
    const enter = () => setInside(true)
    const leave = () => setInside(false)
    st.addEventListener('pointermove', move)
    st.addEventListener('pointerenter', enter)
    st.addEventListener('pointerleave', leave)
    return () => {
      st.removeEventListener('pointermove', move)
      st.removeEventListener('pointerenter', enter)
      st.removeEventListener('pointerleave', leave)
    }
  }, [stageRef])
  const o = hovered ? ORGANELLES[hovered] : null
  const show = inside && o && hovered !== selected
  return (
    <div ref={ref} className={`hovertip ${show ? 'is-on' : ''}`} aria-hidden="true">
      {o && (
        <>
          <i style={{ background: o.farbe }} />
          {o.name}
          <span>Klicken für Details</span>
        </>
      )}
    </div>
  )
}

export default function CellViewer({ cell }: { cell: CellType }) {
  const meta = CELL_META[cell]
  const other: CellType = cell === 'tier' ? 'pflanze' : 'tier'
  const theme = useTheme()
  const webgl = useRef(hasWebGL()).current
  const [mode, setMode] = useState<Mode>(() => {
    if (!webgl) return '2d'
    try {
      return (localStorage.getItem('lernlabor-viewmode') as Mode) || '3d'
    } catch {
      return '3d'
    }
  })
  const [labels2d, setLabels2d] = useState(true)
  const [ready3d, setReady3d] = useState(false)
  const onReady = useCallback(() => setReady3d(true), [])
  useEffect(() => setReady3d(false), [cell, mode])
  const stageRef = useRef<HTMLElement>(null)
  const { full, toggle: toggleFull } = useFullscreen(stageRef)

  const selected = useViewer((s) => s.selected)
  const hovered = useViewer((s) => s.hovered)
  const labels = useViewer((s) => s.labels)
  const cut = useViewer((s) => s.cut)
  const autoRotate = useViewer((s) => s.autoRotate)
  const cytoskeleton = useViewer((s) => s.cytoskeleton)
  const hq = useViewer((s) => s.hq)
  const { toggle, resetView } = useViewer.getState()
  const markViewed = useProgress((s) => s.markViewed)
  const setLastVisit = useProgress((s) => s.setLastVisit)

  useEffect(() => {
    useViewer.setState({ selected: null, hovered: null, focus: null, autoRotate: true, cut: true, labels: window.innerWidth > 700 })
    setLastVisit({ path: meta.pfad, title: meta.name })
  }, [cell, meta.pfad, meta.name, setLastVisit])

  useEffect(() => {
    try {
      localStorage.setItem('lernlabor-viewmode', mode)
    } catch {
      /* ignorieren */
    }
  }, [mode])

  useEffect(() => {
    if (selected) markViewed(selected)
  }, [selected, markViewed])

  useEffect(() => {
    if (selected && !ORGANELLES[selected].vorkommen[cell]) useViewer.setState({ selected: null })
  }, [cell, selected])

  // Esc hebt die Auswahl auf
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useViewer.getState().selected) {
        useViewer.getState().select(null)
        if (mode === '3d') useViewer.getState().resetView()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  const select = (id: OrganelleId) => {
    if (mode === '3d') focusOrganelle(id)
    else useViewer.getState().select(id)
  }
  const back = () => {
    useViewer.getState().select(null)
    if (mode === '3d') resetView()
  }
  const setHover = (id: OrganelleId | null) => useViewer.setState({ hovered: id })

  const Diagram = cell === 'tier' ? AnimalCell2D : PlantCell2D
  const sel = selected ? ORGANELLES[selected] : null

  return (
    <div className="page page--wide viewer-page">
      <header className="viewer-head">
        <div>
          <h1 className="title">{meta.titel}</h1>
          <p>{meta.untertitel}</p>
        </div>
        <div className="viewer-head__actions">
          <div className="seg" role="tablist" aria-label="Ansicht">
            <button className={`seg__btn ${mode === '3d' ? 'is-active' : ''}`} onClick={() => setMode('3d')} disabled={!webgl} role="tab" aria-selected={mode === '3d'}>
              <IconCube size={16} /> 3D-Modell
            </button>
            <button className={`seg__btn ${mode === '2d' ? 'is-active' : ''}`} onClick={() => setMode('2d')} role="tab" aria-selected={mode === '2d'}>
              <IconDiagram size={16} /> Schaubild
            </button>
          </div>
          <Link to={CELL_META[other].pfad} className="btn btn--ghost">
            {CELL_META[other].name} <IconArrowRight size={16} />
          </Link>
        </div>
      </header>

      <div className="viewer">
        <section ref={stageRef} className={`stage ${mode === '2d' ? 'stage--2d' : ''}`} aria-label={`${meta.name} – ${mode === '3d' ? '3D-Modell' : 'Schaubild'}`}>
          {mode === '3d' ? (
            <Suspense
              fallback={
                <div className="stage__loader">
                  <div className="spinner" />
                  3D-Modell wird aufgebaut …
                </div>
              }
            >
              <ErrorBoundary
                fallback={(reset) => (
                  <div className="stage__loader">
                    <strong style={{ color: 'var(--text)' }}>Die 3D-Ansicht konnte nicht geladen werden.</strong>
                    <span style={{ fontSize: 14 }}>Möglicherweise unterstützt dein Browser oder deine Grafikkarte WebGL nicht vollständig.</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn--primary btn--sm" onClick={() => setMode('2d')}>
                        Zum Schaubild
                      </button>
                      <button className="btn btn--sm" onClick={reset}>
                        Erneut versuchen
                      </button>
                    </div>
                  </div>
                )}
              >
                <CellScene cell={cell} dark={theme.dark} onReady={onReady} />
              </ErrorBoundary>
              {!ready3d && (
                <div className="stage__loader stage__loader--overlay">
                  <div className="spinner" />
                  3D-Modell wird aufgebaut …
                </div>
              )}
            </Suspense>
          ) : (
            <ZoomPan className="stage__diagram">
              <Diagram
                selected={selected}
                hovered={hovered}
                onHover={setHover}
                onSelect={(id) => useViewer.getState().select(id)}
                showLabels={labels2d}
              />
            </ZoomPan>
          )}

          <div className="stage__toolbar">
            {mode === '3d' ? (
              <>
                <ToolButton on={labels} onClick={() => toggle('labels')} tip="Beschriftungen">
                  <IconLabels />
                </ToolButton>
                <ToolButton on={cut} onClick={() => toggle('cut')} tip={cut ? 'Zelle schließen' : 'Zelle aufschneiden'}>
                  <IconCut />
                </ToolButton>
                <ToolButton on={autoRotate} onClick={() => toggle('autoRotate')} tip="Automatisch schwenken">
                  <IconOrbit />
                </ToolButton>
                <ToolButton on={cytoskeleton} onClick={() => toggle('cytoskeleton')} tip="Cytoskelett">
                  <IconNetwork />
                </ToolButton>
                <span className="stage__sep" />
                <ToolButton on={hq} onClick={() => toggle('hq')} tip={hq ? 'Hohe Qualität: an' : 'Hohe Qualität: aus'}>
                  <IconQuality />
                </ToolButton>
                <ToolButton onClick={() => resetView()} tip="Ansicht zurücksetzen">
                  <IconRestart />
                </ToolButton>
              </>
            ) : (
              <>
                <ToolButton on={labels2d} onClick={() => setLabels2d((l) => !l)} tip="Beschriftungen">
                  <IconLabels />
                </ToolButton>
              </>
            )}
            <ToolButton onClick={toggleFull} tip={full ? 'Vollbild beenden' : 'Vollbild'}>
              {full ? <IconCollapse /> : <IconExpand />}
            </ToolButton>
          </div>

          <HoverTip stageRef={stageRef} />

          {sel ? (
            <div className="stage__selected" style={{ '--c': sel.farbe } as CSSProperties}>
              <i />
              <span>{sel.name}</span>
              <button className="icon-btn" onClick={back} aria-label="Auswahl aufheben" title="Auswahl aufheben (Esc)">
                <IconClose size={16} />
              </button>
            </div>
          ) : (
            <p className="stage__hint">
              {mode === '3d' ? 'Ziehen zum Drehen · Scrollen zum Zoomen · Klicken für Details' : 'Mausrad zum Zoomen · Ziehen zum Verschieben · Klicken für Details'}
            </p>
          )}
          <p className="stage__note">Schematisch · nicht maßstabsgetreu</p>
        </section>

        <OrganellePanel cell={cell} selected={selected} hovered={hovered} onSelect={select} onHover={setHover} onBack={back} />
      </div>
    </div>
  )
}
