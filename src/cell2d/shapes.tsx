import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { ORGANELLES, parentOf, type OrganelleId } from '../data/organelles'
import { P } from '../data/palette'
import { mulberry32, type Rng } from '../lib/random'

/* ------------------------------------------------------------------ */
/*  Interaktions-Kontext                                               */
/* ------------------------------------------------------------------ */

export type Marker = 'correct' | 'wrong' | 'target'

export interface Diagram2DProps {
  selected?: OrganelleId | null
  hovered?: OrganelleId | null
  onHover?: (id: OrganelleId | null) => void
  onSelect?: (id: OrganelleId) => void
  showLabels?: boolean
  markers?: Partial<Record<OrganelleId, Marker>>
  /** Kompakte Darstellung ohne Beschriftungsspalten */
  compact?: boolean
  className?: string
}

/** Große Hintergrundflächen: Überfahren blendet die übrigen Organellen nicht ab. */
const BG = new Set<OrganelleId>(['cytoplasma', 'vakuole', 'zellwand'])

const Ctx = createContext<Diagram2DProps>({})
export const DiagramProvider = Ctx.Provider
export const useDiagram = () => useContext(Ctx)

function isActive(id: OrganelleId, ref: OrganelleId | null | undefined) {
  return !!ref && (id === ref || parentOf(id) === ref)
}

/** CSS-Klassen für das SVG-Wurzelelement (Hover-/Auswahl-Zustand). */
export function diagramClass(p: Diagram2DProps) {
  return [
    'diagram2d',
    p.className,
    p.selected && 'has-selection',
    p.hovered && !BG.has(p.hovered) && !p.selected && 'has-hover',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Gruppe, die zu einem Organell gehört (Hover, Klick, Abblenden). */
export function O({ id, children }: { id: OrganelleId; children: ReactNode }) {
  const d = useDiagram()
  const interactive = !!d.onSelect
  const sel = isActive(id, d.selected)
  const hov = isActive(id, d.hovered)
  const marker = d.markers?.[id]
  const cls = ['o2d', interactive && 'is-interactive', sel && 'is-selected', hov && 'is-hovered', BG.has(id) && 'is-bg', marker && `is-${marker}`]
    .filter(Boolean)
    .join(' ')
  return (
    <g
      className={cls}
      data-organelle={id}
      onMouseEnter={interactive ? () => d.onHover?.(id) : undefined}
      onMouseLeave={interactive ? () => d.onHover?.(null) : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation()
              d.onSelect?.(id)
            }
          : undefined
      }
    >
      {children}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/*  Hilfsfunktionen                                                    */
/* ------------------------------------------------------------------ */

export type Pt = [number, number]

/** Geschlossener, glatter Pfad durch Punkte (Catmull-Rom → Bézier). */
export function smoothClosed(pts: Pt[], tension = 1) {
  const n = pts.length
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension]
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

/** Offener, glatter Pfad durch Punkte. */
export function smoothOpen(pts: Pt[], tension = 1) {
  const n = pts.length
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, n - 1)]
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension]
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

export function blobPoints(cx: number, cy: number, rx: number, ry: number, n: number, rng: Rng, amp = 0.05): Pt[] {
  const pts: Pt[] = []
  const phase = rng() * Math.PI * 2
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const w = 1 + amp * Math.sin(a * 3 + phase) + amp * 0.6 * Math.sin(a * 5 + phase * 1.7)
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w])
  }
  return pts
}

export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, steps: number, wobble = 0, rng?: Rng): Pt[] {
  const pts: Pt[] = []
  const ph = rng ? rng() * 6 : 0
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    const rr = r + wobble * Math.sin(a * 5 + ph)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return pts
}

/* ------------------------------------------------------------------ */
/*  Gemeinsame Definitionen                                            */
/* ------------------------------------------------------------------ */

