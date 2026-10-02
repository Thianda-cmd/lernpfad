/**
 * Gleichungen und Ungleichungen Schritt für Schritt lösen:
 * Klammern auflösen → zusammenfassen → (Hauptnenner) → nach x umstellen bzw. p-q-Formel → Probe.
 * Jede Zeile trägt rechts die Umformung, die als Nächstes angewendet wird – wie in der Mitschrift.
 */
import {
  add,
  blcm,
  CalcError,
  cmp,
  div,
  eq as qeq,
  isOne,
  isTerminating,
  isZero,
  mul,
  neg,
  ONE,
  q,
  qabs,
  qRoot,
  qTex,
  qTexPar,
  sign,
  splitSqrt,
  sub,
  toNum,
  approxTex,
  ZERO,
  type Fmt,
  type Q,
} from '../q'
import { toTex, tryParse } from '../expr'
import { combine, degIn, isConst, negTerms, numTerm, sortTerms, sumTex, termAbsTex, termTex, varTex, type Term } from './poly'
import { finishStages, rounds } from './simplify'
import type { Solution, Step } from './step'
import { parseW, substitute, terms as wTerms, wEval, wTex, type W } from './tree'

export type Rel = '=' | '<' | '>' | '≤' | '≥'
export const REL_TEX: Record<Rel, string> = { '=': '=', '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' }
const FLIP: Record<Rel, Rel> = { '=': '=', '<': '>', '>': '<', '≤': '≥', '≥': '≤' }

export function splitRelation(src: string, allowNone = false): { L: string; R: string; rel: Rel } {
  const s = src
    .replace(/<=|=</g, '≤')
    .replace(/>=|=>/g, '≥')
    .replace(/≦/g, '≤')
    .replace(/≧/g, '≥')
  const m = [...s.matchAll(/[=<>≤≥]/g)]
  if (!m.length) {
    if (allowNone && s.trim()) return { L: s.trim(), R: '0', rel: '=' }
    throw new CalcError('Es fehlt das Gleichheitszeichen (oder <, >, ≤, ≥).')
  }
  if (m.length > 1) throw new CalcError('Bitte nur ein Gleichheits- bzw. Ungleichheitszeichen verwenden.')
  const i = m[0].index!
  const L = s.slice(0, i).trim()
  const R = s.slice(i + 1).trim()
  if (!L || !R) throw new CalcError('Auf beiden Seiten des Zeichens muss etwas stehen.')
  return { L, R, rel: m[0][0] as Rel }
}

/** Welche Variable wird gesucht? x vor y vor z …, sonst die erste. */
export function defaultVar(vars: string[]) {
  for (const v of ['x', 'y', 'z', 't', 'n', 'a']) if (vars.includes(v)) return v
  return vars[0]
}

const eqTex = (L: string, rel: Rel, R: string) => `${L} ${REL_TEX[rel]} ${R}`

function opTerms(ts: Term[], f: Fmt) {
  const s = sumTex(negTerms(ts), f)
  return '| ' + (s.startsWith('-') ? s : '+' + s)
}

/** Zeile anhängen – oder die Umformung an die letzte Zeile hängen, wenn dort dieselbe Gleichung steht */
function pushLine(steps: Step[], s: Step) {
  const last = steps[steps.length - 1]
  if (last && last.tex === s.tex && !last.op) {
    last.op = s.op
    if (s.note) last.note = last.note ? `${last.note} ${s.note}` : s.note
    if (s.head && !last.head) last.head = s.head
    return
  }
  steps.push(s)
}

/** sortieren; steht kein x auf der Seite, kommt ein positiver Summand nach vorn (c − b statt −b + c) */
export function sideSort(ts: Term[], v: string) {
  const s = sortTerms(combine(ts), v)
  if (s.length > 1 && sign(s[0].c) < 0 && !s.some((t) => t.m[v])) {
    const i = s.findIndex((t) => sign(t.c) > 0)
    if (i > 0) return [s[i], ...s.slice(0, i), ...s.slice(i + 1)]
  }
  return s
}
const isV = (t: Term, v: string) => (t.m[v] ?? 0) === 1
const without = (t: Term, v: string): Term => ({ c: t.c, m: Object.fromEntries(Object.entries(t.m).filter(([k]) => k !== v)) })
const allConst = (ts: Term[]) => ts.every(isConst)
const constVal = (ts: Term[]) => ts.reduce((s, t) => add(s, t.c), ZERO)

export interface EqResult extends Solution {
  variable: string
  vars: string[]
  rel: Rel
  /** reelle Lösungen (für Graphen) */
  roots: number[]
  /** quadratische Gleichung a x² + b x + c = 0 (vor dem Normieren), falls vorhanden */
  quad?: { a: Q; b: Q; c: Q }
  /** Gleichung hängt nur von x ab (keine Parameter) */
  numeric: boolean
}

interface SolveCtx {
  steps: Step[]
  f: Fmt
  v: string
  Lw: W
  Rw: W
  noProbe?: boolean
}

/* ---------------------------- Wurzeln exakt darstellen ---------------------------- */

