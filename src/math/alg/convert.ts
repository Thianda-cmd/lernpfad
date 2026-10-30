/**
 * Einheiten umrechnen: Masse, Volumen, Stoffmenge, Konzentrationen, Länge, Fläche, Druck, Zeit und
 * Temperatur – mit Zehnerpotenzen im Rechenweg: 1 mL = 10⁻³ L ⇒ 250 mL = 250 · 10⁻³ L = 0,25 L.
 * Gerechnet wird exakt mit Brüchen; gerundet wird nur bei nicht abbrechenden Ergebnissen.
 */
import { add, approxTex, CalcError, decStr, div, isTerminating, mul, q, qpow, qTex, sign, sub, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { F, T } from './units'

export type QtyId = 'masse' | 'volumen' | 'stoffmenge' | 'konz' | 'mkonz' | 'laenge' | 'flaeche' | 'druck' | 'zeit' | 'temperatur'

export interface CUnit {
  u: string
  /** Faktor zur Grundeinheit */
  f: Q
  /** Fläche/Volumen aus einer Längeneinheit: [Länge, Hochzahl, Bezugslänge] */
  pow?: [string, number, string]
  /** zusammengesetzte Einheit: [Zähler, Nenner] */
  frac?: [string, string]
  /** gleichwertige Schreibweise („M“ = „mol/L“) */
  same?: string
  /** eigener Zwischenschritt (TeX) zwischen „1 Einheit =“ und dem Faktor */
  why?: string
}

export interface Qty {
  id: QtyId
  name: string
  base: string
  units: CUnit[]
  /** Startwerte: Wert, von, nach */
  ex: [string, string, string]
}

const P = (k: number): Q => (k >= 0 ? q(10n ** BigInt(k)) : q(1n, 10n ** BigInt(-k)))
const U = (u: string, f: Q, extra: Partial<CUnit> = {}): CUnit => ({ u, f, ...extra })

const MASS: CUnit[] = [U('t', P(6)), U('kg', P(3)), U('g', P(0)), U('mg', P(-3)), U('µg', P(-6)), U('ng', P(-9)), U('pg', P(-12))]
const VOLUME: CUnit[] = [
  U('m³', P(3), { pow: ['m', 3, 'dm'] }),
  U('dm³', P(0), { pow: ['dm', 3, 'dm'], same: 'L' }),
  U('L', P(0)),
  U('dL', P(-1)),
  U('cL', P(-2)),
  U('mL', P(-3)),
  U('cm³', P(-3), { pow: ['cm', 3, 'dm'], same: 'mL' }),
  U('µL', P(-6)),
  U('mm³', P(-6), { pow: ['mm', 3, 'dm'], same: 'µL' }),
  U('nL', P(-9)),
]
const AMOUNT: CUnit[] = [U('kmol', P(3)), U('mol', P(0)), U('mmol', P(-3)), U('µmol', P(-6)), U('nmol', P(-9)), U('pmol', P(-12)), U('fmol', P(-15))]
const LENGTH: CUnit[] = [U('km', P(3)), U('m', P(0)), U('dm', P(-1)), U('cm', P(-2)), U('mm', P(-3)), U('µm', P(-6)), U('nm', P(-9)), U('pm', P(-12))]

const lenF = (u: string) => LENGTH.find((x) => x.u === u)!.f
function fr(lists: [CUnit[], CUnit[]], top: string, bottom: string, extra: Partial<CUnit> = {}): CUnit {
  const a = lists[0].find((x) => x.u === top)!.f
  const b = lists[1].find((x) => x.u === bottom)!.f
  return U(`${top}/${bottom}`, div(a, b), { frac: [top, bottom], ...extra })
}

const MOLAR: [CUnit[], CUnit[]] = [AMOUNT, VOLUME]
const MASSC: [CUnit[], CUnit[]] = [MASS, VOLUME]

export const QTYS: Qty[] = [
  { id: 'masse', name: 'Masse', base: 'g', units: MASS, ex: ['250', 'mg', 'g'] },
  { id: 'volumen', name: 'Volumen', base: 'L', units: VOLUME, ex: ['250', 'mL', 'L'] },
  { id: 'stoffmenge', name: 'Stoffmenge', base: 'mol', units: AMOUNT, ex: ['0,25', 'mmol', 'µmol'] },
  {
    id: 'konz',
    name: 'Stoffmengenkonzentration',
    base: 'mol/L',
    units: [
      fr(MOLAR, 'mol', 'L'),
      U('M', P(0), { same: 'mol/L' }),
      fr(MOLAR, 'mmol', 'mL'),
      fr(MOLAR, 'mmol', 'L'),
      U('mM', P(-3), { same: 'mmol/L' }),
      fr(MOLAR, 'mol', 'm³'),
      fr(MOLAR, 'µmol', 'L'),
      U('µM', P(-6), { same: 'µmol/L' }),
      fr(MOLAR, 'nmol', 'L'),
      U('nM', P(-9), { same: 'nmol/L' }),
      fr(MOLAR, 'pmol', 'L'),
      U('pM', P(-12), { same: 'pmol/L' }),
    ],
    ex: ['0,5', 'mmol/L', 'µmol/L'],
  },
  {
    id: 'mkonz',
    name: 'Massenkonzentration',
    base: 'g/L',
    units: [
      fr(MASSC, 'g', 'mL'),
      fr(MASSC, 'g', 'L'),
      fr(MASSC, 'kg', 'm³'),
      fr(MASSC, 'mg', 'mL'),
      fr(MASSC, 'µg', 'µL'),
      fr(MASSC, 'mg', 'dL'),
      fr(MASSC, 'mg', 'L'),
      fr(MASSC, 'µg', 'mL'),
      fr(MASSC, 'ng', 'µL'),
      fr(MASSC, 'µg', 'L'),
      fr(MASSC, 'ng', 'mL'),
      fr(MASSC, 'pg', 'mL'),
    ],
    ex: ['2,5', 'mg/mL', 'µg/µL'],
  },
  { id: 'laenge', name: 'Länge', base: 'm', units: LENGTH, ex: ['0,45', 'mm', 'µm'] },
  {
    id: 'flaeche',
    name: 'Fläche',
    base: 'm²',
    units: [
      U('km²', P(6), { pow: ['km', 2, 'm'] }),
      U('m²', P(0)),
      U('dm²', P(-2), { pow: ['dm', 2, 'm'] }),
      U('cm²', P(-4), { pow: ['cm', 2, 'm'] }),
      U('mm²', P(-6), { pow: ['mm', 2, 'm'] }),
      U('µm²', P(-12), { pow: ['µm', 2, 'm'] }),
      U('nm²', P(-18), { pow: ['nm', 2, 'm'] }),
    ],
    ex: ['1', 'mm²', 'µm²'],
  },
  {
    id: 'druck',
    name: 'Druck',
    base: 'Pa',
    units: [
      U('MPa', P(6)),
      U('bar', P(5)),
      U('atm', q(101325), { why: '1013{,}25\\,\\text{hPa}' }),
      U('kPa', P(3)),
      U('hPa', P(2)),
      U('mbar', P(2), { same: 'hPa' }),
      U('mmHg', q(101325, 760), { why: '\\frac{1}{760}\\,\\text{atm} = \\frac{101\\,325}{760}\\,\\text{Pa}' }),
      U('Pa', P(0)),
    ],
    ex: ['1013', 'hPa', 'bar'],
  },
  {
    id: 'zeit',
    name: 'Zeit',
    base: 's',
    units: [U('d', q(86400), { why: '24\\,\\text{h} = 24 \\cdot 3600\\,\\text{s}' }), U('h', q(3600), { why: '60\\,\\text{min} = 60 \\cdot 60\\,\\text{s}' }), U('min', q(60)), U('s', P(0)), U('ms', P(-3)), U('µs', P(-6))],
    ex: ['2,5', 'h', 'min'],
  },
  {
    id: 'temperatur',
    name: 'Temperatur',
    base: 'K',
    units: [U('°C', q(1)), U('K', q(1)), U('°F', q(1))],
    ex: ['37', '°C', 'K'],
  },
]

export const QTY_BY_ID = Object.fromEntries(QTYS.map((x) => [x.id, x])) as Record<QtyId, Qty>

/* ---------------------------- Zahlen ---------------------------- */

/** Zehnerpotenz-Hochzahl, falls x = 10^k */
export function pow10(x: Q): number | null {
  const isP = (n: bigint) => /^10*$/.test(n.toString())
  if (x.n > 0n && x.d === 1n && isP(x.n)) return x.n.toString().length - 1
  if (x.n === 1n && isP(x.d)) return -(x.d.toString().length - 1)
  return null
}

/** Faktor als TeX: 10^{-3}, 3600, \frac{1}{60} oder gerundet */
function facTex(x: Q): { t: string; approx: boolean } {
  const k = pow10(x)
  if (k !== null) return { t: k === 0 ? '1' : k === 1 ? '10' : `10^{${k}}`, approx: false }
  if (isTerminating(x)) return { t: qTex(x, F), approx: false }
  if (x.n <= 100n && x.d <= 100000n) return { t: qTex(x), approx: false }
  return { t: approxTex(toNum(x), 6), approx: true }
}

/** exakte Zahl als TeX; sehr groß/klein als m · 10^k; nicht abbrechend gerundet */
export function exactTex(x: Q): { t: string; approx: boolean } {
  if (!isTerminating(x)) return { t: approxTex(toNum(x), 6), approx: true }
  const a = Math.abs(toNum(x))
  if (a === 0 || (a >= 1e-4 && a < 1e9)) return { t: qTex(x, F), approx: false }
  return { t: sciTex(x), approx: false }
}

/** abbrechender Bruch in wissenschaftlicher Schreibweise, exakt: 2{,}5 \cdot 10^{-10} */
export function sciTex(x: Q): string {
  const s = decStr(x)
  const neg = s.startsWith('-')
  const [i, f = ''] = (neg ? s.slice(1) : s).split('.')
  const digits = (i + f).replace(/^0+/, '')
  const lead = (i + f).length - digits.length
  const e = i.length - 1 - lead
  const d = digits.replace(/0+$/, '') || '0'
  const m = d.length > 1 ? `${d[0]}{,}${d.slice(1)}` : d
  return `${neg ? '-' : ''}${m === '1' ? '' : `${m} \\cdot `}10^{${e}}`
}

const one = (u: string) => `1${T(u)}`

/* ---------------------------- Umrechnen ---------------------------- */

function findUnit(qty: Qty, u: string) {
  const x = qty.units.find((e) => e.u === u)
  if (!x) throw new CalcError(`Die Einheit „${u}“ gibt es bei ${qty.name} nicht.`)
  return x
}

/** Zeile „1 Einheit = … Grundeinheit“ mit Zwischenschritt */
function baseLine(qty: Qty, x: CUnit): string {
  const f = facTex(x.f)
  const eq = f.approx ? '\\approx' : '='
  const val = `${f.t}${T(qty.base)}`
  if (x.why) return `${one(x.u)} = ${x.why} ${eq} ${val}`
  if (x.pow) {
    // 1 cm³ = (10⁻¹ dm)³ = 10⁻³ dm³ = 10⁻³ L = 1 mL
    const [len, k, ref] = x.pow
    const refU = ref + (k === 2 ? '²' : '³')
    const lf = div(lenF(len), lenF(ref))
    const chain = [one(x.u)]
    if (len !== ref) chain.push(`(${facTex(lf).t}${T(ref)})^{${k}}`, `${facTex(qpow(lf, k)).t}${T(refU)}`)
    if (refU !== qty.base) chain.push(len === ref ? one(qty.base) : val)
    if (x.same && x.same !== qty.base) chain.push(one(x.same))
    return chain.join(' = ')
  }
  if (x.same) {
    const s = qty.units.find((e) => e.u === x.same)!
    if (s.u === qty.base) return `${one(x.u)} = ${one(s.u)}`
    return `${one(x.u)} = ${baseLine(qty, s)}`
  }
  if (x.frac) {
    // 1 mg/mL = (1 mg)/(1 mL) = (10⁻³ g)/(10⁻³ L) = 1 g/L
    const [top, bottom] = x.frac
    const lists = qty.id === 'konz' ? MOLAR : MASSC
    const a = facTex(lists[0].find((e) => e.u === top)!.f)
    const b = facTex(lists[1].find((e) => e.u === bottom)!.f)
    const tu = qty.id === 'konz' ? 'mol' : 'g'
    return `${one(x.u)} = \\frac{1${T(top)}}{1${T(bottom)}} = \\frac{${a.t}${T(tu)}}{${b.t}${T('L')}} ${eq} ${val}`
  }
  return `${one(x.u)} ${eq} ${val}`
}

function tempSteps(v: Q, from: string, to: string): { steps: Step[]; r: Q } {
  const K0 = q(27315, 100)
  const NINE5 = q(9, 5)
  const steps: Step[] = []
  const vt = qTex(v, F)
  // in Kelvin prüfen
  const kelvin = from === 'K' ? v : from === '°C' ? add(v, K0) : add(div(sub(v, q(32)), NINE5), K0)
  if (sign(kelvin) < 0) throw new CalcError('Das liegt unter dem absoluten Nullpunkt (0 K = −273,15 °C = −459,67 °F) – kälter geht es nicht.')
  const c2k = (c: Q, first: boolean) => {
    const r = add(c, K0)
    steps.push({ tex: `T = \\vartheta + 273{,}15 = ${qTex(c, F)} + 273{,}15 = ${exactTex(r).t}${T('K')}`, head: first ? 'Celsius in Kelvin' : 'Dann in Kelvin', note: 'Kelvin beginnt am absoluten Nullpunkt; ein Grad Celsius ist genauso groß wie ein Kelvin.' })
    return r
  }
  const k2c = (k: Q) => {
    const r = sub(k, K0)
    steps.push({ tex: `\\vartheta = T - 273{,}15 = ${qTex(k, F)} - 273{,}15 = ${exactTex(r).t}${T('°C')}`, head: 'Kelvin in Celsius', note: 'Vom Kelvin-Wert 273,15 abziehen.' })
    return r
  }
  const c2f = (c: Q, first: boolean) => {
    const r = add(mul(c, NINE5), q(32))
    const e = exactTex(r)
    steps.push({ tex: `\\vartheta_F = \\vartheta \\cdot 1{,}8 + 32 = ${qTex(c, F)} \\cdot 1{,}8 + 32 ${e.approx ? '\\approx' : '='} ${e.t}${T('°F')}`, head: first ? 'Celsius in Fahrenheit' : 'Dann in Fahrenheit', note: 'Ein Grad Celsius sind 1,8 Grad Fahrenheit; 0 °C entsprechen 32 °F.' })
    return r
  }
  const f2c = (f: Q) => {
    const r = div(sub(f, q(32)), NINE5)
    const e = exactTex(r)
    steps.push({ tex: `\\vartheta = (\\vartheta_F - 32) : 1{,}8 = (${qTex(f, F)} - 32) : 1{,}8 ${e.approx ? '\\approx' : '='} ${e.t}${T('°C')}`, head: 'Fahrenheit in Celsius', note: 'Erst 32 abziehen, dann durch 1,8 teilen.' })
    return r
  }
  let r: Q = v
  if (from === to) {
    steps.push({ tex: `${vt}${T(from)} = ${vt}${T(to)}`, head: 'Gleiche Einheit', note: 'Nichts umzurechnen.' })
  } else if (from === '°C' && to === 'K') r = c2k(v, true)
  else if (from === 'K' && to === '°C') r = k2c(v)
  else if (from === '°C' && to === '°F') r = c2f(v, true)
  else if (from === '°F' && to === '°C') r = f2c(v)
  else if (from === 'K' && to === '°F') r = c2f(k2c(v), false)
  else r = c2k(f2c(v), false)
  steps[steps.length - 1].final = true
  return { steps, r }
}

export function convertUnits(qtyId: QtyId, value: NumIn | null, from: string, to: string): Solution {
  const qty = QTY_BY_ID[qtyId]
  if (!qty) throw new CalcError('Unbekannte Größe.')
  if (!value) throw new CalcError('Bitte einen Wert eingeben.')
  const v = value.q
  const A = findUnit(qty, from)
  const B = findUnit(qty, to)
  const vt = qTex(v, F)
  if (qty.id === 'temperatur') {
    const { steps, r } = tempSteps(v, A.u, B.u)
    const e = exactTex(r)
    return { result: `${vt}${T(A.u)} ${e.approx ? '\\approx' : '='} ${e.t}${T(B.u)}`, steps, remark: 'Temperaturen werden nicht mit einem Faktor umgerechnet, sondern mit einer Formel – die Nullpunkte der Skalen liegen verschieden. Temperaturdifferenzen: 1 K = 1 °C = 1,8 °F.' }
  }
  if (sign(v) < 0) throw new CalcError(`${qty.name} kann nicht negativ sein.`)
  const steps: Step[] = []
  const k = div(A.f, B.f)
  const r = mul(v, k)
  const kt = facTex(k)
  const res = exactTex(r)
  if (A.u === B.u) {
    steps.push({ tex: `${vt}${T(A.u)} = ${vt}${T(B.u)}`, head: 'Gleiche Einheit', note: 'Nichts umzurechnen.', final: true })
    return { result: `${vt}${T(A.u)}`, steps }
  }
  const lines: string[] = []
  const baseA = A.u === qty.base
  const baseB = B.u === qty.base
  let note: string
  if (A.same === B.u || B.same === A.u) {
    // zwei Namen für dieselbe Einheit (cm³ = mL, M = mol/L)
    lines.push(baseLine(qty, A.same === B.u ? A : B))
  } else {
    if (!baseA) lines.push(baseLine(qty, A))
    if (!baseB) lines.push(baseLine(qty, B))
  }
  if (lines.length === 1 && (A.same === B.u || B.same === A.u)) note = `${A.u} und ${B.u} sind zwei Namen für dieselbe Einheit.`
  else if (baseB) note = `Die Einheit ${A.u} durch die Grundeinheit ${qty.base} ausdrücken.`
  else if (baseA) {
    const inv = facTex(div(q(1), B.f))
    const lhs = `\\frac{1}{${facTex(B.f).t}}`
    lines.push(`\\Rightarrow\\ ${one(A.u)} = ${inv.t === lhs ? lhs : `${lhs}${T(B.u)} ${inv.approx ? '\\approx' : '='} ${inv.t}`}${T(B.u)}`)
    note = `Zuerst ${B.u} in ${qty.base} ausdrücken, dann umkehren.`
  } else {
    lines.push(`\\Rightarrow\\ ${one(A.u)} = \\frac{${facTex(A.f).t}}{${facTex(B.f).t}}${T(B.u)} ${kt.approx ? '\\approx' : '='} ${kt.t}${T(B.u)}`)
    note = `Beide Einheiten über die Grundeinheit ${qty.base} vergleichen und die Faktoren teilen.`
  }
  steps.push({ tex: lines.length > 1 ? `\\begin{aligned} ${lines.map((l) => `& ${l}`).join(' \\\\ ')} \\end{aligned}` : lines[0], head: 'Umrechnungszahl', note })
  const e = pow10(k)
  let tip: string
  if (e !== null && e !== 0) tip = `Merkhilfe: Die Zahl wird ${e > 0 ? 'größer' : 'kleiner'}, weil die Einheit ${e > 0 ? 'kleiner' : 'größer'} ist – das Komma rückt um ${Math.abs(e)} ${Math.abs(e) === 1 ? 'Stelle' : 'Stellen'} nach ${e > 0 ? 'rechts' : 'links'}.`
  else tip = `Mit der Umrechnungszahl malnehmen${kt.approx ? ' (gerundet)' : ''}.`
  const mid = vt === '1' || kt.t === '1' ? '' : ` = ${vt} \\cdot ${kt.t}${T(B.u)}`
  steps.push({
    tex: `${vt}${T(A.u)}${mid} ${res.approx || kt.approx ? '\\approx' : '='} ${res.t}${T(B.u)}`,
    head: 'Umrechnen',
    note: tip,
    final: true,
  })
  const extra: string[] = []
  if (!res.approx) {
    const a = Math.abs(toNum(r))
    if (a !== 0 && (a >= 1e4 || a < 1e-2) && a >= 1e-4 && a < 1e9) extra.push(`= ${sciTex(r)}${T(B.u)}`)
  }
  const pw = A.pow ?? B.pow
  const remark = pw
    ? pw[1] === 2
      ? 'Bei Flächen zählt jede Stufe doppelt: Zwischen benachbarten Längeneinheiten (Faktor 10) liegt bei Flächen der Faktor 100.'
      : 'Bei Volumen in Längeneinheiten zählt jede Stufe dreifach: Faktor 1000 zwischen benachbarten Einheiten. Merke: 1 dm³ = 1 L, 1 cm³ = 1 mL, 1 mm³ = 1 µL.'
    : undefined
  return { result: `${vt}${T(A.u)} ${res.approx || kt.approx ? '\\approx' : '='} ${res.t}${T(B.u)}`, extra, steps, remark }
}

/** Wert in allen Einheiten der Größe (für die Übersichtstabelle) */
export function convertAll(qtyId: QtyId, value: NumIn | null, from: string): { u: string; tex: string }[] {
  const qty = QTY_BY_ID[qtyId]
  if (!qty || !value) return []
  const A = qty.units.find((e) => e.u === from)
  if (!A) return []
  return qty.units.map((B) => {
    try {
      if (qty.id === 'temperatur') {
        const { r } = tempSteps(value.q, A.u, B.u)
        return { u: B.u, tex: exactTex(r).t }
      }
      if (sign(value.q) < 0) return { u: B.u, tex: '\\text{–}' }
      return { u: B.u, tex: exactTex(mul(value.q, div(A.f, B.f))).t }
    } catch {
      return { u: B.u, tex: '\\text{–}' }
    }
  })
}

/** Vorsätze für die Regel-Tabelle */
export const PREFIXES: [string, string][] = [
  ['\\text{k} = 10^{3}', 'Kilo – das Tausendfache'],
  ['\\text{d} = 10^{-1}', 'Dezi – ein Zehntel'],
  ['\\text{c} = 10^{-2}', 'Zenti – ein Hundertstel'],
  ['\\text{m} = 10^{-3}', 'Milli – ein Tausendstel'],
  ['\\mu = 10^{-6}', 'Mikro – ein Millionstel'],
  ['\\text{n} = 10^{-9}', 'Nano – ein Milliardstel'],
  ['\\text{p} = 10^{-12}', 'Piko – ein Billionstel'],
]

/** zusätzliche Merksätze je Größe */
export const QTY_RULES: Record<QtyId, [string, string][]> = {
  masse: [['1\\,\\text{t} = 1000\\,\\text{kg}', 'Tonne']],
  volumen: [
    ['1\\,\\text{L} = 1\\,\\text{dm}^{3}', 'Liter und Kubikdezimeter'],
    ['1\\,\\text{mL} = 1\\,\\text{cm}^{3}', 'Milliliter und Kubikzentimeter'],
    ['1\\,\\mu\\text{L} = 1\\,\\text{mm}^{3}', 'Mikroliter und Kubikmillimeter'],
  ],
  stoffmenge: [['1\\,\\text{fmol} = 10^{-15}\\,\\text{mol}', 'Femto – ein Billiardstel']],
  konz: [
    ['1\\,\\text{M} = 1\\,\\text{mol/L}', 'molar (Laborschreibweise)'],
    ['1\\,\\text{mmol/L} = 1\\,\\text{mol/m}^{3}', 'SI-Einheit'],
  ],
  mkonz: [
    ['1\\,\\text{mg/mL} = 1\\,\\text{g/L}', 'Zähler und Nenner gleich geschrumpft'],
    ['1\\,\\mu\\text{g/mL} = 1\\,\\text{mg/L} = 1\\,\\text{ng}/\\mu\\text{L}', 'gleich groß'],
    ['1\\,\\text{mg/dL} = 10\\,\\text{mg/L}', 'Blutwerte (z. B. Glucose)'],
  ],
  laenge: [['1\\,\\mu\\text{m} = 1000\\,\\text{nm}', 'Zellen messen µm, Wellenlängen nm']],
  flaeche: [
    ['1\\,\\text{m}^{2} = 100\\,\\text{dm}^{2}', 'Faktor 100 je Stufe'],
    ['1\\,\\text{mm}^{2} = 10^{6}\\,\\mu\\text{m}^{2}', 'Zählkammer-Quadrate'],
  ],
  druck: [
    ['1\\,\\text{bar} = 1000\\,\\text{mbar} = 10^{5}\\,\\text{Pa}', 'Bar'],
    ['1\\,\\text{hPa} = 1\\,\\text{mbar}', 'Wetterbericht'],
    ['1\\,\\text{atm} = 1013{,}25\\,\\text{hPa}', 'Normdruck'],
  ],
  zeit: [['1\\,\\text{h} = 60\\,\\text{min} = 3600\\,\\text{s}', 'keine Zehnerschritte!']],
  temperatur: [
    ['T = \\vartheta + 273{,}15', 'Celsius → Kelvin'],
    ['\\vartheta_F = 1{,}8 \\cdot \\vartheta + 32', 'Celsius → Fahrenheit'],
    ['0\\,\\text{K} = -273{,}15\\,^{\\circ}\\text{C}', 'absoluter Nullpunkt'],
  ],
}
