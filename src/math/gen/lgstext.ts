import type { Rng } from '../../lib/random'
import { fmt, tn } from '../num'
import type { GenInfo, Problem, Step } from '../types'
import { additionSteps, einsetzProblem, type Eq } from './lgs'
import { solveLinear } from './gleichungen'
import { T } from '../poly'
import { int, pick } from './util'

const txt = (s: string) => `\\text{${s.replace(/%/g, '\\%')}}`

/** Wassertarif: x = Grundgebühr, y = Preis pro m³ */
export function wasser(v1: number, K1: number, v2: number, K2: number): Problem {
  // x + v1 y = K1, x + v2 y = K2  →  II − I
  const y = (K2 - K1) / (v2 - v1)
  const x = K1 - v1 * y
  const steps: Step[] = [
    { tex: `x = ${txt('Grundgebühr in €')},\\quad y = ${txt('Kosten pro m³ in €')}`, note: 'Zuerst festlegen, wofür die Variablen stehen.' },
    { tex: `${txt('I')}\\colon\\ x + ${v1}y = ${tn(K1)}`, note: `Monat 1: Grundgebühr + ${v1} m³ · Preis = ${fmt(K1)} €` },
    { tex: `${txt('II')}\\colon\\ x + ${v2}y = ${tn(K2)}`, note: `Monat 2: Grundgebühr + ${v2} m³ · Preis = ${fmt(K2)} €` },
    { tex: `${txt('II − I')}\\colon\\ (x + ${v2}y) - (x + ${v1}y) = ${tn(K2)} - ${tn(K1)}`, note: 'Die Grundgebühr $x$ ist in beiden Gleichungen gleich – beim Subtrahieren fällt sie weg.' },
    { tex: `${v2 - v1}y = ${tn(K2 - K1)}`, op: `| :${v2 - v1}` },
    { tex: `y = ${tn(y)}` },
    { tex: `x + ${v1} \\cdot ${tn(y)} = ${tn(K1)}`, op: `| -${tn(v1 * y)}`, note: '$y$ in I einsetzen.' },
    { tex: `x = ${tn(x)}` },
    { tex: txt(`Grundgebühr ${fmt(x, 2)} €, Wasser ${fmt(y, 2)} € pro m³.`), note: 'Antwortsatz.' },
  ]
  return {
    prompt: `Eine Wasserrechnung setzt sich aus einer festen Grundgebühr und einem Preis pro m³ zusammen. Im März wurden ${v1} m³ verbraucht, die Rechnung betrug ${fmt(K1, 2)} €. Im Juli/August waren es ${v2} m³ für ${fmt(K2, 2)} €. Berechne Grundgebühr und Preis pro m³.`,
    answer: { kind: 'nums', values: [x, y], labels: ['Grundgebühr', 'Preis pro m³'], units: ['€', '€'], ordered: true, tol: 0.006 },
    steps,
    hint: 'Kosten = Grundgebühr + Menge · Preis. Zwei Monate → zwei Gleichungen.',
  }
}

