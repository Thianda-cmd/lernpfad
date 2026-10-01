/** Zahlen deutsch formatieren und einfache Zahlentheorie. */

export function round(n: number, digits = 6) {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/** 3.5 → „3,5“ (höchstens `digits` Nachkommastellen, ohne überflüssige Nullen). */
export function fmt(n: number, digits = 4) {
  if (!Number.isFinite(n)) return '–'
  const r = round(n, digits)
  const s = Math.abs(r).toLocaleString('de-DE', { maximumFractionDigits: digits, useGrouping: false })
  return (r < 0 ? '−' : '') + s
}

/** Wie `fmt`, aber mit Tausenderpunkten (für Geldbeträge, Einwohner …). */
export function fmtG(n: number, digits = 2) {
  const r = round(n, digits)
  return (r < 0 ? '−' : '') + Math.abs(r).toLocaleString('de-DE', { maximumFractionDigits: digits })
}

/** Zahl für TeX: Dezimalkomma als `{,}`. */
export function tn(n: number, digits = 4) {
  const r = round(n, digits)
  const s = Math.abs(r).toLocaleString('en-US', { maximumFractionDigits: digits, useGrouping: false }).replace('.', '{,}')
  return (r < 0 ? '-' : '') + s
}

/** Wissenschaftliche Schreibweise für TeX: 1{,}807 \cdot 10^{21} */
export function tsci(n: number, sig = 4) {
  if (n === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(n)))
  if (e >= -2 && e <= 4) return tn(n, Math.max(0, sig - 1 - e))
  const m = n / 10 ** e
  return `${tn(m, sig - 1)} \\cdot 10^{${e}}`
}

/** Wissenschaftliche Schreibweise als Text: 1,807 · 10²¹ */
export function fsci(n: number, sig = 4) {
  if (n === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(n)))
  if (e >= -2 && e <= 4) return fmt(n, Math.max(0, sig - 1 - e))
  const m = n / 10 ** e
  return `${fmt(m, sig - 1)} · 10${sup(e)}`
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
export function sup(n: number) {
  return String(n)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('')
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

export function lcm(a: number, b: number) {
  return Math.abs(a * b) / gcd(a, b)
}

export function primeFactors(n: number) {
  const out: number[] = []
  let x = Math.abs(n)
  for (let p = 2; p * p <= x; p++) {
    while (x % p === 0) {
      out.push(p)
      x /= p
    }
  }
  if (x > 1) out.push(x)
  return out
}

/** Bruch in TeX, gekürzt, mit Vorzeichen vor dem Bruch. */
export function tfrac(num: number, den: number, reduce = true) {
  if (den < 0) {
    num = -num
    den = -den
  }
  if (reduce) {
    const g = gcd(num, den) || 1
    num /= g
    den /= g
  }
  if (den === 1) return String(num)
  return `${num < 0 ? '-' : ''}\\frac{${Math.abs(num)}}{${den}}`
}

/** Zahl mit Vorzeichen als TeX-Summand: „+ 3“ / „- 3“. */
export function tsigned(n: number, digits = 4) {
  return n < 0 ? `- ${tn(-n, digits)}` : `+ ${tn(n, digits)}`
}

/** Zahl in Klammern, wenn negativ: (−3) */
export function tpar(n: number, digits = 4) {
  return n < 0 ? `(${tn(n, digits)})` : tn(n, digits)
}
