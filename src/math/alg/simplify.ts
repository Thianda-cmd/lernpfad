/**
 * Terme Schritt für Schritt vereinfachen – so wie im Unterricht:
 * Klammern von innen nach außen auflösen, ausmultiplizieren (auch binomische Formeln), ordnen, zusammenfassen.
 * Jede „Runde“ ergibt eine Zeile im Lösungsweg.
 */
import { add, blcm, CalcError, isTerminating, ONE, q, qTex, sign, type Fmt, type Q } from '../q'
import {
  combine,
  groupLike,
  hasLike,
  isConst,
  negTerms,
  numTerm,
  ONE_TERM,
  sortTerms,
  sumTex,
  termAbs,
  termAbsTex,
  termDiv,
  termEq,
  termMul,
  termNeg,
  termPow,
  termTex,
  type Term,
} from './poly'
import type { Solution, Step } from './step'
import { flatTerms, grp, mkSum, parseW, single, terms, wTex, type W } from './tree'

type Act =
  | 'nested'
  | 'innerCombine'
  | 'plus'
  | 'minus'
  | 'dist'
  | 'distPairs'
  | 'pairs'
  | 'binom1'
  | 'binom2'
  | 'binom3'
  | 'binomNegBoth'
  | 'powExpand'
  | 'powMono'
  | 'fold'
  | 'num'
  | 'kuerzen'
  | 'divDist'
  | 'pow0'
  | 'signs'

interface Ctx {
  acts: Set<Act>
  info: string[]
  f: Fmt
}

const NOTES: [Act, string][] = [
  ['nested', 'Von innen nach außen: zuerst das, was in den Klammern steht.'],
  ['innerCombine', 'Erst in der Klammer zusammenfassen – das spart Arbeit.'],
  ['plus', 'Plusklammer: Die Klammer fällt einfach weg.'],
  ['minus', 'Minusklammer: Klammer weglassen und **jedes** Vorzeichen in der Klammer umdrehen.'],
  ['dist', 'Ausmultiplizieren: Die Zahl vor der Klammer wird mit **jedem** Summanden in der Klammer multipliziert.'],
  ['distPairs', 'Ausmultiplizieren: Der Faktor vor der Klammer wird mit **jedem** Summanden in der Klammer multipliziert.'],
  ['pairs', 'Klammer mal Klammer: Jeder Summand der ersten Klammer wird mit jedem Summanden der zweiten Klammer multipliziert.'],
  ['binom1', '1. binomische Formel: $(a+b)^2 = a^2 + 2ab + b^2$'],
  ['binom2', '2. binomische Formel: $(a-b)^2 = a^2 - 2ab + b^2$'],
  ['binom3', '3. binomische Formel: $(a+b)(a-b) = a^2 - b^2$'],
  ['binomNegBoth', 'Beide Summanden negativ: $(-a-b)^2 = (a+b)^2$.'],
  ['powExpand', 'Eine Potenz einer Klammer ist ein Produkt gleicher Klammern: $(a+b+c)^2 = (a+b+c)(a+b+c)$.'],
  ['powMono', 'Potenz eines Produkts: Jeder Faktor wird potenziert, z. B. $(2x)^2 = 2^2 \\cdot x^2 = 4x^2$.'],
  ['fold', 'Produkte ausrechnen: Zahlen multiplizieren, gleiche Variablen zur Potenz zusammenfassen ($x \\cdot x = x^2$).'],
  ['num', 'Zahlen ausrechnen.'],
  ['kuerzen', 'Kürzen: Zahlen teilen, bei gleichen Variablen die Hochzahlen subtrahieren.'],
  ['divDist', 'Eine Summe wird geteilt, indem man **jeden** Summanden teilt.'],
  ['pow0', 'Hoch 0 ergibt immer 1.'],
  ['signs', 'Vorzeichen: Plus mal Minus ergibt Minus, Minus mal Minus ergibt Plus.'],
]

function noteOf(c: Ctx): string {
  const parts = NOTES.filter(([a]) => c.acts.has(a)).map(([, t]) => t)
  if (c.info.length) parts.push(c.info.join(' · '))
  return parts.join(' ')
}

const isReady = (w: W) => flatTerms(w) !== null

/** „Hier steht 2a für a und 3 für b.“ */
function binomRole(a: Term, b: Term, f: Fmt) {
  return `Hier steht $${termTex(a, true, f)}$ für $a$ und $${termTex(b, true, f)}$ für $b$.`
}
const isOneTerm = (t: Term) => isConst(t) && t.c.n === 1n && t.c.d === 1n

function asFactor(w: W): W {
  if (w.t === 'terms' && w.ts.length > 1) return grp(w)
  if (w.t === 'sum') return grp(w)
  return w
}

