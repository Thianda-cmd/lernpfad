import { useSyncExternalStore } from 'react'
import { ALL_ORGANELLE_IDS } from '../data/organelles'
import { useProgress } from '../store/progress'
import { blob, BlobAuthError, showSignInNotice, signedOutOnPurpose, signOutOfBlob } from './blob'
import { remoteFrom, syncCycle, type LocalProgress, type RemoteState, type SyncIO } from './sync-merge'

/**
 * Lernfortschritt im Blob-Konto (Schlüssel „progress“), damit er auf jedem Gerät da ist.
 *
 * Offline zuerst: Die Seite liest immer den lokalen Stand (localStorage); ohne Anmeldung ändert
 * sich nichts. Angemeldet wird ~1,5 s nach jeder Änderung hochgeladen, bei der Anmeldung, wenn
 * das Fenster wieder in den Vordergrund kommt und alle paar Minuten der Stand aus Blob geholt und
 * zusammengeführt (auth/sync-merge.ts). Nie zwei Abgleiche gleichzeitig.
 *
 * Geteilte Geräte (Schul-PCs): Der lokale Stand gehört der Person, mit deren Konto er zuletzt
 * abgeglichen wurde (owner im Store). Meldet sich jemand anderes an, wird er nicht in dessen Konto
 * übernommen, sondern durch dessen Stand aus Blob ersetzt. Beim Abmelden wird erst noch
 * gespeichert und der Fortschritt dann vom Gerät genommen (in Blob bleibt er).
 */

const KEY = 'progress'
const DEBOUNCE_MS = 1500
const PULL_EVERY_MS = 3 * 60_000
const FOCUS_GAP_MS = 15_000
const RETRY_MAX_MS = 5 * 60_000

export type SyncPhase =
  /** nicht angemeldet */
  | 'off'
  /** holt den Stand aus Blob (nach der Anmeldung, „Jetzt abgleichen“) */
  | 'loading'
  /** Änderung wartet oder wird hochgeladen */
  | 'saving'
  | 'saved'
  | 'offline'
  | 'error'
  /** das Blob-Konto erlaubt Lernpfad (noch) nicht, etwas zu speichern */
  | 'denied'
  /** eine neuere Lernpfad-Version hat gespeichert: nur lesen, Seite neu laden */
  | 'newer'

export interface SyncStatus {
  phase: SyncPhase
  /** letzter erfolgreicher Abgleich (ms) */
  at: number | null
}

let status: SyncStatus = { phase: 'off', at: null }
const listeners = new Set<() => void>()

function setStatus(phase: SyncPhase, at: number | null = status.at) {
  if (phase === status.phase && at === status.at) return
  status = { phase, at }
  listeners.forEach((l) => l())
}

/** Der Stand des Abgleichs für Kontomenü und Einstellungen */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => status,
  )
}

/* ---------- Ein- und Ausgabe ---------- */

const KNOWN = new Set<string>(ALL_ORGANELLE_IDS)
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/** Ändert gerade der Abgleich selbst den Store? Dann nicht wieder hochladen. */
let applying = false

function localProgress(): LocalProgress {
  const s = useProgress.getState()
  return { learned: s.learned, learnedAt: s.learnedAt, viewed: s.viewed, recent: s.recent, resetAt: s.resetAt }
}

function io(sub: string): SyncIO {
  return {
    local: localProgress,
    apply: (next) => {
      if (blob.user?.sub !== sub) return // inzwischen abgemeldet oder jemand anderes
      applying = true
      try {
        useProgress.setState(next as Partial<ReturnType<typeof useProgress.getState>>)
      } finally {
        applying = false
      }
    },
    fetch: async () => {
      const item = await blob.data.get(KEY)
      return item ? remoteFrom(item.value, item.version, Date.now()) : remoteFrom(null, 0)
    },
    put: async (doc, version) => {
      if (status.phase !== 'loading') setStatus('saving')
      try {
        const res = await blob.data.put(KEY, doc, { version })
        return { version: res.version }
      } catch (e) {
        if (e instanceof BlobAuthError && e.code === 'conflict') return { conflict: remoteFrom(e.current?.value, e.current?.version, Date.now()) }
        throw e
      }
    },
    known: (id) => KNOWN.has(id),
    now: () => Date.now(),
  }
}

