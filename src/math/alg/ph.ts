/**
 * pH-Rechnungen (25 °C): pH ↔ c(H₃O⁺) ↔ pOH ↔ c(OH⁻), starke und schwache Säuren und Basen
 * (Näherungsformel und exakte Lösung der quadratischen Gleichung, Protolysegrad) sowie Puffer nach
 * Henderson-Hasselbalch – pH berechnen (auch nach Zugabe von Säure oder Lauge) und Puffer ansetzen.
 * Logarithmen und Wurzeln mit Gleitkommazahlen; Stoffmengen von Puffern exakt mit Brüchen.
 */
import { approxTex, CalcError, cmp, div, isInt, mul, numTex, q, sign, sub, add, toNum, type Q } from '../q'
import { best, bestF, CONC_U, fac, feqv, fnum, fnt, MASS_U, MOL_U, T, VOL_U } from './units'
import { eqx, need, sh } from './concentration'
import { formulaTexOf, m2, molarMass } from './stoich'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'

/** Ionenprodukt des Wassers bei 25 °C (mol²/L²) */
export const KW = 1e-14
const lg = Math.log10
const H3O = 'c(\\mathrm{H_3O^+})'
const OHm = 'c(\\mathrm{OH^-})'
const ML = T('mol/L')

export type AcidBase = 'saeure' | 'base'

export interface PhSolution extends Solution {
  /** berechneter pH-Wert (für die pH-Skala) */
  pH: number
}

/* ---------------------------- Anzeige ---------------------------- */

/** p-Wert mit genau zwei Nachkommastellen: 2{,}88 */
export function p2(x: number): string {
  let s = x.toFixed(2)
  if (s === '-0.00') s = '0.00'
  return s.replace('.', '{,}')
}
const exact2 = (x: number) => Math.abs(x - Number(x.toFixed(2))) < 1e-9
/** „= 3,00“ bzw. „≈ 2,88“ */
export const p2eq = (x: number) => `${exact2(x) ? '=' : '\\approx'} ${p2(x)}`

/** Zwischenwert eines p-Werts: genau, wenn er höchstens drei Nachkommastellen hat (2,875), sonst zwei */
function pm(x: number): { t: string; e: string } {
  const r3 = Math.round(x * 1000) / 1000
  if (Math.abs(x - r3) < 1e-9 && !exact2(x)) return { t: numTex(r3), e: '=' }
  return { t: p2(x), e: exact2(x) ? '=' : '\\approx' }
}

/** Logarithmus für die Anzeige: ganze Zahl genau, sonst drei Nachkommastellen */
function lgT(x: number): string {
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x))
  return numTex(Number(x.toFixed(3)))
}

/** Konzentration in mol/L als TeX – kleine Werte als Zehnerpotenz: 3{,}162 \cdot 10^{-4} */
export function cT(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '\\text{–}'
  if (x === 0) return '0'
  let e = Math.floor(lg(Math.abs(x)))
  if (e >= -2 && e <= 3) return approxTex(x, sig)
  let m = Number((x / 10 ** e).toFixed(sig - 1))
  if (Math.abs(m) >= 10) {
    m = Number((m / 10).toFixed(sig - 1))
    e++
  }
  return `${numTex(m)} \\cdot 10^{${e}}`
}
const exactSig = (x: number, sig = 4) => x !== 0 && Math.abs(x - Number(x.toPrecision(sig))) <= 1e-10 * Math.abs(x)
/** „= 1 · 10⁻³“ bzw. „≈ 3,162 · 10⁻⁴“ */
export const cEq = (x: number, sig = 4) => `${exactSig(x, sig) ? '=' : '\\approx'} ${cT(x, sig)}`

function classify(pH: number): 'sauer' | 'neutral' | 'alkalisch' {
  const r = Number(pH.toFixed(2))
  return r < 7 ? 'sauer' : r > 7 ? 'alkalisch' : 'neutral'
}

function classStep(pH: number): Step {
  const k = classify(pH)
  const rel = k === 'sauer' ? '<' : k === 'alkalisch' ? '>' : '='
  return {
    head: 'Einordnung',
    tex: `\\text{pH} ${p2eq(pH)} ${rel} 7 \\;\\Rightarrow\\; \\text{${k}}`,
    note: 'Bei 25 °C: pH < 7 sauer, pH = 7 neutral, pH > 7 alkalisch (basisch).',
  }
}

/** Konzentration in mol/L (Zahl) aus Eingabe und Einheit */
function molPerL(x: Q, unit: string): number {
  return toNum(mul(x, fac(CONC_U, unit)))
}

/* ---------------------------- pH ↔ Konzentration ---------------------------- */

export type PhGiven = 'pH' | 'pOH' | 'h' | 'oh'

