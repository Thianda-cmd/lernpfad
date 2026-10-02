/**
 * Start-Animation als Teilchensystem auf Millimeterpapier.
 *
 * Gas → Natrium-Atom (Chemie) → das abgegebene Elektron zeichnet eine Parabel (Mathematik)
 * → die Kurve verdrillt sich zur DNA (Biologie) → alles zieht sich zur Lernpfad-Zelle zusammen.
 * Zum Schluss öffnet sich die Zellmembran und gibt die Seite frei.
 */
import { LOGO_NUCLEOLUS, LOGO_NUCLEUS, LOGO_VESICLE } from '../components/Logo'

export type Stage = 'start' | 'chem' | 'ion' | 'math' | 'roots' | 'bio' | 'logo'

/** Zeitplan in ms ab dem ersten Bild */
export const T = {
  atom: 100,
  ion: 1150,
  math: 1350,
  bio: 2650,
  logo: 3700,
  finish: 5250,
  exit: 850,
}
/** Zeichenstift im Graphen, relativ zu T.math */
const PEN0 = 260
const PEN1 = 960
const REDUCED_FINISH = 900

const TAU = Math.PI * 2
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const easeOut = (u: number) => 1 - Math.pow(1 - u, 3)
const easeOutBack = (u: number) => 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2)
const smooth = (a: number, b: number, v: number) => {
  const u = clamp01((v - a) / (b - a))
  return u * u * (3 - 2 * u)
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function halton(i: number, b: number) {
  let f = 1
  let r = 0
  while (i > 0) {
    f /= b
    r += f * (i % b)
    i = Math.floor(i / b)
  }
  return r
}

/* ------------------------------ Farben ------------------------------ */

const INK = 0
const INK2 = 1
const FAINT = 2
const GREEN = 3
const GREEN2 = 4
const SAND = 5
const SAND2 = 6

interface Palette {
  bg: string
  colors: string[]
  dark: boolean
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d
  const bg = v('--bg', '#f3f1eb')
  // dunkles Design an der Helligkeit des Hintergrunds erkennen
  const m = /^#([0-9a-f]{6})$/i.exec(bg)
  const lum = m ? parseInt(m[1].slice(0, 2), 16) * 0.3 + parseInt(m[1].slice(2, 4), 16) * 0.59 + parseInt(m[1].slice(4, 6), 16) * 0.11 : 240
  return {
    bg,
    dark: lum < 100,
    colors: [
      v('--text', '#1c2420'),
      v('--text-2', '#57615a'),
      v('--text-3', '#8b928b'),
      v('--green', '#2f5546'),
      v('--green-2', '#3f6858'),
      v('--sand', '#a88a55'),
      v('--sand-2', '#86693c'),
    ],
  }
}

/* ------------------------------ Szenen ------------------------------ */

interface Geo {
  w: number
  h: number
  cx: number
  cy: number
  R: number
  sz: number
  N: number
}

interface Scene {
  x: Float32Array
  y: Float32Array
  z: Float32Array
  s: Float32Array
  a: Float32Array
  g: Float32Array
  c: Uint8Array
  /** Körper: einzeln gezeichnet, nach Tiefe sortiert */
  b: Uint8Array
  key: Float32Array
  delay: Float32Array
  dur: Float32Array
  mode: 'x' | 'angle'
  start: number
  pinned?: Set<number>
  update(t: number): void
  extra?(ctx: CanvasRenderingContext2D, t: number, fade: number): void
}

function alloc(N: number, start: number, mode: 'x' | 'angle'): Scene {
  return {
    x: new Float32Array(N),
    y: new Float32Array(N),
    z: new Float32Array(N),
    s: new Float32Array(N),
    a: new Float32Array(N),
    g: new Float32Array(N),
    c: new Uint8Array(N),
    b: new Uint8Array(N),
    key: new Float32Array(N),
    delay: new Float32Array(N),
    dur: new Float32Array(N),
    mode,
    start,
    update() {},
  }
}

/** Sortierschlüssel der Plätze aus ihrer Lage zu einem Zeitpunkt */
function keysFrom(sc: Scene, G: Geo, probe: number) {
  sc.update(probe)
  for (let i = 0; i < G.N; i++) sc.key[i] = sc.mode === 'x' ? sc.x[i] + sc.y[i] * 0.001 : angleKey(sc.x[i] - G.cx, sc.y[i] - G.cy)
}

/** Winkel ab 12 Uhr im Uhrzeigersinn, 0 … 2π */
function angleKey(dx: number, dy: number) {
  const a = Math.atan2(dy, dx) + Math.PI / 2
  return a < 0 ? a + TAU : a
}

/** Teilchen als Gas über die ganze Fläche */
function gasScene(G: Geo): Scene {
  const { N, w, h, sz } = G
  const sc = alloc(N, 0, 'angle')
  const r = rng(11)
  const x0 = new Float32Array(N)
  const y0 = new Float32Array(N)
  const vx = new Float32Array(N)
  const vy = new Float32Array(N)
  const ph = new Float32Array(N)
  const s0 = new Float32Array(N)
  const a0 = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    x0[i] = r() * w
    y0[i] = r() * h
    const ang = r() * TAU
    const sp = 10 + r() * 34
    vx[i] = Math.cos(ang) * sp
    vy[i] = Math.sin(ang) * sp
    ph[i] = r() * TAU
    s0[i] = sz * (0.65 + r() * 0.8)
    a0[i] = 0.25 + r() * 0.45
    const q = r()
    sc.c[i] = q < 0.1 ? GREEN : q < 0.17 ? SAND : FAINT
  }
  sc.update = (t) => {
    const k = t / 1000
    const fade = clamp01(t / 420)
    for (let i = 0; i < N; i++) {
      sc.x[i] = x0[i] + vx[i] * k + Math.sin(t * 0.004 + ph[i]) * 2.5
      sc.y[i] = y0[i] + vy[i] * k + Math.cos(t * 0.0036 + ph[i] * 1.7) * 2.5
      sc.z[i] = 0
      sc.s[i] = s0[i]
      sc.a[i] = a0[i] * fade
      sc.g[i] = 0
    }
  }
  sc.update(0)
  return sc
}

