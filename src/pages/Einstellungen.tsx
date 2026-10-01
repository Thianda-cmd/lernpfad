import { useState } from 'react'
import { IconMoon, IconRestart, IconSun } from '../components/icons'
import { useTheme, type ThemePref } from '../lib/theme'
import { useProgress } from '../store/progress'
import { useViewer } from '../cell3d/viewerStore'
import { introEnabled, setIntroEnabled } from '../intro/Intro'

export default function Einstellungen() {
  const theme = useTheme()
  const reset = useProgress((s) => s.reset)
  const hq = useViewer((s) => s.hq)
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [intro, setIntro] = useState(introEnabled)
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <header className="page-head">
        <div>
          <h1>Einstellungen</h1>
          <p>Alle Daten bleiben lokal in deinem Browser.</p>
        </div>
      </header>

      <section className="settings card">
        <div className="settings__row">
          <div>
            <h3>Farbschema</h3>
            <p className="muted">Hell, dunkel oder wie das Gerät.</p>
          </div>
          <div className="seg">
            {(
              [
                ['system', 'Automatisch', null],
                ['light', 'Hell', IconSun],
                ['dark', 'Dunkel', IconMoon],
              ] as [ThemePref, string, typeof IconSun | null][]
            ).map(([k, l, Icon]) => (
              <button key={k} className={`seg__btn ${theme.pref === k ? 'is-active' : ''}`} onClick={() => theme.setPref(k)}>
                {Icon && <Icon size={15} />} {l}
              </button>
            ))}
          </div>
        </div>
        <div className="settings__row">
          <div>
            <h3>3D-Qualität</h3>
            <p className="muted">Auf älteren Laptops auf Standard stellen.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={hq} onChange={(e) => useViewer.setState({ hq: e.target.checked })} />
            <span className="switch__track" />
            {hq ? 'Hoch' : 'Standard'}
          </label>
        </div>
        <div className="settings__row">
          <div>
            <h3>Start-Animation</h3>
            <p className="muted">Beim Öffnen der Seite. Klick oder Taste überspringt sie.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={intro}
              onChange={(e) => {
                setIntroEnabled(e.target.checked)
                setIntro(e.target.checked)
              }}
            />
            <span className="switch__track" />
            {intro ? 'An' : 'Aus'}
          </label>
        </div>
        <div className="settings__row">
          <div>
            <h3>Lernfortschritt zurücksetzen</h3>
            <p className="muted">Löscht alle Ergebnisse in Biologie und Mathe.</p>
          </div>
          {confirm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--sm" onClick={() => setConfirm(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn--sm"
                style={{ color: 'var(--sand-2)', borderColor: 'var(--sand)' }}
                onClick={() => {
                  reset()
                  setConfirm(false)
                  setDone(true)
                }}
              >
                Ja, zurücksetzen
              </button>
            </div>
          ) : (
            <button className="btn btn--sm" onClick={() => setConfirm(true)}>
              <IconRestart size={15} /> {done ? 'Zurückgesetzt' : 'Zurücksetzen'}
            </button>
          )}
        </div>
      </section>

      <p className="faint settings__foot">
        LernLabor · BTA Bückeburg · Zellmodelle schematisch · Elementdaten: IUPAC, NIST, PubChem
      </p>
    </div>
  )
}
