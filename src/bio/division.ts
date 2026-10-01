/**
 * Mitose und Meiose als Folge von Schlüsselbildern.
 * Modellzelle mit 2n = 4: Paar A (lang, metazentrisch) und Paar B (kurz, submetazentrisch),
 * je ein Chromosom von der Mutter (m, grün) und vom Vater (p, sand).
 *
 * Chromatiden-Reihenfolge (immer 8): 0/1 = A mütterlich, 2/3 = A väterlich, 4/5 = B mütterlich, 6/7 = B väterlich.
 * Winkel im Uhrzeigersinn ab „oben“, wie bei SVG rotate().
 */

export type Ell = { cx: number; cy: number; rx: number; ry: number }
export type Nuc = { cx: number; cy: number; r: number; op: number }
export type Pole = { x: number; y: number; op: number }
export type Line = { x1: number; y1: number; x2: number; y2: number; op: number }
/** Chromatide: Zentromer (x, y), Arm-Winkel a1/a2, Größe s, Deckkraft op, Spindelpol */
export type Cht = { x: number; y: number; a1: number; a2: number; op: number; s: number; pole: number }
export type Label = { x: number; y: number; t: string; anchor?: 'start' | 'middle' | 'end' }

export interface Frame {
  cells: Ell[]
  nuclei: Nuc[]
  poles: Pole[]
  plates: Line[]
  ch: Cht[]
  chromatin: number
  fiber: number
  /** Crossing-over schon passiert */
  swap: boolean
  chiasma?: boolean
  labels?: Label[]
}

export interface Counts {
  cells: string
  set: string
  chr: number
  cpc: string
  dna: string
}

export interface Phase {
  id: string
  name: string
  points: string[]
  counts: Counts
  frame: Frame
}

/** Armlängen je Chromatide: [oberer Arm, unterer Arm] */
export const ARMS: [number, number][] = [
  [24, 24], [24, 24], [24, 24], [24, 24],
  [11, 19], [11, 19], [11, 19], [11, 19],
]
export const ORIGIN = ['m', 'm', 'p', 'p', 'm', 'm', 'p', 'p'] as const
/** Crossing-over: Endstück des unteren Arms (Index → neue Herkunft) */
export const CROSS: Record<number, 'm' | 'p'> = { 1: 'p', 2: 'm', 5: 'p', 6: 'm' }

const W = 220
const H = 150
const ONE: Ell = { cx: W, cy: H, rx: 170, ry: 118 }
const rad = (d: number) => (d * Math.PI) / 180

/* ---------------------------- Bausteine ---------------------------- */

/** Zwei-Chromatid-Chromosom (Index der linken Schwester i, rechte i+1) */
function chrom(i: number, x: number, y: number, rot: number, o: { b?: number; gap?: number; op?: number; s?: number; poles?: [number, number] } = {}): [number, Cht][] {
  const { b = 9, gap = 3.6, op = 1, s = 1, poles = [-1, -1] } = o
  const dx = gap * s * Math.cos(rad(rot))
  const dy = gap * s * Math.sin(rad(rot))
  return [
    [i, { x: x - dx, y: y - dy, a1: rot - b, a2: rot + 180 + b, op, s, pole: poles[0] }],
    [i + 1, { x: x + dx, y: y + dy, a1: rot + b, a2: rot + 180 - b, op, s, pole: poles[1] }],
  ]
}

/** einzelne Chromatide, die zum Pol gezogen wird (Arme schleifen hinterher) */
function pulled(i: number, x: number, y: number, dir: 'L' | 'R' | 'U' | 'D', pole: number, o: { v?: number; op?: number; s?: number } = {}): [number, Cht] {
  const { v = 30, op = 1, s = 1 } = o
  const a = { L: [90 - v, 90 + v], R: [-90 + v, 270 - v], U: [180 - v, 180 + v], D: [v, 360 - v] }[dir]
  return [i, { x, y, a1: a[0], a2: a[1], op, s, pole }]
}

