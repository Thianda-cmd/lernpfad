/**
 * Maßanalyse (Titration): Konzentration, Masse und Gehalt einer Probe aus dem Verbrauch an Maßlösung,
 * Titer einer Maßlösung mit einer Urtitersubstanz und der zu erwartende Verbrauch.
 * Stöchiometrie über das Stoffmengenverhältnis aus der Reaktionsgleichung. Exakt mit Brüchen.
 */
import { add, CalcError, cmp, div, mul, q, sign, toNum, type Q } from '../q'
import { best, CONC_U, fac, fnt, MASS_U, MCONC_U, MOL_U, T, VOL_U } from './units'
import { parseNum, type NumIn } from './numinput'
import { bestEq, eqx, labVol, need, ntr, opt, sh, substance } from './concentration'
import { sd } from './regress'
import { m2 } from './stoich'
import type { Solution, Step } from './step'

/* ---------------------------- Vorlagen ---------------------------- */

export interface TitrationPreset {
  id: string
  label: string
  /** Reaktionsgleichung (TeX) */
  eq: string
  /** gesuchter Stoff in der Probe (TeX) */
  P: string
  /** Maßlösung (TeX) */
  M: string
  nuP: number
  nuM: number
  /** Summenformel des gesuchten Stoffs (für Masse und Gehalt) */
  formula: string
  /** Konzentration der Maßlösung in mol/L */
  cM: string
  /** Ableseergebnisse in mL */
  readings: string
  /** vorgelegtes Probevolumen in mL */
  VP: string
  /** optional: Messkolben (mL) und Einwaage (g) */
  VK?: string
  mE?: string
  hint?: string
}

export const TITRATIONS: TitrationPreset[] = [
  {
    id: 'hcl-naoh',
    label: 'Salzsäure · NaOH',
    eq: '\\mathrm{HCl + NaOH \\longrightarrow NaCl + H_2O}',
    P: '\\mathrm{HCl}',
    M: '\\mathrm{NaOH}',
    nuP: 1,
    nuM: 1,
    formula: 'HCl',
    cM: '0,1',
    readings: '18,45; 18,50; 18,40',
    VP: '20',
    hint: 'Indikator z. B. Phenolphthalein (farblos → rosa).',
  },
  {
    id: 'h2so4-naoh',
    label: 'Schwefelsäure · NaOH',
    eq: '\\mathrm{H_2SO_4 + 2\\,NaOH \\longrightarrow Na_2SO_4 + 2\\,H_2O}',
    P: '\\mathrm{H_2SO_4}',
    M: '\\mathrm{NaOH}',
    nuP: 1,
    nuM: 2,
    formula: 'H2SO4',
    cM: '0,1',
    readings: '21,30; 21,25; 21,35',
    VP: '10',
  },
  {
    id: 'naoh-hcl',
    label: 'Natronlauge · HCl',
    eq: '\\mathrm{NaOH + HCl \\longrightarrow NaCl + H_2O}',
    P: '\\mathrm{NaOH}',
    M: '\\mathrm{HCl}',
    nuP: 1,
    nuM: 1,
    formula: 'NaOH',
    cM: '0,1',
    readings: '12,35; 12,40',
    VP: '25',
  },
  {
    id: 'essig-naoh',
    label: 'Speiseessig · NaOH',
    eq: '\\mathrm{CH_3COOH + NaOH \\longrightarrow CH_3COONa + H_2O}',
    P: '\\mathrm{CH_3COOH}',
    M: '\\mathrm{NaOH}',
    nuP: 1,
    nuM: 1,
    formula: 'CH3COOH',
    cM: '0,1',
    readings: '16,60; 16,65; 16,55',
    VP: '20',
    VK: '100',
    mE: '10',
    hint: '10 g Speiseessig im 100-mL-Messkolben aufgefüllt, davon 20 mL titriert (Phenolphthalein).',
  },
  {
    id: 'soda-hcl',
    label: 'Soda · HCl',
    eq: '\\mathrm{Na_2CO_3 + 2\\,HCl \\longrightarrow 2\\,NaCl + H_2O + CO_2}',
    P: '\\mathrm{Na_2CO_3}',
    M: '\\mathrm{HCl}',
    nuP: 1,
    nuM: 2,
    formula: 'Na2CO3',
    cM: '0,1',
    readings: '17,90; 17,85',
    VP: '25',
    VK: '250',
    mE: '1',
    hint: '1 g technische Soda im 250-mL-Messkolben gelöst, davon 25 mL titriert (Methylorange).',
  },
  {
    id: 'fe-kmno4',
    label: 'Eisen(II) · KMnO₄',
    eq: '\\mathrm{5\\,Fe^{2+} + MnO_4^- + 8\\,H^+ \\longrightarrow 5\\,Fe^{3+} + Mn^{2+} + 4\\,H_2O}',
    P: '\\mathrm{Fe^{2+}}',
    M: '\\mathrm{MnO_4^-}',
    nuP: 5,
    nuM: 1,
    formula: 'Fe',
    cM: '0,02',
    readings: '17,85; 17,90',
    VP: '20',
    hint: 'Manganometrie in schwefelsaurer Lösung – die Maßlösung ist ihr eigener Indikator (bleibende Rosafärbung).',
  },
  {
    id: 'cl-ag',
    label: 'Chlorid · AgNO₃',
    eq: '\\mathrm{Cl^- + Ag^+ \\longrightarrow AgCl \\downarrow}',
    P: '\\mathrm{Cl^-}',
    M: '\\mathrm{Ag^+}',
    nuP: 1,
    nuM: 1,
    formula: 'Cl',
    cM: '0,1',
    readings: '17,10; 17,15',
    VP: '10',
    hint: 'Argentometrie nach Mohr (Indikator Kaliumchromat).',
  },
  {
    id: 'ca-edta',
    label: 'Calcium · EDTA',
    eq: '\\mathrm{Ca^{2+} + H_2Y^{2-} \\longrightarrow CaY^{2-} + 2\\,H^+}',
    P: '\\mathrm{Ca^{2+}}',
    M: '\\mathrm{EDTA}',
    nuP: 1,
    nuM: 1,
    formula: 'Ca',
    cM: '0,01',
    readings: '12,40; 12,35; 12,45',
    VP: '100',
    hint: 'Komplexometrie (Wasserhärte): EDTA bindet jedes Metallion im Verhältnis 1 : 1.',
  },
]

