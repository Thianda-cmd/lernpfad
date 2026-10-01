import * as THREE from 'three'
import { useMemo } from 'react'
import { composeMatrix, merge, quatFromDir, ribosomeGeometry, sheetGeometry, tubeGeometry } from '../geometry'
import { mulberry32, rand, randomUnit } from '../math'
import { useOrganelleMaterial } from '../interaction'
import { OInstances, OMesh } from './common'
import { matte, satin } from '../materials'
import { P } from '../../data/palette'

export interface AvoidCone {
  dir: THREE.Vector3
  angle: number
}

export function ribosomeMaterial() {
  return matte(P.ribo.base, { roughness: 0.6 })
}

/**
 * Raues ER: gebogene Zisternen, die sich schalenförmig um den Zellkern legen,
 * besetzt mit Ribosomen.
 */
export function RoughER({
  center,
  radii,
  beltsPerRadius = 2,
  avoid = [],
  accept,
  width = 1.35,
  thickness = 0.2,
  seed = 3,
  ribosomesPerUnit = 10,
  maxBeltAngle = 0.35,
}: {
  center: THREE.Vector3
  radii: number[]
  beltsPerRadius?: number
  avoid?: AvoidCone[]
  accept?: (p: THREE.Vector3) => boolean
  width?: number
  thickness?: number
  seed?: number
  ribosomesPerUnit?: number
  maxBeltAngle?: number
}) {
  const data = useMemo(() => {
    const rng = mulberry32(seed)
    const sheets: THREE.BufferGeometry[] = []
    const ribos: THREE.Matrix4[] = []
    radii.forEach((r) => {
      for (let b = 0; b < beltsPerRadius; b++) {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), randomUnit(rng))
        const phase = rng() * Math.PI * 2
        const wob = rand(rng, 0.12, maxBeltAngle)
        const freq = 2 + Math.floor(rng() * 2)
        const N = 150
        const pts: { p: THREE.Vector3; ok: boolean }[] = []
        for (let i = 0; i <= N; i++) {
          const th = (i / N) * Math.PI * 2
          const dir = new THREE.Vector3(Math.cos(th), wob * Math.sin(freq * th + phase), Math.sin(th)).normalize().applyQuaternion(q)
          const rr = r * (1 + 0.035 * Math.sin(5 * th + phase))
          const p = dir.clone().multiplyScalar(rr).add(center)
          let ok = avoid.every((a) => dir.angleTo(a.dir) > a.angle)
          if (ok && accept) ok = accept(p)
          pts.push({ p, ok })
        }
        // In zusammenhängende Abschnitte zerlegen und zufällig unterbrechen
        let run: THREE.Vector3[] = []
        let target = 22 + Math.floor(rng() * 34)
        const flush = () => {
          if (run.length >= 9) {
            const pts2 = run.filter((_, i) => i % 3 === 0 || i === run.length - 1)
            const w = width * rand(rng, 0.8, 1.15)
            const wm = (u: number) => 1 + 0.18 * Math.sin(u * 9 + phase)
            const s = sheetGeometry(pts2, center, w, thickness, { samples: Math.max(24, run.length * 2), widthMod: wm })
            sheets.push(s.geometry)
            const len = s.curve.getLength()
            const n = Math.floor(len * ribosomesPerUnit)
            for (let k = 0; k < n; k++) {
              const u = rand(rng, 0.04, 0.96)
              const side = rng() < 0.5 ? 1 : -1
              const ang = (side * Math.PI) / 2 + (rng() - 0.5) * 2.2
              const smp = s.sample(u, ang)
              const pos = smp.position.addScaledVector(smp.normal, 0.05)
              if (accept && !accept(pos)) continue
              ribos.push(composeMatrix(pos, quatFromDir(smp.normal), rand(rng, 0.05, 0.064)))
            }
          }
          run = []
          target = 22 + Math.floor(rng() * 34)
        }
        let skip = 0
        for (const pt of pts) {
          if (skip > 0) {
            skip--
            continue
          }
          if (!pt.ok) {
            flush()
            continue
          }
          run.push(pt.p)
          if (run.length >= target) {
            flush()
            // Lücke zwischen zwei Zisternen
            skip = 6 + Math.floor(rng() * 14)
          }
        }
        flush()
      }
    })
    return { geo: sheets.length ? merge(sheets) : null, ribos }
  }, [center, radii, beltsPerRadius, avoid, accept, width, thickness, seed, ribosomesPerUnit, maxBeltAngle])

  const riboGeo = useMemo(() => ribosomeGeometry(), [])
  const mat = useOrganelleMaterial('raues-er', () => satin(P.rer.base, { side: THREE.DoubleSide }))
  const riboMat = useOrganelleMaterial('ribosomen', ribosomeMaterial)
  return (
    <group>
      {data.geo && <OMesh id="raues-er" geometry={data.geo} material={mat} />}
      <OInstances id="ribosomen" geometry={riboGeo} material={riboMat} matrices={data.ribos} />
    </group>
  )
}

/** Glattes ER: verzweigtes Netz aus Membranröhren. */
export function SmoothER({
  regionCenter,
  regionRadius,
  accept,
  count = 12,
  tubeRadius = 0.13,
  seed = 17,
}: {
  regionCenter: THREE.Vector3
  regionRadius: number
  accept: (p: THREE.Vector3) => boolean
  count?: number
  tubeRadius?: number
  seed?: number
}) {
  const geo = useMemo(() => {
    const rng = mulberry32(seed)
    const parts: THREE.BufferGeometry[] = []
    const nodes: THREE.Vector3[] = []
    let attempts = 0
    while (parts.length < count * 2 && attempts < count * 40) {
      attempts++
      let p: THREE.Vector3
      if (nodes.length && rng() < 0.6) p = nodes[Math.floor(rng() * nodes.length)].clone()
      else p = regionCenter.clone().add(randomUnit(rng).multiplyScalar(rand(rng, 0, regionRadius * 0.8)))
      if (!accept(p)) continue
      let dir = randomUnit(rng)
      const pts = [p.clone()]
      const steps = 4 + Math.floor(rng() * 5)
      for (let s = 0; s < steps; s++) {
        dir = dir.multiplyScalar(0.7).add(randomUnit(rng).multiplyScalar(0.6)).normalize()
        const np = p.clone().addScaledVector(dir, rand(rng, 0.45, 0.75))
        if (np.distanceTo(regionCenter) > regionRadius || !accept(np)) break
        pts.push(np)
        p = np
      }
      if (pts.length < 3) continue
      pts.forEach((q, i) => i % 2 === 0 && nodes.push(q))
      const r = tubeRadius * rand(rng, 0.85, 1.15)
      parts.push(tubeGeometry(pts, r, pts.length * 10, 8))
      const a = new THREE.SphereGeometry(r, 10, 8)
      a.translate(pts[0].x, pts[0].y, pts[0].z)
      const b = new THREE.SphereGeometry(r * 1.25, 10, 8)
      const last = pts[pts.length - 1]
      b.translate(last.x, last.y, last.z)
      parts.push(a, b)
    }
    return parts.length ? merge(parts) : null
  }, [regionCenter, regionRadius, accept, count, tubeRadius, seed])

  const mat = useOrganelleMaterial('glattes-er', () => satin(P.ser.base, { side: THREE.DoubleSide }))
  return geo ? <OMesh id="glattes-er" geometry={geo} material={mat} /> : null
}
