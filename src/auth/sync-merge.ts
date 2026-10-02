/**
 * Lernfortschritt zwischen Geräten abgleichen (über das Blob-Konto, Schlüssel „progress“).
 *
 * Nur reine Funktionen ohne Browser-Abhängigkeiten, damit sie sich testen lassen
 * (tests/sync.smoke.ts). Das Dokument in Blob sieht so aus:
 *
 *   {
 *     schema: 1,
 *     learned: { "mitochondrium": { v: true, t: 1727870000000 }, "golgi": { v: false, t: … } },
 *     viewed:  { "mitochondrium": 4 },
 *     recent:  [{ path: "/mathematik/terme", title: "Terme vereinfachen", t: … }],
 *     resetAt: 0,
 *     updatedAt: 1727870000000
 *   }
 *
 * learned: v = gelernt ja/nein, t = Zeitpunkt der letzten Änderung (ms). Auch „nicht mehr gelernt“
 * bleibt als Eintrag stehen, damit sich das Abwählen auf die anderen Geräte überträgt. Beim
 * Zusammenführen gewinnt je Organelle der neuere Eintrag, Aufrufe zählen als Maximum, „Zuletzt
 * benutzt“ ordnet nach dem letzten Besuch. resetAt: „Verlauf zurücksetzen“; alles davor gilt nicht mehr.
 *
 * Zeiten weit in der Zukunft (mehr als einen Tag nach jetzt) gelten als „jetzt“: Sonst würde ein
 * Eintrag mit Jahr 275760 jede spätere Änderung für immer überstimmen. Ein so korrigiertes
 * Dokument wird beim nächsten Abgleich neu gespeichert.
 */

export const SCHEMA = 1
export const RECENT_MAX = 6

/** Schutz vor riesigen oder kaputten Dokumenten */
const MAX_KEYS = 400
const MAX_RECENT_IN = 50
export const MAX_TIME = 8.64e15 // größtes gültiges Datum in JavaScript
/** So weit darf die Uhr eines anderen Geräts vorgehen; was später liegt, gilt als „jetzt“. */
export const MAX_AHEAD_MS = 24 * 60 * 60 * 1000
const MAX_VIEWS = 1_000_000

export interface LearnedEntry {
  v: boolean
  t: number
}

export interface RecentEntry {
  path: string
  title: string
  t: number
}

export interface SyncDoc {
  schema: number
  learned: Record<string, LearnedEntry>
  viewed: Record<string, number>
  recent: RecentEntry[]
  resetAt: number
  updatedAt: number
}

/** Der Teil des lokalen Fortschritts (store/progress.ts), der abgeglichen wird. */
export interface LocalProgress {
  learned: Partial<Record<string, true>>
  learnedAt: Partial<Record<string, number>>
  viewed: Partial<Record<string, number>>
  recent: { path: string; title: string; t?: number }[]
  resetAt: number
}

/* ---------- Hilfen ---------- */

/** Objekt ohne Prototyp: Schlüssel wie „__proto__“ oder „constructor“ sind darin harmlose Daten. */
function dict<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>
}

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Organellen-IDs wie „raues-er“; schließt „__proto__“ und Ähnliches aus. */
const ID_RE = /^[a-z][a-z0-9-]{0,63}$/
export const isSyncId = (k: string) => ID_RE.test(k)

/** App-Pfade wie „/mathematik/terme“ (nie „//andere-seite“) */
const PATH_RE = /^\/(?!\/)[A-Za-z0-9\-._~/?=&%]{0,199}$/

/**
 * Ein Zeitpunkt (ms) oder null, wenn unbrauchbar. Weiter als MAX_AHEAD_MS in der Zukunft: `now`,
 * und `onFix` wird gerufen (das Dokument muss dann neu gespeichert werden).
 */
