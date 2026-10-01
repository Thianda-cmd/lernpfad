/**
 * Periodensystem der Elemente – alle 118 Elemente.
 *
 * Quellen: Standard-Atomgewichte nach IUPAC/CIAAW (gekürzt), bei Elementen ohne stabile
 * Isotope die Massenzahl des langlebigsten Isotops in eckigen Klammern. Elektronenkonfiguration
 * nach NIST (ab Z = 104 berechnet). Elektronegativität (Pauling), Schmelz- und Siedepunkt,
 * Dichte, Van-der-Waals-Radius und 1. Ionisierungsenergie nach PubChem (NIH).
 */

export type Cat = 'am' | 'ea' | 'tm' | 'la' | 'ac' | 'pm' | 'hm' | 'nm' | 'ha' | 'eg'

export const CATS: { id: Cat; name: string; short: string }[] = [
  { id: 'am', name: 'Alkalimetalle', short: 'Alkalimetall' },
  { id: 'ea', name: 'Erdalkalimetalle', short: 'Erdalkalimetall' },
  { id: 'tm', name: 'Übergangsmetalle', short: 'Übergangsmetall' },
  { id: 'la', name: 'Lanthanoide', short: 'Lanthanoid' },
  { id: 'ac', name: 'Actinoide', short: 'Actinoid' },
  { id: 'pm', name: 'Metalle', short: 'Metall' },
  { id: 'hm', name: 'Halbmetalle', short: 'Halbmetall' },
  { id: 'nm', name: 'Nichtmetalle', short: 'Nichtmetall' },
  { id: 'ha', name: 'Halogene', short: 'Halogen' },
  { id: 'eg', name: 'Edelgase', short: 'Edelgas' },
]

export const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c])) as Record<Cat, (typeof CATS)[number]>

export interface Element {
  z: number
  sym: string
  name: string
  /** Standard-Atomgewicht bzw. Massenzahl (bei `radio`) */
  mass: number
  /** keine stabilen Isotope – Massenzahl des langlebigsten Isotops */
  radio: boolean
  cat: Cat
  /** Elektronenkonfiguration, z. B. „[Ar] 3d6 4s2“ */
  conf: string
  en: number | null
  /** Schmelzpunkt in K */
  mp: number | null
  /** Siedepunkt in K */
  bp: number | null
  /** Sublimationspunkt in K (kein flüssiger Zustand bei Normaldruck) */
  subl?: number
  /** Dichte in g/cm³ */
  dens: number | null
  /** Van-der-Waals-Radius in pm */
  rad: number | null
  /** 1. Ionisierungsenergie in eV */
  ie: number | null
  ox: string | null
  /** Jahr der Entdeckung bzw. Isolierung; 0 = seit dem Altertum bekannt */
  year: number
  /** Symbol stammt vom lateinischen/griechischen Namen */
  lat?: string
  /** Eigenschaften nur vorhergesagt (Superschwere) */
  pred?: boolean
  /** Schmelzpunkt nur geschätzt */
  est?: boolean
}

type Row = [
  z: number,
  sym: string,
  name: string,
  mass: number,
  radio: 0 | 1,
  cat: Cat,
  conf: string,
  en: number | null,
  mp: number | null,
  bp: number | null,
  dens: number | null,
  rad: number | null,
  ie: number | null,
  ox: string | null,
  year: number,
  extra?: Partial<Pick<Element, 'lat' | 'subl' | 'pred' | 'est'>>,
]

const N = null

