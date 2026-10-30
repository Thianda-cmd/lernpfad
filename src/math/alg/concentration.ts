/**
 * Konzentrationsangaben ineinander umrechnen – Stoffmengenkonzentration c, Massenkonzentration β und
 * Massenanteil w (über die Dichte ρ) –, Lösungen aus konzentrierten Stammlösungen ansetzen und mit
 * Volumenanteilen φ rechnen. Exakt mit Brüchen gerechnet, gerundet wird nur in der Anzeige.
 *
 * Enthält außerdem kleine gemeinsame Bausteine (Pflichtwerte, Einheiten, Stoff aus Formel oder M),
 * die auch die pH-, Titrations- und Gasrechner verwenden.
 */
import { approxTex, CalcError, cmp, div, isTerminating, mul, q, sign, sub, toNum, type Q } from '../q'
import { best, CONC_U, fac, MCONC_U, nt, T, VOL_U, type Unit } from './units'
import { m2, molarMass } from './stoich'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'

/* ---------------------------- gemeinsame Bausteine ---------------------------- */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Pflichtwert, der größer als 0 sein muss. `name` im Nominativ: „die Dichte ρ“ */
export function need(x: NumIn | null | undefined, name: string): Q {
  if (!x) throw new CalcError(`${cap(name)} fehlt – bitte eintragen.`)
  if (sign(x.q) <= 0) throw new CalcError(`${cap(name)} muss größer als 0 sein.`)
  return x.q
}

/** freiwilliger Wert: leer → null, sonst größer als 0 */
export function opt(x: NumIn | null | undefined, name: string): Q | null {
  return x ? need(x, name) : null
}

/** Eingabewert anzeigen (bis zu 6 gültige Ziffern) */
export const sh = (x: Q) => nt(x, 6)

/**
 * Ergebnis höchstens mit `sig` gültigen Ziffern (Laborwerte: 3,363 statt 3,363435).
 * Große Zahlen behalten ihre Vorkommastellen (101 325).
 */
export const ntr = (x: Q, sig = 4) => approxTex(toNum(x), sig)

/** so gerundet, wie approxTex die Zahl mit `sig` Ziffern zeigt */
function shownAs(v: number, sig: number): number {
  const e = Math.floor(Math.log10(Math.abs(v)))
  if (e >= 7 || e <= -5) return Number(v.toPrecision(sig))
  return Number(v.toFixed(Math.max(0, Math.min(10, sig - 1 - e))))
}

/** „= 0,5“ bzw. „≈ 0,3333“ – „=“ nur, wenn der Wert mit `sig` Ziffern genau dasteht */
export function eqx(x: Q, sig = 4): string {
  const v = toNum(x)
  const exact = v === 0 || (isTerminating(x) && Math.abs(v - shownAs(v, sig)) <= 1e-12 * Math.abs(v))
  return `${exact ? '=' : '\\approx'} ${ntr(x, sig)}`
}

/** Laborvolumen: ab 1 L in L, darunter in mL, unter 0,1 mL in µL */
export function labVol(xL: Q): { u: string; v: Q } {
  const v = Math.abs(toNum(xL))
  const u = v >= 1 ? 'L' : v >= 1e-4 ? 'mL' : 'µL'
  return { u, v: div(xL, fac(VOL_U, u)) }
}

/** Wert in passender Einheit mit Gleichheitszeichen: „≈ 41,40 mL“ */
export function bestEq(x: Q, list: readonly Unit[]): string {
  const b = best(x, list)
  return `${eqx(b.v)}${T(b.u)}`
}

/** in die Grundeinheit umrechnen; Rechnung als TeX („V = 250 mL = 0,25 L“) oder null, wenn nichts zu tun ist */
export function convTex(sym: string, x: Q, unit: string, list: readonly Unit[], base: string): { v: Q; tex: string | null } {
  const v = mul(x, fac(list, unit))
  return { v, tex: unit === base ? null : `${sym} = ${sh(x)}${T(unit)} ${eqx(v)}${T(base)}` }
}

export interface Subst {
  M: Q
  /** Summenformel als TeX (oder Platzhalter) */
  tex: string
  /** Rechenweg der molaren Masse – nur bei Summenformel */
  step?: Step
}

