/** Atommassen, Summenformeln und molare Massen für das chemische Rechnen. */

export const ELEMENTS: Record<string, { name: string; m: number }> = {
  H: { name: 'Wasserstoff', m: 1.01 },
  He: { name: 'Helium', m: 4.0 },
  Li: { name: 'Lithium', m: 6.94 },
  C: { name: 'Kohlenstoff', m: 12.01 },
  N: { name: 'Stickstoff', m: 14.01 },
  O: { name: 'Sauerstoff', m: 16.0 },
  F: { name: 'Fluor', m: 19.0 },
  Na: { name: 'Natrium', m: 22.99 },
  Mg: { name: 'Magnesium', m: 24.31 },
  Al: { name: 'Aluminium', m: 26.98 },
  Si: { name: 'Silicium', m: 28.09 },
  P: { name: 'Phosphor', m: 30.97 },
  S: { name: 'Schwefel', m: 32.06 },
  Cl: { name: 'Chlor', m: 35.45 },
  K: { name: 'Kalium', m: 39.1 },
  Ca: { name: 'Calcium', m: 40.08 },
  Cr: { name: 'Chrom', m: 52.0 },
  Mn: { name: 'Mangan', m: 54.94 },
  Fe: { name: 'Eisen', m: 55.85 },
  Co: { name: 'Cobalt', m: 58.93 },
  Ni: { name: 'Nickel', m: 58.69 },
  Cu: { name: 'Kupfer', m: 63.55 },
  Zn: { name: 'Zink', m: 65.38 },
  As: { name: 'Arsen', m: 74.92 },
  Br: { name: 'Brom', m: 79.9 },
  Ag: { name: 'Silber', m: 107.87 },
  Sn: { name: 'Zinn', m: 118.71 },
  I: { name: 'Iod', m: 126.9 },
  Ba: { name: 'Barium', m: 137.33 },
  Au: { name: 'Gold', m: 196.97 },
  Hg: { name: 'Quecksilber', m: 200.59 },
  Pb: { name: 'Blei', m: 207.2 },
}

export const NA = 6.022e23

export type Counts = { el: string; n: number }[]

export class FormulaError extends Error {}

/** „Ca3(PO4)2“ → [{Ca:3},{P:2},{O:8}] in Reihenfolge des Auftretens. */
export function parseFormula(src: string): Counts {
  const s = src.replace(/\s+/g, '').replace(/[·*•]/g, '·')
  const parts = s.split('·')
  const total = new Map<string, number>()
  const add = (el: string, n: number) => total.set(el, (total.get(el) ?? 0) + n)
  for (const part0 of parts) {
    const mult = /^\d+/.exec(part0)
    const k = mult ? parseInt(mult[0], 10) : 1
    const part = mult ? part0.slice(mult[0].length) : part0
    let i = 0
    const seq = (): Map<string, number> => {
      const m = new Map<string, number>()
      while (i < part.length && part[i] !== ')') {
        if (part[i] === '(') {
          i++
          const inner = seq()
          if (part[i] !== ')') throw new FormulaError('Klammer nicht geschlossen')
          i++
          const n = num()
          inner.forEach((v, key) => m.set(key, (m.get(key) ?? 0) + v * n))
          continue
        }
        const el = /^[A-Z][a-z]?/.exec(part.slice(i))
        if (!el) throw new FormulaError(`Unbekanntes Zeichen „${part[i]}“`)
        let sym = el[0]
        if (!ELEMENTS[sym] && sym.length === 2 && ELEMENTS[sym[0]]) sym = sym[0]
        if (!ELEMENTS[sym]) throw new FormulaError(`Element „${el[0]}“ ist nicht in der Tabelle`)
        i += sym.length
        const n = num()
        m.set(sym, (m.get(sym) ?? 0) + n)
      }
      return m
    }
    const num = () => {
      const r = /^\d+/.exec(part.slice(i))
      if (!r) return 1
      i += r[0].length
      return parseInt(r[0], 10)
    }
    const m = seq()
    if (i < part.length) throw new FormulaError('Zu viele schließende Klammern')
    m.forEach((v, key) => add(key, v * k))
  }
  if (!total.size) throw new FormulaError('Leere Formel')
  return [...total.entries()].map(([el, n]) => ({ el, n }))
}

