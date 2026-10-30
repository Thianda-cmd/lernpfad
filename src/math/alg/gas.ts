/**
 * Gasgesetze für ideale Gase: allgemeine Gasgleichung p · V = n · R · T, molares Volumen
 * (Normbedingungen, 20 °C, 25 °C oder frei gewählt) und Zustandsänderungen p₁V₁/T₁ = p₂V₂/T₂ mit den
 * Sonderfällen Boyle-Mariotte (isotherm), Gay-Lussac (isobar) und Amontons (isochor). Exakt mit Brüchen.
 */
import { add, approxTex, CalcError, cmp, div, mul, q, qFromRaw, sign, sub, toNum, type Q } from '../q'
import { best, fac, MASS_U, MOL_U, PRESS_U, T, VOL_U, type Unit } from './units'
import { bestEq, eqx, need, ntr, sh, substance } from './concentration'
import { m2, NA } from './stoich'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'

/** allgemeine Gaskonstante in J/(mol·K) */
export const R = qFromRaw('8.314')
/** 0 °C in Kelvin */
export const T0 = qFromRaw('273.15')
export const GAS_VOL_U: readonly Unit[] = VOL_U.filter((x) => x.u === 'm³' || x.u === 'L' || x.u === 'mL')
export const GAS_MOL_U: readonly Unit[] = MOL_U.filter((x) => x.u === 'mol' || x.u === 'mmol')
export const TEMP_U = ['°C', 'K'] as const

const RU = '\\,\\frac{\\text{J}}{\\text{mol} \\cdot \\text{K}}'
const LMOL = '\\,\\frac{\\text{L}}{\\text{mol}}'
const K_ = '\\,\\text{K}'
const THOUSAND = q(1000)

/** Temperatur (°C oder K) in Kelvin; Umrechnung als TeX oder null */
function kelvin(sym: string, x: NumIn | null | undefined, unit: string, name: string): { K: Q; tex: string | null } {
  if (!x) throw new CalcError(`${name} fehlt – bitte eintragen.`)
  if (unit === 'K') {
    if (sign(x.q) <= 0) throw new CalcError('Temperaturen in Kelvin sind immer größer als 0 K.')
    return { K: x.q, tex: null }
  }
  const K = add(x.q, T0)
  if (sign(K) <= 0) throw new CalcError('Kälter als −273,15 °C (absoluter Nullpunkt) geht nicht.')
  return { K, tex: `${sym} = (${sh(x.q)} + 273{,}15)${K_} ${eqx(K, 6)}${K_}` }
}

const tGiven = (sym: string, x: Q, unit: string) => (unit === 'K' ? `${sym} = ${sh(x)}${K_}` : `\\vartheta${sym.slice(1)} = ${sh(x)}${T('°C')}`)

/* ---------------------------- p · V = n · R · T ---------------------------- */

export type GasVar = 'p' | 'V' | 'n' | 'T'

