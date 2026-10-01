/**
 * Die Übungsblätter aus dem Unterricht – Aufgaben im Original-Wortlaut,
 * mit Lösungsweg und Hinweisen, wo das Lösungsblatt abweicht.
 */
import { COMPOUNDS } from '../chem'
import { g, klammerProblem, t, terms } from '../gen/klammern'
import { equationProblem } from '../gen/gleichungen'
import { grundstueck, zahlSumme, zahlVielfach } from '../gen/textaufgaben'
import { bracketDivProblem, doubleFracProblem, fracMulProblem, fracSumProblem } from '../gen/brueche'
import { potBruchProblem, potKlammerProblem } from '../gen/potenzen'
import { FORMELN, formelProblem } from '../gen/formeln'
import { atomeInMasse, mAusN, molAusMN, nAusM, prozentVerbindung, teilchen, teilchenMasse } from '../gen/stoffmenge'
import type { Problem } from '../types'

export interface SheetTask {
  nr: string
  p: Problem
  /** Ergebnis laut Lösungsblatt (falls vorhanden) */
  official?: string
}

const C = (f: string) => COMPOUNDS.find((c) => c.f === f)!
const F = (id: string) => formelProblem(FORMELN.find((f) => f.id === id)!)
const note = (p: Problem, sheetNote: string): Problem => ({ ...p, sheetNote })

/* ---------------------------- Blatt ①: Klammern ---------------------------- */

export const SHEET_KLAMMERN: SheetTask[] = [
  { nr: '1', p: klammerProblem([g(1, terms([-54, 'r'], [41, ''])), g(-1, terms([13, 'r'], [-9, '']))]) },
  { nr: '2', p: klammerProblem([g(1, terms([2, 'a2'], [3, 'a'])), g(1, terms([12, 'a2'], [-4, 'a'])), g(-1, terms([4, 'a2'], [-7, 'a']))]) },
  { nr: '3', p: klammerProblem([g(1, terms([4, 'p'], [2.7, 'q'])), g(-1, terms([3.2, 'p'], [-7.1, 'q'])), g(-1, terms([-2.4, 'p'], [3.6, 'q']))]) },
  {
    nr: '4',
    p: klammerProblem([t(113, 'a'), g(-1, terms([44, 'a'], [66, 'b'], [-3, 'c'])), g(1, terms([11, 'a'], [116, 'b'], [-88, 'c'])), g(-1, terms([-32, 'a'], [-102, 'c']))]),
  },
  { nr: '5', p: klammerProblem([t(4, 'u'), g(1, [t(11, 'v'), g(-1, terms([4, 'u'], [3, 'w']))], true), g(-1, [t(21, 'u'), g(1, terms([66, 'u'], [-14, 'w']))], true)]) },
  {
    nr: '6',
    p: klammerProblem([
      t(3, 'x3'),
      g(-1, [t(24, 'x2'), t(5, 'x'), g(-1, terms([6, 'x'], [4, 'x2']))], true),
      g(-1, [t(2, 'x2'), g(-1, terms([6, 'x'], [4, 'x3'])), t(-12, 'x')], true),
    ]),
  },
  { nr: '7', p: klammerProblem([g(1, terms([3, 'x'], [6, 'y'])), g(-1, [g(1, terms([7, 'x'], [-3, 'y'])), g(-1, terms([5, 'x'], [-7, 'y'])), g(1, terms([1, 'x'], [-1, 'y']))], true)]) },
  { nr: '8', p: zahlSumme(5, 16, 9) },
  { nr: '9', p: zahlVielfach(2, 4, 44, 8) },
]

/* ---------------------------- Blatt ②: Gleichungen ---------------------------- */

const gs = grundstueck(30, 20, 3, 2)

