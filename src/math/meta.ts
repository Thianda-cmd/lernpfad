/** Leichtgewichtige Übersicht über Kapitel, Klausuren und Übungsblätter (ohne Inhalte). */

export type GroupId = 'lf1t' | 'chem' | 'mfh'

export interface ChapterMeta {
  id: string
  title: string
  short: string
  group: GroupId
  /** kleine Formel als Erkennungszeichen auf der Karte */
  sig: string
}

export const GROUPS: { id: GroupId; title: string; sub: string; exam?: string }[] = [
  { id: 'lf1t', title: 'LF 1T · Grundlagen', sub: 'Algebra-Werkzeuge aus deiner Mitschrift (B1T)', exam: 'lf1t-1' },
  { id: 'chem', title: 'Chemisches Rechnen', sub: 'Stoffmenge, Masse, molare Masse, Anteile' },
  { id: 'mfh', title: 'MFH', sub: 'Gleichungssysteme, p-q-Formel, Geraden', exam: 'mfh' },
]

export const CHAPTERS: ChapterMeta[] = [
  { id: 'klammern', title: 'Klammern auflösen', short: 'Plus- und Minusklammern, verschachtelte Klammern', group: 'lf1t', sig: 'a-(b-c)=a-b+c' },
  { id: 'ausmultiplizieren', title: 'Ausmultiplizieren', short: 'Distributivgesetz, Klammer mal Klammer, binomische Formeln', group: 'lf1t', sig: '(a+b)(c+d)' },
  { id: 'gleichungen', title: 'Gleichungen & Ungleichungen', short: 'Äquivalenzumformungen, Formeln mit Parametern, Zeichen umdrehen', group: 'lf1t', sig: '2x+3=16-(2x-3)' },
  { id: 'textaufgaben', title: 'Textaufgaben', short: 'Vom Satz zur Gleichung: Zahlenrätsel, Grundstück, Alter', group: 'lf1t', sig: '16-(x+5)=9' },
  { id: 'brueche', title: 'Bruchrechnung', short: 'Hauptnenner, Kehrwert, Doppelbrüche, Bruchterme', group: 'lf1t', sig: '\\tfrac{3a}{4}+\\tfrac{7a}{6}' },
  { id: 'potenzen', title: 'Potenzen & Wurzeln', short: 'Potenzgesetze, Wurzeln als Potenzen, teilweise Wurzelziehen', group: 'lf1t', sig: 'a^m\\cdot a^n=a^{m+n}' },
  { id: 'formeln', title: 'Formeln umstellen', short: 'Zwiebelprinzip: von außen nach innen umkehren', group: 'lf1t', sig: 'f=\\tfrac{2A_R}{e}' },
  { id: 'prozent', title: 'Prozentrechnung', short: 'Grundwert, Prozentwert, Prozentsatz, Massenanteil', group: 'lf1t', sig: 'p=\\tfrac{W}{G}\\cdot 100' },
  { id: 'stoffmenge', title: 'Stoffmenge & molare Masse', short: 'M, m, n, N – und Atom-% bzw. Massen-%', group: 'chem', sig: 'n=\\tfrac{m}{M}' },
  { id: 'lgs', title: 'Lineare Gleichungssysteme', short: 'Additions-, Einsetzungs- und Gleichsetzungsverfahren', group: 'mfh', sig: '\\text{I}+\\text{II}' },
  { id: 'lgs-text', title: 'Textaufgaben mit 2 Unbekannten', short: 'Tarife, Mischtemperatur, Mischungen', group: 'mfh', sig: 'x+15y=55' },
  { id: 'pq', title: 'p-q-Formel', short: 'Quadratische Gleichungen in Normalform lösen', group: 'mfh', sig: 'x^2+px+q=0' },
  { id: 'geraden', title: 'Geraden', short: 'Steigung, Achsenabschnitt, Schnittpunkte', group: 'mfh', sig: 'y=mx+b' },
]

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<string, ChapterMeta>

export interface Klausur {
  id: string
  title: string
  sub: string
  date: string
  minutes?: number
  topics: string[]
  /** Themen aus der Mitschrift abgeleitet (nicht offiziell bekanntgegeben) */
  derived?: boolean
  mock?: string
}