/** Stoff aus Summenformel oder direkt eingegebener molarer Masse */
export function substance(formula: string | undefined, M: NumIn | null | undefined, required: true, label?: string): Subst
export function substance(formula: string | undefined, M: NumIn | null | undefined, required?: boolean, label?: string): Subst | null
export function substance(formula?: string, M?: NumIn | null, required = true, label = '\\text{X}'): Subst | null {
  if (formula?.trim()) {
    const mm = molarMass(formula)
    return { M: mm.M, tex: mm.formula, step: mm.step }
  }
  if (M) {
    if (sign(M.q) <= 0) throw new CalcError('Die molare Masse muss größer als 0 sein.')
    return { M: M.q, tex: label }
  }
  if (required) throw new CalcError('Bitte die Summenformel oder die molare Masse M eintragen.')
  return null
}

const u = (name: string, n: number | bigint, d: number | bigint = 1): Unit => ({ u: name, f: q(n, d) })

/** Massenanteil, Grundeinheit: Anteil als Zahl (1 = 100 %) */
export const W_U: readonly Unit[] = [u('%', 1, 100), u('g/kg', 1, 1000), u('mg/kg', 1, 1_000_000), u('ppm', 1, 1_000_000)]
/** Dichte, Grundeinheit g/mL (= g/cm³ = kg/L) */
export const RHO_U: readonly Unit[] = [u('g/mL', 1), u('g/cm³', 1), u('kg/L', 1), u('g/L', 1, 1000)]

const HUNDRED = q(100)
const THOUSAND = q(1000)
const pct = (w: Q) => `${eqx(mul(w, HUNDRED))}\\,\\%`

/** Dichte in g/L (aus beliebiger Einheit der Liste RHO_U) */
function rhoGL(rho: Q, unit: string): Q {
  return mul(mul(rho, fac(RHO_U, unit)), THOUSAND)
}

/* ---------------------------- c ↔ β ↔ w ---------------------------- */

export type ConcKind = 'c' | 'beta' | 'w'

const KIND_NAME: Record<ConcKind, string> = { c: 'die Stoffmengenkonzentration c', beta: 'die Massenkonzentration β', w: 'der Massenanteil w' }

/**
 * Eine Konzentrationsangabe in die anderen umrechnen:
 * β = c · M, w = β / ρ (ρ in g/L), c = w · ρ · 1000 / (M · 100) für w in % und ρ in g/mL.
 */