/** Bivalent: homologe Chromosomen nebeneinander (i = mütterlich, j = väterlich) */
function bivalent(i: number, j: number, x: number, y: number, rot: number, o: { op?: number; s?: number; poles?: [number, number] } = {}): [number, Cht][] {
  const d = 7.6 * (o.s ?? 1)
  const px = d * Math.cos(rad(rot))
  const py = d * Math.sin(rad(rot))
  const [pi, pj] = o.poles ?? [-1, -1]
  return [...chrom(i, x - px, y - py, rot, { b: 4, op: o.op, s: o.s, poles: [pi, pi] }), ...chrom(j, x + px, y + py, rot, { b: 4, op: o.op, s: o.s, poles: [pj, pj] })]
}

function ch(list: [number, Cht][]): Cht[] {
  const out: Cht[] = []
  for (const [i, c] of list) out[i] = c
  return out
}

const hide = (list: [number, Cht][]) => list.map(([i, c]) => [i, { ...c, op: 0 }] as [number, Cht])

const poles2 = (a: [number, number], b: [number, number], op = 1): Pole[] => [
  { x: a[0], y: a[1], op },
  { x: b[0], y: b[1], op },
]

const noLine: Line = { x1: W, y1: 40, x2: W, y2: 260, op: 0 }
const vPlate = (op: number): Line => ({ x1: W, y1: 44, x2: W, y2: 256, op })

/* ---------------------------- Mitose ---------------------------- */

const proChromosomes: [number, Cht][] = [
  ...chrom(0, 196, 128, -30),
  ...chrom(2, 248, 168, 40),
  ...chrom(4, 242, 118, 70),
  ...chrom(6, 190, 178, -12),
]

const metaY = { A_m: 80, B_m: 124, A_p: 170, B_p: 216 }
const metaMitose: [number, Cht][] = [
  ...chrom(0, W, metaY.A_m, 0, { poles: [0, 1] }),
  ...chrom(4, W, metaY.B_m, 0, { poles: [0, 1] }),
  ...chrom(2, W, metaY.A_p, 0, { poles: [0, 1] }),
  ...chrom(6, W, metaY.B_p, 0, { poles: [0, 1] }),
]

function anaMitose(xL: number, xR: number, k: number, o: { v?: number; op?: number; s?: number; pole?: boolean } = {}): [number, Cht][] {
  const ys = [metaY.A_m, metaY.A_m, metaY.A_p, metaY.A_p, metaY.B_m, metaY.B_m, metaY.B_p, metaY.B_p]
  return ys.map((y, i) => {
    const left = i % 2 === 0
    return pulled(i, left ? xL : xR, H + (y - H) * k, left ? 'L' : 'R', o.pole === false ? -1 : left ? 0 : 1, o)
  })
}

