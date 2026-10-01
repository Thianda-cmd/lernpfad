import type { Rng } from '../../lib/random'
import { combine, monoKey, neg, sumInput, sumTex, T, termTex, type Term } from '../poly'
import type { GenInfo, Level, Problem, Step } from '../types'
import { chance, dec1, int, nz, pick, shuffle, VAR_SETS, VAR_SETS3 } from './util'

/** Ein Ausdruck aus Summanden und (verschachtelten) Klammern. */
export type Item = { k: 't'; t: Term } | { k: 'g'; s: 1 | -1; items: Item[]; sq?: boolean }

export const t = (c: number, m = ''): Item => ({ k: 't', t: T(c, m) })
export const g = (s: 1 | -1, items: Item[], sq = false): Item => ({ k: 'g', s, items, sq })
export const terms = (...ts: [number, string][]): Item[] => ts.map(([c, m]) => t(c, m))

export function itemsTex(items: Item[]): string {
  return items
    .map((it, i) => {
      if (it.k === 't') return termTex(it.t, i === 0)
      const inner = itemsTex(it.items)
      const [l, r] = it.sq ? ['\\left[', '\\right]'] : ['(', ')']
      const sign = it.s < 0 ? (i === 0 ? '-' : ' - ') : i === 0 ? '' : ' + '
      return `${sign}${l}${inner}${r}`
    })
    .join('')
}

const hasGroups = (items: Item[]) => items.some((i) => i.k === 'g')

/** Innerste Klammern auflösen (ein Schritt). */
function resolveInnermost(items: Item[]): Item[] {
  const out: Item[] = []
  for (const it of items) {
    if (it.k === 't') out.push(it)
    else if (!hasGroups(it.items)) {
      for (const x of it.items) {
        if (x.k === 't') out.push({ k: 't', t: it.s < 0 ? neg([x.t])[0] : x.t })
      }
    } else out.push({ ...it, items: resolveInnermost(it.items) })
  }
  return out
}

function flatTerms(items: Item[]): Term[] {
  return items.flatMap((i) => (i.k === 't' ? [i.t] : []))
}

/** Alle Klammern auflösen, ohne zusammenzufassen. */
export function flattenAll(items: Item[]): Term[] {
  let cur = items
  while (hasGroups(cur)) cur = resolveInnermost(cur)
  return flatTerms(cur)
}

export function hasBrackets(items: Item[]) {
  return hasGroups(items)
}

/** Gleichartige Terme nebeneinander stellen (Reihenfolge des ersten Auftretens) */
export function groupLike(ts: Term[]): Term[] {
  const order: string[] = []
  const map = new Map<string, Term[]>()
  for (const x of ts) {
    const k = monoKey(x.m)
    if (!map.has(k)) {
      map.set(k, [])
      order.push(k)
    }
    map.get(k)!.push(x)
  }
  // Konstanten nach hinten
  order.sort((a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0))
  return order.flatMap((k) => map.get(k)!)
}

/** Lösungsweg für das Auflösen von Klammern. */
export function klammerSteps(items: Item[]): { steps: Step[]; result: Term[] } {
  const steps: Step[] = []
  let cur = items
  let round = 0
  while (hasGroups(cur)) {
    const nested = cur.some((i) => i.k === 'g' && hasGroups(i.items))
    cur = resolveInnermost(cur)
    steps.push({
      tex: '= ' + itemsTex(cur),
      note:
        round === 0
          ? nested
            ? 'Von innen nach außen: zuerst die runden Klammern auflösen.'
            : 'Plusklammer: einfach weglassen. Minusklammer: jedes Vorzeichen in der Klammer umdrehen.'
          : 'Jetzt die eckigen Klammern auflösen – wieder auf das Vorzeichen davor achten.',
    })
    round++
  }
  const flat = flatTerms(cur)
  const grouped = groupLike(flat)
  const result = combine(flat)
  if (grouped.length > result.length && sumTex(grouped) !== sumTex(flat))
    steps.push({ tex: '= ' + sumTex(grouped), note: 'Gleichartige Terme nebeneinander ordnen.' })
  steps.push({ tex: '= ' + sumTex(result), note: 'Zusammenfassen – fertig.' })
  return { steps, result }
}