/** Mischtemperatur: x = kalt, y = warm */
export function mischTemp(a: number, b: number, T1: number, c: number, d: number, T2: number): Problem {
  // (a x + b y)/(a+b) = T1, (c x + d y)/(c+d) = T2
  const s1 = (a + b) * T1
  const s2 = (c + d) * T2
  const e1: Eq = [a, b, s1]
  const pre: Step[] = [
    { tex: `x = ${txt('Temperatur kalt')},\\quad y = ${txt('Temperatur warm')}`, note: 'Variablen festlegen.' },
    { tex: `\\frac{${a}x + ${b}y}{${a + b}} = ${tn(T1)}`, op: `| \\cdot ${a + b}`, note: `Mischtemperatur = gewichteter Mittelwert: ${a} + ${b} = ${a + b} Liter insgesamt.` },
    { tex: `\\frac{${c}x ${d === 1 ? '+ y' : `+ ${d}y`}}{${c + d}} = ${tn(T2)}`, op: `| \\cdot ${c + d}` },
  ]
  if (d === 1) {
    // II nach y auflösen und einsetzen (wie in der Mitschrift)
    const inner = einsetzProblem(e1, -c, s2)
    const vals = inner.answer.kind === 'nums' ? inner.answer.values : [NaN, NaN]
    return {
      prompt: `Mischt man ${a} Liter kaltes mit ${b} Liter warmem Wasser, erhält man ${fmt(T1)} °C. Mischt man ${c} Liter kaltes mit ${d} Liter warmem Wasser, erhält man ${fmt(T2)} °C. Welche Temperatur haben das kalte und das warme Wasser?`,
      answer: { kind: 'nums', values: vals, labels: ['kalt', 'warm'], units: ['°C', '°C'], ordered: true, tol: 0.06 },
      steps: [
        ...pre,
        { tex: `${txt('I')}\\colon\\ ${a}x + ${b}y = ${tn(s1)}` },
        { tex: `${txt('II')}\\colon\\ ${c}x + y = ${tn(s2)}`, op: `| -${c}x`, note: 'II lässt sich leicht nach $y$ auflösen → Einsetzungsverfahren.' },
        ...inner.steps.slice(1),
        { tex: txt(`Kalt: ${fmt(vals[0])} °C, warm: ${fmt(vals[1])} °C.`), note: 'Antwortsatz.' },
      ],
      hint: 'Mischtemperatur $= \\frac{V_1 T_1 + V_2 T_2}{V_1 + V_2}$',
    }
  }
  const { steps, sol } = additionSteps(e1, [c, d, s2], 'x', 'y', [
    ...pre,
    { tex: `${txt('I')}\\colon\\ ${a}x + ${b}y = ${tn(s1)}` },
    { tex: `${txt('II')}\\colon\\ ${c}x + ${d}y = ${tn(s2)}` },
  ])
  return {
    prompt: `Mischt man ${a} Liter kaltes mit ${b} Liter warmem Wasser, erhält man ${fmt(T1)} °C. Mischt man ${c} Liter kaltes mit ${d} Liter warmem Wasser, erhält man ${fmt(T2)} °C. Welche Temperatur haben das kalte und das warme Wasser?`,
    answer: { kind: 'nums', values: sol, labels: ['kalt', 'warm'], units: ['°C', '°C'], ordered: true, tol: 0.06 },
    steps: [...steps, { tex: txt(`Kalt: ${fmt(sol[0])} °C, warm: ${fmt(sol[1])} °C.`) }],
    hint: 'Mischtemperatur $= \\frac{V_1 T_1 + V_2 T_2}{V_1 + V_2}$',
  }
}

/** „Dreimal so viele Männer wie Frauen, 58 Männer mehr“ */
export function personen(k: number, diff: number): Problem {
  const x = diff / (k - 1)
  const s = solveLinear([T(k, 'x')], [T(1, 'x'), T(diff)], 'x')
  return {
    prompt: `In einem Betrieb arbeiten ${k === 2 ? 'doppelt' : k === 3 ? 'dreimal' : `${k}-mal`} so viele Männer wie Frauen. Es sind ${diff} Männer mehr als Frauen. Wie viele Frauen und wie viele Männer arbeiten dort?`,
    answer: { kind: 'nums', values: [x, k * x], labels: ['Frauen', 'Männer'], ordered: true, tol: 1e-6 },
    steps: [
      { tex: `x = ${txt('Frauen')},\\quad y = ${txt('Männer')}` },
      { tex: `${txt('I')}\\colon\\ y = ${k}x`, note: `„${k === 3 ? 'dreimal' : k + '-mal'} so viele Männer wie Frauen“` },
      { tex: `${txt('II')}\\colon\\ y = x + ${diff}`, note: `„${diff} Männer mehr als Frauen“` },
      { ...s.steps[0], note: 'Beide Gleichungen nach $y$ aufgelöst → gleichsetzen.' },
      ...s.steps.slice(1),
      { tex: `y = ${k} \\cdot ${tn(x)} = ${tn(k * x)}`, note: '$x$ in I einsetzen.' },
      { tex: txt(`${fmt(x)} Frauen und ${fmt(k * x)} Männer.`) },
    ],
    hint: 'Übersetze jeden Satz in eine Gleichung.',
  }
}

/** Mischungsrechnen mit zwei Lösungen (Laborbezug) */
export function mischLoesung(p1: number, p2: number, total: number, pz: number): Problem {
  // x + y = total ; p1 x + p2 y = pz total
  const y = (total * (pz - p1)) / (p2 - p1)
  const x = total - y
  const { steps } = additionSteps([1, 1, total], [p1, p2, pz * total], 'x', 'y', [
    { tex: `x = ${txt(`Masse ${p1} %-Lösung`)},\\quad y = ${txt(`Masse ${p2} %-Lösung`)}` },
    { tex: `${txt('I')}\\colon\\ x + y = ${total}`, note: 'Gesamtmasse der Mischung.' },
    { tex: `${txt('II')}\\colon\\ ${tn(p1 / 100)}x + ${tn(p2 / 100)}y = ${tn((pz / 100) * total)}`, op: '| \\cdot 100', note: `Masse des gelösten Stoffs: ${pz} % von ${total} g.` },
  ])
  return {
    prompt: `Im Labor sollen ${total} g einer ${pz} %igen Lösung aus einer ${p1} %igen und einer ${p2} %igen Lösung gemischt werden. Wie viel Gramm braucht man jeweils?`,
    answer: { kind: 'nums', values: [x, y], labels: [`${p1} %-Lösung`, `${p2} %-Lösung`], units: ['g', 'g'], ordered: true, tol: 0.06 },
    steps: [...steps, { tex: txt(`${fmt(x)} g der ${p1} %igen und ${fmt(y)} g der ${p2} %igen Lösung.`) }],
    hint: 'Eine Gleichung für die Gesamtmasse, eine für die Masse des gelösten Stoffs.',
  }
}