export const SHEET_GLEICHUNGEN: SheetTask[] = [
  { nr: '1', p: equationProblem([t(2, 'x'), t(3)], [t(16), g(-1, terms([2, 'x'], [-3, '']))]) },
  { nr: '2', p: equationProblem([t(15), g(-1, terms([3, 'x'], [-2, '']))], [t(19), g(-1, terms([2, 'x'], [4, '']))], 'x', '<') },
  { nr: '3', p: equationProblem([t(15, 'x'), g(-1, terms([12, ''], [11, 'x'])), g(1, terms([23, ''], [-3, 'x']))], [t(12)]) },
  { nr: '4', p: equationProblem([t(3, 'x'), g(1, terms([8, ''], [-2, 'x']))], [t(8, 'x'), g(1, terms([4, ''], [-6, 'x']))], 'x', '>') },
  { nr: '5', p: equationProblem([t(2, 'm'), t(19), g(-1, terms([1, 'x'], [-2, 'n']))], terms([18, ''], [1, 'm'], [1, 'n']), 'x', '>', 'Löse nach $x$ auf.') },
  {
    nr: '6',
    p: equationProblem([t(7, 'x'), g(-1, terms([3, 'a'], [2, 'x'])), t(-2, 'b'), t(-6, 'x'), g(-1, terms([3, 'b'], [-4, 'a']))], [t(0)], 'x', '<', 'Löse nach $x$ auf.'),
  },
  { nr: '7', p: equationProblem([t(2, 'x'), t(3, 'a'), g(-1, terms([3, 'b'], [-2, 'x']))], [t(8, 'x'), t(2, 'a'), g(-1, terms([4, 'b'], [3, 'x']))], 'x', '=', 'Löse nach $x$ auf.') },
  {
    nr: '8',
    p: {
      ...gs,
      prompt: gs.prompt.replace('Wie breit war das Grundstück ursprünglich?', 'Wie lang und wie breit war das Grundstück ursprünglich?'),
      answer: { kind: 'nums', values: [50, 30], labels: ['Länge', 'Breite'], units: ['m', 'm'], ordered: true, tol: 1e-6 },
    },
  },
]

/* ---------------------------- Bruch- und Potenzrechnung ---------------------------- */

export const bruch3: Problem = {
  prompt: 'Fasse zu einem Bruch zusammen.',
  tex: '\\frac{2a-3b}{6} + \\frac{4a+5b}{12} - \\frac{7a+b}{3} + \\frac{a}{4}',
  answer: { kind: 'expr', value: '(-17*a-5*b)/12', vars: ['a', 'b'] },
  steps: [
    { tex: '\\text{HN} = \\text{kgV}(6, 12, 3, 4) = 12', note: '12 ist durch alle Nenner teilbar.' },
    { tex: '= \\frac{2(2a-3b)}{12} + \\frac{4a+5b}{12} - \\frac{4(7a+b)}{12} + \\frac{3a}{12}', note: 'Erweitern – die Zähler bleiben dabei in Klammern!' },
    { tex: '= \\frac{4a - 6b + 4a + 5b - (28a + 4b) + 3a}{12}', note: 'Auf einen Bruchstrich. Das Minus vor dem dritten Bruch gilt für den **ganzen** Zähler.' },
    { tex: '= \\frac{4a - 6b + 4a + 5b - 28a - 4b + 3a}{12}', note: 'Minusklammer auflösen.' },
    { tex: '= \\frac{-17a - 5b}{12}', note: '$a$: $4 + 4 - 28 + 3 = -17$. $b$: $-6 + 5 - 4 = -5$.' },
  ],
  sheetNote: 'Auf dem Lösungsblatt steht $\\frac{-17a-3b}{12}$. Nachgerechnet für $b$: $-6b + 5b - 4b = -5b$. Richtig ist also $\\frac{-17a-5b}{12}$.',
}