/** √D als TeX (teilweise radiziert) oder null, wenn D eine Quadratzahl ist */
export function sqrtTex(D: Q): { exact: Q | null; tex: string } {
  const r = qRoot(D, 2)
  if (r) return { exact: r, tex: qTex(r) }
  // √(n/d) = √(n·d)/d
  const { f, r: rad } = splitSqrt(D.n * D.d)
  const coef = q(f, D.d)
  const root = `\\sqrt{${rad}}`
  if (isOne(coef)) return { exact: null, tex: root }
  if (coef.d === 1n) return { exact: null, tex: `${coef.n}${root}` }
  return { exact: null, tex: `\\frac{${coef.n === 1n ? '' : coef.n}${root}}{${coef.d}}` }
}

/* ---------------------------- linear ---------------------------- */

function solveLinear(Lt: Term[], Rt: Term[], rel: Rel, cx: SolveCtx): { value: Term[]; rel: Rel; valueTex: string; numeric: boolean } {
  const { steps, f, v } = cx
  let L = combine(Lt)
  let R = combine(Rt)
  let r = rel
  let headDone = false
  const line = (op?: string, note?: string, head?: string) => {
    pushLine(steps, { tex: eqTex(sumTex(L, f), r, sumTex(R, f)), op, note, head: headDone ? undefined : head })
    headDone = true
  }
  const Lx = L.filter((t) => isV(t, v))
  const Rx = R.filter((t) => isV(t, v))
  const numericCoef = [...Lx, ...Rx].every((t) => Object.keys(t.m).length === 1)
  const k0 = numericCoef ? sub(constVal(Lx.map((t) => without(t, v))), constVal(Rx.map((t) => without(t, v)))) : ONE
  // Gleichung: x dorthin, wo die Zahl davor positiv bleibt. Ungleichung: immer nach links.
  const xLeft = rel !== '=' || !numericCoef || sign(k0) > 0 || (Lx.length > 0 && !Rx.length)
  const vt = `$${varTex(v)}$`
  if (xLeft) {
    if (Rx.length) {
      line(opTerms(Rx, f), `Alle Terme mit ${vt} auf die linke Seite bringen.`, 'Nach ' + v + ' auflösen')
      L = sideSort([...L, ...negTerms(Rx)], v)
      R = sideSort(R.filter((t) => !isV(t, v)), v)
    }
    const Lc = L.filter((t) => !isV(t, v))
    if (Lc.length) {
      line(opTerms(Lc, f), `Alles ohne ${vt} auf die rechte Seite bringen.`, 'Nach ' + v + ' auflösen')
      R = sideSort([...R, ...negTerms(Lc)], v)
      L = sideSort(L.filter((t) => isV(t, v)), v)
    }
  } else {
    if (Lx.length) {
      line(opTerms(Lx, f), `Die Terme mit ${vt} nach rechts bringen – so bleibt die Zahl vor ${vt} positiv.`, 'Nach ' + v + ' auflösen')
      R = sideSort([...R, ...negTerms(Lx)], v)
      L = sideSort(L.filter((t) => !isV(t, v)), v)
    }
    const Rc = R.filter((t) => !isV(t, v))
    if (Rc.length) {
      line(opTerms(Rc, f), `Alles ohne ${vt} auf die linke Seite bringen.`, 'Nach ' + v + ' auflösen')
      L = sideSort([...L, ...negTerms(Rc)], v)
      R = sideSort(R.filter((t) => isV(t, v)), v)
    }
  }
  const xSide = xLeft ? L : R
  const other = xLeft ? R : L
  const K = sortTerms(combine(xSide.map((t) => without(t, v))))
  if (!K.length) throw new CalcError('internal: Koeffizient 0')
  const otherTex = () => sumTex(other, f)
  const show = (xTex: string) => (xLeft ? eqTex(xTex, r, otherTex()) : eqTex(otherTex(), r, xTex))
  if (K.length > 1) {
    pushLine(steps, { tex: show(`\\left(${sumTex(K, f)}\\right)${varTex(v)}`), note: `${vt} ausklammern.` })
  }
  const numeric = allConst(K) && allConst(other)
  let value: Term[] = other
  let valueTex = otherTex()
  if (!(K.length === 1 && isOne(K[0].c) && isConst(K[0]))) {
    const kTex = K.length === 1 ? termTex(K[0], true, f) : sumTex(K, f)
    const divTex = K.length === 1 ? (sign(K[0].c) < 0 ? `\\left(${kTex}\\right)` : kTex) : `\\left(${kTex}\\right)`
    const kNum = K.length === 1 && isConst(K[0]) ? K[0].c : null
    const flip = r !== '=' && kNum !== null && sign(kNum) < 0
    const params = !allConst(K)
    let note = flip ? '**Achtung:** Beim Teilen durch eine negative Zahl dreht sich das Zeichen um!' : `Durch $${kTex}$ teilen.`
    if (params) note += ` Das geht nur, wenn $${kTex} \\neq 0$ ist.`
    pushLine(steps, { tex: show(K.length > 1 ? `\\left(${sumTex(K, f)}\\right)${varTex(v)}` : sumTex(xSide, f)), op: `| :${divTex}`, note })
    if (flip) r = FLIP[r]
    if (kNum) {
      value = other.map((t) => ({ c: div(t.c, kNum), m: t.m }))
      valueTex = sumTex(value, f)
    } else if (K.length === 1) {
      value = other.map((t) => ({ c: div(t.c, K[0].c), m: Object.fromEntries([...Object.entries(t.m), ...Object.entries(K[0].m).map(([k, e]) => [k, (t.m[k] ?? 0) - e])].filter(([, e]) => e)) }))
      // als Bruch mit Variablen im Nenner zeigen
      valueTex = other.length === 1 ? termTex(value[0], true, f) : `\\frac{${otherTex()}}{${termAbsTex({ c: sign(K[0].c) < 0 ? neg(K[0].c) : K[0].c, m: K[0].m }, f)}}`
      if (other.length > 1 && sign(K[0].c) < 0) valueTex = `-${valueTex}`
    } else {
      value = []
      valueTex = `\\frac{${otherTex()}}{${sumTex(K, f)}}`
    }
    if (!other.length) valueTex = '0'
  }
  const vTex = varTex(v)
  if (xLeft) pushLine(steps, { tex: eqTex(vTex, r, valueTex) })
  else {
    pushLine(steps, { tex: eqTex(valueTex, r, vTex) })
    pushLine(steps, { tex: eqTex(vTex, FLIP[r], valueTex), note: 'Seiten tauschen.' })
    r = FLIP[r]
  }
  return { value, rel: r, valueTex, numeric }
}