/** Natrium im Schalenmodell: 11 p⁺, 12 n, Schalen 2 · 8 · 1 */
const NUCLEONS = 23
const ELECTRONS = 11
const E_OUTER = NUCLEONS + ELECTRONS - 1

function atomScene(G: Geo): Scene {
  const { N, cx, cy, R, sz } = G
  const sc = alloc(N, T.atom, 'angle')
  const r = rng(23)
  const orbits = [
    { r: 0.42 * R, tilt: 0.96, rot: 1.75, w: 2.5, ne: 2, th0: 0.3 },
    { r: 0.71 * R, tilt: 1.15, rot: 3.84, w: 1.65, ne: 8, th0: 0.1 },
    { r: 1.0 * R, tilt: 1.26, rot: 5.93, w: 1.15, ne: 1, th0: 2.2 },
  ]
  const rn = 0.12 * R
  const rNuc = 0.042 * R
  const rEl = Math.max(2.6, 0.017 * R)
  // Kugelhaufen der Nukleonen
  const bx = new Float32Array(NUCLEONS)
  const by = new Float32Array(NUCLEONS)
  const bz = new Float32Array(NUCLEONS)
  for (let k = 0; k < NUCLEONS; k++) {
    const f = (k + 0.5) / NUCLEONS
    const yy = 1 - 2 * f
    const rad = Math.sqrt(1 - yy * yy)
    const th = k * 2.39996
    const rr = rn * (0.3 + 0.7 * Math.cbrt((((k * 7) % NUCLEONS) + 0.5) / NUCLEONS))
    bx[k] = Math.cos(th) * rad * rr
    by[k] = yy * rr
    bz[k] = Math.sin(th) * rad * rr
    sc.c[k] = (k * 5) % NUCLEONS < 11 ? SAND : SAND2
    sc.b[k] = 1
  }
  // Elektronen und Bahnpunkte: Schale, Startwinkel
  const shell = new Uint8Array(N)
  const th = new Float32Array(N)
  let idx = NUCLEONS
  orbits.forEach((o, k) => {
    for (let e = 0; e < o.ne; e++) {
      shell[idx] = k
      th[idx] = o.th0 + (e * TAU) / o.ne
      sc.c[idx] = GREEN
      sc.b[idx] = 1
      idx++
    }
  })
  const tracks = N - idx
  const wsum = orbits.reduce((a, o) => a + o.r, 0)
  let start = idx
  orbits.forEach((o, k) => {
    const n = k === orbits.length - 1 ? N - start : Math.round((tracks * o.r) / wsum)
    for (let j = 0; j < n; j++) {
      shell[start + j] = k
      th[start + j] = (j / n) * TAU + (r() - 0.5) * 0.01
      sc.c[start + j] = INK
    }
    start += n
  })

  const orbitPoint = (o: (typeof orbits)[number], a: number, gam: number, out: number[]) => {
    const X = o.r * Math.cos(a)
    const Yp = o.r * Math.sin(a)
    const Y = Yp * Math.cos(o.tilt)
    const Z = Yp * Math.sin(o.tilt)
    const rr = o.rot + gam
    const c = Math.cos(rr)
    const s = Math.sin(rr)
    out[0] = cx + X * c - Y * s
    out[1] = cy + X * s + Y * c
    out[2] = Z
  }

  const p = [0, 0, 0]
  sc.update = (t) => {
    const gam = t * 0.00024
    const ang = t * 0.0009
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const ct = Math.cos(0.35)
    const st = Math.sin(0.35)
    for (let k = 0; k < NUCLEONS; k++) {
      const X = bx[k] * ca - bz[k] * sa
      const Z = bx[k] * sa + bz[k] * ca
      const Y2 = by[k] * ct - Z * st
      const Z2 = by[k] * st + Z * ct
      sc.x[k] = cx + X
      sc.y[k] = cy + Y2
      sc.z[k] = Z2
      sc.s[k] = rNuc * (0.9 + 0.12 * (Z2 / rn))
      sc.a[k] = 1
      sc.g[k] = 0
    }
    for (let i = NUCLEONS; i < N; i++) {
      const o = orbits[shell[i]]
      const el = i < NUCLEONS + ELECTRONS
      orbitPoint(o, el ? th[i] + (o.w * t) / 1000 : th[i], gam, p)
      sc.x[i] = p[0]
      sc.y[i] = p[1]
      sc.z[i] = p[2]
      const d = (p[2] / o.r + 1) / 2
      if (el) {
        sc.s[i] = rEl * (0.85 + 0.3 * d)
        sc.a[i] = 1
        sc.g[i] = 1
      } else {
        sc.s[i] = 0.95 * sz * (0.8 + 0.4 * d)
        sc.a[i] = 0.12 + 0.38 * d
        sc.g[i] = 0
      }
    }
  }
  keysFrom(sc, G, 500)
  for (let i = 0; i < N; i++) {
    sc.delay[i] = (sc.key[i] / TAU) * 180 + r() * 60
    sc.dur[i] = 520 + r() * 180
  }
  return sc
}

/** f(x) = x² − 2x − 3 im Koordinatensystem; Platz 0 ist der Zeichenstift */
const fx = (x: number) => x * x - 2 * x - 3
const X_MIN = -1.9
const X_MAX = 3.9
const VALUES = [-1, 0, 1, 2, 3]

interface GraphInfo {
  P: (x: number, y: number) => [number, number]
  tPass: (x: number) => number
}

