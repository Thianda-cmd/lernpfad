/**
 * Statistik für Messreihen: Kenngrößen (Mittelwert, Median, Spannweite, Varianz, Standardabweichung,
 * Variationskoeffizient, Standardfehler, 95-%-Vertrauensbereich mit Student-t), Ausreißertests nach
 * Grubbs und Dixon sowie lineare Regression.
 * Summen, Mittelwerte und Abweichungsquadrate exakt mit Brüchen; Wurzeln mit Gleitkommazahlen.
 */
import { add, CalcError, cmp, div, eq, isTerminating, isZero, mul, neg, q, qFromRaw, sign, sub, toNum, ZERO, type Q } from '../q'
import { parseNum, parsePairs } from './numinput'
import { linReg, type LinReg } from './regress'
import type { Solution, Step } from './step'
import { feqv, fnt, num } from './units'

/* ---------------------------- Anzeige ---------------------------- */

function numQ(x: Q, sig: number): { t: string; approx: boolean } {
  if (isZero(x)) return { t: '0', approx: false }
  const r = num(x, sig)
  if (!r.approx || !isTerminating(x)) return r
  const back = qFromRaw(Math.abs(toNum(x)).toPrecision(sig))
  return { t: r.t, approx: !eq(sign(x) < 0 ? neg(back) : back, x) }
}
const nt = (x: Q, sig = 6) => numQ(x, sig).t
const eqv = (x: Q, sig = 6) => {
  const r = numQ(x, sig)
  return `${r.approx ? '\\approx' : '='} ${r.t}`
}
/** feste Nachkommastellen mit Dezimalkomma */
function fix(x: number, d: number): string {
  const s = Math.abs(x).toFixed(d)
  const [i, f] = s.split('.')
  const ii = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : i
  return (x < 0 && Number(s) !== 0 ? '-' : '') + ii + (f ? `{,}${f}` : '')
}
const fixEq = (x: number, d: number) => `${Math.abs(x - Number(x.toFixed(d))) > 1e-12 * Math.max(1, Math.abs(x)) ? '\\approx' : '='} ${fix(x, d)}`
/** Gleitkommazahl, 0 als genau 0 */
const feq = (x: number, sig = 4) => (x === 0 ? '= 0' : feqv(x, sig))
const ft = (x: number, sig = 4) => (x === 0 ? '0' : fnt(x, sig))
/** r und R² mit vier (nahe 1: fünf) Nachkommastellen */
const rEq = (x: number) => (Math.abs(Math.abs(x) - 1) < 1e-12 ? `= ${x < 0 ? '-' : ''}1` : fixEq(x, Math.abs(x) >= 0.9999 ? 5 : 4))

/** Messreihe exakt einlesen (wie parseList, aber als Brüche) */
export function parseListQ(s: string, what = 'Messwerte'): Q[] {
  return s
    .split(/[;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => parseNum(t, `${what} (Wert ${i + 1})`)!.q)
}

const sumQ = (xs: Q[]) => xs.reduce(add, ZERO)

/** geordnete Reihe als TeX (lange Reihen gekürzt) */
function listTex(xs: Q[], sep = ';\\ '): string {
  const t = xs.map((x) => nt(x))
  if (t.length <= 24) return t.join(sep)
  return [...t.slice(0, 10), '\\dots', ...t.slice(-4)].join(sep)
}

/* ---------------------------- Tabellen ---------------------------- */

/** Student-t, zweiseitig 95 % (t₀,₉₇₅) für f = 1 … 30 Freiheitsgrade */
export const T95: readonly number[] = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042]
/** große Freiheitsgrade; ∞ = Normalverteilung */
const T95_HIGH: readonly [number, number][] = [
  [30, 2.042],
  [40, 2.021],
  [60, 2.0],
  [120, 1.98],
  [Infinity, 1.96],
]

