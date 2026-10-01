import * as THREE from 'three'
import { mulberry32, type Rng } from '../lib/random'

export { mulberry32, type Rng }

export const rand = (rng: Rng, a: number, b: number) => a + (b - a) * rng()

export function randomUnit(rng: Rng, out = new THREE.Vector3()) {
  const u = rng() * 2 - 1
  const phi = rng() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  return out.set(s * Math.cos(phi), u, s * Math.sin(phi))
}

export function perpendicularTo(v: THREE.Vector3, out = new THREE.Vector3()) {
  const a = Math.abs(v.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  return out.crossVectors(v, a).normalize()
}

/** Klassisches Perlin-Rauschen (3D), Werte etwa in [-1, 1]. */
export function createNoise3D(seed = 1) {
  const rng = mulberry32(seed)
  const perm = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = perm[i]
    perm[i] = perm[j]
    perm[j] = tmp
  }
  const p = new Uint8Array(512)
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255]
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (t: number, a: number, b: number) => a + t * (b - a)
  const grad = (hash: number, x: number, y: number, z: number) => {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }
  return (x: number, y: number, z: number) => {
    const fx = Math.floor(x)
    const fy = Math.floor(y)
    const fz = Math.floor(z)
    const X = fx & 255
    const Y = fy & 255
    const Z = fz & 255
    x -= fx
    y -= fy
    z -= fz
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z
    return lerp(
      w,
      lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1)),
      ),
    )
  }
}

/** Signed Distance einer abgerundeten Box (Halbachsen b, Rundungsradius r). */
export function sdRoundBox(px: number, py: number, pz: number, bx: number, by: number, bz: number, r: number) {
  const qx = Math.abs(px) - (bx - r)
  const qy = Math.abs(py) - (by - r)
  const qz = Math.abs(pz) - (bz - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const oz = Math.max(qz, 0)
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r
}

/**
 * Findet per Bisektion den Abstand vom Ursprung entlang der Richtung (dx,dy,dz),
 * an dem die SDF null wird. Voraussetzung: Form ist sternförmig bzgl. Ursprung.
 */
export function rayToSurface(sdf: (x: number, y: number, z: number) => number, dx: number, dy: number, dz: number, maxR: number, iterations = 24) {
  let lo = 0
  let hi = maxR
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) * 0.5
    if (sdf(dx * mid, dy * mid, dz * mid) < 0) lo = mid
    else hi = mid
  }
  return (lo + hi) * 0.5
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
