/** Übersicht aller Rechner (Navigation, Übersichtsseite, Startseite). */
import type { ComponentType } from 'react'
import { IconBrackets, IconEquals, IconFraction, IconLine, IconParabola, IconPercent, IconPower, IconSolution, IconSwap, IconSystem } from '../components/icons'

export interface CalcTool {
  id: string
  title: string
  /** kurz für Navigation */
  nav: string
  short: string
  /** Erkennungsformel (TeX) */
  sig: string
  path: string
  icon: ComponentType<{ size?: number }>
  /** Stichwörter für die Schnellsuche */
  keys: string[]
}

export const MATH_TOOLS: CalcTool[] = [
  {
    id: 'terme',
    title: 'Terme vereinfachen',
    nav: 'Terme & Klammern',
    short: 'Klammern auflösen, ausmultiplizieren, binomische Formeln, ausklammern.',
    sig: '(a+b)^2',
    path: '/mathematik/terme',
    icon: IconBrackets,
    keys: ['klammer', 'ausmultiplizieren', 'binomisch', 'ausklammern', 'zusammenfassen', 'faktorisieren'],
  },
  {
    id: 'gleichungen',
    title: 'Gleichungen lösen',
    nav: 'Gleichungen',
    short: 'Lineare und quadratische Gleichungen, Ungleichungen, Brüche, Parameter – mit Probe.',
    sig: '2x+3=7',
    path: '/mathematik/gleichungen',
    icon: IconEquals,
    keys: ['gleichung', 'ungleichung', 'auflösen', 'lösen', 'parameter'],
  },
  {
    id: 'pq-formel',
    title: 'p-q-Formel',
    nav: 'p-q-Formel',
    short: 'Quadratische Gleichungen: Normalform, p und q, Diskriminante, Parabel.',
    sig: 'x^2+px+q=0',
    path: '/mathematik/pq-formel',
    icon: IconParabola,
    keys: ['pq', 'quadratisch', 'parabel', 'nullstellen', 'diskriminante'],
  },
  {
    id: 'lgs',
    title: 'Gleichungssysteme',
    nav: 'Gleichungssysteme',
    short: 'Zwei Gleichungen, zwei Unbekannte: Additions-, Einsetzungs- und Gleichsetzungsverfahren.',
    sig: '\\text{I} + \\text{II}',
    path: '/mathematik/lgs',
    icon: IconSystem,
    keys: ['lgs', 'gleichungssystem', 'additionsverfahren', 'einsetzungsverfahren', 'gleichsetzungsverfahren'],
  },
  {
    id: 'brueche',
    title: 'Bruchrechner',
    nav: 'Brüche',
    short: 'Hauptnenner, Erweitern, Kehrwert, Doppelbrüche, Kürzen und Bruchterme.',
    sig: '\\tfrac{3}{4}+\\tfrac{5}{6}',
    path: '/mathematik/brueche',
    icon: IconFraction,
    keys: ['bruch', 'brüche', 'hauptnenner', 'kürzen', 'kehrwert', 'doppelbruch'],
  },
  {
    id: 'potenzen',
    title: 'Potenzen & Wurzeln',
    nav: 'Potenzen & Wurzeln',
    short: 'Potenzgesetze, Wurzeln als Potenzen, teilweise Wurzelziehen, Zehnerpotenzen.',
    sig: 'a^m \\cdot a^n',
    path: '/mathematik/potenzen',
    icon: IconPower,
    keys: ['potenz', 'wurzel', 'zehnerpotenz', 'wissenschaftlich', 'hochzahl', 'exponent'],
  },
  {
    id: 'formeln',
    title: 'Formeln umstellen',
    nav: 'Formeln umstellen',
    short: 'Nach jeder Größe umstellen (Zwiebelprinzip) – und gleich Werte einsetzen.',
    sig: 'c=\\tfrac{n}{V}',
    path: '/mathematik/formeln',
    icon: IconSwap,
    keys: ['formel', 'umstellen', 'umformen', 'zwiebel'],
  },
  {
    id: 'prozent',
    title: 'Prozentrechnung',
    nav: 'Prozent',
    short: 'Grundwert, Prozentwert, Prozentsatz, Aufschlag & Rabatt, Massenanteil.',
    sig: 'p=\\tfrac{W}{G}\\cdot 100',
    path: '/mathematik/prozent',
    icon: IconPercent,
    keys: ['prozent', 'grundwert', 'rabatt', 'dreisatz', 'massenanteil'],
  },
  {
    id: 'geraden',
    title: 'Geraden',
    nav: 'Geraden',
    short: 'Steigung, Geradengleichung, Nullstelle, Punktprobe, Schnittpunkt zweier Geraden.',
    sig: 'y=mx+b',
    path: '/mathematik/geraden',
    icon: IconLine,
    keys: ['gerade', 'steigung', 'schnittpunkt', 'nullstelle', 'lineare funktion'],
  },
]

export const CHEM_CALC: CalcTool = {
  id: 'rechnen',
  title: 'Stoffmenge & Lösungen',
  nav: 'Stoffmenge & Lösungen',
  short: 'n, m, M, N – Lösungen ansetzen, verdünnen und mischen (Mischungskreuz).',
  sig: 'n=\\tfrac{m}{M}',
  path: '/chemie/rechnen',
  icon: IconSolution,
  keys: ['stoffmenge', 'mol', 'konzentration', 'verdünnen', 'mischungskreuz', 'lösung ansetzen', 'einwaage'],
}

export const TOOL_BY_ID = Object.fromEntries(MATH_TOOLS.map((t) => [t.id, t])) as Record<string, CalcTool>