export function molarMass(c: Counts) {
  return c.reduce((s, x) => s + ELEMENTS[x.el].m * x.n, 0)
}

/** Summenformel für TeX: \mathrm{Ca_3(PO_4)_2} */
export function formulaTex(src: string) {
  const body = src
    .replace(/[·*•]/g, '\\cdot ')
    .replace(/(\\cdot )(\d+)/g, '$1$2')
    .replace(/([A-Za-z)])(\d+)/g, '$1_{$2}')
  return `\\mathrm{${body}}`
}

/** Rechenweg für die molare Masse: 137,33 + 32,06 + 4 · 16,00 */
export function molarMassTex(c: Counts) {
  return c.map((x) => (x.n === 1 ? tn2(ELEMENTS[x.el].m) : `${x.n} \\cdot ${tn2(ELEMENTS[x.el].m)}`)).join(' + ')
}

const tn2 = (v: number) => v.toFixed(2).replace('.', '{,}')

export interface Compound {
  f: string
  name: string
}

export const COMPOUNDS: Compound[] = [
  { f: 'BaSO4', name: 'Bariumsulfat' },
  { f: 'Ca(NO3)2', name: 'Calciumnitrat' },
  { f: 'Ba(OH)2', name: 'Bariumhydroxid' },
  { f: 'AlCl3', name: 'Aluminiumchlorid' },
  { f: 'MgSO4', name: 'Magnesiumsulfat' },
  { f: 'ZnS', name: 'Zinksulfid' },
  { f: 'Na2SO4', name: 'Natriumsulfat' },
  { f: 'Na2CO3', name: 'Natriumcarbonat' },
  { f: 'Ca3(PO4)2', name: 'Calciumphosphat' },
  { f: 'CaCO3', name: 'Calciumcarbonat' },
  { f: 'AgNO3', name: 'Silbernitrat' },
  { f: 'FeO', name: 'Eisen(II)-oxid' },
  { f: 'Fe2O3', name: 'Eisen(III)-oxid' },
  { f: 'Al2(SO4)3', name: 'Aluminiumsulfat' },
  { f: 'Ca(OH)2', name: 'Calciumhydroxid' },
  { f: 'As2O3', name: 'Arsentrioxid' },
  { f: 'NaCl', name: 'Natriumchlorid' },
  { f: 'H2O', name: 'Wasser' },
  { f: 'CO2', name: 'Kohlenstoffdioxid' },
  { f: 'H2SO4', name: 'Schwefelsäure' },
  { f: 'HNO3', name: 'Salpetersäure' },
  { f: 'NaOH', name: 'Natriumhydroxid' },
  { f: 'KMnO4', name: 'Kaliumpermanganat' },
  { f: 'CuSO4', name: 'Kupfer(II)-sulfat' },
  { f: 'KCl', name: 'Kaliumchlorid' },
  { f: 'KNO3', name: 'Kaliumnitrat' },
  { f: 'NH3', name: 'Ammoniak' },
  { f: 'C6H12O6', name: 'Glucose' },
  { f: 'NaHCO3', name: 'Natriumhydrogencarbonat' },
  { f: 'MgCl2', name: 'Magnesiumchlorid' },
]

/* ---------------------------- Einheiten ---------------------------- */

export const MASS_UNITS = [
  { u: 'kg', f: 1e3 },
  { u: 'g', f: 1 },
  { u: 'mg', f: 1e-3 },
  { u: 'µg', f: 1e-6 },
  { u: 'ng', f: 1e-9 },
] as const

export const MOL_UNITS = [
  { u: 'mol', f: 1 },
  { u: 'mmol', f: 1e-3 },
  { u: 'µmol', f: 1e-6 },
  { u: 'nmol', f: 1e-9 },
] as const

/** Einheit wählen, in der der Wert zwischen 0,1 und 1000 liegt. */
export function bestUnit<T extends { u: string; f: number }>(v: number, units: readonly T[]): T {
  for (const u of units) {
    const x = v / u.f
    if (x >= 0.1 && x < 1000) return u
  }
  return units[units.length - 1]
}

export const unitTex = (u: string) => `\\text{${u}}`
