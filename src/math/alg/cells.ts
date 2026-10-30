/**
 * Zellzahl mit der Zählkammer: Zellen pro mL aus den Zählwerten der Quadrate (Kammervolumen,
 * Verdünnung mit Trypanblau, Vorverdünnung), Vitalität mit Trypanblau und Zellen aussäen
 * (c₁ · V₁ = c₂ · V₂) – jeweils mit vollständigem Rechenweg.
 */
import { add, CalcError, div, isZero, mul, ONE, q, qTex, sign, sub, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { F, T } from './units'
import { fix, need, needPos, parseCounts, qeq, qt, sciEq, sciT, sumTex, toLiter, txt, volEq, volTex, VOL_NAMES } from './serial'

/* ---------------------------- Zählkammern ---------------------------- */

export type ChamberId = 'gross' | 'gruppe' | 'klein' | 'fr' | 'eigen'

export interface Chamber {
  id: ChamberId
  /** für die Auswahl */
  label: string
  /** Seitenlängen eines Quadrats als TeX */
  side: string
  /** Fläche eines Quadrats in mm² */
  area: Q
  /** Tiefe in mm */
  depth: Q
  /** wofür (Hinweis unter der Auswahl) */
  use: string
}

/**
 * Nur Geometrien, die bei allen Herstellern gleich sind:
 * Neubauer improved: 9 Großquadrate 1 mm × 1 mm, Tiefe 0,1 mm; das Mittelquadrat ist in 25 Gruppenquadrate
 * 0,2 mm × 0,2 mm geteilt, diese in je 16 Kleinstquadrate 0,05 mm × 0,05 mm. Fuchs-Rosenthal: 16 Großquadrate
 * 1 mm × 1 mm, Tiefe 0,2 mm (3,2 µL). Andere Kammern über „eigene Kammer“ (Fläche und Tiefe eingeben).
 */
export const CHAMBERS: Chamber[] = [
  {
    id: 'gross',
    label: 'Neubauer improved – Großquadrat (1 mm × 1 mm, 0,1 mm tief)',
    side: '1\\,\\text{mm} \\times 1\\,\\text{mm}',
    area: q(1),
    depth: q(1, 10),
    use: 'Meist werden die 4 Eckquadrate gezählt (Zellkultur, Leukozyten). Gleiche Maße hat ein Großquadrat der Bürker-Kammer.',
  },
  {
    id: 'gruppe',
    label: 'Neubauer improved – Gruppenquadrat im Mittelquadrat (0,2 mm × 0,2 mm)',
    side: '0{,}2\\,\\text{mm} \\times 0{,}2\\,\\text{mm}',
    area: q(1, 25),
    depth: q(1, 10),
    use: 'Das Mittelquadrat hat 25 Gruppenquadrate; für Erythrozyten zählt man meist 5 davon (die 4 Ecken und die Mitte).',
  },
  {
    id: 'klein',
    label: 'Kleinstquadrat (0,05 mm × 0,05 mm, 0,1 mm tief)',
    side: '0{,}05\\,\\text{mm} \\times 0{,}05\\,\\text{mm}',
    area: q(1, 400),
    depth: q(1, 10),
    use: 'Kleinstquadrate im Mittelquadrat der Neubauer-improved-Kammer bzw. im Zählnetz der Thoma-Kammer – für sehr dichte Suspensionen (z. B. Hefen).',
  },
  {
    id: 'fr',
    label: 'Fuchs-Rosenthal – Großquadrat (1 mm × 1 mm, 0,2 mm tief)',
    side: '1\\,\\text{mm} \\times 1\\,\\text{mm}',
    area: q(1),
    depth: q(1, 5),
    use: '16 Großquadrate, Tiefe 0,2 mm (zusammen 3,2 µL) – für zellarme Proben wie Liquor.',
  },
  {
    id: 'eigen',
    label: 'eigene Kammer (Fläche und Tiefe eingeben)',
    side: '',
    area: q(1),
    depth: q(1, 10),
    use: 'Fläche eines gezählten Quadrats und Kammertiefe stehen auf der Kammer oder im Datenblatt des Herstellers.',
  },
]

export const chamberById = (id: string) => CHAMBERS.find((c) => c.id === id) ?? CHAMBERS[0]

/** Eingaben, die alle Zählkammer-Rechnungen teilen */
export interface ChamberIn {
  chamber: ChamberId | string
  /** eigene Kammer: Fläche eines Quadrats in mm² */
  area?: NumIn | null
  /** eigene Kammer: Tiefe in mm */
  depth?: NumIn | null
  /** Trypanblau-Ansatz: Volumen Zellsuspension (µL) */
  vCells?: NumIn | null
  /** Trypanblau-Ansatz: Volumen Trypanblau (µL) */
  vStain?: NumIn | null
  /** Vorverdünnung (Faktor F, z. B. 10 für 1 : 10) */
  pre?: NumIn | null
  /** Volumen der Zellsuspension für die Gesamtzellzahl */
  vol?: NumIn | null
  volUnit?: string
}

interface Geometry {
  /** Volumen eines Quadrats in mL */
  vQ: Q
  /** Verdünnungsfaktor gesamt */
  dil: Q
  steps: Step[]
}

/** Kammervolumen und Verdünnung – als Schritte des Lösungswegs */
function geometry(o: ChamberIn): Geometry {
  const ch = chamberById(o.chamber)
  let A = ch.area
  let h = ch.depth
  if (ch.id === 'eigen') {
    A = needPos(o.area, 'die Fläche eines gezählten Quadrats', 'Die Fläche eines Quadrats')
    h = needPos(o.depth, 'die Kammertiefe', 'Die Kammertiefe')
    if (toNum(A) > 100) throw new CalcError('Die Fläche eines Quadrats ist in mm² gefragt – mehr als 100 mm² hat keine Zählkammer.')
    if (toNum(h) > 2) throw new CalcError('Die Kammertiefe ist in mm gefragt – üblich sind 0,1 mm oder 0,2 mm.')
  }
  const steps: Step[] = []
  const vmm = mul(A, h)
  const vmL = div(vmm, q(1000))
  steps.push({
    tex: `V_Q = A \\cdot h = ${qt(A, 6)}${T('mm²')} \\cdot ${qTex(h, F)}${T('mm')} ${qeq(vmm, 6)}${T('mm³')}`,
    head: 'Volumen eines Quadrats',
    note:
      ch.id === 'eigen'
        ? 'Über jedem gezählten Quadrat steht eine Flüssigkeitssäule mit der Grundfläche $A$ und der Kammertiefe $h$.'
        : `Über jedem gezählten Quadrat ($${ch.side}$) steht eine Flüssigkeitssäule mit der Grundfläche $A$ und der Kammertiefe $h = ${qTex(h, F)}\\,\\text{mm}$.`,
  })
  steps.push({
    tex: `V_Q = ${qt(vmm, 6)}${T('mm³')} = ${qt(vmm, 6)}${T('µL')} = ${sciT(toNum(vmL), 4, 1e-2)}${T('mL')}`,
    head: 'Einheiten umrechnen',
    note: '$1\\,\\text{mm}^3 = 1\\,\\mu\\text{L} = 10^{-3}\\,\\text{mL}$ – ein Würfel mit 1 mm Kantenlänge fasst genau 1 µL.',
  })
  steps.push({
    tex: `\\frac{1}{V_Q} = \\frac{1}{${sciT(toNum(vmL), 4, 1e-2)}${T('mL')}} ${sciEq(1 / toNum(vmL), 4, 1e-3, 1e3)}${T('mL⁻¹')}`,
    note: 'Kammerfaktor: Mit ihm wird aus „Zellen pro Quadrat“ die Angabe „Zellen pro mL“.',
  })
  // Verdünnung mit Trypanblau
  let fT: Q | null = null
  if (o.vStain || o.vCells) {
    const vc = needPos(o.vCells, 'das Volumen der Zellsuspension im Trypanblau-Ansatz', 'Das Volumen der Zellsuspension')
    const vs = need(o.vStain, 'das Volumen Trypanblau (oder beide Felder leer lassen)')
    if (sign(vs) < 0) throw new CalcError('Das Volumen Trypanblau kann nicht negativ sein.')
    if (!isZero(vs)) {
      fT = div(add(vc, vs), vc)
      const half = fT.n === 2n && fT.d === 1n
      steps.push({
        tex: `F_{\\text{Trypan}} = \\frac{V_{\\text{Zellen}} + V_{\\text{Trypan}}}{V_{\\text{Zellen}}} = \\frac{${qTex(vc, F)}${T('µL')} + ${qTex(vs, F)}${T('µL')}}{${qTex(vc, F)}${T('µL')}} ${qeq(fT)}`,
        head: 'Verdünnung',
        note: `Zellsuspension und Trypanblau gemischt ($${qTex(vc, F)} + ${qTex(vs, F)}$): In der Kammer ist die Suspension ${half ? 'nur noch halb so konzentriert' : `um den Faktor $${qt(fT)}$ verdünnt`}.`,
      })
    }
  }
  // Vorverdünnung
  let fV: Q | null = null
  if (o.pre) {
    if (toNum(o.pre.q) < 1) throw new CalcError('Die Vorverdünnung ist ein Faktor ab 1 (z. B. 10 für eine Verdünnung 1 : 10).')
    if (toNum(o.pre.q) > 1) fV = o.pre.q
  }
  const dil = mul(fT ?? ONE, fV ?? ONE)
  if (fT && fV)
    steps.push({
      tex: `F = F_{\\text{Vor}} \\cdot F_{\\text{Trypan}} = ${qt(fV)} \\cdot ${qt(fT)} ${qeq(dil)}`,
      note: 'Die Suspension war vorher schon verdünnt – Verdünnungsfaktoren werden multipliziert.',
    })
  else if (fV)
    steps.push({ tex: `F = F_{\\text{Vor}} = ${qt(fV)}`, head: 'Verdünnung', note: `Vorverdünnung $1 : ${qt(fV)}$: In der Kammer ist nur der $${qt(fV)}$. Teil der Zellen der Ausgangssuspension.` })
  else if (!fT) steps.push({ tex: 'F = 1', head: 'Verdünnung', note: 'Unverdünnt in die Kammer gegeben – der Verdünnungsfaktor ist 1.' })
  return { vQ: vmL, dil, steps }
}

/** Gesamtvolumen der Zellsuspension in mL (optional) */
function suspensionVolume(o: ChamberIn): { mL: Q; tex: string } | null {
  if (!o.vol) return null
  const u = o.volUnit && VOL_NAMES.includes(o.volUnit) ? o.volUnit : 'mL'
  if (sign(o.vol.q) <= 0) throw new CalcError('Das Volumen der Zellsuspension muss größer als 0 sein.')
  return { mL: mul(toLiter(o.vol.q, u), q(1000)), tex: `${qTex(o.vol.q, F)}${T(u)}` }
}

const CELLS = T('Zellen/mL')

/** Zellen/mL als TeX mit 3 gültigen Ziffern */
const cTex = (x: number) => sciT(x, 3)
const cEq = (x: number) => sciEq(x, 3)

/** Zellzahl als Text für Meldungen: „1,02 · 10^6“ */
function sciText(x: number) {
  return sciT(x, 3)
    .replace(/\{,\}/g, ',')
    .replace(/\\,/g, ' ')
    .replace(' \\cdot 10^{', ' · 10^')
    .replace('}', '')
}

/** Warnungen zur Zählung: zu viele, zu wenige, ungleichmäßig */
function countWarnings(xs: number[], mean: number, ch: Chamber): string[] {
  const w: string[] = []
  const total = xs.reduce((a, b) => a + b, 0)
  if (mean > 200)
    w.push(`Sehr viele Zellen (im Mittel ${txt(Math.round(mean))} pro Quadrat) – man verzählt sich leicht und Zellen überlagern sich. Stärker verdünnen (Faustregel: etwa 20–100 Zellen pro Großquadrat).`)
  const low = ch.id === 'gross' && mean < 10
  const meanTxt = txt(Number(mean.toFixed(2)))
  if (total < 100)
    w.push(
      `Insgesamt nur ${total} ${total === 1 ? 'Zelle' : 'Zellen'} gezählt${low ? ` (im Mittel ${meanTxt} pro Großquadrat)` : ''} – der Zufallsfehler liegt bei etwa ${Math.round(100 / Math.sqrt(total))} %. Für etwa 10 % Genauigkeit mindestens 100 Zellen zählen (${ch.id === 'fr' ? 'bei zellarmen Proben wie Liquor alle 16 Großquadrate auszählen' : 'mehr Quadrate zählen oder weniger verdünnen'}).`,
    )
  else if (low)
    w.push(`Im Mittel nur ${meanTxt} Zellen pro Großquadrat – gut zählbar sind etwa 20–100. Weniger verdünnen oder die Zellen abzentrifugieren und in weniger Medium aufnehmen.`)
  if (xs.length >= 2 && mean > 0) {
    const lim = 3 * Math.sqrt(mean)
    const bad = xs.map((x, i) => [x, i] as const).filter(([x]) => Math.abs(x - mean) > lim)
    if (bad.length)
      w.push(
        `Die Zählwerte sind sehr ungleichmäßig (${bad.map(([x, i]) => `Quadrat ${i + 1}: ${x}`).join(', ')}). Zufällig schwanken sie nur um etwa $\\pm\\sqrt{\\bar N} \\approx \\pm ${fix(Math.sqrt(mean), 1)}$ – Abweichungen über das Dreifache sprechen für Luftblasen, Zellklumpen oder eine schlecht gemischte Suspension. Kammer neu befüllen.`,
      )
  }
  return w
}

const L_RULE = '**L-Regel:** Zellen auf den Begrenzungslinien nur an zwei Seiten mitzählen (z. B. oben und links), an den beiden anderen nicht – sonst werden Randzellen doppelt gezählt.'

/* ---------------------------- Zählkammer ---------------------------- */

export interface CountSolution extends Solution {
  /** Zellen pro mL */
  perMl: number
  /** Mittelwert pro Quadrat */
  mean: number
  /** Verdünnungsfaktor */
  factor: number
  /** Volumen eines Quadrats in mL */
  vQ: number
  /** Gesamtzellzahl (falls Volumen gegeben) */
  total: number | null
}

/** Zellen pro mL aus den Zählwerten der Quadrate */
export function chamberCount(o: ChamberIn & { counts: string }): CountSolution {
  const xs = parseCounts(o.counts, 'Zählwerte')
  if (!xs.length) throw new CalcError('Bitte die gezählten Zellen eingeben – einen Wert pro Quadrat, z. B. 52; 47; 55; 50.')
  const n = xs.length
  const sumN = xs.reduce((a, b) => a + b, 0)
  if (sumN === 0) throw new CalcError('Es wurden keine Zellen gezählt – so lässt sich keine Zellzahl angeben. Weniger verdünnen oder mehr Quadrate zählen.')
  const ch = chamberById(o.chamber)
  const mean = q(sumN, n)
  const kind = { gross: 'Großquadrate', gruppe: 'Gruppenquadrate', klein: 'Kleinstquadrate', fr: 'Fuchs-Rosenthal-Großquadrate', eigen: 'Quadrate' }[ch.id]
  const steps: Step[] = []
  steps.push({
    tex: n === 1 ? `N_1 = ${xs[0]}` : `N_1 \\dots N_{${n}}\\colon\\ ${xs.join(';\\ ')}`,
    head: 'Gegeben',
    note: `${n === 1 ? 'Ein Quadrat' : `${n} ${kind}`} ausgezählt.`,
  })
  steps.push({
    tex: n === 1 ? `\\bar N = ${xs[0]}` : `\\bar N = \\frac{${sumTex(xs)}}{${n}} = \\frac{${sumN}}{${n}} ${qeq(mean)}`,
    head: 'Mittelwert pro Quadrat',
    note: 'Mehrere Quadrate zählen und mitteln – das gleicht zufällige Schwankungen aus.',
  })
  const g = geometry(o)
  steps.push(...g.steps)
  const c = mul(div(mean, g.vQ), g.dil)
  const cn = toNum(c)
  const vq = `${sciT(toNum(g.vQ), 4, 1e-2)}${T('mL')}`
  steps.push({ tex: 'c = \\frac{\\bar N}{V_Q} \\cdot F', head: 'Formel', note: '$c$ = Zellen pro mL: Zellen pro Quadrat durch das Volumen eines Quadrats (in mL), mal Verdünnungsfaktor.' })
  steps.push({ tex: `c = \\frac{${qt(mean)}}{${vq}} \\cdot ${qt(g.dil)} ${cEq(cn)}${CELLS}`, head: 'Einsetzen', final: true })
  const extra: string[] = [`c ${sciEq(cn / 1000, 3, 1e-3, 1e5)}${T('Zellen/µL')}`, `\\bar N ${qeq(mean)}\\ \\text{pro Quadrat},\\quad F ${qeq(g.dil)}`]
  const sv = suspensionVolume(o)
  let total: number | null = null
  if (sv) {
    total = cn * toNum(sv.mL)
    steps.push({
      tex: `N_{\\text{ges}} = c \\cdot V = ${cTex(cn)}${CELLS} \\cdot ${sv.tex} ${cEq(total)}${T('Zellen')}`,
      head: 'Zellzahl in der Suspension',
      note: 'Konzentration mal Volumen der gesamten Zellsuspension.',
      final: true,
    })
    extra.unshift(`N_{\\text{ges}} ${cEq(total)}\\ \\text{Zellen in}\\ ${sv.tex}`)
  }
  steps.push({
    tex: `\\frac{1}{\\sqrt{N}} = \\frac{1}{\\sqrt{${sumN}}} \\approx ${fix(100 / Math.sqrt(sumN), 0)}\\,\\%`,
    head: 'Zählgenauigkeit',
    note: `Zufälliger Zählfehler (Poisson-Statistik) bei $N = ${sumN}$ gezählten Zellen. Je mehr Zellen man zählt, desto genauer wird das Ergebnis.`,
  })
  return {
    result: `c ${cEq(cn)}${CELLS}`,
    extra,
    steps,
    remark: [...countWarnings(xs, toNum(mean), ch), L_RULE].join(' '),
    perMl: cn,
    mean: toNum(mean),
    factor: toNum(g.dil),
    vQ: toNum(g.vQ),
    total,
  }
}

/* ---------------------------- Vitalität ---------------------------- */

export interface VitSolution extends Solution {
  /** Vitalität in % */
  vit: number
  /** lebende Zellen pro mL */
  liveMl: number
  /** alle Zellen pro mL */
  allMl: number
  /** lebende Zellen insgesamt (falls Volumen gegeben) */
  liveTotal: number | null
}

/**
 * Trypanblau-Färbung: lebende (ungefärbte) und tote (blaue) Zellen.
 * Entweder je Quadrat ein Wert (gleich viele) oder Summen mit der Anzahl der Quadrate.
 */
export function viability(o: ChamberIn & { live: string; dead: string; squares?: NumIn | null }): VitSolution {
  const lv = parseCounts(o.live, 'Lebende Zellen')
  const dd = parseCounts(o.dead, 'Tote Zellen')
  if (!lv.length) throw new CalcError('Bitte die lebenden (ungefärbten) Zellen eingeben.')
  if (!dd.length) throw new CalcError('Bitte die toten (blau gefärbten) Zellen eingeben – 0, wenn keine.')
  let n: number
  if (o.squares) {
    const s = o.squares.q
    if (s.d !== 1n || sign(s) <= 0) throw new CalcError('Die Anzahl der gezählten Quadrate muss eine ganze Zahl ab 1 sein.')
    n = Number(s.n)
    if (n > 1000) throw new CalcError('So viele Quadrate hat keine Zählkammer.')
    if (lv.length > 1 && lv.length !== n) throw new CalcError(`Es sind ${lv.length} Werte für lebende Zellen eingetragen, aber ${n} Quadrate angegeben – bitte angleichen (oder die Summe als einen Wert eintragen).`)
    if (dd.length > 1 && dd.length !== n) throw new CalcError(`Es sind ${dd.length} Werte für tote Zellen eingetragen, aber ${n} Quadrate angegeben – bitte angleichen (oder die Summe als einen Wert eintragen).`)
  } else {
    if (lv.length !== dd.length) throw new CalcError('Bitte für lebende und tote Zellen gleich viele Werte eintragen (einen je Quadrat) – oder Summen eintragen und die Anzahl der Quadrate angeben.')
    n = lv.length
  }
  const L = lv.reduce((a, b) => a + b, 0)
  const D = dd.reduce((a, b) => a + b, 0)
  if (L + D === 0) throw new CalcError('Es wurden keine Zellen gezählt.')
  const vitQ = div(mul(q(L), q(100)), q(L + D))
  const vit = toNum(vitQ)
  const steps: Step[] = []
  steps.push({
    tex: `N_{\\text{lebend}} = ${lv.length > 1 ? `${sumTex(lv)} = ` : ''}${L},\\quad N_{\\text{tot}} = ${dd.length > 1 ? `${sumTex(dd)} = ` : ''}${D}`,
    head: 'Gegeben',
    note: `In ${n} ${n === 1 ? 'Quadrat' : 'Quadraten'} gezählt. Trypanblau dringt nur durch die geschädigte Membran toter Zellen – lebende Zellen bleiben ungefärbt und hell (Farbstoffausschluss).`,
  })
  steps.push({
    tex: `\\text{Vitalität} = \\frac{N_{\\text{lebend}}}{N_{\\text{lebend}} + N_{\\text{tot}}} \\cdot 100\\,\\% = \\frac{${L}}{${L} + ${D}} \\cdot 100\\,\\% ${qeq(vitQ, 3)}\\,\\%`,
    head: 'Vitalität',
    note: 'Anteil der lebenden Zellen an allen gezählten Zellen.',
    final: true,
  })
  const g = geometry(o)
  steps.push(...g.steps)
  const mL = q(L, n)
  const mA = q(L + D, n)
  const live = mul(div(mL, g.vQ), g.dil)
  const all = mul(div(mA, g.vQ), g.dil)
  const vq = `${sciT(toNum(g.vQ), 4, 1e-2)}${T('mL')}`
  steps.push({
    tex: `\\bar N_{\\text{lebend}} = \\frac{${L}}{${n}} ${qeq(mL)} \\;\\Rightarrow\\; c_{\\text{lebend}} = \\frac{${qt(mL)}}{${vq}} \\cdot ${qt(g.dil)} ${cEq(toNum(live))}${CELLS}`,
    head: 'Lebende Zellen pro mL',
    note: 'Für die Aussaat zählen nur die ungefärbten Zellen: Mittelwert pro Quadrat durch das Quadratvolumen, mal Verdünnungsfaktor.',
    final: true,
  })
  steps.push({
    tex: `c_{\\text{gesamt}} = \\frac{${qt(mA)}}{${vq}} \\cdot ${qt(g.dil)} ${cEq(toNum(all))}${CELLS}`,
    head: 'Gesamtzellzahl',
    note: `Lebende und tote Zellen zusammen ($\\bar N = \\tfrac{${L + D}}{${n}}$ pro Quadrat).`,
  })
  const extra = [`c_{\\text{lebend}} ${cEq(toNum(live))}${CELLS}`, `c_{\\text{gesamt}} ${cEq(toNum(all))}${CELLS}`]
  const sv = suspensionVolume(o)
  let liveTotal: number | null = null
  if (sv) {
    liveTotal = toNum(live) * toNum(sv.mL)
    steps.push({
      tex: `N_{\\text{lebend}} = c_{\\text{lebend}} \\cdot V = ${cTex(toNum(live))}${CELLS} \\cdot ${sv.tex} ${cEq(liveTotal)}${T('Zellen')}`,
      head: 'Lebende Zellen in der Suspension',
      note: 'Lebende Zellen pro mL mal Volumen der Zellsuspension.',
    })
    extra.push(`N_{\\text{lebend}} ${cEq(liveTotal)}\\ \\text{Zellen in}\\ ${sv.tex}`)
  }
  const rem: string[] = []
  const vt = fix(vit, 1).replace('{,}', ',')
  if (vit < 80) rem.push(`Die Vitalität ist niedrig (${vt} %) – Kultur prüfen: zu dicht gewachsen, zu lange nicht versorgt, Kontamination oder zu harte Behandlung beim Ablösen.`)
  else if (vit < 90) rem.push(`Die Vitalität ist mäßig (${vt} %). Für Versuche und zum Passagieren wünscht man meist über 90 % lebende Zellen.`)
  else rem.push('Gute Vitalität – für Versuche und zum Passagieren wünscht man meist über 90 % lebende Zellen.')
  rem.push('Zügig auszählen (innerhalb weniger Minuten): Mit der Zeit nehmen auch lebende Zellen Trypanblau auf, die Vitalität wird dann zu niedrig bestimmt.')
  rem.push(L_RULE)
  return {
    result: `\\text{Vitalität} ${qeq(vitQ, 3)}\\,\\%`,
    extra,
    steps,
    remark: rem.join(' '),
    vit,
    liveMl: toNum(live),
    allMl: toNum(all),
    liveTotal,
  }
}

/* ---------------------------- Zellen aussäen ---------------------------- */

export type SeedTarget = 'abs' | 'flaeche'

export interface SeedSolution extends Solution {
  /** Volumen Zellsuspension (mL) */
  vCells: number
  /** Volumen Medium (mL) */
  vMedium: number
  /** Gesamtvolumen (mL) */
  vTotal: number
  /** Zellen pro Gefäß */
  perVessel: number
  /** Zielkonzentration (Zellen/mL) */
  c2: number
}

/**
 * Zellen aussäen: aus einer Zellsuspension (c₁) n Gefäße mit je N Zellen in V Medium.
 * Ziel als Zellen pro Gefäß oder als Zellen pro cm² mal Wachstumsfläche; Zuschlag in %.
 */
export function seeding(o: {
  c: NumIn | null
  target: SeedTarget | string
  perVessel?: NumIn | null
  density?: NumIn | null
  area?: NumIn | null
  n: NumIn | null
  vMed: NumIn | null
  vu: string
  reserve?: NumIn | null
}): SeedSolution {
  const c1 = needPos(o.c, 'die Zellkonzentration der Suspension (Zellen/mL)', 'Die Zellkonzentration der Suspension')
  const nq = needPos(o.n, 'die Anzahl der Gefäße', 'Die Anzahl der Gefäße')
  if (nq.d !== 1n) throw new CalcError('Die Anzahl der Gefäße muss eine ganze Zahl sein.')
  if (toNum(nq) > 10000) throw new CalcError('Mehr als 10 000 Gefäße auf einmal sind unrealistisch.')
  const vIn = needPos(o.vMed, 'das Volumen Medium pro Gefäß', 'Das Volumen Medium pro Gefäß')
  if (!VOL_NAMES.includes(o.vu)) throw new CalcError('Unbekannte Volumeneinheit.')
  const vG = mul(toLiter(vIn, o.vu), q(1000)) // mL pro Gefäß
  const z = o.reserve ? o.reserve.q : q(0)
  if (sign(z) < 0 || toNum(z) > 100) throw new CalcError('Der Zuschlag muss zwischen 0 und 100 % liegen.')
  const steps: Step[] = []
  const vgT = `${qTex(vIn, F)}${T(o.vu)}`
  const L = (mlQ: Q) => div(mlQ, q(1000))
  let N: Q
  if (o.target === 'flaeche') {
    const dens = needPos(o.density, 'die Aussaatdichte (Zellen pro cm²)', 'Die Aussaatdichte')
    const A = needPos(o.area, 'die Wachstumsfläche eines Gefäßes', 'Die Wachstumsfläche')
    N = mul(dens, A)
    steps.push({
      tex: `c_1 = ${cTex(toNum(c1))}${CELLS},\\quad ${qt(nq)}\\ \\text{Gefäße mit je}\\ ${qTex(A, F)}${T('cm²')}\\ \\text{und}\\ ${vgT}\\ \\text{Medium}`,
      head: 'Gegeben',
      note: 'Gesucht: Volumen der Zellsuspension und des Mediums für einen gemeinsamen Ansatz, aus dem alle Gefäße befüllt werden.',
    })
    steps.push({
      tex: `N = ${cTex(toNum(dens))}${T('Zellen/cm²')} \\cdot ${qTex(A, F)}${T('cm²')} ${cEq(toNum(N))}${T('Zellen')}`,
      head: 'Zellen pro Gefäß',
      note: 'Aussaatdichte mal Wachstumsfläche.',
    })
  } else {
    N = needPos(o.perVessel, 'die Zellzahl pro Gefäß', 'Die Zellzahl pro Gefäß')
    steps.push({
      tex: `c_1 = ${cTex(toNum(c1))}${CELLS},\\quad N = ${cTex(toNum(N))}\\ \\text{Zellen pro Gefäß},\\quad ${qt(nq)}\\ \\text{Gefäße zu je}\\ ${vgT}`,
      head: 'Gegeben',
      note: 'Gesucht: Volumen der Zellsuspension und des Mediums für einen gemeinsamen Ansatz, aus dem alle Gefäße befüllt werden.',
    })
  }
  const c2 = div(N, vG)
  steps.push({
    tex: `c_2 = \\frac{N}{V_{\\text{Gefäß}}} = \\frac{${cTex(toNum(N))}\\ \\text{Zellen}}{${qt(vG)}${T('mL')}} ${cEq(toNum(c2))}${CELLS}`,
    head: 'Zielkonzentration',
    note: 'So dicht muss der fertige Ansatz sein, damit in jedes Gefäß genau $N$ Zellen kommen.',
  })
  if (toNum(c2) > toNum(c1) * (1 + 1e-12))
    throw new CalcError(
      `Die Zellsuspension ist zu dünn: Gebraucht werden ${sciText(toNum(c2))} Zellen/mL, vorhanden sind nur ${sciText(toNum(c1))} Zellen/mL. Zellen abzentrifugieren und in weniger Medium aufnehmen – oder weniger Zellen pro Gefäß aussäen.`,
    )
  const fz = add(ONE, div(z, q(100)))
  const V2 = mul(mul(nq, vG), fz)
  steps.push({
    tex: isZero(z) ? `V_2 = ${qt(nq)} \\cdot ${qt(vG)}${T('mL')} ${qeq(V2)}${T('mL')}` : `V_2 = ${qt(nq)} \\cdot ${qt(vG)}${T('mL')} \\cdot ${qTex(fz, F)} ${qeq(V2)}${T('mL')}`,
    head: 'Gesamtvolumen',
    note: isZero(z)
      ? 'Ohne Zuschlag – beim Verteilen bleibt aber immer ein kleiner Rest im Gefäß zurück.'
      : `Mit ${qTex(z, F).replace('{,}', ',')} % Zuschlag für Pipettierverluste (Rest im Reservoir, Benetzung der Spitzen).`,
  })
  const V1 = div(mul(c2, V2), c1)
  const Vm = sub(V2, V1)
  steps.push({
    tex: 'c_1 \\cdot V_1 = c_2 \\cdot V_2 \\;\\Rightarrow\\; V_1 = \\frac{c_2 \\cdot V_2}{c_1}',
    head: 'Verdünnungsgleichung',
    note: 'Beim Verdünnen bleibt die Zahl der Zellen gleich – es kommt nur Medium dazu.',
  })
  steps.push({
    tex: `V_1 = \\frac{${cTex(toNum(c2))}${CELLS} \\cdot ${qt(V2)}${T('mL')}}{${cTex(toNum(c1))}${CELLS}} ${volEq(L(V1))}`,
    head: 'Zellsuspension',
    note: 'So viel der gezählten Zellsuspension abnehmen.',
    final: true,
  })
  steps.push({
    tex: `V_{\\text{Medium}} = V_2 - V_1 = ${volTex(L(V2))} - ${volTex(L(V1))} ${volEq(L(Vm))}`,
    head: 'Medium',
    note: 'Mit frischem Medium auf das Gesamtvolumen auffüllen und vorsichtig mischen.',
    final: true,
  })
  const per1 = div(N, c1)
  steps.push({
    tex: `\\text{je Gefäß: } ${vgT}\\ \\text{Ansatz} \\;\\widehat{=}\\; ${cTex(toNum(N))}\\ \\text{Zellen}`,
    head: 'Verteilen',
    note: `Rechnerisch enthält jedes Gefäß $${volTex(L(per1))}$ Zellsuspension und $${volTex(L(sub(vG, per1)))}$ Medium. Gleichmäßiger und schneller ist es, erst den gemeinsamen Ansatz zu mischen und dann je ${qTex(vIn, F).replace('{,}', ',')} ${o.vu} zu verteilen.`,
  })
  const Ntot = mul(c1, V1)
  steps.push({
    tex: `c_1 \\cdot V_1 = ${cTex(toNum(c1))}${CELLS} \\cdot ${volTex(L(V1))} ${cEq(toNum(Ntot))}\\ \\text{Zellen} = ${qt(nq)} \\cdot ${cTex(toNum(N))}${isZero(z) ? '' : ` \\cdot ${qTex(fz, F)}`}\\ \\checkmark`,
    head: 'Probe',
    note: `Die abgenommenen Zellen reichen genau für alle Gefäße${isZero(z) ? '' : ' plus Zuschlag'}.`,
  })
  return {
    result: `V_{\\text{Zellsuspension}} ${volEq(L(V1))},\\quad V_{\\text{Medium}} ${volEq(L(Vm))}`,
    extra: [`\\text{Gesamt } ${volTex(L(V2))}\\ \\text{mit}\\ ${cTex(toNum(c2))}${CELLS}`, `${qt(nq)}\\ \\text{Gefäße zu je}\\ ${vgT} \\;\\widehat{=}\\; ${cTex(toNum(N))}\\ \\text{Zellen}`],
    steps,
    remark: 'Die Zellsuspension vor dem Abnehmen gut mischen (Zellen sinken schnell ab) und den Ansatz beim Verteilen immer wieder vorsichtig schwenken, damit alle Gefäße gleich viele Zellen bekommen. Für die Rechnung die **lebenden** Zellen pro mL verwenden.',
    vCells: toNum(V1),
    vMedium: toNum(Vm),
    vTotal: toNum(V2),
    perVessel: toNum(N),
    c2: toNum(c2),
  }
}
