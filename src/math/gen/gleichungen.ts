import type { Rng } from '../../lib/random'
import { fmt, gcd, tfrac, tn } from '../num'
import { combine, expand, monoKey, neg, scale, sumInput, sumTex, T, type Term } from '../poly'
import type { GenInfo, Level, Problem, Rel, Step } from '../types'
import { flattenAll, g, hasBrackets, itemsTex, t, type Item } from './klammern'
import { chance, int, nz, pick } from './util'

type R = '=' | Rel
const REL_TEX: Record<R, string> = { '=': '=', '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' }
const FLIP: Record<R, R> = { '=': '=', '<': '>', '>': '<', '≤': '≥', '≥': '≤' }

const isX = (tm: Term, v: string) => tm.m[v] === 1 && Object.keys(tm.m).length === 1
const xCoef = (ts: Term[], v: string) => ts.filter((x) => isX(x, v)).reduce((s, x) => s + x.c, 0)
const rest = (ts: Term[], v: string) => ts.filter((x) => !isX(x, v))

/** x-Terme zuerst, dann der Rest (Parameter vor Zahlen). */
function side(ts: Term[], v: string) {
  const c = combine(ts)
  return [...c.filter((x) => isX(x, v)), ...c.filter((x) => !isX(x, v))]
}

const eqTex = (L: Term[], rel: R, Rt: Term[]) => `${sumTex(L)} ${REL_TEX[rel]} ${sumTex(Rt)}`

function opTerms(ts: Term[]) {
  // Operation, die die Terme auf der anderen Seite entfernt: „| −3x“, „| +4a − 3b“
  const n = neg(ts)
  const s = sumTex(n)
  return '| ' + (s.startsWith('-') ? s : '+' + s)
}

function coefTex(k: number) {
  return k < 0 ? `(${tn(k)})` : tn(k)
}

export interface Solved {
  steps: Step[]
  /** Ergebnis als Terme (Zahl oder Term in den Parametern) */
  value: Term[]
  rel: R
  /** Lösung liegt als Bruch vor */
  frac?: [number, number]
}

/**
 * Löst eine lineare Gleichung/Ungleichung in v. Zeilen im Stil der Mitschrift:
 * jede Zeile trägt rechts die Umformung, die als Nächstes angewendet wird.
 */
