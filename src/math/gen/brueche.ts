import type { Rng } from '../../lib/random'
import { gcd, lcm, primeFactors, tfrac } from '../num'
import type { GenInfo, Level, Problem, Step } from '../types'
import { chance, int, pick } from './util'

/** Bruch mit Vorzeichen: s · n/d */
export type F = [n: number, d: number]

const fr = (n: number, d: number) => tfrac(n, d, false)
const red = (n: number, d: number): F => {
  const g = gcd(n, d) || 1
  const s = d < 0 ? -1 : 1
  return [(s * n) / g, (s * d) / g]
}

function signedFrac(f: F, first: boolean, body?: string) {
  const neg = f[0] < 0
  const b = body ?? `\\frac{${Math.abs(f[0])}}{${f[1]}}`
  return first ? (neg ? '-' : '') + b : (neg ? ' - ' : ' + ') + b
}

function hnNote(ds: number[], hn: number) {
  const parts = [...new Set(ds)].map((d) => `$${d} = ${primeFactors(d).join('\\cdot ') || d}$`).join(', ')
  return `Hauptnenner = kleinstes gemeinsames Vielfaches (kgV) der Nenner. Zerlegung: ${parts} → HN $= ${hn}$.`
}

/** Summe von Brüchen, z. B. 1/75 + 1/23 */
export function fracSumProblem(fs: F[]): Problem {
  const ds = fs.map((f) => f[1])
  const hn = ds.reduce((a, b) => lcm(a, b))
  const ks = fs.map((f) => hn / f[1])
  const steps: Step[] = []
  steps.push({ tex: `\\text{HN} = \\text{kgV}(${[...new Set(ds)].join(', ')}) = ${hn}`, note: hnNote(ds, hn) })
  if (ks.some((k) => k !== 1))
    steps.push({
      tex: '= ' + fs.map((f, i) => signedFrac(f, i === 0, ks[i] === 1 ? undefined : `\\frac{${Math.abs(f[0])} \\cdot ${ks[i]}}{${f[1]} \\cdot ${ks[i]}}`)).join(''),
      note: 'Jeden Bruch erweitern: Zähler und Nenner mit derselben Zahl multiplizieren.',
    })
  const nums = fs.map((f, i) => f[0] * ks[i])
  steps.push({ tex: '= ' + nums.map((n, i) => signedFrac([n, hn], i === 0)).join(''), note: 'Jetzt haben alle Brüche denselben Nenner.' })
  const sum = nums.reduce((a, b) => a + b, 0)
  steps.push({ tex: `= \\frac{${nums.map((n, i) => (i === 0 ? n : n < 0 ? `- ${-n}` : `+ ${n}`)).join(' ')}}{${hn}} = ${fr(sum, hn)}`, note: 'Zähler addieren, Nenner bleibt.' })
  const [rn, rd] = red(sum, hn)
  if (rd !== hn) steps.push({ tex: `= ${tfrac(rn, rd)}`, note: `Kürzen mit ${hn / rd}.` })
  return {
    prompt: 'Berechne und kürze vollständig.',
    tex: fs.map((f, i) => signedFrac(f, i === 0)).join(''),
    answer: { kind: 'num', value: sum / hn, fraction: true, rel: 1e-9 },
    steps,
    hint: 'Nur gleichnamige Brüche kann man addieren: erst auf den Hauptnenner bringen.',
  }
}

export function fracMulProblem(a: F, b: F, div = false): Problem {
  const steps: Step[] = []
  const b2: F = div ? [b[1], b[0]] : b
  if (div) steps.push({ tex: `= ${fr(a[0], a[1])} \\cdot ${fr(b2[0], b2[1])}`, note: 'Durch einen Bruch teilen = mit dem Kehrwert multiplizieren.' })
  const n = a[0] * b2[0]
  const d = a[1] * b2[1]
  steps.push({ tex: `= \\frac{${a[0]} \\cdot ${b2[0]}}{${a[1]} \\cdot ${b2[1]}} = ${fr(n, d)}`, note: 'Zähler mal Zähler, Nenner mal Nenner.' })
  const [rn, rd] = red(n, d)
  if (rd !== d) steps.push({ tex: `= ${tfrac(rn, rd)}`, note: `Kürzen mit ${d / rd}. Tipp: Schon vor dem Ausmultiplizieren kürzen spart große Zahlen.` })
  return {
    prompt: 'Berechne und kürze vollständig.',
    tex: `${fr(a[0], a[1])} ${div ? ':' : '\\cdot'} ${fr(b[0], b[1])}`,
    answer: { kind: 'num', value: n / d, fraction: true, rel: 1e-9 },
    steps,
    hint: div ? 'Kehrwert: Zähler und Nenner tauschen.' : 'Zähler mal Zähler, Nenner mal Nenner.',
  }
}

