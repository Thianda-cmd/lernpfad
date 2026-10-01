import type { Rng } from '../../lib/random'
import { gcd, tfrac, tn, tpar } from '../num'
import { sumInput, sumTex, T } from '../poly'
import type { GenInfo, Problem, Step } from '../types'
import { solveLinear } from './gleichungen'
import { chance, int, nz, pick } from './util'

const lineTex = (m: number, b: number) => `y = ${sumTex([T(m, 'x'), T(b)].filter((t) => Math.abs(t.c) > 1e-12)) || '0'}`
const mTex = (dy: number, dx: number) => {
  const g = gcd(dy, dx) || 1
  return Number.isInteger(dy / dx) ? tn(dy / dx) : tfrac(dy / g, dx / g)
}

/** Steigung aus zwei Punkten */
export function steigungProblem(x1: number, y1: number, x2: number, y2: number): Problem {
  const dy = y2 - y1
  const dx = x2 - x1
  return {
    prompt: `Berechne die Steigung $m$ der Geraden durch $P(${tn(x1)} \\mid ${tn(y1)})$ und $Q(${tn(x2)} \\mid ${tn(y2)})$.`,
    answer: { kind: 'num', value: dy / dx, label: 'm =', rel: 1e-6, fraction: !Number.isInteger(dy / dx) },
    steps: [
      { tex: `m = \\frac{\\Delta y}{\\Delta x} = \\frac{y_2 - y_1}{x_2 - x_1}`, note: 'Steigung = Höhenunterschied durch Breitenunterschied (Steigungsdreieck).' },
      { tex: `m = \\frac{${tn(y2)} - ${tpar(y1)}}{${tn(x2)} - ${tpar(x1)}} = \\frac{${tn(dy)}}{${tn(dx)}} = ${mTex(dy, dx)}` },
    ],
    hint: 'Immer „zweiter Punkt minus erster Punkt“ – oben bei $y$ und unten bei $x$ gleich.',
    figure: { points: [{ x: x1, y: y1, label: 'P' }, { x: x2, y: y2, label: 'Q' }], lines: [{ m: dy / dx, b: y1 - (dy / dx) * x1 }] },
  }
}

/** Geradengleichung durch zwei Punkte */
export function zweiPunkteProblem(x1: number, y1: number, x2: number, y2: number): Problem {
  const m = (y2 - y1) / (x2 - x1)
  const b = y1 - m * x1
  const s = solveLinear([T(m * x1), T(1, 'b')], [T(y1)], 'b')
  const steps: Step[] = [
    { tex: `m = \\frac{${tn(y2)} - ${tpar(y1)}}{${tn(x2)} - ${tpar(x1)}} = ${mTex(y2 - y1, x2 - x1)}`, note: '1. Steigung aus den zwei Punkten.' },
    { tex: `${tn(y1)} = ${tn(m)} \\cdot ${tpar(x1)} + b`, note: '2. Einen Punkt in $y = mx + b$ einsetzen, um $b$ zu finden.' },
    ...s.steps.map((st) => ({ ...st, tex: st.tex })),
    { tex: lineTex(m, b), note: '3. Geradengleichung aufschreiben.' },
  ]
  return {
    prompt: `Bestimme die Gleichung der Geraden durch $P(${tn(x1)} \\mid ${tn(y1)})$ und $Q(${tn(x2)} \\mid ${tn(y2)})$.`,
    answer: { kind: 'expr', value: sumInput([T(m, 'x'), T(b)]), vars: ['x'], label: 'y =' },
    steps,
    hint: 'Erst $m$, dann $b$ durch Einsetzen eines Punktes.',
    figure: { points: [{ x: x1, y: y1, label: 'P' }, { x: x2, y: y2, label: 'Q' }], lines: [{ m, b }] },
  }
}

/** Gerade aus Punkt und Steigung */
function punktSteigung(rng: Rng): Problem {
  const m = nz(rng, -4, 4) / pick(rng, [1, 1, 2])
  const x1 = int(rng, -4, 5)
  const b = int(rng, -6, 6)
  const y1 = m * x1 + b
  const s = solveLinear([T(m * x1), T(1, 'b')], [T(y1)], 'b')
  return {
    prompt: `Eine Gerade hat die Steigung $m = ${tn(m)}$ und geht durch $P(${tn(x1)} \\mid ${tn(y1)})$. Bestimme ihre Gleichung.`,
    answer: { kind: 'expr', value: sumInput([T(m, 'x'), T(b)]), vars: ['x'], label: 'y =' },
    steps: [{ tex: `${tn(y1)} = ${tn(m)} \\cdot ${tpar(x1)} + b`, note: 'Punkt und Steigung in $y = mx + b$ einsetzen.' }, ...s.steps, { tex: lineTex(m, b) }],
    hint: '$y = mx + b$ – nur $b$ ist unbekannt.',
    figure: { points: [{ x: x1, y: y1, label: 'P' }], lines: [{ m, b }] },
  }
}

