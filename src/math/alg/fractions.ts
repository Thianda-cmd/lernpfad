/**
 * Bruchrechner: Rechenausdrücke mit Brüchen Schritt für Schritt –
 * Hauptnenner, Erweitern, Kehrwert, Doppelbrüche, Kürzen, gemischte Zahlen.
 * „3/4“ zwischen zwei ganzen Zahlen ist ein Bruch (bindet stärker als · und :).
 */
import { toTex, tryParse } from '../expr'
import { primeFactors } from '../num'
import {
  add,
  bgcd,
  blcm,
  CalcError,
  div,
  isInt,
  isTerminating,
  isZero,
  mul,
  neg,
  ONE,
  q,
  qabs,
  qFromRaw,
  qpow,
  qTex,
  sign,
  toNum,
  approxTex,
  decStr,
  type Q,
} from '../q'
import { combine, sortTerms, sumTex, termAbsTex, termDiv, termMul, termPow, termTex, type Term } from './poly'
import type { Solution, Step } from './step'
import { parseW, single, wTex, type W } from './tree'

type Lit = 'int' | 'frac' | 'dec' | 'mixed'

type FN =
  | { t: 'num'; v: Q; lit: Lit; raw?: { w?: bigint; n: bigint; d: bigint; s: string } }
  | { t: 'add'; it: { s: 1 | -1; e: FN }[] }
  | { t: 'mul'; it: { op: '·' | ':'; e: FN }[] }
  | { t: 'neg'; e: FN }
  | { t: 'pow'; e: FN; k: number }
  | { t: 'grp'; e: FN; sq?: boolean }
  | { t: 'frac'; a: FN; b: FN }
  | { t: 'tex'; s: string }

/* ---------------------------- Einlesen ---------------------------- */

type Tok = { k: 'num'; v: string } | { k: 'op'; v: string; raw: string }

const UNI: Record<string, string> = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' }

function tokenize(src: string): Tok[] {
  const s = src.replace(/[½⅓⅔¼¾⅕⅛⅜⅝⅞]/g, (c) => ` ${UNI[c]}`)
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) {
      // Leerzeichen merken (für gemischte Zahlen „2 1/2“)
      if (out.length && out[out.length - 1].k === 'num') out.push({ k: 'op', v: ' ', raw: ' ' })
      i++
      continue
    }
    if (/[0-9]/.test(c) || ((c === ',' || c === '.') && /[0-9]/.test(s[i + 1] ?? ''))) {
      let j = i
      while (j < s.length && /[0-9]/.test(s[j])) j++
      if ((s[j] === ',' || s[j] === '.') && /[0-9]/.test(s[j + 1] ?? '')) {
        j++
        while (j < s.length && /[0-9]/.test(s[j])) j++
      }
      out.push({ k: 'num', v: s.slice(i, j).replace(',', '.') })
      i = j
      continue
    }
    const map: Record<string, string> = { '+': '+', '-': '-', '−': '-', '–': '-', '*': '·', '·': '·', '⋅': '·', '×': '·', ':': ':', '÷': ':', '/': '/', '^': '^', '(': '(', ')': ')', '[': '(', ']': ')' }
    if (map[c]) {
      out.push({ k: 'op', v: map[c], raw: c })
      i++
      continue
    }
    if (/[a-zA-Z]/.test(c)) throw new CalcError('VAR')
    throw new CalcError(`Unbekanntes Zeichen „${c}“.`)
  }
  // Leerzeichen nur dort behalten, wo eine gemischte Zahl entsteht: Zahl ␣ Zahl / Zahl
  return out.filter((t, k) => !(t.k === 'op' && t.v === ' ' && !(out[k + 1]?.k === 'num' && out[k + 2]?.k === 'op' && (out[k + 2] as { v: string }).v === '/' && out[k + 3]?.k === 'num')))
}

const isIntStr = (s: string) => /^\d+$/.test(s)