/** t-Faktor (zweiseitig, 95 %); Zwischenwerte harmonisch interpoliert (linear in 1/f) */
export function t95(f: number): { t: number; interp: boolean } {
  if (!Number.isInteger(f) || f < 1) throw new CalcError('Für den Vertrauensbereich braucht es mindestens zwei Messwerte.')
  if (f <= 30) return { t: T95[f - 1], interp: false }
  for (let i = 0; i < T95_HIGH.length - 1; i++) {
    const [f1, t1] = T95_HIGH[i]
    const [f2, t2] = T95_HIGH[i + 1]
    if (f === f2) return { t: t2, interp: false }
    if (f > f1 && f < f2) {
      const w = (1 / f1 - 1 / f) / (1 / f1 - (Number.isFinite(f2) ? 1 / f2 : 0))
      return { t: t1 + (t2 - t1) * w, interp: true }
    }
  }
  return { t: 1.96, interp: false }
}

/**
 * Kritische Werte nach Grubbs, zweiseitig, α = 5 % (n = 3 … 30), wie in ISO 5725-2 und ASTM E178
 * (Grubbs & Beck 1972). Nachgerechnet mit G = (n−1)/√n · √(t² / (n − 2 + t²)), t = t(α/(2n); n − 2).
 */
export const GRUBBS95: Readonly<Record<number, number>> = {
  3: 1.155, 4: 1.481, 5: 1.715, 6: 1.887, 7: 2.02, 8: 2.126, 9: 2.215, 10: 2.29, 11: 2.355, 12: 2.412, 13: 2.462, 14: 2.507, 15: 2.549, 16: 2.585,
  17: 2.62, 18: 2.651, 19: 2.681, 20: 2.709, 21: 2.733, 22: 2.758, 23: 2.781, 24: 2.802, 25: 2.822, 26: 2.841, 27: 2.859, 28: 2.876, 29: 2.893, 30: 2.908,
}

/** Kritische Werte für Dixons Q-Test (Q = Lücke/Spannweite), zweiseitig 95 %, n = 3 … 10 (Rorabacher 1991) */
export const DIXON95: Readonly<Record<number, number>> = { 3: 0.97, 4: 0.829, 5: 0.71, 6: 0.625, 7: 0.568, 8: 0.526, 9: 0.493, 10: 0.466 }

/* ---------------------------- a) Kenngrößen ---------------------------- */

export interface DescOut extends Solution {
  /** Abweichungstabelle (TeX-Zellen): i, x_i, x_i − x̄, (x_i − x̄)² */
  rows: string[][]
  foot: string[]
  /** Messwerte in Eingabereihenfolge (für das Diagramm) */
  values: number[]
  mean: number
  sd: number
}

function readValues(src: string, min: number, what: string): Q[] {
  const xs = parseListQ(src)
  if (!xs.length) throw new CalcError('Bitte Messwerte eingeben – getrennt durch Leerzeichen, Semikolon oder Zeilenumbruch.')
  if (xs.length < min) throw new CalcError(what)
  if (xs.length > 500) throw new CalcError('Bitte höchstens 500 Messwerte eingeben.')
  return xs
}

