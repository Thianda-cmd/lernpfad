import * as THREE from 'three'
import type { RadialFn } from './geometry'
import { mulberry32, rand, randomUnit, rayToSurface, sdRoundBox } from './math'
import type { OrientedItem, SphereItem } from './parts/Organelles'

export const PLANT_HOME = {
  position: [15, 26, 52] as [number, number, number],
  target: [0, -1, 0] as [number, number, number],
}

/* ------------------------------------------------------------------ */
/*  Maße (Halbachsen)                                                  */
/* ------------------------------------------------------------------ */

export const WALL = { hx: 13.5, hy: 7.8, hz: 7.8, r: 1.5, t: 0.72 }
export const MEMBRANE_INSET = 0.03
export const MEMBRANE_T = 0.13
export const VAC = { cx: 2.6, hx: 9.6, hy: 5.95, hz: 5.95, r: 3.2 }
export const NUCLEUS = { center: new THREE.Vector3(-9.7, 0.4, 0.3), r: 2.45 }
export const NUCLEOLUS_OFFSET = new THREE.Vector3(0, -1.0, -0.9)

const MAX_R = 20

export const wallSdf = (x: number, y: number, z: number) => sdRoundBox(x, y, z, WALL.hx, WALL.hy, WALL.hz, WALL.r)
export const innerSdf = (x: number, y: number, z: number) => wallSdf(x, y, z) + WALL.t
export const membraneSdf = (x: number, y: number, z: number) => innerSdf(x, y, z) + MEMBRANE_INSET
export const vacSdf = (x: number, y: number, z: number) => sdRoundBox(x - VAC.cx, y, z, VAC.hx, VAC.hy, VAC.hz, VAC.r)

export const wallOuterFn: RadialFn = (dx, dy, dz) => rayToSurface(wallSdf, dx, dy, dz, MAX_R)
export const wallInnerFn: RadialFn = (dx, dy, dz) => rayToSurface(innerSdf, dx, dy, dz, MAX_R)
export const membraneFn: RadialFn = (dx, dy, dz) => rayToSurface(membraneSdf, dx, dy, dz, MAX_R)
export const membraneInnerFn: RadialFn = (dx, dy, dz) => rayToSurface((x, y, z) => membraneSdf(x, y, z) + MEMBRANE_T, dx, dy, dz, MAX_R)
export const vacuoleFn: RadialFn = (dx, dy, dz) => rayToSurface(vacSdf, dx, dy, dz, MAX_R)

/** Liegt p im Cytoplasma (innerhalb der Membran, außerhalb von Vakuole und Zellkern)? */
export function inCytoplasm(p: THREE.Vector3, margin = 0.15) {
  if (membraneSdf(p.x, p.y, p.z) > -(MEMBRANE_T + margin)) return false
  if (vacSdf(p.x, p.y, p.z) < margin) return false
  if (p.distanceTo(NUCLEUS.center) < NUCLEUS.r + 0.35 + margin) return false
  return true
}

/* ------------------------------------------------------------------ */
/*  Platzierung                                                        */
/* ------------------------------------------------------------------ */

export interface ChloroItem {
  position: THREE.Vector3
  /** Normale der Wand, an der der Chloroplast liegt (= Dickenachse) */
  normal: THREE.Vector3
  /** Längsachse */
  axis: THREE.Vector3
  size: THREE.Vector3 // Länge, Dicke, Breite
}

export interface PlantLayout {
  chloroplasts: ChloroItem[]
  mitochondria: OrientedItem[]
  peroxisomes: SphereItem[]
  vesicles: SphereItem[]
  ribosomes: THREE.Vector3[]
  plasmodesmata: { position: THREE.Vector3; normal: THREE.Vector3 }[]
  golgi: { position: THREE.Vector3; up: THREE.Vector3; spin: number; scale: number }[]
  serCenter: THREE.Vector3
  serAccept: (p: THREE.Vector3) => boolean
  erAccept: (p: THREE.Vector3) => boolean
}

interface Occ {
  c: THREE.Vector3
  r: number
}

const free = (occ: Occ[], c: THREE.Vector3, r: number) => occ.every((o) => o.c.distanceTo(c) > o.r + r)

