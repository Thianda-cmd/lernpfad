import * as THREE from 'three'
import { useEffect, useMemo, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ORGANELLES, parentOf, type OrganelleId } from '../data/organelles'
import { useViewer } from './viewerStore'

/* ------------------------------------------------------------------ */
/*  Schnittebenen (Aufschneiden der Zelle)                             */
/* ------------------------------------------------------------------ */

export const clipState = {
  planes: [] as THREE.Plane[],
  offset: 0,
  far: 60,
}

/** Legt fest, welche Ebenen die Zelle aufschneiden (Normalen zeigen in den sichtbaren Bereich). */
export function configureClipPlanes(normals: THREE.Vector3[]) {
  clipState.planes.length = 0
  for (const n of normals) clipState.planes.push(new THREE.Plane(n.clone().normalize(), clipState.offset))
}

export function isInsideCut(p: THREE.Vector3) {
  return clipState.planes.length > 0 && clipState.planes.every((pl) => pl.distanceToPoint(p) < -1e-3)
}

/** Schnittflächen sind nur sichtbar, wenn die Zelle vollständig geöffnet ist. */
export function useCapVisibility(ref: RefObject<THREE.Object3D | null>) {
  useFrame(() => {
    if (ref.current) ref.current.visible = clipState.offset < 0.02
  })
}

/* ------------------------------------------------------------------ */
/*  Hervorhebung (Hover / Auswahl / Abdunkeln)                         */
/* ------------------------------------------------------------------ */

type HighlightMaterial = THREE.MeshStandardMaterial

interface HighlightEntry {
  id: OrganelleId
  mat: HighlightMaterial
  base: THREE.Color
  glow: THREE.Color
  baseEmissive: THREE.Color
  baseEmissiveIntensity: number
  baseOpacity: number
  baseTransparent: boolean
  baseDepthWrite: boolean
  /** Material ist gerade im Durchsicht-Modus (transparent geschaltet) */
  ghost: boolean
}

const entries = new Set<HighlightEntry>()

/** Große Hüllen werden bei einer Auswahl besonders stark ausgeblendet. */
const SHELLS = new Set<OrganelleId>(['zellmembran', 'cytoplasma', 'zellwand', 'vakuole'])

function setGhostState(e: HighlightEntry, on: boolean) {
  if (e.baseTransparent) return
  e.mat.transparent = on
  e.mat.depthWrite = on ? false : e.baseDepthWrite
  e.mat.needsUpdate = true
}

/**
 * Kompiliert die Shader-Varianten für den Durchsicht-Modus schon beim Laden,
 * damit die erste Auswahl nicht ruckelt.
 */
export function prewarmGhostPrograms(on: boolean) {
  for (const e of entries) if (!e.ghost) setGhostState(e, on)
}

export function useOrganelleMaterial<T extends HighlightMaterial>(id: OrganelleId, create: () => T, opts: { clip?: boolean } = {}): T {
  const clip = opts.clip !== false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => {
    const m = create()
    if (clip) {
      m.clippingPlanes = clipState.planes
      m.clipIntersection = true
    }
    return m
  }, [])
  useEffect(() => {
    const e: HighlightEntry = {
      id,
      mat,
      base: mat.color.clone(),
      glow: new THREE.Color(ORGANELLES[id].farbe),
      baseEmissive: mat.emissive.clone(),
      baseEmissiveIntensity: mat.emissiveIntensity,
      baseOpacity: mat.opacity,
      baseTransparent: mat.transparent,
      baseDepthWrite: mat.depthWrite,
      ghost: false,
    }
    entries.add(e)
    return () => {
      entries.delete(e)
    }
  }, [mat, id])
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}

/**
 * Hover: sanftes Aufleuchten. Auswahl: das gewählte Organell bleibt voll sichtbar,
 * alles andere wird zu einer durchsichtigen „Geisteransicht“ – so ist das Gewählte
 * auch hinter Membran und Zellkern immer zu sehen.
 */
