import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise3D } from './math'

export type RadialFn = (dx: number, dy: number, dz: number) => number

/**
 * Geschlossene Oberfläche, deren Radius in jeder Richtung durch fn bestimmt wird.
 * Normalen werden numerisch berechnet, damit keine Naht sichtbar ist.
 */
export function radialSurface(fn: RadialFn, W = 160, H = 100) {
  const count = (W + 1) * (H + 1)
  const pos = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  const P = (theta: number, phi: number, out: number[]) => {
    const st = Math.sin(theta)
    const dx = -Math.cos(phi) * st
    const dy = Math.cos(theta)
    const dz = Math.sin(phi) * st
    const r = fn(dx, dy, dz)
    out[0] = dx * r
    out[1] = dy * r
    out[2] = dz * r
    return out
  }
  const p = [0, 0, 0]
  const pa = [0, 0, 0]
  const pb = [0, 0, 0]
  const pc = [0, 0, 0]
  const pd = [0, 0, 0]
  const e = 0.004
  let k = 0
  for (let iy = 0; iy <= H; iy++) {
    const theta = (iy / H) * Math.PI
    const tc = Math.min(Math.max(theta, 0.04), Math.PI - 0.04)
    for (let ix = 0; ix <= W; ix++) {
      const phi = (ix / W) * Math.PI * 2
      P(theta, phi, p)
      pos[k * 3] = p[0]
      pos[k * 3 + 1] = p[1]
      pos[k * 3 + 2] = p[2]
      P(tc + e, phi, pa)
      P(tc - e, phi, pb)
      P(tc, phi + e, pc)
      P(tc, phi - e, pd)
      const t1x = pa[0] - pb[0]
      const t1y = pa[1] - pb[1]
      const t1z = pa[2] - pb[2]
      const t2x = pc[0] - pd[0]
      const t2y = pc[1] - pd[1]
      const t2z = pc[2] - pd[2]
      let nx = t1y * t2z - t1z * t2y
      let ny = t1z * t2x - t1x * t2z
      let nz = t1x * t2y - t1y * t2x
      if (nx * p[0] + ny * p[1] + nz * p[2] < 0) {
        nx = -nx
        ny = -ny
        nz = -nz
      }
      const len = Math.hypot(nx, ny, nz) || 1
      nor[k * 3] = nx / len
      nor[k * 3 + 1] = ny / len
      nor[k * 3 + 2] = nz / len
      uv[k * 2] = ix / W
      uv[k * 2 + 1] = 1 - iy / H
      k++
    }
  }
  const indices: number[] = []
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * (W + 1) + ix + 1
      const b = iy * (W + 1) + ix
      const c = (iy + 1) * (W + 1) + ix
      const d = (iy + 1) * (W + 1) + ix + 1
      if (iy !== 0) indices.push(a, b, d)
      if (iy !== H - 1) indices.push(b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(indices)
  g.computeBoundingSphere()
  return g
}

export interface CapRing {
  s: number
  color: THREE.ColorRepresentation
}

/**
 * Schnittfläche (Deckel) einer aufgeschnittenen Form in der Ebene, die von a und b aufgespannt wird.
 * Die Fläche liegt zwischen inner(d) und outer(d) für d = a·cos t + b·sin t, t ∈ [t0, t1].
 */
export function radialCap(o: {
  inner: RadialFn | null
  outer: RadialFn
  a: THREE.Vector3
  b: THREE.Vector3
  t0: number
  t1: number
  normal: THREE.Vector3
  rings: CapRing[]
  segments?: number
}) {
  const segs = o.segments ?? 160
  const R = o.rings.length
  const count = (segs + 1) * R
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  const colors = o.rings.map((r) => new THREE.Color(r.color))
  let k = 0
  for (let i = 0; i <= segs; i++) {
    const t = o.t0 + ((o.t1 - o.t0) * i) / segs
    const c = Math.cos(t)
    const s = Math.sin(t)
    const dx = o.a.x * c + o.b.x * s
    const dy = o.a.y * c + o.b.y * s
    const dz = o.a.z * c + o.b.z * s
    const rIn = o.inner ? o.inner(dx, dy, dz) : 0
    const rOut = o.outer(dx, dy, dz)
    for (let j = 0; j < R; j++) {
      const r = rIn + (rOut - rIn) * o.rings[j].s
      pos[k * 3] = dx * r
      pos[k * 3 + 1] = dy * r
      pos[k * 3 + 2] = dz * r
      col[k * 3] = colors[j].r
      col[k * 3 + 1] = colors[j].g
      col[k * 3 + 2] = colors[j].b
      nor[k * 3] = o.normal.x
      nor[k * 3 + 1] = o.normal.y
      nor[k * 3 + 2] = o.normal.z
      k++
    }
  }
  const idx: number[] = []
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < R - 1; j++) {
      const v00 = i * R + j
      const v01 = i * R + j + 1
      const v10 = (i + 1) * R + j
      const v11 = (i + 1) * R + j + 1
      idx.push(v00, v10, v11, v00, v11, v01)
    }
  }
  // Wicklung prüfen, damit die Vorderseite zur Normalen zeigt
  const probe = Math.floor(segs / 2) * R + (R - 2)
  const v = (n: number) => new THREE.Vector3(pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2])
  const A = v(probe)
  const B = v(probe + R)
  const C = v(probe + R + 1)
  const cr = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A))
  if (cr.dot(o.normal) < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const tmp = idx[i + 1]
      idx[i + 1] = idx[i + 2]
      idx[i + 2] = tmp
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

export interface SheetSample {
  position: THREE.Vector3
  normal: THREE.Vector3
}

/**
 * Abgeflachte Röhre entlang einer Kurve – die flache Seite liegt tangential zu `center`
 * (ideal für ER-Zisternen, die sich um den Zellkern legen).
 */
export function sheetGeometry(
  points: THREE.Vector3[],
  center: THREE.Vector3,
  width: number,
  thickness: number,
  opts: { samples?: number; radial?: number; widthMod?: (u: number) => number } = {},
) {
  const n = opts.samples ?? 90
  const R = opts.radial ?? 14
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const Ps: THREE.Vector3[] = []
  const Ns: THREE.Vector3[] = []
  const Bs: THREE.Vector3[] = []
  const Ws: number[] = []
  const Hs: number[] = []
  const pos = new Float32Array((n + 1) * R * 3)
  let k = 0
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const P = curve.getPointAt(u)
    const T = curve.getTangentAt(u).normalize()
    const N = P.clone().sub(center).normalize()
    N.sub(T.clone().multiplyScalar(N.dot(T))).normalize()
    const B = new THREE.Vector3().crossVectors(T, N).normalize()
    const taper = Math.pow(Math.max(Math.sin(Math.PI * u), 0), 0.32)
    const w = (width / 2) * taper * (opts.widthMod ? opts.widthMod(u) : 1)
    const h = (thickness / 2) * Math.sqrt(taper)
    Ps.push(P)
    Ns.push(N)
    Bs.push(B)
    Ws.push(w)
    Hs.push(h)
    for (let a = 0; a < R; a++) {
      const ang = (a / R) * Math.PI * 2
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      pos[k++] = P.x + B.x * c * w + N.x * s * h
      pos[k++] = P.y + B.y * c * w + N.y * s * h
      pos[k++] = P.z + B.z * c * w + N.z * s * h
    }
  }
  const idx: number[] = []
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < R; a++) {
      const a2 = (a + 1) % R
      const v0 = i * R + a
      const v1 = i * R + a2
      const v2 = (i + 1) * R + a
      const v3 = (i + 1) * R + a2
      idx.push(v0, v2, v1, v1, v2, v3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingSphere()

  const sample = (u: number, ang: number): SheetSample => {
    const i = Math.min(n, Math.max(0, Math.round(u * n)))
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    const P = Ps[i]
    const position = P.clone()
      .addScaledVector(Bs[i], c * Ws[i])
      .addScaledVector(Ns[i], s * Hs[i])
    const normal = Bs[i]
      .clone()
      .multiplyScalar(c / Math.max(Ws[i], 1e-3))
      .addScaledVector(Ns[i], s / Math.max(Hs[i], 1e-3))
      .normalize()
    return { position, normal }
  }
  return { geometry: g, sample, curve }
}

export function tubeGeometry(points: THREE.Vector3[], radius: number, segments = 64, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  return new THREE.TubeGeometry(curve, segments, radius, radial, false)
}

export function merge(geos: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  if (!merged) throw new Error('Geometrien konnten nicht zusammengeführt werden')
  merged.computeBoundingSphere()
  return merged
}

/** Indizierte, nahtlose Kugel (für Verformungen). */
export function smoothSphere(detail = 10) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  g = mergeVertices(g, 1e-5)
  return g
}

