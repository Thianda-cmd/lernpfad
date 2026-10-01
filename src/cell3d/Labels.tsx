import * as THREE from 'three'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { ORGANELLES, parentOf, type OrganelleId } from '../data/organelles'
import { useViewer } from './viewerStore'
import { focusOrganelle, isInsideCut, type OrganelleUserData } from './interaction'
import { smoothstep } from './math'

export interface LabelSpec {
  id: OrganelleId
  position: [number, number, number]
  /** Richtung, aus der der Punkt sichtbar ist (Label blendet sonst aus) */
  normal?: [number, number, number]
  /** Nur bei aufgeschnittener Zelle zeigen */
  internal?: boolean
  side?: 'left' | 'right'
  lift?: number
}

/** Wie gut blickt die Kamera (Richtung vom Zellmittelpunkt) in die Schnittöffnung? 0 … 1 */
export type OpenFactor = (camDir: THREE.Vector3) => number

const raycaster = new THREE.Raycaster()
let labelCounter = 0

function related(a: OrganelleId, b: OrganelleId) {
  return a === b || parentOf(a) === b || parentOf(b) === a || (parentOf(a) !== undefined && parentOf(a) === parentOf(b))
}

/**
 * Nur große, flächige Strukturen verdecken Beschriftungen. Dünne Fasern, Ribosomen oder Vesikel,
 * die beim Drehen durchs Bild wandern, sollen Beschriftungen nicht flackern lassen.
 */
const OCCLUDERS = new Set<OrganelleId>(['zellmembran', 'cytoplasma', 'zellwand', 'zellkern', 'kernhuelle', 'nucleolus', 'raues-er', 'golgi', 'mitochondrium', 'chloroplast'])

/** Liegt zwischen Kamera und Ankerpunkt ein anderes (sichtbares, undurchsichtiges) Organell? */
function isOccluded(scene: THREE.Scene, camera: THREE.Camera, target: THREE.Vector3, id: OrganelleId) {
  const dir = target.clone().sub(camera.position)
  const dist = dir.length()
  raycaster.set(camera.position, dir.normalize())
  raycaster.far = dist
  const hits = raycaster.intersectObjects(scene.children, true)
  for (const h of hits) {
    const ud = h.object.userData as Partial<OrganelleUserData>
    if (!ud.organelle || ud.low || !OCCLUDERS.has(ud.organelle)) continue
    const mat = (h.object as THREE.Mesh).material as THREE.Material
    if (!mat || mat.transparent) continue
    let o: THREE.Object3D | null = h.object
    let vis = true
    while (o) {
      if (!o.visible) vis = false
      o = o.parent
    }
    if (!vis) continue
    if (ud.clip !== false && isInsideCut(h.point)) continue
    if (h.distance > dist - 0.9) return false
    return !related(ud.organelle, id)
  }
  return false
}

/** Bildschirmzustand einer Beschriftung für die Kollisionsvermeidung. */
interface LabelState {
  el: HTMLDivElement | null
  x: number
  y: number
  visible: boolean
  left: boolean
  baseLift: number
  lift: number
}