const bruch8: Problem = {
  prompt: 'Kürze so weit wie möglich.',
  tex: '\\frac{42\\,(x-3)^9\\,(x+2)^4}{105\\,(x-3)^5\\,(x+2)^3}',
  answer: { kind: 'expr', value: '2/5*(x-3)^4*(x+2)', vars: ['x'], ranges: { x: [4, 9] } },
  steps: [
    { tex: '\\frac{42}{105} = \\frac{2}{5}', note: 'Zahlen kürzen (mit 21).' },
    { tex: '\\frac{(x-3)^9}{(x-3)^5} = (x-3)^{4}', note: 'Die Klammer wie eine Basis behandeln: Exponenten subtrahieren.' },
    { tex: '\\frac{(x+2)^4}{(x+2)^3} = x+2' },
    { tex: '= \\frac{2}{5}\\,(x-3)^4\\,(x+2)' },
  ],
}

const bruch10: Problem = {
  prompt: 'Vereinfache durch Ausklammern.',
  tex: '\\frac{ax - bx + ay - by}{a - b}',
  answer: { kind: 'expr', value: 'x+y', vars: ['a', 'b', 'x', 'y'], ranges: { a: [3, 5], b: [0.5, 2], x: [0.5, 3], y: [0.5, 3] } },
  steps: [
    { tex: '= \\frac{x(a - b) + y(a - b)}{a - b}', note: 'Paarweise ausklammern: aus $ax - bx$ das $x$, aus $ay - by$ das $y$.' },
    { tex: '= \\frac{(a - b)(x + y)}{a - b}', note: '$(a-b)$ steht in beiden Summanden – noch einmal ausklammern.' },
    { tex: '= x + y', note: 'Kürzen. Aus Summen darf man nicht kürzen – aus Produkten schon.' },
  ],
}

const bruch11: Problem = {
  prompt: 'Berechne und kürze.',
  tex: '\\frac{16ax}{5b} : \\frac{4a}{15bc}',
  answer: { kind: 'expr', value: '12*c*x', vars: ['a', 'b', 'c', 'x'] },
  steps: [
    { tex: '= \\frac{16ax}{5b} \\cdot \\frac{15bc}{4a}', note: 'Mal den Kehrwert.' },
    { tex: '= \\frac{16 \\cdot 15 \\cdot a \\cdot x \\cdot b \\cdot c}{5 \\cdot 4 \\cdot b \\cdot a}', note: 'Auf einen Bruchstrich.' },
    { tex: '= \\frac{240}{20} \\cdot cx = 12cx', note: '$a$ und $b$ kürzen sich weg.' },
  ],
}

export const SHEET_BRUECHE: SheetTask[] = [
  { nr: '1', p: bracketDivProblem([23, 180], [15, 90], [2, 3]), official: '159/360 (noch mit 3 kürzbar → 53/120)' },
  { nr: '2', p: fracSumProblem([[5, 15], [96, 144]]), official: '1' },
  { nr: '3', p: bruch3, official: '(−17a − 3b)/12' },
  { nr: '4', p: fracMulProblem([4, 1], [2, 3], true), official: '6' },
  { nr: '5', p: doubleFracProblem([8, 25], [1, 3], [1, 5]), official: '12/5' },
  { nr: '6', p: doubleFracProblem([1, 4], [1, 5], [1, 6], true, [1, 5]), official: '9/4' },
  {
    nr: '7',
    p: note(
      potBruchProblem(6, 2, [['x', 4, 1], ['y', 2, 2]]),
      'Auf dem Lösungsblatt steht $3x^2$. Mit dem Nenner $2xy^2$ ergibt sich aber $x^{4-1} = x^3$. $3x^2$ wäre richtig, wenn im Nenner $2x^2y^2$ stünde.',
    ),
    official: '3x²',
  },
  { nr: '8', p: bruch8, official: '2/5 · (x−3)⁴ · (x+2)' },
  { nr: '9', p: potKlammerProblem(27, 3, 3, 3), official: '1' },
  { nr: '10', p: bruch10, official: 'x + y' },
  { nr: '11', p: bruch11, official: '12cx' },
]

/* ---------------------------- Wurzelrechnen ---------------------------- */

