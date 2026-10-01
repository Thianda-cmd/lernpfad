import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import type { OrganelleId } from '../../data/organelles'
import { radialCap, radialSurface, type CapRing, type RadialFn } from '../geometry'
import { useCapVisibility, useOrganelleEvents, useOrganelleMaterial, type OrganelleUserData } from '../interaction'

export interface CapSpec {
  a: THREE.Vector3
  b: THREE.Vector3
  t0: number
  t1: number
  normal: THREE.Vector3
}

export interface CutConfig {
  /** Normalen der Schnittebenen (zeigen in den verbleibenden Teil der Zelle) */
  planeNormals: THREE.Vector3[]
  /** Deckflächen für Formen, die um den Ursprung zentriert sind */
  caps: CapSpec[]
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Tierzelle: vorderes Oktant (x>0, y>0, z>0) wird entfernt. */
export const OCTANT_CUT: CutConfig = {
  planeNormals: [V(-1, 0, 0), V(0, -1, 0), V(0, 0, -1)],
  caps: [
    { a: V(0, 1, 0), b: V(0, 0, 1), t0: 0, t1: Math.PI / 2, normal: V(1, 0, 0) },
    { a: V(0, 0, 1), b: V(1, 0, 0), t0: 0, t1: Math.PI / 2, normal: V(0, 1, 0) },
    { a: V(1, 0, 0), b: V(0, 1, 0), t0: 0, t1: Math.PI / 2, normal: V(0, 0, 1) },
  ],
}

/** Pflanzenzelle: vordere obere Längskante (y>0, z>0) wird entfernt. */
export const WEDGE_CUT: CutConfig = {
  planeNormals: [V(0, -1, 0), V(0, 0, -1)],
  caps: [
    { a: V(1, 0, 0), b: V(0, 0, 1), t0: 0, t1: Math.PI, normal: V(0, 1, 0) },
    { a: V(1, 0, 0), b: V(0, 1, 0), t0: 0, t1: Math.PI, normal: V(0, 0, 1) },
  ],
}

export function userData(id: OrganelleId, extra: Partial<OrganelleUserData> = {}): OrganelleUserData {
  return { organelle: id, clip: true, ...extra }
}

/** Mesh, das zu einem Organell gehört (Hover, Klick, Hervorhebung). */
export function OMesh({
  id,
  geometry,
  material,
  low,
  clip = true,
  renderOrder,
  children,
  ...rest
}: {
  id: OrganelleId
  geometry: THREE.BufferGeometry
  material: THREE.Material
  low?: boolean
  clip?: boolean
  renderOrder?: number
  children?: ReactNode
} & Omit<ThreeElements['mesh'], 'geometry' | 'material' | 'id' | 'children'>) {
  const events = useOrganelleEvents(id)
  return (
    <mesh geometry={geometry} material={material} userData={userData(id, { low, clip })} renderOrder={renderOrder} {...events} {...rest}>
      {children}
    </mesh>
  )
}

const DEFAULT_RES: [number, number] = [180, 110]

/** Viele gleiche Objekte eines Organells als InstancedMesh. */
export function OInstances({
  id,
  geometry,
  material,
  matrices,
  colors,
  low,
  clip = true,
  renderOrder,
}: {
  id: OrganelleId
  geometry: THREE.BufferGeometry
  material: THREE.Material
  matrices: THREE.Matrix4[]
  colors?: THREE.Color[]
  low?: boolean
  clip?: boolean
  renderOrder?: number
}) {
  const events = useOrganelleEvents(id)
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    matrices.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
    if (colors) {
      colors.forEach((c, i) => m.setColorAt(i, c))
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    m.computeBoundingSphere()
    m.computeBoundingBox()
  }, [matrices, colors])
  if (matrices.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, matrices.length]}
      userData={userData(id, { low, clip })}
      renderOrder={renderOrder}
      frustumCulled={false}
      {...events}
    />
  )
}

/**
 * Hülle mit radialer Form (Zellmembran, Zellwand, Vakuole …) samt Schnittflächen.
 */
export function RadialShell({
  id,
  backId,
  fn,
  thickness,
  rings,
  cut,
  front,
  back,
  capMaterial,
  low,
  resolution = DEFAULT_RES,
  filled = false,
  renderOrder,
  innerFn,
}: {
  id: OrganelleId
  backId?: OrganelleId
  fn: RadialFn
  /** Innere Begrenzung der Schnittfläche (Standard: fn − thickness) */
  innerFn?: RadialFn
  thickness: number
  rings: CapRing[]
  cut: CutConfig
  front: () => THREE.MeshStandardMaterial
  back?: () => THREE.MeshStandardMaterial
  capMaterial?: () => THREE.MeshStandardMaterial
  low?: boolean
  resolution?: [number, number]
  filled?: boolean
  renderOrder?: number
}) {
  const geo = useMemo(() => radialSurface(fn, resolution[0], resolution[1]), [fn, resolution])
  const caps = useMemo(() => {
    const inner: RadialFn | null = filled ? null : (innerFn ?? ((x, y, z) => fn(x, y, z) - thickness))
    return cut.caps.map((c) => radialCap({ inner, outer: fn, ...c, rings }))
  }, [fn, innerFn, thickness, rings, cut, filled])
  const frontMat = useOrganelleMaterial(id, front)
  const backMat = useOrganelleMaterial(backId ?? id, back ?? (() => new THREE.MeshStandardMaterial({ visible: false })))
  const capMat = useOrganelleMaterial(
    id,
    capMaterial ?? (() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide })),
    { clip: false },
  )
  const capRef = useRef<THREE.Group>(null)
  useCapVisibility(capRef)
  return (
    <group>
      <OMesh id={id} geometry={geo} material={frontMat} low={low} renderOrder={renderOrder} />
      {back && <OMesh id={backId ?? id} geometry={geo} material={backMat} low />}
      <group ref={capRef}>
        {caps.map((g, i) => (
          <OMesh key={i} id={id} geometry={g} material={capMat} clip={false} low={low} renderOrder={renderOrder} />
        ))}
      </group>
    </group>
  )
}

/** Ringförmige Schnittfläche einer Kugel (beliebiger Mittelpunkt) mit einer Ebene durch den Ursprung. */
export function sphereRingCap(center: THREE.Vector3, rOut: number, rIn: number, capNormal: THREE.Vector3, segments = 96) {
  const n = capNormal.clone().normalize()
  const h = center.dot(n)
  if (Math.abs(h) >= rOut) return null
  const ro = Math.sqrt(rOut * rOut - h * h)
  const ri = Math.abs(h) < rIn ? Math.sqrt(rIn * rIn - h * h) : 0
  const g = new THREE.RingGeometry(ri, ro, segments, 1)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
  g.applyQuaternion(q)
  const c = center.clone().sub(n.clone().multiplyScalar(h))
  g.translate(c.x, c.y, c.z)
  return g
}