function graphScene(G: Geo): Scene & { info: GraphInfo } {
  const { N, cx, cy, R, sz } = G
  const sc = alloc(N, T.math, 'x') as Scene & { info: GraphInfo }
  const r = rng(37)
  const ux = 0.29 * R
  const uy = 0.165 * R
  const ox = cx - 1.1 * ux
  const oy = cy + 0.2 * uy
  const P = (x: number, y: number): [number, number] => [ox + x * ux, oy - y * uy]

  // Bogenlänge der Kurve
  const M = 400
  const cum = new Float32Array(M + 1)
  const pts: [number, number][] = []
  for (let k = 0; k <= M; k++) {
    const x = X_MIN + ((X_MAX - X_MIN) * k) / M
    pts.push(P(x, fx(x)))
    if (k) cum[k] = cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])
  }
  const Ltot = cum[M]
  const atLen = (s: number, out: number[]) => {
    let lo = 0
    let hi = M
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < s) lo = mid
      else hi = mid
    }
    const f = cum[hi] > cum[lo] ? (s - cum[lo]) / (cum[hi] - cum[lo]) : 0
    out[0] = pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f
    out[1] = pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f
  }
  const lenAtX = (x: number) => cum[Math.round(((x - X_MIN) / (X_MAX - X_MIN)) * M)]
  const tPassLen = (s: number) => PEN0 + (PEN1 - PEN0) * (s / Ltot)

  const st = sc
  let i = 0
  // Stift
  st.c[0] = GREEN
  st.b[0] = 1
  st.pinned = new Set([0])
  i = 1
  // Wertetabelle
  const valIdx: number[] = []
  for (const v of VALUES) {
    const [x, y] = P(v, fx(v))
    st.x[i] = x
    st.y[i] = y
    st.c[i] = SAND
    st.b[i] = 1
    st.a[i] = 1
    const tp = tPassLen(lenAtX(v))
    st.delay[i] = Math.max(0, tp - 380)
    st.dur[i] = Math.min(380, tp)
    valIdx.push(i)
    i++
  }
  const vTimes = VALUES.map((v) => tPassLen(lenAtX(v)))

  const statics: { x: number; y: number; d: number; kind: 'axis' | 'curve'; t?: number }[] = []
  // Achsen mit Pfeilspitzen und Skalenstrichen
  const axisLen = (4.8 + 2.6) * ux + (5.3 + 4.9) * uy
  const tickN = 3
  const ticks: [number, number, 'x' | 'y'][] = [
    ...[-2, -1, 1, 2, 3, 4].map((v) => [v, 0, 'x'] as [number, number, 'x']),
    ...[-4, -2, 2, 4].map((v) => [0, v, 'y'] as [number, number, 'y']),
  ]
  const arrowLen = 9 * sz + 3
  const arrowN = 4
  const fixed = 6 + ticks.length * tickN + 4 * arrowN
  const free = N - fixed
  const nAxis = Math.min(Math.round(axisLen / 4.4), Math.floor(free * 0.42))
  const nCurve = free - nAxis
  const maxD = Math.max(4.8 * ux, 2.6 * ux, 5.3 * uy, 4.9 * uy)
  const nx = Math.round((nAxis * ((4.8 + 2.6) * ux)) / axisLen)
  for (let k = 0; k < nx; k++) {
    const X = -2.6 + ((4.8 + 2.6) * (k + 0.5)) / nx
    const [x, y] = P(X, 0)
    statics.push({ x, y, d: Math.abs(X * ux), kind: 'axis' })
  }
  for (let k = 0; k < nAxis - nx; k++) {
    const Y = -4.9 + ((5.3 + 4.9) * (k + 0.5)) / (nAxis - nx)
    const [x, y] = P(0, Y)
    statics.push({ x, y, d: Math.abs(Y * uy), kind: 'axis' })
  }
  for (const [X, Y, ax] of ticks) {
    const [x, y] = P(X, Y)
    for (let k = 0; k < tickN; k++) {
      const o = (k - 1) * 3.6 * sz
      statics.push({ x: ax === 'x' ? x : x + o, y: ax === 'x' ? y + o : y, d: Math.hypot(x - ox, y - oy), kind: 'axis' })
    }
  }
  const arrow = (tx: number, ty: number, dx: number, dy: number) => {
    for (const sgn of [-1, 1]) {
      const a = Math.atan2(dy, dx) + Math.PI + sgn * 0.48
      for (let k = 1; k <= arrowN; k++) {
        const f = (k / arrowN) * arrowLen
        statics.push({ x: tx + Math.cos(a) * f, y: ty + Math.sin(a) * f, d: maxD, kind: 'axis' })
      }
    }
  }
  const xt = P(4.8, 0)
  const yt = P(0, 5.3)
  arrow(xt[0] + 4, xt[1], 1, 0)
  arrow(yt[0], yt[1] - 4, 0, -1)
  // Kurve
  const q = [0, 0]
  for (let k = 0; k < nCurve; k++) {
    const s = (Ltot * (k + 0.5)) / nCurve
    atLen(s, q)
    statics.push({ x: q[0], y: q[1], d: 0, kind: 'curve', t: tPassLen(s) })
  }
  for (const p of statics) {
    st.x[i] = p.x
    st.y[i] = p.y
    if (p.kind === 'axis') {
      st.c[i] = INK
      st.a[i] = 0.5
      st.s[i] = 1.0 * sz
      st.delay[i] = 40 + (p.d / maxD) * 280 + r() * 40
      st.dur[i] = 520 + r() * 120
    } else {
      st.c[i] = GREEN
      st.a[i] = 1
      st.s[i] = 1.55 * sz
      const tp = p.t!
      st.dur[i] = Math.min(480 + r() * 100, tp)
      st.delay[i] = tp - st.dur[i]
    }
    i++
  }

  const rEl = Math.max(2.6, 0.017 * R)
  const rVal = Math.max(2.8, 0.019 * R)
  const pen = [0, 0]
  sc.update = (t) => {
    const u = clamp01((t - PEN0) / (PEN1 - PEN0))
    atLen(u * Ltot, pen)
    st.x[0] = pen[0]
    st.y[0] = pen[1]
    st.s[0] = rEl
    st.a[0] = 1
    st.g[0] = 1
    for (let k = 0; k < valIdx.length; k++) {
      const j = valIdx[k]
      const v = clamp01((t - vTimes[k]) / 300)
      st.s[j] = rVal * (0.45 + 0.55 * easeOutBack(v))
      st.g[j] = 0.6 * (1 - v)
    }
  }
  for (let k = 0; k < N; k++) sc.key[k] = sc.x[k] + sc.y[k] * 0.001
  sc.update(0)

  const fs = Math.max(0.85, Math.min(1.2, R / 250))
  sc.extra = (ctx, t, fade) => {
    if (fade <= 0.01) return
    const lab = (txt: string, x: number, y: number, a: number, font: string, align: CanvasTextAlign = 'center') => {
      if (a <= 0.01) return
      ctx.globalAlpha = a * fade
      ctx.font = font
      ctx.textAlign = align
      ctx.fillText(txt, x, y)
    }
    const pal = ctx.fillStyle
    ctx.textBaseline = 'middle'
    const serif = `italic ${Math.round(19 * fs)}px "Instrument Serif", Georgia, serif`
    const mono = `${Math.round(11.5 * fs)}px "JetBrains Mono Variable", ui-monospace, monospace`
    const axA = smooth(260, 700, t)
    lab('x', xt[0] + 4, xt[1] + 15 * fs, axA, serif)
    lab('y', yt[0] - 14 * fs, yt[1] - 2, axA, serif)
    const ra = smooth(vTimes[0] + 120, vTimes[0] + 420, t)
    const rb = smooth(vTimes[4] + 120, vTimes[4] + 420, t)
    const va = smooth(vTimes[2] + 120, vTimes[2] + 420, t)
    const [r1x, r1y] = P(-1, 0)
    const [r2x, r2y] = P(3, 0)
    const [sx, sy] = P(1, -4)
    lab('−1', r1x - 3 * fs, r1y + 15 * fs, ra, mono)
    lab('3', r2x + 1, r2y + 15 * fs, rb, mono)
    lab('S(1|−4)', sx + 13 * fs, sy + 3 * fs, va, mono, 'left')
    const [ex, ey] = P(X_MAX, fx(X_MAX))
    lab('f', ex + 13 * fs, ey + 4, smooth(PEN1 - 60, PEN1 + 260, t), serif, 'left')
    ctx.fillStyle = pal
  }
  sc.info = { P, tPass: (x) => tPassLen(lenAtX(x)) }
  return sc
}