export function buildPlantLayout(): PlantLayout {
  const rng = mulberry32(777)
  const occ: Occ[] = [{ c: NUCLEUS.center.clone(), r: NUCLEUS.r + 0.9 }]
  const inner = { hy: WALL.hy - WALL.t - MEMBRANE_INSET - MEMBRANE_T, hz: WALL.hz - WALL.t - MEMBRANE_INSET - MEMBRANE_T, hx: WALL.hx - WALL.t - MEMBRANE_INSET - MEMBRANE_T }

  // Golgi (Dictyosomen) & glattes ER im Cytoplasma-Bereich links
  const golgi = [
    { position: new THREE.Vector3(-8.6, 4.4, -3.4), up: new THREE.Vector3(0.1, 0.7, -0.7).normalize(), spin: 0.4, scale: 0.55 },
    { position: new THREE.Vector3(-11.2, -3.8, -3.2), up: new THREE.Vector3(-0.4, -0.6, -0.6).normalize(), spin: 1.2, scale: 0.5 },
    { position: new THREE.Vector3(4.5, -6.35, -3.4), up: new THREE.Vector3(0, -1, 0), spin: 0.3, scale: 0.42 },
  ]
  golgi.forEach((g) => occ.push({ c: g.position.clone(), r: 1.6 * g.scale + 0.4 }))
  const serCenter = new THREE.Vector3(-10.4, -4.3, 3.6)
  occ.push({ c: serCenter.clone(), r: 1.9 })

  // Chloroplasten an den Längswänden
  const chloroplasts: ChloroItem[] = []
  const faces = [
    { n: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1), d: inner.hy, ext: [inner.hx - 1.8, inner.hz - 1.6] },
    { n: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1), d: inner.hy, ext: [inner.hx - 1.8, inner.hz - 1.6] },
    { n: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), d: inner.hz, ext: [inner.hx - 1.8, inner.hy - 1.6] },
    { n: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), d: inner.hz, ext: [inner.hx - 1.8, inner.hy - 1.6] },
  ]
  const perFace = [11, 11, 9, 12]
  faces.forEach((f, fi) => {
    let placed = 0
    for (let t = 0; t < 600 && placed < perFace[fi]; t++) {
      const size = new THREE.Vector3(rand(rng, 2.3, 2.9), rand(rng, 0.66, 0.78), rand(rng, 1.4, 1.75))
      const a = rand(rng, -f.ext[0], f.ext[0])
      const b = rand(rng, -f.ext[1], f.ext[1])
      const pos = f.n
        .clone()
        .multiplyScalar(f.d - size.y / 2 - 0.12)
        .addScaledVector(f.u, a)
        .addScaledVector(f.v, b)
      if (!free(occ, pos, 1.35)) continue
      if (vacSdf(pos.x, pos.y, pos.z) < size.y / 2 + 0.05) continue
      const ang = rand(rng, -0.6, 0.6)
      const axis = f.u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(f.v, Math.sin(ang)).normalize()
      occ.push({ c: pos, r: 1.3 })
      chloroplasts.push({ position: pos, normal: f.n.clone(), axis, size })
      placed++
    }
  })

  // Mitochondrien – im Randplasma (tangential) und im Plasmabereich links
  const mitochondria: OrientedItem[] = []
  for (let t = 0; t < 3000 && mitochondria.length < 12; t++) {
    const inPocket = mitochondria.length < 5
    let pos: THREE.Vector3
    let axis: THREE.Vector3
    const s = rand(rng, 0.36, 0.42)
    if (inPocket) {
      pos = new THREE.Vector3(rand(rng, -12, -7.4), rand(rng, -5.8, 5.8), rand(rng, -5.8, 5.8))
      axis = randomUnit(rng)
    } else {
      const f = faces[Math.floor(rng() * faces.length)]
      const a = rand(rng, -f.ext[0], f.ext[0])
      const b = rand(rng, -f.ext[1], f.ext[1])
      pos = f.n
        .clone()
        .multiplyScalar(f.d - s - 0.15)
        .addScaledVector(f.u, a)
        .addScaledVector(f.v, b)
      const ang = rng() * Math.PI
      axis = f.u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(f.v, Math.sin(ang))
    }
    const half = 1.3 * s
    const e1 = pos.clone().addScaledVector(axis, half)
    const e2 = pos.clone().addScaledVector(axis, -half)
    if (![pos, e1, e2].every((p) => inCytoplasm(p, s))) continue
    if (![pos, e1, e2].every((p) => free(occ, p, s + 0.1))) continue
    ;[pos, e1, e2].forEach((p) => occ.push({ c: p, r: s + 0.05 }))
    mitochondria.push({ position: pos, axis, scale: s, spin: rng() * Math.PI * 2 })
  }

  // Peroxisomen – bevorzugt neben Chloroplasten (Photorespiration)
  const peroxisomes: SphereItem[] = []
  for (let t = 0; t < 2000 && peroxisomes.length < 9; t++) {
    const c = chloroplasts[Math.floor(rng() * chloroplasts.length)]
    const radius = rand(rng, 0.26, 0.32)
    const side = new THREE.Vector3().crossVectors(c.normal, c.axis).normalize()
    const pos = c.position
      .clone()
      .addScaledVector(side, (rng() < 0.5 ? -1 : 1) * rand(rng, 1.05, 1.3))
      .addScaledVector(c.axis, rand(rng, -0.8, 0.8))
      .addScaledVector(c.normal, 0.08)
    if (!inCytoplasm(pos, radius) || !free(occ, pos, radius + 0.08)) continue
    occ.push({ c: pos, r: radius })
    peroxisomes.push({ position: pos, radius })
  }

  // Vesikel
  const vesicles: SphereItem[] = []
  for (let t = 0; t < 3000 && vesicles.length < 16; t++) {
    const radius = rand(rng, 0.13, 0.2)
    const pos = new THREE.Vector3(rand(rng, -inner.hx, inner.hx), rand(rng, -inner.hy, inner.hy), rand(rng, -inner.hz, inner.hz))
    if (!inCytoplasm(pos, radius) || !free(occ, pos, radius + 0.1)) continue
    occ.push({ c: pos, r: radius })
    vesicles.push({ position: pos, radius })
  }

  // Freie Ribosomen
  const ribosomes: THREE.Vector3[] = []
  for (let t = 0; t < 60000 && ribosomes.length < 520; t++) {
    const pos = new THREE.Vector3(rand(rng, -inner.hx, inner.hx), rand(rng, -inner.hy, inner.hy), rand(rng, -inner.hz, inner.hz))
    if (!inCytoplasm(pos, 0.05)) continue
    if (!occ.every((o) => o.c.distanceTo(pos) > o.r + 0.05)) continue
    ribosomes.push(pos)
  }

  // Plasmodesmen in Tüpfelfeldern
  const plasmodesmata: { position: THREE.Vector3; normal: THREE.Vector3 }[] = []
  const fields = [
    { n: new THREE.Vector3(0, 0, -1), c: new THREE.Vector3(-3, 2.2, 0) },
    { n: new THREE.Vector3(0, 0, -1), c: new THREE.Vector3(6.5, -2.8, 0) },
    { n: new THREE.Vector3(0, -1, 0), c: new THREE.Vector3(-1.5, 0, -2.5) },
    { n: new THREE.Vector3(0, -1, 0), c: new THREE.Vector3(8, 0, 1.8) },
    { n: new THREE.Vector3(-1, 0, 0), c: new THREE.Vector3(0, -2.4, -3) },
    { n: new THREE.Vector3(1, 0, 0), c: new THREE.Vector3(0, -2.6, -2.4) },
    { n: new THREE.Vector3(0, 1, 0), c: new THREE.Vector3(-4.5, 0, -3.2) },
  ]
  for (const f of fields) {
    const u = Math.abs(f.n.x) > 0.5 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const v = new THREE.Vector3().crossVectors(f.n, u)
    const depth = Math.abs(f.n.x) > 0.5 ? WALL.hx : Math.abs(f.n.y) > 0.5 ? WALL.hy : WALL.hz
    for (let k = 0; k < 7; k++) {
      const p = f.c
        .clone()
        .addScaledVector(u, rand(rng, -0.55, 0.55))
        .addScaledVector(v, rand(rng, -0.55, 0.55))
      p.addScaledVector(f.n, depth - WALL.t / 2)
      plasmodesmata.push({ position: p, normal: f.n.clone() })
    }
  }

  const serAccept = (p: THREE.Vector3) => inCytoplasm(p, 0.2) && p.x < -6.9
  const erAccept = (p: THREE.Vector3) => inCytoplasm(p, 0.15) && golgi.every((g) => g.position.distanceTo(p) > 1.3)

  return { chloroplasts, mitochondria, peroxisomes, vesicles, ribosomes, plasmodesmata, golgi, serCenter, serAccept, erAccept }
}
