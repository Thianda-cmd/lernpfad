import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrganelleId } from '../data/organelles'

export interface Visit {
  path: string
  title: string
}

interface ProgressState {
  learned: Partial<Record<OrganelleId, true>>
  viewed: Partial<Record<OrganelleId, number>>
  /** zuletzt geöffnete Werkzeuge, neuestes zuerst */
  recent: Visit[]
  toggleLearned: (id: OrganelleId) => void
  setLearned: (id: OrganelleId, value: boolean) => void
  markViewed: (id: OrganelleId) => void
  setLastVisit: (v: Visit) => void
  reset: () => void
}

const initial = {
  learned: {},
  viewed: {},
  recent: [] as Visit[],
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      toggleLearned: (id) => {
        const learned = { ...get().learned }
        if (learned[id]) delete learned[id]
        else learned[id] = true
        set({ learned })
      },
      setLearned: (id, value) => {
        const learned = { ...get().learned }
        if (value) learned[id] = true
        else delete learned[id]
        set({ learned })
      },
      markViewed: (id) => set({ viewed: { ...get().viewed, [id]: (get().viewed[id] ?? 0) + 1 } }),
      setLastVisit: (v) => {
        const cur = get().recent
        if (cur[0]?.path === v.path && cur[0]?.title === v.title) return
        set({ recent: [v, ...cur.filter((x) => x.path !== v.path)].slice(0, 6) })
      },
      reset: () => set({ ...initial }),
    }),
    {
      name: 'lernlabor-fortschritt',
      version: 2,
      // alte Lernplattform-Daten (Quiz, Karteikarten, Mathe-Übungen, Probeklausuren) verwerfen
      migrate: (old) => {
        const o = (old ?? {}) as Partial<ProgressState> & { lastVisit?: Visit | null }
        return {
          learned: o.learned ?? {},
          viewed: o.viewed ?? {},
          recent: o.recent ?? (o.lastVisit ? [o.lastVisit] : []),
        } as ProgressState
      },
      partialize: (s) => ({ learned: s.learned, viewed: s.viewed, recent: s.recent }),
    },
  ),
)