function pairs(A: Term[], B: Term[]): W {
  const items = []
  for (const a of A)
    for (const b of B) {
      const s = (sign(a.c) * sign(b.c)) as 1 | -1
      items.push({ s, w: { t: 'prod' as const, f: [terms([termAbs(a)]), terms([termAbs(b)])] } })
    }
  return mkSum(items)
}

function binom3(A: Term[], B: Term[], c: Ctx): W | null {
  if (A.length !== 2 || B.length !== 2) return null
  for (const [i, j] of [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]) {
    if (!termEq(A[i], B[j])) continue
    const p = A[1 - i]
    const r = B[1 - j]
    if (!termEq(p, termNeg(r))) continue
    const a = A[i]
    const b = termAbs(p)
    c.info.push(binomRole(a, b, c.f))
    return mkSum([
      { s: 1, w: { t: 'pow', b: terms([a]), k: 2 } },
      { s: -1, w: { t: 'pow', b: terms([b]), k: 2 } },
    ])
  }
  return null
}

function red(w: W, c: Ctx): W {
  switch (w.t) {
    case 'terms':
      return w
    case 'grp':
      if (w.w.t === 'terms') return w
      c.acts.add('nested')
      return grp(red(w.w, c), w.sq)
    case 'sum':
      return redSum(w, c)
    case 'prod':
      return redProd(w, c)
    case 'pow':
      return redPow(w, c)
    case 'div':
      return redDiv(w, c)
  }
}

function redSum(w: Extract<W, { t: 'sum' }>, c: Ctx): W {
  const out: { s: 1 | -1; w: W }[] = []
  for (const it of w.it) {
    const x = it.w
    if (x.t === 'grp' && x.w.t === 'terms') {
      c.acts.add(it.s < 0 ? 'minus' : 'plus')
      out.push({ s: 1, w: terms(it.s < 0 ? negTerms(x.w.ts) : x.w.ts) })
      continue
    }
    if (x.t === 'terms') {
      out.push(it)
      continue
    }
    const y = red(x, c)
    if (it.s < 0 && ((y.t === 'terms' && y.ts.length > 1) || y.t === 'sum')) out.push({ s: -1, w: grp(y) })
    else out.push({ s: it.s, w: y })
  }
  return mkSum(out)
}

function combineInside(fs: W[]): W[] | null {
  let changed = false
  const out = fs.map((x) => {
    if (x.t === 'grp' && x.w.t === 'terms' && x.w.ts.length > 1 && hasLike(x.w.ts)) {
      changed = true
      const r = sortTerms(combine(x.w.ts))
      return r.length > 1 ? grp(terms(r), x.sq) : grp(terms(r.length ? r : [numTerm(q(0))]), x.sq)
    }
    return x
  })
  return changed ? out : null
}

function redProd(w: Extract<W, { t: 'prod' }>, c: Ctx): W {
  if (!w.f.every(isReady)) return { t: 'prod', f: w.f.map((x) => (isReady(x) ? x : asFactor(red(x, c)))) }
  const inner = combineInside(w.f)
  if (inner) {
    c.acts.add('innerCombine')
    return { t: 'prod', f: inner }
  }
  const monos: Term[] = []
  const sums: Term[][] = []
  for (const x of w.f) {
    const t = single(x)
    if (t) monos.push(t)
    else sums.push(flatTerms(x)!)
  }
  const M = monos.reduce(termMul, ONE_TERM)
  if (monos.filter((t) => sign(t.c) < 0).length) c.acts.add('signs')
  if (!sums.length) {
    c.acts.add(monos.every(isConst) ? 'num' : 'fold')
    return terms([M])
  }
  if (sums.length === 1) {
    const S = sums[0]
    if (S.some((t) => sign(t.c) < 0) && !isConst(M)) c.acts.add('signs')
    if (!isConst(M)) {
      c.acts.add('distPairs')
      return pairs([M], S)
    }
    c.acts.add('dist')
    return terms(S.map((t) => termMul(M, t)))
  }
  const [A, B, ...rest] = sums
  const restF = rest.map((r) => grp(terms(r)))
  const lead: W[] = isOneTerm(M) ? [] : [terms([M])]
  if (sums.length === 2 && isOneTerm(M)) {
    const b3 = binom3(A, B, c)
    if (b3) {
      c.acts.add('binom3')
      return b3
    }
  }
  c.acts.add('pairs')
  const P = pairs(A, B)
  if (!lead.length && !restF.length) return P
  return { t: 'prod', f: [...lead, grp(P), ...restF] }
}

