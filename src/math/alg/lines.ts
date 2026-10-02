/**
 * Geraden: Steigung, Geradengleichung, Nullstelle, Punktprobe, Lage zweier Geraden, Schnittpunkt.
 */
import { add, CalcError, div, eq as qeq, isZero, mul, neg, ONE, q, qTex, qTexPar, sign, sub, toNum, ZERO, type Fmt, type Q } from '../q'
import { solveEquation, solveTrees, splitRelation } from './equation'
import { combine, sumTex, type Term } from './poly'
import { finishStages, rounds } from './simplify'
import type { Solution, Step } from './step'
import { mkSum, parseW, terms, type W } from './tree'

export interface Pt {
  x: Q
  y: Q
}

export interface LineFig {
  lines: { m: number; b: number; label?: string; vx?: number }[]
  points: { x: number; y: number; label?: string }[]
}

export interface LineResult extends Solution {
  fig: LineFig
}

const xT = (c: Q): Term => ({ c, m: { x: 1 } })
const kT = (c: Q): Term => ({ c, m: {} })
export const lineTex = (m: Q, b: Q, f: Fmt = {}) => `y = ${sumTex([xT(m), kT(b)].filter((t) => !isZero(t.c)), f) || '0'}`
const ptTex = (name: string, p: Pt, f: Fmt) => `${name}(${qTex(p.x, f)} \\mid ${qTex(p.y, f)})`

function solveB(P: Pt, m: Q, f: Fmt, steps: Step[]): Q {
  // y1 = m · x1 + b
  const prod: W = isZero(m) ? terms([]) : { t: 'prod', f: [terms([kT(m)]), terms([kT(P.x)])] }
  const R = mkSum([
    { s: 1, w: prod },
    { s: 1, w: terms([{ c: ONE, m: { b: 1 } }]) },
  ])
  const r = solveTrees(terms([kT(P.y)]), R, '=', f, { variable: 'b', probe: false, heads: false, keepFractions: true })
  r.steps[0].note = `Punkt und Steigung in $y = mx + b$ einsetzen – nur $b$ ist noch unbekannt.`
  r.steps[0].head = 'y-Achsenabschnitt b'
  steps.push(...r.steps.map((s) => ({ ...s, final: false })))
  return sub(P.y, mul(m, P.x))
}

function nullstelle(m: Q, b: Q, f: Fmt, steps: Step[]): Q | null {
  if (isZero(m)) {
    steps.push({ tex: isZero(b) ? '\\text{Die Gerade ist die } x\\text{-Achse.}' : '\\text{keine Nullstelle}', head: 'Nullstelle', note: isZero(b) ? undefined : 'Die Gerade ist waagerecht und schneidet die $x$-Achse nie.' })
    return null
  }
  const r = solveTrees(terms([]), terms([xT(m), kT(b)].filter((t) => !isZero(t.c))), '=', f, { variable: 'x', probe: false, heads: false, keepFractions: true })
  r.steps[0].head = 'Nullstelle'
  r.steps[0].note = 'An der Nullstelle ist $y = 0$.'
  steps.push(...r.steps.map((s) => ({ ...s, final: false })))
  const x0 = div(neg(b), m)
  steps.push({ tex: `N(${qTex(x0, f)} \\mid 0)` })
  return x0
}

function figLine(m: Q, b: Q, label?: string) {
  return { m: toNum(m), b: toNum(b), label }
}

/* ---------------------------- zwei Punkte ---------------------------- */

