import type { Rng } from '../../lib/random'
import { tn } from '../num'
import { combine, expand, monoTex, neg, sumInput, sumTex, T, termTex, type Term } from '../poly'
import type { GenInfo, Level, Problem, Step } from '../types'
import { chance, int, nz, pick, VAR_SETS, VAR_SETS3 } from './util'

/** Summe von Produkten: s · (f1)(f2)… */
export interface Prod {
  s: 1 | -1
  f: Term[][]
  /** gleiche Faktoren als Quadrat schreiben */
  sq?: boolean
  /** einzelnen Faktor hinten anhängen: (…)·6x */
  trailing?: boolean
}

export const P = (...ts: [number, string][]): Term[] => ts.map(([c, m]) => T(c, m))

function factorTex(f: Term[], first: boolean) {
  if (f.length === 1) return first ? termTex(f[0], true) : `\\cdot ${f[0].c < 0 ? `(${termTex(f[0], true)})` : termTex(f[0], true)}`
  return `(${sumTex(f)})`
}

export function prodTex(p: Prod, first: boolean) {
  const sign = p.s < 0 ? (first ? '-' : ' - ') : first ? '' : ' + '
  let body: string
  if (p.sq && p.f.length === 2) body = `(${sumTex(p.f[0])})^2`
  else {
    const fs = p.trailing ? [...p.f.slice(1), p.f[0]] : p.f
    body = fs.map((f, i) => factorTex(f, i === 0)).join('')
  }
  // Minus vor einem führenden Einzelfaktor wie −2x(7x − 5y): kein Doppelvorzeichen
  if (!p.sq && !p.trailing && p.f[0].length === 1 && p.f[0][0].c < 0) {
    const f0 = { ...p.f[0][0], c: -p.f[0][0].c }
    const rest = p.f.slice(1).map((f) => factorTex(f, false)).join('')
    const s2 = p.s < 0 ? (first ? '' : ' + ') : first ? '-' : ' - '
    return `${s2}${termTex(f0, true)}${rest}`
  }
  return sign + body
}

export function sumProdTex(ps: Prod[]) {
  return ps.map((p, i) => prodTex(p, i === 0)).join('')
}

function expandProd(p: Prod): Term[] {
  let acc: Term[] = [T(1)]
  for (const f of p.f) acc = expand(acc, f)
  return acc
}

/** „3u·2u − 3u·6w + 4v·2u − 4v·6w“ */
function pairTex(a: Term[], b: Term[]) {
  const parts: string[] = []
  a.forEach((x) =>
    b.forEach((y) => {
      const s = Math.sign(x.c * y.c)
      const ax = termTex({ c: Math.abs(x.c), m: x.m }, true)
      const by = termTex({ c: Math.abs(y.c), m: y.m }, true)
      parts.push(`${parts.length === 0 ? (s < 0 ? '-' : '') : s < 0 ? ' - ' : ' + '}${ax} \\cdot ${by}`)
    }),
  )
  return parts.join('')
}

export function ausmultSteps(ps: Prod[]): { steps: Step[]; result: Term[] } {
  const steps: Step[] = []
  const expanded = ps.map(expandProd)
  const result = combine(ps.flatMap((p, i) => (p.s < 0 ? neg(expanded[i]) : expanded[i])))
  const single = ps.length === 1 && ps[0].s === 1 && ps[0].f.length === 2
  if (single) {
    const [a, b] = ps[0].f
    steps.push({
      tex: '= ' + pairTex(a, b),
      note: a.length === 1 || b.length === 1 ? 'Den Faktor mit jedem Summanden in der Klammer multiplizieren.' : 'Jeder Summand der ersten Klammer mal jeder Summand der zweiten Klammer.',
    })
    const raw = expanded[0]
    steps.push({ tex: '= ' + sumTex(raw), note: 'Vorzeichenregel: Plus mal Minus ergibt Minus, Minus mal Minus ergibt Plus.' })
    if (combine(raw).length < raw.length) steps.push({ tex: '= ' + sumTex(result), note: 'Gleichartige Terme zusammenfassen.' })
    return { steps, result }
  }
  // mehrere Produkte: erst jedes Produkt ausmultiplizieren (in Klammern), dann Minusklammern auflösen
  const hasNeg = ps.some((p) => p.s < 0)
  steps.push({
    tex:
      '= ' +
      ps
        .map((p, i) => {
          const inner = sumTex(expanded[i])
          const sign = p.s < 0 ? (i === 0 ? '-' : ' - ') : i === 0 ? '' : ' + '
          return hasNeg || ps.length > 1 ? `${sign}(${inner})` : inner
        })
        .join(''),
    note: ps.some((p) => p.sq) ? 'Jedes Produkt einzeln ausmultiplizieren – das Quadrat als Klammer mal Klammer.' : 'Jedes Produkt einzeln ausmultiplizieren und in Klammern schreiben.',
  })
  const flat = ps.flatMap((p, i) => (p.s < 0 ? neg(expanded[i]) : expanded[i]))
  if (hasNeg) steps.push({ tex: '= ' + sumTex(flat), note: 'Minusklammern auflösen: alle Vorzeichen darin umdrehen.' })
  steps.push({ tex: '= ' + sumTex(result), note: 'Gleichartige Terme zusammenfassen.' })
  return { steps, result }
}