class P {
  i = 0
  constructor(private ts: Tok[]) {}
  peek(): Tok | undefined {
    return this.ts[this.i]
  }
  op(v: string) {
    const t = this.peek()
    return t?.k === 'op' && t.v === v
  }
  parse(): FN {
    if (!this.ts.length) throw new CalcError('Bitte einen Ausdruck eingeben.')
    const e = this.expr()
    if (this.i < this.ts.length) throw new CalcError('Unerwartetes Zeichen – fehlt ein Rechenzeichen?')
    return e
  }
  expr(): FN {
    const it: { s: 1 | -1; e: FN }[] = [{ s: 1, e: this.term() }]
    while (this.op('+') || this.op('-')) {
      const s = (this.op('+') ? 1 : -1) as 1 | -1
      this.i++
      it.push({ s, e: this.term() })
    }
    return it.length === 1 ? it[0].e : { t: 'add', it }
  }
  term(): FN {
    let cur = this.unary()
    for (;;) {
      if (this.op('·') || this.op(':')) {
        const op = (this.op('·') ? '·' : ':') as '·' | ':'
        this.i++
        const e = this.unary()
        if (cur.t === 'mul') cur.it.push({ op, e })
        else cur = { t: 'mul', it: [{ op: '·', e: cur }, { op, e }] }
        continue
      }
      if (this.op('/')) {
        this.i++
        const e = this.unary()
        cur = { t: 'frac', a: cur, b: e }
        continue
      }
      break
    }
    return cur
  }
  unary(): FN {
    if (this.op('-')) {
      this.i++
      return { t: 'neg', e: this.unary() }
    }
    if (this.op('+')) {
      this.i++
      return this.unary()
    }
    return this.power()
  }
  power(): FN {
    const b = this.primary()
    if (this.op('^')) {
      this.i++
      let negE = false
      if (this.op('-')) {
        this.i++
        negE = true
      }
      const t = this.peek()
      let k: number
      if (t?.k === 'num' && isIntStr(t.v)) {
        this.i++
        k = parseInt(t.v, 10)
      } else if (this.op('(')) {
        this.i++
        let neg2 = false
        if (this.op('-')) {
          this.i++
          neg2 = true
        }
        const u = this.peek()
        if (u?.k !== 'num' || !isIntStr(u.v)) throw new CalcError('Die Hochzahl muss eine ganze Zahl sein.')
        this.i++
        if (!this.op(')')) throw new CalcError('Klammer wird nicht geschlossen.')
        this.i++
        k = parseInt(u.v, 10) * (neg2 ? -1 : 1)
      } else throw new CalcError('Die Hochzahl muss eine ganze Zahl sein.')
      if (Math.abs(k) > 12) throw new CalcError('Die Hochzahl ist zu groß.')
      return { t: 'pow', e: b, k: negE ? -k : k }
    }
    return b
  }
  primary(): FN {
    const t = this.peek()
    if (!t) throw new CalcError('Der Ausdruck ist unvollständig.')
    if (t.k === 'num') {
      this.i++
      // gemischte Zahl: 2 1/2
      const a = this.ts[this.i]
      if (a?.k === 'op' && a.v === ' ') {
        const n = this.ts[this.i + 1] as { v: string }
        const d = this.ts[this.i + 3] as { v: string }
        if (isIntStr(t.v) && isIntStr(n.v) && isIntStr(d.v)) {
          this.i += 4
          const w = BigInt(t.v)
          const N = BigInt(n.v)
          const D = BigInt(d.v)
          if (D === 0n) throw new CalcError('Ein Nenner darf nicht 0 sein.')
          return { t: 'num', v: q(w * D + N, D), lit: 'mixed', raw: { w, n: N, d: D, s: `${t.v} ${n.v}/${d.v}` } }
        }
      }
      // Bruch aus zwei ganzen Zahlen: 3/4
      const sl = this.ts[this.i]
      const dn = this.ts[this.i + 1]
      if (isIntStr(t.v) && sl?.k === 'op' && sl.v === '/' && dn?.k === 'num' && isIntStr(dn.v)) {
        this.i += 2
        const N = BigInt(t.v)
        const D = BigInt(dn.v)
        if (D === 0n) throw new CalcError('Ein Nenner darf nicht 0 sein.')
        return { t: 'num', v: q(N, D), lit: 'frac', raw: { n: N, d: D, s: `${t.v}/${dn.v}` } }
      }
      if (isIntStr(t.v)) return { t: 'num', v: q(BigInt(t.v)), lit: 'int' }
      return { t: 'num', v: qFromRaw(t.v), lit: 'dec', raw: { n: 0n, d: 1n, s: t.v } }
    }
    if (t.k === 'op' && t.v === '(') {
      this.i++
      const e = this.expr()
      if (!this.op(')')) throw new CalcError('Eine Klammer wird nicht geschlossen.')
      this.i++
      return { t: 'grp', e, sq: t.raw === '[' }
    }
    throw new CalcError(t.k === 'op' && t.v === ')' ? 'Zu viele schließende Klammern.' : 'Unerwartetes Rechenzeichen.')
  }
}

/* ---------------------------- Ausgabe ---------------------------- */

const absB = (a: bigint) => (a < 0n ? -a : a)

/** Wert als TeX (Betrag + Vorzeichen) */
function valTex(n: Extract<FN, { t: 'num' }>): string {
  if (n.lit === 'mixed' && n.raw?.w !== undefined) return `${n.raw.w}\\tfrac{${n.raw.n}}{${n.raw.d}}`
  if (n.lit === 'frac' && n.raw) return `${n.raw.n < 0n ? '-' : ''}\\frac{${absB(n.raw.n)}}{${n.raw.d}}`
  if (n.lit === 'dec' && isTerminating(n.v)) return qTex(n.v, { dec: true })
  return qTex(n.v)
}

const isNeg = (n: FN) => n.t === 'num' && sign(n.v) < 0

