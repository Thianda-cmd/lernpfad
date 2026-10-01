import { mulberry32 } from '../../lib/random'
import { BRUCH_GENS, bracketDivProblem, doubleFracProblem, fracMulProblem, fracSumProblem, fracTermProblem, kuerzenAusklammern, kuerzenProblem } from '../gen/brueche'
import { POTENZ_GENS, potBruchProblem, potKlammerProblem, zehnerRechnen, zehnerSchreibweise } from '../gen/potenzen'
import { FORMEL_GENS, FORMELN, formelProblem } from '../gen/formeln'
import { PROZENT_GENS, pGesucht } from '../gen/prozent'
import type { Problem } from '../types'
import { bruch3 } from './sheets'
import { exampleFrom, type ChapterContent } from './types'

const MITSCHRIFT = 'Aus deiner Mitschrift'
const BLATT = 'Übungsblatt Bruch- & Potenzrechnung'
const WBLATT = 'Übungsblatt Wurzelrechnen'

const F = (id: string) => formelProblem(FORMELN.find((f) => f.id === id)!)

/* ---------------------------------------------------------------------------
   Bruchrechnung
   --------------------------------------------------------------------------- */

export const BRUECHE: ChapterContent = {
  id: 'brueche',
  intro: 'Addieren nur mit gleichem Nenner, dem **Hauptnenner**. Multiplizieren und Teilen gehen direkt.',
  formulas: [
    { tex: '\\frac{a}{b} = \\frac{a \\cdot k}{b \\cdot k}', t: 'Erweitern (und rückwärts: Kürzen)' },
    { tex: '\\frac{a}{c} + \\frac{b}{c} = \\frac{a + b}{c}', t: 'Addieren nur bei gleichem Nenner' },
    { tex: '\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{a \\cdot c}{b \\cdot d}', t: 'Zähler mal Zähler, Nenner mal Nenner' },
    { tex: '\\frac{a}{b} : \\frac{c}{d} = \\frac{a}{b} \\cdot \\frac{d}{c}', t: 'Teilen = mal Kehrwert' },
  ],
  sections: [
    {
      id: 'grundlagen',
      title: 'Erweitern, Kürzen, Hauptnenner',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: '\\frac{3}{4} = \\frac{3 \\cdot 5}{4 \\cdot 5} = \\frac{15}{20}', t: '**Erweitern:** oben und unten mit derselben Zahl mal' },
            { tex: '\\frac{159}{360} = \\frac{159 : 3}{360 : 3} = \\frac{53}{120}', t: '**Kürzen:** oben und unten durch dieselbe Zahl' },
            { tex: '\\text{HN} = \\text{kgV der Nenner}', t: 'kleinste Zahl, in der alle Nenner aufgehen' },
          ],
        },
        { k: 'viz', id: 'fractionbars' },
        {
          k: 'p',
          t: 'So findest du den Hauptnenner: Nenner in Primfaktoren zerlegen und jeden Faktor so oft nehmen, wie er **höchstens** in einem Nenner vorkommt. Beispiel $4 = 2\\cdot2$, $6 = 2\\cdot3$, $10 = 2\\cdot5$ → HN $= 2\\cdot2\\cdot3\\cdot5 = 60$.',
        },
      ],
    },
    {
      id: 'kuerzen',
      title: 'Vollständig kürzen',
      blocks: [
        exampleFrom(kuerzenProblem(84, 126), 'Mit dem ggT'),
        exampleFrom(kuerzenAusklammern(4, 6, 'x', 'y'), 'Erst ausklammern, dann kürzen'),
        {
          k: 'mistake',
          wrong: '\\frac{x + 3}{x + 6} = \\frac{3}{6}',
          right: '\\frac{x + 3}{x + 6} \\text{ bleibt so}',
          why: 'Kürzen geht nur mit **Faktoren**, nicht mit Summanden. Probe mit $x = 1$: $\\frac{4}{7} \\neq \\frac{1}{2}$.',
        },
        { k: 'try', p: BRUCH_GENS[0].gen(mulberry32(14), 2) },
      ],
    },
    {
      id: 'rechnen',
      title: 'Rechnen mit Brüchen',
      blocks: [
        exampleFrom(fracMulProblem([2, 30], [5, 40]), 'Multiplizieren', MITSCHRIFT),
        {
          k: 'mistake',
          wrong: '\\frac{2}{30} \\cdot \\frac{5}{40} = \\frac{10}{120}',
          right: '\\frac{2}{30} \\cdot \\frac{5}{40} = \\frac{10}{1200} = \\frac{1}{120}',
          why: '$30 \\cdot 40 = 1200$, nicht 120. Tipp: **vor** dem Multiplizieren über Kreuz kürzen: $\\frac{2}{40} = \\frac{1}{20}$ und $\\frac{5}{30} = \\frac{1}{6}$ → $\\frac{1}{120}$ – kleine Zahlen, kaum Fehler.',
          source: 'Mitschrift, Aufgabe 1',
        },
        exampleFrom(fracSumProblem([[1, 75], [1, 23]]), 'Addieren mit Hauptnenner', MITSCHRIFT),
        exampleFrom(bracketDivProblem([23, 180], [15, 90], [2, 3]), 'Klammer, dann Division', MITSCHRIFT + ' · ' + BLATT + ', Aufgabe 1'),
        exampleFrom(fracSumProblem([[5, 15], [96, 144]]), 'Erst kürzen, dann addieren', BLATT + ', Aufgabe 2'),
      ],
    },
    {
      id: 'doppel',
      title: 'Doppelbrüche',
      blocks: [
        { k: 'p', t: 'Ein Doppelbruch ist „Bruch durch Bruch“. Rechne Zähler und Nenner getrennt aus – dann mal Kehrwert.' },
        exampleFrom(doubleFracProblem([8, 25], [1, 3], [1, 5]), 'Doppelbruch', BLATT + ', Aufgabe 5'),
        exampleFrom(doubleFracProblem([1, 4], [1, 5], [1, 6], true, [1, 5]), 'Doppelbruch zum Quadrat', BLATT + ', Aufgabe 6'),
      ],
    },
    {
      id: 'terme',
      title: 'Bruchterme',
      blocks: [
        { k: 'p', t: 'Steht die Variable im **Nenner**, gehört sie einmal in den Hauptnenner.' },
        exampleFrom(fracTermProblem([[3, 4], [7, 6], [-9, 10]], 'a', false), 'Variable im Zähler', MITSCHRIFT),
        exampleFrom(fracTermProblem([[2, 3], [-4, 9], [11, 6]], 'z', true), 'Variable im Nenner', MITSCHRIFT),
        {
          k: 'merk',
          t: 'kgV(3, 9, 6) = 18 – also reicht $18z$ statt $90z$ aus der Mitschrift.',
        },
        exampleFrom(bruch3, 'Zähler mit zwei Variablen', BLATT + ', Aufgabe 3'),
        { k: 'try', p: BRUCH_GENS[4].gen(mulberry32(8), 2) },
      ],
    },
  ],
  gens: BRUCH_GENS,
}