export function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <radialGradient id={`${uid}-cyto`} cx="50%" cy="45%" r="68%">
        <stop offset="0%" stopColor={P.cyto.light} />
        <stop offset="72%" stopColor={P.cyto.mid} />
        <stop offset="100%" stopColor={P.cyto.edge} />
      </radialGradient>
      <radialGradient id={`${uid}-nucleo`} cx="45%" cy="40%" r="70%">
        <stop offset="0%" stopColor={P.kern.plasmaLight} />
        <stop offset="100%" stopColor={P.kern.plasmaEdge} />
      </radialGradient>
      <radialGradient id={`${uid}-nucleolus`} cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor={P.nucleolus.light} />
        <stop offset="100%" stopColor={P.nucleolus.base} />
      </radialGradient>
      <radialGradient id={`${uid}-vac`} cx="45%" cy="40%" r="75%">
        <stop offset="0%" stopColor={P.vakuole.light} />
        <stop offset="100%" stopColor={P.vakuole.mid} />
      </radialGradient>
      <radialGradient id={`${uid}-pcm`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={P.zentro.light} stopOpacity="0.55" />
        <stop offset="100%" stopColor={P.zentro.light} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={P.wand.light} />
        <stop offset="100%" stopColor={P.wand.base} />
      </linearGradient>
      <pattern id={`${uid}-fibrils`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="0" x2="0" y2="9" stroke={P.wand.fibril} strokeWidth="1" strokeOpacity="0.45" />
      </pattern>
    </defs>
  )
}

/* ------------------------------------------------------------------ */
/*  Organellen                                                         */
/* ------------------------------------------------------------------ */

export function Nucleus2D({ cx, cy, r, seed, uid, erBridges = [] }: { cx: number; cy: number; r: number; seed: number; uid: string; erBridges?: number[] }) {
  const data = useMemo(() => {
    const rng = mulberry32(seed)
    const nucl: Pt = [cx - r * 0.22, cy - r * 0.12]
    const nr = r * 0.27
    const threads: string[] = []
    for (let t = 0; t < 16; t++) {
      const a = rng() * Math.PI * 2
      const rad = r * (0.2 + rng() * 0.55)
      let p: Pt = [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]
      const pts: Pt[] = [p]
      let dir = rng() * Math.PI * 2
      for (let s = 0; s < 7; s++) {
        dir += (rng() - 0.5) * 1.6
        const np: Pt = [p[0] + Math.cos(dir) * r * 0.12, p[1] + Math.sin(dir) * r * 0.12]
        const dx = np[0] - cx
        const dy = np[1] - cy
        const dist = Math.hypot(dx, dy)
        if (dist > r * 0.8) {
          np[0] = cx + (dx / dist) * r * 0.8
          np[1] = cy + (dy / dist) * r * 0.8
          dir += Math.PI * 0.7
        }
        const ndx = np[0] - nucl[0]
        const ndy = np[1] - nucl[1]
        const nd = Math.hypot(ndx, ndy)
        if (nd < nr + 6) {
          np[0] = nucl[0] + (ndx / nd) * (nr + 6)
          np[1] = nucl[1] + (ndy / nd) * (nr + 6)
        }
        pts.push(np)
        p = np
      }
      threads.push(smoothOpen(pts))
    }
    const hetero: { x: number; y: number; rx: number; ry: number; rot: number }[] = []
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + rng() * 0.2
      const rr = r - 17 - rng() * 5
      hetero.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, rx: 5 + rng() * 6, ry: 3 + rng() * 3, rot: (a * 180) / Math.PI + 90 })
    }
    const dots: Pt[] = []
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2
      const rr = Math.sqrt(rng()) * nr * 0.85
      dots.push([nucl[0] + Math.cos(a) * rr, nucl[1] + Math.sin(a) * rr])
    }
    const pores: number[] = []
    for (let k = 0; k < 14; k++) pores.push((k / 14) * 360 + 6)
    return { nucl, nr, threads, hetero, dots, pores }
  }, [cx, cy, r, seed])

  return (
    <g>
      <O id="zellkern">
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-nucleo)`} />
      </O>
      <O id="chromatin">
        <g fill="none" stroke={P.chromatin.base} strokeWidth={2.4} strokeLinecap="round" opacity={0.9}>
          {data.threads.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g fill={P.chromatin.hetero} opacity={0.85}>
          {data.hetero.map((h, i) => (
            <ellipse key={i} cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} transform={`rotate(${h.rot} ${h.x} ${h.y})`} />
          ))}
        </g>
      </O>
      <O id="nucleolus">
        <circle cx={data.nucl[0]} cy={data.nucl[1]} r={data.nr} fill={`url(#${uid}-nucleolus)`} />
        <g fill={P.nucleolus.dots} opacity={0.75}>
          {data.dots.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={1.5} />
          ))}
        </g>
      </O>
      <O id="kernhuelle">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={P.kern.envelope} strokeWidth={4.5} />
        <circle cx={cx} cy={cy} r={r - 10} fill="none" stroke={P.kern.inner} strokeWidth={3} />
        {/* Übergang der äußeren Kernmembran ins raue ER */}
        {erBridges.map((deg) => {
          const a = (deg * Math.PI) / 180
          const p1: Pt = [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
          const p2: Pt = [cx + Math.cos(a + 0.05) * (r + 34), cy + Math.sin(a + 0.05) * (r + 34)]
          return <path key={deg} d={`M${p1[0]},${p1[1]} L${p2[0]},${p2[1]}`} stroke={P.kern.envelope} strokeWidth={4.5} strokeLinecap="round" />
        })}
      </O>
      <O id="kernporen">
        {data.pores.map((deg, i) => (
          <rect
            key={i}
            x={cx + r - 12.5}
            y={cy - 4}
            width={16}
            height={8}
            rx={3}
            fill={P.poren.base}
            stroke={P.poren.dark}
            strokeWidth={1}
            transform={`rotate(${deg} ${cx} ${cy})`}
          />
        ))}
      </O>
    </g>
  )
}

