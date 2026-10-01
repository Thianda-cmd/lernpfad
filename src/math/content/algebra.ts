import { mulberry32 } from '../../lib/random'
import { T } from '../poly'
import { KLAMMER_GENS, ausklammernProblem, klammerProblem, g, t, terms } from '../gen/klammern'
import { AUSMULT_GENS, ausmultProblem, binomProblem, P } from '../gen/ausmultiplizieren'
import { GLEICHUNG_GENS, equationProblem, solveLinear } from '../gen/gleichungen'
import { TEXT_GENS, grundstueck, zahlSumme, zahlVielfach } from '../gen/textaufgaben'
import type { Problem, Step } from '../types'
import { exampleFrom, type ChapterContent } from './types'

const MITSCHRIFT = 'Aus deiner Mitschrift'
const BLATT1 = 'Übungsblatt ①'
const BLATT2 = 'Übungsblatt ②'

/* ---------------------------------------------------------------------------
   Klammern auflösen
   --------------------------------------------------------------------------- */

const klammerEx1 = klammerProblem([g(1, terms([4, 'p'], [2.7, 'q'])), g(-1, terms([3.2, 'p'], [-7.1, 'q'])), g(-1, terms([-2.4, 'p'], [3.6, 'q']))])
const klammerEx2 = klammerProblem([t(4, 'u'), g(1, [t(11, 'v'), g(-1, terms([4, 'u'], [3, 'w']))], true), g(-1, [t(21, 'u'), g(1, terms([66, 'u'], [-14, 'w']))], true)])
const klammerEx3 = klammerProblem([
  t(3, 'x3'),
  g(-1, [t(24, 'x2'), t(5, 'x'), g(-1, terms([6, 'x'], [4, 'x2']))], true),
  g(-1, [t(2, 'x2'), g(-1, terms([6, 'x'], [4, 'x3'])), t(-12, 'x')], true),
])
const klammerEx4 = klammerProblem([g(1, terms([3, 'x'], [6, 'y'])), g(-1, [g(1, terms([7, 'x'], [-3, 'y'])), g(-1, terms([5, 'x'], [-7, 'y'])), g(1, terms([1, 'x'], [-1, 'y']))], true)])

