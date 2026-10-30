/**
 * Logarithmen & Exponentialgleichungen: log_b(x) mit Basiswechsel (exakt, wenn x eine Potenz von b ist),
 * Delogarithmieren x = b^y, Gleichungen a · b^x + d = c mit Probe und Wachstum/Zerfall
 * N = N₀ · b^(t/T) (Verdopplungszeit b = 2, Halbwertszeit b = ½).
 * Exakte Brüche, wo es geht; Logarithmen und krumme Potenzen mit Gleitkommazahlen.
 */
import { CalcError, div, eq, isInt, isTerminating, isZero, mul, neg, ONE, q, qFromRaw, qpow, qRoot, qTex, sign, sub, toNum, ZERO, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { F, fnt, num, T, type Unit } from './units'

/* ---------------------------- Anzeige ---------------------------- */

function numQ(x: Q, sig = 4): { t: string; approx: boolean } {
  if (isZero(x)) return { t: '0', approx: false }
  const r = num(x, sig)
  if (!r.approx || !isTerminating(x)) return r
  const back = qFromRaw(Math.abs(toNum(x)).toPrecision(sig))
  return { t: r.t, approx: !eq(sign(x) < 0 ? neg(back) : back, x) }
}
const nt = (x: Q, sig = 4) => numQ(x, sig).t
const eqv = (x: Q, sig = 4) => {
  const r = numQ(x, sig)
  return `${r.approx ? '\\approx' : '='} ${r.t}`
}
/** Eingabewert wie eingegeben (Dezimalzahl oder Bruch) */
const tx = (x: Q) => qTex(x, F)
/** feste Nachkommastellen mit Dezimalkomma */
function fix(x: number, d = 4): string {
  const s = Math.abs(x).toFixed(d)
  const [i, f] = s.split('.')
  const ii = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : i
  return (x < 0 && Number(s) !== 0 ? '-' : '') + ii + (f ? `{,}${f}` : '')
}
/** Logarithmus im Rechenweg: ganze Zahlen ohne Nachkommastellen (lg 1000 = 3), sonst vier */
const fixL = (x: number) => (Math.abs(x - Math.round(x)) < 1e-12 ? String(Math.round(x)) : fix(x))
const fixEq = (x: number, d = 4) => `${Math.abs(x - Number(x.toFixed(d))) > 1e-12 * Math.max(1, Math.abs(x)) ? '\\approx' : '='} ${fix(x, d)}`
/** Gleitkommazahl mit `sig` Ziffern; 0 genau */
const ft = (x: number, sig = 4) => (x === 0 ? '0' : fnt(x, sig))
const feq = (x: number, sig = 4) => {
  if (x === 0) return '= 0'
  const exact = Math.abs(x - Number(x.toPrecision(sig))) <= 1e-12 * Math.abs(x)
  return `${exact ? '=' : '\\approx'} ${fnt(x, sig)}`
}
const lg = Math.log10

/** Logarithmus/Potenz mit Zahlen für das Diagramm y = log_b(x) */
export interface LogOut extends Solution {
  plot: { b: number; x: number; y: number }
}
/** Exponentialgleichung a · b^x + d = c mit Zahlen für das Diagramm */
export interface ExpOut extends Solution {
  plot: { a: number; b: number; c: number; d: number; x: number }
}
/** Wachstum/Zerfall; Zeiten in der Arbeitseinheit `unit` */
export interface GrowthOut extends Solution {
  plot: { N0: number; N: number; t: number; T: number; unit: string; grow: boolean }
}

/** Einheit aus freier Eingabe (ohne TeX-Sonderzeichen) */
export const cleanUnit = (u = '') => u.replace(/[\\{}$_^#&~]/g, '').trim().slice(0, 24)

/** Basis als TeX für Potenzen: Brüche in Klammern */
export function baseTex(b: Q): string {
  if (isInt(b) && sign(b) > 0) return qTex(b, F)
  if (isTerminating(b) && sign(b) > 0) return qTex(b, F)
  return `\\left(${qTex(b, F)}\\right)`
}

/** Zahl als Argument eines Logarithmus: Brüche und Negatives in Klammern */
const argTex = (x: Q) => (isInt(x) || isTerminating(x) ? tx(x) : `\\left(${tx(x)}\\right)`)

/** lg eines positiven Bruchs – auch für riesige Zähler/Nenner (über die Ziffernzahl der BigInts) */
export function lgQ(x: Q): number {
  const lgBig = (n: bigint) => {
    const s = (n < 0n ? -n : n).toString()
    const k = Math.min(17, s.length)
    return Math.log10(Number(s.slice(0, k))) + (s.length - k)
  }
  return lgBig(x.n) - lgBig(x.d)
}

/** k mit b^k = x exakt (k = p/m mit kleinem Nenner m ≤ 12) – sonst null */
export function exactLog(x: Q, b: Q): Q | null {
  if (sign(x) <= 0 || sign(b) <= 0 || eq(b, ONE)) return null
  const kf = lgQ(x) / lgQ(b)
  if (!Number.isFinite(kf)) return null
  for (let m = 1; m <= 12; m++) {
    const p = Math.round(kf * m)
    if (Math.abs(kf * m - p) > 1e-7 * Math.max(1, Math.abs(kf * m))) continue
    if (Math.abs(p) > 400) return null
    try {
      if (eq(qpow(x, m), qpow(b, p))) return q(p, m)
    } catch {
      return null
    }
  }
  return null
}

/* ---------------------------- Basen ---------------------------- */

export type LogBase = '10' | 'e' | '2' | 'b'

interface Base {
  /** null = e */
  b: Q | null
  v: number
  /** Logarithmus-Operator als TeX */
  log: string
  /** Potenz b^{y} als TeX */
  pow: (y: string) => string
  /** Basis in Worten */
  name: string
}

function getBase(kind: LogBase, bIn?: NumIn | null): Base {
  if (kind === '10') return { b: q(10), v: 10, log: '\\lg', pow: (y) => `10^{${y}}`, name: '10' }
  if (kind === 'e') return { b: null, v: Math.E, log: '\\ln', pow: (y) => `e^{${y}}`, name: 'e' }
  if (kind === '2') return { b: q(2), v: 2, log: '\\log_{2}', pow: (y) => `2^{${y}}`, name: '2' }
  if (!bIn) throw new CalcError('Bitte eine Basis b eingeben (b > 0, b ≠ 1).')
  const b = bIn.q
  if (sign(b) <= 0) throw new CalcError('Die Basis b muss größer als 0 sein.')
  if (eq(b, ONE)) throw new CalcError('Die Basis 1 geht nicht: $1^y = 1$ für jedes y.')
  const bt = baseTex(b)
  return { b, v: toNum(b), log: `\\log_{${tx(b)}}`, pow: (y) => `${bt}^{${y}}`, name: tx(b) }
}

/** Potenz ausgeschrieben, z. B. 10^{3} = 10 · 10 · 10 = 1000 (nur kleine ganze Hochzahlen) */
function expand(b: Q, k: number): string | null {
  if (!isInt(b) || Math.abs(k) < 2 || Math.abs(k) > 6) return null
  const prod = Array(Math.abs(k)).fill(tx(b)).join(' \\cdot ')
  const val = qpow(b, Math.abs(k))
  return k > 0 ? `${prod} = ${tx(val)}` : `\\frac{1}{${prod}} = \\frac{1}{${tx(val)}}`
}

/* ---------------------------- a) Logarithmus berechnen ---------------------------- */

export function logCalc(o: { base: LogBase; b?: NumIn | null; x: NumIn | null }): LogOut {
  const B = getBase(o.base, o.b)
  if (!o.x) throw new CalcError('Bitte die Zahl x eingeben, deren Logarithmus gesucht ist.')
  const x = o.x.q
  if (sign(x) <= 0) throw new CalcError('Logarithmen gibt es nur von positiven Zahlen – x muss größer als 0 sein.')
  const xt = argTex(x)
  const L = `${B.log} ${xt}`
  const steps: Step[] = []
  steps.push({
    tex: `${L} = y \\iff ${B.pow('y')} = ${tx(x)}`,
    head: 'Definition',
    note: `Der Logarithmus ist eine Hochzahl: Gesucht ist die Zahl $y$, mit der man $${B.name}$ potenzieren muss, um $${tx(x)}$ zu erhalten.${B.b ? '' : ' Dabei ist $e \\approx 2{,}71828$ die Eulersche Zahl.'}`,
  })
  const lx = lgQ(x)
  const xv = 10 ** lx
  const y = lx / lg(B.v)
  const extra: string[] = []
  if (o.base !== '10') extra.push(`\\lg ${xt} ${fixEq(lx)}`)
  if (o.base !== 'e') extra.push(`\\ln ${xt} ${fixEq(lx / lg(Math.E))}`)
  // exakt?
  const k = B.b ? exactLog(x, B.b) : eq(x, ONE) ? ZERO : null
  if (k) {
    // Hochzahl als Bruch (3/2), bei abbrechenden Brüchen zusätzlich als Dezimalzahl
    const kt = qTex(k)
    const kd = !isInt(k) && isTerminating(k) ? ` = ${tx(k)}` : ''
    const ex = B.b && isInt(k) ? expand(B.b, Number(k.n)) : null
    steps.push({
      tex: `${tx(x)} = ${B.pow(kt)} \\;\\Rightarrow\\; ${L} = ${kt}${kd}`,
      head: 'Als Potenz schreiben',
      note: isZero(k)
        ? `Jede Zahl hoch 0 ergibt 1 – deshalb ist der Logarithmus von 1 immer 0.`
        : isInt(k)
          ? `$${tx(x)}$ ist eine Potenz von $${B.name}$ – das Ergebnis ist exakt.`
          : `$${tx(x)}$ ist eine Potenz von $${B.name}$ mit gebrochener Hochzahl: $${B.pow(kt)} = \\sqrt[${k.d}]{${B.pow(String(k.n))}}$ – das Ergebnis ist exakt.`,
      final: true,
    })
    if (ex) steps.push({ tex: `${B.pow(kt)} = ${ex}${sign(k) < 0 && !tx(x).startsWith('\\frac') ? ` = ${tx(x)}` : ''}\\ \\checkmark`, head: 'Probe', note: 'Die Potenz ausrechnen – es kommt genau die Zahl heraus.' })
    return { plot: { b: B.v, x: xv, y }, result: `${L} = ${kt}${kd}`, extra, steps, remark: 'Logarithmengesetze: $\\log(a \\cdot b) = \\log a + \\log b$, $\\log \\frac{a}{b} = \\log a - \\log b$, $\\log a^n = n \\cdot \\log a$.' }
  }
  if (o.base === '10' && Math.abs(lx) > 300) {
    steps.push({ tex: `${L} ${fixEq(y)}`, head: 'Ausrechnen', note: 'Die Zahl ist so groß bzw. klein, dass man den Logarithmus an der Stellenzahl abliest: Die Hochzahl der Zehnerpotenz ist der ganzzahlige Teil.', final: true })
  } else if (o.base === '10') {
    const e = Math.floor(lx + 1e-12)
    const lo = qpow(q(10), e)
    const hi = qpow(q(10), e + 1)
    steps.push({
      tex: `10^{${e}} = ${nt(lo, 8)} < ${tx(x)} < ${nt(hi, 8)} = 10^{${e + 1}} \\;\\Rightarrow\\; ${e} < ${L} < ${e + 1}`,
      head: 'Abschätzen',
      note: 'Zwischen welchen Zehnerpotenzen liegt die Zahl? Dazwischen liegt auch ihr Logarithmus.',
    })
    if (e !== 0) {
      const m = div(x, lo)
      const lm = lg(toNum(m))
      steps.push({
        tex: `${L} = \\lg\\left(${nt(m, 8)} \\cdot 10^{${e}}\\right) = \\lg ${argTex(m)} ${e < 0 ? '-' : '+'} ${Math.abs(e)}`,
        head: 'Zerlegen',
        note: 'Logarithmengesetz $\\lg(a \\cdot b) = \\lg a + \\lg b$ und $\\lg 10^{k} = k$: Die Hochzahl der Zehnerpotenz wird einfach addiert.',
      })
      steps.push({ tex: `${L} \\approx ${fix(lm)} ${e < 0 ? '-' : '+'} ${Math.abs(e)} ${fixEq(y)}`, head: 'Ausrechnen', note: `Nur $\\lg ${argTex(m)}$ braucht den Taschenrechner (lg-Taste).`, final: true })
    } else steps.push({ tex: `${L} ${fixEq(y)}`, head: 'Ausrechnen', note: 'Mit der lg-Taste des Taschenrechners.', final: true })
  } else if (o.base === 'e') {
    steps.push({
      tex: `${L} = \\frac{\\lg ${xt}}{\\lg e} \\approx \\frac{${fixL(lx)}}{${fixL(lg(Math.E))}} ${fixEq(y)}`,
      head: 'Basiswechsel',
      note: 'Mit der ln-Taste direkt – oder über den Zehnerlogarithmus: $\\ln x = \\frac{\\lg x}{\\lg e} \\approx 2{,}3026 \\cdot \\lg x$.',
      final: true,
    })
  } else {
    if (B.b && isInt(B.b) && toNum(B.b) >= 2) {
      const e = Math.floor(y + 1e-12)
      if (e >= -12 && e <= 40) {
        const lo = qpow(B.b, e)
        const hi = qpow(B.b, e + 1)
        steps.push({
          tex: `${B.pow(String(e))} = ${nt(lo, 8)} < ${tx(x)} < ${nt(hi, 8)} = ${B.pow(String(e + 1))} \\;\\Rightarrow\\; ${e} < ${L} < ${e + 1}`,
          head: 'Abschätzen',
          note: `Zwischen welchen Potenzen von $${B.name}$ liegt die Zahl?`,
        })
      }
    }
    steps.push({
      tex: `${L} = \\frac{\\lg ${xt}}{\\lg ${B.name}} \\approx \\frac{${fixL(lx)}}{${fixL(lg(B.v))}} ${fixEq(y)}`,
      head: 'Basiswechsel',
      note: 'Taschenrechner haben meist nur lg und ln – mit dem Basiswechsel $\\log_b x = \\frac{\\lg x}{\\lg b}$ geht jede Basis (mit ln statt lg kommt dasselbe heraus).',
      final: true,
    })
  }
  const yr = Number(y.toFixed(4))
  const back = B.v ** yr
  if (Number.isFinite(back) && back > 0) steps.push({ tex: `${B.pow(fix(yr))} ${feq(back)}`, head: 'Probe', note: `Mit dem gerundeten Logarithmus kommt ungefähr wieder $${tx(x)}$ heraus.` })
  return { plot: { b: B.v, x: xv, y }, result: `${L} ${fixEq(y)}`, extra, steps, remark: 'Logarithmengesetze: $\\log(a \\cdot b) = \\log a + \\log b$, $\\log \\frac{a}{b} = \\log a - \\log b$, $\\log a^n = n \\cdot \\log a$.' }
}

/* ---------------------------- a') Delogarithmieren ---------------------------- */

/** x = b^y (Umkehrung des Logarithmus) */
export function powCalc(o: { base: LogBase; b?: NumIn | null; y: NumIn | null }): LogOut {
  const B = getBase(o.base, o.b)
  if (!o.y) throw new CalcError('Bitte den Logarithmus y eingeben.')
  const y = o.y.q
  const yv = toNum(y)
  const yt = tx(y)
  const steps: Step[] = []
  steps.push({ tex: `${B.log} x = ${yt} \\iff x = ${B.pow(yt)}`, head: 'Definition', note: 'Delogarithmieren: Die Basis wird mit dem Logarithmus potenziert – die Umkehrung des Logarithmierens.' })
  if (o.base !== '10' && Math.abs(yv * lg(B.v)) > 300) throw new CalcError('Das Ergebnis liegt außerhalb des darstellbaren Bereichs (größer als $10^{300}$ oder kleiner als $10^{-300}$).')
  if (o.base === '10' && Math.abs(yv) > 10000) throw new CalcError('Die Hochzahl ist zu groß – eine Zehnerpotenz mit mehr als 10 000 Stellen gibt es in der Praxis nicht.')
  // exakt: ganze oder gebrochene Hochzahl mit exakter Wurzel
  let xq: Q | null = null
  if (B.b && Math.abs(yv * lg(B.v)) <= 300) {
    if (isInt(y)) xq = qpow(B.b, Number(y.n))
    else if (y.d <= 12n && (y.n < 0n ? -y.n : y.n) <= 400n) xq = qRoot(qpow(B.b, Number(y.n)), Number(y.d))
  }
  let result: string
  let xv: number
  /** lg des angezeigten (gerundeten) Ergebnisses für die Probe */
  let lgShown: number
  if (xq) {
    xv = toNum(xq)
    const ex = isInt(y) ? expand(B.b!, Number(y.n)) : null
    const val = ex ? `= ${ex}${sign(y) < 0 ? ` ${eqv(xq)}` : ''}` : eqv(xq)
    steps.push({ tex: `x = ${B.pow(yt)} ${val}`, head: 'Ausrechnen', note: isInt(y) ? 'Ganze Hochzahl – das Ergebnis ist exakt.' : `Gebrochene Hochzahl: $${B.pow(yt)} = \\sqrt[${y.d}]{${B.pow(String(y.n))}}$ – hier geht die Wurzel genau auf.`, final: true })
    result = `x ${eqv(xq)}`
    lgShown = lgQ(xq)
  } else if (o.base === '10') {
    const e = Math.floor(yv + 1e-12)
    const fq = sub(y, q(e))
    const fv = toNum(fq)
    const m = 10 ** fv
    xv = m * 10 ** e
    lgShown = lg(Number(m.toPrecision(4))) + e
    if (isZero(fq)) {
      steps.push({ tex: `x = 10^{${e}}`, head: 'Ausrechnen', note: 'Ganze Hochzahl – das Ergebnis ist genau eine Zehnerpotenz.', final: true })
      result = `x = 10^{${e}}`
      lgShown = e
    } else if (e === 0) {
      steps.push({ tex: `x = 10^{${yt}} ${feq(m)}`, head: 'Ausrechnen', note: 'Mit der Taste $10^x$ des Taschenrechners.', final: true })
      result = `x ${feq(m)}`
    } else {
      const mt = ft(m)
      steps.push({
        tex: `x = 10^{${yt}} = 10^{${nt(fq, 6)}} \\cdot 10^{${e}} ${feq(m)} \\cdot 10^{${e}}`,
        head: 'Zerlegen',
        note: 'Die Hochzahl in eine ganze Zahl und einen Rest zwischen 0 und 1 zerlegen: $10^{a + k} = 10^{a} \\cdot 10^{k}$. So steht die Zehnerpotenz sofort da – wie beim Umrechnen von pH in $c(\\mathrm{H_3O^+})$.',
        final: true,
      })
      result = Math.abs(e) <= 3 ? `x ${feq(xv)}` : `x \\approx ${mt} \\cdot 10^{${e}}`
    }
  } else {
    xv = B.v ** yv
    steps.push({ tex: `x = ${B.pow(yt)} ${feq(xv)}`, head: 'Ausrechnen', note: o.base === 'e' ? 'Mit der Taste $e^x$ des Taschenrechners.' : 'Mit der Potenz-Taste des Taschenrechners.', final: true })
    result = `x ${feq(xv)}`
    lgShown = lg(Number(xv.toPrecision(4)))
  }
  const back = lgShown / lg(B.v)
  const shown = xq ? nt(xq) : o.base === '10' ? result.replace(/^x (=|\\approx) /, '') : ft(xv)
  steps.push({ tex: `${B.log}\\left(${shown}\\right) ${feq(back, xq ? 6 : 4)}`, head: 'Probe', note: xq ? 'Der Logarithmus des Ergebnisses ergibt wieder $y$.' : 'Der Logarithmus des gerundeten Ergebnisses ergibt ungefähr wieder $y$.' })
  return { plot: { b: B.v, x: xv, y: yv }, result, steps, remark: 'Delogarithmieren braucht man z. B. für $c(\\mathrm{H_3O^+}) = 10^{-\\text{pH}}$ oder $K_S = 10^{-\\text{p}K_S}$.' }
}

/* ---------------------------- b) Exponentialgleichung ---------------------------- */

/** a · b^x + d = c nach x auflösen */
export function expEquation(o: { a?: NumIn | null; b: NumIn | null; c: NumIn | null; d?: NumIn | null }): ExpOut {
  const a = o.a ? o.a.q : ONE
  const d = o.d ? o.d.q : ZERO
  if (!o.b) throw new CalcError('Bitte die Basis b eingeben.')
  if (!o.c) throw new CalcError('Bitte die rechte Seite c eingeben.')
  const b = o.b.q
  const c = o.c.q
  if (isZero(a)) throw new CalcError('a darf nicht 0 sein – sonst steht kein x mehr in der Gleichung.')
  if (sign(b) <= 0) throw new CalcError('Die Basis b muss größer als 0 sein – Potenzen mit negativer Basis sind nicht für jedes x definiert.')
  const rhs = div(sub(c, d), a)
  if (eq(b, ONE)) throw new CalcError(eq(rhs, ONE) ? 'Mit b = 1 ist $1^x = 1$ für jedes x – die Gleichung gilt für alle x.' : 'Mit b = 1 ist $1^x$ immer 1 – die Gleichung hat keine Lösung.')
  const bt = baseTex(b)
  const pw = `${bt}^{x}`
  const aT = eq(a, ONE) ? '' : eq(a, neg(ONE)) ? '-' : `${tx(a)} \\cdot `
  const dT = isZero(d) ? '' : sign(d) > 0 ? ` + ${tx(d)}` : ` - ${tx(neg(d))}`
  const steps: Step[] = []
  steps.push({ tex: `${aT}${pw}${dT} = ${tx(c)}`, head: 'Gleichung', note: 'Ziel: die Potenz mit dem x allein auf eine Seite bringen, dann logarithmieren.' })
  const cd = sub(c, d)
  if (!isZero(d)) steps.push({ tex: `${aT}${pw} = ${tx(cd)}`, op: sign(d) > 0 ? `| -${tx(d)}` : `| +${tx(neg(d))}`, head: 'Potenz freistellen' })
  if (!eq(a, ONE)) steps.push({ tex: `${pw} = ${argTex(rhs)}`, op: `| :${sign(a) < 0 ? `\\left(${tx(a)}\\right)` : tx(a)}`, head: isZero(d) ? 'Potenz freistellen' : undefined })
  if (sign(rhs) <= 0)
    throw new CalcError(`Keine Lösung: $${pw}$ ist für jedes x positiv, müsste hier aber $${tx(rhs)}$ ergeben.`)
  const k = exactLog(rhs, b)
  let xv: number
  let result: string
  if (k) {
    xv = toNum(k)
    steps.push({ tex: `${argTex(rhs)} = ${bt}^{${tx(k)}} \\;\\Rightarrow\\; x = ${tx(k)}`, head: 'Exponentenvergleich', note: 'Die rechte Seite ist eine Potenz derselben Basis – gleiche Basis heißt gleiche Hochzahl. Logarithmieren ist hier nicht nötig.', final: true })
    result = `x = ${tx(k)}`
  } else {
    const lr = lgQ(rhs)
    const lb = lgQ(b)
    xv = lr / lb
    steps.push({ tex: `\\lg\\left(${pw}\\right) = \\lg ${argTex(rhs)}`, op: '| \\lg', head: 'Logarithmieren', note: 'Beide Seiten logarithmieren (hier mit lg; ln geht genauso).' })
    steps.push({ tex: `x \\cdot \\lg ${bt} = \\lg ${argTex(rhs)}`, note: 'Logarithmengesetz $\\lg(a^n) = n \\cdot \\lg a$: Die Hochzahl wird zum Faktor.' })
    steps.push({
      tex: `x = \\frac{\\lg ${argTex(rhs)}}{\\lg ${bt}} \\approx \\frac{${fixL(lr)}}{${fixL(lb)}} ${fixEq(xv)}`,
      op: `| :\\lg ${bt}`,
      head: 'Nach x auflösen',
      final: true,
    })
    result = `x ${fixEq(xv)}`
  }
  const xr = k ? xv : Number(xv.toFixed(4))
  const check = toNum(a) * toNum(b) ** xr + toNum(d)
  if (Number.isFinite(check) && Math.abs(check) < 1e300)
    steps.push({
      tex: `${aT}${bt}^{${k ? tx(k) : fix(xr)}}${dT} ${feq(check, k ? 6 : 4)}\\ \\checkmark`,
      head: 'Probe',
      note: k ? 'Einsetzen ergibt genau die rechte Seite.' : 'Mit dem gerundeten x kommt ungefähr die rechte Seite heraus.',
    })
  return {
    plot: { a: toNum(a), b: toNum(b), c: toNum(c), d: toNum(d), x: xv },
    result,
    steps,
    remark: 'Exponentialgleichungen löst man durch Logarithmieren. Ob lg oder ln ist egal – beim Teilen kürzt sich die Basis des Logarithmus wieder heraus.',
  }
}

/* ---------------------------- c) Wachstum und Zerfall ---------------------------- */

export type GrowthKind = 'verdopplung' | 'halbwert'
export type GrowthWant = 'N' | 'N0' | 't' | 'T'

const tu = (name: string, n: number): Unit => ({ u: name, f: q(n) })
/** Zeiteinheiten (Grundeinheit s); 1 a = 365,25 d */
export const GROWTH_TIME_U: readonly Unit[] = [tu('a', 31_557_600), tu('d', 86_400), tu('h', 3600), tu('min', 60), tu('s', 1)]
const tf = (u: string) => GROWTH_TIME_U.find((x) => x.u === u)?.f ?? ONE

/** passendere Zeiteinheit für große Ergebnisse (z. B. 398 min → 6,64 h) */
function niceTime(v: number, u: string): { v: number; u: string } | null {
  const s = v * toNum(tf(u))
  for (const e of GROWTH_TIME_U) {
    if (e.u === u) return null
    if (s / toNum(e.f) >= 1) return { v: s / toNum(e.f), u: e.u }
  }
  return null
}

export function growth(o: { kind: GrowthKind; N: NumIn | null; N0: NumIn | null; t: NumIn | null; tu: string; T: NumIn | null; Tu: string; unit?: string }): GrowthOut {
  const miss = [o.N, o.N0, o.t, o.T].filter((v) => !v).length
  if (miss !== 1) throw new CalcError('Bitte genau drei der vier Größen $N$, $N_0$, $t$ und $T$ eingeben – die vierte wird berechnet.')
  const want: GrowthWant = !o.N ? 'N' : !o.N0 ? 'N0' : !o.t ? 't' : 'T'
  if (o.N && sign(o.N.q) <= 0) throw new CalcError('Die Menge N muss größer als 0 sein.')
  if (o.N0 && sign(o.N0.q) <= 0) throw new CalcError('Die Anfangsmenge N₀ muss größer als 0 sein.')
  if (o.t && sign(o.t.q) < 0) throw new CalcError('Die Zeit t darf nicht negativ sein.')
  if (o.T && sign(o.T.q) <= 0) throw new CalcError(o.kind === 'halbwert' ? 'Die Halbwertszeit muss größer als 0 sein.' : 'Die Verdopplungszeit muss größer als 0 sein.')
  const grow = o.kind !== 'halbwert'
  const b = grow ? q(2) : q(1, 2)
  const Ts = grow ? 'T_d' : 'T_{1/2}'
  const bt = grow ? '2' : '\\left(\\frac{1}{2}\\right)'
  const u = T(cleanUnit(o.unit))
  const tUnit = GROWTH_TIME_U.some((x) => x.u === o.tu) ? o.tu : 'h'
  const TUnit = GROWTH_TIME_U.some((x) => x.u === o.Tu) ? o.Tu : 'h'
  // Arbeitseinheit: für N und N₀ die kleinere der beiden Zeiteinheiten (die Zahlen bleiben glatt),
  // für t die Einheit von T, für T die Einheit von t – das Ergebnis wird am Ende in die gewählte Einheit umgerechnet.
  const small = toNum(tf(tUnit)) <= toNum(tf(TUnit)) ? tUnit : TUnit
  const wu = want === 't' ? TUnit : want === 'T' ? tUnit : small
  const steps: Step[] = []
  const given: string[] = []
  if (o.N0) given.push(`N_0 = ${tx(o.N0.q)}${u}`)
  if (o.N) given.push(`N = ${tx(o.N.q)}${u}`)
  if (o.t) given.push(`t = ${tx(o.t.q)}${T(tUnit)}`)
  if (o.T) given.push(`${Ts} = ${tx(o.T.q)}${T(TUnit)}`)
  steps.push({
    tex: given.join(',\\quad '),
    head: 'Gegeben',
    note: grow
      ? 'Verdopplungszeit $T_d$ (bei Bakterien: Generationszeit): In dieser Zeit verdoppelt sich die Menge.'
      : 'Halbwertszeit $T_{1/2}$: In dieser Zeit halbiert sich die Menge (z. B. radioaktiver Zerfall, Abbau eines Wirkstoffs).',
  })
  // Zeiten in die Arbeitseinheit
  let t = o.t?.q ?? null
  let TT = o.T?.q ?? null
  const yearNote = [tUnit, TUnit].includes('a') ? ' (1 a = 365,25 d)' : ''
  let converted = false
  if (t && tUnit !== wu) {
    const conv = mul(t, div(tf(tUnit), tf(wu)))
    steps.push({ tex: `t = ${tx(t)}${T(tUnit)} ${eqv(conv, 6)}${T(wu)}`, head: 'Einheiten umrechnen', note: `Beide Zeiten in derselben Einheit${yearNote}.` })
    t = conv
    converted = true
  }
  if (TT && TUnit !== wu) {
    const conv = mul(TT, div(tf(TUnit), tf(wu)))
    steps.push({ tex: `${Ts} = ${tx(TT)}${T(TUnit)} ${eqv(conv, 6)}${T(wu)}`, head: converted ? undefined : 'Einheiten umrechnen', note: converted ? undefined : `Beide Zeiten in derselben Einheit${yearNote}.` })
    TT = conv
  }
  const W = T(wu)
  /** Ergebnis aus der Arbeitseinheit in die gewählte Einheit umrechnen */
  const toUnit = (sym: string, xq: Q | null, xv: number, target: string): { res: string; other: string | null } => {
    const here = xq ? eqv(xq) : feq(xv)
    if (target === wu) return { res: here, other: null }
    const f = div(tf(wu), tf(target))
    const yq = xq ? mul(xq, f) : null
    const there = yq ? eqv(yq) : feq(xv * toNum(f))
    steps.push({ tex: `${sym} ${here}${W} ${there}${T(target)}`, head: 'Einheit umrechnen', note: `In die gewählte Einheit umrechnen${yearNote}.`, final: true })
    return { res: there, other: here }
  }
  steps.push({ tex: `N = N_0 \\cdot ${bt}^{\\frac{t}{${Ts}}}`, head: 'Formel', note: grow ? 'Nach jeder Verdopplungszeit ist die Menge doppelt so groß.' : 'Nach jeder Halbwertszeit ist nur noch die Hälfte da.' })
  const extra: string[] = []
  let result: string
  const plot = { N0: o.N0 ? toNum(o.N0.q) : 0, N: o.N ? toNum(o.N.q) : 0, t: t ? toNum(t) : 0, T: TT ? toNum(TT) : 0, unit: wu, grow }
  const powQ = (k: Q): { q: Q | null; v: number } => {
    if (isInt(k) && Math.abs(toNum(k)) <= 200) return { q: qpow(b, Number(k.n)), v: toNum(qpow(b, Number(k.n))) }
    return { q: null, v: toNum(b) ** toNum(k) }
  }
  if (want === 'N' || want === 'N0') {
    const k = div(t!, TT!)
    if (toNum(k) > 1000)
      throw new CalcError(`Das sind mehr als 1000 ${grow ? 'Verdopplungszeiten' : 'Halbwertszeiten'} – der Faktor ${grow ? '$2^{t/T}$' : '$(1/2)^{t/T}$'} lässt sich nicht mehr darstellen. Bitte Zeiten und Einheiten prüfen.`)
    steps.push({ tex: `\\frac{t}{${Ts}} = \\frac{${nt(t!, 6)}${W}}{${nt(TT!, 6)}${W}} ${eqv(k, 6)}`, head: grow ? 'Anzahl der Verdopplungen' : 'Anzahl der Halbwertszeiten', note: grow ? 'So viele Verdopplungszeiten (Generationen) sind vergangen.' : 'So viele Halbwertszeiten sind vergangen.' })
    const p = powQ(k)
    const kT = nt(k, 6)
    const pT = p.q ? eqv(p.q, 6) : feq(p.v, 6)
    if (want === 'N') {
      const N0 = o.N0!.q
      const Nq = p.q ? mul(N0, p.q) : null
      const Nv = toNum(N0) * p.v
      if (!(Nv < 1e300)) throw new CalcError('Das Ergebnis ist zu groß zum Anzeigen – bitte die Werte prüfen.')
      const pRel = p.q && !numQ(p.q, 6).approx ? '=' : '\\approx'
      steps.push({ tex: `N = ${tx(N0)}${u} \\cdot ${bt}^{${kT}} ${pRel} ${tx(N0)} \\cdot ${p.q ? nt(p.q, 6) : ft(p.v, 6)} ${Nq ? eqv(Nq) : feq(Nv)}${u}`, head: 'Einsetzen', final: true })
      result = `N ${Nq ? eqv(Nq) : feq(Nv)}${u}`
      plot.N = Nv
    } else {
      const N = o.N!.q
      const N0q = p.q ? div(N, p.q) : null
      const N0v = toNum(N) / p.v
      if (!(N0v < 1e300)) throw new CalcError('Das Ergebnis ist zu groß zum Anzeigen – bitte die Werte prüfen.')
      steps.push({ tex: `N_0 = \\frac{N}{${bt}^{\\frac{t}{${Ts}}}} = \\frac{${tx(N)}${u}}{${bt}^{${kT}}} ${N0q ? eqv(N0q) : feq(N0v)}${u}`, head: 'Umstellen und einsetzen', note: `Durch den Faktor $${bt}^{t/${Ts}}$ teilen.`, final: true })
      result = `N_0 ${N0q ? eqv(N0q) : feq(N0v)}${u}`
      plot.N0 = N0v
    }
    extra.push(grow ? `\\text{Faktor } 2^{${kT}} ${pT}` : `\\text{Rest } \\left(\\tfrac{1}{2}\\right)^{${kT}} ${p.q ? eqv(mul(p.q, q(100))) : feq(p.v * 100)}\\,\\%`)
  } else {
    const N = o.N!.q
    const N0 = o.N0!.q
    const ratio = div(N, N0)
    if (eq(ratio, ONE) && want === 'T') throw new CalcError('Mit N = N₀ hat sich nichts verändert – daraus lässt sich keine Verdopplungs- oder Halbwertszeit bestimmen.')
    if (grow && sign(sub(ratio, ONE)) < 0) throw new CalcError('Bei Wachstum muss N größer als N₀ sein. Für eine Abnahme „Halbwertszeit“ wählen.')
    if (!grow && sign(sub(ratio, ONE)) > 0) throw new CalcError('Beim Zerfall muss N kleiner als N₀ sein. Für eine Zunahme „Verdopplungszeit“ wählen.')
    const r = grow ? ratio : div(ONE, ratio)
    const kq = exactLog(r, q(2)) ?? (eq(r, ONE) ? ZERO : null)
    const kv = kq ? toNum(kq) : lgQ(r) / lg(2)
    const rT = grow ? '\\frac{N}{N_0}' : '\\frac{N_0}{N}'
    steps.push({
      tex: `${rT} = 2^{\\frac{t}{${Ts}}} \\;\\Rightarrow\\; \\frac{t}{${Ts}} = \\frac{\\lg ${rT}}{\\lg 2}`,
      head: 'Umstellen',
      note: grow ? 'Durch $N_0$ teilen, beide Seiten logarithmieren und $\\lg 2^{k} = k \\cdot \\lg 2$ nutzen.' : 'Kehrwert bilden ($\\left(\\frac{1}{2}\\right)^{k} = \\frac{1}{2^{k}}$), logarithmieren und $\\lg 2^{k} = k \\cdot \\lg 2$ nutzen.',
    })
    const kTex = kq ? `= ${tx(kq)}` : `\\approx \\frac{${fixL(lgQ(r))}}{${fixL(lg(2))}} ${fixEq(kv)}`
    steps.push({ tex: `${rT} = \\frac{${tx(grow ? N : N0)}}{${tx(grow ? N0 : N)}} ${eqv(r, 6)} \\;\\Rightarrow\\; \\frac{t}{${Ts}} ${kTex}`, head: grow ? 'Anzahl der Verdopplungen' : 'Anzahl der Halbwertszeiten' })
    if (want === 't') {
      const tq = kq ? mul(kq, TT!) : null
      const tv = kq ? toNum(tq!) : kv * toNum(TT!)
      steps.push({ tex: `t = ${Ts} \\cdot \\frac{t}{${Ts}} = ${nt(TT!, 6)}${W} \\cdot ${kq ? tx(kq) : fix(kv)} ${tq ? eqv(tq) : feq(tv)}${W}`, head: 'Zeit', final: true })
      const r2 = toUnit('t', tq, tv, tUnit)
      result = `t ${r2.res}${T(tUnit)}`
      plot.t = tv
      if (r2.other) extra.push(`t ${r2.other}${W}`)
      else {
        const nice = niceTime(tv, wu)
        if (nice) extra.push(`t ${feq(nice.v)}${T(nice.u)}`)
      }
    } else {
      if (isZero(t!)) throw new CalcError('Bei t = 0 hat sich nichts verändert – bitte eine Zeit größer als 0 eingeben.')
      const Tq = kq ? div(t!, kq) : null
      const Tv = kq ? toNum(Tq!) : toNum(t!) / kv
      steps.push({ tex: `${Ts} = \\frac{t}{t/${Ts}} = \\frac{${nt(t!, 6)}${W}}{${kq ? tx(kq) : fix(kv)}} ${Tq ? eqv(Tq) : feq(Tv)}${W}`, head: grow ? 'Verdopplungszeit' : 'Halbwertszeit', final: true })
      const r2 = toUnit(Ts, Tq, Tv, TUnit)
      result = `${Ts} ${r2.res}${T(TUnit)}`
      plot.T = Tv
      if (r2.other) extra.push(`${Ts} ${r2.other}${W}`)
      else {
        const nice = niceTime(Tv, wu)
        if (nice) extra.push(`${Ts} ${feq(nice.v)}${T(nice.u)}`)
      }
    }
    extra.push(grow ? `\\frac{t}{T_d} ${kq ? `= ${tx(kq)}` : fixEq(kv)}\\ \\text{Verdopplungen}` : `\\frac{t}{T_{1/2}} ${kq ? `= ${tx(kq)}` : fixEq(kv)}\\ \\text{Halbwertszeiten}`)
  }
  return {
    plot,
    result,
    extra,
    steps,
    remark: grow
      ? 'Exponentielles Wachstum gilt nur, solange genug Nährstoffe und Platz da sind (log-Phase); danach flacht die Kurve ab (stationäre Phase).'
      : 'Nach 10 Halbwertszeiten ist nur noch etwa 0,1 % übrig ($\\left(\\tfrac{1}{2}\\right)^{10} \\approx 0{,}001$).',
  }
}