function fTex(n: FN, ctx: 'top' | 'item' | 'factor' | 'base' = 'top'): string {
  switch (n.t) {
    case 'num': {
      const s = valTex(n)
      if (isNeg(n) && ctx !== 'top') return `\\left(${s}\\right)`
      if (ctx === 'base' && (n.lit !== 'int' || isNeg(n))) return `\\left(${s}\\right)`
      return s
    }
    case 'tex':
      return n.s
    case 'grp':
      return n.sq ? `\\left[${fTex(n.e)}\\right]` : `\\left(${fTex(n.e)}\\right)`
    case 'neg':
      return ctx === 'top' ? `-${fTex(n.e, 'factor')}` : `\\left(-${fTex(n.e, 'factor')}\\right)`
    case 'add': {
      const s = n.it.map((x, i) => (i === 0 ? (x.s < 0 ? '-' : '') : x.s < 0 ? ' - ' : ' + ') + fTex(x.e, i === 0 && x.s > 0 ? 'top' : 'item')).join('')
      return ctx === 'factor' || ctx === 'base' ? `\\left(${s}\\right)` : s
    }
    case 'mul': {
      const s = n.it.map((x, i) => (i === 0 ? fTex(x.e, ctx === 'top' || ctx === 'item' ? 'top' : 'factor') : (x.op === ':' ? ' : ' : ' \\cdot ') + fTex(x.e, 'factor'))).join('')
      return ctx === 'base' ? `\\left(${s}\\right)` : s
    }
    case 'pow':
      return `${fTex(n.e, 'base')}^{${n.k}}`
    case 'frac': {
      const strip = (x: FN) => (x.t === 'grp' ? x.e : x)
      return `\\frac{${fTex(strip(n.a))}}{${fTex(strip(n.b))}}`
    }
  }
}

/* ---------------------------- Rechnen ---------------------------- */

const num = (v: Q, dec = false): Extract<FN, { t: 'num' }> =>
  isInt(v) ? { t: 'num', v, lit: 'int' } : dec && isTerminating(v) ? { t: 'num', v, lit: 'dec' } : { t: 'num', v, lit: 'frac', raw: { n: v.n, d: v.d, s: '' } }

function asVal(n: FN): Q | null {
  if (n.t === 'num') return n.v
  if (n.t === 'grp') return asVal(n.e)
  if (n.t === 'neg') {
    const v = asVal(n.e)
    return v && neg(v)
  }
  return null
}

/** Bruch-TeX eines Werts mit Vorzeichen */
const fr = (v: Q) => qTex(v)
const frAbs = (v: Q) => qTex(qabs(v))

function pf(n: bigint) {
  const x = Number(absB(n))
  if (!Number.isSafeInteger(x) || x < 2) return String(absB(n))
  const p = primeFactors(x)
  return p.length > 1 ? `${x} = ${p.join(' \\cdot ')}` : `${x}`
}

function hnNote(ds: bigint[], hn: bigint) {
  const u = [...new Set(ds.map(String))].map((x) => BigInt(x)).filter((d) => d > 1n)
  return `Hauptnenner = kleinstes gemeinsames Vielfaches der Nenner: $\\text{kgV}(${u.join(', ')}) = ${hn}$${u.length > 1 ? ` (Zerlegung: ${u.map((d) => `$${pf(d)}$`).join(', ')})` : ''}.`
}

function reduceNote(n: bigint, d: bigint) {
  const g = bgcd(n, d)
  return `Kürzen: Zähler und Nenner durch $${g}$ teilen ($\\text{ggT}(${absB(n)}, ${d}) = ${g}$).`
}

type State = { tex: string; note?: string }

/** Summe von Zahlen: Hauptnenner, Erweitern, Zähler addieren, Kürzen */
function sumStates(vals: Q[], decMode: boolean): { states: State[]; v: Q } {
  const total = vals.reduce(add, q(0))
  const signed = (v: Q, i: number, body: string) => (i === 0 ? (sign(v) < 0 ? '-' : '') : sign(v) < 0 ? ' - ' : ' + ') + body
  if (vals.every(isInt)) return { states: [{ tex: fr(total), note: 'Ganze Zahlen zusammenrechnen.' }], v: total }
  if (decMode && vals.every(isTerminating)) return { states: [{ tex: qTex(total, { dec: true }), note: 'Kommazahlen zusammenrechnen.' }], v: total }
  const ds = vals.map((v) => v.d)
  const hn = ds.reduce((a, b) => blcm(a, b), 1n)
  const states: State[] = []
  const same = ds.every((d) => d === ds[0])
  if (!same) {
    const ext = vals
      .map((v, i) => {
        const k = hn / v.d
        const a = absB(v.n)
        if (k === 1n) return signed(v, i, `\\frac{${a}}{${v.d}}`)
        if (v.d === 1n) return signed(v, i, `\\frac{${a} \\cdot ${k}}{${k}}`)
        return signed(v, i, `\\frac{${a} \\cdot ${k}}{${v.d} \\cdot ${k}}`)
      })
      .join('')
    states.push({ tex: ext, note: `${hnNote(ds, hn)} Jeden Bruch so erweitern, dass unten $${hn}$ steht.` })
    states.push({ tex: vals.map((v, i) => signed(v, i, `\\frac{${absB(v.n) * (hn / v.d)}}{${hn}}`)).join(''), note: 'Jetzt sind alle Brüche gleichnamig.' })
  }
  const nums = vals.map((v) => v.n * (hn / v.d))
  states.push({ tex: `\\frac{${nums.map((x, i) => (i === 0 ? `${x}` : x < 0n ? ` - ${-x}` : ` + ${x}`)).join('')}}{${hn}}`, note: same ? 'Gleichnamig: Zähler zusammenrechnen, der Nenner bleibt.' : 'Zähler zusammenrechnen, der Nenner bleibt.' })
  const S = nums.reduce((a, b) => a + b, 0n)
  states.push({ tex: S < 0n ? `-\\frac{${-S}}{${hn}}` : `\\frac{${S}}{${hn}}` })
  if (bgcd(S, hn) > 1n) states.push({ tex: fr(total), note: S === 0n ? undefined : reduceNote(S, hn) })
  return { states, v: total }
}

