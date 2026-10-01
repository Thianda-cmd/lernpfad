import { mulberry32 } from '../../lib/random'
import { COMPOUNDS } from '../chem'
import { STOFF_GENS, konzentration, loesungAnsetzen, mAusN, molAusMN, nAusM, prozentVerbindung, teilchen } from '../gen/stoffmenge'
import { LGS_GENS, additionProblem, anzahlProblem, einsetzProblem, gleichsetzProblem } from '../gen/lgs'
import { LGSTEXT_GENS, mischLoesung, mischTemp, personen, wasser } from '../gen/lgstext'
import { PQ_GENS, pqProblem } from '../gen/pq'
import { GERADEN_GENS, lageProblem, schnittProblem, steigungProblem, zweiPunkteProblem } from '../gen/geraden'
import { exampleFrom, type ChapterContent } from './types'

const MITSCHRIFT = 'Aus deiner Mitschrift (MFH)'
const BLATT = 'Übungsblatt M, m, n'
const C = (f: string) => COMPOUNDS.find((c) => c.f === f)!

/* ---------------------------------------------------------------------------
   Stoffmenge & molare Masse
   --------------------------------------------------------------------------- */

export const STOFFMENGE: ChapterContent = {
  id: 'stoffmenge',
  intro: '1 mol = $6{,}022 \\cdot 10^{23}$ Teilchen. Die molare Masse $M$ verbindet Stoffmenge und Masse.',
  formulas: [
    { tex: 'n = \\frac{m}{M}', t: 'Stoffmenge aus Masse' },
    { tex: 'm = n \\cdot M', t: 'Masse aus Stoffmenge' },
    { tex: 'M = \\frac{m}{n}', t: 'molare Masse' },
    { tex: 'N = n \\cdot N_A,\\quad N_A = 6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1}', t: 'Teilchenzahl' },
    { tex: 'm_{\\text{Teilchen}} = \\frac{M}{N_A}', t: 'Masse eines Teilchens' },
    { tex: 'w(E) = \\frac{z \\cdot M(E)}{M} \\cdot 100\\,\\%', t: 'Massenanteil eines Elements' },
    { tex: 'c = \\frac{n}{V},\\quad m = c \\cdot V \\cdot M', t: 'Konzentration und Einwaage' },
  ],
  sections: [
    {
      id: 'groessen',
      title: 'Die vier Größen',
      blocks: [
        {
          k: 'table',
          head: ['Größe', 'Zeichen', 'Einheit', 'Bedeutung'],
          rows: [
            ['Masse', '$m$', 'g (kg, mg, µg, ng)', 'was die Waage anzeigt'],
            ['Stoffmenge', '$n$', 'mol (mmol, µmol, nmol)', 'Anzahl der Teilchen in „Paketen“'],
            ['molare Masse', '$M$', 'g/mol', 'Masse von 1 mol – aus dem Periodensystem'],
            ['Teilchenzahl', '$N$', '– (reine Zahl)', 'tatsächliche Anzahl Atome/Moleküle'],
          ],
        },
        {
          k: 'rules',
          title: 'Der Rechenweg',
          items: [
            { tex: 'm \\;\\xrightarrow{\\;:M\\;}\\; n \\;\\xrightarrow{\\;\\cdot N_A\\;}\\; N', t: 'von der Masse zur Teilchenzahl' },
            { tex: 'N \\;\\xrightarrow{\\;:N_A\\;}\\; n \\;\\xrightarrow{\\;\\cdot M\\;}\\; m', t: 'und zurück' },
          ],
        },
        { k: 'viz', id: 'molrechner' },
      ],
    },
    {
      id: 'einheiten',
      title: 'Einheiten umrechnen',
      blocks: [
        {
          k: 'table',
          head: ['Vorsatz', 'Faktor', 'Masse', 'Stoffmenge'],
          rows: [
            ['kilo', '$10^{3}$', '1 kg = 1000 g', '–'],
            ['milli', '$10^{-3}$', '1 mg = 0,001 g', '1 mmol = 0,001 mol'],
            ['mikro', '$10^{-6}$', '1 µg = 0,000 001 g', '1 µmol = 0,000 001 mol'],
            ['nano', '$10^{-9}$', '1 ng', '1 nmol'],
          ],
        },
        { k: 'merk', t: 'mg durch g/mol ergibt direkt mmol: $\\frac{750\\,\\text{mg}}{171{,}35\\,\\text{g/mol}} = 4{,}377\\,\\text{mmol}$.' },
      ],
    },
    {
      id: 'beispiele',
      title: 'Aufgaben von deinem Blatt',
      blocks: [
        exampleFrom(nAusM(C('BaSO4'), 130, 'g', 'mol'), 'Stoffmenge aus Masse', BLATT + ', Aufgabe 1'),
        exampleFrom(mAusN(C('Ca(NO3)2'), 0.37, 'mmol', 'mg'), 'Masse aus Stoffmenge', BLATT + ', Aufgabe 2'),
        exampleFrom(teilchen(C('ZnS'), 21, 'mg', true), 'Teilchenzahl aus Masse', BLATT + ', Aufgabe 6'),
        exampleFrom(molAusMN(31.725, 'g', 250, 'mmol'), 'Molare Masse bestimmen', BLATT + ', Aufgabe 9'),
      ],
    },
    {
      id: 'loesungen',
      title: 'Lösungen ansetzen',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: 'c = \\frac{n}{V}', t: 'Stoffmengenkonzentration in mol/L' },
            { tex: 'm = c \\cdot V \\cdot M', t: 'Einwaage für eine Lösung' },
          ],
        },
        exampleFrom(loesungAnsetzen(C('NaCl'), 0.5, 250), 'Einwaage berechnen', 'Laborbezug'),
        exampleFrom(konzentration(C('NaOH'), 2, 100), 'Konzentration berechnen', 'Laborbezug'),
        {
          k: 'mistake',
          wrong: 'c = \\frac{0{,}05\\,\\text{mol}}{100\\,\\text{mL}} = 0{,}0005\\,\\text{mol/L}',
          right: 'c = \\frac{0{,}05\\,\\text{mol}}{0{,}1\\,\\text{L}} = 0{,}5\\,\\text{mol/L}',
          why: 'Die Einheit ist mol pro **Liter** – Volumen vorher in L umrechnen.',
        },
        { k: 'try', p: STOFF_GENS[4].gen(mulberry32(19), 2) },
      ],
    },
    {
      id: 'anteile',
      title: 'Atom-% und Massen-%',
      blocks: [
        {
          k: 'p',
          t: '**Atom-%** zählt nur Atome: In $\\mathrm{Na_2SO_4}$ sind 7 Atome, davon 2 Na → 28,57 %. **Massen-%** gewichtet mit der Atommasse: Die 2 Na wiegen $45{,}98$ von $142{,}04$ g/mol → 32,37 %. Deshalb sind die Werte verschieden.',
        },
        exampleFrom(prozentVerbindung(C('Na2SO4'), 'masse'), 'Massenprozente', BLATT + ', Aufgabe 7a'),
        { k: 'mistake', wrong: 'n = \\frac{750\\,\\text{mg}}{171{,}35\\,\\text{g/mol}} = 4{,}377\\,\\text{mol}', right: '= 4{,}377\\,\\text{mmol}', why: 'Die Einheit mg bleibt als „milli“ im Ergebnis. Wer das vergisst, liegt um den Faktor 1000 daneben.' },
        { k: 'mistake', wrong: 'N_{\\mathrm{O}} = n \\cdot N_A', right: 'N_{\\mathrm{O}} = 2 \\cdot n \\cdot N_A \\quad (\\mathrm{Ca(OH)_2})', why: 'Wird nach **Atomen** eines Elements gefragt, zählt jede Formeleinheit so oft, wie das Element darin vorkommt.' },
        { k: 'try', p: STOFF_GENS[1].gen(mulberry32(6), 1) },
      ],
    },
  ],
  gens: STOFF_GENS,
}