/* ---------------------------------------------------------------------------
   Potenzen & Wurzeln
   --------------------------------------------------------------------------- */

const rootEx: Problem = {
  prompt: 'Schreibe als eine Potenz.',
  tex: '\\sqrt{a^3} \\cdot \\sqrt[3]{a^2}',
  answer: { kind: 'expr', value: 'a^(13/6)', vars: ['a'], noRoot: true, singleUse: true },
  steps: [
    { tex: '= a^{\\frac{3}{2}} \\cdot a^{\\frac{2}{3}}', note: 'Wurzeln als Potenzen: $\\sqrt[n]{a^m} = a^{\\frac{m}{n}}$.' },
    { tex: '= a^{\\frac{9}{6} + \\frac{4}{6}}', note: 'Exponenten auf den Hauptnenner 6 bringen.' },
    { tex: '= a^{\\frac{13}{6}}', note: 'Exponenten addieren.' },
  ],
}

const rootEx2: Problem = {
  prompt: 'Schreibe als Potenz.',
  tex: '\\frac{1}{\\sqrt[4]{x^5}}',
  answer: { kind: 'expr', value: 'x^(-5/4)', vars: ['x'], noRoot: true, singleUse: true },
  steps: [
    { tex: '= \\frac{1}{x^{\\frac{5}{4}}}', note: 'Wurzel als Potenz.' },
    { tex: '= x^{-\\frac{5}{4}}', note: '„Eins durch“ wird zum negativen Exponenten.' },
  ],
  sheetNote: 'Auf dem Lösungsblatt steht $x^{\\frac{5}{4}}$ – da fehlt das Minus. Richtig ist $x^{-\\frac{5}{4}}$.',
}