export function Mito2D({ x, y, rot = 0, len = 110, wid = 46, seed = 1 }: { x: number; y: number; rot?: number; len?: number; wid?: number; seed?: number }) {
  const rng = mulberry32(seed)
  const inner = { l: len - 11, w: wid - 11 }
  const n = Math.max(4, Math.round(len / 17))
  const step = inner.l / (n + 1)
  const cristae = Array.from({ length: n }, (_, i) => {
    const cxx = -inner.l / 2 + step * (i + 1) + (rng() - 0.5) * 3
    const top = i % 2 === 0
    const h = inner.w * (0.56 + rng() * 0.12)
    return { cxx, top, h }
  })
  const granules = Array.from({ length: 5 }, () => [(rng() - 0.5) * inner.l * 0.8, (rng() - 0.5) * inner.w * 0.5] as Pt)
  return (
    <O id="mitochondrium">
      <g transform={`translate(${x} ${y}) rotate(${rot})`}>
        <rect x={-len / 2} y={-wid / 2} width={len} height={wid} rx={wid / 2} fill={P.mito.base} stroke={P.mito.dark} strokeWidth={2.2} />
        <rect x={-inner.l / 2} y={-inner.w / 2} width={inner.l} height={inner.w} rx={inner.w / 2} fill={P.mito.inner} stroke={P.mito.dark} strokeWidth={1.6} />
        {cristae.map((c, i) => (
          <rect
            key={i}
            x={c.cxx - 3.2}
            y={c.top ? -inner.w / 2 - 1 : inner.w / 2 - c.h + 1}
            width={6.4}
            height={c.h}
            rx={3.2}
            fill={P.mito.crista}
            stroke={P.mito.dark}
            strokeWidth={1.3}
          />
        ))}
        {granules.map(([gx, gy], i) => (
          <circle key={i} cx={gx} cy={gy} r={1.3} fill={P.mito.dark} opacity={0.6} />
        ))}
        <circle cx={inner.l * 0.3} cy={inner.w * 0.12} r={3.4} fill="none" stroke={P.mito.dark} strokeWidth={1.1} />
      </g>
    </O>
  )
}

