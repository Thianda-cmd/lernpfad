/**
 * DNA, RNA & Protein: Konzentration aus A260, Reinheit (A260/A280, A260/A230), Umrechnung
 * ng ↔ pmol ↔ Kopienzahl, Ligationsansatz, Schmelztemperatur von Primern und Proteinkonzentration
 * aus A280 – jeweils mit vollständigem Rechenweg.
 * Alles Rationale exakt mit Brüchen; nur Wurzeln/Logarithmen wären Gleitkomma (hier nicht nötig).
 */
import { add, CalcError, div, eq, isTerminating, isZero, mul, neg, ONE, q, qFromRaw, qTex, sign, sub, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { best, F, fac, num, T, type Unit } from './units'

/* ---------------------------- Anzeige-Hilfen (auch für pcr.ts) ---------------------------- */

/**
 * Zahl als TeX: exakt, wenn kurz – sonst `sig` gültige Ziffern. Anders als num() gilt eine exakte
 * Zehnerpotenz wie 10⁻⁶ oder 6,6 · 10⁻⁸ nicht als gerundet (kein „≈“), und 0 ist genau 0.
 */
export function numQ(x: Q, sig = 4): { t: string; approx: boolean } {
  if (isZero(x)) return { t: '0', approx: false }
  const r = num(x, sig)
  if (!r.approx || !isTerminating(x)) return r
  const back = qFromRaw(Math.abs(toNum(x)).toPrecision(sig))
  return { t: r.t, approx: !eq(sign(x) < 0 ? neg(back) : back, x) }
}
/** nur die Zahl */
export const ntq = (x: Q, sig = 4) => numQ(x, sig).t
/** „= 3,5“ oder „≈ 3,333“ */
export function eqq(x: Q, sig = 4) {
  const r = numQ(x, sig)
  return `${r.approx ? '\\approx' : '='} ${r.t}`
}
/** Eingabewert so, wie er eingegeben wurde (Dezimalzahl oder Bruch) */
export const tx = (x: Q) => qTex(x, F)

/** feste Nachkommastellen mit Dezimalkomma (behält Nullen: 1,80) */
export function fixTex(x: number, d: number): string {
  const s = Math.abs(x).toFixed(d)
  const [i, f] = s.split('.')
  const ii = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : i
  return (x < 0 && Number(s) !== 0 ? '-' : '') + ii + (f ? `{,}${f}` : '')
}
/** „= 1,80“ oder „≈ 1,83“ */
export function fixEqv(x: number, d: number) {
  const r = Number(x.toFixed(d))
  return `${Math.abs(x - r) > 1e-9 * Math.max(1, Math.abs(x)) ? '\\approx' : '='} ${fixTex(x, d)}`
}

/** Pflichtwert > 0 */
export function pos(v: NumIn | null | undefined, msg: string, zeroMsg?: string): Q {
  if (!v) throw new CalcError(msg)
  if (sign(v.q) <= 0) throw new CalcError(zeroMsg ?? msg)
  return v.q
}

/* ---------------------------- Konstanten und Einheiten ---------------------------- */

/** Avogadro-Konstante in 1/mol */
export const NA = qFromRaw('6.022e23')
const NA_TEX = '6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1}'

const un = (name: string, n: bigint | number, d: bigint | number = 1): Unit => ({ u: name, f: q(n, d) })
/** Massen für Nukleinsäuren (Grundeinheit g), groß → klein */
export const NA_MASS_U: readonly Unit[] = [un('mg', 1, 1000), un('µg', 1, 1_000_000), un('ng', 1, 1_000_000_000), un('pg', 1, 1_000_000_000_000n)]
/** Stoffmengen bis Attomol (Grundeinheit mol), groß → klein */
export const NA_MOL_U: readonly Unit[] = [un('µmol', 1, 1_000_000), un('nmol', 1, 1_000_000_000), un('pmol', 1, 1_000_000_000_000n), un('fmol', 1, 10n ** 15n), un('amol', 1, 10n ** 18n)]

/** Einheit des molaren Extinktionskoeffizienten */
export const EPS_TEX = '\\,\\tfrac{\\text{L}}{\\text{mol} \\cdot \\text{cm}}'
/** Einheit des Massen-Extinktionskoeffizienten (A280 einer Lösung mit 1 mg/mL) */
export const EPSM_TEX = '\\,\\tfrac{\\text{mL}}{\\text{mg} \\cdot \\text{cm}}'
const GMOL = T('g/mol')

/** Schichtdicke in cm (leer → 1 cm) */
function pathCm(d: NumIn | null | undefined, du: string | undefined): { d: Q; dIn: Q; du: 'cm' | 'mm'; assumed: boolean } {
  const unit = du === 'mm' ? 'mm' : 'cm'
  if (!d) return { d: ONE, dIn: ONE, du: 'cm', assumed: true }
  if (sign(d.q) <= 0) throw new CalcError('Die Schichtdicke $d$ muss größer als 0 sein.')
  return { d: unit === 'mm' ? div(d.q, q(10)) : d.q, dIn: d.q, du: unit, assumed: false }
}

/** Verdünnungsfaktor (leer → 1) */
function dilution(F_: NumIn | null | undefined): Q {
  if (!F_) return ONE
  if (sign(sub(F_.q, ONE)) < 0) throw new CalcError('Der Verdünnungsfaktor $F$ ist mindestens 1 (z. B. $F = 50$ bei einer Verdünnung 1 : 50).')
  return F_.q
}

/* ---------------------------- a) Konzentration aus A260 ---------------------------- */

export type NaKind = 'dsdna' | 'ssdna' | 'rna' | 'oligo'

/** Umrechnungsfaktoren: A260 = 1 (d = 1 cm) entspricht … µg/mL */
export const A260_FACTORS: Record<NaKind, { name: string; f: number }> = {
  dsdna: { name: 'doppelsträngige DNA (dsDNA)', f: 50 },
  ssdna: { name: 'einzelsträngige DNA (ssDNA)', f: 33 },
  rna: { name: 'RNA', f: 40 },
  oligo: { name: 'Oligonukleotide', f: 33 },
}

function a260Remark(A: number, what = 'A_{260}') {
  const a = fixTex(A, 3)
  if (A < 0.1) return `$${what} = ${a}$ ist sehr klein – das Ergebnis wird ungenau. Weniger stark verdünnen (gut messbar: $${what} \\approx 0{,}1 \\dots 1{,}0$).`
  if (A > 1) return `$${what} = ${a}$ liegt über dem gut messbaren Bereich ($0{,}1 \\dots 1{,}0$) – die Probe stärker verdünnen, neu messen und den Verdünnungsfaktor einrechnen.`
  return `Gut messbar ist $${what} \\approx 0{,}1 \\dots 1{,}0$. Den Leerwert mit demselben Puffer messen, in dem die Probe gelöst ist.`
}

export function a260Conc(o: { A: NumIn | null; kind: NaKind | 'eigen'; factor?: NumIn | null; F?: NumIn | null; d?: NumIn | null; du?: string; V?: NumIn | null; vu?: string }): Solution {
  const A = pos(o.A, 'Bitte die gemessene Absorption $A_{260}$ eingeben.', 'Die Absorption $A_{260}$ muss größer als 0 sein.')
  let f: Q
  let fname: string
  if (o.kind === 'eigen') {
    f = pos(o.factor, 'Bitte den eigenen Umrechnungsfaktor in µg/mL eingeben.', 'Der Umrechnungsfaktor muss größer als 0 sein.')
    fname = 'diese Probe (eigener Faktor)'
  } else {
    const k = A260_FACTORS[o.kind]
    if (!k) throw new CalcError('Bitte die Art der Nukleinsäure wählen.')
    f = q(k.f)
    fname = k.name
  }
  const Fd = dilution(o.F)
  const p = pathCm(o.d, o.du)
  const dOne = eq(p.d, ONE)
  const fOne = eq(Fd, ONE)
  const steps: Step[] = []
  const given = [`A_{260} = ${tx(A)}`, `f = ${tx(f)}${T('µg/mL')}`]
  if (!fOne) given.push(`F = ${tx(Fd)}`)
  given.push(`d = ${tx(p.dIn)}${T(p.du)}`)
  steps.push({
    tex: given.join(',\\quad '),
    head: 'Gegeben',
    note:
      `Umrechnungsfaktor für ${fname}: $A_{260} = 1 \\;\\widehat{=}\\; ${tx(f)}${T('µg/mL')}$ bei $d = 1\\,\\text{cm}$.` +
      (fOne ? ' Die Probe wurde unverdünnt gemessen ($F = 1$).' : ` Gemessen wurde die verdünnte Lösung – der Verdünnungsfaktor $F = ${tx(Fd)}$ rechnet auf die Ausgangsprobe zurück.`) +
      (p.assumed ? ' Ohne Angabe gilt die Standardküvette mit $d = 1\\,\\text{cm}$.' : ''),
  })
  if (p.du === 'mm') steps.push({ tex: `d = ${tx(p.dIn)}${T('mm')} = ${ntq(p.d)}${T('cm')}`, head: 'Einheiten umrechnen', note: 'Der Umrechnungsfaktor gilt für 1 cm Schichtdicke – $d$ also in cm einsetzen.' })
  const formula = ['A_{260}', 'f']
  if (!fOne) formula.push('F')
  if (!dOne) formula.push('\\frac{1\\,\\text{cm}}{d}')
  steps.push({
    tex: `c = ${formula.join(' \\cdot ')}`,
    head: 'Formel',
    note: 'Nach Lambert-Beer ist die Absorption proportional zur Konzentration: Der Faktor $f$ sagt, welche Konzentration zu $A_{260} = 1$ gehört.' + (dOne ? '' : ' Bei einer anderen Schichtdicke als 1 cm wird auf 1 cm umgerechnet.'),
  })
  const c = div(mul(mul(A, f), Fd), p.d)
  const ins = [tx(A), `${tx(f)}${T('µg/mL')}`]
  if (!fOne) ins.push(tx(Fd))
  if (!dOne) ins.push(`\\frac{1\\,\\text{cm}}{${ntq(p.d)}\\,\\text{cm}}`)
  steps.push({ tex: `c = ${ins.join(' \\cdot ')} ${eqq(c)}${T('µg/mL')}`, head: 'Einsetzen', final: true })
  const cmg = div(c, q(1000))
  steps.push({
    tex: `c ${eqq(c)}${T('µg/mL')} ${eqq(c)}${T('ng/µL')} ${eqq(cmg)}${T('µg/µL')}`,
    head: 'Einheiten',
    note: '$1\\,\\mu\\text{g/mL} = 1\\,\\text{ng}/\\mu\\text{L}$: Masse und Volumen werden beide um den Faktor 1000 kleiner – der Zahlenwert bleibt gleich.',
  })
  const extra: string[] = [`c ${eqq(c)}${T('ng/µL')} ${eqq(cmg)}${T('µg/µL')}`]
  if (o.V) {
    if (sign(o.V.q) <= 0) throw new CalcError('Das Probenvolumen muss größer als 0 sein.')
    const vu = o.vu === 'mL' ? 'mL' : 'µL'
    const VuL = vu === 'mL' ? mul(o.V.q, q(1000)) : o.V.q
    if (vu === 'mL') steps.push({ tex: `V = ${tx(o.V.q)}${T('mL')} = ${ntq(VuL)}${T('µL')}`, head: 'Ausbeute', note: 'Volumen in µL umrechnen – passend zu ng/µL.' })
    const mng = mul(c, VuL)
    const mb = best(div(mng, q(1_000_000_000)), NA_MASS_U)
    steps.push({
      tex: `m = c \\cdot V = ${ntq(c)}${T('ng/µL')} \\cdot ${ntq(VuL)}${T('µL')} ${eqq(mng)}${T('ng')}${mb.u !== 'ng' ? ` ${eqq(mb.v)}${T(mb.u)}` : ''}`,
      head: vu === 'mL' ? undefined : 'Ausbeute',
      note: 'Gesamtmenge in der Probe: Konzentration mal Volumen (µL kürzt sich weg).',
      final: true,
    })
    extra.push(`m ${eqq(mb.v)}${T(mb.u)}\\ \\text{(Ausbeute in } ${ntq(o.V.q)}${T(vu)}\\text{)}`)
  }
  return { result: `c ${eqq(c)}${T('µg/mL')}`, extra, steps, remark: a260Remark(toNum(A)) }
}

/* ---------------------------- b) Reinheit ---------------------------- */

export type PurityKind = 'dna' | 'rna'

export interface PurityRating {
  ok: boolean
  /** kurzes Urteil (Text) */
  short: string
  /** Erklärung (Text mit $TeX$) */
  why: string
  /** Vergleich als TeX */
  cmp: string
}

/** Bewertung von A260/A280 (mit dem angezeigten, auf zwei Stellen gerundeten Wert) */
export function rate280(raw: number, kind: PurityKind): PurityRating {
  const r = Number(raw.toFixed(2))
  const v = fixTex(r, 2)
  if (kind === 'dna') {
    if (r < 1.7) return { ok: false, short: 'Protein oder Phenol?', why: 'Der Quotient ist zu niedrig: Vermutlich sind Protein- oder Phenolreste in der Probe (sie absorbieren bei 280 nm). Erneut reinigen (z. B. Phenol-Chloroform-Extraktion oder Säule).', cmp: `${v} < 1{,}7` }
    if (r > 2.0) return { ok: false, short: 'RNA in der Probe?', why: 'Der Quotient liegt über 2,0 – typisch für RNA. Vermutlich enthält die DNA-Probe RNA: mit RNase A verdauen.', cmp: `${v} > 2{,}0` }
    return { ok: true, short: 'rein', why: 'Reine DNA hat einen Quotienten von etwa 1,8 (Bereich 1,7 bis 2,0).', cmp: `1{,}7 \\le ${v} \\le 2{,}0` }
  }
  if (r < 1.8) return { ok: false, short: 'Protein oder Phenol?', why: 'Der Quotient ist zu niedrig: Vermutlich sind Protein- oder Phenolreste in der Probe (sie absorbieren bei 280 nm).', cmp: `${v} < 1{,}8` }
  if (r > 2.2) return { ok: false, short: 'ungewöhnlich hoch', why: 'Der Quotient liegt über 2,2 – das ist für RNA ungewöhnlich. Leerwert und Puffer prüfen und erneut messen.', cmp: `${v} > 2{,}2` }
  return { ok: true, short: 'rein', why: 'Reine RNA hat einen Quotienten von etwa 2,0 (Bereich 1,8 bis 2,2).', cmp: `1{,}8 \\le ${v} \\le 2{,}2` }
}

/** Bewertung von A260/A230 (mit dem angezeigten, auf zwei Stellen gerundeten Wert) */
export function rate230(raw: number): PurityRating {
  const r = Number(raw.toFixed(2))
  const v = fixTex(r, 2)
  if (r < 1.8) return { ok: false, short: 'verunreinigt', why: 'Deutlich unter 2,0: Verunreinigung mit Stoffen, die bei 230 nm absorbieren – Salze (Guanidin aus Säulen-Kits), Kohlenhydrate, Phenol oder EDTA. Nachwaschen bzw. erneut fällen.', cmp: `${v} < 1{,}8` }
  if (r < 2.0) return { ok: false, short: 'leicht verunreinigt', why: 'Etwas unter dem Zielbereich 2,0 bis 2,2 – geringe Reste von Salzen, Kohlenhydraten oder Phenol sind möglich.', cmp: `1{,}8 \\le ${v} < 2{,}0` }
  return { ok: true, short: 'rein', why: 'Für reine Nukleinsäuren erwartet man etwa 2,0 bis 2,2.', cmp: `${v} \\ge 2{,}0` }
}

export function purity(o: { a260: NumIn | null; a280: NumIn | null; a230?: NumIn | null; kind: PurityKind }): Solution {
  const a260 = pos(o.a260, 'Bitte $A_{260}$ und $A_{280}$ eingeben.', 'Die Absorption $A_{260}$ muss größer als 0 sein.')
  const a280 = pos(o.a280, 'Bitte $A_{260}$ und $A_{280}$ eingeben.', 'Die Absorption $A_{280}$ muss größer als 0 sein.')
  const a230 = o.a230 ? pos(o.a230, '', 'Die Absorption $A_{230}$ muss größer als 0 sein.') : null
  const name = o.kind === 'rna' ? 'RNA' : 'DNA'
  const steps: Step[] = []
  const given = [`A_{260} = ${tx(a260)}`, `A_{280} = ${tx(a280)}`]
  if (a230) given.push(`A_{230} = ${tx(a230)}`)
  steps.push({
    tex: given.join(',\\quad '),
    head: 'Gegeben',
    note: 'Nukleinsäuren absorbieren am stärksten bei 260 nm, Proteine (Tryptophan, Tyrosin) bei 280 nm, Salze, Kohlenhydrate und Phenol bei 230 nm. Die Quotienten haben keine Einheit.',
  })
  const r1 = toNum(div(a260, a280))
  const k1 = rate280(r1, o.kind)
  steps.push({ tex: `\\frac{A_{260}}{A_{280}} = \\frac{${tx(a260)}}{${tx(a280)}} ${fixEqv(r1, 2)}`, head: 'Quotient A260 zu A280', note: `Erwartet für reine ${name}: etwa ${o.kind === 'rna' ? '2,0' : '1,8'}.`, final: true })
  steps.push({ tex: `${k1.cmp} \\;\\Rightarrow\\; \\text{${k1.short}}`, note: k1.why })
  const res = [`A_{260}/A_{280} ${fixEqv(r1, 2)}`]
  const extra = [`\\text{${name} (260/280): ${k1.short}}`]
  let k2: PurityRating | null = null
  if (a230) {
    const r2 = toNum(div(a260, a230))
    k2 = rate230(r2)
    steps.push({ tex: `\\frac{A_{260}}{A_{230}} = \\frac{${tx(a260)}}{${tx(a230)}} ${fixEqv(r2, 2)}`, head: 'Quotient A260 zu A230', note: 'Erwartet für reine Nukleinsäuren: etwa 2,0 bis 2,2.', final: true })
    steps.push({ tex: `${k2.cmp} \\;\\Rightarrow\\; \\text{${k2.short}}`, note: k2.why })
    res.push(`A_{260}/A_{230} ${fixEqv(r2, 2)}`)
    extra.push(`\\text{${name} (260/230): ${k2.short}}`)
  }
  const allOk = k1.ok && (!k2 || k2.ok)
  return {
    result: res.join(',\\quad '),
    extra,
    steps,
    remark: allOk
      ? `Die ${name} ist sauber genug für PCR, Restriktion oder Sequenzierung. Tipp: in leicht basischem Puffer (TE, pH 8) messen – in saurem Wasser fällt $A_{260}/A_{280}$ zu niedrig aus.`
      : `Die ${name}-Probe ist nicht ganz rein (siehe Bewertung). Tipp: in leicht basischem Puffer (TE, pH 8) messen – in saurem Wasser fällt $A_{260}/A_{280}$ zu niedrig aus.`,
  }
}

/* ---------------------------- c) ng ↔ pmol ↔ Kopien ---------------------------- */

export type Strand = 'ds' | 'ss' | 'rna'
export type AmountGiven = 'm' | 'n' | 'N'

/** mittlere molare Masse pro Baustein (Natriumsalz) in g/mol */
export const PER_UNIT: Record<Strand, { M: number; u: 'bp' | 'nt'; name: string; note: string }> = {
  ds: { M: 650, u: 'bp', name: 'dsDNA', note: 'Für doppelsträngige DNA rechnet man mit $650\\,\\text{g/mol}$ pro Basenpaar (Mittelwert, Natriumsalz). Manche Tabellen nehmen $660\\,\\text{g/mol}$ – das Ergebnis ändert sich dadurch nur um etwa 1,5 %.' },
  ss: { M: 330, u: 'nt', name: 'ssDNA/Oligo', note: 'Für einzelsträngige DNA (auch Oligonukleotide und Primer) rechnet man mit etwa $330\\,\\text{g/mol}$ pro Nukleotid.' },
  rna: { M: 340, u: 'nt', name: 'RNA', note: 'Für RNA rechnet man mit etwa $340\\,\\text{g/mol}$ pro Nukleotid (Ribose hat ein O-Atom mehr als Desoxyribose).' },
}

export function ngPmol(o: { strand: Strand; L: NumIn | null; given: AmountGiven; value: NumIn | null; unit: string; Mb?: NumIn | null }): Solution {
  const info = PER_UNIT[o.strand]
  if (!info) throw new CalcError('Bitte die Art der Nukleinsäure wählen.')
  const L = pos(o.L, `Bitte die Länge in ${info.u} eingeben.`, 'Die Länge muss größer als 0 sein.')
  const Mb = o.Mb ? pos(o.Mb, '', 'Die molare Masse pro Baustein muss größer als 0 sein.') : q(info.M)
  const x = pos(o.value, o.given === 'm' ? 'Bitte die Masse eingeben.' : o.given === 'n' ? 'Bitte die Stoffmenge eingeben.' : 'Bitte die Kopienzahl eingeben.', 'Der Wert muss größer als 0 sein.')
  const ut = T(info.u)
  const steps: Step[] = []
  const gName = o.given === 'm' ? `m = ${tx(x)}${T(o.unit)}` : o.given === 'n' ? `n = ${tx(x)}${T(o.unit)}` : `N = ${tx(x)}\\ \\text{Kopien}`
  steps.push({ tex: `L = ${tx(L)}${ut},\\quad ${gName}`, head: 'Gegeben', note: o.Mb ? `Eigener Wert: $${tx(Mb)}\\,\\text{g/mol}$ pro ${info.u === 'bp' ? 'Basenpaar' : 'Nukleotid'}.` : info.note })
  const M = mul(L, Mb)
  steps.push({ tex: `M = L \\cdot ${tx(Mb)}${T('g/mol')} = ${tx(L)} \\cdot ${tx(Mb)}${T('g/mol')} ${eqq(M, 6)}${GMOL}`, head: 'Molare Masse', note: `Länge mal mittlere molare Masse pro ${info.u === 'bp' ? 'Basenpaar' : 'Nukleotid'}.` })
  let n: Q
  let m: Q
  const res: string[] = []
  const extra: string[] = []
  if (o.given === 'm') {
    const fu = fac(NA_MASS_U, o.unit)
    m = mul(x, fu)
    if (o.unit !== 'g') steps.push({ tex: `m = ${tx(x)}${T(o.unit)} ${eqq(m)}${T('g')}`, head: 'Einheiten umrechnen', note: 'Masse in Gramm – passend zu g/mol.' })
    n = div(m, M)
    const nb = best(n, NA_MOL_U)
    steps.push({ tex: `n = \\frac{m}{M} = \\frac{${ntq(m)}${T('g')}}{${ntq(M, 6)}${GMOL}} ${eqq(n)}${T('mol')} ${eqq(nb.v)}${T(nb.u)}`, head: 'Stoffmenge', note: 'Gramm kürzt sich weg, übrig bleibt mol.', final: true })
    res.push(`n ${eqq(nb.v)}${T(nb.u)}`)
  } else if (o.given === 'n') {
    n = mul(x, fac(NA_MOL_U, o.unit))
    steps.push({ tex: `n = ${tx(x)}${T(o.unit)} ${eqq(n)}${T('mol')}`, head: 'Einheiten umrechnen', note: 'Stoffmenge in mol.' })
    m = mul(n, M)
    const mb = best(m, NA_MASS_U)
    steps.push({ tex: `m = n \\cdot M = ${ntq(n)}${T('mol')} \\cdot ${ntq(M, 6)}${GMOL} ${eqq(m)}${T('g')} ${eqq(mb.v)}${T(mb.u)}`, head: 'Masse', note: 'mol kürzt sich weg, übrig bleibt Gramm.', final: true })
    res.push(`m ${eqq(mb.v)}${T(mb.u)}`)
  } else {
    n = div(x, NA)
    const nb = best(n, NA_MOL_U)
    steps.push({ tex: `n = \\frac{N}{N_A} = \\frac{${ntq(x)}}{${NA_TEX}} ${eqq(n)}${T('mol')} ${eqq(nb.v)}${T(nb.u)}`, head: 'Stoffmenge', note: 'Avogadro-Konstante: 1 mol enthält $6{,}022 \\cdot 10^{23}$ Moleküle.' })
    m = mul(n, M)
    const mb = best(m, NA_MASS_U)
    steps.push({ tex: `m = n \\cdot M = ${ntq(n)}${T('mol')} \\cdot ${ntq(M, 6)}${GMOL} ${eqq(m)}${T('g')} ${eqq(mb.v)}${T(mb.u)}`, head: 'Masse', note: 'So viel DNA enthält die gewünschte Kopienzahl.', final: true })
    res.push(`m ${eqq(mb.v)}${T(mb.u)}`, `n ${eqq(nb.v)}${T(nb.u)}`)
  }
  if (o.given !== 'N') {
    const N = mul(n, NA)
    steps.push({ tex: `N = n \\cdot N_A = ${ntq(n)}${T('mol')} \\cdot ${NA_TEX} ${eqq(N)}`, head: 'Kopienzahl', note: `Anzahl der ${o.strand === 'ds' ? 'DNA-Doppelstränge' : 'Moleküle'}: Stoffmenge mal Avogadro-Konstante.`, final: true })
    res.push(`N ${eqq(N)}\\ \\text{Kopien}`)
  }
  extra.push(`M ${eqq(M, 6)}${GMOL}\\ (${tx(L)}${ut} \\cdot ${tx(Mb)}${T('g/mol')})`)
  // Faustregel zur Probe
  const per = div(q(1_000_000), mul(Mb, L)) // pmol pro µg
  extra.push(`1${T('µg')} \\;\\widehat{=}\\; ${ntq(per)}${T('pmol')}`)
  return {
    result: res.join(',\\quad '),
    extra,
    steps,
    remark: `Faustregel: $n\\,[\\text{pmol}] = \\dfrac{m\\,[\\mu\\text{g}] \\cdot 10^{6}}{L \\cdot ${tx(Mb)}}$ – für 1 µg dieser ${info.name} also $${ntq(per)}\\,\\text{pmol}$.`,
  }
}

/* ---------------------------- d) Ligation ---------------------------- */

export function ligation(o: { mV: NumIn | null; LV: NumIn | null; LI: NumIn | null; rI?: NumIn | null; rV?: NumIn | null; cV?: NumIn | null; cI?: NumIn | null }): Solution {
  const mV = pos(o.mV, 'Bitte die Masse des Vektors in ng eingeben.', 'Die Vektormasse muss größer als 0 sein.')
  const LV = pos(o.LV, 'Bitte die Länge des Vektors in bp eingeben.', 'Die Vektorlänge muss größer als 0 sein.')
  const LI = pos(o.LI, 'Bitte die Länge des Inserts in bp eingeben.', 'Die Insertlänge muss größer als 0 sein.')
  const rI = o.rI ? pos(o.rI, '', 'Das Verhältnis muss größer als 0 sein.') : q(3)
  const rV = o.rV ? pos(o.rV, '', 'Das Verhältnis muss größer als 0 sein.') : ONE
  const steps: Step[] = []
  steps.push({
    tex: `m_V = ${tx(mV)}${T('ng')},\\quad L_V = ${tx(LV)}${T('bp')},\\quad L_I = ${tx(LI)}${T('bp')},\\quad n_I : n_V = ${tx(rI)} : ${tx(rV)}`,
    head: 'Gegeben',
    note: 'V = Vektor (Plasmid), I = Insert. Das Verhältnis gibt an, wie viele Insert-Moleküle auf ein Vektor-Molekül kommen (Standard 3 : 1).',
  })
  steps.push({
    tex: 'm_I = m_V \\cdot \\frac{L_I}{L_V} \\cdot \\frac{n_I}{n_V}',
    head: 'Formel',
    note: 'Gleich viele Moleküle wiegen proportional zu ihrer Länge (jedes Basenpaar wiegt gleich viel). Für mehr Insert-Moleküle mit dem Verhältnis malnehmen.',
  })
  const mI = mul(mul(mV, div(LI, LV)), div(rI, rV))
  steps.push({ tex: `m_I = ${tx(mV)}${T('ng')} \\cdot \\frac{${tx(LI)}${T('bp')}}{${tx(LV)}${T('bp')}} \\cdot \\frac{${tx(rI)}}{${tx(rV)}} ${eqq(mI)}${T('ng')}`, head: 'Einsetzen', note: 'bp kürzt sich weg, übrig bleibt ng.', final: true })
  // Probe über die Stoffmengen (650 g/mol pro bp)
  const per = q(650)
  const nV = div(mul(mV, q(1, 1_000_000_000)), mul(LV, per))
  const nI = div(mul(mI, q(1, 1_000_000_000)), mul(LI, per))
  const fV = mul(nV, q(10n ** 15n))
  const fI = mul(nI, q(10n ** 15n))
  steps.push({
    tex: `n_V = \\frac{${tx(mV)}${T('ng')}}{${tx(LV)} \\cdot 650${GMOL}} ${eqq(fV)}${T('fmol')},\\quad n_I = \\frac{${ntq(mI)}${T('ng')}}{${tx(LI)} \\cdot 650${GMOL}} ${eqq(fI)}${T('fmol')}`,
    head: 'Probe',
    note: 'Stoffmengen mit $650\\,\\text{g/mol}$ pro Basenpaar (1 ng = $10^{-9}$ g, 1 fmol = $10^{-15}$ mol).',
  })
  steps.push({ tex: `\\frac{n_I}{n_V} ${eqq(div(fI, fV))} = \\frac{${tx(rI)}}{${tx(rV)}}\\ \\checkmark`, note: 'Das gewünschte molare Verhältnis stimmt.' })
  const extra = [`n_V ${eqq(fV)}${T('fmol')},\\quad n_I ${eqq(fI)}${T('fmol')}`]
  const vols: string[] = []
  if (o.cI) {
    const cI = pos(o.cI, '', 'Die Insert-Konzentration muss größer als 0 sein.')
    const VI = div(mI, cI)
    steps.push({ tex: `V_I = \\frac{m_I}{c_I} = \\frac{${ntq(mI)}${T('ng')}}{${tx(cI)}${T('ng/µL')}} ${eqq(VI)}${T('µL')}`, head: 'Pipettiervolumen', note: 'So viel Insert-Lösung in den Ansatz geben.', final: true })
    vols.push(`V_I ${eqq(VI)}${T('µL')}`)
  }
  if (o.cV) {
    const cV = pos(o.cV, '', 'Die Vektor-Konzentration muss größer als 0 sein.')
    const VV = div(mV, cV)
    steps.push({ tex: `V_V = \\frac{m_V}{c_V} = \\frac{${tx(mV)}${T('ng')}}{${tx(cV)}${T('ng/µL')}} ${eqq(VV)}${T('µL')}`, head: o.cI ? undefined : 'Pipettiervolumen', note: 'So viel Vektor-Lösung in den Ansatz geben.', final: true })
    vols.push(`V_V ${eqq(VV)}${T('µL')}`)
  }
  if (vols.length) extra.unshift(vols.join(',\\quad '))
  return {
    result: `m_{\\text{Insert}} ${eqq(mI)}${T('ng')}`,
    extra,
    steps,
    remark: 'Üblich sind Insert : Vektor = 1 : 1 bis 3 : 1; bei sehr kleinen Inserts auch 5 : 1 und mehr. Als Kontrolle einen Ansatz ohne Insert (nur Vektor) mitlaufen lassen.',
  }
}

/* ---------------------------- e) Primer ---------------------------- */

export interface PrimerCounts {
  seq: string
  N: number
  A: number
  C: number
  G: number
  T: number
}

/** Sequenz bereinigen (Leerzeichen, Groß/klein, 5′-/3′-Markierung) und prüfen */
export function cleanSeq(src: string): PrimerCounts {
  let s = src.toUpperCase().replace(/\s+/g, '')
  s = s.replace(/^5['′’]?-?/, '').replace(/-?3['′’]?$/, '')
  if (!s) throw new CalcError('Bitte eine Primersequenz eingeben (nur A, C, G und T).')
  const bad = [...new Set(s.replace(/[ACGT]/g, ''))]
  if (bad.length) {
    if (bad.includes('U')) throw new CalcError('U kommt nur in RNA vor – für einen DNA-Primer bitte T statt U schreiben.')
    throw new CalcError(`Ungültige Zeichen in der Sequenz: ${bad.slice(0, 6).join(' ')} – erlaubt sind nur A, C, G und T.`)
  }
  if (s.length < 6) throw new CalcError('Die Sequenz ist zu kurz – ein Primer hat meist 18 bis 25 Basen.')
  if (s.length > 100) throw new CalcError('Die Sequenz ist zu lang – die Formeln gelten für Oligonukleotide bis etwa 100 Basen.')
  const cnt = (b: string) => s.split(b).length - 1
  return { seq: s, N: s.length, A: cnt('A'), C: cnt('C'), G: cnt('G'), T: cnt('T') }
}

const COMP: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' }
export const revComp = (s: string) => [...s].reverse().map((b) => COMP[b]).join('')

/** Molare Masse eines Oligos ohne 5′-Phosphat (wasserfrei) */
export function oligoMass(c: PrimerCounts): Q {
  return sub(add(add(mul(q(c.A), qFromRaw('313.21')), mul(q(c.T), qFromRaw('304.2'))), add(mul(q(c.C), qFromRaw('289.18')), mul(q(c.G), qFromRaw('329.21')))), qFromRaw('61.96'))
}

/** Tm nach Wallace: 2·(A+T) + 4·(G+C) in °C */
export const tmWallace = (c: PrimerCounts) => 2 * (c.A + c.T) + 4 * (c.G + c.C)
/** Tm = 64,9 + 41·(G+C − 16,4)/N in °C (exakt als Bruch) */
export const tmGC = (c: PrimerCounts): Q => add(qFromRaw('64.9'), div(mul(q(41), sub(q(c.G + c.C), qFromRaw('16.4'))), q(c.N)))

const seqTex = (s: string) => `5'\\text{-}\\texttt{${s}}\\text{-}3'`

export function primerTm(src: string): Solution {
  const c = cleanSeq(src)
  const gc = c.G + c.C
  const at = c.A + c.T
  const steps: Step[] = []
  steps.push({ tex: `${seqTex(c.seq)} \\quad (N = ${c.N}\\ \\text{nt})`, head: 'Sequenz', note: 'Leerzeichen, Groß- und Kleinschreibung sowie die Markierung 5′ … 3′ werden ignoriert.' })
  steps.push({ tex: `n_{\\mathrm{A}} = ${c.A},\\quad n_{\\mathrm{T}} = ${c.T},\\quad n_{\\mathrm{G}} = ${c.G},\\quad n_{\\mathrm{C}} = ${c.C}`, head: 'Basen zählen', note: `Probe: $${c.A} + ${c.T} + ${c.G} + ${c.C} = ${c.N}$.` })
  const gcp = q(gc * 100, c.N)
  steps.push({ tex: `\\text{GC} = \\frac{n_{\\mathrm{G}} + n_{\\mathrm{C}}}{N} \\cdot 100\\,\\% = \\frac{${gc}}{${c.N}} \\cdot 100\\,\\% ${eqq(gcp)}\\,\\%`, head: 'GC-Gehalt', note: 'G-C-Paare halten mit drei Wasserstoffbrücken stärker zusammen als A-T-Paare (zwei) – mehr GC heißt höhere Schmelztemperatur.' })
  const tw = tmWallace(c)
  const tg = tmGC(c)
  const tgn = toNum(tg)
  const wallaceBest = c.N <= 13
  steps.push({
    tex: `T_m = 2\\,^{\\circ}\\text{C} \\cdot (n_{\\mathrm{A}} + n_{\\mathrm{T}}) + 4\\,^{\\circ}\\text{C} \\cdot (n_{\\mathrm{G}} + n_{\\mathrm{C}}) = 2 \\cdot ${at} + 4 \\cdot ${gc} = ${tw}\\,^{\\circ}\\text{C}`,
    head: 'Wallace-Regel',
    note: 'Faustregel für kurze Oligonukleotide (unter 14 nt, oft auch bis 20 nt benutzt): jedes A oder T zählt 2 °C, jedes G oder C 4 °C.',
    final: wallaceBest,
  })
  steps.push({
    tex: `T_m = 64{,}9\\,^{\\circ}\\text{C} + 41\\,^{\\circ}\\text{C} \\cdot \\frac{(n_{\\mathrm{G}} + n_{\\mathrm{C}}) - 16{,}4}{N} = 64{,}9 + 41 \\cdot \\frac{${gc} - 16{,}4}{${c.N}} ${fixEqv(tgn, 1)}\\,^{\\circ}\\text{C}`,
    head: 'GC-Formel',
    note: 'Genauer für längere Primer (ab etwa 14 nt); gilt für übliche PCR-Bedingungen (etwa 50 mM Na⁺, 50 nM Primer).',
    final: !wallaceBest,
  })
  const tm = wallaceBest ? tw : tgn
  const choice = wallaceBest
    ? `Bei ${c.N} nt passt die Wallace-Regel.`
    : c.N <= 20
      ? `Bei ${c.N} nt sind beide Formeln üblich; die GC-Formel ist genauer – die Wallace-Regel liefert ${tw} °C als grobe Schätzung.`
      : `Bei ${c.N} nt überschätzt die Wallace-Regel die Schmelztemperatur – die GC-Formel verwenden.`
  steps.push({ tex: `T_a \\approx T_m - 5\\,^{\\circ}\\text{C} ${fixEqv(tm - 5, 1)}\\,^{\\circ}\\text{C}`, head: 'Annealing-Temperatur', note: `${choice} Als Startwert für die Anlagerungstemperatur nimmt man etwa $T_m - 5\\,^{\\circ}\\text{C}$.` })
  const M = oligoMass(c)
  steps.push({
    tex: `M = 313{,}21 \\cdot ${c.A} + 304{,}2 \\cdot ${c.T} + 289{,}18 \\cdot ${c.C} + 329{,}21 \\cdot ${c.G} - 61{,}96 ${fixEqv(toNum(M), 2)}${GMOL}`,
    head: 'Molare Masse',
    note: `Summe der Nukleotide (A, T, C, G) minus $61{,}96\\,\\text{g/mol}$ für die Enden (ohne 5′-Phosphat). Probe mit der Faustregel: $${c.N} \\cdot 330\\,\\text{g/mol} = ${fixTex(c.N * 330, 0)}\\,\\text{g/mol}$.`,
  })
  steps.push({ tex: seqTex(revComp(c.seq)), head: 'Gegenstrang', note: 'Revers-komplementär (A↔T, G↔C, rückwärts gelesen) – so sieht die Bindestelle auf dem anderen Strang aus.' })
  // Qualitätsregeln
  const tips: string[] = []
  const gcv = toNum(gcp)
  tips.push(gcv >= 40 && gcv <= 60 ? 'GC-Gehalt im Zielbereich 40–60 % ✓' : 'GC-Gehalt außerhalb von 40–60 %')
  tips.push(c.N >= 18 && c.N <= 25 ? 'Länge 18–25 nt ✓' : `Länge ${c.N} nt (üblich: 18–25 nt)`)
  const last = c.seq[c.N - 1]
  tips.push(last === 'G' || last === 'C' ? '3′-Ende G/C (GC-Klammer) ✓' : '3′-Ende ohne G/C – die Bindung am 3′-Ende ist schwächer')
  if (/(A{4,}|C{4,}|G{4,}|T{4,})/.test(c.seq)) tips.push('Achtung: vier oder mehr gleiche Basen hintereinander')
  return {
    result: `T_m ${wallaceBest ? `= ${tw}` : fixEqv(tgn, 1)}\\,^{\\circ}\\text{C}\\ (\\text{${wallaceBest ? 'Wallace' : 'GC-Formel'}})`,
    extra: [`\\text{GC} ${eqq(gcp)}\\,\\%,\\quad N = ${c.N}\\ \\text{nt}`, wallaceBest ? `T_m ${fixEqv(tgn, 1)}\\,^{\\circ}\\text{C}\\ (\\text{GC-Formel})` : `T_m = ${tw}\\,^{\\circ}\\text{C}\\ (\\text{Wallace})`, `M ${fixEqv(toNum(M), 2)}${GMOL}`],
    steps,
    remark: `${tips.join(' · ')}. Die beiden Primer eines Paares sollten sich in $T_m$ um höchstens etwa 5 °C unterscheiden.`,
  }
}

/* ---------------------------- f) Protein aus A280 ---------------------------- */

export type ProteinMode = 'molar' | 'masse'

export function proteinA280(o: { A: NumIn | null; mode: ProteinMode; eps?: NumIn | null; M?: NumIn | null; a?: NumIn | null; F?: NumIn | null; d?: NumIn | null; du?: string }): Solution {
  const A = pos(o.A, 'Bitte die gemessene Absorption $A_{280}$ eingeben.', 'Die Absorption $A_{280}$ muss größer als 0 sein.')
  const Fd = dilution(o.F)
  const p = pathCm(o.d, o.du)
  const fOne = eq(Fd, ONE)
  const steps: Step[] = []
  const conv = () => {
    if (p.du === 'mm') steps.push({ tex: `d = ${tx(p.dIn)}${T('mm')} = ${ntq(p.d)}${T('cm')}`, head: 'Einheiten umrechnen', note: 'Schichtdicke in cm – passend zum Extinktionskoeffizienten.' })
  }
  const dTex = `${ntq(p.d)}${T('cm')}`
  const fPart = fOne ? '' : ` \\cdot ${tx(Fd)}`
  const remark = 'Die Absorption bei 280 nm stammt vor allem von Tryptophan und Tyrosin – die Methode gilt nur für reine Proteinlösungen. Nukleinsäuren stören (sie absorbieren auch bei 280 nm).'
  if (o.mode === 'masse') {
    const a = pos(o.a, 'Bitte den Massen-Extinktionskoeffizienten eingeben (A280 einer Lösung mit 1 mg/mL, z. B. BSA 0,66).', 'Der Extinktionskoeffizient muss größer als 0 sein.')
    steps.push({
      tex: `A_{280} = ${tx(A)},\\quad a = ${tx(a)}${EPSM_TEX},\\quad d = ${tx(p.dIn)}${T(p.du)}${fOne ? '' : `,\\quad F = ${tx(Fd)}`}`,
      head: 'Gegeben',
      note: `$a$ ist die Absorption einer Lösung mit $1\\,\\text{mg/mL}$ bei $d = 1\\,\\text{cm}$ (oft als $E^{1\\%} = 10 \\cdot a = ${ntq(mul(a, q(10)))}$ angegeben, das ist die Absorption bei 10 mg/mL).`,
    })
    conv()
    steps.push({ tex: `\\beta = \\frac{A_{280}}{a \\cdot d}${fOne ? '' : ' \\cdot F'}`, head: 'Formel', note: 'Lambert-Beer mit Massenkonzentration: $A = a \\cdot \\beta \\cdot d$, nach $\\beta$ umgestellt.' + (fOne ? '' : ' $F$ rechnet die Verdünnung zurück.') })
    const beta = div(mul(A, Fd), mul(a, p.d))
    steps.push({ tex: `\\beta = \\frac{${tx(A)}}{${tx(a)}${EPSM_TEX} \\cdot ${dTex}}${fPart} ${eqq(beta)}${T('mg/mL')}`, head: 'Einsetzen', note: 'cm kürzt sich weg, übrig bleibt mg/mL.', final: true })
    return { result: `\\beta ${eqq(beta)}${T('mg/mL')}`, extra: [`\\beta ${eqq(beta)}${T('g/L')} ${eqq(mul(beta, q(1000)))}${T('µg/mL')}`], steps, remark }
  }
  const eps = pos(o.eps, 'Bitte den molaren Extinktionskoeffizienten ε eingeben (L/(mol·cm)).', 'Der Extinktionskoeffizient muss größer als 0 sein.')
  const M = o.M ? pos(o.M, '', 'Die molare Masse muss größer als 0 sein.') : null
  const given = [`A_{280} = ${tx(A)}`, `\\varepsilon = ${tx(eps)}${EPS_TEX}`]
  if (M) given.push(`M = ${tx(M)}${GMOL}`)
  given.push(`d = ${tx(p.dIn)}${T(p.du)}`)
  if (!fOne) given.push(`F = ${tx(Fd)}`)
  steps.push({ tex: given.join(',\\quad '), head: 'Gegeben', note: 'Den molaren Extinktionskoeffizienten berechnet man aus der Aminosäuresequenz (Trp, Tyr, Cystin) oder nimmt ihn aus dem Datenblatt.' })
  conv()
  steps.push({ tex: `A_{280} = \\varepsilon \\cdot c \\cdot d \\;\\Rightarrow\\; c = \\frac{A_{280}}{\\varepsilon \\cdot d}${fOne ? '' : ' \\cdot F'}`, head: 'Formel', note: 'Lambert-Beer-Gesetz, nach $c$ umgestellt.' + (fOne ? '' : ' $F$ rechnet die Verdünnung zurück.') })
  const c = div(mul(A, Fd), mul(eps, p.d))
  const cb = best(c, [{ u: 'mol/L', f: ONE }, { u: 'mmol/L', f: q(1, 1000) }, { u: 'µmol/L', f: q(1, 1_000_000) }, { u: 'nmol/L', f: q(1, 1_000_000_000) }])
  steps.push({
    tex: `c = \\frac{${tx(A)}}{${tx(eps)}${EPS_TEX} \\cdot ${dTex}}${fPart} ${eqq(c)}${T('mol/L')}${cb.u !== 'mol/L' ? ` ${eqq(cb.v)}${T(cb.u)}` : ''}`,
    head: 'Einsetzen',
    note: 'cm kürzt sich weg, aus $\\frac{1}{\\text{L/mol}}$ wird mol/L.',
    final: !M,
  })
  const extra: string[] = []
  let result = `c ${eqq(cb.v)}${T(cb.u)}`
  if (M) {
    const beta = mul(c, M)
    steps.push({ tex: `\\beta = c \\cdot M = ${ntq(c)}${T('mol/L')} \\cdot ${tx(M)}${GMOL} ${eqq(beta)}${T('g/L')} ${eqq(beta)}${T('mg/mL')}`, head: 'Massenkonzentration', note: 'mol kürzt sich weg; $1\\,\\text{g/L} = 1\\,\\text{mg/mL}$.', final: true })
    const am = div(eps, M)
    extra.push(result)
    extra.push(`a = \\frac{\\varepsilon}{M} ${eqq(am)}${EPSM_TEX}\\ (A_{280}\\ \\text{bei}\\ 1\\,\\text{mg/mL})`)
    result = `\\beta ${eqq(beta)}${T('mg/mL')}`
  }
  return { result, extra, steps, remark }
}

/* ---------------------------- g) Fällung mit Natrium- oder Ammoniumacetat ---------------------------- */

export type PrecSalt = 'naac' | 'nh4ac'
export type PrecAlcohol = 'ethanol' | 'isopropanol'

/** Salze für die Alkoholfällung: Stammkonzentration (mol/L) und Volumenanteil (Faustregel) */
export const PREC_SALTS: Record<PrecSalt, { name: string; tex: string; ion: string; c: Q; f: Q; fTex: string; note: string }> = {
  naac: {
    name: 'Natriumacetat',
    tex: '\\text{Natriumacetat}',
    ion: '\\mathrm{Na^+}',
    c: q(3),
    f: q(1, 10),
    fTex: '\\tfrac{1}{10}',
    note: 'Faustregel: $\\tfrac{1}{10}$ Volumen 3 M Natriumacetat (pH 5,2) – das ergibt etwa 0,3 mol/L.',
  },
  nh4ac: {
    name: 'Ammoniumacetat',
    tex: '\\text{Ammoniumacetat}',
    ion: '\\mathrm{NH_4^+}',
    c: qFromRaw('7.5'),
    f: q(1, 2),
    fTex: '\\tfrac{1}{2}',
    note: 'Faustregel: $\\tfrac{1}{2}$ Volumen 7,5 M Ammoniumacetat – das ergibt 2,5 mol/L. Freie Nukleotide (dNTPs) bleiben dabei eher in Lösung.',
  },
}
export const PREC_ALCOHOLS: Record<PrecAlcohol, { name: string; k: Q }> = {
  ethanol: { name: 'Ethanol', k: qFromRaw('2.5') },
  isopropanol: { name: 'Isopropanol', k: qFromRaw('0.7') },
}

/** Ethanol- bzw. Isopropanolfällung von DNA/RNA: Salz- und Alkoholvolumen */
export function precipitation(o: { V: NumIn | null; vu?: string; salt: PrecSalt; alcohol: PrecAlcohol; k?: NumIn | null }): Solution {
  const Vin = pos(o.V, 'Bitte das Volumen der DNA-Lösung eingeben.', 'Das Volumen muss größer als 0 sein.')
  const S = PREC_SALTS[o.salt] ?? PREC_SALTS.naac
  const Al = PREC_ALCOHOLS[o.alcohol] ?? PREC_ALCOHOLS.ethanol
  const k = o.k ? pos(o.k, '', 'Der Volumenfaktor für den Alkohol muss größer als 0 sein.') : Al.k
  if (toNum(k) > 10) throw new CalcError('Der Volumenfaktor ist ungewöhnlich groß – üblich sind 2 bis 3 (Ethanol) bzw. 0,7 bis 1 (Isopropanol).')
  const UL = T('µL')
  const steps: Step[] = []
  const V = o.vu === 'mL' ? mul(Vin, q(1000)) : Vin
  steps.push({
    tex: `V_{\\text{Probe}} = ${tx(Vin)}${T(o.vu === 'mL' ? 'mL' : 'µL')},\\quad ${S.tex}\\ ${tx(S.c)}${T('mol/L')},\\quad \\text{${Al.name}: } ${tx(k)}\\text{-faches Volumen}`,
    head: 'Gegeben',
    note: 'Bei der Fällung schirmen die Kationen des Salzes die negativ geladenen Phosphatgruppen ab, der Alkohol entzieht die Hydrathülle – die Nukleinsäure fällt aus und lässt sich abzentrifugieren.',
  })
  if (o.vu === 'mL') steps.push({ tex: `V_{\\text{Probe}} = ${tx(Vin)}${T('mL')} = ${ntq(V)}${UL}`, head: 'Einheiten umrechnen', note: 'Alles in µL rechnen.' })
  const Vs = mul(S.f, V)
  steps.push({ tex: `V_{\\text{Salz}} = ${S.fTex} \\cdot V_{\\text{Probe}} = ${S.fTex} \\cdot ${ntq(V)}${UL} ${eqq(Vs)}${UL}`, head: `${S.name} zugeben`, note: S.note })
  const V1 = add(V, Vs)
  const cE = div(mul(S.c, Vs), V1)
  steps.push({
    tex: `c(${S.ion}) = \\frac{c_{\\text{Stamm}} \\cdot V_{\\text{Salz}}}{V_{\\text{Probe}} + V_{\\text{Salz}}} = \\frac{${tx(S.c)}${T('mol/L')} \\cdot ${ntq(Vs)}${UL}}{${ntq(V1)}${UL}} ${eqq(cE)}${T('mol/L')}`,
    note: 'Verdünnungsgleichung $c_1 \\cdot V_1 = c_2 \\cdot V_2$: Das Salz verteilt sich auf Probe plus Salzlösung.',
  })
  const Va = mul(k, V1)
  steps.push({
    tex: `V_{\\text{${Al.name}}} = ${tx(k)} \\cdot (V_{\\text{Probe}} + V_{\\text{Salz}}) = ${tx(k)} \\cdot ${ntq(V1)}${UL} ${eqq(Va)}${UL}`,
    head: `${Al.name} zugeben`,
    note: o.alcohol === 'isopropanol' ? 'Isopropanol (100 %, Raumtemperatur): 0,7- bis 1-faches Volumen genügt.' : 'Eiskaltes Ethanol (100 %): das 2- bis 2,5-fache Volumen von Probe plus Salz (bei RNA oft das 3-fache).',
    final: true,
  })
  const Vt = add(V1, Va)
  const phi = mul(div(Va, Vt), q(100))
  steps.push({
    tex: `V_{\\text{gesamt}} = ${ntq(V)} + ${ntq(Vs)} + ${ntq(Va)} ${eqq(Vt)}${UL},\\quad \\varphi(\\text{${Al.name}}) = \\frac{${ntq(Va)}}{${ntq(Vt)}} \\cdot 100\\,\\% ${eqq(phi)}\\,\\%`,
    head: 'Kontrolle',
    note: o.alcohol === 'isopropanol' ? 'Etwa 40 % Isopropanol reichen für die Fällung.' : 'Rund 70 % Ethanol im Ansatz – dabei fällt die Nukleinsäure aus.',
  })
  const tips = [
    o.alcohol === 'isopropanol' ? 'Bei Raumtemperatur fällen (sonst fallen Salze mit aus)' : 'Mindestens 30 min bei −20 °C fällen',
    '15–30 min bei mindestens 12 000 × g und 4 °C zentrifugieren',
    'Pellet mit 70 % Ethanol waschen, kurz trocknen und in TE-Puffer oder Wasser lösen',
  ]
  if (cmpTube(Vt)) tips.push('Achtung: mehr als 1,5 mL – auf zwei Gefäße verteilen oder ein 2-mL-Gefäß nehmen')
  return {
    result: `V_{\\text{Salz}} ${eqq(Vs)}${UL},\\quad V_{\\text{${Al.name}}} ${eqq(Va)}${UL}`,
    extra: [`c(${S.ion}) ${eqq(cE)}${T('mol/L')},\\quad \\varphi(\\text{${Al.name}}) ${eqq(phi)}\\,\\%`, `V_{\\text{gesamt}} ${eqq(Vt)}${UL}`],
    steps,
    remark: `${tips.join('. ')}.${o.salt === 'nh4ac' ? ' Ammoniumacetat nicht verwenden, wenn die DNA danach mit T4-Polynukleotidkinase phosphoryliert werden soll – Ammoniumionen hemmen das Enzym.' : ''}`,
  }
}

/** passt der Ansatz nicht mehr in ein 1,5-mL-Gefäß? (V in µL) */
const cmpTube = (Vt: Q) => toNum(Vt) > 1500
