import { useId, useMemo } from 'react'
import { mulberry32 } from '../lib/random'
import {
  Chloro2D,
  Defs,
  DiagramProvider,
  FreeRibosomes2D,
  Golgi2D,
  Labels2D,
  Mito2D,
  Nucleus2D,
  O,
  Perox2D,
  RoughER2D,
  SmoothER2D,
  Vesicles2D,
  scatter,
  smoothClosed,
  smoothOpen,
  type Diagram2DProps,
  type Label2DSpec,
  type Pt,
  diagramClass,
} from './shapes'
import { P } from '../data/palette'

const WALL = { x0: 190, y0: 110, x1: 1010, y1: 690, t: 24 }
const MEM = { x0: 220, y0: 140, x1: 980, y1: 660 }
const VAC = { cx: 662, cy: 402, a: 268, b: 196, n: 5 }
const NUC = { x: 300, y: 400, r: 70 }

const CHLOROS = [
  { x: 432, y: 172, rot: -4, len: 90, wid: 36 },
  { x: 540, y: 170, rot: 3, len: 88, wid: 36 },
  { x: 650, y: 173, rot: -2, len: 92, wid: 36 },
  { x: 762, y: 170, rot: 4, len: 88, wid: 36 },
  { x: 868, y: 174, rot: -3, len: 86, wid: 35 },
  { x: 955, y: 285, rot: 88, len: 84, wid: 34 },
  { x: 955, y: 410, rot: 92, len: 88, wid: 34 },
  { x: 955, y: 530, rot: 86, len: 80, wid: 34 },
  { x: 452, y: 630, rot: 3, len: 90, wid: 36 },
  { x: 580, y: 632, rot: -3, len: 86, wid: 35 },
  { x: 838, y: 630, rot: 2, len: 90, wid: 36 },
]
const MITOS = [
  { x: 708, y: 634, rot: 4, len: 70, wid: 30, seed: 7 },
  { x: 948, y: 186, rot: 62, len: 58, wid: 27, seed: 8 },
  { x: 246, y: 520, rot: 86, len: 62, wid: 28, seed: 9 },
  { x: 360, y: 300, rot: -60, len: 56, wid: 26, seed: 10 },
]
const PEROX = [
  { x: 486, y: 200, r: 10 },
  { x: 518, y: 612, r: 10 },
  { x: 942, y: 470, r: 10 },
]
const VESICLES: [number, number, number][] = [
  [238, 176, 6],
  [370, 176, 6.5],
  [262, 640, 6],
  [375, 560, 5.5],
]
const SER_PATHS: Pt[][] = [
  [
    [300, 506],
    [330, 528],
    [364, 520],
    [378, 540],
  ],
  [
    [330, 528],
    [320, 560],
    [338, 578],
  ],
]
const PLASMODESMATA: { x: number; y: number; vertical: boolean }[] = [
  ...[346, 364, 382].map((x) => ({ x, y: WALL.y0, vertical: true })),
  ...[700, 718].map((x) => ({ x, y: WALL.y1 - WALL.t, vertical: true })),
  ...[436, 454, 472].map((y) => ({ x: WALL.x0, y, vertical: false })),
  ...[330, 348].map((y) => ({ x: WALL.x1 - WALL.t, y, vertical: false })),
]

function superellipse(cx: number, cy: number, a: number, b: number, n: number, count: number, rng: () => number): Pt[] {
  const pts: Pt[] = []
  const ph = rng() * 6
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const w = 1 + 0.018 * Math.sin(t * 4 + ph)
    pts.push([cx + a * w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), cy + b * w * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)])
  }
  return pts
}

function insideVacuole(x: number, y: number, pad = 0) {
  const dx = Math.abs(x - VAC.cx) / (VAC.a + pad)
  const dy = Math.abs(y - VAC.cy) / (VAC.b + pad)
  return Math.pow(dx, VAC.n) + Math.pow(dy, VAC.n) < 1
}

const polar = (deg: number, rr: number): [number, number] => [NUC.x + rr * Math.cos((deg * Math.PI) / 180), NUC.y + rr * Math.sin((deg * Math.PI) / 180)]