// prettier-ignore
const ROWS: Row[] = [
  [1, 'H', 'Wasserstoff', 1.008, 0, 'nm', '1s1', 2.2, 13.81, 20.28, 0.00008988, 120, 13.598, '+1, −1', 1766, { lat: 'Hydrogenium' }],
  [2, 'He', 'Helium', 4.0026, 0, 'eg', '1s2', N, N, 4.22, 0.0001785, 140, 24.587, '0', 1868],
  [3, 'Li', 'Lithium', 6.94, 0, 'am', '[He] 2s1', 0.98, 453.65, 1615, 0.534, 182, 5.392, '+1', 1817],
  [4, 'Be', 'Beryllium', 9.0122, 0, 'ea', '[He] 2s2', 1.57, 1560, 2744, 1.85, 153, 9.323, '+2', 1798],
  [5, 'B', 'Bor', 10.81, 0, 'hm', '[He] 2s2 2p1', 2.04, 2348, 4273, 2.37, 192, 8.298, '+3', 1808],
  [6, 'C', 'Kohlenstoff', 12.011, 0, 'nm', '[He] 2s2 2p2', 2.55, N, N, 2.267, 170, 11.26, '+4, +2, −4', 0, { lat: 'Carboneum', subl: 3915 }],
  [7, 'N', 'Stickstoff', 14.007, 0, 'nm', '[He] 2s2 2p3', 3.04, 63.15, 77.36, 0.0012506, 155, 14.534, '+5, +4, +3, +2, +1, −3', 1772, { lat: 'Nitrogenium' }],
  [8, 'O', 'Sauerstoff', 15.999, 0, 'nm', '[He] 2s2 2p4', 3.44, 54.36, 90.2, 0.001429, 152, 13.618, '−2', 1774, { lat: 'Oxygenium' }],
  [9, 'F', 'Fluor', 18.998, 0, 'ha', '[He] 2s2 2p5', 3.98, 53.53, 85.03, 0.001696, 135, 17.423, '−1', 1886],
  [10, 'Ne', 'Neon', 20.18, 0, 'eg', '[He] 2s2 2p6', N, 24.56, 27.07, 0.0008999, 154, 21.565, '0', 1898],
  [11, 'Na', 'Natrium', 22.99, 0, 'am', '[Ne] 3s1', 0.93, 370.95, 1156, 0.97, 227, 5.139, '+1', 1807],
  [12, 'Mg', 'Magnesium', 24.305, 0, 'ea', '[Ne] 3s2', 1.31, 923, 1363, 1.74, 173, 7.646, '+2', 1808],
  [13, 'Al', 'Aluminium', 26.982, 0, 'pm', '[Ne] 3s2 3p1', 1.61, 933.437, 2792, 2.7, 184, 5.986, '+3', 1825],
  [14, 'Si', 'Silicium', 28.085, 0, 'hm', '[Ne] 3s2 3p2', 1.9, 1687, 3538, 2.3296, 210, 8.152, '+4, −4', 1824],
  [15, 'P', 'Phosphor', 30.974, 0, 'nm', '[Ne] 3s2 3p3', 2.19, 317.3, 553.65, 1.82, 180, 10.487, '+5, +3, −3', 1669],
  [16, 'S', 'Schwefel', 32.06, 0, 'nm', '[Ne] 3s2 3p4', 2.58, 388.36, 717.75, 2.067, 180, 10.36, '+6, +4, −2', 0, { lat: 'Sulfur' }],
  [17, 'Cl', 'Chlor', 35.45, 0, 'ha', '[Ne] 3s2 3p5', 3.16, 171.65, 239.11, 0.003214, 175, 12.968, '+7, +5, +3, +1, −1', 1774],
  [18, 'Ar', 'Argon', 39.95, 0, 'eg', '[Ne] 3s2 3p6', N, 83.8, 87.3, 0.0017837, 188, 15.76, '0', 1894],
  [19, 'K', 'Kalium', 39.098, 0, 'am', '[Ar] 4s1', 0.82, 336.53, 1032, 0.89, 275, 4.341, '+1', 1807],
  [20, 'Ca', 'Calcium', 40.078, 0, 'ea', '[Ar] 4s2', 1.0, 1115, 1757, 1.54, 231, 6.113, '+2', 1808],
  [21, 'Sc', 'Scandium', 44.956, 0, 'tm', '[Ar] 3d1 4s2', 1.36, 1814, 3109, 2.99, 211, 6.561, '+3', 1879],
  [22, 'Ti', 'Titan', 47.867, 0, 'tm', '[Ar] 3d2 4s2', 1.54, 1941, 3560, 4.5, 187, 6.828, '+4, +3, +2', 1791],
  [23, 'V', 'Vanadium', 50.942, 0, 'tm', '[Ar] 3d3 4s2', 1.63, 2183, 3680, 6.0, 179, 6.746, '+5, +4, +3, +2', 1801],
  [24, 'Cr', 'Chrom', 51.996, 0, 'tm', '[Ar] 3d5 4s1', 1.66, 2180, 2944, 7.15, 189, 6.767, '+6, +3, +2', 1797],
  [25, 'Mn', 'Mangan', 54.938, 0, 'tm', '[Ar] 3d5 4s2', 1.55, 1519, 2334, 7.3, 197, 7.434, '+7, +6, +4, +3, +2', 1774],
  [26, 'Fe', 'Eisen', 55.845, 0, 'tm', '[Ar] 3d6 4s2', 1.83, 1811, 3134, 7.874, 194, 7.902, '+3, +2', 0, { lat: 'Ferrum' }],
  [27, 'Co', 'Cobalt', 58.933, 0, 'tm', '[Ar] 3d7 4s2', 1.88, 1768, 3200, 8.86, 192, 7.881, '+3, +2', 1735],
  [28, 'Ni', 'Nickel', 58.693, 0, 'tm', '[Ar] 3d8 4s2', 1.91, 1728, 3186, 8.912, 163, 7.64, '+3, +2', 1751],
  [29, 'Cu', 'Kupfer', 63.546, 0, 'tm', '[Ar] 3d10 4s1', 1.9, 1357.77, 2835, 8.933, 140, 7.726, '+2, +1', 0, { lat: 'Cuprum' }],
  [30, 'Zn', 'Zink', 65.38, 0, 'tm', '[Ar] 3d10 4s2', 1.65, 692.68, 1180, 7.134, 139, 9.394, '+2', 1746],
  [31, 'Ga', 'Gallium', 69.723, 0, 'pm', '[Ar] 3d10 4s2 4p1', 1.81, 302.91, 2477, 5.91, 187, 5.999, '+3', 1875],
  [32, 'Ge', 'Germanium', 72.63, 0, 'hm', '[Ar] 3d10 4s2 4p2', 2.01, 1211.4, 3106, 5.323, 211, 7.9, '+4, +2', 1886],
  [33, 'As', 'Arsen', 74.922, 0, 'hm', '[Ar] 3d10 4s2 4p3', 2.18, N, N, 5.776, 185, 9.815, '+5, +3, −3', 0, { subl: 887 }],
  [34, 'Se', 'Selen', 78.971, 0, 'nm', '[Ar] 3d10 4s2 4p4', 2.55, 493.65, 958, 4.809, 190, 9.752, '+6, +4, −2', 1817],
  [35, 'Br', 'Brom', 79.904, 0, 'ha', '[Ar] 3d10 4s2 4p5', 2.96, 265.95, 331.95, 3.11, 183, 11.814, '+5, +1, −1', 1826],
  [36, 'Kr', 'Krypton', 83.798, 0, 'eg', '[Ar] 3d10 4s2 4p6', 3.0, 115.79, 119.93, 0.003733, 202, 14.0, '+2, 0', 1898],
  [37, 'Rb', 'Rubidium', 85.468, 0, 'am', '[Kr] 5s1', 0.82, 312.46, 961, 1.53, 303, 4.177, '+1', 1861],
  [38, 'Sr', 'Strontium', 87.62, 0, 'ea', '[Kr] 5s2', 0.95, 1050, 1655, 2.64, 249, 5.695, '+2', 1790],
  [39, 'Y', 'Yttrium', 88.906, 0, 'tm', '[Kr] 4d1 5s2', 1.22, 1795, 3618, 4.47, 219, 6.217, '+3', 1794],
  [40, 'Zr', 'Zirconium', 91.224, 0, 'tm', '[Kr] 4d2 5s2', 1.33, 2128, 4682, 6.52, 186, 6.634, '+4', 1789],
  [41, 'Nb', 'Niob', 92.906, 0, 'tm', '[Kr] 4d4 5s1', 1.6, 2750, 5017, 8.57, 207, 6.759, '+5, +3', 1801],
  [42, 'Mo', 'Molybdän', 95.95, 0, 'tm', '[Kr] 4d5 5s1', 2.16, 2896, 4912, 10.2, 209, 7.092, '+6, +4', 1778],
  [43, 'Tc', 'Technetium', 97, 1, 'tm', '[Kr] 4d5 5s2', 1.9, 2430, 4538, 11, 209, 7.28, '+7, +4', 1937],
  [44, 'Ru', 'Ruthenium', 101.07, 0, 'tm', '[Kr] 4d7 5s1', 2.2, 2607, 4423, 12.1, 207, 7.361, '+8, +4, +3, +2', 1844],
  [45, 'Rh', 'Rhodium', 102.91, 0, 'tm', '[Kr] 4d8 5s1', 2.28, 2237, 3968, 12.4, 195, 7.459, '+3', 1803],
  [46, 'Pd', 'Palladium', 106.42, 0, 'tm', '[Kr] 4d10', 2.2, 1828.05, 3236, 12.0, 202, 8.337, '+4, +2', 1803],
  [47, 'Ag', 'Silber', 107.87, 0, 'tm', '[Kr] 4d10 5s1', 1.93, 1234.93, 2435, 10.501, 172, 7.576, '+1', 0, { lat: 'Argentum' }],
  [48, 'Cd', 'Cadmium', 112.41, 0, 'tm', '[Kr] 4d10 5s2', 1.69, 594.22, 1040, 8.69, 158, 8.994, '+2', 1817],
  [49, 'In', 'Indium', 114.82, 0, 'pm', '[Kr] 4d10 5s2 5p1', 1.78, 429.75, 2345, 7.31, 193, 5.786, '+3', 1863],
  [50, 'Sn', 'Zinn', 118.71, 0, 'pm', '[Kr] 4d10 5s2 5p2', 1.96, 505.08, 2875, 7.287, 217, 7.344, '+4, +2', 0, { lat: 'Stannum' }],
  [51, 'Sb', 'Antimon', 121.76, 0, 'hm', '[Kr] 4d10 5s2 5p3', 2.05, 903.78, 1860, 6.685, 206, 8.64, '+5, +3, −3', 0, { lat: 'Stibium' }],
  [52, 'Te', 'Tellur', 127.6, 0, 'hm', '[Kr] 4d10 5s2 5p4', 2.1, 722.66, 1261, 6.232, 206, 9.01, '+6, +4, −2', 1782],
  [53, 'I', 'Iod', 126.9, 0, 'ha', '[Kr] 4d10 5s2 5p5', 2.66, 386.85, 457.55, 4.93, 198, 10.451, '+7, +5, +1, −1', 1811],
  [54, 'Xe', 'Xenon', 131.29, 0, 'eg', '[Kr] 4d10 5s2 5p6', 2.6, 161.36, 165.03, 0.005887, 216, 12.13, '+8, +6, +4, +2', 1898],
  [55, 'Cs', 'Caesium', 132.91, 0, 'am', '[Xe] 6s1', 0.79, 301.59, 944, 1.93, 343, 3.894, '+1', 1860],
  [56, 'Ba', 'Barium', 137.33, 0, 'ea', '[Xe] 6s2', 0.89, 1000, 2170, 3.62, 268, 5.212, '+2', 1808],
  [57, 'La', 'Lanthan', 138.91, 0, 'la', '[Xe] 5d1 6s2', 1.1, 1191, 3737, 6.15, 240, 5.577, '+3', 1839],
  [58, 'Ce', 'Cer', 140.12, 0, 'la', '[Xe] 4f1 5d1 6s2', 1.12, 1071, 3697, 6.77, 235, 5.539, '+4, +3', 1803],
  [59, 'Pr', 'Praseodym', 140.91, 0, 'la', '[Xe] 4f3 6s2', 1.13, 1204, 3793, 6.77, 239, 5.464, '+3', 1885],
  [60, 'Nd', 'Neodym', 144.24, 0, 'la', '[Xe] 4f4 6s2', 1.14, 1294, 3347, 7.01, 229, 5.525, '+3', 1885],
  [61, 'Pm', 'Promethium', 145, 1, 'la', '[Xe] 4f5 6s2', N, 1315, 3273, 7.26, 236, 5.55, '+3', 1945],
  [62, 'Sm', 'Samarium', 150.36, 0, 'la', '[Xe] 4f6 6s2', 1.17, 1347, 2067, 7.52, 229, 5.644, '+3, +2', 1879],
  [63, 'Eu', 'Europium', 151.96, 0, 'la', '[Xe] 4f7 6s2', N, 1095, 1802, 5.24, 233, 5.67, '+3, +2', 1901],
  [64, 'Gd', 'Gadolinium', 157.25, 0, 'la', '[Xe] 4f7 5d1 6s2', 1.2, 1586, 3546, 7.9, 237, 6.15, '+3', 1880],
  [65, 'Tb', 'Terbium', 158.93, 0, 'la', '[Xe] 4f9 6s2', N, 1629, 3503, 8.23, 221, 5.864, '+3', 1843],
  [66, 'Dy', 'Dysprosium', 162.5, 0, 'la', '[Xe] 4f10 6s2', 1.22, 1685, 2840, 8.55, 229, 5.939, '+3', 1886],
  [67, 'Ho', 'Holmium', 164.93, 0, 'la', '[Xe] 4f11 6s2', 1.23, 1747, 2973, 8.8, 216, 6.022, '+3', 1878],
  [68, 'Er', 'Erbium', 167.26, 0, 'la', '[Xe] 4f12 6s2', 1.24, 1802, 3141, 9.07, 235, 6.108, '+3', 1843],
  [69, 'Tm', 'Thulium', 168.93, 0, 'la', '[Xe] 4f13 6s2', 1.25, 1818, 2223, 9.32, 227, 6.184, '+3', 1879],
  [70, 'Yb', 'Ytterbium', 173.05, 0, 'la', '[Xe] 4f14 6s2', N, 1092, 1469, 6.9, 242, 6.254, '+3, +2', 1878],
  [71, 'Lu', 'Lutetium', 174.97, 0, 'la', '[Xe] 4f14 5d1 6s2', 1.27, 1936, 3675, 9.84, 221, 5.426, '+3', 1907],
  [72, 'Hf', 'Hafnium', 178.49, 0, 'tm', '[Xe] 4f14 5d2 6s2', 1.3, 2506, 4876, 13.3, 212, 6.825, '+4', 1923],
  [73, 'Ta', 'Tantal', 180.95, 0, 'tm', '[Xe] 4f14 5d3 6s2', 1.5, 3290, 5731, 16.4, 217, 7.89, '+5', 1802],
  [74, 'W', 'Wolfram', 183.84, 0, 'tm', '[Xe] 4f14 5d4 6s2', 2.36, 3695, 5828, 19.3, 210, 7.98, '+6, +4', 1783],
  [75, 'Re', 'Rhenium', 186.21, 0, 'tm', '[Xe] 4f14 5d5 6s2', 1.9, 3459, 5869, 20.8, 217, 7.88, '+7, +6, +4', 1925],
  [76, 'Os', 'Osmium', 190.23, 0, 'tm', '[Xe] 4f14 5d6 6s2', 2.2, 3306, 5285, 22.57, 216, 8.7, '+8, +4, +3', 1803],
  [77, 'Ir', 'Iridium', 192.22, 0, 'tm', '[Xe] 4f14 5d7 6s2', 2.2, 2719, 4701, 22.42, 202, 9.1, '+4, +3', 1803],
  [78, 'Pt', 'Platin', 195.08, 0, 'tm', '[Xe] 4f14 5d9 6s1', 2.28, 2041.55, 4098, 21.46, 209, 9.0, '+4, +2', 1735],
  [79, 'Au', 'Gold', 196.97, 0, 'tm', '[Xe] 4f14 5d10 6s1', 2.54, 1337.33, 3129, 19.282, 166, 9.226, '+3, +1', 0, { lat: 'Aurum' }],
  [80, 'Hg', 'Quecksilber', 200.59, 0, 'tm', '[Xe] 4f14 5d10 6s2', 2.0, 234.32, 629.88, 13.5336, 209, 10.438, '+2, +1', 0, { lat: 'Hydrargyrum' }],
  [81, 'Tl', 'Thallium', 204.38, 0, 'pm', '[Xe] 4f14 5d10 6s2 6p1', 1.62, 577, 1746, 11.8, 196, 6.108, '+3, +1', 1861],
  [82, 'Pb', 'Blei', 207.2, 0, 'pm', '[Xe] 4f14 5d10 6s2 6p2', 2.33, 600.61, 2022, 11.342, 202, 7.417, '+4, +2', 0, { lat: 'Plumbum' }],
  [83, 'Bi', 'Bismut', 208.98, 0, 'pm', '[Xe] 4f14 5d10 6s2 6p3', 2.02, 544.55, 1837, 9.807, 207, 7.289, '+5, +3', 1753],
  [84, 'Po', 'Polonium', 209, 1, 'pm', '[Xe] 4f14 5d10 6s2 6p4', 2.0, 527, 1235, 9.32, 197, 8.417, '+4, +2', 1898],
  [85, 'At', 'Astat', 210, 1, 'ha', '[Xe] 4f14 5d10 6s2 6p5', 2.2, 575, N, N, 202, 9.318, '+7, +5, +3, +1, −1', 1940, { est: true }],
  [86, 'Rn', 'Radon', 222, 1, 'eg', '[Xe] 4f14 5d10 6s2 6p6', N, 202, 211.45, 0.00973, 220, 10.745, '+2, 0', 1900],
  [87, 'Fr', 'Francium', 223, 1, 'am', '[Rn] 7s1', 0.7, 300, N, N, 348, 4.073, '+1', 1939, { est: true }],
  [88, 'Ra', 'Radium', 226, 1, 'ea', '[Rn] 7s2', 0.9, 973, 1413, 5, 283, 5.279, '+2', 1898],
  [89, 'Ac', 'Actinium', 227, 1, 'ac', '[Rn] 6d1 7s2', 1.1, 1324, 3471, 10.07, 260, 5.17, '+3', 1899],
  [90, 'Th', 'Thorium', 232.04, 0, 'ac', '[Rn] 6d2 7s2', 1.3, 2023, 5061, 11.72, 237, 6.08, '+4', 1828],
  [91, 'Pa', 'Protactinium', 231.04, 0, 'ac', '[Rn] 5f2 6d1 7s2', 1.5, 1845, N, 15.37, 243, 5.89, '+5, +4', 1913],
  [92, 'U', 'Uran', 238.03, 0, 'ac', '[Rn] 5f3 6d1 7s2', 1.38, 1408, 4404, 18.95, 240, 6.194, '+6, +5, +4, +3', 1789],
  [93, 'Np', 'Neptunium', 237, 1, 'ac', '[Rn] 5f4 6d1 7s2', 1.36, 917, 4175, 20.25, 221, 6.266, '+6, +5, +4, +3', 1940],
  [94, 'Pu', 'Plutonium', 244, 1, 'ac', '[Rn] 5f6 7s2', 1.28, 913, 3501, 19.84, 243, 6.06, '+6, +5, +4, +3', 1940],
  [95, 'Am', 'Americium', 243, 1, 'ac', '[Rn] 5f7 7s2', 1.3, 1449, 2284, 13.69, 244, 5.993, '+6, +5, +4, +3', 1944],
  [96, 'Cm', 'Curium', 247, 1, 'ac', '[Rn] 5f7 6d1 7s2', 1.3, 1618, 3400, 13.51, 245, 6.02, '+3', 1944],
  [97, 'Bk', 'Berkelium', 247, 1, 'ac', '[Rn] 5f9 7s2', 1.3, 1323, N, 14, 244, 6.23, '+4, +3', 1949],
  [98, 'Cf', 'Californium', 251, 1, 'ac', '[Rn] 5f10 7s2', 1.3, 1173, N, N, 245, 6.3, '+3', 1950],
  [99, 'Es', 'Einsteinium', 252, 1, 'ac', '[Rn] 5f11 7s2', 1.3, 1133, N, N, 245, 6.42, '+3', 1952],
  [100, 'Fm', 'Fermium', 257, 1, 'ac', '[Rn] 5f12 7s2', 1.3, 1800, N, N, N, 6.5, '+3', 1952, { est: true }],
  [101, 'Md', 'Mendelevium', 258, 1, 'ac', '[Rn] 5f13 7s2', 1.3, 1100, N, N, N, 6.58, '+3, +2', 1955, { est: true }],
  [102, 'No', 'Nobelium', 259, 1, 'ac', '[Rn] 5f14 7s2', 1.3, 1100, N, N, N, 6.65, '+3, +2', 1966, { est: true }],
  [103, 'Lr', 'Lawrencium', 266, 1, 'ac', '[Rn] 5f14 7s2 7p1', 1.3, 1900, N, N, N, 4.96, '+3', 1961, { est: true }],
  [104, 'Rf', 'Rutherfordium', 267, 1, 'tm', '[Rn] 5f14 6d2 7s2', N, N, N, N, N, N, '+4', 1964],
  [105, 'Db', 'Dubnium', 268, 1, 'tm', '[Rn] 5f14 6d3 7s2', N, N, N, N, N, N, '+5', 1967],
  [106, 'Sg', 'Seaborgium', 269, 1, 'tm', '[Rn] 5f14 6d4 7s2', N, N, N, N, N, N, '+6', 1974],
  [107, 'Bh', 'Bohrium', 270, 1, 'tm', '[Rn] 5f14 6d5 7s2', N, N, N, N, N, N, '+7', 1981],
  [108, 'Hs', 'Hassium', 269, 1, 'tm', '[Rn] 5f14 6d6 7s2', N, N, N, N, N, N, '+8', 1984],
  [109, 'Mt', 'Meitnerium', 278, 1, 'tm', '[Rn] 5f14 6d7 7s2', N, N, N, N, N, N, N, 1982, { pred: true }],
  [110, 'Ds', 'Darmstadtium', 281, 1, 'tm', '[Rn] 5f14 6d8 7s2', N, N, N, N, N, N, N, 1994, { pred: true }],
  [111, 'Rg', 'Roentgenium', 282, 1, 'tm', '[Rn] 5f14 6d9 7s2', N, N, N, N, N, N, N, 1994, { pred: true }],
  [112, 'Cn', 'Copernicium', 285, 1, 'tm', '[Rn] 5f14 6d10 7s2', N, N, N, N, N, N, N, 1996, { pred: true }],
  [113, 'Nh', 'Nihonium', 286, 1, 'pm', '[Rn] 5f14 6d10 7s2 7p1', N, N, N, N, N, N, N, 2004, { pred: true }],
  [114, 'Fl', 'Flerovium', 289, 1, 'pm', '[Rn] 5f14 6d10 7s2 7p2', N, N, N, N, N, N, N, 1998, { pred: true }],
  [115, 'Mc', 'Moscovium', 290, 1, 'pm', '[Rn] 5f14 6d10 7s2 7p3', N, N, N, N, N, N, N, 2003, { pred: true }],
  [116, 'Lv', 'Livermorium', 293, 1, 'pm', '[Rn] 5f14 6d10 7s2 7p4', N, N, N, N, N, N, N, 2000, { pred: true }],
  [117, 'Ts', 'Tenness', 294, 1, 'ha', '[Rn] 5f14 6d10 7s2 7p5', N, N, N, N, N, N, N, 2010, { pred: true }],
  [118, 'Og', 'Oganesson', 294, 1, 'eg', '[Rn] 5f14 6d10 7s2 7p6', N, N, N, N, N, N, N, 2006, { pred: true }],
]