export function itemVars(items: Item[], out = new Set<string>()): string[] {
  for (const it of items) {
    if (it.k === 't') Object.keys(it.t.m).forEach((v) => out.add(v))
    else itemVars(it.items, out)
  }
  return [...out].sort()
}

export function klammerProblem(items: Item[], prompt = 'Löse die Klammern auf und fasse zusammen.'): Problem {
  const { steps, result } = klammerSteps(items)
  return {
    prompt,
    tex: itemsTex(items),
    answer: { kind: 'expr', value: sumInput(result), vars: itemVars(items), noGroups: true, maxTerms: Math.max(1, result.length) },
    steps,
    hint: 'Steht ein Minus vor der Klammer, dreht sich jedes Vorzeichen in der Klammer um.',
  }
}

/* ---------------------------- Generatoren ---------------------------- */

function lin(rng: Rng, vars: readonly string[], n: number, decimals: boolean): Item[] {
  const vs = shuffle(rng, vars).slice(0, n)
  return vs.map((v) => t(decimals ? nz(rng, -9, 9) + (chance(rng, 0.6) ? dec1(rng, 0.1, 0.9) : 0) : nz(rng, -12, 12), v))
}

function level1(rng: Rng): Problem {
  const [a, b] = pick(rng, VAR_SETS)
  const withConst = chance(rng, 0.5)
  const mk = () => (withConst ? [t(nz(rng, -15, 15), a), t(nz(rng, -20, 20))] : [t(nz(rng, -12, 12), a), t(nz(rng, -12, 12), b)])
  const items: Item[] = [g(1, mk()), g(chance(rng, 0.75) ? -1 : 1, mk())]
  if (chance(rng, 0.4)) items.push(g(chance(rng, 0.5) ? -1 : 1, mk()))
  return klammerProblem(items)
}

function level2(rng: Rng): Problem {
  const [a, b] = pick(rng, VAR_SETS)
  const dec = chance(rng, 0.6)
  const mk = () => lin(rng, [a, b], 2, dec).sort((p, q) => (p.k === 't' && p.t.m[a] ? -1 : 0) - (q.k === 't' && q.t.m[a] ? -1 : 0))
  const items: Item[] = [g(1, mk()), g(-1, mk()), g(chance(rng, 0.7) ? -1 : 1, mk())]
  if (chance(rng, 0.35)) items.unshift(t(nz(rng, 20, 120), a))
  // Quadratische Terme wie 2a² + 3a
  if (!dec && chance(rng, 0.4)) {
    const sq = `${a}2`
    const q = () => [t(nz(rng, -12, 12), sq), t(nz(rng, -9, 9), a)]
    return klammerProblem([g(1, q()), g(chance(rng, 0.5) ? 1 : -1, q()), g(-1, q())])
  }
  return klammerProblem(items)
}

function level3(rng: Rng): Problem {
  const [u, v, w] = pick(rng, VAR_SETS3)
  const c = () => nz(rng, -15, 15)
  const variant = int(rng, 0, 2)
  if (variant === 0) {
    // 4u + [11v − (4u + 3w)] − [21u + (66u − 14w)]
    return klammerProblem([
      t(nz(rng, 2, 12), u),
      g(1, [t(nz(rng, 2, 15), v), g(-1, [t(c(), u), t(c(), w)])], true),
      g(-1, [t(nz(rng, 2, 25), u), g(chance(rng, 0.5) ? 1 : -1, [t(c(), u), t(c(), w)])], true),
    ])
  }
  if (variant === 1) {
    // 3x³ − [24x² + 5x − (6x + 4x²)] − [2x² − (6x + 4x³) − 12x]
    const x = u
    return klammerProblem([
      t(nz(rng, 2, 6), `${x}3`),
      g(-1, [t(nz(rng, 5, 25), `${x}2`), t(c(), x), g(-1, [t(nz(rng, 2, 9), x), t(nz(rng, 2, 6), `${x}2`)])], true),
      g(-1, [t(nz(rng, 2, 6), `${x}2`), g(-1, [t(nz(rng, 2, 9), x), t(nz(rng, 2, 5), `${x}3`)]), t(c(), x)], true),
    ])
  }
  // (3x + 6y) − [(7x − 3y) − (5x − 7y) + (x − y)]
  return klammerProblem([
    g(1, [t(c(), u), t(c(), v)]),
    g(-1, [g(1, [t(c(), u), t(c(), v)]), g(-1, [t(c(), u), t(c(), v)]), g(1, [t(c(), u), t(c(), v)])], true),
  ])
}

