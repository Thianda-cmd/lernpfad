import { BY_SYM, type Element } from './elements'

export type Counts = { el: Element; n: number }[]

export class FormulaError extends Error {}

/**
 * Summenformel zerlegen: „Ca3(PO4)2“, „CuSO4·5H2O“, „[Fe(CN)6]“, „CH3COOH“.
 * Ergebnis in der Reihenfolge des ersten Auftretens.
 */
export function parseFormula(src: string): Counts {
  const s = src.replace(/\s+/g, '').replace(/[*•.]/g, '·').replace(/[[{]/g, '(').replace(/[\]}]/g, ')')
  if (!s) throw new FormulaError('Bitte eine Formel eingeben.')
  const total = new Map<string, number>()
  for (const part0 of s.split('·')) {
    if (!part0) continue
    const lead = /^\d+/.exec(part0)
    const k = lead ? parseInt(lead[0], 10) : 1
    const part = lead ? part0.slice(lead[0].length) : part0
    let i = 0
    const num = () => {
      const r = /^\d+/.exec(part.slice(i))
      if (!r) return 1
      i += r[0].length
      return parseInt(r[0], 10)
    }
    const seq = (depth: number): Map<string, number> => {
      const m = new Map<string, number>()
      while (i < part.length) {
        const c = part[i]
        if (c === ')') {
          if (!depth) throw new FormulaError('Zu viele schließende Klammern.')
          break
        }
        if (c === '(') {
          i++
          const inner = seq(depth + 1)
          if (part[i] !== ')') throw new FormulaError('Eine Klammer wird nicht geschlossen.')
          i++
          const n = num()
          inner.forEach((v, key) => m.set(key, (m.get(key) ?? 0) + v * n))
          continue
        }
        const r = /^[A-Z][a-z]?/.exec(part.slice(i))
        if (!r) throw new FormulaError(`„${c}“ ist kein Elementsymbol. Symbole beginnen mit einem Großbuchstaben.`)
        let sym = r[0]
        if (!BY_SYM[sym] && sym.length === 2 && BY_SYM[sym[0]]) sym = sym[0]
        if (!BY_SYM[sym]) throw new FormulaError(`Unbekanntes Element „${r[0]}“.`)
        i += sym.length
        m.set(sym, (m.get(sym) ?? 0) + num())
      }
      return m
    }
    const m = seq(0)
    if (i < part.length) throw new FormulaError('Zu viele schließende Klammern.')
    m.forEach((v, key) => total.set(key, (total.get(key) ?? 0) + v * k))
  }
  if (!total.size) throw new FormulaError('Bitte eine Formel eingeben.')
  return [...total.entries()].map(([sym, n]) => ({ el: BY_SYM[sym], n }))
}

export function molarMass(c: Counts) {
  return c.reduce((s, x) => s + x.el.mass * x.n, 0)
}

export const NA = 6.02214076e23