function Label({ spec, openFactor, registry }: { spec: LabelSpec; openFactor?: OpenFactor; registry: Map<string, LabelState> }) {
  const ref = useRef<HTMLDivElement>(null)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const size = useThree((s) => s.size)
  const selected = useViewer((s) => s.selected)
  const hovered = useViewer((s) => s.hovered)
  const pos = useMemo(() => new THREE.Vector3(...spec.position), [spec.position])
  const normal = useMemo(() => (spec.normal ? new THREE.Vector3(...spec.normal).normalize() : null), [spec.normal])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const occ = useRef({ slot: labelCounter++ % 8, frame: 0, hidden: false, streak: 0, value: 1 })
  const key = `${spec.id}-${spec.position.join(',')}`
  const baseLift = spec.lift ?? 34
  useEffect(() => {
    const st: LabelState = { el: ref.current, x: 0, y: 0, visible: false, left: spec.side === 'left', baseLift, lift: baseLift }
    registry.set(key, st)
    return () => {
      registry.delete(key)
    }
  }, [registry, key, baseLift, spec.side])
  useFrame((_, dt) => {
    const el = ref.current
    if (!el) return
    const st = occ.current
    st.frame++
    if (st.frame % 8 === st.slot) {
      // erst nach zwei Treffern in Folge ausblenden (verhindert Flackern)
      const blocked = isOccluded(scene, camera, pos, spec.id)
      st.streak = blocked ? st.streak + 1 : 0
      st.hidden = st.streak >= 2
    }
    st.value += ((st.hidden ? 0 : 1) - st.value) * (1 - Math.exp(-dt * 8))
    let o = st.value
    if (normal) {
      tmp.copy(camera.position).sub(pos).normalize()
      o *= smoothstep(-0.12, 0.22, normal.dot(tmp))
    }
    if (spec.internal && openFactor) o *= openFactor(tmp.copy(camera.position).normalize())
    const ls = registry.get(key)
    const ndc = tmp.copy(pos).project(camera)
    if (ls) {
      ls.el = el
      ls.x = (ndc.x * 0.5 + 0.5) * size.width
      ls.y = (-ndc.y * 0.5 + 0.5) * size.height
      ls.visible = o > 0.15 && ndc.z < 1
      if (!spec.side) {
        if (!ls.left && ndc.x > 0.3) ls.left = true
        else if (ls.left && ndc.x < 0.15) ls.left = false
      }
      el.dataset.side = ls.left ? 'left' : 'right'
    }
    if (selected && selected !== spec.id && parentOf(spec.id) !== selected) o *= 0.25
    el.style.opacity = o.toFixed(3)
    el.style.visibility = o < 0.02 ? 'hidden' : 'visible'
  })
  const org = ORGANELLES[spec.id]
  const active = selected === spec.id || hovered === spec.id
  return (
    <Html position={pos} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        className={`cell-label ${active ? 'is-active' : ''}`}
        data-side={spec.side ?? 'right'}
        style={{ '--c': org.farbe, '--lift': `${baseLift}px` } as CSSProperties}
      >
        <span className="cell-label__dot" />
        <span className="cell-label__line" />
        <button
          type="button"
          className="cell-label__pill"
          onClick={(e) => {
            e.stopPropagation()
            focusOrganelle(spec.id)
          }}
          onPointerEnter={() => useViewer.getState().setHovered(spec.id)}
          onPointerLeave={() => useViewer.getState().clearHovered(spec.id)}
        >
          {org.label}
        </button>
      </div>
    </Html>
  )
}

const PILL_H = 27
const MAX_EXTRA = 150

/** Verschiebt überlappende Beschriftungen nach oben (einfaches, stabiles Greedy-Verfahren). */
function LabelSolver({ registry }: { registry: Map<string, LabelState> }) {
  const frame = useRef(0)
  useFrame(() => {
    frame.current++
    if (frame.current % 3 !== 0) return
    const items = [...registry.values()].filter((s) => s.visible && s.el)
    const box = (s: LabelState, lift: number, w: number) => {
      const len = lift / 0.866
      const x0 = s.left ? s.x - len * 0.5 - w : s.x + len * 0.5
      const cy = s.y - lift
      return { x0, x1: x0 + w, y0: cy - PILL_H / 2, y1: cy + PILL_H / 2 }
    }
    const widths = new Map<LabelState, number>()
    for (const s of items) {
      const pill = s.el!.querySelector<HTMLElement>('.cell-label__pill')
      widths.set(s, (pill?.offsetWidth ?? 90) + 6)
    }
    // unten beginnen, nach oben ausweichen
    items.sort((a, b) => b.y - b.baseLift - (a.y - a.baseLift))
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
    for (const s of items) {
      const w = widths.get(s)!
      let lift = s.baseLift
      for (let iter = 0; iter < 10; iter++) {
        const b = box(s, lift, w)
        const hit = placed.find((p) => b.x0 < p.x1 && b.x1 > p.x0 && b.y0 < p.y1 + 3 && b.y1 > p.y0 - 3)
        if (!hit) break
        lift = s.y - (hit.y0 - 4 - PILL_H / 2)
        if (lift > s.baseLift + MAX_EXTRA) {
          lift = s.baseLift + MAX_EXTRA
          break
        }
      }
      s.lift += (lift - s.lift) * 0.4
      s.el!.style.setProperty('--lift', `${s.lift.toFixed(1)}px`)
      placed.push(box(s, lift, w))
    }
  })
  return null
}

export function Labels({ specs, openFactor }: { specs: LabelSpec[]; openFactor?: OpenFactor }) {
  const show = useViewer((s) => s.labels)
  const cut = useViewer((s) => s.cut)
  const cyto = useViewer((s) => s.cytoskeleton)
  const registry = useMemo(() => new Map<string, LabelState>(), [])
  if (!show) return null
  return (
    <group>
      {specs
        .filter((s) => (cut || !s.internal) && (cyto || s.id !== 'cytoskelett'))
        .map((s) => (
          <Label key={`${s.id}-${s.position.join(',')}`} spec={s} openFactor={openFactor} registry={registry} />
        ))}
      <LabelSolver registry={registry} />
    </group>
  )
}