const rootEx3: Problem = {
  prompt: 'Ziehe den Faktor unter die Wurzel und berechne.',
  tex: '3 \\cdot \\sqrt[3]{\\tfrac{3}{4}}',
  answer: { kind: 'num', value: Math.cbrt(81 / 4), rel: 0.005 },
  steps: [
    { tex: '3 = \\sqrt[3]{27}', note: 'Den Faktor als Kubikwurzel schreiben: $3^3 = 27$.' },
    { tex: '= \\sqrt[3]{27 \\cdot \\tfrac{3}{4}} = \\sqrt[3]{\\tfrac{81}{4}}', note: 'Unter einer gemeinsamen Wurzel multiplizieren.' },
    { tex: '= \\sqrt[3]{20{,}25} \\approx 2{,}73' },
  ],
}

const potEx8: Problem = {
  prompt: 'Kürze so weit wie möglich.',
  tex: '\\frac{42\\,(x-3)^9\\,(x+2)^4}{105\\,(x-3)^5\\,(x+2)^3}',
  answer: { kind: 'expr', value: '2/5*(x-3)^4*(x+2)', vars: ['x'] },
  steps: [
    { tex: '\\frac{42}{105} = \\frac{2}{5}', note: 'Zahlen kürzen (mit 21).' },
    { tex: '\\frac{(x-3)^9}{(x-3)^5} = (x-3)^{9-5} = (x-3)^4', note: 'Die Klammer wie eine Basis behandeln: Exponenten subtrahieren.' },
    { tex: '\\frac{(x+2)^4}{(x+2)^3} = (x+2)^1' },
    { tex: '= \\frac{2}{5}\\,(x-3)^4\\,(x+2)' },
  ],
}

const wurzel1: Problem = {
  prompt: 'Ziehe die Wurzel so weit wie möglich.',
  tex: '\\sqrt[3]{64\\,a^3\\,b^9}',
  answer: { kind: 'expr', value: '4*a*b^3', vars: ['a', 'b'], noRoot: true, singleUse: true },
  steps: [
    { tex: '= \\sqrt[3]{64} \\cdot \\sqrt[3]{a^3} \\cdot \\sqrt[3]{b^9}', note: 'Wurzel aus einem Produkt = Produkt der Wurzeln.' },
    { tex: '= 4 \\cdot a^{\\frac{3}{3}} \\cdot b^{\\frac{9}{3}}', note: '$4^3 = 64$; Exponent durch 3.' },
    { tex: '= 4ab^3' },
  ],
}

