/**
 * Mikroskopie: Gesamtvergrößerung und förderliche Vergrößerung, Okularmikrometer eichen,
 * Objektgröße (mit dem Okularmikrometer oder aus Bild/Zeichnung und Vergrößerung),
 * Auflösungsgrenze (Abbe, Rayleigh) und Sehfelddurchmesser – jeweils mit vollständigem Rechenweg.
 */
import { add, CalcError, div, mul, q, qFromRaw, qTex, sign, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { F, feqv, fnt, T } from './units'
import { needPos, qeq, qt } from './serial'

/** Objektive mit typischer numerischer Apertur (Achromate) */
export const OBJECTIVES: { V: string; A: string; label: string }[] = [
  { V: '4', A: '0,10', label: '4× · 0,10' },
  { V: '10', A: '0,25', label: '10× · 0,25' },
  { V: '40', A: '0,65', label: '40× · 0,65' },
  { V: '100', A: '1,25', label: '100× Öl · 1,25' },
]

/** numerische Apertur prüfen */
function aperture(v: NumIn | null | undefined, acc: string, nom: string): Q {
  const A = needPos(v, acc, nom)
  if (toNum(A) > 1.6) throw new CalcError(`${nom} ist höchstens etwa 1,5 (Ölimmersion) – größere Werte gibt es nicht.`)
  return A
}

/** ganze Vergrößerung als Text: 400-fach */
const fach = (x: Q) => `${qt(x, 6)}\\text{-fach}`

/* ---------------------------- Vergrößerung ---------------------------- */

export type MagVerdict = 'unter' | 'foerderlich' | 'leer'

export interface MagSolution extends Solution {
  V: number
  verdict: MagVerdict | null
}

export function magnification(o: { obj: NumIn | null; ok: NumIn | null; tube?: NumIn | null; na?: NumIn | null }): MagSolution {
  const vo = needPos(o.obj, 'die Vergrößerung des Objektivs', 'Die Objektivvergrößerung')
  const vk = needPos(o.ok, 'die Vergrößerung des Okulars', 'Die Okularvergrößerung')
  if (toNum(vo) > 250) throw new CalcError('Objektive vergrößern höchstens etwa 100- bis 150-fach.')
  if (toNum(vk) > 50) throw new CalcError('Okulare vergrößern meist 5- bis 25-fach – bitte die Eingabe prüfen.')
  const tube = o.tube ? o.tube.q : null
  if (tube && sign(tube) <= 0) throw new CalcError('Die Zwischenvergrößerung muss größer als 0 sein.')
  if (tube && toNum(tube) > 5) throw new CalcError('Zwischenvergrößerungen (Tubusfaktor, Optovar) liegen meist zwischen 1 und 2,5.')
  const steps: Step[] = []
  const given = [`V_{\\text{Obj}} = ${qTex(vo, F)}`, `V_{\\text{Ok}} = ${qTex(vk, F)}`]
  if (tube) given.push(`q = ${qTex(tube, F)}`)
  steps.push({
    tex: given.join(',\\quad '),
    head: 'Gegeben',
    note: `Die Zahlen stehen auf Objektiv und Okular (z. B. „40/0,65“ und „10×“).${tube ? ' $q$ ist eine Zwischenvergrößerung im Tubus (Tubusfaktor, Optovar).' : ''}`,
  })
  const V = mul(mul(vo, vk), tube ?? q(1))
  steps.push({
    tex: tube ? 'V = V_{\\text{Obj}} \\cdot V_{\\text{Ok}} \\cdot q' : 'V = V_{\\text{Obj}} \\cdot V_{\\text{Ok}}',
    head: 'Formel',
    note: 'Das Objektiv erzeugt ein vergrößertes Zwischenbild, das Okular vergrößert es wie eine Lupe noch einmal – die Vergrößerungen werden multipliziert.',
  })
  steps.push({
    tex: `V = ${qTex(vo, F)} \\cdot ${qTex(vk, F)}${tube ? ` \\cdot ${qTex(tube, F)}` : ''} ${qeq(V, 6)}`,
    head: 'Einsetzen',
    note: `Das Bild erscheint ${qt(V, 6).replace(/\\,/g, ' ').replace('{,}', ',')}-mal so groß wie das Objekt ($${qt(V, 6)} : 1$).`,
    final: true,
  })
  const extra: string[] = [`${qt(V, 6)} : 1`]
  let verdict: MagVerdict | null = null
  let remark = 'Die Gesamtvergrößerung allein sagt nichts über die Bildschärfe – die Auflösung bestimmt die numerische Apertur des Objektivs.'
  if (o.na) {
    const A = aperture(o.na, 'die numerische Apertur', 'Die numerische Apertur')
    const lo = mul(q(500), A)
    const hi = mul(q(1000), A)
    steps.push({
      tex: `500 \\cdot A \\le V \\le 1000 \\cdot A`,
      head: 'Förderliche Vergrößerung',
      note: 'In diesem Bereich erkennt das Auge alle Details, die das Objektiv auflösen kann. $A$ ist die numerische Apertur des Objektivs.',
    })
    steps.push({ tex: `500 \\cdot ${qTex(A, F)} ${qeq(lo, 6)} \\quad\\text{bis}\\quad 1000 \\cdot ${qTex(A, F)} ${qeq(hi, 6)}` })
    const v = toNum(V)
    if (v < toNum(lo)) {
      verdict = 'unter'
      steps.push({ tex: `V = ${qt(V, 6)} < ${qt(lo, 6)}`, note: 'Unterhalb der förderlichen Vergrößerung: Das Objektiv löst mehr auf, als das Auge bei dieser Vergrößerung erkennen kann – ein stärkeres Okular würde mehr Details zeigen.' })
      extra.push('\\text{unterhalb der förderlichen Vergrößerung}')
    } else if (v > toNum(hi)) {
      verdict = 'leer'
      steps.push({ tex: `V = ${qt(V, 6)} > ${qt(hi, 6)}`, note: '**Leere Vergrößerung:** Das Bild wird nur größer, aber nicht detailreicher – mehr als das Objektiv auflöst, kann keine Vergrößerung zeigen.' })
      extra.push('\\text{leere Vergrößerung}')
    } else {
      verdict = 'foerderlich'
      steps.push({ tex: `${qt(lo, 6)} \\le ${qt(V, 6)} \\le ${qt(hi, 6)}\\ \\checkmark`, note: 'Im förderlichen Bereich: Alle Details, die das Objektiv auflöst, sind für das Auge sichtbar.' })
      extra.push(`\\text{förderlich: } ${qt(lo, 6)} \\dots ${qt(hi, 6)}`)
    }
    remark = 'Förderliche Vergrößerung: 500- bis 1000-mal die numerische Apertur. Darüber beginnt die leere Vergrößerung – das Bild wird größer, aber nicht schärfer.'
  }
  return { result: `V = ${fach(V)}`, extra, steps, remark, V: toNum(V), verdict }
}

/* ---------------------------- Okularmikrometer eichen ---------------------------- */

export interface CalibSolution extends Solution {
  /** Eichfaktor in µm pro Okular-Teilstrich */
  E: number
}

/**
 * Objektmikrometer (Länge L in mm, in n Teilstriche geteilt): x Teilstriche Objektmikrometer
 * decken sich mit y Teilstrichen des Okularmikrometers → Eichfaktor E = x · (L/n) / y.
 */
export function calibrate(o: { len: NumIn | null; div: NumIn | null; x: NumIn | null; y: NumIn | null; obj?: NumIn | null }): CalibSolution {
  const L = needPos(o.len, 'die Länge des Objektmikrometers', 'Die Länge des Objektmikrometers')
  const nd = needPos(o.div, 'die Zahl der Teilstriche des Objektmikrometers', 'Die Zahl der Teilstriche')
  if (nd.d !== 1n) throw new CalcError('Die Zahl der Teilstriche des Objektmikrometers ist eine ganze Zahl (meist 100).')
  const x = needPos(o.x, 'die Teilstriche des Objektmikrometers', 'Die Zahl der Objektmikrometer-Teilstriche')
  const y = needPos(o.y, 'die Teilstriche des Okularmikrometers', 'Die Zahl der Okularmikrometer-Teilstriche')
  if (toNum(L) > 10) throw new CalcError('Objektmikrometer sind meist 1 mm oder 2 mm lang – bitte die Länge in mm eingeben.')
  if (toNum(x) > toNum(nd)) throw new CalcError(`Das Objektmikrometer hat nur ${qt(nd)} Teilstriche – es können nicht mehr übereinanderliegen.`)
  const tObj = div(mul(L, q(1000)), nd) // µm pro Teilstrich
  const steps: Step[] = []
  steps.push({
    tex: `t_{\\text{Obj}} = \\frac{${qTex(L, F)}${T('mm')}}{${qt(nd)}} ${qeq(div(L, nd), 6)}${T('mm')} ${qeq(tObj, 6)}${T('µm')}`,
    head: 'Teilungswert des Objektmikrometers',
    note: 'Das Objektmikrometer ist ein Objektträger mit einer genauen Skala (meist 1 mm in 100 Teile) – ein Teilstrich ist also 10 µm lang.',
  })
  steps.push({
    tex: `${qTex(x, F)}\\ \\text{Teilstriche Objektmikrometer} \\;\\widehat{=}\\; ${qTex(y, F)}\\ \\text{Teilstriche Okularmikrometer}`,
    head: 'Gegeben',
    note: 'Beide Skalen parallel legen und zwei Stellen suchen, an denen Striche genau übereinanderliegen – möglichst weit auseinander, das macht die Eichung genauer.',
  })
  const E = div(mul(x, tObj), y)
  steps.push({
    tex: `E = \\frac{x \\cdot t_{\\text{Obj}}}{y} = \\frac{${qTex(x, F)} \\cdot ${qt(tObj, 6)}${T('µm')}}{${qTex(y, F)}} ${qeq(E, 4)}${T('µm')}`,
    head: 'Eichfaktor',
    note: 'So viele Mikrometer im Präparat entspricht ein Teilstrich des Okularmikrometers – nur mit diesem Objektiv.',
    final: true,
  })
  let remark = 'Die Eichung gilt nur für das verwendete Objektiv (und die Zwischenvergrößerung). Für jedes Objektiv einmal eichen und den Eichfaktor notieren.'
  if (o.obj) {
    const vo = needPos(o.obj, 'die Objektivvergrößerung', 'Die Objektivvergrößerung')
    remark = `Der Eichfaktor gilt nur für das ${qt(vo, 6).replace('{,}', ',')}er-Objektiv. Für andere Objektive neu eichen – umrechnen ($E \\sim \\tfrac{1}{V_{\\text{Obj}}}$) ist nur eine grobe Schätzung, weil die aufgedruckten Vergrößerungen nicht ganz genau stimmen.`
  }
  return { result: `E ${qeq(E, 4)}${T('µm')}\\ \\text{pro Teilstrich}`, extra: [`t_{\\text{Obj}} ${qeq(tObj, 6)}${T('µm')}`], steps, remark, E: toNum(E) }
}

/* ---------------------------- Objektgröße ---------------------------- */

/** Längeneinheiten in µm */
const LEN_UM: Record<string, Q> = { nm: q(1, 1000), µm: q(1), mm: q(1000), cm: q(10000) }
export const IMG_UNITS = ['mm', 'cm', 'µm']
export const OBJ_UNITS = ['µm', 'mm', 'nm']

const um = (x: Q, u: string) => {
  const f = LEN_UM[u]
  if (!f) throw new CalcError('Unbekannte Längeneinheit.')
  return mul(x, f)
}

/** Länge in µm passend anzeigen (nm, µm oder mm) */
function lenTex(xum: Q): string {
  const v = toNum(xum)
  if (v >= 1000) return `${qt(div(xum, q(1000)), 4)}${T('mm')}`
  if (v < 1) return `${qt(mul(xum, q(1000)), 4)}${T('nm')}`
  return `${qt(xum, 4)}${T('µm')}`
}
function lenEq(xum: Q): string {
  const v = toNum(xum)
  if (v >= 1000) return `${qeq(div(xum, q(1000)), 4)}${T('mm')}`
  if (v < 1) return `${qeq(mul(xum, q(1000)), 4)}${T('nm')}`
  return `${qeq(xum, 4)}${T('µm')}`
}

export interface SizeSolution extends Solution {
  /** Objektgröße in µm (falls berechnet) */
  G: number | null
  /** Bildgröße in µm (falls berechnet) */
  B: number | null
  /** Vergrößerung (falls berechnet) */
  V: number | null
}

export type SizeMode = 'okular' | 'bild'

/**
 * okular: Teilstriche × Eichfaktor → Objektgröße.
 * bild: B = G · V – zwei von Bildgröße B, Objektgröße G und Vergrößerung V eingeben.
 */
export function objectSize(o: { mode: SizeMode | string; ts?: NumIn | null; E?: NumIn | null; B?: NumIn | null; bu?: string; G?: NumIn | null; gu?: string; V?: NumIn | null }): SizeSolution {
  const steps: Step[] = []
  if (o.mode !== 'bild') {
    const n = needPos(o.ts, 'die gemessenen Teilstriche', 'Die Zahl der Teilstriche')
    const E = needPos(o.E, 'den Eichfaktor (µm pro Teilstrich)', 'Der Eichfaktor')
    if (toNum(E) > 1000) throw new CalcError('Der Eichfaktor ist in µm pro Teilstrich gefragt – so groß ist er nie.')
    const G = mul(n, E)
    steps.push({ tex: `n = ${qTex(n, F)}\\ \\text{Teilstriche},\\quad E = ${qTex(E, F)}${T('µm')}\\ \\text{pro Teilstrich}`, head: 'Gegeben', note: 'Das Objekt mit dem Okularmikrometer ausgemessen; der Eichfaktor gehört zum verwendeten Objektiv.' })
    steps.push({ tex: 'G = n \\cdot E', head: 'Formel', note: 'Anzahl der Teilstriche mal Länge eines Teilstrichs im Präparat.' })
    steps.push({ tex: `G = ${qTex(n, F)} \\cdot ${qTex(E, F)}${T('µm')} ${lenEq(G)}`, head: 'Einsetzen', final: true })
    if (toNum(G) >= 1000) steps.push({ tex: `G ${qeq(G, 4)}${T('µm')} ${lenEq(G)}`, note: 'In mm umgerechnet: $1\\,\\text{mm} = 1000\\,\\mu\\text{m}$.' })
    return {
      result: `G ${lenEq(G)}`,
      steps,
      remark: 'Zur Einordnung: Bakterien sind etwa 0,5–5 µm groß, rote Blutkörperchen etwa 7–8 µm, viele tierische Zellen 10–30 µm, Pflanzenzellen oft 20–100 µm.',
      G: toNum(G),
      B: null,
      V: null,
    }
  }
  const have = [o.B, o.G, o.V].filter(Boolean).length
  if (have !== 2) throw new CalcError('Bitte genau zwei der drei Werte eingeben (Bildgröße, Objektgröße, Vergrößerung) – der dritte wird berechnet.')
  const bu = o.bu ?? 'mm'
  const gu = o.gu ?? 'µm'
  if (o.B && sign(o.B.q) <= 0) throw new CalcError('Die Bildgröße muss größer als 0 sein.')
  if (o.G && sign(o.G.q) <= 0) throw new CalcError('Die Objektgröße muss größer als 0 sein.')
  if (o.V && sign(o.V.q) <= 0) throw new CalcError('Die Vergrößerung muss größer als 0 sein.')
  const given: string[] = []
  if (o.B) given.push(`B = ${qTex(o.B.q, F)}${T(bu)}`)
  if (o.G) given.push(`G = ${qTex(o.G.q, F)}${T(gu)}`)
  if (o.V) given.push(`V = ${qTex(o.V.q, F)}`)
  steps.push({ tex: given.join(',\\quad '), head: 'Gegeben', note: '$B$ = Größe im Bild (Zeichnung, Foto, Bildschirm), $G$ = wirkliche Größe des Objekts, $V$ = Vergrößerung bzw. Maßstab $V : 1$.' })
  steps.push({ tex: 'B = G \\cdot V', head: 'Formel', note: 'Die Bildgröße ist die wirkliche Größe mal Vergrößerung.' })
  const conv: string[] = []
  const Bum = o.B ? um(o.B.q, bu) : null
  const Gum = o.G ? um(o.G.q, gu) : null
  if (o.B && bu !== 'µm') conv.push(`B = ${qTex(o.B.q, F)}${T(bu)} ${qeq(Bum!, 6)}${T('µm')}`)
  if (o.G && gu !== 'µm') conv.push(`G = ${qTex(o.G.q, F)}${T(gu)} ${qeq(Gum!, 6)}${T('µm')}`)
  if (conv.length) steps.push({ tex: conv.join(',\\quad '), head: 'Einheiten umrechnen', note: 'Bild- und Objektgröße in derselben Einheit (µm): $1\\,\\text{mm} = 1000\\,\\mu\\text{m}$.' })
  if (!o.G) {
    const V = o.V!.q
    const G = div(Bum!, V)
    steps.push({ tex: 'G = \\frac{B}{V}', head: 'Umstellen', note: 'Beide Seiten durch $V$ teilen.' })
    steps.push({ tex: `G = \\frac{${qt(Bum!, 6)}${T('µm')}}{${qTex(V, F)}} ${lenEq(G)}`, head: 'Einsetzen', final: true })
    return { result: `G ${lenEq(G)}`, steps, remark: 'Im Bild gemessene Längen immer durch die Vergrößerung teilen – bei Fotos mit Maßstabsbalken: Balkenlänge im Bild durch die angegebene Länge ergibt die Vergrößerung.', G: toNum(G), B: null, V: null }
  }
  if (!o.B) {
    const V = o.V!.q
    const B = mul(Gum!, V)
    steps.push({ tex: `B = ${qt(Gum!, 6)}${T('µm')} \\cdot ${qTex(V, F)} ${qeq(B, 6)}${T('µm')} = ${lenTex(B)}`, head: 'Einsetzen', final: true })
    return { result: `B ${lenEq(B)}`, steps, remark: 'So groß erscheint das Objekt in der Zeichnung bzw. auf dem Bild.', G: null, B: toNum(B), V: null }
  }
  const V = div(Bum!, Gum!)
  steps.push({ tex: 'V = \\frac{B}{G}', head: 'Umstellen', note: 'Beide Seiten durch $G$ teilen.' })
  steps.push({ tex: `V = \\frac{${qt(Bum!, 6)}${T('µm')}}{${qt(Gum!, 6)}${T('µm')}} ${qeq(V, 4)}`, head: 'Einsetzen', note: 'Die Einheiten kürzen sich – die Vergrößerung hat keine Einheit.', final: true })
  return { result: `V ${qeq(V, 4)}`, extra: [`\\text{Maßstab } ${qt(V, 4)} : 1`], steps, remark: 'Bei Zeichnungen immer den Maßstab (z. B. 400 : 1) oder einen Maßstabsbalken angeben.', G: null, B: null, V: toNum(V) }
}

/* ---------------------------- Auflösung ---------------------------- */

export interface ResSolution extends Solution {
  /** Abbe-Auflösungsgrenze in nm */
  abbe: number
  /** Rayleigh-Kriterium in nm */
  rayleigh: number
}

export function resolution(o: { lambda: NumIn | null; na: NumIn | null; naK?: NumIn | null }): ResSolution {
  const lam = needPos(o.lambda, 'die Wellenlänge λ', 'Die Wellenlänge')
  if (toNum(lam) < 100 || toNum(lam) > 2000) throw new CalcError('Die Wellenlänge ist in nm gefragt – sichtbares Licht hat etwa 400 bis 750 nm.')
  const A = aperture(o.na, 'die numerische Apertur des Objektivs', 'Die numerische Apertur des Objektivs')
  const AK = o.naK ? aperture(o.naK, 'die Apertur des Kondensors', 'Die Apertur des Kondensors') : null
  const steps: Step[] = []
  steps.push({
    tex: `\\lambda = ${qTex(lam, F)}${T('nm')},\\quad A_{\\text{Obj}} = ${qTex(A, F)}${AK ? `,\\quad A_{\\text{Kond}} = ${qTex(AK, F)}` : ''}`,
    head: 'Gegeben',
    note: `Numerische Apertur $A = n \\cdot \\sin\\alpha$: Brechzahl des Mediums zwischen Präparat und Objektiv (Luft 1,0, Immersionsöl etwa 1,52) mal Sinus des halben Öffnungswinkels.${toNum(A) > 1 ? ' Werte über 1 erreichen nur Immersionsobjektive.' : ''}`,
  })
  const sumA = AK ? add(A, AK) : mul(q(2), A)
  steps.push({
    tex: AK ? 'd = \\frac{\\lambda}{A_{\\text{Obj}} + A_{\\text{Kond}}}' : 'd = \\frac{\\lambda}{2 \\cdot A}',
    head: 'Auflösungsgrenze nach Abbe',
    note: AK
      ? 'Allgemeine Form nach Abbe: Objektiv und Kondensor tragen beide zur Auflösung bei. Ist die Kondensorapertur so groß wie die des Objektivs, wird daraus $d = \\tfrac{\\lambda}{2A}$.'
      : 'Abbe: Ein Objekt wird nur aufgelöst, wenn außer dem direkten Licht auch gebeugtes Licht ins Objektiv gelangt. Angenommen ist ein Kondensor mit derselben Apertur wie das Objektiv; allgemein gilt $d = \\tfrac{\\lambda}{A_{\\text{Obj}} + A_{\\text{Kond}}}$.',
  })
  const d = div(lam, sumA)
  steps.push({
    tex: `d = \\frac{${qTex(lam, F)}${T('nm')}}{${AK ? `${qTex(A, F)} + ${qTex(AK, F)}` : `2 \\cdot ${qTex(A, F)}`}} ${qeq(d, 4)}${T('nm')} ${qeq(div(d, q(1000)), 3)}${T('µm')}`,
    head: 'Einsetzen',
    note: 'Zwei Punkte, die näher als $d$ beieinanderliegen, verschwimmen zu einem.',
    final: true,
  })
  const ray = div(mul(qFromRaw('0.61'), lam), A)
  steps.push({
    tex: `d_{\\text{Rayleigh}} = \\frac{0{,}61 \\cdot \\lambda}{A} = \\frac{0{,}61 \\cdot ${qTex(lam, F)}${T('nm')}}{${qTex(A, F)}} ${qeq(ray, 4)}${T('nm')}`,
    head: 'Rayleigh-Kriterium',
    note: 'Zum Vergleich: Nach Rayleigh sind zwei leuchtende Punkte gerade noch getrennt, wenn das Maximum des einen im ersten Minimum des anderen liegt (z. B. bei Fluoreszenz). Die Werte liegen in derselben Größenordnung.',
  })
  return {
    result: `d ${qeq(d, 4)}${T('nm')} ${qeq(div(d, q(1000)), 3)}${T('µm')}`,
    extra: [`d_{\\text{Rayleigh}} ${qeq(ray, 4)}${T('nm')}`],
    steps,
    remark: 'Bessere Auflösung (kleineres $d$) durch kürzere Wellenlänge (blaues Licht) und größere numerische Apertur (Immersionsöl, Kondensor ganz öffnen). Mit Licht sind etwa 0,2 µm die Grenze – die meisten Viren sieht man deshalb nur im Elektronenmikroskop.',
    abbe: toNum(d),
    rayleigh: toNum(ray),
  }
}

/* ---------------------------- Sehfeld ---------------------------- */

export interface FovSolution extends Solution {
  /** Sehfelddurchmesser in mm */
  d: number
  /** geschätzte Objektgröße in µm (falls Anzahl gegeben) */
  size: number | null
}

export function fieldOfView(o: { fz: NumIn | null; obj: NumIn | null; tube?: NumIn | null; count?: NumIn | null }): FovSolution {
  const fz = needPos(o.fz, 'die Sehfeldzahl des Okulars', 'Die Sehfeldzahl')
  if (toNum(fz) > 40) throw new CalcError('Die Sehfeldzahl ist in mm gefragt – üblich sind 18 bis 26 mm.')
  const vo = needPos(o.obj, 'die Vergrößerung des Objektivs', 'Die Objektivvergrößerung')
  const tube = o.tube ? o.tube.q : null
  if (tube && sign(tube) <= 0) throw new CalcError('Die Zwischenvergrößerung muss größer als 0 sein.')
  const steps: Step[] = []
  steps.push({
    tex: `\\text{SFZ} = ${qTex(fz, F)}${T('mm')},\\quad V_{\\text{Obj}} = ${qTex(vo, F)}${tube ? `,\\quad q = ${qTex(tube, F)}` : ''}`,
    head: 'Gegeben',
    note: 'Die Sehfeldzahl steht auf dem Okular hinter dem Schrägstrich (z. B. „10×/20“ → 20 mm). Sie ist der Durchmesser des Zwischenbilds, das man durch das Okular sieht.',
  })
  steps.push({
    tex: tube ? 'd_{\\text{Sehfeld}} = \\frac{\\text{SFZ}}{V_{\\text{Obj}} \\cdot q}' : 'd_{\\text{Sehfeld}} = \\frac{\\text{SFZ}}{V_{\\text{Obj}}}',
    head: 'Formel',
    note: 'Die Okularvergrößerung spielt keine Rolle – sie vergrößert das Zwischenbild nur für das Auge.',
  })
  const dmm = div(fz, mul(vo, tube ?? q(1)))
  const dum = mul(dmm, q(1000))
  steps.push({
    tex: `d_{\\text{Sehfeld}} = \\frac{${qTex(fz, F)}${T('mm')}}{${qTex(vo, F)}${tube ? ` \\cdot ${qTex(tube, F)}` : ''}} ${qeq(dmm, 4)}${T('mm')} ${qeq(dum, 4)}${T('µm')}`,
    head: 'Einsetzen',
    note: 'So groß ist der Ausschnitt des Präparats, den man auf einmal sieht.',
    final: true,
  })
  const r = toNum(dmm) / 2
  const area = Math.PI * r * r
  steps.push({
    tex: `A = \\pi \\cdot \\left(\\frac{d}{2}\\right)^2 = \\pi \\cdot (${fnt(r, 4)}${T('mm')})^2 ${feqv(area, 4)}${T('mm²')}`,
    head: 'Sehfeldfläche',
    note: 'Nützlich zum Hochrechnen, z. B. wenn man Zellen in mehreren Sehfeldern zählt.',
  })
  const extra = [`A ${feqv(area, 4)}${T('mm²')}`]
  let size: number | null = null
  if (o.count) {
    const c = needPos(o.count, 'die Anzahl der Objekte', 'Die Anzahl der Objekte')
    const s = div(dum, c)
    size = toNum(s)
    steps.push({
      tex: `G \\approx \\frac{d_{\\text{Sehfeld}}}{\\text{Anzahl}} = \\frac{${qt(dum, 4)}${T('µm')}}{${qTex(c, F)}} ${qeq(s, 4)}${T('µm')}`,
      head: 'Objektgröße schätzen',
      note: 'Passen so viele Objekte nebeneinander über den Durchmesser des Sehfelds, ist eines etwa so groß.',
      final: true,
    })
    extra.unshift(`G \\approx ${qt(s, 4)}${T('µm')}\\ \\text{pro Objekt}`)
  }
  return {
    result: `d_{\\text{Sehfeld}} ${qeq(dmm, 4)}${T('mm')} ${qeq(dum, 4)}${T('µm')}`,
    extra,
    steps,
    remark: 'Je stärker das Objektiv, desto kleiner das Sehfeld: Beim Wechsel von 10× auf 40× sieht man nur noch ein Viertel des Durchmessers (ein Sechzehntel der Fläche).',
    d: toNum(dmm),
    size,
  }
}