export const KLAMMERN: ChapterContent = {
  id: 'klammern',
  intro: 'Entscheidend ist das Vorzeichen **vor** der Klammer.',
  formulas: [
    { tex: 'a + (b + c) = a + b + c', t: 'Plusklammer: einfach weglassen' },
    { tex: 'a - (b + c) = a - b - c', t: 'Minusklammer: alle Vorzeichen umdrehen' },
    { tex: 'a - (b - c) = a - b + c', t: 'Minus vor Minus wird Plus' },
  ],
  sections: [
    {
      id: 'regeln',
      title: 'Die drei Klammerregeln',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: 'a + (b + c) = a + b + c', t: '**Plusklammer:** Die Klammer fällt einfach weg.' },
            { tex: 'a - (b + c) = a - b - c', t: '**Minusklammer:** Jedes Vorzeichen in der Klammer dreht sich um.' },
            { tex: 'a - (b - c) = a - b + c', t: 'Aus $-(-c)$ wird $+c$.' },
          ],
        },
        { k: 'viz', id: 'signflip' },
        {
          k: 'merk',
          t: 'Das Minus vor der Klammer wirkt wie „mal $(-1)$“ – auf **jeden** Summanden in der Klammer, nicht nur auf den ersten.',
        },
      ],
    },
    {
      id: 'zusammenfassen',
      title: 'Gleichartige Terme zusammenfassen',
      blocks: [
        {
          k: 'p',
          t: 'Nach dem Auflösen fasst du zusammen. Addieren kannst du nur **gleichartige** Terme – also Terme mit genau denselben Variablen und denselben Hochzahlen. Die Zahl davor (der Koeffizient) wird addiert, die Variable bleibt.',
        },
        {
          k: 'table',
          head: ['Terme', 'gleichartig?', 'Ergebnis'],
          rows: [
            ['$3x + 5x$', 'ja', '$8x$'],
            ['$4{,}2p - 1{,}5p$', 'ja', '$2{,}7p$'],
            ['$3x + 5y$', 'nein – verschiedene Variablen', 'bleibt $3x + 5y$'],
            ['$2a^2 + 3a$', 'nein – verschiedene Hochzahlen', 'bleibt $2a^2 + 3a$'],
            ['$4ab - ab$', 'ja ($ab = ba$)', '$3ab$'],
          ],
        },
        {
          k: 'mistake',
          wrong: '(4p + 2{,}7q) - (3{,}2p - 7{,}1q) \\quad | +3{,}2p',
          right: '= 4p + 2{,}7q - 3{,}2p + 7{,}1q - \\ldots',
          why: 'Ein **Term** hat kein Gleichheitszeichen – also gibt es keine „zweite Seite“, auf der man $+3{,}2p$ rechnen könnte. Umformungen mit „|“ gibt es nur bei Gleichungen. Bei Termen: Klammern auflösen, ordnen, zusammenfassen.',
          source: 'Mitschrift, erster Versuch',
        },
      ],
    },
    {
      id: 'beispiele',
      title: 'Beispiele aus deinem Unterricht',
      blocks: [
        exampleFrom(klammerEx1, 'Drei Klammern mit Dezimalzahlen', MITSCHRIFT),
        { k: 'p', t: 'Bei **verschachtelten Klammern** arbeitest du von innen nach außen: erst die runden Klammern, dann die eckigen.' },
        exampleFrom(klammerEx2, 'Eckige und runde Klammern', MITSCHRIFT),
        exampleFrom(klammerEx3, 'Mit Potenzen', BLATT1 + ', Aufgabe 6'),
        exampleFrom(klammerEx4, 'Minus vor der eckigen Klammer', BLATT1 + ', Aufgabe 7'),
      ],
    },
    {
      id: 'ausklammern',
      title: 'Ausklammern',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: 'ab + ac = a(b + c)', t: 'Rückwärts ausmultiplizieren' },
            { tex: '12x + 18 = 6(2x + 3)', t: 'ggT der Zahlen vor die Klammer' },
            { tex: '4a^2 - 6a = 2a(2a - 3)', t: 'auch Variablen, die in **jedem** Summanden stecken' },
          ],
        },
        exampleFrom(ausklammernProblem(T(6, 'a'), [T(2, 'x'), T(-3, 'y'), T(1)]), 'Zahl und Variable ausklammern'),
        {
          k: 'mistake',
          wrong: '12ax - 18ay + 6a = 6a(2x - 3y)',
          right: '12ax - 18ay + 6a = 6a(2x - 3y + 1)',
          why: '$6a : 6a = 1$ – der Summand bleibt als $1$ in der Klammer stehen.',
        },
        { k: 'try', p: KLAMMER_GENS[1].gen(mulberry32(17), 2) },
      ],
    },
    {
      id: 'fehler',
      title: 'Typische Fehler',
      blocks: [
        { k: 'mistake', wrong: 'a - (b - c) = a - b - c', right: 'a - (b - c) = a - b + c', why: 'Das Minus vor der Klammer dreht **alle** Vorzeichen um – auch das zweite.' },
        { k: 'mistake', wrong: '-(-2{,}4p + 3{,}6q) = -2{,}4p + 3{,}6q', right: '-(-2{,}4p + 3{,}6q) = +2{,}4p - 3{,}6q', why: 'Minus mal Minus ergibt Plus – und das Plus in der Klammer wird zum Minus.' },
        { k: 'mistake', wrong: '3x + 5x^2 = 8x^3', right: '3x + 5x^2 \\text{ bleibt stehen}', why: '$x$ und $x^2$ sind nicht gleichartig. Hochzahlen werden beim **Addieren** nie verändert.' },
        { k: 'try', p: KLAMMER_GENS[0].gen(mulberry32(41), 2) },
      ],
    },
  ],
  gens: KLAMMER_GENS,
}

/* ---------------------------------------------------------------------------
   Ausmultiplizieren
   --------------------------------------------------------------------------- */