/** Eintrittskarten Erwachsene / Kinder */
function tickets(rng: Rng): Problem {
  const pe = pick(rng, [8, 9, 12, 14, 15])
  const pk = pick(rng, [3, 4, 5, 6])
  const e = int(rng, 20, 90)
  const k = int(rng, 10, 80)
  const n = e + k
  const sum = pe * e + pk * k
  const { steps, sol } = additionSteps([1, 1, n], [pe, pk, sum], 'x', 'y', [
    { tex: `x = ${txt('Erwachsene')},\\quad y = ${txt('Kinder')}` },
  ])
  return {
    prompt: `Ein Museum verkauft an einem Tag ${n} Eintrittskarten und nimmt ${sum} € ein. Erwachsene zahlen ${pe} €, Kinder ${pk} €. Wie viele Erwachsene und wie viele Kinder waren da?`,
    answer: { kind: 'nums', values: sol, labels: ['Erwachsene', 'Kinder'], ordered: true, tol: 1e-6 },
    steps: [...steps, { tex: txt(`${sol[0]} Erwachsene und ${sol[1]} Kinder.`) }],
    hint: 'Eine Gleichung für die Anzahl, eine für das Geld.',
  }
}

export const LGSTEXT_GENS: GenInfo[] = [
  {
    id: 'wasser',
    title: 'Tarife (Grundgebühr)',
    gen: (rng) => {
      const x = pick(rng, [2.5, 4, 5, 6.5, 8, 9.5, 12])
      const y = pick(rng, [1.5, 2, 2.25, 2.5, 3, 3.5, 4])
      const v1 = pick(rng, [8, 10, 12, 15, 18])
      const v2 = v1 + pick(rng, [10, 12, 15, 20])
      return wasser(v1, x + v1 * y, v2, x + v2 * y)
    },
  },
  {
    id: 'mischtemp',
    title: 'Mischtemperatur',
    gen: (rng) => {
      for (;;) {
        const x = pick(rng, [10, 12, 13.5, 14, 15, 16, 18])
        const y = pick(rng, [50, 55, 58, 60, 61, 64, 70, 75])
        const a = int(rng, 1, 4)
        const b = int(rng, 1, 4)
        const c = int(rng, 2, 5)
        const d = rng() < 0.6 ? 1 : int(rng, 2, 4)
        if (a * d === b * c) continue
        const T1 = (a * x + b * y) / (a + b)
        const T2 = (c * x + d * y) / (c + d)
        if (Math.abs(T1 * 10 - Math.round(T1 * 10)) > 1e-9 || Math.abs(T2 * 10 - Math.round(T2 * 10)) > 1e-9) continue
        return mischTemp(a, b, T1, c, d, T2)
      }
    },
  },
  {
    id: 'personen',
    title: 'Anzahlen vergleichen',
    gen: (rng) => {
      const k = int(rng, 2, 5)
      const x = int(rng, 8, 40)
      return personen(k, (k - 1) * x)
    },
  },
  {
    id: 'mischloesung',
    title: 'Lösungen mischen',
    gen: (rng) => {
      for (;;) {
        const p1 = pick(rng, [5, 10, 15, 20])
        const p2 = pick(rng, [30, 40, 50, 60, 80])
        const pz = pick(rng, [12, 15, 20, 25, 30, 35, 40])
        const total = pick(rng, [100, 200, 250, 300, 400, 500])
        if (pz <= p1 || pz >= p2) continue
        const y = (total * (pz - p1)) / (p2 - p1)
        if (Math.abs(y - Math.round(y)) > 1e-9) continue
        return mischLoesung(p1, p2, total, pz)
      }
    },
  },
  { id: 'tickets', title: 'Eintrittskarten', gen: (rng) => tickets(rng) },
]