export function solveLinear(Lin: Term[], Rin: Term[], v: string, rel: R = '=', pre: Step[] = []): Solved {
  const steps: Step[] = [...pre]
  let L = side(Lin, v)
  let Rt = side(Rin, v)
  let r = rel
  const Lx = xCoef(L, v)
  const Rx = xCoef(Rt, v)
  const k0 = Lx - Rx
  if (Math.abs(k0) < 1e-12) throw new Error('Keine eindeutige Lösung')
  // Gleichung: x dorthin bringen, wo der Koeffizient positiv bleibt. Ungleichung: immer links.
  const xLeft = rel !== '=' || k0 > 0
  const push = (op?: string, note?: string) => steps.push({ tex: eqTex(L, r, Rt), op, note })

  if (xLeft) {
    if (Math.abs(Rx) > 1e-12) {
      push(opTerms([T(Rx, v)]), 'Alle Terme mit ' + v + ' auf eine Seite.')
      L = side([...L, T(-Rx, v)], v)
      Rt = side(rest(Rt, v), v)
    }
    const Lr = rest(L, v)
    if (Lr.length) {
      push(opTerms(Lr), 'Alles ohne ' + v + ' auf die andere Seite.')
      Rt = side([...Rt, ...neg(Lr)], v)
      L = side(L.filter((x) => isX(x, v)), v)
    }
  } else {
    if (Math.abs(Lx) > 1e-12) {
      push(opTerms([T(Lx, v)]), `Die ${v}-Terme nach rechts bringen – so bleibt die Zahl vor ${v} positiv.`)
      Rt = side([...Rt, T(-Lx, v)], v)
      L = side(rest(L, v), v)
    }
    const Rr = rest(Rt, v)
    if (Rr.length) {
      push(opTerms(Rr), 'Alles ohne ' + v + ' auf die andere Seite.')
      L = side([...L, ...neg(Rr)], v)
      Rt = side(Rt.filter((x) => isX(x, v)), v)
    }
  }
  const k = xLeft ? xCoef(L, v) : xCoef(Rt, v)
  const other = xLeft ? Rt : L
  let value = other
  let frac: [number, number] | undefined
  const onlyNum = other.every((x) => !Object.keys(x.m).length)
  const num = onlyNum ? other.reduce((s, x) => s + x.c, 0) : 0
  if (Math.abs(k - 1) > 1e-12) {
    const flip = k < 0 && r !== '='
    push(`| :${coefTex(k)}`, flip ? '**Achtung:** Beim Teilen durch eine negative Zahl dreht sich das Relationszeichen um!' : `Durch ${tn(k)} teilen.`)
    if (flip) r = FLIP[r]
    value = scale(other, 1 / k)
    if (onlyNum && Number.isInteger(num) && Number.isInteger(k) && Math.abs(num / k - Math.round(num / k)) > 1e-9) {
      const gg = gcd(num, k)
      frac = [num / gg, k / gg]
      if (frac[1] < 0) frac = [-frac[0], -frac[1]]
    }
  }
  const valTex = frac ? tfrac(frac[0], frac[1]) : sumTex(value)
  if (xLeft) steps.push({ tex: `${v} ${REL_TEX[r]} ${valTex}` })
  else {
    // Ergebnis steht rechts: „8 = x“ → „x = 8“
    const rr = r
    if (Math.abs(k - 1) > 1e-12) steps.push({ tex: `${valTex} ${REL_TEX[rr]} ${v}` })
    else steps.push({ tex: eqTex(L, r, Rt) })
    steps.push({ tex: `${v} ${REL_TEX[FLIP[rr]]} ${valTex}`, note: 'Seiten tauschen.' })
    r = FLIP[rr]
  }
  return { steps, value, rel: r, frac }
}

/** Probe-Zeile: beide Seiten mit der Lösung ausrechnen. */
function probe(Lt: Term[], Rt: Term[], v: string, x: number): Step {
  const ev = (ts: Term[]) => ts.reduce((s, tm) => s + tm.c * (tm.m[v] ? x ** tm.m[v] : 1), 0)
  return { tex: `\\text{Probe: } ${tn(ev(Lt))} = ${tn(ev(Rt))}\\;\\checkmark`, note: `${v} = ${fmt(x)} in die Ausgangsgleichung einsetzen.` }
}

/** Gleichung aus zwei Seiten (mit Klammern) als Aufgabe. */
function clean(items: Item[]): Item[] {
  const out = items
    .filter((it) => it.k !== 't' || Math.abs(it.t.c) > 1e-12)
    .map((it) => (it.k === 'g' ? { ...it, items: clean(it.items) } : it))
  return out.length ? out : [t(0)]
}

export function equationProblem(Li0: Item[], Ri0: Item[], v = 'x', rel: R = '=', prompt?: string): Problem {
  const Li = clean(Li0)
  const Ri = clean(Ri0)
  const pre: Step[] = []
  const Lf = flattenAll(Li)
  const Rf = flattenAll(Ri)
  const orig = `${itemsTex(Li)} ${REL_TEX[rel]} ${itemsTex(Ri)}`
  if (hasBrackets(Li) || hasBrackets(Ri)) {
    pre.push({ tex: orig, note: 'Zuerst die Klammern auflösen.' })
    const flatTex = `${sumTex(Lf)} ${REL_TEX[rel]} ${sumTex(Rf)}`
    const combTex = `${sumTex(side(Lf, v))} ${REL_TEX[rel]} ${sumTex(side(Rf, v))}`
    if (combTex !== flatTex) pre.push({ tex: flatTex, note: 'Jetzt jede Seite für sich zusammenfassen.' })
  }
  const s = solveLinear(Lf, Rf, v, rel, pre)
  const onlyNum = s.value.every((x) => !Object.keys(x.m).length)
  const x = onlyNum ? s.value.reduce((a, b) => a + b.c, 0) : NaN
  if (rel === '=' && onlyNum) s.steps.push(probe(Lf, Rf, v, x))
  const params = [...new Set([...Lf, ...Rf].flatMap((tm) => Object.keys(tm.m)).filter((k) => k !== v))].sort()
  let answer: Problem['answer']
  if (rel !== '=') answer = { kind: 'ineq', rel: s.rel as Rel, value: onlyNum ? String(x) : sumInput(s.value), vars: params, variable: v }
  else if (onlyNum) answer = { kind: 'num', value: x, label: `${v} =`, fraction: !!s.frac, rel: 1e-6 }
  else answer = { kind: 'expr', value: sumInput(s.value), vars: params, label: `${v} =` }
  return {
    prompt: prompt ?? (rel === '=' ? (params.length ? `Löse nach $${v}$ auf.` : `Löse die Gleichung nach $${v}$.`) : `Löse die Ungleichung nach $${v}$.`),
    tex: orig,
    answer,
    steps: s.steps,
    hint:
      rel !== '='
        ? 'Wie bei Gleichungen umformen – aber beim Multiplizieren oder Teilen mit einer negativen Zahl das Zeichen umdrehen.'
        : 'Was du auf einer Seite machst, musst du auch auf der anderen Seite machen.',
  }
}

