import { fmtC, fmtMass, fmtNum, k2c, type Element } from '../elements'

export type PropKey = 'mass' | 'en' | 'mp' | 'bp' | 'dens' | 'rad' | 'ie'

export interface PropDef {
  key: PropKey
  label: string
  short: string
  unit: string
  get: (e: Element) => number | null
  fmt: (e: Element) => string
  /** kurzer Trend-Satz */
  trend: string
}

export const PROPS: PropDef[] = [
  {
    key: 'en',
    label: 'Elektronegativität',
    short: 'EN',
    unit: 'Pauling',
    get: (e) => e.en,
    fmt: (e) => fmtNum(e.en),
    trend: 'Steigt in einer Periode nach rechts und in einer Gruppe nach oben. Fluor ist am elektronegativsten (3,98).',
  },
  {
    key: 'ie',
    label: '1. Ionisierungsenergie',
    short: 'IE',
    unit: 'eV',
    get: (e) => e.ie,
    fmt: (e) => fmtNum(e.ie, 2),
    trend: 'Am höchsten bei den Edelgasen, am niedrigsten bei den Alkalimetallen – volle Schalen geben ungern Elektronen ab.',
  },
  {
    key: 'rad',
    label: 'Van-der-Waals-Radius',
    short: 'r',
    unit: 'pm',
    get: (e) => e.rad,
    fmt: (e) => fmtNum(e.rad, 0),
    trend: 'In einer Gruppe werden die Atome nach unten größer, weil jede Periode eine Schale mehr hat.',
  },
  {
    key: 'mass',
    label: 'Atommasse',
    short: 'm',
    unit: 'u',
    get: (e) => e.mass,
    fmt: (e) => fmtMass(e),
    trend: 'Wächst fast immer mit der Ordnungszahl. Ausnahmen u. a. Ar/K, Co/Ni und Te/I.',
  },
  {
    key: 'dens',
    label: 'Dichte',
    short: 'ρ',
    unit: 'g/cm³',
    get: (e) => e.dens,
    fmt: (e) => (e.dens === null ? '–' : e.dens < 0.02 ? `${fmtNum(e.dens * 1000, 2)} g/L` : fmtNum(e.dens, 2)),
    trend: 'Am dichtesten ist Osmium (22,57 g/cm³), knapp vor Iridium. Das leichteste Metall ist Lithium.',
  },
  {
    key: 'mp',
    label: 'Schmelzpunkt',
    short: 'Smp',
    unit: '°C',
    get: (e) => (e.mp === null ? null : k2c(e.mp)),
    fmt: (e) => (e.mp === null ? (e.subl ? 'subl.' : '–') : fmtNum(k2c(e.mp), 0)),
    trend: 'Wolfram schmilzt als Metall am höchsten (3422 °C). Kohlenstoff und Arsen sublimieren bei Normaldruck.',
  },
  {
    key: 'bp',
    label: 'Siedepunkt',
    short: 'Sdp',
    unit: '°C',
    get: (e) => (e.bp === null ? null : k2c(e.bp)),
    fmt: (e) => (e.bp === null ? (e.subl ? 'subl.' : '–') : fmtNum(k2c(e.bp), 0)),
    trend: 'Rhenium hat den höchsten Siedepunkt (5596 °C), Helium den niedrigsten (−268,9 °C).',
  },
]

export const PROP_BY_KEY = Object.fromEntries(PROPS.map((p) => [p.key, p])) as Record<PropKey, PropDef>

export function range(p: PropDef, els: Element[]) {
  let min = Infinity
  let max = -Infinity
  for (const e of els) {
    const v = p.get(e)
    if (v === null) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

export { fmtC }