/** Nullstelle */
function nullstelle(rng: Rng): Problem {
  const m = nz(rng, -5, 5)
  const x0 = int(rng, -6, 6) / pick(rng, [1, 1, 2])
  const b = -m * x0
  const s = solveLinear([T(m, 'x'), T(b)], [T(0)], 'x')
  return {
    prompt: `Berechne die Nullstelle der Geraden $${lineTex(m, b)}$.`,
    answer: { kind: 'num', value: x0, label: 'x_0 =', rel: 1e-6, tol: 1e-6 },
    steps: [{ tex: `0 = ${sumTex([T(m, 'x'), T(b)].filter((t) => t.c !== 0))}`, note: 'Nullstelle: Dort ist $y = 0$.' }, ...s.steps],
    hint: '$y = 0$ setzen und nach $x$ auflösen.',
    figure: { lines: [{ m, b }], points: [{ x: x0, y: 0, label: 'N' }] },
  }
}

/** Schnittpunkt zweier Geraden */
export function schnittProblem(m1: number, b1: number, m2: number, b2: number): Problem {
  const s = solveLinear([T(m1, 'x'), T(b1)], [T(m2, 'x'), T(b2)], 'x')
  const x = s.value.reduce((q, t) => q + t.c, 0)
  const y = m1 * x + b1
  return {
    prompt: `Berechne den Schnittpunkt der Geraden $g\\colon ${lineTex(m1, b1)}$ und $h\\colon ${lineTex(m2, b2)}$.`,
    answer: { kind: 'nums', values: [x, y], labels: ['x', 'y'], ordered: true, tol: 1e-6 },
    steps: [
      { ...s.steps[0], note: 'Im Schnittpunkt haben beide Geraden denselben $y$-Wert → gleichsetzen.' },
      ...s.steps.slice(1),
      { tex: `y = ${tn(m1)} \\cdot ${tpar(x)} ${b1 < 0 ? '-' : '+'} ${tn(Math.abs(b1))} = ${tn(y)}`, note: '$x$ in eine der beiden Gleichungen einsetzen.' },
      { tex: `S(${tn(x)} \\mid ${tn(y)})` },
    ],
    hint: 'Gleichsetzen, $x$ berechnen, dann $y$.',
    figure: { lines: [{ m: m1, b: b1, label: 'g' }, { m: m2, b: b2, label: 'h' }], points: [{ x, y, label: 'S' }] },
  }
}

function ablesen(rng: Rng): Problem {
  const m = nz(rng, -3, 3) / pick(rng, [1, 1, 2])
  const b = int(rng, -4, 4)
  return {
    prompt: 'Lies Steigung $m$ und y-Achsenabschnitt $b$ der Geraden ab.',
    answer: { kind: 'nums', values: [m, b], labels: ['m', 'b'], ordered: true, tol: 1e-6 },
    steps: [
      { tex: `b = ${tn(b)}`, note: '$b$: Dort schneidet die Gerade die $y$-Achse.' },
      { tex: `m = \\frac{\\Delta y}{\\Delta x} = ${tn(m)}`, note: 'Steigungsdreieck: 1 nach rechts – wie viel nach oben (+) oder unten (−)?' },
      { tex: lineTex(m, b) },
    ],
    hint: 'Starte am Schnittpunkt mit der $y$-Achse und gehe 1 (oder 2) Kästchen nach rechts.',
    figure: { lines: [{ m, b }], points: [{ x: 0, y: b }] },
  }
}

function punktprobe(rng: Rng): Problem {
  const m = nz(rng, -4, 4)
  const b = int(rng, -6, 6)
  const x = int(rng, -5, 5)
  const on = chance(rng, 0.5)
  const y = m * x + b + (on ? 0 : pick(rng, [-2, -1, 1, 2]))
  const val = m * x + b
  return {
    prompt: `Liegt der Punkt $P(${tn(x)} \\mid ${tn(y)})$ auf der Geraden $${lineTex(m, b)}$?`,
    answer: { kind: 'choice', options: ['Ja, P liegt auf der Geraden', 'Nein, P liegt nicht auf der Geraden'], correct: on ? 0 : 1 },
    steps: [
      { tex: `${tn(m)} \\cdot ${tpar(x)} ${b < 0 ? '-' : '+'} ${tn(Math.abs(b))} = ${tn(val)}`, note: '$x$-Wert des Punktes einsetzen.' },
      { tex: on ? `${tn(val)} = ${tn(y)}\\ \\checkmark` : `${tn(val)} \\neq ${tn(y)}`, note: on ? 'Wahre Aussage → P liegt auf der Geraden.' : 'Falsche Aussage → P liegt nicht auf der Geraden.' },
    ],
    hint: 'Punktprobe: $x$ einsetzen und das Ergebnis mit $y$ vergleichen.',
  }
}