/** (a/b + c/d) : (e/f) */
export function bracketDivProblem(a: F, b: F, e: F): Problem {
  const hn = lcm(a[1], b[1])
  const n = a[0] * (hn / a[1]) + b[0] * (hn / b[1])
  const steps: Step[] = [
    { tex: `\\left(\\frac{${a[0] * (hn / a[1])}}{${hn}} + \\frac{${b[0] * (hn / b[1])}}{${hn}}\\right) : ${fr(e[0], e[1])}`, note: `Zuerst die Klammer: Hauptnenner ${hn}.` },
    { tex: `= ${fr(n, hn)} : ${fr(e[0], e[1])}`, note: 'Klammer ausgerechnet.' },
    { tex: `= ${fr(n, hn)} \\cdot ${fr(e[1], e[0])} = ${fr(n * e[1], hn * e[0])}`, note: 'Mit dem Kehrwert multiplizieren.' },
  ]
  const [rn, rd] = red(n * e[1], hn * e[0])
  if (rd !== hn * e[0]) steps.push({ tex: `= ${tfrac(rn, rd)}`, note: 'Vollständig kürzen.' })
  return {
    prompt: 'Berechne und kürze vollständig.',
    tex: `\\left(${fr(a[0], a[1])} + ${fr(b[0], b[1])}\\right) : ${fr(e[0], e[1])}`,
    answer: { kind: 'num', value: (n * e[1]) / (hn * e[0]), fraction: true, rel: 1e-9 },
    steps,
    hint: 'Punkt vor Strich gilt – aber Klammern zuerst.',
  }
}

/** Doppelbruch  (a/b) / (c/d − e/f) */
export function doubleFracProblem(top: F, c: F, e: F, square = false, topB?: F): Problem {
  const steps: Step[] = []
  const hn = lcm(c[1], e[1])
  const bn = c[0] * (hn / c[1]) - e[0] * (hn / e[1])
  let tn_: F = top
  let topTex = fr(top[0], top[1])
  if (topB) {
    const h2 = lcm(top[1], topB[1])
    const nn = top[0] * (h2 / top[1]) - topB[0] * (h2 / topB[1])
    tn_ = red(nn, h2)
    topTex = `${fr(top[0], top[1])} - ${fr(topB[0], topB[1])}`
    steps.push({ tex: `${fr(top[0], top[1])} - ${fr(topB[0], topB[1])} = ${fr(top[0] * (h2 / top[1]), h2)} - ${fr(topB[0] * (h2 / topB[1]), h2)} = ${tfrac(tn_[0], tn_[1])}`, note: 'Zähler des Doppelbruchs ausrechnen.' })
  }
  const bottom = red(bn, hn)
  steps.push({ tex: `${fr(c[0], c[1])} - ${fr(e[0], e[1])} = ${fr(c[0] * (hn / c[1]), hn)} - ${fr(e[0] * (hn / e[1]), hn)} = ${tfrac(bottom[0], bottom[1])}`, note: 'Nenner des Doppelbruchs ausrechnen.' })
  const q = red(tn_[0] * bottom[1], tn_[1] * bottom[0])
  steps.push({ tex: `\\frac{${tfrac(tn_[0], tn_[1])}}{${tfrac(bottom[0], bottom[1])}} = ${tfrac(tn_[0], tn_[1])} \\cdot ${tfrac(bottom[1], bottom[0])} = ${tfrac(q[0], q[1])}`, note: 'Bruch durch Bruch = mal Kehrwert.' })
  let value = q[0] / q[1]
  if (square) {
    const s = red(q[0] * q[0], q[1] * q[1])
    steps.push({ tex: `\\left(${tfrac(q[0], q[1])}\\right)^2 = ${tfrac(s[0], s[1])}`, note: 'Zum Schluss quadrieren: Zähler² durch Nenner².' })
    value = s[0] / s[1]
  }
  const inner = `\\dfrac{${topTex}}{${fr(c[0], c[1])} - ${fr(e[0], e[1])}}`
  return {
    prompt: 'Berechne den Doppelbruch.',
    tex: square ? `\\left(${inner}\\right)^2` : inner,
    answer: { kind: 'num', value, fraction: true, rel: 1e-9 },
    steps,
    hint: 'Zähler und Nenner getrennt ausrechnen, dann „mal Kehrwert“.',
  }
}