export function describe(src: string): DescOut {
  const xs = readValues(src, 2, 'Für Standardabweichung und Vertrauensbereich braucht es mindestens zwei Messwerte.')
  const n = xs.length
  const S = sumQ(xs)
  const mean = div(S, q(n))
  const sorted = [...xs].sort(cmp)
  const steps: Step[] = []
  steps.push({ tex: `${listTex(sorted)} \\quad (n = ${n})`, head: 'Messwerte geordnet', note: 'Der Größe nach sortiert – so lassen sich Median, Minimum und Maximum ablesen.' })
  steps.push({ tex: `\\bar{x} = \\frac{\\sum x_i}{n} = \\frac{${nt(S, 8)}}{${n}} ${eqv(mean)}`, head: 'Mittelwert', note: 'Summe aller Messwerte geteilt durch ihre Anzahl (arithmetisches Mittel).', final: true })
  let median: Q
  if (n % 2) {
    const k = (n + 1) / 2
    median = sorted[k - 1]
    steps.push({ tex: `\\tilde{x} = x_{(${k})} = ${nt(median)}`, head: 'Median', note: `Bei ungerader Anzahl ist der Median der mittlere Wert der geordneten Reihe (der ${k}. von ${n}). Er ist unempfindlich gegen Ausreißer.` })
  } else {
    const k = n / 2
    median = div(add(sorted[k - 1], sorted[k]), q(2))
    steps.push({ tex: `\\tilde{x} = \\frac{x_{(${k})} + x_{(${k + 1})}}{2} = \\frac{${nt(sorted[k - 1])} + ${nt(sorted[k])}}{2} ${eqv(median)}`, head: 'Median', note: 'Bei gerader Anzahl ist der Median der Mittelwert der beiden mittleren Werte. Er ist unempfindlich gegen Ausreißer.' })
  }
  const min = sorted[0]
  const max = sorted[n - 1]
  const R = sub(max, min)
  steps.push({ tex: `x_{\\min} = ${nt(min)},\\quad x_{\\max} = ${nt(max)},\\quad R = x_{\\max} - x_{\\min} ${eqv(R)}`, head: 'Spannweite', note: 'Abstand zwischen kleinstem und größtem Wert – ein einfaches, aber ausreißerempfindliches Streumaß.' })
  const dev = xs.map((x) => sub(x, mean))
  const dev2 = dev.map((d) => mul(d, d))
  const Sxx = sumQ(dev2)
  const rows = xs.map((x, i) => [String(i + 1), nt(x), nt(dev[i], 4), nt(dev2[i], 4)])
  const foot = ['\\sum', nt(S, 8), '0', nt(Sxx, 4)]
  if (n <= 12) {
    const body = rows.map((r) => r.join(' & ')).join(' \\\\ ')
    steps.push({
      tex: `\\begin{array}{c|r|r|r} i & x_i & x_i - \\bar{x} & (x_i - \\bar{x})^2 \\\\ \\hline ${body} \\\\ \\hline ${foot.join(' & ')} \\end{array}`,
      head: 'Abweichungen vom Mittelwert',
      note: 'Die Abweichungen heben sich in der Summe auf ($\\sum (x_i - \\bar{x}) = 0$) – deshalb quadriert man sie vor dem Addieren.',
    })
  } else
    steps.push({
      tex: `\\sum (x_i - \\bar{x})^2 ${eqv(Sxx, 4)}`,
      head: 'Abweichungen vom Mittelwert',
      note: 'Jede Abweichung vom Mittelwert quadrieren und alles addieren (die Tabelle steht unter dem Ergebnis).',
    })
  const s2 = div(Sxx, q(n - 1))
  steps.push({ tex: `s^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n - 1} = \\frac{${nt(Sxx, 4)}}{${n - 1}} ${eqv(s2, 4)}`, head: 'Varianz', note: 'Bei einer Stichprobe teilt man durch $n - 1$ (Freiheitsgrade), nicht durch $n$.' })
  const s = Math.sqrt(toNum(s2))
  steps.push({ tex: `s = \\sqrt{s^2} = \\sqrt{${nt(s2, 4)}} ${feq(s)}`, head: 'Standardabweichung', note: 'Sie hat dieselbe Einheit wie die Messwerte. Bei normalverteilten Werten liegen etwa zwei Drittel im Bereich $\\bar{x} \\pm s$.', final: true })
  const m = toNum(mean)
  const extra: string[] = [`\\tilde{x} ${eqv(median)},\\quad R ${eqv(R)}`]
  if (m > 0) {
    const vk = (s / m) * 100
    steps.push({ tex: `\\text{VK} = \\frac{s}{\\bar{x}} \\cdot 100\\,\\% = \\frac{${ft(s)}}{${nt(mean)}} \\cdot 100\\,\\% ${feq(vk)}\\,\\%`, head: 'Variationskoeffizient', note: 'Die relative Streuung (Präzision) – damit lassen sich Messreihen mit verschiedenen Mittelwerten vergleichen.' })
    extra.push(`\\text{VK} ${feq(vk)}\\,\\%`)
  } else
    steps.push({ tex: '\\text{VK}\\ \\text{nicht sinnvoll}', head: 'Variationskoeffizient', note: 'Der Variationskoeffizient ist nur für positive Messgrößen sinnvoll (hier ist $\\bar{x} \\le 0$).' })
  const se = s / Math.sqrt(n)
  steps.push({ tex: `s_{\\bar{x}} = \\frac{s}{\\sqrt{n}} = \\frac{${ft(s)}}{\\sqrt{${n}}} ${feq(se)}`, head: 'Standardfehler', note: 'So genau ist der Mittelwert bestimmt – mit mehr Messwerten wird er kleiner.' })
  const f = n - 1
  const t = t95(f)
  steps.push({
    tex: `f = n - 1 = ${f},\\quad t_{f;\\,95\\,\\%} ${t.interp ? '\\approx' : '='} ${fix(t.t, 3)}`,
    head: 'Vertrauensbereich (95 %)',
    note: t.interp
      ? 'Student-t-Faktor (zweiseitig, 95 %) – zwischen den Tabellenwerten für 30, 40, 60, 120 und ∞ Freiheitsgrade harmonisch interpoliert.'
      : 'Student-t-Faktor aus der Tabelle (zweiseitig, 95 %). Bei wenigen Messwerten ist $t$ groß – der Bereich wird breiter.',
  })
  const D = t.t * se
  const d = D > 0 ? Math.max(0, Math.min(10, 3 - Math.floor(Math.log10(D)))) : 4
  steps.push({
    tex: `\\Delta = t \\cdot \\frac{s}{\\sqrt{n}} = ${fix(t.t, 3)} \\cdot ${ft(se)} ${feq(D)}`,
    note: 'Halbe Breite des Vertrauensbereichs.',
  })
  steps.push({
    tex: `\\bar{x} \\pm \\Delta = ${nt(mean)} \\pm ${ft(D)} \\;\\Rightarrow\\; ${fix(m - D, d)} \\le \\mu \\le ${fix(m + D, d)}`,
    note: 'Mit 95 % Wahrscheinlichkeit liegt der wahre Mittelwert $\\mu$ in diesem Bereich (normalverteilte Messwerte vorausgesetzt).',
    final: true,
  })
  extra.push(`\\bar{x} \\pm \\Delta = ${nt(mean)} \\pm ${ft(D)}\\ (95\\,\\%)`)
  return {
    result: `\\bar{x} ${eqv(mean)},\\quad s ${feq(s)}`,
    extra,
    steps,
    rows,
    foot,
    values: xs.map(toNum),
    mean: m,
    sd: s,
    remark: `Angabe als $\\bar{x} \\pm s = ${nt(mean)} \\pm ${ft(s)}$ $(n = ${n})$. Liegt ein Wert weit außerhalb, mit dem Ausreißertest prüfen.`,
  }
}

