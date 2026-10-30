/**
 * PCR-Ansatz: Mastermix für n Proben (für jede Komponente c₁ · V₁ = c₂ · V₂, Wasser auffüllen,
 * Pipettierschema) und lyophilisierte Primer lösen (Stammlösung, Arbeitslösung).
 * Alle Volumina exakt mit Brüchen.
 */
import { add, CalcError, cmp, div, isInt, isZero, mul, ONE, q, sign, sub, toNum, ZERO, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { fac, T, type Unit } from './units'
import { eqq, ntq, pos, tx } from './nucleic'

const UL = T('µL')

/* ---------------------------- a) Mastermix ---------------------------- */

export type Reserve = 'eins' | 'zehn' | 'keine'

export interface CompDef {
  key: string
  /** Name in Tabelle und Eingabe */
  name: string
  /** Name im Lösungsweg (TeX) */
  tex: string
  /** Einheit von Stamm- und Endkonzentration: '×', 'mM', 'µM', 'U/µL' */
  unit: string
  /** Vorgaben (Text für die Eingabefelder) */
  stock: string
  end: string
  /** Hinweis zur Komponente (Text mit $TeX$) */
  note?: string
}

/** Standardansatz (50 µL): 1× Puffer, 0,2 mM dNTPs, je 0,4 µM Primer, 1,5 mM MgCl₂, 1,25 U Polymerase */
export const PCR_COMPONENTS: CompDef[] = [
  { key: 'puf', name: 'Puffer', tex: '\\text{Puffer}', unit: '×', stock: '10', end: '1', note: 'Der Puffer wird als 10-fach konzentrierte Lösung ($10\\times$) geliefert und auf $1\\times$ verdünnt.' },
  { key: 'dntp', name: 'dNTPs (je)', tex: '\\text{dNTPs}', unit: 'mM', stock: '10', end: '0,2', note: 'Konzentration je Nukleotid (dATP, dCTP, dGTP, dTTP).' },
  { key: 'fw', name: 'Primer forward', tex: '\\text{Primer fw}', unit: 'µM', stock: '10', end: '0,4' },
  { key: 'rev', name: 'Primer reverse', tex: '\\text{Primer rev}', unit: 'µM', stock: '10', end: '0,4' },
  { key: 'mg', name: 'MgCl₂', tex: '\\mathrm{MgCl_2}', unit: 'mM', stock: '25', end: '1,5', note: 'Nur wenn der Puffer kein Magnesium enthält – sonst Endkonzentration 0 eintragen.' },
  { key: 'pol', name: 'Polymerase', tex: '\\text{Polymerase}', unit: 'U/µL', stock: '5', end: '0,025' },
]

export interface CompIn {
  name: string
  tex: string
  unit: string
  stock: NumIn | null
  end: NumIn | null
  note?: string
}

export interface MixRow {
  name: string
  /** TeX-Zellen */
  stock: string
  end: string
  per: string
  total: string
}

export interface MixOut extends Solution {
  rows: MixRow[]
  foot: MixRow
  /** Anzahl Ansätze im Mastermix (n + Reserve) */
  factor: Q
}

/** Konzentration mit Einheit als TeX; „10×“ für Puffer */
export const concTex = (x: Q, unit: string) => (unit === '×' ? `${tx(x)}\\times` : `${tx(x)}${T(unit)}`)

export function mastermix(o: { n: NumIn | null; reserve: Reserve; V: NumIn | null; template?: NumIn | null; comps: CompIn[] }): MixOut {
  if (!o.n) throw new CalcError('Bitte die Anzahl der Proben eingeben.')
  if (!isInt(o.n.q) || sign(o.n.q) <= 0) throw new CalcError('Die Anzahl der Proben muss eine ganze Zahl ab 1 sein.')
  if (toNum(o.n.q) > 1000) throw new CalcError('Mehr als 1000 Proben – bitte auf mehrere Mastermixe aufteilen.')
  const V = pos(o.V, 'Bitte das Reaktionsvolumen eingeben (z. B. 25 oder 50 µL).', 'Das Reaktionsvolumen muss größer als 0 sein.')
  const tpl = o.template ? o.template.q : ZERO
  if (sign(tpl) < 0) throw new CalcError('Das Template-Volumen darf nicht negativ sein.')
  if (cmp(tpl, V) >= 0) throw new CalcError('Das Template-Volumen muss kleiner als das Reaktionsvolumen sein.')
  const n = o.n.q
  const factor = o.reserve === 'eins' ? add(n, ONE) : o.reserve === 'zehn' ? mul(n, q(11, 10)) : n
  const steps: Step[] = []
  steps.push({
    tex: `n = ${tx(n)}\\ \\text{Proben},\\quad V_R = ${tx(V)}${UL}\\ \\text{pro Ansatz}${isZero(tpl) ? '' : `,\\quad V_{\\text{Template}} = ${tx(tpl)}${UL}`}`,
    head: 'Gegeben',
    note: isZero(tpl)
      ? 'Ohne Template-Volumen (z. B. Kolonie-PCR: die Zellen kommen direkt in den Ansatz). Die Negativkontrolle zählt als eigene Probe.'
      : 'Das Template (die Proben-DNA) kommt einzeln in jedes Gefäß – es gehört nicht in den Mastermix. Die Negativkontrolle (Wasser statt Template) zählt als eigene Probe.',
  })
  steps.push(
    o.reserve === 'eins'
      ? { tex: `n_{\\text{MM}} = n + 1 = ${tx(n)} + 1 = ${ntq(factor)}`, head: 'Ansätze im Mastermix', note: 'Ein Ansatz Reserve gleicht Pipettierverluste aus (Reste in den Spitzen und am Gefäßrand).' }
      : o.reserve === 'zehn'
        ? { tex: `n_{\\text{MM}} = n \\cdot 1{,}1 = ${tx(n)} \\cdot 1{,}1 = ${ntq(factor)}`, head: 'Ansätze im Mastermix', note: '10 % Reserve gleichen Pipettierverluste aus – praktisch bei vielen Proben.' }
        : { tex: `n_{\\text{MM}} = n = ${tx(n)}`, head: 'Ansätze im Mastermix', note: 'Ohne Reserve – Achtung: Wegen Pipettierverlusten reicht der Mastermix dann oft nicht für das letzte Gefäß.' },
  )
  const rows: MixRow[] = []
  let sum = ZERO
  let first = true
  const perList: Q[] = []
  let small = false
  for (const c of o.comps) {
    const end = c.end?.q ?? ZERO
    if (sign(end) < 0) throw new CalcError(`${c.name}: Die Endkonzentration darf nicht negativ sein.`)
    if (isZero(end)) {
      rows.push({ name: c.name, stock: c.stock ? concTex(c.stock.q, c.unit) : '\\text{–}', end: '0', per: '\\text{–}', total: '\\text{–}' })
      steps.push({ tex: `${c.tex}\\colon\\ \\text{entfällt}`, head: first ? 'Volumen je Komponente' : undefined, note: 'Endkonzentration 0 – diese Komponente kommt nicht in den Ansatz (z. B. weil sie schon im Puffer enthalten ist).' })
      first = false
      continue
    }
    if (!c.stock) throw new CalcError(`${c.name}: Bitte die Stammkonzentration eingeben.`)
    const stock = c.stock.q
    if (sign(stock) <= 0) throw new CalcError(`${c.name}: Die Stammkonzentration muss größer als 0 sein.`)
    if (cmp(end, stock) > 0) throw new CalcError(`${c.name}: Die Endkonzentration ist größer als die Stammkonzentration – so lässt sich nicht verdünnen.`)
    const per = div(mul(end, V), stock)
    const tot = mul(per, factor)
    sum = add(sum, per)
    perList.push(per)
    if (cmp(per, q(1, 2)) < 0) small = true
    const notes: string[] = []
    if (first) notes.push('Verdünnungsgleichung $c_1 \\cdot V_1 = c_2 \\cdot V_2$ nach $V_1$ umgestellt: Endkonzentration mal Reaktionsvolumen durch Stammkonzentration. Danach mal $n_{\\text{MM}}$ für den Mastermix.')
    if (c.unit === 'U/µL') notes.push(`Das sind $${ntq(end)}\\,\\text{U}/\\mu\\text{L} \\cdot ${tx(V)}\\,\\mu\\text{L} ${eqq(mul(end, V))}\\,\\text{U}$ Enzym pro Ansatz.`)
    if (c.note && c.unit !== 'U/µL') notes.push(c.note)
    steps.push({
      tex: `${c.tex}\\colon\\ V = \\frac{${concTex(end, c.unit)} \\cdot ${tx(V)}${UL}}{${concTex(stock, c.unit)}} ${eqq(per)}${UL} \\;\\Rightarrow\\; ${ntq(factor)} \\cdot ${ntq(per)}${UL} ${eqq(tot)}${UL}`,
      head: first ? 'Volumen je Komponente' : undefined,
      note: notes.join(' ') || undefined,
    })
    first = false
    rows.push({ name: c.name, stock: concTex(stock, c.unit), end: concTex(end, c.unit), per: ntq(per), total: ntq(tot) })
  }
  const water = sub(sub(V, sum), tpl)
  if (sign(water) < 0)
    throw new CalcError(
      `Die Komponenten brauchen zusammen $${ntq(add(sum, tpl))}\\,\\mu\\text{L}$ – mehr als das Reaktionsvolumen von $${tx(V)}\\,\\mu\\text{L}$. Stammlösungen konzentrierter wählen oder die Endkonzentrationen prüfen.`,
    )
  const waterTot = mul(water, factor)
  steps.push({
    tex: `V_{\\text{Wasser}} = V_R - \\sum V_i${isZero(tpl) ? '' : ' - V_{\\text{Template}}'} = ${tx(V)} - ${ntq(sum)}${isZero(tpl) ? '' : ` - ${tx(tpl)}`} ${eqq(water)}${UL} \\;\\Rightarrow\\; ${ntq(factor)} \\cdot ${ntq(water)}${UL} ${eqq(waterTot)}${UL}`,
    head: 'Wasser auffüllen',
    note: 'Mit nukleasefreiem Wasser auf das Reaktionsvolumen auffüllen.',
  })
  rows.push({ name: 'Wasser', stock: '\\text{–}', end: '\\text{–}', per: ntq(water), total: ntq(waterTot) })
  if (!isZero(tpl)) rows.push({ name: 'Template', stock: '\\text{–}', end: '\\text{–}', per: ntq(tpl), total: '\\text{einzeln}' })
  const perTube = sub(V, tpl)
  const mm = mul(perTube, factor)
  steps.push({
    tex: `V_{\\text{MM}} = n_{\\text{MM}} \\cdot ${isZero(tpl) ? 'V_R' : '(V_R - V_{\\text{Template}})'} = ${ntq(factor)} \\cdot ${ntq(perTube)}${UL} ${eqq(mm)}${UL}`,
    head: 'Mastermix',
    note: isZero(tpl) ? `In jedes Gefäß $${ntq(perTube)}\\,\\mu\\text{L}$ Mastermix vorlegen.` : `In jedes Gefäß $${ntq(perTube)}\\,\\mu\\text{L}$ Mastermix vorlegen, dann $${tx(tpl)}\\,\\mu\\text{L}$ Template dazugeben.`,
    final: true,
  })
  const parts = [...perList, water, ...(isZero(tpl) ? [] : [tpl])].map((x) => ntq(x))
  steps.push({ tex: `${parts.join(' + ')} ${eqq(add(add(sum, water), tpl))}${UL}\\ \\checkmark`, head: 'Probe', note: 'Alle Volumina eines Ansatzes ergeben zusammen das Reaktionsvolumen.' })
  const extra = [
    isZero(tpl) ? `V_{\\text{je Gefäß}} = ${ntq(perTube)}${UL}\\ \\text{Mastermix}` : `V_{\\text{je Gefäß}} = ${ntq(perTube)}${UL}\\ \\text{Mastermix} + ${tx(tpl)}${UL}\\ \\text{Template}`,
    `V_{\\text{Wasser}} ${eqq(waterTot)}${UL}\\ \\text{im Mastermix}`,
  ]
  return {
    result: `V_{\\text{Mastermix}} ${eqq(mm)}${UL}\\ (\\text{für } ${ntq(factor)} \\text{ Ansätze})`,
    extra,
    steps,
    rows,
    foot: { name: 'Summe', stock: '', end: '', per: ntq(V), total: ntq(mm) },
    factor,
    remark:
      'Reihenfolge: zuerst Wasser, Polymerase zuletzt (auf Eis, Enzym nicht vortexen). Mastermix gut mischen und kurz abzentrifugieren.' +
      (small ? ' Volumina unter 0,5 µL lassen sich einzeln kaum genau pipettieren – genau dafür ist der Mastermix da.' : ''),
  }
}

/* ---------------------------- b) Primer lösen ---------------------------- */

const un = (name: string, n: bigint | number, d: bigint | number = 1): Unit => ({ u: name, f: q(n, d) })
/** Stoffmenge des Primers (Grundeinheit pmol) */
export const PRIMER_MOL_U: readonly Unit[] = [un('µmol', 1_000_000), un('nmol', 1000), un('pmol', 1)]

export function primerStock(o: { n: NumIn | null; nu: string; cS: NumIn | null; cW?: NumIn | null; VW?: NumIn | null }): Solution {
  const nIn = pos(o.n, 'Bitte die Stoffmenge des Primers laut Datenblatt eingeben (z. B. 25,3 nmol).', 'Die Stoffmenge muss größer als 0 sein.')
  const cS = pos(o.cS, 'Bitte die gewünschte Konzentration der Stammlösung eingeben (meist 100 µM).', 'Die Konzentration muss größer als 0 sein.')
  const nu = PRIMER_MOL_U.some((x) => x.u === o.nu) ? o.nu : 'nmol'
  const pmol = mul(nIn, fac(PRIMER_MOL_U, nu))
  const steps: Step[] = []
  steps.push({
    tex: `n = ${tx(nIn)}${T(nu)},\\quad c_{\\text{Stamm}} = ${tx(cS)}${T('µM')}`,
    head: 'Gegeben',
    note: 'Lyophilisierte (gefriergetrocknete) Primer werden mit der Stoffmenge auf dem Datenblatt geliefert. Gesucht: das Volumen Lösungsmittel für die Stammlösung.',
  })
  steps.push({
    tex: `1${T('µM')} = 1\\,\\tfrac{\\mu\\text{mol}}{\\text{L}} = 1\\,\\tfrac{\\text{pmol}}{\\mu\\text{L}}${nu === 'pmol' ? '' : `,\\quad n = ${tx(nIn)}${T(nu)} ${eqq(pmol, 6)}${T('pmol')}`}`,
    head: 'Einheiten umrechnen',
    note: 'Mikromol pro Liter ist dasselbe wie Pikomol pro Mikroliter – Zähler und Nenner sind beide um den Faktor $10^{6}$ kleiner.',
  })
  steps.push({ tex: 'c = \\frac{n}{V} \\;\\Rightarrow\\; V = \\frac{n}{c}', head: 'Formel', note: 'Die Definition der Konzentration nach dem Volumen umgestellt.' })
  const V = div(pmol, cS)
  steps.push({
    tex: `V = \\frac{${ntq(pmol, 6)}${T('pmol')}}{${tx(cS)}\\,\\text{pmol}/\\mu\\text{L}} ${eqq(V)}${UL}`,
    head: 'Einsetzen',
    note: cmp(cS, q(100)) === 0 && nu === 'nmol' ? 'Faustregel für 100 µM: Stoffmenge in nmol mal 10 ergibt das Volumen in µL.' : 'pmol kürzt sich weg, übrig bleibt µL.',
    final: true,
  })
  const extra: string[] = [`\\to\\ c_{\\text{Stamm}} = ${tx(cS)}${T('µM')}`]
  if (o.cW || o.VW) {
    const cW = pos(o.cW, 'Für die Arbeitslösung bitte Konzentration und Volumen angeben.', 'Die Konzentration der Arbeitslösung muss größer als 0 sein.')
    const VW = pos(o.VW, 'Für die Arbeitslösung bitte Konzentration und Volumen angeben.', 'Das Volumen der Arbeitslösung muss größer als 0 sein.')
    if (cmp(cW, cS) >= 0) throw new CalcError('Die Arbeitslösung muss verdünnter sein als die Stammlösung.')
    const V1 = div(mul(cW, VW), cS)
    const w = sub(VW, V1)
    steps.push({
      tex: `V_1 = \\frac{c_2 \\cdot V_2}{c_1} = \\frac{${tx(cW)}${T('µM')} \\cdot ${tx(VW)}${UL}}{${tx(cS)}${T('µM')}} ${eqq(V1)}${UL}`,
      head: 'Arbeitslösung',
      note: 'Verdünnungsgleichung $c_1 \\cdot V_1 = c_2 \\cdot V_2$: so viel Stammlösung abnehmen.',
    })
    const k = div(cS, cW)
    steps.push({ tex: `V_{\\text{Wasser}} = V_2 - V_1 = ${tx(VW)} - ${ntq(V1)} ${eqq(w)}${UL}`, note: `Mit Wasser auf das Endvolumen auffüllen – eine Verdünnung $1 : ${ntq(k)}$.`, final: true })
    extra.push(`V_{\\text{Stamm}} ${eqq(V1)}${UL},\\quad V_{\\text{Wasser}} ${eqq(w)}${UL} \\;\\to\\; ${tx(cW)}${T('µM')}\\ \\text{Arbeitslösung}`)
  }
  return {
    result: `V ${eqq(V)}${UL}\\ \\text{Wasser (oder TE-Puffer)}`,
    extra,
    steps,
    remark: 'Vor dem Öffnen kurz abzentrifugieren (das Pellet sitzt oft im Deckel), in nukleasefreiem Wasser oder TE-Puffer lösen, gut mischen, in Aliquots bei −20 °C lagern.',
  }
}
