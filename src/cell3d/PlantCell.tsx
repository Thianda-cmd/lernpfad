import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import {
  buildPlantLayout,
  membraneFn,
  membraneInnerFn,
  membraneSdf,
  MEMBRANE_T,
  NUCLEOLUS_OFFSET,
  NUCLEUS,
  vacuoleFn,
  WALL,
  wallInnerFn,
  wallOuterFn,
  type ChloroItem,
} from './plantLayout'
import { composeMatrix, merge, quatFromDir, tubeGeometry, type CapRing } from './geometry'
import { mulberry32, smoothstep } from './math'
import { anchorRegistry, configureClipPlanes, useOrganelleMaterial } from './interaction'
import { OInstances, OMesh, RadialShell, WEDGE_CUT } from './parts/common'
import { Nucleus } from './parts/Nucleus'
import { RoughER, SmoothER } from './parts/EndoplasmicReticulum'
import { Golgi } from './parts/Golgi'
import { FreeRibosomes, Mitochondria, Peroxisomes, Vesicles } from './parts/Organelles'
import { Labels, type LabelSpec } from './Labels'
import { useViewer } from './viewerStore'
import { matte, satin, veil } from './materials'
import { P } from '../data/palette'

const CAP_NORMALS = WEDGE_CUT.caps.map((c) => c.normal)
const plantOpen = (d: THREE.Vector3) => smoothstep(-0.02, 0.2, Math.min(d.y, d.z))

const WALL_RINGS: CapRing[] = [
  { s: 0, color: P.wand.light },
  { s: 0.82, color: P.wand.base },
  { s: 0.82, color: P.wand.lamella },
  { s: 1, color: P.wand.lamella },
]
const MEMBRANE_RINGS: CapRing[] = [
  { s: 0, color: P.membran.dark },
  { s: 0.3, color: P.membran.dark },
  { s: 0.3, color: P.membran.tail },
  { s: 0.7, color: P.membran.tail },
  { s: 0.7, color: P.membran.dark },
  { s: 1, color: P.membran.dark },
]
const VAC_RINGS: CapRing[] = [
  { s: 0, color: P.vakuole.light },
  { s: 1, color: P.vakuole.mid },
]
const WALL_RES: [number, number] = [240, 150]

/** Chloroplasten: Hüllmembran, Stroma, Grana-Stapel, Stromathylakoide, Stärkekörner. */
function Chloroplasts({ items }: { items: ChloroItem[] }) {
  const data = useMemo(() => {
    const rng = mulberry32(88)
    const env: THREE.Matrix4[] = []
    const stroma: THREE.Matrix4[] = []
    const grana: THREE.Matrix4[] = []
    const lamellae: THREE.Matrix4[] = []
    const starch: THREE.Matrix4[] = []
    for (const c of items) {
      const X = c.axis.clone().normalize()
      const Y = c.normal.clone().normalize()
      const Z = new THREE.Vector3().crossVectors(X, Y).normalize()
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z))
      const L = c.size.x / 2
      const T = c.size.y / 2
      const W = c.size.z / 2
      env.push(composeMatrix(c.position, q, new THREE.Vector3(L, T, W)))
      stroma.push(composeMatrix(c.position, q, new THREE.Vector3(L * 0.93, T * 0.84, W * 0.92)))
      const local = (x: number, y: number, z: number) => c.position.clone().addScaledVector(X, x).addScaledVector(Y, y).addScaledVector(Z, z)
      const xs = [-0.62, -0.37, -0.12, 0.12, 0.37, 0.62]
      xs.forEach((fx, i) => {
        const z = (i % 2 === 0 ? -1 : 1) * W * 0.32
        const x = fx * L
        const n = 4 + Math.floor(rng() * 3)
        for (let k = 0; k < n; k++) {
          const y = (k - (n - 1) / 2) * 0.062
          grana.push(composeMatrix(local(x, y, z), q, new THREE.Vector3(0.19, 0.038, 0.19)))
        }
      })
      for (const z of [-W * 0.32, W * 0.32]) {
        lamellae.push(composeMatrix(local(0, 0, z * 0.2), q, new THREE.Vector3(L * 1.35, 0.014, 0.05)))
      }
      lamellae.push(composeMatrix(local(0, 0.02, 0), q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.5)), new THREE.Vector3(L * 1.1, 0.014, 0.05)))
      starch.push(composeMatrix(local(L * 0.4, 0, -W * 0.05), q, new THREE.Vector3(0.24, 0.11, 0.17)))
      if (rng() < 0.5) starch.push(composeMatrix(local(-L * 0.42, 0, W * 0.1), q, new THREE.Vector3(0.18, 0.09, 0.13)))
    }
    return { env, stroma, grana, lamellae, starch }
  }, [items])
  const geos = useMemo(
    () => ({
      lens: new THREE.SphereGeometry(1, 36, 22),
      disc: new THREE.CylinderGeometry(1, 1, 1, 18, 1),
      box: new THREE.BoxGeometry(1, 1, 1),
      grain: new THREE.SphereGeometry(1, 14, 10),
    }),
    [],
  )
  const envMat = useOrganelleMaterial('chloroplast', () => veil(P.chloro.base, 0.45))
  const stromaMat = useOrganelleMaterial('chloroplast', () => matte(P.chloro.stroma, { side: THREE.BackSide }))
  const granaMat = useOrganelleMaterial('chloroplast', () => matte(P.chloro.grana, { roughness: 0.6 }))
  const lamMat = useOrganelleMaterial('chloroplast', () => matte(P.chloro.lamella))
  const starchMat = useOrganelleMaterial('chloroplast', () => matte(P.chloro.starch))
  return (
    <group>
      <OInstances id="chloroplast" geometry={geos.lens} material={stromaMat} matrices={data.stroma} />
      <OInstances id="chloroplast" geometry={geos.disc} material={granaMat} matrices={data.grana} />
      <OInstances id="chloroplast" geometry={geos.box} material={lamMat} matrices={data.lamellae} />
      <OInstances id="chloroplast" geometry={geos.grain} material={starchMat} matrices={data.starch} />
      <OInstances id="chloroplast" geometry={geos.lens} material={envMat} matrices={data.env} renderOrder={2} />
    </group>
  )
}