/** Genau eine der Größen p, V, n (oder m mit M) und T fehlt und wird berechnet. */
export function idealGas(o: {
  p: NumIn | null
  pu: string
  V: NumIn | null
  vu: string
  n: NumIn | null
  nu: string
  m?: NumIn | null
  mu?: string
  T: NumIn | null
  tu: string
  formula?: string
  M?: NumIn | null
}): Solution {
  if (o.n && o.m) throw new CalcError('Bitte entweder die Stoffmenge n oder die Masse m eingeben – nicht beides.')
  const has: Record<GasVar, boolean> = { p: !!o.p, V: !!o.V, n: !!(o.n || o.m), T: !!o.T }
  const missing = (Object.keys(has) as GasVar[]).filter((k) => !has[k])
  if (missing.length !== 1) throw new CalcError('Bitte genau drei der vier Größen p, V, n (oder m) und T eingeben – die vierte wird berechnet.')
  const want = missing[0]
  const s = substance(o.formula, o.M, !!o.m)
  const mu = o.mu ?? 'g'
  const steps: Step[] = []

  const giv: string[] = []
  if (o.p) giv.push(`p = ${sh(need(o.p, 'der Druck p'))}${T(o.pu)}`)
  if (o.V) giv.push(`V = ${sh(need(o.V, 'das Volumen V'))}${T(o.vu)}`)
  if (o.n) giv.push(`n = ${sh(need(o.n, 'die Stoffmenge n'))}${T(o.nu)}`)
  if (o.m) giv.push(`m = ${sh(need(o.m, 'die Masse m'))}${T(mu)}`)
  if (o.T) giv.push(tGiven('T', o.T.q, o.tu))
  if (s && !s.step) giv.push(`M = ${m2(s.M)}${T('g/mol')}`)
  const wantName: Record<GasVar, string> = { p: 'p', V: 'V', n: 'n', T: 'T' }
  steps.push({ head: 'Gegeben', tex: `${giv.join(',\\quad ')};\\quad \\text{gesucht: } ${wantName[want]}`, note: 'Ideales Gas: Die Teilchen selbst nehmen kein Volumen ein und ziehen sich nicht an – für die meisten Gase bei Raumbedingungen eine gute Näherung.' })
  if (s?.step) steps.push(s.step)

  // SI-Einheiten
  const conv: string[] = []
  let p: Q | null = null
  let V: Q | null = null
  let n: Q | null = null
  let TK: Q | null = null
  if (o.p) {
    p = mul(o.p.q, fac(PRESS_U, o.pu))
    if (o.pu !== 'Pa') conv.push(`p = ${sh(o.p.q)}${T(o.pu)} ${eqx(p, 6)}${T('Pa')}`)
  }
  if (o.V) {
    V = div(mul(o.V.q, fac(VOL_U, o.vu)), THOUSAND)
    if (o.vu !== 'm³') conv.push(`V = ${sh(o.V.q)}${T(o.vu)} ${eqx(V)}${T('m³')}`)
  }
  if (o.n) {
    n = mul(o.n.q, fac(MOL_U, o.nu))
    if (o.nu !== 'mol') conv.push(`n = ${sh(o.n.q)}${T(o.nu)} ${eqx(n)}${T('mol')}`)
  }
  if (o.T) {
    const k = kelvin('T', o.T, o.tu, 'Die Temperatur')
    TK = k.K
    if (k.tex) conv.push(k.tex)
  }
  if (o.m && s) {
    const mg = mul(o.m.q, fac(MASS_U, mu))
    n = div(mg, s.M)
    steps.push({ head: 'Stoffmenge', tex: `n = \\frac{m}{M} = \\frac{${ntr(mg)}${T('g')}}{${m2(s.M)}${T('g/mol')}} ${eqx(n)}${T('mol')}`, note: 'Aus der Masse über die molare Masse.' })
  }
  if (conv.length) steps.push({ head: 'Einheiten umrechnen', tex: conv.join(',\\quad '), note: 'In SI-Einheiten: Druck in Pa, Volumen in m³ ($1\\,\\text{L} = 10^{-3}\\,\\text{m}^3$), Temperatur in K ($T = \\vartheta + 273{,}15$). Nur so passen die Einheiten zu $R$.' })

  steps.push({ head: 'Allgemeine Gasgleichung', tex: `p \\cdot V = n \\cdot R \\cdot T, \\qquad R = 8{,}314${RU}`, note: '$R$ ist die allgemeine Gaskonstante. Wegen $1\\,\\text{J} = 1\\,\\text{N} \\cdot \\text{m} = 1\\,\\text{Pa} \\cdot \\text{m}^3$ passen Pa, m³, mol und K zusammen.' })
  const pt = () => `${ntr(p as Q, 6)}${T('Pa')}`
  const vt = () => `${ntr(V as Q)}${T('m³')}`
  const ntt = () => `${ntr(n as Q)}${T('mol')}`
  const tt = () => `${ntr(TK as Q, 6)}${K_}`
  const res: string[] = []
  const extra: string[] = []
  if (want === 'V') {
    V = div(mul(mul(n as Q, R), TK as Q), p as Q)
    steps.push({ head: 'Umstellen', tex: `V = \\frac{n \\cdot R \\cdot T}{p}`, note: 'Beide Seiten durch $p$ teilen.' })
    steps.push({ head: 'Einsetzen', tex: `V = \\frac{${ntt()} \\cdot 8{,}314${RU} \\cdot ${tt()}}{${pt()}} ${eqx(V)}${T('m³')}`, note: 'mol und K kürzen sich; $\\text{J}/\\text{Pa} = \\text{Pa} \\cdot \\text{m}^3/\\text{Pa} = \\text{m}^3$.' })
    const vU = div(mul(V, THOUSAND), fac(VOL_U, o.vu))
    const b = best(mul(V, THOUSAND), GAS_VOL_U)
    steps.push({ tex: `V ${eqx(V)}${T('m³')} ${eqx(vU)}${T(o.vu)}`, note: o.vu === 'm³' ? undefined : `Zurück in ${o.vu}: $1\\,\\text{m}^3 = 1000\\,\\text{L}$.`, final: true })
    res.push(`V ${eqx(vU)}${T(o.vu)}`)
    if (b.u !== o.vu) extra.push(`V ${eqx(b.v)}${T(b.u)}`)
  } else if (want === 'p') {
    p = div(mul(mul(n as Q, R), TK as Q), V as Q)
    steps.push({ head: 'Umstellen', tex: `p = \\frac{n \\cdot R \\cdot T}{V}`, note: 'Beide Seiten durch $V$ teilen.' })
    steps.push({ head: 'Einsetzen', tex: `p = \\frac{${ntt()} \\cdot 8{,}314${RU} \\cdot ${tt()}}{${vt()}} ${eqx(p)}${T('Pa')}`, note: 'mol und K kürzen sich; $\\text{J}/\\text{m}^3 = \\text{Pa} \\cdot \\text{m}^3/\\text{m}^3 = \\text{Pa}$.' })
    const pU = div(p, fac(PRESS_U, o.pu))
    steps.push({ tex: `p ${eqx(p)}${T('Pa')} ${eqx(pU)}${T(o.pu)}`, note: o.pu === 'Pa' ? undefined : `Zurück in ${o.pu}.`, final: true })
    res.push(`p ${eqx(pU)}${T(o.pu)}`)
    if (o.pu !== 'hPa') extra.push(`p ${eqx(div(p, q(100)))}${T('hPa')}`)
  } else if (want === 'n') {
    n = div(mul(p as Q, V as Q), mul(R, TK as Q))
    steps.push({ head: 'Umstellen', tex: `n = \\frac{p \\cdot V}{R \\cdot T}`, note: 'Beide Seiten durch $R \\cdot T$ teilen.' })
    steps.push({ head: 'Einsetzen', tex: `n = \\frac{${pt()} \\cdot ${vt()}}{8{,}314${RU} \\cdot ${tt()}} ${eqx(n)}${T('mol')}`, note: '$\\text{Pa} \\cdot \\text{m}^3 = \\text{J}$ – J und K kürzen sich, übrig bleibt mol.', final: !s })
    const nU = div(n, fac(MOL_U, o.nu))
    if (o.nu !== 'mol') steps.push({ tex: `n ${eqx(n)}${T('mol')} ${eqx(nU)}${T(o.nu)}`, final: !s })
    res.push(`n ${eqx(nU)}${T(o.nu)}`)
    if (s) {
      const m = mul(n, s.M)
      steps.push({ head: 'Masse', tex: `m = n \\cdot M = ${ntr(n)}${T('mol')} \\cdot ${m2(s.M)}${T('g/mol')} ${eqx(m)}${T('g')}`, note: 'Stoffmenge mal molare Masse.', final: true })
      res.push(`m ${bestEq(m, MASS_U)}`)
    }
  } else {
    TK = div(mul(p as Q, V as Q), mul(n as Q, R))
    steps.push({ head: 'Umstellen', tex: `T = \\frac{p \\cdot V}{n \\cdot R}`, note: 'Beide Seiten durch $n \\cdot R$ teilen.' })
    steps.push({ head: 'Einsetzen', tex: `T = \\frac{${pt()} \\cdot ${vt()}}{${ntt()} \\cdot 8{,}314${RU}} ${eqx(TK, 5)}${K_}`, note: '$\\text{Pa} \\cdot \\text{m}^3 = \\text{J}$ – J und mol kürzen sich, übrig bleibt K.', final: true })
    const th = sub(TK, T0)
    steps.push({ tex: `\\vartheta = T - 273{,}15 ${eqx(th, 4)}${T('°C')}`, note: 'In Grad Celsius.' })
    res.push(`T ${eqx(TK, 5)}${K_}`)
    extra.push(`\\vartheta ${eqx(th, 4)}${T('°C')}`)
  }
  // Zusatz: molares Volumen und Dichte bei diesen Bedingungen
  const Vm = mul(div(V as Q, n as Q), THOUSAND)
  extra.push(`V_m = \\frac{V}{n} ${eqx(Vm)}${LMOL}`)
  if (s && want !== 'n') {
    const m = mul(n as Q, s.M)
    if (!o.m) extra.push(`m ${bestEq(m, MASS_U)}`)
    extra.push(`\\rho = \\frac{m}{V} ${eqx(div(m, mul(V as Q, THOUSAND)))}${T('g/L')}`)
  } else if (s) extra.push(`\\rho = \\frac{m}{V} ${eqx(div(mul(n as Q, s.M), mul(V as Q, THOUSAND)))}${T('g/L')}`)
  return { result: res.join(',\\quad '), extra, steps, remark: 'Reale Gase weichen bei hohem Druck oder tiefer Temperatur etwas ab – für Laborbedingungen ist die Rechnung gut genug.' }
}