export const PLANT_LABELS: Label2DSpec[] = [
  { id: 'golgi', a: [292, 234], t: [150, 110] },
  { id: 'zellwand', a: [WALL.x0 + 10, 250], t: [150, 165] },
  { id: 'raues-er', a: [NUC.x - 40, NUC.y - 88], t: [150, 220] },
  { id: 'kernhuelle', a: polar(210, NUC.r), t: [150, 275] },
  { id: 'kernporen', a: polar(186, NUC.r - 4), t: [150, 330] },
  { id: 'nucleolus', a: [NUC.x - NUC.r * 0.22, NUC.y - NUC.r * 0.12], t: [150, 385] },
  { id: 'chromatin', a: polar(146, NUC.r - 18), t: [150, 440] },
  { id: 'zellkern', a: [NUC.x - 14, NUC.y + 44], t: [150, 495] },
  { id: 'plasmodesmen', a: [WALL.x0 + 12, 472], t: [150, 550] },
  { id: 'mitochondrium', a: [246, 520], t: [150, 605] },
  { id: 'glattes-er', a: [330, 528], t: [150, 660] },
  { id: 'peroxisom', a: [486, 200], t: [520, 50] },
  { id: 'chloroplast', a: [650, 173], t: [680, 50] },
  { id: 'zellmembran', a: [870, MEM.y0], t: [860, 50] },
  { id: 'vakuole', a: [860, 330], t: [1050, 240] },
  { id: 'cytoskelett', a: [932, 400], t: [1050, 340] },
  { id: 'cytoplasma', a: [955, 600], t: [1050, 600] },
  { id: 'ribosomen', a: [398, 612], t: [440, 760] },
  { id: 'vesikel', a: [375, 560], t: [590, 760] },
]

