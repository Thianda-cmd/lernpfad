/**
 * Exakte Bruchzahlen auf BigInt-Basis für alle Rechner:
 * 1/3 + 1/6 ergibt genau 1/2 – ohne Rundungsfehler.
 */

export interface Q {
  readonly n: bigint
  readonly d: bigint
}

/** Fehler mit verständlicher Meldung für die Oberfläche. */
export class CalcError extends Error {}

const babs = (a: bigint) => (a < 0n ? -a : a)

export function bgcd(a: bigint, b: bigint): bigint {
  a = babs(a)
  b = babs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

export const blcm = (a: bigint, b: bigint) => (a && b ? babs(a * b) / bgcd(a, b) : 0n)

export function q(n: bigint | number, d: bigint | number = 1n): Q {
  let N = typeof n === 'bigint' ? n : BigInt(n)
  let D = typeof d === 'bigint' ? d : BigInt(d)
  if (D === 0n) throw new CalcError('Division durch 0 ist nicht erlaubt.')
  if (D < 0n) {
    N = -N
    D = -D
  }
  const g = bgcd(N, D)
  return g > 1n ? { n: N / g, d: D / g } : { n: N, d: D }
}

export const ZERO = q(0)
export const ONE = q(1)

export const add = (a: Q, b: Q) => (a.d === b.d ? q(a.n + b.n, a.d) : q(a.n * b.d + b.n * a.d, a.d * b.d))
export const sub = (a: Q, b: Q) => (a.d === b.d ? q(a.n - b.n, a.d) : q(a.n * b.d - b.n * a.d, a.d * b.d))
export const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d)
export function div(a: Q, b: Q) {
  if (b.n === 0n) throw new CalcError('Division durch 0 ist nicht erlaubt.')
  return q(a.n * b.d, a.d * b.n)
}
export const neg = (a: Q): Q => ({ n: -a.n, d: a.d })
export const qabs = (a: Q): Q => ({ n: babs(a.n), d: a.d })
export const inv = (a: Q) => div(ONE, a)
export const isZero = (a: Q) => a.n === 0n
export const isOne = (a: Q) => a.n === 1n && a.d === 1n
export const isInt = (a: Q) => a.d === 1n
export const sign = (a: Q) => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0)
export const eq = (a: Q, b: Q) => a.n === b.n && a.d === b.d
export function cmp(a: Q, b: Q) {
  const x = a.n * b.d - b.n * a.d
  return x > 0n ? 1 : x < 0n ? -1 : 0
}
export const sum = (xs: Q[]) => xs.reduce(add, ZERO)
export const prod = (xs: Q[]) => xs.reduce(mul, ONE)

export function qpow(a: Q, k: number): Q {
  if (!Number.isInteger(k)) throw new CalcError('Nur ganzzahlige Hochzahlen.')
  if (Math.abs(k) > 400) throw new CalcError('Die Hochzahl ist zu groß.')
  if (k < 0) return qpow(inv(a), -k)
  return q(a.n ** BigInt(k), a.d ** BigInt(k))
}

/** ganze Zahl als number (für Hochzahlen); wirft bei Brüchen */
export function toInt(a: Q, what = 'Die Hochzahl'): number {
  if (!isInt(a)) throw new CalcError(`${what} muss eine ganze Zahl sein.`)
  return Number(a.n)
}

export function toNum(a: Q): number {
  const n = Number(a.n)
  const d = Number(a.d)
  if (Number.isFinite(n) && Number.isFinite(d)) return n / d
  // sehr große Zähler/Nenner: beide gleich weit kürzen, das Verhältnis bleibt
  const len = Math.max(babs(a.n).toString().length, a.d.toString().length)
  const s = 10n ** BigInt(len - 300)
  return Number(a.n / s) / Number(a.d / s || 1n)
}