export function HighlightController({ dark }: { dark: boolean }) {
  const tmp = useMemo(() => new THREE.Color(), [])
  const dim = useMemo(() => new THREE.Color(dark ? '#3a443f' : '#cfcac0'), [dark])
  useFrame((state, dt) => {
    const { selected, hovered, cut } = useViewer.getState()
    const target = cut ? 0 : clipState.far
    const d = target - clipState.offset
    clipState.offset = Math.abs(d) < 0.005 ? target : clipState.offset + d * (1 - Math.exp(-dt * (cut ? 5 : 3.5)))
    for (const p of clipState.planes) p.constant = clipState.offset

    const t = state.clock.elapsedTime
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 8)
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6)
    for (const e of entries) {
      const isSel = !!selected && (e.id === selected || parentOf(e.id) === selected)
      const isHov = !!hovered && (e.id === hovered || parentOf(e.id) === hovered)
      const isDim = !!selected && !isSel

      tmp.copy(e.base)
      if (isDim) tmp.lerp(dim, SHELLS.has(e.id) ? 0.75 : 0.45)
      e.mat.color.lerp(tmp, k)
      if (isSel || isHov) e.mat.emissive.lerp(e.glow, k)
      else e.mat.emissive.lerp(e.baseEmissive, k)
      const ei = isSel ? 0.12 + 0.12 * pulse : isHov && !isDim ? 0.32 : isHov ? 0.5 : e.baseEmissiveIntensity
      e.mat.emissiveIntensity += (ei - e.mat.emissiveIntensity) * k

      if (isDim && !e.ghost) {
        e.ghost = true
        setGhostState(e, true)
      }
      const ghostOpacity = e.baseTransparent ? e.baseOpacity * 0.25 : SHELLS.has(e.id) ? 0.04 : isHov ? 0.3 : 0.1
      const to = isDim ? ghostOpacity : e.baseOpacity
      e.mat.opacity += (to - e.mat.opacity) * k
      if (!isDim && e.ghost && Math.abs(e.mat.opacity - e.baseOpacity) < 0.015) {
        e.ghost = false
        e.mat.opacity = e.baseOpacity
        setGhostState(e, false)
      }
    }
  })
  return null
}

/* ------------------------------------------------------------------ */
/*  Maus-Interaktion                                                   */
/* ------------------------------------------------------------------ */

export const FOCUS_DISTANCE: Record<OrganelleId, number> = {
  zellmembran: 16,
  cytoplasma: 18,
  zellkern: 11,
  kernhuelle: 8,
  kernporen: 7,
  nucleolus: 8,
  chromatin: 8,
  'raues-er': 10,
  'glattes-er': 9,
  ribosomen: 5.5,
  golgi: 8.5,
  vesikel: 6,
  mitochondrium: 8,
  lysosom: 6.5,
  peroxisom: 6.5,
  zentrosom: 6,
  cytoskelett: 12,
  zellwand: 18,
  plasmodesmen: 7,
  vakuole: 22,
  chloroplast: 8.5,
}

export interface OrganelleUserData {
  organelle: OrganelleId
  clip?: boolean
  low?: boolean
}

export function useOrganelleEvents(id: OrganelleId) {
  return useMemo(
    () => ({
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        useViewer.getState().setHovered(id)
        document.body.style.cursor = 'pointer'
      },
      onPointerOut: () => {
        useViewer.getState().clearHovered(id)
        document.body.style.cursor = ''
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return
        e.stopPropagation()
        const p = e.point
        useViewer.getState().select(id, { target: [p.x, p.y, p.z], distance: FOCUS_DISTANCE[id] })
      },
    }),
    [id],
  )
}

function visibleInTree(o: THREE.Object3D | null): boolean {
  while (o) {
    if (!o.visible) return false
    o = o.parent
  }
  return true
}

/** Filtert Treffer in weggeschnittenen/unsichtbaren Bereichen und stuft große, transparente Hüllen herab. */
export function EventFilter() {
  const setEvents = useThree((s) => s.setEvents)
  useEffect(() => {
    setEvents({
      filter: (items) => {
        const ok = items.filter((it) => {
          const ud = it.object.userData as Partial<OrganelleUserData>
          if (!ud.organelle) return false
          if (!visibleInTree(it.object)) return false
          if (ud.clip !== false && isInsideCut(it.point)) return false
          return true
        })
        // Reihenfolge: ausgewähltes Organell vor „Geistern“, große transparente Hüllen zuletzt
        const sel = useViewer.getState().selected
        const rank = (i: THREE.Intersection) => {
          const ud = i.object.userData as OrganelleUserData
          if (ud.low) return 3
          if (!sel) return 1
          return ud.organelle === sel || parentOf(ud.organelle) === sel ? 0 : 2
        }
        return ok.map((i, idx) => ({ i, idx, r: rank(i) })).sort((a, b) => a.r - b.r || a.idx - b.idx).map((x) => x.i)
      },
    })
    return () => {
      document.body.style.cursor = ''
    }
  }, [setEvents])
  return null
}

/* ------------------------------------------------------------------ */
/*  Ankerpunkte (für Legende → Kamerafahrt)                             */
/* ------------------------------------------------------------------ */

export interface Anchor {
  position: [number, number, number]
  direction?: [number, number, number]
  distance?: number
}

export const anchorRegistry = new Map<OrganelleId, Anchor>()

export function focusOrganelle(id: OrganelleId) {
  const a = anchorRegistry.get(id)
  useViewer.getState().select(
    id,
    a ? { target: a.position, direction: a.direction, distance: a.distance ?? FOCUS_DISTANCE[id] } : null,
  )
}