export const ELEMENTS: Element[] = ROWS.map(([z, sym, name, mass, radio, cat, conf, en, mp, bp, dens, rad, ie, ox, year, extra]) => ({
  z,
  sym,
  name,
  mass,
  radio: !!radio,
  cat,
  conf,
  en,
  mp,
  bp,
  dens,
  rad,
  ie,
  ox,
  year,
  ...extra,
}))

export const BY_Z: Record<number, Element> = Object.fromEntries(ELEMENTS.map((e) => [e.z, e]))
export const BY_SYM: Record<string, Element> = Object.fromEntries(ELEMENTS.map((e) => [e.sym, e]))

/* ---------------------------- Lage im Periodensystem ---------------------------- */

export interface Pos {
  /** Zeile im Raster: 1–7 Hauptteil, 9/10 = Lanthanoide/Actinoide */
  row: number
  col: number
  period: number
  /** IUPAC-Gruppe 1–18 (Lanthanoide/Actinoide gehören zu Gruppe 3) */
  group: number
}

export function position(z: number): Pos {
  if (z === 1) return { row: 1, col: 1, period: 1, group: 1 }
  if (z === 2) return { row: 1, col: 18, period: 1, group: 18 }
  if (z <= 10) {
    const col = z <= 4 ? z - 2 : z + 8
    return { row: 2, col, period: 2, group: col }
  }
  if (z <= 18) {
    const col = z <= 12 ? z - 10 : z
    return { row: 3, col, period: 3, group: col }
  }
  if (z <= 36) return { row: 4, col: z - 18, period: 4, group: z - 18 }
  if (z <= 54) return { row: 5, col: z - 36, period: 5, group: z - 36 }
  if (z <= 56) return { row: 6, col: z - 54, period: 6, group: z - 54 }
  if (z <= 71) return { row: 9, col: z - 54, period: 6, group: 3 }
  if (z <= 86) return { row: 6, col: z - 68, period: 6, group: z - 68 }
  if (z <= 88) return { row: 7, col: z - 86, period: 7, group: z - 86 }
  if (z <= 103) return { row: 10, col: z - 86, period: 7, group: 3 }
  return { row: 7, col: z - 100, period: 7, group: z - 100 }
}

