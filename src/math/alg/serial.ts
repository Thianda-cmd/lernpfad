/**
 * Verdünnungsreihen fürs Bio-Labor: serielle Verdünnung (Übertrag, Verdünnungsmittel und
 * Konzentration je Stufe), Standardreihe aus einer Stammlösung (c₁ · V₁ = c₂ · V₂) und die
 * Gesamtverdünnung mehrerer Schritte – jeweils mit vollständigem Rechenweg.
 *
 * Schreibweise: „1 : 10“ heißt 1 Teil Probe in insgesamt 10 Teilen (Verdünnungsfaktor F = 10,
 * Verdünnungsstufe 10⁻¹), gemischt wird „1 + 9“.
 *
 * Außerdem die gemeinsamen Bausteine der Bio-Rechner (Zahlen in Zehnerpotenzen, Zähllisten, Volumina).
 */
import { add, CalcError, div, isInt, isZero, mul, numTex, ONE, prod, q, qpow, qTex, sign, sub, sum, toNum, type Q } from '../q'
import { parseList, parseNum, type NumIn } from './numinput'
import type { Solution, Step } from './step'
import { CONC_U, eqv, F, fac, fnum, MCONC_U, nt, T, unitNames, type Unit } from './units'

/* ============================ gemeinsame Bausteine ============================ */

