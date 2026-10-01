import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { blobGeometry, composeMatrix, merge, quatFromDir, tubeGeometry } from '../geometry'
import { mulberry32, rand, randomUnit } from '../math'
import { useCapVisibility, useOrganelleMaterial } from '../interaction'
import { OInstances, OMesh, sphereRingCap } from './common'
import { matte, satin } from '../materials'
import { P } from '../../data/palette'

export interface NucleusProps {
  center: THREE.Vector3
  radius: number
  /** Normalen der Deckflächen (zeigen in den weggeschnittenen Bereich) */
  capNormals: THREE.Vector3[]
  nucleolusOffset: THREE.Vector3
  seed?: number
}

/** Zellkern: Kernhülle (Doppelmembran) mit Kernporen, Nucleolus und Chromatin. */
export function Nucleus({ center, radius: R, capNormals, nucleolusOffset, seed = 7 }: NucleusProps) {
  const gap = 0.16
  const memb = 0.075
  const rInner = R - gap

  const geos = useMemo(() => {
    const outer = new THREE.SphereGeometry(R, 112, 80)
    const inner = new THREE.SphereGeometry(rInner, 112, 80)
    const caps: THREE.BufferGeometry[] = []
    for (const n of capNormals) {
      const local = center
      const a = sphereRingCap(local, R, R - memb, n)
      const b = sphereRingCap(local, rInner, rInner - memb, n)
      if (a) caps.push(a)
      if (b) caps.push(b)
    }
    const capGeo = caps.length ? merge(caps.map((g) => g.toNonIndexed())) : null
    // Ringe liegen in Weltkoordinaten → relativ zum Zentrum verschieben
    capGeo?.translate(-center.x, -center.y, -center.z)
    return { outer, inner, capGeo }
  }, [R, rInner, capNormals, center])

  // Kernporen: gleichmäßig verteilt (Fibonacci-Kugel)
  const pores = useMemo(() => {
    const count = 120
    const rng = mulberry32(seed + 11)
    const mats: THREE.Matrix4[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = golden * i + rand(rng, -0.08, 0.08)
      const dir = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize()
      const q = quatFromDir(dir, new THREE.Vector3(0, 0, 1))
      mats.push(composeMatrix(dir.clone().multiplyScalar(R - 0.02), q, rand(rng, 0.9, 1.1)))
    }
    const geo = new THREE.TorusGeometry(0.115, 0.038, 8, 16)
    return { mats, geo }
  }, [R, seed])

  // Nucleolus
  const nucleolus = useMemo(() => blobGeometry(R * 0.32, 0.12, 2.4, seed + 3, 12), [R, seed])

  // Chromatin: Fäden (Random Walk) + Heterochromatin-Klumpen am Rand
  const chromatin = useMemo(() => {
    const rng = mulberry32(seed + 29)
    const nr = R * 0.32 + 0.25
    const maxR = rInner - 0.35
    const tubes: THREE.BufferGeometry[] = []
    for (let t = 0; t < 34; t++) {
      let p = randomUnit(rng).multiplyScalar(rand(rng, 0.4, maxR))
      if (p.distanceTo(nucleolusOffset) < nr) p = p.clone().add(new THREE.Vector3(0.9, 0, 0))
      let dir = randomUnit(rng)
      const pts = [p.clone()]
      const steps = 10 + Math.floor(rng() * 8)
      for (let s = 0; s < steps; s++) {
        dir = dir.multiplyScalar(0.55).add(randomUnit(rng).multiplyScalar(0.8)).normalize()
        let np = p.clone().addScaledVector(dir, R * 0.13)
        if (np.length() > maxR) {
          const n = np.clone().normalize()
          dir.addScaledVector(n, -2 * dir.dot(n)).normalize()
          np = n.multiplyScalar(maxR)
        }
        const toN = np.clone().sub(nucleolusOffset)
        if (toN.length() < nr) np = nucleolusOffset.clone().add(toN.normalize().multiplyScalar(nr))
        pts.push(np)
        p = np
      }
      tubes.push(tubeGeometry(pts, 0.05, steps * 6, 5))
    }
    const threads = merge(tubes)
    const clumps: THREE.Matrix4[] = []
    for (let i = 0; i < 150; i++) {
      const d = randomUnit(rng)
      const pos = d.multiplyScalar(rand(rng, rInner - 0.42, rInner - 0.2))
      const s = rand(rng, 0.09, 0.2)
      clumps.push(composeMatrix(pos, new THREE.Quaternion(), new THREE.Vector3(s, s * 0.7, s)))
    }
    const clumpGeo = blobGeometry(1, 0.25, 1.6, seed + 5, 3)
    return { threads, clumps, clumpGeo }
  }, [R, rInner, nucleolusOffset, seed])

  const outerMat = useOrganelleMaterial('kernhuelle', () => satin(P.kern.envelope, { side: THREE.DoubleSide }))
  const innerMat = useOrganelleMaterial('kernhuelle', () => matte(P.kern.inner))
  const plasmaMat = useOrganelleMaterial('zellkern', () => matte(P.kern.plasma, { roughness: 0.85, side: THREE.BackSide }))
  const capMat = useOrganelleMaterial('kernhuelle', () => matte(P.kern.cap, { side: THREE.DoubleSide }), { clip: false })
  const poreMat = useOrganelleMaterial('kernporen', () => matte(P.poren.base, { roughness: 0.6, side: THREE.DoubleSide }))
  const nucleolusMat = useOrganelleMaterial('nucleolus', () => matte(P.nucleolus.base, { roughness: 0.75, side: THREE.DoubleSide }))
  const chromMat = useOrganelleMaterial('chromatin', () => matte(P.chromatin.base, { roughness: 0.65, side: THREE.DoubleSide }))
  const clumpMat = useOrganelleMaterial('chromatin', () => matte(P.chromatin.hetero))

  const capRef = useRef<THREE.Mesh>(null)
  useCapVisibility(capRef)

  return (
    <group position={center}>
      <OMesh id="kernhuelle" geometry={geos.outer} material={outerMat} />
      <OMesh id="kernhuelle" geometry={geos.inner} material={innerMat} />
      <OMesh id="zellkern" geometry={geos.inner} material={plasmaMat} low />
      {geos.capGeo && <OMesh ref={capRef} id="kernhuelle" geometry={geos.capGeo} material={capMat} clip={false} />}
      <OInstances id="kernporen" geometry={pores.geo} material={poreMat} matrices={pores.mats} />
      <OMesh id="nucleolus" geometry={nucleolus} material={nucleolusMat} position={nucleolusOffset} />
      <OMesh id="chromatin" geometry={chromatin.threads} material={chromMat} />
      <OInstances id="chromatin" geometry={chromatin.clumpGeo} material={clumpMat} matrices={chromatin.clumps} />
    </group>
  )
}