export function block(e: Element): 's' | 'p' | 'd' | 'f' {
  if (e.cat === 'la' || e.cat === 'ac') return 'f'
  const g = position(e.z).group
  if (e.z === 2 || g <= 2) return 's'
  if (g >= 13) return 'p'
  return 'd'
}

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 13: 'III', 14: 'IV', 15: 'V', 16: 'VI', 17: 'VII', 18: 'VIII' }

/** „Gruppe 16 · VI. Hauptgruppe“ */
export function groupLabel(e: Element) {
  const { group } = position(e.z)
  if (e.cat === 'la') return 'Gruppe 3 · Lanthanoide'
  if (e.cat === 'ac') return 'Gruppe 3 · Actinoide'
  return ROMAN[group] ? `Gruppe ${group} · ${ROMAN[group]}. Hauptgruppe` : `Gruppe ${group} · Nebengruppe`
}

export const mainGroupRoman = (g: number) => ROMAN[g]

/** Valenzelektronen (nur Hauptgruppenelemente) */
export function valence(e: Element): number | null {
  const g = position(e.z).group
  if (e.z === 2) return 2
  if (g === 1 || g === 2) return g
  if (g >= 13 && g <= 18 && e.cat !== 'la' && e.cat !== 'ac') return g - 10
  return null
}

