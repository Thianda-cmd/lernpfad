import type { Rng } from '../../lib/random'

export const int = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1))

/** Ganze Zahl ungleich 0 */
export function nz(rng: Rng, a: number, b: number) {
  let v = 0
  while (v === 0) v = int(rng, a, b)
  return v
}

export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const chance = (rng: Rng, p: number) => rng() < p

/** Zufällige Dezimalzahl mit einer Nachkommastelle */
export const dec1 = (rng: Rng, a: number, b: number) => int(rng, a * 10, b * 10) / 10

export const VAR_SETS = [
  ['x', 'y'],
  ['a', 'b'],
  ['p', 'q'],
  ['u', 'v'],
  ['m', 'n'],
  ['r', 's'],
] as const

export const VAR_SETS3 = [
  ['a', 'b', 'c'],
  ['u', 'v', 'w'],
  ['x', 'y', 'z'],
] as const

/** Zahl im Aufgabentext deutsch */
export function de(n: number, digits = 4) {
  const r = Math.round(n * 10 ** digits) / 10 ** digits
  return (r < 0 ? '−' : '') + Math.abs(r).toLocaleString('de-DE', { maximumFractionDigits: digits, useGrouping: false })
}