/** Produkt/Quotient: Kehrwert, Zähler mal Zähler, Nenner mal Nenner, Kürzen */
function prodStates(items: { op: '·' | ':'; v: Q }[], decMode: boolean): { states: State[]; v: Q } {
  const states: State[] = []
  let total = ONE
  for (const x of items) total = x.op === ':' ? div(total, x.v) : mul(total, x.v)
  const anyDiv = items.some((x, i) => i > 0 && x.op === ':')
  const allInt = items.every((x) => isInt(x.v))
  if (allInt && !anyDiv) return { states: [{ tex: fr(total), note: 'Ausrechnen.' }], v: total }
  if (decMode && items.every((x) => isTerminating(x.v)) && isTerminating(total)) return { states: [{ tex: qTex(total, { dec: true }), note: 'Kommazahlen ausrechnen.' }], v: total }
  if (allInt && items.length === 2 && anyDiv) {
    states.push({ tex: `\\frac{${items[0].v.n}}{${items[1].v.n}}`, note: 'Eine Division lässt sich als Bruch schreiben.' })
    if (!isInt(total) && bgcd(items[0].v.n, items[1].v.n) > 1n) states.push({ tex: fr(total), note: reduceNote(items[0].v.n, items[1].v.n) })
    else if (isInt(total)) states.push({ tex: fr(total) })
    return { states, v: total }
  }
  let vs = items.map((x, i) => (i > 0 && x.op === ':' ? div(ONE, x.v) : x.v))
  const show = (v: Q, i: number) => {
    const s = v.d === 1n ? `${absB(v.n)}` : `\\frac{${absB(v.n)}}{${v.d}}`
    return i === 0 ? (sign(v) < 0 ? '-' : '') + s : ` \\cdot ${sign(v) < 0 ? `\\left(-${s}\\right)` : s}`
  }
  if (anyDiv) states.push({ tex: vs.map(show).join(''), note: 'Durch einen Bruch teilen heißt: mit dem **Kehrwert** malnehmen (Zähler und Nenner tauschen).' })
  const negCount = vs.filter((v) => sign(v) < 0).length
  const sgn = negCount % 2 ? '-' : ''
  vs = vs.map(qabs)
  const N = vs.map((v) => v.n)
  const D = vs.map((v) => v.d)
  const nTot = N.reduce((a, b) => a * b, 1n)
  const dTot = D.reduce((a, b) => a * b, 1n)
  const dParts = D.filter((d) => d !== 1n)
  states.push({
    tex: `${sgn}\\frac{${N.join(' \\cdot ')}}{${dParts.length ? dParts.join(' \\cdot ') : '1'}}`,
    note: `Zähler mal Zähler, Nenner mal Nenner.${negCount ? ` Vorzeichen: ${negCount} Minus${negCount === 1 ? '' : 'zeichen'} → Ergebnis ${negCount % 2 ? 'negativ' : 'positiv'}.` : ''} Tipp: Vorher über Kreuz kürzen spart große Zahlen.`,
  })
  states.push({ tex: dTot === 1n ? `${sgn}${nTot}` : `${sgn}\\frac{${nTot}}{${dTot}}` })
  if (bgcd(nTot, dTot) > 1n) states.push({ tex: fr(total), note: reduceNote(nTot, dTot) })
  return { states, v: total }
}

function powStates(v: Q, k: number): { states: State[]; v: Q } {
  const r = qpow(v, k)
  if (k < 0) {
    const inv = div(ONE, v)
    return {
      states: [
        { tex: `\\left(${fr(inv)}\\right)^{${-k}}`, note: 'Negative Hochzahl: Kehrwert nehmen, dann mit positiver Hochzahl potenzieren.' },
        ...powStates(inv, -k).states,
      ],
      v: r,
    }
  }
  if (isInt(v)) return { states: [{ tex: fr(r), note: `Potenz: ${k}-mal mit sich selbst malnehmen.` }], v: r }
  return {
    states: [
      { tex: `${sign(v) < 0 ? (k % 2 ? '-' : '') : ''}\\frac{${absB(v.n)}^{${k}}}{${v.d}^{${k}}}`, note: 'Bruch potenzieren: Zähler und Nenner einzeln potenzieren.' },
      { tex: fr(r) },
    ],
    v: r,
  }
}

/** nächsten auswertbaren Knoten finden (tiefster, am weitesten links) */
type Path = (string | number)[]