/* ---------------------------- Elektronenkonfiguration ---------------------------- */

const CORES: Record<string, string> = {
  He: '1s2',
  Ne: '[He] 2s2 2p6',
  Ar: '[Ne] 3s2 3p6',
  Kr: '[Ar] 3d10 4s2 4p6',
  Xe: '[Kr] 4d10 5s2 5p6',
  Rn: '[Xe] 4f14 5d10 6s2 6p6',
}

export interface Sub {
  n: number
  l: 's' | 'p' | 'd' | 'f'
  e: number
}

function parseSubs(conf: string): Sub[] {
  const out: Sub[] = []
  const re = /(\d)([spdf])(\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(conf))) out.push({ n: +m[1], l: m[2] as Sub['l'], e: +m[3] })
  return out
}

/** vollständige Liste der besetzten Unterschalen (Edelgaskern aufgelöst) */
export function fullSubs(conf: string): Sub[] {
  const core = /^\[(\w+)\]/.exec(conf)
  const rest = parseSubs(conf.replace(/^\[\w+\]/, ''))
  return core ? [...fullSubs(CORES[core[1]]), ...rest] : rest
}

/** Unterschalen nach dem Edelgaskern (für das Kästchenschema) */
export function outerSubs(conf: string): Sub[] {
  return parseSubs(conf.replace(/^\[\w+\]/, ''))
}

