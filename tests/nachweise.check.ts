import { parseFormula } from '../src/chem/formula'
import { NACHWEISE } from '../src/chem/nachweise'

/** Prüft jede Reaktionsgleichung der Ionennachweise auf Atom- und Ladungsbilanz. */

type Side = { atoms: Map<string, number>; charge: number }

function species(raw: string): { n: number; f: string; q: number } {
  let s = raw.trim().replace(/\{[^}]*\}$/, '').replace(/[↓↑]$/, '')
  let n = 1
  const c = /^(\d+)\s+(.+)$/.exec(s)
  if (c) {
    n = +c[1]
    s = c[2]
  }
  let q = 0
  const k = s.indexOf('^')
  if (k >= 0) {
    const ch = s.slice(k + 1)
    const m = /^(\d*)([+-])$/.exec(ch)
    if (!m) throw new Error('Ladung unlesbar: ' + raw)
    q = (m[1] ? +m[1] : 1) * (m[2] === '+' ? 1 : -1)
    s = s.slice(0, k)
  }
  return { n, f: s, q }
}

function side(str: string): Side {
  const atoms = new Map<string, number>()
  let charge = 0
  for (const part of str.split(' + ')) {
    const sp = species(part)
    for (const { el, n } of parseFormula(sp.f)) atoms.set(el, (atoms.get(el) ?? 0) + n * sp.n)
    charge += sp.q * sp.n
  }
  return { atoms, charge }
}

let checked = 0
const errs: string[] = []
for (const nw of NACHWEISE) {
  const eqs = [...nw.eq, ...(nw.notes ?? []).flatMap((x) => (x.eq ? [x.eq] : []))]
  for (const e of eqs) {
    if (/\*|Licht/.test(e)) continue // Flammenfärbung: keine Stoffgleichung
    // auch Ketten wie „A → B → C“: jedes Paar muss aufgehen
    const parts = e.split(' → ')
    try {
      for (let k = 0; k + 1 < parts.length; k++) {
        const L = side(parts[k])
        const R = side(parts[k + 1])
        const els = new Set([...L.atoms.keys(), ...R.atoms.keys()])
        for (const el of els) if ((L.atoms.get(el) ?? 0) !== (R.atoms.get(el) ?? 0)) errs.push(`${nw.id}: ${el} ${L.atoms.get(el) ?? 0} ≠ ${R.atoms.get(el) ?? 0}  ::  ${e}`)
        if (L.charge !== R.charge) errs.push(`${nw.id}: Ladung ${L.charge} ≠ ${R.charge}  ::  ${e}`)
      }
      checked++
    } catch (x) {
      errs.push(`${nw.id}: ${(x as Error).message}  ::  ${e}`)
    }
  }
}
// Aufbau: eindeutige IDs, Mulden 0–5, Gaskammer mit Deckel und Papier
const ids = new Set<string>()
const okWell = (i: number) => Number.isInteger(i) && i >= 0 && i <= 5
for (const nw of NACHWEISE) {
  if (ids.has(nw.id)) errs.push(`${nw.id}: ID doppelt`)
  ids.add(nw.id)
  for (const [k, st] of nw.steps.entries()) {
    for (const i of Object.keys(st.wells ?? {}).map(Number)) if (!okWell(i)) errs.push(`${nw.id}: Schritt ${k + 1} – Mulde ${i} gibt es nicht`)
    for (const i of st.into ?? []) if (!okWell(i)) errs.push(`${nw.id}: Schritt ${k + 1} – Tropfen in Mulde ${i}`)
    if ((st.wells || st.into) && nw.vessel !== 'tuepfel') errs.push(`${nw.id}: Schritt ${k + 1} – Mulden ohne Tüpfelplatte`)
    if ((st.lid || st.paper) && nw.vessel !== 'gaskammer') errs.push(`${nw.id}: Schritt ${k + 1} – Deckel ohne Gaskammer`)
  }
  if (nw.vessel === 'tuepfel' && !nw.steps.some((st) => st.wells)) errs.push(`${nw.id}: Tüpfelplatte ohne Mulden`)
  if (nw.vessel === 'gaskammer' && !nw.steps.some((st) => st.lid && st.paper)) errs.push(`${nw.id}: Gaskammer ohne Deckel mit Papier`)
}

console.log(`Gleichungen geprüft: ${checked}, Nachweise: ${NACHWEISE.length}, Fehler: ${errs.length}`)
for (const e of errs) console.log('  ' + e)
if (errs.length) process.exit(1)
