import * as THREE from 'three'
import type { RadialFn } from './geometry'
import { createNoise3D, mulberry32, perpendicularTo, rand, randomUnit } from './math'
import type { OrientedItem, SphereItem } from './parts/Organelles'
import { MITO_HALF_LENGTH } from './parts/Organelles'

const noise = createNoise3D(1234)
const AX = 10.4
const AY = 8.6
const AZ = 9.7

/** Radius der Tierzelle in Richtung (dx,dy,dz): leicht abgeflachtes, unregelmäßiges Ellipsoid. */
export const animalCellFn: RadialFn = (dx, dy, dz) => {
  const base = 1 / Math.sqrt((dx / AX) ** 2 + (dy / AY) ** 2 + (dz / AZ) ** 2)
  const n = noise(dx * 1.2 + 2.3, dy * 1.2 + 1.1, dz * 1.2 + 0.4) * 0.065 + noise(dx * 2.9 + 7, dy * 2.9 + 4, dz * 2.9 + 1) * 0.02
  return base * (1 + n)
}

export const ANIMAL_HOME = {
  position: [25, 16.5, 25] as [number, number, number],
  target: [0, -0.6, 0] as [number, number, number],
}

export const MEMBRANE_T = 0.34
export const NUCLEUS_R = 3.35
export const ER_RADII = [3.95, 4.55, 5.15]

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
export const GOLGI_DIR = v(-0.34, 0.8, 0.5).normalize()
export const GOLGI_POS = GOLGI_DIR.clone().multiplyScalar(6.55)
export const CENTROSOME_POS = v(-0.2, 0.84, 0.36).normalize().multiplyScalar(4.45)
export const CENTROSOME_AXIS = v(0.8, 0.2, 0.4).normalize()
export const SER_DIR = v(0.8, -0.2, 0.5).normalize()
export const SER_CENTER = SER_DIR.clone().multiplyScalar(7.0)
export const NUCLEOLUS_OFFSET = v(-1.05, 0.55, 0.65)

interface Occ {
  c: THREE.Vector3
  r: number
}

function inCell(p: THREE.Vector3, margin: number) {
  const len = p.length()
  if (len < 1e-6) return true
  return len + margin < animalCellFn(p.x / len, p.y / len, p.z / len) - MEMBRANE_T
}

/** Wähle das Exemplar, das von der Startansicht aus am besten durch die Schnittöffnung sichtbar ist. */
export function mostVisible<T extends { position: THREE.Vector3 }>(items: T[]): T | undefined {
  let best: T | undefined
  let score = -Infinity
  for (const it of items) {
    const p = it.position
    const s = Math.min(p.x, p.y, p.z)
    if (s > score && s < 0.2) {
      score = s
      best = it
    }
  }
  return best ?? items[0]
}

function free(occ: Occ[], c: THREE.Vector3, r: number) {
  return occ.every((o) => o.c.distanceTo(c) > o.r + r)
}

export interface AnimalLayout {
  mitochondria: OrientedItem[]
  lysosomes: SphereItem[]
  peroxisomes: SphereItem[]
  vesicles: SphereItem[]
  ribosomes: THREE.Vector3[]
  serAccept: (p: THREE.Vector3) => boolean
}

export function buildAnimalLayout(): AnimalLayout {
  const rng = mulberry32(2024)
  const occ: Occ[] = [
    { c: v(0, 0, 0), r: 5.62 },
    { c: GOLGI_POS.clone(), r: 1.9 },
    { c: SER_CENTER.clone(), r: 2.0 },
    { c: CENTROSOME_POS.clone(), r: 1.0 },
  ]
  const removedOctant = (d: THREE.Vector3) => d.x > 0.2 && d.y > 0.2 && d.z > 0.2

  // Mitochondrien – tangential ausgerichtet
  const mitochondria: OrientedItem[] = []
  for (let tries = 0; tries < 4000 && mitochondria.length < 14; tries++) {
    const d = randomUnit(rng)
    if (removedOctant(d)) continue
    const s = rand(rng, 0.48, 0.58)
    const r = rand(rng, 6.0, 8.0)
    const c = d.clone().multiplyScalar(r)
    const axis = perpendicularTo(d).applyAxisAngle(d, rng() * Math.PI * 2)
    axis.addScaledVector(d, rand(rng, -0.25, 0.25)).normalize()
    const half = (MITO_HALF_LENGTH - 1) * s
    const e1 = c.clone().addScaledVector(axis, half)
    const e2 = c.clone().addScaledVector(axis, -half)
    if (![c, e1, e2].every((p) => inCell(p, s + 0.2))) continue
    if (![c, e1, e2].every((p) => free(occ, p, s + 0.12))) continue
    ;[c, e1, e2].forEach((p) => occ.push({ c: p, r: s + 0.05 }))
    mitochondria.push({ position: c, axis, scale: s, spin: rng() * Math.PI * 2 })
  }

  const placeSpheres = (count: number, rMin: number, rMax: number, dist: [number, number], allowCut = false) => {
    const out: SphereItem[] = []
    for (let tries = 0; tries < 3000 && out.length < count; tries++) {
      const d = randomUnit(rng)
      if (!allowCut && removedOctant(d)) continue
      const radius = rand(rng, rMin, rMax)
      const c = d.multiplyScalar(rand(rng, dist[0], dist[1]))
      if (!inCell(c, radius + 0.15) || !free(occ, c, radius + 0.1)) continue
      occ.push({ c, r: radius })
      out.push({ position: c, radius })
    }
    return out
  }

  const lysosomes = placeSpheres(8, 0.4, 0.62, [5.9, 8.4])
  const peroxisomes = placeSpheres(7, 0.3, 0.42, [5.8, 8.4])
  const vesicles = [...placeSpheres(16, 0.16, 0.27, [6.4, 9.2], true), ...placeSpheres(8, 0.14, 0.22, [5.7, 7.5])]

  // Freie Ribosomen im Cytoplasma
  const ribosomes: THREE.Vector3[] = []
  for (let tries = 0; tries < 20000 && ribosomes.length < 430; tries++) {
    const d = randomUnit(rng)
    const p = d.multiplyScalar(rand(rng, 5.7, 9.6))
    if (!inCell(p, 0.25)) continue
    if (!occ.every((o) => o.c.distanceTo(p) > o.r + 0.1)) continue
    ribosomes.push(p)
  }

  const serAccept = (p: THREE.Vector3) => p.length() > 5.75 && inCell(p, 0.45)

  return { mitochondria, lysosomes, peroxisomes, vesicles, ribosomes, serAccept }
}