/* ---------------------------- Probe ---------------------------- */

function probe(cx: SolveCtx, val: Q, label = '') {
  const { steps, f, v, Lw, Rw } = cx
  if (steps.length < 2 || cx.noProbe) return
  const env = { [v]: val }
  let lv: Q
  let rv: Q
  try {
    lv = wEval(Lw, env)
    rv = wEval(Rw, env)
  } catch {
    return
  }
  const side = (w: W, x: Q, name: string) => {
    const s = wTex(substitute(w, env), f)
    const xs = qTex(x, f)
    return `\\text{${name}: } ${s === xs ? xs : `${s} = ${xs}`}`
  }
  steps.push({ tex: side(Lw, lv, 'links'), head: `Probe${label}`, note: `$${varTex(v)} = ${qTex(val, f)}$ in die Ausgangsgleichung einsetzen.` })
  steps.push({ tex: side(Rw, rv, 'rechts') })
  steps.push({
    tex: qeq(lv, rv) ? `${qTex(lv, f)} = ${qTex(rv, f)}\\ \\checkmark` : `${qTex(lv, f)} \\neq ${qTex(rv, f)}`,
    note: qeq(lv, rv) ? 'Beide Seiten sind gleich – die Lösung stimmt.' : 'Die Seiten sind verschieden – diese Zahl ist keine Lösung.',
  })
}

/* ---------------------------- quadratisch ---------------------------- */

interface QuadOut {
  roots: Q[]
  irr?: { h: Q; D: Q }
}

