import type { Rng } from '../../lib/random'
import { fmt } from '../num'
import type { GenInfo, Problem, Step } from '../types'
import { equationProblem } from './gleichungen'
import { g, t } from './klammern'
import { int, pick } from './util'

const VIELFACH = ['', '', 'Doppelte', 'Dreifache', 'Vierfache', 'Fünffache', 'Sechsfache']

function wrap(p: Problem, text: string, setup: Step[], answer: string): Problem {
  return {
    ...p,
    prompt: text,
    tex: undefined,
    steps: [...setup, ...p.steps.filter((s) => !s.tex.startsWith('\\text{Probe')), { tex: `\\text{${answer}}`, note: 'Antwortsatz nicht vergessen.' }],
    hint: 'Lege zuerst fest, wofür $x$ steht, und übersetze den Text Stück für Stück.',
  }
}

export function zahlSumme(a: number, b: number, c: number): Problem {
  // „Subtrahiert man die Summe aus einer Zahl und a von b, so erhält man c.“
  const x = b - c - a
  const p = equationProblem([t(b), g(-1, [t(1, 'x'), t(a)])], [t(c)])
  return wrap(
    p,
    `Subtrahiert man die Summe aus einer Zahl und ${fmt(a)} von ${fmt(b)}, so erhält man ${fmt(c)}. Wie heißt die Zahl?`,
    [
      { tex: 'x = \\text{gesuchte Zahl}', note: 'Variable festlegen.' },
      { tex: `\\underbrace{${b} - }_{\\text{von } ${b}}\\underbrace{(x + ${a})}_{\\text{Summe aus Zahl und } ${a}} = ${c}`, note: '„die Summe … von 16 subtrahieren“ heißt: 16 minus (Summe). Die Summe kommt in Klammern!' },
    ],
    `Die Zahl heißt ${fmt(x)}.`,
  )
}

export function zahlVielfach(k: number, a: number, b: number, c: number): Problem {
  // „Addiert man zum Doppelten einer Zahl a und subtrahiert diese Summe von b, so erhält man c.“
  const x = (b - c - a) / k
  const p = equationProblem([t(b), g(-1, [t(k, 'x'), t(a)])], [t(c)])
  return wrap(
    p,
    `Addiert man zum ${VIELFACH[k]}n einer natürlichen Zahl ${fmt(a)} und subtrahiert diese Summe von ${fmt(b)}, so erhält man ${fmt(c)}. Wie heißt die Zahl?`,
    [
      { tex: 'x = \\text{gesuchte Zahl}', note: 'Variable festlegen.' },
      { tex: `${b} - (${k}x + ${a}) = ${c}`, note: `„das ${VIELFACH[k]} einer Zahl“ = $${k}x$, „dazu ${a} addieren“ = $${k}x + ${a}$, „diese Summe von ${b} subtrahieren“ = $${b} - (${k}x + ${a})$.` },
    ],
    `Die Zahl heißt ${fmt(x)}.`,
  )
}

function vielfachGleich(rng: Rng): Problem {
  // Das k-fache einer Zahl vermindert um a ist so groß wie die Zahl vermehrt um b.
  const k = int(rng, 2, 6)
  const x = int(rng, 2, 25)
  const a = int(rng, 1, 30)
  const b = k * x - a - x
  if (b <= 0) return vielfachGleich(rng)
  const p = equationProblem([t(k, 'x'), t(-a)], [t(1, 'x'), t(b)])
  return wrap(
    p,
    `Das ${VIELFACH[k]} einer Zahl, vermindert um ${a}, ist genauso groß wie die Zahl, vermehrt um ${b}. Wie heißt die Zahl?`,
    [
      { tex: 'x = \\text{gesuchte Zahl}', note: 'Variable festlegen.' },
      { tex: `${k}x - ${a} = x + ${b}`, note: '„vermindert um“ = minus, „vermehrt um“ = plus, „ist genauso groß wie“ = Gleichheitszeichen.' },
    ],
    `Die Zahl heißt ${fmt(x)}.`,
  )
}