export function lineThroughPoints(P: Pt, Qp: Pt, f: Fmt): LineResult {
  if (qeq(P.x, Qp.x) && qeq(P.y, Qp.y)) throw new CalcError('Bitte zwei verschiedene Punkte eingeben.')
  const steps: Step[] = []
  if (qeq(P.x, Qp.x)) {
    steps.push({ tex: `x_1 = x_2 = ${qTex(P.x, f)}`, note: 'Beide Punkte haben dieselbe $x$-Koordinate – die Gerade ist senkrecht.', head: 'Senkrechte Gerade' })
    steps.push({ tex: `x = ${qTex(P.x, f)}`, note: 'Eine senkrechte Gerade hat keine Steigung und lässt sich nicht als $y = mx + b$ schreiben.', final: true })
    return {
      result: `x = ${qTex(P.x, f)}`,
      steps,
      fig: { lines: [{ m: 0, b: 0, vx: toNum(P.x) }], points: [{ x: toNum(P.x), y: toNum(P.y), label: 'P' }, { x: toNum(Qp.x), y: toNum(Qp.y), label: 'Q' }] },
    }
  }
  const dy = sub(Qp.y, P.y)
  const dx = sub(Qp.x, P.x)
  const m = div(dy, dx)
  steps.push({ tex: `m = \\frac{\\Delta y}{\\Delta x} = \\frac{y_2 - y_1}{x_2 - x_1}`, head: 'Steigung m', note: 'Steigungsdreieck: Höhenunterschied geteilt durch Breitenunterschied – immer „zweiter Punkt minus erster Punkt“.' })
  steps.push({ tex: `m = \\frac{${qTex(Qp.y, f)} - ${qTexPar(P.y, f)}}{${qTex(Qp.x, f)} - ${qTexPar(P.x, f)}} = \\frac{${qTex(dy, f)}}{${qTex(dx, f)}}${qTex(m, f) === `\\frac{${qTex(dy, f)}}{${qTex(dx, f)}}` ? '' : ` = ${qTex(m, f)}`}` })
  const b = solveB(P, m, f, steps)
  steps.push({ tex: lineTex(m, b, f), head: 'Geradengleichung', note: '$m$ und $b$ in $y = mx + b$ einsetzen.' })
  const x0 = nullstelle(m, b, f, steps)
  steps.forEach((s) => (s.final = false))
  const gi = steps.findIndex((s) => s.head === 'Geradengleichung')
  if (gi >= 0) steps[gi].final = true
  const pts = [
    { x: toNum(P.x), y: toNum(P.y), label: 'P' },
    { x: toNum(Qp.x), y: toNum(Qp.y), label: 'Q' },
  ]
  if (x0) pts.push({ x: toNum(x0), y: 0, label: 'N' })
  const extra = [`m = ${qTex(m, f)},\\quad b = ${qTex(b, f)}`]
  if (x0) extra.push(`\\text{Nullstelle } N(${qTex(x0, f)} \\mid 0)`)
  return { result: lineTex(m, b, f), steps, extra, fig: { lines: [figLine(m, b)], points: pts } }
}

/* ---------------------------- Punkt und Steigung ---------------------------- */

export function lineFromPointSlope(P: Pt, m: Q, f: Fmt): LineResult {
  const steps: Step[] = [{ tex: `m = ${qTex(m, f)}, \\quad ${ptTex('P', P, f)}`, note: 'Gegeben: Steigung und ein Punkt.' }]
  const b = solveB(P, m, f, steps)
  steps.push({ tex: lineTex(m, b, f), head: 'Geradengleichung', note: '$m$ und $b$ in $y = mx + b$ einsetzen.', final: true })
  const x0 = nullstelle(m, b, f, steps)
  const pts = [{ x: toNum(P.x), y: toNum(P.y), label: 'P' }]
  if (x0) pts.push({ x: toNum(x0), y: 0, label: 'N' })
  const extra = [`b = ${qTex(b, f)}`]
  if (x0) extra.push(`\\text{Nullstelle } N(${qTex(x0, f)} \\mid 0)`)
  return { result: lineTex(m, b, f), steps, extra, fig: { lines: [figLine(m, b)], points: pts } }
}

/* ---------------------------- Gleichung lesen ---------------------------- */

type MB = { m: Q; b: Q; steps: Step[]; f: Fmt } | { vx: Q; steps: Step[]; f: Fmt }

/** beliebige Geradengleichung in y = mx + b umformen */
export function toMB(src: string, name = 'g'): MB {
  const { L, R, rel } = splitRelation(src)
  if (rel !== '=') throw new CalcError('Eine Geradengleichung braucht ein Gleichheitszeichen.')
  const pL = parseW(L)
  const pR = parseW(R)
  const f: Fmt = { dec: pL.dec || pR.dec }
  const vars = [...new Set([...pL.vars, ...pR.vars])]
  if (vars.some((v) => v !== 'x' && v !== 'y')) throw new CalcError('In einer Geradengleichung bitte nur x und y verwenden.')
  // auf a·x + c·y + k = 0 bringen
  const flat = (w: W) => {
    const rs = rounds(w, f)
    const last = (rs.length ? rs[rs.length - 1].w : w) as Extract<W, { t: 'terms' }>
    return finishStages(last.ts, f).result
  }
  const D = combine([...flat(pL.w), ...flat(pR.w).map((t) => ({ c: neg(t.c), m: t.m }))])
  for (const t of D) {
    const ks = Object.keys(t.m)
    if (ks.length > 1 || (ks.length === 1 && t.m[ks[0]] !== 1)) throw new CalcError('Das ist keine Geradengleichung (x und y nur hoch 1).')
  }
  const co = (v: string) => D.filter((t) => t.m[v]).reduce((s, t) => add(s, t.c), ZERO)
  const a = co('x')
  const c = co('y')
  const k = D.filter((t) => !Object.keys(t.m).length).reduce((s, t) => add(s, t.c), ZERO)
  if (isZero(c)) {
    if (isZero(a)) throw new CalcError('In der Gleichung kommen weder x noch y vor.')
    const vx = div(neg(k), a)
    return { vx, f, steps: [{ tex: `${name}\\colon\\ x = ${qTex(vx, f)}`, note: 'Ohne $y$: eine senkrechte Gerade.' }] }
  }
  const m = div(neg(a), c)
  const b = div(neg(k), c)
  const direct = /^\s*y\s*$/.test(L)
  if (direct) return { m, b, f, steps: [{ tex: `${name}\\colon\\ ${lineTex(m, b, f)}` }] }
  const r = solveEquation(src, { variable: 'y' })
  const st: Step[] = r.steps.map((s) => ({ ...s, final: false }))
  st[0].head = `${name} nach y auflösen`
  st[0].note = (st[0].note ? st[0].note + ' ' : '') + 'In die Form $y = mx + b$ bringen.'
  const last = st[st.length - 1]
  if (last.tex !== lineTex(m, b, f)) st.push({ tex: lineTex(m, b, f), note: 'Ordnen: erst $mx$, dann $b$.' })
  return { m, b, f, steps: st.filter((s) => !s.head?.startsWith('Probe')) }
}