/** Dezimalzahl (auch „3,25“, „1.5e-3“) exakt als Bruch */
export function qFromRaw(raw: string): Q {
  const m = /^(\d*)(?:[.,](\d*))?(?:e([+-]?\d+))?$/i.exec(raw.trim())
  if (!m || (!m[1] && !m[2])) throw new CalcError(`„${raw}“ ist keine Zahl.`)
  const frac = m[2] ?? ''
  let n = BigInt((m[1] || '0') + frac)
  let d = 10n ** BigInt(frac.length)
  const e = m[3] ? parseInt(m[3], 10) : 0
  if (e > 0) n *= 10n ** BigInt(e)
  else if (e < 0) d *= 10n ** BigInt(-e)
  return q(n, d)
}

/** Zahl aus einer JS-Zahl (nur für saubere Werte wie 0.25, 3, 6.022e23) */
export function qFromNumber(x: number): Q {
  if (!Number.isFinite(x)) throw new CalcError('Ungültige Zahl.')
  if (Number.isInteger(x) && Math.abs(x) < 2 ** 53) return q(x)
  const s = Math.abs(x)
    .toExponential(14)
    .replace(/0+e/, 'e')
    .replace(/\.e/, 'e')
  const r = qFromRaw(s)
  return x < 0 ? neg(r) : r
}

/* ---------------------------- Teilbarkeit ---------------------------- */

export function isTerminating(a: Q) {
  let d = a.d
  while (d % 2n === 0n) d /= 2n
  while (d % 5n === 0n) d /= 5n
  return d === 1n
}

/** Primfaktoren einer (nicht zu großen) natürlichen Zahl */
export function primeFactorsBig(n: bigint): bigint[] {
  const out: bigint[] = []
  let x = babs(n)
  if (x < 2n) return out
  for (let p = 2n; p * p <= x; p += p === 2n ? 1n : 2n) {
    while (x % p === 0n) {
      out.push(p)
      x /= p
    }
    if (p > 100000n) break
  }
  if (x > 1n) out.push(x)
  return out
}

/** größte ganze k-te Wurzel, falls exakt */
export function exactRoot(n: bigint, k: number): bigint | null {
  if (n < 0n) {
    if (k % 2 === 0) return null
    const r = exactRoot(-n, k)
    return r === null ? null : -r
  }
  if (n < 2n) return n
  let r = BigInt(Math.round(Math.pow(Number(n), 1 / k)))
  for (const c of [r - 1n, r, r + 1n]) if (c >= 0n && c ** BigInt(k) === n) return c
  // Newton für sehr große Zahlen: monoton fallend, Abbruch sobald es nicht mehr kleiner wird
  const K = BigInt(k)
  r = n
  for (;;) {
    const y = ((K - 1n) * r + n / r ** (K - 1n)) / K
    if (y >= r) break
    r = y
  }
  for (const c of [r - 1n, r, r + 1n]) if (c >= 0n && c ** K === n) return c
  return null
}

/** Exakte k-te Wurzel eines Bruchs (oder null) */
export function qRoot(a: Q, k: number): Q | null {
  const n = exactRoot(a.n, k)
  const d = exactRoot(a.d, k)
  return n === null || d === null ? null : q(n, d)
}

/** √(n) = f · √r mit quadratfreiem r (teilweise Wurzelziehen) */
export function splitSqrt(n: bigint): { f: bigint; r: bigint } {
  let f = 1n
  let r = 1n
  const counts = new Map<bigint, number>()
  for (const p of primeFactorsBig(n)) counts.set(p, (counts.get(p) ?? 0) + 1)
  counts.forEach((c, p) => {
    f *= p ** BigInt(Math.floor(c / 2))
    if (c % 2) r *= p
  })
  return { f, r }
}

/* ---------------------------- Ausgabe ---------------------------- */