export const KLAUSUREN: Klausur[] = [
  { id: 'lf1t-1', title: '1. Klausur LF 1T', sub: 'Grundlagen', date: '2026-10-08', minutes: 60, topics: ['klammern', 'ausmultiplizieren', 'gleichungen', 'textaufgaben', 'brueche', 'potenzen', 'formeln', 'prozent'], derived: true, mock: 'lf1t' },
  { id: 'mfh', title: 'Klausur MFH', sub: 'LGS · p-q-Formel · Geraden', date: '2026-11-04', topics: ['lgs', 'lgs-text', 'pq', 'geraden'], mock: 'mfh' },
  { id: 'lf1t-2', title: '2. Klausur LF 1T', sub: 'Teil 1', date: '2026-11-26', topics: [] },
  { id: 'lf1t-3', title: '3. Klausur LF 1T', sub: 'Teil 2', date: '2027-02-11', topics: [] },
]

export function daysUntil(iso: string, now = new Date()) {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', opts).format(new Date(y, m - 1, d))
}

export function nextKlausur(now = new Date()) {
  return KLAUSUREN.filter((k) => daysUntil(k.date, now) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
}

export function relDays(n: number) {
  if (n === 0) return 'heute'
  if (n === 1) return 'morgen'
  if (n < 0) return `vor ${-n} Tagen`
  return `in ${n} Tagen`
}

export interface SheetMeta {
  id: string
  title: string
  source: string
  count: number
  chapters: string[]
}

export const SHEETS: SheetMeta[] = [
  { id: 'klammern', title: 'Auflösen von Klammern', source: 'Übungsaufgaben ① (Klammerrechnung.pdf, S. 1)', count: 9, chapters: ['klammern', 'textaufgaben'] },
  { id: 'gleichungen', title: 'Gleichungen & Ungleichungen', source: 'Übungsaufgaben ② (Klammerrechnung.pdf, S. 2)', count: 8, chapters: ['gleichungen', 'textaufgaben'] },
  { id: 'brueche', title: 'Bruch- und Potenzrechnung', source: 'Bruchrechnung.pdf, S. 1', count: 11, chapters: ['brueche', 'potenzen'] },
  { id: 'wurzeln', title: 'Wurzelrechnen & Umformen', source: 'Bruchrechnung.pdf, S. 2', count: 8, chapters: ['potenzen', 'formeln'] },
  { id: 'stoffmenge', title: 'M, m, n, m%, Nₓ', source: 'Aufgaben zu M n m %.pdf', count: 20, chapters: ['stoffmenge'] },
]

export const SHEET_BY_ID = Object.fromEntries(SHEETS.map((s) => [s.id, s])) as Record<string, SheetMeta>

export interface MockMeta {
  id: string
  title: string
  sub: string
  minutes: number
  klausur: string
}

export const MOCKS: MockMeta[] = [
  { id: 'lf1t', title: 'Probeklausur LF 1T', sub: 'Grundlagen – wie die 1. Klausur am 08.10.', minutes: 60, klausur: 'lf1t-1' },
  { id: 'mfh', title: 'Probeklausur MFH', sub: 'LGS, Textaufgabe, p-q-Formel, Geraden', minutes: 60, klausur: 'mfh' },
  { id: 'stoff', title: 'Test Chemisches Rechnen', sub: 'Stoffmenge, Masse, Teilchenzahl, Anteile', minutes: 45, klausur: '' },
]

export const MOCK_BY_ID = Object.fromEntries(MOCKS.map((m) => [m.id, m])) as Record<string, MockMeta>

/** IHK-Notenschlüssel (Prozent → Note) */
export function grade(pct: number) {
  if (pct >= 92) return 1
  if (pct >= 81) return 2
  if (pct >= 67) return 3
  if (pct >= 50) return 4
  if (pct >= 30) return 5
  return 6
}

/** Kapitel gilt nach so vielen richtigen Übungsaufgaben als sicher */
export const MASTERY_GOAL = 10

export function mastery(stat?: { correct: number; tries: number }) {
  if (!stat || !stat.tries) return 0
  return Math.min(1, stat.correct / MASTERY_GOAL)
}

export const GRADE_NAMES =['', 'sehr gut', 'gut', 'befriedigend', 'ausreichend', 'mangelhaft', 'ungenügend']