/** Genau eine der vier Größen pH, pOH, c(H₃O⁺), c(OH⁻) gegeben → alle anderen */
export function phConvert(o: { given: PhGiven; value: NumIn | null; unit?: string }): PhSolution {
  if (!o.value) throw new CalcError('Bitte einen Wert eingeben.')
  const unit = o.unit ?? 'mol/L'
  const steps: Step[] = []
  const v = o.value.q
  let pH: number
  let pOH: number
  let h: number
  let oh: number
  if (o.given === 'pH' || o.given === 'pOH') {
    const x = toNum(v)
    if (x < -2 || x > 16) throw new CalcError('pH- und pOH-Werte liegen praktisch zwischen 0 und 14 – unter −2 oder über 16 gibt es sie nicht.')
    const isPH = o.given === 'pH'
    steps.push({ head: 'Gegeben', tex: `\\text{${o.given}} = ${sh(v)}`, note: isPH ? 'Der pH-Wert gibt an, wie sauer oder alkalisch eine Lösung ist.' : 'Der pOH-Wert ist das Gegenstück zum pH-Wert für die Hydroxidionen.' })
    if (isPH) {
      pH = x
      pOH = 14 - x
      h = 10 ** -pH
      oh = 10 ** -pOH
      steps.push({ head: 'Oxoniumionen', tex: `${H3O} = 10^{-\\text{pH}}${ML} = 10^{${p0(-x)}}${ML} ${cEq(h)}${ML}`, note: 'Umkehrung von $\\text{pH} = -\\lg c(\\mathrm{H_3O^+})$: zehn hoch minus pH.', final: true })
      steps.push({ head: 'pOH-Wert', tex: `\\text{pOH} = 14 - \\text{pH} = 14 - ${sh(v)} ${p2eq(pOH)}`, note: 'Bei 25 °C gilt $\\text{pH} + \\text{pOH} = 14$.' })
      steps.push({ head: 'Hydroxidionen', tex: `${OHm} = 10^{-\\text{pOH}}${ML} = 10^{${p0(-pOH)}}${ML} ${cEq(oh)}${ML}`, note: 'Ebenso: $c(\\mathrm{OH^-}) = K_W / c(\\mathrm{H_3O^+})$.' })
    } else {
      pOH = x
      pH = 14 - x
      oh = 10 ** -pOH
      h = 10 ** -pH
      steps.push({ head: 'pH-Wert', tex: `\\text{pH} = 14 - \\text{pOH} = 14 - ${sh(v)} ${p2eq(pH)}`, note: 'Bei 25 °C gilt $\\text{pH} + \\text{pOH} = 14$.', final: true })
      steps.push({ head: 'Hydroxidionen', tex: `${OHm} = 10^{-\\text{pOH}}${ML} = 10^{${p0(-x)}}${ML} ${cEq(oh)}${ML}`, note: 'Umkehrung von $\\text{pOH} = -\\lg c(\\mathrm{OH^-})$.' })
      steps.push({ head: 'Oxoniumionen', tex: `${H3O} = 10^{-\\text{pH}}${ML} = 10^{${p0(-pH)}}${ML} ${cEq(h)}${ML}`, note: 'Ebenso: $c(\\mathrm{H_3O^+}) = K_W / c(\\mathrm{OH^-})$.' })
    }
  } else {
    if (sign(v) <= 0) throw new CalcError('Die Konzentration muss größer als 0 sein.')
    const isH = o.given === 'h'
    const sym = isH ? H3O : OHm
    const c = molPerL(v, unit)
    if (c > 15) throw new CalcError('So hohe Ionenkonzentrationen (über 15 mol/L) gibt es in wässriger Lösung nicht – prüfe Wert und Einheit.')
    steps.push({ head: 'Gegeben', tex: `${sym} = ${sh(v)}${T(unit)}`, note: isH ? 'Oxoniumionen $\\mathrm{H_3O^+}$ machen eine Lösung sauer.' : 'Hydroxidionen $\\mathrm{OH^-}$ machen eine Lösung alkalisch.' })
    if (unit !== 'mol/L') steps.push({ head: 'Einheiten umrechnen', tex: `${sym} = ${sh(v)}${T(unit)} ${cEq(c)}${ML}`, note: 'Für pH und pOH immer den Zahlenwert in mol/L einsetzen.' })
    if (isH) {
      h = c
      pH = -lg(c)
      pOH = 14 - pH
      oh = KW / c
      steps.push({ head: 'pH-Wert', tex: `\\text{pH} = -\\lg ${H3O} = -\\lg\\left(${cT(c)}\\right) ${p2eq(pH)}`, note: 'pH = negativer dekadischer Logarithmus der Oxoniumionen-Konzentration (Zahlenwert in mol/L).', final: true })
      steps.push({ head: 'pOH-Wert', tex: `\\text{pOH} = 14 - \\text{pH} = 14 - ${pm(pH).t} ${p2eq(pOH)}`, note: 'Bei 25 °C gilt $\\text{pH} + \\text{pOH} = 14$.' })
      steps.push({ head: 'Hydroxidionen', tex: `${OHm} = \\frac{K_W}{${H3O}} = \\frac{10^{-14}}{${cT(c)}} ${cEq(oh)}${ML}`, note: 'Ionenprodukt des Wassers: $K_W = c(\\mathrm{H_3O^+}) \\cdot c(\\mathrm{OH^-}) = 10^{-14}\\,\\text{mol}^2/\\text{L}^2$.' })
    } else {
      oh = c
      pOH = -lg(c)
      pH = 14 - pOH
      h = KW / c
      steps.push({ head: 'pOH-Wert', tex: `\\text{pOH} = -\\lg ${OHm} = -\\lg\\left(${cT(c)}\\right) ${p2eq(pOH)}`, note: 'pOH = negativer dekadischer Logarithmus der Hydroxidionen-Konzentration (in mol/L).' })
      steps.push({ head: 'pH-Wert', tex: `\\text{pH} = 14 - \\text{pOH} = 14 - ${pm(pOH).t} ${p2eq(pH)}`, note: 'Bei 25 °C gilt $\\text{pH} + \\text{pOH} = 14$.', final: true })
      steps.push({ head: 'Oxoniumionen', tex: `${H3O} = \\frac{K_W}{${OHm}} = \\frac{10^{-14}}{${cT(c)}} ${cEq(h)}${ML}`, note: 'Ionenprodukt des Wassers: $K_W = c(\\mathrm{H_3O^+}) \\cdot c(\\mathrm{OH^-}) = 10^{-14}\\,\\text{mol}^2/\\text{L}^2$.' })
    }
  }
  const both = exactSig(h) && exactSig(oh)
  steps.push({ head: 'Probe', tex: `${H3O} \\cdot ${OHm} ${both ? '=' : '\\approx'} ${cT(h)} \\cdot ${cT(oh)} ${both ? '=' : '\\approx'} 10^{-14}\\,\\text{mol}^2/\\text{L}^2 = K_W\\ \\checkmark`, note: 'Das Produkt muss immer das Ionenprodukt des Wassers ergeben.' })
  steps.push(classStep(pH))
  const all = {
    pH: `\\text{pH} ${p2eq(pH)}`,
    pOH: `\\text{pOH} ${p2eq(pOH)}`,
    h: `${H3O} ${cEq(h)}${ML}`,
    oh: `${OHm} ${cEq(oh)}${ML}`,
  }
  const main = o.given === 'pH' ? all.h : all.pH
  const rest = (['pH', 'pOH', 'h', 'oh'] as const).filter((k) => k !== o.given && all[k] !== main).map((k) => all[k])
  const remark = pH < 0 || pH > 14 ? 'Werte unter 0 oder über 14 kommen nur bei sehr konzentrierten Lösungen vor – dort ist die Rechnung mit Konzentrationen nur noch ein Richtwert.' : undefined
  return { result: main, extra: [...rest, `\\text{${classify(pH)}}`], steps, remark, pH }
}

/** Zehnerpotenz in Klammern, wenn sie mit einer Zahl malgenommen wird: 2 · (1 · 10⁻⁸) */
const par = (t: string) => (t.includes('\\cdot') ? `\\left(${t}\\right)` : t)

/** p-Wert als Hochzahl (−3,5 → -3{,}5) */
function p0(x: number): string {
  return Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : numTex(Number(x.toFixed(4)))
}

/* ---------------------------- starke Säuren und Basen ---------------------------- */

export interface StrongPreset {
  id: string
  name: string
  formula: string
  kind: AcidBase
  /** H⁺ bzw. OH⁻ pro Formeleinheit */
  z: number
  eq: string
}

export const STRONG: StrongPreset[] = [
  { id: 'hcl', name: 'Salzsäure', formula: 'HCl', kind: 'saeure', z: 1, eq: '\\mathrm{HCl + H_2O \\longrightarrow H_3O^+ + Cl^-}' },
  { id: 'hno3', name: 'Salpetersäure', formula: 'HNO3', kind: 'saeure', z: 1, eq: '\\mathrm{HNO_3 + H_2O \\longrightarrow H_3O^+ + NO_3^-}' },
  { id: 'h2so4', name: 'Schwefelsäure', formula: 'H2SO4', kind: 'saeure', z: 2, eq: '\\mathrm{H_2SO_4 + 2\\,H_2O \\longrightarrow 2\\,H_3O^+ + SO_4^{2-}}' },
  { id: 'naoh', name: 'Natronlauge', formula: 'NaOH', kind: 'base', z: 1, eq: '\\mathrm{NaOH \\longrightarrow Na^+ + OH^-}' },
  { id: 'koh', name: 'Kalilauge', formula: 'KOH', kind: 'base', z: 1, eq: '\\mathrm{KOH \\longrightarrow K^+ + OH^-}' },
  { id: 'caoh2', name: 'Calciumhydroxid', formula: 'Ca(OH)2', kind: 'base', z: 2, eq: '\\mathrm{Ca(OH)_2 \\longrightarrow Ca^{2+} + 2\\,OH^-}' },
  { id: 'baoh2', name: 'Bariumhydroxid', formula: 'Ba(OH)2', kind: 'base', z: 2, eq: '\\mathrm{Ba(OH)_2 \\longrightarrow Ba^{2+} + 2\\,OH^-}' },
]

function genericStrongEq(acid: boolean, z: number): string {
  if (acid) return z === 1 ? '\\mathrm{HA + H_2O \\longrightarrow H_3O^+ + A^-}' : `\\mathrm{H_${z}A + ${z}\\,H_2O \\longrightarrow ${z}\\,H_3O^+ + A^{${z}-}}`
  return z === 1 ? '\\mathrm{MOH \\longrightarrow M^+ + OH^-}' : `\\mathrm{M(OH)_${z} \\longrightarrow M^{${z}+} + ${z}\\,OH^-}`
}

/**
 * Starke Säure/Base: vollständige Protolyse, c(H₃O⁺) bzw. c(OH⁻) = z · c₀.
 * Unter 10⁻⁶ mol/L zählt die Autoprotolyse des Wassers mit: c = c₀z/2 + √((c₀z)²/4 + K_W).
 */
