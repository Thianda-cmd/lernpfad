import { useSyncExternalStore } from 'react'
import { BlobAuth, BlobAuthError, type BlobUser } from './blob-auth.js'

export { BlobAuthError, type BlobUser }

/** Wo Blob läuft (zum lokalen Testen: VITE_BLOB_ISSUER=http://localhost:3000). */
export const BLOB_URL = ((import.meta.env.VITE_BLOB_ISSUER as string | undefined) || 'https://blob.bojes.org').replace(/\/+$/, '')

/** Die öffentliche Client-ID von Lernpfad in Blob (Blob → Admin → Apps). */
const CLIENT_ID = (import.meta.env.VITE_BLOB_CLIENT_ID as string | undefined) || 'lernlabor_a2w6xvvjef'

/**
 * „Mit Blob anmelden“: Blob öffnet sich in einem kleinen Fenster, danach kommt man mit Namen,
 * E-Mail und Profilbild zurück. „data“ erlaubt, den Lernfortschritt im Blob-Konto zu speichern
 * (auth/sync.ts), „offline_access“ hält die Anmeldung über das Schließen der Seite hinaus.
 * Die Rückleitung landet auf public/blob-callback.html (neben der App, auch unter Unterpfaden).
 */
export const blob = new BlobAuth({
  clientId: CLIENT_ID,
  issuer: BLOB_URL,
  redirectUri: new URL('blob-callback.html', document.baseURI).toString(),
  scope: 'openid profile email data offline_access',
  locale: 'de',
})

/* ---------- Abmelden merken ---------- */

/* Wer sich in Lernpfad abmeldet, bleibt bei Blob selbst angemeldet. Damit sich die nächste Person
   am selben Gerät nicht ungefragt mit diesem Konto anmeldet, zeigt Blob danach einmal, mit welchem
   Konto es weitergeht (prompt=select_account, dort auch „anderes Konto“). */
const SIGNED_OUT_KEY = 'lernlabor-blob-abgemeldet'

function signedOutAt(): number {
  try {
    return Number(localStorage.getItem(SIGNED_OUT_KEY)) || 0
  } catch {
    return 0
  }
}

function forgetSignOut() {
  try {
    localStorage.removeItem(SIGNED_OUT_KEY)
  } catch {
    /* ignorieren */
  }
}

/** Hat sich gerade jemand selbst abgemeldet (auch in einem anderen Tab)? Sonst hat Blob die Anmeldung beendet. */
export const signedOutOnPurpose = (withinMs = 30_000) => Date.now() - signedOutAt() < withinMs

/* ---------- angemeldete Person ---------- */

let current: BlobUser | null = blob.user
const userListeners = new Set<() => void>()
blob.onChange((user) => {
  if (user) forgetSignOut()
  // Bei jeder Token-Erneuerung meldet sich das SDK; nur echte Änderungen weitergeben
  if (JSON.stringify(user) === JSON.stringify(current)) return
  current = user
  userListeners.forEach((l) => l())
})

// Anmeldungen, die ohne Fenster zurückkommen (Fenster blockiert, E-Mail-Bestätigung in einem anderen Tab)
void blob.handleRedirect()

/** Die angemeldete Person oder null; aktualisiert sich in allen Tabs. */
export function useBlobUser(): BlobUser | null {
  return useSyncExternalStore(
    (cb) => {
      userListeners.add(cb)
      return () => userListeners.delete(cb)
    },
    () => current,
  )
}

/** Teil der E-Mail vor dem @: Ohne Profilnamen schickt Blob ihn als Namen, das ist kein echter Name. */
const emailName = (user: BlobUser) => user.email?.split('@')[0]?.trim() ?? ''

/** Der Name aus dem Blob-Profil, '' wenn es keinen gibt. */
export function realName(user: BlobUser): string {
  const name = user.name?.trim() ?? ''
  return name && name !== emailName(user) ? name : ''
}

