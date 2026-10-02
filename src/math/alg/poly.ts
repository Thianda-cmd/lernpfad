/**
 * Summen aus Monomen mit exakten Koeffizienten (3x²y − ⁷⁄₁₂ab + 5) und ihre TeX-Ausgabe.
 * Negative Hochzahlen sind erlaubt (Bruchterme wie 2/(3z)).
 */
import { add, CalcError, isInt, isOne, isTerminating, isZero, mul, neg, ONE, q, qAbsTex, qpow, qTex, sign, type Fmt, type Q, div as qdiv, eq as qeq } from '../q'

export type Mono = Record<string, number>

export interface Term {
  c: Q
  m: Mono
}

export const T = (c: Q, m: Mono = {}): Term => ({ c, m: clean(m) })
export const numTerm = (c: Q): Term => ({ c, m: {} })

function clean(m: Mono): Mono {
  const out: Mono = {}
  for (const k of Object.keys(m)) if (m[k]) out[k] = m[k]
  return out
}

/** π steht vorne, dann alphabetisch (Großbuchstaben vor Kleinbuchstaben gleichen Namens egal) */
export function varOrder(a: string, b: string) {
  if (a === b) return 0
  if (a === 'π') return -1
  if (b === 'π') return 1
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la !== lb) return la < lb ? -1 : 1
  return a < b ? -1 : 1
}

export const vars = (m: Mono) => Object.keys(m).sort(varOrder)

export function monoKey(m: Mono) {
  return vars(m)
    .map((k) => `${k}^${m[k]}`)
    .join('·')
}

export const monoDeg = (m: Mono) => Object.values(m).reduce((s, e) => s + e, 0)
export const isConst = (t: Term) => Object.keys(t.m).length === 0

export function monoMul(a: Mono, b: Mono): Mono {
  const out: Mono = { ...a }
  for (const k of Object.keys(b)) out[k] = (out[k] ?? 0) + b[k]
  return clean(out)
}

export function monoPow(a: Mono, k: number): Mono {
  const out: Mono = {}
  for (const v of Object.keys(a)) out[v] = a[v] * k
  return clean(out)
}

export const termMul = (a: Term, b: Term): Term => ({ c: mul(a.c, b.c), m: monoMul(a.m, b.m) })
export const termDiv = (a: Term, b: Term): Term => ({ c: qdiv(a.c, b.c), m: monoMul(a.m, monoPow(b.m, -1)) })
export const termNeg = (a: Term): Term => ({ c: neg(a.c), m: a.m })
export const termAbs = (a: Term): Term => (sign(a.c) < 0 ? termNeg(a) : a)
export function termPow(a: Term, k: number): Term {
  return { c: qpow(a.c, k), m: monoPow(a.m, k) }
}
export const negTerms = (ts: Term[]) => ts.map(termNeg)
export const sameMono = (a: Mono, b: Mono) => monoKey(a) === monoKey(b)
export const termEq = (a: Term, b: Term) => qeq(a.c, b.c) && sameMono(a.m, b.m)

export function polyMul(a: Term[], b: Term[]): Term[] {
  const out: Term[] = []
  for (const x of a) for (const y of b) out.push(termMul(x, y))
  return out
}

/** Gleichartige Terme zusammenfassen (Reihenfolge des ersten Auftretens), Nullen weglassen. */
export function combine(ts: Term[]): Term[] {
  const map = new Map<string, Term>()
  for (const t of ts) {
    const k = monoKey(t.m)
    const ex = map.get(k)
    if (ex) ex.c = add(ex.c, t.c)
    else map.set(k, { c: t.c, m: t.m })
  }
  return [...map.values()].filter((t) => !isZero(t.c))
}

/** Sortierung: Hauptvariable (falls angegeben) nach Grad, dann Gesamtgrad, dann alphabetisch; Zahlen zuletzt. */
export function sortTerms(ts: Term[], main?: string): Term[] {
  return [...ts].sort((a, b) => {
    if (main) {
      const d = (b.m[main] ?? 0) - (a.m[main] ?? 0)
      if (d) return d
    }
    const ca = isConst(a)
    const cb = isConst(b)
    if (ca !== cb) return ca ? 1 : -1
    const d = monoDeg(b.m) - monoDeg(a.m)
    if (d) return d
    const ka = vars(a.m)
    const kb = vars(b.m)
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
      const o = varOrder(ka[i], kb[i])
      if (o) return o
      const e = b.m[kb[i]] - a.m[ka[i]]
      if (e) return e
    }
    return ka.length - kb.length
  })
}

/** Vereinfachen: zusammenfassen und sortieren */
export const simplifyPoly = (ts: Term[], main?: string) => sortTerms(combine(ts), main)

/** Gleichartige Terme nebeneinander (Reihenfolge des ersten Auftretens, Zahlen zuletzt) */
export function groupLike(ts: Term[], main?: string): Term[][] {
  const order: string[] = []
  const map = new Map<string, Term[]>()
  for (const t of ts) {
    const k = monoKey(t.m)
    if (!map.has(k)) {
      map.set(k, [])
      order.push(k)
    }
    map.get(k)!.push(t)
  }
  const groups = order.map((k) => map.get(k)!)
  // nach dem ersten Vertreter sortieren wie das Endergebnis
  const rep = sortTerms(
    groups.map((g) => g[0]),
    main,
  )
  return rep.map((r) => groups.find((g) => g[0] === r)!)
}