export const MITOSE: Phase[] = [
  {
    id: 'interphase',
    name: 'Interphase',
    points: ['Chromosomen liegen entspiralisiert als Chromatin im Zellkern.', 'In der S-Phase wird die DNA verdoppelt – danach hat jedes Chromosom zwei Chromatiden.', 'Das Zentrosom verdoppelt sich.'],
    counts: { cells: '1', set: '2n', chr: 4, cpc: '2 (nach der S-Phase)', dna: '4C' },
    frame: {
      cells: [ONE, ONE],
      nuclei: [{ cx: W, cy: H, r: 64, op: 1 }, { cx: W, cy: H, r: 64, op: 0 }],
      poles: poles2([206, 70], [234, 70], 0.9),
      plates: [noLine],
      ch: ch(hide(proChromosomes)),
      chromatin: 1,
      fiber: 0,
      swap: false,
      labels: [{ x: 290, y: 104, t: 'Zellkern mit Chromatin', anchor: 'start' }, { x: 250, y: 62, t: 'Zentrosomen', anchor: 'start' }],
    },
  },
  {
    id: 'prophase',
    name: 'Prophase',
    points: ['Chromosomen spiralisieren sich und werden sichtbar – je zwei Schwesterchromatiden am Zentromer.', 'Die Zentrosomen wandern zu den Polen, der Spindelapparat entsteht.', 'Kernhülle und Kernkörperchen lösen sich auf.'],
    counts: { cells: '1', set: '2n', chr: 4, cpc: '2', dna: '4C' },
    frame: {
      cells: [ONE, ONE],
      nuclei: [{ cx: W, cy: H, r: 66, op: 0.45 }, { cx: W, cy: H, r: 66, op: 0 }],
      poles: poles2([128, 82], [312, 82]),
      plates: [noLine],
      ch: ch(proChromosomes),
      chromatin: 0.15,
      fiber: 0.25,
      swap: false,
      labels: [{ x: 300, y: 196, t: 'Kernhülle zerfällt', anchor: 'start' }],
    },
  },
  {
    id: 'metaphase',
    name: 'Metaphase',
    points: ['Spindelfasern setzen an den Zentromeren an.', 'Alle Chromosomen liegen in der Äquatorialebene.', 'Die Chromosomen sind am stärksten verdichtet.'],
    counts: { cells: '1', set: '2n', chr: 4, cpc: '2', dna: '4C' },
    frame: {
      cells: [ONE, ONE],
      nuclei: [{ cx: W, cy: H, r: 70, op: 0 }, { cx: W, cy: H, r: 70, op: 0 }],
      poles: poles2([70, H], [370, H]),
      plates: [vPlate(0.9)],
      ch: ch(metaMitose),
      chromatin: 0,
      fiber: 1,
      swap: false,
      labels: [{ x: W, y: 30, t: 'Äquatorialebene' }, { x: 70, y: 128, t: 'Spindelpol' }, { x: 132, y: 96, t: 'Spindelfaser', anchor: 'middle' }],
    },
  },
  {
    id: 'anaphase',
    name: 'Anaphase',
    points: ['Die Schwesterchromatiden werden am Zentromer getrennt.', 'Die Spindelfasern verkürzen sich und ziehen je eine Chromatide zu jedem Pol.', 'Ab jetzt zählt jede Chromatide als eigenes Chromosom.'],
    counts: { cells: '1', set: '2 × 2n', chr: 8, cpc: '1', dna: '4C' },
    frame: {
      cells: [{ cx: W, cy: H, rx: 184, ry: 108 }, { cx: W, cy: H, rx: 184, ry: 108 }],
      nuclei: [{ cx: W, cy: H, r: 70, op: 0 }, { cx: W, cy: H, r: 70, op: 0 }],
      poles: poles2([52, H], [388, H]),
      plates: [vPlate(0.25)],
      ch: ch(anaMitose(132, 308, 0.82)),
      chromatin: 0,
      fiber: 1,
      swap: false,
    },
  },
  {
    id: 'telophase',
    name: 'Telophase',
    points: ['An jedem Pol liegt ein vollständiger Chromosomensatz.', 'Die Chromosomen entspiralisieren sich, neue Kernhüllen entstehen.', 'Der Spindelapparat wird abgebaut, die Zelle schnürt sich ein.'],
    counts: { cells: '1 (2 Kerne)', set: '2 × 2n', chr: 8, cpc: '1', dna: '2 × 2C' },
    frame: {
      cells: [{ cx: 154, cy: H, rx: 128, ry: 104 }, { cx: 286, cy: H, rx: 128, ry: 104 }],
      nuclei: [{ cx: 108, cy: H, r: 50, op: 0.7 }, { cx: 332, cy: H, r: 50, op: 0.7 }],
      poles: poles2([44, H], [396, H], 0.45),
      plates: [noLine],
      ch: ch(anaMitose(112, 328, 0.55, { v: 12, op: 0.55, s: 0.8 })),
      chromatin: 0.5,
      fiber: 0.2,
      swap: false,
      labels: [{ x: W, y: 34, t: 'Teilungsfurche' }],
    },
  },
  {
    id: 'cytokinese',
    name: 'Cytokinese',
    points: ['Tierzelle: Die Zellmembran schnürt sich durch (Teilungsfurche).', 'Pflanzenzelle: Eine Zellplatte bildet die neue Zellwand.', 'Ergebnis: zwei genetisch identische Tochterzellen mit 2n.'],
    counts: { cells: '2', set: '2n', chr: 4, cpc: '1', dna: '2C je Zelle' },
    frame: {
      cells: [{ cx: 116, cy: H, rx: 102, ry: 98 }, { cx: 324, cy: H, rx: 102, ry: 98 }],
      nuclei: [{ cx: 116, cy: H, r: 46, op: 1 }, { cx: 324, cy: H, r: 46, op: 1 }],
      poles: poles2([116, 74], [324, 74], 0.9),
      plates: [noLine],
      ch: ch(anaMitose(116, 324, 0.45, { v: 6, op: 0, s: 0.7, pole: false })),
      chromatin: 1,
      fiber: 0,
      swap: false,
      labels: [{ x: 116, y: 268, t: 'Tochterzelle 2n' }, { x: 324, y: 268, t: 'Tochterzelle 2n' }],
    },
  },
]