export const POTENZEN: ChapterContent = {
  id: 'potenzen',
  intro: 'Potenzgesetze, Zehnerpotenzen und Wurzeln als Potenzen mit Bruch im Exponenten.',
  formulas: [
    { tex: 'a^m \\cdot a^n = a^{m+n}', t: 'gleiche Basis: Exponenten addieren' },
    { tex: 'a^m : a^n = a^{m-n}', t: 'gleiche Basis: Exponenten subtrahieren' },
    { tex: '(a^m)^n = a^{m \\cdot n}', t: 'Potenz einer Potenz' },
    { tex: '(a \\cdot b)^n = a^n \\cdot b^n', t: 'Produkt potenzieren' },
    { tex: 'a^0 = 1,\\quad a^{-n} = \\frac{1}{a^n}', t: 'Null und negative Exponenten' },
    { tex: '\\sqrt[n]{a^m} = a^{\\frac{m}{n}}', t: 'Wurzel als Potenz' },
  ],
  sections: [
    {
      id: 'gesetze',
      title: 'Die Potenzgesetze',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: 'a^m \\cdot a^n = a^{m+n}', t: 'Mal: addieren' },
            { tex: '\\frac{a^m}{a^n} = a^{m-n}', t: 'Geteilt: subtrahieren' },
            { tex: '(a^m)^n = a^{m\\cdot n}', t: 'Hoch: multiplizieren' },
            { tex: '(ab)^n = a^n b^n', t: 'jeder Faktor bekommt den Exponenten' },
            { tex: 'a^0 = 1', t: 'z. B. $\\frac{y^2}{y^2} = y^0 = 1$' },
            { tex: 'a^{-n} = \\frac{1}{a^n}', t: 'negativ = Kehrwert' },
          ],
        },
        { k: 'viz', id: 'exponents' },
      ],
    },
    {
      id: 'zehner',
      title: 'Zehnerpotenzen',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: '0{,}00034 = 3{,}4 \\cdot 10^{-4}', t: 'Komma nach rechts → negativer Exponent' },
            { tex: '602\\,000 = 6{,}02 \\cdot 10^{5}', t: 'Komma nach links → positiver Exponent' },
            { tex: '1 \\le a < 10', t: 'genau eine Ziffer ≠ 0 vor dem Komma' },
          ],
        },
        exampleFrom(zehnerSchreibweise(3.4, -4), 'Kleine Zahl'),
        exampleFrom(zehnerRechnen(4, 23, 3, -5, 'mul'), 'Multiplizieren'),
        exampleFrom(zehnerRechnen(1.2, -3, 4, 2, 'div'), 'Dividieren'),
        { k: 'mistake', wrong: '12 \\cdot 10^{18}', right: '1{,}2 \\cdot 10^{19}', why: 'Die Vorzahl muss zwischen 1 und 10 liegen: Komma eine Stelle nach links, Exponent eins größer.' },
        { k: 'try', p: POTENZ_GENS[3].gen(mulberry32(5), 3) },
      ],
    },
    {
      id: 'brueche',
      title: 'Potenzen in Brüchen',
      blocks: [
        exampleFrom(potBruchProblem(6, 2, [['x', 4, 1], ['y', 2, 2]]), 'Kürzen mit Potenzen', BLATT + ', Aufgabe 7'),
        {
          k: 'merk',
          t: 'Lösungsblatt Aufgabe 7: $3x^2$. Mit dem Nenner $2xy^2$ ergibt sich $3x^3$ – nur bei $2x^2y^2$ im Nenner wäre es $3x^2$.',
        },
        exampleFrom(potEx8, 'Klammern als Basis', BLATT + ', Aufgabe 8'),
        exampleFrom(potKlammerProblem(27, 3, 3, 3), 'Klammer hoch drei', BLATT + ', Aufgabe 9'),
      ],
    },
    {
      id: 'wurzeln',
      title: 'Wurzeln als Potenzen',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: '\\sqrt{a} = a^{\\frac{1}{2}}', t: 'Quadratwurzel' },
            { tex: '\\sqrt[n]{a^m} = a^{\\frac{m}{n}}', t: 'Exponent durch Wurzelexponent' },
            { tex: '\\sqrt[n]{a \\cdot b} = \\sqrt[n]{a} \\cdot \\sqrt[n]{b}', t: 'teilweise Wurzel ziehen' },
            { tex: 'k \\cdot \\sqrt[n]{a} = \\sqrt[n]{k^n \\cdot a}', t: 'Faktor unter die Wurzel' },
          ],
        },
        { k: 'p', t: 'Vom Wurzel-Blatt: **in Potenzen umwandeln**, **vereinfachen**, **Faktor unter die Wurzel** ziehen.' },
        exampleFrom(wurzel1, 'Wurzel ziehen', WBLATT + ', Aufgabe 1'),
        exampleFrom(rootEx2, 'Negative Exponenten', WBLATT + ', Aufgabe 2'),
        { k: 'mistake', wrong: '\\frac{1}{\\sqrt[4]{x^5}} = x^{\\frac{5}{4}}', right: '\\frac{1}{\\sqrt[4]{x^5}} = x^{-\\frac{5}{4}}', why: 'Der Bruchstrich („eins durch“) macht den Exponenten negativ.', source: 'Lösungsblatt, Aufgabe 2' },
        exampleFrom(rootEx, 'Zwei Wurzeln multiplizieren', WBLATT + ', Aufgabe 3'),
        exampleFrom(rootEx3, 'Faktor unter die Wurzel', WBLATT + ', Aufgabe 4'),
      ],
    },
    {
      id: 'fehler',
      title: 'Typische Fehler',
      blocks: [
        { k: 'mistake', wrong: 'a^2 \\cdot a^3 = a^6', right: 'a^2 \\cdot a^3 = a^5', why: 'Beim Multiplizieren werden Exponenten **addiert**, nicht multipliziert: $a\\cdot a \\cdot a \\cdot a \\cdot a$.' },
        { k: 'mistake', wrong: '\\sqrt{a^2 + b^2} = a + b', right: '\\sqrt{a^2 + b^2} \\text{ bleibt so}', why: 'Aus einer **Summe** kann man die Wurzel nicht gliedweise ziehen. Test: $\\sqrt{9 + 16} = 5$, aber $3 + 4 = 7$.' },
        { k: 'mistake', wrong: '2^{-3} = -8', right: '2^{-3} = \\frac{1}{8}', why: 'Ein negativer Exponent macht die Zahl nicht negativ, sondern bildet den Kehrwert.' },
        { k: 'try', p: POTENZ_GENS[2].gen(mulberry32(21), 2) },
      ],
    },
  ],
  gens: POTENZ_GENS,
}

