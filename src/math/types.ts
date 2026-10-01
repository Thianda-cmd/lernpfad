import type { Rng } from '../lib/random'

/** Eine Zeile im Lösungsweg: Formel, Rechenschritt rechts („| −3x“), Erklärung darunter. */
export interface Step {
  tex: string
  op?: string
  note?: string
}

export type Rel = '<' | '>' | '≤' | '≥'

export type Answer =
  | {
      kind: 'expr'
      value: string
      vars: string[]
      /** Ergebnis darf keine Klammern mehr enthalten */
      noGroups?: boolean
      /** höchstens so viele Summanden (zusammengefasst) */
      maxTerms?: number
      /** jede Variable höchstens einmal (Potenzen zusammengefasst) */
      singleUse?: boolean
      /** ohne Wurzelzeichen (Potenzschreibweise) */
      noRoot?: boolean
      /** Beschriftung vor dem Eingabefeld, z. B. „x =“ */
      label?: string
      /** Wertebereiche für die Prüfung durch Einsetzen (sonst etwa 0,5 bis 3,4) */
      ranges?: Record<string, [number, number]>
      /** Zahlen im Ergebnis müssen teilerfremd sein (vollständig gekürzt) */
      reduced?: boolean
    }
  | {
      /** ausgeklammerte Form: Faktor · (Klammer) */
      kind: 'factor'
      value: string
      factor: string
      vars: string[]
    }
  | {
      kind: 'num'
      value: number
      /** absolute Toleranz */
      tol?: number
      /** relative Toleranz, z. B. 0.01 = 1 % */
      rel?: number
      unit?: string
      label?: string
      /** exakter Bruch erwartet – ungekürzte Brüche werden angemerkt */
      fraction?: boolean
      /** ungekürzter Bruch zählt als nicht fertig */
      reduced?: boolean
      /** Eingabe muss in der Form a · 10^n mit 1 ≤ a < 10 sein */
      sciForm?: boolean
    }
  | {
      kind: 'nums'
      values: number[]
      labels: string[]
      ordered: boolean
      tol?: number
      rel?: number
      units?: string[]
      /** Ankreuzfeld „keine Lösung“ anbieten */
      allowNone?: boolean
    }
  | { kind: 'ineq'; rel: Rel; value: string; vars: string[]; variable: string }
  | { kind: 'choice'; options: string[]; correct: number }

export interface Problem {
  /** Aufgabentext (mit $TeX$) */
  prompt: string
  /** große Formel unter dem Text */
  tex?: string
  answer: Answer
  steps: Step[]
  hint?: string
  /** Punkte in der Probeklausur */
  points?: number
  /** Koordinatensystem mit Geraden/Punkten zur Aufgabe */
  figure?: Figure
  /** Abweichung vom Lösungsblatt der Schule (wird als Hinweis gezeigt) */
  sheetNote?: string
}

export interface Figure {
  lines?: { m: number; b: number; label?: string }[]
  points?: { x: number; y: number; label?: string }[]
  range?: [number, number, number, number]
}

export type Level = 1 | 2 | 3

export type Generator = (rng: Rng, level: Level) => Problem

export interface GenInfo {
  id: string
  title: string
  gen: Generator
  /** empfohlene Stufen */
  levels?: Level[]
}