export function strongPh(o: { kind: AcidBase; c: NumIn | null; cu: string; z: NumIn | null; preset?: string }): PhSolution {
  const acid = o.kind === 'saeure'
  const c0q = need(o.c, 'die Konzentration c₀')
  const zq = need(o.z, 'die Anzahl z')
  if (!isInt(zq) || cmp(zq, q(3)) > 0) throw new CalcError(`z ist die Anzahl der ${acid ? 'abgegebenen Protonen' : 'Hydroxidionen'} pro Formeleinheit – eine ganze Zahl von 1 bis 3.`)
  const z = Number(zq.n)
  const pre = STRONG.find((s) => s.id === o.preset && s.kind === o.kind && s.z === z)
  const c0 = molPerL(c0q, o.cu)
  if (z * c0 > 20) throw new CalcError('So konzentriert gibt es keine Lösung – prüfe Wert und Einheit.')
  const steps: Step[] = []
  const nm = pre ? formulaTexOf(pre.formula) : acid ? '\\text{Säure}' : '\\text{Base}'
  steps.push({
    head: 'Gegeben',
    tex: `c_0(${nm}) = ${sh(c0q)}${T(o.cu)},\\quad z = ${z}`,
    note: acid ? '$z$: Anzahl der Protonen, die ein Säureteilchen abgibt (HCl: 1, $\\mathrm{H_2SO_4}$: 2).' : '$z$: Anzahl der Hydroxidionen pro Formeleinheit (NaOH: 1, $\\mathrm{Ca(OH)_2}$: 2).',
  })
  if (o.cu !== 'mol/L') steps.push({ head: 'Einheiten umrechnen', tex: `c_0 = ${sh(c0q)}${T(o.cu)} ${cEq(c0)}${ML}`, note: 'Für den pH-Wert die Konzentration in mol/L einsetzen.' })
  steps.push({
    head: acid ? 'Protolyse' : 'Dissoziation',
    tex: pre?.eq ?? genericStrongEq(acid, z),
    note: acid ? 'Starke Säuren protolysieren in Wasser vollständig – jedes Säureteilchen gibt seine Protonen ab.' : 'Hydroxide liegen in Wasser vollständig als Ionen vor.',
  })
  const ce = z * c0
  const ion = acid ? H3O : OHm
  if (z === 1) steps.push({ tex: `${ion} = c_0 ${cEq(ce)}${ML}`, note: `Jedes Teilchen liefert genau ein ${acid ? 'Oxoniumion' : 'Hydroxidion'} – die Ionenkonzentration ist so groß wie die Ausgangskonzentration.` })
  else steps.push({ tex: `${ion} = z \\cdot c_0 = ${z} \\cdot ${par(cT(c0))}${ML} ${cEq(ce)}${ML}`, note: `Pro Formeleinheit entstehen ${z} ${acid ? 'Oxoniumionen' : 'Hydroxidionen'}.` })
  let x = ce
  let pH: number
  if (ce < 1e-6) {
    const naive = acid ? -lg(ce) : 14 + lg(ce)
    steps.push({
      head: 'Sehr verdünnt',
      tex: `\\text{einfach gerechnet: pH} = ${acid ? '-' : '14 + '}\\lg\\left(${cT(ce)}\\right) ${p2eq(naive)}`,
      note: `Unter etwa $10^{-6}$ mol/L liefert die Autoprotolyse des Wassers ($10^{-7}$ mol/L) einen merklichen Anteil der Ionen – die einfache Rechnung stimmt dann nicht mehr${(acid && naive >= 7) || (!acid && naive <= 7) ? `: Eine ${acid ? 'Säure' : 'Base'} kann Wasser nicht ${acid ? 'alkalisch' : 'sauer'} machen!` : '.'}`,
    })
    x = ce / 2 + Math.sqrt((ce * ce) / 4 + KW)
    const cs = acid ? 'c_{\\text{Säure}}' : 'c_{\\text{Base}}'
    steps.push({
      tex: `${ion} = \\frac{${cs}}{2} + \\sqrt{\\frac{${cs}^2}{4} + K_W}`,
      note: `Ladungsbilanz: $${ion} = ${cs} + ${acid ? OHm : H3O}$ und $${acid ? OHm : H3O} = K_W / ${ion}$ ergeben eine quadratische Gleichung mit dieser Lösung.`,
    })
    steps.push({ tex: `${ion} = \\frac{${cT(ce)}}{2} + \\sqrt{\\frac{\\left(${cT(ce)}\\right)^2}{4} + 10^{-14}} ${cEq(x)}${ML}` })
  }
  if (acid) {
    pH = -lg(x)
    steps.push({ head: 'pH-Wert', tex: `\\text{pH} = -\\lg ${H3O} = -\\lg\\left(${cT(x)}\\right) ${p2eq(pH)}`, note: 'Zahlenwert der Konzentration in mol/L einsetzen.', final: true })
  } else {
    const pOH = -lg(x)
    pH = 14 - pOH
    steps.push({ head: 'pOH-Wert', tex: `\\text{pOH} = -\\lg ${OHm} = -\\lg\\left(${cT(x)}\\right) ${pm(pOH).e} ${pm(pOH).t}`, note: 'Bei Basen rechnet man zuerst den pOH-Wert aus.' })
    steps.push({ head: 'pH-Wert', tex: `\\text{pH} = 14 - \\text{pOH} = 14 - ${pm(pOH).t} ${p2eq(pH)}`, note: 'Bei 25 °C gilt $\\text{pH} + \\text{pOH} = 14$.', final: true })
  }
  const other = KW / x
  steps.push({
    head: acid ? 'Hydroxidionen' : 'Oxoniumionen',
    tex: `${acid ? OHm : H3O} = \\frac{K_W}{${ion}} = \\frac{10^{-14}}{${cT(x)}} ${cEq(other)}${ML}`,
    note: 'Ionenprodukt des Wassers bei 25 °C.',
  })
  steps.push(classStep(pH))
  const remarks: string[] = []
  if (pre?.id === 'h2so4') remarks.push('Vereinfachung: Die 2. Protolysestufe ($\\mathrm{HSO_4^-}$, $\\text{p}K_S \\approx 1{,}9$) läuft nicht vollständig ab. Mit $z = 2$ gerechnet fällt der pH-Wert daher etwas zu niedrig aus – so rechnet man in der Schule.')
  if (pre?.id === 'caoh2' && c0 > 0.025) remarks.push('Achtung: Calciumhydroxid löst sich nur zu etwa $1{,}7\\,\\text{g/L}$ (20 °C), also höchstens rund $0{,}02\\,\\text{mol/L}$ (Kalkwasser) – so konzentriert lässt sich die Lösung nicht herstellen.')
  if (ce > 1) remarks.push('Bei so hohen Konzentrationen ist der berechnete pH-Wert nur ein Richtwert (Aktivität statt Konzentration); Werte unter 0 bzw. über 14 sind möglich.')
  if (ce < 1e-6) remarks.push('Sehr verdünnt: Die Autoprotolyse des Wassers ist mit eingerechnet – der pH-Wert liegt nahe 7.')
  return {
    result: `\\text{pH} ${p2eq(pH)}`,
    extra: [`${ion} ${cEq(x)}${ML}`, `\\text{pOH} ${p2eq(14 - pH)}`, `\\text{${classify(pH)}}`],
    steps,
    remark: remarks.join(' ') || undefined,
    pH,
  }
}

/* ---------------------------- schwache Säuren und Basen ---------------------------- */

export type KType = 'pKs' | 'Ks' | 'pKb' | 'Kb'

export interface WeakPreset {
  id: string
  name: string
  kind: AcidBase
  kType: 'pKs' | 'pKb'
  pK: string
  eq: string
}

export const WEAK: WeakPreset[] = [
  { id: 'essig', name: 'Essigsäure', kind: 'saeure', kType: 'pKs', pK: '4,76', eq: '\\mathrm{CH_3COOH + H_2O \\rightleftharpoons H_3O^+ + CH_3COO^-}' },
  { id: 'ameisen', name: 'Ameisensäure', kind: 'saeure', kType: 'pKs', pK: '3,75', eq: '\\mathrm{HCOOH + H_2O \\rightleftharpoons H_3O^+ + HCOO^-}' },
  { id: 'fluss', name: 'Flusssäure', kind: 'saeure', kType: 'pKs', pK: '3,17', eq: '\\mathrm{HF + H_2O \\rightleftharpoons H_3O^+ + F^-}' },
  { id: 'kohlen', name: 'Kohlensäure', kind: 'saeure', kType: 'pKs', pK: '6,35', eq: '\\mathrm{H_2CO_3 + H_2O \\rightleftharpoons H_3O^+ + HCO_3^-}' },
  { id: 'dhp', name: 'Dihydrogenphosphat', kind: 'saeure', kType: 'pKs', pK: '7,21', eq: '\\mathrm{H_2PO_4^- + H_2O \\rightleftharpoons H_3O^+ + HPO_4^{2-}}' },
  { id: 'ammonium', name: 'Ammonium', kind: 'saeure', kType: 'pKs', pK: '9,25', eq: '\\mathrm{NH_4^+ + H_2O \\rightleftharpoons H_3O^+ + NH_3}' },
  { id: 'ammoniak', name: 'Ammoniak', kind: 'base', kType: 'pKb', pK: '4,75', eq: '\\mathrm{NH_3 + H_2O \\rightleftharpoons NH_4^+ + OH^-}' },
  { id: 'acetat', name: 'Acetat (Natriumacetat)', kind: 'base', kType: 'pKb', pK: '9,24', eq: '\\mathrm{CH_3COO^- + H_2O \\rightleftharpoons CH_3COOH + OH^-}' },
]