const w5: Problem = {
  prompt: 'Schreibe in Potenzschreibweise und vereinfache.',
  tex: '\\sqrt[4]{\\frac{5\\,(x-y)^5}{6\\,(x-2y)^6}}',
  answer: { kind: 'expr', value: '(5/6)^(1/4)*(x-y)^(5/4)*(x-2*y)^(-3/2)', vars: ['x', 'y'], ranges: { x: [6, 9], y: [0.5, 2] } },
  steps: [
    { tex: '= \\left(\\frac{5}{6}\\right)^{\\frac14} \\cdot \\frac{(x-y)^{\\frac54}}{(x-2y)^{\\frac64}}', note: 'Jeden Faktor in eine Potenz umwandeln: $\\sqrt[4]{a^m} = a^{\\frac{m}{4}}$.' },
    { tex: '= \\left(\\frac{5}{6}\\right)^{\\frac14} (x-y)^{\\frac54}\\,(x-2y)^{-\\frac32}', note: '$\\frac64 = \\frac32$; aus dem Nenner wird ein negativer Exponent.' },
    { tex: '= \\frac{x-y}{x-2y} \\cdot \\sqrt[4]{\\frac{5(x-y)}{6(x-2y)^2}}', note: 'Alternative: teilweise Wurzel ziehen – $(x-y)^4$ und $(x-2y)^4$ aus der Wurzel holen.' },
  ],
  sheetNote:
    'Das Lösungsblatt zeigt $\\left(\\frac56\\right)^{\\frac14}\\left(\\frac{x-y}{x-2y}\\right)^{-\\frac14}$. Das ist nicht gleichwertig: $(x-y)$ hat den Exponenten $\\frac54$, $(x-2y)$ aber $-\\frac64$ – verschiedene Exponenten kann man nicht zu einem Bruch zusammenfassen.',
}

const w6: Problem = {
  prompt: 'Vereinfache.',
  tex: '\\frac{\\sqrt[4]{a^8 b^8}}{\\sqrt[5]{a^{10} b^{10}}}',
  answer: { kind: 'expr', value: '1', vars: ['a', 'b'] },
  steps: [
    { tex: '\\sqrt[4]{a^8 b^8} = a^{\\frac84} b^{\\frac84} = a^2 b^2', note: 'Exponent durch Wurzelexponent.' },
    { tex: '\\sqrt[5]{a^{10} b^{10}} = a^2 b^2' },
    { tex: '\\frac{a^2 b^2}{a^2 b^2} = 1' },
  ],
}

const w1: Problem = {
  prompt: 'Ziehe die Wurzel so weit wie möglich.',
  tex: '\\sqrt[3]{64\\,a^3\\,b^9}',
  answer: { kind: 'expr', value: '4*a*b^3', vars: ['a', 'b'], noRoot: true, singleUse: true },
  steps: [
    { tex: '= \\sqrt[3]{64} \\cdot \\sqrt[3]{a^3} \\cdot \\sqrt[3]{b^9}', note: 'Wurzel aus einem Produkt = Produkt der Wurzeln.' },
    { tex: '= 4 \\cdot a^{\\frac33} \\cdot b^{\\frac93} = 4ab^3', note: '$4^3 = 64$.' },
  ],
  sheetNote: 'Der Exponent bei $b$ ist auf dem Blatt schwer zu lesen. Die Lösung $4ab^3$ passt zu $b^9$.',
}

const w2: Problem = {
  prompt: 'Schreibe als Potenz.',
  tex: '\\frac{1}{\\sqrt[4]{x^5}}',
  answer: { kind: 'expr', value: 'x^(-5/4)', vars: ['x'], noRoot: true, singleUse: true },
  steps: [
    { tex: '= \\frac{1}{x^{\\frac54}}', note: 'Wurzel als Potenz.' },
    { tex: '= x^{-\\frac54}', note: '„Eins durch“ wird zum negativen Exponenten.' },
  ],
  sheetNote: 'Auf dem Lösungsblatt steht $x^{\\frac54}$ – das Minus fehlt. Richtig: $x^{-\\frac54}$.',
}