/* ---------------------------------------------------------------------------
   Lineare Gleichungssysteme
   --------------------------------------------------------------------------- */

export const LGS: ChapterContent = {
  id: 'lgs',
  intro: 'Zwei Unbekannte, zwei Gleichungen: eine Unbekannte eliminieren, dann normal lösen.',
  formulas: [
    { tex: '\\text{I} + \\text{II}', t: 'Additionsverfahren: Gegenzahlen erzeugen, addieren' },
    { tex: '\\text{II in I}', t: 'Einsetzungsverfahren: eine Gleichung nach y auflösen' },
    { tex: '\\text{I} = \\text{II}', t: 'Gleichsetzungsverfahren: beide nach y auflösen' },
    { tex: '\\mathbb{L} = \\{(x \\mid y)\\}', t: 'Lösung als Zahlenpaar' },
  ],
  sections: [
    {
      id: 'idee',
      title: 'Was ein Gleichungssystem ist',
      blocks: [
        { k: 'p', t: 'Jede lineare Gleichung mit $x$ und $y$ beschreibt eine **Gerade**. Die Lösung des Systems ist der Punkt, der auf **beiden** Geraden liegt – ihr Schnittpunkt.' },
        { k: 'viz', id: 'lgsgraph' },
        {
          k: 'table',
          head: ['Lage der Geraden', 'Lösungen', 'Beim Rechnen'],
          rows: [
            ['schneiden sich', 'genau eine', '$x$ und $y$ kommen heraus'],
            ['parallel', 'keine', 'Widerspruch, z. B. $0 = 5$'],
            ['identisch', 'unendlich viele', 'wahre Aussage, z. B. $0 = 0$'],
          ],
        },
      ],
    },
    {
      id: 'addition',
      title: 'Additionsverfahren',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: '1.', t: 'Ordnen: $x$ und $y$ links, Zahlen rechts.' },
            { tex: '2.', t: 'Multiplizieren, bis vor einer Variablen **Gegenzahlen** stehen (z. B. $-15y$ und $+15y$).' },
            { tex: '3.', t: 'Gleichungen addieren – eine Variable fällt weg.' },
            { tex: '4.', t: 'Auflösen, dann in eine Ausgangsgleichung einsetzen.' },
          ],
        },
        exampleFrom(additionProblem([6, -5, -23], [8, 3, 37], ['6x - 5y + 25 = 2', '8x + 3y - 2 = 35']), 'Mit zwei Multiplikationen', MITSCHRIFT),
        exampleFrom(additionProblem([2, -4, -4], [-3, 4, -2]), 'Gegenzahlen sind schon da', MITSCHRIFT),
        { k: 'mistake', wrong: '6x - 5y = -23 \\;|\\cdot 3 \\;\\Rightarrow\\; 18x - 15y = -23', right: '18x - 15y = -69', why: 'Beim Multiplizieren wird **jede** Zahl der Gleichung mit multipliziert – auch die rechte Seite.' },
      ],
    },
    {
      id: 'einsetzen',
      title: 'Einsetzungs- und Gleichsetzungsverfahren',
      blocks: [
        { k: 'p', t: 'Ist eine Gleichung schon nach $y$ aufgelöst (oder leicht auflösbar), setzt du den Term für $y$ **in Klammern** in die andere Gleichung ein.' },
        exampleFrom(einsetzProblem([2, 3, 210], -4, 115), 'Einsetzungsverfahren', MITSCHRIFT + ', Mischtemperatur'),
        { k: 'p', t: 'Sind **beide** Gleichungen nach $y$ aufgelöst, setzt du die rechten Seiten gleich.' },
        exampleFrom(gleichsetzProblem(3, 0, 1, 58), 'Gleichsetzungsverfahren', MITSCHRIFT + ', Frauen und Männer'),
        {
          k: 'table',
          head: ['Wenn …', 'dann nimm …'],
          rows: [
            ['beide Gleichungen in der Form $ax + by = c$', 'Additionsverfahren'],
            ['eine Gleichung lautet $y = \\ldots$ oder $x = \\ldots$', 'Einsetzungsverfahren'],
            ['beide lauten $y = \\ldots$', 'Gleichsetzungsverfahren'],
          ],
        },
        { k: 'try', p: LGS_GENS[0].gen(mulberry32(17), 1) },
      ],
    },
    {
      id: 'sonderfaelle',
      title: 'Keine oder unendlich viele Lösungen',
      blocks: [
        { k: 'p', t: 'Fallen beim Addieren **beide** Variablen weg, bleibt nur eine Aussage über Zahlen übrig.' },
        exampleFrom(anzahlProblem([2, -1, 3], [-4, 2, 5]), 'Widerspruch'),
        exampleFrom(anzahlProblem([1, 2, 4], [3, 6, 12]), 'Wahre Aussage'),
        { k: 'try', p: LGS_GENS[3].gen(mulberry32(27), 2) },
      ],
    },
  ],
  gens: LGS_GENS,
}

