import type { Rng } from '../../lib/random'
import { gcd, tfrac, tn } from '../num'
import type { GenInfo, Level, Problem, Step } from '../types'
import { chance, int, pick } from './util'

const pw = (v: string, e: number | string) => (e === 1 || e === '1' ? v : `${v}^{${e}}`)
const expIn = (n: number, d = 1) => {
  const g = gcd(n, d) || 1
  const a = n / g
  const b = d / g
  return b === 1 ? String(a) : `(${a}/${b})`
}
const expTex = (n: number, d = 1) => tfrac(n, d)

/** Potenzgesetze mit einer Basis */
function gesetz(rng: Rng): Problem {
  const v = pick(rng, ['a', 'x', 'b', 'y'])
  const m = int(rng, 2, 9)
  const n = int(rng, 2, 7)
  const kind = int(rng, 0, 3)
  if (kind === 0) {
    return {
      prompt: 'Fasse zu einer Potenz zusammen.',
      tex: `${pw(v, m)} \\cdot ${pw(v, n)}`,
      answer: { kind: 'expr', value: `${v}^${m + n}`, vars: [v], singleUse: true },
      steps: [
        { tex: `${pw(v, m)} \\cdot ${pw(v, n)} = ${v}^{${m} + ${n}}`, note: 'Gleiche Basis multiplizieren: Exponenten **addieren**.' },
        { tex: `= ${pw(v, m + n)}` },
      ],
      hint: '$a^m \\cdot a^n = a^{m+n}$',
    }
  }
  if (kind === 1) {
    const big = m + n
    return {
      prompt: 'Fasse zu einer Potenz zusammen.',
      tex: `\\frac{${pw(v, big)}}{${pw(v, n)}}`,
      answer: { kind: 'expr', value: `${v}^${m}`, vars: [v], singleUse: true },
      steps: [
        { tex: `\\frac{${pw(v, big)}}{${pw(v, n)}} = ${v}^{${big} - ${n}}`, note: 'Gleiche Basis dividieren: Exponenten **subtrahieren**.' },
        { tex: `= ${pw(v, m)}` },
      ],
      hint: '$a^m : a^n = a^{m-n}$',
    }
  }
  if (kind === 2) {
    return {
      prompt: 'Fasse zu einer Potenz zusammen.',
      tex: `\\left(${pw(v, m)}\\right)^{${n}}`,
      answer: { kind: 'expr', value: `${v}^${m * n}`, vars: [v], singleUse: true },
      steps: [
        { tex: `\\left(${pw(v, m)}\\right)^{${n}} = ${v}^{${m} \\cdot ${n}}`, note: 'Potenz einer Potenz: Exponenten **multiplizieren**.' },
        { tex: `= ${pw(v, m * n)}` },
      ],
      hint: '$(a^m)^n = a^{m \\cdot n}$',
    }
  }
  const k = int(rng, 2, 9)
  const l = int(rng, 2, 9)
  return {
    prompt: 'Vereinfache.',
    tex: `${k}${pw(v, m)} \\cdot ${l}${pw(v, n)}`,
    answer: { kind: 'expr', value: `${k * l}*${v}^${m + n}`, vars: [v], singleUse: true },
    steps: [
      { tex: `= (${k} \\cdot ${l}) \\cdot (${pw(v, m)} \\cdot ${pw(v, n)})`, note: 'Zahlen und Potenzen getrennt multiplizieren.' },
      { tex: `= ${k * l}${pw(v, m + n)}`, note: 'Exponenten addieren.' },
    ],
    hint: 'Zahlen mal Zahlen, Exponenten gleicher Basis addieren.',
  }
}

