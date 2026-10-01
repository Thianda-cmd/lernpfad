import type { Rng } from '../../lib/random'
import { fmt, tn } from '../num'
import type { GenInfo, Problem } from '../types'
import { pick } from './util'

const pctNice = [2, 4, 5, 8, 10, 12, 12.5, 15, 16, 20, 25, 30, 35, 40, 45, 60, 75]

function wGesucht(rng: Rng): Problem {
  const ctx = pick(rng, [
    { g: 'Proben', w: 'sind verunreinigt', u: 'Proben' },
    { g: 'Petrischalen', w: 'zeigen Bakterienwachstum', u: 'Petrischalen' },
    { g: 'Auszubildende', w: 'haben die Prüfung mit „gut“ bestanden', u: 'Auszubildende' },
    { g: 'Pipettenspitzen', w: 'sind fehlerhaft', u: 'Stück' },
  ])
  const p = pick(rng, pctNice)
  const G = pick(rng, [40, 60, 80, 120, 160, 200, 240, 300, 400, 480, 500, 600, 800])
  const W = (G * p) / 100
  if (!Number.isInteger(W)) return wGesucht(rng)
  return {
    prompt: `Von ${G} ${ctx.g} ${ctx.w} – das sind ${fmt(p)} %. Wie viele ${ctx.u} sind das?`,
    answer: { kind: 'num', value: W, label: 'W =', unit: ctx.u, rel: 1e-6 },
    steps: [
      { tex: `G = ${G},\\quad p = ${tn(p)}\\,\\%`, note: 'Grundwert $G$ (das Ganze) und Prozentsatz $p$ ablesen.' },
      { tex: `W = \\frac{G \\cdot p}{100} = \\frac{${G} \\cdot ${tn(p)}}{100}`, note: 'Prozentwert = Anteil vom Ganzen.' },
      { tex: `W = ${tn(W)}` },
    ],
    hint: '$W = G \\cdot \\frac{p}{100}$',
  }
}

export function pGesucht(W: number, G: number, what = 'Gewinne', total = 'Losen'): Problem {
  const p = (W / G) * 100
  return {
    prompt: `Bei ${fmt(G)} ${total} gibt es ${fmt(W)} ${what}. Wie viel Prozent sind das?`,
    answer: { kind: 'num', value: p, label: 'p =', unit: '%', tol: 0.05 },
    steps: [
      { tex: `p = \\frac{\\text{Anteil}}{\\text{Gesamt}} \\cdot 100 = \\frac{W}{G} \\cdot 100`, note: 'Prozentsatz = Anteil von 100.' },
      { tex: `p = \\frac{${tn(W)}}{${tn(G)}} \\cdot 100 = ${tn(p, 2)}\\,\\%` },
    ],
    hint: '$p = \\frac{W}{G} \\cdot 100$',
  }
}

function pRandom(rng: Rng): Problem {
  const G = pick(rng, [50, 80, 120, 200, 250, 300, 400, 500, 600, 750, 800, 1200])
  const p = pick(rng, pctNice)
  const W = (G * p) / 100
  if (!Number.isInteger(W)) return pRandom(rng)
  const ctx = pick(rng, [
    ['Gewinne', 'Losen'],
    ['positive Proben', 'Proben'],
    ['keimfreie Platten', 'Platten'],
  ])
  return pGesucht(W, G, ctx[0], ctx[1])
}

function gGesucht(rng: Rng): Problem {
  const p = pick(rng, pctNice)
  const G = pick(rng, [50, 80, 120, 200, 240, 300, 400, 500, 600, 800])
  const W = (G * p) / 100
  if (!Number.isInteger(W)) return gGesucht(rng)
  return {
    prompt: `${fmt(W)} Reagenzgläser sind ${fmt(p)} % des Bestands. Wie viele Reagenzgläser sind es insgesamt?`,
    answer: { kind: 'num', value: G, label: 'G =', unit: 'Stück', rel: 1e-6 },
    steps: [
      { tex: `W = ${tn(W)},\\quad p = ${tn(p)}\\,\\%` },
      { tex: `G = \\frac{W \\cdot 100}{p} = \\frac{${tn(W)} \\cdot 100}{${tn(p)}}`, note: 'Grundformel nach $G$ umgestellt.' },
      { tex: `G = ${tn(G)}` },
    ],
    hint: '$G = \\frac{W \\cdot 100}{p}$',
  }
}