function solveQuadratic(P: Term[], cx: SolveCtx, off = 0): QuadOut {
  const { steps, f, v } = cx
  const vt = varTex(v)
  const x1 = `${vt}_{${off + 1}}`
  const x2l = `${vt}_{${off + 2}}`
  const x12 = `${vt}_{${off + 1},${off + 2}}`
  const coef = (k: number) => P.filter((t) => (t.m[v] ?? 0) === k).reduce((s, t) => add(s, t.c), ZERO)
  const a = coef(2)
  const b = coef(1)
  const c = coef(0)
  const poly = (A: Q, B: Q, C: Q) => sumTex([{ c: A, m: { [v]: 2 } }, { c: B, m: { [v]: 1 } }, { c: C, m: {} }].filter((t) => !isZero(t.c)), f)
  const eq0 = (A: Q, B: Q, C: Q) => `${poly(A, B, C)} = 0`

  if (isZero(b) && isZero(c)) {
    pushLine(steps, { tex: eq0(a, b, c), op: isOne(a) ? undefined : `| :${qTexPar(a, f)}` })
    steps.push({ tex: `${vt}^{2} = 0`, note: 'Nur die Null hat das Quadrat 0.' })
    steps.push({ tex: `${vt} = 0` })
    return { roots: [ZERO] }
  }
  if (isZero(b)) {
    // rein quadratisch: a x² + c = 0
    pushLine(steps, { tex: eq0(a, b, c), op: opTerms([numTerm(c)], f), note: 'Rein quadratisch (ohne $' + vt + '$-Glied): nach $' + vt + '^2$ auflösen.', head: 'Nach ' + v + '² auflösen' })
    let rhs = neg(c)
    if (!isOne(a)) {
      steps.push({ tex: `${termTex({ c: a, m: { [v]: 2 } }, true, f)} = ${qTex(rhs, f)}`, op: `| :${qTexPar(a, f)}` })
      rhs = div(rhs, a)
    }
    if (sign(rhs) < 0) {
      steps.push({ tex: `${vt}^{2} = ${qTex(rhs, f)}`, note: 'Ein Quadrat ist nie negativ – es gibt **keine Lösung**.' })
      return { roots: [] }
    }
    steps.push({ tex: `${vt}^{2} = ${qTex(rhs, f)}`, op: '| \\sqrt{\\;}', note: 'Wurzel ziehen – dabei gibt es zwei Lösungen: die positive und die negative Wurzel.' })
    const s = sqrtTex(rhs)
    if (s.exact) {
      steps.push({ tex: `${x12} = \\pm ${qTex(s.exact, f)}` })
      return { roots: [s.exact, neg(s.exact)] }
    }
    const plain = `\\sqrt{${qTex(rhs, f)}}`
    steps.push({ tex: `${x12} = \\pm ${plain}${s.tex === plain ? '' : ` = \\pm ${s.tex}`} \\approx \\pm ${approxTex(Math.sqrt(toNum(rhs)))}` })
    return { roots: [], irr: { h: ZERO, D: rhs } }
  }
  if (isZero(c)) {
    // a x² + b x = 0 → x (a x + b) = 0
    pushLine(steps, { tex: eq0(a, b, c), note: `Es gibt keine Zahl ohne $${vt}$ – also $${vt}$ ausklammern.`, head: v + ' ausklammern' })
    const inner = sumTex([{ c: a, m: { [v]: 1 } }, { c: b, m: {} }], f)
    steps.push({ tex: `${vt}\\left(${inner}\\right) = 0`, note: 'Satz vom Nullprodukt: Ein Produkt ist 0, wenn einer der Faktoren 0 ist.' })
    const xb = div(neg(b), a)
    steps.push({ tex: `${x1} = 0 \\quad \\text{oder} \\quad ${inner} = 0`, op: `| ${opTerms([numTerm(b)], f).slice(2)}` })
    if (!isOne(a)) steps.push({ tex: `${termTex({ c: a, m: { [v]: 1 } }, true, f)} = ${qTex(neg(b), f)}`, op: `| :${qTexPar(a, f)}` })
    steps.push({ tex: `${x2l} = ${qTex(xb, f)}` })
    return { roots: [ZERO, xb] }
  }
  // allgemeiner Fall: p-q-Formel
  if (!isOne(a)) {
    pushLine(steps, {
      tex: eq0(a, b, c),
      op: `| :${qTexPar(a, f)}`,
      note: `Normalform herstellen: Vor $${vt}^2$ muss eine 1 stehen – also **durch** $${qTex(a, f)}$ teilen.`,
      head: 'Normalform',
    })
  }
  const p = div(b, a)
  const qq = div(c, a)
  pushLine(steps, {
    tex: eq0(ONE, p, qq),
    note: `Normalform $${vt}^2 + p${vt} + q = 0$: hier ist $p = ${qTex(p, f)}$ und $q = ${qTex(qq, f)}$ (Vorzeichen mitnehmen!).`,
    head: isOne(a) ? 'Normalform' : undefined,
  })
  steps.push({ tex: `${x12} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}`, note: 'p-q-Formel', head: 'p-q-Formel' })
  steps.push({
    tex: `${x12} = -\\frac{${qTexPar(p, f)}}{2} \\pm \\sqrt{\\left(\\frac{${qTexPar(p, f)}}{2}\\right)^2 - ${qTexPar(qq, f)}}`,
    note: '$p$ und $q$ einsetzen.',
  })
  const h = div(p, q(2))
  const h2 = mul(h, h)
  const D = sub(h2, qq)
  steps.push({
    tex: `${x12} = ${qTex(neg(h), f)} \\pm \\sqrt{${qTex(h2, f)} ${sign(qq) < 0 ? '+' : '-'} ${qTex(qabs(qq), f)}}`,
    note: `$\\frac{p}{2} = ${qTex(h, f)}$, quadriert: $${qTex(h2, f)}$.`,
  })
  const head = isZero(h) ? '' : `${qTex(neg(h), f)} `
  const sD = sqrtTex(D)
  const dLine: Step = { tex: `${x12} = ${head}\\pm \\sqrt{${qTex(D, f)}}`, note: `Unter der Wurzel steht die Diskriminante $D = ${qTex(D, f)}$.` }
  steps.push(dLine)
  if (sign(D) < 0) {
    steps.push({ tex: '\\mathbb{L} = \\{\\,\\}', note: '$D < 0$: Aus einer negativen Zahl kann man keine Wurzel ziehen – es gibt **keine reelle Lösung**.' })
    return { roots: [] }
  }
  if (isZero(D)) {
    steps.push({ tex: `${vt} = ${qTex(neg(h), f)}`, note: '$D = 0$: Es gibt genau eine (doppelte) Lösung.' })
    return { roots: [neg(h)] }
  }
  if (sD.exact) {
    steps.push({ tex: `${x12} = ${head}\\pm ${qTex(sD.exact, f)}`, note: `$\\sqrt{${qTex(D, f)}} = ${qTex(sD.exact, f)}$` })
    const r1 = add(neg(h), sD.exact)
    const r2 = sub(neg(h), sD.exact)
    steps.push({ tex: `${x1} = ${qTex(neg(h), f)} + ${qTex(sD.exact, f)} = ${qTex(r1, f)}, \\quad ${x2l} = ${qTex(neg(h), f)} - ${qTex(sD.exact, f)} = ${qTex(r2, f)}` })
    return { roots: [r1, r2] }
  }
  const root = Math.sqrt(toNum(D))
  const hn = toNum(neg(h))
  const approxNote = `$\\sqrt{${qTex(D, f)}}$ geht nicht glatt auf: $\\sqrt{${qTex(D, f)}} \\approx ${approxTex(root)}$.`
  if (sD.tex === `\\sqrt{${qTex(D, f)}}`) dLine.note += ' ' + approxNote
  else steps.push({ tex: `${x12} = ${head}\\pm ${sD.tex}`, note: `Teilweise Wurzel ziehen. ${approxNote}` })
  steps.push({ tex: `${x1} \\approx ${approxTex(hn + root)}, \\quad ${x2l} \\approx ${approxTex(hn - root)}` })
  return { roots: [], irr: { h, D } }
}

