/** Übersicht aller Rechner (Navigation, Übersichtsseiten, Startseite). */
import type { ComponentType } from 'react'
import {
  IconBeaker,
  IconBrackets,
  IconBurette,
  IconCentrifuge,
  IconCounting,
  IconCuvette,
  IconDilution,
  IconDna,
  IconEquals,
  IconFraction,
  IconGas,
  IconLine,
  IconLog,
  IconMicroscope,
  IconParabola,
  IconPcr,
  IconPercent,
  IconPetri,
  IconPh,
  IconPower,
  IconReaction,
  IconRuler,
  IconSolution,
  IconStats,
  IconSwap,
  IconSystem,
} from '../components/icons'

export type Subject = 'mathematik' | 'chemie' | 'biologie'

export interface CalcTool {
  id: string
  subject: Subject
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

export const MATH_TOOLS: CalcTool[] = (
  [
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
    {
      id: 'statistik',
      title: 'Statistik',
      nav: 'Statistik',
      short: 'Mittelwert, Median, Standardabweichung, Variationskoeffizient, Ausreißer, Regression.',
      sig: '\\bar{x} \\pm s',
      icon: IconStats,
      keys: ['statistik', 'mittelwert', 'standardabweichung', 'median', 'variationskoeffizient', 'ausreißer', 'regression'],
    },
    {
      id: 'logarithmen',
      title: 'Logarithmen & Exponentialgleichungen',
      nav: 'Logarithmen',
      short: 'Logarithmen berechnen, Gesetze anwenden, Gleichungen wie 2^x = 50 lösen.',
      sig: '\\lg(a \\cdot b)',
      icon: IconLog,
      keys: ['logarithmus', 'lg', 'ln', 'exponentialgleichung', 'exponent', 'halbwertszeit'],
    },
    {
      id: 'einheiten',
      title: 'Einheiten umrechnen',
      nav: 'Einheiten',
      short: 'Masse, Volumen, Stoffmenge, Konzentration, Länge, Druck, Zeit, Temperatur.',
      sig: '1\\,\\text{mL} = 10^{-3}\\,\\text{L}',
      icon: IconRuler,
      keys: ['einheit', 'umrechnen', 'mikroliter', 'nanogramm', 'kelvin', 'präfix'],
    },
  ] satisfies (Omit<CalcTool, 'subject' | 'path'> & { path?: string })[]
).map((t) => ({ ...t, subject: 'mathematik' as const, path: `/mathematik/${t.id}` }))

export const CHEM_TOOLS: CalcTool[] = (
  [
    {
      id: 'rechnen',
      title: 'Stoffmenge & Lösungen',
      nav: 'Stoffmenge & Lösungen',
      short: 'n, m, M, N – Lösungen ansetzen, verdünnen und mischen (Mischungskreuz).',
      sig: 'n=\\tfrac{m}{M}',
      icon: IconSolution,
      keys: ['stoffmenge', 'mol', 'konzentration', 'verdünnen', 'mischungskreuz', 'lösung ansetzen', 'einwaage'],
    },
    {
      id: 'konzentrationen',
      title: 'Konzentrationen umrechnen',
      nav: 'Konzentrationen',
      short: 'c, β, w und φ ineinander umrechnen – mit Dichte, auch aus konzentrierter Säure ansetzen.',
      sig: '\\beta = c \\cdot M',
      icon: IconBeaker,
      keys: ['massenkonzentration', 'massenanteil', 'dichte', 'volumenanteil', 'konzentrierte säure', 'ppm'],
    },
    {
      id: 'ph',
      title: 'pH-Wert & Puffer',
      nav: 'pH-Wert & Puffer',
      short: 'Starke und schwache Säuren und Basen, pOH, Henderson-Hasselbalch, Puffer ansetzen.',
      sig: '\\text{pH} = -\\lg c(\\text{H}_3\\text{O}^+)',
      icon: IconPh,
      keys: ['ph', 'poh', 'säure', 'base', 'puffer', 'henderson', 'pks'],
    },
    {
      id: 'titration',
      title: 'Titration',
      nav: 'Titration',
      short: 'Maßanalyse: Konzentration und Masse der Probe aus dem Verbrauch, Titer.',
      sig: 'c_1 V_1 = c_2 V_2',
      icon: IconBurette,
      keys: ['titration', 'maßanalyse', 'verbrauch', 'titer', 'äquivalenzpunkt', 'neutralisation'],
    },
    {
      id: 'gase',
      title: 'Gasgesetze',
      nav: 'Gasgesetze',
      short: 'Ideales Gas p · V = n · R · T, molares Volumen, Zustandsänderungen.',
      sig: 'p V = n R T',
      icon: IconGas,
      keys: ['gas', 'gasgesetz', 'molares volumen', 'druck', 'boyle', 'normbedingungen'],
    },
    {
      id: 'reaktionen',
      title: 'Reaktionsgleichungen',
      nav: 'Reaktionsgleichungen',
      short: 'Gleichungen ausgleichen, Massen und Stoffmengen berechnen, Ausbeute.',
      sig: '\\text{A} + \\text{B} \\rightarrow \\text{C}',
      icon: IconReaction,
      keys: ['reaktionsgleichung', 'ausgleichen', 'stöchiometrie', 'umsatz', 'ausbeute', 'koeffizienten'],
    },
    {
      id: 'photometrie',
      title: 'Photometrie',
      nav: 'Photometrie',
      short: 'Lambert-Beer, Extinktion und Transmission, Kalibriergerade.',
      sig: 'E = \\varepsilon \\cdot c \\cdot d',
      icon: IconCuvette,
      keys: ['photometrie', 'extinktion', 'absorption', 'lambert-beer', 'kalibriergerade', 'transmission'],
    },
  ] satisfies Omit<CalcTool, 'subject' | 'path'>[]
).map((t) => ({ ...t, subject: 'chemie' as const, path: `/chemie/${t.id}` }))

export const BIO_TOOLS: CalcTool[] = (
  [
    {
      id: 'zellzahl',
      title: 'Zellzahl',
      nav: 'Zellzahl',
      short: 'Zählkammer (Neubauer), Zellen pro mL, Vitalität mit Trypanblau, Zellen aussäen.',
      sig: '\\tfrac{\\text{Zellen}}{\\text{mL}}',
      icon: IconCounting,
      keys: ['zellzahl', 'neubauer', 'zählkammer', 'vitalität', 'trypanblau', 'zellkultur', 'aussäen'],
    },
    {
      id: 'mikrobiologie',
      title: 'Keimzahl & Wachstum',
      nav: 'Keimzahl & Wachstum',
      short: 'KbE pro mL aus Platten, gewichtetes Mittel, Generationszeit und Wachstum.',
      sig: '\\text{KbE}/\\text{mL}',
      icon: IconPetri,
      keys: ['keimzahl', 'kbe', 'kolonien', 'generationszeit', 'wachstum', 'bakterien', 'ausplattieren'],
    },
    {
      id: 'verduennungsreihe',
      title: 'Verdünnungsreihe',
      nav: 'Verdünnungsreihe',
      short: 'Serielle Verdünnung: Stufen, Volumina, Konzentrationen und Gesamtverdünnung.',
      sig: '1:10 \\to 1:100',
      icon: IconDilution,
      keys: ['verdünnungsreihe', 'seriell', 'verdünnungsfaktor', 'log-stufen', 'standardreihe'],
    },
    {
      id: 'mikroskopie',
      title: 'Mikroskopie',
      nav: 'Mikroskopie',
      short: 'Vergrößerung, Okularmikrometer eichen, Objektgröße, Auflösung, Sehfeld.',
      sig: 'V = V_{\\text{Obj}} \\cdot V_{\\text{Ok}}',
      icon: IconMicroscope,
      keys: ['mikroskop', 'vergrößerung', 'okularmikrometer', 'objektmikrometer', 'auflösung', 'sehfeld'],
    },
    {
      id: 'zentrifuge',
      title: 'Zentrifuge',
      nav: 'Zentrifuge',
      short: 'Relative Zentrifugalbeschleunigung (× g) und Drehzahl (rpm) umrechnen.',
      sig: '\\text{RZB} = 1{,}118 \\cdot 10^{-5}\\, r\\, n^2',
      icon: IconCentrifuge,
      keys: ['zentrifuge', 'rcf', 'rzb', 'rpm', 'drehzahl', 'x g'],
    },
    {
      id: 'nukleinsaeuren',
      title: 'DNA, RNA & Protein',
      nav: 'DNA, RNA & Protein',
      short: 'Konzentration aus A260/A280, Reinheit, ng ↔ pmol, Schmelztemperatur von Primern.',
      sig: 'A_{260}',
      icon: IconDna,
      keys: ['dna', 'rna', 'a260', 'reinheit', 'nanodrop', 'primer', 'tm', 'protein', 'pmol'],
    },
    {
      id: 'pcr',
      title: 'PCR-Ansatz',
      nav: 'PCR-Ansatz',
      short: 'Mastermix für n Proben: Volumen jeder Komponente aus Stamm- und Endkonzentration.',
      sig: 'n + 1',
      icon: IconPcr,
      keys: ['pcr', 'mastermix', 'ansatz', 'primer', 'dntp', 'polymerase', 'pipettierschema'],
    },
  ] satisfies Omit<CalcTool, 'subject' | 'path'>[]
).map((t) => ({ ...t, subject: 'biologie' as const, path: `/biologie/${t.id}` }))

/** Alter Name – der erste Chemie-Rechner */
export const CHEM_CALC: CalcTool = CHEM_TOOLS[0]

export const ALL_TOOLS: CalcTool[] = [...MATH_TOOLS, ...CHEM_TOOLS, ...BIO_TOOLS]

export const TOOL_BY_ID = Object.fromEntries(ALL_TOOLS.map((t) => [t.id, t])) as Record<string, CalcTool>
