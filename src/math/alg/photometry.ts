/**
 * Photometrie: Lambert-Beer (E = ε · c · d), Transmission ↔ Extinktion und Kalibriergerade
 * (lineare Regression, Probe auswerten, Verdünnung) – jeweils mit vollständigem Rechenweg.
 */
import { CalcError, div, mul, q, qTex, sign, sub, toNum, type Q } from '../q'
import { parseList, parsePairs, type NumIn } from './numinput'
import { linReg, linRegOrigin, mean, sd } from './regress'
import type { Solution, Step } from './step'
import { best, CONC_U, eqv, F, fac, feqv, fnt, MCONC_U, nt, T } from './units'

/** Einheit des molaren Extinktionskoeffizienten */
export const EPS_U = '\\,\\tfrac{\\text{L}}{\\text{mol} \\cdot \\text{cm}}'

/** gut messbarer Bereich der Extinktion */
const E_LO = 0.1
const E_HI = 1

function rangeRemark(E: number) {
  if (E < E_LO) return `Die Extinktion $E ${feqv(E, 3)}$ ist sehr klein – das Messergebnis wird ungenau. Besser konzentrierter messen oder eine dickere Küvette verwenden (gut messbar: $E \\approx 0{,}1 \\dots 1$).`
  if (E > E_HI) return `Die Extinktion $E ${feqv(E, 3)}$ liegt über dem gut messbaren Bereich ($E \\approx 0{,}1 \\dots 1$) – dort gilt Lambert-Beer oft nicht mehr. Die Probe verdünnen und den Verdünnungsfaktor einrechnen.`
  return 'Lambert-Beer gilt für verdünnte Lösungen und einfarbiges (monochromatisches) Licht; gut messbar ist $E \\approx 0{,}1 \\dots 1$.'
}

/* ---------------------------- Lambert-Beer ---------------------------- */