/* ---------- Ablauf ---------- */

let remote: RemoteState | null = null
let remoteSub: string | null = null
/** der laufende Abgleich (mit allem, was währenddessen angefragt wurde) */
let running: Promise<void> | null = null
/** noch ein Lauf nötig? (true = vorher aus Blob holen) */
let again: boolean | null = null
let debounce: ReturnType<typeof setTimeout> | null = null
let retry: ReturnType<typeof setTimeout> | undefined
let failures = 0
let lastTry = 0

function retryLater() {
  clearTimeout(retry)
  const delay = Math.min(15_000 * 2 ** failures, RETRY_MAX_MS)
  failures++
  retry = setTimeout(() => void run(true), delay)
}

async function cycle(pull: boolean) {
  const sub = blob.user?.sub
  if (!sub) {
    setStatus('off', null)
    return
  }
  if (remoteSub !== sub) {
    remote = null
    remoteSub = sub
  }
  if (isOffline()) {
    setStatus('offline')
    return
  }
  if (pull || !remote) lastTry = Date.now()
  try {
    const res = await syncCycle(io(sub), pull ? null : remote)
    if (blob.user?.sub !== sub) return
    remote = res.remote
    if (res.status === 'conflict') {
      setStatus('error')
      retryLater()
      return
    }
    failures = 0
    clearTimeout(retry)
    setStatus(res.status === 'newer' ? 'newer' : 'saved', Date.now())
  } catch (e) {
    if (blob.user?.sub !== sub) return
    const code = e instanceof BlobAuthError ? e.code : ''
    if (code === 'signed_out') setStatus('off', null)
    else if (code === 'insufficient_scope') setStatus('denied')
    else if (code === 'network_error' || isOffline()) {
      setStatus('offline')
      retryLater()
    } else {
      if (!(e instanceof BlobAuthError)) console.error(e)
      setStatus('error')
      retryLater()
    }
  }
}

/** Ein Abgleich nach dem anderen; was währenddessen angefragt wird, läuft danach. */
function run(pull: boolean): Promise<void> {
  if (running) {
    again = (again ?? false) || pull
    return running
  }
  running = (async () => {
    try {
      let next: boolean | null = pull
      while (next !== null) {
        again = null
        await cycle(next)
        next = again
      }
    } finally {
      running = null
    }
  })()
  return running
}

/** Ändert den Store, ohne dass das als neue Änderung hochgeladen wird. */
function quietly(fn: () => void) {
  applying = true
  try {
    fn()
  } finally {
    applying = false
  }
}

function flush() {
  if (debounce === null) return
  clearTimeout(debounce)
  debounce = null
  void run(false)
}

/**
 * Abmelden (Kontomenü, Einstellungen): Wartendes noch speichern (höchstens ein paar Sekunden),
 * dann bei Lernpfad abmelden und den Fortschritt vom Gerät nehmen, wenn er sicher in Blob liegt.
 * Liegt er dort nicht (offline, Speichern nicht erlaubt …), bleibt er auf dem Gerät, gehört aber
 * weiter dieser Person: Er landet nie im Konto von jemand anderem.
 */
export async function signOut() {
  const sub = blob.user?.sub
  if (!sub) return
  flush()
  if (running) await Promise.race([running, new Promise((r) => setTimeout(r, 5000))])
  const safe = status.phase === 'saved' && debounce === null && !running && useProgress.getState().owner === sub
  // Die Anmeldung ist sofort weg (das Zurückziehen des Tokens bei Blob läuft danach noch)
  const out = signOutOfBlob()
  if (safe && !blob.user) quietly(() => useProgress.getState().forget(null))
  await out
}