/** Kugel mit organischer, knubbeliger Oberfläche. */
export function blobGeometry(radius: number, amp: number, freq: number, seed: number, detail = 10, scale = new THREE.Vector3(1, 1, 1)) {
  const g = smoothSphere(detail)
  const noise = createNoise3D(seed)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const n = noise(x * freq + 3.1, y * freq + 1.7, z * freq + 5.3) + 0.5 * noise(x * freq * 2.3, y * freq * 2.3, z * freq * 2.3)
    const r = radius * (1 + amp * n)
    p.setXYZ(i, x * r * scale.x, y * r * scale.y, z * r * scale.z)
  }
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/** Einzelne Golgi-Zisterne: flach, gebogen, mit verdickten Rändern. */
export function cisternaGeometry(len: number, width: number, thick: number, bend: number, seed = 1) {
  const g = smoothSphere(14)
  const noise = createNoise3D(seed)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const rim = Math.pow(Math.abs(x), 6) * 1.1 + Math.pow(Math.abs(z), 8) * 0.5
    const wobble = 1 + 0.06 * noise(x * 2.2, z * 2.2, seed)
    const X = ((x * len) / 2) * wobble
    const Z = ((z * width) / 2) * wobble
    let Y = ((y * thick) / 2) * (1 + rim * 1.8)
    Y += bend * (X * X + 0.55 * Z * Z)
    p.setXYZ(i, X, Y, Z)
  }
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/** Ribosom: große + kleine Untereinheit. */
export function ribosomeGeometry() {
  const large = new THREE.SphereGeometry(1, 10, 8)
  large.scale(1, 0.78, 1)
  const small = new THREE.SphereGeometry(0.74, 10, 8)
  small.scale(1.05, 0.55, 0.85)
  small.translate(0.05, 0.78, 0)
  return merge([large, small])
}

export function composeMatrix(position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3 | number) {
  const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale
  return new THREE.Matrix4().compose(position, quaternion, s)
}

const UP = new THREE.Vector3(0, 1, 0)
export function quatFromDir(dir: THREE.Vector3, axis = UP) {
  return new THREE.Quaternion().setFromUnitVectors(axis, dir.clone().normalize())
}

export function randomQuat(rng: () => number) {
  const u1 = rng()
  const u2 = rng()
  const u3 = rng()
  const sq1 = Math.sqrt(1 - u1)
  const sq2 = Math.sqrt(u1)
  return new THREE.Quaternion(
    sq1 * Math.sin(2 * Math.PI * u2),
    sq1 * Math.cos(2 * Math.PI * u2),
    sq2 * Math.sin(2 * Math.PI * u3),
    sq2 * Math.cos(2 * Math.PI * u3),
  )
}