export function lambertBeer(o: { E: NumIn | null; eps: NumIn | null; c: NumIn | null; cu: string; d: NumIn | null; du: string; F?: NumIn | null; M?: NumIn | null }): Solution {
  let d = o.d
  let du = o.du === 'mm' ? 'mm' : 'cm'
  let assumed = false
  const miss = () => [o.E, o.eps, o.c, d].filter((x) => !x).length
  if (!d && miss() === 2) {
    d = { q: q(1), dec: false }
    du = 'cm'
    assumed = true
  }
  if (miss() !== 1) throw new CalcError('Bitte genau drei der vier Größen $E$, $\\varepsilon$, $c$ und $d$ eingeben – die vierte wird berechnet. Die Schichtdicke ist meist $d = 1\\,\\text{cm}$.')
  if (o.E && sign(o.E.q) <= 0) throw new CalcError('Die Extinktion muss größer als 0 sein.')
  if (o.eps && sign(o.eps.q) <= 0) throw new CalcError('Der Extinktionskoeffizient ε muss größer als 0 sein.')
  if (o.c && sign(o.c.q) <= 0) throw new CalcError('Die Konzentration muss größer als 0 sein.')
  if (d && sign(d.q) <= 0) throw new CalcError('Die Schichtdicke muss größer als 0 sein.')
  if (o.F && sign(sub(o.F.q, q(1))) < 0) throw new CalcError('Der Verdünnungsfaktor ist mindestens 1 (z. B. 10 bei einer Verdünnung 1 : 10).')
  if (o.M && sign(o.M.q) <= 0) throw new CalcError('Die molare Masse muss größer als 0 sein.')
  const want = !o.E ? 'E' : !o.eps ? 'eps' : !o.c ? 'c' : 'd'
  const steps: Step[] = []
  const given: string[] = []
  if (o.E) given.push(`E = ${qTex(o.E.q, F)}`)
  if (o.eps) given.push(`\\varepsilon = ${qTex(o.eps.q, F)}${EPS_U}`)
  if (o.c) given.push(`c = ${qTex(o.c.q, F)}${T(o.cu)}`)
  if (d) given.push(`d = ${qTex(d.q, F)}${T(du)}`)
  const wantName = { E: 'die Extinktion $E$', eps: 'der molare Extinktionskoeffizient $\\varepsilon$', c: 'die Konzentration $c$', d: 'die Schichtdicke $d$' }[want]
  steps.push({ tex: given.join(',\\quad '), head: 'Gegeben', note: `Gesucht ist ${wantName}.${assumed ? ' Die Schichtdicke fehlt – angenommen wird die übliche Küvette mit $d = 1\\,\\text{cm}$.' : ''}` })
  // Einheiten: c in mol/L, d in cm
  const conv: string[] = []
  const c = o.c ? mul(o.c.q, fac(CONC_U, o.cu)) : null
  const dd = d ? (du === 'mm' ? div(d.q, q(10)) : d.q) : null
  if (o.c && o.cu !== 'mol/L') conv.push(`c = ${qTex(o.c.q, F)}${T(o.cu)} = ${nt(c!)}${T('mol/L')}`)
  if (d && du === 'mm') conv.push(`d = ${qTex(d.q, F)}${T('mm')} = ${nt(dd!)}${T('cm')}`)
  if (conv.length) steps.push({ tex: conv.join(',\\quad '), head: 'Einheiten umrechnen', note: 'Passend zu $\\varepsilon$ in L/(mol·cm): Konzentration in mol/L, Schichtdicke in cm.' })
  steps.push({ tex: 'E = \\varepsilon \\cdot c \\cdot d', head: 'Formel', note: 'Lambert-Beer-Gesetz: Die Extinktion ist proportional zur Konzentration und zur Schichtdicke.' })
  const E = o.E?.q ?? null
  const eps = o.eps?.q ?? null
  let res: Q
  let result: string
  const extra: string[] = []
  let Eval: number
  const mainFinal = !(want === 'c' && (o.F || o.M))
  if (want === 'c') {
    res = div(E!, mul(eps!, dd!))
    steps.push({ tex: 'c = \\frac{E}{\\varepsilon \\cdot d}', head: 'Umstellen', note: 'Beide Seiten durch $\\varepsilon \\cdot d$ teilen.' })
    steps.push({ tex: `c = \\frac{${qTex(E!, F)}}{${qTex(eps!, F)}${EPS_U} \\cdot ${nt(dd!)}${T('cm')}} ${eqv(res)}${T('mol/L')}`, head: 'Einsetzen', note: 'cm kürzt sich weg, aus $\\frac{1}{\\text{L/mol}}$ wird mol/L.', final: mainFinal })
    const b = best(res, CONC_U)
    if (b.u !== 'mol/L') steps.push({ tex: `c ${eqv(res)}${T('mol/L')} ${eqv(b.v)}${T(b.u)}`, note: 'In eine handliche Einheit umrechnen.' })
    result = `c ${eqv(b.v)}${T(b.u)}`
    Eval = toNum(E!)
    let cP = res
    if (o.F && toNum(o.F.q) !== 1) {
      cP = mul(res, o.F.q)
      const bp = best(cP, CONC_U)
      steps.push({
        tex: `c_{\\text{Probe}} = c \\cdot F = ${nt(b.v)}${T(b.u)} \\cdot ${qTex(o.F.q, F)} ${eqv(mul(b.v, o.F.q))}${T(b.u)}${bp.u !== b.u ? ` ${eqv(bp.v)}${T(bp.u)}` : ''}`,
        head: 'Verdünnung berücksichtigen',
        note: `Gemessen wurde die verdünnte Lösung. Die ursprüngliche Probe ist $${qTex(o.F.q, F)}$-mal so konzentriert.`,
        final: !o.M,
      })
      extra.push(result.replace(/^c /, 'c_{\\text{Messlösung}} '))
      result = `c_{\\text{Probe}} ${eqv(bp.v)}${T(bp.u)}`
    }
    if (o.M) {
      const beta = mul(cP, o.M.q)
      const bb = best(beta, MCONC_U)
      steps.push({
        tex: `\\beta = c \\cdot M = ${nt(cP)}${T('mol/L')} \\cdot ${qTex(o.M.q, F)}${T('g/mol')} ${eqv(beta)}${T('g/L')}${bb.u !== 'g/L' ? ` ${eqv(bb.v)}${T(bb.u)}` : ''}`,
        head: 'Massenkonzentration',
        note: 'Stoffmengenkonzentration mal molare Masse: mol kürzt sich weg.',
        final: true,
      })
      extra.push(`\\beta ${eqv(bb.v)}${T(bb.u)}`)
    }
  } else if (want === 'E') {
    res = mul(mul(eps!, c!), dd!)
    steps.push({ tex: `E = ${qTex(eps!, F)}${EPS_U} \\cdot ${nt(c!)}${T('mol/L')} \\cdot ${nt(dd!)}${T('cm')} ${eqv(res)}`, head: 'Einsetzen', note: 'Alle Einheiten kürzen sich – die Extinktion hat keine Einheit.', final: true })
    result = `E ${eqv(res)}`
    Eval = toNum(res)
    const Tp = 100 * 10 ** -Eval
    extra.push(`T = 10^{-E} ${feqv(Tp)}\\,\\%`)
  } else if (want === 'eps') {
    res = div(E!, mul(c!, dd!))
    steps.push({ tex: '\\varepsilon = \\frac{E}{c \\cdot d}', head: 'Umstellen', note: 'Beide Seiten durch $c \\cdot d$ teilen.' })
    steps.push({ tex: `\\varepsilon = \\frac{${qTex(E!, F)}}{${nt(c!)}${T('mol/L')} \\cdot ${nt(dd!)}${T('cm')}} ${eqv(res)}${EPS_U}`, head: 'Einsetzen', note: 'Der Extinktionskoeffizient ist eine Stoffkonstante (bei einer bestimmten Wellenlänge).', final: true })
    result = `\\varepsilon ${eqv(res)}${EPS_U}`
    Eval = toNum(E!)
  } else {
    res = div(E!, mul(eps!, c!))
    steps.push({ tex: 'd = \\frac{E}{\\varepsilon \\cdot c}', head: 'Umstellen', note: 'Beide Seiten durch $\\varepsilon \\cdot c$ teilen.' })
    steps.push({ tex: `d = \\frac{${qTex(E!, F)}}{${qTex(eps!, F)}${EPS_U} \\cdot ${nt(c!)}${T('mol/L')}} ${eqv(res)}${T('cm')}`, head: 'Einsetzen', note: 'mol/L kürzt sich mit L/mol, übrig bleibt cm.', final: true })
    result = `d ${eqv(res)}${T('cm')}`
    if (toNum(res) < 1) extra.push(`d ${eqv(mul(res, q(10)))}${T('mm')}`)
    Eval = toNum(E!)
  }
  return { result, extra, steps, remark: rangeRemark(Eval) }
}