/**
 * Vollständige Ladungsbilanz mit Autoprotolyse: x³ + K·x² − (K·c₀ + K_W)·x − K·K_W = 0
 * (x = c(H₃O⁺) bei Säuren bzw. c(OH⁻) bei Basen). Genau eine positive Lösung – Bisektion im Logarithmus.
 */
export function weakFull(K: number, c0: number): number {
  const f = (x: number) => ((x + K) * x - (K * c0 + KW)) * x - K * KW
  let lo = -20
  let hi = 2
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (f(10 ** mid) > 0) hi = mid
    else lo = mid
  }
  return 10 ** ((lo + hi) / 2)
}

/** Schwache Säure/Base: Näherung pH = ½(pKs − lg c₀) und exakt über die quadratische Gleichung, Protolysegrad α */
export function weakPh(o: { kind: AcidBase; kType: KType; k: NumIn | null; c: NumIn | null; cu: string; preset?: string }): PhSolution {
  const acid = o.kind === 'saeure'
  const kName: Record<KType, string> = { pKs: 'Der pKs-Wert', Ks: 'Die Säurekonstante Ks', pKb: 'Der pKb-Wert', Kb: 'Die Basenkonstante Kb' }
  if (!o.k) throw new CalcError(`${kName[o.kType]} fehlt – bitte eintragen.`)
  const kv = toNum(o.k.q)
  const isP = o.kType === 'pKs' || o.kType === 'pKb'
  if (!isP && kv <= 0) throw new CalcError(`${kName[o.kType]} muss größer als 0 sein.`)
  const pIn = isP ? kv : -lg(kv)
  if (pIn < -2 || pIn > 16) throw new CalcError('Der pK-Wert liegt praktisch zwischen 0 und 14 – prüfe die Eingabe.')
  const acidConst = o.kType === 'pKs' || o.kType === 'Ks'
  const pK = acidConst === acid ? pIn : 14 - pIn
  const c0q = need(o.c, 'die Ausgangskonzentration c₀')
  const c0 = molPerL(c0q, o.cu)
  if (c0 > 20) throw new CalcError('So konzentriert gibt es keine Lösung – prüfe Wert und Einheit.')
  const K = 10 ** -pK
  const pre = WEAK.find((w) => w.id === o.preset && w.kind === o.kind)
  const Ksym = acid ? 'K_S' : 'K_B'
  const pKsym = acid ? '\\text{p}K_S' : '\\text{p}K_B'
  const ion = acid ? H3O : OHm
  const steps: Step[] = []

  const kTex: Record<KType, string> = {
    pKs: `\\text{p}K_S = ${sh(o.k.q)}`,
    Ks: `K_S = ${cT(kv)}${ML}`,
    pKb: `\\text{p}K_B = ${sh(o.k.q)}`,
    Kb: `K_B = ${cT(kv)}${ML}`,
  }
  steps.push({
    head: 'Gegeben',
    tex: `${kTex[o.kType]},\\quad c_0 = ${sh(c0q)}${T(o.cu)}`,
    note: acid ? 'Schwache Säure: Nur ein kleiner Teil der Teilchen gibt ein Proton ab.' : 'Schwache Base: Nur ein kleiner Teil der Teilchen nimmt ein Proton auf.',
  })
  if (o.cu !== 'mol/L') steps.push({ head: 'Einheiten umrechnen', tex: `c_0 = ${sh(c0q)}${T(o.cu)} ${cEq(c0)}${ML}`, note: 'Für die Formeln die Konzentration in mol/L einsetzen.' })
  // Konstante auf pKs bzw. pKb bringen
  const pKt = isP && acidConst === acid ? sh(o.k.q) : pm(pK).t
  if (!isP) {
    const pp = -lg(kv)
    const s0 = acidConst ? '\\text{p}K_S' : '\\text{p}K_B'
    steps.push({ head: acidConst ? 'pKs-Wert' : 'pKb-Wert', tex: `${s0} = -\\lg ${acidConst ? 'K_S' : 'K_B'} = -\\lg\\left(${cT(kv)}\\right) ${pm(pp).e} ${pm(pp).t}`, note: 'Je kleiner der pK-Wert, desto stärker die Säure bzw. Base.' })
  }
  if (acidConst !== acid) {
    const given = isP ? sh(o.k.q) : pm(pIn).t
    steps.push({
      head: acid ? 'pKs-Wert' : 'pKb-Wert',
      tex: `${pKsym} = 14 - ${acid ? '\\text{p}K_B' : '\\text{p}K_S'} = 14 - ${given} ${pm(pK).e} ${pm(pK).t}`,
      note: 'Korrespondierendes Säure-Base-Paar: $\\text{p}K_S + \\text{p}K_B = 14$ (25 °C).',
    })
  }
  steps.push({
    head: 'Protolysegleichgewicht',
    tex: pre?.eq ?? (acid ? '\\mathrm{HA + H_2O \\rightleftharpoons H_3O^+ + A^-}' : '\\mathrm{B + H_2O \\rightleftharpoons HB^+ + OH^-}'),
    note: 'Schwache Säuren und Basen reagieren nur teilweise mit Wasser – es stellt sich ein Gleichgewicht ein. Wie weit es rechts liegt, sagt der Protolysegrad α.',
  })
  steps.push({
    tex: acid ? `K_S = \\frac{c(\\mathrm{H_3O^+}) \\cdot c(\\mathrm{A^-})}{c(\\mathrm{HA})}` : `K_B = \\frac{c(\\mathrm{HB^+}) \\cdot c(\\mathrm{OH^-})}{c(\\mathrm{B})}`,
    note: 'Massenwirkungsgesetz; die Konzentration des Wassers steckt in der Konstanten.',
  })

  // Näherung
  const lgc = lg(c0)
  const pa = (pK - lgc) / 2
  const pA = pm(pa)
  const lgPart = `${pKt} ${lgc <= 0 ? '+' : '-'} ${lgT(Math.abs(lgc))}`
  const approxPH = acid ? pa : 14 - pa
  if (acid) {
    steps.push({
      head: 'Näherungsformel',
      tex: `\\text{pH} = \\tfrac{1}{2}\\left(\\text{p}K_S - \\lg c_0\\right) = \\tfrac{1}{2}\\left(${pKt} - \\lg ${cT(c0)}\\right) = \\tfrac{1}{2}\\left(${lgPart}\\right) ${p2eq(pa)}`,
      note: 'Annahmen: $c(\\mathrm{H_3O^+}) = c(\\mathrm{A^-})$ und $c(\\mathrm{HA}) \\approx c_0$, weil nur wenig protolysiert.',
    })
  } else {
    steps.push({
      head: 'Näherungsformel',
      tex: `\\text{pOH} = \\tfrac{1}{2}\\left(\\text{p}K_B - \\lg c_0\\right) = \\tfrac{1}{2}\\left(${pKt} - \\lg ${cT(c0)}\\right) = \\tfrac{1}{2}\\left(${lgPart}\\right) ${pA.e} ${pA.t}`,
      note: 'Annahmen: $c(\\mathrm{OH^-}) = c(\\mathrm{HB^+})$ und $c(\\mathrm{B}) \\approx c_0$, weil nur wenig protoniert wird.',
    })
    steps.push({ tex: `\\text{pH} = 14 - \\text{pOH} = 14 - ${pA.t} ${p2eq(approxPH)}`, note: 'Bei 25 °C gilt $\\text{pH} + \\text{pOH} = 14$.' })
  }

  // exakt
  const x = (2 * K * c0) / (K + Math.sqrt(K * K + 4 * K * c0))
  if (!isP && acidConst === acid) steps.push({ head: 'Exakte Rechnung', tex: `${Ksym} = ${cT(kv)}${ML}`, note: 'Die Konstante selbst (wie gegeben) wird für die quadratische Gleichung gebraucht.' })
  else steps.push({ head: 'Exakte Rechnung', tex: `${Ksym} = 10^{-${pKsym}}${ML} = 10^{${p0(-pK)}}${ML} ${cEq(K)}${ML}`, note: 'Die Konstante selbst wird für die quadratische Gleichung gebraucht.' })
  steps.push({
    tex: `${ion}^2 + ${Ksym} \\cdot ${ion} - ${Ksym} \\cdot c_0 = 0`,
    note: `Aus $${Ksym} = \\frac{x^2}{c_0 - x}$ mit $x = ${ion}$ – ohne die Näherung $c_0 - x \\approx c_0$.`,
  })
  steps.push({
    tex: `${ion} = -\\frac{${Ksym}}{2} + \\sqrt{\\frac{${Ksym}^2}{4} + ${Ksym} \\cdot c_0} = -\\frac{${cT(K)}}{2} + \\sqrt{\\frac{\\left(${cT(K)}\\right)^2}{4} + ${cT(K)} \\cdot ${cT(c0)}} ${cEq(x)}${ML}`,
    note: 'Lösungsformel der quadratischen Gleichung; die negative Lösung fällt weg.',
  })
  let pH: number
  if (acid) {
    pH = -lg(x)
    steps.push({ tex: `\\text{pH} = -\\lg\\left(${cT(x)}\\right) ${p2eq(pH)}`, final: x >= 1e-6 })
  } else {
    const pOH = -lg(x)
    pH = 14 - pOH
    steps.push({ tex: `\\text{pOH} = -\\lg\\left(${cT(x)}\\right) ${pm(pOH).e} ${pm(pOH).t} \\;\\Rightarrow\\; \\text{pH} = 14 - ${pm(pOH).t} ${p2eq(pH)}`, final: x >= 1e-6 })
  }
  const alpha = x / c0
  const good = alpha < 0.05
  steps.push({
    head: 'Protolysegrad',
    tex: `\\alpha = \\frac{${ion}}{c_0} = \\frac{${cT(x)}}{${cT(c0)}} ${feqv(alpha * 100, 3)}\\,\\%`,
    note: good
      ? 'α < 5 %: Die Näherungsformel ist hier gut genug (Abweichung im pH-Wert höchstens etwa 0,01).'
      : `α ≥ 5 %: Die Näherung ist zu ungenau – sie liefert einen zu ${acid ? 'kleinen' : 'großen'} pH-Wert. Hier gilt der exakte Wert.`,
  })
  const extra = [`\\text{Näherung: pH} ${p2eq(approxPH)}`, `\\alpha ${feqv(alpha * 100, 3)}\\,\\%`, `${ion} ${cEq(x)}${ML}`]
  const remarks: string[] = [good ? 'Näherung und exakte Rechnung stimmen gut überein (α < 5 %).' : 'Die Näherungsformel ist hier zu ungenau (α ≥ 5 %) – der exakte Wert gilt.']
  if (x < 1e-6) {
    const xf = weakFull(K, c0)
    pH = acid ? -lg(xf) : 14 + lg(xf)
    steps.push({
      head: 'Autoprotolyse des Wassers',
      tex: `${ion}^3 + ${Ksym} \\cdot ${ion}^2 - (${Ksym} \\cdot c_0 + K_W) \\cdot ${ion} - ${Ksym} \\cdot K_W = 0`,
      note: `So wenige ${acid ? 'Oxoniumionen' : 'Hydroxidionen'} (unter $10^{-6}$ mol/L) – da zählen auch die aus dem Wasser selbst mit. Die vollständige Ladungsbilanz wird numerisch gelöst.`,
    })
    steps.push({ tex: `${ion} ${cEq(xf)}${ML} \\;\\Rightarrow\\; \\text{pH} ${p2eq(pH)}`, final: true })
    remarks.push('Sehr verdünnt bzw. sehr schwach: Mit Autoprotolyse des Wassers gerechnet liegt der pH-Wert näher an 7.')
    extra.unshift(`\\text{ohne Wasser-Autoprotolyse: pH} ${p2eq(acid ? -lg(x) : 14 + lg(x))}`)
  }
  if (pre?.id === 'kohlen') remarks.push('Kohlensäure: Der pKs-Wert 6,35 bezieht sich auf das gesamte gelöste $\\mathrm{CO_2}$ (fast alles liegt als $\\mathrm{CO_2}$, nicht als $\\mathrm{H_2CO_3}$ vor).')
  if (pK < 2) remarks.push(`Mit $${pKsym} < 2$ ist ${acid ? 'die Säure' : 'die Base'} schon fast stark – die Näherungsformel taugt hier nicht.`)
  steps.push(classStep(pH))
  return { result: `\\text{pH} ${p2eq(pH)}`, extra, steps, remark: remarks.join(' '), pH }
}

