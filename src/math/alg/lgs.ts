/**
 * Lineare Gleichungssysteme mit zwei Unbekannten:
 * Additions-, Einsetzungs- und Gleichsetzungsverfahren – plus Sonderfälle und Probe.
 */
import { add, blcm, CalcError, div, isOne, isZero, mul, neg, ONE, q, qabs, qTex, qTexPar, sign, sub, toNum, ZERO, eq as qeq, type Fmt, type Q } from '../q'
import { sideSort, solveTrees, splitRelation } from './equation'
import { combine, sumTex, termAbsTex, termTex, varTex, type Term } from './poly'
import { finishStages, rounds } from './simplify'
import type { Solution, Step } from './step'
import { grp, mkSum, parseW, substitute, terms, wEval, wTex, type W } from './tree'

export type LgsMethod = 'addition' | 'einsetzung' | 'gleichsetzung'

interface Lin {
  a: Q
  b: Q
  c: Q
}

export interface LgsResult extends Solution {
  vars: [string, string]
  kind: 'eine' | 'keine' | 'unendlich'
  sol?: [Q, Q]
  lines: Lin[]
}

const LBL = ['\\text{I}', '\\text{II}']
const lab = (i: number, prime = '') => `${LBL[i]}${prime}\\colon\\ `
const absQ = (x: Q) => qabs(x)

function linTerms(e: Lin, [x, y]: [string, string]): Term[] {
  return [
    { c: e.a, m: { [x]: 1 } },
    { c: e.b, m: { [y]: 1 } },
  ].filter((t) => !isZero(t.c))
}

const linTex = (e: Lin, v: [string, string], f: Fmt) => `${linTerms(e, v).length ? sumTex(linTerms(e, v), f) : '0'} = ${qTex(e.c, f)}`

function opTerms(ts: Term[], f: Fmt) {
  const s = sumTex(
    ts.map((t) => ({ c: neg(t.c), m: t.m })),
    f,
  )
  return '| ' + (s.startsWith('-') ? s : '+' + s)
}

interface Parsed {
  L: W
  R: W
  vars: string[]
  dec: boolean
}

function parseEq(src: string, i: number): Parsed {
  if (!src.trim()) throw new CalcError(`Gleichung ${i === 0 ? 'I' : 'II'} fehlt.`)
  const { L, R, rel } = splitRelation(src)
  if (rel !== '=') throw new CalcError('Im Gleichungssystem bitte nur Gleichungen (=).')
  const pL = parseW(L, { rootHint: '' })
  const pR = parseW(R, { rootHint: '' })
  return { L: pL.w, R: pR.w, vars: [...new Set([...pL.vars, ...pR.vars])], dec: pL.dec || pR.dec }
}