/** DNA-Doppelhelix, waagerecht, dreht sich um die eigene Achse */
const SEQ = 'ATGCGTACCTAGGCATTACGGATCCGTAAGCTTGCAGGCTAACGTTAGCCATG'
const BASE_COLOR: Record<string, number> = { A: GREEN2, T: SAND, G: INK2, C: SAND2 }
const PAIR: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' }

function dnaScene(G: Geo): Scene {
  const { N, w, cx, cy, R, sz, h } = G
  const sc = alloc(N, T.bio, 'x')
  const r = rng(53)
  const L = Math.min(2.75 * R, w - 56)
  const rho = Math.min(0.27 * R, h * 0.12)
  const lambda = 3.9 * rho
  const nb = Math.max(8, Math.round((L / lambda) * 10.5))
  const m = Math.max(4, Math.min(14, Math.floor((N * 0.36) / nb)))
  const rungDots = nb * m
  const strands = N - rungDots
  const nA = Math.ceil(strands / 2)
  const kind = new Uint8Array(N)
  const uu = new Float32Array(N)
  const tt = new Float32Array(N)
  let i = 0
  for (let k = 0; k < nA; k++, i++) {
    kind[i] = 0
    uu[i] = (k + 0.5) / nA
    sc.c[i] = GREEN
  }
  for (let k = 0; k < strands - nA; k++, i++) {
    kind[i] = 1
    uu[i] = (k + 0.5) / (strands - nA)
    sc.c[i] = SAND
  }
  for (let k = 0; k < nb; k++) {
    const base = SEQ[k % SEQ.length]
    for (let j = 0; j < m; j++, i++) {
      kind[i] = 2
      uu[i] = (k + 0.5) / nb
      tt[i] = 0.14 + (0.72 * (j + 0.5)) / m
      sc.c[i] = BASE_COLOR[tt[i] < 0.5 ? base : PAIR[base]]
    }
  }
  const DELTA = 0.78 * Math.PI
  const tilt = -0.1
  const ct = Math.cos(tilt)
  const stl = Math.sin(tilt)
  sc.update = (t) => {
    const ph = (t / 1000) * 1.55
    for (let k = 0; k < N; k++) {
      const f = uu[k]
      const env = smooth(0, 0.09, f) * smooth(1, 0.91, f)
      const rad = rho * (0.12 + 0.88 * env)
      const phi = (TAU * f * L) / lambda + ph
      let yy: number
      let zz: number
      if (kind[k] === 2) {
        const ya = rad * Math.sin(phi)
        const za = rad * Math.cos(phi)
        const yb = rad * Math.sin(phi + DELTA)
        const zb = rad * Math.cos(phi + DELTA)
        yy = ya + (yb - ya) * tt[k]
        zz = za + (zb - za) * tt[k]
      } else {
        const p2 = kind[k] === 0 ? phi : phi + DELTA
        yy = rad * Math.sin(p2)
        zz = rad * Math.cos(p2)
      }
      const dx = f * L - L / 2
      sc.x[k] = cx + dx * ct - yy * stl
      sc.y[k] = cy + dx * stl + yy * ct
      sc.z[k] = zz
      const d = (zz / rho + 1) / 2
      const ea = 0.25 + 0.75 * env
      if (kind[k] === 2) {
        sc.s[k] = 1.05 * sz * (0.75 + 0.5 * d)
        sc.a[k] = (0.22 + 0.6 * d) * ea
      } else {
        sc.s[k] = 1.5 * sz * (0.72 + 0.56 * d)
        sc.a[k] = (0.3 + 0.7 * d) * ea
      }
      sc.g[k] = 0
    }
  }
  keysFrom(sc, G, 400)
  const minX = cx - L / 2
  for (let k = 0; k < N; k++) {
    sc.delay[k] = clamp01((sc.key[k] - minX) / L) * 260 + r() * 50
    sc.dur[k] = 560 + r() * 160
  }
  return sc
}

/** Bildmarke: Zellmembran (offener Ring), Zellkern mit Nucleolus, Vesikel */
const RING = { cx: 24, cy: 24, r: 17, w: 1.7 }
const RING_A0 = Math.atan2(39.41 - 24, 31.18 - 24)
const RING_SWEEP = Math.atan2(31.18 - 24, 39.41 - 24) + TAU - RING_A0
const BUD_FROM = { x: 24 + 17 * Math.SQRT1_2, y: 24 + 17 * Math.SQRT1_2 }
/** Knospung des Vesikels, relativ zu T.logo */
const BUD0 = 520
const BUD1 = 880
const CRISP0 = 760
const CRISP1 = 1060

interface LogoInfo {
  k: number
  vesicle(t: number): { x: number; y: number; s: number }
}

