import { useId, useMemo } from 'react'
import { mulberry32 } from '../lib/random'
import { P } from '../data/palette'
import {
  Centrosome2D,
  Defs,
  DiagramProvider,
  FreeRibosomes2D,
  Golgi2D,
  Labels2D,
  Lyso2D,
  Mito2D,
  Nucleus2D,
  O,
  Perox2D,
  RoughER2D,
  SmoothER2D,
  Vesicles2D,
  blobPoints,
  diagramClass,
  scatter,
  smoothClosed,
  smoothOpen,
  type Diagram2DProps,
  type Label2DSpec,
  type Pt,
} from './shapes'

const CX = 600
const CY = 400
const RX = 385
const RY = 305
const NUC = { x: 575, y: 410, r: 118 }
const CENTRO = { x: 462, y: 312 }
const GOLGI = { x: 342, y: 222 }

const ER_RADII = [150, 172, 194, 216]
const ER_RANGES: [number, number][] = [
  [-0.78, 1.95],
  [-0.7, 2.0],
  [-0.62, 1.9],
  [-0.5, 1.78],
]

const MITOS = [
  { x: 820, y: 236, rot: 28, len: 118, seed: 1 },
  { x: 892, y: 470, rot: -72, len: 108, seed: 2 },
  { x: 752, y: 642, rot: 12, len: 112, seed: 3 },
  { x: 300, y: 432, rot: 82, len: 104, seed: 4 },
  { x: 575, y: 158, rot: -6, len: 100, seed: 5 },
  { x: 478, y: 646, rot: -14, len: 92, seed: 6 },
]
const LYSOS = [
  { x: 700, y: 142, r: 19 },
  { x: 962, y: 372, r: 18 },
  { x: 272, y: 322, r: 17 },
  { x: 640, y: 664, r: 16 },
]
const PEROX = [
  { x: 906, y: 300, r: 15 },
  { x: 404, y: 634, r: 14 },
  { x: 818, y: 572, r: 13 },
]
const VESICLES: [number, number, number][] = [
  [958, 246, 9],
  [245, 520, 8],
  [276, 590, 7],
  [880, 640, 7.5],
  [650, 112, 7],
  [430, 120, 8],
]
const POLYSOMES = [
  { x: 700, y: 560, rot: -20 },
  { x: 390, y: 400, rot: 70 },
  { x: 860, y: 380, rot: 80 },
]
const SER_PATHS: Pt[][] = [
  [
    [336, 520],
    [360, 548],
    [398, 556],
    [430, 590],
  ],
  [
    [360, 548],
    [350, 590],
    [372, 610],
  ],
  [
    [398, 556],
    [420, 528],
    [452, 522],
  ],
  [
    [310, 560],
    [330, 590],
    [320, 624],
  ],
]
/** Exocytose: Vesikel verschmilzt mit der Zellmembran (Winkel auf dem Umriss). */
const EXO_ANGLE = -0.62

function insideCell(x: number, y: number, k = 0.9) {
  const dx = (x - CX) / RX
  const dy = (y - CY) / RY
  return dx * dx + dy * dy < k * k
}

const exoPoint = (inset = 0): Pt => [CX + Math.cos(EXO_ANGLE) * (RX - inset), CY + Math.sin(EXO_ANGLE) * (RY - inset)]