function findNext(n: FN, path: Path = []): Path | null {
  switch (n.t) {
    case 'num':
    case 'tex':
      return null
    case 'grp':
      return asVal(n.e) !== null ? null : findNext(n.e, [...path, 'e'])
    case 'neg':
      return asVal(n.e) !== null ? null : findNext(n.e, [...path, 'e'])
    case 'pow':
      return asVal(n.e) !== null ? path : findNext(n.e, [...path, 'e'])
    case 'frac': {
      if (asVal(n.a) === null) return findNext(n.a, [...path, 'a'])
      if (asVal(n.b) === null) return findNext(n.b, [...path, 'b'])
      return path
    }
    case 'add':
    case 'mul': {
      for (let i = 0; i < n.it.length; i++) if (asVal(n.it[i].e) === null) return findNext(n.it[i].e, [...path, 'it', i, 'e'])
      return path
    }
  }
}

function getAt(n: FN, p: Path): FN {
  let cur: unknown = n
  for (const k of p) cur = (cur as Record<string | number, unknown>)[k]
  return cur as FN
}

function setAt(root: FN, p: Path, val: FN): FN {
  if (!p.length) return val
  const clone = (x: unknown): unknown => (Array.isArray(x) ? [...x] : { ...(x as object) })
  const out = clone(root) as Record<string | number, unknown>
  let cur = out
  for (let i = 0; i < p.length - 1; i++) {
    const next = clone(cur[p[i]]) as Record<string | number, unknown>
    cur[p[i]] = next
    cur = next
  }
  cur[p[p.length - 1]] = val
  return out as unknown as FN
}

/** Literale vorbereiten: gemischte Zahlen umwandeln, kürzbare Brüche kürzen */
function prepare(root: FN, steps: Step[], decMode: boolean): FN {
  const mixed: string[] = []
  const red: string[] = []
  const decs: string[] = []
  const walk = (n: FN): FN => {
    switch (n.t) {
      case 'num': {
        if (n.lit === 'mixed' && n.raw?.w !== undefined) {
          mixed.push(`${n.raw.w}\\tfrac{${n.raw.n}}{${n.raw.d}} = \\frac{${n.raw.w} \\cdot ${n.raw.d} + ${n.raw.n}}{${n.raw.d}} = \\frac{${n.raw.w * n.raw.d + n.raw.n}}{${n.raw.d}}`)
          return { t: 'num', v: n.v, lit: 'frac', raw: { n: n.raw.w * n.raw.d + n.raw.n, d: n.raw.d, s: '' } }
        }
        if (n.lit === 'frac' && n.raw && (n.raw.n !== n.v.n || n.raw.d !== n.v.d)) {
          red.push(`\\frac{${n.raw.n}}{${n.raw.d}} = ${qTex(n.v)}`)
          return num(n.v)
        }
        if (n.lit === 'dec' && !decMode) {
          const s = decStr(n.v)
          const frac = s.split('.')[1] ?? ''
          const den = 10n ** BigInt(frac.length)
          decs.push(`${qTex(n.v, { dec: true })} = \\frac{${(n.v.n * den) / n.v.d}}{${den}}${den / n.v.d !== 1n ? ` = ${qTex(n.v)}` : ''}`)
          return num(n.v)
        }
        return n
      }
      case 'tex':
        return n
      case 'grp':
      case 'neg':
        return { ...n, e: walk(n.e) }
      case 'pow':
        return { ...n, e: walk(n.e) }
      case 'frac':
        return { ...n, a: walk(n.a), b: walk(n.b) }
      case 'add':
        return { ...n, it: n.it.map((x) => ({ ...x, e: walk(x.e) })) }
      case 'mul':
        return { ...n, it: n.it.map((x) => ({ ...x, e: walk(x.e) })) }
    }
  }
  const out = walk(root)
  const notes: string[] = []
  if (mixed.length) notes.push(`Gemischte Zahl als Bruch: Ganze mal Nenner plus Zähler – ${mixed.map((m) => `$${m}$`).join(', ')}.`)
  if (decs.length) notes.push(`Kommazahl als Bruch schreiben: ${decs.map((m) => `$${m}$`).join(', ')}.`)
  if (red.length) notes.push(`Zuerst kürzen: ${red.map((m) => `$${m}$`).join(', ')}.`)
  if (notes.length) steps.push({ tex: '= ' + fTex(out), note: notes.join(' ') })
  return out
}

function hasLit(n: FN, lit: Lit): boolean {
  switch (n.t) {
    case 'num':
      return n.lit === lit
    case 'tex':
      return false
    case 'grp':
    case 'neg':
    case 'pow':
      return hasLit(n.e, lit)
    case 'frac':
      return hasLit(n.a, lit) || hasLit(n.b, lit)
    case 'add':
    case 'mul':
      return n.it.some((x) => hasLit(x.e, lit))
  }
}

/* ---------------------------- Kürzen ---------------------------- */