const am1 = ausmultProblem([{ s: 1, f: [[T(5, 'a')], P([2, 'x'], [-3, 'y'], [4, 'z'])] }])
const am2 = ausmultProblem([{ s: 1, f: [P([3, 'u'], [4, 'v']), P([2, 'u'], [-6, 'w'])] }])
const am3 = ausmultProblem([{ s: 1, f: [P([1, 'x'], [4, '']), P([1, 'x'], [5, ''])] }])
const am4 = ausmultProblem([{ s: 1, f: [P([1, 'y'], [19, '']), P([1, 'y'], [-20, ''])] }])
const am5 = ausmultProblem([
  { s: 1, f: [P([4, 'a'], [-3, 'b']), P([1, 'a'], [5, 'b'])] },
  { s: -1, f: [P([2, 'a'], [1, 'b']), P([2, 'a'], [1, 'b'])] },
])
const am6 = ausmultProblem([
  { s: 1, f: [[T(3, 'y')], P([8, 'x'], [-6, 'y'], [4, 'z'])] },
  { s: -1, f: [[T(6, 'x')], P([3, 'x'], [4, 'y'], [-5, 'z'])], trailing: true },
  { s: 1, f: [[T(-2, 'x')], P([7, 'x'], [-5, 'y'])] },
])
const am7 = ausmultProblem([{ s: 1, f: [[T(2, 'x')], P([1, 'x2'], [1, ''])], trailing: true }])
const binom2 = binomProblem(T(2), T(1, 'x'), 2)

export const AUSMULT: ChapterContent = {
  id: 'ausmultiplizieren',
  intro: 'Aus einem Produkt wird eine Summe: **jeder** Summand mal **jeden** Summanden.',
  formulas: [
    { tex: 'a(b + c) = ab + ac', t: 'Distributivgesetz' },
    { tex: '(a+b)(c+d) = ac + ad + bc + bd', t: 'Klammer mal Klammer' },
    { tex: '(a+b)^2 = a^2 + 2ab + b^2', t: '1. binomische Formel' },
    { tex: '(a-b)^2 = a^2 - 2ab + b^2', t: '2. binomische Formel' },
    { tex: '(a+b)(a-b) = a^2 - b^2', t: '3. binomische Formel' },
  ],
  sections: [
    {
      id: 'distributiv',
      title: 'Jeder mit jedem',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: 'a(b + c) = ab + ac', t: 'Faktor vor der Klammer' },
            { tex: '(a+b)(c+d) = ac + ad + bc + bd', t: 'vier Produkte' },
            { tex: '(a-b)(c+d) = ac + ad - bc - bd' },
            { tex: '(a-b)(c-d) = ac - ad - bc + bd', t: 'Minus mal Minus = Plus' },
          ],
        },
        { k: 'viz', id: 'area' },
        exampleFrom(am1, 'Faktor mal Klammer', MITSCHRIFT),
        exampleFrom(am2, 'Klammer mal Klammer', MITSCHRIFT),
        exampleFrom(am3, 'Mit gleicher Variable', MITSCHRIFT),
        exampleFrom(am4, 'Mit Minus in einer Klammer', MITSCHRIFT),
      ],
    },
    {
      id: 'vorzeichen',
      title: 'Vorzeichenregeln beim Multiplizieren',
      blocks: [
        {
          k: 'table',
          head: ['', 'mal $+$', 'mal $-$'],
          rows: [
            ['$+$', '$+$', '$-$'],
            ['$-$', '$-$', '$+$'],
          ],
        },
        { k: 'p', t: 'Gleiche Vorzeichen ergeben Plus, verschiedene ergeben Minus. Die Variablen werden hintereinander geschrieben, gleiche Variablen zu Potenzen: $3u \\cdot 2u = 6u^2$, $4v \\cdot 2u = 8uv$.' },
        exampleFrom(am7, 'Faktor hinter der Klammer', MITSCHRIFT),
      ],
    },
    {
      id: 'binomisch',
      title: 'Binomische Formeln',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: '(a+b)^2 = a^2 + 2ab + b^2', t: '1. Plus-Formel' },
            { tex: '(a-b)^2 = a^2 - 2ab + b^2', t: '2. Minus-Formel' },
            { tex: '(a+b)(a-b) = a^2 - b^2', t: '3. Plus-Minus-Formel' },
          ],
        },
        {
          k: 'mistake',
          wrong: '(2 - x)^2 = 2^2 - x^2 = 4 - x^2',
          right: '(2 - x)^2 = (2-x)(2-x) = 4 - 4x + x^2',
          why: 'Ein Quadrat einer Summe ist **nicht** die Summe der Quadrate – das Mittelglied $-2 \\cdot 2 \\cdot x = -4x$ fehlt.',
          source: 'Mitschrift',
        },
        exampleFrom(binom2, '2. binomische Formel', MITSCHRIFT),
        exampleFrom(binomProblem(T(3, 'x'), T(5), 3), '3. binomische Formel'),
      ],
    },
    {
      id: 'lang',
      title: 'Lange Terme in drei Schritten',
      blocks: [
        { k: 'p', t: 'Bei mehreren Produkten: 1. jedes Produkt **einzeln** ausmultiplizieren und in Klammern schreiben, 2. Minusklammern auflösen, 3. zusammenfassen. So verlierst du kein Vorzeichen.' },
        exampleFrom(am5, 'Produkt minus Quadrat', MITSCHRIFT),
        exampleFrom(am6, 'Drei Produkte mit drei Variablen', MITSCHRIFT),
        { k: 'try', p: AUSMULT_GENS[0].gen(mulberry32(12), 2) },
      ],
    },
  ],
  gens: AUSMULT_GENS,
}