function summeMal(rng: Rng): Problem {
  const k = int(rng, 2, 9)
  const x = int(rng, 1, 20)
  const a = int(rng, 1, 15)
  const c = k * (x + a)
  // k(x + a) = c  →  kx + ka = c
  const q = equationProblem([t(k, 'x'), t(k * a)], [t(c)])
  const steps: Step[] = [
    { tex: 'x = \\text{gesuchte Zahl}', note: 'Variable festlegen.' },
    { tex: `${k}\\cdot(x + ${a}) = ${c}`, note: '„die Summe mit … multiplizieren“ – die Summe steht in Klammern.' },
    ...q.steps.filter((s) => !s.tex.startsWith('\\text{Probe')),
    { tex: `\\text{Die Zahl heißt ${x}.}` },
  ]
  return {
    prompt: `Vermehrt man eine Zahl um ${a} und multipliziert die Summe mit ${k}, so erhält man ${c}. Wie heißt die Zahl?`,
    answer: q.answer,
    steps,
    hint: 'Klammer um die Summe setzen: $k\\cdot(x + a)$.',
  }
}

function aufeinander(rng: Rng): Problem {
  const n = pick(rng, [3, 3, 4] as const)
  const x = int(rng, 5, 60)
  const S = n * x + (n * (n - 1)) / 2
  const q = equationProblem([t(n, 'x'), t((n * (n - 1)) / 2)], [t(S)])
  const sumTex = Array.from({ length: n }, (_, i) => (i === 0 ? 'x' : `(x + ${i})`)).join(' + ')
  return {
    prompt: `Die Summe von ${n} aufeinanderfolgenden natürlichen Zahlen ist ${S}. Wie heißt die kleinste der Zahlen?`,
    answer: q.answer,
    steps: [
      { tex: 'x = \\text{kleinste Zahl}', note: 'Die nächsten Zahlen sind dann $x+1$, $x+2$, …' },
      { tex: `${sumTex} = ${S}`, note: 'Gleichung aufstellen.' },
      ...q.steps.filter((s) => !s.tex.startsWith('\\text{Probe')),
      { tex: `\\text{Die Zahlen: } ${Array.from({ length: n }, (_, i) => x + i).join(',\\ ')}` },
    ],
    hint: 'Aufeinanderfolgende Zahlen: $x$, $x+1$, $x+2$ …',
  }
}

/** Rechteck-/Grundstücksaufgabe wie bei Herrn M. */
export function grundstueck(b: number, d: number, p: number, q: number): Problem {
  // Länge = b + d. Länge −p, Breite +q, Fläche ändert sich um r.
  const r = (q - p) * b + q * (d - p)
  const groesser = r > 0
  const steps: Step[] = [
    { tex: `x = \\text{Breite},\\quad x + ${d} = \\text{Länge}`, note: `Das Grundstück ist ${d} m länger als breit.` },
    { tex: `\\text{neu: Länge } x + ${d} - ${p},\\ \\text{Breite } x + ${q}`, note: `Länge wird ${p} m kleiner, Breite ${q} m größer.` },
    { tex: `(x + ${d - p})(x + ${q}) = x(x + ${d}) ${groesser ? '+' : '-'} ${Math.abs(r)}`, note: `Neue Fläche = alte Fläche ${groesser ? '+' : '−'} ${Math.abs(r)} m².` },
    { tex: `x^2 + ${q}x + ${d - p}x + ${(d - p) * q} = x^2 + ${d}x ${groesser ? '+' : '-'} ${Math.abs(r)}`, op: '| -x^2', note: 'Ausmultiplizieren – $x^2$ fällt auf beiden Seiten weg.' },
  ]
  const q2 = equationProblem([t(q + d - p, 'x'), t((d - p) * q)], [t(d, 'x'), t(r)])
  return {
    prompt: `Herr M. besitzt ein rechteckiges Grundstück, das ${d} m länger als breit ist. Wegen eines Straßenbaus wird die Länge um ${p} m kleiner. Als Ausgleich wird die Breite um ${q} m größer. Dadurch ist das Grundstück ${Math.abs(r)} m² ${groesser ? 'größer' : 'kleiner'} geworden. Wie breit war das Grundstück ursprünglich?`,
    answer: { kind: 'num', value: b, label: 'Breite =', unit: 'm' },
    steps: [
      ...steps,
      ...q2.steps.filter((s) => !s.tex.startsWith('\\text{Probe')),
      { tex: `\\text{Breite } ${b}\\text{ m},\\ \\text{Länge } ${b + d}\\text{ m}`, note: `Probe: ${b - 0 + d - p} · ${b + q} = ${(b + d - p) * (b + q)} m², vorher ${b} · ${b + d} = ${b * (b + d)} m².` },
    ],
    hint: 'Neue Fläche mit Klammern aufschreiben: $(\\text{Länge} - p)\\cdot(\\text{Breite} + q)$.',
  }
}