/** Gleichung in die Form a·x + b·y = c bringen (mit Zwischenschritten) */
function normalize(p: Parsed, i: number, v: [string, string], f: Fmt, steps: Step[]): Lin {
  steps.push({ tex: lab(i) + `${wTex(p.L, f)} = ${wTex(p.R, f)}` })
  const rl = rounds(p.L, f)
  const rr = rounds(p.R, f)
  const n = Math.max(rl.length, rr.length)
  for (let k = 0; k < n; k++) {
    const li = rl[Math.min(k, rl.length - 1)]?.w ?? p.L
    const ri = rr[Math.min(k, rr.length - 1)]?.w ?? p.R
    steps.push({ tex: lab(i) + `${wTex(li, f)} = ${wTex(ri, f)}`, note: [rl[k]?.note, rr[k]?.note].filter(Boolean).join(' ') || undefined })
  }
  const lt = ((rl.length ? rl[rl.length - 1].w : p.L) as Extract<W, { t: 'terms' }>).ts
  const rt = ((rr.length ? rr[rr.length - 1].w : p.R) as Extract<W, { t: 'terms' }>).ts
  const fl = finishStages(lt, f)
  const fr = finishStages(rt, f)
  const m = Math.max(fl.stages.length, fr.stages.length)
  for (let k = 0; k < m; k++) {
    const a = fl.stages[Math.min(k, fl.stages.length - 1)]?.tex ?? sumTex(lt, f)
    const b = fr.stages[Math.min(k, fr.stages.length - 1)]?.tex ?? sumTex(rt, f)
    steps.push({ tex: lab(i) + `${a} = ${b}`, note: fl.stages[k]?.note ?? fr.stages[k]?.note })
  }
  let A = fl.result
  let B = fr.result
  for (const t of [...A, ...B]) {
    const ks = Object.keys(t.m)
    if (ks.length > 1 || (ks.length === 1 && t.m[ks[0]] !== 1)) throw new CalcError(`Gleichung ${i === 0 ? 'I' : 'II'} ist nicht linear (Variablen dürfen nur hoch 1 und nicht miteinander malgenommen vorkommen).`)
  }
  const isVar = (t: Term) => Object.keys(t.m).length > 0
  const line = (op?: string, note?: string) => {
    const last = steps[steps.length - 1]
    const tex = lab(i) + `${A.length ? sumTex(A, f) : '0'} = ${B.length ? sumTex(B, f) : '0'}`
    if (last.tex === tex && !last.op) {
      last.op = op
      if (note) last.note = (last.note ? last.note + ' ' : '') + note
    } else steps.push({ tex, op, note })
  }
  const Rv = B.filter(isVar)
  if (Rv.length) {
    line(opTerms(Rv, f), 'Ordnen: Variablen nach links.')
    A = combine([...A, ...Rv.map((t) => ({ c: neg(t.c), m: t.m }))])
    B = B.filter((t) => !isVar(t))
  }
  const Lc = A.filter((t) => !isVar(t))
  if (Lc.length) {
    line(opTerms(Lc, f), 'Ordnen: Zahlen nach rechts.')
    B = combine([...B, ...Lc.map((t) => ({ c: neg(t.c), m: t.m }))])
    A = A.filter(isVar)
  }
  const coef = (name: string) => A.filter((t) => t.m[name]).reduce((s, t) => add(s, t.c), ZERO)
  let e: Lin = { a: coef(v[0]), b: coef(v[1]), c: B.reduce((s, t) => add(s, t.c), ZERO) }
  // Brüche / Kommazahlen beseitigen
  const hn = [e.a, e.b, e.c].reduce((l, x) => blcm(l, x.d), 1n)
  if (hn > 1n) {
    const last = steps[steps.length - 1]
    const tex = lab(i) + linTex(e, v, f)
    const note = f.dec ? `Mit $${hn}$ malnehmen – dann gibt es keine Kommazahlen mehr.` : `Mit dem Hauptnenner $${hn}$ malnehmen – dann verschwinden die Brüche.`
    if (last.tex === tex && !last.op) {
      last.op = `| \\cdot ${hn}`
      last.note = (last.note ? last.note + ' ' : '') + note
    } else steps.push({ tex, op: `| \\cdot ${hn}`, note })
    const k = q(hn)
    e = { a: mul(e.a, k), b: mul(e.b, k), c: mul(e.c, k) }
  }
  const tex = lab(i) + linTex(e, v, f)
  if (steps[steps.length - 1].tex !== tex) steps.push({ tex })
  return e
}

/* ---------------------------- Hilfen ---------------------------- */

/** Gleichung a·x + b·y = c als Baum, mit eingesetztem Wert für eine Variable */
function substTree(e: Lin, v: [string, string], known: 0 | 1, val: Q): { L: W; R: W } {
  const ts: W[] = []
  const coefKnown = known === 0 ? e.a : e.b
  const coefOther = known === 0 ? e.b : e.a
  const other = v[1 - known]
  const valW = terms([{ c: val, m: {} }])
  const kn: W = isZero(coefKnown) ? terms([]) : isOne(coefKnown) ? (sign(val) < 0 ? grp(valW) : valW) : { t: 'prod', f: [terms([{ c: coefKnown, m: {} }]), sign(val) < 0 || val.d !== 1n ? grp(valW) : valW] }
  const ot: W = terms([{ c: coefOther, m: { [other]: 1 } }])
  // Reihenfolge wie in der Gleichung (x vor y)
  if (known === 0) ts.push(kn, ot)
  else ts.push(ot, kn)
  const L = mkSum(ts.filter((w) => !(w.t === 'terms' && !w.ts.length)).map((w) => ({ s: 1 as const, w })))
  return { L, R: terms([{ c: e.c, m: {} }]) }
}