/** frei eingegebene Einheit ohne Zeichen, die TeX stören würden */
export function cleanUnit(s: string): string {
  return s
    .replace(/[\\{}$&#^_~<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
}

/** frei eingegebene Einheit als TeX (mit kleinem Abstand davor) */
export const UT = (s: string) => T(cleanUnit(s))

/**
 * Zahl als TeX, sehr große und sehr kleine Werte als a · 10^b (1{,}02 \cdot 10^{6}).
 * approx = gerundet.
 */
export function sci(x: number, sig = 3, lo = 1e-3, hi = 1e4): { t: string; approx: boolean } {
  if (!Number.isFinite(x)) return { t: '\\text{–}', approx: false }
  if (x === 0) return { t: '0', approx: false }
  const a = Math.abs(x)
  if (a < lo || a >= hi) {
    // erst auf sig Stellen runden (toPrecision rundet exakte Hälften auf), dann zerlegen
    const p = Number(x.toPrecision(sig))
    let e = Math.floor(Math.log10(Math.abs(p)))
    let m = Number((p / 10 ** e).toFixed(sig - 1))
    if (Math.abs(m) >= 10) {
      e++
      m = Number((p / 10 ** e).toFixed(sig - 1))
    }
    const approx = Math.abs(p - x) > 1e-9 * a
    return { t: `${numTex(m)} \\cdot 10^{${e}}`, approx }
  }
  return fnum(x, sig)
}
/** nur die Zahl */
export const sciT = (x: number, sig = 3, lo?: number, hi?: number) => sci(x, sig, lo, hi).t
/** „= 1{,}02 · 10⁶“ oder „≈ …“ */
export function sciEq(x: number, sig = 3, lo?: number, hi?: number) {
  const r = sci(x, sig, lo, hi)
  return `${r.approx ? '\\approx' : '='} ${r.t}`
}

/** Bruchzahl: exakt, wenn kurz – sonst gerundet; 0 ohne „≈“ (eqv aus units zeigt bei 0 „≈ 0“) */
export const qeq = (x: Q, sig = 4) => (isZero(x) ? '= 0' : eqv(x, sig))
export const qt = (x: Q, sig = 4) => (isZero(x) ? '0' : nt(x, sig))

/** feste Nachkommastellen mit Komma, z. B. für Logarithmen: 0{,}3010 */
export function fix(x: number, d: number): string {
  const s = Math.abs(x).toFixed(d)
  return (x < 0 && Number(s) !== 0 ? '-' : '') + s.replace('.', '{,}')
}

/** Zahl als Text mit Komma (für Meldungen) */
export const txt = (x: number) => String(Number(x.toPrecision(6))).replace('.', ',')

/** Großbuchstabe am Anfang */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Pflichtwert: „Bitte die Kammertiefe eingeben.“ */
export function need(v: NumIn | null | undefined, acc: string): Q {
  if (!v) throw new CalcError(`Bitte ${acc} eingeben.`)
  return v.q
}

/** Pflichtwert größer als 0 („Die Kammertiefe muss größer als 0 sein.“) */
export function needPos(v: NumIn | null | undefined, acc: string, nom = cap(acc)): Q {
  const x = need(v, acc)
  if (sign(x) <= 0) throw new CalcError(`${nom} muss größer als 0 sein.`)
  return x
}

/** Liste „52; 47; 55“ – auch „52, 47, 55“ (Komma mit Leerzeichen trennt, sonst ist das Komma Dezimalzeichen) */
export function listTokens(s: string): string {
  return s.replace(/,(?=\s)/g, ';').replace(/,\s*$/, '')
}

/** Zählwerte (ganze Zahlen ab 0) */
export function parseCounts(s: string, what: string): number[] {
  const xs = parseList(listTokens(s), what)
  xs.forEach((x, i) => {
    if (!Number.isFinite(x)) throw new CalcError(`${what}: Wert ${i + 1} ist keine Zahl.`)
    if (x < 0) throw new CalcError(`${what}: Zählwerte können nicht negativ sein (Wert ${i + 1}).`)
    if (!Number.isInteger(x))
      throw new CalcError(`${what}: Gezählt wird in ganzen Zahlen – Wert ${i + 1} ist ${txt(x)}. Mehrere Werte mit Semikolon oder Leerzeichen trennen (das Komma ist das Dezimalzeichen).`)
    if (x > 1e7) throw new CalcError(`${what}: Wert ${i + 1} ist unrealistisch groß.`)
  })
  return xs
}

/** Summe als TeX: „52 + 47 + 55“ (bei vielen Werten abgekürzt) */
export function sumTex(xs: number[], name = 'N'): string {
  if (xs.length <= 10) return xs.join(' + ')
  return `${name}_1 + ${name}_2 + \\dots + ${name}_{${xs.length}}`
}

/** Volumeneinheiten der Bio-Rechner */
const VOL_LIST: readonly Unit[] = [
  { u: 'L', f: q(1) },
  { u: 'mL', f: q(1, 1000) },
  { u: 'µL', f: q(1, 1_000_000) },
]
export const VOL_NAMES = ['µL', 'mL', 'L']
/** Volumen in Litern */
export const toLiter = (x: Q, u: string) => mul(x, fac(VOL_LIST, u))

/** Volumen (exakt, in Litern) in µL, mL oder L – je nach Größe */
export function volBest(L: Q): { u: string; v: Q } {
  const x = Math.abs(toNum(L))
  if (x >= 1) return { u: 'L', v: L }
  if (x >= 1e-3) return { u: 'mL', v: mul(L, q(1000)) }
  return { u: 'µL', v: mul(L, q(1_000_000)) }
}
/** „1,294 mL“ */
export function volTex(L: Q, sig = 4) {
  const b = volBest(L)
  return `${qt(b.v, sig)}${T(b.u)}`
}
/** „≈ 1,294 mL“ */
export function volEq(L: Q, sig = 4) {
  const b = volBest(L)
  return `${qeq(b.v, sig)}${T(b.u)}`
}
/** Volumen als Text für Meldungen: „0,8 µL“ */
export function volText(L: Q) {
  const b = volBest(L)
  return `${txt(toNum(b.v))} ${b.u}`
}

/** kleinstes Volumen, das sich mit Kolbenhubpipetten noch genau pipettieren lässt (Faustregel), in L */
export const MIN_PIPET = q(2, 1_000_000)

/** Potenz als TeX: 10^{3}, 2^{5} – 1 bei Hochzahl 0, die Basis selbst bei 1 */
export const powTex = (base: string, e: number) => (e === 0 ? '1' : e === 1 ? base : `${base}^{${e}}`)

/** ist x eine Zehnerpotenz 10^k (k ≥ 0)? → k, sonst null */
export function log10Exact(x: Q): number | null {
  if (!isInt(x) || sign(x) <= 0) return null
  const s = x.n.toString()
  return /^10*$/.test(s) ? s.length - 1 : null
}

/** Verdünnungsfaktor als TeX: 200 · 1\,000 · bei großen Zehnerpotenzen 10^{8} */
export function factorTex(x: Q): string {
  const k = log10Exact(x)
  return k !== null && k >= 7 ? `10^{${k}}` : qt(x, 6)
}

/** „= 200“, „= 10^{8}“ oder „≈ 3{,}333“ (nicht abbrechende Faktoren) */
export function factorEq(x: Q): string {
  const k = log10Exact(x)
  return k !== null && k >= 7 ? `= 10^{${k}}` : qeq(x, 6)
}

/** Verdünnung „1 : F“ als TeX, bei Zehnerpotenzen zusätzlich die Verdünnungsstufe 10^{-k} */
export function dilTex(Ftot: Q) {
  const k = log10Exact(Ftot)
  const r = `1 : ${factorTex(Ftot)}`
  return k !== null && k > 0 ? `${r} \\;\\widehat{=}\\; 10^{-${k}}` : r
}

/* ============================ serielle Verdünnung ============================ */

export type SerialBasis = 'misch' | 'rest'

export interface SerialRow {
  /** Stufe 1 … k */
  i: number
  /** Gesamtverdünnung F^i */
  F: Q
  /** Konzentration (falls c₀ gegeben) */
  c: Q | null
}

export interface SerialSolution extends Solution {
  rows: SerialRow[]
  /** Übertrag je Stufe (L) */
  vT: Q
  /** Verdünnungsmittel je Stufe (L) */
  vD: Q
  /** Volumen nach dem Mischen (L) */
  vMix: Q
  /** Einheit der Konzentration (bereinigt) */
  unit: string
  F: Q
}

/**
 * Serielle Verdünnung: c₀ (optional), Faktor F je Stufe, k Stufen, Volumen V je Stufe
 * (nach dem Mischen oder als Rest nach dem Weiterpipettieren).
 */
export function serialDilution(o: { c0?: NumIn | null; unit?: string; F: NumIn | null; k: NumIn | null; V: NumIn | null; vu: string; basis?: SerialBasis }): SerialSolution {
  const Fq = need(o.F, 'den Verdünnungsfaktor je Stufe')
  if (toNum(Fq) <= 1) throw new CalcError('Der Verdünnungsfaktor je Stufe muss größer als 1 sein (z. B. 10 für 1 : 10 oder 2 für 1 : 2).')
  if (toNum(Fq) > 1000) throw new CalcError('Mehr als 1 : 1000 in einem Schritt ist zu ungenau – lieber in mehreren Stufen verdünnen.')
  const kq = need(o.k, 'die Anzahl der Stufen')
  if (!isInt(kq) || sign(kq) <= 0) throw new CalcError('Die Anzahl der Stufen muss eine ganze Zahl ab 1 sein.')
  const k = Number(kq.n)
  if (k > 20) throw new CalcError('Höchstens 20 Stufen – mehr braucht man praktisch nie.')
  const Vin = needPos(o.V, 'das Volumen je Stufe', 'Das Volumen je Stufe')
  if (!VOL_NAMES.includes(o.vu)) throw new CalcError('Unbekannte Volumeneinheit.')
  const V = toLiter(Vin, o.vu)
  const basis: SerialBasis = o.basis === 'rest' ? 'rest' : 'misch'
  const unit = cleanUnit(o.unit ?? '')
  const ut = T(unit)
  const c0 = o.c0 ? o.c0.q : null
  if (c0 && sign(c0) <= 0) throw new CalcError('Die Ausgangskonzentration muss größer als 0 sein.')

  const steps: Step[] = []
  const Ft = qTex(Fq, F)
  const Fb = Ft.includes('{,}') ? `(${Ft})` : Ft
  const Fm1 = sub(Fq, ONE)
  const Fm1t = qTex(Fm1, F)
  const given = [`F = ${Ft}`, `k = ${k}\\ \\text{Stufen}`, `${basis === 'rest' ? 'V_{\\text{Rest}}' : 'V'} = ${qTex(Vin, F)}${T(o.vu)}`]
  if (c0) given.unshift(`c_0 = ${sciT(toNum(c0), 4)}${ut}`)
  steps.push({
    tex: given.join(',\\quad '),
    head: 'Gegeben',
    note: `Jede Stufe wird $1 : ${Ft}$ verdünnt.${basis === 'rest' ? ' Das Volumen ist das, was nach dem Weiterpipettieren in jedem Röhrchen bleiben soll.' : ' Das Volumen ist der Inhalt eines Röhrchens nach dem Mischen.'}`,
  })
  steps.push({
    tex: `1 : ${Ft} \\;\\widehat{=}\\; 1 + ${Fm1t}`,
    head: 'Schreibweise',
    note: `„$1 : ${Ft}$“ heißt hier: 1 Teil Probe in insgesamt $${Ft}$ Teilen (Verdünnungsfaktor $F = ${Ft}$). Gemischt wird also 1 Teil Probe + $${Fm1t}$ ${Fm1t === '1' ? 'Teil' : 'Teile'} Verdünnungsmittel („$1 + ${Fm1t}$“). Wer das Mischungsverhältnis meint, schreibt manchmal „$1 : ${Fm1t}$“ – gemeint ist dieselbe Verdünnung. Hier gilt immer: $1 : F$ = 1 Teil in $F$ Teilen.`,
  })
  let vMix: Q
  if (basis === 'rest') {
    vMix = div(mul(V, Fq), Fm1)
    steps.push({
      tex: `V = V_{\\text{Rest}} \\cdot \\frac{F}{F - 1} = ${volTex(V)} \\cdot \\frac{${Ft}}{${Fm1t}} ${volEq(vMix)}`,
      head: 'Volumen nach dem Mischen',
      note: 'Nach dem Mischen wird $\\tfrac{V}{F}$ weiterpipettiert, im Röhrchen bleibt $V - \\tfrac{V}{F} = V \\cdot \\tfrac{F - 1}{F}$. Nach $V$ umgestellt ergibt sich die Formel links.',
    })
  } else vMix = V
  const vT = div(vMix, Fq)
  const vD = sub(vMix, vT)
  steps.push({
    tex: `V_{\\text{Ü}} = \\frac{V}{F} = \\frac{${volTex(vMix)}}{${Ft}} ${volEq(vT)}`,
    head: 'Volumen je Stufe',
    note: 'Übertrag: So viel wird aus dem vorigen Röhrchen (bzw. aus der Ausgangslösung) ins nächste pipettiert.',
  })
  steps.push({
    tex: `V_{\\text{VM}} = V - V_{\\text{Ü}} = ${volTex(vMix)} - ${volTex(vT)} ${volEq(vD)}`,
    note: 'Verdünnungsmittel, das in jedem Röhrchen vorgelegt wird (z. B. sterile physiologische Kochsalzlösung oder Puffer).',
    final: !c0,
  })

  const rows: SerialRow[] = []
  for (let i = 1; i <= k; i++) {
    const Fi = qpow(Fq, i)
    rows.push({ i, F: Fi, c: c0 ? div(c0, Fi) : null })
  }
  const last = rows[k - 1]
  if (c0) {
    steps.push({ tex: `c_n = \\frac{c_0}{F^{\\,n}}`, head: 'Konzentration je Stufe', note: 'Mit jeder Stufe wird die Konzentration durch $F$ geteilt – nach $n$ Stufen also durch $F^{\\,n}$.' })
    const show = k <= 4 ? rows : [rows[0], rows[1], last]
    show.forEach((r, j) => {
      steps.push({
        tex: `c_{${r.i}} = \\frac{${sciT(toNum(c0), 4)}${ut}}{${powTex(Fb, r.i)}} ${sciEq(toNum(r.c!), 3)}${ut}`,
        note: k > 4 && j === 2 ? `Die Stufen 3 bis ${k - 1} stehen in der Tabelle.` : undefined,
        final: r.i === k,
      })
    })
  }
  const kk = log10Exact(last.F)
  steps.push({
    tex: `F_{\\text{ges}} = F^{\\,k} = ${powTex(Fb, k)} ${factorEq(last.F)} \\;\\Rightarrow\\; ${dilTex(last.F)}`,
    head: 'Gesamtverdünnung',
    note:
      kk !== null
        ? `Die Faktoren der Stufen werden multipliziert: In der letzten Stufe ist die Ausgangslösung $1 : ${factorTex(last.F)}$ verdünnt – Verdünnungsstufe $10^{-${kk}}$.`
        : `Die Faktoren der Stufen werden multipliziert: In der letzten Stufe ist die Ausgangslösung $1 : ${factorTex(last.F)}$ verdünnt.`,
    final: !c0,
  })

  const perStep = `\\text{je Stufe: } V_{\\text{Ü}} ${volEq(vT)},\\ V_{\\text{VM}} ${volEq(vD)}`
  const extra = c0 ? [perStep, `F_{\\text{ges}} = ${dilTex(last.F)}`] : [`F_{\\text{ges}} = ${dilTex(last.F)}`]
  const result = c0 ? `c_{${k}} ${sciEq(toNum(last.c!), 3)}${ut}` : `V_{\\text{Ü}} ${volEq(vT)},\\quad V_{\\text{VM}} ${volEq(vD)}`
  const remarks: string[] = []
  if (sign(sub(vT, MIN_PIPET)) < 0) remarks.push(`Der Übertrag von ${volText(vT)} ist zu klein, um genau zu pipettieren (Faustregel: nicht unter 2 µL) – ein größeres Volumen je Stufe wählen.`)
  remarks.push(
    basis === 'rest'
      ? 'Aus dem letzten Röhrchen den Übertrag verwerfen, damit überall gleich viel übrig bleibt. Vor jedem Übertrag gut mischen und für jede Stufe eine frische Spitze nehmen – sonst verschleppt man Probe.'
      : `Nach dem Weiterpipettieren bleiben in jedem Röhrchen $${volTex(vD)}$, nur im letzten das volle Volumen. Vor jedem Übertrag gut mischen und für jede Stufe eine frische Spitze nehmen – sonst verschleppt man Probe.`,
  )
  return { result, extra, steps, remark: remarks.join(' '), rows, vT, vD, vMix, unit, F: Fq }
}

/* ============================ Standardreihe ============================ */

/** Einheiten für Stamm- und Standardkonzentration */
export const STD_UNITS: readonly Unit[] = [...MCONC_U, ...CONC_U]
export const STD_UNIT_NAMES = unitNames(STD_UNITS)
const kindOf = (u: string) => (unitNames(MCONC_U).includes(u) ? 'm' : unitNames(CONC_U).includes(u) ? 'n' : null)

export interface StdRow {
  i: number
  c: Q
  /** Stammlösung (in der Volumeneinheit der Eingabe) */
  vS: Q
  /** Verdünnungsmittel */
  vD: Q
}

export interface StdSolution extends Solution {
  rows: StdRow[]
  /** Volumeneinheit der Tabelle */
  vu: string
  /** Einheit der Standards */
  cu: string
  totalS: Q
  totalD: Q
}

/** Standardreihe: aus einer Stammlösung Standards mit den Zielkonzentrationen herstellen */
export function standardSeries(o: { stock: NumIn | null; su: string; targets: string; tu: string; V: NumIn | null; vu: string }): StdSolution {
  const cS0 = needPos(o.stock, 'die Konzentration der Stammlösung', 'Die Konzentration der Stammlösung')
  const ks = kindOf(o.su)
  const kt = kindOf(o.tu)
  if (!ks || !kt) throw new CalcError('Unbekannte Konzentrationseinheit.')
  if (ks !== kt) throw new CalcError('Stammlösung und Standards brauchen dieselbe Art von Konzentration – entweder beide als Massenkonzentration (z. B. mg/mL) oder beide als Stoffmengenkonzentration (z. B. mmol/L).')
  const toks = listTokens(o.targets)
    .split(/[;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!toks.length) throw new CalcError('Bitte die Konzentrationen der Standards eingeben, z. B. 0; 25; 50; 100; 200.')
  if (toks.length > 20) throw new CalcError('Höchstens 20 Standards auf einmal.')
  const targets = toks.map((t, i) => parseNum(t, `Standard ${i + 1}`)!.q)
  targets.forEach((c, i) => {
    if (sign(c) < 0) throw new CalcError(`Standard ${i + 1}: Eine Konzentration kann nicht negativ sein.`)
  })
  const Vin = needPos(o.V, 'das Volumen je Standard', 'Das Volumen je Standard')
  if (!VOL_NAMES.includes(o.vu)) throw new CalcError('Unbekannte Volumeneinheit.')
  // Stammlösung in die Einheit der Standards umrechnen
  const cS = div(mul(cS0, fac(STD_UNITS, o.su)), fac(STD_UNITS, o.tu))
  targets.forEach((c, i) => {
    if (toNum(c) > toNum(cS) * (1 + 1e-12))
      throw new CalcError(`Standard ${i + 1} (${txt(toNum(c))} ${o.tu}) ist konzentrierter als die Stammlösung (${txt(toNum(cS))} ${o.tu}) – durch Verdünnen geht das nicht.`)
  })
  const st = T(o.su)
  const ct = T(o.tu)
  const vt = T(o.vu)
  const steps: Step[] = []
  steps.push({
    tex: `c_{\\text{Stamm}} = ${qTex(cS0, F)}${st},\\quad V = ${qTex(Vin, F)}${vt}\\ \\text{je Standard}`,
    head: 'Gegeben',
    note: `${targets.length} Standards mit ${targets.map((c) => `$${qt(c, 6)}$`).join(', ')} ${o.tu}.`,
  })
  if (o.su !== o.tu) steps.push({ tex: `c_{\\text{Stamm}} = ${qTex(cS0, F)}${st} ${qeq(cS, 6)}${ct}`, head: 'Einheiten umrechnen', note: 'Stammlösung und Standards müssen in derselben Einheit stehen, bevor man rechnet.' })
  steps.push({
    tex: `c_{\\text{Stamm}} \\cdot V_{\\text{Stamm}} = c_{\\text{Std}} \\cdot V \\;\\Rightarrow\\; V_{\\text{Stamm}} = \\frac{c_{\\text{Std}} \\cdot V}{c_{\\text{Stamm}}}`,
    head: 'Formel',
    note: 'Beim Verdünnen bleibt die Stoffmenge (bzw. Masse) gleich: Was aus der Stammlösung kommt, steckt danach im ganzen Standard. Dazu kommt Verdünnungsmittel bis zum Volumen $V$: $V_{\\text{VM}} = V - V_{\\text{Stamm}}$.',
  })
  const rows: StdRow[] = targets.map((c, i) => {
    const vS = div(mul(c, Vin), cS)
    return { i: i + 1, c, vS, vD: sub(Vin, vS) }
  })
  rows.forEach((r, j) => {
    const lead = `\\text{Std } ${r.i}${isZero(r.c) ? '\\ (\\text{Leerwert})' : ''}\\colon\\quad `
    const tex = isZero(r.c)
      ? `${lead}V_{\\text{Stamm}} = 0${vt},\\quad V_{\\text{VM}} = ${qTex(Vin, F)}${vt}`
      : `${lead}V_{\\text{Stamm}} = \\frac{${qt(r.c, 6)}${ct} \\cdot ${qTex(Vin, F)}${vt}}{${qt(cS, 6)}${ct}} ${qeq(r.vS)}${vt},\\quad V_{\\text{VM}} ${qeq(r.vD)}${vt}`
    steps.push({ tex, head: j === 0 ? 'Standards' : undefined, note: isZero(r.c) ? 'Der Leerwert (Blindwert) enthält nur Verdünnungsmittel.' : undefined })
  })
  const totalS = sum(rows.map((r) => r.vS))
  const totalD = sum(rows.map((r) => r.vD))
  const nz = rows.filter((r) => !isZero(r.vS))
  steps.push({
    tex: `\\sum V_{\\text{Stamm}} = ${nz.length > 1 && nz.length <= 8 ? `${nz.map((r) => qt(r.vS)).join(' + ')} ` : ''}${qeq(totalS)}${vt}`,
    head: 'Gesamtbedarf',
    note: 'So viel Stammlösung wird insgesamt gebraucht – etwas mehr bereitstellen (Totvolumen, Pipettierverluste).',
    final: true,
  })
  steps.push({ tex: `\\sum V_{\\text{VM}} ${qeq(totalD)}${vt}`, note: 'Verdünnungsmittel insgesamt (z. B. Puffer oder Wasser – dasselbe wie in den Proben).' })

  const remarks: string[] = []
  const tiny = rows.filter((r) => !isZero(r.vS) && sign(sub(toLiter(r.vS, o.vu), MIN_PIPET)) < 0)
  if (tiny.length)
    remarks.push(
      `Achtung: ${tiny.length === 1 ? `Standard ${tiny[0].i} braucht` : `Die Standards ${tiny.map((r) => r.i).join(', ')} brauchen`} weniger als 2 µL Stammlösung – das ist zu ungenau. Besser erst eine Zwischenverdünnung der Stammlösung herstellen (z. B. 1 : 10) oder größere Volumina ansetzen.`,
    )
  remarks.push('Jeden Standard direkt aus der Stammlösung herzustellen vermeidet, dass sich Pipettierfehler von Stufe zu Stufe fortpflanzen. Standards wie die Proben behandeln (gleicher Puffer, gleiche Messung).')
  return {
    result: `\\sum V_{\\text{Stamm}} ${qeq(totalS)}${vt}`,
    extra: [`${rows.length}\\ \\text{Standards zu je}\\ ${qTex(Vin, F)}${vt}`, `\\sum V_{\\text{VM}} ${qeq(totalD)}${vt}`],
    steps,
    remark: remarks.join(' '),
    rows,
    vu: o.vu,
    cu: o.tu,
    totalS,
    totalD,
  }
}

/* ============================ Gesamtverdünnung ============================ */

export interface DilFactor {
  F: Q
  /** wie eingegeben, als TeX („1 : 10“, „1 + 9“) */
  src: string
}

/** Verdünnungsangaben „1:10“, „1+9“, „10“ → Faktoren */
export function parseFactors(s: string): DilFactor[] {
  const norm = listTokens(s).replace(/\s*([:+])\s*/g, '$1')
  const toks = norm
    .split(/[;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  return toks.map((t, i) => {
    const what = `Verdünnung ${i + 1}`
    // Zehnerpotenz wie 1e+3 ist eine Zahl, kein Mischungsverhältnis
    const m = /^\d+(?:[.,]\d*)?[eE][+-]?\d+$/.test(t) ? null : /^([^:+]+)([:+])([^:+]+)$/.exec(t)
    if (m) {
      const a = parseNum(m[1], what)!.q
      const b = parseNum(m[3], what)!.q
      const ratio = m[2] === ':'
      if (sign(a) <= 0 || sign(b) < 0 || (ratio && sign(b) <= 0)) throw new CalcError(`${what}: Die Teile müssen größer als 0 sein.`)
      const Fv = ratio ? div(b, a) : div(add(a, b), a)
      if (toNum(Fv) < 1) throw new CalcError(`${what}: „${t}“ wäre keine Verdünnung – bei „1 : F“ steht die Gesamtzahl der Teile hinten (1 : 10 = 1 Teil in 10 Teilen).`)
      return { F: Fv, src: `${qTex(a, F)} ${m[2]} ${qTex(b, F)}` }
    }
    if (/[:]|[^eE]\+/.test(t)) throw new CalcError(`${what}: „${t}“ verstehe ich nicht – bitte z. B. 1:10, 1+9 oder 10 schreiben.`)
    const v = parseNum(t, what)!.q
    if (toNum(v) < 1) throw new CalcError(`${what}: Ein Verdünnungsfaktor ist mindestens 1 (z. B. 10 für 1 : 10). Für „1 zu 10“ bitte „1:10“ schreiben.`)
    return { F: v, src: qTex(v, F) }
  })
}

export interface TotalSolution extends Solution {
  F: Q
}

/** Gesamtverdünnung aus mehreren Schritten, optional Rückrechnung auf die Ausgangskonzentration */
export function totalDilution(o: { factors: string; c?: NumIn | null; unit?: string }): TotalSolution {
  const fs = parseFactors(o.factors)
  if (!fs.length) throw new CalcError('Bitte die einzelnen Verdünnungen eingeben, z. B. 1:10; 1:10; 1:2.')
  if (fs.length > 20) throw new CalcError('Höchstens 20 Verdünnungsschritte.')
  const Ft = prod(fs.map((f) => f.F))
  if (toNum(Ft) > 1e30) throw new CalcError('Die Gesamtverdünnung ist unrealistisch groß.')
  const steps: Step[] = []
  steps.push({
    tex: fs.map((f, i) => `F_{${i + 1}} = ${qt(f.F, 6)}${f.src !== qTex(f.F, F) ? `\\ (${f.src})` : ''}`).join(',\\quad '),
    head: 'Einzelne Verdünnungen',
    note: '„$1 : 10$“ = 1 Teil in insgesamt 10 Teilen → $F = 10$; „$1 + 9$“ = 1 Teil Probe + 9 Teile Verdünnungsmittel → ebenfalls $F = 10$.',
  })
  const kk = log10Exact(Ft)
  steps.push({
    tex: `F_{\\text{ges}} = ${fs.map((_, i) => `F_{${i + 1}}`).join(' \\cdot ')} = ${fs.map((f) => qt(f.F, 6)).join(' \\cdot ')} ${factorEq(Ft)}`,
    head: 'Gesamtverdünnung',
    note: 'Verdünnungsfaktoren werden **multipliziert**, nicht addiert: Jeder Schritt verdünnt die schon verdünnte Lösung weiter.',
    final: !o.c,
  })
  steps.push({
    tex: `1 : ${factorTex(Ft)} \\;\\widehat{=}\\; \\frac{1}{${factorTex(Ft)}} ${kk !== null && kk > 0 ? `= 10^{-${kk}}` : sciEq(1 / toNum(Ft), 4)}`,
    note: 'Als Bruch: So groß ist der Anteil der ursprünglichen Probe in der letzten Lösung.',
  })
  const extra = [`\\text{Verdünnung } ${dilTex(Ft)}`]
  let result = `F_{\\text{ges}} ${factorEq(Ft)}`
  if (o.c) {
    const c = o.c.q
    if (sign(c) <= 0) throw new CalcError('Die gemessene Konzentration muss größer als 0 sein.')
    const ut = UT(o.unit ?? '')
    const c0 = mul(c, Ft)
    steps.push({
      tex: `c_0 = c_{\\text{gemessen}} \\cdot F_{\\text{ges}} = ${qTex(c, F)}${ut} \\cdot ${factorTex(Ft)} ${sciEq(toNum(c0), 4, 1e-3, 1e6)}${ut}`,
      head: 'Ausgangskonzentration',
      note: 'Gemessen wurde die verdünnte Lösung – die ursprüngliche Probe ist $F_{\\text{ges}}$-mal so konzentriert.',
      final: true,
    })
    extra.unshift(result)
    result = `c_0 ${sciEq(toNum(c0), 4, 1e-3, 1e6)}${ut}`
  }
  return { result, extra, steps, remark: 'Bei Keimzahlen gilt dasselbe: Die Kolonienzahl wird mit dem Gesamtverdünnungsfaktor (und dem ausplattierten Volumen) zurückgerechnet.', F: Ft }
}