export const hasLike = (ts: Term[]) => new Set(ts.map((t) => monoKey(t.m))).size < ts.length

export function polyEq(a: Term[], b: Term[]) {
  const A = combine(a)
  const B = combine(b)
  if (A.length !== B.length) return false
  return A.every((x) => B.some((y) => termEq(x, y)))
}

export const polyVars = (ts: Term[]) => [...new Set(ts.flatMap((t) => Object.keys(t.m)))].sort(varOrder)
export const degIn = (ts: Term[], v: string) => ts.reduce((d, t) => Math.max(d, t.m[v] ?? 0), 0)
export const minDegIn = (ts: Term[], v: string) => ts.reduce((d, t) => Math.min(d, t.m[v] ?? 0), Infinity)

export function evalTerms(ts: Term[], env: Record<string, Q>): Q {
  let s = q(0)
  for (const t of ts) {
    let v = t.c
    for (const k of Object.keys(t.m)) {
      const x = env[k]
      if (!x) throw new CalcError(`Für „${k}“ fehlt ein Wert.`)
      v = mul(v, qpow(x, t.m[k]))
    }
    s = add(s, v)
  }
  return s
}

/* ---------------------------- TeX ---------------------------- */

const GREEK: Record<string, string> = {
  α: '\\alpha',
  β: '\\beta',
  γ: '\\gamma',
  δ: '\\delta',
  ε: '\\varepsilon',
  ζ: '\\zeta',
  η: '\\eta',
  θ: '\\vartheta',
  ι: '\\iota',
  κ: '\\kappa',
  λ: '\\lambda',
  μ: '\\mu',
  ν: '\\nu',
  ξ: '\\xi',
  π: '\\pi',
  ρ: '\\rho',
  σ: '\\sigma',
  τ: '\\tau',
  φ: '\\varphi',
  χ: '\\chi',
  ψ: '\\psi',
  ω: '\\omega',
  Δ: '\\Delta',
}

/** Variablenname als TeX: A_R → A_{R}, Δ → \Delta, ä → \text{ä} */
export function varTex(name: string): string {
  const [b, s] = name.split('_')
  const base = GREEK[b] ? GREEK[b] + ' ' : /[äöüÄÖÜ]/.test(b) ? `\\text{${b}}` : b
  return s ? `${base}_{${s}}` : base
}

/** Variablenteil mit positiven Hochzahlen: x^{2}y */
function varsTex(m: Mono, which: 1 | -1): string {
  return vars(m)
    .filter((k) => Math.sign(m[k]) === which)
    .map((k) => {
      const e = Math.abs(m[k])
      const v = varTex(k)
      return e === 1 ? v : `${v.includes('_') ? `{${v}}` : v}^{${e}}`
    })
    .join('')
}

export function monoTex(m: Mono): string {
  return varsTex(m, 1)
}

/** Betrag eines Terms als TeX (ohne Vorzeichen) */
export function termAbsTex(t: Term, f: Fmt = {}): string {
  const A = sign(t.c) < 0 ? neg(t.c) : t.c
  const top = varsTex(t.m, 1)
  const bot = varsTex(t.m, -1)
  if (!bot) {
    if (!top) return qAbsTex(A, f)
    if (isOne(A)) return top
    if (isInt(A) || (f.dec && isTerminating(A))) return qAbsTex(A, f) + top
    // ⁷⁄₁₂x wird als \frac{7x}{12} geschrieben
    return `\\frac{${A.n === 1n ? '' : A.n}${top}}{${A.d}}`
  }
  // Variablen im Nenner: \frac{2}{3z}
  const numPart = `${A.n === 1n && top ? '' : A.n}${top}`
  const denPart = `${A.d === 1n ? '' : A.d}${bot}`
  return `\\frac{${numPart}}{${denPart}}`
}

/** Ein Summand. `first`: ohne führendes Plus. */
export function termTex(t: Term, first: boolean, f: Fmt = {}): string {
  const body = termAbsTex(t, f)
  const negv = sign(t.c) < 0
  if (first) return (negv ? '-' : '') + body
  return (negv ? ' - ' : ' + ') + body
}

export function sumTex(ts: Term[], f: Fmt = {}, first = true): string {
  if (!ts.length) return first ? '0' : ' + 0'
  return ts.map((t, i) => termTex(t, first && i === 0, f)).join('')
}

/** Faktor mit Klammer, wenn er ein Vorzeichen hat oder eine Summe ist */
export function factorTex(ts: Term[], f: Fmt = {}): string {
  if (ts.length === 1 && sign(ts[0].c) > 0) return termAbsTex(ts[0], f)
  return `\\left(${sumTex(ts, f)}\\right)`
}

export const ONE_TERM: Term = { c: ONE, m: {} }

/** „3x“ als Faktor in einem Produkt: negative Zahlen in Klammern */
export function termFactorTex(t: Term, f: Fmt = {}) {
  return sign(t.c) < 0 ? `\\left(${termTex(t, true, f)}\\right)` : termAbsTex(t, f)
}

export { qTex }