export default function PlantCell2D(props: Diagram2DProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const data = useMemo(() => {
    const rng = mulberry32(31)
    const vacuole = smoothClosed(superellipse(VAC.cx, VAC.cy, VAC.a, VAC.b, VAC.n, 48, rng))
    const avoid: [number, number, number][] = [
      [NUC.x, NUC.y, 112],
      [300, 236, 44],
      [305, 600, 40],
      [340, 545, 40],
      ...CHLOROS.map((c) => [c.x, c.y, c.len / 2 + 4] as [number, number, number]),
      ...MITOS.map((m) => [m.x, m.y, m.len / 2 + 4] as [number, number, number]),
      ...PEROX.map((p) => [p.x, p.y, p.r + 6] as [number, number, number]),
    ]
    const ribos = scatter(
      rng,
      150,
      (x, y) => x > MEM.x0 + 10 && x < MEM.x1 - 10 && y > MEM.y0 + 10 && y < MEM.y1 - 10 && !insideVacuole(x, y, 10),
      avoid,
      [MEM.x0, MEM.y0, MEM.x1, MEM.y1],
    )
    // Aktin-Kabel (Plasmaströmung) im Cytoplasma entlang der Wand
    const actin: string[] = [
      smoothOpen([
        [240, 260],
        [236, 330],
        [250, 380],
      ]),
      smoothOpen([
        [380, 470],
        [376, 520],
        [390, 590],
      ]),
      smoothOpen([
        [420, 150],
        [560, 154],
        [700, 150],
        [860, 154],
      ]),
      smoothOpen([
        [932, 230],
        [936, 360],
        [930, 470],
        [934, 600],
      ]),
      smoothOpen([
        [420, 650],
        [560, 646],
        [760, 650],
        [900, 646],
      ]),
    ]
    // Corticale Mikrotubuli verlaufen quer zur Längsachse – im Längsschnitt als Punkte unter der Membran
    const cortical: Pt[] = []
    const inset = 9
    for (let x = MEM.x0 + 26; x <= MEM.x1 - 26; x += 17) {
      cortical.push([x, MEM.y0 + inset], [x, MEM.y1 - inset])
    }
    for (let y = MEM.y0 + 26; y <= MEM.y1 - 26; y += 17) {
      cortical.push([MEM.x0 + inset, y], [MEM.x1 - inset, y])
    }
    return { vacuole, ribos, actin, cortical }
  }, [])

  const compact = props.compact
  const W = WALL
  return (
    <DiagramProvider value={props}>
      <svg viewBox={compact ? '176 96 848 608' : '0 0 1200 800'} className={diagramClass(props)} role="img" aria-label="Schematische Darstellung einer Pflanzenzelle">
        <Defs uid={uid} />
        {/* Angrenzende Zellen (Gewebeverband) */}
        <g className="d2-neighbors" opacity={compact ? 0 : 0.45}>
          {[
            [W.x0 - 120, W.y0 - W.t / 2, 120, W.t],
            [W.x1, W.y0 - W.t / 2, 120, W.t],
            [W.x0 - 120, W.y1 - W.t / 2, 120, W.t],
            [W.x1, W.y1 - W.t / 2, 120, W.t],
            [W.x0 - W.t / 2, W.y0 - 90, W.t, 90],
            [W.x1 - W.t / 2, W.y0 - 90, W.t, 90],
            [W.x0 - W.t / 2, W.y1, W.t, 90],
            [W.x1 - W.t / 2, W.y1, W.t, 90],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill={`url(#${uid}-wall)`} />
          ))}
        </g>

        <O id="zellwand">
          <rect x={W.x0} y={W.y0} width={W.x1 - W.x0} height={W.y1 - W.y0} rx={26} fill={`url(#${uid}-wall)`} />
          <rect x={W.x0} y={W.y0} width={W.x1 - W.x0} height={W.y1 - W.y0} rx={26} fill={`url(#${uid}-fibrils)`} />
          {/* Mittellamelle (äußerste, pektinreiche Schicht) */}
          <rect x={W.x0 + 1.5} y={W.y0 + 1.5} width={W.x1 - W.x0 - 3} height={W.y1 - W.y0 - 3} rx={25} fill="none" stroke={P.wand.lamella} strokeWidth={3} />
          <rect x={W.x0 + W.t} y={W.y0 + W.t} width={W.x1 - W.x0 - 2 * W.t} height={W.y1 - W.y0 - 2 * W.t} rx={14} fill="none" stroke={P.wand.dark} strokeWidth={1} strokeOpacity={0.6} />
        </O>
        <O id="cytoplasma">
          <rect x={W.x0 + W.t} y={W.y0 + W.t} width={W.x1 - W.x0 - 2 * W.t} height={W.y1 - W.y0 - 2 * W.t} rx={14} fill={`url(#${uid}-cyto)`} />
        </O>
        <O id="plasmodesmen">
          {PLASMODESMATA.map((p, i) =>
            p.vertical ? (
              <g key={i}>
                <rect x={p.x - 4} y={p.y - 2} width={8} height={W.t + 4} rx={3} fill={P.cyto.light} stroke={P.membran.dark} strokeWidth={1.4} />
                <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + W.t} stroke={P.rer.dark} strokeWidth={1.4} />
              </g>
            ) : (
              <g key={i}>
                <rect x={p.x - 2} y={p.y - 4} width={W.t + 4} height={8} rx={3} fill={P.cyto.light} stroke={P.membran.dark} strokeWidth={1.4} />
                <line x1={p.x} y1={p.y} x2={p.x + W.t} y2={p.y} stroke={P.rer.dark} strokeWidth={1.4} />
              </g>
            ),
          )}
        </O>
        <O id="zellmembran">
          <rect x={MEM.x0 - 3} y={MEM.y0 - 3} width={MEM.x1 - MEM.x0 + 6} height={MEM.y1 - MEM.y0 + 6} rx={14} fill="none" stroke={P.membran.dark} strokeWidth={8.5} />
          <rect x={MEM.x0 - 3} y={MEM.y0 - 3} width={MEM.x1 - MEM.x0 + 6} height={MEM.y1 - MEM.y0 + 6} rx={14} fill="none" stroke={P.membran.base} strokeWidth={6.5} />
          <rect x={MEM.x0 - 3} y={MEM.y0 - 3} width={MEM.x1 - MEM.x0 + 6} height={MEM.y1 - MEM.y0 + 6} rx={14} fill="none" stroke={P.membran.tail} strokeWidth={2} />
        </O>
        <O id="cytoskelett">
          <g fill="none" stroke={P.skelett.mt} strokeWidth={1.4} strokeOpacity={0.6}>
            {data.actin.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g fill={P.skelett.mt}>
            {data.cortical.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={1.6} />
            ))}
          </g>
        </O>
        <O id="vakuole">
          <path d={data.vacuole} fill={`url(#${uid}-vac)`} />
          <path d={data.vacuole} fill="none" stroke={P.vakuole.dark} strokeWidth={4} />
          <path d={data.vacuole} fill="none" stroke={P.vakuole.light} strokeWidth={1.3} />
          <text x={VAC.cx} y={VAC.cy + 8} textAnchor="middle" className="d2-watermark">
            Zellsaft
          </text>
          <text x={VAC.cx} y={VAC.b + VAC.cy - 24} textAnchor="middle" className="d2-mini" fontSize={11} fill={P.vakuole.dark}>
            TONOPLAST
          </text>
        </O>
        <FreeRibosomes2D points={data.ribos} />
        <SmoothER2D paths={SER_PATHS} />
        <RoughER2D
          cx={NUC.x}
          cy={NUC.y}
          radii={[88, 104]}
          ranges={[
            [-2.3, -0.85],
            [0.85, 2.3],
          ]}
          seed={9}
        />
        <Nucleus2D cx={NUC.x} cy={NUC.y} r={NUC.r} seed={44} uid={uid} erBridges={[-60, 58]} />
        <Golgi2D x={300} y={236} rot={0} scale={0.52} labels={false} />
        <Golgi2D x={305} y={604} rot={180} scale={0.46} labels={false} />
        {CHLOROS.map((c, i) => (
          <Chloro2D key={i} {...c} seed={i + 1} />
        ))}
        {MITOS.map((m, i) => (
          <Mito2D key={i} {...m} />
        ))}
        {PEROX.map((p, i) => (
          <Perox2D key={i} {...p} />
        ))}
        <Vesicles2D items={VESICLES} />
        {!compact && <Labels2D specs={PLANT_LABELS} />}
      </svg>
    </DiagramProvider>
  )
}