export function convertConc(o: { known: ConcKind; value: NumIn | null; unit: string; formula?: string; M?: NumIn | null; rho?: NumIn | null; rhoUnit?: string }): Solution {
  const x = need(o.value, KIND_NAME[o.known])
  const s = substance(o.formula, o.M, o.known === 'c')
  const rho = opt(o.rho, 'die Dichte ρ')
  const ru = RHO_U.some((r) => r.u === o.rhoUnit) ? (o.rhoUnit as string) : 'g/mL'
  if (o.known === 'w' && !rho) throw new CalcError('Für den Massenanteil w brauchst du die Dichte ρ der Lösung (Tabellenwert; verdünnte wässrige Lösungen: ρ ≈ 1 g/mL).')
  if (o.known === 'beta' && !s && !rho) throw new CalcError('Bitte die Summenformel oder M (für c) und/oder die Dichte ρ (für w) eintragen – sonst gibt es nichts umzurechnen.')
  const sym = o.known === 'c' ? 'c' : o.known === 'beta' ? '\\beta' : 'w'
  const list = o.known === 'c' ? CONC_U : o.known === 'beta' ? MCONC_U : W_U
  const steps: Step[] = []

  const giv = [`${sym} = ${sh(x)}${T(o.unit)}`]
  if (s?.step) giv.push(`\\text{Stoff: } ${s.tex}`)
  else if (s) giv.push(`M = ${m2(s.M)}${T('g/mol')}`)
  if (rho) giv.push(`\\rho = ${sh(rho)}${T(ru)}`)
  steps.push({
    head: 'Gegeben',
    tex: giv.join(',\\quad '),
    note:
      o.known === 'c'
        ? 'Stoffmengenkonzentration $c$: Stoffmenge des gelösten Stoffs pro Liter Lösung.'
        : o.known === 'beta'
          ? 'Massenkonzentration $\\beta$: Masse des gelösten Stoffs pro Liter Lösung.'
          : 'Massenanteil $w$: Masse des gelösten Stoffs bezogen auf die Masse der ganzen Lösung.',
  })
  if (s?.step) steps.push(s.step)

  // Einheiten
  const conv: string[] = []
  const notes: string[] = []
  let xb: Q
  if (o.known === 'w') {
    xb = mul(x, fac(W_U, o.unit))
    if (cmp(xb, q(1)) > 0) throw new CalcError('Ein Massenanteil kann höchstens 100 % betragen.')
    conv.push(`w = ${sh(x)}${T(o.unit)} ${eqx(xb)}`)
    notes.push(o.unit === '%' ? 'Prozent heißt „von hundert“: durch 100 teilen.' : 'Den Massenanteil als reine Zahl schreiben (1 = 100 %).')
  } else {
    const base = o.known === 'c' ? 'mol/L' : 'g/L'
    const r = convTex(sym, x, o.unit, list, base)
    xb = r.v
    if (r.tex) {
      conv.push(r.tex)
      notes.push(`In ${base} umrechnen – alles bezieht sich dann auf einen Liter Lösung.`)
    }
  }
  const rL = rho ? rhoGL(rho, ru) : null
  if (rho && rL && ru !== 'g/L') {
    conv.push(`\\rho = ${sh(rho)}${T(ru)} ${eqx(rL)}${T('g/L')}`)
    notes.push('1 L = 1000 mL: Ein Liter Lösung wiegt 1000-mal so viel wie ein Milliliter.')
  }
  if (conv.length) steps.push({ head: 'Einheiten umrechnen', tex: conv.join(',\\quad '), note: notes.join(' ') })

  let c: Q | null = null
  let beta: Q | null = null
  let w: Q | null = null
  const M = s?.M ?? null
  const cStep = (b: Q, m: Q) => {
    const cc = div(b, m)
    steps.push({
      head: 'Stoffmengenkonzentration',
      tex: `c = \\frac{\\beta}{M} = \\frac{${ntr(b)}${T('g/L')}}{${m2(m)}${T('g/mol')}} ${eqx(cc)}${T('mol/L')}`,
      note: 'Masse pro Liter geteilt durch Masse pro Mol – Gramm kürzt sich weg, übrig bleibt mol pro Liter.',
      final: true,
    })
    return cc
  }
  if (o.known === 'c') {
    c = xb
    beta = mul(c, M as Q)
    steps.push({
      head: 'Massenkonzentration',
      tex: `\\beta = c \\cdot M = ${ntr(c)}${T('mol/L')} \\cdot ${m2(M as Q)}${T('g/mol')} ${eqx(beta)}${T('g/L')}`,
      note: 'Mol pro Liter mal Gramm pro Mol – die Einheit mol kürzt sich weg.',
      final: true,
    })
  } else if (o.known === 'beta') {
    beta = xb
    if (M) c = cStep(beta, M)
  } else {
    w = xb
    const rr = rL as Q
    beta = mul(w, rr)
    steps.push({
      head: 'Massenkonzentration',
      tex: `\\beta = w \\cdot \\rho = ${ntr(w)} \\cdot ${ntr(rr)}${T('g/L')} ${eqx(beta)}${T('g/L')}`,
      note: `Ein Liter Lösung wiegt $${ntr(rr)}${T('g')}$ – der Anteil $w$ davon ist gelöster Stoff.`,
      final: !M,
    })
    if (M) {
      c = cStep(beta, M)
      const rg = mul(rho as Q, fac(RHO_U, ru))
      steps.push({
        head: 'Kurzformel',
        tex: `c = \\frac{w \\cdot \\rho \\cdot 1000}{M \\cdot 100} = \\frac{${sh(mul(w, HUNDRED))} \\cdot ${sh(rg)} \\cdot 1000}{${m2(M)} \\cdot 100}${T('mol/L')} ${eqx(c)}${T('mol/L')}`,
        note: 'Dasselbe in einem Schritt: $w$ in %, $\\rho$ in g/mL. Der Faktor 1000 rechnet mL in L um, die 100 nimmt das Prozent weg.',
      })
    }
  }
  if (!w && rL && beta) {
    w = div(beta, rL)
    if (cmp(w, q(1)) > 0) throw new CalcError('Mit diesen Werten wäre der Massenanteil größer als 100 % – prüfe Konzentration, molare Masse und Dichte.')
    steps.push({
      head: 'Massenanteil',
      tex: `w = \\frac{\\beta}{\\rho} = \\frac{${ntr(beta)}${T('g/L')}}{${ntr(rL)}${T('g/L')}} ${eqx(w)} ${pct(w)}`,
      note: `Ein Liter Lösung wiegt $${ntr(rL)}${T('g')}$ und enthält $${ntr(beta)}${T('g')}$ gelösten Stoff. Gramm pro Liter kürzt sich – $w$ hat keine Einheit.`,
      final: true,
    })
  }
  const extra: string[] = []
  if (w && cmp(w, q(1, 1000)) < 0 && !(o.known === 'w' && (o.unit === 'ppm' || o.unit === 'mg/kg'))) {
    const ppm = mul(w, q(1_000_000))
    steps.push({
      head: 'In ppm',
      tex: `w = ${ntr(w)} \\cdot 10^{6}\\,\\text{ppm} ${eqx(ppm)}\\,\\text{ppm}`,
      note: 'ppm (parts per million) = Millionstel: 1 ppm = 1 mg Stoff pro kg Lösung. Bei verdünnten wässrigen Lösungen (ρ ≈ 1 kg/L) entspricht 1 ppm ungefähr 1 mg/L.',
    })
    extra.push(`w ${eqx(ppm)}\\,\\text{ppm}\\ (\\text{mg/kg})`)
  }
  if (rL && beta) extra.push(`1\\,\\text{L Lösung wiegt } ${ntr(rL)}\\,\\text{g und enthält } ${ntr(beta)}\\,\\text{g gelösten Stoff}`)

  const res: string[] = []
  if (o.known !== 'c' && c) res.push(`c ${bestEq(c, CONC_U)}`)
  if (o.known !== 'beta' && beta) res.push(`\\beta ${bestEq(beta, MCONC_U)}`)
  if (o.known !== 'w' && w) res.push(`w ${pct(w)}`)

  const remarks: string[] = []
  if (!M) remarks.push('Für die Stoffmengenkonzentration $c$ die Summenformel oder die molare Masse eintragen.')
  if (!rho) {
    remarks.push('Für den Massenanteil $w$ die Dichte $\\rho$ der Lösung eintragen (Tabellenwert; verdünnte wässrige Lösungen: $\\rho \\approx 1\\,\\text{g/mL}$).')
    if (beta && cmp(beta, q(1)) < 0) remarks.push(`Bei so verdünnten wässrigen Lösungen gilt näherungsweise: $1\\,\\text{mg/L} \\approx 1\\,\\text{ppm}$ – hier also etwa $${ntr(mul(beta, THOUSAND))}\\,\\text{ppm}$.`)
  }
  return { result: res.join(',\\quad '), extra, steps, remark: remarks.join(' ') || undefined }
}