function inRing(lx: number, ly: number) {
  const dx = lx - RING.cx
  const dy = ly - RING.cy
  const d = Math.hypot(dx, dy)
  if (Math.abs(d - RING.r) <= RING.w) {
    let rel = Math.atan2(dy, dx) - RING_A0
    rel = ((rel % TAU) + TAU) % TAU
    if (rel <= RING_SWEEP) return true
  }
  return Math.hypot(lx - 31.18, ly - 39.41) <= RING.w || Math.hypot(lx - 39.41, ly - 31.18) <= RING.w
}

function inNucleus(lx: number, ly: number) {
  return Math.hypot(lx - LOGO_NUCLEUS.cx, ly - LOGO_NUCLEUS.cy) <= LOGO_NUCLEUS.r && Math.hypot(lx - LOGO_NUCLEOLUS.cx, ly - LOGO_NUCLEOLUS.cy) > LOGO_NUCLEOLUS.r
}

function logoScale(G: Geo) {
  return Math.min((0.62 * G.R) / RING.r, (G.h * 0.36) / (2 * (RING.r + RING.w)))
}

function logoScene(G: Geo): Scene & { info: LogoInfo } {
  const { N, cx, cy } = G
  const sc = alloc(N, T.logo, 'angle') as Scene & { info: LogoInfo }
  const r = rng(71)
  const k = logoScale(G)
  const nV = Math.max(10, Math.round(N * 0.045))
  const nN = Math.round(N * 0.27)
  const nR = N - nV - nN
  const lx = new Float32Array(N)
  const ly = new Float32Array(N)
  const part = new Uint8Array(N) // 0 Ring, 1 Kern, 2 Vesikel
  let i = 0
  for (let q = 1; i < nR && q < 200000; q++) {
    const x = RING.cx - 19 + 38 * halton(q, 2)
    const y = RING.cy - 19 + 38 * halton(q, 3)
    if (inRing(x, y)) {
      lx[i] = x
      ly[i] = y
      part[i] = 0
      i++
    }
  }
  const NU = LOGO_NUCLEUS
  for (let q = 1; i < nR + nN && q < 200000; q++) {
    const x = NU.cx - NU.r + 2 * NU.r * halton(q, 2)
    const y = NU.cy - NU.r + 2 * NU.r * halton(q, 3)
    if (inNucleus(x, y)) {
      lx[i] = x
      ly[i] = y
      part[i] = 1
      i++
    }
  }
  // Vesikel: Sonnenblumen-Muster um den Mittelpunkt (relativ gespeichert)
  for (let j = 0; i < N; j++, i++) {
    const rr = LOGO_VESICLE.r * Math.sqrt((j + 0.5) / nV)
    const th = j * 2.39996
    lx[i] = Math.cos(th) * rr
    ly[i] = Math.sin(th) * rr
    part[i] = 2
  }
  const areaR = (RING_SWEEP * RING.r * 2 * RING.w + Math.PI * RING.w * RING.w) * k * k
  const areaN = (Math.PI * NU.r * NU.r - Math.PI * LOGO_NUCLEOLUS.r ** 2) * k * k
  const areaV = Math.PI * LOGO_VESICLE.r ** 2 * k * k
  const dot = (area: number, n: number) => Math.max(1, Math.min(3.4, 0.5 * Math.sqrt(area / Math.max(1, n))))
  const sR = dot(areaR, nR)
  const sN = dot(areaN, nN)
  const sV = dot(areaV, nV)

  const ves = (t: number) => {
    const u = clamp01((t - BUD0) / (BUD1 - BUD0))
    const b = easeOutBack(u)
    return {
      x: BUD_FROM.x + (LOGO_VESICLE.cx - BUD_FROM.x) * b,
      y: BUD_FROM.y + (LOGO_VESICLE.cy - BUD_FROM.y) * b,
      s: 0.45 + 0.55 * easeOut(u),
    }
  }
  const sx = (v: number) => cx + (v - RING.cx) * k
  const sy = (v: number) => cy + (v - RING.cy) * k
  for (let j = 0; j < N; j++) {
    sc.c[j] = part[j] === 2 ? SAND : GREEN
    sc.s[j] = part[j] === 0 ? sR : part[j] === 1 ? sN : sV
    if (part[j] !== 2) {
      sc.x[j] = sx(lx[j])
      sc.y[j] = sy(ly[j])
    }
  }
  sc.update = (t) => {
    const crisp = smooth(CRISP0, CRISP1, t)
    const v = ves(t)
    for (let j = 0; j < N; j++) {
      if (part[j] === 2) {
        sc.x[j] = sx(v.x + lx[j] * v.s)
        sc.y[j] = sy(v.y + ly[j] * v.s)
      }
      sc.a[j] = 1 - crisp
    }
  }
  sc.update(0)
  for (let j = 0; j < N; j++) {
    sc.key[j] = angleKey(sc.x[j] - cx, sc.y[j] - cy)
    if (part[j] === 0) {
      let rel = Math.atan2(ly[j] - RING.cy, lx[j] - RING.cx) - RING_A0
      rel = ((rel % TAU) + TAU) % TAU
      sc.delay[j] = (Math.min(rel, RING_SWEEP) / RING_SWEEP) * 300 + r() * 50
    } else if (part[j] === 1) {
      sc.delay[j] = 100 + (Math.hypot(lx[j] - NU.cx, ly[j] - NU.cy) / NU.r) * 180 + r() * 50
    } else {
      sc.delay[j] = 240 + r() * 50
    }
    sc.dur[j] = 580 + r() * 140
  }
  sc.info = { k, vesicle: ves }
  sc.extra = (ctx, t) => {
    const a = smooth(CRISP0, CRISP1, t)
    if (a <= 0.01) return
    ctx.globalAlpha = a
    drawLogo(ctx, G, k, ves(t), 0, 1)
  }
  return sc
}