/** Bruchterme: Variable im Zähler (3a/4 + …) oder im Nenner (2/(3z) − …) */
export function fracTermProblem(parts: [c: number, d: number][], v: string, inDen: boolean): Problem {
  const ds = parts.map((p) => p[1])
  const hnN = ds.reduce((a, b) => lcm(a, b))
  const hnTex = inDen ? `${hnN}${v}` : `${hnN}`
  const num = (c: number) => (inDen ? `${c}` : `${c}${v}`)
  const ks = parts.map((p) => hnN / p[1])
  const fs = (c: number, d: number, first: boolean, body?: string) => signedFrac([c, d], first, body)
  const steps: Step[] = [
    {
      tex: `\\text{HN} = ${hnTex}`,
      note: inDen
        ? `Die Nenner ${ds.map((d) => `$${d}${v}$`).join(', ')} haben alle den Faktor $${v}$. Zahlen: kgV(${[...new Set(ds)].join(', ')}) = ${hnN}. Ein größerer gemeinsamer Nenner (z. B. das Produkt aller Nenner) geht auch, macht die Rechnung aber unnötig lang.`
        : hnNote(ds, hnN),
    },
    {
      tex: '= ' + parts.map((p, i) => fs(p[0], p[1], i === 0, `\\frac{${num(Math.abs(p[0]))} \\cdot ${ks[i]}}{${p[1]}${inDen ? v : ''} \\cdot ${ks[i]}}`)).join(''),
      note: 'Jeden Bruch auf den Hauptnenner erweitern.',
    },
    { tex: '= ' + parts.map((p, i) => fs(p[0], p[1], i === 0, `\\frac{${num(Math.abs(p[0] * ks[i]))}}{${hnTex}}`)).join(''), note: 'Gleichnamig.' },
  ]
  const sum = parts.reduce((s, p, i) => s + p[0] * ks[i], 0)
  const [rn, rd] = red(sum, hnN)
  const res = (n: number, d: number) => {
    const sign = n < 0 ? '-' : ''
    return d === 1 && !inDen ? `${sign}${Math.abs(n) === 1 ? '' : Math.abs(n)}${v}` : `${sign}\\frac{${inDen ? Math.abs(n) : (Math.abs(n) === 1 ? '' : Math.abs(n)) + v}}{${d}${inDen ? v : ''}}`
  }
  steps.push({ tex: `= ${res(sum, hnN)}`, note: 'Zähler zusammenfassen.' })
  if (rd !== hnN) steps.push({ tex: `= ${res(rn, rd)}`, note: `Kürzen mit ${hnN / rd}.` })
  const value = inDen ? `${rn}/(${rd}*${v})` : `${rn}*${v}/${rd}`
  return {
    prompt: 'Fasse zu einem Bruch zusammen und kürze.',
    tex: parts.map((p, i) => fs(p[0], p[1], i === 0, `\\frac{${num(Math.abs(p[0]))}}{${p[1]}${inDen ? v : ''}}`)).join(''),
    answer: { kind: 'expr', value, vars: [v], maxTerms: 1 },
    steps,
    hint: inDen ? `Der Hauptnenner enthält $${v}$ genau einmal.` : 'Variable im Zähler behandeln wie eine Einheit: $3a/4 = \\frac{3}{4}a$.',
  }
}

/* ---------------------------- Generatoren ---------------------------- */

const DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 90, 180]

function niceF(rng: Rng, maxD = 30): F {
  const d = pick(rng, DENS.filter((x) => x <= maxD))
  let n = int(rng, 1, d * 2)
  if (n % d === 0) n++
  return [n, d]
}

function addGen(rng: Rng, level: Level): Problem {
  const n = level === 1 ? 2 : int(rng, 2, 3)
  const fs: F[] = Array.from({ length: n }, (_, i) => {
    const f = niceF(rng, level === 1 ? 12 : 60)
    return i > 0 && chance(rng, 0.4) ? [-f[0], f[1]] : f
  })
  return fracSumProblem(fs)
}

