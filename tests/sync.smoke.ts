/**
 * Test für den Abgleich des Lernfortschritts über Blob (npm run test:sync):
 *  – Lesen beliebiger, auch kaputter oder zukünftiger Dokumente (nie ein Absturz, kein __proto__-Unfug),
 *  – Zusammenführen: Vereinigung, Abwählen überträgt sich, Aufrufe als Maximum, „Zuletzt benutzt“
 *    nach Zeit, Zurücksetzen; vertauschbar, wiederholbar, assoziativ,
 *  – der echte Fortschritts-Store (Zeitstempel, Umzug vom alten Format),
 *  – mehrere Geräte gegen einen Schein-Server mit Versionen und 409-Konflikten.
 */
import './storage-shim'
import './sync-legacy-fixture'
import { ALL_ORGANELLE_IDS } from '../src/data/organelles'
import { useProgress } from '../src/store/progress'
import {
  MAX_AHEAD_MS,
  MAX_TIME,
  RECENT_MAX,
  docFromLocal,
  emptyDoc,
  isEmptyDoc,
  localFromDoc,
  mergeDocs,
  parseDoc,
  remoteFrom,
  sameDoc,
  syncCycle,
  toJson,
  type LocalProgress,
  type RemoteState,
  type SyncDoc,
  type SyncIO,
} from '../src/auth/sync-merge'

let failed = 0
let checked = 0