export interface PrimaryPreset {
  id: string
  label: string
  name: string
  /** Urtitersubstanz als TeX */
  tex: string
  /** molare Masse in g/mol (Literaturwert) */
  M: string
  /** Maßlösung als TeX */
  titrant: string
  nuU: number
  nuM: number
  eq: string
  cSoll: string
  m: string
  V: string
}

/** Urtitersubstanzen zur Titerbestimmung */
export const PRIMARY: PrimaryPreset[] = [
  {
    id: 'khp-naoh',
    label: 'Kaliumhydrogenphthalat · NaOH',
    name: 'Kaliumhydrogenphthalat',
    tex: '\\mathrm{KHC_8H_4O_4}',
    M: '204,22',
    titrant: '\\mathrm{NaOH}',
    nuU: 1,
    nuM: 1,
    eq: '\\mathrm{KHC_8H_4O_4 + NaOH \\longrightarrow KNaC_8H_4O_4 + H_2O}',
    cSoll: '0,1',
    m: '0,4085',
    V: '20,10',
  },
  {
    id: 'soda-hcl',
    label: 'Natriumcarbonat · HCl',
    name: 'Natriumcarbonat',
    tex: '\\mathrm{Na_2CO_3}',
    M: '105,99',
    titrant: '\\mathrm{HCl}',
    nuU: 1,
    nuM: 2,
    eq: '\\mathrm{Na_2CO_3 + 2\\,HCl \\longrightarrow 2\\,NaCl + H_2O + CO_2}',
    cSoll: '0,1',
    m: '0,1060',
    V: '19,85',
  },
  {
    id: 'oxal-kmno4',
    label: 'Oxalsäure · KMnO₄',
    name: 'Oxalsäure-Dihydrat',
    tex: '\\mathrm{H_2C_2O_4 \\cdot 2\\,H_2O}',
    M: '126,07',
    titrant: '\\mathrm{KMnO_4}',
    nuU: 5,
    nuM: 2,
    eq: '\\mathrm{5\\,H_2C_2O_4 + 2\\,MnO_4^- + 6\\,H^+ \\longrightarrow 10\\,CO_2 + 2\\,Mn^{2+} + 8\\,H_2O}',
    cSoll: '0,02',
    m: '0,1261',
    V: '20,05',
  },
  {
    id: 'oxal-naoh',
    label: 'Oxalsäure · NaOH',
    name: 'Oxalsäure-Dihydrat',
    tex: '\\mathrm{H_2C_2O_4 \\cdot 2\\,H_2O}',
    M: '126,07',
    titrant: '\\mathrm{NaOH}',
    nuU: 1,
    nuM: 2,
    eq: '\\mathrm{H_2C_2O_4 + 2\\,NaOH \\longrightarrow Na_2C_2O_4 + 2\\,H_2O}',
    cSoll: '0,1',
    m: '0,1261',
    V: '19,90',
  },
  {
    id: 'nacl-agno3',
    label: 'Natriumchlorid · AgNO₃',
    name: 'Natriumchlorid',
    tex: '\\mathrm{NaCl}',
    M: '58,44',
    titrant: '\\mathrm{AgNO_3}',
    nuU: 1,
    nuM: 1,
    eq: '\\mathrm{NaCl + AgNO_3 \\longrightarrow AgCl \\downarrow + NaNO_3}',
    cSoll: '0,1',
    m: '0,1169',
    V: '20,05',
  },
]