export function analyzeLine(src: string, P?: Pt): LineResult {
  const g = toMB(src)
  const f = g.f
  const steps: Step[] = [...g.steps]
  if ('vx' in g) {
    steps.push({ tex: `x = ${qTex(g.vx, f)}`, note: 'Senkrechte Gerade: keine Steigung, kein y-Achsenabschnitt.', final: true })
    return { result: `x = ${qTex(g.vx, f)}`, steps, fig: { lines: [{ m: 0, b: 0, vx: toNum(g.vx) }], points: [] } }
  }
  const { m, b } = g
  steps.push({ tex: `m = ${qTex(m, f)}, \\quad b = ${qTex(b, f)}`, head: 'Ablesen', note: 'Die Zahl vor $x$ ist die Steigung $m$, die Zahl allein ist der y-Achsenabschnitt $b$.' })
  steps.push({
    tex: `S_y(0 \\mid ${qTex(b, f)})`,
    note: `Die Gerade schneidet die $y$-Achse bei $${qTex(b, f)}$. Steigung ${sign(m) > 0 ? 'positiv: die Gerade steigt' : sign(m) < 0 ? 'negativ: die Gerade fällt' : '0: die Gerade ist waagerecht'}.`,
  })
  const x0 = nullstelle(m, b, f, steps)
  const pts: LineFig['points'] = [{ x: 0, y: toNum(b), label: 'S_y' }]
  if (x0) pts.push({ x: toNum(x0), y: 0, label: 'N' })
  const extra: string[] = [`m = ${qTex(m, f)},\\quad b = ${qTex(b, f)}`]
  if (x0) extra.push(`N(${qTex(x0, f)} \\mid 0)`)
  if (P) {
    const yv = add(mul(m, P.x), b)
    const on = qeq(yv, P.y)
    steps.push({ tex: `y = ${qTex(m, f)} \\cdot ${qTexPar(P.x, f)} ${sign(b) < 0 ? '-' : '+'} ${qTex(b.n < 0n ? neg(b) : b, f)} = ${qTex(yv, f)}`, head: 'Punktprobe', note: `$x$-Wert von $${ptTex('P', P, f)}$ einsetzen.` })
    steps.push({ tex: on ? `${qTex(yv, f)} = ${qTex(P.y, f)}\\ \\checkmark` : `${qTex(yv, f)} \\neq ${qTex(P.y, f)}`, note: on ? 'Gleich → P liegt **auf** der Geraden.' : 'Verschieden → P liegt **nicht** auf der Geraden.' })
    pts.push({ x: toNum(P.x), y: toNum(P.y), label: 'P' })
    extra.push(on ? '\\text{P liegt auf der Geraden}' : '\\text{P liegt nicht auf der Geraden}')
  }
  steps[steps.length - 1].final = true
  return { result: lineTex(m, b, f), steps, extra, fig: { lines: [figLine(m, b)], points: pts } }
}

/* ---------------------------- zwei Geraden ---------------------------- */

