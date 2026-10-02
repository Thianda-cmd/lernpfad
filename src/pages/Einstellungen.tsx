import { useState } from 'react'
import { IconMoon, IconRestart, IconSun, IconSync } from '../components/icons'
import { Avatar, BlobSignInButton, SignInNote, SyncState } from '../components/BlobAccount'
import { BLOB_URL, displayName, realName, useBlobUser, useSignIn } from '../auth/blob'
import { signOut, syncNow, useSyncStatus } from '../auth/sync'
import { useTheme, type ThemePref } from '../lib/theme'
import { useProgress } from '../store/progress'
import { useViewer } from '../cell3d/viewerStore'
import { introEnabled, setIntroEnabled } from '../intro/Intro'

/** Konto: mit Blob anmelden, damit der Fortschritt auf jedem Gerät da ist. */
function Konto() {
  const user = useBlobUser()
  const { error } = useSignIn()
  const { phase } = useSyncStatus()

  if (!user) {
    return (
      <section className="settings card konto-card" aria-label="Konto">
        <div className="settings__row">
          <div>
            <h3>Fortschritt auf jedem Gerät</h3>
            <p className="muted">
              Melde dich mit deinem Blob-Konto an, dann werden gelernte Organellen und „Zuletzt benutzt“ in deinem Konto gespeichert. Neu bei Blob? Im Anmeldefenster kannst du dir ein Konto erstellen.
            </p>
            {error && <SignInNote text={error} variant="card" />}
          </div>
          <BlobSignInButton size="lg" />
        </div>
      </section>
    )
  }

  return (
    <section className="settings card konto-card" aria-label="Konto">
      <div className="settings__row">
        <div className="konto-me">
          <Avatar user={user} size={44} />
          <div className="konto-me__who">
            <strong>{displayName(user)}</strong>
            {realName(user) && user.email && <span>{user.email}</span>}
            <span>Angemeldet mit Blob</span>
          </div>
        </div>
        <button className="btn btn--sm" onClick={() => void signOut()}>
          Abmelden
        </button>
      </div>
      <div className="settings__row">
        <div>
          <h3>Fortschritt in Blob</h3>
          <p className="muted">
            Gelernte Organellen und „Zuletzt benutzt“ werden jetzt in deinem Blob-Konto gespeichert und sind auf jedem Gerät da, auf dem du angemeldet bist. Beim Abmelden wird der Fortschritt von diesem Gerät entfernt, in Blob bleibt er. Bei{' '}
            <a className="konto-link" href={BLOB_URL} target="_blank" rel="noreferrer">
              Blob
            </a>{' '}
            selbst bleibst du angemeldet.
          </p>
          <SyncState retry={false} />
        </div>
        {/* Speichern nicht erlaubt oder neuere Version: Die passende Aktion steht schon beim Stand */}
        {phase !== 'denied' && phase !== 'newer' && (
          <button className="btn btn--sm" onClick={syncNow} disabled={phase === 'loading' || phase === 'saving'}>
            <IconSync size={15} /> Jetzt abgleichen
          </button>
        )}
      </div>
    </section>
  )
}

export default function Einstellungen() {
  const theme = useTheme()
  const reset = useProgress((s) => s.reset)
  const hq = useViewer((s) => s.hq)
  const user = useBlobUser()
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [intro, setIntro] = useState(introEnabled)
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <header className="page-head">
        <div>
          <h1>Einstellungen</h1>
          <p>{user ? 'Dein Fortschritt wird in deinem Blob-Konto gespeichert. Alles andere bleibt auf diesem Gerät.' : 'Ohne Anmeldung bleiben alle Daten in deinem Browser.'}</p>
        </div>
      </header>

      <Konto />

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
            <h3>Verlauf zurücksetzen</h3>
            <p className="muted">
              Löscht die als gelernt markierten Organellen und die Liste „Zuletzt benutzt“{user ? ', auch in deinem Blob-Konto und auf deinen anderen Geräten' : ''}.
            </p>
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
        Lernpfad · BTA Bückeburg · Zellmodelle schematisch · Elementdaten: IUPAC, NIST, PubChem
      </p>
    </div>
  )
}
