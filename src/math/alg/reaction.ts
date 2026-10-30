/**
 * Reaktionsgleichungen: Eingabe zerlegen („Fe + O2 -> Fe2O3“, Ionen wie „Fe^2+“, Elektronen „e^-“),
 * exakt ausgleichen (Gauß-Elimination mit Brüchen), Massen über das Stoffmengenverhältnis
 * berechnen, Unterschuss/Überschuss bestimmen und die Ausbeute ausrechnen – jeweils mit Rechenweg.
 */
import { BY_SYM } from '../../chem/elements'
import { FormulaError, parseFormula } from '../../chem/formula'
import { add, bgcd, blcm, CalcError, cmp, div, isZero, mul, neg, ONE, q, qTex, sign, sub, toNum, ZERO, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { formulaTexOf, m2, molarMass } from './stoich'
import { best, eqv, F, fac, MASS_U, MOL_U, nt, T, VOL_U } from './units'

/* ---------------------------- Eingabe zerlegen ---------------------------- */

export interface Species {
  /** Formel ohne Koeffizient, Ladung und Zustand („Fe2O3“, „MnO4“); leer bei Elektronen */
  formula: string
  charge: number
  electron: boolean
  /** Zustand: s, l, g, aq (falls angegeben) */
  state?: string
  /** ↑ (Gas entweicht) oder ↓ (Niederschlag) */
  mark?: '↑' | '↓'
  /** Atome je Element */
  atoms: Map<string, number>
  side: 'L' | 'R'
  /** eingetippter Koeffizient (wird ignoriert) */
  typed?: string
  /** TeX ohne Zustand: \mathrm{Fe_{2}O_{3}}, \mathrm{Fe}^{2+} */
  tex: string
  /** TeX mit Zustand für die Gleichung */
  texFull: string
  /** Klartext mit tiefgestellten Ziffern: Fe₂O₃, MnO₄⁻ */
  label: string
}

export interface Reaction {
  left: Species[]
  right: Species[]
  /** erst links, dann rechts */
  all: Species[]
  /** Gleichgewichtspfeil */
  equilibrium: boolean
  /** Elemente in der Reihenfolge des Auftretens */
  elements: string[]
  charged: boolean
  hasElectrons: boolean
}

const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉'
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' }
const SUP_BACK: Record<string, string> = Object.fromEntries(Object.entries(SUP).map(([k, v]) => [v, k]))

/** Ladung als Text: 2 → „2+“, −1 → „-“ */
export function chargeStr(z: number) {
  const a = Math.abs(z)
  return `${a === 1 ? '' : a}${z > 0 ? '+' : '-'}`
}

/** Formel als Klartext mit tiefgestellten Ziffern: „CuSO4·5H2O“ → CuSO₄·5H₂O, Ladung hochgestellt */
export function formulaLabel(f: string, z = 0) {
  const body = f.replace(/([A-Za-z)\]])(\d+)/g, (_, a: string, d: string) => a + [...d].map((c) => SUB_DIGITS[+c]).join(''))
  return body + (z ? [...chargeStr(z)].map((c) => SUP[c]).join('') : '')
}

function speciesTex(formula: string, z: number, electron: boolean) {
  if (electron) return '\\mathrm{e}^{-}'
  return formulaTexOf(formula) + (z ? `^{${chargeStr(z)}}` : '')
}

function normalize(s: string) {
  return s
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])/g, (_, d: string, sg: string) => '^' + [...d].map((c) => SUP_BACK[c]).join('') + SUP_BACK[sg])
    .replace(/[−–—]/g, '-')
    .replace(/[*•]/g, '·')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Reaktionspfeile, längere zuerst */
const ARROW = /<=>|<->|⇌|⇄|↔|⟷|-->|->|⟶|→|==>|=>|⇒|=/g
const EQ_ARROWS = ['<=>', '<->', '⇌', '⇄', '↔', '⟷']

/** Seite an den trennenden Pluszeichen zerlegen (Ladungen wie „^2+“ oder „Na+ “ bleiben am Stoff) */
function splitSide(side: string): string[] {
  const parts: string[] = []
  let cur = ''
  let i = 0
  while (i < side.length) {
    const c = side[i]
    if (c === '^') {
      const m = /^\^\s*(\{[^}]*\}|\([^)]*\)|\d+[+-]|[+-]\d*)/.exec(side.slice(i))
      if (m) {
        cur += m[0]
        i += m[0].length
        continue
      }
    }
    if (c === '+') {
      const prev = side[i - 1]
      const next = side[i + 1]
      // „Na+ + Cl-“: Plus direkt an der Formel und danach Leerzeichen/Ende → Ladung
      if (prev && /[A-Za-z0-9)\]]/.test(prev) && (next === undefined || next === ' ' || next === '+')) {
        cur += c
        i++
        continue
      }
      parts.push(cur)
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  parts.push(cur)
  return parts.map((p) => p.trim())
}