/** Jetzt abgleichen (Einstellungen, „Nochmal versuchen“). */
export function syncNow() {
  if (!blob.user) return
  if (debounce !== null) clearTimeout(debounce)
  debounce = null
  setStatus(isOffline() ? 'offline' : 'loading')
  void run(true)
}

/* ---------- Start ---------- */

let started = false

/** Einmal beim Start aufrufen (main.tsx). */
export function startProgressSync() {
  if (started) return
  started = true

  // Lokale Änderungen: kurz warten, dann hochladen
  useProgress.subscribe((s, prev) => {
    if (applying || !blob.user) return
    if (s.learned === prev.learned && s.learnedAt === prev.learnedAt && s.viewed === prev.viewed && s.recent === prev.recent && s.resetAt === prev.resetAt) return
    if (isOffline()) {
      setStatus('offline')
      return
    }
    if (status.phase !== 'loading' && status.phase !== 'denied' && status.phase !== 'newer') setStatus('saving')
    if (debounce !== null) clearTimeout(debounce)
    debounce = setTimeout(() => {
      debounce = null
      void run(false)
    }, DEBOUNCE_MS)
  })

  // Ein anderer Tab hat den Fortschritt geändert (der gleicht selbst ab): nur übernehmen
  const rehydrate = () => {
    applying = true
    Promise.resolve(useProgress.persist.rehydrate()).finally(() => {
      applying = false
    })
  }
  window.addEventListener('storage', (e) => {
    if (e.key === useProgress.persist.getOptions().name) rehydrate()
  })

  // An- und Abmelden (auch in einem anderen Tab)
  let sub: string | null = null
  blob.onChange((user) => {
    const next = user?.sub ?? null
    if (next === sub) {
      // Neue Tokens für dieselbe Person (z. B. nach „Speichern erlauben“): ein neuer Versuch lohnt sich
      if (next && (status.phase === 'denied' || status.phase === 'error')) void run(true)
      return
    }
    const prev = sub
    sub = next
    remote = null
    failures = 0
    clearTimeout(retry)
    if (debounce !== null) clearTimeout(debounce)
    debounce = null
    if (!next) {
      setStatus('off', null)
      // Nicht selbst abgemeldet: Blob hat die Anmeldung beendet (Zugriff entfernt, abgelaufen)
      if (prev && !signedOutOnPurpose()) showSignInNotice('Zugriff in Blob entfernt oder abgelaufen. Melde dich erneut an, damit dein Fortschritt gespeichert wird.')
      return
    }
    // Wem gehört der Fortschritt auf diesem Gerät? (erst den neuesten Stand lesen, ein anderer Tab
    // hat vielleicht gerade schon abgeglichen)
    rehydrate()
    const owner = useProgress.getState().owner
    if (owner !== next) {
      quietly(() => {
        // von jemand anderem: nicht in dieses Konto übernehmen, der Stand kommt gleich aus Blob
        if (owner) useProgress.getState().forget(next)
        // ohne Anmeldung entstanden: gehört ab jetzt dieser Person und wird zusammengeführt
        else useProgress.setState({ owner: next })
      })
    }
    setStatus(isOffline() ? 'offline' : 'loading', null)
    void run(true)
  })

  const pullIfStale = (gap: number) => {
    if (blob.user && document.visibilityState === 'visible' && Date.now() - lastTry >= gap) void run(true)
  }
  window.addEventListener('focus', () => pullIfStale(FOCUS_GAP_MS))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullIfStale(FOCUS_GAP_MS)
    else flush() // Tab wird verlassen: Wartendes gleich speichern
  })
  window.addEventListener('pagehide', flush)
  window.addEventListener('online', () => blob.user && void run(true))
  window.addEventListener('offline', () => blob.user && setStatus('offline'))
  setInterval(() => pullIfStale(PULL_EVERY_MS), 30_000)
}
