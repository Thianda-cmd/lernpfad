import type { Rng } from '../../lib/random'
import { lcm, tn } from '../num'
import { sumTex, T, type Term } from '../poly'
import type { GenInfo, Level, Problem, Step } from '../types'
import { solveLinear } from './gleichungen'
import { chance, int, nz, pick } from './util'

/** a·x + b·y = c */
export type Eq = [a: number, b: number, c: number]

export const eqTex = ([a, b, c]: Eq, x = 'x', y = 'y') => `${sumTex([T(a, x), T(b, y)].filter((t) => t.c !== 0))} = ${tn(c)}`
const lab = (s: string) => `\\text{${s}}\\colon\\ `

function solve2([a1, b1, c1]: Eq, [a2, b2, c2]: Eq): [number, number] {
  const d = a1 * b2 - a2 * b1
  return [(c1 * b2 - c2 * b1) / d, (a1 * c2 - a2 * c1) / d]
}

/** Additionsverfahren mit Lösungsweg */
export function additionSteps(e1: Eq, e2: Eq, x = 'x', y = 'y', pre: Step[] = []): { steps: Step[]; sol: [number, number] } {
  const steps: Step[] = [...pre]
  const [a1, b1] = e1
  const [a2, b2] = e2
  // Welche Variable fällt weg? Die mit dem kleineren kgV (bei Gleichstand y)
  const ly = lcm(Math.abs(b1), Math.abs(b2))
  const lx = lcm(Math.abs(a1), Math.abs(a2))
  const elimY = ly <= lx
  const c1 = elimY ? b1 : a1
  const c2 = elimY ? b2 : a2
  const L = elimY ? ly : lx
  const m1 = L / Math.abs(c1)
  let m2 = L / Math.abs(c2)
  if (Math.sign(c1) === Math.sign(c2)) m2 = -m2
  const E1: Eq = [e1[0] * m1, e1[1] * m1, e1[2] * m1]
  const E2: Eq = [e2[0] * m2, e2[1] * m2, e2[2] * m2]
  const mult = (m: number) => (m === 1 ? undefined : `| \\cdot ${m < 0 ? `(${m})` : m}`)
  const v = elimY ? y : x
  steps.push({ tex: lab('I') + eqTex(e1, x, y), op: mult(m1), note: `Ziel: Bei $${v}$ sollen Gegenzahlen stehen, damit $${v}$ beim Addieren wegfällt.` })
  steps.push({ tex: lab('II') + eqTex(e2, x, y), op: mult(m2) })
  if (m1 !== 1 || m2 !== 1) {
    steps.push({ tex: lab("I'") + eqTex(E1, x, y) })
    steps.push({ tex: lab("II'") + eqTex(E2, x, y), note: `$${tn(elimY ? E1[1] : E1[0])}${v}$ und $${tn(elimY ? E2[1] : E2[0])}${v}$ heben sich auf.` })
  }
  const S: Eq = [E1[0] + E2[0], E1[1] + E2[1], E1[2] + E2[2]]
  const k = elimY ? S[0] : S[1]
  const w = elimY ? x : y
  const val = S[2] / k
  steps.push({ tex: `${m1 !== 1 || m2 !== 1 ? "\\text{I'} + \\text{II'}" : '\\text{I} + \\text{II}'}\\colon\\ ${tn(k)}${w} = ${tn(S[2])}`, op: k !== 1 ? `| :${k < 0 ? `(${k})` : k}`: undefined, note: 'Beide Gleichungen addieren.' })
  steps.push({ tex: `${w} = ${tn(val)}` })
  // Einsetzen in die Gleichung mit dem einfacheren Koeffizienten
  const useFirst = Math.abs(elimY ? e1[1] : e1[0]) <= Math.abs(elimY ? e2[1] : e2[0])
  const e = useFirst ? e1 : e2
  const ca = elimY ? e[0] : e[1]
  const cb = elimY ? e[1] : e[0]
  const other = elimY ? y : x
  const rhsTerms: Term[] = [T(e[2])]
  const lhs: Term[] = [T(ca * val), T(cb, other)]
  steps.push({ tex: `${w} = ${tn(val)} \\text{ in ${useFirst ? 'I' : 'II'}}\\colon\\ ${tn(ca)} \\cdot ${val < 0 ? `(${tn(val)})` : tn(val)} ${cb < 0 ? '-' : '+'} ${Math.abs(cb) === 1 ? '' : tn(Math.abs(cb))}${other} = ${tn(e[2])}`, note: 'Den gefundenen Wert in eine Ausgangsgleichung einsetzen.' })
  const s = solveLinear(lhs, rhsTerms, other)
  steps.push(...s.steps)
  const otherVal = s.value.reduce((q, t) => q + t.c, 0)
  const sol: [number, number] = elimY ? [val, otherVal] : [otherVal, val]
  steps.push({ tex: `\\mathbb{L} = \\{(${tn(sol[0])} \\mid ${tn(sol[1])})\\}`, note: 'Lösung als Zahlenpaar $(x \\mid y)$ angeben. Probe in der anderen Gleichung lohnt sich!' })
  return { steps, sol }
}