/* ---------------------------- Puffer ---------------------------- */

export interface BufferPreset {
  id: string
  name: string
  pKs: string
  /** Summenformeln: Säure HA und korrespondierende Base A⁻ */
  acid: string
  base: string
  acidName: string
  baseName: string
  /** übliche Stammlösung in mol/L für flüssige oder gasförmige Komponenten (statt einwiegen) */
  acidStock?: string
  baseStock?: string
  note?: string
}

export const BUFFERS: BufferPreset[] = [
  { id: 'acetat', name: 'Acetatpuffer', pKs: '4,76', acid: 'CH3COOH', base: 'CH3COONa', acidName: 'Essigsäure', baseName: 'Natriumacetat', acidStock: '1' },
  { id: 'phosphat', name: 'Phosphatpuffer', pKs: '7,21', acid: 'NaH2PO4', base: 'Na2HPO4', acidName: 'Natriumdihydrogenphosphat', baseName: 'Dinatriumhydrogenphosphat' },
  { id: 'ammonium', name: 'Ammoniumpuffer', pKs: '9,25', acid: 'NH4Cl', base: 'NH3', acidName: 'Ammoniumchlorid', baseName: 'Ammoniak', baseStock: '1' },
  {
    id: 'tris',
    name: 'Tris-Puffer',
    pKs: '8,07',
    acid: 'C4H11NO3·HCl',
    base: 'C4H11NO3',
    acidName: 'Tris-HCl',
    baseName: 'Tris',
    note: 'Der pKs-Wert von Tris hängt stark von der Temperatur ab (etwa −0,03 pro °C; 8,07 gilt für 25 °C) – den pH-Wert bei der Arbeitstemperatur einstellen.',
  },
]

export interface BufferSolution extends PhSolution {
  pKs: number
  /** Verhältnis c(A⁻) : c(HA) */
  ratio: number
}

export type BufIn = 'c' | 'n' | 'm' | 'V'

function bufLabels(acid?: string, base?: string) {
  return { HA: acid?.trim() ? formulaTexOf(acid) : '\\mathrm{HA}', A: base?.trim() ? formulaTexOf(base) : '\\mathrm{A^-}' }
}

function pKsOf(x: NumIn | null): number {
  if (!x) throw new CalcError('Der pKs-Wert der Puffersäure fehlt – bitte eintragen.')
  const v = toNum(x.q)
  if (v <= 0 || v >= 14) throw new CalcError('Der pKs-Wert einer Puffersäure liegt zwischen 0 und 14.')
  return v
}

function rangeStep(pKs: number, pH: number): Step {
  const inside = Math.abs(pH - pKs) <= 1 + 1e-9
  return {
    head: 'Pufferbereich',
    tex: `\\text{p}K_S \\pm 1 = ${p2(pKs - 1)} \\ldots ${p2(pKs + 1)}`,
    note: inside
      ? 'Der pH-Wert liegt im Pufferbereich – der Puffer fängt zugegebene Säure und Lauge gut ab. Am besten puffert er bei pH = pKs (gleich viel Säure wie Base).'
      : 'Der pH-Wert liegt **außerhalb** des Pufferbereichs: Eine der beiden Komponenten ist kaum noch vorhanden, der Puffer wirkt nur schwach.',
  }
}