export function Chloro2D({ x, y, rot = 0, len = 92, wid = 40, seed = 1 }: { x: number; y: number; rot?: number; len?: number; wid?: number; seed?: number }) {
  const rng = mulberry32(seed)
  const n = Math.max(3, Math.round(len / 19))
  const stacks = Array.from({ length: n }, (_, i) => {
    const sx = -len * 0.34 + (len * 0.68 * i) / (n - 1)
    const sy = (i % 2 === 0 ? -1 : 1) * wid * 0.08
    const layers = 4 + Math.floor(rng() * 2)
    return { sx, sy, layers }
  })
  return (
    <O id="chloroplast">
      <g transform={`translate(${x} ${y}) rotate(${rot})`}>
        <ellipse rx={len / 2} ry={wid / 2} fill={P.chloro.env} stroke={P.chloro.dark} strokeWidth={1.8} />
        <ellipse rx={len / 2 - 3.4} ry={wid / 2 - 3.4} fill={P.chloro.stroma} stroke={P.chloro.lamella} strokeWidth={1.2} />
        <g stroke={P.chloro.lamella} strokeWidth={1.4} fill="none" strokeLinecap="round">
          <path d={`M${-len * 0.38},${-wid * 0.02} Q0,${-wid * 0.2} ${len * 0.38},${-wid * 0.02}`} />
          <path d={`M${-len * 0.36},${wid * 0.1} Q0,${wid * 0.22} ${len * 0.36},${wid * 0.08}`} />
        </g>
        {stacks.map((s, i) => (
          <g key={i}>
            {Array.from({ length: s.layers }, (_, k) => (
              <rect key={k} x={s.sx - 6} y={s.sy - (s.layers * 3.5) / 2 + k * 3.5} width={12} height={2.7} rx={1.35} fill={P.chloro.grana} />
            ))}
          </g>
        ))}
        <ellipse cx={len * 0.16} cy={wid * 0.22} rx={7.5} ry={4.4} fill={P.chloro.starch} stroke={P.golgi.dark} strokeOpacity={0.35} strokeWidth={0.8} />
        <circle cx={-len * 0.2} cy={wid * 0.24} r={1.8} fill={P.golgi.base} />
        <circle cx={len * 0.3} cy={-wid * 0.2} r={1.6} fill={P.golgi.base} />
      </g>
    </O>
  )
}

export function Golgi2D({ x, y, rot = 0, scale = 1, labels = true }: { x: number; y: number; rot?: number; scale?: number; labels?: boolean }) {
  const items = Array.from({ length: 6 }, (_, i) => ({ w: 124 - Math.abs(i - 2.5) * 11, yy: (i - 2.5) * 15 }))
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <O id="golgi">
        {items.map((c, i) => {
          const d = `M${-c.w / 2},${c.yy} Q0,${c.yy + 26} ${c.w / 2},${c.yy}`
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={P.golgi.dark} strokeWidth={12} strokeLinecap="round" />
              <path d={d} fill="none" stroke={P.golgi.base} strokeWidth={9.6} strokeLinecap="round" />
              <path d={d} fill="none" stroke={P.golgi.lumen} strokeWidth={2.6} strokeLinecap="round" />
              <circle cx={-c.w / 2 - 2} cy={c.yy - 1} r={6.6} fill={P.golgi.base} stroke={P.golgi.dark} strokeWidth={1.2} />
              <circle cx={c.w / 2 + 2} cy={c.yy - 1} r={6.6} fill={P.golgi.base} stroke={P.golgi.dark} strokeWidth={1.2} />
            </g>
          )
        })}
      </O>
      <O id="vesikel">
        {[
          [-78, -50, 7],
          [74, -44, 6.5],
          [-40, -66, 7.5],
          [8, -70, 6],
          [50, -64, 7],
          [-86, 18, 6],
          [84, 22, 6.5],
          [-20, 72, 5.5],
          [26, 76, 5],
        ].map(([vx, vy, vr], i) => (
          <circle key={i} cx={vx} cy={vy} r={vr} fill={P.vesikel.base} stroke={P.vesikel.dark} strokeWidth={1.3} />
        ))}
      </O>
      {labels && (
        <g className="d2-mini" fontSize={11}>
          <text x={0} y={-52} textAnchor="middle">
            trans
          </text>
          <text x={0} y={72} textAnchor="middle">
            cis
          </text>
        </g>
      )}
    </g>
  )
}

