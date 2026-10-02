import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { BLOB_URL, dismissSignInError, displayName, firstName, realName, signInWithBlob, useBlobUser, useSignIn, type BlobUser } from '../auth/blob'
import { signOut, syncNow, useSyncStatus, type SyncPhase, type SyncStatus } from '../auth/sync'
import { IconAlert, IconClose, IconCloudCheck, IconCloudOff, IconCloudUp, IconExternal, IconLogout, IconSettings, IconSync, IconUpDown } from './icons'
import '../styles/konto.css'

/**
 * Blob, das Maskottchen von Blob (blob.bojes.org). onPurple: für den lila Anmelde-Knopf etwas
 * heller und mit hellem Rand, damit es sich vom Knopf abhebt.
 */
export function BlobMark({ size = 20, onPurple = false }: { size?: number; onPurple?: boolean }) {
  const id = `blob-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const body = 'M16 4.5c6.6 0 11.3 4.9 11.6 11.4.2 5-2.6 9.1-6.8 10.4-3 .9-6.6.9-9.6 0C7 25 4.2 20.9 4.4 15.9 4.7 9.4 9.4 4.5 16 4.5Z'
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="blob-mark">
      <defs>
        <radialGradient id={id} cx="36%" cy="28%" r="80%">
          <stop offset="0%" stopColor={onPurple ? '#e4dbff' : '#b9a2ff'} />
          <stop offset="45%" stopColor={onPurple ? '#9f80ff' : '#6d3df5'} />
          <stop offset="100%" stopColor={onPurple ? '#6a3ef0' : '#5326d6'} />
        </radialGradient>
      </defs>
      <path d={body} fill={`url(#${id})`} />
      {onPurple && <path d={body} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.1" />}
      <ellipse cx="11.2" cy="10.4" rx="3" ry="1.5" transform="rotate(-28 11.2 10.4)" fill="#fff" opacity=".8" />
      <ellipse cx="12.6" cy="16.8" rx="1.35" ry="1.75" fill="#1d1030" />
      <ellipse cx="19.4" cy="16.8" rx="1.35" ry="1.75" fill="#1d1030" />
      <path d="M14.3 20.3q1.7 1.4 3.4 0" stroke="#1d1030" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/* ---------- Abgleich-Stand ---------- */

type Tone = 'ok' | 'busy' | 'warn' | 'off'

const PHASES: Record<SyncPhase, { tone: Tone; short: string; text: string; hint?: string; Icon: ComponentType<{ size?: number }> }> = {
  off: { tone: 'off', short: '', text: '', Icon: IconCloudOff },
  loading: { tone: 'busy', short: 'Wird abgeglichen …', text: 'Wird abgeglichen …', Icon: IconSync },
  saving: { tone: 'busy', short: 'Wird gespeichert …', text: 'Wird gespeichert …', Icon: IconCloudUp },
  saved: { tone: 'ok', short: 'In Blob gespeichert', text: 'In Blob gespeichert', Icon: IconCloudCheck },
  offline: { tone: 'off', short: 'Offline', text: 'Offline, wird später gespeichert', hint: 'Auf diesem Gerät ist alles da.', Icon: IconCloudOff },
  error: { tone: 'warn', short: 'Nicht gespeichert', text: 'Speichern hat nicht geklappt', hint: 'Auf diesem Gerät ist alles da. Gleich gibt es einen neuen Versuch.', Icon: IconAlert },
  denied: { tone: 'warn', short: 'Speichern erlauben', text: 'Speichern in Blob ist noch nicht erlaubt', hint: 'Einmal erlauben, dann ist dein Fortschritt auf jedem Gerät da.', Icon: IconAlert },
  newer: { tone: 'warn', short: 'Seite neu laden', text: 'Lernpfad wurde aktualisiert', hint: 'Lade die Seite neu, dann wird wieder gespeichert.', Icon: IconAlert },
}

const clock = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

function whenSaved(s: SyncStatus) {
  if (s.phase !== 'saved' || !s.at) return null
  return Date.now() - s.at < 60_000 ? 'Gerade eben abgeglichen' : `Zuletzt abgeglichen um ${clock.format(s.at)}`
}

/** Was gerade mit dem Fortschritt in Blob passiert, mit passender Aktion. */
export function SyncState({ actions = true, retry = true }: { actions?: boolean; retry?: boolean }) {
  const s = useSyncStatus()
  const p = PHASES[s.phase]
  if (s.phase === 'off') return null
  const sub = p.hint ?? whenSaved(s)
  return (
    <div className={`sync sync--${p.tone}`}>
      <span className="sync__icon">
        <p.Icon size={17} />
      </span>
      <div className="sync__text" role="status" aria-live="polite">
        <strong>{p.text}</strong>
        {sub && <span>{sub}</span>}
        {actions && s.phase === 'denied' && (
          <button type="button" className="btn btn--sm sync__action" onClick={() => void signInWithBlob({ prompt: 'consent' }).then((ok) => ok && syncNow())}>
            Speichern erlauben
          </button>
        )}
        {actions && retry && (s.phase === 'error' || s.phase === 'offline') && (
          <button type="button" className="btn btn--sm sync__action" onClick={syncNow}>
            <IconSync size={14} /> Nochmal versuchen
          </button>
        )}
        {actions && s.phase === 'newer' && (
          <button type="button" className="btn btn--sm sync__action" onClick={() => location.reload()}>
            Seite neu laden
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- Person ---------- */

export function Avatar({ user, size = 32, dot = false }: { user: BlobUser; size?: number; dot?: boolean }) {
  const [broken, setBroken] = useState(false)
  const { phase } = useSyncStatus()
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {user.picture && !broken ? (
        <img src={user.picture} alt="" width={size} height={size} onError={() => setBroken(true)} referrerPolicy="no-referrer" />
      ) : (
        <span className="avatar__initial" style={{ fontSize: Math.round(size * 0.42) }} aria-hidden="true">
          {(firstName(user) || user.email || '?')[0].toUpperCase()}
        </span>
      )}
      {dot && phase !== 'off' && <span className={`avatar__dot avatar__dot--${PHASES[phase].tone}`} aria-hidden="true" />}
    </span>
  )
}

/** Für Bildschirmleser: wessen Konto, und ob etwas zu tun ist (der farbige Punkt ist nur zu sehen) */
const accountLabel = (user: BlobUser, phase: SyncPhase) => `Blob-Konto von ${displayName(user)}${PHASES[phase].short ? `, ${PHASES[phase].short}` : ''}`

/** Fehler oder Hinweis zur Anmeldung, zum Wegklicken: unter dem Knopf, oben auf dem Handy, neben der eingeklappten Leiste, in den Einstellungen. */
export function SignInNote({ text, variant }: { text: string; variant: 'inline' | 'toast' | 'rail' | 'card' }) {
  return (
    <div className={`konto__note konto__note--${variant}`}>
      <p role="alert">{text}</p>
      <button type="button" className="konto__note-close" onClick={dismissSignInError} aria-label="Hinweis schließen" title="Schließen">
        <IconClose size={14} />
      </button>
    </div>
  )
}

/* ---------- Anmelden ---------- */

/**
 * Der „Mit Blob anmelden“-Knopf: in Blobs Lila mit dem Maskottchen, damit man ihn wiedererkennt.
 * compact: nur das Maskottchen. narrow: auf sehr schmalen Bildschirmen (≤ 480 px) nur das Maskottchen.
 * short: kürzere Beschriftung, wenn es eng wird (Seitenleiste auf niedrigen Bildschirmen, konto.css).
 */
export function BlobSignInButton({ size = 'md', compact = false, narrow = false, label = 'Mit Blob anmelden', short }: { size?: 'sm' | 'md' | 'lg'; compact?: boolean; narrow?: boolean; label?: string; short?: string }) {
  const { waiting } = useSignIn()
  const text = waiting ? 'Warte auf Blob …' : label
  const name = waiting ? text : 'Mit Blob anmelden'
  return (
    <button
      type="button"
      className={`blob-btn blob-btn--${size} ${compact ? 'blob-btn--compact' : ''} ${narrow ? 'blob-btn--narrow' : ''} ${waiting ? 'is-waiting' : ''}`}
      onClick={() => void signInWithBlob()}
      aria-busy={waiting}
      aria-label={compact ? text : narrow || short ? name : undefined}
      data-label={compact ? text : undefined}
      title={compact ? undefined : 'Mit deinem Blob-Konto anmelden. Dann ist dein Fortschritt auf jedem Gerät da.'}
    >
      <BlobMark size={size === 'lg' ? 22 : size === 'sm' ? 18 : 20} onPurple />
      {!compact && <span className="blob-btn__label">{text}</span>}
      {!compact && short && <span className="blob-btn__label blob-btn__label--short">{waiting ? 'Warte …' : short}</span>}
    </button>
  )
}

/* ---------- Kontomenü ---------- */

type Placement = 'top' | 'right' | 'bottom'

/** Was sich mit Tab erreichen lässt */
const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Das nächste Element nach `from`, das Tab erreicht (außerhalb von `skip`) */
function nextTabbable(from: HTMLElement | null, skip: HTMLElement | null): HTMLElement | null {
  if (!from) return null
  const all = [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.tabIndex >= 0 && !skip?.contains(el) && el.getClientRects().length > 0)
  const i = all.indexOf(from)
  return i >= 0 ? (all[i + 1] ?? null) : null
}

/**
 * Das Kontomenü. Es hängt am Ende der Seite (damit es über allem liegt); für die Tastatur verhält
 * es sich aber, als stünde es direkt nach seinem Knopf: Beim Öffnen springt der Fokus hinein, Tab
 * vom Knopf führt hinein, Tab nach dem letzten Eintrag weiter zum nächsten Element der Seite,
 * Umschalt+Tab vom ersten zurück zum Knopf. Geht der Fokus woandershin, schließt es sich.
 */
function AccountMenu({ user, anchor, placement, onClose }: { user: BlobUser; anchor: RefObject<HTMLElement | null>; placement: Placement; onClose: (refocus: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  /** null = noch nicht platziert (unsichtbar) */
  const [style, setStyle] = useState<CSSProperties | null>(null)
  const placed = style !== null

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (!r) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (placement === 'top') setStyle({ left: Math.max(8, r.left), width: Math.min(Math.max(r.width, 268), vw - 16), bottom: vh - r.top + 8 })
      else if (placement === 'right') setStyle({ left: r.right + 10, width: 272, bottom: Math.max(8, vh - r.bottom) })
      else setStyle({ top: r.bottom + 8, right: Math.max(8, vw - r.right), width: Math.min(296, vw - 16) })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchor, placement])

  // Fokus erst hinein, wenn das Menü sichtbar ist (solange es unsichtbar ist, nimmt es keinen an)
  useEffect(() => {
    if (placed) ref.current?.querySelector<HTMLElement>('.konto-pop__list a, .konto-pop__list button')?.focus({ preventScroll: true })
  }, [placed])

  useEffect(() => {
    const inside = (t: EventTarget | null) => t instanceof Node && (!!ref.current?.contains(t) || !!anchor.current?.contains(t))
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target)) onClose(false)
    }
    const onFocus = (e: FocusEvent) => {
      if (!inside(e.target)) onClose(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(true)
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll<HTMLElement>(TABBABLE)]
      const active = document.activeElement
      if (!items.length) return
      if (active === anchor.current && !e.shiftKey) {
        e.preventDefault()
        items[0].focus()
      } else if (active === items[0] && e.shiftKey) {
        e.preventDefault()
        anchor.current?.focus()
      } else if (active === items[items.length - 1] && !e.shiftKey) {
        e.preventDefault()
        const after = nextTabbable(anchor.current, ref.current)
        if (after) after.focus()
        else onClose(true)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  return createPortal(
    <div ref={ref} className={`konto-pop konto-pop--${placement}`} style={style ?? { visibility: 'hidden' }} role="dialog" aria-label="Blob-Konto" tabIndex={-1}>
      <div className="konto-pop__head">
        <Avatar user={user} size={38} />
        <div className="konto-pop__who">
          <strong>{displayName(user)}</strong>
          {realName(user) && user.email && <span>{user.email}</span>}
        </div>
      </div>
      <div className="konto-pop__sync">
        <SyncState />
      </div>
      <nav className="konto-pop__list" aria-label="Konto">
        <a href={`${BLOB_URL}/settings`} target="_blank" rel="noreferrer" onClick={() => onClose(false)}>
          <IconExternal size={16} /> Blob-Konto öffnen
        </a>
        <Link to="/einstellungen" onClick={() => onClose(false)}>
          <IconSettings size={16} /> Einstellungen
        </Link>
        <button
          type="button"
          onClick={() => {
            onClose(false)
            void signOut()
          }}
          title="Dein Fortschritt bleibt in deinem Blob-Konto und wird von diesem Gerät entfernt. Bei Blob selbst bleibst du angemeldet."
        >
          <IconLogout size={16} /> Abmelden
        </button>
      </nav>
      <div className="konto-pop__foot">
        <BlobMark size={14} /> Angemeldet mit Blob
      </div>
    </div>,
    document.body,
  )
}

/** Avatar-Knopf, der das Kontomenü öffnet (Seitenleiste oder Kopfzeile). */
function useMenu() {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const [path, setPath] = useState(pathname)
  if (path !== pathname) {
    setPath(pathname)
    setOpen(false)
  }
  const close = useRef((refocus: boolean) => {
    setOpen(false)
    if (refocus) anchor.current?.focus()
  }).current
  return { open, setOpen, anchor, close }
}

/** Konto unten in der Seitenleiste: „Mit Blob anmelden“ oder die angemeldete Person mit Speicherstand. */
export default function SidebarAccount({ collapsed }: { collapsed: boolean }) {
  const user = useBlobUser()
  const { error } = useSignIn()
  const { phase } = useSyncStatus()
  const { open, setOpen, anchor, close } = useMenu()

  if (!user) {
    return (
      <div className="konto">
        <BlobSignInButton compact={collapsed} short="Anmelden" />
        {error && <SignInNote text={error} variant={collapsed ? 'rail' : 'inline'} />}
      </div>
    )
  }

  const p = PHASES[phase]
  return (
    <div className="konto">
      <button
        ref={anchor}
        type="button"
        className={`konto__me ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={accountLabel(user, phase)}
        data-label={collapsed ? displayName(user) : undefined}
      >
        <Avatar user={user} size={32} dot />
        <span className="konto__who">
          <strong>{displayName(user)}</strong>
          <span className={`konto__state konto__state--${p.tone}`}>{p.short || (realName(user) && user.email) || 'Angemeldet mit Blob'}</span>
        </span>
        <IconUpDown size={15} className="konto__chev" />
      </button>
      {open && <AccountMenu user={user} anchor={anchor} placement={collapsed ? 'right' : 'top'} onClose={close} />}
    </div>
  )
}

/** Konto rechts in der Kopfzeile, nur auf schmalen Bildschirmen (dort ist die Seitenleiste eingeklappt). */
export function TopbarAccount() {
  const user = useBlobUser()
  const { error } = useSignIn()
  const { phase } = useSyncStatus()
  const { open, setOpen, anchor, close } = useMenu()
  return (
    <div className="topbar__konto">
      {user ? (
        <button
          ref={anchor}
          type="button"
          className={`konto__avatar-btn ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={accountLabel(user, phase)}
        >
          <Avatar user={user} size={30} dot />
        </button>
      ) : (
        <BlobSignInButton size="sm" label="Anmelden" narrow />
      )}
      {user && open && <AccountMenu user={user} anchor={anchor} placement="bottom" onClose={close} />}
      {error && !user && <SignInNote text={error} variant="toast" />}
    </div>
  )
}