/* ---------------------------------------------------------------------------
   Gleichungen & Ungleichungen
   --------------------------------------------------------------------------- */

const gl1 = equationProblem([t(10), g(1, terms([6, ''], [-1, 'x']))], [t(8)])
const gl2 = equationProblem([t(2, 'x'), t(3)], [t(16), g(-1, terms([2, 'x'], [-3, '']))])
const gl3 = equationProblem([t(15, 'x'), g(-1, terms([12, ''], [11, 'x'])), g(1, terms([23, ''], [-3, 'x']))], [t(12)])
const par1 = equationProblem(terms([1, 'x'], [1, 'a'], [1, 'b']), terms([2, 'x'], [-1, 'a']), 'x', '=', 'Löse nach $x$ auf.')
const par2 = equationProblem(terms([1, 'a'], [2, 'b'], [1, 'c']), terms([2, 'a'], [3, 'b']), 'c', '=', 'Löse nach $c$ auf.')
const par3 = equationProblem(terms([1, 'x'], [4, 'a'], [-3, 'b'], [2, 'x']), terms([7, 'x'], [3, 'a'], [-4, 'b'], [-3, 'x']), 'x', '=', 'Löse nach $x$ auf.')
const par4 = equationProblem([t(2, 'x'), t(3, 'a'), g(-1, terms([3, 'b'], [-2, 'x']))], [t(8, 'x'), t(2, 'a'), g(-1, terms([4, 'b'], [3, 'x']))], 'x', '=', 'Löse nach $x$ auf.')
const un1 = equationProblem([t(15), g(-1, terms([3, 'x'], [-2, '']))], [t(19), g(-1, terms([2, 'x'], [4, '']))], 'x', '<')
const un2 = equationProblem([t(3, 'x'), g(1, terms([8, ''], [-2, 'x']))], [t(8, 'x'), g(1, terms([4, ''], [-6, 'x']))], 'x', '>')
const un3 = equationProblem([t(2, 'm'), t(19), g(-1, terms([1, 'x'], [-2, 'n']))], terms([18, ''], [1, 'm'], [1, 'n']), 'x', '>', 'Löse nach $x$ auf.')

/** (2 − x)² = (2 + x)² aus der Mitschrift – von Hand, weil hier zwei Quadrate stehen */
function binomGleichung(): Problem {
  const pre: Step[] = [
    { tex: '(2 - x)^2 = (2 + x)^2', note: 'Quadrate als Produkt schreiben.' },
    { tex: '(2-x)(2-x) = (2+x)(2+x)' },
    { tex: '4 - 2x - 2x + x^2 = 4 + 2x + 2x + x^2', note: 'Ausmultiplizieren – jeder mit jedem.' },
    { tex: '4 - 4x + x^2 = 4 + 4x + x^2', op: '| -x^2', note: '$x^2$ steht auf beiden Seiten und fällt weg.' },
  ]
  const s = solveLinear([T(4), T(-4, 'x')], [T(4), T(4, 'x')], 'x', '=', pre)
  return { prompt: 'Löse die Gleichung nach $x$.', tex: '(2 - x)^2 = (2 + x)^2', answer: { kind: 'num', value: 0, label: 'x =' }, steps: s.steps }
}

