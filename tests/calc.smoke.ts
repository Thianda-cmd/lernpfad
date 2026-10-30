/**
 * Smoke-Test für alle Rechner (npm run test:calc):
 *  – jede Eingabe liefert ein Ergebnis oder einen verständlichen Fehler (CalcError), nie einen Absturz,
 *  – jede Formel im Lösungsweg lässt sich mit KaTeX setzen,
 *  – Ergebnisse werden nachgerechnet (exakt mit Brüchen bzw. numerisch).
 * Einzelne Gruppen: CALC_ONLY=core,chem-a npm run test:calc
 */
import { report } from './harness'
import './calc/core'
import './calc/chem-a'
import './calc/chem-b'
import './calc/bio'
import './calc/molbio-math'

report()