const w3: Problem = {
  prompt: 'Schreibe als eine Potenz.',
  tex: '\\sqrt{a^3} \\cdot \\sqrt[3]{a^2}',
  answer: { kind: 'expr', value: 'a^(13/6)', vars: ['a'], noRoot: true, singleUse: true },
  steps: [
    { tex: '= a^{\\frac32} \\cdot a^{\\frac23}' },
    { tex: '= a^{\\frac96 + \\frac46} = a^{\\frac{13}{6}}', note: 'Exponenten auf den Hauptnenner 6 bringen und addieren.' },
  ],
}

const w4: Problem = {
  prompt: 'Ziehe den Faktor unter die Wurzel und berechne (auf zwei Stellen).',
  tex: '3 \\cdot \\sqrt[3]{\\tfrac{3}{4}}',
  answer: { kind: 'num', value: Math.cbrt(81 / 4), tol: 0.006 },
  steps: [
    { tex: '3 = \\sqrt[3]{27}', note: '$3^3 = 27$.' },
    { tex: '= \\sqrt[3]{27 \\cdot \\tfrac34} = \\sqrt[3]{\\tfrac{81}{4}} = \\sqrt[3]{20{,}25} \\approx 2{,}73' },
  ],
}

const w7 = note(
  F('seitenhalbierende-a'),
  'Das Lösungsblatt schreibt $a = \\frac{(s_b \\cdot 2)^2 + b^2}{2} - c$ – dort fehlt die Wurzel und aus $c^2$ wurde $c$. Die Wurzel muss über dem ganzen Term stehen.',
)

export const SHEET_WURZELN: SheetTask[] = [
  { nr: '1', p: w1, official: '4ab³' },
  { nr: '2', p: w2, official: 'x^(5/4)' },
  { nr: '3', p: w3, official: 'a^(13/6)' },
  { nr: '4', p: w4, official: '2,73' },
  { nr: '5', p: w5 },
  { nr: '6', p: w6, official: '1' },
  { nr: '7', p: w7 },
  { nr: '8', p: F('kreisbogen-s'), official: 's = 2·√(r·2h − h²)' },
]

/* ---------------------------- M, m, n, m%, Nx ---------------------------- */

function atomUndMasse(f: string, sheet?: string): Problem {
  const a = prozentVerbindung(C(f), 'atom')
  const m = prozentVerbindung(C(f), 'masse')
  if (a.answer.kind !== 'nums' || m.answer.kind !== 'nums') return a
  return {
    prompt: `Berechne die Atom-% und die Massen-% von ${C(f).name} (${m.prompt.match(/\(\$.*\$\)/)?.[0] ?? ''}).`,
    answer: {
      kind: 'nums',
      values: [...a.answer.values, ...m.answer.values],
      labels: [...a.answer.labels.map((l) => `${l} Atom-%`), ...m.answer.labels.map((l) => `${l} Massen-%`)],
      units: [...a.answer.labels.map(() => '%'), ...m.answer.labels.map(() => '%')],
      ordered: true,
      tol: 0.06,
    },
    steps: [...a.steps, ...m.steps],
    hint: 'Atom-%: Atome zählen. Massen-%: Atommassen gewichten.',
    sheetNote: sheet,
  }
}