const LAGE = ['Sie schneiden sich (nicht senkrecht).', 'Sie schneiden sich senkrecht.', 'Sie sind parallel.', 'Sie sind identisch.']

/** Lage zweier Geraden: über m und b entscheiden */
export function lageProblem(m1: number, b1: number, m2: number, b2: number): Problem {
  const same = Math.abs(m1 - m2) < 1e-12
  const perp = !same && Math.abs(m1 * m2 + 1) < 1e-12
  const correct = same ? (Math.abs(b1 - b2) < 1e-12 ? 3 : 2) : perp ? 1 : 0
  const steps: Step[] = [{ tex: `m_g = ${tn(m1)},\\quad m_h = ${tn(m2)}`, note: 'Steigungen vergleichen.' }]
  if (same) {
    steps.push({ tex: `b_g = ${tn(b1)},\\quad b_h = ${tn(b2)}`, note: 'Gleiche Steigung → $b$ vergleichen.' })
    steps.push({ tex: correct === 3 ? '\\text{gleiches } m \\text{ und gleiches } b \\Rightarrow \\text{identisch}' : '\\text{gleiches } m,\\ \\text{anderes } b \\Rightarrow \\text{parallel}' })
  } else {
    steps.push({ tex: `m_g \\cdot m_h = ${tn(m1)} \\cdot ${tpar(m2)} = ${tn(m1 * m2)}`, note: 'Senkrecht genau dann, wenn $m_g \\cdot m_h = -1$.' })
    steps.push({ tex: perp ? '\\Rightarrow \\text{senkrecht}' : '\\neq -1 \\Rightarrow \\text{schneiden sich, nicht senkrecht}' })
  }
  return {
    prompt: `Wie liegen $g\\colon ${lineTex(m1, b1)}$ und $h\\colon ${lineTex(m2, b2)}$ zueinander?`,
    answer: { kind: 'choice', options: LAGE, correct },
    steps,
    hint: 'Gleiches $m$: parallel oder identisch. Verschiedenes $m$: Schnittpunkt – senkrecht, wenn $m_g \\cdot m_h = -1$.',
    figure: { lines: [{ m: m1, b: b1, label: 'g' }, ...(correct === 3 ? [] : [{ m: m2, b: b2, label: 'h' }])] },
  }
}

function lage(rng: Rng): Problem {
  const v = int(rng, 0, 3)
  const m1 = nz(rng, -4, 4) / pick(rng, [1, 1, 2])
  const b1 = int(rng, -5, 5)
  if (v === 0) {
    let m2 = nz(rng, -4, 4)
    while (m2 === m1 || Math.abs(m1 * m2 + 1) < 1e-12) m2 = nz(rng, -4, 4)
    return lageProblem(m1, b1, m2, int(rng, -5, 5))
  }
  if (v === 1) {
    const mp = pick(rng, [1, -1, 2, -2, 0.5, -0.5, 4, -4, 0.25, -0.25])
    return lageProblem(mp, b1, -1 / mp, int(rng, -5, 5))
  }
  if (v === 2) return lageProblem(m1, b1, m1, b1 + nz(rng, -4, 4))
  return lageProblem(m1, b1, m1, b1)
}

const eur = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', '{,}'))

type Sach = {
  text: (b: string, m: string) => string
  askY: (x: number) => string
  askX: (y: string) => string
  x: string
  y: string
  unitX: string
  unitY: string
  money: boolean
  bs: number[]
  ms: number[]
  xs: [number, number]
}

const SACH: Sach[] = [
  {
    text: (b, m) => `Ein Taxi kostet $${b}$ € Grundgebühr und $${m}$ € pro Kilometer.`,
    askY: (x) => `Was kostet eine Fahrt über $${x}$ km?`,
    askX: (y) => `Eine Fahrt kostet $${y}$ €. Wie lang war sie?`,
    x: 'Strecke in km', y: 'Preis in Euro', unitX: 'km', unitY: '€', money: true,
    bs: [3, 3.5, 4, 4.5], ms: [1.8, 2, 2.2, 2.5], xs: [3, 25],
  },
  {
    text: (b, m) => `Ein Handwerker berechnet $${b}$ € Anfahrt und $${m}$ € pro Stunde.`,
    askY: (x) => `Wie hoch ist die Rechnung für $${x}$ Stunden?`,
    askX: (y) => `Die Rechnung beträgt $${y}$ €. Wie viele Stunden hat er gearbeitet?`,
    x: 'Zeit in h', y: 'Rechnung in Euro', unitX: 'h', unitY: '€', money: true,
    bs: [25, 30, 40, 45], ms: [35, 40, 48, 55], xs: [2, 12],
  },
  {
    text: (b, m) => `In einem Tank sind $${b}$ L Wasser. Pro Minute laufen $${m}$ L dazu.`,
    askY: (x) => `Wie viel Wasser ist nach $${x}$ Minuten im Tank?`,
    askX: (y) => `Nach wie vielen Minuten sind $${y}$ L im Tank?`,
    x: 'Zeit in min', y: 'Wasser in L', unitX: 'min', unitY: 'L', money: false,
    bs: [40, 50, 80, 120], ms: [6, 8, 12, 15], xs: [3, 30],
  },
]