/* ---------------------------- Ausklammern ---------------------------- */

const gcdN = (a: number, b: number): number => (b ? gcdN(b, a % b) : Math.abs(a))

/** Gemeinsamen Faktor ausklammern: factor · (inner) ist das Ziel */
export function ausklammernProblem(factor: Term, inner: Term[]): Problem {
  const full = inner.map((x) => ({ c: factor.c * x.c, m: Object.fromEntries([...new Set([...Object.keys(factor.m), ...Object.keys(x.m)])].map((k) => [k, (factor.m[k] ?? 0) + (x.m[k] ?? 0)])) }))
  const fTex = termTex(factor, true)
  const coefs = full.map((x) => Math.abs(x.c))
  const vars = Object.keys(factor.m)
  const frac = full
    .map((x, i) => {
      const sign = x.c < 0 ? (i === 0 ? '-' : ' - ') : i === 0 ? '' : ' + '
      return `${sign}\\frac{${termTex({ c: Math.abs(x.c), m: x.m }, true)}}{${fTex}}`
    })
    .join('')
  const steps: Step[] = [
    {
      tex: `\\text{ggT}(${coefs.join(', ')}) = ${factor.c}${vars.length ? `,\\quad ${vars.join(', ')} \\text{ in jedem Summanden}` : ''}`,
      note: 'Größte Zahl, die alle Koeffizienten teilt, und Variablen, die in **jedem** Summanden stecken.',
    },
    { tex: `= ${fTex}\\left(${frac}\\right)`, note: 'Jeden Summanden durch den Faktor teilen.' },
    { tex: `= ${fTex}(${sumTex(inner)})`, note: 'Probe: wieder ausmultiplizieren ergibt den Ausgangsterm.' },
  ]
  const allVars = [...new Set(full.flatMap((x) => Object.keys(x.m)))].sort()
  return {
    prompt: 'Klammere den größten gemeinsamen Faktor aus.',
    tex: sumTex(full),
    answer: { kind: 'factor', value: `${sumInput([factor])}*(${sumInput(inner)})`, factor: sumInput([factor]), vars: allVars },
    steps,
    hint: 'Was steckt in jedem Summanden? Zahl (ggT) und gemeinsame Variablen vor die Klammer.',
  }
}

function ausklammern(rng: Rng, level: Level): Problem {
  for (;;) {
    const k = int(rng, 2, 9)
    const v = level === 1 ? '' : pick(rng, ['a', 'x', 'b'])
    const inner: Term[] = []
    const pool = shuffle(rng, level === 3 ? [v, 'y', 'z', ''] : ['x', 'y', 'z', '']).filter((p) => p !== v || level === 3)
    const n = level === 1 ? 2 : 3
    for (let i = 0; i < n; i++) inner.push(T(nz(rng, -9, 9), pool[i]))
    inner.sort((p, q) => (Object.keys(q.m).length ? 1 : 0) - (Object.keys(p.m).length ? 1 : 0))
    if (inner.map((x) => x.c).reduce((a, b) => gcdN(a, b)) !== 1) continue
    // keine Variable darf in allen Klammersummanden stecken, sonst wäre der Faktor nicht maximal
    const common = Object.keys(inner[0].m).filter((key) => inner.every((x) => x.m[key]))
    if (common.length) continue
    if (inner[0].c < 0) inner.forEach((x) => (x.c = -x.c))
    return ausklammernProblem(T(k, v), inner)
  }
}

export const KLAMMER_GENS: GenInfo[] = [
  {
    id: 'klammern',
    title: 'Klammern auflösen',
    gen: (rng, level: Level) => (level === 1 ? level1(rng) : level === 2 ? level2(rng) : level3(rng)),
  },
  { id: 'ausklammern', title: 'Ausklammern', gen: (rng, level) => ausklammern(rng, level) },
]