function kuerzenSolution(n: bigint, d: bigint): Solution {
  const g = bgcd(n, d)
  const v = q(n, d)
  const steps: Step[] = [
    { tex: `\\frac{${n}}{${d}}` },
    { tex: `${pf(n)}, \\quad ${pf(d)}`, note: 'Zähler und Nenner in Primfaktoren zerlegen.', head: 'Größten gemeinsamen Teiler finden' },
    { tex: `\\text{ggT}(${absB(n)}, ${d}) = ${g}`, note: g > 1n ? 'Die gemeinsamen Primfaktoren malnehmen.' : 'Keine gemeinsamen Primfaktoren – der Bruch ist schon vollständig gekürzt.' },
  ]
  if (g > 1n) {
    steps.push({ tex: `\\frac{${n} : ${g}}{${d} : ${g}} = ${qTex(v)}`, note: 'Zähler und Nenner durch den ggT teilen.', head: 'Kürzen', final: true })
  }
  return { result: `\\frac{${n}}{${d}} = ${qTex(v)}`, steps, extra: resultExtras(v) }
}

function resultExtras(v: Q): string[] {
  const out: string[] = []
  if (!isInt(v) && absB(v.n) > v.d) {
    const w = absB(v.n) / v.d
    const r = absB(v.n) % v.d
    out.push(`${sign(v) < 0 ? '-' : ''}${w}\\tfrac{${r}}{${v.d}} \\;\\text{(gemischte Zahl)}`)
  }
  if (!isInt(v)) out.push(isTerminating(v) ? `= ${qTex(v, { dec: true })}` : `\\approx ${approxTex(toNum(v), 6)}`)
  return out
}

/* ---------------------------- Bruchterme mit Variablen ---------------------------- */

/** Nenner eines Monoms (Zahl und Variablen mit negativer Hochzahl) */
const denOf = (t: Term): Term => ({ c: q(t.c.d), m: Object.fromEntries(Object.entries(t.m).filter(([, e]) => e < 0).map(([k, e]) => [k, -e])) })
const numOf = (t: Term): Term => ({ c: q(absB(t.c.n)), m: Object.fromEntries(Object.entries(t.m).filter(([, e]) => e > 0)) })

function monoFracTex(n: Term, d: Term) {
  const nt = termAbsTex(n)
  const dt = termAbsTex(d)
  return dt === '1' ? nt : `\\frac{${nt}}{${dt}}`
}

/** Monom-Bruch als Faktorliste: x·y/z → [{x}, {y}, {z, inv}] */
function chain(x: W, inv: boolean, out: { t: Term; inv: boolean }[]): boolean {
  const st = single(x)
  if (st) {
    out.push({ t: st, inv })
    return true
  }
  if (x.t === 'grp') return chain(x.w, inv, out)
  if (x.t === 'prod') return x.f.every((f) => chain(f, inv, out))
  if (x.t === 'div') return chain(x.a, inv, out) && chain(x.b, !inv, out)
  if (x.t === 'pow') {
    const b = single(x.b)
    if (!b) return false
    out.push({ t: termPow(b, x.k), inv })
    return true
  }
  return false
}

function chainTerm(fs: { t: Term; inv: boolean }[]): Term {
  return fs.reduce<Term>((acc, f) => (f.inv ? termDiv(acc, f.t) : termMul(acc, f.t)), { c: ONE, m: {} })
}

const BT_HINT = 'Bruchterme: Bitte nur Brüche mit einzelnen Faktoren in Zähler und Nenner, z. B. 3a/4 + 7a/6 oder 2/(3z) − 1/(4z).'

function productSolution(w: W, fs: { t: Term; inv: boolean }[]): Solution {
  const steps: Step[] = [{ tex: wTex(w) }]
  const negs = fs.filter((f) => sign(f.t.c) < 0).length
  const sg = negs % 2 ? '-' : ''
  const tops: Term[] = []
  const bots: Term[] = []
  for (const f of fs) {
    const n = numOf(f.t)
    const d = denOf(f.t)
    ;(f.inv ? bots : tops).push(n)
    ;(f.inv ? tops : bots).push(d)
  }
  const show = (ts: Term[]) => {
    const r = ts.filter((t) => !isOneTerm(t))
    return r.length ? r.map((t) => termAbsTex(t)).join(' \\cdot ') : '1'
  }
  const anyInv = fs.some((f) => f.inv)
  steps.push({
    tex: `= ${sg}\\frac{${show(tops)}}{${show(bots)}}`,
    note: (anyInv ? 'Geteilt durch einen Bruch heißt mal Kehrwert. ' : '') + 'Zähler mal Zähler, Nenner mal Nenner.',
    head: 'Multiplizieren',
  })
  const N = tops.reduce(termMul, { c: ONE, m: {} })
  const D = bots.reduce(termMul, { c: ONE, m: {} })
  const nd = `\\frac{${termAbsTex(N)}}{${termAbsTex(D)}}`
  steps.push({ tex: `= ${sg}${nd}` })
  const r = chainTerm(fs)
  const rt = termTex(r, true)
  if (`${sg}${nd}` !== rt) steps.push({ tex: `= ${rt}`, note: 'Kürzen: Zahlen durch ihren ggT teilen, gleiche Variablen oben und unten kürzen (Hochzahlen subtrahieren).', head: 'Kürzen' })
  steps[steps.length - 1].final = true
  return { result: rt, steps }
}