export function ausmultProblem(ps: Prod[], prompt = 'Multipliziere aus und fasse zusammen.'): Problem {
  const { steps, result } = ausmultSteps(ps)
  const vars = [...new Set(ps.flatMap((p) => p.f.flat().flatMap((x) => Object.keys(x.m))))].sort()
  return {
    prompt,
    tex: sumProdTex(ps),
    answer: { kind: 'expr', value: sumInput(result), vars, noGroups: true, maxTerms: Math.max(1, result.length) },
    steps,
    hint: 'Jeder Summand wird mit jedem Summanden multipliziert. Auf die Vorzeichen achten!',
  }
}

/* ---------------------------- Binomische Formeln ---------------------------- */

export function binomProblem(a: Term, b: Term, kind: 1 | 2 | 3): Problem {
  const f1 = [a, kind === 2 ? { ...b, c: -b.c } : b]
  const f2 = kind === 3 ? [a, { ...b, c: -b.c }] : f1
  const p: Prod = { s: 1, f: [f1, f2], sq: kind !== 3 }
  const result = combine(expand(f1, f2))
  const A = termTex(a, true)
  const B = termTex(b, true)
  const formula =
    kind === 1 ? '(a+b)^2 = a^2 + 2ab + b^2' : kind === 2 ? '(a-b)^2 = a^2 - 2ab + b^2' : '(a+b)(a-b) = a^2 - b^2'
  const sq = (t: Term) => {
    const ks = Object.keys(t.m)
    const simple = (ks.length === 0 && t.c > 0) || (ks.length === 1 && t.c === 1 && t.m[ks[0]] === 1)
    return simple ? `${termTex(t, true)}^2` : `(${termTex(t, true)})^2`
  }
  const steps: Step[] = [
    { tex: `a = ${A},\\quad b = ${B}`, note: `${kind}. binomische Formel: $${formula}$` },
    {
      tex:
        kind === 3
          ? `= ${sq(a)} - ${sq(b)}`
          : `= ${sq(a)} ${kind === 1 ? '+' : '-'} 2 \\cdot ${A} \\cdot ${B} + ${sq(b)}`,
      note: 'In die Formel einsetzen.',
    },
    { tex: '= ' + sumTex(result), note: kind === 3 ? 'Die gemischten Glieder heben sich weg.' : 'Ausrechnen – das Mittelglied nicht vergessen!' },
  ]
  const vars = [...new Set([...Object.keys(a.m), ...Object.keys(b.m)])].sort()
  return {
    prompt: 'Multipliziere mit einer binomischen Formel aus.',
    tex: sumProdTex([p]),
    answer: { kind: 'expr', value: sumInput(result), vars, noGroups: true, maxTerms: result.length },
    steps,
    hint: kind === 3 ? 'Plus-Minus-Formel: $(a+b)(a-b) = a^2 - b^2$' : `Mittelglied: $2ab$ – ${kind === 2 ? 'mit Minus' : 'mit Plus'}`,
  }
}

/* ---------------------------- Generatoren ---------------------------- */

function mono(rng: Rng, v: string, maxC = 9) {
  return T(nz(rng, -maxC, maxC), v)
}

