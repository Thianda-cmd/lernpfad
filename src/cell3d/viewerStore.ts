import { create } from 'zustand'
import type { OrganelleId } from '../data/organelles'

export interface FocusRequest {
  target: [number, number, number]
  distance: number
  /** Blickrichtung (vom Ziel zur Kamera). Ohne Angabe bleibt die aktuelle Richtung erhalten. */
  direction?: [number, number, number]
  key: number
}

type Toggle = 'labels' | 'cut' | 'autoRotate' | 'cytoskeleton' | 'hq'

interface ViewerState {
  hovered: OrganelleId | null
  selected: OrganelleId | null
  focus: FocusRequest | null
  labels: boolean
  cut: boolean
  autoRotate: boolean
  cytoskeleton: boolean
  hq: boolean
  resetCounter: number
  setHovered: (id: OrganelleId | null) => void
  clearHovered: (id: OrganelleId) => void
  select: (id: OrganelleId | null, focus?: Omit<FocusRequest, 'key'> | null) => void
  toggle: (key: Toggle) => void
  set: (partial: Partial<Pick<ViewerState, Toggle>>) => void
  resetView: () => void
}

let focusKey = 0

export const useViewer = create<ViewerState>((set, get) => ({
  hovered: null,
  selected: null,
  focus: null,
  labels: true,
  cut: true,
  autoRotate: true,
  cytoskeleton: true,
  hq: true,
  resetCounter: 0,
  setHovered: (id) => {
    if (get().hovered !== id) set({ hovered: id })
  },
  clearHovered: (id) => {
    if (get().hovered === id) set({ hovered: null })
  },
  select: (id, focus) =>
    set({
      selected: id,
      focus: focus ? { ...focus, key: ++focusKey } : get().focus,
      autoRotate: id ? false : get().autoRotate,
    }),
  toggle: (key) => set({ [key]: !get()[key] } as Partial<ViewerState>),
  set: (partial) => set(partial),
  resetView: () => set({ resetCounter: get().resetCounter + 1, selected: null, focus: null }),
}))