function termsSolution(src: string): Solution {
  const p = parseW(src, { rootHint: '' })
  const w = p.w
  const items: { s: 1 | -1; t: Term }[] = []
  if (w.t === 'terms') w.ts.forEach((t) => items.push({ s: 1, t }))
  else if (w.t === 'sum') {
    for (const it of w.it) {
      if (it.w.t === 'terms') {
        it.w.ts.forEach((t) => items.push({ s: it.s, t }))
        continue
      }
      const fs: { t: Term; inv: boolean }[] = []
      if (!chain(it.w, false, fs)) throw new CalcError(BT_HINT)
      items.push({ s: it.s, t: chainTerm(fs) })
    }
  } else {
    const fs: { t: Term; inv: boolean }[] = []
    if (!chain(w, false, fs)) throw new CalcError(BT_HINT)
    return productSolution(w, fs)
  }
  const terms = items.map((x) => (x.s < 0 ? { c: neg(x.t.c), m: x.t.m } : x.t))
  const steps: Step[] = [{ tex: wTex(w) }]
  // Hauptnenner aus Zahlen und Variablen
  const hnC = terms.reduce((l, t) => blcm(l, t.c.d), 1n)
  const hnM: Record<string, number> = {}
  for (const t of terms) for (const [k, e] of Object.entries(t.m)) if (e < 0) hnM[k] = Math.max(hnM[k] ?? 0, -e)
  const HN: Term = { c: q(hnC), m: hnM }
  const hnTex = termAbsTex(HN)
  const dens = [...new Set(terms.map((t) => termAbsTex(denOf(t))))]
  if (dens.length === 1 && dens[0] === '1') throw new CalcError('Hier gibt es keine Brüche – nimm den Rechner „Terme vereinfachen“.')
  const varNote = Object.keys(hnM).length ? ` Variablen: jede mit ihrer größten Hochzahl aus den Nennern (${Object.entries(hnM).map(([k, e]) => `$${e === 1 ? k : `${k}^{${e}}`}$`).join(', ')}).` : ''
  steps.push({ tex: `\\text{HN} = ${hnTex}`, note: `Nenner: ${dens.map((d) => `$${d}$`).join(', ')}. Zahlen: $\\text{kgV} = ${hnC}$.${varNote}`, head: 'Hauptnenner' })
  const signed = (t: Term, i: number, body: string) => (i === 0 ? (sign(t.c) < 0 ? '-' : '') : sign(t.c) < 0 ? ' - ' : ' + ') + body
  const ks = terms.map((t) => termDiv(HN, denOf(t)))
  steps.push({
    tex:
      '= ' +
      terms
        .map((t, i) =>
          signed(t, i, isOneTerm(ks[i]) ? monoFracTex(numOf(t), denOf(t)) : `\\frac{${termAbsTex(numOf(t))} \\cdot ${termAbsTex(ks[i])}}{${termAbsTex(denOf(t))} \\cdot ${termAbsTex(ks[i])}}`),
        )
        .join(''),
    note: 'Jeden Bruch auf den Hauptnenner erweitern: Zähler und Nenner mit dem fehlenden Faktor malnehmen.',
    head: 'Erweitern',
  })
  const tops = terms.map((t) => termMul(t, HN))
  steps.push({ tex: '= ' + tops.map((t, i) => signed(t, i, `\\frac{${termAbsTex(t)}}{${hnTex}}`)).join(''), note: 'Jetzt sind alle Brüche gleichnamig.' })
  const P = sortTerms(combine(tops))
  steps.push({ tex: `= \\frac{${sumTex(tops)}}{${hnTex}}`, note: 'Auf einen Bruchstrich schreiben – der Nenner bleibt.' })
  const pTex = sumTex(P)
  if (pTex !== sumTex(tops)) steps.push({ tex: `= \\frac{${pTex}}{${hnTex}}`, note: 'Zähler zusammenfassen.' })
  if (P.length === 0) {
    steps.push({ tex: '= 0', final: true })
    return { result: '0', steps }
  }
  // kürzen: gemeinsamer Faktor von Zähler und Nenner
  const g = P.reduce((a, t) => bgcd(a, t.c.n), 0n)
  const gg = bgcd(g, hnC)
  const common: Record<string, number> = {}
  for (const k of Object.keys(hnM)) {
    const mn = Math.min(hnM[k], ...P.map((t) => t.m[k] ?? 0))
    if (mn > 0) common[k] = mn
  }
  let result: string
  if (gg > 1n || Object.keys(common).length) {
    const G: Term = { c: q(gg), m: common }
    const P2 = P.map((t) => termDiv(t, G))
    const H2 = termDiv(HN, G)
    const h2 = termAbsTex(H2)
    result = h2 === '1' ? sumTex(P2) : P2.length === 1 ? termTex(termDiv(P2[0], H2), true) : `\\frac{${sumTex(P2)}}{${h2}}`
    steps.push({ tex: `= ${result}`, note: `Kürzen mit $${termAbsTex(G)}$.`, head: 'Kürzen' })
  } else {
    result = P.length === 1 ? termTex(termDiv(P[0], HN), true) : `\\frac{${pTex}}{${hnTex}}`
    if (P.length === 1 && `\\frac{${pTex}}{${hnTex}}` !== result) steps.push({ tex: `= ${result}` })
  }
  steps[steps.length - 1].final = true
  return { result, steps }
}