/* ---------------------------------------------------------------------------
   Textaufgaben mit zwei Unbekannten
   --------------------------------------------------------------------------- */

export const LGSTEXT: ChapterContent = {
  id: 'lgs-text',
  intro: 'Zwei Unbekannte im Text → zwei Variablen → zwei Gleichungen.',
  formulas: [
    { tex: 'K = G + V \\cdot p', t: 'Tarif: Grundgebühr + Menge · Preis' },
    { tex: 'T_M = \\frac{V_1 T_1 + V_2 T_2}{V_1 + V_2}', t: 'Mischtemperatur' },
    { tex: 'm_1 w_1 + m_2 w_2 = m_M w_M', t: 'Mischungsgleichung für Lösungen' },
  ],
  sections: [
    {
      id: 'modell',
      title: 'Vom Text zum System',
      blocks: [
        {
          k: 'table',
          head: ['Schritt', 'Wasserrechnung aus deiner Mitschrift'],
          rows: [
            ['1. Variablen festlegen', '$x$ = Grundgebühr in €, $y$ = Kosten pro m³ in €'],
            ['2. Jede Information = eine Gleichung', 'März: $x + 15y = 55$ · Juli/August: $x + 35y = 125$'],
            ['3. Lösen', 'II − I: $20y = 70$ → $y = 3{,}5$ → $x = 2{,}5$'],
            ['4. Antwortsatz mit Einheit', 'Grundgebühr 2,50 €, Wasser 3,50 € pro m³'],
          ],
        },
        exampleFrom(wasser(15, 55, 35, 125), 'Wasserrechnung', MITSCHRIFT),
      ],
    },
    {
      id: 'mischen',
      title: 'Mischungen',
      blocks: [
        { k: 'viz', id: 'mix' },
        exampleFrom(mischTemp(2, 3, 42, 4, 1, 23), 'Mischtemperatur', MITSCHRIFT),
        { k: 'p', t: 'Gleiches Prinzip mit Konzentrationen statt Temperaturen:' },
        exampleFrom(mischLoesung(10, 40, 300, 20), 'Zwei Lösungen mischen', 'Laborbezug'),
      ],
    },
    {
      id: 'anzahlen',
      title: 'Anzahlen vergleichen',
      blocks: [
        exampleFrom(personen(3, 58), 'Frauen und Männer', MITSCHRIFT),
        { k: 'mistake', wrong: '\\text{„dreimal so viele Männer wie Frauen“}: \\; x = 3y', right: 'y = 3x \\quad (y = \\text{Männer})', why: 'Die Gruppe, von der es „dreimal so viele“ gibt, steht allein: Männer $= 3 \\cdot$ Frauen. Probe mit Zahlen: 10 Frauen → 30 Männer.' },
        exampleFrom(LGSTEXT_GENS[4].gen(mulberry32(12), 2), 'Eintrittskarten'),
        { k: 'try', p: LGSTEXT_GENS[0].gen(mulberry32(10), 2) },
      ],
    },
  ],
  gens: LGSTEXT_GENS,
}