/* ---------------------------- Meiose ---------------------------- */

const ONE4 = [ONE, ONE, ONE, ONE]
const poles4 = (l: [number, number], r: [number, number], op = 1): Pole[] => [
  { x: l[0], y: l[1], op },
  { x: l[0], y: l[1], op },
  { x: r[0], y: r[1], op },
  { x: r[0], y: r[1], op },
]
const nuc4 = (n: Nuc[]): Nuc[] => n

const proI: [number, Cht][] = [...bivalent(0, 2, 192, 126, 22, { s: 1.45 }), ...bivalent(4, 6, 256, 178, -38, { s: 1.45 })]

/** Metaphase I: A mütterlich links, B väterlich links (zufällige Verteilung) */
const metaI: [number, Cht][] = [
  ...chrom(0, W - 12, 100, 0, { b: 5, poles: [0, 0] }),
  ...chrom(2, W + 12, 100, 0, { b: 5, poles: [2, 2] }),
  ...chrom(6, W - 12, 198, 0, { b: 5, poles: [0, 0] }),
  ...chrom(4, W + 12, 198, 0, { b: 5, poles: [2, 2] }),
]

function anaI(xL: number, xR: number, yA: number, yB: number, o: { b?: number; op?: number; s?: number; pole?: boolean } = {}): [number, Cht][] {
  const p = (n: number) => (o.pole === false ? -1 : n)
  const b = o.b ?? 16
  return [
    ...chrom(0, xL, yA, 0, { b, op: o.op, s: o.s, poles: [p(0), p(0)] }),
    ...chrom(2, xR, yA, 0, { b, op: o.op, s: o.s, poles: [p(2), p(2)] }),
    ...chrom(6, xL, yB, 0, { b, op: o.op, s: o.s, poles: [p(0), p(0)] }),
    ...chrom(4, xR, yB, 0, { b, op: o.op, s: o.s, poles: [p(2), p(2)] }),
  ]
}

const L = 118
const R = 322
const metaII: [number, Cht][] = [
  ...chrom(0, L - 22, H, 90, { poles: [0, 1] }),
  ...chrom(6, L + 26, H, 90, { poles: [0, 1] }),
  ...chrom(2, R - 22, H, 90, { poles: [2, 3] }),
  ...chrom(4, R + 26, H, 90, { poles: [2, 3] }),
]

function anaII(yU: number, yD: number, o: { v?: number; op?: number; s?: number; dx?: number } = {}): [number, Cht][] {
  const dx = o.dx ?? 1
  // obere Schwester (gerader Index) nach oben, untere nach unten
  const spot: [number, number, 0 | 1 | 2 | 3][] = [
    [0, L - 22 * dx, 0], [1, L - 22 * dx, 1],
    [6, L + 26 * dx, 0], [7, L + 26 * dx, 1],
    [2, R - 22 * dx, 2], [3, R - 22 * dx, 3],
    [4, R + 26 * dx, 2], [5, R + 26 * dx, 3],
  ]
  return spot.map(([i, x, pole]) => pulled(i, x, pole % 2 === 0 ? yU : yD, pole % 2 === 0 ? 'U' : 'D', pole, o))
}

const quarterCells = (cy: number, ry: number): Ell[] => [
  { cx: L, cy: H - cy, rx: 92, ry },
  { cx: L, cy: H + cy, rx: 92, ry },
  { cx: R, cy: H - cy, rx: 92, ry },
  { cx: R, cy: H + cy, rx: 92, ry },
]