/* ---------------------------- molares Volumen ---------------------------- */

export type VmCond = 'norm' | '20' | '25' | 'frei'

const VM_TAB: Record<Exclude<VmCond, 'frei'>, { Vm: Q; tK: string; text: string }> = {
  norm: { Vm: qFromRaw('22.414'), tK: '273{,}15', text: 'Normbedingungen: 0 °C (273,15 K) und 1013,25 hPa' },
  '20': { Vm: qFromRaw('24.0'), tK: '293{,}15', text: '20 °C (293,15 K) und 1013,25 hPa' },
  '25': { Vm: qFromRaw('24.47'), tK: '298{,}15', text: '25 °C (298,15 K) und 1013,25 hPa' },
}

/** V ↔ n ↔ m über das molare Volumen (Tabellenwert oder V_m = R · T / p) */
export function molarVolume(o: {
  cond: VmCond
  p?: NumIn | null
  pu?: string
  T?: NumIn | null
  tu?: string
  given: 'V' | 'n' | 'm'
  value: NumIn | null
  unit: string
  formula?: string
  M?: NumIn | null
}): Solution {
  const steps: Step[] = []
  let Vm: Q // L/mol
  if (o.cond === 'frei') {
    const pu = o.pu ?? 'hPa'
    const tu = o.tu ?? '°C'
    const p0 = need(o.p, 'der Druck p')
    const k = kelvin('T', o.T, tu, 'Die Temperatur')
    const p = mul(p0, fac(PRESS_U, pu))
    steps.push({ head: 'Bedingungen', tex: `p = ${sh(p0)}${T(pu)},\\quad ${tGiven('T', (o.T as NumIn).q, tu)}`, note: 'Eigene Bedingungen: Das molare Volumen folgt aus der allgemeinen Gasgleichung.' })
    const conv: string[] = []
    if (pu !== 'Pa') conv.push(`p ${eqx(p, 6)}${T('Pa')}`)
    if (k.tex) conv.push(k.tex)
    if (conv.length) steps.push({ head: 'Einheiten umrechnen', tex: conv.join(',\\quad '), note: 'Druck in Pa, Temperatur in K.' })
    const VmSI = div(mul(R, k.K), p)
    Vm = mul(VmSI, THOUSAND)
    steps.push({
      head: 'Molares Volumen',
      tex: `V_m = \\frac{V}{n} = \\frac{R \\cdot T}{p} = \\frac{8{,}314${RU} \\cdot ${ntr(k.K, 6)}${K_}}{${ntr(p, 6)}${T('Pa')}} ${eqx(VmSI)}\\,\\frac{\\text{m}^3}{\\text{mol}} ${eqx(Vm)}${LMOL}`,
      note: 'Aus $p \\cdot V = n \\cdot R \\cdot T$ nach $V/n$ umgestellt; $1\\,\\text{m}^3 = 1000\\,\\text{L}$.',
    })
  } else {
    const c = VM_TAB[o.cond]
    Vm = c.Vm
    const calc = mul(div(mul(R, qFromRaw(c.tK.replace('{,}', '.'))), qFromRaw('101325')), THOUSAND)
    steps.push({
      head: 'Molares Volumen',
      tex: `V_m ${o.cond === 'norm' ? '=' : '\\approx'} ${ntr(Vm, 5)}${LMOL}`,
      note: `${c.text}: Ein Mol jedes (idealen) Gases nimmt dasselbe Volumen ein (Satz von Avogadro). Nachgerechnet: $V_m = \\frac{R \\cdot T}{p} = \\frac{8{,}314 \\cdot ${c.tK}}{101\\,325}\\,\\frac{\\text{m}^3}{\\text{mol}} ${eqx(calc)}${LMOL}$.`,
    })
  }
  const s = substance(o.formula, o.M, o.given === 'm')
  if (s?.step) steps.push(s.step)
  else if (s) steps.push({ head: 'Molare Masse', tex: `M = ${m2(s.M)}${T('g/mol')}`, note: 'Molare Masse wie angegeben.' })
  const x = need(o.value, o.given === 'V' ? 'das Volumen V' : o.given === 'n' ? 'die Stoffmenge n' : 'die Masse m')
  const list = o.given === 'V' ? VOL_U : o.given === 'n' ? MOL_U : MASS_U
  const base = o.given === 'V' ? 'L' : o.given === 'n' ? 'mol' : 'g'
  const xb = mul(x, fac(list, o.unit))
  if (o.unit !== base) steps.push({ head: 'Einheiten umrechnen', tex: `${o.given} = ${sh(x)}${T(o.unit)} ${eqx(xb)}${T(base)}`, note: 'Volumen in Liter, Stoffmenge in mol, Masse in Gramm.' })
  let n: Q
  let V: Q
  const res: string[] = []
  if (o.given === 'V') {
    V = xb
    n = div(V, Vm)
    steps.push({ head: 'Stoffmenge', tex: `n = \\frac{V}{V_m} = \\frac{${ntr(V)}${T('L')}}{${ntr(Vm, 5)}${LMOL}} ${eqx(n)}${T('mol')}`, note: 'Liter kürzt sich weg.', final: !s })
    res.push(`n ${bestEq(n, MOL_U)}`)
  } else if (o.given === 'n') {
    n = xb
    V = mul(n, Vm)
    steps.push({ head: 'Volumen', tex: `V = n \\cdot V_m = ${ntr(n)}${T('mol')} \\cdot ${ntr(Vm, 5)}${LMOL} ${eqx(V)}${T('L')}`, note: 'mol kürzt sich weg.', final: true })
    res.push(`V ${bestEq(V, GAS_VOL_U)}`)
  } else {
    const ss = s as NonNullable<typeof s>
    n = div(xb, ss.M)
    steps.push({ head: 'Stoffmenge', tex: `n = \\frac{m}{M} = \\frac{${ntr(xb)}${T('g')}}{${m2(ss.M)}${T('g/mol')}} ${eqx(n)}${T('mol')}`, note: 'Gramm kürzt sich weg.' })
    V = mul(n, Vm)
    steps.push({ head: 'Volumen', tex: `V = n \\cdot V_m = ${ntr(n)}${T('mol')} \\cdot ${ntr(Vm, 5)}${LMOL} ${eqx(V)}${T('L')}`, note: 'mol kürzt sich weg.', final: true })
    res.push(`V ${bestEq(V, GAS_VOL_U)}`, `n ${bestEq(n, MOL_U)}`)
  }
  const extra: string[] = []
  if (s && o.given !== 'm') {
    const m = mul(n, s.M)
    steps.push({ head: 'Masse', tex: `m = n \\cdot M = ${ntr(n)}${T('mol')} \\cdot ${m2(s.M)}${T('g/mol')} ${eqx(m)}${T('g')}`, note: 'Stoffmenge mal molare Masse.', final: true })
    res.push(`m ${bestEq(m, MASS_U)}`)
  }
  if (s) {
    const rho = div(s.M, Vm)
    steps.push({ head: 'Dichte des Gases', tex: `\\rho = \\frac{M}{V_m} = \\frac{${m2(s.M)}${T('g/mol')}}{${ntr(Vm, 5)}${LMOL}} ${eqx(rho)}${T('g/L')}`, note: 'Ein Mol wiegt $M$ und nimmt $V_m$ ein. Luft hat etwa 1,2 g/L (20 °C) – schwerere Gase sammeln sich am Boden.' })
    extra.push(`\\rho ${eqx(rho)}${T('g/L')}`)
  }
  const N = mul(n, NA)
  extra.push(`N = n \\cdot N_A \\approx ${approxTex(toNum(N), 4)}\\ \\text{Teilchen}`)
  extra.push(`V_m ${o.cond === 'norm' ? '=' : '\\approx'} ${ntr(Vm, 5)}${LMOL}`)
  return { result: res.join(',\\quad '), extra, steps }
}