function level1(rng: Rng): Problem {
  const vs = pick(rng, VAR_SETS3)
  const k = chance(rng, 0.5) ? T(nz(rng, 2, 9), pick(rng, ['a', 'b', 'k', 'r'])) : T(nz(rng, -9, 9))
  const n = int(rng, 2, 3)
  const inner = vs.slice(0, n).map((v) => mono(rng, v, 12))
  if (k.c === 1 && !Object.keys(k.m).length) k.c = 3
  return ausmultProblem([{ s: 1, f: [[k], inner] }])
}

function level2(rng: Rng): Problem {
  const [x] = pick(rng, VAR_SETS)
  if (chance(rng, 0.55)) {
    // (x + 4)(x + 5)
    return ausmultProblem([{ s: 1, f: [[T(1, x), T(nz(rng, -12, 20))], [T(chance(rng, 0.7) ? 1 : int(rng, 2, 4), x), T(nz(rng, -20, 20))]] }])
  }
  // (3u + 4v)(2u − 6w)
  const [u, v, w] = pick(rng, VAR_SETS3)
  return ausmultProblem([{ s: 1, f: [[mono(rng, u), mono(rng, v)], [mono(rng, u), mono(rng, chance(rng, 0.5) ? w : v)]] }])
}

function level3(rng: Rng): Problem {
  const [a, b] = pick(rng, VAR_SETS)
  const variant = int(rng, 0, 3)
  if (variant === 0) {
    const kind = pick(rng, [1, 2, 3] as const)
    const A = T(int(rng, 1, 5), a)
    const B = chance(rng, 0.5) ? T(int(rng, 1, 9)) : T(int(rng, 1, 5), b)
    return binomProblem(A, B, kind)
  }
  if (variant === 1) {
    // (4a − 3b)(a + 5b) − (2a + b)²
    const p1: Prod = { s: 1, f: [[mono(rng, a, 6), mono(rng, b, 6)], [mono(rng, a, 6), mono(rng, b, 6)]] }
    const sq = [T(int(rng, 1, 4), a), T(nz(rng, -4, 4), b)]
    return ausmultProblem([p1, { s: -1, f: [sq, sq], sq: true }])
  }
  if (variant === 2) {
    // 3y(8x − 6y + 4z) − (3x + 4y − 5z)·6x − 2x(7x − 5y)
    const [x, y, z] = pick(rng, VAR_SETS3)
    return ausmultProblem([
      { s: 1, f: [[T(int(rng, 2, 5), y)], [mono(rng, x), mono(rng, y), mono(rng, z)]] },
      { s: -1, f: [[T(int(rng, 2, 6), x)], [mono(rng, x), mono(rng, y), mono(rng, z)]], trailing: true },
      { s: 1, f: [[T(-int(rng, 2, 5), x)], [mono(rng, x), mono(rng, y)]] },
    ])
  }
  // (x² + 1)·2x  bzw. (2 − x)²
  const x = a
  if (chance(rng, 0.5)) return ausmultProblem([{ s: 1, f: [[T(int(rng, 2, 6), x)], [T(1, `${x}2`), T(nz(rng, -9, 9))]], trailing: true }])
  return binomProblem(T(int(rng, 2, 9)), T(1, x), chance(rng, 0.5) ? 2 : 1)
}

export const AUSMULT_GENS: GenInfo[] = [
  {
    id: 'ausmultiplizieren',
    title: 'Ausmultiplizieren',
    gen: (rng, level: Level) => (level === 1 ? level1(rng) : level === 2 ? level2(rng) : level3(rng)),
  },
  {
    id: 'binomisch',
    title: 'Binomische Formeln',
    gen: (rng) => {
      const [a, b] = pick(rng, VAR_SETS)
      const A = T(int(rng, 1, 6), a)
      const B = chance(rng, 0.5) ? T(int(rng, 1, 12)) : T(int(rng, 1, 5), b)
      return binomProblem(A, B, pick(rng, [1, 2, 3] as const))
    },
  },
]

/** Hilfsfunktion für Texte: Monom als TeX */
export const mt = (c: number, m: string) => `${c === 1 ? '' : c === -1 ? '-' : tn(c)}${monoTex(T(1, m).m)}`