/* ---------------------------- Generatoren ---------------------------- */

function simple(rng: Rng): Problem {
  const x = int(rng, -6, 12)
  let a = nz(rng, -9, 12)
  let c = nz(rng, -9, 9)
  if (a === c) a += 2
  const b = nz(rng, -20, 20)
  const d = a * x + b - c * x
  const L = chance(rng, 0.5) ? [t(a, 'x'), t(b)] : [t(b), t(a, 'x')]
  const R = chance(rng, 0.3) ? [t(d), t(c, 'x')] : [t(c, 'x'), t(d)]
  return equationProblem(L, R)
}

function brackets(rng: Rng): Problem {
  const x = int(rng, -5, 10)
  // p ± (q x ± r) = s ± (u x ± w)   → d wird passend gewählt
  const a = nz(rng, -6, 9)
  const b = nz(rng, -12, 12)
  const s1: 1 | -1 = chance(rng, 0.7) ? -1 : 1
  const c = nz(rng, -6, 9)
  const d = nz(rng, -12, 12)
  const s2: 1 | -1 = chance(rng, 0.6) ? -1 : 1
  const k1 = int(rng, 2, 25)
  const lhsVal = k1 + s1 * (a * x + b)
  const kx = nz(rng, -5, 8)
  // rechte Seite: kx·x + k2 + s2·(c x + d)
  const rhsNoK = kx * x + s2 * (c * x + d)
  const k2 = lhsVal - rhsNoK
  const xCoefL = s1 * a
  const xCoefR = kx + s2 * c
  if (xCoefL === xCoefR) return brackets(rng)
  const L: Item[] = [t(k1), g(s1, [t(a, 'x'), t(b)])]
  const R: Item[] = kx ? [t(kx, 'x'), t(k2), g(s2, [t(c, 'x'), t(d)])] : [t(k2), g(s2, [t(c, 'x'), t(d)])]
  return equationProblem(L, R)
}

function binomEq(rng: Rng): Problem {
  // (x + a)² = (x + b)² + k   bzw. (2 − x)² = (2 + x)²
  const x = int(rng, -6, 8)
  const a = nz(rng, -7, 7)
  let b = nz(rng, -7, 7)
  if (a === b) b = -a || 3
  const k = 2 * (a - b) * x + a * a - b * b
  const sqTex = (c: number) => `(x ${c < 0 ? '-' : '+'} ${Math.abs(c)})^2`
  const Lx = combine(expand([T(1, 'x'), T(a)], [T(1, 'x'), T(a)]))
  const Rx = combine([...expand([T(1, 'x'), T(b)], [T(1, 'x'), T(b)]), T(k)])
  const orig = `${sqTex(a)} = ${sqTex(b)}${k ? (k < 0 ? ` - ${-k}` : ` + ${k}`) : ''}`
  const pre: Step[] = [
    { tex: orig, note: 'Beide Quadrate mit der binomischen Formel ausmultiplizieren.' },
    { tex: `${sumTex(Lx)} = ${sumTex(Rx)}`, op: '| -x^2', note: '$x^2$ steht auf beiden Seiten – es fällt weg.' },
  ]
  const L2 = Lx.filter((tm) => monoKey(tm.m) !== 'x^2')
  const R2 = Rx.filter((tm) => monoKey(tm.m) !== 'x^2')
  const s = solveLinear(L2, R2, 'x', '=', pre)
  const val = s.value.reduce((q, w) => q + w.c, 0)
  return {
    prompt: 'Löse die Gleichung nach $x$.',
    tex: orig,
    answer: { kind: 'num', value: val, label: 'x =', fraction: !!s.frac, rel: 1e-6 },
    steps: s.steps,
    hint: 'Nicht $(x+a)^2 = x^2 + a^2$ rechnen – das Mittelglied $2ax$ gehört dazu!',
  }
}