/* ---------------------------- aus konzentrierter Lösung ---------------------------- */

export type StockKind = 'saeure' | 'base' | 'neutral'

export interface Stock {
  id: string
  name: string
  formula: string
  /** Massenanteil in % */
  w: string
  /** Dichte in g/mL */
  rho: string
  kind: StockKind
}

/** handelsübliche konzentrierte Lösungen (20 °C) */
export const STOCKS: Stock[] = [
  { id: 'hcl', name: 'Salzsäure 37 %', formula: 'HCl', w: '37', rho: '1,19', kind: 'saeure' },
  { id: 'h2so4', name: 'Schwefelsäure 96 %', formula: 'H2SO4', w: '96', rho: '1,84', kind: 'saeure' },
  { id: 'hno3', name: 'Salpetersäure 65 %', formula: 'HNO3', w: '65', rho: '1,40', kind: 'saeure' },
  { id: 'nh3', name: 'Ammoniak 25 %', formula: 'NH3', w: '25', rho: '0,91', kind: 'base' },
  { id: 'naoh', name: 'Natronlauge 50 %', formula: 'NaOH', w: '50', rho: '1,52', kind: 'base' },
  { id: 'essig', name: 'Essigsäure 100 % (Eisessig)', formula: 'CH3COOH', w: '100', rho: '1,05', kind: 'saeure' },
]

