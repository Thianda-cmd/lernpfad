/**
 * Kenngrößen von Messreihen und lineare Regression (Kalibriergerade).
 * Rechnet mit Gleitkommazahlen – Messwerte sind ohnehin gerundet.
 */

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function mean(xs: number[]): number {
  return xs.length ? sum(xs) / xs.length : NaN
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Varianz der Stichprobe (n − 1 im Nenner) */
export function variance(xs: number[]): number {
  if (xs.length < 2) return NaN
  const m = mean(xs)
  return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1)
}

/** Standardabweichung der Stichprobe (n − 1) */
export const sd = (xs: number[]) => Math.sqrt(variance(xs))

export interface LinReg {
  n: number
  /** Steigung */
  m: number
  /** Achsenabschnitt */
  b: number
  /** Korrelationskoeffizient */
  r: number
  /** Bestimmtheitsmaß */
  r2: number
  xm: number
  ym: number
  sxx: number
  sxy: number
  syy: number
  /** Reststandardabweichung s_y (n − 2) */
  sy: number
}

/** Ausgleichsgerade y = m·x + b nach der Methode der kleinsten Quadrate */
export function linReg(pts: [number, number][]): LinReg {
  const n = pts.length
  const xm = mean(pts.map((p) => p[0]))
  const ym = mean(pts.map((p) => p[1]))
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const [x, y] of pts) {
    sxx += (x - xm) ** 2
    sxy += (x - xm) * (y - ym)
    syy += (y - ym) ** 2
  }
  const m = sxy / sxx
  const b = ym - m * xm
  const r = sxy / Math.sqrt(sxx * syy)
  const res = sum(pts.map(([x, y]) => (y - (m * x + b)) ** 2))
  return { n, m, b, r, r2: r * r, xm, ym, sxx, sxy, syy, sy: n > 2 ? Math.sqrt(res / (n - 2)) : NaN }
}

/** Ausgleichsgerade durch den Ursprung y = m·x */
export function linRegOrigin(pts: [number, number][]): { m: number; r2: number } {
  const sxy = sum(pts.map(([x, y]) => x * y))
  const sxx = sum(pts.map(([x]) => x * x))
  const m = sxy / sxx
  const ym = mean(pts.map((p) => p[1]))
  const ssRes = sum(pts.map(([x, y]) => (y - m * x) ** 2))
  const ssTot = sum(pts.map(([, y]) => (y - ym) ** 2))
  return { m, r2: 1 - ssRes / ssTot }
}