function parseSpecies(raw: string, side: 'L' | 'R'): Species {
  let s = raw.trim()
  if (!s) throw new CalcError(`${side === 'L' ? 'Links' : 'Rechts'} vom Pfeil fehlt ein Stoff – steht dort ein Pluszeichen zu viel?`)
  const shown = s
  let typed: string | undefined
  const cm = /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(?=[A-Z([e])/.exec(s)
  if (cm) {
    typed = cm[1]
    s = s.slice(cm[0].length).trim()
  }
  let state: string | undefined
  let mark: '↑' | '↓' | undefined
  for (;;) {
    const sm = /\s*(?:\((s|l|g|aq|fl|f)\)|([↑↓]))\s*$/.exec(s)
    if (!sm || sm.index === 0) break
    if (sm[1]) {
      const st = sm[1].toLowerCase()
      state = st === 'fl' ? 'l' : st === 'f' ? 's' : st
    } else mark = sm[2] as '↑' | '↓'
    s = s.slice(0, sm.index)
  }
  let charge = 0
  const ch = /\^\s*(?:\{\s*|\(\s*)?(\d*)\s*([+-])\s*(\d*)\s*[})]?$/.exec(s)
  if (ch) {
    if (ch[1] && ch[3]) throw new CalcError(`„${shown}“: Die Ladung ist nicht eindeutig – schreibe z. B. „^2+“.`)
    const mag = parseInt(ch[1] || ch[3] || '1', 10)
    if (mag === 0) throw new CalcError(`„${shown}“: Eine Ladung 0 schreibt man nicht.`)
    charge = (ch[2] === '+' ? 1 : -1) * mag
    s = s.slice(0, ch.index).trim()
  } else if (/\^/.test(s)) {
    throw new CalcError(`„${shown}“: Die Ladung bitte so schreiben: „Fe^3+“, „SO4^2-“, „H^+“ oder „e^-“.`)
  } else {
    const tr = /([+-])$/.exec(s)
    if (tr) {
      const body = s.slice(0, -1).trim()
      const dig = /\d+$/.exec(body)
      if (dig && body !== 'e')
        throw new CalcError(
          `„${shown}“: Schreibe die Ladung mit ^, also „${body.slice(0, -dig[0].length)}^${dig[0]}${tr[1]}“ oder „${body}^${tr[1]}“ – sonst ist nicht klar, ob die Zahl zur Formel oder zur Ladung gehört.`,
        )
      charge = tr[1] === '+' ? 1 : -1
      s = body
    }
  }
  if (s === 'e') {
    if (charge > 0) throw new CalcError('Ein Elektron hat die Ladung −1: schreibe „e^-“.')
    return { formula: '', charge: -1, electron: true, atoms: new Map(), side, typed, tex: '\\mathrm{e}^{-}', texFull: '\\mathrm{e}^{-}', label: 'e⁻' }
  }
  const formula = s.replace(/\s+/g, '').replace(/\./g, '·')
  let counts
  try {
    counts = parseFormula(formula)
  } catch (e) {
    if (e instanceof FormulaError) throw new CalcError(`„${shown}“: ${e.message}`)
    throw e
  }
  const atoms = new Map<string, number>()
  for (const c of counts) atoms.set(c.el.sym, c.n)
  const tex = speciesTex(formula, charge, false)
  const texFull = tex + (state ? `\\,(\\mathrm{${state}})` : '') + (mark === '↑' ? '\\uparrow' : mark === '↓' ? '\\downarrow' : '')
  return { formula, charge, electron: false, state, mark, atoms, side, typed, tex, texFull, label: formulaLabel(formula, charge) }
}

const key = (s: Species) => (s.electron ? 'e-' : `${s.formula}|${s.charge}`)

/** Reaktionsgleichung zerlegen; wirft CalcError mit Hinweis bei Tippfehlern */
export function parseReaction(input: string): Reaction {
  const s = normalize(input)
  if (!s) throw new CalcError('Bitte eine Reaktionsgleichung eingeben, z. B. „Fe + O2 -> Fe2O3“.')
  const arrows = [...s.matchAll(ARROW)]
  if (!arrows.length) throw new CalcError('Es fehlt der Reaktionspfeil – schreibe z. B. „Fe + O2 -> Fe2O3“ (Pfeil als „->“ oder „=“).')
  if (arrows.length > 1) throw new CalcError('Bitte nur einen Reaktionspfeil verwenden.')
  const a = arrows[0]
  const ai = a.index ?? 0
  const L = s.slice(0, ai).trim()
  const R = s.slice(ai + a[0].length).trim()
  if (!L) throw new CalcError('Links vom Pfeil fehlen die Ausgangsstoffe (Edukte).')
  if (!R) throw new CalcError('Rechts vom Pfeil fehlen die Reaktionsprodukte.')
  const left = splitSide(L).map((t) => parseSpecies(t, 'L'))
  const right = splitSide(R).map((t) => parseSpecies(t, 'R'))
  const all = [...left, ...right]
  if (all.length > 12) throw new CalcError('Höchstens 12 Stoffe – teile die Reaktion auf.')
  const seen = new Map<string, Species>()
  for (const sp of all) {
    const k = key(sp)
    const prev = seen.get(k)
    if (prev) {
      if (prev.side === sp.side) throw new CalcError(`„${sp.label}“ steht zweimal auf der ${sp.side === 'L' ? 'linken' : 'rechten'} Seite – fasse gleiche Stoffe zusammen.`)
      throw new CalcError(`„${sp.label}“ steht auf beiden Seiten des Pfeils – der Stoff reagiert nicht und wird weggelassen (gekürzt).`)
    }
    seen.set(k, sp)
  }
  const elements: string[] = []
  for (const sp of all) for (const el of sp.atoms.keys()) if (!elements.includes(el)) elements.push(el)
  return {
    left,
    right,
    all,
    equilibrium: EQ_ARROWS.includes(a[0]),
    elements,
    charged: all.some((x) => x.charge !== 0),
    hasElectrons: all.some((x) => x.electron),
  }
}

/** Schnelltest für den Schnellrechner: ein Pfeil und lauter gültige Formeln */
export function looksLikeReaction(input: string): boolean {
  const s = normalize(input)
  if (!/->|→|⟶|=>|⇒|⇌|⇄|↔|⟷|<=>|<->/.test(s)) return false
  try {
    const arrows = [...s.matchAll(ARROW)]
    if (arrows.length !== 1) return false
    const ai = arrows[0].index ?? 0
    const sides = [s.slice(0, ai).trim(), s.slice(ai + arrows[0][0].length).trim()]
    if (!sides[0] || !sides[1]) return false
    sides.forEach((side, i) => splitSide(side).forEach((t) => parseSpecies(t, i ? 'R' : 'L')))
    return true
  } catch {
    return false
  }
}

/* ---------------------------- Ausgleichen ---------------------------- */

/** Bilanzgleichung je Element (bzw. Ladung): links Σ k·x = rechts Σ k·x */
interface BalEq {
  name: string
  tex: string
  L: [number, bigint][]
  R: [number, bigint][]
}

function balanceEqs(r: Reaction): BalEq[] {
  const nL = r.left.length
  const eqs: BalEq[] = r.elements.map((el) => ({
    name: el,
    tex: `\\mathrm{${el}}`,
    L: r.left.flatMap((s, j): [number, bigint][] => (s.atoms.has(el) ? [[j, BigInt(s.atoms.get(el)!)]] : [])),
    R: r.right.flatMap((s, j): [number, bigint][] => (s.atoms.has(el) ? [[nL + j, BigInt(s.atoms.get(el)!)]] : [])),
  }))
  if (r.charged)
    eqs.push({
      name: 'Ladung',
      tex: '\\text{Ladung}',
      L: r.left.flatMap((s, j): [number, bigint][] => (s.charge ? [[j, BigInt(s.charge)]] : [])),
      R: r.right.flatMap((s, j): [number, bigint][] => (s.charge ? [[nL + j, BigInt(s.charge)]] : [])),
    })
  return eqs
}

/** Koeffizientenzeile Σ c_j x_j = 0 (links positiv, rechts negativ) */
function rowOf(e: BalEq, n: number): Q[] {
  const row: Q[] = Array(n).fill(ZERO)
  for (const [j, k] of e.L) row[j] = add(row[j], q(k))
  for (const [j, k] of e.R) row[j] = sub(row[j], q(k))
  return row
}

function rref(A: Q[][]): { M: Q[][]; piv: number[] } {
  const M = A.map((r) => r.slice())
  const rows = M.length
  const cols = rows ? M[0].length : 0
  const piv: number[] = []
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    let p = -1
    for (let i = r; i < rows; i++)
      if (!isZero(M[i][c])) {
        p = i
        break
      }
    if (p < 0) continue
    ;[M[r], M[p]] = [M[p], M[r]]
    const pv = M[r][c]
    M[r] = M[r].map((x) => div(x, pv))
    for (let i = 0; i < rows; i++)
      if (i !== r && !isZero(M[i][c])) {
        const f = M[i][c]
        M[i] = M[i].map((x, k) => sub(x, mul(f, M[r][k])))
      }
    piv.push(c)
    r++
  }
  return { M, piv }
}

/** kleinste positive ganzzahlige Koeffizienten (Reihenfolge wie `all`) */
export function balanceCoefficients(r: Reaction): bigint[] {
  for (const el of r.elements) {
    const inL = r.left.some((s) => s.atoms.has(el))
    const inR = r.right.some((s) => s.atoms.has(el))
    if (!inL || !inR) {
      const name = BY_SYM[el]?.name ?? el
      throw new CalcError(`${name} (${el}) kommt nur auf der ${inL ? 'linken' : 'rechten'} Seite vor – auf der ${inL ? 'rechten' : 'linken'} Seite fehlt ein Stoff mit ${el}. Prüfe die Formeln.`)
    }
  }
  const n = r.all.length
  if (n < 2) throw new CalcError('Eine Reaktion braucht Stoffe auf beiden Seiten.')
  const { M, piv } = rref(balanceEqs(r).map((e) => rowOf(e, n)))
  const free = [...Array(n).keys()].filter((j) => !piv.includes(j))
  if (!free.length) throw new CalcError('Diese Gleichung lässt sich nicht ausgleichen – prüfe die Formeln und Ladungen. Vielleicht fehlt ein Stoff oder eine Formel ist falsch geschrieben.')
  if (free.length > 1)
    throw new CalcError('Die Gleichung ist nicht eindeutig: Es gibt mehrere unabhängige Möglichkeiten auszugleichen (wie zwei Reaktionen in einer). Schreibe die Teilreaktionen einzeln oder prüfe, ob ein Stoff fehlt.')
  const f = free[0]
  const v: Q[] = Array(n).fill(ZERO)
  v[f] = ONE
  piv.forEach((pc, row) => {
    v[pc] = neg(M[row][f])
  })
  const L = v.reduce((acc, x) => blcm(acc, x.d), 1n)
  let ints = v.map((x) => x.n * (L / x.d))
  const g = ints.reduce((acc, x) => bgcd(acc, x), 0n)
  ints = ints.map((x) => x / g)
  const pos = ints.filter((x) => x > 0n).length
  const negc = ints.filter((x) => x < 0n).length
  if (negc > pos || (negc === pos && ints[0] < 0n)) ints = ints.map((x) => -x)
  const zero = r.all.filter((_, j) => ints[j] === 0n)
  if (zero.length) throw new CalcError(`${zero.map((s) => `„${s.label}“`).join(', ')} ${zero.length > 1 ? 'nehmen' : 'nimmt'} an dieser Reaktion nicht teil (Koeffizient 0) – lass ${zero.length > 1 ? 'sie' : 'den Stoff'} weg oder prüfe die Formeln.`)
  const wrong = r.all.filter((_, j) => ints[j] < 0n)
  if (wrong.length) throw new CalcError(`${wrong.map((s) => `„${s.label}“`).join(', ')} ${wrong.length > 1 ? 'müssten' : 'müsste'} auf der anderen Seite des Pfeils stehen – so geht die Gleichung nicht auf.`)
  return ints
}

/* ---------------------------- Darstellung ---------------------------- */

const coefTex = (k: bigint) => (k === 1n ? '' : `${k}\\,`)

/** ausgeglichene Gleichung als TeX */
export function equationTex(r: Reaction, coef?: (bigint | string)[]) {
  const c = (j: number) => {
    if (!coef) return ''
    const k = coef[j]
    return typeof k === 'bigint' ? coefTex(k) : `${k}\\,`
  }
  const nL = r.left.length
  const L = r.left.map((s, j) => c(j) + s.texFull).join(' + ')
  const R = r.right.map((s, j) => c(nL + j) + s.texFull).join(' + ')
  return `${L} ${r.equilibrium ? '\\rightleftharpoons' : '\\rightarrow'} ${R}`
}

function varNames(r: Reaction) {
  const letters = (r.hasElectrons ? 'abcdfghkmnpqrstuvwxyz' : 'abcdefghkmnpqrstuvwxyz').split('')
  return r.all.map((_, j) => letters[j])
}

/** Summe von Termen k·x mit Vorzeichen: „2a + b“, „-a + 8b - c“; leer → 0 */
function sumTex(terms: { k: bigint; body: string; isVar: boolean }[]) {
  if (!terms.length) return '0'
  return terms
    .map((t, i) => {
      const a = t.k < 0n ? -t.k : t.k
      const body = t.isVar ? (a === 1n ? t.body : `${a}${t.body}`) : a === 1n ? t.body : `${a} \\cdot ${t.body}`
      if (i === 0) return (t.k < 0n ? '-' : '') + body
      return (t.k < 0n ? ' - ' : ' + ') + body
    })
    .join('')
}

const valTex = (v: Q) => qTex(v)

/** Normalform Σ c·x = r (nur Unbekannte) */
interface Norm {
  label: string
  c: Q[]
  r: Q
}

function normTex(e: Norm, names: string[]) {
  const terms = e.c.flatMap((c, j) => (isZero(c) ? [] : [{ k: c.n, body: names[j], isVar: true }]))
  return `${sumTex(terms)} = ${valTex(e.r)}`
}

interface Derivation {
  steps: Step[]
  values: Q[]
  cost: number
}

/**
 * Koeffizienten nacheinander bestimmen, wie man es von Hand macht: einen Koeffizienten = 1 setzen,
 * dann immer eine Gleichung mit nur einer Unbekannten auflösen. Bleibt man stecken, werden zwei
 * Gleichungen kombiniert (Additionsverfahren); notfalls das Rest-System mit Gauß gelöst.
 */
function derive(r: Reaction, eqs: BalEq[], start: number, truth: Q[], names: string[]): Derivation {
  const n = r.all.length
  const val: (Q | null)[] = Array(n).fill(null)
  val[start] = ONE
  const steps: Step[] = []
  let cost = 0
  const done = new Set<number>()
  let firstSolve = true
  let firstCombo = true
  const vars = (e: BalEq) => [...e.L, ...e.R].map(([j]) => j)
  const norm = (e: BalEq, i: number): Norm => {
    const row = rowOf(e, n)
    const c: Q[] = row.map((x, j) => (val[j] === null ? x : ZERO))
    let rr = ZERO
    row.forEach((x, j) => {
      if (val[j] !== null) rr = sub(rr, mul(x, val[j]!))
    })
    const first = c.find((x) => !isZero(x))
    if (first && sign(first) < 0) return { label: eqs[i].tex, c: c.map(neg), r: neg(rr) }
    return { label: eqs[i].tex, c, r: rr }
  }
  while (val.some((v) => v === null)) {
    // 1) eine Gleichung mit genau einer Unbekannten
    let solved = false
    for (let i = 0; i < eqs.length && !solved; i++) {
      if (done.has(i)) continue
      const e = eqs[i]
      const unk = [...new Set(vars(e).filter((j) => val[j] === null))]
      if (!unk.length) {
        done.add(i)
        continue
      }
      if (unk.length !== 1) continue
      const u = unk[0]
      const inL = e.L.some(([j]) => j === u)
      const K = [...e.L, ...e.R].find(([j]) => j === u)![1]
      let sumL = ZERO
      let sumR = ZERO
      for (const [j, k] of e.L) if (j !== u) sumL = add(sumL, mul(q(k), val[j]!))
      for (const [j, k] of e.R) if (j !== u) sumR = add(sumR, mul(q(k), val[j]!))
      const rhs = inL ? sub(sumR, sumL) : sub(sumL, sumR)
      const value = div(rhs, q(K))
      val[u] = value
      done.add(i)
      const side = (t: [number, bigint][], subst: boolean) => sumTex(t.map(([j, k]) => (subst && j !== u ? { k, body: valTex(val[j]!), isVar: false } : { k, body: names[j], isVar: true })))
      // „2e = 1“ nur zeigen, wenn wirklich noch gerechnet werden muss
      const same = (inL ? e.L : e.R).filter(([j]) => j !== u)
      const other = inL ? e.R : e.L
      const arith = same.length > 0 || other.length !== 1 || (other[0][1] !== 1n && other[0][1] !== -1n)
      const chain = [`${side(e.L, false)} = ${side(e.R, false)}`, `${side(e.L, true)} = ${side(e.R, true)}`, arith ? `${sumTex([{ k: K, body: names[u], isVar: true }])} = ${valTex(rhs)}` : '', `${names[u]} = ${valTex(value)}`].filter(Boolean)
      const uniq = chain.filter((x, k) => k === 0 || x !== chain[k - 1])
      steps.push({
        tex: `${e.tex}\\colon\\quad ${uniq.join(' \\;\\Rightarrow\\; ')}`,
        note: firstSolve ? `Die ${e.name === 'Ladung' ? 'Ladungs' : `${e.name}-`}Gleichung enthält nur noch eine Unbekannte: bekannte Werte einsetzen und nach $${names[u]}$ auflösen.` : undefined,
      })
      firstSolve = false
      solved = true
    }
    if (solved) continue
    // 2) zwei Gleichungen kombinieren, sodass nur eine Unbekannte übrig bleibt
    const open = eqs.map((e, i) => ({ e, i })).filter(({ e, i }) => !done.has(i) && vars(e).some((j) => val[j] === null))
    const forms = open.map(({ e, i }) => norm(e, i))
    let combo: { a: Norm; b: Norm; ma: bigint; mb: bigint; c: Q[]; r: Q; u: number } | null = null
    search: for (let x = 0; x < forms.length; x++)
      for (let y = x + 1; y < forms.length; y++)
        for (let v = 0; v < n; v++) {
          const A = forms[x]
          const B = forms[y]
          if (isZero(A.c[v]) || isZero(B.c[v])) continue
          let ma = B.c[v].n
          let mb = A.c[v].n
          const g = bgcd(ma, mb)
          ma /= g
          mb /= g
          if (ma < 0n) {
            ma = -ma
            mb = -mb
          }
          const c = A.c.map((ca, j) => sub(mul(q(ma), ca), mul(q(mb), B.c[j])))
          const nz = c.map((cc, j) => (isZero(cc) ? -1 : j)).filter((j) => j >= 0)
          if (nz.length !== 1) continue
          combo = { a: A, b: B, ma, mb, c, r: sub(mul(q(ma), A.r), mul(q(mb), B.r)), u: nz[0] }
          break search
        }
    if (combo) {
      cost += 1
      const { a, b, ma, mb, c, r: rr, u } = combo
      const value = div(rr, c[u])
      val[u] = value
      const lbl = (m: bigint, l: string) => `${m === 1n || m === -1n ? '' : `${m < 0n ? -m : m} \\cdot `}(${l})`
      const comb = `${lbl(ma, a.label)} ${mb < 0n ? '+' : '-'} ${lbl(mb, b.label)}`
      steps.push({
        tex: `\\begin{aligned} (${a.label})\\colon&\\quad ${normTex(a, names)} \\\\ (${b.label})\\colon&\\quad ${normTex(b, names)} \\end{aligned}`,
        head: firstCombo ? 'Gleichungen kombinieren' : undefined,
        note: firstCombo
          ? 'Jede übrige Gleichung hat noch mehrere Unbekannte. Bekannte Werte einsetzen, ordnen und zwei Gleichungen so voneinander abziehen, dass eine Unbekannte wegfällt (Additionsverfahren).'
          : undefined,
      })
      const cu = c[u]
      const solvedTex = `${sumTex([{ k: cu.n, body: names[u], isVar: true }])} = ${valTex(rr)}`
      steps.push({ tex: `${comb}\\colon\\quad ${solvedTex}${cu.n === 1n ? '' : ` \\;\\Rightarrow\\; ${names[u]} = ${valTex(value)}`}` })
      firstCombo = false
      continue
    }
    // 3) Rest-System mit dem Gauß-Verfahren
    cost += 10
    const rest = [...Array(n).keys()].filter((j) => val[j] === null)
    steps.push({
      tex: `\\begin{aligned} ${forms.map((f) => `(${f.label})\\colon&\\quad ${normTex(f, names)}`).join(' \\\\ ')} \\end{aligned}`,
      head: 'Gleichungssystem lösen',
      note: 'Hier hat jede Gleichung mehrere Unbekannte. Das System wird mit dem Gauß-Verfahren gelöst (Gleichungen geschickt addieren, bis jede Unbekannte einzeln dasteht).',
    })
    for (const j of rest) val[j] = truth[j]
    steps.push({ tex: rest.map((j) => `${names[j]} = ${valTex(val[j]!)}`).join(',\\quad ') })
  }
  return { steps, values: val as Q[], cost }
}

const atomCount = (s: Species) => [...s.atoms.values()].reduce((a, b) => a + b, 0)

function countTable(eqs: BalEq[], coef: bigint[] | null) {
  const rows = eqs.map((e) => {
    const sideVal = (t: [number, bigint][]) => t.reduce((acc, [j, k]) => acc + (coef ? coef[j] : 1n) * k, 0n)
    const l = sideVal(e.L)
    const rr = sideVal(e.R)
    if (!coef) return `${e.tex} & ${l} & ${l === rr ? '=' : '\\ne'} & ${rr}`
    const detail = (t: [number, bigint][], total: bigint) => {
      if (!t.length) return '0'
      const parts = t.map(([j, k]) => `${coef[j]} \\cdot ${k < 0n ? `(${k})` : k}`)
      return `${parts.join(' + ')} = ${total}`
    }
    return `${e.tex} & ${detail(e.L, l)} & ${detail(e.R, rr)} & ${l === rr ? '\\checkmark' : '\\times'}`
  })
  if (!coef) return `\\begin{array}{l|c c c} & \\text{links} & & \\text{rechts} \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`
  return `\\begin{array}{l|c|c|c} & \\text{links} & \\text{rechts} & \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`
}

function typedNote(r: Reaction) {
  const t = r.all.filter((s) => s.typed)
  if (!t.length) return ''
  return ` Deine Koeffizienten (${t.map((s) => `${s.typed} vor ${s.label}`).join(', ')}) werden nicht übernommen – der Rechner bestimmt sie selbst.`
}

export interface Balanced {
  r: Reaction
  coef: bigint[]
}

export function balanced(input: string): Balanced {
  const r = parseReaction(input)
  return { r, coef: balanceCoefficients(r) }
}

/** Modus „Ausgleichen“: vollständiger Rechenweg mit Unbekannten a, b, c … */
export function balanceEquation(input: string): Solution {
  const r = parseReaction(input)
  const coef = balanceCoefficients(r)
  const n = r.all.length
  const eqs = balanceEqs(r)
  const names = varNames(r)
  const steps: Step[] = []
  steps.push({
    tex: equationTex(r),
    head: 'Gegeben',
    note: `Links die Ausgangsstoffe (Edukte), rechts die Produkte. Nur die Koeffizienten vor den Formeln dürfen geändert werden, nie die kleinen Indizes.${typedNote(r)}`,
  })
  const sum1 = (t: [number, bigint][]) => t.reduce((acc, [, k]) => acc + k, 0n)
  const already = eqs.every((e) => sum1(e.L) === sum1(e.R))
  steps.push({
    tex: countTable(eqs, null),
    head: 'Atome zählen',
    note: `Jede Atomsorte${r.charged ? ' und die Ladung' : ''} muss links und rechts gleich oft vorkommen. ${already ? 'Hier stimmt schon alles – die Rechnung bestätigt es.' : 'So wie es dasteht, stimmt das noch nicht überall.'}`,
  })
  steps.push({
    tex: equationTex(r, names),
    head: 'Koeffizienten als Unbekannte',
    note: `Vor jeden Stoff kommt ein unbekannter Koeffizient: $${names.join(', ')}$.`,
  })
  steps.push({
    tex: `\\begin{aligned} ${eqs.map((e) => `${e.tex}\\colon&\\quad ${sumTex(e.L.map(([j, k]) => ({ k, body: names[j], isVar: true })))} = ${sumTex(e.R.map(([j, k]) => ({ k, body: names[j], isVar: true })))}`).join(' \\\\ ')} \\end{aligned}`,
    head: 'Eine Gleichung je Element',
    note: `Für jedes Element gilt: Anzahl der Atome links = Anzahl rechts${r.charged ? '; bei Ionen zusätzlich: Summe der Ladungen links = rechts' : ''}. Die Zahl vor der Unbekannten ist der Index des Elements in der Formel.`,
  })
  // Startwert: so wählen, dass möglichst ohne Kombinieren gerechnet werden kann
  let truth = coef.map((k) => q(k))
  let bestD: Derivation | null = null
  let bestStart = 0
  const order = [...Array(n).keys()].sort((x, y) => Number(r.all[x].electron) - Number(r.all[y].electron) || atomCount(r.all[y]) - atomCount(r.all[x]) || x - y)
  for (const s of order) {
    const t = truth.map((x) => div(x, truth[s]))
    const d = derive(r, eqs, s, t, names)
    if (!bestD || d.cost < bestD.cost) {
      bestD = d
      bestStart = s
    }
    if (d.cost === 0) break
  }
  truth = truth.map((x) => div(x, truth[bestStart]))
  steps.push({
    tex: `${names[bestStart]} = 1`,
    head: 'Lösen',
    note: `Ein Koeffizient darf frei gewählt werden. Wir beginnen bei $${r.all[bestStart].tex}$ und setzen $${names[bestStart]} = 1$. Brüche sind erlaubt – sie werden am Ende weggeschafft.`,
  })
  steps.push(...bestD!.steps)
  const vals = bestD!.values
  // Kontrolle: Ableitung und exakte Lösung stimmen überein
  const values = vals.every((v, j) => cmp(v, truth[j]) === 0) ? vals : truth
  const Lcm = values.reduce((acc, x) => blcm(acc, x.d), 1n)
  const tuple = (xs: string[]) => `(${xs.join(',\\ ')})`
  if (Lcm !== 1n) {
    steps.push({
      tex: `${tuple(names)} = ${tuple(values.map(valTex))} \\;\\xrightarrow{\\;\\cdot ${Lcm}\\;}\\; ${tuple(coef.map(String))}`,
      head: 'Ganze Zahlen',
      note: `Alle Koeffizienten mit dem Hauptnenner ${Lcm} malnehmen – das Verhältnis bleibt gleich, aber es gibt keine Brüche mehr.`,
    })
  } else
    steps.push({
      tex: `${tuple(names)} = ${tuple(coef.map(String))}`,
      head: 'Ganze Zahlen',
      note: 'Alle Koeffizienten sind schon ganze Zahlen und lassen sich nicht weiter kürzen.',
    })
  steps.push({ tex: equationTex(r, coef), head: 'Ausgeglichene Gleichung', note: 'Koeffizient 1 schreibt man nicht.', final: true })
  steps.push({
    tex: countTable(eqs, coef),
    head: 'Probe',
    note: `Koeffizient mal Index ergibt die Anzahl der Atome – links und rechts gleich.${r.charged ? ' Bei der Ladung: Koeffizient mal Ionenladung.' : ''}`,
  })
  const ratio = coef.map(String).join(' : ')
  return {
    result: equationTex(r, coef),
    extra: [`\\text{Koeffizienten } ${ratio}`],
    steps,
    remark: `Die Koeffizienten geben das Verhältnis der Teilchen und der Stoffmengen an: $${r.all.map((s) => `n(${s.tex})`).join(' : ')} = ${ratio}$.`,
  }
}

/* ---------------------------- Stoffmengen & Massen ---------------------------- */

export type GivenKind = 'm' | 'n' | 'V'

/** molares Volumen idealer Gase bei 1013,25 hPa */
export const VM: Record<string, { v: Q; tex: string; note: string }> = {
  '22,414': { v: q(22414, 1000), tex: '22{,}414', note: 'bei 0 °C und 1013,25 hPa (Normbedingungen)' },
  '24,0': { v: q(24), tex: '24{,}0', note: 'bei 20 °C und 1013,25 hPa (Raumtemperatur)' },
  '24,47': { v: q(2447, 100), tex: '24{,}47', note: 'bei 25 °C und 1013,25 hPa' },
}

/** Stoffe, die bei Raumtemperatur gasförmig sind (wenn kein Zustand angegeben ist) */
const GASES = new Set(['H2', 'O2', 'N2', 'F2', 'Cl2', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'CO2', 'CO', 'CH4', 'C2H6', 'C3H8', 'C4H10', 'C2H4', 'C2H2', 'NO', 'NO2', 'N2O', 'SO2', 'H2S', 'NH3', 'O3'])

export const isGas = (s: Species) => (s.state ? s.state === 'g' : s.mark === '↑' || GASES.has(s.formula))

/** Masse in passender Einheit; winzige Werte in g mit Zehnerpotenz */
function showMass(m: Q) {
  const b = best(m, MASS_U)
  if (Math.abs(toNum(b.v)) < 0.1) return `${eqv(m)}${T('g')}`
  return `${eqv(b.v)}${T(b.u)}`
}
function showMol(n: Q) {
  const b = best(n, MOL_U)
  if (Math.abs(toNum(b.v)) < 0.1) return `${eqv(n)}${T('mol')}`
  return `${eqv(b.v)}${T(b.u)}`
}
function showVol(v: Q) {
  const b = best(v, VOL_U)
  return `${eqv(b.v)}${T(b.u)}`
}

export interface AmountRow {
  i: number
  tex: string
  label: string
  side: 'L' | 'R'
  nu: bigint
  M: Q | null
  n: Q
  m: Q | null
  V: Q | null
  given: boolean
}

function molarSteps(r: Reaction, idx: number[]): { M: (Q | null)[]; steps: Step[] } {
  const M: (Q | null)[] = r.all.map(() => null)
  const steps: Step[] = []
  let first = true
  for (const j of idx) {
    const s = r.all[j]
    if (s.electron) continue
    const mm = molarMass(s.formula)
    M[j] = mm.M
    steps.push({
      tex: mm.step.tex + (s.charge ? `\\quad (${s.tex})` : ''),
      head: first ? 'Molare Massen' : undefined,
      note: first ? `Atommassen aus dem Periodensystem (zwei Nachkommastellen) mal Anzahl der Atome.${r.charged ? ' Bei Ionen wird die Masse der Elektronen vernachlässigt.' : ''}` : undefined,
    })
    first = false
  }
  return { M, steps }
}

/** gesuchter Stoff: gewählter Index, sonst das erste Produkt (keine Elektronen, nicht der gegebene Stoff) */
export function pickWanted(r: Reaction, given: number, wanted?: number | null): number {
  const N = r.all.length
  if (wanted != null && wanted >= 0 && wanted < N && wanted !== given && !r.all[wanted].electron) return wanted
  const others = [...Array(N).keys()].filter((j) => j !== given && !r.all[j].electron)
  return others.find((j) => r.all[j].side === 'R') ?? others[0] ?? given
}

/**
 * Modus „Massen berechnen“: Menge eines Stoffes gegeben (m, n oder Gasvolumen V) →
 * n, m (und V bei Gasen) aller anderen Stoffe über das Stoffmengenverhältnis.
 */
export function reactionAmounts(opts: { equation: string; given: number; kind: GivenKind; value: NumIn | null; unit: string; vm?: string; wanted?: number | null }): Solution & { rows: AmountRow[] } {
  const r = parseReaction(opts.equation)
  const coef = balanceCoefficients(r)
  const N = r.all.length
  const g = opts.given
  if (!(g >= 0 && g < N)) throw new CalcError('Bitte den Stoff wählen, dessen Menge gegeben ist.')
  const G = r.all[g]
  if (!opts.value) throw new CalcError(`Bitte die gegebene Menge von ${G.label} eingeben.`)
  const x = opts.value.q
  if (sign(x) <= 0) throw new CalcError('Die gegebene Menge muss größer als 0 sein.')
  if (G.electron && opts.kind !== 'n') throw new CalcError('Für Elektronen bitte die Stoffmenge n angeben.')
  const vm = VM[opts.vm ?? '22,414'] ?? VM['22,414']
  const steps: Step[] = []
  const ratio = coef.map(String).join(' : ')
  steps.push({
    tex: equationTex(r, coef),
    head: 'Ausgeglichene Gleichung',
    note: `Die Koeffizienten geben das Stoffmengenverhältnis an: $${r.all.map((s) => `n(${s.tex})`).join(' : ')} = ${ratio}$.${typedNote(r)}`,
  })
  const order = [g, ...[...Array(N).keys()].filter((j) => j !== g)]
  const ms = molarSteps(r, order)
  const M = ms.M
  steps.push(...ms.steps)
  // gegebene Stoffmenge
  let nG: Q
  const gt = G.tex
  if (opts.kind === 'm') {
    const m = mul(x, fac(MASS_U, opts.unit))
    if (opts.unit !== 'g') steps.push({ tex: `m(${gt}) = ${qTex(x, F)}${T(opts.unit)} = ${nt(m)}${T('g')}`, head: 'Einheiten umrechnen', note: 'Masse in Gramm, damit sich g gegen g/mol kürzt.' })
    nG = div(m, M[g]!)
    steps.push({
      tex: `n(${gt}) = \\frac{m}{M} = \\frac{${nt(m)}${T('g')}}{${m2(M[g]!)}${T('g/mol')}} ${eqv(nG)}${T('mol')}`,
      head: 'Gegebene Stoffmenge',
      note: 'Aus der gegebenen Masse die Stoffmenge berechnen – gerechnet wird in der Gleichung immer mit Stoffmengen.',
    })
  } else if (opts.kind === 'n') {
    nG = mul(x, fac(MOL_U, opts.unit))
    steps.push({ tex: `n(${gt}) = ${qTex(x, F)}${T(opts.unit)}${opts.unit !== 'mol' ? ` = ${nt(nG)}${T('mol')}` : ''}`, head: 'Gegebene Stoffmenge', note: opts.unit !== 'mol' ? 'In mol umrechnen.' : undefined })
  } else {
    const V = mul(x, fac(VOL_U, opts.unit))
    if (opts.unit !== 'L') steps.push({ tex: `V(${gt}) = ${qTex(x, F)}${T(opts.unit)} = ${nt(V)}${T('L')}`, head: 'Einheiten umrechnen', note: 'Volumen in Liter, weil $V_m$ in L/mol angegeben ist.' })
    nG = div(V, vm.v)
    steps.push({
      tex: `n(${gt}) = \\frac{V}{V_m} = \\frac{${nt(V)}${T('L')}}{${vm.tex}${T('L/mol')}} ${eqv(nG)}${T('mol')}`,
      head: 'Gegebene Stoffmenge',
      note: `Molares Volumen eines idealen Gases ${vm.note}.${isGas(G) ? '' : ' Achtung: Das molare Volumen gilt nur für Gase.'}`,
    })
  }
  // Verhältnis
  const n: Q[] = r.all.map((_, j) => (j === g ? nG : div(mul(nG, q(coef[j])), q(coef[g]))))
  let firstR = true
  for (const j of order.slice(1)) {
    const s = r.all[j]
    const same = coef[j] === coef[g]
    steps.push({
      tex: same ? `n(${s.tex}) = n(${gt}) ${eqv(n[j])}${T('mol')}` : `n(${s.tex}) = \\frac{${coef[j]}}{${coef[g]}} \\cdot n(${gt}) = \\frac{${coef[j]}}{${coef[g]}} \\cdot ${nt(nG)}${T('mol')} ${eqv(n[j])}${T('mol')}`,
      head: firstR ? 'Stoffmengenverhältnis' : undefined,
      note: firstR ? `Aus $n(${s.tex}) : n(${gt}) = ${coef[j]} : ${coef[g]}$ folgt die gesuchte Stoffmenge.` : undefined,
    })
    firstR = false
  }
  // Massen und Volumina
  const wanted = pickWanted(r, g, opts.wanted)
  const m: (Q | null)[] = r.all.map((_, j) => (M[j] ? mul(n[j], M[j]!) : null))
  const V: (Q | null)[] = r.all.map((s, j) => (isGas(s) ? mul(n[j], vm.v) : null))
  let firstM = true
  for (const j of order) {
    const s = r.all[j]
    if (!M[j] || (j === g && opts.kind === 'm')) continue
    steps.push({
      tex: `m(${s.tex}) = n \\cdot M = ${nt(n[j])}${T('mol')} \\cdot ${m2(M[j]!)}${T('g/mol')} ${eqv(m[j]!)}${T('g')}`,
      head: firstM ? 'Massen' : undefined,
      note: firstM ? 'Stoffmenge mal molare Masse – mol kürzt sich weg.' : undefined,
      final: j === wanted,
    })
    firstM = false
  }
  let firstV = true
  for (const j of order) {
    const s = r.all[j]
    if (!V[j] || (j === g && opts.kind === 'V')) continue
    steps.push({
      tex: `V(${s.tex}) = n \\cdot V_m = ${nt(n[j])}${T('mol')} \\cdot ${vm.tex}${T('L/mol')} ${eqv(V[j]!)}${T('L')}`,
      head: firstV ? 'Gasvolumen' : undefined,
      note: firstV ? `Für Gase gilt $V_m = ${vm.tex}\\,\\text{L/mol}$ ${vm.note}.` : undefined,
    })
    firstV = false
  }
  // Probe: Massenerhaltung
  const sumSide = (side: 'L' | 'R') => r.all.reduce((acc, s, j) => (s.side === side && m[j] ? add(acc, m[j]!) : acc), ZERO)
  if (r.all.every((s, j) => s.electron || m[j])) {
    const mL = sumSide('L')
    const mR = sumSide('R')
    steps.push({
      tex: `\\textstyle\\sum m_{\\text{links}} ${eqv(mL)}${T('g')}, \\quad \\sum m_{\\text{rechts}} ${eqv(mR)}${T('g')}${cmp(mL, mR) === 0 ? '\\ \\checkmark' : ''}`,
      head: 'Probe',
      note: 'Gesetz von der Erhaltung der Masse: Bei einer Reaktion geht keine Masse verloren.',
    })
  }
  if (!steps.some((s) => s.final)) steps[steps.length - 1].final = true
  const W = r.all[wanted]
  const lines: string[] = []
  for (const j of order.slice(1)) {
    if (j === wanted) continue
    const s = r.all[j]
    lines.push(m[j] ? `m(${s.tex}) ${showMass(m[j]!)}` : `n(${s.tex}) ${showMol(n[j])}`)
  }
  const result = wanted === g ? `n(${gt}) ${showMol(nG)}` : m[wanted] ? `m(${W.tex}) ${showMass(m[wanted]!)}` : `n(${W.tex}) ${showMol(n[wanted])}`
  const extra = [`n(${W.tex}) ${showMol(n[wanted])}${V[wanted] && wanted !== g ? `,\\quad V(${W.tex}) ${showVol(V[wanted]!)}` : ''}`, ...lines]
  const rows: AmountRow[] = r.all.map((s, j) => ({ i: j, tex: s.tex, label: s.label, side: s.side, nu: coef[j], M: M[j], n: n[j], m: m[j], V: V[j], given: j === g }))
  return {
    result,
    extra,
    steps,
    rows,
    remark: `Merke: Nie Massen direkt ins Verhältnis setzen – erst in Stoffmengen umrechnen, dann mit den Koeffizienten ($${ratio}$) rechnen, dann zurück in Massen.`,
  }
}

/* ---------------------------- Unterschuss & Ausbeute ---------------------------- */

export interface YieldRow {
  i: number
  tex: string
  m: Q
  M: Q
  n: Q
  per: Q
  role: 'limit' | 'excess' | 'exact'
  left: Q
}

/**
 * Modus „Ausbeute & Unterschuss“: Massen der Edukte → begrenzender Stoff (Unterschuss),
 * theoretische Produktmasse, mit der tatsächlich erhaltenen Masse die Ausbeute in %.
 */
export function reactionYield(opts: { equation: string; masses: (NumIn | null)[]; units: string[]; product: number; actual: NumIn | null; actualUnit: string }): Solution & { rows: YieldRow[] } {
  const r = parseReaction(opts.equation)
  const coef = balanceCoefficients(r)
  const nL = r.left.length
  const given = r.left.map((_, j) => j).filter((j) => opts.masses[j])
  if (!given.length) throw new CalcError('Bitte die Masse von mindestens einem Ausgangsstoff eingeben.')
  for (const j of given) {
    if (r.left[j].electron) throw new CalcError('Elektronen haben keine Masse – bitte nur Stoffe angeben.')
    if (sign(opts.masses[j]!.q) <= 0) throw new CalcError(`Die Masse von ${r.left[j].label} muss größer als 0 sein.`)
  }
  const pIdx = opts.product
  if (!(pIdx >= 0 && pIdx < r.right.length)) throw new CalcError('Bitte das Produkt wählen.')
  const P = r.right[pIdx]
  const pj = nL + pIdx
  if (P.electron) throw new CalcError('Bitte als Produkt einen Stoff wählen, keine Elektronen.')
  const steps: Step[] = []
  steps.push({ tex: equationTex(r, coef), head: 'Ausgeglichene Gleichung', note: `Ohne ausgeglichene Gleichung kein richtiges Stoffmengenverhältnis.${typedNote(r)}` })
  const ms = molarSteps(r, [...given, pj])
  steps.push(...ms.steps)
  const M = ms.M
  const conv: string[] = []
  const mg: Q[] = []
  const n: Q[] = []
  given.forEach((j) => {
    const v = opts.masses[j]!
    const u = opts.units[j] ?? 'g'
    const m = mul(v.q, fac(MASS_U, u))
    if (u !== 'g') conv.push(`m(${r.left[j].tex}) = ${qTex(v.q, F)}${T(u)} = ${nt(m)}${T('g')}`)
    mg[j] = m
    n[j] = div(m, M[j]!)
  })
  if (conv.length) steps.push({ tex: conv.join(',\\quad '), head: 'Einheiten umrechnen', note: 'Alle Massen in Gramm.' })
  given.forEach((j, k) => {
    steps.push({
      tex: `n(${r.left[j].tex}) = \\frac{${nt(mg[j])}${T('g')}}{${m2(M[j]!)}${T('g/mol')}} ${eqv(n[j])}${T('mol')}`,
      head: k === 0 ? 'Stoffmengen der Edukte' : undefined,
      note: k === 0 ? 'Vorhandene Stoffmengen: $n = m/M$.' : undefined,
    })
  })
  // n/ν vergleichen
  const per = given.map((j) => div(n[j], q(coef[j])))
  let lim = 0
  per.forEach((p, k) => {
    if (cmp(p, per[lim]) < 0) lim = k
  })
  const lj = given[lim]
  const L = r.left[lj]
  if (given.length > 1) {
    steps.push({
      tex: given.map((j, k) => `\\frac{n(${r.left[j].tex})}{${coef[j]}} ${eqv(per[k])}${T('mol')}`).join(',\\quad '),
      head: 'Unterschuss bestimmen',
      note: 'Jede Stoffmenge durch ihren Koeffizienten teilen. Der kleinste Wert gehört zum Stoff, der zuerst verbraucht ist: Er steht im **Unterschuss** und begrenzt die Produktmenge.',
    })
    given.forEach((j, k) => {
      if (k === lim) return
      const need = div(mul(n[lj], q(coef[j])), q(coef[lj]))
      const rest = sub(n[j], need)
      const exact = isZero(rest)
      steps.push({
        tex: `n_{\\text{benötigt}}(${r.left[j].tex}) = \\frac{${coef[j]}}{${coef[lj]}} \\cdot ${nt(n[lj])}${T('mol')} ${eqv(need)}${T('mol')} ${exact ? '=' : '<'} ${nt(n[j])}${T('mol')}`,
        note: exact
          ? `Genau so viel ist vorhanden – ${r.left[j].label} und ${L.label} liegen im richtigen Verhältnis vor.`
          : `Vorhanden ist mehr, als ${L.label} verbrauchen kann: ${r.left[j].label} liegt im **Überschuss**. Übrig bleiben $${nt(rest)}${T('mol')} \\cdot ${m2(M[j]!)}${T('g/mol')} ${eqv(mul(rest, M[j]!))}${T('g')}$.`,
      })
    })
  } else
    steps.push({
      tex: `\\text{begrenzend: } ${L.tex}`,
      head: 'Unterschuss bestimmen',
      note: 'Nur ein Edukt ist angegeben – die anderen Stoffe werden im Überschuss angenommen.',
    })
  const nP = div(mul(n[lj], q(coef[pj])), q(coef[lj]))
  const mP = mul(nP, M[pj]!)
  steps.push({
    tex: `n(${P.tex}) = \\frac{${coef[pj]}}{${coef[lj]}} \\cdot n(${L.tex}) = \\frac{${coef[pj]}}{${coef[lj]}} \\cdot ${nt(n[lj])}${T('mol')} ${eqv(nP)}${T('mol')}`,
    head: 'Theoretische Ausbeute',
    note: 'Gerechnet wird mit dem Stoff im Unterschuss – nur er bestimmt, wie viel Produkt höchstens entstehen kann.',
  })
  steps.push({ tex: `m_{\\text{theor.}}(${P.tex}) = n \\cdot M = ${nt(nP)}${T('mol')} \\cdot ${m2(M[pj]!)}${T('g/mol')} ${eqv(mP)}${T('g')}`, final: !opts.actual })
  const extra: string[] = [`\\text{Unterschuss: } ${L.tex}${given.length > 1 ? `,\\ \\text{Überschuss: } ${given.filter((j) => j !== lj && cmp(div(n[j], q(coef[j])), per[lim]) > 0).map((j) => r.left[j].tex).join(',\\ ') || '\\text{–}'}` : ''}`]
  let result = `m_{\\text{theor.}}(${P.tex}) ${showMass(mP)}`
  let remark = 'Die theoretische Ausbeute (100 %) wird praktisch nie erreicht: Verluste beim Filtrieren, Umfüllen und Trocknen, Nebenreaktionen und Gleichgewichte.'
  if (opts.actual) {
    if (sign(opts.actual.q) <= 0) throw new CalcError('Die erhaltene Masse muss größer als 0 sein.')
    const mi = mul(opts.actual.q, fac(MASS_U, opts.actualUnit))
    if (opts.actualUnit !== 'g') steps.push({ tex: `m_{\\text{ist}} = ${qTex(opts.actual.q, F)}${T(opts.actualUnit)} = ${nt(mi)}${T('g')}`, head: 'Einheiten umrechnen' })
    const eta = mul(div(mi, mP), q(100))
    steps.push({
      tex: `\\eta = \\frac{m_{\\text{ist}}}{m_{\\text{theor.}}} \\cdot 100\\,\\% = \\frac{${nt(mi)}${T('g')}}{${nt(mP)}${T('g')}} \\cdot 100\\,\\% ${eqv(eta, 3)}\\,\\%`,
      head: 'Ausbeute',
      note: 'Tatsächlich erhaltene Masse geteilt durch die theoretisch mögliche.',
      final: true,
    })
    result = `\\eta ${eqv(eta, 3)}\\,\\%`
    extra.unshift(`m_{\\text{theor.}}(${P.tex}) ${showMass(mP)}`)
    if (toNum(eta) > 100) remark = 'Über 100 % ist nicht möglich – das Produkt ist vermutlich noch feucht oder verunreinigt (oder es wurde falsch gewogen).'
  }
  const rows: YieldRow[] = given.map((j, k) => {
    const cmpv = cmp(per[k], per[lim])
    const need = div(mul(n[lj], q(coef[j])), q(coef[lj]))
    return { i: j, tex: r.left[j].tex, m: mg[j], M: M[j]!, n: n[j], per: per[k], role: k === lim ? 'limit' : cmpv === 0 ? 'exact' : 'excess', left: sub(n[j], need) }
  })
  return { result, extra, steps, rows, remark }
}
