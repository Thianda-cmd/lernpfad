import * as THREE from 'three'
import { useMemo } from 'react'
import { blobGeometry, composeMatrix, merge, quatFromDir, tubeGeometry, type RadialFn } from '../geometry'
import { mulberry32, perpendicularTo, rand, randomUnit } from '../math'
import { useOrganelleMaterial } from '../interaction'
import { useViewer } from '../viewerStore'
import { OInstances, OMesh } from './common'
import { matte, satin } from '../materials'
import { P } from '../../data/palette'

/** Zentrosom: zwei rechtwinklige Zentriolen aus je 9 Mikrotubuli-Tripletts + pericentrioläres Material. */
export function Centrosome({ position, axis }: { position: THREE.Vector3; axis: THREE.Vector3 }) {
  const data = useMemo(() => {
    const Da = axis.clone().normalize()
    const Db = perpendicularTo(Da)
    const L = 1.05
    const ringR = 0.28
    const cyl: THREE.Matrix4[] = []
    const build = (center: THREE.Vector3, D: THREE.Vector3) => {
      const U = perpendicularTo(D)
      const W = new THREE.Vector3().crossVectors(D, U).normalize()
      const q = quatFromDir(D)
      const blade = (35 * Math.PI) / 180
      for (let k = 0; k < 9; k++) {
        const ang = (k / 9) * Math.PI * 2
        const radial = U.clone().multiplyScalar(Math.cos(ang)).addScaledVector(W, Math.sin(ang))
        const tangent = U.clone().multiplyScalar(-Math.sin(ang)).addScaledVector(W, Math.cos(ang))
        const tdir = tangent.multiplyScalar(Math.cos(blade)).addScaledVector(radial, Math.sin(blade)).normalize()
        for (let m = -1; m <= 1; m++) {
          const p = center.clone().addScaledVector(radial, ringR).addScaledVector(tdir, m * 0.085)
          cyl.push(composeMatrix(p, q, new THREE.Vector3(0.042, L, 0.042)))
        }
      }
    }
    const A = position.clone()
    const B = position.clone().addScaledVector(Da, -0.32).addScaledVector(Db, 0.62)
    build(A, Da)
    build(B, Db)
    const pcmCenter = A.clone().lerp(B, 0.5)
    return { cyl, pcmCenter }
  }, [position, axis])
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 10, 1), [])
  const pcmGeo = useMemo(() => blobGeometry(1.2, 0.1, 1.5, 9, 8), [])
  const mat = useOrganelleMaterial('zentrosom', () => satin(P.zentro.base, { side: THREE.DoubleSide }))
  const pcmMat = useOrganelleMaterial('zentrosom', () => matte(P.zentro.light, { roughness: 0.9, transparent: true, opacity: 0.16, depthWrite: false }))
  return (
    <group>
      <OInstances id="zentrosom" geometry={cylGeo} material={mat} matrices={data.cyl} />
      <OMesh id="zentrosom" geometry={pcmGeo} material={pcmMat} position={data.pcmCenter} low renderOrder={3} />
    </group>
  )
}

/** Cytoskelett der Tierzelle: Mikrotubuli (vom Zentrosom), Aktin (Zellcortex), Intermediärfilamente. */
export function AnimalCytoskeleton({
  origin,
  cellFn,
  nucleusRadius,
  seed = 71,
}: {
  origin: THREE.Vector3
  cellFn: RadialFn
  nucleusRadius: number
  seed?: number
}) {
  const visible = useViewer((s) => s.cytoskeleton)
  const geos = useMemo(() => {
    const rng = mulberry32(seed)
    const avoidR = nucleusRadius + 0.5
    const pushOut = (p: THREE.Vector3) => (p.length() < avoidR ? p.setLength(avoidR) : p)
    const mts: THREE.BufferGeometry[] = []
    for (let i = 0; i < 26; i++) {
      const d = randomUnit(rng)
      const end = d.clone().multiplyScalar(cellFn(d.x, d.y, d.z) * 0.93)
      const perp = perpendicularTo(end.clone().sub(origin).normalize()).applyAxisAngle(end.clone().sub(origin).normalize(), rng() * Math.PI * 2)
      const bow = rand(rng, 0.4, 1.6)
      const pts: THREE.Vector3[] = []
      for (let s = 0; s <= 8; s++) {
        const t = s / 8
        const p = origin.clone().lerp(end, t).addScaledVector(perp, Math.sin(Math.PI * t) * bow)
        pts.push(pushOut(p))
      }
      mts.push(tubeGeometry(pts, 0.024, 70, 5))
    }
    const actin: THREE.BufferGeometry[] = []
    for (let i = 0; i < 170; i++) {
      const d = randomUnit(rng)
      const t = perpendicularTo(d).applyAxisAngle(d, rng() * Math.PI * 2)
      const len = rand(rng, 1.2, 2.8)
      const pts: THREE.Vector3[] = []
      for (let s = 0; s <= 4; s++) {
        const q = d
          .clone()
          .multiplyScalar(1)
          .addScaledVector(t, ((s / 4 - 0.5) * len) / 9)
          .normalize()
        pts.push(q.multiplyScalar(cellFn(q.x, q.y, q.z) * 0.955))
      }
      actin.push(tubeGeometry(pts, 0.017, 16, 4))
    }
    const ifs: THREE.BufferGeometry[] = []
    for (let i = 0; i < 28; i++) {
      const d1 = randomUnit(rng)
      const d2 = d1
        .clone()
        .add(randomUnit(rng).multiplyScalar(0.55))
        .normalize()
      const a = d1.clone().multiplyScalar(nucleusRadius + 0.15)
      const b = d2.clone().multiplyScalar(cellFn(d2.x, d2.y, d2.z) * 0.94)
      const pts: THREE.Vector3[] = []
      for (let s = 0; s <= 7; s++) {
        const t = s / 7
        const p = a.clone().lerp(b, t).add(randomUnit(rng).multiplyScalar(0.28 * Math.sin(Math.PI * t)))
        pts.push(pushOut(p))
      }
      ifs.push(tubeGeometry(pts, 0.022, 60, 5))
    }
    return { mt: merge(mts), actin: merge(actin), ifs: merge(ifs) }
  }, [origin, cellFn, nucleusRadius, seed])
  const mtMat = useOrganelleMaterial('cytoskelett', () => matte(P.skelett.mt))
  const acMat = useOrganelleMaterial('cytoskelett', () => matte(P.skelett.actin))
  const ifMat = useOrganelleMaterial('cytoskelett', () => matte(P.skelett.inter))
  return (
    <group visible={visible}>
      <OMesh id="cytoskelett" geometry={geos.mt} material={mtMat} />
      <OMesh id="cytoskelett" geometry={geos.actin} material={acMat} />
      <OMesh id="cytoskelett" geometry={geos.ifs} material={ifMat} />
    </group>
  )
}