export function Lyso2D({ x, y, r, seed = 1 }: { x: number; y: number; r: number; seed?: number }) {
  const rng = mulberry32(seed)
  const dots = Array.from({ length: 7 }, () => {
    const a = rng() * Math.PI * 2
    const rr = Math.sqrt(rng()) * r * 0.6
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.6 + rng() * 1.8]
  })
  // teilweise verdautes Material
  const frag = smoothClosed(blobPoints(x + r * 0.15, y - r * 0.1, r * 0.34, r * 0.26, 7, rng, 0.25))
  return (
    <O id="lysosom">
      <circle cx={x} cy={y} r={r} fill={P.lyso.base} stroke={P.lyso.dark} strokeWidth={2} />
      <path d={frag} fill={P.lyso.dark} opacity={0.55} />
      {dots.map(([dx, dy, dr], i) => (
        <circle key={i} cx={dx} cy={dy} r={dr} fill={P.lyso.dots} opacity={0.9} />
      ))}
    </O>
  )
}

export function Perox2D({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <O id="peroxisom">
      <circle cx={x} cy={y} r={r} fill={P.perox.base} stroke={P.perox.dark} strokeWidth={2} />
      <circle cx={x + r * 0.08} cy={y - r * 0.05} r={r * 0.45} fill={P.perox.core} />
    </O>
  )
}

export function Vesicles2D({ items }: { items: [number, number, number][] }) {
  return (
    <O id="vesikel">
      {items.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={P.vesikel.base} stroke={P.vesikel.dark} strokeWidth={1.3} />
      ))}
    </O>
  )
}

export function Centrosome2D({ x, y, uid }: { x: number; y: number; uid: string }) {
  const triplets = Array.from({ length: 9 }, (_, k) => {
    const a = (k / 9) * Math.PI * 2
    const cxx = x + Math.cos(a) * 11
    const cyy = y + Math.sin(a) * 11
    const t = a + Math.PI / 2 + 0.6
    return [-1, 0, 1].map((m) => [cxx + Math.cos(t) * m * 3.4, cyy + Math.sin(t) * m * 3.4])
  })
  return (
    <O id="zentrosom">
      <circle cx={x + 14} cy={y + 4} r={40} fill={`url(#${uid}-pcm)`} />
      {triplets.flat().map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={1.8} fill={P.zentro.base} />
      ))}
      <g transform={`translate(${x + 28} ${y - 16})`}>
        <rect x={0} y={0} width={15} height={40} rx={3} fill={P.zentro.light} stroke={P.zentro.dark} strokeWidth={1.4} />
        {[3.5, 7.5, 11.5].map((lx) => (
          <line key={lx} x1={lx} y1={3} x2={lx} y2={37} stroke={P.zentro.dark} strokeWidth={1} />
        ))}
      </g>
    </O>
  )
}

export function RoughER2D({ cx, cy, radii, ranges, seed = 3 }: { cx: number; cy: number; radii: number[]; ranges: [number, number][]; seed?: number }) {
  const data = useMemo(() => {
    const rng = mulberry32(seed)
    const sheets: string[] = []
    const ribos: Pt[] = []
    radii.forEach((r, i) => {
      const [a0, a1] = ranges[i % ranges.length]
      const pieces = 2 + Math.floor(rng() * 2)
      const span = (a1 - a0) / pieces
      for (let k = 0; k < pieces; k++) {
        const s0 = a0 + span * k + 0.04
        const s1 = a0 + span * (k + 1) - 0.04
        const pts = arcPoints(cx, cy, r, s0, s1, 14, 3, rng)
        sheets.push(smoothOpen(pts))
        const arcLen = r * (s1 - s0)
        const count = Math.floor(arcLen / 9)
        for (let j = 0; j <= count; j++) {
          const a = s0 + ((s1 - s0) * j) / Math.max(count, 1)
          for (const side of [-1, 1]) {
            const rr = r + side * 9 + 3 * Math.sin(a * 5)
            ribos.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
          }
        }
      }
    })
    return { sheets, ribos }
  }, [cx, cy, radii, ranges, seed])
  return (
    <g>
      <O id="raues-er">
        {data.sheets.map((d, i) => (
          <g key={i} fill="none" strokeLinecap="round">
            <path d={d} stroke={P.rer.dark} strokeWidth={12.5} />
            <path d={d} stroke={P.rer.base} strokeWidth={10} />
            <path d={d} stroke={P.rer.lumen} strokeWidth={3} />
          </g>
        ))}
      </O>
      <O id="ribosomen">
        {data.ribos.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={2.3} fill={P.ribo.base} />
        ))}
      </O>
    </g>
  )
}