export const SHEET_STOFF: SheetTask[] = [
  { nr: '1', p: nAusM(C('BaSO4'), 130, 'g', 'mol'), official: 'n = 0,557 mol' },
  { nr: '2', p: mAusN(C('Ca(NO3)2'), 0.37, 'mmol', 'mg'), official: 'm = 60,7 mg' },
  { nr: '3', p: nAusM(C('Ba(OH)2'), 750, 'mg', 'mmol'), official: 'n = 4,377 mmol' },
  { nr: '4', p: mAusN(C('AlCl3'), 2.3, 'mol', 'g'), official: 'm = 306,659 g' },
  { nr: '5', p: teilchen(C('MgSO4'), 3, 'mmol', false), official: '1,807 · 10²¹ Teilchen' },
  { nr: '6', p: teilchen(C('ZnS'), 21, 'mg', true), official: '1,298 · 10²⁰ Teilchen' },
  { nr: '7a', p: atomUndMasse('Na2SO4', 'Auf dem Lösungsblatt fehlt der Massenanteil von Schwefel: $w(\\mathrm{S}) = 22{,}57\\,\\%$.'), official: 'Na 28,57 % / 32,37 %, S 14,29 % / –, O 57,14 % / 45,06 %' },
  { nr: '7b', p: atomUndMasse('Na2CO3'), official: 'Na 33,33 % / 43,38 %, C 16,67 % / 11,33 %, O 50,0 % / 45,29 %' },
  { nr: '7c', p: atomUndMasse('Ca3(PO4)2', 'Lösungsblatt: O = 41,127 % – gemeint ist $41{,}27\\,\\%$ (sonst ergäbe die Summe nicht 100 %).'), official: 'Ca 23,08 % / 38,77 %, P 15,38 % / 19,97 %, O 61,54 % / 41,127 %' },
  { nr: '8', p: nAusM(C('CaCO3'), 1.25, 'kg', 'mol'), official: 'n = 12,489 mol' },
  { nr: '9', p: molAusMN(31.725, 'g', 250, 'mmol'), official: 'M = 126,9 g/mol' },
  { nr: '10', p: molAusMN(25.07, 'mg', 125, 'µmol', 'Hg'), official: 'Hg' },
  { nr: '11', p: teilchenMasse({ f: 'Cu', name: 'Kupfer-Atom' }, 1), official: '10,55 · 10⁻²³ g' },
  { nr: '12', p: teilchenMasse({ f: 'H2O', name: 'Wassermoleküle' }, 3), official: '8,975 · 10⁻²³ g' },
  { nr: '13', p: mAusN(C('MgSO4'), 3, 'mmol', 'g'), official: 'm = 0,361 g' },
  { nr: '14', p: nAusM(C('As2O3'), 750, 'µg', 'µmol'), official: 'n = 3,79 µmol' },
  {
    nr: '15',
    p: note(
      mAusN(C('AgNO3'), 2, 'µmol', 'mg'),
      'Lösungsblatt: 0,51 mg. Mit $M(\\mathrm{AgNO_3}) = 169{,}88\\,\\text{g/mol}$ ergibt sich $2\\,\\mu\\text{mol} \\cdot 169{,}88\\,\\tfrac{\\text{g}}{\\text{mol}} = 339{,}8\\,\\mu\\text{g} \\approx 0{,}34\\,\\text{mg}$. 0,51 mg wären 3 µmol.',
    ),
    official: 'm = 0,51 mg',
  },
  { nr: '16', p: atomeInMasse(C('FeO'), 'Fe', 30, 'g'), official: 'N(Fe) = 2,514 · 10²³' },
  {
    nr: '17',
    p: note(mAusN(C('Al2(SO4)3'), 20, 'nmol', 'µg'), 'Lösungsblatt: 6,823 µg. Mit $M = 342{,}14\\,\\text{g/mol}$ sind es $6{,}84\\,\\mu\\text{g}$ – die kleine Abweichung kommt von anderen Atommassen in der Tabelle.'),
    official: 'm = 6,823 µg',
  },
  {
    nr: '18',
    p: note(
      atomeInMasse(C('Ca(OH)2'), 'O', 25, 'mg'),
      'Lösungsblatt: $4{,}0638 \\cdot 10^{23}$. Der Exponent stimmt nicht: 25 mg sind nur 0,337 mmol – das ergibt $4{,}06 \\cdot 10^{20}$ Sauerstoffatome.',
    ),
    official: 'N(O) = 4,0638 · 10²³',
  },
]

export const SHEET_TASKS: Record<string, SheetTask[]> = {
  klammern: SHEET_KLAMMERN,
  gleichungen: SHEET_GLEICHUNGEN,
  brueche: SHEET_BRUECHE,
  wurzeln: SHEET_WURZELN,
  stoffmenge: SHEET_STOFF,
}