/** Plasmodesmen: Kanäle durch die Zellwand mit Desmotubulus (ER-Strang). */
function Plasmodesmata({ items }: { items: { position: THREE.Vector3; normal: THREE.Vector3 }[] }) {
  const data = useMemo(
    () => ({
      channels: items.map((p) => composeMatrix(p.position, quatFromDir(p.normal), new THREE.Vector3(0.09, WALL.t + 0.26, 0.09))),
      cores: items.map((p) => composeMatrix(p.position, quatFromDir(p.normal), new THREE.Vector3(0.035, WALL.t + 0.34, 0.035))),
    }),
    [items],
  )
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 12, 1), [])
  const mat = useOrganelleMaterial('plasmodesmen', () => matte(P.membran.base))
  const coreMat = useOrganelleMaterial('plasmodesmen', () => matte(P.rer.dark))
  return (
    <group>
      <OInstances id="plasmodesmen" geometry={geo} material={mat} matrices={data.channels} />
      <OInstances id="plasmodesmen" geometry={geo} material={coreMat} matrices={data.cores} />
    </group>
  )
}

/** Cytoskelett der Pflanzenzelle: corticale Mikrotubuli (quer) + Aktin-Kabel (Plasmaströmung). */
function PlantCytoskeleton() {
  const visible = useViewer((s) => s.cytoskeleton)
  const geos = useMemo(() => {
    const rng = mulberry32(5)
    const inset = MEMBRANE_T + 0.1
    const sdf = (x: number, y: number, z: number) => membraneSdf(x, y, z) + inset
    const hoopPoint = (x: number, th: number) => {
      let lo = 0
      let hi = 12
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2
        if (sdf(x, Math.cos(th) * mid, Math.sin(th) * mid) < 0) lo = mid
        else hi = mid
      }
      return new THREE.Vector3(x, Math.cos(th) * lo, Math.sin(th) * lo)
    }
    const hoops: THREE.BufferGeometry[] = []
    for (let x = -11.4; x <= 11.7; x += 1.35) {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < 72; i++) pts.push(hoopPoint(x + Math.sin(i * 0.4) * 0.05, (i / 72) * Math.PI * 2))
      const curve = new THREE.CatmullRomCurve3(pts, true)
      hoops.push(new THREE.TubeGeometry(curve, 144, 0.015, 4, true))
    }
    const cables: THREE.BufferGeometry[] = []
    for (let k = 0; k < 14; k++) {
      const th0 = rng() * Math.PI * 2
      const pts: THREE.Vector3[] = []
      for (let x = -11; x <= 11; x += 2.2) {
        const p = hoopPoint(x, th0 + Math.sin(x * 0.3 + k) * 0.08)
        const inward = new THREE.Vector3(0, p.y, p.z).normalize().multiplyScalar(-0.28)
        pts.push(p.add(inward))
      }
      cables.push(tubeGeometry(pts, 0.026, 120, 5))
    }
    return { hoops: merge(hoops), cables: merge(cables) }
  }, [])
  const mtMat = useOrganelleMaterial('cytoskelett', () => matte(P.skelett.actin))
  const acMat = useOrganelleMaterial('cytoskelett', () => matte(P.skelett.mt))
  return (
    <group visible={visible}>
      <OMesh id="cytoskelett" geometry={geos.hoops} material={mtMat} />
      <OMesh id="cytoskelett" geometry={geos.cables} material={acMat} />
    </group>
  )
}