/* ---------------------------- b) Ausreißertest ---------------------------- */

export type OutlierMethod = 'grubbs' | 'dixon'

export interface OutlierOut extends Solution {
  /** Index des verdächtigen Werts in der Eingabe */
  suspect: number
  outlier: boolean
  values: number[]
}

export function outlierTest(src: string, method: OutlierMethod): OutlierOut {
  const xs = readValues(src, 3, 'Für einen Ausreißertest braucht es mindestens drei Messwerte.')
  const n = xs.length
  const sorted = [...xs].sort(cmp)
  if (eq(sorted[0], sorted[n - 1])) throw new CalcError('Alle Werte sind gleich – es gibt keinen Ausreißer zu prüfen.')
  const steps: Step[] = []
  steps.push({ tex: `${listTex(sorted)} \\quad (n = ${n})`, head: 'Messwerte geordnet', note: 'Verdächtig ist immer ein Randwert – der kleinste oder der größte.' })
  if (method === 'dixon') {
    if (n > 10) throw new CalcError('Der Q-Test nach Dixon ist für 3 bis 10 Messwerte gedacht – bei mehr Werten den Grubbs-Test nehmen.')
    const gLo = sub(sorted[1], sorted[0])
    const gHi = sub(sorted[n - 1], sorted[n - 2])
    const top = cmp(gHi, gLo) >= 0
    const x = top ? sorted[n - 1] : sorted[0]
    const nb = top ? sorted[n - 2] : sorted[1]
    const gap = top ? gHi : gLo
    const R = sub(sorted[n - 1], sorted[0])
    steps.push({
      tex: `\\text{unten: } x_{(2)} - x_{(1)} = ${nt(sorted[1])} - ${nt(sorted[0])} ${eqv(gLo)},\\quad \\text{oben: } x_{(${n})} - x_{(${n - 1})} = ${nt(sorted[n - 1])} - ${nt(sorted[n - 2])} ${eqv(gHi)}`,
      head: 'Verdächtiger Wert',
      note: `Verdächtig ist der Randwert mit der größeren Lücke zu seinem Nachbarn: $x^* = ${nt(x)}$.${eq(gLo, gHi) ? ' Beide Lücken sind gleich groß – geprüft wird der größte Wert.' : ''}`,
    })
    const Q = div(gap, R)
    const Qv = toNum(Q)
    steps.push({
      tex: `Q = \\frac{|x^* - x_{\\text{Nachbar}}|}{x_{\\max} - x_{\\min}} = \\frac{|${nt(x)} - ${nt(nb)}|}{${nt(sorted[n - 1])} - ${nt(sorted[0])}} = \\frac{${nt(gap)}}{${nt(R)}} ${eqv(Q, 4)}`,
      head: 'Prüfgröße',
      note: 'Lücke zum Nachbarwert geteilt durch die Spannweite der ganzen Reihe.',
    })
    const crit = DIXON95[n]
    steps.push({ tex: `Q_{\\text{krit}}(n = ${n};\\ 95\\,\\%) = ${fix(crit, 3)}`, head: 'Kritischer Wert', note: 'Tabelle für den Q-Test nach Dean und Dixon, zweiseitig, 95 % (Werte nach Rorabacher 1991): n = 3 bis 10 → 0,970; 0,829; 0,710; 0,625; 0,568; 0,526; 0,493; 0,466.' })
    const out = Qv > crit
    steps.push({
      tex: `Q ${eqv(Q, 4)} ${out ? '>' : '\\le'} Q_{\\text{krit}} = ${fix(crit, 3)} \\;\\Rightarrow\\; \\text{${out ? 'Ausreißer' : 'kein Ausreißer'}}`,
      head: 'Entscheidung',
      note: out ? `$x^* = ${nt(x)}$ ist mit 95 % Sicherheit ein Ausreißer und darf gestrichen werden.` : `$x^* = ${nt(x)}$ weicht nicht signifikant ab – der Wert bleibt in der Messreihe.`,
      final: true,
    })
    if (out) {
      const i = xs.findIndex((v) => eq(v, x))
      addRest(steps, xs.filter((_, k) => k !== i))
    }
    return {
      result: out ? `x^* = ${nt(x)}\\ \\text{ist ein Ausreißer}` : `\\text{kein Ausreißer}\\ (x^* = ${nt(x)})`,
      extra: [`Q ${eqv(Q, 4)} ${out ? '>' : '\\le'} Q_{\\text{krit}} = ${fix(crit, 3)}\\ (n = ${n})`],
      steps,
      suspect: xs.findIndex((v) => eq(v, x)),
      outlier: out,
      values: xs.map(toNum),
      remark: outRemark(out, n),
    }
  }
  if (n > 30) throw new CalcError('Die Tabelle für den Grubbs-Test reicht hier von 3 bis 30 Messwerten.')
  const S = sumQ(xs)
  const mean = div(S, q(n))
  const Sxx = sumQ(xs.map((x) => mul(sub(x, mean), sub(x, mean))))
  const s = Math.sqrt(toNum(div(Sxx, q(n - 1))))
  steps.push({
    tex: `\\bar{x} = \\frac{${nt(S, 8)}}{${n}} ${eqv(mean)},\\quad s = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n - 1}} = \\sqrt{\\frac{${nt(Sxx, 4)}}{${n - 1}}} ${feq(s)}`,
    head: 'Mittelwert und Standardabweichung',
    note: 'Beide mit allen Werten berechnen – auch mit dem verdächtigen.',
  })
  const dLo = sub(mean, sorted[0])
  const dHi = sub(sorted[n - 1], mean)
  const top = cmp(dHi, dLo) >= 0
  const x = top ? sorted[n - 1] : sorted[0]
  const dist = top ? dHi : dLo
  steps.push({
    tex: `x^* = ${nt(x)},\\quad |x^* - \\bar{x}| = |${nt(x)} - ${nt(mean)}| ${eqv(dist)}`,
    head: 'Verdächtiger Wert',
    note: `Der Wert mit dem größten Abstand zum Mittelwert (${top ? 'hier der größte' : 'hier der kleinste'} Wert).`,
  })
  const G = toNum(dist) / s
  steps.push({ tex: `G = \\frac{|x^* - \\bar{x}|}{s} = \\frac{${nt(dist)}}{${ft(s)}} ${fixEq(G, 4)}`, head: 'Prüfgröße', note: 'Wie viele Standardabweichungen liegt der verdächtige Wert vom Mittelwert entfernt?' })
  const crit = GRUBBS95[n]
  steps.push({
    tex: `G_{\\text{krit}}(n = ${n};\\ 95\\,\\%) = ${fix(crit, 3)}`,
    head: 'Kritischer Wert',
    note: 'Tabelle nach Grubbs, zweiseitig, Signifikanzniveau α = 5 % (wie ISO 5725-2 / ASTM E178; z. B. n = 5: 1,715 · n = 10: 2,290 · n = 20: 2,709 · n = 30: 2,908).',
  })
  // entschieden wird mit der angezeigten (auf vier Stellen gerundeten) Prüfgröße
  const out = Number(G.toFixed(4)) > crit
  steps.push({
    tex: `G ${fixEq(G, 4)} ${out ? '>' : '\\le'} G_{\\text{krit}} = ${fix(crit, 3)} \\;\\Rightarrow\\; \\text{${out ? 'Ausreißer' : 'kein Ausreißer'}}`,
    head: 'Entscheidung',
    note: out ? `$x^* = ${nt(x)}$ ist mit 95 % Sicherheit ein Ausreißer und darf gestrichen werden.` : `$x^* = ${nt(x)}$ weicht nicht signifikant ab – der Wert bleibt in der Messreihe.`,
    final: true,
  })
  if (out) {
    const i = xs.findIndex((v) => eq(v, x))
    addRest(steps, xs.filter((_, k) => k !== i))
  }
  return {
    result: out ? `x^* = ${nt(x)}\\ \\text{ist ein Ausreißer}` : `\\text{kein Ausreißer}\\ (x^* = ${nt(x)})`,
    extra: [`G ${fixEq(G, 4)} ${out ? '>' : '\\le'} G_{\\text{krit}} = ${fix(crit, 3)}\\ (n = ${n})`],
    steps,
    suspect: xs.findIndex((v) => eq(v, x)),
    outlier: out,
    values: xs.map(toNum),
    remark: outRemark(out, n),
  }
}