/* ---------------------------------------------------------------------------
   p-q-Formel
   --------------------------------------------------------------------------- */

export const PQ: ChapterContent = {
  id: 'pq',
  intro: 'Löst jede quadratische Gleichung, sobald sie in **Normalform** $x^2 + px + q = 0$ steht.',
  formulas: [
    { tex: 'x^2 + px + q = 0', t: 'Normalform' },
    { tex: 'x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}', t: 'p-q-Formel' },
    { tex: 'D = \\left(\\frac{p}{2}\\right)^2 - q', t: 'D > 0: zwei, D = 0: eine, D < 0: keine Lösung' },
  ],
  sections: [
    {
      id: 'normalform',
      title: 'Erst die Normalform',
      blocks: [
        {
          k: 'rules',
          items: [
            { tex: '\\ldots = 0', t: '1. Alles auf eine Seite – rechts muss 0 stehen.' },
            { tex: '| : a', t: '2. **Durch** die Zahl vor $x^2$ teilen, bis dort 1 steht.' },
            { tex: 'p,\\; q', t: '3. $p$ und $q$ **mit Vorzeichen** ablesen.' },
            { tex: 'x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}', t: '4. Einsetzen und ausrechnen.' },
          ],
        },
        { k: 'viz', id: 'parabola' },
      ],
    },
    {
      id: 'beispiele',
      title: 'Deine Aufgaben a) bis f)',
      blocks: [
        exampleFrom(pqProblem(1, 6, 8), 'a) Schon in Normalform', MITSCHRIFT),
        exampleFrom(pqProblem(1, -18, 81), 'b) Genau eine Lösung', MITSCHRIFT),
        exampleFrom(pqProblem(2, -32, 126), 'c) Erst durch 2 teilen', MITSCHRIFT),
        exampleFrom(pqProblem(-3, 12, -12), 'd) Durch −3 teilen', MITSCHRIFT),
        {
          k: 'mistake',
          wrong: '-3x^2 + 12x - 12 = 0 \\;|\\cdot(-3) \\;\\Rightarrow\\; x^2 - 36x + 36 = 0',
          right: '|:(-3) \\;\\Rightarrow\\; x^2 - 4x + 4 = 0 \\;\\Rightarrow\\; x = 2',
          why: 'In der Mitschrift wurde mit $-3$ **multipliziert** – dann steht vor $x^2$ eine 9, keine 1, und die Ergebnisse 1 und 35 sind falsch. Um die $-3$ loszuwerden, musst du durch $-3$ **teilen**.',
          source: 'Mitschrift, Aufgabe d',
        },
        exampleFrom(pqProblem(2, 10, -30, -2), 'e) Rechte Seite ist nicht 0', MITSCHRIFT),
        exampleFrom(pqProblem(5, 20, 25, 5), 'f) Rechte Seite und Faktor', MITSCHRIFT),
        exampleFrom(pqProblem(1, 2, 5), 'Keine Lösung'),
      ],
    },
    {
      id: 'fehler',
      title: 'Typische Fehler',
      blocks: [
        { k: 'mistake', wrong: 'x^2 - 18x + 81 = 0:\\; -\\frac{p}{2} = -9', right: 'p = -18 \\;\\Rightarrow\\; -\\frac{p}{2} = -\\frac{-18}{2} = +9', why: '$p$ immer **mit** Vorzeichen einsetzen. Aus $-(-9)$ wird $+9$.' },
        { k: 'mistake', wrong: 'x^2 + 5x - 14 = 0: \\;\\sqrt{6{,}25 - 14}', right: '\\sqrt{6{,}25 - (-14)} = \\sqrt{20{,}25}', why: 'Auch $q$ hat ein Vorzeichen. Minus minus ergibt plus.' },
        { k: 'try', p: PQ_GENS[0].gen(mulberry32(29), 2) },
      ],
    },
  ],
  gens: PQ_GENS,
}

