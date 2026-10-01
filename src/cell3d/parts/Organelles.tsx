import * as THREE from 'three'
import { useMemo } from 'react'
import { blobGeometry, composeMatrix, ribosomeGeometry } from '../geometry'
import { mulberry32, rand, randomUnit } from '../math'
import { useOrganelleMaterial } from '../interaction'
import { OInstances } from './common'
import { matte, veil } from '../materials'
import { P } from '../../data/palette'
import { ribosomeMaterial } from './EndoplasmicReticulum'
import { vesicleMaterial } from './Golgi'

export interface OrientedItem {
  position: THREE.Vector3
  axis: THREE.Vector3
  scale: number
  spin: number
}

export interface SphereItem {
  position: THREE.Vector3
  radius: number
}

function orientedMatrix(it: OrientedItem, stretch = 1) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), it.axis.clone().normalize())
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.spin))
  return composeMatrix(it.position, q, new THREE.Vector3(it.scale, it.scale * stretch, it.scale))
}

/* ------------------------------------------------------------------ */
/*  Mitochondrien                                                      */
/* ------------------------------------------------------------------ */

export const MITO_HALF_LENGTH = 1.3 + 1 // Zylinderhälfte + Kappe (lokale Einheiten)

export function Mitochondria({ items, seed = 41 }: { items: OrientedItem[]; seed?: number }) {
  const data = useMemo(() => {
    const rng = mulberry32(seed)
    const outer: THREE.Matrix4[] = []
    const cristae: THREE.Matrix4[] = []
    for (const it of items) {
      const base = orientedMatrix(it)
      outer.push(base)
      const offset = rand(rng, 0, 0.36)
      let side = rng() < 0.5 ? 1 : -1
      for (let y = -1.58 + offset; y <= 1.6; y += 0.34 + rand(rng, -0.03, 0.05)) {
        const innerR = Math.abs(y) > 1.3 ? Math.sqrt(Math.max(0.86 * 0.86 - (Math.abs(y) - 1.3) ** 2, 0.01)) : 0.86
        const r = Math.min(0.64, innerR - 0.22)
        if (r < 0.25) continue
        const local = composeMatrix(
          new THREE.Vector3(side * 0.2, y, rand(rng, -0.05, 0.05)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(rng, -0.12, 0.12), rand(rng, 0, Math.PI), rand(rng, -0.12, 0.12))),
          new THREE.Vector3(r, 0.065, r * rand(rng, 0.85, 1)),
        )
        cristae.push(base.clone().multiply(local))
        side *= -1
      }
    }
    return { outer, cristae }
  }, [items, seed])

  const geos = useMemo(
    () => ({
      outer: new THREE.CapsuleGeometry(1, 2.6, 12, 32),
      inner: new THREE.CapsuleGeometry(0.86, 2.6, 12, 32),
      crista: new THREE.SphereGeometry(1, 22, 10),
    }),
    [],
  )
  const outerMat = useOrganelleMaterial('mitochondrium', () => veil(P.mito.shell3d, 0.5))
  const innerMat = useOrganelleMaterial('mitochondrium', () => matte(P.mito.back3d, { side: THREE.BackSide }))
  const cristaMat = useOrganelleMaterial('mitochondrium', () => matte(P.mito.crista, { roughness: 0.6, side: THREE.DoubleSide }))
  return (
    <group>
      <OInstances id="mitochondrium" geometry={geos.inner} material={innerMat} matrices={data.outer} />
      <OInstances id="mitochondrium" geometry={geos.crista} material={cristaMat} matrices={data.cristae} />
      <OInstances id="mitochondrium" geometry={geos.outer} material={outerMat} matrices={data.outer} renderOrder={2} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Lysosomen                                                          */
/* ------------------------------------------------------------------ */

export function Lysosomes({ items, seed = 51 }: { items: SphereItem[]; seed?: number }) {
  const data = useMemo(() => {
    const rng = mulberry32(seed)
    const shells: THREE.Matrix4[] = []
    const granules: THREE.Matrix4[] = []
    for (const it of items) {
      shells.push(composeMatrix(it.position, new THREE.Quaternion(), it.radius))
      const n = 5 + Math.floor(rng() * 5)
      for (let i = 0; i < n; i++) {
        const p = randomUnit(rng).multiplyScalar(it.radius * rand(rng, 0, 0.55)).add(it.position)
        granules.push(composeMatrix(p, new THREE.Quaternion(), it.radius * rand(rng, 0.12, 0.24)))
      }
    }
    return { shells, granules }
  }, [items, seed])
  const geo = useMemo(() => blobGeometry(1, 0.05, 1.8, seed, 8), [seed])
  const small = useMemo(() => new THREE.SphereGeometry(1, 10, 8), [])
  const outerMat = useOrganelleMaterial('lysosom', () => veil(P.lyso.base, 0.55))
  const innerMat = useOrganelleMaterial('lysosom', () => matte(P.lyso.back3d, { side: THREE.BackSide }))
  const granMat = useOrganelleMaterial('lysosom', () => matte(P.lyso.dots))
  return (
    <group>
      <OInstances id="lysosom" geometry={geo} material={innerMat} matrices={data.shells} />
      <OInstances id="lysosom" geometry={small} material={granMat} matrices={data.granules} />
      <OInstances id="lysosom" geometry={geo} material={outerMat} matrices={data.shells} renderOrder={2} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Peroxisomen                                                        */
/* ------------------------------------------------------------------ */

export function Peroxisomes({ items }: { items: SphereItem[] }) {
  const data = useMemo(
    () => ({
      shells: items.map((it) => composeMatrix(it.position, new THREE.Quaternion(), it.radius)),
      cores: items.map((it) => composeMatrix(it.position, new THREE.Quaternion(), it.radius * 0.5)),
    }),
    [items],
  )
  const geo = useMemo(() => new THREE.SphereGeometry(1, 24, 16), [])
  const core = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const outerMat = useOrganelleMaterial('peroxisom', () => veil(P.perox.base, 0.55))
  const innerMat = useOrganelleMaterial('peroxisom', () => matte(P.perox.back3d, { side: THREE.BackSide }))
  const coreMat = useOrganelleMaterial('peroxisom', () => matte(P.perox.core, { roughness: 0.55, flatShading: true }))
  return (
    <group>
      <OInstances id="peroxisom" geometry={geo} material={innerMat} matrices={data.shells} />
      <OInstances id="peroxisom" geometry={core} material={coreMat} matrices={data.cores} />
      <OInstances id="peroxisom" geometry={geo} material={outerMat} matrices={data.shells} renderOrder={2} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Vesikel & freie Ribosomen                                          */
/* ------------------------------------------------------------------ */

export function Vesicles({ items }: { items: SphereItem[] }) {
  const mats = useMemo(() => items.map((it) => composeMatrix(it.position, new THREE.Quaternion(), it.radius)), [items])
  const geo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), [])
  const mat = useOrganelleMaterial('vesikel', vesicleMaterial)
  return <OInstances id="vesikel" geometry={geo} material={mat} matrices={mats} />
}

export function FreeRibosomes({ positions, seed = 61 }: { positions: THREE.Vector3[]; seed?: number }) {
  const mats = useMemo(() => {
    const rng = mulberry32(seed)
    return positions.map((p) => composeMatrix(p, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), randomUnit(rng)), rand(rng, 0.055, 0.07)))
  }, [positions, seed])
  const geo = useMemo(() => ribosomeGeometry(), [])
  const mat = useOrganelleMaterial('ribosomen', ribosomeMaterial)
  return <OInstances id="ribosomen" geometry={geo} material={mat} matrices={mats} />
}