/** Bruch vollständig kürzen, z. B. 84/126 */
export function kuerzenProblem(n: number, d: number): Problem {
  const g = gcd(n, d)
  const fac = (x: number) => primeFactors(x).join(' \\cdot ')
  return {
    prompt: 'Kürze vollständig.',
    tex: `\\frac{${n}}{${d}}`,
    answer: { kind: 'num', value: n / d, reduced: true, rel: 1e-9 },
    steps: [
      { tex: `${n} = ${fac(n)},\\quad ${d} = ${fac(d)}`, note: 'Zähler und Nenner in Primfaktoren zerlegen.' },
      { tex: `\\text{ggT}(${n}, ${d}) = ${g}`, note: 'Gemeinsame Faktoren multiplizieren.' },
      { tex: `\\frac{${n} : ${g}}{${d} : ${g}} = ${tfrac(n, d)}`, note: 'Zähler und Nenner durch den ggT teilen.' },
    ],
    hint: 'Durch den größten gemeinsamen Teiler (ggT) teilen.',
  }
}

/** Kürzen nach Ausklammern: (A·x + A·y) / (B·x + B·y) */
export function kuerzenAusklammern(A: number, B: number, u: string, v: string): Problem {
  const [rn, rd] = red(A, B)
  const sumT = `${u} + ${v}`
  return {
    prompt: 'Kürze so weit wie möglich.',
    tex: `\\frac{${A}${u} + ${A}${v}}{${B}${u} + ${B}${v}}`,
    answer: { kind: 'num', value: A / B, reduced: true, rel: 1e-9 },
    steps: [
      { tex: `= \\frac{${A}(${sumT})}{${B}(${sumT})}`, note: 'Zähler und Nenner getrennt ausklammern.' },
      { tex: `= \\frac{${A}}{${B}}${rd !== B ? ` = ${tfrac(rn, rd)}` : ''}`, note: `Die Klammer $(${sumT})$ steht oben und unten als Faktor – sie kürzt sich weg.` },
    ],
    hint: 'Aus Summen darf man nicht kürzen – erst ausklammern, dann den gleichen Faktor kürzen.',
  }
}

export const BRUCH_GENS: GenInfo[] = [
  {
    id: 'bruch-kuerzen',
    title: 'Kürzen',
    gen: (rng, level) => {
      if (level >= 2 && chance(rng, 0.45)) {
        const g = int(rng, 2, 6)
        return kuerzenAusklammern(g * int(rng, 1, 7), g * int(rng, 2, 9), pick(rng, ['a', 'x', 'm']), pick(rng, ['b', 'y', 'n']))
      }
      for (;;) {
        const p = int(rng, 1, 12)
        const q = int(rng, 2, 15)
        if (gcd(p, q) !== 1 || p === q) continue
        const g = pick(rng, level === 1 ? [2, 3, 4, 5, 6] : [6, 7, 8, 9, 12, 14, 15, 18, 21])
        return kuerzenProblem(p * g, q * g)
      }
    },
  },
  { id: 'bruch-add', title: 'Addieren & Subtrahieren', gen: addGen },
  {
    id: 'bruch-mul',
    title: 'Multiplizieren & Dividieren',
    gen: (rng) => fracMulProblem(niceF(rng, 40), niceF(rng, 40), chance(rng, 0.5)),
  },
  {
    id: 'bruch-doppel',
    title: 'Klammern & Doppelbrüche',
    gen: (rng) => {
      if (chance(rng, 0.5)) {
        const e: F = [int(rng, 1, 5), int(rng, 2, 7)]
        return bracketDivProblem(niceF(rng, 36), niceF(rng, 36), e)
      }
      const c = int(rng, 2, 6)
      const e = c + int(rng, 1, 4)
      return doubleFracProblem([int(rng, 1, 9), pick(rng, [5, 7, 9, 25, 15])], [1, c], [1, e], chance(rng, 0.3))
    },
  },
  {
    id: 'bruch-term',
    title: 'Bruchterme',
    gen: (rng) => {
      const inDen = chance(rng, 0.5)
      const v = pick(rng, inDen ? ['z', 'x', 'y'] : ['a', 'b', 'x'])
      const n = 3
      const parts: [number, number][] = Array.from({ length: n }, (_, i) => {
        const d = pick(rng, [2, 3, 4, 5, 6, 8, 9, 10, 12])
        const c = int(rng, 1, 12)
        return [i > 0 && chance(rng, 0.45) ? -c : c, d]
      })
      return fracTermProblem(parts, v, inDen)
    },
  },
]
