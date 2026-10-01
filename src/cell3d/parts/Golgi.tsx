import * as THREE from 'three'
import { useMemo } from 'react'
import { cisternaGeometry, composeMatrix, merge } from '../geometry'
import { mulberry32, rand } from '../math'
import { useOrganelleMaterial } from '../interaction'
import { OInstances, OMesh } from './common'
import { satin } from '../materials'
import { P } from '../../data/palette'

/**
 * Golgi-Apparat (Dictyosom): Stapel gebogener Zisternen.
 * Lokale +Y-Achse = trans-Seite (Versandseite), −Y = cis-Seite (zum ER).
 */
export function Golgi({
  position,
  up,
  spin = 0,
  scale = 1,
  cisternae = 6,
  seed = 5,
  vesicles = true,
}: {
  position: THREE.Vector3
  up: THREE.Vector3
  spin?: number
  scale?: number
  cisternae?: number
  seed?: number
  vesicles?: boolean
}) {
  const { stack, ves } = useMemo(() => {
    const rng = mulberry32(seed)
    const parts: THREE.BufferGeometry[] = []
    const spacing = 0.27
    const mid = (cisternae - 1) / 2
    const lens: number[] = []
    for (let i = 0; i < cisternae; i++) {
      const len = 3.0 - Math.abs(i - mid) * 0.22 + rand(rng, -0.12, 0.12)
      const width = 1.75 - Math.abs(i - mid) * 0.1
      const g = cisternaGeometry(len, width, 0.13, 0.2, seed + i * 3)
      g.translate(rand(rng, -0.08, 0.08), (i - mid) * spacing, rand(rng, -0.05, 0.05))
      parts.push(g)
      lens.push(len)
    }
    const ves: THREE.Matrix4[] = []
    if (vesicles) {
      // Vesikel an den Rändern (abschnürend) und auf der trans-Seite
      for (let i = 0; i < cisternae; i++) {
        const y = (i - mid) * spacing
        const edgeX = lens[i] / 2
        for (const side of [-1, 1]) {
          if (rng() < 0.75) {
            const bend = 0.2 * edgeX * edgeX
            const pos = new THREE.Vector3(side * (edgeX + rand(rng, 0.12, 0.3)), y + bend + rand(rng, -0.05, 0.1), rand(rng, -0.5, 0.5))
            ves.push(composeMatrix(pos, new THREE.Quaternion(), rand(rng, 0.11, 0.17)))
          }
        }
      }
      const topY = mid * spacing
      for (let k = 0; k < 9; k++) {
        const x = rand(rng, -1.2, 1.2)
        const z = rand(rng, -0.7, 0.7)
        const pos = new THREE.Vector3(x, topY + 0.2 * (x * x + 0.55 * z * z) + rand(rng, 0.3, 0.95), z)
        ves.push(composeMatrix(pos, new THREE.Quaternion(), rand(rng, 0.12, 0.2)))
      }
      // Transportvesikel vom ER auf der cis-Seite
      for (let k = 0; k < 5; k++) {
        const x = rand(rng, -1, 1)
        const z = rand(rng, -0.6, 0.6)
        const pos = new THREE.Vector3(x, -mid * spacing + 0.2 * (x * x + 0.55 * z * z) - rand(rng, 0.35, 0.7), z)
        ves.push(composeMatrix(pos, new THREE.Quaternion(), rand(rng, 0.09, 0.13)))
      }
    }
    return { stack: merge(parts), ves }
  }, [cisternae, seed, vesicles])

  const quat = useMemo(() => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up.clone().normalize())
    const s = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin)
    return q.multiply(s)
  }, [up, spin])

  const sphere = useMemo(() => new THREE.SphereGeometry(1, 16, 12), [])
  const mat = useOrganelleMaterial('golgi', () => satin(P.golgi.base, { side: THREE.DoubleSide }))
  const vesMat = useOrganelleMaterial('vesikel', vesicleMaterial)
  return (
    <group position={position} quaternion={quat} scale={scale}>
      <OMesh id="golgi" geometry={stack} material={mat} />
      <OInstances id="vesikel" geometry={sphere} material={vesMat} matrices={ves} />
    </group>
  )
}

export function vesicleMaterial() {
  return satin(P.vesikel.base, { side: THREE.DoubleSide })
}