function time(x: unknown, now: number, onFix: () => void): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > MAX_TIME) return null
  if (x > now + MAX_AHEAD_MS) {
    onFix()
    return Math.floor(now)
  }
  return Math.floor(x)
}

const count = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(Math.floor(x), MAX_VIEWS) : null)

export function emptyDoc(): SyncDoc {
  return { schema: SCHEMA, learned: dict(), viewed: dict(), recent: [], resetAt: 0, updatedAt: 0 }
}

/** Neuester Besuch zuerst, je Pfad nur einmal (der neueste), höchstens RECENT_MAX. */
function normalizeRecent(list: RecentEntry[], resetAt: number): RecentEntry[] {
  const best = new Map<string, RecentEntry>()
  for (const r of list) {
    if (r.t < resetAt) continue
    const cur = best.get(r.path)
    if (!cur || r.t > cur.t || (r.t === cur.t && r.title < cur.title)) best.set(r.path, r)
  }
  return [...best.values()].sort((a, b) => b.t - a.t || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).slice(0, RECENT_MAX)
}

/* ---------- Lesen ---------- */

/**
 * Liest ein Dokument aus beliebigem JSON (aus Blob oder einem anderen Gerät). Unbrauchbare Teile
 * werden einzeln verworfen, nie das Ganze. future = von einer neueren App-Version geschrieben.
 * fixed = Zeiten aus der fernen Zukunft wurden auf `now` gesetzt (das Dokument neu speichern).
 */
export function parseDoc(raw: unknown, now: number = Date.now()): { doc: SyncDoc; future: boolean; fixed: boolean } {
  const doc = emptyDoc()
  if (!isObject(raw)) return { doc, future: false, fixed: false }
  let fixed = false
  const t = (x: unknown) =>
    time(x, now, () => {
      fixed = true
    })
  const schema = typeof raw.schema === 'number' && Number.isFinite(raw.schema) ? raw.schema : SCHEMA
  doc.resetAt = t(raw.resetAt) ?? 0
  doc.updatedAt = t(raw.updatedAt) ?? 0

  if (isObject(raw.learned)) {
    let n = 0
    for (const k of Object.keys(raw.learned)) {
      if (n >= MAX_KEYS) break
      const e = raw.learned[k]
      if (!isSyncId(k) || !isObject(e) || typeof e.v !== 'boolean') continue
      const at = t(e.t)
      if (at === null || at < doc.resetAt) continue
      doc.learned[k] = { v: e.v, t: at }
      n++
    }
  }

  if (isObject(raw.viewed)) {
    let n = 0
    for (const k of Object.keys(raw.viewed)) {
      if (n >= MAX_KEYS) break
      const c = count(raw.viewed[k])
      if (!isSyncId(k) || c === null || c === 0) continue
      doc.viewed[k] = c
      n++
    }
  }

  if (Array.isArray(raw.recent)) {
    const list: RecentEntry[] = []
    for (const r of raw.recent.slice(0, MAX_RECENT_IN)) {
      if (!isObject(r) || typeof r.path !== 'string' || !PATH_RE.test(r.path)) continue
      const at = t(r.t)
      if (at === null) continue
      const title = typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 120) : r.path
      list.push({ path: r.path, title, t: at })
    }
    doc.recent = normalizeRecent(list, doc.resetAt)
  }

  return { doc, future: schema > SCHEMA, fixed }
}

/* ---------- Zusammenführen ---------- */

/**
 * Führt zwei Stände zusammen, ohne etwas zu verlieren: je Organelle gewinnt die neuere Änderung
 * (bei Gleichstand „gelernt“), Aufrufe als Maximum, „Zuletzt benutzt“ nach dem letzten Besuch.
 * Ein Zurücksetzen (resetAt) verwirft alles, was davor lag. Reihenfolge der Argumente egal.
 */
