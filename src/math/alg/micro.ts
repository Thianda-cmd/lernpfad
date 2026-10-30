/**
 * Keimzahl & Wachstum: koloniebildende Einheiten (KbE) aus Parallelplatten einer Verdünnungsstufe,
 * gewichtetes Mittel aus zwei aufeinanderfolgenden Stufen (DIN EN ISO 7218) und Generationszeit,
 * Wachstumsrate und Zellzahl im exponentiellen Wachstum – jeweils mit vollständigem Rechenweg.
 */
import { add, CalcError, div, isInt, mul, q, qpow, qTex, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { F, feqv, fnt, T } from './units'
import { cleanUnit, factorTex, fix, need, needPos, parseCounts, qeq, qt, sci, sciEq, sciT, sumTex, toLiter, txt, VOL_NAMES } from './serial'

export type Per = 'mL' | 'g'

export interface KbeSolution extends Solution {
  /** Keimzahl (ungerundet) in KbE/mL bzw. KbE/g */
  N: number
  /** auf zwei gültige Ziffern gerundet */
  rounded: number
}

/** Zählbarer Bereich (Faustregel): 30–300 Kolonien pro Platte */
export const COUNT_LO = 30
export const COUNT_HI = 300

/** auf zwei gültige Ziffern runden (dritte Ziffer ab 5 → aufrunden), wie in DIN EN ISO 7218 */
export function round2(x: number): number {
  if (!(x > 0)) return 0
  const e = Math.floor(Math.log10(x)) - 1
  const r = Math.round(x / 10 ** e + 1e-9)
  return Number((r * 10 ** e).toPrecision(2))
}

/** gerundete Keimzahl als TeX: immer a,b · 10^x (ab 10) */
const r2Tex = (x: number) => sci(x, 2, 1, 10).t

/** Verdünnungsstufe d = 10^-k aus der Eingabe k (auch „-5“ wird als 10⁻⁵ verstanden) */
function level(kIn: NumIn | null | undefined, what = 'die Verdünnungsstufe (k in 10^-k)'): { k: number; d: Q; tex: string } {
  const kq = need(kIn, what)
  if (!isInt(kq)) throw new CalcError('Die Verdünnungsstufe ist eine ganze Zahl k (z. B. 5 für 10⁻⁵).')
  const k = Math.abs(Number(kq.n))
  if (k > 15) throw new CalcError('Verdünnungsstufen über 10⁻¹⁵ sind unrealistisch.')
  return { k, d: qpow(q(10), -k), tex: k === 0 ? '1' : `10^{-${k}}` }
}

/** ausplattiertes Volumen in mL */
function plated(V: NumIn | null | undefined, vu: string): { mL: Q; tex: string } {
  const v = needPos(V, 'das ausplattierte Volumen', 'Das ausplattierte Volumen')
  if (!VOL_NAMES.includes(vu)) throw new CalcError('Unbekannte Volumeneinheit.')
  const mL = mul(toLiter(v, vu), q(1000))
  if (toNum(mL) > 1000) throw new CalcError('Mehr als 1 L ausplattiertes bzw. filtriertes Volumen ist unrealistisch.')
  return { mL, tex: `${qTex(v, F)}${T(vu)}` }
}

const perUnit = (per: string) => (per === 'g' ? 'KbE/g' : 'KbE/mL')

/** Hinweise zum zählbaren Bereich */
function rangeNotes(cs: number[]): string[] {
  const out: string[] = []
  const hi = cs.filter((c) => c > COUNT_HI)
  const lo = cs.filter((c) => c < COUNT_LO)
  if (hi.length)
    out.push(
      `${hi.length === 1 ? `Eine Platte hat` : `${hi.length} Platten haben`} mehr als ${COUNT_HI} Kolonien – dort wachsen Kolonien zusammen und konkurrieren um Nährstoffe, man zählt zu wenig. Solche Platten gelten als „nicht auszählbar“; besser die nächsthöhere Verdünnungsstufe auswerten.`,
    )
  if (lo.length)
    out.push(
      `${lo.length === 1 ? `Eine Platte hat` : `${lo.length} Platten haben`} weniger als ${COUNT_LO} Kolonien – der Zufallsfehler ist dann groß (bei 30 Kolonien etwa ±18 %, bei 10 Kolonien etwa ±32 %). Besser eine niedrigere Verdünnungsstufe auswerten.`,
    )
  return out
}

const RANGE_RULE = `Zählbarer Bereich: ${COUNT_LO}–${COUNT_HI} Kolonien pro Platte (Faustregel; manche Normen werten schon ab 10 Kolonien aus, die FDA nutzt 25–250). Eine Kolonie kann aus einer einzelnen Zelle oder aus einem Zellhaufen entstehen – deshalb „koloniebildende Einheiten“.`

/* ---------------------------- Koloniezahl (eine Stufe) ---------------------------- */

/** KbE pro mL (g) aus Parallelplatten einer Verdünnungsstufe */
export function colonyCount(o: { plates: string; V: NumIn | null; vu: string; k: NumIn | null; per?: Per | string }): KbeSolution {
  const cs = parseCounts(o.plates, 'Kolonien')
  if (!cs.length) throw new CalcError('Bitte die Kolonien der Parallelplatten eingeben, z. B. 156; 172; 164.')
  const V = plated(o.V, o.vu)
  const lv = level(o.k)
  const pu = perUnit(o.per ?? 'mL')
  const ut = T(pu)
  const n = cs.length
  const sumC = cs.reduce((a, b) => a + b, 0)
  const mean = q(sumC, n)
  const steps: Step[] = []
  steps.push({
    tex: `${n === 1 ? `C = ${cs[0]}` : `C_1 \\dots C_{${n}}\\colon\\ ${cs.join(';\\ ')}`}\\ \\text{Kolonien},\\quad V = ${V.tex},\\quad d = ${lv.tex}`,
    head: 'Gegeben',
    note: `${n === 1 ? 'Eine Platte' : `${n} Parallelplatten`} derselben Verdünnungsstufe. $d$ ist die Verdünnung der ausplattierten Lösung${lv.k ? ` ($10^{-${lv.k}} \\;\\widehat{=}\\; 1 : ${factorTex(qpow(q(10), lv.k))}$)` : ' (unverdünnt, $d = 1$)'}.`,
  })
  steps.push({
    tex: n === 1 ? `\\bar C = ${cs[0]}` : `\\bar C = \\frac{${sumTex(cs, 'C')}}{${n}} = \\frac{${sumC}}{${n}} ${qeq(mean)}`,
    head: 'Mittelwert',
    note: 'Mittelwert der Parallelplatten.',
  })
  if (sumC === 0) throw new CalcError('Auf keiner Platte sind Kolonien gewachsen – angeben lässt sich nur „weniger als“ (Nachweisgrenze). Eine niedrigere Verdünnungsstufe ausplattieren.')
  if (o.vu !== 'mL') steps.push({ tex: `V = ${V.tex} ${qeq(V.mL, 6)}${T('mL')}`, head: 'Einheiten umrechnen', note: 'Das Volumen in mL, damit das Ergebnis in KbE pro mL herauskommt.' })
  steps.push({
    tex: `N = \\frac{\\bar C}{V \\cdot d}`,
    head: 'Formel',
    note: `Kolonien pro Platte geteilt durch die Probenmenge, die tatsächlich auf der Platte gelandet ist ($V \\cdot d$). Gleichbedeutend: $N = \\bar C \\cdot \\tfrac{1}{d} \\cdot \\tfrac{1}{V}$ mit dem Verdünnungsfaktor $\\tfrac{1}{d}${lv.k ? ` = 10^{${lv.k}}` : ' = 1'}$.`,
  })
  const Nq = div(mean, mul(V.mL, lv.d))
  const N = toNum(Nq)
  const den = mul(V.mL, lv.d)
  steps.push({
    tex: `N = \\frac{${qt(mean)}}{${qt(V.mL, 6)}${T('mL')} \\cdot ${lv.tex}} = \\frac{${qt(mean)}}{${sciT(toNum(den), 4, 1e-2)}${T('mL')}} ${sciEq(N, 4)}${ut}`,
    head: 'Einsetzen',
    final: true,
  })
  const R = round2(N)
  steps.push({
    tex: `N \\approx ${r2Tex(R)}${ut}`,
    head: 'Runden',
    note: `Keimzahlen werden auf zwei gültige Ziffern gerundet (DIN EN ISO 7218): Ist die dritte Ziffer 5 oder größer, wird aufgerundet.${o.per === 'g' ? ' Bei festen Proben (KbE/g) ist die Ausgangssuspension (z. B. 10 g Probe + 90 mL Verdünnungsmittel) schon die Stufe $10^{-1}$.' : ''}`,
    final: true,
  })
  const rem = [...rangeNotes(cs)]
  if (n >= 2 && toNum(mean) >= 10) {
    const m = toNum(mean)
    const bad = cs.filter((c) => Math.abs(c - m) > 3 * Math.sqrt(m))
    if (bad.length) rem.push(`Die Parallelplatten weichen stark voneinander ab (zufällig wären etwa ±${txt(Number(Math.sqrt(m).toFixed(1)))} Kolonien) – Pipettierfehler, ungleichmäßig verteilt oder verunreinigt?`)
  }
  rem.push(RANGE_RULE)
  return {
    result: `N \\approx ${r2Tex(R)}${ut}`,
    extra: [`N ${sciEq(N, 4)}${ut}\\ \\text{(ungerundet)}`, `\\bar C ${qeq(mean)}\\ \\text{Kolonien pro Platte}`],
    steps,
    remark: rem.join(' '),
    N,
    rounded: R,
  }
}

/* ---------------------------- gewichtetes Mittel (zwei Stufen) ---------------------------- */

/**
 * DIN EN ISO 7218: N = ΣC / (V · (n₁ + 0,1 · n₂) · d)
 * ΣC = Kolonien aller berücksichtigten Platten zweier aufeinanderfolgender Stufen (10-fach),
 * n₁/n₂ = Plattenzahl der niedrigeren/höheren Stufe, d = Verdünnung der niedrigeren Stufe.
 */
export function weightedMean(o: { c1: string; c2: string; V: NumIn | null; vu: string; k: NumIn | null; per?: Per | string }): KbeSolution {
  const a = parseCounts(o.c1, 'Kolonien der niedrigeren Stufe')
  const b = parseCounts(o.c2, 'Kolonien der höheren Stufe')
  if (!a.length) throw new CalcError('Bitte die Kolonien der niedrigeren Verdünnungsstufe eingeben (die Platten mit mehr Kolonien).')
  if (!b.length) throw new CalcError('Bitte die Kolonien der nächsthöheren Verdünnungsstufe eingeben (die Platten mit weniger Kolonien).')
  const V = plated(o.V, o.vu)
  const lv = level(o.k, 'die Verdünnungsstufe der niedrigeren Stufe (k in 10^-k)')
  const pu = perUnit(o.per ?? 'mL')
  const ut = T(pu)
  const d2 = `10^{-${lv.k + 1}}`
  const steps: Step[] = []
  steps.push({
    tex: `\\text{Stufe } ${lv.tex}\\colon\\ ${a.join(';\\ ')} \\qquad \\text{Stufe } ${d2}\\colon\\ ${b.join(';\\ ')}`,
    head: 'Gegeben',
    note: `Kolonien auf den Platten zweier aufeinanderfolgender Verdünnungsstufen (Faktor 10 dazwischen), je $V = ${V.tex}$ ausplattiert.`,
  })
  const a1 = a.filter((c) => c <= COUNT_HI)
  const b1 = b.filter((c) => c <= COUNT_HI)
  const dropped = [...a, ...b].filter((c) => c > COUNT_HI)
  if (!a1.length) throw new CalcError(`Auf der niedrigeren Stufe hat keine Platte höchstens ${COUNT_HI} Kolonien – dann nur die höhere Stufe auswerten (Aufgabe „Koloniezahl“).`)
  if (!b1.length) throw new CalcError(`Auf der höheren Stufe hat keine Platte höchstens ${COUNT_HI} Kolonien – dann stimmt die Verdünnungsreihe nicht.`)
  if (Math.max(...a1, ...b1) < 10) throw new CalcError('Mindestens eine Platte muss 10 oder mehr Kolonien haben – sonst ist das Ergebnis nur eine grobe Schätzung. Eine niedrigere Verdünnungsstufe ausplattieren.')
  const n1 = a1.length
  const n2 = b1.length
  if (b1.reduce((x, y) => x + y, 0) / n2 > a1.reduce((x, y) => x + y, 0) / n1)
    throw new CalcError('Auf der höheren Verdünnungsstufe sind mehr Kolonien als auf der niedrigeren – sind die Stufen vertauscht? Oben die Platten mit den meisten Kolonien eintragen.')
  steps.push({
    tex: `n_1 = ${n1},\\quad n_2 = ${n2}`,
    head: 'Platten auswählen',
    note: `Berücksichtigt werden alle Platten mit höchstens ${COUNT_HI} Kolonien; mindestens eine davon muss 10 oder mehr Kolonien haben.${dropped.length ? ` Nicht berücksichtigt (über ${COUNT_HI}): ${dropped.join(', ')}.` : ''} $n_1$ = Plattenzahl der niedrigeren, $n_2$ der höheren Stufe.`,
  })
  const all = [...a1, ...b1]
  const SC = all.reduce((x, y) => x + y, 0)
  steps.push({
    tex: 'N = \\frac{\\sum C}{V \\cdot (n_1 + 0{,}1 \\cdot n_2) \\cdot d}',
    head: 'Formel',
    note: 'Gewichtetes Mittel nach DIN EN ISO 7218: Die Platten der höheren Stufe zählen nur ein Zehntel, weil auf ihnen zehnmal weniger Probe ist. $d$ ist die Verdünnung der **niedrigeren** Stufe.',
  })
  steps.push({
    tex: `\\sum C = ${sumTex(all, 'C')} = ${SC}`,
    head: 'Werte',
    note: 'Summe der Kolonien aller berücksichtigten Platten beider Stufen.',
  })
  const w = add(q(n1), mul(q(1, 10), q(n2)))
  const den = mul(mul(V.mL, w), lv.d)
  steps.push({
    tex: `n_1 + 0{,}1 \\cdot n_2 = ${n1} + 0{,}1 \\cdot ${n2} = ${qTex(w, F)},\\quad V = ${qt(V.mL, 6)}${T('mL')},\\quad d = ${lv.tex}`,
  })
  const Nq = div(q(SC), den)
  const N = toNum(Nq)
  steps.push({
    tex: `N = \\frac{${SC}}{${qt(V.mL, 6)}${T('mL')} \\cdot ${qTex(w, F)} \\cdot ${lv.tex}} = \\frac{${SC}}{${sciT(toNum(den), 4, 1e-3)}${T('mL')}} ${sciEq(N, 5, 1e-3, 1e6)}${ut}`,
    head: 'Einsetzen',
    final: true,
  })
  const R = round2(N)
  steps.push({
    tex: `N \\approx ${r2Tex(R)}${ut}`,
    head: 'Runden',
    note: 'Auf zwei gültige Ziffern runden: Ist die dritte Ziffer 5 oder größer, wird aufgerundet. Angabe als Zahl zwischen 1,0 und 9,9 mal Zehnerpotenz.',
    final: true,
  })
  // Plausibilität: Schätzung aus jeder Stufe einzeln
  const m1 = a1.reduce((x, y) => x + y, 0) / n1
  const m2 = b1.reduce((x, y) => x + y, 0) / n2
  const N1 = m1 / (toNum(V.mL) * toNum(lv.d))
  const N2 = m2 / (toNum(V.mL) * toNum(lv.d) / 10)
  steps.push({
    tex: `N_{${lv.tex}} = \\frac{${fnt(m1, 4)}}{${qt(V.mL, 6)} \\cdot ${lv.tex}} ${sciEq(N1, 3)},\\qquad N_{${d2}} = \\frac{${fnt(m2, 4)}}{${qt(V.mL, 6)} \\cdot ${d2}} ${sciEq(N2, 3)}`,
    head: 'Plausibilität',
    note: 'Jede Stufe für sich ausgewertet – beide Werte sollten ungefähr übereinstimmen. Das gewichtete Mittel liegt dazwischen, näher an der Stufe mit mehr Kolonien.',
  })
  const rem: string[] = []
  if (m2 >= 10 && Math.max(N1, N2) / Math.min(N1, N2) > 2)
    rem.push(`Die beiden Stufen passen schlecht zusammen (Faktor ${txt(Number((Math.max(N1, N2) / Math.min(N1, N2)).toFixed(1)))}) – Pipettierfehler in der Verdünnungsreihe oder zusammengewachsene Kolonien?`)
  if (dropped.length) rem.push(`Platten mit mehr als ${COUNT_HI} Kolonien (${dropped.join(', ')}) gehen nicht in die Rechnung ein – die Kolonien wachsen dort zusammen.`)
  rem.push('Die Formel setzt eine 10er-Verdünnungsreihe voraus (daher der Faktor 0,1). Auch Platten der höheren Stufe mit wenigen Kolonien werden mitgezählt.')
  return {
    result: `N \\approx ${r2Tex(R)}${ut}`,
    extra: [`N ${sciEq(N, 5, 1e-3, 1e6)}${ut}\\ \\text{(ungerundet)}`, `\\sum C = ${SC},\\ n_1 = ${n1},\\ n_2 = ${n2}`],
    steps,
    remark: rem.join(' '),
    N,
    rounded: R,
  }
}

/* ---------------------------- Generationszeit & Wachstum ---------------------------- */

export type GrowthMode = 'messung' | 'menge' | 'dauer'

export const TIME_UNITS = ['min', 'h', 'd']

export interface GrowthSolution extends Solution {
  /** Generationen */
  n: number
  /** Generationszeit (in tu) */
  g: number
  /** Wachstumsrate µ (pro tu) */
  mu: number
  /** Zeit (in tu) */
  t: number
  N0: number
  /** Zellzahl am Ende */
  Nt: number
  tu: string
  unit: string
}

const LG2 = Math.log10(2)

/** Zeit in der anderen gebräuchlichen Einheit: 20 min = 0,3333 h, 1,5 h = 90 min */
function otherTime(x: number, tu: string): string | null {
  if (tu === 'min') return x >= 60 ? `${feqv(x / 60, 4)}${T('h')}` : null
  if (tu === 'h') return x < 1 ? `${feqv(x * 60, 4)}${T('min')}` : x >= 48 ? `${feqv(x / 24, 4)}${T('d')}` : null
  return x < 1 ? `${feqv(x * 24, 4)}${T('h')}` : null
}

/**
 * Exponentielles Wachstum N = N₀ · 2^(t/g):
 * messung: N₀, N_t, t → n, g, µ · menge: N₀, g, t → N · dauer: N₀, g, N → t
 */
export function growth(o: { mode: GrowthMode | string; N0: NumIn | null; Nt?: NumIn | null; t?: NumIn | null; g?: NumIn | null; N?: NumIn | null; tu: string; unit?: string }): GrowthSolution {
  const tu = TIME_UNITS.includes(o.tu) ? o.tu : 'min'
  const tt = T(tu)
  const unit = cleanUnit(o.unit ?? '')
  const ut = T(unit)
  const N0q = needPos(o.N0, 'die Anfangszellzahl N₀', 'Die Anfangszellzahl N₀')
  const N0 = toNum(N0q)
  const tooBig = (x: number) => {
    if (x > 1e15) throw new CalcError('Mehr als 10¹⁵ Zellen sind unrealistisch – bitte die Eingabe prüfen.')
  }
  /** Zeiten (t, g) in der gewählten Einheit: über 10⁶ ist sicher ein Tippfehler */
  const timeOk = (x: number, what: string) => {
    if (!Number.isFinite(x) || x > 1e6) throw new CalcError(`${what} ist unrealistisch groß – bitte Wert und Einheit prüfen.`)
  }
  tooBig(N0)
  const steps: Step[] = []
  const rem = 'Die Formeln gelten nur in der exponentiellen (logarithmischen) Wachstumsphase – nicht in der Anlaufphase (lag-Phase) und nicht mehr in der stationären Phase. Zur Orientierung: E. coli teilt sich unter optimalen Bedingungen etwa alle 20 min, viele Säugerzellen in Kultur etwa alle 24 h.'
  const nNote = 'Bei jeder Teilung verdoppelt sich die Zellzahl: $N_t = N_0 \\cdot 2^{\\,n}$. Logarithmieren ergibt $\\lg N_t = \\lg N_0 + n \\cdot \\lg 2$ – nach $n$ auflösen.'
  if (o.mode === 'menge' || o.mode === 'dauer') {
    const gq = needPos(o.g, 'die Generationszeit g', 'Die Generationszeit g')
    const g = toNum(gq)
    timeOk(g, 'Die Generationszeit')
    if (o.mode === 'menge') {
      const tq = needPos(o.t, 'die Zeit t', 'Die Zeit t')
      const t = toNum(tq)
      timeOk(t, 'Die Zeit')
      const nq = div(tq, gq)
      const n = toNum(nq)
      if (n > 200) throw new CalcError('Mehr als 200 Generationen: So lange wächst keine Kultur exponentiell – Nährstoffe und Platz gehen viel früher aus.')
      steps.push({ tex: `N_0 = ${sciT(N0, 4)}${ut},\\quad g = ${qTex(gq, F)}${tt},\\quad t = ${qTex(tq, F)}${tt}`, head: 'Gegeben', note: 'Gesucht: die Zellzahl nach der Zeit $t$.' })
      steps.push({ tex: `n = \\frac{t}{g} = \\frac{${qTex(tq, F)}${tt}}{${qTex(gq, F)}${tt}} ${qeq(nq)}`, head: 'Anzahl Generationen', note: 'So oft hat sich die Kultur in der Zeit $t$ verdoppelt.' })
      const Nt = N0 * 2 ** n
      const pow = isInt(nq) ? ` = ${sciT(N0, 4)} \\cdot ${qt(qpow(q(2), Number(nq.n)), 8)}` : ` = ${sciT(N0, 4)} \\cdot ${fnt(2 ** n, 4)}`
      steps.push({
        tex: `N_t = N_0 \\cdot 2^{\\,n} = ${sciT(N0, 4)} \\cdot 2^{${qt(nq)}}${pow} ${sciEq(Nt, 3)}${ut}`,
        head: 'Zellzahl',
        note: `Exponentielles Wachstum: Anfangszahl mal 2 hoch Anzahl der Generationen.${Nt > 1e10 ? ' Mehr als etwa $10^{10}$ Bakterien pro mL erreicht eine Flüssigkultur praktisch nicht – vorher beginnt die stationäre Phase.' : ''}`,
        final: true,
      })
      const mu = Math.LN2 / g
      steps.push({ tex: `\\mu = \\frac{\\ln 2}{g} = \\frac{0{,}6931}{${qTex(gq, F)}${tt}} ${feqv(mu, 4)}${T(`${tu}⁻¹`)}`, head: 'Wachstumsrate', note: 'Spezifische Wachstumsrate: $N_t = N_0 \\cdot e^{\\mu t}$ beschreibt dasselbe Wachstum mit der Basis $e$.' })
      return {
        result: `N_t ${sciEq(Nt, 3)}${ut}`,
        extra: [`n ${qeq(nq)}\\ \\text{Generationen}`, `\\mu ${feqv(mu, 4)}${T(`${tu}⁻¹`)}`],
        steps,
        remark: rem,
        n,
        g,
        mu,
        t,
        N0,
        Nt,
        tu,
        unit,
      }
    }
    const Nq = needPos(o.N, 'die gewünschte Zellzahl N', 'Die gewünschte Zellzahl N')
    const N = toNum(Nq)
    tooBig(N)
    if (N <= N0) throw new CalcError('Die gewünschte Zellzahl muss größer als die Anfangszellzahl sein – sonst ist keine Vermehrung nötig.')
    const lN = Math.log10(N)
    const l0 = Math.log10(N0)
    const n = (lN - l0) / LG2
    const t = n * g
    steps.push({ tex: `N_0 = ${sciT(N0, 4)}${ut},\\quad N = ${sciT(N, 4)}${ut},\\quad g = ${qTex(gq, F)}${tt}`, head: 'Gegeben', note: 'Gesucht: die Zeit, bis die Kultur die Zellzahl $N$ erreicht.' })
    steps.push({ tex: 'n = \\frac{\\lg N - \\lg N_0}{\\lg 2}', head: 'Anzahl Generationen', note: nNote })
    steps.push({ tex: `n = \\frac{\\lg(${sciT(N, 4)}) - \\lg(${sciT(N0, 4)})}{\\lg 2} = \\frac{${fix(lN, 4)} - ${fix(l0, 4)}}{${fix(LG2, 4)}} ${feqv(n, 4)}` })
    steps.push({ tex: `t = n \\cdot g = ${fnt(n, 4)} \\cdot ${qTex(gq, F)}${tt} ${feqv(t, 4)}${tt}`, head: 'Zeit', note: 'Jede Generation dauert eine Generationszeit $g$.', final: true })
    const ot = otherTime(t, tu)
    if (ot) steps.push({ tex: `t ${feqv(t, 4)}${tt} ${ot}`, note: 'In eine handlichere Zeiteinheit umgerechnet.' })
    const mu = Math.LN2 / g
    return {
      result: `t ${feqv(t, 4)}${tt}`,
      extra: [...(ot ? [`t ${ot}`] : []), `n ${feqv(n, 4)}\\ \\text{Generationen}`],
      steps,
      remark: rem,
      n,
      g,
      mu,
      t,
      N0,
      Nt: N,
      tu,
      unit,
    }
  }
  // Messung: N0, Nt, t
  const Ntq = needPos(o.Nt, 'die Zellzahl N_t am Ende', 'Die Zellzahl am Ende')
  const tq = needPos(o.t, 'die Zeit t zwischen den Messungen', 'Die Zeit t')
  const Nt = toNum(Ntq)
  const t = toNum(tq)
  tooBig(Nt)
  timeOk(t, 'Die Zeit')
  if (Nt < N0) throw new CalcError('Die Zellzahl hat abgenommen – das ist keine Wachstumsphase (eher Absterbephase). Die Generationszeit nur aus der exponentiellen Phase bestimmen.')
  if (Nt === N0) throw new CalcError('Die Zellzahl hat sich nicht verändert – keine Vermehrung (Anlauf- oder stationäre Phase).')
  const lt = Math.log10(Nt)
  const l0 = Math.log10(N0)
  const n = (lt - l0) / LG2
  const g = t / n
  const mu = Math.log(Nt / N0) / t
  steps.push({ tex: `N_0 = ${sciT(N0, 4)}${ut},\\quad N_t = ${sciT(Nt, 4)}${ut},\\quad t = ${qTex(tq, F)}${tt}`, head: 'Gegeben', note: 'Zwei Zellzahlen aus der exponentiellen Phase und die Zeit dazwischen.' })
  steps.push({ tex: 'n = \\frac{\\lg N_t - \\lg N_0}{\\lg 2}', head: 'Anzahl Generationen', note: nNote })
  steps.push({ tex: `n = \\frac{\\lg(${sciT(Nt, 4)}) - \\lg(${sciT(N0, 4)})}{\\lg 2} = \\frac{${fix(lt, 4)} - ${fix(l0, 4)}}{${fix(LG2, 4)}} ${feqv(n, 4)}` })
  steps.push({ tex: `g = \\frac{t}{n} = \\frac{${qTex(tq, F)}${tt}}{${fnt(n, 4)}} ${feqv(g, 4)}${tt}`, head: 'Generationszeit', note: 'Die Zeit, in der sich die Zellzahl einmal verdoppelt.', final: true })
  const ot = otherTime(g, tu)
  if (ot) steps.push({ tex: `g ${feqv(g, 4)}${tt} ${ot}`, note: 'In die andere Zeiteinheit umgerechnet.' })
  steps.push({
    tex: `\\mu = \\frac{\\ln N_t - \\ln N_0}{t} = \\frac{\\ln(${fnt(Nt / N0, 4)})}{${qTex(tq, F)}${tt}} ${feqv(mu, 4)}${T(`${tu}⁻¹`)}`,
    head: 'Wachstumsrate',
    note: `Spezifische Wachstumsrate (mit dem natürlichen Logarithmus). Kontrolle: $\\mu = \\tfrac{\\ln 2}{g} = \\tfrac{0{,}6931}{${fnt(g, 4)}} ${feqv(Math.LN2 / g, 4)}$.`,
  })
  steps.push({
    tex: `N_0 \\cdot 2^{\\,n} = ${sciT(N0, 4)} \\cdot 2^{${fnt(n, 4)}} ${sciEq(N0 * 2 ** n, 3)} \\ \\checkmark`,
    head: 'Probe',
    note: 'Mit der berechneten Generationenzahl kommt man wieder auf $N_t$.',
  })
  const muH = tu === 'min' ? `,\\ ${feqv(mu * 60, 4)}${T('h⁻¹')}` : ''
  return {
    result: `g ${feqv(g, 4)}${tt}`,
    extra: [...(ot ? [`g ${ot}`] : []), `n ${feqv(n, 4)}\\ \\text{Generationen}`, `\\mu ${feqv(mu, 4)}${T(`${tu}⁻¹`)}${muH}`],
    steps,
    remark: rem,
    n,
    g,
    mu,
    t,
    N0,
    Nt,
    tu,
    unit,
  }
}