/** Stoffmengen für die Anzeige in gemeinsamer Einheit (mol, mmol, …) */
function nPair(a: Q, b: Q): { u: string; a: Q; b: Q } {
  const big = cmp(a, b) >= 0 ? a : b
  const u = best(big, MOL_U).u
  const f = fac(MOL_U, u)
  return { u, a: div(a, f), b: div(b, f) }
}

/**
 * pH eines Puffers aus Konzentrationen, Stoffmengen, Massen oder Volumina zweier Stammlösungen;
 * optional nach Zugabe einer starken Säure bzw. Lauge.
 */
export function bufferPh(o: {
  pKs: NumIn | null
  input: BufIn
  a: NumIn | null
  b: NumIn | null
  unit: string
  ca?: NumIn | null
  cb?: NumIn | null
  csu?: string
  acid?: string
  base?: string
  Vp?: NumIn | null
  vpu?: string
  add?: AcidBase | 'keine'
  cAdd?: NumIn | null
  caddu?: string
  vAdd?: NumIn | null
  vaddu?: string
}): BufferSolution {
  const pKs = pKsOf(o.pKs)
  const pKt = sh(o.pKs!.q)
  const { HA, A } = bufLabels(o.acid, o.base)
  const steps: Step[] = []
  const what = o.input === 'c' ? 'c' : 'n'
  let xa: Q
  let xb: Q
  let vTot: Q | null = null
  const giv = [`\\text{p}K_S = ${pKt}`]
  const hh: Step = { tex: `\\text{pH} = \\text{p}K_S + \\lg\\frac{c(\\mathrm{A^-})}{c(\\mathrm{HA})}`, head: 'Henderson-Hasselbalch', note: `Puffer = schwache Säure ($${HA}$) und ihre korrespondierende Base ($${A}$). Ihr Mengenverhältnis bestimmt den pH-Wert.` }
  const later: Step[] = []
  if (o.input === 'c' || o.input === 'n') {
    const list = o.input === 'c' ? CONC_U : MOL_U
    const nm = o.input === 'c' ? 'die Konzentration' : 'die Stoffmenge'
    const a = need(o.a, `${nm} der Säure`)
    const b = need(o.b, `${nm} der Base`)
    xa = mul(a, fac(list, o.unit))
    xb = mul(b, fac(list, o.unit))
    giv.push(`${what}(${HA}) = ${sh(a)}${T(o.unit)}`, `${what}(${A}) = ${sh(b)}${T(o.unit)}`)
    if (o.input === 'n') later.push({ head: 'Stoffmengen statt Konzentrationen', tex: `\\frac{c(${A})}{c(${HA})} = \\frac{n(${A}) / V}{n(${HA}) / V} = \\frac{n(${A})}{n(${HA})}`, note: 'Beide Stoffe stecken im selben Volumen – $V$ kürzt sich heraus.' })
  } else if (o.input === 'm') {
    if (!o.acid?.trim() || !o.base?.trim()) throw new CalcError('Für Massen brauche ich die Summenformeln beider Pufferkomponenten.')
    const ma = need(o.a, 'die Masse der Säure')
    const mb = need(o.b, 'die Masse der Base')
    const Ma = molarMass(o.acid)
    const Mb = molarMass(o.base)
    giv.push(`m(${HA}) = ${sh(ma)}${T(o.unit)}`, `m(${A}) = ${sh(mb)}${T(o.unit)}`)
    later.push(Ma.step, { ...Mb.step, head: undefined })
    const fa = mul(ma, fac(MASS_U, o.unit))
    const fb = mul(mb, fac(MASS_U, o.unit))
    xa = div(fa, Ma.M)
    xb = div(fb, Mb.M)
    later.push({
      head: 'Stoffmengen',
      tex: `n(${HA}) = \\frac{${sh(fa)}${T('g')}}{${m2(Ma.M)}${T('g/mol')}} ${eqx(xa)}${T('mol')},\\quad n(${A}) = \\frac{${sh(fb)}${T('g')}}{${m2(Mb.M)}${T('g/mol')}} ${eqx(xb)}${T('mol')}`,
      note: '$n = m / M$. Beide stecken im selben Volumen – darum darf man statt der Konzentrationen die Stoffmengen ins Verhältnis setzen.',
    })
  } else {
    const va = need(o.a, 'das Volumen der Säurelösung')
    const vb = need(o.b, 'das Volumen der Baselösung')
    const ca = need(o.ca, 'die Konzentration der Säurelösung')
    const cb = need(o.cb, 'die Konzentration der Baselösung')
    const csu = o.csu ?? 'mol/L'
    giv.push(`V(${HA}) = ${sh(va)}${T(o.unit)}\\ (${sh(ca)}${T(csu)})`, `V(${A}) = ${sh(vb)}${T(o.unit)}\\ (${sh(cb)}${T(csu)})`)
    const Va = mul(va, fac(VOL_U, o.unit))
    const Vb = mul(vb, fac(VOL_U, o.unit))
    const Ca = mul(ca, fac(CONC_U, csu))
    const Cb = mul(cb, fac(CONC_U, csu))
    vTot = add(Va, Vb)
    xa = mul(Ca, Va)
    xb = mul(Cb, Vb)
    later.push({
      head: 'Stoffmengen',
      tex: `n(${HA}) = ${nt4(Ca)}${ML} \\cdot ${nt4(Va)}${T('L')} ${eqx(xa)}${T('mol')},\\quad n(${A}) = ${nt4(Cb)}${ML} \\cdot ${nt4(Vb)}${T('L')} ${eqx(xb)}${T('mol')}`,
      note: '$n = c \\cdot V$ (Volumen in Liter). Beim Mischen verdünnen sich beide gleich stark – das Gesamtvolumen kürzt sich im Verhältnis heraus.',
    })
  }
  steps.push({ head: 'Gegeben', tex: giv.join(',\\quad '), note: 'Säure und korrespondierende Base des Puffers.' })
  steps.push(hh)
  steps.push(...later)
  const disp = what === 'n' ? nPair(xa, xb) : { u: 'mol/L', a: xa, b: xb }
  const ratioQ = div(xb, xa)
  const r = toNum(ratioQ)
  const lr = lg(r)
  const pH0 = pKs + lr
  steps.push({ head: 'Verhältnis', tex: `\\frac{${what}(${A})}{${what}(${HA})} = \\frac{${nt4(disp.b)}${T(disp.u)}}{${nt4(disp.a)}${T(disp.u)}} ${eqx(ratioQ)}`, note: 'Base geteilt durch Säure – die Einheit kürzt sich.' })
  const addKind = o.add && o.add !== 'keine' ? o.add : null
  steps.push({
    head: 'pH-Wert',
    tex: `\\text{pH} = ${pKt} + \\lg ${nt4(ratioQ)} = ${pKt} ${lr < 0 ? '-' : '+'} ${lgT(Math.abs(lr))} ${p2eq(pH0)}`,
    note: Math.abs(lr) < 1e-12 ? 'Gleich viel Säure wie Base: $\\lg 1 = 0$, also pH = pKs.' : lr > 0 ? 'Mehr Base als Säure – der pH-Wert liegt über dem pKs-Wert.' : 'Mehr Säure als Base – der pH-Wert liegt unter dem pKs-Wert.',
    final: !addKind,
  })
  steps.push(rangeStep(pKs, pH0))
  const extra: string[] = [`\\frac{${what}(${A})}{${what}(${HA})} ${eqx(ratioQ)}`]
  const remarks: string[] = []
  if (Math.abs(pH0 - pKs) > 1) remarks.push(`Außerhalb des Pufferbereichs ($\\text{p}K_S \\pm 1$): Der Puffer fängt Säure bzw. Lauge kaum noch ab.`)
  const pre = BUFFERS.find((b) => b.acid === o.acid?.trim() && b.base === o.base?.trim())
  if (pre?.note) remarks.push(pre.note)
  if (!addKind) return { result: `\\text{pH} ${p2eq(pH0)}`, extra, steps, remark: remarks.join(' ') || undefined, pH: pH0, pKs, ratio: r }

  // Zugabe von starker Säure oder Lauge
  const acidAdd = addKind === 'saeure'
  const cz = need(o.cAdd, `die Konzentration der zugegebenen ${acidAdd ? 'Säure' : 'Lauge'}`)
  const vz = need(o.vAdd, `das zugegebene Volumen`)
  const czL = mul(cz, fac(CONC_U, o.caddu ?? 'mol/L'))
  const vzL = mul(vz, fac(VOL_U, o.vaddu ?? 'mL'))
  const nz = mul(czL, vzL)
  let nHA = xa
  let nA = xb
  if (o.input === 'c') {
    const vp = need(o.Vp, 'das Puffervolumen V (für die Zugabe nötig)')
    const VpL = mul(vp, fac(VOL_U, o.vpu ?? 'mL'))
    vTot = VpL
    nHA = mul(xa, VpL)
    nA = mul(xb, VpL)
    const d = nPair(nHA, nA)
    steps.push({ head: 'Stoffmengen im Puffer', tex: `n(${HA}) = ${nt4(xa)}${ML} \\cdot ${nt4(VpL)}${T('L')} ${eqx(d.a)}${T(d.u)},\\quad n(${A}) = ${nt4(xb)}${ML} \\cdot ${nt4(VpL)}${T('L')} ${eqx(d.b)}${T(d.u)}`, note: 'Für die Zugabe zählt die Stoffmenge: $n = c \\cdot V$.' })
  } else if (o.Vp && o.input !== 'V') {
    vTot = mul(need(o.Vp, 'das Puffervolumen V'), fac(VOL_U, o.vpu ?? 'mL'))
  }
  const zName = acidAdd ? '\\mathrm{H_3O^+}' : '\\mathrm{OH^-}'
  const nzB = best(nz, MOL_U)
  steps.push({
    head: acidAdd ? 'Zugabe von Säure' : 'Zugabe von Lauge',
    tex: `n(${zName}) = c \\cdot V = ${nt4(czL)}${ML} \\cdot ${nt4(vzL)}${T('L')} ${eqx(nz)}${T('mol')}${nzB.u !== 'mol' ? ` ${eqx(nzB.v)}${T(nzB.u)}` : ''}`,
    note: `Eine starke ${acidAdd ? 'Säure' : 'Lauge'} liefert ihre ${acidAdd ? 'Oxoniumionen' : 'Hydroxidionen'} vollständig.`,
  })
  steps.push({
    tex: acidAdd ? '\\mathrm{A^- + H_3O^+ \\longrightarrow HA + H_2O}' : '\\mathrm{HA + OH^- \\longrightarrow A^- + H_2O}',
    note: acidAdd ? `Die Base des Puffers ($${A}$) fängt die Oxoniumionen ab – aus Base wird Säure.` : `Die Säure des Puffers ($${HA}$) fängt die Hydroxidionen ab – aus Säure wird Base.`,
  })
  const consumed = acidAdd ? nA : nHA
  if (cmp(nz, consumed) >= 0)
    throw new CalcError(`Die Pufferkapazität ist überschritten: Es wurde mindestens so viel ${acidAdd ? 'Säure' : 'Lauge'} zugegeben, wie ${acidAdd ? 'Base' : 'Säure'} im Puffer vorhanden ist. Der pH-Wert springt dann stark – das lässt sich mit Henderson-Hasselbalch nicht mehr rechnen.`)
  const nHA2 = acidAdd ? add(nHA, nz) : sub(nHA, nz)
  const nA2 = acidAdd ? sub(nA, nz) : add(nA, nz)
  const d0 = nPair(nHA, nA)
  const dz = div(nz, fac(MOL_U, d0.u))
  const d2 = { a: div(nHA2, fac(MOL_U, d0.u)), b: div(nA2, fac(MOL_U, d0.u)) }
  steps.push({
    head: 'Neue Stoffmengen',
    tex: `n(${HA}) = ${nt4(d0.a)} ${acidAdd ? '+' : '-'} ${nt4(dz)} ${eqx(d2.a)}${T(d0.u)},\\quad n(${A}) = ${nt4(d0.b)} ${acidAdd ? '-' : '+'} ${nt4(dz)} ${eqx(d2.b)}${T(d0.u)}`,
    note: acidAdd ? 'Säureanteil steigt, Baseanteil sinkt um die zugegebene Stoffmenge.' : 'Baseanteil steigt, Säureanteil sinkt um die zugegebene Stoffmenge.',
  })
  const r2Q = div(nA2, nHA2)
  const r2 = toNum(r2Q)
  const lr2 = lg(r2)
  const pH1 = pKs + lr2
  steps.push({
    head: 'pH nach der Zugabe',
    tex: `\\text{pH} = ${pKt} + \\lg\\frac{${nt4(d2.b)}}{${nt4(d2.a)}} = ${pKt} ${lr2 < 0 ? '-' : '+'} ${lgT(Math.abs(lr2))} ${p2eq(pH1)}`,
    note: `Der pH-Wert ändert sich nur um $${p2(pH1 - pH0)}$ – genau das leistet ein Puffer.`,
    final: true,
  })
  extra.push(`\\text{vor der Zugabe: pH} ${p2eq(pH0)}`, `\\Delta\\text{pH} ${p2eq(pH1 - pH0)}`)
  if (vTot) {
    const vAll = add(vTot, vzL)
    const cw = toNum(div(nz, vAll))
    if (cw >= 1e-6) {
      const pw = acidAdd ? -lg(cw) : 14 + lg(cw)
      steps.push({
        head: 'Vergleich ohne Puffer',
        tex: `c = \\frac{${nt4(nz)}${T('mol')}}{${nt4(vAll)}${T('L')}} ${cEq(cw)}${ML} \\;\\Rightarrow\\; \\text{pH} ${p2eq(pw)}`,
        note: `Dieselbe Menge ${acidAdd ? 'Säure' : 'Lauge'} in gleich viel reinem Wasser würde den pH-Wert von 7 auf ${p2(pw).replace('{,}', ',')} ${acidAdd ? 'senken' : 'heben'}.`,
      })
      extra.push(`\\text{in Wasser statt Puffer: pH} ${p2eq(pw)}`)
    }
  }
  if (Math.abs(pH1 - pKs) > 1) {
    steps.push(rangeStep(pKs, pH1))
    remarks.push('Nach der Zugabe liegt der pH-Wert außerhalb des Pufferbereichs – die Pufferkapazität ist fast erschöpft.')
  }
  return { result: `\\text{pH} ${p2eq(pH1)}`, extra, steps, remark: remarks.join(' ') || undefined, pH: pH1, pKs, ratio: r2 }
}

