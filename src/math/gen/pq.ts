import type { Rng } from '../../lib/random'
import { tn, tpar } from '../num'
import { sumTex, T } from '../poly'
import type { GenInfo, Level, Problem, Step } from '../types'
import { chance, int, nz, pick } from './util'

const quad = (a: number, b: number, c: number) => sumTex([T(a, 'x2'), T(b, 'x'), T(c)].filter((t) => Math.abs(t.c) > 1e-12))

/** Quadratische Gleichung a x² + b x + c = r mit der p-q-Formel lösen */
export function pqProblem(a: number, b: number, c: number, r = 0): Problem {
  const steps: Step[] = []
  const orig = `${quad(a, b, c)} = ${tn(r)}`
  let cc = c
  if (r !== 0) {
    steps.push({ tex: orig, op: `| ${r > 0 ? '-' : '+'}${tn(Math.abs(r))}`, note: 'Zuerst muss auf einer Seite 0 stehen.' })
    cc = c - r
  }
  if (a !== 1) {
    steps.push({
      tex: `${quad(a, b, cc)} = 0`,
      op: `| :${tpar(a)}`,
      note: `Normalform herstellen: Vor $x^2$ muss 1 stehen. Also **durch** ${tn(a)} teilen – nicht multiplizieren!`,
    })
  }
  const p = b / a
  const q = cc / a
  steps.push({ tex: `${quad(1, p, q)} = 0`, note: `Normalform $x^2 + px + q = 0$ mit $p = ${tn(p)}$ und $q = ${tn(q)}$.` })
  const h = p / 2
  const D = h * h - q
  steps.push({
    tex: `x_{1,2} = -\\frac{${tpar(p)}}{2} \\pm \\sqrt{\\left(\\frac{${tpar(p)}}{2}\\right)^2 - ${tpar(q)}}`,
    note: 'p-q-Formel: $x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}$',
  })
  steps.push({ tex: `x_{1,2} = ${tn(-h)} \\pm \\sqrt{${tn(h * h)} ${q < 0 ? '+' : '-'} ${tn(Math.abs(q))}} = ${tn(-h)} \\pm \\sqrt{${tn(D)}}`, note: `Diskriminante $D = \\left(\\frac{p}{2}\\right)^2 - q = ${tn(D)}$.` })
  let values: number[] = []
  if (D < -1e-12) {
    steps.push({ tex: '\\mathbb{L} = \\{\\,\\}', note: 'Unter der Wurzel steht eine negative Zahl → **keine reelle Lösung**.' })
  } else if (Math.abs(D) < 1e-12) {
    values = [-h]
    steps.push({ tex: `x_1 = x_2 = ${tn(-h)}`, note: '$D = 0$ → genau eine (doppelte) Lösung.' })
  } else {
    const s = Math.sqrt(D)
    values = [-h + s, -h - s]
    steps.push({ tex: `x_{1,2} = ${tn(-h)} \\pm ${tn(s)}`, note: 'Wurzel ziehen.' })
    steps.push({ tex: `x_1 = ${tn(-h + s)},\\quad x_2 = ${tn(-h - s)}` })
  }
  steps.push({ tex: `\\text{Probe: } ${values.length ? `${tpar(values[0])}^2 ${p < 0 ? '-' : '+'} ${tn(Math.abs(p))} \\cdot ${tpar(values[0])} ${q < 0 ? '-' : '+'} ${tn(Math.abs(q))} = 0` : '\\text{entfällt}'}`, note: values.length ? 'Einsetzen in die Normalform lohnt sich.' : undefined })
  return {
    prompt: 'Löse die quadratische Gleichung mit der p-q-Formel.',
    tex: orig,
    answer: { kind: 'nums', values, labels: ['x_1', 'x_2'], ordered: false, allowNone: true, tol: 1e-4 },
    steps,
    hint: 'Erst Normalform: rechts 0, vor $x^2$ eine 1. Dann $p$ und $q$ ablesen – mit Vorzeichen!',
  }
}

function gen(rng: Rng, level: Level): Problem {
  const r1 = int(rng, -9, 9)
  const r2 = chance(rng, 0.15) ? r1 : int(rng, -9, 9)
  const b = -(r1 + r2)
  const c = r1 * r2
  if (level === 1) return pqProblem(1, b, c)
  const a = pick(rng, [2, 3, -1, -2, -3, 5])
  if (level === 2) return pqProblem(a, a * b, a * c)
  if (chance(rng, 0.25)) {
    // keine reelle Lösung
    const p = nz(rng, -6, 6) * 2
    const q = (p / 2) ** 2 + int(rng, 1, 9)
    return pqProblem(a, a * p, a * q, 0)
  }
  const rhs = nz(rng, -20, 20)
  return pqProblem(a, a * b, a * c + rhs, rhs)
}

export const PQ_GENS: GenInfo[] = [{ id: 'pq', title: 'p-q-Formel', gen }]