function redPow(w: Extract<W, { t: 'pow' }>, c: Ctx): W {
  if (!isReady(w.b)) return { t: 'pow', b: asFactor(red(w.b, c)), k: w.k }
  const S = flatTerms(w.b)!
  if (w.k === 0) {
    c.acts.add('pow0')
    return terms([{ c: ONE, m: {} }])
  }
  if (S.length > 1 && hasLike(S)) {
    c.acts.add('innerCombine')
    const r = sortTerms(combine(S))
    return { t: 'pow', b: r.length > 1 ? grp(terms(r)) : terms(r.length ? r : [numTerm(q(0))]), k: w.k }
  }
  if (w.k === 1) return S.length === 1 ? terms(S) : grp(terms(S))
  if (S.length === 1) {
    c.acts.add(isConst(S[0]) ? 'num' : 'powMono')
    return terms([termPow(S[0], w.k)])
  }
  if (S.length === 2 && w.k === 2) {
    let [a, b] = S
    if (sign(a.c) < 0 && sign(b.c) > 0) [a, b] = [b, a]
    if (sign(a.c) < 0 && sign(b.c) < 0) {
      a = termNeg(a)
      b = termNeg(b)
      c.acts.add('binomNegBoth')
    }
    const minus = sign(b.c) < 0
    const bb = minus ? termNeg(b) : b
    c.acts.add(minus ? 'binom2' : 'binom1')
    c.info.push(binomRole(a, bb, c.f))
    return mkSum([
      { s: 1, w: { t: 'pow', b: terms([a]), k: 2 } },
      { s: minus ? -1 : 1, w: { t: 'prod', f: [terms([numTerm(q(2))]), terms([a]), terms([bb])] } },
      { s: 1, w: { t: 'pow', b: terms([bb]), k: 2 } },
    ])
  }
  if (w.k < 0) throw new CalcError('Negative Hochzahlen bei Klammern kann dieser Rechner nicht.')
  c.acts.add('powExpand')
  return { t: 'prod', f: Array.from({ length: w.k }, () => grp(terms(S))) }
}

function redDiv(w: Extract<W, { t: 'div' }>, c: Ctx): W {
  if (!isReady(w.a) || !isReady(w.b)) return { t: 'div', a: isReady(w.a) ? w.a : red(w.a, c), b: isReady(w.b) ? w.b : red(w.b, c) }
  const A = flatTerms(w.a)!
  const B = flatTerms(w.b)!
  if (B.length > 1 && hasLike(B)) {
    c.acts.add('innerCombine')
    return { t: 'div', a: w.a, b: terms(sortTerms(combine(B))) }
  }
  if (B.length !== 1) throw new CalcError('Im Nenner steht eine Summe – solche Bruchterme kann der Term-Rechner nicht vereinfachen.')
  if (A.length > 1 && hasLike(A)) {
    c.acts.add('innerCombine')
    return { t: 'div', a: terms(sortTerms(combine(A))), b: w.b }
  }
  const b = B[0]
  if (A.length <= 1) {
    c.acts.add('kuerzen')
    return terms([termDiv(A[0] ?? numTerm(q(0)), b)])
  }
  c.acts.add('divDist')
  return mkSum(A.map((t) => ({ s: (sign(t.c) < 0 ? -1 : 1) as 1 | -1, w: { t: 'div' as const, a: terms([termAbs(t)]), b: terms([b]) } })))
}

/** Eine Runde auf der obersten Ebene */
function roundRoot(w: W, c: Ctx): W {
  if (w.t === 'grp' && w.w.t === 'terms') {
    c.acts.add('plus')
    return w.w
  }
  return red(w, c)
}

export interface Round {
  w: W
  note: string
}

/** Alle Runden bis nur noch eine flache Summe übrig ist */
export function rounds(w0: W, f: Fmt): Round[] {
  const out: Round[] = []
  let w = w0
  for (let i = 0; i < 80 && w.t !== 'terms'; i++) {
    const c: Ctx = { acts: new Set(), info: [], f }
    const next = roundRoot(w, c)
    if (wTex(next, f) === wTex(w, f) && next.t !== 'terms') throw new CalcError('Dieser Term lässt sich so nicht weiter vereinfachen.')
    w = next
    out.push({ w, note: noteOf(c) })
  }
  if (w.t !== 'terms') throw new CalcError('Der Term ist zu verschachtelt.')
  return out
}