function vermindert(rng: Rng): Problem {
  const up = rng() < 0.5
  const p = up ? pick(rng, [7, 19, 5, 10, 15]) : pick(rng, [10, 15, 20, 25, 30, 40])
  const G = pick(rng, [48, 80, 120, 159, 240, 349, 420, 899])
  const f = up ? 1 + p / 100 : 1 - p / 100
  const W = Math.round(G * f * 100) / 100
  const item = pick(rng, ['Mikroskop', 'Laborkittel-Set', 'Pipettensatz', 'Zentrifugenrotor'])
  return {
    prompt: up
      ? `Ein ${item} kostet netto ${fmt(G, 2)} €. Wie viel kostet er mit ${p} % Aufschlag?`
      : `Ein ${item} kostet ${fmt(G, 2)} €. Es gibt ${p} % Rabatt. Wie viel kostet er jetzt?`,
    answer: { kind: 'num', value: W, label: 'Preis =', unit: '€', tol: 0.011 },
    steps: [
      { tex: `\\text{Faktor } = ${up ? '1 +' : '1 -'} \\frac{${p}}{100} = ${tn(f)}`, note: up ? 'Vermehrter Grundwert: 100 % + Aufschlag.' : 'Verminderter Grundwert: 100 % − Rabatt.' },
      { tex: `${tn(G, 2)} \\cdot ${tn(f)} = ${tn(W, 2)}\\ \\text{€}` },
    ],
    hint: up ? `${100 + p} % vom alten Preis` : `${100 - p} % vom alten Preis`,
  }
}

function massenanteil(rng: Rng): Problem {
  const salz = pick(rng, ['Natriumchlorid', 'Glucose', 'Kaliumnitrat', 'Kupfersulfat'])
  const ms = pick(rng, [2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30])
  const mw = pick(rng, [45, 95, 120, 188, 230, 245, 250, 380, 475])
  const ml = ms + mw
  const w = (ms / ml) * 100
  return {
    prompt: `${ms} g ${salz} werden in ${mw} g Wasser gelöst. Wie groß ist der Massenanteil $w$ in Prozent?`,
    answer: { kind: 'num', value: w, label: 'w =', unit: '%', tol: 0.05 },
    steps: [
      { tex: `m_L = ${ms}\\ \\text{g} + ${mw}\\ \\text{g} = ${ml}\\ \\text{g}`, note: '**Achtung:** Grundwert ist die ganze Lösung (Salz + Wasser), nicht nur das Wasser.' },
      { tex: `w = \\frac{m_S}{m_L} \\cdot 100 = \\frac{${ms}}{${ml}} \\cdot 100 = ${tn(w, 2)}\\,\\%` },
    ],
    hint: 'Massenanteil $w = \\frac{m_{\\text{Stoff}}}{m_{\\text{Lösung}}} \\cdot 100\\,\\%$',
  }
}

export const PROZENT_GENS: GenInfo[] = [
  { id: 'prozentsatz', title: 'Prozentsatz p', gen: (rng) => pRandom(rng) },
  { id: 'prozentwert', title: 'Prozentwert W', gen: (rng) => wGesucht(rng) },
  { id: 'grundwert', title: 'Grundwert G', gen: (rng) => gGesucht(rng) },
  { id: 'rabatt', title: 'Rabatt & Aufschlag', gen: (rng) => vermindert(rng) },
  { id: 'massenanteil', title: 'Massenanteil w', gen: (rng) => massenanteil(rng) },
]