function addRest(steps: Step[], rest: Q[]) {
  const n = rest.length
  const mean = div(sumQ(rest), q(n))
  const s = Math.sqrt(toNum(div(sumQ(rest.map((x) => mul(sub(x, mean), sub(x, mean)))), q(n - 1))))
  steps.push({ tex: `\\bar{x}' ${eqv(mean)},\\quad s' ${feq(s)}\\quad (n = ${n})`, head: 'Ohne den Ausreißer', note: 'Mittelwert und Standardabweichung der übrigen Werte. Bei Bedarf den Test mit ihnen wiederholen.' })
}

function outRemark(out: boolean, n: number) {
  const base = out
    ? 'Einen Ausreißer nur streichen, wenn der Test es erlaubt – und möglichst die Ursache suchen (Pipettierfehler, Verwechslung, Gerätefehler).'
    : 'Kein Wert darf gestrichen werden – auch wenn einer „komisch aussieht“.'
  return `${base} Die Tests setzen normalverteilte Messwerte voraus.${n <= 4 ? ' Bei so wenigen Werten erkennt ein Test nur sehr grobe Ausreißer.' : ''}`
}

/* ---------------------------- c) Regression ---------------------------- */

export interface RegOut extends Solution {
  pts: [number, number][]
  fit: LinReg
  /** Tabelle (TeX-Zellen): i, x, y, ŷ, y − ŷ */
  rows: string[][]
}

