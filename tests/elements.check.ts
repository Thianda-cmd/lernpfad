import { ELEMENTS, fullSubs, phaseAt, position, shells } from '../src/chem/elements'

const errs: string[] = []
if (ELEMENTS.length !== 118) errs.push(`Anzahl ${ELEMENTS.length}`)
ELEMENTS.forEach((e, i) => {
  if (e.z !== i + 1) errs.push(`Reihenfolge bei ${e.sym}`)
  const n = fullSubs(e.conf).reduce((s, x) => s + x.e, 0)
  if (n !== e.z) errs.push(`${e.sym}: Konfiguration hat ${n} Elektronen statt ${e.z}`)
  const cap = { s: 2, p: 6, d: 10, f: 14 }
  fullSubs(e.conf).forEach((x) => x.e > cap[x.l] && errs.push(`${e.sym}: ${x.n}${x.l}${x.e} zu voll`))
  if (shells(e.conf).reduce((a, b) => a + b, 0) !== e.z) errs.push(`${e.sym}: Schalen`)
})
const seen = new Set<string>()
for (const e of ELEMENTS) {
  const p = position(e.z)
  const k = `${p.row}/${p.col}`
  if (seen.has(k)) errs.push(`doppelte Position ${k} (${e.sym})`)
  seen.add(k)
}
const gases = ELEMENTS.filter((e) => phaseAt(e, 20) === 'gasförmig').map((e) => e.sym).join(',')
const liquids = ELEMENTS.filter((e) => phaseAt(e, 20) === 'flüssig').map((e) => e.sym).join(',')
if (gases !== 'H,He,N,O,F,Ne,Cl,Ar,Kr,Xe,Rn') errs.push(`Gase bei 20 °C: ${gases}`)
if (liquids !== 'Br,Hg') errs.push(`Flüssig bei 20 °C: ${liquids}`)

// Abgleich mit PubChem
const res = await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON')
const j = (await res.json()) as { Table: { Row: { Cell: string[] }[] } }
const num = (s: string) => (s === '' ? null : parseFloat(s))
const SKIP_IE = new Set([85, 87, 103])
const SKIP_EN = new Set([36, 86])
for (const r of j.Table.Row) {
  const c = r.Cell
  const z = +c[0]
  const e = ELEMENTS[z - 1]
  if (c[1] !== e.sym) errs.push(`Symbol ${z}: ${c[1]} ≠ ${e.sym}`)
  const pm = num(c[3])!
  // Blei: IUPAC-Standardwert 207,2 (PubChem rundet auf 207)
  if (!e.radio && z !== 82 && Math.abs(pm - e.mass) > 0.11) errs.push(`${e.sym} Masse ${e.mass} vs PubChem ${pm}`)
  if (e.radio && Math.abs(pm - e.mass) > 2.1) errs.push(`${e.sym} Massenzahl ${e.mass} vs PubChem ${pm}`)
  const cmp = (name: string, mine: number | null, theirs: number | null, tol: number) => {
    if (mine === null && theirs === null) return
    if (mine === null || theirs === null) {
      errs.push(`${e.sym} ${name}: ${mine} vs PubChem ${theirs}`)
      return
    }
    if (Math.abs(mine - theirs) > tol) errs.push(`${e.sym} ${name}: ${mine} vs PubChem ${theirs}`)
  }
  if (!SKIP_EN.has(z)) cmp('EN', e.en, num(c[6]), 0.001)
  cmp('Radius', e.rad, num(c[7]), 0.5)
  if (!SKIP_IE.has(z)) cmp('IE', e.ie, num(c[8]), 0.002)
  if (z !== 2 && z !== 6 && z !== 33) {
    cmp('Smp', e.mp, num(c[12]), 0.01)
    cmp('Sdp', e.bp, num(c[13]), 0.01)
  }
  if (![85, 87].includes(z)) cmp('Dichte', e.dens, num(c[14]), 0.0005)
  // Unterschalen mit PubChem vergleichen (Reihenfolge egal)
  const norm = (s: string) =>
    fullSubs(s.replace(/\(.*\)/, '').trim().replace(/\s+/g, ' '))
      .map((x) => `${x.n}${x.l}${x.e}`)
      .sort()
      .join(' ')
  if (z !== 103 && norm(c[5]) !== norm(e.conf)) errs.push(`${e.sym} Konfiguration: ${e.conf} vs PubChem ${c[5]}`)
}
console.log(`Elemente geprüft: ${ELEMENTS.length}, Abweichungen: ${errs.length}`)
console.log(errs.join('\n'))