/* ---------------------------- Bausteine ---------------------------- */

/** Ableseergebnisse exakt einlesen: „18,45; 18,50 18,40“ (Semikolon, Leerzeichen oder Zeilenumbruch) */
export function parseReadings(s: string, what = 'Verbrauch'): Q[] {
  const toks = s
    .split(/[;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  return toks.map((t, i) => {
    const v = parseNum(t, `${what} (Wert ${i + 1})`)
    if (!v || sign(v.q) <= 0) throw new CalcError(`${what} (Wert ${i + 1}) muss größer als 0 sein.`)
    return v.q
  })
}

/** Stoffmengenverhältnis ν_P : ν_M prüfen */
function ratio(nuP: NumIn | null, nuM: NumIn | null): { p: Q; m: Q } {
  const p = need(nuP, 'die Zahl ν der Probe im Stoffmengenverhältnis')
  const m = need(nuM, 'die Zahl ν der Maßlösung im Stoffmengenverhältnis')
  return { p, m }
}

function reactionSteps(eq: string | undefined, P: string, M: string, nuP: Q, nuM: Q, what = 'Probe'): Step[] {
  const out: Step[] = []
  if (eq) out.push({ head: 'Reaktion', tex: eq, note: 'Die Koeffizienten der Reaktionsgleichung geben das Stoffmengenverhältnis an.' })
  out.push({
    head: eq ? undefined : 'Stoffmengenverhältnis',
    tex: `n(${P}) : n(${M}) = ${ntr(nuP)} : ${ntr(nuM)}`,
    note: eq ? undefined : `Aus der Reaktionsgleichung: ${what} und Maßlösung reagieren im Verhältnis $${ntr(nuP)} : ${ntr(nuM)}$.`,
  })
  return out
}

/** n in passender Einheit für die Anzeige */
const nBest = (n: Q) => bestEq(n, MOL_U)
/** „≈ 0,001845 mol = 1,845 mmol“ – zweite Angabe nur, wenn eine kleinere Einheit besser passt */
const nBoth = (n: Q) => `${eqx(n)}${T('mol')}${best(n, MOL_U).u !== 'mol' ? ` ${nBest(n)}` : ''}`

export interface TitrationSolution extends Solution {
  /** Ableseergebnisse in der eingegebenen Einheit (für die Tabelle) */
  readings?: number[]
  mean?: number
  unit?: string
}

/* ---------------------------- Konzentration der Probe ---------------------------- */

/**
 * n_M = c_M · t · V_M, n_P = n_M · ν_P / ν_M, c_P = n_P / V_P;
 * optional Masse/Massenkonzentration (mit M), Aliquot (Messkolben) und Gehalt (Einwaage).
 */
export function titrationConc(o: {
  cM: NumIn | null
  cmu: string
  t?: NumIn | null
  readings: string
  vmu: string
  VP?: NumIn | null
  vpu: string
  nuP: NumIn | null
  nuM: NumIn | null
  formula?: string
  Mp?: NumIn | null
  VK?: NumIn | null
  vku?: string
  mE?: NumIn | null
  meu?: string
  eq?: string
  P?: string
  M?: string
}): TitrationSolution {
  const P = o.P ?? '\\text{Probe}'
  const Mt = o.M ?? '\\text{Maßlösung}'
  const cM = need(o.cM, 'die Konzentration der Maßlösung')
  const t = opt(o.t, 'der Titer t') ?? q(1)
  const { p: nuP, m: nuM } = ratio(o.nuP, o.nuM)
  const vals = parseReadings(o.readings)
  if (!vals.length) throw new CalcError('Bitte mindestens einen Verbrauch (Ableseergebnis der Bürette) eingeben.')
  const VP = opt(o.VP, 'das Probevolumen')
  const VK = opt(o.VK, 'das Volumen des Messkolbens')
  const mE = opt(o.mE, 'die Einwaage')
  const s = substance(o.formula, o.Mp, false, P)
  if (VK && !VP) throw new CalcError('Für das Aliquot brauche ich auch das titrierte Probevolumen V_P.')
  if (VK && VP && cmp(mul(VK, fac(VOL_U, o.vku ?? 'mL')), mul(VP, fac(VOL_U, o.vpu))) < 0) throw new CalcError('Der Messkolben muss mindestens so groß sein wie das entnommene Probevolumen.')
  if (mE && !s) throw new CalcError('Für den Gehalt brauche ich die Summenformel oder molare Masse des gesuchten Stoffs.')
  const steps: Step[] = []
  steps.push(...reactionSteps(o.eq, P, Mt, nuP, nuM))

  // Verbrauch
  const sumV = vals.reduce((a, b) => add(a, b), q(0))
  const mean = div(sumV, q(vals.length))
  const vmu = T(o.vmu)
  const nums = vals.map((v) => toNum(v))
  if (vals.length > 1) {
    const spread = Math.max(...nums) - Math.min(...nums)
    const spreadML = (spread * toNum(fac(VOL_U, o.vmu))) / 0.001
    const s3 = vals.length > 2 ? `, Standardabweichung $s \\approx ${fnt(sd(nums), 2)}${vmu}$` : ''
    steps.push({
      head: 'Mittlerer Verbrauch',
      tex: `\\bar{V}_M = \\frac{${vals.map((v) => sh(v)).join(' + ')}}{${vals.length}}${vmu} ${eqx(mean)}${vmu}`,
      note: `Mittelwert der Parallelbestimmungen. Spannweite $${fnt(spread, 3)}${vmu}$${s3}.${spreadML > 0.1 + 1e-9 ? ' Die Werte weichen um mehr als 0,1 mL voneinander ab – lieber noch einmal titrieren.' : ''}`,
    })
  } else steps.push({ head: 'Verbrauch', tex: `V_M = ${sh(mean)}${vmu}`, note: 'Ablesung an der Bürette (Endstand minus Anfangsstand). Besser sind zwei bis drei Parallelbestimmungen.' })

  // Einheiten
  const VM = mul(mean, fac(VOL_U, o.vmu))
  const cML = mul(cM, fac(CONC_U, o.cmu))
  const conv: string[] = []
  if (o.vmu !== 'L') conv.push(`V_M = ${ntr(mean)}${vmu} ${eqx(VM)}${T('L')}`)
  if (o.cmu !== 'mol/L') conv.push(`c_M = ${sh(cM)}${T(o.cmu)} ${eqx(cML)}${T('mol/L')}`)
  const VPL = VP ? mul(VP, fac(VOL_U, o.vpu)) : null
  if (VP && o.vpu !== 'L') conv.push(`V_P = ${sh(VP)}${T(o.vpu)} ${eqx(VPL as Q)}${T('L')}`)
  if (conv.length) steps.push({ head: 'Einheiten umrechnen', tex: conv.join(',\\quad '), note: 'Volumen in Liter, damit sich die Einheiten mit mol/L kürzen.' })

  // Stoffmengen
  const nM = mul(mul(cML, t), VM)
  const tShow = cmp(t, q(1)) !== 0
  steps.push({
    head: 'Stoffmenge der Maßlösung',
    tex: `n(${Mt}) = c_M \\cdot ${tShow ? 't \\cdot ' : ''}V_M = ${ntr(cML)}${T('mol/L')} \\cdot ${tShow ? `${sh(t)} \\cdot ` : ''}${ntr(VM)}${T('L')} ${nBoth(nM)}`,
    note: tShow ? 'Der Titer $t$ korrigiert auf die tatsächliche Konzentration der Maßlösung: $c_{\\text{ist}} = t \\cdot c_{\\text{soll}}$.' : 'Liter kürzt sich weg, übrig bleibt mol.',
  })
  const nP = div(mul(nM, nuP), nuM)
  const same = cmp(nuP, nuM) === 0
  steps.push({
    head: 'Stoffmenge in der Probe',
    tex: `n(${P}) = n(${Mt}) \\cdot \\frac{${ntr(nuP)}}{${ntr(nuM)}} = ${ntr(nM)}${T('mol')} \\cdot \\frac{${ntr(nuP)}}{${ntr(nuM)}} ${nBoth(nP)}`,
    note: same ? 'Verhältnis 1 : 1 – gleich viele Teilchen.' : `Laut Gleichung reagieren $${ntr(nuP)}$ Teilchen Probe mit $${ntr(nuM)}$ Teilchen Maßlösung.`,
    final: !VP,
  })
  const res: string[] = []
  const extra: string[] = []
  let cP: Q | null = null
  if (VP && VPL) {
    cP = div(nP, VPL)
    steps.push({
      head: 'Konzentration der Probe',
      tex: `c(${P}) = \\frac{n(${P})}{V_P} = \\frac{${ntr(nP)}${T('mol')}}{${ntr(VPL)}${T('L')}} ${eqx(cP)}${T('mol/L')}`,
      note: 'Stoffmenge geteilt durch das vorgelegte Probevolumen.',
      final: true,
    })
    steps.push({
      head: 'In einer Formel',
      tex: `c(${P}) = \\frac{c_M \\cdot ${tShow ? 't \\cdot ' : ''}V_M \\cdot \\nu_P}{\\nu_M \\cdot V_P}`,
      note: 'Dieselbe Rechnung zusammengefasst – praktisch für weitere Proben.',
    })
    res.push(`c(${P}) ${bestEq(cP, CONC_U)}`)
  } else res.push(`n(${P}) ${nBest(nP)}`)

  if (s) {
    if (s.step) steps.push(s.step)
    const m = mul(nP, s.M)
    steps.push({
      head: 'Masse in der Vorlage',
      tex: `m(${P}) = n \\cdot M = ${ntr(nP)}${T('mol')} \\cdot ${m2(s.M)}${T('g/mol')} ${eqx(m)}${T('g')}${best(m, MASS_U).u !== 'g' ? ` ${bestEq(m, MASS_U)}` : ''}`,
      note: VP ? 'So viel des gesuchten Stoffs war im titrierten Volumen.' : 'So viel des gesuchten Stoffs wurde titriert.',
      final: !VP && !mE,
    })
    if (cP) {
      const beta = mul(cP, s.M)
      steps.push({ tex: `\\beta(${P}) = c \\cdot M = ${ntr(cP)}${T('mol/L')} \\cdot ${m2(s.M)}${T('g/mol')} ${eqx(beta)}${T('g/L')}`, note: 'Massenkonzentration der Probe.' })
      extra.push(`\\beta(${P}) ${bestEq(beta, MCONC_U)}`)
    }
    extra.push(`m(${P}) ${bestEq(m, MASS_U)}\\ \\text{(titriert)}`)
    let mTot = m
    if (VK && VP && VPL) {
      const VKL = mul(VK, fac(VOL_U, o.vku ?? 'mL'))
      const f = div(VKL, VPL)
      mTot = mul(m, f)
      steps.push({
        head: 'Ganze Probe (Aliquot)',
        tex: `m_{\\text{ges}} = m \\cdot \\frac{V_{\\text{Kolben}}}{V_P} = ${ntr(m)}${T('g')} \\cdot \\frac{${ntr(VKL)}}{${ntr(VPL)}} ${eqx(mTot)}${T('g')}`,
        note: `Titriert wurde nur ein Teil (Aliquot) der Lösung im Messkolben – hochrechnen mit dem Faktor $${ntr(f)}$.`,
        final: !mE,
      })
      extra.push(`m_{\\text{ges}} ${bestEq(mTot, MASS_U)}`)
    }
    if (mE) {
      const mEg = mul(mE, fac(MASS_U, o.meu ?? 'g'))
      const w = mul(div(mTot, mEg), q(100))
      if (cmp(w, q(100)) > 0) throw new CalcError(`Der berechnete Gehalt liegt über 100 % – prüfe Einwaage, Volumina und Stoffmengenverhältnis.`)
      steps.push({
        head: 'Gehalt',
        tex: `w = \\frac{m_{\\text{${VK ? 'ges' : 'Stoff'}}}}{m_{\\text{Einwaage}}} \\cdot 100\\,\\% = \\frac{${ntr(mTot)}${T('g')}}{${ntr(mEg)}${T('g')}} \\cdot 100\\,\\% ${eqx(w)}\\,\\%`,
        note: 'Massenanteil des gesuchten Stoffs in der eingewogenen Probe.',
        final: true,
      })
      res.push(`w ${eqx(w)}\\,\\%`)
    }
  }
  extra.push(`\\bar{V}_M ${eqx(mean)}${vmu}`)
  if (VP) extra.push(`n(${P}) ${nBest(nP)}`)
  return {
    result: res.join(',\\quad '),
    extra,
    steps,
    remark: tShow ? undefined : 'Mit Titer $t = 1$ gerechnet – ist der Titer der Maßlösung bekannt, ihn eintragen.',
    readings: nums,
    mean: toNum(mean),
    unit: o.vmu,
  }
}

/* ---------------------------- Titer ---------------------------- */

/** Titer aus einer Urtitersubstanz: n_U = m / M, n_M = n_U · ν_M / ν_U, c_ist = n_M / V, t = c_ist / c_soll */
export function titer(o: {
  m: NumIn | null
  mu: string
  formula?: string
  M?: NumIn | null
  label?: string
  V: NumIn | null
  vu: string
  cSoll: NumIn | null
  cu: string
  nuU: NumIn | null
  nuM: NumIn | null
  titrant?: string
  eq?: string
}): Solution {
  const U = o.formula?.trim() ? undefined : (o.label ?? '\\text{Urtiter}')
  const s = substance(o.formula, o.M, true, U)
  const Mt = o.titrant ?? '\\text{Maßlösung}'
  const m = need(o.m, 'die Einwaage der Urtitersubstanz')
  const V = need(o.V, 'der Verbrauch an Maßlösung')
  const cS = need(o.cSoll, 'die Sollkonzentration der Maßlösung')
  const nuU = need(o.nuU, 'die Zahl ν der Urtitersubstanz im Stoffmengenverhältnis')
  const nuM = need(o.nuM, 'die Zahl ν der Maßlösung im Stoffmengenverhältnis')
  const X = s.tex
  const steps: Step[] = []
  steps.push(...reactionSteps(o.eq, X, Mt, nuU, nuM, 'Urtitersubstanz'))
  if (s.step) steps.push(s.step)
  else steps.push({ head: 'Molare Masse', tex: `M(${X}) = ${m2(s.M)}${T('g/mol')}`, note: 'Urtitersubstanzen sind sehr rein, beständig und genau wägbar.' })
  const mg = mul(m, fac(MASS_U, o.mu))
  const VL = mul(V, fac(VOL_U, o.vu))
  const cSL = mul(cS, fac(CONC_U, o.cu))
  const conv: string[] = []
  if (o.mu !== 'g') conv.push(`m = ${sh(m)}${T(o.mu)} ${eqx(mg)}${T('g')}`)
  if (o.vu !== 'L') conv.push(`V = ${sh(V)}${T(o.vu)} ${eqx(VL)}${T('L')}`)
  if (o.cu !== 'mol/L') conv.push(`c_{\\text{soll}} = ${sh(cS)}${T(o.cu)} ${eqx(cSL)}${T('mol/L')}`)
  if (conv.length) steps.push({ head: 'Einheiten umrechnen', tex: conv.join(',\\quad '), note: 'Masse in Gramm, Volumen in Liter.' })
  const nU = div(mg, s.M)
  steps.push({
    head: 'Stoffmenge der Urtitersubstanz',
    tex: `n(${X}) = \\frac{m}{M} = \\frac{${ntr(mg, 6)}${T('g')}}{${m2(s.M)}${T('g/mol')}} ${nBoth(nU)}`,
    note: 'Die Einwaage ist genau bekannt – daraus folgt die Stoffmenge.',
  })
  const nM = div(mul(nU, nuM), nuU)
  steps.push({
    head: 'Stoffmenge der Maßlösung',
    tex: `n(${Mt}) = n(${X}) \\cdot \\frac{${ntr(nuM)}}{${ntr(nuU)}} ${nBoth(nM)}`,
    note: cmp(nuU, nuM) === 0 ? 'Verhältnis 1 : 1.' : `Laut Gleichung reagieren $${ntr(nuU)}$ Teilchen Urtiter mit $${ntr(nuM)}$ Teilchen Maßlösung.`,
  })
  const cIst = div(nM, VL)
  steps.push({
    head: 'Tatsächliche Konzentration',
    tex: `c_{\\text{ist}} = \\frac{n}{V} = \\frac{${ntr(nM)}${T('mol')}}{${ntr(VL)}${T('L')}} ${eqx(cIst, 5)}${T('mol/L')}`,
    note: 'So konzentriert ist die Maßlösung wirklich.',
  })
  const t = div(cIst, cSL)
  const tv = toNum(t)
  const t4 = tv.toFixed(4).replace('.', '{,}')
  steps.push({
    head: 'Titer',
    tex: `t = \\frac{c_{\\text{ist}}}{c_{\\text{soll}}} = \\frac{${ntr(cIst, 5)}${T('mol/L')}}{${ntr(cSL)}${T('mol/L')}} \\approx ${t4}`,
    note: 'Der Titer ist ein Korrekturfaktor ohne Einheit, üblich mit vier Nachkommastellen.',
    final: true,
  })
  const remarks = ['Mit dem Titer rechnet man weiter: $c_{\\text{ist}} = t \\cdot c_{\\text{soll}}$ – oder man setzt $t$ in die Titrationsformel ein.']
  if (tv < 0.9 || tv > 1.1) remarks.push('Der Titer weicht stark von 1 ab – Einwaage, Ablesung und Stoffmengenverhältnis prüfen.')
  return { result: `t \\approx ${t4}`, extra: [`c_{\\text{ist}} ${eqx(cIst, 5)}${T('mol/L')}`, `n(${X}) ${nBest(nU)}`], steps, remark: remarks.join(' ') }
}

/* ---------------------------- Verbrauch vorhersagen ---------------------------- */

export type ProbeGiven = 'c' | 'm'

/** Erwarteter Verbrauch: n_M = n_P · ν_M / ν_P, V_M = n_M / (c_M · t) */
export function titrationPredict(o: {
  given: ProbeGiven
  cP?: NumIn | null
  cpu?: string
  VP?: NumIn | null
  vpu?: string
  mP?: NumIn | null
  mpu?: string
  formula?: string
  Mp?: NumIn | null
  cM: NumIn | null
  cmu: string
  t?: NumIn | null
  nuP: NumIn | null
  nuM: NumIn | null
  eq?: string
  P?: string
  M?: string
}): Solution {
  const P = o.P ?? '\\text{Probe}'
  const Mt = o.M ?? '\\text{Maßlösung}'
  const cM = need(o.cM, 'die Konzentration der Maßlösung')
  const t = opt(o.t, 'der Titer t') ?? q(1)
  const { p: nuP, m: nuM } = ratio(o.nuP, o.nuM)
  const steps: Step[] = []
  steps.push(...reactionSteps(o.eq, P, Mt, nuP, nuM))
  let nP: Q
  if (o.given === 'c') {
    const c = need(o.cP, 'die erwartete Konzentration der Probe')
    const V = need(o.VP, 'das Probevolumen')
    const cL = mul(c, fac(CONC_U, o.cpu ?? 'mol/L'))
    const VL = mul(V, fac(VOL_U, o.vpu ?? 'mL'))
    nP = mul(cL, VL)
    steps.push({
      head: 'Stoffmenge in der Probe',
      tex: `n(${P}) = c \\cdot V = ${ntr(cL)}${T('mol/L')} \\cdot ${ntr(VL)}${T('L')} ${nBoth(nP)}`,
      note: `Gegeben: $c = ${sh(c)}${T(o.cpu ?? 'mol/L')}$, $V_P = ${sh(V)}${T(o.vpu ?? 'mL')}$ – Volumen in Liter einsetzen.`,
    })
  } else {
    const s = substance(o.formula, o.Mp, true, P)
    const m = need(o.mP, 'die Masse des Stoffs in der Probe')
    if (s.step) steps.push(s.step)
    const mg = mul(m, fac(MASS_U, o.mpu ?? 'g'))
    nP = div(mg, s.M)
    steps.push({
      head: 'Stoffmenge in der Probe',
      tex: `n(${P}) = \\frac{m}{M} = \\frac{${ntr(mg)}${T('g')}}{${m2(s.M)}${T('g/mol')}} ${nBoth(nP)}`,
      note: `Gegeben: $m = ${sh(m)}${T(o.mpu ?? 'g')}$ – in Gramm einsetzen.`,
    })
  }
  const nM = div(mul(nP, nuM), nuP)
  steps.push({
    head: 'Stoffmenge der Maßlösung',
    tex: `n(${Mt}) = n(${P}) \\cdot \\frac{${ntr(nuM)}}{${ntr(nuP)}} ${nBoth(nM)}`,
    note: 'So viel Maßlösung wird bis zum Äquivalenzpunkt gebraucht.',
  })
  const cML = mul(cM, fac(CONC_U, o.cmu))
  const tShow = cmp(t, q(1)) !== 0
  const VM = div(nM, mul(cML, t))
  const vb = labVol(VM)
  steps.push({
    head: 'Verbrauch',
    tex: `V_M = \\frac{n(${Mt})}{c_M${tShow ? ' \\cdot t' : ''}} = \\frac{${ntr(nM)}${T('mol')}}{${ntr(cML)}${T('mol/L')}${tShow ? ` \\cdot ${sh(t)}` : ''}} ${eqx(VM)}${T('L')}${vb.u !== 'L' ? ` ${eqx(vb.v)}${T(vb.u)}` : ''}`,
    note: tShow ? 'Mit dem Titer die tatsächliche Konzentration der Maßlösung einsetzen.' : 'Volumen = Stoffmenge geteilt durch Konzentration.',
    final: true,
  })
  const mL = toNum(VM) * 1000
  const remarks: string[] = []
  if (mL > 50) remarks.push('Mehr als eine 50-mL-Bürettenfüllung – weniger Probe vorlegen oder eine konzentriertere Maßlösung nehmen.')
  else if (mL < 5) remarks.push('Sehr kleiner Verbrauch – der Ablesefehler der Bürette fällt stark ins Gewicht. Mehr Probe vorlegen oder eine verdünntere Maßlösung nehmen.')
  else remarks.push('Günstig ist ein Verbrauch, der einen großen Teil der Bürette ausnutzt (z. B. 10 bis 20 mL bei einer 25-mL-Bürette).')
  return { result: `V_M ${eqx(vb.v)}${T(vb.u)}`, extra: [`n(${Mt}) ${nBest(nM)}`, `n(${P}) ${nBest(nP)}`], steps, remark: remarks.join(' ') }
}