function ok(cond: unknown, label: string, detail?: unknown) {
  checked++
  if (!cond) {
    failed++
    console.log(`✗ ${label}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`)
  }
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const known = (id: string) => (ALL_ORGANELLE_IDS as string[]).includes(id)
const doc = (x: unknown) => parseDoc(x).doc
const learnedIds = (d: SyncDoc) => Object.keys(d.learned).filter((k) => d.learned[k].v).sort()

/* ---------- 1. Der Fortschritt vom alten Format (Version 2) ---------- */
{
  const s = useProgress.getState()
  ok(eq(Object.keys(s.learned).sort(), ['golgi', 'mitochondrium']), 'Umzug v2: gelernte Organellen bleiben', s.learned)
  ok(s.learnedAt.golgi && s.learnedAt.golgi > Date.now() - 60_000, 'Umzug v2: gelernte Organellen zählen ab jetzt', s.learnedAt)
  ok(s.viewed.mitochondrium === 3, 'Umzug v2: Aufrufe bleiben')
  ok(s.recent.length === 2 && s.recent[0].path === '/mathematik/terme' && (s.recent[0].t ?? 0) > (s.recent[1].t ?? 0), 'Umzug v2: Reihenfolge „Zuletzt benutzt“ bleibt', s.recent)
  ok(s.resetAt === 0, 'Umzug v2: nie zurückgesetzt')
  const stored = JSON.parse(localStorage.getItem('lernlabor-fortschritt') ?? '{}')
  ok(stored.version === 3 && stored.state.learnedAt, 'Umzug v2: gespeichert als Version 3', stored)
}

/* ---------- 2. Lesen: kaputte und fremde Daten ---------- */
for (const junk of [null, undefined, 'garbage', 42, true, [], [1, 2], { learned: 'x', viewed: [], recent: {} }]) {
  const { doc: d, future } = parseDoc(junk)
  ok(isEmptyDoc(d) && !future, `Lesen: ${JSON.stringify(junk) ?? 'undefined'} ergibt ein leeres Dokument`, d)
}
ok(parseDoc({ schema: 2 }).future, 'Lesen: schema 2 ist eine neuere Version')
ok(!parseDoc({ schema: 1 }).future && !parseDoc({}).future, 'Lesen: schema 1 oder ohne schema ist bekannt')
{
  const d = doc({
    learned: {
      mitochondrium: { v: true, t: 10 },
      golgi: { v: false, t: 11 },
      'raues-er': { v: 'ja', t: 12 },
      lysosom: { v: true, t: -1 },
      vakuole: { v: true, t: Number.NaN },
      zellkern: { v: true },
      ribosomen: { v: true, t: 1e20 },
      vesikel: 'true',
      'Gross-Klein': { v: true, t: 1 },
      'mit leerzeichen': { v: true, t: 1 },
      ['x'.repeat(70)]: { v: true, t: 1 },
      '': { v: true, t: 1 },
    },
  })
  ok(eq(Object.keys(d.learned).sort(), ['golgi', 'mitochondrium']), 'Lesen: nur gültige Einträge bei „gelernt“', d.learned)
  ok(d.learned.golgi.v === false && d.learned.golgi.t === 11, 'Lesen: abgewählte Organelle bleibt als Eintrag')
}
{
  const raw = JSON.parse('{"learned":{"__proto__":{"v":true,"t":5},"constructor":{"v":true,"t":6},"golgi":{"v":true,"t":7}},"viewed":{"__proto__":9,"constructor":4,"toString":3},"recent":[]}')
  const d = doc(raw)
  ok(!Object.prototype.hasOwnProperty.call(d.learned, '__proto__'), 'Lesen: „__proto__“ wird verworfen')
  ok(({} as Record<string, unknown>).v === undefined && ({} as Record<string, unknown>).t === undefined, 'Lesen: kein Prototyp verändert')
  ok(d.learned.constructor?.v === true && d.learned.golgi?.v === true, 'Lesen: „constructor“ ist harmlose Daten', d.learned)
  const m = mergeDocs(d, emptyDoc())
  ok(m.learned.constructor?.t === 6 && !('v' in Object.prototype), 'Zusammenführen: „constructor“ bleibt Daten')
  ok(d.viewed.constructor === 4 && !Object.prototype.hasOwnProperty.call(d.viewed, 'toString') && !Object.prototype.hasOwnProperty.call(d.viewed, '__proto__'), 'Lesen: Aufrufe ohne __proto__, „constructor“ ist harmlos', toJson(d).viewed)
  ok(eq(toJson(d).learned, { constructor: { v: true, t: 6 }, golgi: { v: true, t: 7 } }), 'JSON: ohne __proto__', toJson(d))
}
{
  const d = doc({ viewed: { mitochondrium: 3.9, golgi: -2, zellkern: 'viel', vakuole: 0, lysosom: 1e12, 'Böse': 1 } })
  ok(eq(d.viewed, Object.assign(Object.create(null), { mitochondrium: 3, lysosom: 1_000_000 })), 'Lesen: Aufrufe ganzzahlig, gedeckelt, nur gültige', { ...d.viewed })
}
{
  const d = doc({
    recent: [
      { path: '/a', title: 'A', t: 1 },
      { path: 'javascript:alert(1)', title: 'X', t: 99 },
      { path: 'https://evil.example/', title: 'X', t: 99 },
      { path: '//evil.example', title: 'X', t: 99 },
      { path: '/mit leerzeichen', title: 'X', t: 99 },
      { path: '/b', title: 'B', t: 5 },
      { path: '/a', title: 'A neu', t: 7 },
      { path: '/c', t: 3 },
      { path: '/d', title: 'D'.repeat(500), t: 4 },
      { path: '/e', title: 'E' },
      'kaputt',
      { path: '/f', title: 'F', t: 2 },
      { path: '/g', title: 'G', t: 0 },
      { path: '/h', title: 'H', t: 6 },
    ],
  })
  ok(eq(d.recent.map((r) => r.path), ['/a', '/h', '/b', '/d', '/c', '/f']), 'Lesen: „Zuletzt benutzt“ geprüft, neuester zuerst, je Pfad einmal, höchstens 6', d.recent)
  ok(d.recent[0].title === 'A neu', 'Lesen: neuester Besuch behält seinen Titel')
  ok(d.recent.find((r) => r.path === '/c')?.title === '/c', 'Lesen: fehlender Titel wird der Pfad')
  ok(d.recent.find((r) => r.path === '/d')?.title.length === 120, 'Lesen: langer Titel gekürzt')
  ok(!d.recent.some((r) => r.path.includes('evil') || r.path.startsWith('javascript')), 'Lesen: keine fremden Adressen')
}
{
  // Zeiten weit in der Zukunft (Jahr 275760) dürfen nicht für immer gewinnen: gelten als „jetzt“
  const now = 1_800_000_000_000
  const r = parseDoc(
    {
      resetAt: MAX_TIME,
      updatedAt: MAX_TIME,
      learned: { golgi: { v: true, t: MAX_TIME }, zellkern: { v: true, t: now + MAX_AHEAD_MS - 1 }, ribosomen: { v: true, t: 1e20 } },
      recent: [{ path: '/a', title: 'A', t: MAX_TIME }],
    },
    now,
  )
  ok(r.fixed, 'Lesen: Zeiten aus der fernen Zukunft werden bemerkt')
  ok(r.doc.resetAt === now && r.doc.updatedAt === now && r.doc.learned.golgi?.t === now && r.doc.recent[0]?.t === now, 'Lesen: … und gelten als jetzt', toJson(r.doc))
  ok(r.doc.learned.zellkern?.t === now + MAX_AHEAD_MS - 1, 'Lesen: eine Uhr, die bis zu einem Tag vorgeht, bleibt unverändert')
  ok(!r.doc.learned.ribosomen, 'Lesen: ungültiges Datum (über Jahr 275760) wird verworfen')
  ok(!parseDoc({ learned: { golgi: { v: true, t: now } } }, now).fixed, 'Lesen: normale Zeiten sind nicht „korrigiert“')
}
{
  const many: Record<string, unknown> = {}
  for (let i = 0; i < 2000; i++) many[`o${i}`] = { v: true, t: i + 1 }
  const d = doc({ learned: many, recent: Array.from({ length: 5000 }, (_, i) => ({ path: `/p${i}`, title: 'x', t: i })) })
  ok(Object.keys(d.learned).length === 400 && d.recent.length === RECENT_MAX, 'Lesen: riesige Dokumente werden begrenzt')
}
{
  const d = doc({ resetAt: 100, learned: { golgi: { v: true, t: 50 }, zellkern: { v: true, t: 150 } }, recent: [{ path: '/a', title: 'A', t: 90 }, { path: '/b', title: 'B', t: 120 }] })
  ok(eq(Object.keys(d.learned), ['zellkern']) && eq(d.recent.map((r) => r.path), ['/b']), 'Lesen: Einträge vor dem Zurücksetzen fallen weg')
}

/* ---------- 3. Zusammenführen ---------- */
{
  const a = doc({ learned: { golgi: { v: true, t: 10 } }, viewed: { golgi: 2 }, recent: [{ path: '/a', title: 'A', t: 10 }] })
  const b = doc({ learned: { zellkern: { v: true, t: 5 } }, viewed: { zellkern: 1 }, recent: [{ path: '/b', title: 'B', t: 20 }] })
  const m = mergeDocs(a, b)
  ok(eq(learnedIds(m), ['golgi', 'zellkern']), 'Zusammenführen: gelernte Organellen beider Geräte (Vereinigung)', m.learned)
  ok(m.viewed.golgi === 2 && m.viewed.zellkern === 1, 'Zusammenführen: Aufrufe beider Geräte')
  ok(eq(m.recent.map((r) => r.path), ['/b', '/a']), 'Zusammenführen: „Zuletzt benutzt“ nach Zeit')
}
{
  const a = doc({ learned: { golgi: { v: true, t: 10 } } })
  const b = doc({ learned: { golgi: { v: false, t: 20 } } })
  ok(mergeDocs(a, b).learned.golgi.v === false && mergeDocs(b, a).learned.golgi.v === false, 'Zusammenführen: späteres Abwählen gewinnt (Grabstein)')
  const c = doc({ learned: { golgi: { v: true, t: 30 } } })
  ok(mergeDocs(b, c).learned.golgi.v === true, 'Zusammenführen: späteres erneutes Lernen gewinnt gegen den Grabstein')
  const tie = doc({ learned: { golgi: { v: false, t: 10 } } })
  ok(mergeDocs(a, tie).learned.golgi.v === true && mergeDocs(tie, a).learned.golgi.v === true, 'Zusammenführen: bei Gleichstand bleibt „gelernt“')
}
{
  const a = doc({ viewed: { golgi: 5, zellkern: 1 } })
  const b = doc({ viewed: { golgi: 3, zellkern: 4 } })
  const m = mergeDocs(a, b)
  ok(m.viewed.golgi === 5 && m.viewed.zellkern === 4, 'Zusammenführen: Aufrufe als Maximum', { ...m.viewed })
}
{
  const a = doc({ recent: [1, 2, 3, 4, 5].map((i) => ({ path: `/a${i}`, title: `A${i}`, t: i * 10 })) })
  const b = doc({ recent: [{ path: '/a1', title: 'A1 neu', t: 100 }, ...[1, 2, 3].map((i) => ({ path: `/b${i}`, title: `B${i}`, t: i * 10 + 5 }))] })
  const m = mergeDocs(a, b)
  ok(eq(m.recent.map((r) => r.path), ['/a1', '/a5', '/a4', '/b3', '/a3', '/b2']), 'Zusammenführen: „Zuletzt benutzt“ neuester zuerst, ohne Doppelte, höchstens 6', m.recent.map((r) => r.path))
  ok(m.recent[0].title === 'A1 neu' && m.recent[0].t === 100, 'Zusammenführen: Doppelte behalten den neuesten Besuch')
}
{
  const before = doc({ learned: { golgi: { v: true, t: 10 } }, viewed: { golgi: 9 }, recent: [{ path: '/a', title: 'A', t: 10 }] })
  const reset = doc({ resetAt: 50, learned: { zellkern: { v: true, t: 60 } }, viewed: { zellkern: 1 } })
  const m = mergeDocs(before, reset)
  ok(m.resetAt === 50 && eq(learnedIds(m), ['zellkern']) && eq(Object.keys(m.viewed), ['zellkern']) && !m.recent.length, 'Zusammenführen: Zurücksetzen gilt auf allen Geräten', toJson(m))
  const after = doc({ resetAt: 50, viewed: { zellkern: 3 }, learned: { golgi: { v: true, t: 70 } } })
  const m2 = mergeDocs(m, after)
  ok(m2.viewed.zellkern === 3 && m2.learned.golgi.v, 'Zusammenführen: nach dem Zurücksetzen geht es normal weiter')
}
{
  const a = doc({ learned: { 'neues-organell': { v: true, t: 5 } }, viewed: { 'neues-organell': 2 } })
  const m = mergeDocs(a, doc({ learned: { golgi: { v: true, t: 6 } } }))
  ok(m.learned['neues-organell']?.v && m.viewed['neues-organell'] === 2, 'Zusammenführen: unbekannte Organellen (neuere App) bleiben erhalten')
  const local = localFromDoc(m, known)
  ok(!('neues-organell' in local.learned) && local.learned.golgi === true, 'Lokal: unbekannte Organellen werden nicht angezeigt')
}

// Eigenschaften mit Zufallsdaten: vertauschbar, wiederholbar, assoziativ
{
  let seed = 7
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const ids = ['golgi', 'zellkern', 'lysosom', 'vakuole', 'zellwand']
  const paths = ['/a', '/b', '/c', '/d', '/e', '/f', '/g', '/h']
  const randomDoc = (): SyncDoc =>
    doc({
      resetAt: rnd() < 0.2 ? Math.floor(rnd() * 50) : 0,
      learned: Object.fromEntries(ids.filter(() => rnd() < 0.6).map((k) => [k, { v: rnd() < 0.6, t: Math.floor(rnd() * 100) }])),
      viewed: Object.fromEntries(ids.filter(() => rnd() < 0.5).map((k) => [k, Math.floor(rnd() * 9) + 1])),
      recent: paths.filter(() => rnd() < 0.5).map((p) => ({ path: p, title: p.toUpperCase(), t: Math.floor(rnd() * 100) })),
    })
  let comm = 0
  let idem = 0
  let assoc = 0
  for (let i = 0; i < 400; i++) {
    const a = randomDoc()
    const b = randomDoc()
    const c = randomDoc()
    if (!sameDoc(mergeDocs(a, b), mergeDocs(b, a))) comm++
    if (!sameDoc(mergeDocs(a, a), a) || !sameDoc(mergeDocs(mergeDocs(a, b), b), mergeDocs(a, b))) idem++
    // „Zuletzt benutzt“ ist auf 6 begrenzt; ohne Begrenzungs-Randfälle muss es assoziativ sein
    if (!sameDoc(mergeDocs(mergeDocs(a, b), c), mergeDocs(a, mergeDocs(b, c)))) {
      const x = mergeDocs(mergeDocs(a, b), c)
      const y = mergeDocs(a, mergeDocs(b, c))
      if (!eq(toJson(x).learned, toJson(y).learned) || !eq(toJson(x).viewed, toJson(y).viewed) || x.resetAt !== y.resetAt) assoc++
    }
  }
  ok(comm === 0, 'Zusammenführen: Reihenfolge der Geräte egal (400 Zufallsfälle)', comm)
  ok(idem === 0, 'Zusammenführen: zweimal zusammenführen ändert nichts', idem)
  ok(assoc === 0, 'Zusammenführen: assoziativ (gelernt, Aufrufe, Zurücksetzen)', assoc)
}

/* ---------- 4. Lokal <-> Dokument ---------- */
{
  const local: LocalProgress = {
    learned: { golgi: true },
    learnedAt: { golgi: 20, zellkern: 30 },
    viewed: { golgi: 2 },
    recent: [
      { path: '/x', title: 'X', t: 50 },
      { path: '/y', title: 'Y' },
    ],
    resetAt: 0,
  }
  const d = docFromLocal(local)
  ok(d.learned.golgi.v && d.learned.golgi.t === 20 && d.learned.zellkern.v === false && d.learned.zellkern.t === 30, 'Lokal → Dokument: gelernt und abgewählt mit Zeit', toJson(d).learned)
  const back = localFromDoc(d, known)
  ok(eq(back.learned, { golgi: true }) && eq(back.learnedAt, { golgi: 20, zellkern: 30 }) && eq(back.viewed, { golgi: 2 }), 'Dokument → lokal: hin und zurück gleich', back)
  ok(eq(back.recent.map((r) => r.path), ['/x', '/y']), 'Dokument → lokal: Reihenfolge bleibt')
  ok(sameDoc(docFromLocal(back), d), 'Hin und zurück: gleiches Dokument')
}

/* ---------- 5. Der echte Store: Zeitstempel ---------- */
const store = useProgress
const pick = (): LocalProgress => {
  const s = store.getState()
  return { learned: s.learned, learnedAt: s.learnedAt, viewed: s.viewed, recent: s.recent, resetAt: s.resetAt }
}
const load = (p: LocalProgress) => store.setState(p as never)
const realNow = Date.now
{
  load({ learned: {}, learnedAt: {}, viewed: {}, recent: [], resetAt: 0 })
  store.getState().setLearned('golgi', true)
  const t1 = store.getState().learnedAt.golgi ?? 0
  ok(store.getState().learned.golgi && t1 > 0, 'Store: Lernen setzt einen Zeitstempel')
  store.getState().toggleLearned('golgi')
  const t2 = store.getState().learnedAt.golgi ?? 0
  ok(!store.getState().learned.golgi && t2 > t1, 'Store: Abwählen setzt einen neueren Zeitstempel (Grabstein)', [t1, t2])
  store.getState().setLearned('golgi', false)
  ok(store.getState().learnedAt.golgi === t2, 'Store: unverändert bleibt unverändert')
  // Ein anderes Gerät mit vorgehender Uhr hat später gespeichert: die eigene Änderung muss trotzdem gewinnen
  const ahead = realNow() + 3_600_000
  load({ ...pick(), learned: { zellkern: true }, learnedAt: { ...pick().learnedAt, zellkern: ahead } })
  store.getState().setLearned('zellkern', false)
  ok((store.getState().learnedAt.zellkern ?? 0) > ahead, 'Store: Änderung gewinnt auch gegen eine vorgehende Uhr')

  store.getState().setLastVisit({ path: '/mathematik/terme', title: 'Terme' })
  store.getState().setLastVisit({ path: '/chemie/molmasse', title: 'Molare Masse' })
  const r = store.getState().recent
  ok(r[0].path === '/chemie/molmasse' && (r[0].t ?? 0) > (r[1].t ?? 0), 'Store: „Zuletzt benutzt“ mit Zeit, neuester zuerst', r)
  const same = store.getState().recent
  store.getState().setLastVisit({ path: '/chemie/molmasse', title: 'Molare Masse' })
  ok(store.getState().recent === same, 'Store: gleiche Seite gleich wieder: nichts zu speichern')

  store.getState().markViewed('golgi')
  store.getState().reset()
  const s = store.getState()
  ok(!Object.keys(s.learned).length && !Object.keys(s.viewed).length && !s.recent.length && s.resetAt > t2, 'Store: Zurücksetzen merkt sich die Zeit', s.resetAt)
  ok(s.resetAt > ahead + 1, 'Store: Zurücksetzen liegt nach allem Bekannten')

  // Zeitstempel bleiben gültige Daten, auch wenn ein kaputter Stand Jahr 275760 enthält
  load({ learned: { golgi: true }, learnedAt: { golgi: MAX_TIME }, viewed: {}, recent: [{ path: '/a', title: 'A', t: MAX_TIME }], resetAt: MAX_TIME })
  store.getState().setLearned('golgi', false)
  store.getState().setLastVisit({ path: '/b', title: 'B' })
  store.getState().reset()
  const p = store.getState()
  ok(p.resetAt <= MAX_TIME && (p.learnedAt.golgi ?? 0) <= MAX_TIME, 'Store: Zeitstempel nie über dem größten gültigen Datum', p)

  // Besitzer: Zurücksetzen behält ihn, „vom Gerät nehmen“ leert alles ohne Zurücksetzen
  store.setState({ owner: 'person-a' })
  store.getState().setLearned('golgi', true)
  store.getState().reset()
  ok(store.getState().owner === 'person-a', 'Store: Zurücksetzen behält den Besitzer')
  store.getState().setLearned('golgi', true)
  store.getState().forget('person-b')
  const f = store.getState()
  ok(f.owner === 'person-b' && !Object.keys(f.learned).length && !Object.keys(f.learnedAt).length && f.resetAt === 0 && !f.recent.length, 'Store: vom Gerät nehmen leert alles und setzt den neuen Besitzer', f)
  ok(JSON.parse(localStorage.getItem('lernlabor-fortschritt') ?? '{}').state?.owner === 'person-b', 'Store: Besitzer wird mit dem Fortschritt gespeichert')
  store.getState().forget(null)
}

/* ---------- 6. Mehrere Geräte gegen einen Schein-Server ---------- */

/** Wie Blobs /api/v1/data/progress: version null = überschreiben, 0 = nur anlegen, n = nur wenn Version n */
class FakeServer {
  value: unknown = undefined
  version = 0
  puts = 0
  /** wird vor jedem PUT aufgerufen (für „ein anderes Gerät war schneller“) */
  beforePut?: () => void
  get(): RemoteState {
    return this.version ? remoteFrom(structuredClone(this.value), this.version) : remoteFrom(null, 0)
  }
  put(value: unknown, expected: number): { version: number } | { conflict: RemoteState } {
    this.beforePut?.()
    const body = JSON.stringify(value)
    if (body.length > 256 * 1024) throw new Error('too_large')
    if (expected !== this.version) return { conflict: this.get() }
    this.puts++
    this.value = JSON.parse(body)
    this.version++
    return { version: this.version }
  }
}

class Device {
  local: LocalProgress = { learned: {}, learnedAt: {}, viewed: {}, recent: [], resetAt: 0 }
  remote: RemoteState | null = null
  constructor(
    public server: FakeServer,
    public clockOffset = 0,
  ) {}
  /** eine Handlung im echten Store, als wäre dies das aktive Gerät */
  act(fn: (s: ReturnType<typeof store.getState>) => void) {
    load(this.local)
    Date.now = () => realNow() + this.clockOffset
    try {
      fn(store.getState())
    } finally {
      Date.now = realNow
    }
    this.local = pick()
  }
  io(): SyncIO {
    return {
      local: () => this.local,
      apply: (next) => {
        this.local = next
      },
      fetch: async () => this.server.get(),
      put: async (d, v) => this.server.put(d, v),
      known,
      now: () => realNow() + this.clockOffset,
    }
  }
  /** pull = erst holen (Anmeldung, Fenster im Vordergrund), sonst mit dem zuletzt gesehenen Stand */
  async sync(pull = false) {
    const res = await syncCycle(this.io(), pull ? null : this.remote)
    this.remote = res.remote
    return res
  }
  learned() {
    return Object.keys(this.local.learned).sort()
  }
}

async function scenarios() {
  // Erste Anmeldung auf zwei Geräten mit eigenem Fortschritt: nichts geht verloren
  {
    const server = new FakeServer()
    const a = new Device(server)
    const b = new Device(server)
    a.act((s) => {
      s.setLearned('golgi', true)
      s.setLastVisit({ path: '/mathematik/terme', title: 'Terme' })
    })
    b.act((s) => {
      s.setLearned('zellkern', true)
      s.markViewed('zellkern')
      s.markViewed('zellkern')
      s.setLastVisit({ path: '/chemie/molmasse', title: 'Molare Masse' })
    })
    const r1 = await a.sync(true)
    ok(r1.uploaded && server.version === 1, 'Geräte: A legt den Stand in Blob an', r1)
    const r2 = await b.sync(true)
    ok(r2.uploaded && server.version === 2, 'Geräte: B führt zusammen und speichert', r2)
    ok(eq(b.learned(), ['golgi', 'zellkern']) && b.local.viewed.zellkern === 2, 'Geräte: B hat jetzt beides', b.local)
    ok(b.local.recent[0].path === '/chemie/molmasse' && b.local.recent.length === 2, 'Geräte: „Zuletzt benutzt“ von beiden, neuester zuerst', b.local.recent)
    const r3 = await a.sync(true)
    ok(!r3.uploaded && eq(a.learned(), ['golgi', 'zellkern']), 'Geräte: A holt sich B dazu, ohne neu zu speichern', r3)
    const r4 = await a.sync(true)
    ok(!r4.uploaded && server.puts === 2, 'Geräte: nichts geändert, nichts gespeichert')

    // Abwählen auf B überträgt sich auf A
    b.act((s) => s.setLearned('golgi', false))
    await b.sync()
    await a.sync(true)
    ok(eq(a.learned(), ['zellkern']), 'Geräte: Abwählen auf B wirkt auch auf A', a.local)
    // und wieder lernen auf A überträgt sich zurück
    a.act((s) => s.toggleLearned('golgi'))
    await a.sync()
    await b.sync(true)
    ok(eq(b.learned(), ['golgi', 'zellkern']), 'Geräte: erneutes Lernen auf A wirkt auf B')

    // Beide offline geändert, B mit altem Stand: 409, zusammenführen, erneut speichern
    a.act((s) => s.setLearned('lysosom', true))
    b.act((s) => {
      s.setLearned('vakuole', true)
      s.setLearned('zellkern', false)
    })
    const ra = await a.sync()
    const before = server.version
    const rb = await b.sync()
    ok(ra.uploaded && rb.uploaded && server.version === before + 1, 'Geräte: Konflikt (409) wird zusammengeführt und gespeichert', { ra, rb })
    ok(eq(b.learned(), ['golgi', 'lysosom', 'vakuole']), 'Geräte: nach dem Konflikt hat B alles', b.learned())
    await a.sync(true)
    ok(eq(a.learned(), ['golgi', 'lysosom', 'vakuole']), 'Geräte: und A auch', a.learned())

    // Zurücksetzen auf A gilt auch für B
    a.act((s) => s.reset())
    await a.sync()
    await b.sync(true)
    ok(!b.learned().length && !Object.keys(b.local.viewed).length && !b.local.recent.length, 'Geräte: Zurücksetzen auf A leert auch B', b.local)
    b.act((s) => s.setLearned('golgi', true))
    await b.sync()
    await a.sync(true)
    ok(eq(a.learned(), ['golgi']), 'Geräte: danach geht es normal weiter')
  }

  // Uhr von B geht eine Stunde nach: Abwählen auf B wirkt trotzdem
  {
    const server = new FakeServer()
    const a = new Device(server)
    const b = new Device(server, -3_600_000)
    a.act((s) => s.setLearned('golgi', true))
    await a.sync(true)
    await b.sync(true)
    b.act((s) => s.setLearned('golgi', false))
    await b.sync()
    await a.sync(true)
    ok(eq(a.learned(), []), 'Geräte: Abwählen wirkt auch mit nachgehender Uhr', a.local.learnedAt)
    // A (Uhr richtig) setzt zurück, B (Uhr eine Stunde nach) lernt danach: das zählt
    a.act((s) => s.setLastVisit({ path: '/chemie/ionen', title: 'Ionen' }))
    a.act((s) => s.reset())
    await a.sync()
    await b.sync(true)
    b.act((s) => {
      s.setLearned('zellkern', true)
      s.setLastVisit({ path: '/chemie/molmasse', title: 'Molare Masse' })
    })
    await b.sync()
    await a.sync(true)
    ok(eq(a.learned(), ['zellkern']) && eq(b.learned(), ['zellkern']), 'Geräte: Lernen nach dem Zurücksetzen zählt auch mit nachgehender Uhr', { a: a.local, b: b.local })
    ok(a.local.recent.length === 1 && a.local.recent[0].path === '/chemie/molmasse', 'Geräte: „Zuletzt benutzt“ nach dem Zurücksetzen auch', a.local.recent)
  }

  // Direkt nach dem Zurücksetzen (gleiche Millisekunde) gelernt: zählt
  {
    const server = new FakeServer()
    const a = new Device(server)
    const fixed = realNow()
    a.act((s) => s.setLearned('golgi', true))
    load(a.local)
    Date.now = () => fixed
    store.getState().reset()
    store.getState().setLearned('golgi', true)
    Date.now = realNow
    a.local = pick()
    await a.sync(true)
    ok(eq(a.learned(), ['golgi']) && parseDoc(server.value).doc.learned.golgi?.v === true, 'Geräte: Lernen direkt nach dem Zurücksetzen bleibt', a.local)
  }

  // Ein drittes Gerät speichert jedes Mal dazwischen: höchstens 3 Wiederholungen, dann Fehler
  {
    const server = new FakeServer()
    const a = new Device(server)
    a.act((s) => s.setLearned('golgi', true))
    await a.sync(true)
    let n = 0
    server.beforePut = () => {
      server.value = { schema: 1, learned: { [`o${++n}`]: { v: true, t: realNow() } } }
      server.version++
    }
    a.act((s) => s.setLearned('zellkern', true))
    const r = await a.sync()
    ok(r.status === 'conflict' && n === 4, 'Geräte: nach 3 Wiederholungen wird aufgegeben', { status: r.status, n })
    server.beforePut = undefined
    const r2 = await a.sync(true)
    ok(r2.status === 'synced' && r2.uploaded, 'Geräte: beim nächsten Abgleich klappt es')
    const stored = parseDoc(server.value).doc
    ok(stored.learned.zellkern?.v && stored.learned.o4?.v, 'Geräte: dabei geht nichts verloren', toJson(stored).learned)
  }

  // Kaputter Inhalt in Blob: wird mit gültigem Stand überschrieben (mit Versionsprüfung)
  {
    const server = new FakeServer()
    server.value = 'kaputt'
    server.version = 5
    const a = new Device(server)
    a.act((s) => s.setLearned('golgi', true))
    const r = await a.sync(true)
    ok(r.uploaded && server.version === 6 && parseDoc(server.value).doc.learned.golgi?.v === true, 'Geräte: kaputter Inhalt wird ersetzt', server.value)
  }

  // Neuere App-Version hat gespeichert (schema 2): lesen ja, überschreiben nein
  {
    const server = new FakeServer()
    server.value = { schema: 2, learned: { golgi: { v: true, t: 5 }, 'neues-organell': { v: true, t: 5 } }, future: { anything: true } }
    server.version = 3
    const a = new Device(server)
    a.act((s) => s.setLearned('zellkern', true))
    const r = await a.sync(true)
    ok(r.status === 'newer' && !r.uploaded && server.version === 3, 'Geräte: neueres Format wird nicht überschrieben', r.status)
    ok(eq(a.learned(), ['golgi', 'zellkern']), 'Geräte: bekannte Teile werden trotzdem übernommen', a.learned())
  }

  // Unbekannte Organellen aus einer neueren Version (gleiches Schema) bleiben in Blob erhalten
  {
    const server = new FakeServer()
    server.value = { schema: 1, learned: { 'neues-organell': { v: true, t: 5 } }, viewed: { 'neues-organell': 7 } }
    server.version = 1
    const a = new Device(server)
    a.act((s) => s.setLearned('golgi', true))
    await a.sync(true)
    const stored = parseDoc(server.value).doc
    ok(stored.learned['neues-organell']?.v && stored.viewed['neues-organell'] === 7 && stored.learned.golgi?.v, 'Geräte: Unbekanntes bleibt beim Speichern erhalten', toJson(stored))
    ok(!('neues-organell' in a.local.learned), 'Geräte: lokal nur, was diese Version kennt')
  }

  // Ein Dokument mit Zeiten aus der fernen Zukunft (Jahr 275760, z. B. von einem kaputten Programm)
  // blockiert nichts für immer: es wird korrigiert neu gespeichert, Abwählen und Zurücksetzen wirken
  {
    const server = new FakeServer()
    server.value = { schema: 1, resetAt: MAX_TIME, learned: { golgi: { v: true, t: MAX_TIME } }, recent: [{ path: '/mathematik/terme', title: 'Terme', t: MAX_TIME }] }
    server.version = 4
    const a = new Device(server)
    const b = new Device(server)
    const r = await a.sync(true)
    const stored = server.value as SyncDoc
    ok(r.uploaded && server.version === 5 && stored.resetAt <= realNow() + MAX_AHEAD_MS && stored.learned.golgi?.t <= realNow() + MAX_AHEAD_MS, 'Zukunft: wird korrigiert neu gespeichert', stored)
    ok(eq(a.learned(), ['golgi']) && (a.local.learnedAt.golgi ?? 0) <= realNow() + MAX_AHEAD_MS, 'Zukunft: lokal auch korrigiert', a.local)
    a.act((s) => s.setLearned('golgi', false))
    a.act((s) => s.setLearned('lysosom', true))
    await a.sync()
    await b.sync(true)
    ok(eq(b.learned(), ['lysosom']), 'Zukunft: Abwählen und neues Lernen kommen danach auf anderen Geräten an', b.local)
    b.act((s) => s.reset())
    await b.sync()
    await a.sync(true)
    ok(!a.learned().length, 'Zukunft: Zurücksetzen auf B leert auch A', a.local)
    a.act((s) => s.setLearned('vakuole', true))
    await a.sync()
    await b.sync(true)
    ok(eq(a.learned(), ['vakuole']) && eq(b.learned(), ['vakuole']), 'Zukunft: Zurücksetzen und Lernen danach wirken', { a: a.learned(), b: b.learned() })
    const puts = server.puts
    await a.sync(true)
    await b.sync(true)
    ok(server.puts === puts, 'Zukunft: danach kein ständiges Neuspeichern')
  }

  // Lokaler Stand mit Zeiten aus der fernen Zukunft (vom alten Abgleich übernommen): wird korrigiert
  {
    const server = new FakeServer()
    const a = new Device(server)
    a.local = { learned: { golgi: true }, learnedAt: { golgi: MAX_TIME }, viewed: {}, recent: [], resetAt: 0 }
    await a.sync(true)
    ok((a.local.learnedAt.golgi ?? 0) <= realNow() + MAX_AHEAD_MS && parseDoc(server.value).doc.learned.golgi?.v === true, 'Zukunft: lokaler Stand wird korrigiert und gespeichert', a.local)
    a.act((s) => s.setLearned('golgi', false))
    await a.sync()
    ok(parseDoc(server.value).doc.learned.golgi?.v === false, 'Zukunft: danach lässt sich lokal wieder abwählen')
  }

  // Neues Gerät, nichts gelernt, nichts in Blob: nichts anlegen
  {
    const server = new FakeServer()
    const a = new Device(server)
    const r = await a.sync(true)
    ok(!r.uploaded && server.version === 0 && r.status === 'synced', 'Geräte: leerer Stand wird nicht angelegt')
  }

  // Größe: alle Organellen gelernt, viele Aufrufe – weit unter 256 KiB
  {
    const all = Object.fromEntries(ALL_ORGANELLE_IDS.map((id) => [id, { v: true, t: realNow() }]))
    const big = toJson(doc({ learned: all, viewed: Object.fromEntries(ALL_ORGANELLE_IDS.map((id) => [id, 999_999])), recent: Array.from({ length: 6 }, (_, i) => ({ path: `/mathematik/werkzeug-${i}`, title: 'W'.repeat(120), t: realNow() - i })) }))
    const size = JSON.stringify(big).length
    ok(size < 8 * 1024, 'Größe: vollständiger Fortschritt unter 8 KiB', size)
  }
}

await scenarios()

console.log(`\n${checked} Prüfungen.`)
if (failed) {
  console.log(`${failed} Fehler.`)
  process.exit(1)
}
console.log('Alles in Ordnung.')