export const GLEICHUNGEN: ChapterContent = {
  id: 'gleichungen',
  intro: 'Jede Umformung auf **beiden** Seiten – bis die Variable allein steht.',
  formulas: [
    { tex: 'a = b \\;\\Leftrightarrow\\; a + c = b + c', t: 'auf beiden Seiten addieren/subtrahieren' },
    { tex: 'a = b \\;\\Leftrightarrow\\; a \\cdot c = b \\cdot c \\quad (c \\neq 0)', t: 'auf beiden Seiten multiplizieren/teilen' },
    { tex: '-x < -2 \\;\\Leftrightarrow\\; x > 2', t: 'Ungleichung: bei · oder : mit negativer Zahl Zeichen umdrehen' },
  ],
  sections: [
    {
      id: 'umformen',
      title: 'Äquivalenzumformungen',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: '| +c \\quad | -c', t: 'Zahl oder Term auf beiden Seiten addieren/abziehen' },
            { tex: '| \\cdot c \\quad | :c', t: 'beide Seiten mit derselben Zahl ≠ 0 multiplizieren/teilen' },
            { tex: '\\text{Klammern zuerst}', t: 'vorher auflösen und jede Seite zusammenfassen' },
          ],
        },
        { k: 'viz', id: 'waage' },
        { k: 'merk', t: 'Hinter jede Zeile mit „|“ schreiben, was **als Nächstes** auf beiden Seiten passiert.' },
      ],
    },
    {
      id: 'beispiele',
      title: 'Gleichungen aus deinem Unterricht',
      blocks: [
        exampleFrom(gl1, 'Klammer auf einer Seite', MITSCHRIFT),
        exampleFrom(gl2, 'Minusklammer rechts', MITSCHRIFT + ' · ' + BLATT2 + ', Aufgabe 1'),
        exampleFrom(gl3, 'Zwei Klammern', MITSCHRIFT + ' · ' + BLATT2 + ', Aufgabe 3'),
        exampleFrom(binomGleichung(), 'Mit binomischer Formel', MITSCHRIFT),
      ],
    },
    {
      id: 'parameter',
      title: 'Formeln mit Parametern: „x |“',
      blocks: [
        {
          k: 'p',
          t: '„$x\\,|$“ heißt: nach $x$ auflösen. Alle anderen Buchstaben sind feste Zahlen und werden wie Zahlen behandelt.',
        },
        exampleFrom(par1, 'Nach x', MITSCHRIFT),
        exampleFrom(par2, 'Nach c', MITSCHRIFT),
        exampleFrom(par3, 'x auf beiden Seiten', MITSCHRIFT),
        exampleFrom(par4, 'Mit Klammern', BLATT2 + ', Aufgabe 7'),
      ],
    },
    {
      id: 'ungleichungen',
      title: 'Ungleichungen – die neue Regel',
      blocks: [
        {
          k: 'p',
          t: 'Ungleichungen (mit $<$, $>$, $\\le$, $\\ge$) löst du genauso wie Gleichungen – mit **einer** Ausnahme: Multiplizierst oder teilst du durch eine **negative** Zahl, dreht sich das Zeichen um. Warum? $3 > 2$, aber $-3 < -2$.',
        },
        {
          k: 'rules',
          items: [
            { tex: '-x < -2 \\;\\Rightarrow\\; x > 2', t: 'bei $:(-1)$ umdrehen' },
            { tex: '-2x \\ge 6 \\;\\Rightarrow\\; x \\le -3', t: 'bei $:(-2)$ umdrehen' },
            { tex: 'x + 3 > 5 \\;\\Rightarrow\\; x > 2', t: 'Plus/Minus: nichts umdrehen' },
          ],
        },
        exampleFrom(un1, 'Mit Minusklammern', BLATT2 + ', Aufgabe 2'),
        exampleFrom(un2, 'x auf beiden Seiten', BLATT2 + ', Aufgabe 4'),
        exampleFrom(un3, 'Mit Parametern', BLATT2 + ', Aufgabe 5'),
        { k: 'mistake', wrong: '-2x > 6 \\;\\Rightarrow\\; x > -3', right: '-2x > 6 \\;\\Rightarrow\\; x < -3', why: 'Durch $-2$ geteilt → Zeichen umdrehen. Probe mit $x = -4$: $-2 \\cdot (-4) = 8 > 6$ ✓.' },
        { k: 'try', p: GLEICHUNG_GENS[2].gen(mulberry32(5), 2) },
      ],
    },
  ],
  gens: GLEICHUNG_GENS,
}