function solveFor(L: W, R: W, v: string, f: Fmt, vars: string[]) {
  return solveTrees(L, R, '=', f, { variable: v, vars, probe: false, heads: false, keepFractions: true })
}

/* ---------------------------- Additionsverfahren ---------------------------- */

function eliminate(E: [Lin, Lin], v: [string, string], f: Fmt, steps: Step[]): { val: Q; w: 0 | 1 } | { special: 'keine' | 'unendlich' } {
  const [e1, e2] = E
  const cand: { w: 0 | 1; l: bigint }[] = []
  const lcmQ = (x: Q, y: Q) => blcm(absQ(x).n, absQ(y).n)
  if (!isZero(e1.b) && !isZero(e2.b)) cand.push({ w: 1, l: lcmQ(e1.b, e2.b) })
  if (!isZero(e1.a) && !isZero(e2.a)) cand.push({ w: 0, l: lcmQ(e1.a, e2.a) })
  cand.sort((p, r) => (p.l < r.l ? -1 : p.l > r.l ? 1 : p.w === 1 ? -1 : 1))
  const elim = cand[0].w
  const c1 = elim === 1 ? e1.b : e1.a
  const c2 = elim === 1 ? e2.b : e2.a
  const L = cand[0].l
  const m1 = q(L / absQ(c1).n)
  let m2 = q(L / absQ(c2).n)
  if (sign(c1) === sign(c2)) m2 = neg(m2)
  const vt = varTex(v[elim])
  const E1: Lin = { a: mul(e1.a, m1), b: mul(e1.b, m1), c: mul(e1.c, m1) }
  const E2: Lin = { a: mul(e2.a, m2), b: mul(e2.b, m2), c: mul(e2.c, m2) }
  const mop = (m: Q) => (isOne(m) ? undefined : `| \\cdot ${qTexPar(m, f)}`)
  steps.push({ tex: lab(0) + linTex(e1, v, f), op: mop(m1), note: `Ziel: Vor $${vt}$ sollen Gegenzahlen stehen, damit $${vt}$ beim Addieren wegfällt.`, head: 'Additionsverfahren' })
  steps.push({ tex: lab(1) + linTex(e2, v, f), op: mop(m2) })
  const changed = !isOne(m1) || !isOne(m2)
  if (changed) {
    steps.push({ tex: lab(0, "'") + linTex(E1, v, f) })
    const tv = (c: Q) => termTex({ c, m: { [v[elim]]: 1 } }, true, f)
    steps.push({ tex: lab(1, "'") + linTex(E2, v, f), note: `$${tv(elim === 1 ? E1.b : E1.a)}$ und $${tv(elim === 1 ? E2.b : E2.a)}$ heben sich auf.` })
  }
  const S: Lin = { a: add(E1.a, E2.a), b: add(E1.b, E2.b), c: add(E1.c, E2.c) }
  const sumLbl = changed ? "\\text{I'} + \\text{II'}" : '\\text{I} + \\text{II}'
  const k = elim === 1 ? S.a : S.b
  if (isZero(k)) {
    // beide Variablen fallen weg
    steps.push({ tex: `${sumLbl}\\colon\\ 0 = ${qTex(S.c, f)}`, note: 'Beim Addieren fallen **beide** Variablen weg.' })
    const inf = isZero(S.c)
    steps.push({
      tex: inf ? '\\text{wahre Aussage} \\Rightarrow \\text{unendlich viele Lösungen}' : '\\text{falsche Aussage} \\Rightarrow \\mathbb{L} = \\{\\,\\}',
      note: inf ? 'Beide Gleichungen beschreiben dieselbe Gerade – jeder Punkt darauf ist eine Lösung.' : 'Die Geraden sind parallel und schneiden sich nie – es gibt keine Lösung.',
      final: true,
    })
    return { special: inf ? 'unendlich' : 'keine' }
  }
  const w = (1 - elim) as 0 | 1
  const wt = varTex(v[w])
  steps.push({ tex: `${sumLbl}\\colon\\ ${termAbsTex({ c: absQ(k), m: { [v[w]]: 1 } }, f).replace(/^/, sign(k) < 0 ? '-' : '')} = ${qTex(S.c, f)}`, op: isOne(k) ? undefined : `| :${qTexPar(k, f)}`, note: 'Beide Gleichungen addieren.' })
  const val = div(S.c, k)
  steps.push({ tex: `${wt} = ${qTex(val, f)}` })
  return { val, w }
}