export const MEIOSE: Phase[] = [
  {
    id: 'interphase',
    name: 'Interphase',
    points: ['Die DNA wurde in der S-Phase verdoppelt.', 'Jedes Chromosom gibt es zweimal: von der Mutter (grün) und vom Vater (sand) – homologe Chromosomen.'],
    counts: { cells: '1', set: '2n', chr: 4, cpc: '2 (nach der S-Phase)', dna: '4C' },
    frame: {
      cells: ONE4,
      nuclei: nuc4([{ cx: W, cy: H, r: 64, op: 1 }, { cx: W, cy: H, r: 64, op: 0 }, { cx: W, cy: H, r: 64, op: 0 }, { cx: W, cy: H, r: 64, op: 0 }]),
      poles: poles4([206, 70], [234, 70], 0.9),
      plates: [noLine, noLine],
      ch: ch(hide(proI)),
      chromatin: 1,
      fiber: 0,
      swap: false,
    },
  },
  {
    id: 'prophase1',
    name: 'Prophase I',
    points: ['Die Chromosomen spiralisieren sich.', 'Homologe Chromosomen legen sich genau aneinander (Paarung): Es entstehen Bivalente (Tetraden) aus vier Chromatiden.', 'Spindelapparat entsteht, die Kernhülle zerfällt.'],
    counts: { cells: '1', set: '2n', chr: 4, cpc: '2', dna: '4C' },
    frame: {
      cells: ONE4,
      nuclei: nuc4([{ cx: W, cy: H, r: 68, op: 0.45 }, { cx: W, cy: H, r: 68, op: 0 }, { cx: W, cy: H, r: 68, op: 0 }, { cx: W, cy: H, r: 68, op: 0 }]),
      poles: poles4([128, 82], [312, 82]),
      plates: [noLine, noLine],
      ch: ch(proI),
      chromatin: 0.15,
      fiber: 0.2,
      swap: false,
      labels: [{ x: 304, y: 226, t: 'Bivalent (Tetrade)', anchor: 'start' }],
    },
  },
  {
    id: 'crossing-over',
    name: 'Crossing-over',
    points: ['Nicht-Schwesterchromatiden überkreuzen sich an Chiasmata.', 'Dabei werden Abschnitte ausgetauscht – neue Allelkombinationen auf einem Chromosom.'],
    counts: { cells: '1', set: '2n', chr: 4, cpc: '2', dna: '4C' },
    frame: {
      cells: ONE4,
      nuclei: nuc4([{ cx: W, cy: H, r: 68, op: 0.3 }, { cx: W, cy: H, r: 68, op: 0 }, { cx: W, cy: H, r: 68, op: 0 }, { cx: W, cy: H, r: 68, op: 0 }]),
      poles: poles4([110, 96], [330, 96]),
      plates: [noLine, noLine],
      ch: ch(proI),
      chromatin: 0,
      fiber: 0.3,
      swap: true,
      chiasma: true,
      labels: [{ x: 304, y: 226, t: 'Chiasma (Überkreuzung)', anchor: 'start' }],
    },
  },
  {
    id: 'metaphase1',
    name: 'Metaphase I',
    points: ['Die homologen Paare liegen in der Äquatorialebene.', 'Welches Chromosom eines Paars zu welchem Pol zeigt, ist Zufall – hier liegt A mütterlich links, B väterlich links.'],
    counts: { cells: '1', set: '2n', chr: 4, cpc: '2', dna: '4C' },
    frame: {
      cells: ONE4,
      nuclei: nuc4([{ cx: W, cy: H, r: 70, op: 0 }, { cx: W, cy: H, r: 70, op: 0 }, { cx: W, cy: H, r: 70, op: 0 }, { cx: W, cy: H, r: 70, op: 0 }]),
      poles: poles4([70, H], [370, H]),
      plates: [vPlate(0.9), vPlate(0)],
      ch: ch(metaI),
      chromatin: 0,
      fiber: 1,
      swap: true,
      labels: [{ x: W, y: 30, t: 'Äquatorialebene' }],
    },
  },
  {
    id: 'anaphase1',
    name: 'Anaphase I',
    points: ['Die homologen Chromosomen werden getrennt – nicht die Chromatiden.', 'Jedes Chromosom besteht weiter aus zwei Chromatiden.'],
    counts: { cells: '1', set: '2 × n', chr: 4, cpc: '2', dna: '4C' },
    frame: {
      cells: [0, 1, 2, 3].map(() => ({ cx: W, cy: H, rx: 184, ry: 108 })),
      nuclei: nuc4([0, 1, 2, 3].map(() => ({ cx: W, cy: H, r: 70, op: 0 }))),
      poles: poles4([52, H], [388, H]),
      plates: [vPlate(0.25), vPlate(0)],
      ch: ch(anaI(136, 304, 112, 188)),
      chromatin: 0,
      fiber: 1,
      swap: true,
    },
  },
  {
    id: 'telophase1',
    name: 'Telophase I',
    points: ['Zwei Zellen mit je einem einfachen Chromosomensatz (n).', 'Reduktionsteilung: Die Chromosomenzahl ist halbiert, jedes Chromosom hat noch zwei Chromatiden.'],
    counts: { cells: '2', set: 'n', chr: 2, cpc: '2', dna: '2C je Zelle' },
    frame: {
      cells: [
        { cx: 152, cy: H, rx: 128, ry: 108 },
        { cx: 152, cy: H, rx: 128, ry: 108 },
        { cx: 288, cy: H, rx: 128, ry: 108 },
        { cx: 288, cy: H, rx: 128, ry: 108 },
      ],
      nuclei: nuc4([
        { cx: 116, cy: H, r: 48, op: 0.45 },
        { cx: 116, cy: H, r: 48, op: 0 },
        { cx: 324, cy: H, r: 48, op: 0.45 },
        { cx: 324, cy: H, r: 48, op: 0 },
      ]),
      poles: poles4([44, H], [396, H], 0.4),
      plates: [noLine, noLine],
      ch: ch(anaI(116, 324, 132, 172, { b: 9, s: 0.85 })),
      chromatin: 0,
      fiber: 0.2,
      swap: true,
      labels: [{ x: 116, y: 222, t: 'n' }, { x: 324, y: 222, t: 'n' }],
    },
  },
  {
    id: 'metaphase2',
    name: 'Metaphase II',
    points: ['Vor der Meiose II wird die DNA nicht verdoppelt.', 'In beiden Zellen ordnen sich die Chromosomen in der Äquatorialebene an.'],
    counts: { cells: '2', set: 'n', chr: 2, cpc: '2', dna: '2C je Zelle' },
    frame: {
      cells: [
        { cx: L, cy: H, rx: 98, ry: 124 },
        { cx: L, cy: H, rx: 98, ry: 124 },
        { cx: R, cy: H, rx: 98, ry: 124 },
        { cx: R, cy: H, rx: 98, ry: 124 },
      ],
      nuclei: nuc4([L, L, R, R].map((cx) => ({ cx, cy: H, r: 44, op: 0 }))),
      poles: [
        { x: L, y: 40, op: 1 },
        { x: L, y: 260, op: 1 },
        { x: R, y: 40, op: 1 },
        { x: R, y: 260, op: 1 },
      ],
      plates: [
        { x1: 34, y1: H, x2: 202, y2: H, op: 0.9 },
        { x1: 238, y1: H, x2: 406, y2: H, op: 0.9 },
      ],
      ch: ch(metaII),
      chromatin: 0,
      fiber: 1,
      swap: true,
    },
  },
  {
    id: 'anaphase2',
    name: 'Anaphase II',
    points: ['Jetzt werden die Schwesterchromatiden getrennt – wie bei der Mitose.', 'Durch das Crossing-over sind die Schwesterchromatiden nicht mehr gleich.'],
    counts: { cells: '2', set: '2 × n', chr: 4, cpc: '1', dna: '2C je Zelle' },
    frame: {
      cells: [
        { cx: L, cy: H, rx: 92, ry: 134 },
        { cx: L, cy: H, rx: 92, ry: 134 },
        { cx: R, cy: H, rx: 92, ry: 134 },
        { cx: R, cy: H, rx: 92, ry: 134 },
      ],
      nuclei: nuc4([L, L, R, R].map((cx) => ({ cx, cy: H, r: 44, op: 0 }))),
      poles: [
        { x: L, y: 22, op: 1 },
        { x: L, y: 278, op: 1 },
        { x: R, y: 22, op: 1 },
        { x: R, y: 278, op: 1 },
      ],
      plates: [
        { x1: 34, y1: H, x2: 202, y2: H, op: 0.25 },
        { x1: 238, y1: H, x2: 406, y2: H, op: 0.25 },
      ],
      ch: ch(anaII(92, 208)),
      chromatin: 0,
      fiber: 1,
      swap: true,
    },
  },
  {
    id: 'ergebnis',
    name: 'Telophase II · Ergebnis',
    points: ['Vier haploide Keimzellen (n) mit je einer Chromatide pro Chromosom.', 'Alle vier sind genetisch verschieden.', 'Beim Menschen gibt es allein durch die zufällige Verteilung 2²³ ≈ 8,4 Millionen Kombinationen.'],
    counts: { cells: '4', set: 'n', chr: 2, cpc: '1', dna: '1C je Zelle' },
    frame: {
      cells: quarterCells(68, 66),
      nuclei: [
        { cx: L, cy: H - 68, r: 42, op: 1 },
        { cx: L, cy: H + 68, r: 42, op: 1 },
        { cx: R, cy: H - 68, r: 42, op: 1 },
        { cx: R, cy: H + 68, r: 42, op: 1 },
      ],
      poles: [
        { x: L, y: 22, op: 0 },
        { x: L, y: 278, op: 0 },
        { x: R, y: 22, op: 0 },
        { x: R, y: 278, op: 0 },
      ],
      plates: [
        { x1: 34, y1: H, x2: 202, y2: H, op: 0 },
        { x1: 238, y1: H, x2: 406, y2: H, op: 0 },
      ],
      ch: ch(anaII(H - 68, H + 68, { v: 14, s: 0.78, dx: 0.7 })).map((c) => ({ ...c, pole: -1 })),
      chromatin: 0,
      fiber: 0,
      swap: true,
      labels: [{ x: 214, y: 14, t: 'vier Keimzellen, n' }],
    },
  },
]