/* ---------------------------- Zustandsänderung ---------------------------- */

type ZK = 'p' | 'V' | 'T'

/**
 * p₁ · V₁ / T₁ = p₂ · V₂ / T₂ – genau ein Wert fehlt. Bleibt eine Größe gleich, dürfen ihre beiden Felder leer
 * bleiben (oder gleich sein); dann gilt das passende Einzelgesetz.
 */
export function gasChange(o: {
  p1: NumIn | null
  p2: NumIn | null
  pu: string
  V1: NumIn | null
  V2: NumIn | null
  vu: string
  T1: NumIn | null
  T2: NumIn | null
  tu: string
}): Solution {
  const pairs: Record<ZK, [NumIn | null, NumIn | null]> = { p: [o.p1, o.p2], V: [o.V1, o.V2], T: [o.T1, o.T2] }
  const blank = (['p', 'V', 'T'] as ZK[]).filter((k) => !pairs[k][0] && !pairs[k][1])
  if (blank.length > 1) throw new CalcError('Höchstens eine Größe darf gleich bleiben (beide Felder leer) – sonst fehlen Werte.')
  const empties: { k: ZK; i: 1 | 2 }[] = []
  for (const k of ['p', 'V', 'T'] as ZK[]) {
    if (blank.includes(k)) continue
    pairs[k].forEach((v, i) => {
      if (!v) empties.push({ k, i: (i + 1) as 1 | 2 })
    })
  }
  if (empties.length !== 1) throw new CalcError('Bitte alle Werte bis auf einen eintragen – der fehlende wird berechnet. Bleibt eine Größe gleich, ihre beiden Felder leer lassen.')
  const want = empties[0]
  const unitTex: Record<ZK, string> = { p: T(o.pu), V: T(o.vu), T: K_ }
  const val: Record<string, Q> = {}
  const steps: Step[] = []
  const conv: string[] = []
  for (const k of ['p', 'V'] as ZK[])
    pairs[k].forEach((v, i) => {
      if (v) val[`${k}${i + 1}`] = need(v, `${k === 'p' ? 'der Druck' : 'das Volumen'} ${k}${i === 0 ? '₁' : '₂'}`)
    })
  pairs.T.forEach((v, i) => {
    if (!v) return
    const k = kelvin(`T_${i + 1}`, v, o.tu, `Die Temperatur T${i === 0 ? '₁' : '₂'}`)
    val[`T${i + 1}`] = k.K
    if (k.tex) conv.push(k.tex)
  })
  let constK: ZK | null = blank[0] ?? null
  if (!constK)
    for (const k of ['T', 'p', 'V'] as ZK[]) {
      const a = val[`${k}1`]
      const b = val[`${k}2`]
      if (a && b && cmp(a, b) === 0) {
        constK = k
        break
      }
    }

  const showGiven = (k: ZK, i: 1 | 2) => {
    const v = pairs[k][i - 1]
    if (!v) return k === constK && blank.length ? null : `${k}_${i} = ?`
    return k === 'T' ? tGiven(`T_${i}`, v.q, o.tu) : `${k}_${i} = ${sh(v.q)}${unitTex[k]}`
  }
  const row = (i: 1 | 2) => (['p', 'V', 'T'] as ZK[]).map((k) => showGiven(k, i)).filter(Boolean).join(',\\ ')
  const constName: Record<ZK, string> = { p: 'Druck', V: 'Volumen', T: 'Temperatur' }
  steps.push({
    head: 'Gegeben',
    tex: `\\text{Zustand 1: } ${row(1)};\\quad \\text{Zustand 2: } ${row(2)}`,
    note: constK && blank.length ? `Die ${constName[constK]} bleibt gleich.` : 'Ein Gas wird von Zustand 1 in Zustand 2 gebracht – die Stoffmenge bleibt gleich.',
  })
  if (conv.length)
    steps.push({
      head: 'Temperatur in Kelvin',
      tex: conv.join(',\\quad '),
      note: 'Gasgesetze gelten nur mit der absoluten Temperatur: Mit Grad Celsius hätte ein Gas bei 0 °C kein Volumen, und von 10 °C auf 20 °C verdoppelt sich das Volumen nicht.',
    })

  const LAW: Record<ZK | 'none', { head: string; tex: string; note: string }> = {
    none: { head: 'Allgemeine Gasgleichung', tex: '\\frac{p_1 \\cdot V_1}{T_1} = \\frac{p_2 \\cdot V_2}{T_2}', note: 'Für eine feste Gasmenge ist $\\frac{p \\cdot V}{T}$ konstant (kombiniertes Gasgesetz).' },
    T: { head: 'Gesetz von Boyle-Mariotte', tex: 'p_1 \\cdot V_1 = p_2 \\cdot V_2', note: 'Die Temperatur bleibt gleich (isotherm): $T$ kürzt sich aus $\\frac{p_1 V_1}{T_1} = \\frac{p_2 V_2}{T_2}$ heraus. Doppelter Druck – halbes Volumen.' },
    p: { head: 'Gesetz von Gay-Lussac', tex: '\\frac{V_1}{T_1} = \\frac{V_2}{T_2}', note: 'Der Druck bleibt gleich (isobar): Das Volumen wächst proportional zur absoluten Temperatur.' },
    V: { head: 'Gesetz von Amontons', tex: '\\frac{p_1}{T_1} = \\frac{p_2}{T_2}', note: 'Das Volumen bleibt gleich (isochor): Der Druck wächst proportional zur absoluten Temperatur.' },
  }
  const law = LAW[constK ?? 'none']
  steps.push({ head: law.head, tex: law.tex, note: law.note })

  // umstellen: Zähler (p, V) und Nenner (T) je Seite, ohne die konstante Größe
  const num = (i: 1 | 2) => (['p', 'V'] as ZK[]).filter((k) => k !== constK).map((k) => `${k}${i}`)
  const den = (i: 1 | 2) => (constK === 'T' ? [] : [`T${i}`])
  const j = (3 - want.i) as 1 | 2
  const key = `${want.k}${want.i}`
  let top: string[]
  let bot: string[]
  if (want.k === 'T') {
    top = [...num(want.i), ...den(j)]
    bot = num(j)
  } else {
    top = [...num(j), ...den(want.i)]
    bot = [...den(j), ...num(want.i).filter((x) => x !== key)]
  }
  const symT = (x: string) => `${x[0]}_${x[1]}`
  const valT = (x: string) => `${x[0] === 'T' ? ntr(val[x], 6) : sh(val[x])}${unitTex[x[0] as ZK]}`
  const prodQ = (xs: string[]) => xs.reduce((a, x) => mul(a, val[x]), q(1))
  const result = div(prodQ(top), prodQ(bot))
  const frac = (f: (x: string) => string) => (bot.length ? `\\frac{${top.map(f).join(' \\cdot ')}}{${bot.map(f).join(' \\cdot ')}}` : top.map(f).join(' \\cdot '))
  steps.push({ head: 'Umstellen', tex: `${symT(key)} = ${frac(symT)}`, note: `Nach $${symT(key)}$ aufgelöst.` })
  const sig = want.k === 'T' ? 5 : 4
  steps.push({
    head: 'Einsetzen',
    tex: `${symT(key)} = ${frac(valT)} ${eqx(result, sig)}${unitTex[want.k]}`,
    note: want.k === 'T' ? 'Druck- und Volumeneinheiten kürzen sich, übrig bleibt Kelvin.' : 'Druck und Volumen dürfen in beliebigen Einheiten stehen – sie müssen nur in beiden Zuständen gleich sein und kürzen sich dann.',
    final: true,
  })
  val[key] = result
  const extra: string[] = []
  if (want.k === 'T') {
    const th = sub(result, T0)
    steps.push({ tex: `\\vartheta_${want.i} = T_${want.i} - 273{,}15 ${eqx(th, 4)}${T('°C')}`, note: 'Zurück in Grad Celsius.' })
    extra.push(`\\vartheta_${want.i} ${eqx(th, 4)}${T('°C')}`)
  }
  // Probe mit der allgemeinen Gasgleichung (alle sechs Werte bekannt, falls nichts leer ist)
  if (!blank.length) {
    const side = (i: 1 | 2) => div(mul(val[`p${i}`], val[`V${i}`]), val[`T${i}`])
    const l = side(1)
    const r = side(2)
    steps.push({ head: 'Probe', tex: `\\frac{p_1 V_1}{T_1} ${eqx(l)} \\qquad \\frac{p_2 V_2}{T_2} ${eqx(r)}\\ \\checkmark`, note: 'Beide Seiten ergeben denselben Wert (Einheit: Druckeinheit · Volumeneinheit / K).' })
  }
  const remark = constK ? `Sonderfall: ${law.head} (${constK === 'T' ? 'isotherm' : constK === 'p' ? 'isobar' : 'isochor'}).` : undefined
  return { result: `${symT(key)} ${eqx(result, sig)}${unitTex[want.k]}`, extra, steps, remark }
}