/** Säure, Lauge oder neutral – für den Sicherheitshinweis */
export function stockKind(formula?: string): StockKind {
  const f = (formula ?? '').replace(/\s+/g, '')
  const hit = STOCKS.find((s) => s.formula === f)
  if (hit) return hit.kind
  if (/OH\)?\d*$/.test(f) || /^NH3$/.test(f)) return 'base'
  if (/^H[A-Z0-9]/.test(f) || /COOH$/.test(f)) return 'saeure'
  return 'neutral'
}

/**
 * Lösung bestimmter Konzentration aus einer konzentrierten Stammlösung (w in %, ρ in g/mL):
 * c_Stamm = w · ρ / M, V_Stamm = c_Ziel · V_Ziel / c_Stamm.
 */
export function fromStock(o: {
  formula?: string
  M?: NumIn | null
  w: NumIn | null
  rho: NumIn | null
  c: NumIn | null
  cu: string
  V: NumIn | null
  vu: string
  kind?: StockKind
}): Solution {
  const s = substance(o.formula, o.M, true)
  const wp = need(o.w, 'der Massenanteil w der Stammlösung')
  if (cmp(wp, HUNDRED) > 0) throw new CalcError('Ein Massenanteil kann höchstens 100 % betragen.')
  const rho = need(o.rho, 'die Dichte ρ der Stammlösung')
  const cz0 = need(o.c, 'die Zielkonzentration c')
  const vz0 = need(o.V, 'das Zielvolumen V')
  const steps: Step[] = []
  steps.push({
    head: 'Gegeben',
    tex: `\\text{Stammlösung: } w = ${sh(wp)}\\,\\%,\\ \\rho = ${sh(rho)}${T('g/mL')};\\quad \\text{Ziel: } c = ${sh(cz0)}${T(o.cu)},\\ V = ${sh(vz0)}${T(o.vu)}`,
    note: 'Konzentrierte Säuren und Laugen werden mit Massenanteil und Dichte angegeben (Etikett, Tabellenbuch).',
  })
  if (s.step) steps.push(s.step)
  const w = div(wp, HUNDRED)
  const rL = mul(rho, THOUSAND)
  const cz = convTex('c_{\\text{Ziel}}', cz0, o.cu, CONC_U, 'mol/L')
  const vz = convTex('V_{\\text{Ziel}}', vz0, o.vu, VOL_U, 'L')
  const conv = [`w = ${sh(wp)}\\,\\% ${eqx(w)}`, `\\rho = ${sh(rho)}${T('g/mL')} ${eqx(rL)}${T('g/L')}`]
  if (cz.tex) conv.push(cz.tex)
  if (vz.tex) conv.push(vz.tex)
  steps.push({ head: 'Einheiten umrechnen', tex: conv.join(',\\quad '), note: 'Prozent durch 100 teilen; Dichte und Volumen auf Liter beziehen (1 L = 1000 mL).' })

  const beta = mul(w, rL)
  const cs = div(beta, s.M)
  steps.push({
    head: 'Konzentration der Stammlösung',
    tex: `\\beta_{\\text{Stamm}} = w \\cdot \\rho = ${ntr(w)} \\cdot ${ntr(rL)}${T('g/L')} ${eqx(beta)}${T('g/L')}`,
    note: `Ein Liter der konzentrierten Lösung wiegt $${ntr(rL)}${T('g')}$, davon sind $${sh(wp)}\\,\\%$ gelöster Stoff.`,
  })
  steps.push({
    tex: `c_{\\text{Stamm}} = \\frac{\\beta_{\\text{Stamm}}}{M} = \\frac{${ntr(beta)}${T('g/L')}}{${m2(s.M)}${T('g/mol')}} ${eqx(cs)}${T('mol/L')}`,
    note: 'Kurz: $c = \\frac{w \\cdot \\rho \\cdot 1000}{M \\cdot 100}$ mit $w$ in % und $\\rho$ in g/mL.',
  })
  if (cmp(cz.v, cs) >= 0) throw new CalcError(`Die Zielkonzentration ist nicht kleiner als die der Stammlösung ($c_{\\text{Stamm}} ${eqx(cs)}${T('mol/L')}$) – verdünnen geht nur zu kleineren Konzentrationen.`)

  const n = mul(cz.v, vz.v)
  steps.push({
    head: 'Benötigte Stoffmenge',
    tex: `n = c_{\\text{Ziel}} \\cdot V_{\\text{Ziel}} = ${ntr(cz.v)}${T('mol/L')} \\cdot ${ntr(vz.v)}${T('L')} ${eqx(n)}${T('mol')}`,
    note: 'So viel Stoff muss am Ende in der verdünnten Lösung sein.',
  })
  const vs = div(n, cs)
  const vsb = labVol(vs)
  steps.push({
    head: 'Volumen der Stammlösung',
    tex: `V_{\\text{Stamm}} = \\frac{n}{c_{\\text{Stamm}}} = \\frac{${ntr(n)}${T('mol')}}{${ntr(cs)}${T('mol/L')}} ${eqx(vs)}${T('L')}${vsb.u !== 'L' ? ` ${eqx(vsb.v)}${T(vsb.u)}` : ''}`,
    note: 'Dasselbe wie mit der Verdünnungsgleichung $c_{\\text{Stamm}} \\cdot V_{\\text{Stamm}} = c_{\\text{Ziel}} \\cdot V_{\\text{Ziel}}$ – die Stoffmenge bleibt beim Verdünnen gleich.',
    final: true,
  })
  const ms = mul(rho, mul(vs, THOUSAND))
  steps.push({
    head: 'Masse der Stammlösung',
    tex: `m_{\\text{Stamm}} = \\rho \\cdot V_{\\text{Stamm}} = ${sh(rho)}${T('g/mL')} \\cdot ${ntr(mul(vs, THOUSAND))}${T('mL')} ${eqx(ms)}${T('g')}`,
    note: 'Zähflüssige Lösungen wie konzentrierte Schwefelsäure lassen sich auch abwiegen statt abmessen.',
  })
  const water = sub(vz.v, vs)
  const wb = labVol(water)
  steps.push({
    head: 'Wasser',
    tex: `V_{\\text{Wasser}} \\approx V_{\\text{Ziel}} - V_{\\text{Stamm}} ${eqx(vz.v)} - ${ntr(vs)} ${eqx(water)}${T('L')}${wb.u !== 'L' ? ` ${eqx(wb.v)}${T(wb.u)}` : ''}`,
    note: 'Nur ungefähr: Beim Mischen ändert sich das Volumen (Volumenkontraktion, Erwärmung). Darum im Messkolben bis zur Eichmarke auffüllen statt Wasser abzumessen.',
  })
  const k = div(cs, cz.v)
  const kind = o.kind ?? stockKind(o.formula)
  const vt = `${ntr(vsb.v)}${T(vsb.u)}`
  const flask = `$${sh(vz0)}${T(o.vu)}$`
  const remark =
    kind === 'base'
      ? `Sicherheit: **„Erst das Wasser, dann die Säure!“** gilt genauso für Laugen – im Messkolben (${flask}) etwa die Hälfte des Wassers vorlegen, $${vt}$ der Lauge langsam zugeben (Abzug, Schutzbrille, Handschuhe), umschwenken, abkühlen lassen und erst dann bis zur Eichmarke auffüllen.`
      : kind === 'saeure'
        ? `Sicherheit: **Erst das Wasser, dann die Säure!** Im Messkolben (${flask}) etwa die Hälfte des Wassers vorlegen, $${vt}$ Säure langsam unter Umschwenken zugeben (Abzug, Schutzbrille, Handschuhe), abkühlen lassen und erst dann bis zur Eichmarke auffüllen.`
        : `Im Messkolben (${flask}) etwas Wasser vorlegen, $${vt}$ der Stammlösung zugeben, mischen und bis zur Eichmarke auffüllen.`
  return {
    result: `V_{\\text{Stamm}} ${eqx(vsb.v)}${T(vsb.u)}`,
    extra: [`c_{\\text{Stamm}} ${eqx(cs)}${T('mol/L')}`, `m_{\\text{Stamm}} ${eqx(ms)}${T('g')}`, `V_{\\text{Wasser}} \\approx ${ntr(wb.v)}${T(wb.u)}\\ (\\text{bis zur Marke auffüllen})`, `\\text{Verdünnung } 1 : ${ntr(k)}`],
    steps,
    remark,
  }
}

