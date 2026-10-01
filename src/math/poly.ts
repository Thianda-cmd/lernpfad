/**
 * Summen aus Monomen (z. B. 3,2p − 7,1q + 4x²y) für Aufgaben-Generatoren:
 * Zwischenschritte als TeX, Zusammenfassen, Ausmultiplizieren.
 */
import { round, tn } from './num'

export type Mono = Record<string, number>
export interface Term {
  c: number
  m: Mono
}

export const T = (c: number, m: Mono | string = {}): Term => ({ c, m: typeof m === 'string' ? monoFrom(m) : m })

/** „x2y“ → {x:2, y:1}; „ab“ → {a:1, b:1} */
export function monoFrom(s: string): Mono {
  const m: Mono = {}
  const re = /([a-zA-Z])(\d*)/g
  let r: RegExpExecArray | null
  while ((r = re.exec(s))) m[r[1]] = (m[r[1]] ?? 0) + (r[2] ? parseInt(r[2], 10) : 1)
  return m
}

export function monoKey(m: Mono) {
  return Object.keys(m)
    .filter((k) => m[k] !== 0)
    .sort()
    .map((k) => (m[k] === 1 ? k : `${k}^${m[k]}`))
    .join('')
}

export function monoDeg(m: Mono) {
  return Object.values(m).reduce((a, b) => a + b, 0)
}

export function monoTex(m: Mono) {
  return Object.keys(m)
    .filter((k) => m[k] !== 0)
    .sort()
    .map((k) => (m[k] === 1 ? k : `${k}^{${m[k]}}`))
    .join('')
}

function monoInput(m: Mono) {
  return Object.keys(m)
    .filter((k) => m[k] !== 0)
    .sort()
    .map((k) => (m[k] === 1 ? k : `${k}^${m[k]}`))
    .join('*')
}

export function mulMono(a: Mono, b: Mono): Mono {
  const out: Mono = { ...a }
  for (const k of Object.keys(b)) out[k] = (out[k] ?? 0) + b[k]
  return out
}

export function mulTerm(a: Term, b: Term): Term {
  return { c: round(a.c * b.c, 9), m: mulMono(a.m, b.m) }
}

export function neg(ts: Term[]): Term[] {
  return ts.map((t) => ({ c: -t.c, m: t.m }))
}

export function scale(ts: Term[], k: number): Term[] {
  return ts.map((t) => ({ c: round(t.c * k, 9), m: t.m }))
}

export function expand(a: Term[], b: Term[]): Term[] {
  const out: Term[] = []
  for (const x of a) for (const y of b) out.push(mulTerm(x, y))
  return out
}

/** Gleichartige Terme zusammenfassen; sortiert nach Grad, dann alphabetisch. */
export function combine(ts: Term[], sort = true): Term[] {
  const map = new Map<string, Term>()
  const order: string[] = []
  for (const t of ts) {
    const k = monoKey(t.m)
    const ex = map.get(k)
    if (ex) ex.c = round(ex.c + t.c, 9)
    else {
      map.set(k, { c: t.c, m: t.m })
      order.push(k)
    }
  }
  let out = order.map((k) => map.get(k)!).filter((t) => Math.abs(t.c) > 1e-9)
  if (sort)
    out = out.sort((a, b) => {
      const d = monoDeg(b.m) - monoDeg(a.m)
      if (d) return d
      const ka = monoKey(a.m)
      const kb = monoKey(b.m)
      if (!ka) return 1
      if (!kb) return -1
      return ka < kb ? -1 : ka > kb ? 1 : 0
    })
  return out
}

/** Ein Summand als TeX. `first`: ohne führendes „+“. */
export function termTex(t: Term, first = false, digits = 4) {
  const mono = monoTex(t.m)
  const abs = Math.abs(t.c)
  const coef = mono && Math.abs(abs - 1) < 1e-12 ? '' : tn(abs, digits)
  const body = coef + mono || '0'
  if (first) return (t.c < 0 ? '-' : '') + body
  return (t.c < 0 ? ' - ' : ' + ') + body
}

export function sumTex(ts: Term[], digits = 4) {
  if (!ts.length) return '0'
  return ts.map((t, i) => termTex(t, i === 0, digits)).join('')
}

/** Summe in Eingabe-Syntax für den Antwortvergleich. */
export function sumInput(ts: Term[]) {
  if (!ts.length) return '0'
  return ts
    .map((t, i) => {
      const mono = monoInput(t.m)
      const c = String(round(Math.abs(t.c), 9))
      const body = mono ? `${c}*${mono}` : c
      const sign = t.c < 0 ? '-' : i === 0 ? '' : '+'
      return sign + body
    })
    .join('')
}

/** Summe als geklammerter TeX-Faktor: (4p + 2,7q) */
export function parTex(ts: Term[]) {
  return `(${sumTex(ts)})`
}

/** Kleine Hilfe: TeX eines Faktors vor einer Klammer, z. B. „5a“, „-3y“. */
export function factorTex(t: Term) {
  return termTex(t, true)
}