/* ---------------------------------------------------------------------------
   Geraden
   --------------------------------------------------------------------------- */

export const GERADEN: ChapterContent = {
  id: 'geraden',
  intro: 'Festgelegt durch Steigung $m$ und y-Achsenabschnitt $b$. Noch ohne Mitschrift – Standardstoff für MFH.',
  formulas: [
    { tex: 'y = mx + b', t: 'Geradengleichung' },
    { tex: 'm = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{\\Delta y}{\\Delta x}', t: 'Steigung aus zwei Punkten' },
    { tex: 'b = y_1 - m \\cdot x_1', t: 'Achsenabschnitt durch Einsetzen' },
    { tex: 'x_0 = -\\frac{b}{m}', t: 'Nullstelle' },
    { tex: 'm_1 = m_2', t: 'parallel' },
    { tex: 'm_1 \\cdot m_2 = -1', t: 'senkrecht' },
  ],
  sections: [
    {
      id: 'mb',
      title: 'Steigung und Achsenabschnitt',
      blocks: [
        { k: 'viz', id: 'line' },
        {
          k: 'table',
          head: ['$m$', 'Verlauf'],
          rows: [
            ['$m > 0$', 'steigt von links nach rechts'],
            ['$m < 0$', 'fällt'],
            ['$m = 0$', 'waagerecht: $y = b$'],
            ['großes $|m|$', 'steil'],
          ],
        },
      ],
    },
    {
      id: 'aufstellen',
      title: 'Geradengleichung aufstellen',
      blocks: [
        exampleFrom(steigungProblem(-2, -3, 4, 1), 'Steigung aus zwei Punkten'),
        exampleFrom(zweiPunkteProblem(1, 3, 3, 7), 'Gerade durch zwei Punkte'),
        { k: 'mistake', wrong: 'm = \\frac{x_2 - x_1}{y_2 - y_1}', right: 'm = \\frac{y_2 - y_1}{x_2 - x_1}', why: 'Steigung = „hoch durch rüber“: Die $y$-Differenz steht **oben**.' },
      ],
    },
    {
      id: 'schnitt',
      title: 'Schnittpunkte',
      blocks: [
        { k: 'p', t: 'Im Schnittpunkt haben zwei Geraden denselben $y$-Wert. Also: rechte Seiten gleichsetzen – das ist genau das Gleichsetzungsverfahren aus dem LGS-Kapitel.' },
        exampleFrom(schnittProblem(2, 1, -1, 7), 'Schnittpunkt zweier Geraden'),
        { k: 'try', p: GERADEN_GENS[2].gen(mulberry32(33), 2) },
      ],
    },
    {
      id: 'lage',
      title: 'Lage und Sachaufgaben',
      blocks: [
        {
          k: 'table',
          head: ['Steigungen', 'b', 'Lage'],
          rows: [
            ['$m_1 \\neq m_2$', 'egal', 'schneiden sich'],
            ['$m_1 \\cdot m_2 = -1$', 'egal', 'senkrecht'],
            ['$m_1 = m_2$', 'verschieden', 'parallel'],
            ['$m_1 = m_2$', 'gleich', 'identisch'],
          ],
        },
        exampleFrom(lageProblem(2, 1, -0.5, 3), 'Senkrecht'),
        exampleFrom(lageProblem(3, -2, 3, 4), 'Parallel'),
        { k: 'p', t: 'In Sachaufgaben ist $b$ der feste Anteil (Grundgebühr, Startwert) und $m$ der Anteil pro Einheit.' },
        exampleFrom(GERADEN_GENS[8].gen(mulberry32(4), 2), 'Sachaufgabe'),
        { k: 'try', p: GERADEN_GENS[7].gen(mulberry32(9), 2) },
      ],
    },
  ],
  gens: GERADEN_GENS,
}
