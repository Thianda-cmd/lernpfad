/**
 * Prüfwerkzeuge für die Rechner-Tests.
 * Gruppen lassen sich einzeln laufen lassen: CALC_ONLY=chem-a npm run test:calc
 */
import katex from 'katex'
import type { Solution } from '../src/math/alg/step'
import { CalcError } from '../src/math/q'

// KaTeX meldet für „€“ fehlende Schriftmetriken – im Browser wird das Zeichen trotzdem gesetzt
const warn = console.warn
console.warn = (...a: unknown[]) => {
  if (!String(a[0]).includes('No character metrics')) warn(...a)
}

let failed = 0
let checked = 0
let texCount = 0
let current = ''
const groups: string[] = []
const only = (process.env.CALC_ONLY ?? '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean)

/** Prüfungen einer Gruppe (wird bei CALC_ONLY=… übersprungen, wenn nicht gewählt) */
export function group(name: string, fn: () => void) {
  if (only.length && !only.includes(name)) return
  current = name
  groups.push(name)
  try {
    fn()
  } catch (e) {
    fail('Gruppe', `Absturz in der Gruppe: ${(e as Error).stack?.split('\n').slice(0, 4).join(' | ')}`)
  }
  current = ''
}

export function fail(where: string, msg: string) {
  failed++
  console.log(`✗ [${current || '–'}] ${where}: ${msg}`)
}

/** Formel muss sich mit KaTeX setzen lassen */
export function tex(where: string, src: string) {
  texCount++
  try {
    katex.renderToString(src, { throwOnError: true, strict: 'ignore', displayMode: true })
  } catch (e) {
    fail(where, `KaTeX: ${(e as Error).message.slice(0, 160)}\n    ${src.slice(0, 220)}`)
  }
}

/** Text mit $TeX$-Stellen */
export function rich(where: string, text?: string) {
  if (!text) return
  for (const m of text.matchAll(/\$([^$]+)\$/g)) tex(where, m[1])
}

export function checkSolution(where: string, s: Solution | null | undefined) {
  if (!s) return fail(where, 'kein Ergebnis')
  checked++
  if (!s.result?.trim()) fail(where, 'leeres Ergebnis')
  tex(where + ' [Ergebnis]', s.result)
  s.extra?.forEach((x) => tex(where + ' [extra]', x))
  rich(where + ' [Hinweis]', s.remark)
  if (!s.steps.length) fail(where, 'kein Lösungsweg')
  s.steps.forEach((st, i) => {
    // Zwischenüberschriften sind reiner Text (Großbuchstaben) – dort darf kein TeX stehen
    if (st.head && /[$\\]/.test(st.head)) fail(`${where} [Überschrift ${i + 1}]`, `TeX in Überschrift: ${st.head}`)
    tex(`${where} [Schritt ${i + 1}]`, st.tex)
    if (st.op) tex(`${where} [Umformung ${i + 1}]`, st.op)
    rich(`${where} [Erklärung ${i + 1}]`, st.note)
  })
}

/** Rechnen, Lösung prüfen; Fehler werden gemeldet, Ergebnis zurückgegeben */
export function run<T extends Solution | null>(where: string, f: () => T): T | null {
  try {
    const r = f()
    checkSolution(where, r)
    return r
  } catch (e) {
    fail(where, e instanceof CalcError ? `unerwarteter Rechenfehler: ${e.message}` : `Absturz: ${(e as Error).stack?.split('\n').slice(0, 3).join(' | ')}`)
    return null
  }
}

/** ungültige Eingaben müssen einen CalcError liefern */
export function expectError(where: string, f: () => unknown) {
  checked++
  try {
    f()
    fail(where, 'Fehler erwartet, aber Ergebnis geliefert')
  } catch (e) {
    if (!(e instanceof CalcError)) fail(where, `kein CalcError: ${(e as Error).message}`)
  }
}

/** zählt eine Prüfung mit, die selbst fail() meldet */
export function count(n = 1) {
  checked += n
}

/** Bedingung prüfen */
export function check(where: string, ok: boolean, msg = 'Bedingung nicht erfüllt') {
  checked++
  if (!ok) fail(where, msg)
}

/** Zahl vergleichen (relativ, optional absolut) */
export function near(where: string, got: number, want: number, rel = 1e-3, abs = 0) {
  checked++
  const ok = Number.isFinite(got) && Math.abs(got - want) <= Math.max(abs, rel * Math.abs(want))
  if (!ok) fail(where, `erwartet ≈ ${want}, erhalten ${got}`)
}

/** Text des Ergebnisses enthält eine Zahl (TeX: 3{,}25 → 3,25) */
export function resultHas(where: string, s: Solution | null, ...needles: string[]) {
  checked++
  if (!s) return fail(where, 'kein Ergebnis')
  const plain = [s.result, ...(s.extra ?? [])].join(' ').replace(/\{,\}/g, ',').replace(/\\,/g, ' ').replace(/\\!/g, '')
  for (const n of needles) if (!plain.includes(n)) fail(where, `„${n}“ fehlt im Ergebnis: ${plain.slice(0, 200)}`)
}

export function report() {
  console.log(`\n${checked} Prüfungen, ${texCount} Formeln mit KaTeX gesetzt${only.length ? ` (nur: ${groups.join(', ') || '–'})` : ''}.`)
  if (failed) {
    console.log(`${failed} Fehler.`)
    process.exit(1)
  }
  console.log('Alles in Ordnung.')
}