/** Zahl für Puffer-Schritte (4 gültige Ziffern, genau wenn kurz) */
function nt4(x: Q): string {
  return eqx(x).replace(/^(=|\\approx) /, '')
}

/**
 * Puffer ansetzen: Ziel-pH → Verhältnis c(A⁻)/c(HA) = 10^(pH − pKs); mit Gesamtkonzentration und Volumen
 * die Stoffmengen, Massen (über Summenformeln) oder Volumina von Stammlösungen beider Komponenten.
 */
export function bufferPrep(o: {
  pKs: NumIn | null
  pH: NumIn | null
  cTot?: NumIn | null
  cu?: string
  V?: NumIn | null
  vu?: string
  acid?: string
  base?: string
  ca?: NumIn | null
  cb?: NumIn | null
  csu?: string
}): BufferSolution {
  const pKs = pKsOf(o.pKs)
  const pKt = sh(o.pKs!.q)
  if (!o.pH) throw new CalcError('Der gewünschte pH-Wert fehlt – bitte eintragen.')
  const pH = toNum(o.pH.q)
  if (pH <= 0 || pH >= 14) throw new CalcError('Der gewünschte pH-Wert muss zwischen 0 und 14 liegen.')
  if (Math.abs(pH - pKs) > 2) throw new CalcError(`Mit diesem Puffer (pKs = ${pKt.replace('{,}', ',')}) lässt sich pH ${sh(o.pH.q).replace('{,}', ',')} nicht sinnvoll einstellen – der Pufferbereich ist pKs ± 1. Wähle ein anderes Puffersystem.`)
  const { HA, A } = bufLabels(o.acid, o.base)
  const steps: Step[] = []
  const giv = [`\\text{p}K_S = ${pKt}`, `\\text{pH}_{\\text{Ziel}} = ${sh(o.pH.q)}`]
  const cTot = o.cTot ? need(o.cTot, 'die Gesamtkonzentration') : null
  const V = o.V ? need(o.V, 'das Puffervolumen') : null
  const cu = o.cu ?? 'mol/L'
  const vu = o.vu ?? 'mL'
  if (V && !cTot) throw new CalcError('Für die Mengen brauche ich auch die Gesamtkonzentration des Puffers (Säure + Base).')
  if (cTot) giv.push(`c_{\\text{ges}} = ${sh(cTot)}${T(cu)}`)
  if (V) giv.push(`V = ${sh(V)}${T(vu)}`)
  steps.push({ head: 'Gegeben', tex: giv.join(',\\quad '), note: `Säure $${HA}$ und korrespondierende Base $${A}$.` })
  steps.push({
    head: 'Henderson-Hasselbalch umstellen',
    tex: `\\lg\\frac{c(\\mathrm{A^-})}{c(\\mathrm{HA})} = \\text{pH} - \\text{p}K_S \\;\\Rightarrow\\; \\frac{c(\\mathrm{A^-})}{c(\\mathrm{HA})} = 10^{\\text{pH} - \\text{p}K_S}`,
    note: 'Erst $\\text{p}K_S$ auf die andere Seite, dann „zehn hoch“ auf beiden Seiten.',
  })
  const diff = pH - pKs
  const r = 10 ** diff
  steps.push({
    tex: `\\frac{c(${A})}{c(${HA})} = 10^{${sh(o.pH.q)} - ${pKt}} = 10^{${p0(diff)}} ${feqv(r)}`,
    note: `Auf 1 Teil Säure kommen $${fnt(r)}$ Teile Base – der Baseanteil beträgt $${fnt((100 * r) / (1 + r), 3)}\\,\\%$.`,
    final: !cTot,
  })
  const extra: string[] = [`c(${A}) : c(${HA}) ${feqv(r)} : 1`]
  const remarks: string[] = []
  if (Math.abs(diff) > 1) remarks.push('Der Ziel-pH liegt außerhalb des Pufferbereichs ($\\text{p}K_S \\pm 1$) – der Puffer wird schwach sein.')
  const pre = BUFFERS.find((b) => b.acid === o.acid?.trim() && b.base === o.base?.trim())
  if (pre?.note) remarks.push(pre.note)
  remarks.push('In der Praxis den pH-Wert mit dem pH-Meter kontrollieren und mit Säure bzw. Lauge nachjustieren.')
  if (!cTot) return { result: `\\frac{c(${A})}{c(${HA})} ${feqv(r)}`, extra, steps, remark: remarks.join(' '), pH, pKs, ratio: r }

  const cT_ = toNum(mul(cTot, fac(CONC_U, cu)))
  const cHA = cT_ / (1 + r)
  const cA = cT_ - cHA
  steps.push({
    head: 'Aufteilen',
    tex: `c(${HA}) = \\frac{c_{\\text{ges}}}{1 + ${fnt(r)}} = \\frac{${cT(cT_)}${ML}}{${fnt(1 + r)}} ${cEq(cHA)}${ML},\\quad c(${A}) = c_{\\text{ges}} - c(${HA}) ${cEq(cA)}${ML}`,
    note: 'Säure und Base zusammen ergeben die Gesamtkonzentration; die Base hat den $r$-fachen Anteil der Säure.',
    final: !V,
  })
  if (!V) {
    return { result: `c(${HA}) ${cEq(cHA)}${ML},\\quad c(${A}) ${cEq(cA)}${ML}`, extra, steps, remark: remarks.join(' '), pH, pKs, ratio: r }
  }
  const VL = toNum(mul(V, fac(VOL_U, vu)))
  const nHA = cHA * VL
  const nA = cA * VL
  steps.push({
    head: 'Stoffmengen',
    tex: `n(${HA}) = ${cT(cHA)}${ML} \\cdot ${fnt(VL)}${T('L')} ${fq(nHA, MOL_U)},\\quad n(${A}) = ${cT(cA)}${ML} \\cdot ${fnt(VL)}${T('L')} ${fq(nA, MOL_U)}`,
    note: '$n = c \\cdot V$ mit dem Volumen in Liter.',
  })
  // jede Komponente: Stammlösung (Volumen), sonst Summenformel (Masse), sonst nur Stoffmenge
  const res: string[] = []
  const csu = o.csu ?? 'mol/L'
  let vSum = 0
  const comp = (n: number, formula: string | undefined, cs: NumIn | null | undefined, X: string, nameAcid: boolean) => {
    if (cs) {
      const c = toNum(mul(need(cs, `die Konzentration der Stammlösung (${nameAcid ? 'Säure' : 'Base'})`), fac(CONC_U, csu)))
      const v = n / c
      vSum += v
      steps.push({
        head: nameAcid ? 'Säure abmessen' : 'Base abmessen',
        tex: `V(${X}) = \\frac{n}{c} = \\frac{${fv(n, MOL_U)}}{${cT(c)}${ML}} ${fq(v, VOL_U)}`,
        note: `Volumen der Stammlösung ($c = ${cT(c)}${ML}$).`,
        final: true,
      })
      res.push(`V(${X}) ${fq(v, VOL_U)}`)
    } else if (formula?.trim()) {
      const mm = molarMass(formula)
      steps.push({ ...mm.step, head: nameAcid ? 'Masse der Säure' : 'Masse der Base' })
      const m = n * toNum(mm.M)
      const nMol = n
      steps.push({ tex: `m(${X}) = n \\cdot M = ${fnt(nMol)}${T('mol')} \\cdot ${m2(mm.M)}${T('g/mol')} ${fq(m, MASS_U)}`, note: 'Diese Masse einwiegen.', final: true })
      res.push(`m(${X}) ${fq(m, MASS_U)}`)
    } else res.push(`n(${X}) ${fq(n, MOL_U)}`)
  }
  comp(nHA, o.acid, o.ca, HA, true)
  comp(nA, o.base, o.cb, A, false)
  if (vSum > VL * (1 + 1e-9)) throw new CalcError('Die Stammlösungen sind zu verdünnt: Ihre Volumina zusammen sind größer als das Puffervolumen. Konzentriertere Stammlösungen verwenden.')
  const vtxt = `$${sh(V)}${T(vu)}$`
  steps.push({
    head: 'Ansetzen',
    tex: `\\text{lösen bzw. mischen, mit Wasser auf } ${sh(V)}${T(vu)} \\text{ auffüllen}`,
    note: `Beide Komponenten in etwas Wasser lösen, im Messkolben auf ${vtxt} auffüllen, pH-Wert kontrollieren.`,
  })
  const check = pKs + lg(nA / nHA)
  steps.push({ head: 'Probe', tex: `\\text{pH} = ${pKt} + \\lg\\frac{${fnt(nA)}}{${fnt(nHA)}} ${p2eq(check)}\\ \\checkmark`, note: 'Das Verhältnis der Stoffmengen ergibt wieder den Ziel-pH.' })
  if (o.base?.trim() === 'NH3' && !o.cb) remarks.unshift('Ammoniak ist ein Gas – in der Praxis als Lösung bekannter Konzentration zugeben (Stammlösung eintragen).')
  if (o.acid?.trim() === 'CH3COOH' && !o.ca) remarks.unshift('Essigsäure ist flüssig – praktischer als Lösung bekannter Konzentration abmessen (Stammlösung eintragen).')
  return { result: res.join(',\\quad '), extra, steps, remark: remarks.join(' '), pH, pKs, ratio: r }
}

/** Gleitkommawert in passender Einheit mit Gleichheitszeichen: „≈ 3,924 mmol“ */
function fq(x: number, list: Parameters<typeof bestF>[1]): string {
  const b = bestF(x, list)
  return `${fnum(b.v).approx ? '\\approx' : '='} ${fnt(b.v)}${T(b.u)}`
}

/** wie fq, aber ohne Gleichheitszeichen */
function fv(x: number, list: Parameters<typeof bestF>[1]): string {
  const b = bestF(x, list)
  return `${fnt(b.v)}${T(b.u)}`
}