/** rein quadratisch: a x² + c = d → x² = … → ±√ */
function solvePure(A0: Term[], B0: Term[], cx: SolveCtx): QuadOut {
  const { steps, f, v } = cx
  const vt = varTex(v)
  let A = A0
  let B = B0
  const line = (op?: string, note?: string, head?: string) => pushLine(steps, { tex: eqTex(sumTex(A, f), '=', sumTex(B, f)), op, note, head })
  const Rx = B.filter((t) => t.m[v])
  let head: string | undefined = 'Nach ' + v + '² auflösen'
  if (Rx.length) {
    line(opTerms(Rx, f), `Alle Terme mit $${vt}^2$ auf die linke Seite.`, head)
    head = undefined
    A = sideSort([...A, ...negTerms(Rx)], v)
    B = sideSort(B.filter((t) => !t.m[v]), v)
  }
  const Lc = A.filter((t) => !t.m[v])
  if (Lc.length) {
    line(opTerms(Lc, f), 'Die Zahlen auf die rechte Seite.', head)
    head = undefined
    B = sideSort([...B, ...negTerms(Lc)], v)
    A = A.filter((t) => t.m[v])
  }
  const a = A.reduce((s, t) => add(s, t.c), ZERO)
  let rhs = B.reduce((s, t) => add(s, t.c), ZERO)
  if (!isOne(a)) {
    line(`| :${qTexPar(a, f)}`, undefined, head)
    rhs = div(rhs, a)
  }
  if (sign(rhs) < 0) {
    steps.push({ tex: `${vt}^{2} = ${qTex(rhs, f)}`, note: 'Ein Quadrat ist nie negativ – es gibt **keine Lösung**.' })
    return { roots: [] }
  }
  if (isZero(rhs)) {
    steps.push({ tex: `${vt}^{2} = 0` })
    steps.push({ tex: `${vt} = 0`, note: 'Nur die Null hat das Quadrat 0.' })
    return { roots: [ZERO] }
  }
  steps.push({ tex: `${vt}^{2} = ${qTex(rhs, f)}`, op: '| \\sqrt{\\;}', note: 'Wurzel ziehen – es gibt zwei Lösungen: die positive und die negative Wurzel.' })
  const s = sqrtTex(rhs)
  if (s.exact) {
    steps.push({ tex: `${vt}_{1,2} = \\pm ${qTex(s.exact, f)}` })
    return { roots: [s.exact, neg(s.exact)] }
  }
  const plain = `\\sqrt{${qTex(rhs, f)}}`
  steps.push({ tex: `${vt}_{1,2} = \\pm ${plain}${s.tex === plain ? '' : ` = \\pm ${s.tex}`} \\approx \\pm ${approxTex(Math.sqrt(toNum(rhs)))}` })
  return { roots: [], irr: { h: ZERO, D: rhs } }
}

function quadOf(D: Term[]) {
  const c = (k: number) => D.filter((t) => (Object.values(t.m)[0] ?? 0) === k).reduce((s, t) => add(s, t.c), ZERO)
  return { a: c(2), b: c(1), c: c(0) }
}

/* ---------------------------- Hauptfunktion ---------------------------- */

export function solveEquation(src: string, opts: { variable?: string; allowNoRel?: boolean } = {}): EqResult {
  const { L, R, rel } = splitRelation(src, opts.allowNoRel)
  const hint = { rootHint: ' Wurzeln kann der Gleichungslöser nicht umformen – versuche „Formeln umstellen“.' }
  const pL = parseW(L, hint)
  const pR = parseW(R, hint)
  const f: Fmt = { dec: pL.dec || pR.dec }
  const vars = [...new Set([...pL.vars, ...pR.vars])].filter((x) => x !== 'π')
  if (!vars.length) throw new CalcError('In der Gleichung kommt keine Variable vor.')
  const v = opts.variable && vars.includes(opts.variable) ? opts.variable : defaultVar(vars)
  return solveTrees(pL.w, pR.w, rel, f, { variable: v, vars })
}

export interface TreeOpts {
  variable: string
  vars?: string[]
  /** Probe anhängen (Standard: ja) */
  probe?: boolean
  /** Zwischenüberschriften (Standard: ja) */
  heads?: boolean
  /** Bruch-Hauptnenner nicht beseitigen */
  keepFractions?: boolean
}