function group3(s: string, sep: string) {
  if (s.length <= 4) return s
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

/** exakte Dezimaldarstellung (nur für abbrechende Brüche), mit Punkt */
export function decStr(a: Q): string {
  const neg_ = a.n < 0n
  let d = a.d
  let twos = 0
  let fives = 0
  while (d % 2n === 0n) {
    d /= 2n
    twos++
  }
  while (d % 5n === 0n) {
    d /= 5n
    fives++
  }
  if (d !== 1n) return toNum(a).toString()
  // auf Zehnerpotenz im Nenner erweitern
  const k = Math.max(twos, fives)
  const num = babs(a.n) * 2n ** BigInt(k - twos) * 5n ** BigInt(k - fives)
  let s = num.toString()
  if (k > 0) {
    s = s.padStart(k + 1, '0')
    s = s.slice(0, -k) + '.' + s.slice(-k)
    s = s.replace(/0+$/, '').replace(/\.$/, '')
  }
  return (neg_ ? '-' : '') + s
}

export interface Fmt {
  /** abbrechende Brüche als Dezimalzahl zeigen (die Eingabe hatte Kommazahlen) */
  dec?: boolean
}

/** Betrag als TeX-Zahl ohne Vorzeichen */
function absTex(a: Q, f: Fmt): string {
  const n = babs(a.n)
  if (a.d === 1n) return group3(n.toString(), '\\,')
  if (f.dec && isTerminating(a)) {
    const [i, fr] = decStr(q(n, a.d)).split('.')
    return group3(i, '\\,') + (fr ? `{,}${fr}` : '')
  }
  return `\\frac{${group3(n.toString(), '\\,')}}{${group3(a.d.toString(), '\\,')}}`
}

/** Zahl als TeX: 3, -\frac{7}{12}, 3{,}25 */
export function qTex(a: Q, f: Fmt = {}): string {
  return (a.n < 0n ? '-' : '') + absTex(a, f)
}

/** Zahl in Klammern, falls negativ: (−3) */
export function qTexPar(a: Q, f: Fmt = {}): string {
  return a.n < 0n ? `\\left(${qTex(a, f)}\\right)` : qTex(a, f)
}

/** Bruch als TeX nur mit Zähler/Nenner-Betrag (für Zähler-/Nennerzeilen) */
export function qAbsTex(a: Q, f: Fmt = {}) {
  return absTex(a, f)
}

/** Text ohne TeX: „3,25“, „7/12“, „−2“ */
export function qText(a: Q, f: Fmt = {}): string {
  const s = a.n < 0n ? '−' : ''
  const n = babs(a.n)
  if (a.d === 1n) return s + group3(n.toString(), '.')
  if (f.dec && isTerminating(a)) return s + decStr(q(n, a.d)).replace('.', ',')
  return `${s}${n}/${a.d}`
}

/** Näherungswert als TeX-Zahl mit `sig` gültigen Ziffern: 3{,}333 · 1{,}807 \cdot 10^{21} */
export function approxTex(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '\\text{–}'
  if (x === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(x)))
  if (e >= 7 || e <= -5) {
    let m = x / 10 ** e
    let ee = e
    if (Math.abs(Number(m.toFixed(sig - 1))) >= 10) {
      m /= 10
      ee++
    }
    return `${numTex(Number(m.toFixed(sig - 1)))} \\cdot 10^{${ee}}`
  }
  const digits = Math.max(0, Math.min(10, sig - 1 - e))
  return numTex(Number(x.toFixed(digits)))
}

/** JS-Zahl als TeX mit Dezimalkomma */
export function numTex(x: number): string {
  const s = Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 10, useGrouping: false })
  const [i, f] = s.split('.')
  return (x < 0 ? '-' : '') + group3(i, '\\,') + (f ? `{,}${f}` : '')
}

/** Näherung als Text mit Komma */
export function approxText(x: number, sig = 4): string {
  return approxTex(x, sig)
    .replace(/\{,\}/g, ',')
    .replace(/\\,/g, ' ')
    .replace(' \\cdot 10^{', ' · 10^')
    .replace('}', '')
    .replace('-', '−')
}