export function additionProblem(e1: Eq, e2: Eq, raw?: [string, string]): Problem {
  const pre: Step[] = raw
    ? [
        { tex: `${lab('I')}${raw[0]}`, note: 'Zuerst ordnen: $x$ und $y$ nach links, Zahlen nach rechts.' },
        { tex: `${lab('II')}${raw[1]}` },
      ]
    : []
  const { steps, sol } = additionSteps(e1, e2, 'x', 'y', pre)
  return {
    prompt: 'Löse das Gleichungssystem mit dem Additionsverfahren.',
    tex: `\\begin{aligned} \\text{I}\\colon\\ & ${raw ? raw[0] : eqTex(e1)} \\\\ \\text{II}\\colon\\ & ${raw ? raw[1] : eqTex(e2)} \\end{aligned}`,
    answer: { kind: 'nums', values: sol, labels: ['x', 'y'], ordered: true, rel: 1e-6, tol: 1e-6 },
    steps,
    hint: 'Eine oder beide Gleichungen so multiplizieren, dass vor einer Variablen Gegenzahlen stehen.',
  }
}

/** Einsetzungsverfahren: II ist schon nach y aufgelöst (y = m x + n) */
export function einsetzProblem(e1: Eq, m: number, n: number, names?: [string, string]): Problem {
  const [a, b, c] = e1
  // a x + b (m x + n) = c
  const steps: Step[] = [
    { tex: `${lab('I')}${eqTex(e1)}` },
    { tex: `${lab('II')}y = ${sumTex([T(m, 'x'), T(n)].filter((t) => t.c !== 0))}`, note: 'II ist schon nach $y$ aufgelöst – das ist perfekt zum Einsetzen.' },
    { tex: `\\text{II in I}\\colon\\ ${tn(a)}x ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : tn(Math.abs(b))}(${sumTex([T(m, 'x'), T(n)].filter((t) => t.c !== 0))}) = ${tn(c)}`, note: 'Für $y$ den Term aus II in Klammern einsetzen.' },
    { tex: `${sumTex([T(a, 'x'), T(b * m, 'x'), T(b * n)])} = ${tn(c)}`, note: 'Klammer ausmultiplizieren.' },
  ]
  const s = solveLinear([T(a + b * m, 'x'), T(b * n)], [T(c)], 'x')
  steps.push(...s.steps)
  const x = s.value.reduce((q, t) => q + t.c, 0)
  const y = m * x + n
  steps.push({ tex: `y = ${tn(m)} \\cdot ${x < 0 ? `(${tn(x)})` : tn(x)} ${n < 0 ? '-' : '+'} ${tn(Math.abs(n))} = ${tn(y)}`, note: '$x$ in II einsetzen.' })
  steps.push({ tex: `\\mathbb{L} = \\{(${tn(x)} \\mid ${tn(y)})\\}` })
  return {
    prompt: 'Löse das Gleichungssystem mit dem Einsetzungsverfahren.',
    tex: `\\begin{aligned} \\text{I}\\colon\\ & ${eqTex(e1)} \\\\ \\text{II}\\colon\\ & y = ${sumTex([T(m, 'x'), T(n)].filter((t) => t.c !== 0))} \\end{aligned}`,
    answer: { kind: 'nums', values: [x, y], labels: names ?? ['x', 'y'], ordered: true, rel: 1e-6, tol: 1e-6 },
    steps,
    hint: 'Den Term für $y$ aus II in Klammern in I einsetzen.',
  }
}