export function twoLines(src1: string, src2: string): LineResult {
  const g = toMB(src1, 'g')
  const h = toMB(src2, 'h')
  const f: Fmt = { dec: g.f.dec || h.f.dec }
  const steps: Step[] = [...g.steps, ...h.steps]
  const fig: LineFig = { lines: [], points: [] }
  const push = (x: MB, label: string) => fig.lines.push('vx' in x ? { m: 0, b: 0, vx: toNum(x.vx), label } : { ...figLine(x.m, x.b, label) })
  push(g, 'g')
  push(h, 'h')
  if ('vx' in g || 'vx' in h) {
    if ('vx' in g && 'vx' in h) {
      const same = qeq(g.vx, h.vx)
      steps.push({ tex: same ? '\\text{identisch}' : '\\text{parallel}', note: 'Beide Geraden sind senkrecht.', final: true })
      return { result: same ? '\\text{Die Geraden sind identisch.}' : '\\text{Die Geraden sind parallel.}', steps, fig }
    }
    const v = ('vx' in g ? g : h) as { vx: Q }
    const o = ('vx' in g ? h : g) as { m: Q; b: Q }
    const y = add(mul(o.m, v.vx), o.b)
    steps.push({ tex: `y = ${qTex(o.m, f)} \\cdot ${qTexPar(v.vx, f)} + ${qTexPar(o.b, f)} = ${qTex(y, f)}`, head: 'Schnittpunkt', note: `Die senkrechte Gerade hat überall $x = ${qTex(v.vx, f)}$ – in die andere Gleichung einsetzen.` })
    steps.push({ tex: `S(${qTex(v.vx, f)} \\mid ${qTex(y, f)})`, final: true })
    fig.points.push({ x: toNum(v.vx), y: toNum(y), label: 'S' })
    return { result: `S(${qTex(v.vx, f)} \\mid ${qTex(y, f)})`, steps, fig }
  }
  steps.push({ tex: `m_g = ${qTex(g.m, f)}, \\quad m_h = ${qTex(h.m, f)}`, head: 'Lage', note: 'Zuerst die Steigungen vergleichen.' })
  if (qeq(g.m, h.m)) {
    const same = qeq(g.b, h.b)
    steps.push({ tex: `b_g = ${qTex(g.b, f)}, \\quad b_h = ${qTex(h.b, f)}`, note: 'Gleiche Steigung → $b$ entscheidet.' })
    steps.push({
      tex: same ? '\\text{gleiches } m \\text{ und gleiches } b \\Rightarrow \\text{identisch}' : '\\text{gleiches } m,\\ \\text{anderes } b \\Rightarrow \\text{parallel}',
      note: same ? 'Es ist dieselbe Gerade – unendlich viele gemeinsame Punkte.' : 'Parallele Geraden schneiden sich nie.',
      final: true,
    })
    return { result: same ? '\\text{Die Geraden sind identisch.}' : '\\text{Die Geraden sind parallel – kein Schnittpunkt.}', steps, fig }
  }
  const prod = mul(g.m, h.m)
  const perp = qeq(prod, q(-1))
  steps.push({
    tex: `m_g \\cdot m_h = ${qTex(g.m, f)} \\cdot ${qTexPar(h.m, f)} = ${qTex(prod, f)}${perp ? '' : ' \\neq -1'}`,
    note: perp ? 'Das Produkt der Steigungen ist $-1$ → die Geraden stehen **senkrecht** aufeinander.' : 'Verschiedene Steigungen → die Geraden schneiden sich (senkrecht nur bei $m_g \\cdot m_h = -1$).',
  })
  const r = solveTrees(terms([xT(g.m), kT(g.b)].filter((t) => !isZero(t.c))), terms([xT(h.m), kT(h.b)].filter((t) => !isZero(t.c))), '=', f, { variable: 'x', probe: false, heads: false, keepFractions: true })
  r.steps[0].head = 'Schnittpunkt'
  r.steps[0].note = 'Im Schnittpunkt haben beide Geraden denselben $y$-Wert → gleichsetzen.'
  steps.push(...r.steps.map((s) => ({ ...s, final: false })))
  const x = div(sub(h.b, g.b), sub(g.m, h.m))
  const y = add(mul(g.m, x), g.b)
  steps.push({ tex: `y = ${qTex(g.m, f)} \\cdot ${qTexPar(x, f)} ${sign(g.b) < 0 ? '-' : '+'} ${qTex(sign(g.b) < 0 ? neg(g.b) : g.b, f)} = ${qTex(y, f)}`, note: '$x$ in $g$ einsetzen.' })
  steps.push({ tex: `S(${qTex(x, f)} \\mid ${qTex(y, f)})`, final: true })
  fig.points.push({ x: toNum(x), y: toNum(y), label: 'S' })
  return { result: `S(${qTex(x, f)} \\mid ${qTex(y, f)})`, steps, fig, extra: perp ? ['\\text{Die Geraden stehen senkrecht aufeinander.}'] : undefined }
}