export function mergeDocs(a: SyncDoc, b: SyncDoc): SyncDoc {
  const resetAt = Math.max(a.resetAt, b.resetAt)
  const out = emptyDoc()
  out.resetAt = resetAt
  out.updatedAt = Math.max(a.updatedAt, b.updatedAt)

  for (const side of [a, b]) {
    for (const k of Object.keys(side.learned)) {
      const e = side.learned[k]
      if (e.t < resetAt) continue
      const cur = own(out.learned, k) ? out.learned[k] : undefined
      if (!cur || e.t > cur.t || (e.t === cur.t && e.v && !cur.v)) out.learned[k] = { v: e.v, t: e.t }
    }
  }

  // Aufrufe zählen nur von Seiten, die das letzte Zurücksetzen schon kennen
  for (const side of [a, b]) {
    if (side.resetAt < resetAt) continue
    for (const k of Object.keys(side.viewed)) {
      const c = side.viewed[k]
      if (!own(out.viewed, k) || c > out.viewed[k]) out.viewed[k] = c
    }
  }

  out.recent = normalizeRecent([...a.recent, ...b.recent], resetAt)
  return out
}

/** Kanonische Form zum Vergleichen (sortierte Schlüssel, ohne updatedAt). */
function canonical(d: SyncDoc): string {
  const sorted = <T>(o: Record<string, T>) => Object.keys(o).sort().map((k) => [k, o[k]] as const)
  return JSON.stringify([d.schema, d.resetAt, sorted(d.learned).map(([k, e]) => [k, e.v, e.t]), sorted(d.viewed), d.recent.map((r) => [r.path, r.title, r.t])])
}

/** Gleicher Inhalt? (updatedAt zählt nicht) */
export function sameDoc(a: SyncDoc, b: SyncDoc): boolean {
  return canonical(a) === canonical(b)
}

/** Nichts drin, was sich zu speichern lohnt? */
export function isEmptyDoc(d: SyncDoc): boolean {
  return !Object.keys(d.learned).length && !Object.keys(d.viewed).length && !d.recent.length && !d.resetAt
}

/** Das Dokument als einfaches JSON (für den Upload). */
export function toJson(d: SyncDoc): SyncDoc {
  return {
    schema: SCHEMA,
    learned: Object.fromEntries(Object.keys(d.learned).sort().map((k) => [k, { v: d.learned[k].v, t: d.learned[k].t }])),
    viewed: Object.fromEntries(Object.keys(d.viewed).sort().map((k) => [k, d.viewed[k]])),
    recent: d.recent.map((r) => ({ path: r.path, title: r.title, t: r.t })),
    resetAt: d.resetAt,
    updatedAt: d.updatedAt,
  }
}

/* ---------- lokal <-> Dokument ---------- */

/** Lokaler Fortschritt als Dokument. Läuft durch parseDoc, damit beide Seiten gleich geprüft sind. */
export function docFromLocal(p: LocalProgress, now?: number): SyncDoc {
  return parseLocal(p, now).doc
}

/** Wie docFromLocal; fixed = der lokale Stand hatte Zeiten aus der fernen Zukunft. */
function parseLocal(p: LocalProgress, now?: number) {
  const learned: Record<string, LearnedEntry> = {}
  for (const k of new Set([...Object.keys(p.learned), ...Object.keys(p.learnedAt)])) {
    learned[k] = { v: p.learned[k] === true, t: p.learnedAt[k] ?? 0 }
  }
  const recent = p.recent.map((r, i) => ({ path: r.path, title: r.title, t: r.t ?? p.recent.length - i }))
  return parseDoc({ schema: SCHEMA, learned, viewed: p.viewed, recent, resetAt: p.resetAt }, now)
}

/**
 * Dokument als lokaler Fortschritt. Organellen, die diese App-Version nicht kennt (known = false),
 * bleiben nur im Dokument in Blob und werden beim nächsten Speichern mitgenommen.
 */