/* ---------------------------- Interpolation ---------------------------- */

const lerp = (a: number, b: number, p: number) => a + (b - a) * p

function mix<T extends Record<string, number>>(a: T, b: T, p: number): T {
  const out = {} as Record<string, number>
  for (const k in a) out[k] = lerp(a[k], b[k] ?? a[k], p)
  return out as T
}

export function frameAt(phases: Phase[], t: number): Frame {
  const i = Math.max(0, Math.min(phases.length - 1, Math.floor(t)))
  const j = Math.min(phases.length - 1, i + 1)
  const p = Math.max(0, Math.min(1, t - i))
  const A = phases[i].frame
  const B = phases[j].frame
  const near = p < 0.5 ? A : B
  return {
    cells: A.cells.map((c, k) => mix(c, B.cells[k], p)),
    nuclei: A.nuclei.map((c, k) => mix(c, B.nuclei[k], p)),
    poles: A.poles.map((c, k) => mix(c, B.poles[k], p)),
    plates: A.plates.map((c, k) => mix(c, B.plates[k] ?? c, p)),
    ch: A.ch.map((c, k) => {
      const d = B.ch[k]
      return { x: lerp(c.x, d.x, p), y: lerp(c.y, d.y, p), a1: lerp(c.a1, d.a1, p), a2: lerp(c.a2, d.a2, p), op: lerp(c.op, d.op, p), s: lerp(c.s, d.s, p), pole: near.ch[k].pole }
    }),
    chromatin: lerp(A.chromatin, B.chromatin, p),
    fiber: lerp(A.fiber * 1, B.fiber, p),
    swap: near.swap,
    chiasma: near.chiasma,
    labels: near.labels,
  }
}