/* ---------------------------------------------------------------------------
   Textaufgaben
   --------------------------------------------------------------------------- */

export const TEXTAUFGABEN: ChapterContent = {
  id: 'textaufgaben',
  intro: 'Text Satz für Satz in eine Gleichung übersetzen, dann lösen.',
  formulas: [
    { tex: '\\text{„die Summe aus } x \\text{ und } 5\\text{“} = (x + 5)', t: 'Summe/Differenz, die weiterverrechnet wird, kommt in Klammern' },
    { tex: '\\text{„} a \\text{ von } b \\text{ subtrahieren“} = b - a', t: 'Reihenfolge umgekehrt zum Satz' },
  ],
  sections: [
    {
      id: 'schritte',
      title: 'In vier Schritten',
      blocks: [
        {
          k: 'table',
          head: ['Schritt', 'Was du tust', 'Beispiel'],
          rows: [
            ['1. Variable festlegen', 'Schreib auf, wofür $x$ steht.', '$x$ = gesuchte Zahl'],
            ['2. Übersetzen', 'Satzteil für Satzteil in Mathe.', '$16 - (x + 5) = 9$'],
            ['3. Lösen', 'Gleichung wie gewohnt umformen.', '$x = 2$'],
            ['4. Probe & Antwort', 'In den **Text** einsetzen, Antwortsatz.', '„Die Zahl heißt 2.“'],
          ],
        },
        { k: 'viz', id: 'translator' },
      ],
    },
    {
      id: 'zahlen',
      title: 'Zahlenrätsel aus deinem Übungsblatt',
      blocks: [
        exampleFrom(zahlSumme(5, 16, 9), 'Summe von 16 subtrahieren', BLATT1 + ', Aufgabe 8'),
        exampleFrom(zahlVielfach(2, 4, 44, 8), 'Das Doppelte einer Zahl', BLATT1 + ', Aufgabe 9'),
        {
          k: 'mistake',
          wrong: '16 - x + 5 = 9',
          right: '16 - (x + 5) = 9',
          why: 'Subtrahiert wird die **ganze Summe** – ohne Klammer würde nur $x$ abgezogen und die 5 addiert.',
        },
        { k: 'mistake', wrong: '(x + 5) - 16 = 9', right: '16 - (x + 5) = 9', why: '„… **von** 16 subtrahieren“ heißt: 16 kommt zuerst.' },
      ],
    },
    {
      id: 'grundstueck',
      title: 'Aufgaben mit Flächen',
      blocks: [
        { k: 'p', t: 'Skizze: alte und neue Maße, Fläche = Länge · Breite. Die $x^2$ fallen meist weg.' },
        exampleFrom(grundstueck(30, 20, 3, 2), 'Das Grundstück von Herrn M.', BLATT2 + ', Aufgabe 8'),
      ],
    },
    {
      id: 'alter',
      title: 'Altersrätsel',
      blocks: [
        { k: 'p', t: 'Beide Personen werden gleich viele Jahre älter – die Jahre kommen bei **jedem** Alter dazu.' },
        exampleFrom(TEXT_GENS[2].gen(mulberry32(7), 2), 'Mutter und Tochter'),
        { k: 'mistake', wrong: '4x + 6 = 2x + 6', right: '4x + 6 = 2 \\cdot (x + 6)', why: '„Doppelt so alt wie die Tochter **in 6 Jahren**“ – die 6 gehört zur Tochter, also in die Klammer.' },
        { k: 'try', p: TEXT_GENS[0].gen(mulberry32(3), 2) },
      ],
    },
  ],
  gens: TEXT_GENS,
}