export default function PlantCell() {
  useMemo(() => configureClipPlanes(WEDGE_CUT.planeNormals), [])
  const layout = useMemo(() => buildPlantLayout(), [])

  const reps = useMemo(() => {
    const pick = <T extends { position: THREE.Vector3 }>(arr: T[], score: (p: THREE.Vector3) => number) =>
      arr.reduce<T | undefined>((best, it) => (!best || score(it.position) > score(best.position) ? it : best), undefined)
    const visibleScore = (p: THREE.Vector3) => -Math.abs(p.x - 1) * 0.15 + Math.min(p.y, p.z) * (Math.min(p.y, p.z) < 0 ? 1 : -3)
    return {
      chloro: pick(
        layout.chloroplasts.filter((c) => c.normal.z < -0.5),
        (p) => -Math.abs(p.x - 2) - Math.abs(p.y),
      ),
      mito: pick(layout.mitochondria, visibleScore),
      perox: pick(layout.peroxisomes, visibleScore),
      ves: pick(layout.vesicles, visibleScore),
    }
  }, [layout])

  const labels = useMemo<LabelSpec[]>(() => {
    const arr = (v: THREE.Vector3) => v.toArray() as [number, number, number]
    const nc = NUCLEUS.center
    const out: LabelSpec[] = [
      { id: 'zellwand', position: [7.5, -4.2, WALL.hz], normal: [0, 0, 1], side: 'right' },
      { id: 'zellmembran', position: [-2.5, 0, WALL.hz - WALL.t - 0.09], normal: [0, 1, 0.3], internal: true, lift: 26 },
      { id: 'vakuole', position: [6.5, 1.8, -1.2], internal: true },
      { id: 'zellkern', position: arr(nc.clone().add(new THREE.Vector3(0.3, -0.5, -0.4))), internal: true, side: 'right', lift: 18 },
      { id: 'nucleolus', position: arr(nc.clone().add(NUCLEOLUS_OFFSET)), internal: true, side: 'left', lift: 22 },
      { id: 'kernhuelle', position: [nc.x + 0.6, 0, nc.z + 2.33], normal: [0, 1, 0.4], internal: true, lift: 56 },
      { id: 'golgi', position: arr(layout.golgi[0].position), internal: true },
      { id: 'glattes-er', position: arr(layout.serCenter), internal: true, side: 'left' },
      { id: 'plasmodesmen', position: arr(layout.plasmodesmata[0].position.clone().add(new THREE.Vector3(0, 0, 0.5))), internal: true },
      { id: 'cytoplasma', position: [-7.6, -2.4, 2.8], internal: true },
    ]
    if (reps.chloro) out.push({ id: 'chloroplast', position: arr(reps.chloro.position), internal: true })
    if (reps.mito) out.push({ id: 'mitochondrium', position: arr(reps.mito.position), internal: true })
    if (reps.perox) out.push({ id: 'peroxisom', position: arr(reps.perox.position), internal: true })
    return out
  }, [layout, reps])

  useEffect(() => {
    anchorRegistry.clear()
    const set = (id: Parameters<typeof anchorRegistry.set>[0], p: THREE.Vector3 | [number, number, number], dir?: [number, number, number], distance?: number) =>
      anchorRegistry.set(id, { position: Array.isArray(p) ? p : (p.toArray() as [number, number, number]), direction: dir, distance })
    const view: [number, number, number] = [0.35, 0.55, 1]
    const nc = NUCLEUS.center
    set('zellwand', [0, 0, 0], view)
    set('zellmembran', [0, 0, 0], view)
    set('cytoplasma', [0, 0, 0], view)
    set('vakuole', [2, 0, 0], view)
    set('zellkern', nc, [0.35, 0.8, 1])
    set('kernhuelle', nc, [0.35, 0.8, 1])
    set('kernporen', nc, [0.35, 0.8, 1])
    set('nucleolus', nc.clone().add(NUCLEOLUS_OFFSET), [0.35, 0.8, 1])
    set('chromatin', nc, [0.35, 0.8, 1])
    set('raues-er', nc, [0.6, 0.8, 1], 10)
    set('glattes-er', layout.serCenter, [0.4, 0.6, 1])
    set('golgi', layout.golgi[0].position, [0.3, 0.6, 1])
    set('ribosomen', nc.clone().add(new THREE.Vector3(1.6, -1.2, 2.2)), [0.5, 0.7, 1])
    set('cytoskelett', [0, 0, 0], view)
    set('plasmodesmen', layout.plasmodesmata[0].position, [0.2, 0.4, 1])
    if (reps.chloro) set('chloroplast', reps.chloro.position, [0.1, 0.4, 1])
    if (reps.mito) set('mitochondrium', reps.mito.position, [0.3, 0.6, 1])
    if (reps.perox) set('peroxisom', reps.perox.position, [0.3, 0.6, 1])
    if (reps.ves) set('vesikel', reps.ves.position, [0.3, 0.6, 1])
    return () => anchorRegistry.clear()
  }, [layout, reps])

  return (
    <group>
      <RadialShell
        id="zellwand"
        fn={wallOuterFn}
        innerFn={wallInnerFn}
        thickness={WALL.t}
        rings={WALL_RINGS}
        cut={WEDGE_CUT}
        resolution={WALL_RES}
        front={() => satin(P.wand.base, { roughness: 0.75, clearcoat: 0.05, sheen: 0.5, sheenColor: new THREE.Color(P.wand.light) })}
      />
      <RadialShell
        id="zellmembran"
        backId="cytoplasma"
        fn={membraneFn}
        innerFn={membraneInnerFn}
        thickness={MEMBRANE_T}
        rings={MEMBRANE_RINGS}
        cut={WEDGE_CUT}
        resolution={WALL_RES}
        front={() => matte(P.membran.base, { roughness: 0.6 })}
        back={() => matte(P.cyto.inner3d, { roughness: 0.9, side: THREE.BackSide })}
      />
      <RadialShell
        id="vakuole"
        fn={vacuoleFn}
        thickness={0}
        filled
        low
        rings={VAC_RINGS}
        cut={WEDGE_CUT}
        renderOrder={5}
        front={() => veil(P.vakuole.base, 0.2, { roughness: 0.3, side: THREE.DoubleSide })}
        capMaterial={() => matte('#ffffff', { vertexColors: true, roughness: 0.5, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })}
      />
      <Nucleus center={NUCLEUS.center} radius={NUCLEUS.r} capNormals={CAP_NORMALS} nucleolusOffset={NUCLEOLUS_OFFSET} seed={19} />
      <RoughER center={NUCLEUS.center} radii={[3.05, 3.55]} beltsPerRadius={2} accept={layout.erAccept} width={0.95} thickness={0.16} seed={11} />
      <SmoothER regionCenter={layout.serCenter} regionRadius={1.9} accept={layout.serAccept} count={9} tubeRadius={0.12} seed={23} />
      {layout.golgi.map((g, i) => (
        <Golgi key={i} position={g.position} up={g.up} spin={g.spin} scale={g.scale} seed={i + 30} />
      ))}
      <Chloroplasts items={layout.chloroplasts} />
      <Mitochondria items={layout.mitochondria} seed={3} />
      <Peroxisomes items={layout.peroxisomes} />
      <Vesicles items={layout.vesicles} />
      <FreeRibosomes positions={layout.ribosomes} seed={9} />
      <Plasmodesmata items={layout.plasmodesmata} />
      <PlantCytoskeleton />
      <Labels specs={labels} openFactor={plantOpen} />
    </group>
  )
}