function inequality(rng: Rng): Problem {
  const x = int(rng, -5, 9)
  // Koeffizient links nach dem Umstellen negativ → Zeichen dreht sich
  let a = nz(rng, -6, 6)
  let c = a + int(rng, 1, 5)
  if (chance(rng, 0.25)) [a, c] = [c, a]
  const b = nz(rng, -15, 20)
  const d = a * x + b - c * x
  const rel = pick(rng, ['<', '>', '≤', '≥'] as const)
  if (chance(rng, 0.5)) {
    // mit Klammern wie 15 − (3x − 2) < 19 − (2x + 4):  k1 − (p x + q)  rel  k2 − (r x + s)
    const p = int(rng, 2, 7)
    const r = int(rng, 1, p - 1 || 1)
    const q = nz(rng, -9, 9)
    const s = nz(rng, -9, 9)
    const k1 = int(rng, 5, 25)
    const k2 = (r - p) * x + (k1 - q) + s
    if (p === r) return inequality(rng)
    return equationProblem([t(k1), g(-1, [t(p, 'x'), t(q)])], [t(k2), g(-1, [t(r, 'x'), t(s)])], 'x', rel)
  }
  return equationProblem([t(a, 'x'), t(b)], [t(c, 'x'), t(d)], 'x', rel)
}

function parameter(rng: Rng): Problem {
  // α x + A1 a + B1 b = β x + A2 a + B2 b  mit  x = m a + n b
  const dcoef = pick(rng, [1, 1, 2, -1, 3] as const)
  const m = nz(rng, -3, 4)
  const n = nz(rng, -3, 4)
  const beta = int(rng, 0, 5)
  const alpha = beta + dcoef
  const A1 = nz(rng, -5, 6)
  const B1 = nz(rng, -5, 6)
  const A2 = A1 + dcoef * m
  const B2 = B1 + dcoef * n
  const [p1, p2] = pick(rng, [
    ['a', 'b'],
    ['a', 'c'],
    ['m', 'n'],
  ] as const)
  const L: Item[] = [t(alpha, 'x'), t(A1, p1), t(B1, p2)].filter((it) => it.k !== 't' || it.t.c !== 0)
  const R: Item[] = [...(beta ? [t(beta, 'x')] : []), t(A2, p1), t(B2, p2)].filter((it) => it.k !== 't' || it.t.c !== 0)
  if (!R.length) R.push(t(0))
  return equationProblem(L, R, 'x', '=', `Löse nach $x$ auf ($${p1}$ und $${p2}$ sind feste Zahlen).`)
}

export const GLEICHUNG_GENS: GenInfo[] = [
  { id: 'linear', title: 'Lineare Gleichung', gen: (rng) => simple(rng) },
  { id: 'klammer-gleichung', title: 'Gleichung mit Klammern', gen: (rng, l: Level) => (l === 3 && chance(rng, 0.5) ? binomEq(rng) : brackets(rng)) },
  { id: 'ungleichung', title: 'Ungleichung', gen: (rng) => inequality(rng) },
  { id: 'parameter', title: 'Mit Parametern (x | …)', gen: (rng) => parameter(rng) },
]

export { binomEq }