/** Gleichung aus fertigen Bäumen lösen (für Gleichungssysteme, Geraden …) */
export function solveTrees(Lw: W, Rw: W, rel: Rel, f: Fmt, o: TreeOpts): EqResult {
  const v = o.variable
  const vars = o.vars ?? [v]
  const vt = varTex(v)
  const steps: Step[] = []
  const cx: SolveCtx = { steps, f, v, Lw, Rw, noProbe: o.probe === false }
  const pL = { w: Lw }
  const pR = { w: Rw }
  steps.push({ tex: eqTex(wTex(pL.w, f), rel, wTex(pR.w, f)) })

  // 1. Klammern auflösen, auf beiden Seiten gleichzeitig
  const rl = rounds(pL.w, f)
  const rr = rounds(pR.w, f)
  const n = Math.max(rl.length, rr.length)
  for (let i = 0; i < n; i++) {
    const li = rl[Math.min(i, rl.length - 1)]?.w ?? pL.w
    const ri = rr[Math.min(i, rr.length - 1)]?.w ?? pR.w
    const note = [rl[i]?.note, rr[i]?.note].filter(Boolean)
    steps.push({ tex: eqTex(wTex(li, f), rel, wTex(ri, f)), note: [...new Set(note)].join(' ') || undefined, head: i === 0 ? 'Klammern auflösen' : undefined })
  }
  let Lt = (rl.length ? rl[rl.length - 1].w : pL.w) as Extract<W, { t: 'terms' }>
  let Rt = (rr.length ? rr[rr.length - 1].w : pR.w) as Extract<W, { t: 'terms' }>
  // 2. Jede Seite zusammenfassen
  const fl = finishStages(Lt.ts, f, v, { sortStage: false })
  const fr = finishStages(Rt.ts, f, v, { sortStage: false })
  const m = Math.max(fl.stages.length, fr.stages.length)
  for (let i = 0; i < m; i++) {
    const a = fl.stages[Math.min(i, fl.stages.length - 1)]?.tex ?? sumTex(Lt.ts, f)
    const b = fr.stages[Math.min(i, fr.stages.length - 1)]?.tex ?? sumTex(Rt.ts, f)
    const note = fl.stages[i]?.note ?? fr.stages[i]?.note
    steps.push({ tex: eqTex(a, rel, b), note, head: i === 0 ? 'Jede Seite zusammenfassen' : undefined })
  }
  // Reihenfolge wie geschrieben behalten (nur zusammengefasst), sortiert wird erst beim Umstellen
  let A = fl.stages.length ? fl.result : combine(Lt.ts)
  let B = fr.stages.length ? fr.result : combine(Rt.ts)
  Lt = wTerms(A) as typeof Lt
  Rt = wTerms(B) as typeof Rt

  // 3. Brüche bzw. x im Nenner beseitigen
  const all = [...A, ...B]
  const negExp = Math.max(0, ...all.map((t) => -(t.m[v] ?? 0)))
  const hn = f.dec || o.keepFractions ? 1n : all.reduce((l, t) => blcm(l, t.c.d), 1n)
  if (hn > 1n || negExp > 0) {
    const factor: Term = { c: q(hn), m: negExp ? { [v]: negExp } : {} }
    const fTex = termAbsTex(factor, f)
    const note =
      (hn > 1n ? `Mit dem Hauptnenner $${hn}$ multiplizieren – dann verschwinden die Brüche.` : '') +
      (negExp ? ` $${vt}$ steht im Nenner: mit $${negExp === 1 ? vt : `${vt}^{${negExp}}`}$ multiplizieren (dabei muss $${vt} \\neq 0$ sein).` : '')
    pushLine(steps, { tex: eqTex(sumTex(A, f), rel, sumTex(B, f)), op: `| \\cdot ${fTex}`, note: note.trim(), head: 'Brüche beseitigen' })
    const mulT = (t: Term): Term => ({ c: mul(t.c, factor.c), m: Object.fromEntries(Object.entries({ ...t.m, ...Object.fromEntries(Object.entries(factor.m).map(([k, e]) => [k, (t.m[k] ?? 0) + e])) }).filter(([, e]) => e)) })
    A = sideSort(A.map(mulT), v)
    B = sideSort(B.map(mulT), v)
    steps.push({ tex: eqTex(sumTex(A, f), rel, sumTex(B, f)) })
  }

  const D = combine([...A, ...negTerms(B)])
  const deg = degIn(D, v)
  const others = [...new Set(D.flatMap((t) => Object.keys(t.m)))].filter((k) => k !== v)
  const numeric = others.length === 0 && D.every((t) => Object.keys(t.m).every((k) => k === v))

  const finish = (result: string, roots: number[], extra?: string[], quad?: EqResult['quad'], remark?: string): EqResult => {
    const last = steps[steps.length - 1]
    if (last) last.final = true
    if (o.heads === false) steps.forEach((x) => delete x.head)
    return { result, steps, extra, variable: v, vars, rel, roots, quad, numeric: numeric && others.length === 0, remark }
  }

  // x fällt weg
  if (deg === 0 && !D.some((t) => t.m[v])) {
    const Lx = A.filter((t) => t.m[v])
    if (Lx.length) {
      pushLine(steps, { tex: eqTex(sumTex(A, f), rel, sumTex(B, f)), op: opTerms(B.filter((t) => t.m[v]), f), note: `Alle Terme mit $${vt}$ auf eine Seite bringen.` })
    }
    const restL = A.filter((t) => !t.m[v])
    const restR = B.filter((t) => !t.m[v])
    const lTex = sumTex(restL, f)
    const rTex = sumTex(restR, f)
    steps.push({ tex: eqTex(lTex, rel, rTex), note: `$${vt}$ ist weggefallen.` })
    if (others.length) {
      return finish(eqTex(lTex, rel, rTex), [], undefined, undefined, `Die Gleichung hängt nicht von $${vt}$ ab.`)
    }
    const lv = constVal(restL)
    const rv = constVal(restR)
    const c = cmp(lv, rv)
    const ok = rel === '=' ? c === 0 : rel === '<' ? c < 0 : rel === '>' ? c > 0 : rel === '≤' ? c <= 0 : c >= 0
    steps.push({
      tex: ok ? '\\mathbb{L} = \\mathbb{R}' : '\\mathbb{L} = \\{\\,\\}',
      note: ok ? 'Wahre Aussage – **jede** Zahl ist eine Lösung.' : 'Falsche Aussage – es gibt **keine** Lösung.',
    })
    return finish(ok ? '\\mathbb{L} = \\mathbb{R}' : '\\mathbb{L} = \\{\\,\\}', [], [ok ? 'Allgemeingültig: jede Zahl erfüllt die Gleichung.' : 'Widerspruch: keine Zahl erfüllt die Gleichung.'])
  }

  if (deg === 1) {
    const s = solveLinear(A, B, rel, cx)
    const isNum = s.numeric && numeric
    if (rel === '=') {
      if (isNum) {
        const val = constVal(s.value)
        if (negExp && isZero(val)) {
          steps.push({ tex: '\\mathbb{L} = \\{\\,\\}', note: `$${vt} = 0$ ist verboten (Division durch 0).` })
          return finish('\\mathbb{L} = \\{\\,\\}', [])
        }
        probe(cx, val)
        const extra = !isTerminating(val) || (val.d !== 1n && !f.dec) ? [`${vt} \\approx ${approxTex(toNum(val))}`] : undefined
        return finish(`${vt} = ${qTex(val, f)}`, [toNum(val)], extra)
      }
      return finish(`${vt} = ${s.valueTex}`, [])
    }
    // Ungleichung
    const res = `${vt} ${REL_TEX[s.rel]} ${s.valueTex}`
    const extra: string[] = []
    if (isNum) {
      const val = constVal(s.value)
      const vTex = qTex(val, f)
      const open = s.rel === '<' || s.rel === '>'
      const iv = s.rel === '<' || s.rel === '≤' ? `\\left]-\\infty;\\ ${vTex}\\right${open ? '[' : ']'}` : `\\left${open ? ']' : '['}${vTex};\\ \\infty\\right[`
      steps.push({ tex: `\\mathbb{L} = \\{${vt} \\mid ${res}\\} = ${iv}`, note: 'Lösungsmenge als Intervall (eckige Klammer nach außen = Zahl gehört nicht dazu).' })
      extra.push(`\\mathbb{L} = ${iv}`)
    }
    return finish(res, [], extra)
  }

  if (!numeric) throw new CalcError(`Mit Parametern kann der Rechner nur lineare Gleichungen lösen (${vt} höchstens hoch 1).`)
  if (rel !== '=') throw new CalcError('Quadratische Ungleichungen kann der Rechner nicht lösen.')

  // rein quadratisch (kein x-Glied): direkt nach x² auflösen, ohne Umweg über die Nullform
  if (deg === 2 && !D.some((t) => t.m[v] === 1) && D.some((t) => !t.m[v])) {
    const out = solvePure(A, B, cx)
    const okR = out.roots
    okR.forEach((r, i) => probe(cx, r, okR.length > 1 ? ` für ${cx.v}${'₁₂₃₄'[i]}` : ''))
    if (out.irr) {
      const s2 = sqrtTex(out.irr.D)
      const rn = Math.sqrt(toNum(out.irr.D))
      steps.push({ tex: `\\mathbb{L} = \\{${s2.tex};\\ -${s2.tex}\\} \\approx \\{${approxTex(rn)};\\ ${approxTex(-rn)}\\}` })
      return finish(`${vt}_{1,2} = \\pm ${s2.tex}`, [rn, -rn], [`${vt}_1 \\approx ${approxTex(rn)}, \\quad ${vt}_2 \\approx ${approxTex(-rn)}`], quadOf(D))
    }
    if (!okR.length) {
      steps.push({ tex: '\\mathbb{L} = \\{\\,\\}' })
      return finish('\\mathbb{L} = \\{\\,\\}', [], ['keine reelle Lösung'], quadOf(D))
    }
    steps.push({ tex: `\\mathbb{L} = \\{${okR.map((r) => qTex(r, f)).join(';\\ ')}\\}` })
    const ex = okR.some((r) => !isTerminating(r) || (r.d !== 1n && !f.dec)) ? [okR.map((r, i) => `${vt}_${i + 1} \\approx ${approxTex(toNum(r))}`).join(',\\quad ')] : undefined
    return finish(okR.map((r, i) => `${vt}_${i + 1} = ${qTex(r, f)}`).join(',\\quad '), okR.map(toNum), ex, quadOf(D))
  }

  // alles nach links
  if (B.length) {
    pushLine(steps, { tex: eqTex(sumTex(A, f), rel, sumTex(B, f)), op: opTerms(B, f), note: 'Alles auf eine Seite bringen – rechts soll 0 stehen.', head: 'Nullform' })
  }
  let P = sideSort(D, v)
  const lowest = Math.min(...P.map((t) => t.m[v] ?? 0))
  const extraRoots: Q[] = []
  if (deg > 2) {
    if (lowest < 1 || deg - lowest > 2) throw new CalcError(`Gleichungen ${deg}. Grades kann der Rechner nur lösen, wenn sich $${vt}$ so ausklammern lässt, dass höchstens $${vt}^2$ übrig bleibt.`)
    pushLine(steps, { tex: `${sumTex(P, f)} = 0`, note: `$${vt}$ ausklammern.`, head: v + ' ausklammern' })
    const inner = P.map((t) => ({ c: t.c, m: { ...t.m, [v]: (t.m[v] ?? 0) - lowest } })).map((t) => ({ c: t.c, m: t.m[v] ? t.m : {} }))
    const xl = lowest === 1 ? vt : `${vt}^{${lowest}}`
    steps.push({ tex: `${xl}\\left(${sumTex(inner, f)}\\right) = 0`, note: 'Satz vom Nullprodukt: Ein Produkt ist 0, wenn ein Faktor 0 ist.' })
    steps.push({ tex: `${lowest === 1 ? `${vt}_1 = 0` : `${xl} = 0 \\;\\Rightarrow\\; ${vt}_1 = 0`} \\quad \\text{oder} \\quad ${sumTex(inner, f)} = 0` })
    extraRoots.push(ZERO)
    P = inner
  }
  const qa = P.filter((t) => (t.m[v] ?? 0) === 2).reduce((s, t) => add(s, t.c), ZERO)
  const qb = P.filter((t) => (t.m[v] ?? 0) === 1).reduce((s, t) => add(s, t.c), ZERO)
  const qc = P.filter((t) => !t.m[v]).reduce((s, t) => add(s, t.c), ZERO)
  let out: QuadOut
  if (isZero(qa)) {
    // nach dem Ausklammern linear
    const lin = solveLinear(P, [], '=', cx)
    out = { roots: [constVal(lin.value)] }
  } else out = solveQuadratic(P, cx, extraRoots.length)
  const roots = [...extraRoots, ...out.roots].filter((r, i, arr) => arr.findIndex((x) => qeq(x, r)) === i)
  if (negExp) {
    const bad = roots.filter((r) => isZero(r))
    if (bad.length) steps.push({ tex: `${vt} = 0 \\text{ ist verboten}`, note: `$${vt}$ stand im Nenner – $0$ fällt als Lösung weg.` })
  }
  const okRoots = roots.filter((r) => !(negExp && isZero(r)))
  okRoots.forEach((r, i) => probe(cx, r, okRoots.length > 1 ? ` für ${cx.v}${'₁₂₃₄'[i]}` : ''))
  const all2 = [...okRoots.map(toNum)]
  let result: string
  const extra: string[] = []
  if (out.irr) {
    const s = sqrtTex(out.irr.D)
    const h = neg(out.irr.h)
    const headT = isZero(h) ? '' : `${qTex(h, f)} `
    const rNum = Math.sqrt(toNum(out.irr.D))
    const hn2 = toNum(h)
    const irrRoots = [hn2 + rNum, hn2 - rNum]
    all2.push(...irrRoots)
    const known = okRoots.map((r) => qTex(r, f))
    result = `${vt}_{1,2} = ${headT}\\pm ${s.tex}`
    if (known.length) result = `${vt} = ${known.join(';\\ ')} \\text{ oder } ` + result
    const o = known.length
    extra.push(`${vt}_{${o + 1}} \\approx ${approxTex(irrRoots[0])}, \\quad ${vt}_{${o + 2}} \\approx ${approxTex(irrRoots[1])}`)
    const ex1 = `${headT}${isZero(h) ? '' : '+ '}${s.tex}`
    const ex2 = `${headT}- ${s.tex}`
    steps.push({ tex: `\\mathbb{L} = \\{${[...known, ex1, ex2].join(';\\ ')}\\} \\approx \\{${[...known, ...irrRoots.map((x) => approxTex(x))].join(';\\ ')}\\}` })
  } else if (!okRoots.length) {
    result = '\\mathbb{L} = \\{\\,\\}'
    extra.push('keine reelle Lösung')
  } else {
    const parts = okRoots.map((r) => qTex(r, f))
    result = okRoots.length === 1 ? `${vt} = ${parts[0]}` : okRoots.map((r, i) => `${vt}_${i + 1} = ${qTex(r, f)}`).join(',\\quad ')
    steps.push({ tex: `\\mathbb{L} = \\{${parts.join(';\\ ')}\\}` })
    const approx = okRoots.filter((r) => !isTerminating(r) || (r.d !== 1n && !f.dec))
    if (approx.length) extra.push(okRoots.map((r, i) => `${vt}${okRoots.length > 1 ? `_${i + 1}` : ''} \\approx ${approxTex(toNum(r))}`).join(',\\quad '))
  }
  return finish(result, all2, extra, { a: qa, b: qb, c: qc })
}

export { sqrtTex as sqrtTexQ }

/** Vorschau einer Gleichung bzw. Ungleichung für das Eingabefeld */
export function equationPreview(src: string, allowNoRel = false): { tex?: string; error?: string } {
  try {
    const { L, R, rel } = splitRelation(src, allowNoRel)
    const a = tryParse(L)
    const b = tryParse(R)
    if (a.error || b.error) return { error: a.error ?? b.error }
    return { tex: `${toTex(a.node!)} ${REL_TEX[rel]} ${toTex(b.node!)}` }
  } catch (e) {
    const r = tryParse(src.replace(/[=<>≤≥]/g, ''))
    if (r.node && !/[=<>≤≥]/.test(src)) return { tex: toTex(r.node), error: undefined }
    return { error: e instanceof Error ? e.message : 'Eingabe nicht lesbar' }
  }
}
