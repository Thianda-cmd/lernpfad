/** Häufige Ionen für Salzformeln (Namen nach IUPAC-Empfehlung, deutsch) */

export interface Ion {
  id: string
  /** Formel ohne Ladung, z. B. „SO4“ */
  f: string
  q: number
  name: string
  /** mehratomig → in Formeln ggf. geklammert */
  poly: boolean
}

export const CATIONS: Ion[] = [
  { id: 'Li', f: 'Li', q: 1, name: 'Lithium', poly: false },
  { id: 'Na', f: 'Na', q: 1, name: 'Natrium', poly: false },
  { id: 'K', f: 'K', q: 1, name: 'Kalium', poly: false },
  { id: 'NH4', f: 'NH4', q: 1, name: 'Ammonium', poly: true },
  { id: 'Ag', f: 'Ag', q: 1, name: 'Silber', poly: false },
  { id: 'Cu1', f: 'Cu', q: 1, name: 'Kupfer(I)', poly: false },
  { id: 'Mg', f: 'Mg', q: 2, name: 'Magnesium', poly: false },
  { id: 'Ca', f: 'Ca', q: 2, name: 'Calcium', poly: false },
  { id: 'Sr', f: 'Sr', q: 2, name: 'Strontium', poly: false },
  { id: 'Ba', f: 'Ba', q: 2, name: 'Barium', poly: false },
  { id: 'Zn', f: 'Zn', q: 2, name: 'Zink', poly: false },
  { id: 'Cu2', f: 'Cu', q: 2, name: 'Kupfer(II)', poly: false },
  { id: 'Fe2', f: 'Fe', q: 2, name: 'Eisen(II)', poly: false },
  { id: 'Mn2', f: 'Mn', q: 2, name: 'Mangan(II)', poly: false },
  { id: 'Co2', f: 'Co', q: 2, name: 'Cobalt(II)', poly: false },
  { id: 'Ni2', f: 'Ni', q: 2, name: 'Nickel(II)', poly: false },
  { id: 'Pb2', f: 'Pb', q: 2, name: 'Blei(II)', poly: false },
  { id: 'Sn2', f: 'Sn', q: 2, name: 'Zinn(II)', poly: false },
  { id: 'Hg2', f: 'Hg', q: 2, name: 'Quecksilber(II)', poly: false },
  { id: 'Al', f: 'Al', q: 3, name: 'Aluminium', poly: false },
  { id: 'Fe3', f: 'Fe', q: 3, name: 'Eisen(III)', poly: false },
  { id: 'Cr3', f: 'Cr', q: 3, name: 'Chrom(III)', poly: false },
]

export const ANIONS: Ion[] = [
  { id: 'F', f: 'F', q: -1, name: 'fluorid', poly: false },
  { id: 'Cl', f: 'Cl', q: -1, name: 'chlorid', poly: false },
  { id: 'Br', f: 'Br', q: -1, name: 'bromid', poly: false },
  { id: 'I', f: 'I', q: -1, name: 'iodid', poly: false },
  { id: 'OH', f: 'OH', q: -1, name: 'hydroxid', poly: true },
  { id: 'NO3', f: 'NO3', q: -1, name: 'nitrat', poly: true },
  { id: 'NO2', f: 'NO2', q: -1, name: 'nitrit', poly: true },
  { id: 'HCO3', f: 'HCO3', q: -1, name: 'hydrogencarbonat', poly: true },
  { id: 'HSO4', f: 'HSO4', q: -1, name: 'hydrogensulfat', poly: true },
  { id: 'H2PO4', f: 'H2PO4', q: -1, name: 'dihydrogenphosphat', poly: true },
  { id: 'CH3COO', f: 'CH3COO', q: -1, name: 'acetat', poly: true },
  { id: 'MnO4', f: 'MnO4', q: -1, name: 'permanganat', poly: true },
  { id: 'CN', f: 'CN', q: -1, name: 'cyanid', poly: true },
  { id: 'SCN', f: 'SCN', q: -1, name: 'thiocyanat', poly: true },
  { id: 'ClO', f: 'ClO', q: -1, name: 'hypochlorit', poly: true },
  { id: 'ClO3', f: 'ClO3', q: -1, name: 'chlorat', poly: true },
  { id: 'ClO4', f: 'ClO4', q: -1, name: 'perchlorat', poly: true },
  { id: 'O', f: 'O', q: -2, name: 'oxid', poly: false },
  { id: 'S', f: 'S', q: -2, name: 'sulfid', poly: false },
  { id: 'SO4', f: 'SO4', q: -2, name: 'sulfat', poly: true },
  { id: 'SO3', f: 'SO3', q: -2, name: 'sulfit', poly: true },
  { id: 'CO3', f: 'CO3', q: -2, name: 'carbonat', poly: true },
  { id: 'HPO4', f: 'HPO4', q: -2, name: 'hydrogenphosphat', poly: true },
  { id: 'S2O3', f: 'S2O3', q: -2, name: 'thiosulfat', poly: true },
  { id: 'CrO4', f: 'CrO4', q: -2, name: 'chromat', poly: true },
  { id: 'Cr2O7', f: 'Cr2O7', q: -2, name: 'dichromat', poly: true },
  { id: 'C2O4', f: 'C2O4', q: -2, name: 'oxalat', poly: true },
  { id: 'N', f: 'N', q: -3, name: 'nitrid', poly: false },
  { id: 'PO4', f: 'PO4', q: -3, name: 'phosphat', poly: true },
]

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

export interface Salt {
  formula: string
  name: string
  nc: number
  na: number
}

/** Verbindung aus Kation und Anion (Ladungsausgleich über das kgV) */
export function combine(c: Ion, a: Ion): Salt {
  const qa = Math.abs(a.q)
  const l = (c.q * qa) / gcd(c.q, qa)
  const nc = l / c.q
  const na = l / qa
  const part = (ion: Ion, n: number) => (n === 1 ? ion.f : ion.poly ? `(${ion.f})${n}` : `${ion.f}${n}`)
  const formula = part(c, nc) + part(a, na)
  const cn = c.name
  const joiner = cn.endsWith(')') ? '-' : ''
  const name = cn + joiner + a.name
  return { formula, name: name.charAt(0).toUpperCase() + name.slice(1), nc, na }
}
