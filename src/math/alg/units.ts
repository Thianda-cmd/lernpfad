/**
 * Gemeinsame Bausteine für das Laborrechnen: Einheiten mit Umrechnungsfaktor,
 * Einheiten als TeX und Zahlen „exakt, wenn kurz – sonst gerundet“.
 */
import { approxTex, div, isTerminating, q, qTex, toNum, type Q } from '../q'

/** Dezimalzahlen statt Brüche anzeigen */
export const F = { dec: true }

/** Einheit mit Faktor zur Grundeinheit (g, mol, L, mol/L, g/L, m, Pa, s) */
export interface Unit {
  u: string
  f: Q
}

const u = (name: string, n: number | bigint, d: number | bigint = 1): Unit => ({ u: name, f: q(n, d) })

/** Grundeinheit g */
export const MASS_U: readonly Unit[] = [u('kg', 1000), u('g', 1), u('mg', 1, 1000), u('µg', 1, 1_000_000), u('ng', 1, 1_000_000_000), u('pg', 1, 1_000_000_000_000n)]
/** Grundeinheit mol */
export const MOL_U: readonly Unit[] = [u('mol', 1), u('mmol', 1, 1000), u('µmol', 1, 1_000_000), u('nmol', 1, 1_000_000_000), u('pmol', 1, 1_000_000_000_000n)]
/** Grundeinheit L */
export const VOL_U: readonly Unit[] = [u('m³', 1000), u('L', 1), u('mL', 1, 1000), u('µL', 1, 1_000_000), u('nL', 1, 1_000_000_000)]
/** Stoffmengenkonzentration, Grundeinheit mol/L */
export const CONC_U: readonly Unit[] = [u('mol/L', 1), u('mmol/L', 1, 1000), u('µmol/L', 1, 1_000_000), u('nmol/L', 1, 1_000_000_000)]
/** Massenkonzentration, Grundeinheit g/L (mg/mL = g/L, µg/mL = mg/L = ng/µL) */
export const MCONC_U: readonly Unit[] = [u('g/L', 1), u('mg/mL', 1), u('mg/L', 1, 1000), u('µg/mL', 1, 1000), u('ng/µL', 1, 1000), u('µg/L', 1, 1_000_000), u('ng/mL', 1, 1_000_000)]
/** Grundeinheit m */
export const LEN_U: readonly Unit[] = [u('km', 1000), u('m', 1), u('cm', 1, 100), u('mm', 1, 1000), u('µm', 1, 1_000_000), u('nm', 1, 1_000_000_000)]
/** Grundeinheit Pa */
export const PRESS_U: readonly Unit[] = [u('bar', 100_000), u('atm', 101_325), u('kPa', 1000), u('hPa', 100), u('mbar', 100), u('Pa', 1)]
/** Grundeinheit s */
export const TIME_U: readonly Unit[] = [u('d', 86_400), u('h', 3600), u('min', 60), u('s', 1)]

export const unitNames = (list: readonly Unit[]) => list.map((x) => x.u)

/** Faktor einer Einheit (unbekannt → 1) */
export function fac(list: readonly Unit[], name: string): Q {
  return list.find((x) => x.u === name)?.f ?? q(1)
}

/**
 * Einheit als TeX mit kleinem Abstand davor: „µg/mL“ → \,\mu\text{g/mL}, „°C“ → \,^{\circ}\text{C}.
 * Leere Einheit → ''.
 */
export function T(name: string): string {
  if (!name) return ''
  const parts = name.split(/(µ|°|%|‰|³|²|⁻¹)/).filter(Boolean)
  const out = parts
    .map((p) => {
      switch (p) {
        case 'µ':
          return '\\mu'
        case '°':
          return '^{\\circ}'
        case '%':
          return '\\%'
        case '‰':
          return '\\text{‰}'
        case '³':
          return '^{3}'
        case '²':
          return '^{2}'
        case '⁻¹':
          return '^{-1}'
        default:
          return `\\text{${p}}`
      }
    })
    .join('')
  return `\\,${out}`
}

/** Zahl als TeX: exakt, wenn kurz – sonst `sig` gültige Ziffern */
export function num(x: Q, sig = 4): { t: string; approx: boolean } {
  if (isTerminating(x)) {
    const t = qTex(x, F)
    if (t.replace(/[^0-9]/g, '').length <= 7 && Math.abs(toNum(x)) >= 1e-4 && Math.abs(toNum(x)) < 1e7) return { t, approx: false }
  }
  return { t: approxTex(toNum(x), sig), approx: true }
}
/** nur die Zahl */
export const nt = (x: Q, sig = 4) => num(x, sig).t
/** „= 3,5“ oder „≈ 3,333“ */
export const eqv = (x: Q, sig = 4) => {
  const r = num(x, sig)
  return `${r.approx ? '\\approx' : '='} ${r.t}`
}

/** Gleitkommazahl als TeX; approx = gerundet */
export function fnum(x: number, sig = 4): { t: string; approx: boolean } {
  if (!Number.isFinite(x)) return { t: '\\text{–}', approx: false }
  const t = approxTex(x, sig)
  const exact = x === 0 || Math.abs(x - Number(x.toPrecision(sig))) <= 1e-12 * Math.abs(x)
  return { t, approx: !exact }
}
export const fnt = (x: number, sig = 4) => fnum(x, sig).t
export const feqv = (x: number, sig = 4) => {
  const r = fnum(x, sig)
  return `${r.approx ? '\\approx' : '='} ${r.t}`
}

/** Wert in passender Einheit (Betrag zwischen 0,1 und 1000), Liste groß → klein */
export function best(x: Q, list: readonly Unit[]): { u: string; v: Q } {
  const v = Math.abs(toNum(x))
  if (v === 0) {
    const base = list.find((e) => toNum(e.f) === 1) ?? list[0]
    return { u: base.u, v: div(x, base.f) }
  }
  for (const e of list) {
    const r = v / toNum(e.f)
    if (r >= 0.1 && r < 1000) return { u: e.u, v: div(x, e.f) }
  }
  const last = list[list.length - 1]
  return v >= 1000 * toNum(list[0].f) ? { u: list[0].u, v: div(x, list[0].f) } : { u: last.u, v: div(x, last.f) }
}

/** wie best(), aber für Gleitkommazahlen */
export function bestF(x: number, list: readonly Unit[]): { u: string; v: number } {
  const v = Math.abs(x)
  if (v === 0) {
    const base = list.find((e) => toNum(e.f) === 1) ?? list[0]
    return { u: base.u, v: 0 }
  }
  for (const e of list) {
    const r = v / toNum(e.f)
    if (r >= 0.1 && r < 1000) return { u: e.u, v: x / toNum(e.f) }
  }
  const last = list[list.length - 1]
  return v >= 1000 * toNum(list[0].f) ? { u: list[0].u, v: x / toNum(list[0].f) } : { u: last.u, v: x / toNum(last.f) }
}