/** Brüche gleichnamig machen: ¾ + ⁷⁄₆ = ⁹⁄₁₂ + ¹⁴⁄₁₂ = ²³⁄₁₂ */
export function fracSumTex(cs: Q[]): string {
  const hn = cs.reduce((l, c) => blcm(l, c.d), 1n)
  const part = (c: Q, i: number, body: string) => (i === 0 ? (c.n < 0n ? '-' : '') : c.n < 0n ? ' - ' : ' + ') + body
  const orig = cs.map((c, i) => part(c, i, c.d === 1n ? `${c.n < 0n ? -c.n : c.n}` : `\\frac{${c.n < 0n ? -c.n : c.n}}{${c.d}}`)).join('')
  const ext = cs.map((c, i) => part(c, i, `\\frac{${(c.n < 0n ? -c.n : c.n) * (hn / c.d)}}{${hn}}`)).join('')
  const total = cs.reduce((s, c) => add(s, c), q(0))
  return `${orig} = ${ext} = ${qTex(total)}`
}

const sameSeq = (a: Term[], b: Term[]) => a.length === b.length && a.every((x, i) => termEq(x, b[i]))

/** „(3 − 2 + 4)x + (5 + 8)“ */
export function coefDetailTex(groups: Term[][], f: Fmt): string {
  return groups
    .map((g, gi) => {
      if (g.length === 1) return termTex(g[0], gi === 0, f)
      const cs = g.map((t, i) => (i === 0 ? qTex(t.c, f) : (sign(t.c) < 0 ? ' - ' : ' + ') + qTex(termAbs(t).c, f))).join('')
      const unit = termAbsTex({ c: ONE, m: g[0].m }, f)
      const varPart = isConst(g[0]) ? '' : Object.values(g[0].m).some((e) => e < 0) ? ` \\cdot ${unit}` : unit
      return `${gi === 0 ? '' : ' + '}\\left(${cs}\\right)${varPart}`
    })
    .join('')
}

export interface Stage {
  ts: Term[]
  tex: string
  note?: string
}

/** Ordnen → Zahlen davor verrechnen → Ergebnis (nur die nötigen Stufen) */
export function finishStages(ts: Term[], f: Fmt, main?: string, opts: { sortStage?: boolean } = {}): { stages: Stage[]; result: Term[] } {
  const result = sortTerms(combine(ts), main)
  const stages: Stage[] = []
  if (hasLike(ts)) {
    const groups = groupLike(ts, main)
    const flat = groups.flat()
    if (!sameSeq(flat, ts)) stages.push({ ts: flat, tex: sumTex(flat, f), note: 'Ordnen: Gleichartige Terme (gleiche Variablen mit gleichen Hochzahlen) nebeneinanderschreiben.' })
    const side = groups.filter((g) => g.length > 1 && g.some((t) => t.c.d !== 1n) && !(f.dec && g.every((t) => isTerminating(t.c)))).map((g) => fracSumTex(g.map((t) => t.c)))
    stages.push({
      ts: flat,
      tex: coefDetailTex(groups, f),
      note: 'Zusammenfassen: Bei gleichartigen Termen nur die Zahlen davor verrechnen – der Variablenteil bleibt gleich.' + (side.length ? ` Nebenrechnung: ${side.map((x) => `$${x}$`).join(', ')}` : ''),
    })
    stages.push({ ts: result, tex: sumTex(result, f) })
  } else if (opts.sortStage !== false && sumTex(result, f) !== sumTex(ts, f)) {
    stages.push({ ts: result, tex: sumTex(result, f), note: 'Ordnen: nach Hochzahlen sortiert, Zahlen ans Ende.' })
  }
  return { stages, result }
}

export interface Simplified {
  steps: Step[]
  result: Term[]
}

/** Lösungsweg für einen Baum (erste Zeile ist der Term selbst) */
export function simplifySteps(w: W, f: Fmt, main?: string): Simplified {
  const steps: Step[] = [{ tex: wTex(w, f) }]
  const rs = rounds(w, f)
  for (const r of rs) steps.push({ tex: '= ' + wTex(r.w, f), note: r.note || undefined })
  const last = rs.length ? rs[rs.length - 1].w : w
  const ts = (last as Extract<W, { t: 'terms' }>).ts
  const { stages, result } = finishStages(ts, f, main)
  for (const s of stages) steps.push({ tex: '= ' + s.tex, note: s.note })
  if (steps.length === 1) steps[0].note = 'Hier gibt es nichts mehr zu vereinfachen.'
  return { steps, result }
}

export function simplifyInput(src: string): Solution & { terms: Term[]; dec: boolean } {
  const p = parseW(src, { rootHint: ' Dafür gibt es den Rechner „Potenzen & Wurzeln“.' })
  const f: Fmt = { dec: p.dec }
  const { steps, result } = simplifySteps(p.w, f)
  const res = sumTex(result, f)
  if (steps.length > 1) steps[steps.length - 1].final = true
  return { result: res, steps, terms: result, dec: p.dec }
}

export { termAbs, termDiv, termNeg }
