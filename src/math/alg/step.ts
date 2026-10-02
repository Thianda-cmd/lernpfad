/** Eine Zeile im Lösungsweg: Formel, Umformung rechts („| −3x“), Erklärung darunter. */
export interface Step {
  tex: string
  op?: string
  note?: string
  /** Zwischenüberschrift über dieser Zeile („1. Klammern auflösen“) */
  head?: string
  /** Ergebniszeile hervorheben */
  final?: boolean
}

export interface Solution {
  /** Ergebnis groß über dem Lösungsweg (TeX) */
  result: string
  /** zusätzliche Ergebniszeilen, z. B. Näherungswert */
  extra?: string[]
  steps: Step[]
  /** Hinweis unter dem Ergebnis (Text mit $TeX$) */
  remark?: string
}