/** Sachaufgabe zu y = mx + b: y berechnen oder x zurückrechnen */
function anwendung(rng: Rng): Problem {
  const s = pick(rng, SACH)
  const b = pick(rng, s.bs)
  const m = pick(rng, s.ms)
  const x = int(rng, s.xs[0], s.xs[1])
  const y = Math.round((m * x + b) * 100) / 100
  const f = (v: number) => (s.money ? eur(v) : tn(v))
  const setup: Step[] = [
    { tex: `x = \\text{${s.x}},\\quad y = \\text{${s.y}}`, note: 'Variablen festlegen.' },
    { tex: `y = ${tn(m)}x + ${tn(b)}`, note: 'Fester Betrag ist $b$, der Betrag pro Einheit ist die Steigung $m$.' },
  ]
  if (chance(rng, 0.5)) {
    return {
      prompt: `${s.text(f(b), f(m))} ${s.askY(x)}`,
      answer: { kind: 'num', value: y, label: 'y =', unit: s.unitY, tol: 0.006 },
      steps: [...setup, { tex: `y = ${tn(m)} \\cdot ${x} + ${tn(b)} = ${f(y)}`, note: '$x$ einsetzen.' }],
      hint: 'Erst die Geradengleichung $y = mx + b$ aufstellen, dann einsetzen.',
    }
  }
  const sol = solveLinear([T(m, 'x'), T(b)], [T(y)], 'x')
  return {
    prompt: `${s.text(f(b), f(m))} ${s.askX(f(y))}`,
    answer: { kind: 'num', value: x, label: 'x =', unit: s.unitX, rel: 1e-6 },
    steps: [...setup, { ...sol.steps[0], note: '$y$ einsetzen und nach $x$ auflösen.' }, ...sol.steps.slice(1)],
    hint: '$y$ ist bekannt – Gleichung nach $x$ umstellen.',
  }
}

export const GERADEN_GENS: GenInfo[] = [
  { id: 'ablesen', title: 'm und b ablesen', gen: (rng) => ablesen(rng) },
  {
    id: 'steigung',
    title: 'Steigung aus 2 Punkten',
    gen: (rng) => {
      const x1 = int(rng, -5, 4)
      const x2 = x1 + nz(rng, 1, 6)
      return steigungProblem(x1, int(rng, -6, 6), x2, int(rng, -6, 8))
    },
  },
  {
    id: 'zweipunkte',
    title: 'Gerade durch 2 Punkte',
    gen: (rng) => {
      for (;;) {
        const m = nz(rng, -4, 4) / pick(rng, [1, 1, 2])
        const b = int(rng, -6, 6)
        const x1 = int(rng, -4, 3)
        const x2 = x1 + pick(rng, [2, 4])
        const y1 = m * x1 + b
        const y2 = m * x2 + b
        if (!Number.isInteger(y1) || !Number.isInteger(y2)) continue
        return zweiPunkteProblem(x1, y1, x2, y2)
      }
    },
  },
  { id: 'punktsteigung', title: 'Punkt und Steigung', gen: (rng) => punktSteigung(rng) },
  { id: 'nullstelle', title: 'Nullstelle', gen: (rng) => nullstelle(rng) },
  {
    id: 'schnitt',
    title: 'Schnittpunkt',
    gen: (rng) => {
      for (;;) {
        const x = int(rng, -5, 5)
        const m1 = nz(rng, -4, 4)
        const m2 = nz(rng, -4, 4)
        if (m1 === m2) continue
        const b1 = int(rng, -6, 6)
        const y = m1 * x + b1
        return schnittProblem(m1, b1, m2, y - m2 * x)
      }
    },
  },
  { id: 'punktprobe', title: 'Punktprobe', gen: (rng) => punktprobe(rng) },
  { id: 'lage', title: 'Lage zweier Geraden', gen: (rng) => lage(rng) },
  { id: 'anwendung', title: 'Sachaufgaben', gen: (rng) => anwendung(rng) },
]