export function localFromDoc(d: SyncDoc, known: (id: string) => boolean): LocalProgress {
  const learned: Partial<Record<string, true>> = {}
  const learnedAt: Partial<Record<string, number>> = {}
  const viewed: Partial<Record<string, number>> = {}
  for (const k of Object.keys(d.learned).sort()) {
    if (!known(k)) continue
    learnedAt[k] = d.learned[k].t
    if (d.learned[k].v) learned[k] = true
  }
  for (const k of Object.keys(d.viewed).sort()) if (known(k)) viewed[k] = d.viewed[k]
  return {
    learned,
    learnedAt,
    viewed,
    recent: d.recent.map((r) => ({ path: r.path, title: r.title, t: r.t })),
    resetAt: d.resetAt,
  }
}

/* ---------- Ein Abgleich ---------- */

/** Der Stand in Blob, wie ihn dieses Gerät zuletzt gesehen hat (version 0 = noch nichts gespeichert). */
export interface RemoteState {
  doc: SyncDoc
  version: number
  /** von einer neueren App-Version geschrieben: nur lesen, nicht überschreiben */
  future: boolean
  /** hatte Zeiten aus der fernen Zukunft (in `doc` korrigiert): neu speichern */
  fixed?: boolean
}

/** Alles, was ein Abgleich von außen braucht (im Browser: auth/sync.ts, im Test: ein Schein-Server). */
export interface SyncIO {
  local(): LocalProgress
  apply(next: LocalProgress): void
  fetch(): Promise<RemoteState>
  /** Speichert nur, wenn in Blob noch `version` liegt; sonst kommt der aktuelle Stand zurück. */
  put(doc: SyncDoc, version: number): Promise<{ version: number } | { conflict: RemoteState }>
  known(id: string): boolean
  now(): number
}

export interface CycleResult {
  status: 'synced' | 'newer' | 'conflict'
  remote: RemoteState
  uploaded: boolean
}

/** Antwort des Servers als RemoteState (unbrauchbarer Inhalt zählt als leer). */
export function remoteFrom(value: unknown, version: unknown, now?: number): RemoteState {
  const { doc, future, fixed } = parseDoc(value, now)
  return { doc, future, fixed, version: typeof version === 'number' && Number.isInteger(version) && version > 0 ? version : 0 }
}

/**
 * Ein Abgleich: Stand aus Blob mit dem lokalen zusammenführen, lokal übernehmen und, wenn Blob
 * etwas fehlt, hochladen. Hat inzwischen ein anderes Gerät gespeichert (409), wird mit dessen
 * Stand neu zusammengeführt, höchstens `retries`-mal. `remote` = zuletzt gesehener Stand
 * (null: erst holen).
 */
export async function syncCycle(io: SyncIO, remote: RemoteState | null, retries = 3): Promise<CycleResult> {
  let r = remote ?? (await io.fetch())
  for (let attempt = 0; ; attempt++) {
    const now = io.now()
    const local = parseLocal(io.local(), now)
    const merged = mergeDocs(local.doc, r.doc)
    const next = localFromDoc(merged, io.known)
    // auch übernehmen, wenn nur lokale Zeiten aus der fernen Zukunft korrigiert wurden
    if (local.fixed || !sameDoc(docFromLocal(next, now), local.doc)) io.apply(next)
    if (r.future) return { status: 'newer', remote: r, uploaded: false }
    const upload = r.version === 0 ? !isEmptyDoc(merged) : r.fixed || !sameDoc(merged, r.doc)
    if (!upload) return { status: 'synced', remote: r, uploaded: false }
    const doc = toJson({ ...merged, updatedAt: now })
    const res = await io.put(doc, r.version)
    if ('version' in res) return { status: 'synced', remote: { doc: parseDoc(doc, now).doc, version: res.version, future: false }, uploaded: true }
    if (attempt >= retries) return { status: 'conflict', remote: res.conflict, uploaded: false }
    r = res.conflict
  }
}
