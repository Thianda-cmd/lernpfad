import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import {
  animalCellFn,
  buildAnimalLayout,
  CENTROSOME_AXIS,
  CENTROSOME_POS,
  ER_RADII,
  GOLGI_DIR,
  GOLGI_POS,
  MEMBRANE_T,
  mostVisible,
  NUCLEOLUS_OFFSET,
  NUCLEUS_R,
  SER_CENTER,
} from './animalLayout'
import { composeMatrix, quatFromDir, blobGeometry } from './geometry'
import { mulberry32, rand, randomUnit, smoothstep } from './math'
import { anchorRegistry, configureClipPlanes, useOrganelleMaterial } from './interaction'
import { OCTANT_CUT, OInstances, RadialShell } from './parts/common'
import { Nucleus } from './parts/Nucleus'
import { RoughER, SmoothER } from './parts/EndoplasmicReticulum'
import { Golgi } from './parts/Golgi'
import { FreeRibosomes, Lysosomes, Mitochondria, Peroxisomes, Vesicles } from './parts/Organelles'
import { AnimalCytoskeleton, Centrosome } from './parts/Skeleton'
import { Labels, type LabelSpec } from './Labels'
import type { CapRing } from './geometry'
import { matte, satin } from './materials'
import { P } from '../data/palette'

const ORIGIN = new THREE.Vector3()
const MEMBRANE_RINGS: CapRing[] = [
  { s: 0, color: P.membran.dark },
  { s: 0.28, color: P.membran.dark },
  { s: 0.28, color: P.membran.tail },
  { s: 0.72, color: P.membran.tail },
  { s: 0.72, color: P.membran.dark },
  { s: 1, color: P.membran.dark },
]
const CAP_NORMALS = OCTANT_CUT.caps.map((c) => c.normal)
const animalOpen = (d: THREE.Vector3) => smoothstep(-0.02, 0.2, Math.min(d.x, d.y, d.z))
const ER_AVOID = [{ dir: GOLGI_DIR, angle: 0.52 }]

function onSurface(dx: number, dy: number, dz: number, inset = 0): [number, number, number] {
  const d = new THREE.Vector3(dx, dy, dz).normalize()
  const r = animalCellFn(d.x, d.y, d.z) - inset
  return [d.x * r, d.y * r, d.z * r]
}

/** Membranproteine, die aus der Lipiddoppelschicht herausragen. */
function MembraneProteins() {
  const data = useMemo(() => {
    const rng = mulberry32(99)
    const mats: THREE.Matrix4[] = []
    const colors: THREE.Color[] = []
    const palette = [P.membran.dark, '#9b7fa8', '#c58392', '#a47a96'].map((c) => new THREE.Color(c))
    for (let i = 0; i < 190; i++) {
      const d = randomUnit(rng)
      const r = animalCellFn(d.x, d.y, d.z)
      const s = rand(rng, 0.08, 0.14)
      mats.push(composeMatrix(d.clone().multiplyScalar(r - 0.05), quatFromDir(d), new THREE.Vector3(s, s * rand(rng, 1.2, 1.7), s)))
      colors.push(palette[Math.floor(rng() * palette.length)])
    }
    return { mats, colors }
  }, [])
  const geo = useMemo(() => blobGeometry(1, 0.15, 1.8, 4, 3), [])
  const mat = useOrganelleMaterial('zellmembran', () => matte('#ffffff', { roughness: 0.6 }))
  return <OInstances id="zellmembran" geometry={geo} material={mat} matrices={data.mats} colors={data.colors} />
}