/** Bildmarke scharf zeichnen; open = 0 … 1 weitet den Ring (Ausgang) */
function drawLogo(ctx: CanvasRenderingContext2D, G: Geo, k: number, v: { x: number; y: number; s: number }, ringR: number, nucA: number) {
  const { cx, cy } = G
  const pal = (ctx as CanvasRenderingContext2D & { _pal?: Palette })._pal!
  const rr = ringR || RING.r * k
  ctx.lineCap = 'round'
  ctx.strokeStyle = pal.colors[GREEN]
  ctx.lineWidth = 2 * RING.w * k
  ctx.beginPath()
  ctx.arc(cx, cy, rr, RING_A0, RING_A0 + RING_SWEEP)
  ctx.stroke()
  const ga = ctx.globalAlpha
  if (nucA > 0.01) {
    ctx.globalAlpha = ga * nucA
    ctx.fillStyle = pal.colors[GREEN]
    ctx.beginPath()
    ctx.arc(cx + (LOGO_NUCLEUS.cx - RING.cx) * k, cy + (LOGO_NUCLEUS.cy - RING.cy) * k, LOGO_NUCLEUS.r * k, 0, TAU)
    ctx.arc(cx + (LOGO_NUCLEOLUS.cx - RING.cx) * k, cy + (LOGO_NUCLEOLUS.cy - RING.cy) * k, LOGO_NUCLEOLUS.r * k, 0, TAU, true)
    ctx.fill('evenodd')
  }
  ctx.globalAlpha = ga
  const off = ringR ? ringR - RING.r * k : 0
  ctx.fillStyle = pal.colors[SAND]
  ctx.beginPath()
  ctx.arc(cx + (v.x - RING.cx) * k + off * Math.SQRT1_2, cy + (v.y - RING.cy) * k + off * Math.SQRT1_2, LOGO_VESICLE.r * k * v.s, 0, TAU)
  ctx.fill()
}

/* ------------------------------ Ablauf ------------------------------ */

export interface IntroHandle {
  exit(): void
  destroy(): void
}

export interface IntroOptions {
  canvas: HTMLCanvasElement
  root: HTMLElement
  reduced: boolean
  onStage: (s: Stage) => void
  onFinish: () => void
}

function geometry(w: number, h: number, N?: number): Geo {
  const R = Math.max(90, Math.min(w * 0.38, h * 0.3))
  return {
    w,
    h,
    cx: w / 2,
    cy: h * (w < 700 ? 0.42 : 0.44),
    R,
    sz: Math.max(0.8, Math.min(1.5, R / 240)),
    N: N ?? Math.max(520, Math.min(1500, Math.round((R * R) / 60))),
  }
}