/* ---------------------------------------------------------------------------
   Formeln umstellen
   --------------------------------------------------------------------------- */

export const FORMELN_CH: ChapterContent = {
  id: 'formeln',
  intro: 'Die Rechenschritte um die gesuchte Größe in **umgekehrter Reihenfolge** rückgängig machen.',
  formulas: [
    { tex: '+ \\;\\leftrightarrow\\; -', t: 'Umkehroperationen' },
    { tex: '\\cdot \\;\\leftrightarrow\\; :', t: '' },
    { tex: 'x^2 \\;\\leftrightarrow\\; \\sqrt{x}', t: 'nur wenn der ganze Term quadriert ist' },
  ],
  sections: [
    {
      id: 'zwiebel',
      title: 'Das Zwiebelprinzip',
      blocks: [
        {
          k: 'table',
          head: ['Mit der Größe passiert …', 'Umkehrung'],
          rows: [
            ['$+a$', '$| -a$'],
            ['$-a$', '$| +a$'],
            ['$\\cdot a$', '$| :a$'],
            ['$:a$ (steht im Zähler eines Bruchs)', '$| \\cdot a$'],
            ['steht im **Nenner**', 'erst $| \\cdot$ Nenner, dann weiter'],
            ['$(\\ldots)^2$', '$| \\sqrt{\\;}$'],
            ['$\\sqrt{\\ldots}$', '$| (\\;)^2$ – vorher die Wurzel allein stellen'],
          ],
        },
        { k: 'viz', id: 'onion' },
        { k: 'merk', t: 'Reihenfolge: Erst Brüche auflösen, dann Summanden weg, dann Faktoren weg, dann Wurzel/Quadrat. Vor dem Quadrieren oder Wurzelziehen muss die Wurzel bzw. das Quadrat **allein** auf einer Seite stehen.' },
      ],
    },
    {
      id: 'beispiele',
      title: 'Formeln aus deinem Unterricht',
      blocks: [
        exampleFrom(F('raute-f'), 'Raute nach f', MITSCHRIFT),
        exampleFrom(F('dreieck-s'), 'Gleichseitiges Dreieck nach s', MITSCHRIFT),
        exampleFrom(F('schwingkreis-c'), 'Mit Wurzel im Nenner', MITSCHRIFT),
        exampleFrom(F('seitenhalbierende-a'), 'Seitenhalbierende nach a', MITSCHRIFT + ' · ' + WBLATT + ', Aufgabe 7'),
        {
          k: 'mistake',
          wrong: 'a = \\sqrt{\\frac{(2s_b)^2 + b^2}{2}} - c',
          right: 'a = \\sqrt{\\frac{(2s_b)^2 + b^2}{2} - c^2}',
          why: 'Vor dem Wurzelziehen steht $a^2 = \\ldots - c^2$. Die Wurzel wirkt auf die **ganze** rechte Seite – $\\sqrt{X - c^2}$ ist nicht $\\sqrt{X} - c$. In der Mitschrift und auf dem Lösungsblatt fehlt genau das.',
          source: 'Mitschrift & Lösungsblatt',
        },
        exampleFrom(F('kreisbogen-s'), 'Nach s mit Bruch und Quadrat', WBLATT + ', Aufgabe 8'),
      ],
    },
    {
      id: 'labor',
      title: 'Formeln aus dem Labor',
      blocks: [
        exampleFrom(F('verduennung'), 'Verdünnen', 'Laborbezug'),
        exampleFrom(F('waerme-t2'), 'Klammer als Ganzes', 'Laborbezug'),
        { k: 'try', p: FORMEL_GENS[0].gen(mulberry32(2), 2) },
      ],
    },
  ],
  gens: FORMEL_GENS,
}