export default function AnimalCell() {
  useMemo(() => configureClipPlanes(OCTANT_CUT.planeNormals), [])
  const layout = useMemo(() => buildAnimalLayout(), [])

  const reps = useMemo(
    () => ({
      mito: mostVisible(layout.mitochondria),
      lyso: mostVisible(layout.lysosomes),
      perox: mostVisible(layout.peroxisomes),
      ves: mostVisible(layout.vesicles),
    }),
    [layout],
  )

  const labels = useMemo<LabelSpec[]>(() => {
    const arr = (v: THREE.Vector3) => v.toArray() as [number, number, number]
    const nuc = NUCLEOLUS_OFFSET.clone().add(new THREE.Vector3(0.5, 0.6, 0.5).normalize().multiplyScalar(1.0))
    const out: LabelSpec[] = [
      { id: 'zellmembran', position: onSurface(0.9, -0.28, 0.35), normal: [0.9, -0.28, 0.35] },
      { id: 'cytoplasma', position: [3.0, -0.5, 6.8], internal: true },
      { id: 'zellkern', position: [-0.5, -0.9, -0.6], internal: true, lift: 18 },
      { id: 'nucleolus', position: arr(nuc), internal: true, side: 'left', lift: 22 },
      { id: 'kernhuelle', position: [0, NUCLEUS_R * 0.62, NUCLEUS_R * 0.78], internal: true, lift: 44 },
      { id: 'raues-er', position: [0, 4.55 * 0.35, 4.55 * 0.94], internal: true, lift: 62 },
      { id: 'golgi', position: arr(GOLGI_POS.clone().addScaledVector(GOLGI_DIR, 0.2)), internal: true, side: 'left' },
      { id: 'glattes-er', position: arr(SER_CENTER), internal: true },
      { id: 'zentrosom', position: arr(CENTROSOME_POS), internal: true, side: 'left', lift: 56 },
    ]
    if (reps.mito) out.push({ id: 'mitochondrium', position: arr(reps.mito.position), internal: true })
    if (reps.lyso) out.push({ id: 'lysosom', position: arr(reps.lyso.position), internal: true, side: 'left' })
    if (reps.perox) out.push({ id: 'peroxisom', position: arr(reps.perox.position), internal: true })
    return out
  }, [reps])

  useEffect(() => {
    anchorRegistry.clear()
    const set = (id: Parameters<typeof anchorRegistry.set>[0], p: THREE.Vector3 | [number, number, number], dir?: [number, number, number]) =>
      anchorRegistry.set(id, { position: Array.isArray(p) ? p : (p.toArray() as [number, number, number]), direction: dir })
    const view: [number, number, number] = [1, 0.72, 1]
    set('zellmembran', [0, 0, 0], view)
    set('cytoplasma', [0, 0, 0], view)
    set('zellkern', [0, 0, 0], view)
    set('kernhuelle', [0, 2, 2], view)
    set('kernporen', [0.4, 3.1, 1.6], [0.6, 1, 0.6])
    set('nucleolus', NUCLEOLUS_OFFSET, view)
    set('chromatin', [-0.8, -0.6, -0.6], view)
    set('raues-er', [0, 1.4, 4.4], [1, 0.5, 0.6])
    set('glattes-er', SER_CENTER, [1, 0.5, 0.8])
    set('golgi', GOLGI_POS, [0.7, 0.8, 1])
    set('zentrosom', CENTROSOME_POS, [0.6, 0.8, 1])
    set('cytoskelett', [0, 0, 0], view)
    set('ribosomen', [0.2, 1.4, 4.3], [1, 0.4, 0.5])
    const toCam = (p: THREE.Vector3) => p.clone().normalize().add(new THREE.Vector3(1, 0.72, 1)).toArray() as [number, number, number]
    if (reps.mito) set('mitochondrium', reps.mito.position, toCam(reps.mito.position))
    if (reps.lyso) set('lysosom', reps.lyso.position, toCam(reps.lyso.position))
    if (reps.perox) set('peroxisom', reps.perox.position, toCam(reps.perox.position))
    if (reps.ves) set('vesikel', reps.ves.position, toCam(reps.ves.position))
    return () => anchorRegistry.clear()
  }, [reps])

  return (
    <group>
      <RadialShell
        id="zellmembran"
        backId="cytoplasma"
        fn={animalCellFn}
        thickness={MEMBRANE_T}
        rings={MEMBRANE_RINGS}
        cut={OCTANT_CUT}
        front={() => satin(P.membran.base, { sheen: 0.35, sheenColor: new THREE.Color(P.membran.light) })}
        back={() => matte(P.cyto.inner3d, { roughness: 0.9, side: THREE.BackSide })}
      />
      <MembraneProteins />
      <Nucleus center={ORIGIN} radius={NUCLEUS_R} capNormals={CAP_NORMALS} nucleolusOffset={NUCLEOLUS_OFFSET} />
      <RoughER center={ORIGIN} radii={ER_RADII} avoid={ER_AVOID} beltsPerRadius={2} width={1.2} />
      <SmoothER regionCenter={SER_CENTER} regionRadius={2.1} accept={layout.serAccept} count={11} />
      <Golgi position={GOLGI_POS} up={GOLGI_DIR} spin={0.6} />
      <Centrosome position={CENTROSOME_POS} axis={CENTROSOME_AXIS} />
      <Mitochondria items={layout.mitochondria} />
      <Lysosomes items={layout.lysosomes} />
      <Peroxisomes items={layout.peroxisomes} />
      <Vesicles items={layout.vesicles} />
      <FreeRibosomes positions={layout.ribosomes} />
      <AnimalCytoskeleton origin={CENTROSOME_POS} cellFn={animalCellFn} nucleusRadius={NUCLEUS_R} />
      <Labels specs={labels} openFactor={animalOpen} />
    </group>
  )
}