/** Gleichsetzungsverfahren: y = m1 x + n1 und y = m2 x + n2 */
export function gleichsetzProblem(m1: number, n1: number, m2: number, n2: number): Problem {
  const r = (m: number, n: number) => sumTex([T(m, 'x'), T(n)].filter((t) => t.c !== 0))
  const steps: Step[] = [
    { tex: `${lab('I')}y = ${r(m1, n1)}` },
    { tex: `${lab('II')}y = ${r(m2, n2)}`, note: 'Beide Gleichungen sind nach $y$ aufgelöst → gleichsetzen.' },
  ]
  const s = solveLinear([T(m1, 'x'), T(n1)], [T(m2, 'x'), T(n2)], 'x')
  steps.push({ ...s.steps[0], note: 'I = II: die rechten Seiten gleichsetzen.' }, ...s.steps.slice(1))
  const x = s.value.reduce((q, t) => q + t.c, 0)
  const y = m1 * x + n1
  steps.push({ tex: `y = ${tn(m1)} \\cdot ${x < 0 ? `(${tn(x)})` : tn(x)} ${n1 < 0 ? '-' : '+'} ${tn(Math.abs(n1))} = ${tn(y)}`, note: '$x$ in I einsetzen.' })
  steps.push({ tex: `\\mathbb{L} = \\{(${tn(x)} \\mid ${tn(y)})\\}` })
  return {
    prompt: 'Löse das Gleichungssystem mit dem Gleichsetzungsverfahren.',
    tex: `\\begin{aligned} \\text{I}\\colon\\ & y = ${r(m1, n1)} \\\\ \\text{II}\\colon\\ & y = ${r(m2, n2)} \\end{aligned}`,
    answer: { kind: 'nums', values: [x, y], labels: ['x', 'y'], ordered: true, rel: 1e-6, tol: 1e-6 },
    steps,
    hint: 'Wenn zwei Terme gleich $y$ sind, sind sie auch einander gleich.',
  }
}

/* ---------------------------- Zufall ---------------------------- */

function randEqs(rng: Rng, level: Level): [Eq, Eq, number, number] {
  for (;;) {
    const x = int(rng, -6, 9)
    const y = int(rng, -6, 9)
    const a1 = nz(rng, -9, 9)
    const b1 = nz(rng, -9, 9)
    const a2 = nz(rng, -9, 9)
    let b2 = nz(rng, -9, 9)
    if (level === 1) {
      // eine Variable hat schon Gegenzahlen oder ein kleines Vielfaches
      if (chance(rng, 0.5)) b2 = -b1
      else b2 = -b1 * pick(rng, [2, 3])
      if (Math.abs(b2) > 12) continue
    }
    if (a1 * b2 - a2 * b1 === 0) continue
    if (level >= 2 && (Math.abs(a1) === Math.abs(a2) || Math.abs(b1) === Math.abs(b2)) && chance(rng, 0.7)) continue
    return [[a1, b1, a1 * x + b1 * y], [a2, b2, a2 * x + b2 * y], x, y]
  }
}

function addGen(rng: Rng, level: Level): Problem {
  const [e1, e2] = randEqs(rng, level)
  if (level >= 2 && chance(rng, 0.5)) {
    // Zahlen auf der linken Seite wie 6x − 5y + 25 = 2
    const k1 = nz(rng, -30, 30)
    const k2 = nz(rng, -30, 30)
    const raw = (e: Eq, k: number) => `${sumTex([T(e[0], 'x'), T(e[1], 'y'), T(k)])} = ${tn(e[2] + k)}`
    return additionProblem(e1, e2, [raw(e1, k1), raw(e2, k2)])
  }
  return additionProblem(e1, e2)
}

function einsetzGen(rng: Rng): Problem {
  for (;;) {
    const x = int(rng, -5, 9)
    const m = nz(rng, -5, 5)
    const n = int(rng, -12, 12)
    const a = nz(rng, -8, 8)
    const b = nz(rng, -6, 6)
    if (a + b * m === 0) continue
    const y = m * x + n
    return einsetzProblem([a, b, a * x + b * y], m, n)
  }
}