/** Vorname für Begrüßungen, '' ohne echten Namen (dann ohne Namen begrüßen). */
export function firstName(user: BlobUser): string {
  const given = user.given_name?.trim() ?? ''
  if (given && given !== emailName(user)) return given
  return realName(user).split(/\s+/)[0] ?? ''
}

/** Wie die Person im Kontomenü heißt: Name, sonst E-Mail. */
export const displayName = (user: BlobUser) => realName(user) || user.email || 'Blob-Konto'

/* ---------- Anmelden ---------- */

interface SignInState {
  waiting: boolean
  error: string | null
}

let signIn: SignInState = { waiting: false, error: null }
const signInListeners = new Set<() => void>()
let errorTimer: ReturnType<typeof setTimeout> | undefined
/** sticky: bleibt stehen, bis man ihn schließt oder sich anmeldet (sonst 12 s) */
const setSignIn = (next: SignInState, sticky = false) => {
  signIn = next
  signInListeners.forEach((l) => l())
  clearTimeout(errorTimer)
  if (next.error && !sticky) errorTimer = setTimeout(() => setSignIn({ ...signIn, error: null }), 12_000)
}

/** Hinweis bei den Anmelde-Knöpfen, z. B. wenn der Zugriff in Blob entfernt wurde (auth/sync.ts). */
export const showSignInNotice = (text: string) => setSignIn({ ...signIn, error: text }, true)

/** Fehler oder Hinweis schließen */
export const dismissSignInError = () => signIn.error && setSignIn({ ...signIn, error: null })

const UNREACHABLE = 'Blob ist gerade nicht erreichbar. Versuch es gleich noch mal.'

function message(e: unknown): string | null {
  if (e instanceof BlobAuthError) {
    if (e.code === 'popup_closed') return null
    if (e.code === 'access_denied') return 'Anmeldung abgebrochen. Es wurde nichts geteilt.'
    if (e.code === 'unauthorized_client') return 'Die Anmeldung mit Blob ist für Lernpfad gerade ausgeschaltet.'
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Du bist offline. Sobald du wieder online bist, kannst du dich anmelden.'
  // Blob antwortet nicht (Netz weg, DNS, Blob gestört): fetch scheitert mit TypeError
  if (e instanceof TypeError || (e instanceof BlobAuthError && (e.code === 'network_error' || e.code === 'discovery_failed'))) return UNREACHABLE
  return 'Die Anmeldung hat nicht geklappt. Versuch es bitte noch mal.'
}

/** Startet die Anmeldung (oder holt das schon offene Blob-Fenster nach vorn). true, wenn sie geklappt hat. */
export async function signInWithBlob(opts?: { prompt?: 'consent' }): Promise<boolean> {
  setSignIn({ waiting: true, error: null })
  try {
    await blob.signIn({ prompt: opts?.prompt ?? (signedOutAt() ? 'select_account' : undefined) })
    forgetSignOut()
    setSignIn({ waiting: false, error: null })
    return true
  } catch (e) {
    setSignIn({ waiting: false, error: message(e) })
    return false
  }
}

/** Wartet gerade ein Blob-Fenster? Was ging schief? (geteilt von allen Anmelde-Knöpfen) */
export function useSignIn(): SignInState {
  return useSyncExternalStore(
    (cb) => {
      signInListeners.add(cb)
      return () => signInListeners.delete(cb)
    },
    () => signIn,
  )
}

/**
 * Meldet nur bei Lernpfad ab (Blob selbst bleibt angemeldet). Nur für auth/sync.ts: Die Knöpfe
 * nutzen signOut() von dort, das vorher noch speichert und den Fortschritt vom Gerät nimmt.
 */
export async function signOutOfBlob() {
  try {
    localStorage.setItem(SIGNED_OUT_KEY, String(Date.now()))
  } catch {
    /* ignorieren */
  }
  await blob.signOut()
}