function grundstueckRandom(rng: Rng): Problem {
  for (;;) {
    const b = int(rng, 8, 60)
    const d = int(rng, 5, 30)
    const p = int(rng, 1, 6)
    const q = int(rng, 1, 6)
    if (p === q || d - p <= 0) continue
    const r = (q - p) * b + q * (d - p)
    if (r === 0 || Math.abs(r) > 200) continue
    return grundstueck(b, d, p, q)
  }
}

function alter(rng: Rng): Problem {
  for (;;) {
    const k = int(rng, 3, 6)
    const m = int(rng, 2, k - 1)
    const n = int(rng, 2, 20)
    const x = (n * (m - 1)) / (k - m)
    if (!Number.isInteger(x) || x < 2 || x > 25) continue
    const q = equationProblem([t(k, 'x'), t(n)], [t(m, 'x'), t(m * n)])
    return {
      prompt: `Eine Mutter ist heute ${k}-mal so alt wie ihre Tochter. In ${n} Jahren ist sie nur noch ${m}-mal so alt. Wie alt ist die Tochter heute?`,
      answer: { kind: 'num', value: x, label: 'Alter =', unit: 'Jahre' },
      steps: [
        { tex: `x = \\text{Alter der Tochter heute},\\quad ${k}x = \\text{Alter der Mutter}`, note: 'Variable festlegen.' },
        { tex: `${k}x + ${n} = ${m}\\cdot(x + ${n})`, note: `In ${n} Jahren sind beide ${n} Jahre älter.` },
        ...q.steps.filter((s) => !s.tex.startsWith('\\text{Probe')),
        { tex: `\\text{Die Tochter ist ${x} Jahre alt, die Mutter ${k * x}.}` },
      ],
      hint: 'Beide werden gleich viele Jahre älter – das kommt auf beiden Seiten dazu.',
    }
  }
}

export const TEXT_GENS: GenInfo[] = [
  {
    id: 'zahlenraetsel',
    title: 'Zahlenrätsel',
    gen: (rng, level) => {
      const v = level === 1 ? int(rng, 0, 1) : level === 2 ? int(rng, 0, 3) : int(rng, 1, 4)
      if (v === 0) {
        const a = int(rng, 1, 20)
        const x = int(rng, 1, 30)
        const b = int(rng, x + a + 1, x + a + 40)
        return zahlSumme(a, b, b - x - a)
      }
      if (v === 1) {
        const k = int(rng, 2, 5)
        const a = int(rng, 1, 15)
        const x = int(rng, 2, 25)
        const b = int(rng, k * x + a + 1, k * x + a + 50)
        return zahlVielfach(k, a, b, b - k * x - a)
      }
      if (v === 2) return vielfachGleich(rng)
      if (v === 3) return summeMal(rng)
      return aufeinander(rng)
    },
  },
  { id: 'grundstueck', title: 'Rechteck / Grundstück', gen: (rng) => grundstueckRandom(rng) },
  { id: 'alter', title: 'Altersrätsel', gen: (rng) => alter(rng) },
]