export function startIntro({ canvas, root, reduced, onStage, onFinish }: IntroOptions): IntroHandle {
  const ctx = canvas.getContext('2d')
  const pal = readPalette()
  let G = geometry(window.innerWidth, window.innerHeight)
  const N = G.N
  let dpr = Math.min(2, window.devicePixelRatio || 1)
  let grid: HTMLCanvasElement | null = null
  let scenes: Scene[] = []
  let raf = 0
  let t0 = -1
  let tExit = -1
  let finished = false
  let stageIdx = 0
  let lastT = 0
  const timers: number[] = []

  try {
    document.fonts?.load('italic 20px "Instrument Serif"')
    document.fonts?.load('12px "JetBrains Mono Variable"')
  } catch {
    /* egal */
  }

  // Teilchenzustand
  const x = new Float32Array(N)
  const y = new Float32Array(N)
  const z = new Float32Array(N)
  const s = new Float32Array(N)
  const a = new Float32Array(N)
  const g = new Float32Array(N)
  const c = new Uint8Array(N)
  const bd = new Uint8Array(N)
  const px = new Float32Array(N)
  const py = new Float32Array(N)
  const fx0 = new Float32Array(N)
  const fy0 = new Float32Array(N)
  const fz0 = new Float32Array(N)
  const fs0 = new Float32Array(N)
  const fa0 = new Float32Array(N)
  const fg0 = new Float32Array(N)
  const fc0 = new Uint8Array(N)
  const fb0 = new Uint8Array(N)
  const sc = new Int8Array(N)
  const sl = new Int32Array(N)
  const st0 = new Float64Array(N)
  const du = new Float32Array(N)
  const sw = new Float32Array(N)
  const nsc = new Int8Array(N).fill(-1)
  const nsl = new Int32Array(N)
  const nt0 = new Float64Array(N)
  const ndu = new Float32Array(N)
  const rnd = rng(97)
  let eIdx = -1

  const GAS = 0
  const ATOM = 1
  const MATH = 2
  const DNA = 3
  const LOGO = 4

  function layout() {
    const w = window.innerWidth
    const h = window.innerHeight
    G = geometry(w, h, N)
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    scenes = [gasScene(G), atomScene(G), graphScene(G), dnaScene(G), logoScene(G)]
    const graph = scenes[MATH] as ReturnType<typeof graphScene>
    const [ox, oy] = graph.info.P(0, 0)
    grid = makeGrid(w, h, ox, oy)
    // Lage der Beschriftungen
    const k = logoScale(G)
    root.style.setProperty('--cap-y', `${Math.round(Math.min(h - 110, G.cy + 0.98 * G.R + 10))}px`)
    root.style.setProperty('--word-y', `${Math.round(G.cy + (RING.r + RING.w) * k + Math.max(18, Math.min(40, h * 0.04)))}px`)
  }

  function makeGrid(w: number, h: number, ox: number, oy: number) {
    const cv = document.createElement('canvas')
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    const gx = cv.getContext('2d')
    if (!gx) return null
    gx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const minor = w < 700 ? 9 : 11
    const major = minor * 5
    gx.strokeStyle = pal.colors[GREEN]
    for (const [step, alpha, lw] of [
      [minor, pal.dark ? 0.05 : 0.055, 1],
      [major, pal.dark ? 0.085 : 0.1, 1],
    ] as [number, number, number][]) {
      gx.globalAlpha = alpha
      gx.lineWidth = lw
      gx.beginPath()
      const sx = ((ox % step) + step) % step
      const sy = ((oy % step) + step) % step
      for (let X = sx; X <= w; X += step) {
        gx.moveTo(Math.round(X) + 0.5, 0)
        gx.lineTo(Math.round(X) + 0.5, h)
      }
      for (let Y = sy; Y <= h; Y += step) {
        gx.moveTo(0, Math.round(Y) + 0.5)
        gx.lineTo(w, Math.round(Y) + 0.5)
      }
      gx.stroke()
    }
    // zum Rand hin ausblenden
    gx.globalAlpha = 1
    gx.globalCompositeOperation = 'destination-out'
    const rg = gx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.2, w / 2, h * 0.45, Math.hypot(w, h) * 0.62)
    rg.addColorStop(0, 'rgba(0,0,0,0)')
    rg.addColorStop(1, 'rgba(0,0,0,0.85)')
    gx.fillStyle = rg
    gx.fillRect(0, 0, w, h)
    return cv
  }

  /** alle Teilchen einer Szene zuordnen: nach x bzw. Winkel sortiert */
  function assign(si: number) {
    const S = scenes[si]
    const parts: number[] = []
    for (let i = 0; i < N; i++) if (sc[i] !== si && nsc[i] !== si) parts.push(i)
    const slots: number[] = []
    for (let j = 0; j < N; j++) if (!S.pinned?.has(j)) slots.push(j)
    const pk = new Float64Array(N)
    for (const i of parts) pk[i] = S.mode === 'x' ? x[i] + y[i] * 0.001 : angleKey(x[i] - G.cx, y[i] - G.cy)
    parts.sort((p, q) => pk[p] - pk[q])
    slots.sort((p, q) => S.key[p] - S.key[q])
    const n = Math.min(parts.length, slots.length)
    for (let k = 0; k < n; k++) {
      const i = parts[k]
      const j = slots[k]
      nsc[i] = si
      nsl[i] = j
      nt0[i] = S.start + S.delay[j]
      ndu[i] = S.dur[j]
    }
  }

  const events: [number, () => void][] = [
    [T.atom, () => assign(ATOM)],
    [
      T.ion,
      () => {
        // das Elektron der M-Schale verlässt das Atom und wird zum Zeichenstift
        for (let i = 0; i < N; i++) if (sc[i] === ATOM && sl[i] === E_OUTER) eIdx = i
        if (eIdx >= 0) {
          nsc[eIdx] = MATH
          nsl[eIdx] = 0
          nt0[eIdx] = T.ion
          ndu[eIdx] = T.math + PEN0 - T.ion
        }
      },
    ],
    [T.math, () => assign(MATH)],
    [T.bio, () => assign(DNA)],
    [T.logo, () => assign(LOGO)],
  ]
  let evIdx = 0

  const graphRoots = () => (scenes[MATH] as ReturnType<typeof graphScene>).info.tPass(3) + T.math + 200
  const stages: [number, Stage][] = [
    [T.atom + 300, 'chem'],
    [T.ion + 60, 'ion'],
    [T.math + 200, 'math'],
    [0, 'roots'],
    [T.bio + 150, 'bio'],
    [T.logo + 300, 'logo'],
  ]

  function init() {
    for (let i = 0; i < N; i++) {
      sc[i] = GAS
      sl[i] = i
      st0[i] = -1
      du[i] = 1
    }
  }

  // Sortierpuffer für das Zeichnen
  const order = new Float64Array(N)
  const bodies: number[] = []

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    if (!ctx) return
    if (t0 < 0) t0 = now
    const t = now - t0
    lastT = t
    while (evIdx < events.length && t >= events[evIdx][0]) events[evIdx++][1]()
    stages[3][0] = graphRoots()
    while (stageIdx < stages.length && t >= stages[stageIdx][0]) onStage(stages[stageIdx++][1])
    if (!finished && t >= T.finish) {
      finished = true
      onFinish()
    }

    // anstehende Übergänge starten
    for (let i = 0; i < N; i++) {
      if (nsc[i] >= 0 && t >= nt0[i]) {
        fx0[i] = x[i]
        fy0[i] = y[i]
        fz0[i] = z[i]
        fs0[i] = s[i]
        fa0[i] = a[i]
        fg0[i] = g[i]
        fc0[i] = c[i]
        fb0[i] = bd[i]
        sc[i] = nsc[i]
        sl[i] = nsl[i]
        st0[i] = nt0[i]
        du[i] = ndu[i]
        sw[i] = i === eIdx ? 0.55 : (rnd() - 0.5) * 0.5
        nsc[i] = -1
      }
    }
    const used = [0, 0, 0, 0, 0]
    for (let i = 0; i < N; i++) used[sc[i]] = 1
    for (let k = 0; k < scenes.length; k++) if (used[k]) scenes[k].update(t - scenes[k].start)

    const first = t === 0 || px[0] === 0
    for (let i = 0; i < N; i++) {
      const S = scenes[sc[i]]
      const j = sl[i]
      const u = (t - st0[i]) / du[i]
      if (u >= 1) {
        x[i] = S.x[j]
        y[i] = S.y[j]
        z[i] = S.z[j]
        s[i] = S.s[j]
        a[i] = S.a[j]
        g[i] = S.g[j]
        c[i] = S.c[j]
        bd[i] = S.b[j]
      } else {
        const e = easeInOut(clamp01(u))
        const dx = S.x[j] - fx0[i]
        const dy = S.y[j] - fy0[i]
        const bend = Math.sin(Math.PI * e) * sw[i]
        x[i] = fx0[i] + dx * e - dy * bend
        y[i] = fy0[i] + dy * e + dx * bend
        z[i] = fz0[i] + (S.z[j] - fz0[i]) * e
        s[i] = fs0[i] + (S.s[j] - fs0[i]) * e
        a[i] = fa0[i] + (S.a[j] - fa0[i]) * e
        g[i] = fg0[i] + (S.g[j] - fg0[i]) * e
        c[i] = e < 0.5 ? fc0[i] : S.c[j]
        bd[i] = e < 0.5 ? fb0[i] : S.b[j]
      }
      if (first) {
        px[i] = x[i]
        py[i] = y[i]
      }
    }
    draw(t)
    for (let i = 0; i < N; i++) {
      px[i] = x[i]
      py[i] = y[i]
    }
  }

  function background(t: number) {
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, G.w, G.h)
    if (!grid) return
    const gr = reduced ? 1 : easeOut(clamp01(t / 900))
    if (gr >= 1) {
      ctx.drawImage(grid, 0, 0, G.w, G.h)
    } else if (gr > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(G.cx, G.cy, gr * Math.hypot(G.w, G.h) * 0.6, 0, TAU)
      ctx.clip()
      ctx.globalAlpha = gr
      ctx.drawImage(grid, 0, 0, G.w, G.h)
      ctx.restore()
    }
  }

  function draw(t: number) {
    if (!ctx) return
    ;(ctx as CanvasRenderingContext2D & { _pal?: Palette })._pal = pal
    background(t)
    const ex = tExit >= 0 ? clamp01((t - tExit) / T.exit) : 0
    const fade = 1 - clamp01(ex * 4)
    const push = 1 + 0.5 * ex * ex

    // kleine Teilchen gebündelt nach Farbe, Deckkraft und Größe
    let n = 0
    bodies.length = 0
    for (let i = 0; i < N; i++) {
      const al = a[i] * fade
      if (al < 0.02) continue
      if (bd[i] && s[i] > 1.6) {
        bodies.push(i)
        continue
      }
      const qa = Math.max(1, Math.min(6, Math.round(al * 6)))
      const qs = Math.max(1, Math.min(31, Math.round(s[i] * 4)))
      order[n++] = ((c[i] * 8 + qa) * 32 + qs) * 4096 + i
    }
    const ord = order.subarray(0, n).sort()
    ctx.lineCap = 'round'
    let cur = -1
    const maxStreak = 11
    for (let k = 0; k < n; k++) {
      const v = ord[k]
      const key = Math.floor(v / 4096)
      const i = v - key * 4096
      if (key !== cur) {
        if (cur >= 0) ctx.stroke()
        cur = key
        const qs = key % 32
        const qa = Math.floor(key / 32) % 8
        const col = Math.floor(key / 256)
        ctx.strokeStyle = pal.colors[col]
        ctx.globalAlpha = qa / 6
        ctx.lineWidth = qs / 2
        ctx.beginPath()
      }
      let X = x[i]
      let Y = y[i]
      let PX = px[i]
      let PY = py[i]
      if (ex > 0) {
        X = G.cx + (X - G.cx) * push
        Y = G.cy + (Y - G.cy) * push
        PX = G.cx + (PX - G.cx) * push
        PY = G.cy + (PY - G.cy) * push
      }
      // kurze Bewegungsspur: halbe Strecke seit dem letzten Bild, gedeckelt
      const dx = (X - PX) * 0.55
      const dy = (Y - PY) * 0.55
      const d = Math.hypot(dx, dy)
      const m = d > maxStreak ? maxStreak / d : 1
      PX = X - dx * m
      PY = Y - dy * m
      ctx.moveTo(PX, PY)
      ctx.lineTo(X + 0.01, Y)
    }
    if (cur >= 0) ctx.stroke()

    // Körper (Nukleonen, Elektronen, Messpunkte) nach Tiefe
    bodies.sort((p, q) => z[p] - z[q])
    for (const i of bodies) {
      const al = a[i] * fade
      const X = G.cx + (x[i] - G.cx) * push
      const Y = G.cy + (y[i] - G.cy) * push
      if (g[i] > 0.02) {
        ctx.globalAlpha = 0.16 * g[i] * al
        ctx.fillStyle = pal.colors[c[i]]
        ctx.beginPath()
        ctx.arc(X, Y, s[i] * 3.2, 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = al
      ctx.strokeStyle = pal.colors[c[i]]
      ctx.lineWidth = s[i] * 2
      const dx = (X - px[i]) * 0.35
      const dy = (Y - py[i]) * 0.35
      const d = Math.hypot(dx, dy)
      const lim = Math.min(6, s[i] * 0.8)
      const m = d > lim ? lim / d : 1
      ctx.beginPath()
      ctx.moveTo(X - dx * m, Y - dy * m)
      ctx.lineTo(X + 0.01, Y)
      ctx.stroke()
      if (s[i] > 3) {
        ctx.globalAlpha = al * (pal.dark ? 0.14 : 0.24)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(X - s[i] * 0.32, Y - s[i] * 0.34, s[i] * 0.42, 0, TAU)
        ctx.fill()
      }
    }

    // Beschriftungen und scharfe Bildmarke
    ctx.fillStyle = pal.colors[INK2]
    const graph = scenes[MATH]
    const gFade = (1 - smooth(T.bio - 40, T.bio + 260, t)) * fade
    if (t >= T.math && gFade > 0) graph.extra?.(ctx, t - T.math, gFade)
    if (t >= T.logo && ex === 0) scenes[LOGO].extra?.(ctx, t - T.logo, 1)

    if (ex > 0) drawExit(t, ex)
    ctx.globalAlpha = 1
  }

  /** Die Membran öffnet sich und gibt die Seite frei */
  function drawExit(t: number, ex: number) {
    if (!ctx) return
    const L = scenes[LOGO] as ReturnType<typeof logoScene>
    const k = L.info.k
    const e = easeInOut(ex)
    const r0 = (RING.r - RING.w) * k
    const far = Math.hypot(Math.max(G.cx, G.w - G.cx), Math.max(G.cy, G.h - G.cy)) + 4 * RING.w * k
    const hole = r0 + (far - r0) * e
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(G.cx, G.cy, hole, 0, TAU)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    const ringA = 1 - smooth(0.75, 1, ex)
    ctx.globalAlpha = ringA
    const v = L.info.vesicle(t - T.logo)
    drawLogo(ctx, G, k, v, hole + RING.w * k, 1 - smooth(0, 0.35, ex))
  }

  function drawStatic() {
    if (!ctx) return
    ;(ctx as CanvasRenderingContext2D & { _pal?: Palette })._pal = pal
    background(1e6)
    const L = scenes[LOGO] as ReturnType<typeof logoScene>
    ctx.globalAlpha = 1
    drawLogo(ctx, G, L.info.k, L.info.vesicle(1e6), 0, 1)
  }

  layout()
  init()
  const onResize = () => {
    layout()
    if (reduced) drawStatic()
  }
  window.addEventListener('resize', onResize)

  if (reduced || !ctx) {
    drawStatic()
    onStage('logo')
    timers.push(window.setTimeout(onFinish, REDUCED_FINISH))
  } else {
    raf = requestAnimationFrame(frame)
  }

  return {
    exit() {
      if (reduced || !ctx) return
      if (tExit < 0) tExit = lastT
      if (!raf) raf = requestAnimationFrame(frame)
    },
    destroy() {
      cancelAnimationFrame(raf)
      raf = 0
      timers.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('resize', onResize)
    },
  }
}