/* ---------------------------- Hauptfunktion ---------------------------- */

export function solveLgs(src1: string, src2: string, method: LgsMethod): LgsResult {
  const p1 = parseEq(src1, 0)
  const p2 = parseEq(src2, 1)
  const all = [...new Set([...p1.vars, ...p2.vars])].filter((x) => x !== 'π')
  if (all.length < 2) throw new CalcError('Ein Gleichungssystem braucht zwei Variablen, z. B. x und y.')
  if (all.length > 2) throw new CalcError(`Zu viele Variablen (${all.join(', ')}) – der Rechner löst Systeme mit zwei Unbekannten.`)
  const v = (all.includes('x') && all.includes('y') ? ['x', 'y'] : [...all].sort()) as [string, string]
  const f: Fmt = { dec: p1.dec || p2.dec }
  const steps: Step[] = []
  // 1. ordnen
  const s1: Step[] = []
  const s2: Step[] = []
  const e1 = normalize(p1, 0, v, f, s1)
  const e2 = normalize(p2, 1, v, f, s2)
  const needsOrder = s1.length > 1 || s2.length > 1
  if (needsOrder) {
    s1[0].head = 'Ordnen'
    s1[0].note = (s1[0].note ? s1[0].note + ' ' : '') + 'Zuerst jede Gleichung in die Form $ax + by = c$ bringen.'.replace(/x/, varTex(v[0])).replace(/y/, varTex(v[1]))
    steps.push(...s1, ...s2)
  }
  const E: [Lin, Lin] = [e1, e2]
  const det = sub(mul(e1.a, e2.b), mul(e2.a, e1.b))
  const lines = [e1, e2]
  const done = (kind: LgsResult['kind'], sol?: [Q, Q]): LgsResult => {
    let result: string
    if (kind === 'eine' && sol) {
      result = `${varTex(v[0])} = ${qTex(sol[0], f)},\\quad ${varTex(v[1])} = ${qTex(sol[1], f)}`
      steps.push({ tex: `\\mathbb{L} = \\{(${qTex(sol[0], f)} \\mid ${qTex(sol[1], f)})\\}`, note: `Lösung als Zahlenpaar $(${varTex(v[0])} \\mid ${varTex(v[1])})$.` })
      // Probe
      ;[p1, p2].forEach((p, i) => {
        const env = { [v[0]]: sol[0], [v[1]]: sol[1] }
        const lv = wEval(p.L, env)
        const rv = wEval(p.R, env)
        const sl = wTex(substitute(p.L, env), f)
        const sr = wTex(substitute(p.R, env), f)
        steps.push({
          tex: `${lab(i)}${sl} = ${sr} \\;\\Rightarrow\\; ${qTex(lv, f)} = ${qTex(rv, f)}${qeq(lv, rv) ? '\\ \\checkmark' : ''}`,
          head: i === 0 ? 'Probe' : undefined,
          note: i === 0 ? 'Beide Werte in **beide** Ausgangsgleichungen einsetzen.' : undefined,
        })
      })
    } else result = kind === 'keine' ? '\\mathbb{L} = \\{\\,\\}' : '\\text{unendlich viele Lösungen}'
    steps[steps.length - 1].final = true
    const extra =
      kind === 'eine' && sol && (sol[0].d !== 1n || sol[1].d !== 1n) && !f.dec ? [`${varTex(v[0])} \\approx ${toNum(sol[0]).toFixed(4).replace('.', '{,}')},\\quad ${varTex(v[1])} \\approx ${toNum(sol[1]).toFixed(4).replace('.', '{,}')}`] : undefined
    return { result, steps, vars: v, kind, sol, lines, extra, remark: kind === 'keine' ? 'Die beiden Geraden sind parallel.' : kind === 'unendlich' ? 'Beide Gleichungen beschreiben dieselbe Gerade.' : undefined }
  }

  if (isZero(det) || method === 'addition') {
    if (isZero(det) && method !== 'addition') steps.push({ tex: `${lab(0)}${linTex(e1, v, f)} \\quad ${lab(1)}${linTex(e2, v, f)}`, note: 'Bei diesem System fallen beide Variablen weg – das zeigt das Additionsverfahren am klarsten.' })
    if ((isZero(e1.a) && isZero(e1.b)) || (isZero(e2.a) && isZero(e2.b))) throw new CalcError('Eine der Gleichungen enthält keine Variable mehr.')
    const r = eliminate(E, v, f, steps)
    if ('special' in r) return done(r.special)
    // in die Gleichung mit dem kleineren Koeffizienten einsetzen
    const other = (1 - r.w) as 0 | 1
    const co = (e: Lin) => absQ(other === 0 ? e.a : e.b)
    const useI = isZero(co(e2)) || (!isZero(co(e1)) && toNum(co(e1)) <= toNum(co(e2)))
    const e = useI ? e1 : e2
    const { L, R } = substTree(e, v, r.w, r.val)
    const sol = solveFor(L, R, v[other], f, v)
    sol.steps[0].note = `$${varTex(v[r.w])} = ${qTex(r.val, f)}$ in ${useI ? 'I' : 'II'} einsetzen.`
    sol.steps[0].head = 'Einsetzen'
    steps.push(...sol.steps.map((x) => ({ ...x, final: false })))
    const ov = div(sub(e.c, mul(r.w === 0 ? e.a : e.b, r.val)), other === 0 ? e.a : e.b)
    return done('eine', (r.w === 0 ? [r.val, ov] : [ov, r.val]) as [Q, Q])
  }

  if (method === 'einsetzung') {
    // Gleichung und Variable mit Faktor ±1 bevorzugen
    const opts: { i: 0 | 1; w: 0 | 1; cost: number }[] = []
    E.forEach((e, i) =>
      ([0, 1] as const).forEach((w) => {
        const c = w === 0 ? e.a : e.b
        if (isZero(c)) return
        const cost = (isOne(absQ(c)) ? 0 : absQ(c).d === 1n ? 2 : 4) + (w === 1 ? 0 : 0.5) + (i === 1 ? 0 : 0.25)
        opts.push({ i: i as 0 | 1, w, cost })
      }),
    )
    opts.sort((a, b) => a.cost - b.cost)
    const { i, w } = opts[0]
    const j = (1 - i) as 0 | 1
    const o = (1 - w) as 0 | 1
    const wt = varTex(v[w])
    const ot = varTex(v[o])
    const e = E[i]
    // 1. nach w auflösen
    const iso = solveFor(terms(linTerms(e, v)), terms([{ c: e.c, m: {} }]), v[w], f, v)
    iso.steps[0].tex = lab(i) + iso.steps[0].tex
    iso.steps[0].head = `${i === 0 ? 'I' : 'II'} nach ${v[w]} auflösen`
    iso.steps[0].note = (iso.steps[0].note ? iso.steps[0].note + ' ' : '') + `Die Gleichung, in der $${wt}$ am einfachsten allein steht.`
    steps.push(...iso.steps.map((x) => ({ ...x, final: false })))
    // Term für w in Abhängigkeit von o
    const kw = w === 0 ? e.a : e.b
    const ko = o === 0 ? e.a : e.b
    const wTerms: Term[] = sideSort(
      [
        { c: div(neg(ko), kw), m: { [v[o]]: 1 } },
        { c: div(e.c, kw), m: {} },
      ],
      v[w],
    )
    // 2. in die andere Gleichung einsetzen
    const e2b = E[j]
    const cw = w === 0 ? e2b.a : e2b.b
    const co = o === 0 ? e2b.a : e2b.b
    const inner = grp(terms(wTerms.length ? wTerms : [{ c: ZERO, m: {} }]))
    const wPart: W = isOne(cw) ? inner : isOne(neg(cw)) ? mkSum([{ s: -1, w: inner }]) : { t: 'prod', f: [terms([{ c: cw, m: {} }]), inner] }
    const oPart: W = terms(isZero(co) ? [] : [{ c: co, m: { [v[o]]: 1 } }])
    const parts = (o === 0 ? [oPart, wPart] : [wPart, oPart]).filter((x) => !(x.t === 'terms' && !x.ts.length))
    const L = mkSum(parts.map((x) => ({ s: 1 as const, w: x })))
    const sub2 = solveFor(L, terms([{ c: e2b.c, m: {} }]), v[o], f, v)
    sub2.steps[0].tex = `${i === 0 ? '\\text{I in II}' : '\\text{II in I}'}\\colon\\ ${sub2.steps[0].tex}`
    sub2.steps[0].head = 'Einsetzen'
    sub2.steps[0].note = `Für $${wt}$ den Term aus ${i === 0 ? 'I' : 'II'} **in Klammern** einsetzen.` + (sub2.steps[0].note ? ' ' + sub2.steps[0].note : '')
    steps.push(...sub2.steps.map((x) => ({ ...x, final: false })))
    const oVal = div(sub(e2b.c, mul(cw, div(e.c, kw))), sub(co, mul(cw, div(ko, kw))))
    // 3. zurückeinsetzen
    const back = substitute(terms(wTerms), { [v[o]]: oVal })
    const wVal = div(sub(e.c, mul(ko, oVal)), kw)
    steps.push({ tex: `${wt} = ${wTex(back, f)} = ${qTex(wVal, f)}`, head: 'Zurück einsetzen', note: `$${ot} = ${qTex(oVal, f)}$ in den Term für $${wt}$ einsetzen.` })
    return done('eine', (w === 0 ? [wVal, oVal] : [oVal, wVal]) as [Q, Q])
  }

  // Gleichsetzungsverfahren: beide nach derselben Variablen auflösen
  const w: 0 | 1 = !isZero(e1.b) && !isZero(e2.b) ? 1 : 0
  const o = (1 - w) as 0 | 1
  const wt = varTex(v[w])
  const ot = varTex(v[o])
  const isoTerms: Term[][] = []
  E.forEach((e, i) => {
    const iso = solveFor(terms(linTerms(e, v)), terms([{ c: e.c, m: {} }]), v[w], f, v)
    iso.steps[0].tex = lab(i) + iso.steps[0].tex
    if (i === 0) {
      iso.steps[0].head = `Beide nach ${v[w]} auflösen`
      iso.steps[0].note = `Für das Gleichsetzungsverfahren müssen beide Gleichungen nach derselben Variablen aufgelöst sein.`
    }
    steps.push(...iso.steps.map((x) => ({ ...x, final: false })))
    const kw = w === 0 ? e.a : e.b
    const ko = o === 0 ? e.a : e.b
    isoTerms.push(
      sideSort(
        [
          { c: div(neg(ko), kw), m: { [v[o]]: 1 } },
          { c: div(e.c, kw), m: {} },
        ],
        v[w],
      ),
    )
  })
  const set = solveFor(terms(isoTerms[0]), terms(isoTerms[1]), v[o], f, v)
  set.steps[0].tex = `\\text{I} = \\text{II}\\colon\\ ${set.steps[0].tex}`
  set.steps[0].head = 'Gleichsetzen'
  set.steps[0].note = `Beide Terme sind gleich $${wt}$ – also sind sie auch einander gleich.` + (set.steps[0].note ? ' ' + set.steps[0].note : '')
  steps.push(...set.steps.map((x) => ({ ...x, final: false })))
  const k1 = isoTerms[0].find((t) => t.m[v[o]])?.c ?? ZERO
  const k2 = isoTerms[1].find((t) => t.m[v[o]])?.c ?? ZERO
  const c1 = isoTerms[0].find((t) => !t.m[v[o]])?.c ?? ZERO
  const c2 = isoTerms[1].find((t) => !t.m[v[o]])?.c ?? ZERO
  const oVal = div(sub(c2, c1), sub(k1, k2))
  const back = substitute(terms(isoTerms[0]), { [v[o]]: oVal })
  const wVal = add(mul(k1, oVal), c1)
  steps.push({ tex: `${wt} = ${wTex(back, f)} = ${qTex(wVal, f)}`, head: 'Zurück einsetzen', note: `$${ot} = ${qTex(oVal, f)}$ in I einsetzen.` })
  return done('eine', (w === 0 ? [wVal, oVal] : [oVal, wVal]) as [Q, Q])
}

export { ONE }