/* ---------------------------- Zellzyklus ---------------------------- */

export const CYCLE = [
  { id: 'G1', name: 'G1-Phase', h: 11, dna: '2C', text: 'Wachstum der Zelle, Bildung von Organellen und Proteinen. Jedes Chromosom hat eine Chromatide.' },
  { id: 'S', name: 'S-Phase', h: 8, dna: '2C → 4C', text: 'Synthese: Die DNA wird verdoppelt (Replikation). Danach hat jedes Chromosom zwei identische Chromatiden.' },
  { id: 'G2', name: 'G2-Phase', h: 4, dna: '4C', text: 'Vorbereitung der Teilung: weiteres Wachstum, Kontrolle der verdoppelten DNA.' },
  { id: 'M', name: 'Mitose', h: 1, dna: '4C → 2C', text: 'Kernteilung (Pro-, Meta-, Ana-, Telophase) und Zellteilung (Cytokinese).' },
] as const

/* ---------------------------- Vergleich ---------------------------- */

export const COMPARE: [string, string, string][] = [
  ['Aufgabe', 'Wachstum, Erneuerung, Wundheilung', 'Bildung von Keimzellen'],
  ['Ort', 'Körperzellen', 'Keimdrüsen (Hoden, Eierstöcke)'],
  ['Teilungen', '1', '2 (Meiose I und II)'],
  ['Tochterzellen', '2', '4'],
  ['Chromosomensatz', '2n → 2n', '2n → n'],
  ['Erbgut der Tochterzellen', 'identisch', 'verschieden'],
  ['Paarung der Homologen', 'nein', 'ja, Prophase I'],
  ['Crossing-over', 'nein', 'ja, Prophase I'],
  ['Getrennt werden', 'Schwesterchromatiden', 'erst homologe Chromosomen, dann Schwesterchromatiden'],
  ['Mensch', '46 → 46', '46 → 23'],
]