/** Elektronen je Schale K, L, M, … */
export function shells(conf: string): number[] {
  const s: number[] = []
  for (const x of fullSubs(conf)) s[x.n - 1] = (s[x.n - 1] ?? 0) + x.e
  return Array.from(s, (v) => v ?? 0)
}

export const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q']

/* ---------------------------- Formatierung ---------------------------- */

export function fmtMass(e: Element, digits?: number) {
  if (e.radio) return `[${e.mass}]`
  const s = digits === undefined ? String(e.mass) : e.mass.toFixed(digits)
  return s.replace('.', ',')
}

export const k2c = (k: number) => k - 273.15

export function fmtC(k: number | null | undefined) {
  if (k === null || k === undefined) return '–'
  // Quellwerte in ganzen Kelvin sind nicht genauer als 1 °C
  const f = Number.isInteger(k) ? 1 : 10
  const c = Math.round(k2c(k) * f) / f
  return `${c.toLocaleString('de-DE', { useGrouping: false }).replace('-', '−')} °C`
}

export function fmtNum(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined) return '–'
  return v.toLocaleString('de-DE', { maximumFractionDigits: digits, useGrouping: false })
}

/** Dichte: Gase in g/L, sonst g/cm³ */
export function fmtDensity(e: Element) {
  if (e.dens === null) return '–'
  if (e.dens < 0.02) return `${fmtNum(e.dens * 1000, 4)} g/L`
  return `${fmtNum(e.dens, 3)} g/cm³`
}

export type Phase = 'fest' | 'flüssig' | 'gasförmig' | 'unbekannt'

/** Aggregatzustand bei Normaldruck und Temperatur t (°C) */
export function phaseAt(e: Element, tC: number): Phase {
  const T = tC + 273.15
  if (e.subl) return T < e.subl ? 'fest' : 'gasförmig'
  if (e.bp !== null && T >= e.bp) return 'gasförmig'
  if (e.mp === null) {
    // Helium wird bei Normaldruck nie fest
    if (e.z === 2) return 'flüssig'
    return 'unbekannt'
  }
  if (T < e.mp) return 'fest'
  if (e.bp === null) return e.est || e.z >= 85 ? 'unbekannt' : 'flüssig'
  return 'flüssig'
}

export function yearLabel(y: number) {
  return y === 0 ? 'Altertum' : String(y)
}