export function SmoothER2D({ paths }: { paths: Pt[][] }) {
  const ds = useMemo(() => paths.map((p) => smoothOpen(p)), [paths])
  return (
    <O id="glattes-er">
      {ds.map((d, i) => (
        <g key={i} fill="none" strokeLinecap="round">
          <path d={d} stroke={P.ser.dark} strokeWidth={11.5} />
          <path d={d} stroke={P.ser.base} strokeWidth={9} />
          <path d={d} stroke={P.ser.lumen} strokeWidth={3} />
        </g>
      ))}
    </O>
  )
}

/** Freie Ribosomen, teils als Polysomen (mehrere Ribosomen an einem mRNA-Strang). */
export function FreeRibosomes2D({ points, polysomes = [] }: { points: Pt[]; polysomes?: { x: number; y: number; rot: number }[] }) {
  return (
    <O id="ribosomen">
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.3} fill={P.ribo.base} />
      ))}
      {polysomes.map((s, i) => (
        <g key={`p${i}`} transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`}>
          <path d="M-20,0 C-12,-6 -4,6 4,0 S16,-6 22,0" fill="none" stroke={P.ribo.base} strokeWidth={0.9} opacity={0.6} />
          {[-16, -8, 0, 8, 16].map((dx) => (
            <circle key={dx} cx={dx} cy={dx % 16 === 0 ? -1.5 : 1.5} r={2.5} fill={P.ribo.base} />
          ))}
        </g>
      ))}
    </O>
  )
}

/** Streut Punkte in eine Fläche, außerhalb gegebener Kreise. */
export function scatter(rng: Rng, count: number, inside: (x: number, y: number) => boolean, avoid: [number, number, number][], bounds: [number, number, number, number]): Pt[] {
  const out: Pt[] = []
  for (let t = 0; t < count * 40 && out.length < count; t++) {
    const x = bounds[0] + rng() * (bounds[2] - bounds[0])
    const y = bounds[1] + rng() * (bounds[3] - bounds[1])
    if (!inside(x, y)) continue
    if (avoid.some(([ax, ay, ar]) => Math.hypot(x - ax, y - ay) < ar)) continue
    out.push([x, y])
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Beschriftungen                                                     */
/* ------------------------------------------------------------------ */

export interface Label2DSpec {
  id: OrganelleId
  /** Ankerpunkt am Organell */
  a: Pt
  /** Position des Textes */
  t: Pt
}

export function Labels2D({ specs }: { specs: Label2DSpec[] }) {
  const d = useDiagram()
  if (!d.showLabels) return null
  return (
    <g className="d2-labels">
      {specs.map((s) => {
        const left = s.t[0] < s.a[0]
        const vertical = Math.abs(s.t[0] - s.a[0]) < 40
        const elbowX = vertical ? s.a[0] : s.t[0] + (left ? 12 : -12)
        const sel = isActive(s.id, d.selected) || isActive(s.id, d.hovered)
        const dim = !!d.selected && !isActive(s.id, d.selected)
        return (
          <g
            key={s.id + s.a.join()}
            className={`d2-label ${sel ? 'is-on' : ''} ${dim ? 'is-dim' : ''}`}
            style={{ ['--c' as string]: ORGANELLES[s.id].farbe }}
            onMouseEnter={() => d.onHover?.(s.id)}
            onMouseLeave={() => d.onHover?.(null)}
            onClick={() => d.onSelect?.(s.id)}
          >
            <polyline points={`${s.a[0]},${s.a[1]} ${elbowX},${s.t[1]} ${s.t[0]},${s.t[1]}`} className="d2-label__line" />
            <circle cx={s.a[0]} cy={s.a[1]} r={3.4} className="d2-label__dot" />
            <text x={s.t[0] + (left ? -6 : 6)} y={s.t[1] + 5} textAnchor={left ? 'end' : 'start'} className="d2-label__text">
              {ORGANELLES[s.id].label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