/* ---------------------------------------------------------------------------
   Prozentrechnung
   --------------------------------------------------------------------------- */

export const PROZENT: ChapterContent = {
  id: 'prozent',
  intro: 'Prozent = Anteil von 100. Nur Anteile lassen sich vergleichen.',
  formulas: [
    { tex: 'W = \\frac{G \\cdot p}{100}', t: 'Prozentwert' },
    { tex: 'p = \\frac{W}{G} \\cdot 100', t: 'Prozentsatz („Anteil von 100“)' },
    { tex: 'G = \\frac{W \\cdot 100}{p}', t: 'Grundwert' },
    { tex: 'w = \\frac{m_{\\text{Stoff}}}{m_{\\text{Lösung}}} \\cdot 100\\,\\%', t: 'Massenanteil' },
  ],
  sections: [
    {
      id: 'begriffe',
      title: 'G, W und p',
      blocks: [
        {
          k: 'table',
          head: ['Größe', 'Bedeutung', 'Lotterie A'],
          rows: [
            ['Grundwert $G$', 'das Ganze (100 %)', '300 Lose'],
            ['Prozentwert $W$', 'der Anteil davon', '126 Gewinne'],
            ['Prozentsatz $p$', 'Anteil pro 100', '42 %'],
          ],
        },
        { k: 'viz', id: 'percent' },
      ],
    },
    {
      id: 'beispiele',
      title: 'Aus deinem Unterricht',
      blocks: [
        exampleFrom(pGesucht(126, 300), 'Lotterie A', MITSCHRIFT),
        exampleFrom(pGesucht(150, 500), 'Lotterie B', MITSCHRIFT),
        { k: 'merk', t: 'Lotterie B hat mehr Gewinne, Lotterie A aber die bessere Chance: 42 % statt 30 %.' },
        exampleFrom(PROZENT_GENS[1].gen(mulberry32(23), 2), 'Prozentwert gesucht'),
        exampleFrom(PROZENT_GENS[2].gen(mulberry32(11), 2), 'Grundwert gesucht'),
      ],
    },
    {
      id: 'labor',
      title: 'Prozent im Labor',
      blocks: [
        { k: 'p', t: 'Beim **Massenanteil** $w$ ist der Grundwert die ganze Lösung: Stoff **plus** Lösungsmittel.' },
        exampleFrom(PROZENT_GENS[4].gen(mulberry32(4), 2), 'Massenanteil einer Lösung'),
        { k: 'mistake', wrong: 'w = \\frac{12\\,\\text{g}}{250\\,\\text{g Wasser}} \\cdot 100\\,\\%', right: 'w = \\frac{12\\,\\text{g}}{262\\,\\text{g Lösung}} \\cdot 100\\,\\%', why: 'Der Grundwert ist die gesamte Lösung (12 g Salz + 250 g Wasser).' },
        exampleFrom(PROZENT_GENS[3].gen(mulberry32(9), 2), 'Rabatt und Aufschlag'),
        { k: 'try', p: PROZENT_GENS[1].gen(mulberry32(15), 2) },
      ],
    },
  ],
  gens: PROZENT_GENS,
}