/* ---------------------------- Volumenanteil ---------------------------- */

export type PhiMode = 'ansetzen' | 'anteil'

/**
 * ansetzen: V_Stamm = φ_Ziel · V_Ziel / φ_Stamm (z. B. 70 % Ethanol aus 96 % Ethanol)
 * anteil: φ = V_Stoff / V_Gesamt – zwei der drei Größen eingeben.
 */
export function volumeFraction(o: {
  art: PhiMode
  phi1?: NumIn | null
  phi2?: NumIn | null
  V?: NumIn | null
  vu: string
  Vs?: NumIn | null
  Vg?: NumIn | null
  phi?: NumIn | null
  name?: string
}): Solution {
  const hier = o.name?.trim() ? ` (hier ${o.name.trim()})` : ''
  const vt = T(o.vu)
  const steps: Step[] = []
  if (o.art === 'ansetzen') {
    const p1 = need(o.phi1, 'der Volumenanteil der Stammlösung')
    const p2 = need(o.phi2, 'der gewünschte Volumenanteil')
    const V = need(o.V, 'das Zielvolumen')
    if (cmp(p1, HUNDRED) > 0 || cmp(p2, HUNDRED) > 0) throw new CalcError('Ein Volumenanteil kann höchstens 100 % betragen.')
    if (cmp(p2, p1) >= 0) throw new CalcError('Der gewünschte Volumenanteil muss kleiner sein als der der Stammlösung – verdünnen macht die Lösung nur schwächer.')
    steps.push({
      head: 'Gegeben',
      tex: `\\varphi_{\\text{Stamm}} = ${sh(p1)}\\,\\%,\\quad \\varphi_{\\text{Ziel}} = ${sh(p2)}\\,\\%,\\quad V_{\\text{Ziel}} = ${sh(V)}${vt}`,
      note: `Volumenanteil $\\varphi$: Volumen des reinen Stoffs${hier} bezogen auf das Volumen der Mischung.`,
    })
    steps.push({ head: 'Formel', tex: `\\varphi = \\frac{V_{\\text{Stoff}}}{V_{\\text{Gesamt}}}`, note: 'Prozentangaben wie „70 % (V/V)“ oder „70 Vol.-%“ meinen den Volumenanteil.' })
    const vstoff = div(mul(p2, V), HUNDRED)
    steps.push({
      head: 'Reiner Stoff im Ziel',
      tex: `V_{\\text{Stoff}} = \\varphi_{\\text{Ziel}} \\cdot V_{\\text{Ziel}} = ${ntr(div(p2, HUNDRED))} \\cdot ${sh(V)}${vt} ${eqx(vstoff)}${vt}`,
      note: `So viel reiner Stoff${hier} soll am Ende in der Lösung sein.`,
    })
    const vs = div(vstoff, div(p1, HUNDRED))
    steps.push({
      head: 'Volumen der Stammlösung',
      tex: `V_{\\text{Stamm}} = \\frac{V_{\\text{Stoff}}}{\\varphi_{\\text{Stamm}}} = \\frac{${ntr(vstoff)}${vt}}{${ntr(div(p1, HUNDRED))}} ${eqx(vs)}${vt}`,
      note: 'Die Stammlösung enthält den Stoff nur zum Anteil $\\varphi_{\\text{Stamm}}$ – man braucht entsprechend mehr davon.',
    })
    steps.push({
      tex: `V_{\\text{Stamm}} = \\frac{\\varphi_{\\text{Ziel}} \\cdot V_{\\text{Ziel}}}{\\varphi_{\\text{Stamm}}} = \\frac{${sh(p2)}\\,\\% \\cdot ${sh(V)}${vt}}{${sh(p1)}\\,\\%} ${eqx(vs)}${vt}`,
      note: 'In einer Formel – Prozent kürzt sich weg.',
      final: true,
    })
    const water = sub(V, vs)
    steps.push({
      head: 'Mit Wasser auffüllen',
      tex: `V_{\\text{Wasser}} \\approx ${sh(V)}${vt} - ${ntr(vs)}${vt} ${eqx(water)}${vt}`,
      note: 'Rechnerisch – tatsächlich braucht man etwas mehr Wasser, weil z. B. Ethanol und Wasser beim Mischen zusammenrücken (Volumenkontraktion). Darum im Messkolben bzw. Messzylinder bis zur Marke auffüllen.',
    })
    return {
      result: `V_{\\text{Stamm}} ${eqx(vs)}${vt}`,
      extra: [`\\text{mit Wasser auf } ${sh(V)}${vt} \\text{ auffüllen}`, `V_{\\text{Wasser}} \\approx ${ntr(water)}${vt}\\ (\\text{rechnerisch})`],
      steps,
      remark: `Volumenkontraktion: $50\\,\\text{mL}$ Ethanol und $50\\,\\text{mL}$ Wasser ergeben nur etwa $96$ bis $97\\,\\text{mL}$ Mischung. Deshalb $${ntr(vs)}${vt}$ der Stammlösung ($${sh(p1)}\\,\\%$) abmessen und dann auf $${sh(V)}${vt}$ auffüllen – nicht die Einzelvolumina addieren.`,
    }
  }
  // φ = V_Stoff / V_Gesamt – zwei von drei
  const given = [o.phi, o.Vs, o.Vg].filter(Boolean).length
  if (given !== 2) throw new CalcError('Bitte genau zwei der drei Werte (φ, V Stoff, V Gesamt) eingeben – der dritte wird berechnet.')
  steps.push({ head: 'Formel', tex: `\\varphi = \\frac{V_{\\text{Stoff}}}{V_{\\text{Gesamt}}} \\cdot 100\\,\\%`, note: `Volumenanteil: Volumen des reinen Stoffs${hier} bezogen auf das Gesamtvolumen.` })
  if (!o.phi) {
    const vs = need(o.Vs, 'das Volumen des Stoffs')
    const vg = need(o.Vg, 'das Gesamtvolumen')
    if (cmp(vs, vg) > 0) throw new CalcError('Das Volumen des Stoffs kann nicht größer sein als das Gesamtvolumen.')
    const phi = mul(div(vs, vg), HUNDRED)
    steps.push({ head: 'Einsetzen', tex: `\\varphi = \\frac{${sh(vs)}${vt}}{${sh(vg)}${vt}} \\cdot 100\\,\\% ${eqx(phi)}\\,\\%`, note: 'Die Volumeneinheit kürzt sich weg.', final: true })
    return { result: `\\varphi ${eqx(phi)}\\,\\%`, steps, remark: 'Streng genommen bezieht sich $\\varphi$ auf die Volumina vor dem Mischen – wegen der Volumenkontraktion ist das fertige Gemisch etwas kleiner als die Summe.' }
  }
  const phi = need(o.phi, 'der Volumenanteil φ')
  if (cmp(phi, HUNDRED) > 0) throw new CalcError('Ein Volumenanteil kann höchstens 100 % betragen.')
  const f = div(phi, HUNDRED)
  if (!o.Vs) {
    const vg = need(o.Vg, 'das Gesamtvolumen')
    const vs = mul(f, vg)
    steps.push({ head: 'Umstellen', tex: `V_{\\text{Stoff}} = \\varphi \\cdot V_{\\text{Gesamt}} = ${ntr(f)} \\cdot ${sh(vg)}${vt} ${eqx(vs)}${vt}`, note: 'Nach $V_{\\text{Stoff}}$ umgestellt, $\\varphi$ als Zahl (Prozent durch 100).', final: true })
    return { result: `V_{\\text{Stoff}} ${eqx(vs)}${vt}`, steps, extra: [`\\text{mit Wasser auf } ${sh(vg)}${vt} \\text{ auffüllen}`] }
  }
  const vs = need(o.Vs, 'das Volumen des Stoffs')
  const vg = div(vs, f)
  steps.push({ head: 'Umstellen', tex: `V_{\\text{Gesamt}} = \\frac{V_{\\text{Stoff}}}{\\varphi} = \\frac{${sh(vs)}${vt}}{${ntr(f)}} ${eqx(vg)}${vt}`, note: 'Nach $V_{\\text{Gesamt}}$ umgestellt, $\\varphi$ als Zahl (Prozent durch 100).', final: true })
  return { result: `V_{\\text{Gesamt}} ${eqx(vg)}${vt}`, steps }
}