function gleichsetzGen(rng: Rng): Problem {
  for (;;) {
    const x = int(rng, -6, 8)
    const m1 = nz(rng, -6, 6)
    const m2 = nz(rng, -6, 6)
    if (m1 === m2) continue
    const n1 = int(rng, -15, 15)
    const y = m1 * x + n1
    const n2 = y - m2 * x
    return gleichsetzProblem(m1, n1, m2, n2)
  }
}

/* ---------------------------- Sonderfälle ---------------------------- */

const ANZAHL = ['genau eine Lösung', 'keine Lösung', 'unendlich viele Lösungen']

const asLine = ([a, b, c]: Eq, label: string) => ({ m: -a / b, b: c / b, label })

/** Wie viele Lösungen? II muss links ein ganzzahliges Vielfaches von I sein, falls die Determinante 0 ist. */
export function anzahlProblem(e1: Eq, e2: Eq): Problem {
  const [a1, b1] = e1
  const [a2, b2, c2] = e2
  const prompt = 'Wie viele Lösungen hat das Gleichungssystem?'
  const tex = `\\begin{aligned} \\text{I}\\colon\\ & ${eqTex(e1)} \\\\ \\text{II}\\colon\\ & ${eqTex(e2)} \\end{aligned}`
  const hint = 'Fallen beim Addieren **beide** Variablen weg, entscheidet die Zahl: $0 = 0$ → unendlich viele, $0 = 5$ → keine Lösung.'
  const figure = b1 && b2 ? { lines: [asLine(e1, 'I'), asLine(e2, 'II')] } : undefined
  if (a1 * b2 - a2 * b1 !== 0) {
    const { steps } = additionSteps(e1, e2)
    steps.push({ tex: '\\Rightarrow \\text{genau eine Lösung}', note: 'Eine Variable fällt weg, die andere bleibt – es gibt genau ein Zahlenpaar.' })
    return { prompt, tex, answer: { kind: 'choice', options: ANZAHL, correct: 0 }, steps, hint, figure }
  }
  const k = a2 / a1
  const m = -k
  const E1: Eq = [e1[0] * m, e1[1] * m, e1[2] * m]
  const d = E1[2] + c2
  const steps: Step[] = [
    { tex: lab('I') + eqTex(e1), op: m === 1 ? undefined : `| \\cdot ${m < 0 ? `(${tn(m)})` : tn(m)}`, note: `Links ist II das $${tn(k)}$-Fache von I.` },
    { tex: lab('II') + eqTex(e2) },
  ]
  if (m !== 1) steps.push({ tex: lab("I'") + eqTex(E1) })
  steps.push({ tex: `${m !== 1 ? "\\text{I'}" : '\\text{I}'} + \\text{II}\\colon\\ 0 = ${tn(d)}`, note: 'Beide Variablen fallen weg.' })
  steps.push({
    tex: d === 0 ? '\\text{wahre Aussage} \\Rightarrow \\text{unendlich viele Lösungen}' : '\\text{falsche Aussage} \\Rightarrow \\text{keine Lösung}',
    note: d === 0 ? 'I und II beschreiben dieselbe Gerade – jeder Punkt darauf ist eine Lösung.' : 'Die Geraden sind parallel und schneiden sich nie.',
  })
  return { prompt, tex, answer: { kind: 'choice', options: ANZAHL, correct: d === 0 ? 2 : 1 }, steps, hint, figure }
}

function anzahlGen(rng: Rng): Problem {
  const v = int(rng, 0, 2)
  if (v === 0) {
    const [e1, e2] = randEqs(rng, 1)
    return anzahlProblem(e1, e2)
  }
  const a = nz(rng, -6, 6)
  const b = nz(rng, -6, 6)
  const c = int(rng, -12, 12)
  const k = pick(rng, [2, 3, -2, -3, 4])
  return anzahlProblem([a, b, c], [k * a, k * b, k * c + (v === 1 ? nz(rng, -9, 9) : 0)])
}

export const LGS_GENS: GenInfo[] = [
  { id: 'addition', title: 'Additionsverfahren', gen: addGen },
  { id: 'einsetzung', title: 'Einsetzungsverfahren', gen: (rng) => einsetzGen(rng) },
  { id: 'gleichsetzung', title: 'Gleichsetzungsverfahren', gen: (rng) => gleichsetzGen(rng) },
  { id: 'anzahl', title: 'Keine oder unendlich viele Lösungen', gen: (rng) => anzahlGen(rng) },
]

export { solve2 }