/* ---------------------------- Quiz ---------------------------- */

export const FACTS: { q: string; o: string[] }[] = [
  { q: 'In welcher Phase wird die DNA verdoppelt?', o: ['S-Phase', 'G1-Phase', 'G2-Phase', 'Metaphase'] },
  { q: 'Wann werden homologe Chromosomen getrennt?', o: ['Anaphase I', 'Anaphase II', 'Anaphase der Mitose', 'Prophase I'] },
  { q: 'Wie viele Chromosomen hat eine menschliche Keimzelle?', o: ['23', '46', '92', '22'] },
  { q: 'Wann findet das Crossing-over statt?', o: ['Prophase I', 'Metaphase I', 'Prophase II', 'Interphase'] },
  { q: 'Was entsteht bei der Mitose?', o: ['2 genetisch identische Zellen (2n)', '4 verschiedene Zellen (n)', '2 Zellen mit n', '4 identische Zellen (2n)'] },
  { q: 'Welcher DNA-Gehalt liegt in der G2-Phase vor?', o: ['4C', '2C', '1C', '8C'] },
  { q: 'Wo setzen die Spindelfasern an?', o: ['am Zentromer (Kinetochor)', 'an den Chromosomenenden', 'an der Kernhülle', 'am Kernkörperchen'] },
  { q: 'Wie wird eine Pflanzenzelle bei der Cytokinese geteilt?', o: ['durch eine Zellplatte', 'durch Einschnürung', 'durch Knospung', 'gar nicht'] },
  { q: 'Was ist ein Bivalent (Tetrade)?', o: ['zwei gepaarte homologe Chromosomen mit vier Chromatiden', 'ein Chromosom mit zwei Chromatiden', 'die vier Zellen nach der Meiose', 'zwei Zentrosomen'] },
  { q: 'Welche Teilung ist die Reduktionsteilung?', o: ['Meiose I', 'Meiose II', 'Mitose', 'Cytokinese'] },
  { q: 'Wie viele Chromosomen hat eine menschliche Zelle in der Anaphase der Mitose?', o: ['92', '46', '23', '69'] },
  { q: 'Was wird in der Anaphase II getrennt?', o: ['Schwesterchromatiden', 'homologe Chromosomen', 'Zellkerne', 'Zentrosomen'] },
]