/** y = m·x + b als TeX */
export function lineTex(m: number, b: number, sig = 4): string {
  if (m === 0) return `y = ${b === 0 ? '0' : fnt(b, sig)}`
  const mt = `${fnt(m, sig)} \\cdot x`
  if (b === 0) return `y = ${mt}`
  return `y = ${mt} ${b < 0 ? '-' : '+'} ${fnt(Math.abs(b), sig)}`
}

export function regression(src: string): RegOut {
  if (!src.trim()) throw new CalcError('Bitte Wertepaare eingeben – je Zeile „x; y“.')
  const pts = parsePairs(src)
  if (pts.length < 3) throw new CalcError('Bitte mindestens drei Wertepaare eingeben (je Zeile „x; y“).')
  if (pts.length > 500) throw new CalcError('Bitte höchstens 500 Wertepaare eingeben.')
  const fit = linReg(pts)
  if (!(fit.sxx > 0)) throw new CalcError('Alle x-Werte sind gleich – durch diese Punkte geht keine Gerade der Form y = m·x + b.')
  const n = fit.n
  const sx = pts.reduce((a, p) => a + p[0], 0)
  const sy = pts.reduce((a, p) => a + p[1], 0)
  const steps: Step[] = []
  steps.push({ tex: `n = ${n}\\ \\text{Wertepaare}`, head: 'Wertepaare', note: 'Gesucht ist die Ausgleichsgerade $y = m \\cdot x + b$, die möglichst nah an allen Punkten liegt (Methode der kleinsten Quadrate).' })
  steps.push({ tex: `\\bar{x} = \\frac{\\sum x_i}{n} = \\frac{${ft(sx, 6)}}{${n}} ${feq(fit.xm, 6)},\\quad \\bar{y} = \\frac{\\sum y_i}{n} = \\frac{${ft(sy, 6)}}{${n}} ${feq(fit.ym, 6)}`, head: 'Mittelwerte', note: 'Die Ausgleichsgerade geht immer durch den Schwerpunkt $(\\bar{x} \\mid \\bar{y})$.' })
  steps.push({
    tex: `S_{xx} = \\sum (x_i - \\bar{x})^2 ${feq(fit.sxx, 6)},\\quad S_{xy} = \\sum (x_i - \\bar{x})(y_i - \\bar{y}) ${feq(fit.sxy, 6)},\\quad S_{yy} = \\sum (y_i - \\bar{y})^2 ${feq(fit.syy, 6)}`,
    head: 'Quadratsummen',
    note: 'Für jeden Punkt die Abweichungen vom Mittelwert bilden, multiplizieren bzw. quadrieren und addieren.',
  })
  steps.push({ tex: `m = \\frac{S_{xy}}{S_{xx}} = \\frac{${ft(fit.sxy, 6)}}{${ft(fit.sxx, 6)}} ${feq(fit.m)}`, head: 'Steigung', note: 'So stark ändert sich y, wenn x um 1 wächst.' })
  steps.push({ tex: `b = \\bar{y} - m \\cdot \\bar{x} = ${ft(fit.ym, 6)} - ${ft(fit.m)} \\cdot ${ft(fit.xm, 6)} ${feq(fit.b)}`, head: 'Achsenabschnitt', note: 'Die Gerade geht durch den Schwerpunkt – daraus folgt $b$.' })
  steps.push({ tex: lineTex(fit.m, fit.b), head: 'Ausgleichsgerade', final: true })
  const extra: string[] = []
  let remark: string
  if (fit.syy > 0) {
    steps.push({
      tex: `r = \\frac{S_{xy}}{\\sqrt{S_{xx} \\cdot S_{yy}}} ${rEq(fit.r)},\\quad R^2 = r^2 ${rEq(fit.r2)}`,
      head: 'Korrelation',
      note: '$r$ liegt zwischen −1 und +1; je näher $|r|$ an 1, desto genauer liegen die Punkte auf einer Geraden. $R^2$ ist der Anteil der Streuung von y, den die Gerade erklärt.',
      final: true,
    })
    extra.push(`r ${rEq(fit.r)},\\quad R^2 ${rEq(fit.r2)}`)
    const a = Math.abs(fit.r)
    remark =
      a >= 0.99
        ? 'Sehr enger linearer Zusammenhang – für eine Kalibriergerade fordert man meist $R^2 \\ge 0{,}99$.'
        : a >= 0.9
          ? 'Deutlicher linearer Zusammenhang, aber mit merklicher Streuung (für eine Kalibriergerade meist zu wenig: $R^2 \\ge 0{,}99$).'
          : a >= 0.5
            ? 'Nur mäßiger linearer Zusammenhang – prüfen, ob die Punkte vielleicht auf einer Kurve liegen.'
            : 'Kaum linearer Zusammenhang.'
    remark += ' Achtung: Korrelation heißt nicht, dass x die Ursache für y ist.'
  } else {
    steps.push({ tex: 'S_{yy} = 0 \\;\\Rightarrow\\; r\\ \\text{nicht definiert}', head: 'Korrelation', note: 'Alle y-Werte sind gleich – die Gerade ist waagerecht, ein Korrelationskoeffizient lässt sich nicht berechnen.' })
    extra.push('r\\ \\text{nicht definiert (alle y gleich)}')
    remark = 'Alle y-Werte sind gleich: y hängt hier nicht von x ab.'
  }
  const res = pts.reduce((a, [x, y]) => a + (y - (fit.m * x + fit.b)) ** 2, 0)
  steps.push({
    tex: `s_y = \\sqrt{\\frac{\\sum (y_i - \\hat{y}_i)^2}{n - 2}} = \\sqrt{\\frac{${ft(res)}}{${n - 2}}} ${feq(fit.sy)}`,
    head: 'Reststandardabweichung',
    note: 'Typische Abweichung der Messpunkte von der Geraden (in der Einheit von y). Durch $n - 2$, weil $m$ und $b$ aus den Daten geschätzt wurden.',
  })
  extra.push(`s_y ${feq(fit.sy)}`)
  const rows = pts.map(([x, y], i) => {
    const yh = fit.m * x + fit.b
    return [String(i + 1), ft(x, 6), ft(y, 6), ft(yh), ft(y - yh, 3)]
  })
  return { result: lineTex(fit.m, fit.b), extra, steps, pts, fit, rows, remark }
}
