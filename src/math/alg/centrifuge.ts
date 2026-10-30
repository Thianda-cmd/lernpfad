/**
 * Zentrifuge: relative Zentrifugalbeschleunigung RZB (× g) aus der Drehzahl, Drehzahl aus der RZB
 * und dieselbe RZB mit einem anderen Rotor – jeweils mit vollständigem Rechenweg.
 *
 * RZB = 1,118 · 10⁻⁵ · r · n²  (r in cm, n in min⁻¹), denn a = ω² · r mit ω = 2π · n / 60,
 * geteilt durch g = 9,81 m/s² und r in cm statt m: 4π² / (3600 · 100 · 9,81) ≈ 1,118 · 10⁻⁵.
 */
import { CalcError, div, mul, q, qFromRaw, qTex, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'
import { F, feqv, fnt, T } from './units'
import { needPos, qeq, qt, sciT } from './serial'

/** Faktor der Zahlenwertgleichung RZB = K · r[cm] · n²[min⁻¹] */
export const K_RZB = qFromRaw('1.118e-5')
const K_TEX = '1{,}118 \\cdot 10^{-5}'
const RPM = T('min⁻¹')
const XG = '\\times g'
/** Zahl zum Quadrieren: Zehnerpotenzen und Brüche in Klammern ((1 · 10⁻³)², nicht 10^{-3}^2) */
const sq = (t: string) => (t.includes('\\') ? `\\left(${t}\\right)^2` : `${t}^2`)

export interface CentSolution extends Solution {
  /** RZB (× g) */
  rcf: number
  /** Drehzahl in min⁻¹ (bei „Rotor wechseln“: die neue Drehzahl) */
  rpm: number
}

/** Radius in cm (Eingabe in cm oder mm) */
function radius(v: NumIn | null | undefined, ru: string, acc = 'den Radius r', nom = 'Der Radius'): { cm: Q; tex: string; conv: string | null } {
  const r = needPos(v, acc, nom)
  if (ru !== 'cm' && ru !== 'mm') throw new CalcError('Den Radius bitte in cm oder mm angeben.')
  const cm = ru === 'mm' ? div(r, q(10)) : r
  if (toNum(cm) > 100) throw new CalcError('Der Radius ist größer als 1 m – das ist keine Laborzentrifuge. Einheit prüfen (cm oder mm).')
  if (toNum(cm) < 0.5) throw new CalcError('Ein Radius unter 0,5 cm ist unrealistisch – Einheit prüfen (cm oder mm).')
  return { cm, tex: `${qTex(r, F)}${T(ru)}`, conv: ru === 'mm' ? `${qTex(r, F)}${T('mm')} ${qeq(cm, 6)}${T('cm')}` : null }
}

function rpmIn(v: NumIn | null | undefined, acc = 'die Drehzahl n', nom = 'Die Drehzahl'): Q {
  const n = needPos(v, acc, nom)
  if (toNum(n) > 200000) throw new CalcError('Mehr als 200 000 Umdrehungen pro Minute schafft keine Zentrifuge.')
  return n
}

/** Herleitung des Faktors – als Erklärung zur Formel */
const DERIVATION =
  'Zahlenwertgleichung mit $r$ in cm und $n$ in Umdrehungen pro Minute. Herleitung: Die Zentripetalbeschleunigung ist $a = \\omega^2 \\cdot r$ mit der Winkelgeschwindigkeit $\\omega = \\tfrac{2\\pi \\cdot n}{60\\,\\text{s}}$. Geteilt durch die Erdbeschleunigung $g = 9{,}81\\,\\tfrac{\\text{m}}{\\text{s}^2}$ und mit $r$ in cm ($\\tfrac{r}{100}$ in m) ergibt sich $\\tfrac{4\\pi^2}{3600 \\cdot 100 \\cdot 9{,}81} \\approx 1{,}118 \\cdot 10^{-5}$.'

const derivStep = (): Step => ({
  tex: `\\text{RZB} = \\frac{\\omega^2 \\cdot r}{g} = \\frac{\\left(\\frac{2\\pi n}{60}\\right)^2 \\cdot \\frac{r}{100}}{9{,}81} = \\frac{4\\pi^2}{3600 \\cdot 100 \\cdot 9{,}81} \\cdot r \\cdot n^2 \\approx ${K_TEX} \\cdot r \\cdot n^2`,
  note: 'So entsteht der Faktor: Einheiten (min → s, cm → m) und $g$ stecken in der Zahl.',
})

const REMARK =
  'Der Radius $r$ ist der Abstand von der Drehachse bis zum Boden des Röhrchens ($r_{\\max}$) – dort ist die Beschleunigung am größten; er steht im Datenblatt des Rotors. Protokolle sollten die RZB (× g) angeben, nicht die Drehzahl: Die hängt vom Rotor ab. Viele Zentrifugen lassen sich direkt auf × g einstellen. Rotor immer ausbalancieren (gegenüberliegende Röhrchen gleich schwer).'

/* ---------------------------- Drehzahl → RZB ---------------------------- */

export function rcfFromRpm(o: { r: NumIn | null; ru: string; n: NumIn | null }): CentSolution {
  const r = radius(o.r, o.ru)
  const n = rpmIn(o.n)
  const steps: Step[] = []
  steps.push({ tex: `r = ${r.tex},\\quad n = ${qt(n, 8)}${RPM}`, head: 'Gegeben', note: 'Gesucht ist die relative Zentrifugalbeschleunigung RZB (englisch RCF) – wie viel Mal die Erdbeschleunigung $g$.' })
  if (r.conv) steps.push({ tex: `r = ${r.conv}`, head: 'Einheiten umrechnen', note: 'Die Formel braucht den Radius in cm.' })
  steps.push({ tex: `\\text{RZB} = ${K_TEX} \\cdot r \\cdot n^2`, head: 'Formel', note: DERIVATION })
  steps.push(derivStep())
  const n2 = mul(n, n)
  const rcf = mul(mul(K_RZB, r.cm), n2)
  steps.push({
    tex: `\\text{RZB} = ${K_TEX} \\cdot ${qt(r.cm, 6)} \\cdot ${sq(qt(n, 8))} = ${K_TEX} \\cdot ${qt(r.cm, 6)} \\cdot ${sciT(toNum(n2), 4, 1e-3, 1e8)} ${feqv(toNum(rcf), 4)} ${XG}`,
    head: 'Einsetzen',
    note: 'Die Drehzahl geht im Quadrat ein: doppelte Drehzahl → vierfache Beschleunigung.',
    final: true,
  })
  return {
    result: `\\text{RZB} ${feqv(toNum(rcf), 4)} ${XG}`,
    extra: [`\\text{bei } r = ${r.tex}\\text{ und } ${qt(n, 8)}${RPM}`],
    steps,
    remark: REMARK,
    rcf: toNum(rcf),
    rpm: toNum(n),
  }
}

/* ---------------------------- RZB → Drehzahl ---------------------------- */

export function rpmFromRcf(o: { r: NumIn | null; ru: string; rcf: NumIn | null }): CentSolution {
  const r = radius(o.r, o.ru)
  const g = needPos(o.rcf, 'die RZB (× g)', 'Die RZB')
  if (toNum(g) > 1.5e6) throw new CalcError('Mehr als 1 500 000 × g erreicht keine Zentrifuge.')
  if (toNum(g) < 1) throw new CalcError('Eine RZB unter 1 × g ist weniger als die Erdbeschleunigung – bitte die Eingabe prüfen.')
  const steps: Step[] = []
  steps.push({ tex: `\\text{RZB} = ${qt(g, 8)} ${XG},\\quad r = ${r.tex}`, head: 'Gegeben', note: 'Gesucht ist die Drehzahl, die dieser Rotor für die geforderte Beschleunigung braucht.' })
  if (r.conv) steps.push({ tex: `r = ${r.conv}`, head: 'Einheiten umrechnen', note: 'Die Formel braucht den Radius in cm.' })
  steps.push({ tex: `\\text{RZB} = ${K_TEX} \\cdot r \\cdot n^2`, head: 'Formel', note: DERIVATION })
  steps.push(derivStep())
  steps.push({
    tex: `n^2 = \\frac{\\text{RZB}}{${K_TEX} \\cdot r} \\quad\\Rightarrow\\quad n = \\sqrt{\\frac{\\text{RZB}}{${K_TEX} \\cdot r}}`,
    head: 'Umstellen',
    note: 'Durch $1{,}118 \\cdot 10^{-5} \\cdot r$ teilen, dann die Wurzel ziehen.',
  })
  const inner = toNum(div(g, mul(K_RZB, r.cm)))
  const n = Math.sqrt(inner)
  steps.push({
    tex: `n = \\sqrt{\\frac{${qt(g, 8)}}{${K_TEX} \\cdot ${qt(r.cm, 6)}}} = \\sqrt{${sciT(inner, 4, 1e-3, 1e6)}} ${feqv(n, 4)}${RPM}`,
    head: 'Einsetzen',
    final: true,
  })
  const rnd = Math.round(n / 10) * 10
  const back = toNum(K_RZB) * toNum(r.cm) * rnd * rnd
  steps.push({
    tex: `\\text{RZB} = ${K_TEX} \\cdot ${qt(r.cm, 6)} \\cdot ${sq(fnt(rnd, 8))} ${feqv(back, 4)} ${XG}`,
    head: 'Probe',
    note: `Mit der auf 10 gerundeten Drehzahl $${fnt(rnd, 8)}\\,\\text{min}^{-1}$ (so lässt sie sich einstellen) kommt man wieder ungefähr auf die geforderte RZB.`,
  })
  return {
    result: `n ${feqv(n, 4)}${RPM}`,
    extra: [`\\text{eingestellt etwa } ${fnt(rnd, 8)}${RPM}\\ \\text{(rpm)}`],
    steps,
    remark: REMARK,
    rcf: toNum(g),
    rpm: n,
  }
}

/* ---------------------------- Rotor wechseln ---------------------------- */

/** Protokoll: n₁ bei Radius r₁ – gleiche RZB im eigenen Rotor mit Radius r₂ */
export function rotorSwap(o: { r1: NumIn | null; n1: NumIn | null; r2: NumIn | null; ru: string }): CentSolution {
  const r1 = radius(o.r1, o.ru, 'den Radius r₁ aus dem Protokoll', 'Der Radius r₁')
  const n1 = rpmIn(o.n1, 'die Drehzahl n₁ aus dem Protokoll', 'Die Drehzahl n₁')
  const r2 = radius(o.r2, o.ru, 'den Radius r₂ des eigenen Rotors', 'Der Radius r₂')
  const steps: Step[] = []
  steps.push({
    tex: `r_1 = ${r1.tex},\\quad n_1 = ${qt(n1, 8)}${RPM} \\qquad r_2 = ${r2.tex}`,
    head: 'Gegeben',
    note: 'Das Protokoll gibt eine Drehzahl für einen anderen Rotor an. Entscheidend ist aber die Beschleunigung (RZB) – die soll gleich bleiben.',
  })
  if (r1.conv || r2.conv) steps.push({ tex: [r1.conv && `r_1 = ${r1.conv}`, r2.conv && `r_2 = ${r2.conv}`].filter(Boolean).join(',\\quad '), head: 'Einheiten umrechnen', note: 'Die Formel braucht den Radius in cm.' })
  steps.push({ tex: `\\text{RZB} = ${K_TEX} \\cdot r \\cdot n^2`, head: 'Formel', note: DERIVATION })
  const rcf = mul(mul(K_RZB, r1.cm), mul(n1, n1))
  steps.push({
    tex: `\\text{RZB} = ${K_TEX} \\cdot ${qt(r1.cm, 6)} \\cdot ${sq(qt(n1, 8))} ${feqv(toNum(rcf), 4)} ${XG}`,
    head: 'RZB aus dem Protokoll',
    note: 'Erst die Beschleunigung ausrechnen, die das Protokoll eigentlich meint.',
  })
  const n2 = Math.sqrt(toNum(div(rcf, mul(K_RZB, r2.cm))))
  steps.push({
    tex: `n_2 = \\sqrt{\\frac{\\text{RZB}}{${K_TEX} \\cdot r_2}} = \\sqrt{\\frac{${fnt(toNum(rcf), 6)}}{${K_TEX} \\cdot ${qt(r2.cm, 6)}}} ${feqv(n2, 4)}${RPM}`,
    head: 'Drehzahl im eigenen Rotor',
    note: 'Dieselbe Formel nach $n$ umgestellt, jetzt mit dem eigenen Radius.',
    final: true,
  })
  const ratio = toNum(div(r1.cm, r2.cm))
  steps.push({
    tex: `n_2 = n_1 \\cdot \\sqrt{\\frac{r_1}{r_2}} = ${qt(n1, 8)} \\cdot \\sqrt{\\frac{${qt(r1.cm, 6)}}{${qt(r2.cm, 6)}}} ${feqv(toNum(n1) * Math.sqrt(ratio), 4)}${RPM}`,
    head: 'Kurzweg',
    note: 'Aus $r_1 \\cdot n_1^2 = r_2 \\cdot n_2^2$ – der Faktor $1{,}118 \\cdot 10^{-5}$ kürzt sich heraus. Kleinerer Rotor → höhere Drehzahl für dieselbe RZB.',
  })
  return {
    result: `n_2 ${feqv(n2, 4)}${RPM}`,
    extra: [`\\text{RZB} ${feqv(toNum(rcf), 4)} ${XG}\\ \\text{(wie im Protokoll)}`],
    steps,
    remark: REMARK,
    rcf: toNum(rcf),
    rpm: n2,
  }
}