export const ANIMAL_LABELS: Label2DSpec[] = [
  { id: 'golgi', a: [GOLGI.x - 10, GOLGI.y + 6], t: [150, 150] },
  { id: 'lysosom', a: [272, 322], t: [150, 250] },
  { id: 'zentrosom', a: [CENTRO.x, CENTRO.y], t: [410, 44] },
  { id: 'mitochondrium', a: [300, 432], t: [150, 360] },
  { id: 'cytoskelett', a: [258, 404], t: [150, 440] },
  { id: 'glattes-er', a: [360, 548], t: [150, 530] },
  { id: 'peroxisom', a: [404, 634], t: [150, 620] },
  { id: 'cytoplasma', a: [330, 660], t: [150, 700] },
  { id: 'vesikel', a: exoPoint(10), t: [1050, 110] },
  { id: 'zellmembran', a: [640, 97], t: [690, 44] },
  { id: 'ribosomen', a: [778, 318], t: [1050, 200] },
  { id: 'raues-er', a: [NUC.x + 194 * Math.cos(-0.1), NUC.y + 194 * Math.sin(-0.1)], t: [1050, 290] },
  { id: 'kernporen', a: [NUC.x + (NUC.r - 4) * Math.cos(0.105), NUC.y + (NUC.r - 4) * Math.sin(0.105)], t: [1050, 380] },
  { id: 'kernhuelle', a: [NUC.x + NUC.r * Math.cos(0.9), NUC.y + NUC.r * Math.sin(0.9)], t: [1050, 470] },
  { id: 'chromatin', a: [NUC.x + 40, NUC.y + 52], t: [1050, 560] },
  { id: 'nucleolus', a: [NUC.x - NUC.r * 0.22, NUC.y - NUC.r * 0.12], t: [1050, 650] },
  { id: 'zellkern', a: [NUC.x + 30, NUC.y + 92], t: [800, 760] },
]