/** Bruch aus Potenzprodukten wie 6x⁴y² / (2xy²) */
export function potBruchProblem(k: number, l: number, ex: [string, number, number][]): Problem {
  const g = gcd(k, l)
  const kk = k / g
  const ll = l / g
  const top = `${k}${ex.map(([v, a]) => (a ? pw(v, a) : '')).join('')}`
  const bot = `${l}${ex.map(([v, , b]) => (b ? pw(v, b) : '')).join('')}`
  const resParts = ex.map(([v, a, b]) => [v, a - b] as const)
  const texRes = (() => {
    const num = resParts.filter(([, e]) => e > 0).map(([v, e]) => pw(v, e)).join('')
    const den = resParts.filter(([, e]) => e < 0).map(([v, e]) => pw(v, -e)).join('')
    const nTex = `${kk === 1 && num ? '' : kk}${num}`
    const dTex = `${ll === 1 && den ? '' : ll === 1 ? '' : ll}${den}`
    return dTex ? `\\frac{${nTex || '1'}}{${dTex}}` : nTex || '1'
  })()
  const value = `${kk}/${ll}${resParts.map(([v, e]) => `*${v}^(${e})`).join('')}`
  const steps: Step[] = [
    { tex: `= \\frac{${k}}{${l}} ${ex.map(([v, a, b]) => `\\cdot \\frac{${pw(v, a)}}{${pw(v, b)}}`).join(' ')}`, note: 'Zahlen und jede Basis einzeln betrachten.' },
    { tex: `= ${tfrac(kk, ll)} ${resParts.map(([v], i) => `\\cdot ${v}^{${ex[i][1]} - ${ex[i][2]}}`).join(' ')}`, note: `Zahlen kürzen (mit ${g}), Exponenten subtrahieren.` },
    { tex: `= ${texRes}`, note: resParts.some(([, e]) => e === 0) ? '$a^0 = 1$ – die Basis verschwindet.' : undefined },
  ]
  return {
    prompt: 'Vereinfache so weit wie möglich.',
    tex: `\\frac{${top}}{${bot}}`,
    answer: { kind: 'expr', value, vars: ex.map((e) => e[0]), singleUse: true },
    steps,
    hint: '$\\frac{a^m}{a^n} = a^{m-n}$ und $a^0 = 1$.',
  }
}

/** 27a⁹ / (3a³)³ */
export function potKlammerProblem(k: number, base: number, e: number, n: number, v = 'a'): Problem {
  const top = k
  const kb = base ** n
  const topE = e * n
  const res = top / kb
  return {
    prompt: 'Vereinfache.',
    tex: `\\frac{${top}${pw(v, topE)}}{(${base}${pw(v, e)})^{${n}}}`,
    answer: { kind: 'expr', value: `${res}`, vars: [v] },
    steps: [
      { tex: `(${base}${pw(v, e)})^{${n}} = ${base}^{${n}} \\cdot ${v}^{${e}\\cdot ${n}} = ${kb}${pw(v, e * n)}`, note: 'Jeden Faktor in der Klammer potenzieren.' },
      { tex: `\\frac{${top}${pw(v, topE)}}{${kb}${pw(v, e * n)}} = ${tn(res)}`, note: 'Zähler und Nenner sind gleich – oder werden gekürzt.' },
    ],
    hint: '$(ab)^n = a^n b^n$',
  }
}