const isOneTerm = (t: Term) => t.c.n === 1n && t.c.d === 1n && !Object.keys(t.m).length

/* ---------------------------- Hauptfunktion ---------------------------- */

export function fractionInput(src: string): Solution {
  let tokens: Tok[]
  try {
    tokens = tokenize(src)
  } catch (e) {
    if (e instanceof CalcError && e.message === 'VAR') return termsSolution(src)
    throw e
  }
  const root0 = new P(tokens).parse()
  // einzelner Bruch → Kürzen
  if (root0.t === 'num' && root0.lit === 'frac' && root0.raw) return kuerzenSolution(root0.raw.n, root0.raw.d)
  const decMode = hasLit(root0, 'dec') && !hasLit(root0, 'frac') && !hasLit(root0, 'mixed')
  const steps: Step[] = [{ tex: fTex(root0) }]
  let root = prepare(root0, steps, decMode)
  for (let guard = 0; guard < 60; guard++) {
    if (asVal(root) !== null && (root.t === 'num' || root.t === 'grp' || root.t === 'neg')) break
    const path = findNext(root)
    if (!path) break
    const node = getAt(root, path)
    let res: { states: State[]; v: Q }
    let head: string | undefined
    if (node.t === 'add') {
      res = sumStates(
        node.it.map((x) => (x.s < 0 ? neg(asVal(x.e)!) : asVal(x.e)!)),
        decMode,
      )
      head = node.it.length > 1 ? (path.length ? 'Klammer ausrechnen' : 'Addieren & Subtrahieren') : undefined
      if (node.it.some((x) => x.s < 0 && sign(asVal(x.e)!) < 0)) res.states[0].note = `Minus mal Minus ergibt Plus. ${res.states[0].note ?? ''}`
    } else if (node.t === 'mul') {
      res = prodStates(
        node.it.map((x) => ({ op: x.op, v: asVal(x.e)! })),
        decMode,
      )
      head = node.it.some((x, i) => i > 0 && x.op === ':') ? 'Dividieren' : 'Multiplizieren'
    } else if (node.t === 'pow') {
      res = powStates(asVal(node.e)!, node.k)
      head = 'Potenzieren'
    } else if (node.t === 'frac') {
      const a = asVal(node.a)!
      const b = asVal(node.b)!
      if (isZero(b)) throw new CalcError('Division durch 0 ist nicht erlaubt.')
      const pr = prodStates(
        [
          { op: '·', v: a },
          { op: ':', v: b },
        ],
        decMode,
      )
      const first: State = { tex: `${fr(a)} : ${sign(b) < 0 ? `\\left(${fr(b)}\\right)` : fr(b)}`, note: 'Ein Bruchstrich ist ein Geteiltzeichen: oberer Teil geteilt durch unteren Teil.' }
      res = { states: isInt(a) && isInt(b) ? pr.states : [first, ...pr.states], v: pr.v }
      head = 'Doppelbruch'
    } else break
    const last = path[path.length - 1]
    const parent = !path.length ? null : typeof path[path.length - 2] === 'number' ? getAt(root, path.slice(0, -3)) : last === 'a' || last === 'b' ? getAt(root, path.slice(0, -1)) : getAt(root, path.slice(0, -1))
    const bare = !parent || parent.t === 'grp' || parent.t === 'frac'
    res.states.forEach((s, i) => {
      const t = setAt(root, path, { t: 'tex', s: !bare && s.tex.startsWith('-') ? `\\left(${s.tex}\\right)` : s.tex })
      steps.push({ tex: '= ' + fTex(t), note: s.note, head: i === 0 ? head : undefined })
    })
    root = setAt(root, path, num(res.v, decMode))
    // Ausgabe der Ersetzung prüfen: die letzte Zeile soll den Zahlenwert zeigen
    const lastTex = '= ' + fTex(root)
    if (steps[steps.length - 1].tex !== lastTex) steps[steps.length - 1].tex = lastTex
  }
  const v = asVal(root)
  if (v === null) throw new CalcError('Der Ausdruck konnte nicht ausgerechnet werden.')
  const resTex = decMode && isTerminating(v) ? qTex(v, { dec: true }) : qTex(v)
  if (root.t !== 'num' && steps[steps.length - 1].tex !== '= ' + resTex) steps.push({ tex: '= ' + resTex, note: root.t === 'neg' ? 'Das Minus davor bleibt.' : undefined })
  if (steps.length > 1) steps[steps.length - 1].final = true
  return { result: resTex, steps, extra: decMode ? (isTerminating(v) ? undefined : [`\\approx ${approxTex(toNum(v), 6)}`]) : resultExtras(v) }
}

export { frAbs }

/** Vorschau so, wie der Bruchrechner die Eingabe liest */
export function fractionPreview(src: string): { tex?: string; error?: string } {
  try {
    return { tex: fTex(new P(tokenize(src)).parse()) }
  } catch (e) {
    if (e instanceof CalcError && e.message === 'VAR') {
      const r = tryParse(src)
      return r.node ? { tex: toTex(r.node) } : { error: r.error }
    }
    return { error: e instanceof Error ? e.message : 'Eingabe nicht lesbar' }
  }
}