export default function AnimalCell2D(props: Diagram2DProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const data = useMemo(() => {
    const rng = mulberry32(12)
    const pts = blobPoints(CX, CY, RX, RY, 18, rng, 0.03)
    const outline = smoothClosed(pts)
    const cortex = smoothClosed(blobPoints(CX, CY, RX - 14, RY - 14, 18, mulberry32(12), 0.03))
    const avoid: [number, number, number][] = [
      [NUC.x, NUC.y, 232],
      [GOLGI.x, GOLGI.y, 92],
      [CENTRO.x, CENTRO.y, 44],
      ...MITOS.map((m) => [m.x, m.y, m.len / 2 + 10] as [number, number, number]),
      ...LYSOS.map((l) => [l.x, l.y, l.r + 8] as [number, number, number]),
      ...PEROX.map((l) => [l.x, l.y, l.r + 8] as [number, number, number]),
      ...POLYSOMES.map((p) => [p.x, p.y, 26] as [number, number, number]),
      [385, 570, 70],
    ]
    const ribos = scatter(rng, 150, (x, y) => insideCell(x, y, 0.93), avoid, [CX - RX, CY - RY, CX + RX, CY + RY])
    const skeleton: string[] = []
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + rng() * 0.2
      const end: Pt = [CX + Math.cos(a) * RX * 0.93, CY + Math.sin(a) * RY * 0.93]
      const mid: Pt = [(CENTRO.x + end[0]) / 2 + (rng() - 0.5) * 60, (CENTRO.y + end[1]) / 2 + (rng() - 0.5) * 60]
      skeleton.push(smoothOpen([[CENTRO.x, CENTRO.y], mid, end]))
    }
    // Membranproteine (Kanäle) und Glykokalyx (Zuckerketten außen)
    const proteins: { x: number; y: number; rot: number; nx: number; ny: number }[] = []
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3
      if (Math.abs(a - (EXO_ANGLE + Math.PI * 2)) < 0.3 || Math.abs(a - EXO_ANGLE) < 0.3) continue
      proteins.push({ x: CX + Math.cos(a) * (RX + 1), y: CY + Math.sin(a) * (RY + 1), rot: (a * 180) / Math.PI, nx: Math.cos(a), ny: Math.sin(a) })
    }
    return { outline, cortex, ribos, skeleton, proteins }
  }, [])

  const exo = exoPoint(0)
  const exoIn = exoPoint(13)
  const exoAngleDeg = (EXO_ANGLE * 180) / Math.PI

  const compact = props.compact
  return (
    <DiagramProvider value={props}>
      <svg viewBox={compact ? '190 70 820 660' : '0 0 1200 800'} className={diagramClass(props)} role="img" aria-label="Schematische Darstellung einer Tierzelle">
        <Defs uid={uid} />
        <O id="cytoplasma">
          <path d={data.outline} fill={`url(#${uid}-cyto)`} />
        </O>
        <O id="cytoskelett">
          <g fill="none" stroke={P.skelett.mt} strokeWidth={1.3} strokeOpacity={0.55}>
            {data.skeleton.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          {/* Aktin-Cortex direkt unter der Membran */}
          <path d={data.cortex} fill="none" stroke={P.skelett.actin} strokeWidth={1.4} strokeDasharray="1 5" strokeLinecap="round" />
        </O>
        <FreeRibosomes2D points={data.ribos} polysomes={POLYSOMES} />
        <SmoothER2D paths={SER_PATHS} />
        <RoughER2D cx={NUC.x} cy={NUC.y} radii={ER_RADII} ranges={ER_RANGES} />
        <Nucleus2D cx={NUC.x} cy={NUC.y} r={NUC.r} seed={21} uid={uid} erBridges={[-38, 40]} />
        <Golgi2D x={GOLGI.x} y={GOLGI.y} rot={-48} scale={0.95} />
        <Centrosome2D x={CENTRO.x} y={CENTRO.y} uid={uid} />
        {MITOS.map((m, i) => (
          <Mito2D key={i} {...m} />
        ))}
        {LYSOS.map((l, i) => (
          <Lyso2D key={i} {...l} seed={i + 3} />
        ))}
        {PEROX.map((p, i) => (
          <Perox2D key={i} {...p} />
        ))}
        <Vesicles2D items={VESICLES} />
        <O id="zellmembran">
          <path d={data.outline} fill="none" stroke={P.membran.dark} strokeWidth={15} />
          <path d={data.outline} fill="none" stroke={P.membran.base} strokeWidth={12.5} />
          <path d={data.outline} fill="none" stroke={P.membran.tail} strokeWidth={4.5} />
          {data.proteins.map((p, i) => (
            <g key={i}>
              <rect
                x={p.x - 7}
                y={p.y - 12}
                width={14}
                height={24}
                rx={6}
                fill={i % 2 ? '#9b7fa8' : P.membran.dark}
                stroke="#6f5a7c"
                strokeWidth={1}
                transform={`rotate(${p.rot + 90} ${p.x} ${p.y})`}
              />
              {/* Glykokalyx */}
              <path
                d={`M${p.x + p.nx * 12},${p.y + p.ny * 12} l${p.nx * 10},${p.ny * 10} m0,0 l${p.nx * 5 - p.ny * 5},${p.ny * 5 + p.nx * 5} m${-p.nx * 5 + p.ny * 5},${-p.ny * 5 - p.nx * 5} l${p.nx * 5 + p.ny * 5},${p.ny * 5 - p.nx * 5}`}
                fill="none"
                stroke={P.golgi.dark}
                strokeWidth={1.4}
                strokeLinecap="round"
                opacity={0.7}
              />
            </g>
          ))}
        </O>
        {/* Exocytose: Vesikel verschmilzt mit der Membran und gibt seinen Inhalt ab */}
        <O id="vesikel">
          <g transform={`translate(${exoIn[0]} ${exoIn[1]}) rotate(${exoAngleDeg + 90})`}>
            <path d="M-13,-2 A13,13 0 1 0 13,-2" fill={P.vesikel.base} stroke={P.membran.dark} strokeWidth={3} />
          </g>
          {[0, 1, 2].map((k) => (
            <circle
              key={k}
              cx={exo[0] + Math.cos(EXO_ANGLE) * (16 + k * 9) + (k - 1) * 5 * Math.sin(EXO_ANGLE)}
              cy={exo[1] + Math.sin(EXO_ANGLE) * (16 + k * 9) - (k - 1) * 5 * Math.cos(EXO_ANGLE)}
              r={2.4}
              fill={P.vesikel.dark}
            />
          ))}
        </O>
        {!compact && <Labels2D specs={ANIMAL_LABELS} />}
      </svg>
    </DiagramProvider>
  )
}