/** Wurzeln in Potenzschreibweise */
function wurzel(rng: Rng): Problem {
  const v = pick(rng, ['a', 'x'])
  const kind = int(rng, 0, 2)
  if (kind === 0) {
    // √(a^m) · ∛(a^n)
    const m = int(rng, 1, 5)
    const n = int(rng, 1, 5)
    const p = int(rng, 2, 3)
    const q = p === 2 ? int(rng, 3, 4) : 2
    const num = m * q + n * p
    const den = p * q
    const root = (r: number, inner: string) => (r === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${r}]{${inner}}`)
    return {
      prompt: 'Schreibe als eine Potenz.',
      tex: `${root(p, pw(v, m))} \\cdot ${root(q, pw(v, n))}`,
      answer: { kind: 'expr', value: `${v}^${expIn(num, den)}`, vars: [v], noRoot: true, singleUse: true },
      steps: [
        { tex: `= ${v}^{${expTex(m, p)}} \\cdot ${v}^{${expTex(n, q)}}`, note: 'Umwandlung: $\\sqrt[n]{a^m} = a^{\\frac{m}{n}}$.' },
        { tex: `= ${v}^{${expTex(m * q, den)} + ${expTex(n * p, den)}}`, note: `Exponenten gleichnamig machen (Hauptnenner ${den}).` },
        { tex: `= ${v}^{${expTex(num, den)}}`, note: 'Exponenten addieren.' },
      ],
      hint: '$\\sqrt[n]{a^m} = a^{m/n}$, dann Potenzgesetze.',
    }
  }
  if (kind === 1) {
    // 1 / ⁿ√(x^m)
    const n = int(rng, 2, 5)
    let m = int(rng, 1, 7)
    if (m === n) m++
    return {
      prompt: 'Schreibe als eine Potenz.',
      tex: `\\frac{1}{${n === 2 ? `\\sqrt{${pw(v, m)}}` : `\\sqrt[${n}]{${pw(v, m)}}`}}`,
      answer: { kind: 'expr', value: `${v}^(-${m}/${n})`, vars: [v], noRoot: true, singleUse: true },
      steps: [
        { tex: `= \\frac{1}{${v}^{${expTex(m, n)}}}`, note: 'Wurzel als Potenz schreiben.' },
        { tex: `= ${v}^{-${expTex(m, n)}}`, note: '„1 durch“ wird zum **negativen** Exponenten: $\\frac{1}{a^n} = a^{-n}$.' },
      ],
      hint: '$\\frac{1}{a^n} = a^{-n}$ – das Minus nicht vergessen.',
    }
  }
  // ∛(64 a³ b⁹) = 4ab³
  const n = pick(rng, [2, 3] as const)
  const k = int(rng, 2, n === 2 ? 12 : 5)
  const p = int(rng, 1, 3)
  const q = int(rng, 1, 4)
  const w = v === 'a' ? 'b' : 'y'
  const K = k ** n
  const rootTex = (inner: string) => (n === 2 ? `\\sqrt{${inner}}` : `\\sqrt[3]{${inner}}`)
  return {
    prompt: 'Ziehe die Wurzel so weit wie möglich.',
    tex: rootTex(`${K}${pw(v, p * n)}${pw(w, q * n)}`),
    answer: { kind: 'expr', value: `${k}*${v}^${p}*${w}^${q}`, vars: [v, w], noRoot: true, singleUse: true },
    steps: [
      { tex: `= ${rootTex(String(K))} \\cdot ${rootTex(pw(v, p * n))} \\cdot ${rootTex(pw(w, q * n))}`, note: 'Wurzel aus einem Produkt = Produkt der Wurzeln.' },
      { tex: `= ${k} \\cdot ${v}^{${p * n}/${n}} \\cdot ${w}^{${q * n}/${n}}`, note: `$${K} = ${k}^${n}$; Exponent durch ${n} teilen.` },
      { tex: `= ${k}${pw(v, p)}${pw(w, q)}` },
    ],
    hint: `$\\sqrt[n]{a^{kn}} = a^k$`,
  }
}

/* ---------------------------- Zehnerpotenzen ---------------------------- */

const sciTex = (m: number, e: number) => `${tn(m, 6)} \\cdot 10^{${e}}`

/** Dezimalzahl mit deutschem Komma, ohne Rundungsartefakte */
function decTex(v: number) {
  const s = v.toFixed(12).replace(/0+$/, '').replace(/\.$/, '')
  const [i, f] = s.split('.')
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,')
  return f ? `${grouped}{,}${f}` : grouped
}

export function zehnerSchreibweise(m: number, e: number): Problem {
  const v = Number((m * 10 ** e).toPrecision(12))
  const dir = e < 0 ? 'rechts' : 'links'
  return {
    prompt: 'Schreibe in wissenschaftlicher Schreibweise ($a \\cdot 10^n$ mit $1 \\le a < 10$).',
    tex: decTex(v),
    answer: { kind: 'num', value: v, rel: 1e-9, sciForm: true },
    steps: [
      { tex: `${decTex(v)} = ${sciTex(m, e)}`, note: `Komma um ${Math.abs(e)} Stellen nach ${dir} verschieben, bis genau eine Ziffer ≠ 0 davor steht. Nach ${dir === 'rechts' ? 'rechts → negativer' : 'links → positiver'} Exponent.` },
    ],
    hint: 'Kleine Zahlen haben einen negativen, große einen positiven Exponenten.',
  }
}

export function zehnerRechnen(a: number, p: number, b: number, q: number, op: 'mul' | 'div'): Problem {
  const mRaw = op === 'mul' ? a * b : a / b
  const eRaw = op === 'mul' ? p + q : p - q
  const shift = Math.floor(Math.log10(Math.abs(mRaw)))
  const m = Math.round((mRaw / 10 ** shift) * 1e9) / 1e9
  const e = eRaw + shift
  const steps: Step[] = [
    {
      tex: `= (${tn(a)} ${op === 'mul' ? '\\cdot' : ':'} ${tn(b)}) \\cdot 10^{${p} ${op === 'mul' ? '+' : '-'} ${q < 0 ? `(${q})` : q}}`,
      note: op === 'mul' ? 'Zahlen multiplizieren, Exponenten addieren.' : 'Zahlen dividieren, Exponenten subtrahieren.',
    },
    { tex: `= ${sciTex(Math.round(mRaw * 1e9) / 1e9, eRaw)}` },
  ]
  if (shift !== 0) steps.push({ tex: `= ${sciTex(m, e)}`, note: 'Vorzahl zwischen 1 und 10 bringen – Exponent anpassen.' })
  return {
    prompt: 'Berechne und gib das Ergebnis in wissenschaftlicher Schreibweise an.',
    tex: `(${sciTex(a, p)}) ${op === 'mul' ? '\\cdot' : ':'} (${sciTex(b, q)})`,
    answer: { kind: 'num', value: m * 10 ** e, rel: 1e-6, sciForm: true },
    steps,
    hint: '$10^a \\cdot 10^b = 10^{a+b}$ und $10^a : 10^b = 10^{a-b}$',
  }
}

function zehner(rng: Rng, level: Level): Problem {
  if (level === 1) {
    const m = pick(rng, [1.2, 2.5, 3.4, 4.5, 6.02, 7.8, 9.1, 1.6, 5])
    const e = pick(rng, [-7, -6, -5, -4, -3, -2, 3, 4, 5, 6, 7, 8])
    return zehnerSchreibweise(m, e)
  }
  const a = pick(rng, [1.5, 2, 2.5, 3, 4, 4.8, 6, 8, 9])
  const b = pick(rng, [2, 3, 4, 5, 1.2, 1.5])
  const p = int(rng, -8, 9)
  const q = int(rng, -9, 8)
  if (level === 2) return zehnerRechnen(a, p, b, q, 'mul')
  return chance(rng, 0.5) ? zehnerRechnen(a, p, b, q, 'mul') : zehnerRechnen(a * b, p, b, q, 'div')
}

export const POTENZ_GENS: GenInfo[] = [
  { id: 'potenzgesetze', title: 'Potenzgesetze', gen: (rng) => gesetz(rng) },
  {
    id: 'potenz-bruch',
    title: 'Potenzen in Brüchen',
    gen: (rng, level: Level) => {
      if (level === 3 && chance(rng, 0.4)) {
        const base = int(rng, 2, 4)
        const e = int(rng, 2, 4)
        const n = int(rng, 2, 3)
        return potKlammerProblem(base ** n * pick(rng, [1, 1, 2, 3]), base, e, n, pick(rng, ['a', 'x']))
      }
      const g = int(rng, 2, 7)
      const k = g * int(rng, 1, 9)
      const l = g * int(rng, 1, 5)
      const vs = pick(rng, [
        ['x', 'y'],
        ['a', 'b'],
      ] as const)
      return potBruchProblem(k, l, vs.map((v) => {
        const b = int(rng, 1, 4)
        return [v, b + int(rng, level === 1 ? 0 : 0, 4), b] as [string, number, number]
      }))
    },
  },
  { id: 'wurzeln', title: 'Wurzeln als Potenzen', gen: (rng) => wurzel(rng) },
  { id: 'zehner', title: 'Zehnerpotenzen', gen: (rng, level) => zehner(rng, level) },
]