/* ---------------------------- Transmission ↔ Extinktion ---------------------------- */

export type TGiven = 'T' | 'I' | 'E'

/** T in % oder als Anteil, I/I₀ oder E → die anderen Größen */
export function transExt(o: { given: TGiven; T: NumIn | null; tu: string; I: NumIn | null; I0: NumIn | null; E: NumIn | null }): Solution {
  const steps: Step[] = []
  let t: number
  let E: number
  if (o.given === 'E') {
    if (!o.E) throw new CalcError('Bitte die Extinktion E eingeben.')
    E = toNum(o.E.q)
    if (E < 0) throw new CalcError('Die Extinktion kann nicht negativ sein (sonst käme mehr Licht heraus als hinein).')
    if (E > 10) throw new CalcError('Eine so hohe Extinktion kann kein Photometer messen – die Probe verdünnen.')
    t = 10 ** -E
    steps.push({ tex: `E = ${qTex(o.E.q, F)}`, head: 'Gegeben', note: 'Gesucht: die Transmission $T$ (Anteil des durchgelassenen Lichts).' })
    steps.push({ tex: 'T = 10^{-E}', head: 'Formel', note: 'Umkehrung von $E = -\\lg T$: „lg“ wird mit „10 hoch“ rückgängig gemacht.' })
    steps.push({ tex: `T = 10^{-${qTex(o.E.q, F)}} ${feqv(t)} = ${fnt(t * 100)}\\,\\%`, head: 'Einsetzen', note: 'Als Prozent: mal 100 %.', final: true })
    steps.push({ tex: `1 - T ${feqv(1 - t)} = ${fnt((1 - t) * 100)}\\,\\%`, head: 'Absorbiert', note: 'Dieser Anteil des Lichts wird von der Probe geschluckt (Streuung und Reflexion vernachlässigt).' })
    return { result: `T ${feqv(t * 100)}\\,\\%`, extra: [`T ${feqv(t)}`, `E = ${qTex(o.E.q, F)}`], steps, remark: rangeRemark(E) }
  }
  if (o.given === 'I') {
    if (!o.I || !o.I0) throw new CalcError('Bitte die Intensitäten I (nach der Probe) und I₀ (ohne Probe) eingeben.')
    const I = toNum(o.I.q)
    const I0 = toNum(o.I0.q)
    if (I <= 0 || I0 <= 0) throw new CalcError('Die Intensitäten müssen größer als 0 sein.')
    if (I > I0) throw new CalcError('I kann nicht größer als I₀ sein – die Probe kann kein Licht dazuerzeugen. Vertauscht?')
    t = I / I0
    E = Math.log10(I0 / I)
    steps.push({ tex: `I = ${qTex(o.I.q, F)},\\quad I_0 = ${qTex(o.I0.q, F)}`, head: 'Gegeben', note: '$I_0$: Licht ohne Probe (Blindwert), $I$: Licht nach der Probe.' })
    steps.push({ tex: `T = \\frac{I}{I_0} = \\frac{${qTex(o.I.q, F)}}{${qTex(o.I0.q, F)}} ${feqv(t)} = ${fnt(t * 100)}\\,\\%`, head: 'Transmission', note: 'Anteil des durchgelassenen Lichts.' })
    steps.push({ tex: `E = \\lg \\frac{I_0}{I} = \\lg \\frac{${qTex(o.I0.q, F)}}{${qTex(o.I.q, F)}} ${feqv(E)}`, head: 'Extinktion', note: 'Logarithmus des Kehrwerts der Transmission.', final: true })
    return { result: `E ${feqv(E)}`, extra: [`T ${feqv(t * 100)}\\,\\%`], steps, remark: rangeRemark(E) }
  }
  if (!o.T) throw new CalcError('Bitte die Transmission T eingeben.')
  const pct = o.tu !== 'Anteil'
  const tv = toNum(o.T.q)
  t = pct ? tv / 100 : tv
  if (t <= 0) throw new CalcError('Bei T = 0 kommt kein Licht mehr durch – die Extinktion wäre unendlich groß. Die Probe verdünnen.')
  if (t > 1) throw new CalcError(pct ? 'Die Transmission kann höchstens 100 % sein.' : 'Als Anteil liegt die Transmission zwischen 0 und 1 (sonst „%“ wählen).')
  E = -Math.log10(t)
  steps.push({
    tex: pct ? `T = ${qTex(o.T.q, F)}\\,\\% = ${fnt(t, 6)}` : `T = ${qTex(o.T.q, F)}`,
    head: 'Gegeben',
    note: pct ? 'Prozent in einen Anteil umrechnen: durch 100 teilen.' : 'Transmission als Anteil (zwischen 0 und 1).',
  })
  steps.push({ tex: 'E = -\\lg T = \\lg \\frac{1}{T}', head: 'Formel', note: 'Die Transmission als Dezimalzahl einsetzen – nicht in Prozent.' })
  steps.push({ tex: `E = -\\lg ${fnt(t, 6)} ${feqv(E)}`, head: 'Einsetzen', final: true })
  if (pct) {
    const lg = Math.log10(tv)
    steps.push({ tex: `E = 2 - \\lg(T\\text{ in }\\%) = 2 - \\lg ${qTex(o.T.q, F)} ${feqv(2 - lg)}`, head: 'Andere Rechnung', note: 'Gleiches Ergebnis, weil $\\lg 100 = 2$ ist: $-\\lg \\frac{T_{\\%}}{100} = \\lg 100 - \\lg T_{\\%}$.' })
  }
  steps.push({ tex: `1 - T ${feqv(1 - t)} = ${fnt((1 - t) * 100)}\\,\\%`, head: 'Absorbiert', note: 'Dieser Anteil des Lichts wird von der Probe geschluckt (Streuung und Reflexion vernachlässigt).' })
  return { result: `E ${feqv(E)}`, extra: [`T = ${pct ? `${qTex(o.T.q, F)}\\,\\%` : qTex(o.T.q, F)}`], steps, remark: rangeRemark(E) }
}

