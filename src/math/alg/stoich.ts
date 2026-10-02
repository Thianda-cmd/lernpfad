/**
 * Chemisches Rechnen: molare Masse, Stoffmenge, Teilchenzahl, Lösungen ansetzen,
 * Verdünnen (c₁V₁ = c₂V₂), Mischungskreuz und Mischtemperatur – jeweils mit Rechenweg.
 * Atommassen wie in der Schule auf zwei Nachkommastellen gerundet.
 */
import { FormulaError, parseFormula } from '../../chem/formula'
import { add, approxTex, bgcd, CalcError, div, isTerminating, isZero, mul, neg, q, qFromRaw, qTex, sign, sub, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'

export const NA = qFromRaw('6.022e23')
const F = { dec: true }

export const MASS_U = [
  { u: 'kg', f: q(1000) },
  { u: 'g', f: q(1) },
  { u: 'mg', f: q(1, 1000) },
  { u: 'µg', f: q(1, 1000000) },
] as const
export const MOL_U = [
  { u: 'mol', f: q(1) },
  { u: 'mmol', f: q(1, 1000) },
  { u: 'µmol', f: q(1, 1000000) },
] as const
export const VOL_U = [
  { u: 'L', f: q(1) },
  { u: 'mL', f: q(1, 1000) },
  { u: 'µL', f: q(1, 1000000) },
] as const
export const CONC_U = [
  { u: 'mol/L', f: q(1) },
  { u: 'mmol/L', f: q(1, 1000) },
] as const

const fac = (list: readonly { u: string; f: Q }[], u: string) => list.find((x) => x.u === u)?.f ?? q(1)
const T = (u: string) => `\\,\\text{${u}}`

/** Zahl: exakt, wenn kurz – sonst 4 gültige Ziffern */
function num(x: Q, sig = 4): { t: string; approx: boolean } {
  if (isTerminating(x)) {
    const t = qTex(x, F)
    if (t.replace(/[^0-9]/g, '').length <= 7 && Math.abs(toNum(x)) >= 1e-4 && Math.abs(toNum(x)) < 1e7) return { t, approx: false }
  }
  return { t: approxTex(toNum(x), sig), approx: true }
}
const nt = (x: Q, sig = 4) => num(x, sig).t
const eqv = (x: Q, sig = 4) => `${num(x, sig).approx ? '\\approx' : '='} ${num(x, sig).t}`

/** Wert in passender Einheit (0,1 … 1000) */
function best(x: Q, list: readonly { u: string; f: Q }[]) {
  const v = Math.abs(toNum(x))
  for (const e of list) {
    const r = v / toNum(e.f)
    if (r >= 0.1 && r < 1000) return { u: e.u, v: div(x, e.f) }
  }
  const last = list[list.length - 1]
  return v >= 1000 * toNum(list[0].f) ? { u: list[0].u, v: div(x, list[0].f) } : { u: last.u, v: div(x, last.f) }
}

/* ---------------------------- molare Masse ---------------------------- */

export interface Molar {
  M: Q
  formula: string
  step: Step
  parts: { sym: string; n: number; m: Q }[]
}

export function formulaTexOf(src: string) {
  const s = src.replace(/\s+/g, '').replace(/[*•.]/g, '·')
  return `\\mathrm{${s.replace(/·/g, '\\cdot ').replace(/([A-Za-z)\]])(\d+)/g, '$1_{$2}')}}`
}

export function molarMass(src: string): Molar {
  let counts
  try {
    counts = parseFormula(src)
  } catch (e) {
    if (e instanceof FormulaError) throw new CalcError(e.message)
    throw e
  }
  const parts = counts.map((c) => ({ sym: c.el.sym, n: c.n, m: qFromRaw(c.el.radio ? String(c.el.mass) : c.el.mass.toFixed(2)) }))
  const M = parts.reduce((s, p) => add(s, mul(q(p.n), p.m)), q(0))
  const sum = parts.map((p) => `${p.n === 1 ? '' : `${p.n} \\cdot `}${m2(p.m)}`).join(' + ')
  const ft = formulaTexOf(src)
  return {
    M,
    formula: ft,
    parts,
    step: {
      tex: `M(${ft}) = ${sum} = ${m2(M)}${T('g/mol')}`,
      note: `Molare Masse: Atommassen aus dem Periodensystem (${parts.map((p) => `${p.sym} $${m2(p.m)}$`).join(', ')}) mal Anzahl der Atome, alles addieren.`,
      head: 'Molare Masse',
    },
  }
}

/** Atommassen und molare Massen mit zwei Nachkommastellen: 16,00 · 98,08 */
export const m2 = (x: Q) => toNum(x).toFixed(2).replace('.', '{,}')

/* ---------------------------- Stoffmenge ---------------------------- */

export type Given = 'm' | 'n' | 'N'

export function amount(opts: { formula?: string; M?: NumIn | null; given: Given; value: NumIn | null; unit: string }): Solution {
  const steps: Step[] = []
  let M: Q
  let fTex = 'X'
  if (opts.formula?.trim()) {
    const mm = molarMass(opts.formula)
    M = mm.M
    fTex = mm.formula
    steps.push(mm.step)
  } else if (opts.M) {
    M = opts.M.q
    steps.push({ tex: `M = ${m2(M)}${T('g/mol')}`, head: 'Molare Masse', note: 'Molare Masse wie angegeben.' })
  } else if (opts.given !== 'N') throw new CalcError('Bitte eine Summenformel oder die molare Masse angeben.')
  else M = q(0)
  if (sign(M) < 0) throw new CalcError('Die molare Masse muss positiv sein.')
  if (!opts.value) throw new CalcError('Bitte einen Wert eingeben.')
  const x = opts.value.q
  if (sign(x) <= 0) throw new CalcError('Der Wert muss größer als 0 sein.')
  let n: Q
  if (opts.given === 'm') {
    const f = fac(MASS_U, opts.unit)
    const m = mul(x, f)
    if (opts.unit !== 'g') steps.push({ tex: `m = ${qTex(x, F)}${T(opts.unit)} = ${nt(m)}${T('g')}`, note: 'Masse in Gramm umrechnen.', head: 'Einheiten' })
    n = div(m, M)
    steps.push({ tex: `n = \\frac{m}{M} = \\frac{${nt(m)}${T('g')}}{${m2(M)}${T('g/mol')}} ${eqv(n)}${T('mol')}`, note: 'Gramm kürzt sich weg, übrig bleibt mol.', head: 'Stoffmenge' })
  } else if (opts.given === 'n') {
    const f = fac(MOL_U, opts.unit)
    n = mul(x, f)
    if (opts.unit !== 'mol') steps.push({ tex: `n = ${qTex(x, F)}${T(opts.unit)} = ${nt(n)}${T('mol')}`, note: 'Stoffmenge in mol umrechnen.', head: 'Einheiten' })
  } else {
    n = div(x, NA)
    steps.push({ tex: `n = \\frac{N}{N_A} = \\frac{${nt(x)}}{6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1}} ${eqv(n)}${T('mol')}`, note: 'Avogadro-Konstante: 1 mol enthält $6{,}022 \\cdot 10^{23}$ Teilchen.', head: 'Stoffmenge' })
  }
  const res: string[] = []
  const nb = best(n, MOL_U)
  res.push(`n ${eqv(nb.v)}${T(nb.u)}`)
  if (opts.given !== 'm' && !isZero(M)) {
    const m = mul(n, M)
    steps.push({ tex: `m = n \\cdot M = ${nt(n)}${T('mol')} \\cdot ${m2(M)}${T('g/mol')} ${eqv(m)}${T('g')}`, note: 'mol kürzt sich weg, übrig bleibt Gramm.', head: 'Masse' })
    const mb = best(m, MASS_U)
    if (mb.u !== 'g') steps.push({ tex: `m ${eqv(m)}${T('g')} ${eqv(mb.v)}${T(mb.u)}` })
    res.push(`m ${eqv(mb.v)}${T(mb.u)}`)
  }
  if (opts.given !== 'N') {
    const N = mul(n, NA)
    steps.push({ tex: `N = n \\cdot N_A = ${nt(n)}${T('mol')} \\cdot 6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1} \\approx ${approxTex(toNum(N), 4)}`, note: 'Teilchenzahl: Stoffmenge mal Avogadro-Konstante.', head: 'Teilchenzahl' })
    res.push(`N \\approx ${approxTex(toNum(N), 4)}`)
  }
  if (!isZero(M)) {
    const one = div(M, NA)
    res.push(`m_{\\text{Teilchen}} \\approx ${approxTex(toNum(one), 4)}${T('g')}`)
  }
  steps[steps.length - 1].final = true
  return { result: res.slice(0, 3).join(',\\quad '), steps, extra: [`M(${fTex}) = ${m2(M)}${T('g/mol')}`, ...res.slice(3)] }
}

/** Massen- und Atomprozente einer Verbindung */
export function composition(formula: string): Solution {
  const mm = molarMass(formula)
  const steps: Step[] = [mm.step]
  const atoms = mm.parts.reduce((s, p) => s + p.n, 0)
  mm.parts.forEach((p, i) => {
    const part = mul(q(p.n), p.m)
    const w = mul(div(part, mm.M), q(100))
    steps.push({ tex: `w(\\mathrm{${p.sym}}) = \\frac{${p.n === 1 ? '' : `${p.n} \\cdot `}${m2(p.m)}}{${m2(mm.M)}} \\cdot 100\\,\\% \\approx ${approxTex(toNum(w), 4)}\\,\\%`, head: i === 0 ? 'Massenprozent' : undefined, note: i === 0 ? 'Masse des Elements in der Formel geteilt durch die molare Masse.' : undefined })
  })
  steps.push({ tex: `\\text{Atome pro Formeleinheit: } ${mm.parts.map((p) => p.n).join(' + ')} = ${atoms}`, head: 'Atomprozent', note: 'Atom-% zählt nur die Anzahl der Atome – die Masse spielt keine Rolle.' })
  mm.parts.forEach((p) => {
    const a = mul(div(q(p.n), q(atoms)), q(100))
    steps.push({ tex: `\\mathrm{${p.sym}}\\colon\\ \\frac{${p.n}}{${atoms}} \\cdot 100\\,\\% ${eqv(a)}\\,\\%` })
  })
  steps[steps.length - 1].final = true
  return { result: `M(${mm.formula}) = ${m2(mm.M)}${T('g/mol')}`, steps }
}

/* ---------------------------- Lösung ansetzen ---------------------------- */

export function solution(opts: { formula?: string; M?: NumIn | null; c: NumIn | null; cu: string; V: NumIn | null; vu: string; m: NumIn | null; mu: string }): Solution {
  const steps: Step[] = []
  let M: Q
  if (opts.formula?.trim()) {
    const mm = molarMass(opts.formula)
    M = mm.M
    steps.push(mm.step)
  } else if (opts.M) {
    M = opts.M.q
    steps.push({ tex: `M = ${m2(M)}${T('g/mol')}`, head: 'Molare Masse' })
  } else throw new CalcError('Bitte eine Summenformel oder die molare Masse angeben.')
  const given = [opts.c, opts.V, opts.m].filter(Boolean).length
  if (given !== 2) throw new CalcError('Bitte genau zwei der drei Größen c, V und m eingeben.')
  const conv: string[] = []
  const c = opts.c ? mul(opts.c.q, fac(CONC_U, opts.cu)) : null
  const V = opts.V ? mul(opts.V.q, fac(VOL_U, opts.vu)) : null
  const m = opts.m ? mul(opts.m.q, fac(MASS_U, opts.mu)) : null
  if (opts.c && opts.cu !== 'mol/L') conv.push(`c = ${qTex(opts.c.q, F)}${T(opts.cu)} = ${nt(c!)}${T('mol/L')}`)
  if (opts.V && opts.vu !== 'L') conv.push(`V = ${qTex(opts.V.q, F)}${T(opts.vu)} = ${nt(V!)}${T('L')}`)
  if (opts.m && opts.mu !== 'g') conv.push(`m = ${qTex(opts.m.q, F)}${T(opts.mu)} = ${nt(m!)}${T('g')}`)
  if (conv.length) steps.push({ tex: conv.join(', \\quad '), head: 'Einheiten', note: 'Konzentration in mol/L, Volumen in Liter, Masse in Gramm.' })
  if (c && V) {
    const n = mul(c, V)
    steps.push({ tex: `n = c \\cdot V = ${nt(c)}${T('mol/L')} \\cdot ${nt(V)}${T('L')} ${eqv(n)}${T('mol')}`, head: 'Stoffmenge', note: 'So viel Stoff muss in die Lösung.' })
    const mm = mul(n, M)
    steps.push({ tex: `m = n \\cdot M = ${nt(n)}${T('mol')} \\cdot ${m2(M)}${T('g/mol')} ${eqv(mm)}${T('g')}`, head: 'Einwaage', note: 'Einwiegen, im Messkolben lösen und bis zur Marke auffüllen.', final: true })
    const b = best(mm, MASS_U)
    return { result: `m ${eqv(b.v)}${T(b.u)}`, steps, extra: [`m = c \\cdot V \\cdot M`], remark: `Ansetzen: $${nt(b.v)}${T(b.u)}$ einwiegen, lösen und im Messkolben auf $${qTex(opts.V!.q, F)}${T(opts.vu)}$ auffüllen.` }
  }
  if (m && V) {
    const n = div(m, M)
    steps.push({ tex: `n = \\frac{m}{M} = \\frac{${nt(m)}${T('g')}}{${m2(M)}${T('g/mol')}} ${eqv(n)}${T('mol')}`, head: 'Stoffmenge' })
    const cc = div(n, V)
    steps.push({ tex: `c = \\frac{n}{V} = \\frac{${nt(n)}${T('mol')}}{${nt(V)}${T('L')}} ${eqv(cc)}${T('mol/L')}`, head: 'Konzentration', final: true })
    const b = best(cc, CONC_U)
    return { result: `c ${eqv(b.v)}${T(b.u)}`, steps }
  }
  const n = div(m!, M)
  steps.push({ tex: `n = \\frac{m}{M} = \\frac{${nt(m!)}${T('g')}}{${m2(M)}${T('g/mol')}} ${eqv(n)}${T('mol')}`, head: 'Stoffmenge' })
  const VV = div(n, c!)
  steps.push({ tex: `V = \\frac{n}{c} = \\frac{${nt(n)}${T('mol')}}{${nt(c!)}${T('mol/L')}} ${eqv(VV)}${T('L')}`, head: 'Volumen', final: true })
  const b = best(VV, VOL_U)
  return { result: `V ${eqv(b.v)}${T(b.u)}`, steps }
}

/* ---------------------------- Verdünnen ---------------------------- */

export function dilution(c1: NumIn | null, V1: NumIn | null, c2: NumIn | null, V2: NumIn | null, cu: string, vu: string): Solution {
  const vals = [c1, V1, c2, V2]
  if (vals.filter(Boolean).length !== 3) throw new CalcError('Bitte genau drei der vier Werte eingeben.')
  const steps: Step[] = [{ tex: 'c_1 \\cdot V_1 = c_2 \\cdot V_2', head: 'Verdünnungsgleichung', note: 'Beim Verdünnen bleibt die Stoffmenge gleich – es kommt nur Lösungsmittel dazu.' }]
  const ct = T(cu)
  const vt = T(vu)
  let res: string
  let a: Q
  let b: Q
  if (!V2) {
    const v = div(mul(c1!.q, V1!.q), c2!.q)
    steps.push({ tex: `V_2 = \\frac{c_1 \\cdot V_1}{c_2} = \\frac{${qTex(c1!.q, F)}${ct} \\cdot ${qTex(V1!.q, F)}${vt}}{${qTex(c2!.q, F)}${ct}} ${eqv(v)}${vt}`, note: 'Nach $V_2$ umgestellt.', final: true })
    res = `V_2 ${eqv(v)}${vt}`
    a = V1!.q
    b = v
  } else if (!c2) {
    const c = div(mul(c1!.q, V1!.q), V2.q)
    steps.push({ tex: `c_2 = \\frac{c_1 \\cdot V_1}{V_2} = \\frac{${qTex(c1!.q, F)}${ct} \\cdot ${qTex(V1!.q, F)}${vt}}{${qTex(V2.q, F)}${vt}} ${eqv(c)}${ct}`, note: 'Nach $c_2$ umgestellt.', final: true })
    res = `c_2 ${eqv(c)}${ct}`
    a = V1!.q
    b = V2.q
  } else if (!V1) {
    const v = div(mul(c2.q, V2.q), c1!.q)
    steps.push({ tex: `V_1 = \\frac{c_2 \\cdot V_2}{c_1} = \\frac{${qTex(c2.q, F)}${ct} \\cdot ${qTex(V2.q, F)}${vt}}{${qTex(c1!.q, F)}${ct}} ${eqv(v)}${vt}`, note: 'So viel der konzentrierten Lösung abmessen.', final: true })
    res = `V_1 ${eqv(v)}${vt}`
    a = v
    b = V2.q
  } else {
    const c = div(mul(c2.q, V2.q), V1.q)
    steps.push({ tex: `c_1 = \\frac{c_2 \\cdot V_2}{V_1} = \\frac{${qTex(c2.q, F)}${ct} \\cdot ${qTex(V2.q, F)}${vt}}{${qTex(V1.q, F)}${vt}} ${eqv(c)}${ct}`, note: 'Nach $c_1$ umgestellt.', final: true })
    res = `c_1 ${eqv(c)}${ct}`
    a = V1.q
    b = V2.q
  }
  const extra: string[] = []
  if (sign(sub(b, a)) > 0) {
    const w = sub(b, a)
    steps.push({ tex: `V_{\\text{Wasser}} = V_2 - V_1 ${eqv(b)} - ${nt(a)} ${eqv(w)}${vt}`, head: 'Lösungsmittel', note: 'So viel Lösungsmittel kommt dazu (bei verdünnten wässrigen Lösungen näherungsweise).' })
    extra.push(`V_{\\text{Wasser}} ${eqv(w)}${vt}`)
    const k = div(b, a)
    extra.push(`\\text{Verdünnung } 1 : ${nt(k, 3)}`)
  } else if (sign(sub(b, a)) < 0) throw new CalcError('Beim Verdünnen muss das Endvolumen größer werden – prüfe die Werte.')
  return { result: res, steps, extra }
}

/* ---------------------------- Mischen ---------------------------- */

/** Mischungskreuz: aus w₁ und w₂ eine Lösung mit w_Z herstellen */
export function mixCross(w1: NumIn | null, w2: NumIn | null, wz: NumIn | null, total: NumIn | null, unit = 'g'): Solution {
  if (!w1 || !w2 || !wz) throw new CalcError('Bitte beide Ausgangskonzentrationen und die Zielkonzentration eingeben.')
  const a = w1.q
  const b = w2.q
  const z = wz.q
  const lo = toNum(a) < toNum(b) ? a : b
  const hi = lo === a ? b : a
  if (!(toNum(z) > toNum(lo) && toNum(z) < toNum(hi))) throw new CalcError('Die Zielkonzentration muss zwischen den beiden Ausgangskonzentrationen liegen.')
  const p1 = sub(z, b) // Teile Lösung 1
  const p2 = sub(a, z) // Teile Lösung 2
  const t1 = sign(p1) < 0 ? neg(p1) : p1
  const t2 = sign(p2) < 0 ? neg(p2) : p2
  const P = (x: Q) => `${qTex(x, F)}\\,\\%`
  const steps: Step[] = []
  steps.push({
    tex: `\\begin{array}{ccccc} ${P(a)} & & & & ${qTex(t1, F)}\\ \\text{Teile} \\\\ & \\searrow & & \\nearrow & \\\\ & & ${P(z)} & & \\\\ & \\nearrow & & \\searrow & \\\\ ${P(b)} & & & & ${qTex(t2, F)}\\ \\text{Teile} \\end{array}`,
    head: 'Mischungskreuz',
    note: `Links die Ausgangslösungen, in der Mitte das Ziel. Über Kreuz die Differenzen bilden (immer größere minus kleinere Zahl): $|${qTex(z, F)} - ${qTex(b, F)}| = ${qTex(t1, F)}$ Teile der ${qTex(a, F).replace('{,}', ',')}-%-Lösung, $|${qTex(a, F)} - ${qTex(z, F)}| = ${qTex(t2, F)}$ Teile der ${qTex(b, F).replace('{,}', ',')}-%-Lösung.`,
  })
  const g = (() => {
    // Verhältnis kürzen (auch bei Kommazahlen)
    const r = div(t1, t2)
    return { x: r.n, y: r.d }
  })()
  const sumT = add(t1, t2)
  steps.push({ tex: `m_1 : m_2 = ${qTex(t1, F)} : ${qTex(t2, F)} = ${g.x} : ${g.y}`, head: 'Mischungsverhältnis', note: 'Das Verhältnis der Massen (gekürzt).' })
  const extra = [`\\text{Insgesamt } ${qTex(sumT, F)} \\text{ Teile}`]
  if (total) {
    const m = total.q
    const m1 = div(mul(m, t1), sumT)
    const m2 = div(mul(m, t2), sumT)
    const u = T(unit)
    steps.push({ tex: `m_1 = \\frac{${qTex(t1, F)}}{${qTex(sumT, F)}} \\cdot ${qTex(m, F)}${u} ${eqv(m1)}${u}, \\quad m_2 = \\frac{${qTex(t2, F)}}{${qTex(sumT, F)}} \\cdot ${qTex(m, F)}${u} ${eqv(m2)}${u}`, head: 'Mengen', note: `Die Gesamtmenge im Verhältnis aufteilen: ein Teil sind $${qTex(m, F)} : ${qTex(sumT, F)} ${eqv(div(m, sumT))}${u}$.` })
    const check = div(add(mul(m1, a), mul(m2, b)), m)
    steps.push({ tex: `\\text{Probe: } \\frac{${nt(m1)} \\cdot ${qTex(a, F)} + ${nt(m2)} \\cdot ${qTex(b, F)}}{${qTex(m, F)}} ${eqv(check)}\\,\\%\\ \\checkmark`, note: 'Mischungsgleichung: Gesamt-Stoff durch Gesamtmasse.', final: true })
    return { result: `m_1 ${eqv(m1)}${u},\\quad m_2 ${eqv(m2)}${u}`, steps, extra }
  }
  steps[steps.length - 1].final = true
  return { result: `m_1 : m_2 = ${g.x} : ${g.y}`, steps, extra }
}

/** Mischung berechnen: w_M = (m₁w₁ + m₂w₂)/(m₁ + m₂) – auch für Mischtemperaturen */
export function mixResult(m1: NumIn | null, x1: NumIn | null, m2: NumIn | null, x2: NumIn | null, kind: 'w' | 'T', unit = 'g'): Solution {
  if (!m1 || !x1 || !m2 || !x2) throw new CalcError('Bitte alle vier Werte eingeben.')
  const u = T(unit)
  const xu = kind === 'w' ? '\\,\\%' : '\\,^{\\circ}\\text{C}'
  const name = kind === 'w' ? 'w' : 'T'
  const sumM = add(m1.q, m2.q)
  if (isZero(sumM)) throw new CalcError('Die Gesamtmenge darf nicht 0 sein.')
  const top = add(mul(m1.q, x1.q), mul(m2.q, x2.q))
  const r = div(top, sumM)
  const steps: Step[] = [
    {
      tex: `${name}_M = \\frac{m_1 \\cdot ${name}_1 + m_2 \\cdot ${name}_2}{m_1 + m_2}`,
      head: kind === 'w' ? 'Mischungsgleichung' : 'Mischtemperatur (Richmann)',
      note: kind === 'w' ? 'Gesamtmenge Stoff geteilt durch Gesamtmasse – ein gewichteter Mittelwert.' : 'Gewichteter Mittelwert der Temperaturen (gleicher Stoff, keine Wärmeverluste).',
    },
    {
      tex: `${name}_M = \\frac{${qTex(m1.q, F)}${u} \\cdot ${qTex(x1.q, F)}${xu} + ${qTex(m2.q, F)}${u} \\cdot ${qTex(x2.q, F)}${xu}}{${qTex(m1.q, F)}${u} + ${qTex(m2.q, F)}${u}}`,
      note: 'Werte einsetzen.',
    },
    { tex: `${name}_M = \\frac{${nt(top, 6)}}{${qTex(sumM, F)}} ${eqv(r)}${xu}`, final: true },
  ]
  return { result: `${name}_M ${eqv(r)}${xu}`, steps }
}

export { bgcd }