/* ---------------------------- Kalibriergerade ---------------------------- */

export interface CalibOut extends Solution {
  /** Standards (c, E) */
  std: [number, number][]
  fit: { m: number; b: number; r2: number; origin: boolean }
  /** Probe: Einzelwerte, Mittelwert, c in der Messlösung, c in der ursprünglichen Probe */
  sample: { list: number[]; E: number; c: number; c0: number } | null
  /** Probe außerhalb des Kalibrierbereichs */
  outside: boolean
  /** bereinigte Einheit */
  unit: string
}

/** Einheit aus dem Freitextfeld: nur unverfängliche Zeichen (kein TeX) */
export function cleanUnit(u: string) {
  return u
    .replace(/μ/g, 'µ')
    .replace(/[^A-Za-z0-9äöüÄÖÜµ/%°.\-() ²³]/g, '')
    .trim()
    .slice(0, 16)
}

const sigma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function calibration(o: { pairs: string; samples: string; origin: boolean; F: NumIn | null; unit: string }): CalibOut {
  const unit = cleanUnit(o.unit)
  const U = T(unit)
  const inv = unit ? `\\,(${U.slice(2)})^{-1}` : ''
  const pts = parsePairs(o.pairs, 'Standards')
  if (pts.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) throw new CalcError('Standards: Bitte nur Zahlen eingeben, je Zeile „c; E“.')
  if (pts.length < 2) throw new CalcError('Bitte mindestens zwei Standards eingeben (besser fünf oder mehr), je Zeile „Konzentration; Extinktion“.')
  if (pts.some(([x]) => x < 0)) throw new CalcError('Konzentrationen der Standards können nicht negativ sein.')
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  if (Math.max(...xs) - Math.min(...xs) <= 0) throw new CalcError('Die Standards brauchen verschiedene Konzentrationen.')
  if (o.F && sign(sub(o.F.q, q(1))) < 0) throw new CalcError('Der Verdünnungsfaktor ist mindestens 1 (z. B. 10 bei einer Verdünnung 1 : 10).')
  const n = pts.length
  const steps: Step[] = []
  let m: number
  let b: number
  let r2: number
  const big = n <= 12
  if (!o.origin) {
    const reg = linReg(pts)
    m = reg.m
    b = reg.b
    r2 = reg.r2
    if (!Number.isFinite(m) || m === 0) throw new CalcError('Die Steigung ist 0 – die Extinktion ändert sich nicht mit der Konzentration. Prüfe die Messwerte.')
    if (big) {
      const rows = pts.map(([x, y], i) => `${i + 1} & ${fnt(x)} & ${fnt(y)} & ${fnt((x - reg.xm) ** 2)} & ${fnt((x - reg.xm) * (y - reg.ym))}`)
      steps.push({
        tex: `\\begin{array}{c|c|c|c|c} i & c_i & E_i & (c_i - \\bar c)^2 & (c_i - \\bar c)(E_i - \\bar E) \\\\ \\hline ${rows.join(' \\\\ ')} \\\\ \\hline \\Sigma & ${fnt(sigma(xs))} & ${fnt(sigma(ys))} & ${fnt(reg.sxx)} & ${fnt(reg.sxy)} \\end{array}`,
        head: 'Messwerte',
        note: `${n} Standards. Die Tabelle sammelt alles, was die Regression braucht.`,
      })
    }
    steps.push({ tex: `\\bar c = \\frac{\\sum c_i}{n} = \\frac{${fnt(sigma(xs))}}{${n}} ${feqv(reg.xm)}${U},\\quad \\bar E = \\frac{\\sum E_i}{n} = \\frac{${fnt(sigma(ys))}}{${n}} ${feqv(reg.ym)}`, head: 'Mittelwerte', note: 'Die Ausgleichsgerade geht immer durch den Schwerpunkt $(\\bar c \\mid \\bar E)$.' })
    steps.push({
      tex: `m = \\frac{\\sum (c_i - \\bar c)(E_i - \\bar E)}{\\sum (c_i - \\bar c)^2} = \\frac{${fnt(reg.sxy)}}{${fnt(reg.sxx)}} ${feqv(m)}${inv}`,
      head: 'Steigung',
      note: 'Methode der kleinsten Quadrate: Die Gerade liegt so, dass die Summe der quadrierten Abstände minimal ist. Die Steigung ist die Empfindlichkeit der Methode.',
    })
    steps.push({ tex: `b = \\bar E - m \\cdot \\bar c = ${fnt(reg.ym)} - ${fnt(m)} \\cdot ${fnt(reg.xm)} ${feqv(b)}`, head: 'Achsenabschnitt', note: 'Im Idealfall nahe 0 (Blindwert abgezogen).' })
    steps.push({
      tex: `R^2 = \\frac{\\left(\\sum (c_i - \\bar c)(E_i - \\bar E)\\right)^2}{\\sum (c_i - \\bar c)^2 \\cdot \\sum (E_i - \\bar E)^2} = \\frac{${fnt(reg.sxy)}^2}{${fnt(reg.sxx)} \\cdot ${fnt(reg.syy)}} ${feqv(r2, 5)}`,
      head: 'Bestimmtheitsmaß',
      note: 'Wie gut passt die Gerade? $R^2 = 1$: alle Punkte genau auf der Geraden. Für Kalibrierungen sollte $R^2 \\ge 0{,}99$ sein.',
    })
  } else {
    const reg = linRegOrigin(pts)
    m = reg.m
    b = 0
    r2 = reg.r2
    if (!Number.isFinite(m) || m === 0) throw new CalcError('Die Steigung ist 0 – die Extinktion ändert sich nicht mit der Konzentration. Prüfe die Messwerte.')
    const sxy = sigma(pts.map(([x, y]) => x * y))
    const sxx = sigma(xs.map((x) => x * x))
    if (big) {
      const rows = pts.map(([x, y], i) => `${i + 1} & ${fnt(x)} & ${fnt(y)} & ${fnt(x * x)} & ${fnt(x * y)}`)
      steps.push({
        tex: `\\begin{array}{c|c|c|c|c} i & c_i & E_i & c_i^2 & c_i \\cdot E_i \\\\ \\hline ${rows.join(' \\\\ ')} \\\\ \\hline \\Sigma & & & ${fnt(sxx)} & ${fnt(sxy)} \\end{array}`,
        head: 'Messwerte',
        note: `${n} Standards. Gerade durch den Nullpunkt: $E = m \\cdot c$ (kein Achsenabschnitt).`,
      })
    }
    steps.push({ tex: `m = \\frac{\\sum c_i \\cdot E_i}{\\sum c_i^2} = \\frac{${fnt(sxy)}}{${fnt(sxx)}} ${feqv(m)}${inv}`, head: 'Steigung', note: 'Kleinste Quadrate für eine Gerade durch den Ursprung – sinnvoll, wenn der Blindwert abgezogen ist.' })
    steps.push({ tex: `R^2 = 1 - \\frac{\\sum (E_i - m c_i)^2}{\\sum (E_i - \\bar E)^2} ${feqv(r2, 5)}`, head: 'Bestimmtheitsmaß', note: 'Anteil der Streuung, den die Gerade erklärt. Für Kalibrierungen sollte $R^2 \\ge 0{,}99$ sein.' })
  }
  const line = b === 0 ? `E = ${fnt(m)}${inv} \\cdot c` : `E = ${fnt(m)}${inv} \\cdot c ${b < 0 ? '-' : '+'} ${fnt(Math.abs(b))}`
  steps.push({ tex: line, head: 'Kalibriergerade', note: 'Mit dieser Geraden wird aus der Extinktion einer Probe die Konzentration bestimmt.' })
  const remarks: string[] = []
  if (r2 < 0.99) remarks.push(`Das Bestimmtheitsmaß ist mit $R^2 ${feqv(r2, 4)}$ kleiner als 0,99 – einzelne Standards auf Ausreißer oder Pipettierfehler prüfen.`)
  if (n < 5) remarks.push('Für eine verlässliche Kalibriergerade besser mindestens fünf Standards verwenden.')
  const samples = o.samples.trim() ? parseList(o.samples, 'Probe') : []
  if (samples.some((x) => !Number.isFinite(x))) throw new CalcError('Probe: Bitte nur Zahlen eingeben.')
  if (samples.some((x) => x < 0)) throw new CalcError('Probe: Eine Extinktion kann nicht negativ sein.')
  const base = { std: pts, fit: { m, b, r2, origin: o.origin }, unit }
  if (!samples.length) {
    steps[steps.length - 1].final = true
    return { ...base, result: line, extra: [`R^2 ${feqv(r2, 5)}`], steps, sample: null, outside: false, remark: remarks.join(' ') || 'Trage unten die Extinktion der Probe ein, um ihre Konzentration zu bestimmen.' }
  }
  const Em = mean(samples)
  if (samples.length > 1) {
    const s = sd(samples)
    steps.push({
      tex: `\\bar E_{\\text{Probe}} = \\frac{${samples.map((x) => fnt(x)).join(' + ')}}{${samples.length}} ${feqv(Em)}`,
      head: 'Probe',
      note: `Mittelwert der Mehrfachmessung (Standardabweichung $s ${feqv(s, 2)}$).`,
    })
  } else steps.push({ tex: `E_{\\text{Probe}} = ${fnt(Em)}`, head: 'Probe', note: 'Gemessene Extinktion der Probe.' })
  const c = (Em - b) / m
  if (c < 0) throw new CalcError('Die Extinktion der Probe liegt unter dem Achsenabschnitt der Geraden – die Konzentration ist kleiner als der Messbereich (Blindwert prüfen).')
  steps.push({
    tex: b === 0 ? `c = \\frac{E}{m} = \\frac{${fnt(Em)}}{${fnt(m)}${inv}} ${feqv(c)}${U}` : `c = \\frac{E - b}{m} = \\frac{${fnt(Em)} ${b < 0 ? '+' : '-'} ${fnt(Math.abs(b))}}{${fnt(m)}${inv}} ${feqv(c)}${U}`,
    head: 'Konzentration ablesen',
    note: 'Die Geradengleichung nach $c$ umgestellt.',
    final: !o.F || toNum(o.F.q) === 1,
  })
  const Fv = o.F ? toNum(o.F.q) : 1
  let c0 = c
  let result = `c ${feqv(c)}${U}`
  const extra: string[] = []
  if (Fv !== 1) {
    c0 = c * Fv
    steps.push({ tex: `c_{\\text{Probe}} = c \\cdot F = ${fnt(c)}${U} \\cdot ${qTex(o.F!.q, F)} ${feqv(c0)}${U}`, head: 'Verdünnung berücksichtigen', note: 'Gemessen wurde die verdünnte Probe – mit dem Verdünnungsfaktor zurückrechnen.', final: true })
    extra.push(`c_{\\text{Messlösung}} ${feqv(c)}${U}`)
    result = `c_{\\text{Probe}} ${feqv(c0)}${U}`
  }
  extra.push(line, `R^2 ${feqv(r2, 5)}`)
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  const tol = 1e-9 * (hi - lo)
  const outside = c < lo - tol || c > hi + tol
  if (outside)
    remarks.unshift(
      `Achtung, Extrapolation: Die Probe ($c ${feqv(c, 3)}${U}$) liegt außerhalb des Kalibrierbereichs ($${fnt(lo)}$ bis $${fnt(hi)}${U}$). Ob die Gerade dort noch gilt, ist nicht gesichert – ${c > hi ? 'die Probe verdünnen' : 'konzentrierter messen oder kleinere Standards ansetzen'} und erneut messen.`,
    )
  return { ...base, result, extra, steps, sample: { list: samples, E: Em, c, c0 }, outside, remark: remarks.join(' ') || 'Die Probe liegt im Kalibrierbereich – die Konzentration ist abgesichert.' }
}
